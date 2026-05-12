import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	GATE_DEFINITIONS,
	checkTestsGate,
	checkTypecheckGate,
	checkLintGate,
	checkRegressionGate,
	checkEvidenceGate,
	checkTddGate,
	runGates,
	getGateDefinition,
} from "../../src/verify/gates.ts";
import type { TaskContext } from "../../src/types.ts";

const baseCtx: TaskContext = {
	testCommand: "npm test",
	hasLsp: false,
	changedFiles: ["src/main.ts", "test/main.test.ts"],
	assistantOutput: "I ran npm test and all tests pass. No issues remaining.",
	cwd: "/tmp/test",
};

describe("GATE_DEFINITIONS", () => {
	test("has 6 gates", () => {
		assert.equal(GATE_DEFINITIONS.length, 6);
	});

	test("has expected gate IDs", () => {
		const ids = GATE_DEFINITIONS.map((g) => g.id);
		assert.ok(ids.includes("tests"));
		assert.ok(ids.includes("typecheck"));
		assert.ok(ids.includes("lint"));
		assert.ok(ids.includes("regression"));
		assert.ok(ids.includes("evidence"));
		assert.ok(ids.includes("tdd"));
	});
});

describe("checkTestsGate", () => {
	test("skips when no test command", () => {
		const result = checkTestsGate({ ...baseCtx, testCommand: undefined });
		assert.equal(result.passed, true);
		assert.ok(result.message.includes("Skipped"));
	});

	test("returns result structure", () => {
		// Gate now actually runs — result depends on npm availability
		const result = checkTestsGate(baseCtx);
		assert.ok(typeof result.passed === "boolean");
		assert.equal(result.gateId, "tests");
		assert.ok(typeof result.evidence === "string");
		assert.ok(typeof result.message === "string");
	});
});

describe("checkTypecheckGate", () => {
	test("returns result structure", () => {
		// Gate now actually runs tsc — result depends on TypeScript availability
		const result = checkTypecheckGate(baseCtx);
		assert.ok(typeof result.passed === "boolean");
		assert.equal(result.gateId, "typecheck");
		assert.ok(typeof result.evidence === "string");
		assert.ok(typeof result.message === "string");
	});
});

describe("checkLintGate", () => {
	test("passes when files changed", () => {
		const result = checkLintGate(baseCtx);
		assert.equal(result.passed, true);
	});

	test("skips when no changed files", () => {
		const result = checkLintGate({ ...baseCtx, changedFiles: [] });
		assert.equal(result.passed, true);
		assert.ok(result.message.includes("Skipped"));
	});
});

describe("checkRegressionGate", () => {
	test("skips when no test command", () => {
		const result = checkRegressionGate({ ...baseCtx, testCommand: undefined });
		assert.equal(result.passed, true);
		assert.ok(result.message.includes("Skipped"));
	});

	test("returns result structure", () => {
		const result = checkRegressionGate(baseCtx);
		assert.ok(typeof result.passed === "boolean");
		assert.equal(result.gateId, "regression");
	});
});

describe("checkEvidenceGate", () => {
	test("passes when evidence is complete", () => {
		const result = checkEvidenceGate(baseCtx);
		assert.equal(result.passed, true);
		assert.ok(result.message.includes("All evidence"));
	});

	test("fails when output contains error not fixed", () => {
		const result = checkEvidenceGate({
			...baseCtx,
			assistantOutput: "I ran npm test but there is still an error",
		});
		assert.equal(result.passed, false);
		assert.ok(result.message.includes("Missing"));
	});
});

describe("checkTddGate", () => {
	test("passes when test files exist", () => {
		const result = checkTddGate(baseCtx);
		assert.equal(result.passed, true);
	});

	test("skips when no production files", () => {
		const result = checkTddGate({ ...baseCtx, changedFiles: ["test/a.test.ts"] });
		assert.equal(result.passed, true);
		assert.ok(result.message.includes("Skipped"));
	});

	test("fails when production files lack tests", () => {
		const result = checkTddGate({ ...baseCtx, changedFiles: ["src/a.ts"] });
		assert.equal(result.passed, false);
		assert.ok(result.message.includes("No test files"));
	});
});

describe("runGates", () => {
	test("runs specified gates in order", () => {
		const results = runGates(baseCtx, ["tests", "lint"]);
		assert.equal(results.length, 2);
		assert.equal(results[0]!.gateId, "tests");
		assert.equal(results[1]!.gateId, "lint");
	});

	test("skips unknown gate IDs", () => {
		const results = runGates(baseCtx, ["nonexistent"]);
		assert.equal(results.length, 0);
	});
});

describe("getGateDefinition", () => {
	test("returns gate by id", () => {
		const def = getGateDefinition("tests");
		assert.ok(def);
		assert.equal(def.id, "tests");
		assert.equal(def.blocking, true);
	});

	test("returns undefined for unknown id", () => {
		const def = getGateDefinition("nonexistent-gate");
		assert.equal(def, undefined);
	});
});