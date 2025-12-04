import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider } from '../../interfaces';
import { PROVIDER_CONFIG, CONVERSATION_FEATURES } from '@/config/features';

/**
 * Claude Haiku 4.5 Streaming LLM Provider
 *
 * Features:
 * - Streaming responses for low latency
 * - AbortController for interruptions (barge-in)
 * - Conversation history management
 * - Clara skincare persona with Spanish
 */

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export class ClaudeStreamingLLM implements LLMProvider {
  private anthropic: Anthropic;
  private conversationHistory: Message[] = [];
  private systemPrompt: string;
  private abortController: AbortController | null = null;
  private isGeneratingFlag: boolean = false;

  constructor(config: {
    apiKey: string;
    systemPrompt: string;
  }) {
    this.anthropic = new Anthropic({
      apiKey: config.apiKey,
    });
    this.systemPrompt = config.systemPrompt;

    if (CONVERSATION_FEATURES.LOG_TRANSCRIPTS) {
      console.log('✅ Claude Streaming LLM initialized');
    }
  }

  /**
   * Generate response (non-streaming fallback)
   * Used when streaming is disabled or not needed
   */
  async generateResponse(userMessage: string): Promise<string> {
    this.isGeneratingFlag = true;

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    try {
      const response = await this.anthropic.messages.create({
        model: PROVIDER_CONFIG.claude.model,
        max_tokens: PROVIDER_CONFIG.claude.max_tokens,
        temperature: PROVIDER_CONFIG.claude.temperature,
        system: this.systemPrompt,
        messages: this.conversationHistory,
      });

      const assistantMessage = response.content[0].type === 'text'
        ? response.content[0].text
        : '';

      // Add assistant response to history
      this.conversationHistory.push({
        role: 'assistant',
        content: assistantMessage,
      });

      this.isGeneratingFlag = false;
      return assistantMessage;

    } catch (error: any) {
      this.isGeneratingFlag = false;
      console.error('❌ Claude error:', error);
      throw error;
    }
  }

  /**
   * Stream response (primary method for low latency)
   * Yields text chunks as they arrive from Claude
   */
  async *streamResponse(userMessage: string): AsyncGenerator<string, void, unknown> {
    this.isGeneratingFlag = true;
    this.abortController = new AbortController();

    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: userMessage,
    });

    let fullResponse = '';
    const startTime = Date.now();

    try {
      if (CONVERSATION_FEATURES.LOG_TRANSCRIPTS) {
        console.log('🤖 Claude streaming started...');
      }

      const stream = await this.anthropic.messages.stream({
        model: PROVIDER_CONFIG.claude.model,
        max_tokens: PROVIDER_CONFIG.claude.max_tokens,
        temperature: PROVIDER_CONFIG.claude.temperature,
        system: this.systemPrompt,
        messages: this.conversationHistory,
      }, {
        // Pass abort signal for interruptions
        signal: this.abortController.signal,
      });

      let firstTokenReceived = false;

      // Yield chunks as they arrive
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta' && chunk.delta.type === 'text_delta') {
          const text = chunk.delta.text;
          fullResponse += text;

          // Log time to first token (TTFT)
          if (!firstTokenReceived && CONVERSATION_FEATURES.LOG_LATENCY) {
            const ttft = Date.now() - startTime;
            console.log(`⚡ TTFT: ${ttft}ms`);
            firstTokenReceived = true;
          }

          yield text;
        }
      }

      // Stream completed successfully
      this.conversationHistory.push({
        role: 'assistant',
        content: fullResponse,
      });

      if (CONVERSATION_FEATURES.LOG_LATENCY) {
        const totalTime = Date.now() - startTime;
        console.log(`⏱️ Claude total: ${totalTime}ms (${fullResponse.length} chars)`);
      }

    } catch (error: any) {
      if (error.name === 'AbortError') {
        // Barge-in detected - don't add partial response to history
        if (CONVERSATION_FEATURES.LOG_TRANSCRIPTS) {
          console.log('🛑 Claude stream interrupted (barge-in)');
        }
      } else {
        console.error('❌ Claude streaming error:', error);
        throw error;
      }
    } finally {
      this.isGeneratingFlag = false;
      this.abortController = null;
    }
  }

  /**
   * Interrupt ongoing generation (for barge-in)
   * Aborts the stream and cleans up
   */
  interrupt(): void {
    if (this.abortController) {
      if (CONVERSATION_FEATURES.LOG_TRANSCRIPTS) {
        console.log('🛑 Interrupting Claude generation');
      }
      this.abortController.abort();
      this.abortController = null;
      this.isGeneratingFlag = false;
    }
  }

  /**
   * Add message to conversation history
   * Useful for injecting context or corrections
   */
  addToHistory(role: 'user' | 'assistant', content: string): void {
    this.conversationHistory.push({ role, content });
  }

  /**
   * Get full conversation history
   * Returns copy to prevent external modification
   */
  getHistory(): Array<{ role: string; content: string }> {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   * Keeps system prompt intact
   */
  clearHistory(): void {
    this.conversationHistory = [];
    if (CONVERSATION_FEATURES.LOG_TRANSCRIPTS) {
      console.log('🗑️ Conversation history cleared');
    }
  }

  /**
   * Check if currently generating
   */
  isGenerating(): boolean {
    return this.isGeneratingFlag;
  }

  /**
   * Update system prompt dynamically
   * Useful for personalization with Shopify customer data
   * @param prompt New system prompt
   * @param clearHistory Whether to clear conversation history (default: false)
   */
  updateSystemPrompt(prompt: string, clearHistory: boolean = false): void {
    this.systemPrompt = prompt;

    if (clearHistory) {
      this.conversationHistory = [];
    }

    if (CONVERSATION_FEATURES.LOG_TRANSCRIPTS) {
      console.log('✅ System prompt updated', clearHistory ? '(history cleared)' : '');
    }
  }

  /**
   * Get current system prompt
   */
  getSystemPrompt(): string {
    return this.systemPrompt;
  }
}
