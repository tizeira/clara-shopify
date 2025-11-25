/**
 * Deepgram Streaming STT Provider
 *
 * Implements real-time speech-to-text using Deepgram Nova-2 model
 * configured for Latin American Spanish (es-419, closest to Chilean).
 *
 * Features:
 * - Real-time streaming transcription
 * - Interim results (partial transcripts)
 * - Voice Activity Detection (VAD) for barge-in
 * - Smart formatting (punctuation, capitalization)
 * - Configurable end-of-turn detection
 */

import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';
import { STTProvider } from '../../interfaces';
import { PROVIDER_CONFIG, CONVERSATION_TIMING, CONVERSATION_FEATURES } from '@/config/features';

interface DeepgramConfig {
  apiKey: string;
  // Optional overrides (uses config/features.ts by default)
  model?: string;
  language?: string;
  endpointing?: number;
  eotThreshold?: number;
  eotTimeoutMs?: number;
  keyterms?: string[];
}

export class DeepgramStreamingSTT implements STTProvider {
  private deepgram: any;
  private connection: any;
  private mediaRecorder: MediaRecorder | null = null;
  private stream: MediaStream | null = null;
  private config: DeepgramConfig;
  private isListeningFlag: boolean = false;

  // Callbacks
  private onTranscriptCallback?: (text: string) => void;
  private onInterimCallback?: (text: string) => void;
  private onSpeechStartCallback?: () => void;
  private onSpeechEndCallback?: () => void;
  private onErrorCallback?: (error: Error) => void;

  constructor(config: DeepgramConfig) {
    this.config = config;
    this.deepgram = createClient(config.apiKey);
  }

  async startListening(): Promise<void> {
    if (this.isListeningFlag) {
      console.warn('⚠️ Already listening');
      return;
    }

    try {
      console.log('🎤 Starting Deepgram STT...');

      // 1. Get microphone access
      await this.initializeMicrophone();

      // 2. Open Deepgram WebSocket connection
      await this.openDeepgramConnection();

      // 3. Setup event listeners
      this.setupEventListeners();

      // 4. Start sending audio
      this.startAudioStream();

      this.isListeningFlag = true;
      console.log('✅ Deepgram STT started successfully');

    } catch (error: any) {
      console.error('❌ Failed to start Deepgram STT:', error);
      this.isListeningFlag = false;
      this.onErrorCallback?.(error);
      throw error;
    }
  }

