/**
 * Deepgram Nova-3 STT Provider
 *
 * Implementation of STTProvider using Deepgram Nova-3 API
 * Supports Spanish language with endpointing-based turn detection
 *
 * Features:
 * - Multilingual support (Spanish es-419)
 * - UtteranceEnd and SpeechStarted events
 * - Smart formatting for natural transcriptions
 * - Interim results for real-time feedback
 * - ~500ms turn detection latency
 */

import { STTProvider } from '@/lib/realtime-conversation/interfaces';
import { createClient, LiveTranscriptionEvents } from '@deepgram/sdk';

export interface DeepgramNova3Config {
  apiKey: string;
  model: 'nova-3' | 'nova-2';
  language: 'es-419' | 'en-US' | 'en' | string;
  encoding: 'linear16';
  sampleRate: 16000 | 24000 | 48000;

  // Nova-3 specific settings
  endpointing?: number;          // Milliseconds of silence to detect turn end (default: 500ms)
  utteranceEndMs?: number;       // Alternative name for endpointing
  interimResults?: boolean;      // Enable interim transcripts (default: true)
  smartFormat?: boolean;         // Enable smart formatting (default: true)

  // Debugging
  logEvents?: boolean;
}

export class DeepgramNova3STT implements STTProvider {
  private client: any;
  private connection: any;
  private config: DeepgramNova3Config;
  private listening = false;
  private lastTranscript = '';   // Track last utterance

  // Callback storage
  private transcriptCallback?: (text: string) => void;
  private interimCallback?: (text: string) => void;
  private speechStartCallback?: () => void;
  private speechEndCallback?: () => void;
  private errorCallback?: (error: Error) => void;

  constructor(config: DeepgramNova3Config) {
    this.config = {
      endpointing: 500,
      interimResults: true,
      smartFormat: true,
      logEvents: false,
      ...config,
    };

    this.client = createClient(this.config.apiKey);
  }

  async startListening(): Promise<void> {
    if (this.listening) {
      console.warn('⚠️ DeepgramNova3STT: Already listening');
      return;
    }

    try {
      // Build connection options for Nova-3
      const options: any = {
        model: this.config.model,
        language: this.config.language,
        encoding: this.config.encoding,
        sample_rate: this.config.sampleRate,
        channels: 1,

        // Turn detection via endpointing (milliseconds of silence)
        endpointing: this.config.utteranceEndMs || this.config.endpointing,

        // Enable interim results and smart formatting
        interim_results: this.config.interimResults,
        smart_format: this.config.smartFormat,

        // VAD events for SpeechStarted detection
        vad_events: true,

        // Additional formatting
        punctuate: true,

        // Filler words for natural speech ("um", "eh")
        filler_words: true,
      };

      // Connect to Deepgram Nova-3 API
      this.connection = this.client.listen.live(options);

      // Register event handlers
      this.connection.on(LiveTranscriptionEvents.Open, this.handleOpen.bind(this));
      this.connection.on(LiveTranscriptionEvents.Transcript, this.handleTranscript.bind(this));
      this.connection.on(LiveTranscriptionEvents.UtteranceEnd, this.handleUtteranceEnd.bind(this));
      this.connection.on(LiveTranscriptionEvents.SpeechStarted, this.handleSpeechStarted.bind(this));
      this.connection.on(LiveTranscriptionEvents.Error, this.handleError.bind(this));
      this.connection.on(LiveTranscriptionEvents.Close, this.handleClose.bind(this));

      this.listening = true;

      if (this.config.logEvents) {
        console.log('✅ DeepgramNova3STT: Connected to Nova-3', {
          model: this.config.model,
          language: this.config.language,
          endpointing: this.config.endpointing,
        });
      }
    } catch (error) {
      console.error('❌ DeepgramNova3STT: Failed to start listening', error);
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
      this.lastTranscript = '';

      if (this.config.logEvents) {
        console.log('🔌 DeepgramNova3STT: Disconnected');
      }
    } catch (error) {
      console.error('❌ DeepgramNova3STT: Error stopping listening', error);
      this.errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  sendAudio(audioChunk: ArrayBuffer): void {
    if (!this.listening || !this.connection) {
      console.warn('⚠️ DeepgramNova3STT: Cannot send audio - not listening');
      return;
    }

    try {
      // Convert ArrayBuffer to Buffer for Deepgram SDK
      const buffer = Buffer.from(audioChunk);
      this.connection.send(buffer);
    } catch (error) {
      console.error('❌ DeepgramNova3STT: Error sending audio', error);
      this.errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  // ========== Event Handlers ==========

  private handleOpen(): void {
    if (this.config.logEvents) {
      console.log('🔗 DeepgramNova3STT: WebSocket opened');
    }
  }

  private handleTranscript(data: any): void {
    try {
      const message = data;

      // Handle transcript updates
      if (message.channel?.alternatives?.[0]) {
        const alternative = message.channel.alternatives[0];
        const transcript = alternative.transcript?.trim() || '';

        if (!transcript) return;

        if (message.is_final) {
          // Final transcript for this segment
          this.lastTranscript = transcript;

          if (this.config.logEvents) {
            console.log('📝 Final segment:', transcript);
          }
        } else if (message.speech_final) {
          // Speech final - end of utterance with high confidence
          this.lastTranscript = transcript;

          if (this.config.logEvents) {
            console.log('✅ Speech final:', transcript);
          }
        } else {
          // Interim transcript
          this.interimCallback?.(transcript);

          if (this.config.logEvents) {
            console.log('📝 Interim:', transcript);
          }
        }
      }
    } catch (error) {
      console.error('❌ DeepgramNova3STT: Error handling transcript', error);
      this.errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleUtteranceEnd(data: any): void {
    try {
      // UtteranceEnd event fired when endpointing detects turn end
      const transcript = this.lastTranscript;

      if (transcript) {
        // Emit final transcript
        this.transcriptCallback?.(transcript);

        if (this.config.logEvents) {
          console.log('✅ UtteranceEnd:', transcript);
        }
      }

      // Emit speech end event
      this.speechEndCallback?.();

      // Reset for next utterance
      this.lastTranscript = '';
    } catch (error) {
      console.error('❌ DeepgramNova3STT: Error handling utterance end', error);
      this.errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleSpeechStarted(data: any): void {
    try {
      // SpeechStarted event fired when speech is detected
      this.speechStartCallback?.();

      if (this.config.logEvents) {
        console.log('🎤 SpeechStarted');
      }
    } catch (error) {
      console.error('❌ DeepgramNova3STT: Error handling speech started', error);
      this.errorCallback?.(error instanceof Error ? error : new Error(String(error)));
    }
  }

  private handleError(error: any): void {
    console.error('❌ DeepgramNova3STT: WebSocket error', error);
    this.errorCallback?.(error instanceof Error ? error : new Error(String(error)));
  }

  private handleClose(): void {
    if (this.config.logEvents) {
      console.log('🔌 DeepgramNova3STT: WebSocket closed');
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
  }
}
