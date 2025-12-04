/**
 * HeyGen Avatar Provider
 *
 * Wrapper around HeyGen StreamingAvatar SDK for use in modular conversation pipeline.
 * Forces REPEAT mode (TTS only) to integrate with external LLM providers.
 *
 * Features:
 * - REPEAT mode only (no internal LLM, pure TTS)
 * - Interrupt support (stop mid-speech)
 * - Event callbacks (onSpeakStart, onSpeakEnd)
 * - Video stream management
 * - Automatic session lifecycle
 *
 * Usage:
 * ```typescript
 * const avatar = new HeyGenAvatarProvider({
 *   apiKey: 'your-heygen-key',
 *   avatarId: 'Katya_CasualLook_public',
 *   voiceId: '0e69c649917e4a6da0f9a9e1fe02f498',
 * });
 *
 * await avatar.initialize();
 *
 * // Register callbacks
 * avatar.onSpeakStart(() => console.log('Avatar started speaking'));
 * avatar.onSpeakEnd(() => console.log('Avatar stopped speaking'));
 *
 * // Speak text (REPEAT mode = TTS only)
 * await avatar.speak('Hola, ¿cómo estás?', 'REPEAT');
 *
 * // Interrupt if needed
 * await avatar.interrupt();
 *
 * // Get video stream for rendering
 * const stream = avatar.getStream();
 * videoElement.srcObject = stream;
 * ```
 */

import StreamingAvatar, {
  AvatarQuality,
  ElevenLabsModel,
  StreamingEvents,
  TaskMode,
  TaskType,
} from '@heygen/streaming-avatar';
import { AvatarProvider } from '@/lib/realtime-conversation/interfaces';

export interface HeyGenConfig {
  apiKey: string;
  avatarId: string;
  voiceId: string;
  language?: string;
  quality?: AvatarQuality;
  basePath?: string;

  // Debugging
  logEvents?: boolean;
}

export class HeyGenAvatarProvider implements AvatarProvider {
  private avatar: StreamingAvatar | null = null;
  private config: HeyGenConfig;
  private stream: MediaStream | null = null;
  private speaking: boolean = false;
  private initialized: boolean = false;

  // Callbacks
  private speakStartCallback?: () => void;
  private speakEndCallback?: () => void;

  constructor(config: HeyGenConfig) {
    this.config = {
      quality: AvatarQuality.Medium,
      language: 'es',
      basePath: process.env.NEXT_PUBLIC_BASE_API_URL || 'https://api.heygen.com',
      logEvents: false,
      ...config,
    };
  }

  /**
   * Initialize HeyGen avatar session
   * Must be called before any other operations
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      console.warn('⚠️ HeyGenAvatarProvider: Already initialized');
      return;
    }

    try {
      if (this.config.logEvents) {
        console.log('🔄 HeyGenAvatarProvider: Initializing...');
      }

      // Create avatar instance
      this.avatar = new StreamingAvatar({
        token: this.config.apiKey,
        basePath: this.config.basePath,
      });

      // Register event handlers
      this.setupEventHandlers();

      // Start avatar session
      await this.avatar.createStartAvatar({
        quality: this.config.quality!,
        avatarName: this.config.avatarId,
        voice: {
          voiceId: this.config.voiceId,
          model: ElevenLabsModel.eleven_flash_v2_5,
        },
        language: this.config.language!,
      });

      this.initialized = true;

      if (this.config.logEvents) {
        console.log('✅ HeyGenAvatarProvider: Initialized successfully');
      }
    } catch (error) {
      console.error('❌ HeyGenAvatarProvider: Initialization failed', error);
      this.initialized = false;
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.avatar) return;

    // Stream ready - capture video stream
    this.avatar.on(StreamingEvents.STREAM_READY, ({ detail }: { detail: MediaStream }) => {
      this.stream = detail;

      if (this.config.logEvents) {
        console.log('🎥 HeyGenAvatarProvider: Video stream ready');
      }
    });

    // Avatar starts speaking
    this.avatar.on(StreamingEvents.AVATAR_START_TALKING, () => {
      this.speaking = true;
      this.speakStartCallback?.();

      if (this.config.logEvents) {
        console.log('🗣️ HeyGenAvatarProvider: Avatar started speaking');
      }
    });

    // Avatar stops speaking
    this.avatar.on(StreamingEvents.AVATAR_STOP_TALKING, () => {
      this.speaking = false;
      this.speakEndCallback?.();

      if (this.config.logEvents) {
        console.log('🛑 HeyGenAvatarProvider: Avatar stopped speaking');
      }
    });

    // Stream disconnected
    this.avatar.on(StreamingEvents.STREAM_DISCONNECTED, () => {
      this.stream = null;
      this.speaking = false;
      this.initialized = false;

      if (this.config.logEvents) {
        console.log('🔌 HeyGenAvatarProvider: Stream disconnected');
      }
    });
  }

  /**
   * Make avatar speak text
   *
   * IMPORTANT: This implementation FORCES REPEAT mode (TTS only)
   * regardless of the mode parameter. This ensures integration
   * with external LLM providers in the modular pipeline.
   *
   * @param text Text to speak
   * @param mode 'TALK' or 'REPEAT' (always uses REPEAT)
   */
  async speak(text: string, mode: 'TALK' | 'REPEAT' = 'REPEAT'): Promise<void> {
    if (!this.initialized || !this.avatar) {
      throw new Error('HeyGenAvatarProvider not initialized. Call initialize() first.');
    }

    if (!text || text.trim() === '') {
      console.warn('⚠️ HeyGenAvatarProvider: Empty text provided to speak()');
      return;
    }

    try {
      // ALWAYS force REPEAT mode (TTS only, no LLM)
      // This is critical for the modular pipeline where LLM is handled externally
      if (mode !== 'REPEAT' && this.config.logEvents) {
        console.warn('⚠️ HeyGenAvatarProvider: Forcing REPEAT mode (requested was ' + mode + ')');
      }

      if (this.config.logEvents) {
        console.log('🗣️ HeyGenAvatarProvider: Speaking (REPEAT mode):', text);
      }

      await this.avatar.speak({
        text: text.trim(),
        taskType: TaskType.REPEAT, // FORCE REPEAT mode
        taskMode: TaskMode.SYNC,   // Wait for previous speech to finish
      });
    } catch (error) {
      console.error('❌ HeyGenAvatarProvider: Error during speak()', error);
      throw error;
    }
  }

