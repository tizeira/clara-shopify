/**
 * Core interfaces for Clara's real-time conversation system
 *
 * Architecture: Pluggable providers for STT, LLM, and Avatar
 * This allows easy switching between implementations and fallbacks
 */

/**
 * Flux Turn Event Types
 * Events emitted by Deepgram Flux v2 API
 */
export interface FluxTurnEvent {
  type: 'StartOfTurn' | 'EagerEndOfTurn' | 'TurnResumed' | 'EndOfTurn' | 'Update';
  transcript?: string;
  confidence?: number;
  timestamp: number;
}

/**
 * Speech-to-Text Provider Interface
 *
 * Implementations:
 * - DeepgramFluxSTT (primary - Flux v2 with native turn detection)
 * - DeepgramStreamingSTT (fallback - Nova-2 with custom VAD)
 * - WhisperSTT (fallback - batch processing)
 */
export interface STTProvider {
  /**
   * Start listening to audio input
   * @returns Promise that resolves when listening starts
   */
  startListening(): Promise<void>;

  /**
   * Stop listening to audio input
   * @returns Promise that resolves when listening stops
   */
  stopListening(): Promise<void>;

  /**
   * Send audio chunk to STT provider
   * @param audioChunk Raw audio data (linear16 PCM)
   */
  sendAudio?(audioChunk: ArrayBuffer): void;

  /**
   * Register callback for final transcripts (complete utterances)
   * @param callback Function called with final transcript text
   */
  onTranscript(callback: (text: string) => void): void;

  /**
   * Register callback for interim transcripts (real-time feedback)
   * @param callback Function called with partial transcript text
   */
  onInterim(callback: (text: string) => void): void;

  /**
   * Register callback for speech start detection (for barge-in)
   * @param callback Function called when user starts speaking
   */
  onSpeechStart(callback: () => void): void;

  /**
   * Register callback for speech end detection
   * @param callback Function called when user stops speaking
   */
  onSpeechEnd(callback: () => void): void;

  /**
   * Register callback for errors
   * @param callback Function called with error
   */
  onError(callback: (error: Error) => void): void;

  /**
   * Check if currently listening
   */
  isListening(): boolean;

  /**
   * Cleanup and disconnect
   */
  cleanup(): Promise<void>;

  // ========== Flux-specific callbacks (optional) ==========

  /**
   * Register callback for EagerEndOfTurn (medium confidence end-of-turn)
   * Used for low-latency mode - start preparing response before final confirmation
   * @param callback Function called with partial transcript
   */
  onEagerEndOfTurn?(callback: (text: string) => void): void;

  /**
   * Register callback for TurnResumed (user continued speaking after EagerEndOfTurn)
   * Used to cancel draft responses prepared during eager mode
   * @param callback Function called when user resumes speaking
   */
  onTurnResumed?(callback: () => void): void;

  /**
   * Register callback for all Flux turn events (for debugging/monitoring)
   * @param callback Function called with turn event details
   */
  onTurnEvent?(callback: (event: FluxTurnEvent) => void): void;
}

/**
 * LLM Provider Interface
 *
 * Implementations:
 * - ClaudeStreamingLLM (primary - Haiku 4.5 with streaming)
 * - ClaudeSimpleLLM (fallback - non-streaming)
 */
export interface LLMProvider {
  /**
   * Generate response to user input (non-streaming)
   * @param userMessage User's message text
   * @returns Promise with complete response
   */
  generateResponse(userMessage: string): Promise<string>;

  /**
   * Stream response to user input (for low latency)
   * @param userMessage User's message text
   * @returns AsyncGenerator yielding text chunks
   */
  streamResponse(userMessage: string): AsyncGenerator<string, void, unknown>;

  /**
   * Interrupt ongoing generation
   * Stops streaming and cleans up
   */
  interrupt(): void;

  /**
   * Add message to conversation history
   * @param role 'user' or 'assistant'
   * @param content Message content
   */
  addToHistory(role: 'user' | 'assistant', content: string): void;

  /**
   * Get conversation history
   */
  getHistory(): Array<{ role: string; content: string }>;

  /**
   * Clear conversation history (keeps system prompt)
   */
  clearHistory(): void;

  /**
   * Check if currently generating
   */
  isGenerating(): boolean;
}

/**
 * Avatar Provider Interface
 *
 * Implementation:
 * - HeyGenAvatarProvider (wraps StreamingAvatar SDK with REPEAT mode)
 */
