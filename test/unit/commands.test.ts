import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { handlePlan, handlePlanDeepen, handlePlanGo, handlePlanStatus } from "../../src/commands/plan.ts";
import { handlePlanReview } from "../../src/commands/review.ts";
import { handleVerify, handleVerifyEvidence } from "../../src/commands/verify.ts";
import { handleClarify } from "../../src/commands/clarify.ts";
import { handleGo } from "../../src/commands/go.ts";
import { DEFAULT_CONFIG } from "../../src/config.ts";
import { emptyPipelineState } from "../../src/types.ts";
import type { PipelineState, TaskContext } from "../../src/types.ts";

const makeState = (overrides: Partial<PipelineState> = {}): PipelineState => ({
	...emptyPipelineState(),
	...overrides,
});

describe("handlePlan", () => {
	test("asks for task when none given", () => {
		const result = handlePlan("", makeState(), DEFAULT_CONFIG);
		assert.ok(result.message.includes("What would you like to plan"));
		assert.equal(result.state.mode, "GATHERING");
	});

	test("detects ambiguity and generates questions", () => {
		const result = handlePlan("improve the auth", makeState(), DEFAULT_CONFIG);
		assert.ok(result.message.includes("clarify"));
		assert.equal(result.state.mode, "GATHERING");
		assert.ok(result.state.ambiguityScore > 0);
	});

	test("proceeds to SPEC'ING when no ambiguity", () => {
		const result = handlePlan("change the greeting in `src/hello.ts` from 'hi' to 'hello'", makeState(), DEFAULT_CONFIG);
		assert.ok(result.state.ambiguityScore <= 0.5);
	});
});

describe("handlePlanDeepen", () => {
	test("returns error when no plan", () => {
		const result = handlePlanDeepen(makeState(), (t) => t);
		assert.ok(result.message.includes("No plan to deepen"));
	});
});

describe("handlePlanGo", () => {
	test("returns error when no plan", () => {
		const result = handlePlanGo(makeState());
		assert.ok(result.message.includes("No plan"));
	});

	test("returns error when not in READY state", () => {
		const plan = { title: "Test", spec: "", tasks: [], issues: [], createdAt: "", state: "PLANNING" as const };
		const result = handlePlanGo(makeState({ mode: "PLANNING", plan }));
		assert.ok(result.message.includes("READY"));
	});
});

describe("handlePlanStatus", () => {
	test("shows IDLE status", () => {
		const result = handlePlanStatus(makeState());
		assert.ok(result.message.includes("IDLE"));
	});
});

describe("handlePlanReview", () => {
	test("returns error when no plan", () => {
		const stage1 = { stage: "spec_compliance" as const, passed: true, findings: [] };
		const result = handlePlanReview(makeState(), stage1);
		assert.ok(result.message.includes("No plan"));
	});
});

describe("handleVerify", () => {
	test("returns disabled message when verification disabled", () => {
		const config = { ...DEFAULT_CONFIG, verification: { ...DEFAULT_CONFIG.verification, enabled: false } };
		const ctx: TaskContext = { changedFiles: [], assistantOutput: "", hasLsp: false, cwd: "/tmp" };
		const result = handleVerify(makeState(), ctx, config);
		assert.ok(result.message.includes("disabled"));
	});

	test("runs gates when enabled", () => {
		const ctx: TaskContext = {
			testCommand: "npm test",
			changedFiles: ["src/main.ts", "test/main.test.ts"],
			assistantOutput: "ran npm test, all tests pass",
			hasLsp: false,
			cwd: "/tmp",
		};
		const result = handleVerify(makeState(), ctx, DEFAULT_CONFIG);
		assert.ok(result.results);
		assert.ok(result.results!.length > 0);
	});
});

describe("handleVerifyEvidence", () => {
	test("checks evidence completeness", () => {
		const ctx: TaskContext = {
			changedFiles: ["src/main.ts"],
			assistantOutput: "I ran npm test and all tests pass",
			hasLsp: false,
			cwd: "/tmp",
		};
		const result = handleVerifyEvidence(makeState(), ctx);
		assert.ok(result.message.includes("Evidence Checklist"));
	});
});

describe("handleClarify", () => {
	test("detects ambiguity in message", () => {
		const result = handleClarify("improve the code", makeState(), DEFAULT_CONFIG);
		assert.ok(result.message.includes("Ambiguity"));
		assert.ok(result.state.ambiguityScore > 0);
	});

	test("returns no ambiguity for clear message", () => {
		const result = handleClarify("change `src/hello.ts` line 5 to use 'world'", makeState(), DEFAULT_CONFIG);
		assert.ok(result.message.includes("No ambiguity"));
	});
});

describe("handleGo", () => {
	test("returns message when IDLE", () => {
		const result = handleGo(makeState(), DEFAULT_CONFIG);
		assert.ok(result.message.includes("No plan"));
	});

	test("returns already executing when EXECUTING", () => {
		const plan = { title: "Test", spec: "", tasks: [{ id: "01", title: "T", description: "d", files: ["f.ts"], depends_on: [], complexity: "standard" as const }], issues: [], createdAt: "", state: "EXECUTING" as const };
		const result = handleGo(makeState({ mode: "EXECUTING", plan }), DEFAULT_CONFIG);
		assert.ok(result.message.includes("Already executing"));
	});
});
