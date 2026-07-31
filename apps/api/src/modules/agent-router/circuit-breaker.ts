export type CircuitBreakerOptions = {
  failureThreshold: number;
  cooldownMs: number;
};

type BreakerState = {
  failureCount: number;
  openedAt: number | null;
};

export class CircuitBreaker {
  private readonly states = new Map<string, BreakerState>();

  constructor(private readonly options: CircuitBreakerOptions) {}

  isOpen(key: string): boolean {
    const state = this.states.get(key);
    if (!state?.openedAt) {
      return false;
    }

    if (Date.now() - state.openedAt >= this.options.cooldownMs) {
      this.states.delete(key);
      return false;
    }

    return true;
  }

  recordFailure(key: string): void {
    const state = this.states.get(key) ?? { failureCount: 0, openedAt: null };
    state.failureCount += 1;

    if (state.failureCount >= this.options.failureThreshold) {
      state.openedAt = Date.now();
    }

    this.states.set(key, state);
  }

  recordSuccess(key: string): void {
    this.states.delete(key);
  }
}
