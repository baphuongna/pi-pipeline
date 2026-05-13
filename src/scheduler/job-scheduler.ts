/**
 * Job Scheduler - Pattern from pi-subagents3 SubagentScheduler
 * 
 * Supports cron expressions, intervals, and one-shot scheduling.
 */

import type { Cron } from 'croner';

export type ScheduleType = 'cron' | 'once' | 'interval';

export interface ScheduledJob {
  id: string;
  name: string;
  description: string;
  schedule: string;
  scheduleType: ScheduleType;
  intervalMs?: number;
  enabled: boolean;
  createdAt: string;
  lastRun?: string;
  lastStatus?: 'success' | 'error' | 'running';
  runCount: number;
  nextRun?: string;
}

export interface NewJobInput {
  name: string;
  description: string;
  schedule: string;
  handler: () => void | Promise<void>;
}

export class PipelineScheduler {
  private jobs = new Map<string, Cron>();
  private intervals = new Map<string, NodeJS.Timeout>();
  private jobHandlers = new Map<string, () => void | Promise<void>>();
  private jobConfigs = new Map<string, ScheduledJob>();

  /**
   * Add a scheduled job
   */
  addJob(input: NewJobInput): ScheduledJob {
    const id = this.generateId();
    const detected = PipelineScheduler.detectSchedule(input.schedule);
    
    const job: ScheduledJob = {
      id,
      name: input.name,
      description: input.description,
      schedule: detected.normalized,
      scheduleType: detected.type,
      intervalMs: detected.intervalMs,
      enabled: true,
      createdAt: new Date().toISOString(),
      runCount: 0,
    };

    this.jobHandlers.set(id, input.handler);
    this.jobConfigs.set(id, job);
    
    if (job.enabled) {
      this.scheduleJob(job);
    }

    return job;
  }

  /**
   * Remove a job
   */
  removeJob(id: string): boolean {
    this.unscheduleJob(id);
    this.jobHandlers.delete(id);
    return this.jobConfigs.delete(id);
  }

  /**
   * Toggle job enabled state
   */
  toggleJob(id: string, enabled: boolean): boolean {
    const job = this.jobConfigs.get(id);
    if (!job) return false;

    job.enabled = enabled;
    
    if (enabled) {
      this.scheduleJob(job);
    } else {
      this.unscheduleJob(id);
    }

    return true;
  }

  /**
   * List all jobs
   */
  listJobs(): ScheduledJob[] {
    return [...this.jobConfigs.values()];
  }

  /**
   * Get a specific job
   */
  getJob(id: string): ScheduledJob | undefined {
    return this.jobConfigs.get(id);
  }

  /**
   * Execute a job immediately
   */
  async executeNow(id: string): Promise<void> {
    const handler = this.jobHandlers.get(id);
    const job = this.jobConfigs.get(id);
    if (!handler || !job) return;

    job.lastStatus = 'running';
    
    try {
      await handler();
      job.lastStatus = 'success';
    } catch {
      job.lastStatus = 'error';
    }
    
    job.lastRun = new Date().toISOString();
    job.runCount++;
  }

  /**
   * Stop all timers
   */
  stop(): void {
    for (const cron of this.jobs.values()) {
      cron.stop();
    }
    this.jobs.clear();
    
    for (const t of this.intervals.values()) {
      clearTimeout(t);
    }
    this.intervals.clear();
  }

  private scheduleJob(job: ScheduledJob): void {
    try {
      if (job.scheduleType === 'interval' && job.intervalMs) {
        const t = setInterval(() => this.executeJob(job.id), job.intervalMs);
        this.intervals.set(job.id, t);
      } else if (job.scheduleType === 'once') {
        const target = new Date(job.schedule).getTime();
        const delay = target - Date.now();
        if (delay > 0) {
          const t = setTimeout(() => {
            this.executeJob(job.id);
            this.unscheduleJob(job.id);
          }, delay);
          this.intervals.set(job.id, t);
        }
      } else {
        // Cron expression - for now, simplified handling
        // In production, use croner library
      }
    } catch (err) {
      console.error(`Failed to schedule job ${job.id}:`, err);
    }
  }

  private unscheduleJob(id: string): void {
    const cron = this.jobs.get(id);
    if (cron) {
      cron.stop();
      this.jobs.delete(id);
    }
    
    const t = this.intervals.get(id);
    if (t) {
      clearTimeout(t);
      this.intervals.delete(id);
    }
  }

  private async executeJob(id: string): Promise<void> {
    await this.executeNow(id);
  }

  private generateId(): string {
    return `job-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
  }

  /**
   * Detect and validate schedule format
   */
  static detectSchedule(s: string): { 
    type: ScheduleType; 
    intervalMs?: number; 
    normalized: string 
  } {
    const trimmed = s.trim();

    // "+10m" — relative one-shot
    const rel = this.parseRelativeTime(trimmed);
    if (rel !== null) return { type: 'once', normalized: rel };

    // "5m" — interval
    const ivl = this.parseInterval(trimmed);
    if (ivl !== null) return { type: 'interval', intervalMs: ivl, normalized: trimmed };

    // ISO timestamp — one-shot
    if (/^\d{4}-\d{2}-\d{2}T/.test(trimmed)) {
      return { type: 'once', normalized: trimmed };
    }

    // Cron-like (simplified)
    return { type: 'cron', normalized: trimmed };
  }

  /**
   * Parse "+10s"/"+5m"/"+1h"/"+2d" → ISO timestamp
   */
  static parseRelativeTime(s: string): string | null {
    const m = s.match(/^\+(\d+)(s|m|h|d)$/);
    if (!m) return null;
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const ms = parseInt(m[1], 10) * multipliers[m[2]];
    return new Date(Date.now() + ms).toISOString();
  }

  /**
   * Parse "10s"/"5m"/"1h"/"2d" → milliseconds
   */
  static parseInterval(s: string): number | null {
    const m = s.match(/^(\d+)(s|m|h|d)$/);
    if (!m) return null;
    const multipliers: Record<string, number> = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return parseInt(m[1], 10) * multipliers[m[2]];
  }
}
