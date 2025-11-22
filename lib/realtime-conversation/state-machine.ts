/**
 * Conversation State Machine
 *
 * Manages the state transitions for real-time conversation flow
 * Includes barge-in support for natural interruptions
 */

/**
 * Conversation States
 */
export enum ConversationState {
  /**
   * Initial state - avatar ready, waiting for user
   */
  IDLE = 'idle',

  /**
   * User is currently speaking
   */
  USER_SPEAKING = 'user_speaking',

  /**
   * Processing user input (STT → LLM)
   */
  PROCESSING = 'processing',

  /**
   * Avatar is delivering response
   */
  AVATAR_SPEAKING = 'avatar_speaking',

  /**
   * User interrupted avatar mid-speech (barge-in)
   */
  INTERRUPTED = 'interrupted',

  /**
   * Error state - system malfunction
   */
  ERROR = 'error',
}

/**
 * State transition type
 */
export interface StateTransition {
  from: ConversationState;
  to: ConversationState;
  timestamp: number;
  reason?: string;
}

/**
 * State change callback
 */
export type StateChangeCallback = (transition: StateTransition) => void;

/**
 * State Machine Class
 */
export class ConversationStateMachine {
  private currentState: ConversationState = ConversationState.IDLE;
  private previousState: ConversationState | null = null;
  private transitionHistory: StateTransition[] = [];
  private stateChangeCallbacks: StateChangeCallback[] = [];

  /**
   * Get current state
   */
  getState(): ConversationState {
    return this.currentState;
  }

  /**
   * Get previous state
   */
  getPreviousState(): ConversationState | null {
    return this.previousState;
  }

  /**
   * Check if in a specific state
   */
  is(state: ConversationState): boolean {
    return this.currentState === state;
  }

  /**
   * Check if state allows interruption (barge-in)
   */
  canInterrupt(): boolean {
    return this.currentState === ConversationState.AVATAR_SPEAKING;
  }

  /**
   * Check if state allows user speech
   */
  canAcceptUserInput(): boolean {
    return (
      this.currentState === ConversationState.IDLE ||
      this.currentState === ConversationState.AVATAR_SPEAKING // For barge-in
    );
  }

  /**
   * Transition to new state
   * @param newState Target state
   * @param reason Optional reason for transition
   * @returns true if transition was successful
   */
  transition(newState: ConversationState, reason?: string): boolean {
    // Validate transition
    if (!this.isValidTransition(this.currentState, newState)) {
      console.warn(
        `⚠️ Invalid transition: ${this.currentState} → ${newState}`,
        reason
      );
      return false;
    }

    // Record transition
    const transition: StateTransition = {
      from: this.currentState,
      to: newState,
      timestamp: Date.now(),
      reason,
    };

    this.previousState = this.currentState;
    this.currentState = newState;
    this.transitionHistory.push(transition);

    console.log(
      `🔄 State: ${transition.from} → ${transition.to}`,
      reason ? `(${reason})` : ''
    );

    // Notify listeners
    this.stateChangeCallbacks.forEach((callback) => callback(transition));

    return true;
  }

  /**
   * Validate if transition is allowed
   */
  private isValidTransition(
    from: ConversationState,
    to: ConversationState
  ): boolean {
    // Self-transitions not allowed (except ERROR)
    if (from === to && to !== ConversationState.ERROR) {
      return false;
    }

    // Define allowed transitions
    const allowedTransitions: Record<ConversationState, ConversationState[]> = {
      [ConversationState.IDLE]: [
        ConversationState.USER_SPEAKING,
        ConversationState.ERROR,
      ],

      [ConversationState.USER_SPEAKING]: [
        ConversationState.PROCESSING,
        ConversationState.IDLE, // User stopped without saying anything
        ConversationState.ERROR,
      ],

      [ConversationState.PROCESSING]: [
        ConversationState.AVATAR_SPEAKING,
        ConversationState.IDLE, // Cancelled
        ConversationState.ERROR,
      ],

      [ConversationState.AVATAR_SPEAKING]: [
        ConversationState.IDLE, // Avatar finished normally
        ConversationState.INTERRUPTED, // User interrupted (barge-in)
        ConversationState.ERROR,
      ],

      [ConversationState.INTERRUPTED]: [
        ConversationState.USER_SPEAKING, // User continues speaking after interrupt
        ConversationState.PROCESSING, // Process interrupted input
        ConversationState.IDLE, // Cancelled
        ConversationState.ERROR,
      ],

      [ConversationState.ERROR]: [
        ConversationState.IDLE, // Recovered from error
      ],
    };

    return allowedTransitions[from]?.includes(to) ?? false;
  }

