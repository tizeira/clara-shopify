/**
 * Conversation Manager
 *
 * Core orchestrator for the modular real-time conversation pipeline.
 * Coordinates STT → LLM → Avatar flow with barge-in support.
 *
 * Architecture:
 * - Audio Capture: Handles getUserMedia() and MediaRecorder (80ms chunks)
 * - Pipeline Orchestration: STT → LLM → Avatar
 * - Barge-in Handler: Flux StartOfTurn → interrupt avatar + LLM
 * - State Management: Conversation state machine
 * - Latency Tracking: Metrics for optimization
 *
 * Workflow:
 * 1. User speaks → Audio chunks → STT (Deepgram Flux)
 * 2. STT emits transcript → LLM (Claude Haiku streaming)
 * 3. LLM streams response → Avatar (HeyGen REPEAT mode)
 * 4. Barge-in: User interrupts → stop avatar + LLM immediately
 *
 * Usage:
 * ```typescript
 * const manager = new ConversationManager({
 *   sttProvider,
 *   llmProvider,
 *   avatarProvider,
 *   enableBargeIn: true,
 *   logLatency: true,
 * });
 *
 * await manager.start();
 * // Conversation automatically handles STT → LLM → Avatar
 *
 * await manager.stop();
 * ```
 */

import { STTProvider, LLMProvider, AvatarProvider, ConversationConfig } from './interfaces';
import { AUDIO_CONFIG } from '@/config/features';

// Conversation states
export enum ConversationState {
  IDLE = 'idle',                       // Not active
  LISTENING = 'listening',             // Mic active, waiting for user
  USER_SPEAKING = 'user_speaking',     // User is speaking
  PROCESSING = 'processing',           // LLM generating response
  AVATAR_SPEAKING = 'avatar_speaking', // Avatar speaking response
  INTERRUPTED = 'interrupted',         // Barge-in occurred
}

export interface ConversationManagerConfig {
  sttProvider: STTProvider;
  llmProvider: LLMProvider;
  avatarProvider: AvatarProvider;

  // Feature flags
  enableBargeIn?: boolean;
  enableInterimTranscripts?: boolean;
  enableStreaming?: boolean;

  // Callbacks
  onStateChange?: (from: ConversationState, to: ConversationState) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onLLMChunk?: (chunk: string) => void;
  onError?: (error: Error, context?: string) => void;

  // Debugging
  logLatency?: boolean;
  logTranscripts?: boolean;
}

export class ConversationManager {
  private config: ConversationManagerConfig;
  private state: ConversationState = ConversationState.IDLE;

  // Audio capture
  private mediaStream: MediaStream | null = null;
  private mediaRecorder: MediaRecorder | null = null;
  private audioContext: AudioContext | null = null;

  // Timing metrics
  private metrics = {
    userStopSpeaking: 0,
    transcriptReceived: 0,
    llmFirstToken: 0,
    llmComplete: 0,
    avatarStartSpeaking: 0,
  };

  // State tracking
  private currentLLMResponse = '';
  private isActive = false;

  constructor(config: ConversationManagerConfig) {
    this.config = {
      enableBargeIn: true,
      enableInterimTranscripts: true,
      enableStreaming: true,
      logLatency: false,
      logTranscripts: false,
      ...config,
    };
  }

