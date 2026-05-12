/**
 * MetricRegistry - Centralized metrics for pi-pipeline
 * Pattern from: pi-crew/src/observability/metric-registry.ts
 */

export interface Metric {
  name: string;
  description: string;
  snapshot(): MetricSnapshot;
}

export interface MetricSnapshot {
  name: string;
  description: string;
  value: number;
  labels: Record<string, string>;
}

export interface Counter extends Metric {
  inc(delta?: number): void;
  value(labels?: Record<string, string>): number;
}

export interface Gauge extends Metric {
  set(value: number): void;
  value(labels?: Record<string, string>): number;
}

export interface Histogram extends Metric {
  observe(value: number): void;
  percentiles(p: number[]): Map<number, number>;
}

interface CounterSnapshot {
  value: number;
}

interface HistogramData {
  values: number[];
  buckets: number[];
}

// Pattern: pipeline.<domain>.<measure> where domain and measure are lowercase alphanumeric with underscores
const METRIC_NAME_PATTERN = /^pipeline\.[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/;

function assertMetricName(name: string): void {
  if (!METRIC_NAME_PATTERN.test(name)) {
    throw new Error(`Invalid metric name '${name}'. Expected pipeline.<domain>.<measure>.`);
  }
}

export class PipelineMetricRegistry {
  private counters = new Map<string, CounterSnapshot>();
  private gauges = new Map<string, number>();
  private histograms = new Map<string, HistogramData>();
  private descriptions = new Map<string, string>();

  registerCounter(name: string, description: string): Counter {
    assertMetricName(name);
    if (this.counters.has(name)) {
      throw new Error(`Metric '${name}' is already registered.`);
    }
    this.descriptions.set(name, description);
    this.counters.set(name, { value: 0 });
    
    return {
      name,
      description,
      snapshot: () => ({
        name,
        description,
        value: this.counters.get(name)?.value ?? 0,
        labels: {}
      }),
      inc: (delta = 1) => {
        const current = this.counters.get(name);
        if (current) current.value += delta;
      },
      value: () => this.counters.get(name)?.value ?? 0
    };
  }

  registerGauge(name: string, description: string): Gauge {
    assertMetricName(name);
    if (this.gauges.has(name)) {
      throw new Error(`Metric '${name}' is already registered.`);
    }
    this.descriptions.set(name, description);
    this.gauges.set(name, 0);
    
    return {
      name,
      description,
      snapshot: () => ({
        name,
        description,
        value: this.gauges.get(name) ?? 0,
        labels: {}
      }),
      set: (value: number) => {
        this.gauges.set(name, value);
      },
      value: () => this.gauges.get(name) ?? 0
    };
  }

  registerHistogram(name: string, description: string, buckets?: number[]): Histogram {
    assertMetricName(name);
    if (this.histograms.has(name)) {
      throw new Error(`Metric '${name}' is already registered.`);
    }
    this.descriptions.set(name, description);
    this.histograms.set(name, { values: [], buckets: buckets ?? [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10] });
    
    const histogramData = this.histograms.get(name)!;
    
    return {
      name,
      description,
      snapshot: () => {
        const stats = this.histogramStats(name);
        return {
          name,
          description,
          value: stats.mean,
          labels: {}
        };
      },
      observe: (value: number) => {
        histogramData.values.push(value);
      },
      percentiles: (p: number[]) => {
        const sorted = [...histogramData.values].sort((a, b) => a - b);
        const result = new Map<number, number>();
        for (const percentile of p) {
          result.set(percentile, this.percentile(sorted, percentile));
        }
        return result;
      }
    };
  }

  counter(name: string, description: string): Counter {
    const existing = this.counters.get(name);
    if (existing) {
      if (existing.value !== undefined) {
        console.warn(`[pi-pipeline] counter '${name}' description changed; using original`);
      }
      return {
        name,
        description: this.descriptions.get(name) || description,
        snapshot: () => ({ name, description: this.descriptions.get(name) || description, value: existing.value, labels: {} }),
        inc: (delta = 1) => { existing.value += delta; },
        value: () => existing.value
      };
    }
    return this.registerCounter(name, description);
  }

  gauge(name: string, description: string): Gauge {
    if (this.gauges.has(name)) {
      return {
        name,
        description: this.descriptions.get(name) || description,
        snapshot: () => ({ name, description: this.descriptions.get(name) || description, value: this.gauges.get(name) ?? 0, labels: {} }),
        set: (value: number) => { this.gauges.set(name, value); },
        value: () => this.gauges.get(name) ?? 0
      };
    }
    return this.registerGauge(name, description);
  }

  histogram(name: string, description: string, buckets?: number[]): Histogram {
    if (this.histograms.has(name)) {
      const histogramData = this.histograms.get(name)!;
      return {
        name,
        description: this.descriptions.get(name) || description,
        snapshot: () => {
          const stats = this.histogramStats(name);
          return { name, description: this.descriptions.get(name) || description, value: stats.mean, labels: {} };
        },
        observe: (value: number) => { histogramData.values.push(value); },
        percentiles: (p: number[]) => {
          const sorted = [...histogramData.values].sort((a, b) => a - b);
          const result = new Map<number, number>();
          for (const percentile of p) {
            result.set(percentile, this.percentile(sorted, percentile));
          }
          return result;
        }
      };
    }
    return this.registerHistogram(name, description, buckets);
  }

  private histogramStats(name: string): { mean: number; count: number; min: number; max: number } {
    const hist = this.histograms.get(name);
    if (!hist || hist.values.length === 0) {
      return { mean: 0, count: 0, min: 0, max: 0 };
    }
    const values = [...hist.values].sort((a, b) => a - b);
    const sum = values.reduce((a, b) => a + b, 0);
    return {
      mean: sum / values.length,
      count: values.length,
      min: values[0],
      max: values[values.length - 1]
    };
  }

  private percentile(sortedValues: number[], p: number): number {
    if (sortedValues.length === 0) return 0;
    const index = (p / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sortedValues[lower];
    return sortedValues[lower] * (upper - index) + sortedValues[upper] * (index - lower);
  }

  snapshot(): MetricSnapshot[] {
    const snapshots: MetricSnapshot[] = [];
    
    for (const [name, counter] of this.counters) {
      snapshots.push({
        name,
        description: this.descriptions.get(name) || '',
        value: counter.value,
        labels: {}
      });
    }
    
    for (const [name, value] of this.gauges) {
      snapshots.push({
        name,
        description: this.descriptions.get(name) || '',
        value,
        labels: {}
      });
    }
    
    for (const [name] of this.histograms) {
      const stats = this.histogramStats(name);
      snapshots.push({
        name,
        description: this.descriptions.get(name) || '',
        value: stats.mean,
        labels: { count: String(stats.count), min: String(stats.min), max: String(stats.max) }
      });
    }
    
    return snapshots;
  }

  dispose(): void {
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.descriptions.clear();
  }
}

export const pipelineMetrics = new PipelineMetricRegistry();

export const PIPELINE_METRICS = {
  TASKS_TOTAL: 'pipeline.tasks.total',
  TASKS_COMPLETED: 'pipeline.tasks.completed',
  TASKS_FAILED: 'pipeline.tasks.failed',
  MILESTONES_TOTAL: 'pipeline.milestones.total',
  MILESTONES_REACHED: 'pipeline.milestones.reached',
  COST_TOTAL: 'pipeline.cost.total',
  COST_ESTIMATED: 'pipeline.cost.estimated',
  DURATION_MS: 'pipeline.time.duration',
  QUEUE_TIME_MS: 'pipeline.time.queue',
  QUALITY_SCORE: 'pipeline.quality.score',
  QUALITY_GATES_PASSED: 'pipeline.quality.gates_passed',
  QUALITY_GATES_FAILED: 'pipeline.quality.gates_failed',
  SHIP_REQUESTS: 'pipeline.ship.requests',
  SHIP_SUCCESS: 'pipeline.ship.success',
  SHIP_ROLLBACK: 'pipeline.ship.rollback',
} as const;
