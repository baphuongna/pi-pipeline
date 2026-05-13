import assert from "node:assert/strict";
import test from "node:test";
import { PipelineNotifier, createPipelineNotifier } from "../../src/notifications/async-notifier.ts";

test("createPipelineNotifier creates notifier", () => {
  const notifications: any[] = [];
  const notifier = createPipelineNotifier(
    (msg, lvl) => notifications.push({ msg, lvl })
  );
  
  assert.ok(notifier);
  notifier.stop();
});

test("PipelineNotifier - notifyNow sends immediately", () => {
  const notifications: any[] = [];
  const notifier = new PipelineNotifier(
    (msg, lvl) => notifications.push({ msg, lvl }),
    60000 // Long interval to avoid background
  );
  
  notifier.notifyNow("Test message", "info");
  assert.strictEqual(notifications.length, 1);
  assert.strictEqual(notifications[0].msg, "Test message");
  assert.strictEqual(notifications[0].lvl, "info");
  
  notifier.stop();
});

test("PipelineNotifier - reset clears seen IDs", () => {
  const notifier = new PipelineNotifier(() => {});
  
  notifier.reset();
  notifier.stop();
});

test("PipelineNotifier - stop clears interval", () => {
  const notifier = new PipelineNotifier(() => {}, 1000);
  
  notifier.start(() => [
    { runId: "run1", status: "running" }
  ]);
  
  notifier.stop();
  // Second stop should not throw
  notifier.stop();
});
