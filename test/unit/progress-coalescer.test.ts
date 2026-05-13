import assert from "node:assert/strict";
import test from "node:test";
import { shouldCoalesceProgress, ProgressCoalescer } from "../../src/progress/progress-coalescer.ts";

test("shouldCoalesceProgress - first event always passes", () => {
  const decision = shouldCoalesceProgress({
    next: { eventType: "start", toolCount: 0, tokens: 0, turns: 0, activityState: "active", lastActivityAt: "" },
    nowMs: Date.now(),
    minIntervalMs: 1000,
  });
  
  assert.strictEqual(decision.shouldAppend, true);
  assert.strictEqual(decision.reason, "first");
});

test("shouldCoalesceProgress - activity change forces append", () => {
  const decision = shouldCoalesceProgress({
    previous: { eventType: "start", toolCount: 0, tokens: 0, turns: 0, activityState: "active", lastActivityAt: "" },
    next: { eventType: "start", toolCount: 0, tokens: 0, turns: 0, activityState: "idle", lastActivityAt: "" },
    nowMs: Date.now(),
    minIntervalMs: 1000,
  });
  
  assert.strictEqual(decision.shouldAppend, true);
  assert.strictEqual(decision.reason, "activity_changed");
});

test("shouldCoalesceProgress - tool change forces append", () => {
  const decision = shouldCoalesceProgress({
    previous: { eventType: "tool", currentTool: "bash", toolCount: 1, tokens: 100, turns: 0, activityState: "active", lastActivityAt: "" },
    next: { eventType: "tool", currentTool: "edit", toolCount: 2, tokens: 100, turns: 0, activityState: "active", lastActivityAt: "" },
    nowMs: Date.now(),
    minIntervalMs: 1000,
  });
  
  assert.strictEqual(decision.shouldAppend, true);
  assert.strictEqual(decision.reason, "tool_changed");
});

test("ProgressCoalescer - coalesces rapid token updates", () => {
  const coalescer = new ProgressCoalescer(1000, 256);
  
  // First snapshot
  coalescer.process({ eventType: "token", toolCount: 0, tokens: 100, turns: 0, activityState: "active", lastActivityAt: "" });
  
  // Second snapshot with small token increase (under threshold)
  const decision = coalescer.process({ eventType: "token", toolCount: 0, tokens: 200, turns: 0, activityState: "active", lastActivityAt: "" });
  
  // Should coalesce (200 - 100 = 100, which is under 256)
  assert.strictEqual(decision.shouldAppend, false);
});

test("ProgressCoalescer - forces append on large token increase", () => {
  const coalescer = new ProgressCoalescer(1000, 256);
  
  coalescer.process({ eventType: "token", toolCount: 0, tokens: 100, turns: 0, activityState: "active", lastActivityAt: "" });
  
  const decision = coalescer.process({ eventType: "token", toolCount: 0, tokens: 500, turns: 0, activityState: "active", lastActivityAt: "" });
  
  // Should append (500 - 100 = 400, over threshold)
  assert.strictEqual(decision.shouldAppend, true);
});
