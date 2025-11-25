/**
 * Feature Flags Configuration
 *
 * Controls which features are enabled in the real-time conversation system
 * Allows progressive rollout and easy rollback
 */

/**
 * Feature flags for conversation system
 */
export const CONVERSATION_FEATURES = {
  /**
   * FASE 1 Features
   */

  // Enable Deepgram streaming STT (vs Whisper batch)
  ENABLE_STREAMING_STT: process.env.NEXT_PUBLIC_ENABLE_STREAMING_STT === 'true' || false,

  // Enable Claude streaming responses (vs simple API calls)
  ENABLE_STREAMING_LLM: process.env.NEXT_PUBLIC_ENABLE_STREAMING_LLM === 'true' || false,

  // Enable barge-in (user can interrupt Clara)
  ENABLE_BARGE_IN: process.env.NEXT_PUBLIC_ENABLE_BARGE_IN === 'true' || false,

  // Show interim transcripts in UI (real-time feedback)
  ENABLE_INTERIM_TRANSCRIPTS: process.env.NEXT_PUBLIC_ENABLE_INTERIM_TRANSCRIPTS === 'true' || true,

  /**
   * FASE 2 Features (Optimization)
   */

  // Enable chunked sending to HeyGen (sentence-by-sentence)
  ENABLE_CHUNKED_HEYGEN: process.env.NEXT_PUBLIC_ENABLE_CHUNKED_HEYGEN === 'true' || false,

  // Enable response caching for common queries
  ENABLE_RESPONSE_CACHE: process.env.NEXT_PUBLIC_ENABLE_RESPONSE_CACHE === 'true' || false,

  // Enable connection pre-warming
  ENABLE_CONNECTION_POOL: process.env.NEXT_PUBLIC_ENABLE_CONNECTION_POOL === 'true' || false,

  /**
   * FASE 3 Features (Fallback & Recovery)
   */

  // Enable automatic fallback to HeyGen built-in on failure
  ENABLE_AUTO_FALLBACK: process.env.NEXT_PUBLIC_ENABLE_AUTO_FALLBACK === 'true' || true,

  // Enable retry logic with exponential backoff
  ENABLE_RETRY_LOGIC: process.env.NEXT_PUBLIC_ENABLE_RETRY_LOGIC === 'true' || true,

  /**
   * Debugging & Monitoring
   */

  // Log latency metrics to console
  LOG_LATENCY: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_LOG_LATENCY === 'true',

  // Log all transcripts to console
  LOG_TRANSCRIPTS: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_LOG_TRANSCRIPTS === 'true',

  // Log state transitions
  LOG_STATE_TRANSITIONS: process.env.NODE_ENV === 'development' || process.env.NEXT_PUBLIC_LOG_STATE_TRANSITIONS === 'true',

  // Send analytics events
  ENABLE_ANALYTICS: process.env.NEXT_PUBLIC_ENABLE_ANALYTICS === 'true' || false,
} as const;

/**
 * Timing configuration (in milliseconds)
 */
export const CONVERSATION_TIMING = {
  // Deepgram endpointing delay (silence detection)
  ENDPOINTING_DELAY_MS: parseInt(process.env.NEXT_PUBLIC_ENDPOINTING_DELAY_MS || '300', 10),

  // Barge-in detection debounce
  BARGE_IN_DEBOUNCE_MS: parseInt(process.env.NEXT_PUBLIC_BARGE_IN_DEBOUNCE_MS || '100', 10),

  // Maximum wait for LLM response
  LLM_TIMEOUT_MS: parseInt(process.env.NEXT_PUBLIC_LLM_TIMEOUT_MS || '10000', 10),

  // Maximum wait for STT response
  STT_TIMEOUT_MS: parseInt(process.env.NEXT_PUBLIC_STT_TIMEOUT_MS || '5000', 10),

  // Cache duration for responses (24 hours)
  CACHE_DURATION_MS: 24 * 60 * 60 * 1000,

  // Connection keep-alive interval
  KEEP_ALIVE_INTERVAL_MS: 30000,
} as const;