export interface AvatarProvider {
  /**
   * Make avatar speak text
   * @param text Text to speak
   * @param mode 'TALK' (with LLM) or 'REPEAT' (TTS only)
   * @returns Promise that resolves when speech starts
   */
  speak(text: string, mode: 'TALK' | 'REPEAT'): Promise<void>;

  /**
   * Interrupt avatar mid-speech
   * @returns Promise that resolves when interrupted
   */
  interrupt(): Promise<void>;

  /**
   * Check if avatar is currently speaking
   */
  isSpeaking(): boolean;

  /**
   * Register callback for when avatar starts speaking
   * @param callback Function called when speech starts
   */
  onSpeakStart(callback: () => void): void;

  /**
   * Register callback for when avatar stops speaking
   * @param callback Function called when speech ends
   */
  onSpeakEnd(callback: () => void): void;

  /**
   * Get video stream for rendering
   */
  getStream(): MediaStream | null;
}

/**
 * Conversation Event Types
 */
export enum ConversationEvent {
  // User events
  USER_START_SPEAKING = 'user_start_speaking',
  USER_STOP_SPEAKING = 'user_stop_speaking',
  USER_TRANSCRIPT_INTERIM = 'user_transcript_interim',
  USER_TRANSCRIPT_FINAL = 'user_transcript_final',

  // LLM events
  LLM_START_GENERATING = 'llm_start_generating',
  LLM_CHUNK_RECEIVED = 'llm_chunk_received',
  LLM_COMPLETE = 'llm_complete',
  LLM_ERROR = 'llm_error',

  // Avatar events
  AVATAR_START_SPEAKING = 'avatar_start_speaking',
  AVATAR_STOP_SPEAKING = 'avatar_stop_speaking',

  // Barge-in events
  BARGE_IN_DETECTED = 'barge_in_detected',
  BARGE_IN_COMPLETE = 'barge_in_complete',

  // System events
  ERROR = 'error',
  STATE_CHANGE = 'state_change',
}

/**
 * Event payload types
 */
export interface ConversationEventPayload {
  [ConversationEvent.USER_START_SPEAKING]: undefined;
  [ConversationEvent.USER_STOP_SPEAKING]: undefined;
  [ConversationEvent.USER_TRANSCRIPT_INTERIM]: { text: string };
  [ConversationEvent.USER_TRANSCRIPT_FINAL]: { text: string };

  [ConversationEvent.LLM_START_GENERATING]: undefined;
  [ConversationEvent.LLM_CHUNK_RECEIVED]: { chunk: string };
  [ConversationEvent.LLM_COMPLETE]: { fullResponse: string };
  [ConversationEvent.LLM_ERROR]: { error: Error };

  [ConversationEvent.AVATAR_START_SPEAKING]: undefined;
  [ConversationEvent.AVATAR_STOP_SPEAKING]: undefined;

  [ConversationEvent.BARGE_IN_DETECTED]: undefined;
  [ConversationEvent.BARGE_IN_COMPLETE]: undefined;

  [ConversationEvent.ERROR]: { error: Error; context?: string };
  [ConversationEvent.STATE_CHANGE]: { from: string; to: string };
}

/**
 * Type-safe event listener
 */
export type ConversationEventListener<T extends ConversationEvent> = (
  payload: ConversationEventPayload[T]
) => void;

/**
 * Configuration for conversation system
 */
export interface ConversationConfig {
  // Provider instances
  sttProvider: STTProvider;
  llmProvider: LLMProvider;
  avatarProvider: AvatarProvider;

  // Feature flags
  enableStreaming: boolean;
  enableBargeIn: boolean;
  enableInterimTranscripts: boolean;

  // Timing settings
  endpointingDelayMs: number; // How long to wait after speech stops (default: 500ms)
  interruptDelayMs: number;   // Debounce for barge-in detection (default: 100ms)

  // Debug
  logLatency: boolean;
  logTranscripts: boolean;
}

/**
 * Latency metrics for monitoring
 */
export interface LatencyMetrics {
  userStopSpeaking: number;
  transcriptReceived: number;
  llmFirstToken: number;
  llmComplete: number;
  avatarStartSpeaking: number;

  // Derived metrics
  sttLatency: number;    // transcriptReceived - userStopSpeaking
  llmLatency: number;    // llmComplete - transcriptReceived
  ttsLatency: number;    // avatarStartSpeaking - llmComplete
  totalLatency: number;  // avatarStartSpeaking - userStopSpeaking
}