  /**
   * Interrupt avatar mid-speech
   * Stops current speech immediately
   */
  async interrupt(): Promise<void> {
    if (!this.initialized || !this.avatar) {
      console.warn('⚠️ HeyGenAvatarProvider: Cannot interrupt - not initialized');
      return;
    }

    if (!this.speaking) {
      if (this.config.logEvents) {
        console.log('ℹ️ HeyGenAvatarProvider: Not speaking, nothing to interrupt');
      }
      return;
    }

    try {
      if (this.config.logEvents) {
        console.log('🛑 HeyGenAvatarProvider: Interrupting speech...');
      }

      // HeyGen SDK has interrupt() method
      await this.avatar.interrupt();

      this.speaking = false;

      if (this.config.logEvents) {
        console.log('✅ HeyGenAvatarProvider: Interrupted successfully');
      }
    } catch (error) {
      console.error('❌ HeyGenAvatarProvider: Error during interrupt()', error);
      throw error;
    }
  }

  /**
   * Check if avatar is currently speaking
   */
  isSpeaking(): boolean {
    return this.speaking;
  }

  /**
   * Register callback for when avatar starts speaking
   */
  onSpeakStart(callback: () => void): void {
    this.speakStartCallback = callback;
  }

  /**
   * Register callback for when avatar stops speaking
   */
  onSpeakEnd(callback: () => void): void {
    this.speakEndCallback = callback;
  }

  /**
   * Get video stream for rendering
   */
  getStream(): MediaStream | null {
    return this.stream;
  }

  /**
   * Cleanup and destroy avatar session
   */
  async cleanup(): Promise<void> {
    if (this.config.logEvents) {
      console.log('🧹 HeyGenAvatarProvider: Cleaning up...');
    }

    try {
      // Stop avatar session
      if (this.avatar && this.initialized) {
        await this.avatar.stopAvatar();
      }

      // Clear state
      this.avatar = null;
      this.stream = null;
      this.speaking = false;
      this.initialized = false;

      // Clear callbacks
      this.speakStartCallback = undefined;
      this.speakEndCallback = undefined;

      if (this.config.logEvents) {
        console.log('✅ HeyGenAvatarProvider: Cleanup complete');
      }
    } catch (error) {
      console.error('❌ HeyGenAvatarProvider: Error during cleanup', error);
    }
  }

  /**
   * Check if provider is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Attach to an existing StreamingAvatar session
   * Useful when the avatar is managed by external hooks (e.g., useStreamingAvatarSession)
   *
   * @param avatar Existing StreamingAvatar instance
   * @param stream Optional MediaStream if already available
   */
  attachToExistingSession(avatar: StreamingAvatar, stream?: MediaStream | null): void {
    if (this.initialized) {
      console.warn('⚠️ HeyGenAvatarProvider: Already initialized, detaching first');
      this.avatar = null;
      this.stream = null;
      this.speaking = false;
      this.initialized = false;
    }

    this.avatar = avatar;
    if (stream) {
      this.stream = stream;
    }

    // Setup event handlers for the existing avatar
    this.setupEventHandlers();

    this.initialized = true;

    if (this.config.logEvents) {
      console.log('✅ HeyGenAvatarProvider: Attached to existing session');
    }
  }

  /**
   * Detach from current session without stopping the avatar
   * Useful when handing back control to another system
   */
  detach(): void {
    if (!this.initialized) {
      return;
    }

    // Clear local references but don't stop the avatar
    this.avatar = null;
    this.stream = null;
    this.speaking = false;
    this.initialized = false;

    // Clear callbacks
    this.speakStartCallback = undefined;
    this.speakEndCallback = undefined;

    if (this.config.logEvents) {
      console.log('🔌 HeyGenAvatarProvider: Detached from session');
    }
  }
}
