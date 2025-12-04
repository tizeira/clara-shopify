/**
 * Conversation Hooks
 *
 * Hooks for managing the real-time conversation pipeline
 * (Deepgram Nova-3 STT → Claude Haiku → HeyGen Avatar)
 */

export {
  useConversationPipeline,
  type UseConversationPipelineOptions,
  type UseConversationPipelineReturn,
  type ConversationMetrics,
} from './useConversationPipeline';

// Re-export ConversationState for convenience
export { ConversationState } from '@/lib/realtime-conversation/conversation-manager';
