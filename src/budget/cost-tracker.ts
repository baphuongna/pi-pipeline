/**
 * Cost Tracker - Track resource usage per milestone
 * Based on gsd-2 cost tracking patterns
 */

export interface CostEntry {
  id: string;
  milestoneId: string;
  phase: string;
  action: string;
  cost: number;
  timestamp: number;
  metadata?: Record<string, unknown>;
}

export interface BudgetAlert {
  threshold: number;
  current: number;
  limit: number;
  triggered: boolean;
}

export interface CostSummary {
  total: number;
  byMilestone: Record<string, number>;
  byPhase: Record<string, number>;
  alerts: BudgetAlert[];
}

/**
 * Cost Tracker for pipeline milestones
 */
export class CostTracker {
  private entries: CostEntry[] = [];
  private budgets: Map<string, number> = new Map();
  private alerts: Map<string, BudgetAlert> = new Map();

  constructor() {
    // Default budgets per milestone
    this.setBudget('default', 100);
  }

  /**
   * Set budget for a milestone
   */
  setBudget(milestoneId: string, limit: number): void {
    this.budgets.set(milestoneId, limit);
    this.alerts.set(milestoneId, {
      threshold: limit * 0.8, // Warn at 80%
      current: this.getMilestoneCost(milestoneId),
      limit,
      triggered: false,
    });
  }

  /**
   * Get budget for a milestone
   */
  getBudget(milestoneId: string): number {
    return this.budgets.get(milestoneId) ?? this.budgets.get('default') ?? 100;
  }

  /**
   * Record a cost entry
   */
  record(
    milestoneId: string,
    phase: string,
    action: string,
    cost: number,
    metadata?: Record<string, unknown>
  ): CostEntry {
    const entry: CostEntry = {
      id: `cost-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      milestoneId,
      phase,
      action,
      cost,
      timestamp: Date.now(),
      metadata,
    };

    this.entries.push(entry);

    // Check budget
    this.checkBudget(milestoneId);

    return entry;
  }

  /**
   * Get total cost for a milestone
   */
  getMilestoneCost(milestoneId: string): number {
    return this.entries
      .filter((e) => e.milestoneId === milestoneId)
      .reduce((sum, e) => sum + e.cost, 0);
  }

  /**
   * Get cost by phase for a milestone
   */
  getCostByPhase(milestoneId: string): Record<string, number> {
    const costs: Record<string, number> = {};

    for (const entry of this.entries) {
      if (entry.milestoneId === milestoneId) {
        costs[entry.phase] = (costs[entry.phase] || 0) + entry.cost;
      }
    }

    return costs;
  }

  /**
   * Get cost history for a milestone
   */
  getHistory(milestoneId: string, limit = 50): CostEntry[] {
    return this.entries
      .filter((e) => e.milestoneId === milestoneId)
      .slice(-limit)
      .reverse();
  }

  /**
   * Check if milestone is over budget
   */
  isOverBudget(milestoneId: string): boolean {
    return this.getMilestoneCost(milestoneId) > this.getBudget(milestoneId);
  }

  /**
   * Check budget and trigger alerts
   */
  private checkBudget(milestoneId: string): BudgetAlert | null {
    const current = this.getMilestoneCost(milestoneId);
    const limit = this.getBudget(milestoneId);
    const alert = this.alerts.get(milestoneId);

    if (!alert) return null;

    alert.current = current;
    alert.triggered = current >= alert.threshold;

    if (current > limit) {
      // Over budget!
      console.warn(`[CostTracker] Over budget: ${current} > ${limit}`);
    }

    return alert;
  }

  /**
   * Get alert for a milestone
   */
  getAlert(milestoneId: string): BudgetAlert | undefined {
    return this.alerts.get(milestoneId);
  }

  /**
   * Get full cost summary
   */
  getSummary(): CostSummary {
    const byMilestone: Record<string, number> = {};
    const byPhase: Record<string, number> = {};
    const alerts: BudgetAlert[] = [];

    let total = 0;

    for (const entry of this.entries) {
      total += entry.cost;
      byMilestone[entry.milestoneId] = (byMilestone[entry.milestoneId] || 0) + entry.cost;
      byPhase[entry.phase] = (byPhase[entry.phase] || 0) + entry.cost;
    }

    for (const [milestoneId, alert] of this.alerts) {
      if (alert.triggered) {
        alerts.push(alert);
      }
    }

    return { total, byMilestone, byPhase, alerts };
  }

  /**
   * Reset costs for a milestone
   */
  reset(milestoneId: string): void {
    this.entries = this.entries.filter((e) => e.milestoneId !== milestoneId);
    const budget = this.getBudget(milestoneId);
    this.alerts.set(milestoneId, {
      threshold: budget * 0.8,
      current: 0,
      limit: budget,
      triggered: false,
    });
  }

  /**
   * Clear all entries
   */
  clear(): void {
    this.entries = [];
    this.alerts.clear();
  }

  /**
   * Get remaining budget
   */
  getRemaining(milestoneId: string): number {
    return Math.max(0, this.getBudget(milestoneId) - this.getMilestoneCost(milestoneId));
  }

  /**
   * Estimate completion cost
   */
  estimateCompletion(milestoneId: string, percentComplete: number): number {
    const current = this.getMilestoneCost(milestoneId);
    if (percentComplete === 0) return 0;
    return (current / percentComplete) * 100;
  }
}
