/**
 * Retry Executor Pattern
 * 
 * Pattern for retrying operations with exponential backoff and jitter.
 * 
 * Inspired by pi-crew's retry-executor.ts.
 */

import { sleep } from "./sleep.ts";

/**
 * Retry policy configuration.
 */
export interface RetryPolicy {
  /** Maximum number of retry attempts. Default: 3 */
  maxAttempts: number;
  /** Base delay in milliseconds. Default: 1000 */
  backoffMs: number;
  /** Jitter ratio (0-1). Default: 0.3 */
  jitterRatio: number;
  /** Exponential backoff factor. Default: 2 */
  exponentialFactor: number;
  /** List of error message patterns to retry. Default: all errors */
  retryableErrors?: string[];
}

/**
 * Default retry policy.
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  backoffMs: 1000,
  jitterRatio: 0.3,
  exponentialFactor: 2,
};

/**
 * Retry attempt information.
 */
export interface RetryAttemptInfo {
  attempt: number;
  attemptId: string;
}

/**
 * Retry hooks for customization.
 */
export interface RetryHooks {
  /** Called when an attempt fails. */
  onAttemptFailed?: (
    attempt: number,
    error: Error,
    nextDelayMs: number,
    info: RetryAttemptInfo
  ) => void;
  /** Called when all retries are exhausted. */
  onRetryGivenUp?: (attempts: number, error: Error, info: RetryAttemptInfo) => void;
  /** Generate custom attempt ID. */
  attemptId?: (attempt: number) => string;
  /** Abort signal to cancel retries. */
  signal?: AbortSignal;
}

/**
 * Convert an unknown error to Error instance.
 */
function asError(error: unknown): Error {
  return error instanceof Error ? error : new Error(String(error));
}

/**
 * Convert glob pattern to regex.
 */
function globToRegex(pattern: string): RegExp {
  const escaped = pattern.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*/g, ".*");
  return new RegExp(`^${escaped}$`, "i");
}

/**
 * Check if an error should be retried based on policy.
 */
function isRetryable(error: Error, policy: RetryPolicy): boolean {
  const patterns = policy.retryableErrors ?? [];
  if (!patterns.length) return true;
  return patterns.some((pattern) => globToRegex(pattern).test(error.message));
}

/**
 * Calculate retry delay with exponential backoff and jitter.
 */
export function calculateRetryDelay(
  attempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  random = Math.random
): number {
  const base = policy.backoffMs * Math.pow(policy.exponentialFactor, Math.max(0, attempt - 1));
  const jitter = (random * 2 - 1) * policy.jitterRatio * base;
  return Math.max(0, base + jitter);
}

/**
 * Create retry attempt info.
 */
function createAttemptInfo(attempt: number, hooks: RetryHooks): RetryAttemptInfo {
  return {
    attempt,
    attemptId: hooks.attemptId?.(attempt) ?? `retry_attempt_${attempt}`,
  };
}

/**
 * Execute a function with retry logic.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  policy: Partial<RetryPolicy> = {},
  hooks: RetryHooks = {}
): Promise<T> {
  const fullPolicy: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...policy };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= fullPolicy.maxAttempts; attempt++) {
    // Check abort signal
    if (hooks.signal?.aborted) {
      throw new Error("Retry aborted");
    }

    try {
      return await fn();
    } catch (error) {
      lastError = asError(error);

      // Check if we should retry this error
      if (!isRetryable(lastError, fullPolicy)) {
        throw lastError;
      }

      // Check if we have more attempts
      if (attempt >= fullPolicy.maxAttempts) {
        const info = createAttemptInfo(attempt, hooks);
        hooks.onRetryGivenUp?.(attempt, lastError, info);
        throw lastError;
      }

      // Calculate and wait for next delay
      const delayMs = calculateRetryDelay(attempt, fullPolicy);
      const info = createAttemptInfo(attempt, hooks);
      
      hooks.onAttemptFailed?.(attempt, lastError, delayMs, info);

      // Wait before next attempt
      await sleep(delayMs, hooks.signal);
    }
  }

  // Should not reach here, but TypeScript needs it
  throw lastError ?? new Error("Retry failed");
}

/**
 * Execute a synchronous function with retry logic.
 */
export function withRetrySync<T>(
  fn: () => T,
  policy: Partial<RetryPolicy> = {},
  hooks: RetryHooks = {}
): T {
  const fullPolicy: RetryPolicy = { ...DEFAULT_RETRY_POLICY, ...policy };
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= fullPolicy.maxAttempts; attempt++) {
    try {
      return fn();
    } catch (error) {
      lastError = asError(error);

      if (!isRetryable(lastError, fullPolicy)) {
        throw lastError;
      }

      if (attempt >= fullPolicy.maxAttempts) {
        const info = createAttemptInfo(attempt, hooks);
        hooks.onRetryGivenUp?.(attempt, lastError, info);
        throw lastError;
      }

      const delayMs = calculateRetryDelay(attempt, fullPolicy);
      const info = createAttemptInfo(attempt, hooks);
      
      hooks.onAttemptFailed?.(attempt, lastError, delayMs, info);
    }
  }

  throw lastError ?? new Error("Retry failed");
}
