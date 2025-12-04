/**
 * Fallback Handler
 *
 * Manages automatic fallback from custom pipeline to HeyGen built-in
 * when consecutive errors exceed threshold.
 *
 * Usage:
 * ```typescript
 * const fallback = new FallbackHandler({
 *   threshold: 3,
 *   onFallback: () => switchToHeyGenBuiltIn(),
 *   onReset: () => console.log('Errors reset'),
 * });
 *
 * // In error handler:
 * const shouldFallback = fallback.recordError('stt');
 * if (shouldFallback) {
 *   // Switch to HeyGen built-in
 * }
 *
 * // On successful operation:
 * fallback.reset();
 * ```
 */

import { FALLBACK_CONFIG, CONVERSATION_FEATURES } from '@/config/features';

export interface FallbackHandlerConfig {
  threshold?: number;
  onFallback?: () => void;
  onReset?: () => void;
  logEvents?: boolean;
}

export class FallbackHandler {
  private errorCount: number = 0;
  private threshold: number;
  private hasFallenBack: boolean = false;
  private onFallback?: () => void;
  private onReset?: () => void;
  private logEvents: boolean;

  constructor(config: FallbackHandlerConfig = {}) {
    this.threshold = config.threshold ?? FALLBACK_CONFIG.FAILURE_THRESHOLD;
    this.onFallback = config.onFallback;
    this.onReset = config.onReset;
    this.logEvents = config.logEvents ?? CONVERSATION_FEATURES.LOG_TRANSCRIPTS;
  }

  /**
   * Record an error occurrence
   * @param context Optional context for logging (e.g., 'stt', 'llm', 'avatar')
   * @returns true if fallback should be triggered
   */
  recordError(context?: string): boolean {
    // Don't record more errors if already fallen back
    if (this.hasFallenBack) {
      return true;
    }

    this.errorCount++;

    if (this.logEvents) {
      console.warn(`⚠️ FallbackHandler: Error recorded (${context || 'unknown'}) - ${this.errorCount}/${this.threshold}`);
    }

    // Check if threshold reached
    if (this.errorCount >= this.threshold) {
      this.triggerFallback();
      return true;
    }

    return false;
  }

  /**
   * Trigger fallback manually
   */
  triggerFallback(): void {
    if (this.hasFallenBack) {
      return;
    }

    this.hasFallenBack = true;

    if (this.logEvents) {
      console.warn('🔄 FallbackHandler: Threshold reached, triggering fallback to HeyGen built-in');
    }

    this.onFallback?.();
  }

  /**
   * Reset error count (call on successful operation)
   */
  reset(): void {
    if (this.errorCount === 0 && !this.hasFallenBack) {
      return;
    }

    const wasErrors = this.errorCount > 0;
    this.errorCount = 0;
    // Don't reset hasFallenBack - once fallen back, stay there

    if (wasErrors && this.logEvents) {
      console.log('✅ FallbackHandler: Error count reset');
    }

    this.onReset?.();
  }

  /**
   * Check if fallback has been triggered
   */
  hasFallbackTriggered(): boolean {
    return this.hasFallenBack;
  }

  /**
   * Get current error count
   */
  getErrorCount(): number {
    return this.errorCount;
  }

  /**
   * Get threshold value
   */
  getThreshold(): number {
    return this.threshold;
  }

  /**
   * Force reset everything including fallback state
   * Use with caution - mainly for testing or manual recovery
   */
  forceReset(): void {
    this.errorCount = 0;
    this.hasFallenBack = false;

    if (this.logEvents) {
      console.log('🔄 FallbackHandler: Force reset (including fallback state)');
    }
  }
}

/**
 * Create a singleton fallback handler for the app
 */
let globalFallbackHandler: FallbackHandler | null = null;

export function getGlobalFallbackHandler(): FallbackHandler {
  if (!globalFallbackHandler) {
    globalFallbackHandler = new FallbackHandler();
  }
  return globalFallbackHandler;
}

export function resetGlobalFallbackHandler(): void {
  globalFallbackHandler = null;
}
