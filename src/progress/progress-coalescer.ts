/**
 * Progress Coalescer - Pattern from pi-crew progress-event-coalescer.ts
 * 
 * Intelligent event batching to reduce UI updates.
 */

export interface ProgressSnapshot {
  eventType: string;
  currentTool?: string;
  toolCount: number;
  tokens: number;
  turns: number;
  activityState: "active" | "idle" | "stale" | "needs_attention";
  lastActivityAt: string;
}

export interface CoalesceDecision {
  shouldAppend: boolean;
  reason: string;
}

export interface CoalesceInput {
  previous?: ProgressSnapshot;
  next: ProgressSnapshot;
  nowMs: number;
  lastAppendMs?: number;
  minIntervalMs: number;
  tokenThreshold?: number;
}

const DEFAULT_TOKEN_THRESHOLD = 256;

function numericDiff(prev?: number, next?: number): number {
  return next !== undefined && prev !== undefined ? next - prev : next ?? 0;
}

export function shouldCoalesceProgress(input: CoalesceInput): CoalesceDecision {
  const { previous, next, nowMs, lastAppendMs, minIntervalMs, tokenThreshold = DEFAULT_TOKEN_THRESHOLD } = input;
  
  // Always append first event
  if (!previous) {
    return { shouldAppend: true, reason: "first" };
  }
  
  // Force on activity state changes
  if (previous.activityState !== next.activityState) {
    return { shouldAppend: true, reason: "activity_changed" };
  }
  
  // Force on tool changes
  if (previous.currentTool !== next.currentTool) {
    return { shouldAppend: true, reason: "tool_changed" };
  }
  
  // Force on count increases
  if (numericDiff(previous.toolCount, next.toolCount) > 0) {
    return { shouldAppend: true, reason: "tool_count_increased" };
  }
  
  if (numericDiff(previous.turns, next.turns) > 0) {
    return { shouldAppend: true, reason: "turns_increased" };
  }
  
  // Coalesce token updates with threshold
  const tokenIncrease = numericDiff(previous.tokens, next.tokens);
  if (tokenIncrease >= tokenThreshold) {
    return { shouldAppend: true, reason: "tokens_increased" };
  }
  
  // Time-based flush
  if (lastAppendMs === undefined || nowMs - lastAppendMs >= minIntervalMs) {
    return { shouldAppend: true, reason: "interval" };
  }
  
  return { shouldAppend: false, reason: "coalesced" };
}

export class ProgressCoalescer {
  private _minIntervalMs: number;
  private _tokenThreshold: number;
  private lastSnapshot?: ProgressSnapshot;
  private lastAppendMs?: number;
  
  constructor(minIntervalMs = 1000, tokenThreshold = 256) {
    this._minIntervalMs = minIntervalMs;
    this._tokenThreshold = tokenThreshold;
  }
  
  /**
   * Process a progress update, return whether to emit
   */
  process(snapshot: ProgressSnapshot): CoalesceDecision {
    const decision = shouldCoalesceProgress({
      previous: this.lastSnapshot,
      next: snapshot,
      nowMs: Date.now(),
      lastAppendMs: this.lastAppendMs,
      minIntervalMs: this._minIntervalMs,
      tokenThreshold: this._tokenThreshold,
    });
    
    if (decision.shouldAppend) {
      this.lastSnapshot = snapshot;
      this.lastAppendMs = Date.now();
    }
    
    return decision;
  }
  
  /**
   * Reset coalescer state
   */
  reset(): void {
    this.lastSnapshot = undefined;
    this.lastAppendMs = undefined;
  }
}
