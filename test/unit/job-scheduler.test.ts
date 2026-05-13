import assert from "node:assert/strict";
import test from "node:test";
import { PipelineScheduler } from "../../src/scheduler/job-scheduler.ts";

test("PipelineScheduler - detectSchedule parses intervals", () => {
  const result = PipelineScheduler.parseInterval("5m");
  assert.strictEqual(result, 5 * 60 * 1000);
  
  const result2 = PipelineScheduler.parseInterval("1h");
  assert.strictEqual(result2, 60 * 60 * 1000);
});

test("PipelineScheduler - parseInterval returns null for invalid", () => {
  assert.strictEqual(PipelineScheduler.parseInterval("invalid"), null);
  assert.strictEqual(PipelineScheduler.parseInterval("5x"), null);
});

test("PipelineScheduler - detectSchedule with interval", () => {
  const result = PipelineScheduler.detectSchedule("5m");
  assert.strictEqual(result.type, "interval");
  assert.strictEqual(result.intervalMs, 5 * 60 * 1000);
});

test("PipelineScheduler - detectSchedule with relative time", () => {
  const result = PipelineScheduler.detectSchedule("+10m");
  assert.strictEqual(result.type, "once");
  assert.ok(result.normalized.includes("T"));
});

test("PipelineScheduler - add and remove job", () => {
  const scheduler = new PipelineScheduler();
  
  let executed = false;
  const job = scheduler.addJob({
    name: "test-job",
    description: "Test job",
    schedule: "1h",
    handler: () => { executed = true; },
  });
  
  assert.strictEqual(job.name, "test-job");
  assert.strictEqual(job.enabled, true);
  
  const listed = scheduler.listJobs();
  assert.strictEqual(listed.length, 1);
  
  scheduler.removeJob(job.id);
  assert.strictEqual(scheduler.listJobs().length, 0);
  
  scheduler.stop();
});

test("PipelineScheduler - toggle job", () => {
  const scheduler = new PipelineScheduler();
  
  const job = scheduler.addJob({
    name: "toggle-test",
    description: "Toggle test",
    schedule: "5m",
    handler: () => {},
  });
  
  assert.strictEqual(job.enabled, true);
  
  scheduler.toggleJob(job.id, false);
  const updated = scheduler.getJob(job.id);
  assert.strictEqual(updated?.enabled, false);
  
  scheduler.removeJob(job.id);
  scheduler.stop();
});

test("PipelineScheduler - executeNow", async () => {
  const scheduler = new PipelineScheduler();
  
  let executed = false;
  const job = scheduler.addJob({
    name: "execute-test",
    description: "Execute test",
    schedule: "1h",
    handler: () => { executed = true; },
  });
  
  await scheduler.executeNow(job.id);
  assert.strictEqual(executed, true);
  
  const updated = scheduler.getJob(job.id);
  assert.strictEqual(updated?.runCount, 1);
  assert.strictEqual(updated?.lastStatus, "success");
  
  scheduler.removeJob(job.id);
  scheduler.stop();
});
