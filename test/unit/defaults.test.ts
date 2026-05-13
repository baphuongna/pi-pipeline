import assert from "node:assert/strict";
import test from "node:test";
import { 
  DEFAULT_CONFIG, 
  mergeConfig, 
  DEFAULT_TIMEOUTS,
  DEFAULT_CONCURRENCY 
} from "../../src/config/defaults.ts";

test("DEFAULT_CONFIG has all required sections", () => {
  assert.ok(DEFAULT_CONFIG.timeouts);
  assert.ok(DEFAULT_CONFIG.concurrency);
  assert.ok(DEFAULT_CONFIG.retention);
  assert.ok(DEFAULT_CONFIG.quality);
  assert.ok(DEFAULT_CONFIG.budget);
  assert.ok(DEFAULT_CONFIG.ui);
  assert.ok(DEFAULT_CONFIG.notifications);
});

test("DEFAULT_TIMEOUTS has reasonable values", () => {
  assert.strictEqual(DEFAULT_TIMEOUTS.step, 5 * 60 * 1000);
  assert.strictEqual(DEFAULT_TIMEOUTS.verification, 2 * 60 * 1000);
  assert.ok(DEFAULT_TIMEOUTS.step > DEFAULT_TIMEOUTS.verification);
});

test("DEFAULT_CONCURRENCY has reasonable values", () => {
  assert.strictEqual(DEFAULT_CONCURRENCY.hardCap, 8);
  assert.strictEqual(DEFAULT_CONCURRENCY.steps, 4);
});

test("mergeConfig merges overrides", () => {
  const config = mergeConfig({
    timeouts: { step: 60000 },
    concurrency: { steps: 8 },
  });
  
  assert.strictEqual(config.timeouts.step, 60000);
  assert.strictEqual(config.concurrency.steps, 8);
  // Unchanged values should remain
  assert.strictEqual(config.timeouts.verification, DEFAULT_TIMEOUTS.verification);
});

test("mergeConfig preserves nested defaults", () => {
  const config = mergeConfig({
    budget: { maxCostPerRun: 200 },
  });
  
  assert.strictEqual(config.budget.maxCostPerRun, 200);
  assert.strictEqual(config.budget.warnAt80Percent, true);
});