  private async initializeMicrophone(): Promise<void> {
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          // Let browser choose optimal channelCount and sampleRate
        }
      });

      console.log('🎤 Microphone access granted');

      // Log audio track info for debugging
      const audioTracks = this.stream.getAudioTracks();
      if (audioTracks.length > 0) {
        const track = audioTracks[0];
        console.log('🎙️ Audio track:', {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          label: track.label,
        });
      }

    } catch (error: any) {
      if (error.name === 'NotAllowedError') {
        throw new Error('Microphone access denied. Please allow microphone permissions.');
      } else if (error.name === 'NotFoundError') {
        throw new Error('No microphone found. Please connect a microphone.');
      } else {
        throw new Error(`Failed to access microphone: ${error.message}`);
      }
    }
  }

  private async openDeepgramConnection(): Promise<void> {
    // Build configuration
    const connectionConfig: any = {
      model: this.config.model || PROVIDER_CONFIG.deepgram.model,
      language: this.config.language || PROVIDER_CONFIG.deepgram.language,
      smart_format: PROVIDER_CONFIG.deepgram.smart_format,
      interim_results: PROVIDER_CONFIG.deepgram.interim_results,
      endpointing: this.config.endpointing || CONVERSATION_TIMING.ENDPOINTING_DELAY_MS,
      vad_events: true, // Force enable VAD events for speech detection
      // Don't specify encoding - let Deepgram auto-detect from WebM/Opus
      // Don't specify channels or sample_rate - let browser/Deepgram handle
    };

    // Add optional End-of-Turn configuration if provided
    if (this.config.eotThreshold !== undefined) {
      connectionConfig.eot_threshold = this.config.eotThreshold;
    }

    if (this.config.eotTimeoutMs !== undefined) {
      connectionConfig.eot_timeout_ms = this.config.eotTimeoutMs;
    }

    // Add keyterms if provided (for boosting recognition of specific words)
    if (this.config.keyterms && this.config.keyterms.length > 0) {
      connectionConfig.keywords = this.config.keyterms.join(',');
    }

    console.log('🌐 Opening Deepgram connection with config:', {
      model: connectionConfig.model,
      language: connectionConfig.language,
      endpointing: connectionConfig.endpointing,
      vad_events: connectionConfig.vad_events,
      eot_threshold: connectionConfig.eot_threshold,
      eot_timeout_ms: connectionConfig.eot_timeout_ms,
    });

    // Open connection
    this.connection = this.deepgram.listen.live(connectionConfig);

    // Wait for connection to open
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Deepgram connection timeout'));
      }, CONVERSATION_TIMING.STT_TIMEOUT_MS);

      this.connection.on(LiveTranscriptionEvents.Open, () => {
        clearTimeout(timeout);
        console.log('✅ Deepgram connection established');
        resolve();
      });

      this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
        clearTimeout(timeout);
        reject(error);
      });
    });
  }

  private setupEventListeners(): void {
    // Transcript events
    this.connection.on(LiveTranscriptionEvents.Transcript, (data: any) => {
      try {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        const confidence = data.channel?.alternatives?.[0]?.confidence;

        // Skip empty transcripts silently
        if (!transcript || transcript.trim() === '') {
          return;
        }

        // Only log transcripts if feature flag enabled
        if (CONVERSATION_FEATURES.LOG_TRANSCRIPTS) {
          const type = data.is_final ? '✅ Final' : '⏳ Interim';
          console.log(`${type}: "${transcript}" (${(confidence * 100).toFixed(0)}%)`);
        }

        if (data.is_final) {
          // Final transcript → send to LLM
          this.onTranscriptCallback?.(transcript);
        } else {
          // Interim transcript → show in UI
          this.onInterimCallback?.(transcript);
        }
      } catch (error) {
        console.error('❌ Error processing transcript:', error);
      }
    });

    // Voice Activity Detection events (for barge-in)
    this.connection.on(LiveTranscriptionEvents.SpeechStarted, () => {
      if (CONVERSATION_FEATURES.LOG_STATE_TRANSITIONS) {
        console.log('🎤 Speech started detected');
      }
      this.onSpeechStartCallback?.();
    });

    this.connection.on(LiveTranscriptionEvents.UtteranceEnd, () => {
      if (CONVERSATION_FEATURES.LOG_STATE_TRANSITIONS) {
        console.log('🎤 Speech ended detected (utterance end)');
      }
      this.onSpeechEndCallback?.();
    });

    // End of Turn events (if configured)
    this.connection.on('EndOfTurn', (data: any) => {
      if (CONVERSATION_FEATURES.LOG_STATE_TRANSITIONS) {
        console.log('🔚 End of Turn detected:', {
          turn_index: data.turn_index,
          confidence: data.end_of_turn_confidence,
        });
      }
      this.onSpeechEndCallback?.();
    });

    this.connection.on('StartOfTurn', (data: any) => {
      if (CONVERSATION_FEATURES.LOG_STATE_TRANSITIONS) {
        console.log('▶️ Start of Turn detected:', {
          turn_index: data.turn_index,
        });
      }
      this.onSpeechStartCallback?.();
    });

    // Error handling
    this.connection.on(LiveTranscriptionEvents.Error, (error: any) => {
      console.error('❌ Deepgram error:', error);

      // Parse error type
      let errorMessage = error.message || 'Unknown Deepgram error';

      if (error.message?.includes('401')) {
        errorMessage = 'Invalid Deepgram API key';
      } else if (error.message?.includes('429')) {
        errorMessage = 'Deepgram rate limit exceeded';
      } else if (error.message?.includes('network')) {
        errorMessage = 'Network error connecting to Deepgram';
      }

      this.onErrorCallback?.(new Error(errorMessage));
    });

    // Connection lifecycle events
    this.connection.on(LiveTranscriptionEvents.Open, () => {
      console.log('🌐 Deepgram connection opened');
    });

    this.connection.on(LiveTranscriptionEvents.Close, () => {
      console.log('🔌 Deepgram connection closed');
      this.isListeningFlag = false;
    });

    // Metadata events (optional, for debugging)
    this.connection.on(LiveTranscriptionEvents.Metadata, (data: any) => {
      if (CONVERSATION_FEATURES.LOG_LATENCY) {
        console.log('📊 Deepgram metadata:', {
          request_id: data.request_id,
          duration: data.duration,
        });
      }
    });
  }

  private startAudioStream(): void {
    if (!this.stream) {
      throw new Error('Media stream not initialized');
    }

    try {
      // Create MediaRecorder to capture audio
      const mimeType = this.getSupportedMimeType();

      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType,
      });

      console.log('🎙️ MediaRecorder created with mimeType:', mimeType);
      console.log('🎙️ MediaRecorder state:', this.mediaRecorder.state);

      let chunkCount = 0;

      // Send audio chunks to Deepgram
      this.mediaRecorder.ondataavailable = (event) => {
        chunkCount++;
        const readyState = this.connection?.getReadyState();

        console.log(`📦 Audio chunk #${chunkCount}:`, {
          size: event.data.size,
          type: event.data.type,
          connectionReady: readyState === 1,
          connectionState: readyState,
        });

        if (event.data.size > 0 && this.connection && readyState === 1) {
          this.connection.send(event.data);
          console.log(`✅ Sent chunk #${chunkCount} to Deepgram (${event.data.size} bytes)`);
        } else {
          console.warn(`⚠️ Chunk #${chunkCount} NOT sent:`, {
            hasData: event.data.size > 0,
            hasConnection: !!this.connection,
            isReady: readyState === 1,
          });
        }
      };

      this.mediaRecorder.onerror = (event: any) => {
        console.error('❌ MediaRecorder error:', event.error);
        this.onErrorCallback?.(new Error(`MediaRecorder error: ${event.error}`));
      };

      this.mediaRecorder.onstart = () => {
        console.log('🎙️ MediaRecorder started');
      };

      this.mediaRecorder.onstop = () => {
        console.log('🛑 MediaRecorder stopped');
      };

      // Start recording (send chunks every 250ms for low latency)
      this.mediaRecorder.start(250);
      console.log('🎙️ Audio streaming started (250ms chunks)');
      console.log('🎙️ MediaRecorder state after start:', this.mediaRecorder.state);

    } catch (error: any) {
      console.error('❌ Failed to start audio stream:', error);
      throw error;
    }
  }

  private getSupportedMimeType(): string {
    // Try different mime types in order of preference
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

  async stopListening(): Promise<void> {
    if (!this.isListeningFlag) {
      console.warn('⚠️ Not currently listening');
      return;
    }

    console.log('🛑 Stopping Deepgram STT...');

    try {
      // Stop media recorder
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
        this.mediaRecorder = null;
      }

      // Stop media stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => {
          track.stop();
          console.log('🎤 Audio track stopped:', track.label);
        });
        this.stream = null;
      }

      // Close Deepgram connection
      if (this.connection) {
        this.connection.finish();

        // Wait a bit for graceful close
        await new Promise(resolve => setTimeout(resolve, 100));

        this.connection = null;
      }

      this.isListeningFlag = false;
      console.log('✅ Deepgram STT stopped successfully');

    } catch (error) {
      console.error('❌ Error stopping Deepgram STT:', error);
      throw error;
    }
  }

  // Callback setters (implements STTProvider interface)
  onTranscript(callback: (text: string) => void): void {
    this.onTranscriptCallback = callback;
  }

  onInterim(callback: (text: string) => void): void {
    this.onInterimCallback = callback;
  }

  onSpeechStart(callback: () => void): void {
    this.onSpeechStartCallback = callback;
  }

  onSpeechEnd(callback: () => void): void {
    this.onSpeechEndCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.onErrorCallback = callback;
  }

  isListening(): boolean {
    return this.isListeningFlag && this.mediaRecorder?.state === 'recording';
  }

  async cleanup(): Promise<void> {
    console.log('🧹 Cleaning up Deepgram STT...');

    try {
      await this.stopListening();

      // Clear callbacks
      this.onTranscriptCallback = undefined;
      this.onInterimCallback = undefined;
      this.onSpeechStartCallback = undefined;
      this.onSpeechEndCallback = undefined;
      this.onErrorCallback = undefined;

      // Clear Deepgram client
      this.deepgram = null;
      this.connection = null;

      console.log('✅ Deepgram STT cleanup complete');
    } catch (error) {
      console.error('❌ Error during cleanup:', error);
    }
  }

  // Utility method to get connection status
  getStatus(): {
    isListening: boolean;
    isConnected: boolean;
    hasStream: boolean;
  } {
    return {
      isListening: this.isListeningFlag,
      isConnected: this.connection?.getReadyState() === 1,
      hasStream: this.stream !== null,
    };
  }
}