  /**
   * Register callback for state changes
   */
  onStateChange(callback: StateChangeCallback): () => void {
    this.stateChangeCallbacks.push(callback);

    // Return unsubscribe function
    return () => {
      const index = this.stateChangeCallbacks.indexOf(callback);
      if (index > -1) {
        this.stateChangeCallbacks.splice(index, 1);
      }
    };
  }

  /**
   * Get transition history
   */
  getHistory(): StateTransition[] {
    return [...this.transitionHistory];
  }

  /**
   * Get recent transitions (last N)
   */
  getRecentHistory(count: number = 5): StateTransition[] {
    return this.transitionHistory.slice(-count);
  }

  /**
   * Reset state machine to IDLE
   */
  reset(): void {
    console.log('🔄 Resetting state machine to IDLE');
    this.currentState = ConversationState.IDLE;
    this.previousState = null;
    this.transitionHistory = [];
  }

  /**
   * Get time spent in current state (ms)
   */
  getTimeInCurrentState(): number {
    const lastTransition = this.transitionHistory[this.transitionHistory.length - 1];
    if (!lastTransition) return 0;
    return Date.now() - lastTransition.timestamp;
  }

  /**
   * Get statistics about state usage
   */
  getStats(): {
    totalTransitions: number;
    stateCount: Record<ConversationState, number>;
    averageTimePerState: Record<ConversationState, number>;
  } {
    const stateCount: Record<string, number> = {};
    const stateDurations: Record<string, number[]> = {};

    // Count states and durations
    for (let i = 0; i < this.transitionHistory.length; i++) {
      const transition = this.transitionHistory[i];
      const state = transition.from;

      // Count
      stateCount[state] = (stateCount[state] || 0) + 1;

      // Duration
      if (i < this.transitionHistory.length - 1) {
        const nextTransition = this.transitionHistory[i + 1];
        const duration = nextTransition.timestamp - transition.timestamp;

        if (!stateDurations[state]) {
          stateDurations[state] = [];
        }
        stateDurations[state].push(duration);
      }
    }

    // Calculate averages
    const averageTimePerState: Record<string, number> = {};
    for (const state in stateDurations) {
      const durations = stateDurations[state];
      const average = durations.reduce((a, b) => a + b, 0) / durations.length;
      averageTimePerState[state] = Math.round(average);
    }

    return {
      totalTransitions: this.transitionHistory.length,
      stateCount: stateCount as Record<ConversationState, number>,
      averageTimePerState: averageTimePerState as Record<ConversationState, number>,
    };
  }
}

/**
 * Helper function to create readable state labels
 */
export function getStateLabel(state: ConversationState): string {
  const labels: Record<ConversationState, string> = {
    [ConversationState.IDLE]: 'Esperando...',
    [ConversationState.USER_SPEAKING]: 'Te escucho...',
    [ConversationState.PROCESSING]: 'Pensando...',
    [ConversationState.AVATAR_SPEAKING]: 'Clara está hablando...',
    [ConversationState.INTERRUPTED]: 'Interrumpiendo...',
    [ConversationState.ERROR]: 'Error',
  };

  return labels[state] || state;
}

/**
 * Helper to check if transition represents an error
 */
export function isErrorTransition(transition: StateTransition): boolean {
  return transition.to === ConversationState.ERROR;
}

/**
 * Helper to check if transition represents barge-in
 */
export function isBargeInTransition(transition: StateTransition): boolean {
  return (
    transition.from === ConversationState.AVATAR_SPEAKING &&
    transition.to === ConversationState.INTERRUPTED
  );
}
