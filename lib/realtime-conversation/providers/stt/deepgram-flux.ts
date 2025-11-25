/**
 * Deepgram Flux STT Provider
 *
 * Implementation of STTProvider using Deepgram Flux v2 API
 * Provides native turn detection, eliminating need for custom VAD
 *
 * Features:
 * - Native StartOfTurn, EndOfTurn, EagerEndOfTurn, TurnResumed events
 * - Low-latency streaming (~260ms turn detection)
 * - Built-in barge-in detection
 * - Configurable confidence thresholds
 */

import { STTProvider, FluxTurnEvent } from '@/lib/realtime-conversation/interfaces';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export interface DeepgramFluxConfig {
  apiKey: string;
  model: 'flux-general-en' | 'flux-general-es';
  language?: string;
  encoding: 'linear16';
  sampleRate: 16000 | 24000 | 48000;

  // Flux-specific settings
  eotThreshold?: number;        // 0.5-0.9, default 0.7 (EndOfTurn confidence)
  eagerEotThreshold?: number;   // 0.3-0.9, enables EagerEndOfTurn
  eotTimeoutMs?: number;        // 500-10000, default 5000 (silence timeout)

  // Debugging
  logEvents?: boolean;
}

export class DeepgramFluxSTT implements STTProvider {
  private client: any;
  private connection: any;
  private config: DeepgramFluxConfig;
  private listening = false;

  // Callback storage
  private transcriptCallback?: (text: string) => void;
  private interimCallback?: (text: string) => void;
  private speechStartCallback?: () => void;
  private speechEndCallback?: () => void;
  private errorCallback?: (error: Error) => void;
  private eagerEndOfTurnCallback?: (text: string) => void;
  private turnResumedCallback?: () => void;
  private turnEventCallback?: (event: FluxTurnEvent) => void;

  constructor(config: DeepgramFluxConfig) {
    this.config = {
      eotThreshold: 0.7,
      eotTimeoutMs: 6000,
      logEvents: false,
      ...config,
    };

    this.client = createClient(this.config.apiKey);
  }

  async startListening(): Promise<void> {
    if (this.listening) {
      console.warn('⚠️ DeepgramFluxSTT: Already listening');
      return;
    }

    try {
      // Build connection options
      const options: any = {
        model: this.config.model,
        encoding: this.config.encoding,
        sample_rate: this.config.sampleRate,
        channels: 1,

        // Flux v2 specific parameters
        eot_threshold: this.config.eotThreshold?.toString(),
        eot_timeout_ms: this.config.eotTimeoutMs?.toString(),
      };

      // Add language if specified
      if (this.config.language) {
        options.language = this.config.language;
      }

      // Add eager EOT if configured (enables low-latency mode)
      if (this.config.eagerEotThreshold !== undefined) {
        options.eager_eot_threshold = this.config.eagerEotThreshold.toString();
      }

      // Connect to Deepgram Flux v2 API
      this.connection = this.client.listen.live(options);

      // Register event handlers
      this.connection.on(LiveTranscriptionEvents.Open, this.handleOpen.bind(this));
      this.connection.on(LiveTranscriptionEvents.Transcript, this.handleMessage.bind(this));
      this.connection.on(LiveTranscriptionEvents.Error, this.handleError.bind(this));
      this.connection.on(LiveTranscriptionEvents.Close, this.handleClose.bind(this));

      this.listening = true;

      if (this.config.logEvents) {
        console.log('✅ DeepgramFluxSTT: Connected to Flux v2', {
          model: this.config.model,
          eotThreshold: this.config.eotThreshold,
          eagerMode: this.config.eagerEotThreshold !== undefined,
        });
      }
    } catch (error) {
      console.error('❌ DeepgramFluxSTT: Failed to start listening', error);
      this.listening = false;
      throw error;
    }
  }

