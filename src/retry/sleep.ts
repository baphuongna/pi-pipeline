/**
 * Sleep utility with abort support.
 */

/**
 * Sleep for a given number of milliseconds.
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sleep with abort support.
 * Resolves early if signal is aborted.
 */
export function sleepWithAbort(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error("Aborted"));
      return;
    }

    const timeout = setTimeout(resolve, ms);

    const onAbort = () => {
      clearTimeout(timeout);
      reject(new Error("Aborted"));
    };

    signal?.addEventListener("abort", onAbort, { once: true });

    // Clean up listener when resolved
    Promise.race([
      sleep(ms),
      new Promise<void>((_, reject) => signal?.addEventListener("abort", () => reject(new Error("Aborted")), { once: true })),
    ]).then(resolve).catch(reject);
  });
}
