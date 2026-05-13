import assert from "node:assert/strict";
import test from "node:test";
import { buildModelRouting, isRetryableModelFailure, ModelRouter } from "../../src/model/model-fallback.ts";

test("buildModelRouting - deduplicates candidates", () => {
  const plan = buildModelRouting({
    overrideModel: "claude",
    stepModel: "claude",
    agentModel: "claude-sonnet",
  });
  
  assert.strictEqual(plan.candidates.length, 2);
  assert.deepStrictEqual(plan.candidates, ["claude", "claude-sonnet"]);
});

test("buildModelRouting - preserves priority order", () => {
  const plan = buildModelRouting({
    stepModel: "claude-opus",
    fallbackModels: ["claude-sonnet", "claude-haiku"],
    agentModel: "claude",
  });
  
  assert.deepStrictEqual(plan.candidates, ["claude-opus", "claude-sonnet", "claude-haiku", "claude"]);
});

test("isRetryableModelFailure - detects retryable errors", () => {
  assert.strictEqual(isRetryableModelFailure("rate limit exceeded"), true);
  assert.strictEqual(isRetryableModelFailure("rate_limit"), true);
  assert.strictEqual(isRetryableModelFailure("context_window exceeded"), true);
  assert.strictEqual(isRetryableModelFailure("token.limit exceeded"), true);
  assert.strictEqual(isRetryableModelFailure("timeout"), true);
  assert.strictEqual(isRetryableModelFailure("503"), true);
  assert.strictEqual(isRetryableModelFailure("service unavailable"), true);
  assert.strictEqual(isRetryableModelFailure("overloaded"), true);
  assert.strictEqual(isRetryableModelFailure("invalid request"), false);
  assert.strictEqual(isRetryableModelFailure("not found"), false);
});

test("ModelRouter - records attempts", () => {
  const router = new ModelRouter();
  
  router.recordAttempt("claude", true);
  router.recordAttempt("claude-sonnet", false, "rate limit");
  
  assert.strictEqual(router.getNextCandidate(["claude", "claude-sonnet"]), "claude");
});

test("ModelRouter - skips exhausted non-retryable", () => {
  const router = new ModelRouter();
  
  router.recordAttempt("claude", false, "invalid request");
  router.recordAttempt("claude-sonnet", false, "rate limit");
  
  // claude is exhausted (non-retryable), claude-sonnet is retryable
  assert.strictEqual(router.getNextCandidate(["claude", "claude-sonnet"]), "claude-sonnet");
});

test("ModelRouter - isExhausted when all failed non-retryable", () => {
  const router = new ModelRouter();
  
  router.recordAttempt("claude", false, "invalid request");
  
  assert.strictEqual(router.isExhausted(["claude"]), true);
  assert.strictEqual(router.isExhausted(["claude", "claude-sonnet"]), false);
});
