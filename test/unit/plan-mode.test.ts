import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { canTransition, transition, createPlan, orderedTasks, planStatus } from "../../src/plan/plan-mode.ts";
import type { PipelineState, PlanTask } from "../../src/types.ts";
import { emptyPipelineState } from "../../src/types.ts";

describe("canTransition", () => {
	test("IDLE → GATHERING is valid", () => {
		assert.equal(canTransition("IDLE", "GATHERING"), true);
	});

	test("IDLE → EXECUTING is invalid", () => {
		assert.equal(canTransition("IDLE", "EXECUTING"), false);
	});

	test("GATHERING → SPEC'ING is valid", () => {
		assert.equal(canTransition("GATHERING", "SPEC'ING"), true);
	});

	test("COMPLETE → IDLE is valid", () => {
		assert.equal(canTransition("COMPLETE", "IDLE"), true);
	});

	test("full happy path transitions", () => {
		assert.equal(canTransition("IDLE", "GATHERING"), true);
		assert.equal(canTransition("GATHERING", "SPEC'ING"), true);
		assert.equal(canTransition("SPEC'ING", "PLANNING"), true);
		assert.equal(canTransition("PLANNING", "READY"), true);
		assert.equal(canTransition("READY", "EXECUTING"), true);
		assert.equal(canTransition("EXECUTING", "REVIEWING"), true);
		assert.equal(canTransition("REVIEWING", "COMPLETE"), true);
	});
});

describe("transition", () => {
	test("transitions state correctly", () => {
		const state = emptyPipelineState();
		const next = transition(state, "GATHERING");
		assert.equal(next.mode, "GATHERING");
	});

	test("throws on invalid transition", () => {
		const state = emptyPipelineState();
		assert.throws(() => transition(state, "EXECUTING"), /Invalid state transition/);
	});
});

describe("createPlan", () => {
	test("creates a plan with empty tasks", () => {
		const plan = createPlan("Test Plan");
		assert.equal(plan.title, "Test Plan");
		assert.equal(plan.tasks.length, 0);
		assert.equal(plan.state, "GATHERING");
		assert.ok(plan.createdAt.length > 0);
	});
});

describe("orderedTasks", () => {
	test("orders tasks by dependency", () => {
		const plan = {
			title: "Test",
			spec: "",
			tasks: [
				{ id: "02", title: "B", description: "d", files: ["f"], depends_on: ["01"], complexity: "standard" as const },
				{ id: "01", title: "A", description: "d", files: ["f"], depends_on: [], complexity: "standard" as const },
			],
			issues: [],
			createdAt: "",
			state: "PLANNING" as const,
		};
		const ordered = orderedTasks(plan);
		assert.equal(ordered[0].id, "01");
		assert.equal(ordered[1].id, "02");
	});
});

describe("planStatus", () => {
	test("shows IDLE status", () => {
		const state = emptyPipelineState();
		const status = planStatus(state);
		assert.ok(status.includes("IDLE"));
	});

	test("shows plan info when plan exists", () => {
		const state: PipelineState = {
			...emptyPipelineState(),
			mode: "READY",
			plan: createPlan("Test Plan"),
		};
		state.plan!.tasks = [
			{ id: "01", title: "T1", description: "d", files: ["f"], depends_on: [], complexity: "standard" },
		];
		const status = planStatus(state);
		assert.ok(status.includes("Test Plan"));
		assert.ok(status.includes("Tasks: 1"));
	});
});
