/**
 * Semaphore Pattern
 * 
 * Simple counting semaphore for limiting concurrency across async work.
 * Provides fail-fast on first error and AbortSignal support.
 * 
 * Inspired by pi-crew's semaphore.ts (adapted from oh-my-pi's parallel.ts).
 */

/**
 * Simple counting semaphore for limiting concurrency.
 */
export class Semaphore {
  #max: number;
  #current = 0;
  #queue: Array<() => void> = [];

  constructor(max: number) {
    this.#max = Math.max(1, max);
  }

  /**
   * Acquire a semaphore slot. Blocks if all slots are taken.
   */
  async acquire(): Promise<void> {
    if (this.#current < this.#max) {
      this.#current++;
      return;
    }

    const { promise, resolve } = (() => {
      let res: () => void;
      const p = new Promise<void>((r) => { res = r; });
      return { promise: p, resolve: res! };
    })();

    this.#queue.push(resolve);
    return promise;
  }

  /**
   * Release a semaphore slot.
   */
  release(): void {
    const next = this.#queue.shift();
    if (next) {
      next();
    } else if (this.#current > 0) {
      this.#current--;
    }
    // Guard: over-release is a no-op to prevent #current going negative
  }

  /**
   * Current number of acquired slots.
   */
  get current(): number {
    return this.#current;
  }

  /**
   * Maximum number of slots.
   */
  get max(): number {
    return this.#max;
  }

  /**
   * Number of waiting acquisitions.
   */
  get waiting(): number {
    return this.#queue.length;
  }

  /**
   * Run a function with semaphore protection.
   */
  async withLock<T>(fn: () => Promise<T>): Promise<T> {
    await this.acquire();
    try {
      return await fn();
    } finally {
      this.release();
    }
  }

  /**
   * Clear all waiting acquisitions.
   */
  clear(): void {
    this.#queue = [];
  }
}

/**
 * Run multiple async tasks with concurrency limit.
 * Fails fast on first error.
 */
export async function mapWithConcurrencyLimit<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal
): Promise<R[]> {
  const semaphore = new Semaphore(limit);
  const results: R[] = new Array(items.length);
  let error: unknown;

  const workers = items.map(async (item, index) => {
    if (error) return; // Fail fast

    if (signal?.aborted) {
      error = new Error("Aborted");
      return;
    }

    await semaphore.acquire();
    try {
      if (signal?.aborted) {
        error = new Error("Aborted");
        return;
      }
      results[index] = await fn(item, index);
    } catch (e) {
      error = e;
    } finally {
      semaphore.release();
    }
  });

  await Promise.all(workers);

  if (error) throw error;
  return results;
}

/**
 * Run multiple async tasks with concurrency limit.
 * Collects all results even if some fail.
 */
export async function mapWithConcurrencyAll<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal
): Promise<R[]> {
  const semaphore = new Semaphore(limit);
  const results: R[] = new Array(items.length);

  const workers = items.map(async (item, index) => {
    if (signal?.aborted) return;

    await semaphore.acquire();
    try {
      results[index] = await fn(item, index);
    } catch {
      // Silently ignore errors
    } finally {
      semaphore.release();
    }
  });

  await Promise.all(workers);
  return results;
}
