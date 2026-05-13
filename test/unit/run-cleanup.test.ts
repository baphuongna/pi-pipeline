import assert from "node:assert/strict";
import test from "node:test";
import { pruneRuns, isFinished, formatBytes } from "../../src/maintenance/run-cleanup.ts";

test("isFinished - returns true for terminal statuses", () => {
  assert.strictEqual(isFinished("completed"), true);
  assert.strictEqual(isFinished("failed"), true);
  assert.strictEqual(isFinished("cancelled"), true);
  assert.strictEqual(isFinished("skipped"), true);
});

test("isFinished - returns false for non-terminal statuses", () => {
  assert.strictEqual(isFinished("running"), false);
  assert.strictEqual(isFinished("queued"), false);
  assert.strictEqual(isFinished("pending"), false);
});

test("pruneRuns - keeps recent runs", () => {
  const runs = [
    { runId: "run1", status: "completed", stateRoot: "", artifactsRoot: "", updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
    { runId: "run2", status: "running", stateRoot: "", artifactsRoot: "", updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
  ];
  
  const result = pruneRuns(runs, { keep: 10 });
  
  assert.deepStrictEqual(result.kept, ["run1", "run2"]);
  assert.deepStrictEqual(result.removed, []);
});

test("pruneRuns - removes old finished runs", () => {
  const oldDate = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
  const runs = [
    { runId: "run1", status: "completed", stateRoot: "", artifactsRoot: "", updatedAt: oldDate, createdAt: oldDate },
    { runId: "run2", status: "completed", stateRoot: "", artifactsRoot: "", updatedAt: new Date().toISOString(), createdAt: new Date().toISOString() },
  ];
  
  const result = pruneRuns(runs, { keep: 1, maxAgeDays: 7 });
  
  assert.ok(result.kept.includes("run2"));
  assert.ok(result.removed.includes("run1"));
});

test("formatBytes - formats correctly", () => {
  assert.strictEqual(formatBytes(500), "500 B");
  assert.strictEqual(formatBytes(1024), "1.0 KB");
  assert.strictEqual(formatBytes(1024 * 1024), "1.0 MB");
  assert.strictEqual(formatBytes(1024 * 1024 * 1024), "1.0 GB");
});
