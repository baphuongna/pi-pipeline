/**
 * Pipeline Defaults - Pattern from pi-crew config/defaults.ts
 * 
 * Centralized configuration defaults for pipeline.
 */

export const DEFAULT_TIMEOUTS = {
  step: 5 * 60 * 1000,      // 5 minutes per step
  verification: 2 * 60 * 1000, // 2 minutes for verification
  total: 60 * 60 * 1000,      // 1 hour total
  idle: 30 * 1000,             // 30 seconds idle timeout
};

export const DEFAULT_CONCURRENCY = {
  hardCap: 8,
  steps: 4,
  parallelStages: 4,
  fallback: 2,
};

export const DEFAULT_RETENTION = {
  maxAgeDays: 7,
  maxRuns: 10,
  maxArtifactsMb: 500,
};

export const DEFAULT_QUALITY = {
  minTestsPassing: 0.8,
  minCoveragePercent: 0,
  requireReview: false,
  requireSecurityScan: false,
};

export const DEFAULT_BUDGET = {
  maxCostPerRun: 100,
  maxTokensPerRun: 100000,
  warnAt80Percent: true,
  autoAbortAt100Percent: false,
};

export const DEFAULT_UI = {
  refreshMs: 1000,
  showProgress: true,
  showCost: true,
  showTokens: true,
  showStages: true,
  maxDisplayLines: 20,
  dashboardWidth: 72,
};

export const DEFAULT_NOTIFICATIONS = {
  onStart: false,
  onSuccess: true,
  onFailure: true,
  onWarning: true,
  onTimeout: true,
  severityFilter: ["warning", "error", "critical"] as const,
};

export interface PipelineConfig {
  timeouts: typeof DEFAULT_TIMEOUTS;
  concurrency: typeof DEFAULT_CONCURRENCY;
  retention: typeof DEFAULT_RETENTION;
  quality: typeof DEFAULT_QUALITY;
  budget: typeof DEFAULT_BUDGET;
  ui: typeof DEFAULT_UI;
  notifications: typeof DEFAULT_NOTIFICATIONS;
}

export const DEFAULT_CONFIG: PipelineConfig = {
  timeouts: DEFAULT_TIMEOUTS,
  concurrency: DEFAULT_CONCURRENCY,
  retention: DEFAULT_RETENTION,
  quality: DEFAULT_QUALITY,
  budget: DEFAULT_BUDGET,
  ui: DEFAULT_UI,
  notifications: DEFAULT_NOTIFICATIONS,
};

export function mergeConfig(
  overrides: Partial<PipelineConfig> = {}
): PipelineConfig {
  return {
    timeouts: { ...DEFAULT_TIMEOUTS, ...overrides.timeouts },
    concurrency: { ...DEFAULT_CONCURRENCY, ...overrides.concurrency },
    retention: { ...DEFAULT_RETENTION, ...overrides.retention },
    quality: { ...DEFAULT_QUALITY, ...overrides.quality },
    budget: { ...DEFAULT_BUDGET, ...overrides.budget },
    ui: { ...DEFAULT_UI, ...overrides.ui },
    notifications: { ...DEFAULT_NOTIFICATIONS, ...overrides.notifications },
  };
}
