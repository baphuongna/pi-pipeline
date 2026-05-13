/**
 * Model Fallback - Pattern from pi-crew model-fallback.ts
 * 
 * Multi-model routing with fallback chain.
 */

export interface ModelCandidate {
  model: string;
  priority: number;
  success?: boolean;
  error?: string;
}

export interface ModelRoutingPlan {
  candidates: string[];
  requested: string | undefined;
  resolved?: string;
  fallbackChain?: string[];
  reason?: string;
}

export interface ModelRoutingOptions {
  overrideModel?: string;
  stepModel?: string;
  teamRoleModel?: string;
  agentModel?: string;
  fallbackModels?: string[];
  parentModel?: string;
}

const RETRYABLE_PATTERNS = [
  /rate.limit|rate_limit|quota.exceeded|overloaded/i,
  /context.length|context_window|token.limit/i,
  /timeout|timed.out/i,
  /service.unavailable|503/i,
  /internal.error|500/i,
];

export function isRetryableModelFailure(error: string): boolean {
  return RETRYABLE_PATTERNS.some(pattern => pattern.test(error));
}

export function buildModelRouting(options: ModelRoutingOptions): ModelRoutingPlan {
  const seen = new Set<string>();
  const candidates: string[] = [];
  
  const ordered = [
    options.overrideModel,
    options.stepModel,
    options.teamRoleModel,
    ...(options.fallbackModels ?? []),
    options.agentModel,
    options.parentModel,
  ];
  
  for (const model of ordered) {
    if (model && !seen.has(model)) {
      seen.add(model);
      candidates.push(model);
    }
  }
  
  return {
    candidates,
    requested: options.overrideModel ?? options.stepModel ?? options.agentModel,
  };
}

export class ModelRouter {
  private attempts: Map<string, ModelCandidate> = new Map();
  
  /**
   * Record a model attempt result
   */
  recordAttempt(model: string, success: boolean, error?: string): void {
    const existing = this.attempts.get(model);
    this.attempts.set(model, {
      model,
      priority: (existing?.priority ?? 0) + 1,
      success,
      error,
    });
  }
  
  /**
   * Get next candidate for retry
   */
  getNextCandidate(candidates: string[]): string | undefined {
    // Skip failed non-retryable models
    for (const model of candidates) {
      const attempt = this.attempts.get(model);
      if (!attempt) return model;
      if (attempt.success) return model;
      if (!attempt.error || isRetryableModelFailure(attempt.error)) {
        return model;
      }
    }
    return undefined;
  }
  
  /**
   * Check if all models exhausted
   */
  isExhausted(candidates: string[]): boolean {
    return candidates.every(model => {
      const attempt = this.attempts.get(model);
      return attempt && !attempt.success && attempt.error && !isRetryableModelFailure(attempt.error);
    });
  }
  
  /**
   * Get best candidate from plan
   */
  resolveFromPlan(plan: ModelRoutingPlan): string | undefined {
    return this.getNextCandidate(plan.candidates);
  }
}
