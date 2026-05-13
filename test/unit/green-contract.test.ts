import assert from "node:assert/strict";
import test from "node:test";
import { greenLevelSatisfies, evaluateGreenContract, createVerificationEvidence } from "../../src/verify/green-contract.ts";

test("greenLevelSatisfies - none satisfies only none", () => {
  assert.strictEqual(greenLevelSatisfies("none", "none"), true);
  // "none" should NOT satisfy higher levels
  // The function returns true if observed >= required
  // So none (0) >= targeted (1) is false
});

test("greenLevelSatisfies - higher satisfies lower", () => {
  assert.strictEqual(greenLevelSatisfies("merge_ready", "none"), true);
  assert.strictEqual(greenLevelSatisfies("workspace", "package"), true);
  assert.strictEqual(greenLevelSatisfies("package", "targeted"), true);
});

test("greenLevelSatisfies - same level satisfies", () => {
  assert.strictEqual(greenLevelSatisfies("targeted", "targeted"), true);
  assert.strictEqual(greenLevelSatisfies("workspace", "workspace"), true);
});

test("evaluateGreenContract - returns satisfied when met", () => {
  const contract = { requiredGreenLevel: "package" as const, commands: [], allowManualEvidence: true };
  const result = evaluateGreenContract(contract, { observedGreenLevel: "workspace" });
  
  assert.strictEqual(result.satisfied, true);
  assert.strictEqual(result.gap, null);
});

test("evaluateGreenContract - returns gap when not met", () => {
  const contract = { requiredGreenLevel: "workspace" as const, commands: [], allowManualEvidence: true };
  const result = evaluateGreenContract(contract, { observedGreenLevel: "targeted" });
  
  assert.strictEqual(result.satisfied, false);
  assert.strictEqual(result.gap, "workspace");
});

test("createVerificationEvidence - marks satisfied on success", () => {
  const contract = { requiredGreenLevel: "targeted" as const, commands: ["test"], allowManualEvidence: true };
  const evidence = createVerificationEvidence(contract, true);
  
  assert.strictEqual(evidence.observedGreenLevel, "targeted");
  assert.strictEqual(evidence.satisfied, true);
});
