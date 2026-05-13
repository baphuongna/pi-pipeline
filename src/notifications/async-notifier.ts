/**
 * Async Notifier - Pattern from pi-crew async-notifier.ts
 * 
 * Background notification for pipeline events.
 */

export type NotificationLevel = "info" | "warning" | "error" | "critical";

export interface PipelineNotification {
  message: string;
  level: NotificationLevel;
  timestamp: string;
  stageId?: string;
  runId?: string;
}

export interface NotifierState {
  seenRunIds: Set<string>;
  interval?: ReturnType<typeof setInterval>;
  generation: number;
}

export type NotifyFunction = (message: string, level: NotificationLevel) => void;

export class PipelineNotifier {
  private state: NotifierState = {
    seenRunIds: new Set(),
    generation: 0,
  };
  private notify: NotifyFunction;
  private intervalMs: number;
  
  constructor(notify: NotifyFunction, intervalMs = 5000) {
    this.notify = notify;
    this.intervalMs = intervalMs;
  }
  
  /**
   * Start background notification polling
   */
  start(getRuns: () => Array<{
    runId: string;
    status: string;
    stageId?: string;
  }>): void {
    this.stop();
    
    this.state.interval = setInterval(() => {
      const runs = getRuns();
      
      for (const run of runs.slice(0, 20)) {
        if (this.isTerminalStatus(run.status) && !this.state.seenRunIds.has(run.runId)) {
          this.state.seenRunIds.add(run.runId);
          
          const level = this.getLevelForStatus(run.status);
          const message = `Pipeline ${run.status}: ${run.stageId ?? run.runId}`;
          
          this.notify(message, level);
        }
      }
    }, this.intervalMs);
  }
  
  /**
   * Stop background polling
   */
  stop(): void {
    if (this.state.interval) {
      clearInterval(this.state.interval);
      this.state.interval = undefined;
    }
    this.state.generation++;
  }
  
  /**
   * Send immediate notification
   */
  notifyNow(message: string, level: NotificationLevel): void {
    this.notify(message, level);
  }
  
  /**
   * Reset seen run IDs
   */
  reset(): void {
    this.state.seenRunIds.clear();
  }
  
  private isTerminalStatus(status: string): boolean {
    return status === "completed" || status === "failed" || 
           status === "cancelled" || status === "skipped";
  }
  
  private getLevelForStatus(status: string): NotificationLevel {
    switch (status) {
      case "completed": return "info";
      case "failed": return "error";
      case "cancelled": return "warning";
      case "skipped": return "info";
      default: return "info";
    }
  }
}

export function createPipelineNotifier(
  notify: NotifyFunction,
  intervalMs?: number
): PipelineNotifier {
  return new PipelineNotifier(notify, intervalMs);
}