/**
 * Provider configuration
 */
export const PROVIDER_CONFIG = {
  /**
   * Deepgram STT
   */
  deepgram: {
    model: 'nova-2',
    language: 'es-419', // Latin American Spanish (closest to Chilean)
    smart_format: true,
    interim_results: CONVERSATION_FEATURES.ENABLE_INTERIM_TRANSCRIPTS,
    endpointing: CONVERSATION_TIMING.ENDPOINTING_DELAY_MS,
    vad_events: CONVERSATION_FEATURES.ENABLE_BARGE_IN, // Voice Activity Detection for barge-in
  },

  /**
   * Claude LLM
   */
  claude: {
    model: 'claude-3-5-haiku-20241022', // Claude Haiku 4.5
    max_tokens: 150, // ~2-3 sentences (15-20 seconds of speech)
    temperature: 0.7,
    stream: CONVERSATION_FEATURES.ENABLE_STREAMING_LLM,
  },

  /**
   * HeyGen Avatar
   */
  heygen: {
    taskType: 'REPEAT' as const, // Always REPEAT mode (no internal LLM)
    taskMode: 'SYNC' as const,   // Wait for previous speech to finish
  },
} as const;

/**
 * Retry configuration
 */
export const RETRY_CONFIG = {
  // Maximum retry attempts
  MAX_RETRIES: 3,

  // Initial retry delay (ms)
  INITIAL_RETRY_DELAY_MS: 1000,

  // Retry delay multiplier (exponential backoff)
  RETRY_BACKOFF_MULTIPLIER: 2,

  // Maximum retry delay (ms)
  MAX_RETRY_DELAY_MS: 10000,
} as const;

/**
 * Fallback configuration
 */
export const FALLBACK_CONFIG = {
  // Number of consecutive failures before triggering fallback
  FAILURE_THRESHOLD: 3,

  // Services that can trigger fallback
  fallbackTriggers: {
    deepgram: CONVERSATION_FEATURES.ENABLE_AUTO_FALLBACK,
    claude: CONVERSATION_FEATURES.ENABLE_AUTO_FALLBACK,
  },
} as const;

/**
 * Helper to check if custom conversation system is enabled
 */
export function isCustomConversationEnabled(): boolean {
  return (
    CONVERSATION_FEATURES.ENABLE_STREAMING_STT ||
    CONVERSATION_FEATURES.ENABLE_STREAMING_LLM
  );
}

/**
 * Helper to get feature status summary
 */
export function getFeatureStatus(): Record<string, boolean | number> {
  return {
    ...CONVERSATION_FEATURES,
    ...CONVERSATION_TIMING,
  };
}

/**
 * Helper to log configuration on startup
 */
export function logConfiguration(): void {
  if (!CONVERSATION_FEATURES.LOG_LATENCY) return;

  console.log('🎛️ Conversation System Configuration:');
  console.log('Features:', {
    streaming_stt: CONVERSATION_FEATURES.ENABLE_STREAMING_STT,
    streaming_llm: CONVERSATION_FEATURES.ENABLE_STREAMING_LLM,
    barge_in: CONVERSATION_FEATURES.ENABLE_BARGE_IN,
    auto_fallback: CONVERSATION_FEATURES.ENABLE_AUTO_FALLBACK,
  });
  console.log('Timing:', {
    endpointing_ms: CONVERSATION_TIMING.ENDPOINTING_DELAY_MS,
    barge_in_debounce_ms: CONVERSATION_TIMING.BARGE_IN_DEBOUNCE_MS,
  });
  console.log('Providers:', {
    stt: PROVIDER_CONFIG.deepgram.model,
    llm: PROVIDER_CONFIG.claude.model,
    avatar: PROVIDER_CONFIG.heygen.taskType,
  });
}
