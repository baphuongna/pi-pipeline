import assert from "node:assert/strict";
import test from "node:test";
import { createAttentionTracker } from "../../src/events/attention-events.ts";

test("AttentionEventTracker - adds events", () => {
  const tracker = createAttentionTracker();
  const added = tracker.addAttention("stage1", "Test message", "no_verification");
  assert.strictEqual(added, true);
  assert.strictEqual(tracker.getEvents().length, 1);
});

test("AttentionEventTracker - deduplicates", () => {
  const tracker = createAttentionTracker();
  tracker.addAttention("stage1", "Message 1", "no_verification");
  tracker.addAttention("stage1", "Message 2", "no_verification"); // Same stage+reason
  tracker.addAttention("stage1", "Message 3", "threshold_exceeded"); // Different reason
  
  assert.strictEqual(tracker.getEvents().length, 2); // One deduplicated
});

test("AttentionEventTracker - per-stage events", () => {
  const tracker = createAttentionTracker();
  tracker.addAttention("stage1", "Msg 1", "error");
  tracker.addAttention("stage2", "Msg 2", "error");
  tracker.addAttention("stage1", "Msg 3", "timeout");
  
  assert.strictEqual(tracker.getEventsForStage("stage1").length, 2);
  assert.strictEqual(tracker.getEventsForStage("stage2").length, 1);
});

test("AttentionEventTracker - export/import", () => {
  const tracker = createAttentionTracker();
  tracker.addAttention("stage1", "Msg", "error");
  
  const exported = tracker.export();
  assert.strictEqual(exported.events.length, 1);
  
  const imported = createAttentionTracker();
  imported.import(exported);
  assert.strictEqual(imported.getEvents().length, 1);
});

test("AttentionEventTracker - clear stage", () => {
  const tracker = createAttentionTracker();
  tracker.addAttention("stage1", "Msg", "error");
  tracker.addAttention("stage2", "Msg", "error");
  
  tracker.clearStage("stage1");
  assert.strictEqual(tracker.getEvents().length, 1);
});
