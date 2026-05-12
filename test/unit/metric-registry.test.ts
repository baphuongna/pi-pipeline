import assert from "node:assert/strict";
import test from "node:test";
import { PipelineMetricRegistry, PIPELINE_METRICS } from "../../src/metrics/metric-registry.ts";

test("PipelineMetricRegistry - Counter registration and increment", () => {
  const registry = new PipelineMetricRegistry();
  const counter = registry.registerCounter("pipeline.tasks.total", "Total tasks");
  counter.inc();
  assert.strictEqual(counter.value(), 1);
  counter.inc(5);
  assert.strictEqual(counter.value(), 6);
});

test("PipelineMetricRegistry - Counter duplicate throws", () => {
  const registry = new PipelineMetricRegistry();
  registry.registerCounter("pipeline.test.counter", "Test");
  assert.throws(() => {
    registry.registerCounter("pipeline.test.counter", "Test");
  });
});

test("PipelineMetricRegistry - Counter singleton pattern", () => {
  const registry = new PipelineMetricRegistry();
  const counter1 = registry.counter("pipeline.tasks.total", "Total tasks");
  counter1.inc();
  const counter2 = registry.counter("pipeline.tasks.total", "Total tasks");
  assert.strictEqual(counter2.value(), 1);
});

test("PipelineMetricRegistry - Gauge set value", () => {
  const registry = new PipelineMetricRegistry();
  const gauge = registry.registerGauge("pipeline.tasks.running", "Running tasks");
  gauge.set(5);
  assert.strictEqual(gauge.value(), 5);
  gauge.set(10);
  assert.strictEqual(gauge.value(), 10);
});

test("PipelineMetricRegistry - Histogram observe and mean", () => {
  const registry = new PipelineMetricRegistry();
  const histogram = registry.registerHistogram("pipeline.time.duration", "Duration");
  histogram.observe(100);
  histogram.observe(200);
  histogram.observe(300);
  const snapshot = histogram.snapshot();
  assert.strictEqual(snapshot.name, "pipeline.time.duration");
  assert.strictEqual(snapshot.value, 200); // Mean
});

test("PipelineMetricRegistry - Histogram percentiles", () => {
  const registry = new PipelineMetricRegistry();
  const histogram = registry.registerHistogram("pipeline.latency.histogram", "Latency");
  for (let i = 1; i <= 10; i++) {
    histogram.observe(i * 10); // [10, 20, 30, 40, 50, 60, 70, 80, 90, 100]
  }
  const p50 = histogram.percentiles([50]).get(50);
  const p90 = histogram.percentiles([90]).get(90);
  // For 10 values, p50 should be around 55 (interpolated between 50 and 60)
  // p90 should be around 95 (interpolated between 90 and 100)
  assert.ok(p50 !== undefined && p50 >= 40 && p50 <= 70, `p50=${p50} should be around 55`);
  assert.ok(p90 !== undefined && p90 >= 80 && p90 <= 100, `p90=${p90} should be around 95`);
});

test("PipelineMetricRegistry - snapshot returns all metrics", () => {
  const registry = new PipelineMetricRegistry();
  registry.counter("pipeline.tasks.total", "Total tasks").inc();
  registry.gauge("pipeline.tasks.running", "Running").set(5);
  registry.histogram("pipeline.time.duration", "Duration").observe(100);
  
  const snapshots = registry.snapshot();
  assert.strictEqual(snapshots.length, 3);
});

test("PipelineMetricRegistry - dispose clears all", () => {
  const registry = new PipelineMetricRegistry();
  registry.counter("pipeline.test.counter", "Test").inc();
  registry.dispose();
  assert.strictEqual(registry.snapshot().length, 0);
});

test("PIPELINE_METRICS constants", () => {
  assert.strictEqual(PIPELINE_METRICS.TASKS_TOTAL, "pipeline.tasks.total");
  assert.strictEqual(PIPELINE_METRICS.TASKS_COMPLETED, "pipeline.tasks.completed");
  assert.strictEqual(PIPELINE_METRICS.COST_TOTAL, "pipeline.cost.total");
  assert.strictEqual(PIPELINE_METRICS.QUALITY_SCORE, "pipeline.quality.score");
});