  async stopListening(): Promise<void> {
    if (!this.listening) {
      return;
    }

    try {
      if (this.connection) {
        // Send CloseStream to flush pending audio
        this.connection.send(JSON.stringify({ type: 'CloseStream' }));

        // Wait a bit for final transcripts
        await new Promise(resolve => setTimeout(resolve, 200));

        // Close connection
        this.connection.finish();
        this.connection = null;
      }

      this.listening = false;

      if (this.config.logEvents) {
        console.log('🔌 DeepgramFluxSTT: Disconnected');
      }
    } catch (error) {
      console.error('❌ DeepgramFluxSTT: Error stopping listening', error);
      this.errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  sendAudio(audioChunk: ArrayBuffer): void {
    if (!this.listening || !this.connection) {
      console.warn('⚠️ DeepgramFluxSTT: Cannot send audio - not listening');
      return;
    }

    try {
      // Convert ArrayBuffer to Buffer for Deepgram SDK
      const buffer = Buffer.from(audioChunk);
      this.connection.send(buffer);
    } catch (error) {
      console.error('❌ DeepgramFluxSTT: Error sending audio', error);
      this.errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // ========== Event Handlers ==========

  private handleOpen(): void {
    if (this.config.logEvents) {
      console.log('🔗 DeepgramFluxSTT: WebSocket opened');
    }
  }

  private handleMessage(data: any): void {
    try {
      // Deepgram SDK v3 provides parsed data directly
      const message = data;

      // Check for Flux TurnInfo events
      if (message.type === 'TurnInfo') {
        this.handleTurnEvent(message);
        return;
      }

      // Handle regular transcript updates (interim results)
      if (message.channel?.alternatives?.[0]) {
        const alternative = message.channel.alternatives[0];
        const transcript = alternative.transcript?.trim() || '';

        if (transcript && message.is_final === false) {
          // Interim transcript
          this.interimCallback?.(transcript);

          if (this.config.logEvents) {
            console.log('📝 Interim:', transcript);
          }
        }
      }
    } catch (error) {
      console.error('❌ DeepgramFluxSTT: Error handling message', error);
      this.errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleTurnEvent(message: any): void {
    const event = message.event;
    const transcript = message.transcript?.trim() || '';
    const confidence = message.confidence;

    // Create Flux turn event
    const turnEvent: FluxTurnEvent = {
      type: event,
      transcript: transcript || undefined,
      confidence,
      timestamp: Date.now(),
    };

    // Emit to turn event callback (for debugging/monitoring)
    this.turnEventCallback?.(turnEvent);

    // Handle specific turn events
    switch (event) {
      case 'StartOfTurn':
        // User started speaking
        this.speechStartCallback?.();

        if (this.config.logEvents) {
          console.log('🎤 StartOfTurn');
        }
        break;

      case 'EagerEndOfTurn':
        // Medium confidence end-of-turn - start preparing response
        if (transcript) {
          this.eagerEndOfTurnCallback?.(transcript);

          if (this.config.logEvents) {
            console.log('⚡ EagerEndOfTurn:', transcript, `(confidence: ${confidence})`);
          }
        }
        break;

      case 'TurnResumed':
        // User continued speaking - cancel any draft responses
        this.turnResumedCallback?.();

        if (this.config.logEvents) {
          console.log('🔄 TurnResumed - user continued speaking');
        }
        break;

      case 'EndOfTurn':
        // High confidence end-of-turn - execute final response
        this.speechEndCallback?.();

        if (transcript) {
          this.transcriptCallback?.(transcript);

          if (this.config.logEvents) {
            console.log('✅ EndOfTurn:', transcript, `(confidence: ${confidence})`);
          }
        }
        break;

      default:
        if (this.config.logEvents) {
          console.log('📊 Unknown turn event:', event, transcript);
        }
    }
  }

  private handleError(error: any): void {
    console.error('❌ DeepgramFluxSTT: WebSocket error', error);
    this.errorCallback?.(error instanceof Error ? error : new Error(String(error)));
  }

  private handleClose(): void {
    if (this.config.logEvents) {
      console.log('🔌 DeepgramFluxSTT: WebSocket closed');
    }
    this.listening = false;
  }

  // ========== Callback Registration ==========

  onTranscript(callback: (text: string) => void): void {
    this.transcriptCallback = callback;
  }

  onInterim(callback: (text: string) => void): void {
    this.interimCallback = callback;
  }

  onSpeechStart(callback: () => void): void {
    this.speechStartCallback = callback;
  }

  onSpeechEnd(callback: () => void): void {
    this.speechEndCallback = callback;
  }

  onError(callback: (error: Error) => void): void {
    this.errorCallback = callback;
  }

  onEagerEndOfTurn(callback: (text: string) => void): void {
    this.eagerEndOfTurnCallback = callback;
  }

  onTurnResumed(callback: () => void): void {
    this.turnResumedCallback = callback;
  }

  onTurnEvent(callback: (event: FluxTurnEvent) => void): void {
    this.turnEventCallback = callback;
  }

  // ========== Status Methods ==========

  isListening(): boolean {
    return this.listening;
  }

  async cleanup(): Promise<void> {
    await this.stopListening();
    this.client = null;

    // Clear all callbacks
    this.transcriptCallback = undefined;
    this.interimCallback = undefined;
    this.speechStartCallback = undefined;
    this.speechEndCallback = undefined;
    this.errorCallback = undefined;
    this.eagerEndOfTurnCallback = undefined;
    this.turnResumedCallback = undefined;
    this.turnEventCallback = undefined;
  }
}
