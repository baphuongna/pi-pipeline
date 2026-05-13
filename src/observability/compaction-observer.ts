/**
 * Compaction Observer
 * 
 * Pattern for tracking context compaction events.
 * Adopted from pi-subagents3's agent-runner.ts.
 */

/**
 * Reason why compaction occurred.
 */
export type CompactionReason = "manual" | "threshold" | "overflow";

/**
 * Information about a compaction event.
 */
export interface CompactionInfo {
  reason: CompactionReason;
  tokensBefore: number;
  timestamp: number;
}

/**
 * Callback type for compaction events.
 */
export type CompactionCallback = (info: CompactionInfo) => void;

/**
 * Compaction observer that tracks context compaction events.
 * Useful for understanding when and why context is compacted.
 */
export class CompactionObserver {
  #events: CompactionInfo[] = [];
  #callbacks: Set<CompactionCallback> = new Set();

  /**
   * Notify observers of a compaction event.
   */
  notify(info: Omit<CompactionInfo, "timestamp">): void {
    const fullInfo: CompactionInfo = {
      ...info,
      timestamp: Date.now(),
    };
    this.#events.push(fullInfo);
    this.#callbacks.forEach((cb) => cb(fullInfo));
  }

  /**
   * Subscribe to compaction events.
   */
  onCompaction(callback: CompactionCallback): () => void {
    this.#callbacks.add(callback);
    return () => this.#callbacks.delete(callback);
  }

  /**
   * Get all compaction events.
   */
  get events(): CompactionInfo[] {
    return [...this.#events];
  }

  /**
   * Get count of compactions by reason.
   */
  getCountByReason(): Record<CompactionReason, number> {
    const counts: Record<CompactionReason, number> = {
      manual: 0,
      threshold: 0,
      overflow: 0,
    };
    for (const event of this.#events) {
      counts[event.reason]++;
    }
    return counts;
  }

  /**
   * Get total tokens saved from compactions.
   */
  getTotalTokensSaved(): number {
    return this.#events.reduce(
      (sum, event) => sum + event.tokensBefore,
      0
    );
  }

  /**
   * Clear all events.
   */
  clear(): void {
    this.#events = [];
  }
}

/**
 * Create a new compaction observer.
 */
export function createCompactionObserver(): CompactionObserver {
  return new CompactionObserver();
}
