/**
 * useConversationPipeline Hook
 *
 * Custom hook that orchestrates the real-time conversation pipeline:
 * Audio → Deepgram Nova-3 (STT) → Claude Haiku (LLM) → HeyGen Avatar (TTS)
 *
 * Features:
 * - Integrates with existing StreamingAvatar session
 * - Shopify personalization support
 * - Barge-in handling
 * - Error counting for automatic fallback
 * - Latency metrics
 *
 * Usage:
 * ```typescript
 * const { start, stop, state, metrics, errorCount } = useConversationPipeline({
 *   customerData,
 *   userName,
 *   avatarInstance: avatarRef.current,
 *   avatarStream: stream,
 * });
 *
 * // Start custom pipeline
 * await start();
 *
 * // Stop and cleanup
 * await stop();
 * ```
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import StreamingAvatar from '@heygen/streaming-avatar';
import { ClaraCustomerData } from '@/lib/shopify-client';
import { ConversationManager, ConversationState, ConversationManagerConfig } from '@/lib/realtime-conversation/conversation-manager';
import { DeepgramNova3STT, DeepgramNova3Config } from '@/lib/realtime-conversation/providers/stt/deepgram-nova3';
import { ClaudeStreamingLLM } from '@/lib/realtime-conversation/providers/llm/claude-streaming';
import { HeyGenAvatarProvider, HeyGenConfig } from '@/lib/realtime-conversation/providers/avatar/heygen-wrapper';
import {
  CONVERSATION_FEATURES,
  PROVIDER_CONFIG,
  AUDIO_CONFIG,
  FALLBACK_CONFIG,
} from '@/config/features';

export interface ConversationMetrics {
  sttLatency: number;
  llmLatency: number;
  ttsLatency: number;
  totalLatency: number;
}

export interface UseConversationPipelineOptions {
  // Personalization
  customerData?: ClaraCustomerData | null;
  userName?: string | null;

  // Avatar integration (required)
  avatarInstance: StreamingAvatar | null;
  avatarStream?: MediaStream | null;

  // Callbacks
  onStateChange?: (state: ConversationState) => void;
  onTranscript?: (text: string, isFinal: boolean) => void;
  onLLMResponse?: (text: string) => void;
  onError?: (error: Error) => void;
  onFallbackTriggered?: () => void;
}

export interface UseConversationPipelineReturn {
  start: () => Promise<void>;
  stop: () => Promise<void>;
  state: ConversationState;
  metrics: ConversationMetrics;
  errorCount: number;
  isActive: boolean;
}

// Clara's system prompt (will be personalized via ConversationManager)
const CLARA_SYSTEM_PROMPT = `
Eres Clara, tu asistente personal de skincare de Beta Skin Tech.

Tu misión es ayudar a las personas a descubrir y cuidar su piel de forma natural y efectiva, con un toque cercano y profesional.

PERSONALIDAD Y TONO:
- Usa español chileno natural: "cachai", "bacán", "súper bien"
- Sé cálida, empática y profesional
- Celebra los logros de cuidado de piel
- Sé honesta sobre limitaciones

GUÍA CONVERSACIONAL:
- Habla natural y fluido, como en una conversación real. Texto corrido sin asteriscos, guiones, números ni formato.
- Respuestas breves de 15-20 segundos máximo. Conversación dinámica, no monólogo.
- Pregunta sobre tipo de piel y preocupaciones antes de recomendar productos.
- Si no sabes algo o necesitas más información, pregunta o sugiere consultar con especialista.
`.trim();

export function useConversationPipeline(
  options: UseConversationPipelineOptions
): UseConversationPipelineReturn {
  const {
    customerData,
    userName,
    avatarInstance,
    avatarStream,
    onStateChange,
    onTranscript,
    onLLMResponse,
    onError,
    onFallbackTriggered,
  } = options;

  // State
  const [state, setState] = useState<ConversationState>(ConversationState.IDLE);
  const [errorCount, setErrorCount] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [metrics, setMetrics] = useState<ConversationMetrics>({
    sttLatency: 0,
    llmLatency: 0,
    ttsLatency: 0,
    totalLatency: 0,
  });

  // Refs for provider instances
  const managerRef = useRef<ConversationManager | null>(null);
  const sttProviderRef = useRef<DeepgramNova3STT | null>(null);
  const llmProviderRef = useRef<ClaudeStreamingLLM | null>(null);
  const avatarProviderRef = useRef<HeyGenAvatarProvider | null>(null);

  // Track cumulative LLM response for onLLMResponse callback
  const llmResponseRef = useRef<string>('');

  /**
   * Handle errors and track error count for fallback
   */
  const handleError = useCallback((error: Error, context?: string) => {
    console.error(`❌ ConversationPipeline error (${context || 'unknown'}):`, error);

    setErrorCount(prev => {
      const newCount = prev + 1;

      // Check if fallback should be triggered
      if (newCount >= FALLBACK_CONFIG.FAILURE_THRESHOLD) {
        console.warn('🔄 ConversationPipeline: Error threshold reached, triggering fallback');
        onFallbackTriggered?.();
      }

      return newCount;
    });

    onError?.(error);
  }, [onError, onFallbackTriggered]);

  /**
   * Handle state changes
   */
  const handleStateChange = useCallback((from: ConversationState, to: ConversationState) => {
    setState(to);
    onStateChange?.(to);

    if (CONVERSATION_FEATURES.LOG_STATE_TRANSITIONS) {
      console.log(`📊 Pipeline state: ${from} → ${to}`);
    }
  }, [onStateChange]);

  /**
   * Handle transcript events
   */
  const handleTranscript = useCallback((text: string, isFinal: boolean) => {
    onTranscript?.(text, isFinal);

    if (isFinal && CONVERSATION_FEATURES.LOG_TRANSCRIPTS) {
      console.log('📝 User said:', text);
    }
  }, [onTranscript]);

  /**
   * Handle LLM chunks
   */
  const handleLLMChunk = useCallback((chunk: string) => {
    llmResponseRef.current += chunk;
  }, []);

  /**
   * Start the conversation pipeline
   */
  const start = useCallback(async () => {
    if (isActive) {
      console.warn('⚠️ ConversationPipeline: Already active');
      return;
    }

    if (!avatarInstance) {
      throw new Error('Avatar instance is required to start pipeline');
    }

    const deepgramApiKey = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;
    const anthropicApiKey = process.env.ANTHROPIC_API_KEY;

    if (!deepgramApiKey) {
      throw new Error('NEXT_PUBLIC_DEEPGRAM_API_KEY is required');
    }

    // Note: Anthropic API key will be checked in the LLM provider
    // For production, this should be handled server-side

    try {
      console.log('🚀 ConversationPipeline: Starting...');

      // Reset state
      setErrorCount(0);
      llmResponseRef.current = '';

      // 1. Create STT Provider (Deepgram Nova-3)
      const sttConfig: DeepgramNova3Config = {
        apiKey: deepgramApiKey,
        model: 'nova-3',
        language: 'es-419', // Latin American Spanish
        encoding: 'linear16',
        sampleRate: AUDIO_CONFIG.sampleRate as 16000 | 24000 | 48000,
        endpointing: 500, // 500ms silence for turn detection
        interimResults: CONVERSATION_FEATURES.ENABLE_INTERIM_TRANSCRIPTS,
        smartFormat: true,
        logEvents: CONVERSATION_FEATURES.LOG_TRANSCRIPTS,
      };

      sttProviderRef.current = new DeepgramNova3STT(sttConfig);

      // 2. Create LLM Provider (Claude Haiku)
      llmProviderRef.current = new ClaudeStreamingLLM({
        apiKey: anthropicApiKey || '', // Will be validated by provider
        systemPrompt: CLARA_SYSTEM_PROMPT,
      });

      // 3. Create Avatar Provider and attach to existing session
      const avatarConfig: HeyGenConfig = {
        apiKey: '', // Not needed when attaching to existing session
        avatarId: '', // Not needed when attaching
        voiceId: '', // Not needed when attaching
        logEvents: CONVERSATION_FEATURES.LOG_TRANSCRIPTS,
      };

      avatarProviderRef.current = new HeyGenAvatarProvider(avatarConfig);
      avatarProviderRef.current.attachToExistingSession(avatarInstance, avatarStream);

      // 4. Create ConversationManager with personalization
      const managerConfig: ConversationManagerConfig = {
        sttProvider: sttProviderRef.current,
        llmProvider: llmProviderRef.current,
        avatarProvider: avatarProviderRef.current,

        // Personalization
        personalizationData: customerData,
        userName: userName,

        // Feature flags
        enableBargeIn: CONVERSATION_FEATURES.ENABLE_BARGE_IN,
        enableInterimTranscripts: CONVERSATION_FEATURES.ENABLE_INTERIM_TRANSCRIPTS,
        enableStreaming: CONVERSATION_FEATURES.ENABLE_STREAMING_LLM,

        // Callbacks
        onStateChange: handleStateChange,
        onTranscript: handleTranscript,
        onLLMChunk: handleLLMChunk,
        onError: handleError,

        // Debugging
        logLatency: CONVERSATION_FEATURES.LOG_LATENCY,
        logTranscripts: CONVERSATION_FEATURES.LOG_TRANSCRIPTS,
      };

      managerRef.current = new ConversationManager(managerConfig);

      // 5. Start the pipeline
      await managerRef.current.start();

      setIsActive(true);
      console.log('✅ ConversationPipeline: Started successfully');

    } catch (error) {
      console.error('❌ ConversationPipeline: Failed to start', error);
      handleError(error instanceof Error ? error : new Error(String(error)), 'start');
      throw error;
    }
  }, [
    isActive,
    avatarInstance,
    avatarStream,
    customerData,
    userName,
    handleStateChange,
    handleTranscript,
    handleLLMChunk,
    handleError,
  ]);

  /**
   * Stop the conversation pipeline
   */
  const stop = useCallback(async () => {
    if (!isActive) {
      console.warn('⚠️ ConversationPipeline: Not active');
      return;
    }

    try {
      console.log('🛑 ConversationPipeline: Stopping...');

      // Get final metrics before cleanup
      if (managerRef.current) {
        const finalMetrics = managerRef.current.getMetrics();
        setMetrics({
          sttLatency: finalMetrics.sttLatency,
          llmLatency: finalMetrics.llmLatency,
          ttsLatency: finalMetrics.ttsLatency,
          totalLatency: finalMetrics.totalLatency,
        });
      }

      // Emit final LLM response if any
      if (llmResponseRef.current && onLLMResponse) {
        onLLMResponse(llmResponseRef.current);
      }

      // Cleanup manager (handles all providers)
      if (managerRef.current) {
        await managerRef.current.cleanup();
        managerRef.current = null;
      }

      // Detach avatar provider (don't stop the avatar session)
      if (avatarProviderRef.current) {
        avatarProviderRef.current.detach();
        avatarProviderRef.current = null;
      }

      // Cleanup STT provider
      if (sttProviderRef.current) {
        await sttProviderRef.current.cleanup();
        sttProviderRef.current = null;
      }

      // Clear LLM provider reference
      llmProviderRef.current = null;

      // Reset state
      setIsActive(false);
      setState(ConversationState.IDLE);
      llmResponseRef.current = '';

      console.log('✅ ConversationPipeline: Stopped');

    } catch (error) {
      console.error('❌ ConversationPipeline: Error during stop', error);
      // Still mark as inactive
      setIsActive(false);
      setState(ConversationState.IDLE);
    }
  }, [isActive, onLLMResponse]);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (isActive) {
        stop().catch(console.error);
      }
    };
  }, [isActive, stop]);

  return {
    start,
    stop,
    state,
    metrics,
    errorCount,
    isActive,
  };
}

export default useConversationPipeline;
