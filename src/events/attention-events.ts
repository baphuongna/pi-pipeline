/**
 * Attention Events - Pattern from pi-crew attention-events.ts
 * 
 * Deduplicated attention event tracking for pipeline stages.
 */

export type AttentionReason = 
  | "no_verification"
  | "threshold_exceeded"
  | "timeout"
  | "error"
  | "needs_review"
  | "manual_intervention";

export type ActivityState = 
  | "active"
  | "idle"
  | "stale"
  | "needs_attention"
  | "completed";

export interface AttentionEvent {
  id: string;
  type: "attention";
  timestamp: string;
  stageId: string;
  message: string;
  reason: AttentionReason;
  activityState: ActivityState;
  data?: Record<string, unknown>;
}

export interface AttentionEventStore {
  events: AttentionEvent[];
  lastCleanup?: string;
}

const MAX_EVENTS = 200;
const DEDUP_WINDOW = 50;

export class AttentionEventTracker {
  private events: AttentionEvent[] = [];
  private stageEvents = new Map<string, AttentionEvent[]>();

  /**
   * Add an attention event (deduplicated)
   */
  addAttention(
    stageId: string,
    message: string,
    reason: AttentionReason,
    data?: Record<string, unknown>
  ): boolean {
    // Check for duplicates in recent events
    const dedupKey = `${stageId}:${reason}`;
    const recentEvents = this.events.slice(-DEDUP_WINDOW);
    
    const duplicate = recentEvents.some(e => 
      `${e.stageId}:${e.reason}` === dedupKey
    );
    
    if (duplicate) return false;
    
    const event: AttentionEvent = {
      id: `attention-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      type: "attention",
      timestamp: new Date().toISOString(),
      stageId,
      message,
      reason,
      activityState: "needs_attention",
      data,
    };
    
    this.events.push(event);
    
    // Track per-stage events
    if (!this.stageEvents.has(stageId)) {
      this.stageEvents.set(stageId, []);
    }
    this.stageEvents.get(stageId)!.push(event);
    
    // Trim old events
    if (this.events.length > MAX_EVENTS) {
      this.events = this.events.slice(-MAX_EVENTS);
    }
    
    return true;
  }

  /**
   * Get all attention events
   */
  getEvents(): AttentionEvent[] {
    return [...this.events];
  }

  /**
   * Get events for a specific stage
   */
  getEventsForStage(stageId: string): AttentionEvent[] {
    return this.stageEvents.get(stageId) ?? [];
  }

  /**
   * Get recent events
   */
  getRecentEvents(count = 10): AttentionEvent[] {
    return this.events.slice(-count);
  }

  /**
   * Clear events for a stage
   */
  clearStage(stageId: string): void {
    this.stageEvents.delete(stageId);
    this.events = this.events.filter(e => e.stageId !== stageId);
  }

  /**
   * Clear all events
   */
  clear(): void {
    this.events = [];
    this.stageEvents.clear();
  }

  /**
   * Export events as array
   */
  export(): AttentionEventStore {
    return { events: [...this.events] };
  }

  /**
   * Import events
   */
  import(store: AttentionEventStore): void {
    this.events = store.events;
    this.stageEvents.clear();
    
    for (const event of store.events) {
      if (!this.stageEvents.has(event.stageId)) {
        this.stageEvents.set(event.stageId, []);
      }
      this.stageEvents.get(event.stageId)!.push(event);
    }
  }
}

/**
 * Create default attention tracker
 */
export function createAttentionTracker(): AttentionEventTracker {
  return new AttentionEventTracker();
}