  /**
   * Start conversation manager
   * Initializes audio capture and provider event handlers
   */
  async start(): Promise<void> {
    if (this.isActive) {
      console.warn('⚠️ ConversationManager: Already active');
      return;
    }

    try {
      console.log('🚀 ConversationManager: Starting...');

      // 1. Initialize audio capture
      await this.initializeAudioCapture();

      // 2. Setup provider event handlers
      this.setupProviderEventHandlers();

      // 3. Start STT listening
      await this.config.sttProvider.startListening();

      this.isActive = true;
      this.setState(ConversationState.LISTENING);

      console.log('✅ ConversationManager: Started successfully');
    } catch (error) {
      console.error('❌ ConversationManager: Failed to start', error);
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'start');
      throw error;
    }
  }

  /**
   * Initialize audio capture
   * - getUserMedia() for microphone access
   * - MediaRecorder for chunked streaming (80ms chunks)
   * - Send chunks to STT provider
   */
  private async initializeAudioCapture(): Promise<void> {
    try {
      console.log('🎤 ConversationManager: Initializing audio capture...');

      // Request microphone access
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          channelCount: AUDIO_CONFIG.channels,
          sampleRate: AUDIO_CONFIG.sampleRate,
        },
      });

      console.log('🎤 Microphone access granted');

      // Create AudioContext for processing (if needed in future)
      this.audioContext = new AudioContext({
        sampleRate: AUDIO_CONFIG.sampleRate,
      });

      // Create MediaRecorder for chunked streaming
      const mimeType = this.getSupportedMimeType();
      this.mediaRecorder = new MediaRecorder(this.mediaStream, {
        mimeType,
        audioBitsPerSecond: 128000, // 128 kbps for good quality
      });

      console.log(`🎙️ MediaRecorder created with mimeType: ${mimeType}`);

      // Setup data handler - send chunks to STT
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0 && this.config.sttProvider.sendAudio) {
          // Convert Blob to ArrayBuffer and send to STT
          event.data.arrayBuffer().then((buffer) => {
            this.config.sttProvider.sendAudio!(buffer);
          });
        }
      };

      this.mediaRecorder.onerror = (event: Event) => {
        console.error('❌ MediaRecorder error:', event);
        this.handleError(new Error('MediaRecorder error'), 'audio-capture');
      };

      // Start recording with 80ms chunks (optimal for low latency)
      this.mediaRecorder.start(AUDIO_CONFIG.chunkSizeMs);

      console.log(`✅ Audio capture initialized (${AUDIO_CONFIG.chunkSizeMs}ms chunks)`);
    } catch (error) {
      console.error('❌ Failed to initialize audio capture:', error);
      throw error;
    }
  }

  /**
   * Get supported MIME type for MediaRecorder
   * Tries in order of preference
   */
  private getSupportedMimeType(): string {
    const mimeTypes = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
    ];

    for (const mimeType of mimeTypes) {
      if (MediaRecorder.isTypeSupported(mimeType)) {
        return mimeType;
      }
    }

    // Fallback to default
    return '';
  }

  /**
   * Setup event handlers for all providers
   * Wire up the STT → LLM → Avatar pipeline
   */
  private setupProviderEventHandlers(): void {
    // ========== STT Events ==========

    // User started speaking
    this.config.sttProvider.onSpeechStart(() => {
      if (this.config.logTranscripts) {
        console.log('🎤 User started speaking');
      }

      // Handle barge-in if enabled
      if (this.config.enableBargeIn && this.state === ConversationState.AVATAR_SPEAKING) {
        this.handleBargeIn();
      } else {
        this.setState(ConversationState.USER_SPEAKING);
      }
    });

    // User stopped speaking
    this.config.sttProvider.onSpeechEnd(() => {
      if (this.config.logTranscripts) {
        console.log('🎤 User stopped speaking');
      }

      this.metrics.userStopSpeaking = Date.now();
      this.setState(ConversationState.LISTENING);
    });

    // Interim transcripts (real-time feedback)
    if (this.config.enableInterimTranscripts) {
      this.config.sttProvider.onInterim((text: string) => {
        if (this.config.logTranscripts) {
          console.log('📝 Interim:', text);
        }

        this.config.onTranscript?.(text, false);
      });
    }

    // Final transcript → send to LLM
    this.config.sttProvider.onTranscript((text: string) => {
      this.metrics.transcriptReceived = Date.now();

      if (this.config.logTranscripts) {
        console.log('✅ Final transcript:', text);
      }

      if (this.config.logLatency) {
        const sttLatency = this.metrics.transcriptReceived - this.metrics.userStopSpeaking;
        console.log(`⏱️ STT Latency: ${sttLatency}ms`);
      }

      this.config.onTranscript?.(text, true);

      // Process with LLM
      this.processWithLLM(text);
    });

    // STT errors
    this.config.sttProvider.onError((error: Error) => {
      console.error('❌ STT error:', error);
      this.handleError(error, 'stt');
    });

    // ========== Avatar Events ==========

    // Avatar started speaking
    this.config.avatarProvider.onSpeakStart(() => {
      this.metrics.avatarStartSpeaking = Date.now();

      if (this.config.logLatency) {
        const llmLatency = this.metrics.avatarStartSpeaking - this.metrics.transcriptReceived;
        const totalLatency = this.metrics.avatarStartSpeaking - this.metrics.userStopSpeaking;
        console.log(`⏱️ LLM→Avatar Latency: ${llmLatency}ms`);
        console.log(`⏱️ Total E2E Latency: ${totalLatency}ms`);
      }

      this.setState(ConversationState.AVATAR_SPEAKING);
    });

    // Avatar stopped speaking
    this.config.avatarProvider.onSpeakEnd(() => {
      if (this.config.logTranscripts) {
        console.log('🛑 Avatar stopped speaking');
      }

      this.setState(ConversationState.LISTENING);
    });
  }

  /**
   * Process user message with LLM
   * Handles both streaming and non-streaming modes
   */
  private async processWithLLM(userMessage: string): Promise<void> {
    try {
      this.setState(ConversationState.PROCESSING);
      this.currentLLMResponse = '';

      if (this.config.enableStreaming) {
        // Streaming mode - send chunks to avatar as they arrive
        let isFirstChunk = true;

        for await (const chunk of this.config.llmProvider.streamResponse(userMessage)) {
          if (isFirstChunk) {
            this.metrics.llmFirstToken = Date.now();
            const ttft = this.metrics.llmFirstToken - this.metrics.transcriptReceived;

            if (this.config.logLatency) {
              console.log(`⏱️ LLM TTFT (Time to First Token): ${ttft}ms`);
            }

            isFirstChunk = false;
          }

          this.currentLLMResponse += chunk;
          this.config.onLLMChunk?.(chunk);
        }

        this.metrics.llmComplete = Date.now();

        if (this.config.logLatency) {
          const llmTotal = this.metrics.llmComplete - this.metrics.transcriptReceived;
          console.log(`⏱️ LLM Total Generation: ${llmTotal}ms`);
        }

        // Send complete response to avatar (REPEAT mode)
        await this.config.avatarProvider.speak(this.currentLLMResponse, 'REPEAT');
      } else {
        // Non-streaming mode - wait for complete response
        const response = await this.config.llmProvider.generateResponse(userMessage);
        this.currentLLMResponse = response;

        this.metrics.llmComplete = Date.now();

        if (this.config.logLatency) {
          const llmTotal = this.metrics.llmComplete - this.metrics.transcriptReceived;
          console.log(`⏱️ LLM Total Generation: ${llmTotal}ms`);
        }

        // Send to avatar
        await this.config.avatarProvider.speak(response, 'REPEAT');
      }
    } catch (error) {
      console.error('❌ LLM processing error:', error);
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'llm');
    }
  }

  /**
   * Handle barge-in (user interrupts avatar)
   * Stops avatar and LLM immediately
   */
  private async handleBargeIn(): Promise<void> {
    try {
      console.log('🛑 Barge-in detected! Interrupting avatar and LLM...');

      this.setState(ConversationState.INTERRUPTED);

      // Stop avatar immediately
      if (this.config.avatarProvider.isSpeaking()) {
        await this.config.avatarProvider.interrupt();
      }

      // Stop LLM streaming
      if (this.config.llmProvider.isGenerating()) {
        this.config.llmProvider.interrupt();
      }

      // Reset for new user input
      this.currentLLMResponse = '';
      this.setState(ConversationState.USER_SPEAKING);

      console.log('✅ Barge-in handled');
    } catch (error) {
      console.error('❌ Barge-in handler error:', error);
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'barge-in');
    }
  }

  /**
   * Stop conversation manager
   * Cleanup all resources
   */
  async stop(): Promise<void> {
    if (!this.isActive) {
      console.warn('⚠️ ConversationManager: Not active');
      return;
    }

    try {
      console.log('🛑 ConversationManager: Stopping...');

      // Stop STT
      await this.config.sttProvider.stopListening();

      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        this.mediaRecorder = null;
      }

      // Stop media stream
      if (this.mediaStream) {
        this.mediaStream.getTracks().forEach((track) => track.stop());
        this.mediaStream = null;
      }

      // Close audio context
      if (this.audioContext) {
        await this.audioContext.close();
        this.audioContext = null;
      }

      this.isActive = false;
      this.setState(ConversationState.IDLE);

      console.log('✅ ConversationManager: Stopped');
    } catch (error) {
      console.error('❌ ConversationManager: Error during stop', error);
      this.handleError(error instanceof Error ? error : new Error(String(error)), 'stop');
    }
  }

  /**
   * Change conversation state
   * Emits state change event
   */
  private setState(newState: ConversationState): void {
    const oldState = this.state;

    if (oldState === newState) {
      return;
    }

    this.state = newState;

    if (this.config.logLatency) {
      console.log(`📊 State: ${oldState} → ${newState}`);
    }

    this.config.onStateChange?.(oldState, newState);
  }

  /**
   * Get current conversation state
   */
  getState(): ConversationState {
    return this.state;
  }

  /**
   * Handle errors
   */
  private handleError(error: Error, context?: string): void {
    console.error(`❌ ConversationManager error (${context || 'unknown'}):`, error);
    this.config.onError?.(error, context);
  }

  /**
   * Get latest metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      sttLatency: this.metrics.transcriptReceived - this.metrics.userStopSpeaking,
      llmLatency: this.metrics.llmComplete - this.metrics.transcriptReceived,
      ttsLatency: this.metrics.avatarStartSpeaking - this.metrics.llmComplete,
      totalLatency: this.metrics.avatarStartSpeaking - this.metrics.userStopSpeaking,
    };
  }

  /**
   * Cleanup all resources
   */
  async cleanup(): Promise<void> {
    await this.stop();

    // Cleanup providers
    await this.config.sttProvider.cleanup();
    await this.config.avatarProvider.cleanup();

    console.log('✅ ConversationManager: Cleanup complete');
  }
}
