import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { generateSpec, chunkSpec, acceptanceCriteriaFromTasks } from "../../src/plan/spec-generator.ts";
import type { PlanTask } from "../../src/types.ts";

describe("generateSpec", () => {
	test("generates a spec with all sections", () => {
		const plan = generateSpec(
			"Login Feature",
			"Users need to log in",
			["Username/password auth", "Session management"],
			["Login form", "Auth API"],
			["OAuth"],
			["User can log in", "Session persists"],
			"Use JWT tokens",
			["src/auth.ts", "src/login.ts"],
		);
		assert.ok(plan.spec.includes("# Spec: Login Feature"));
		assert.ok(plan.spec.includes("## Context"));
		assert.ok(plan.spec.includes("## Requirements"));
		assert.ok(plan.spec.includes("## Scope"));
		assert.ok(plan.spec.includes("## Acceptance Criteria"));
		assert.ok(plan.spec.includes("## Technical Notes"));
		assert.ok(plan.spec.includes("## Files Likely Affected"));
		assert.equal(plan.state, "SPEC'ING");
	});
});

describe("chunkSpec", () => {
	test("splits spec into chunks by ## headings", () => {
		const plan = generateSpec(
			"Test",
			"ctx",
			["req1"],
			["scope1"],
			[],
			["crit1"],
			"notes",
			["file.ts"],
		);
		const chunks = chunkSpec(plan);
		assert.ok(chunks.length >= 3);
	});
});

describe("acceptanceCriteriaFromTasks", () => {
	test("generates checklist from tasks", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "Task 1", description: "d", files: [], depends_on: [], complexity: "standard" },
			{ id: "02", title: "Task 2", description: "d", files: [], depends_on: [], complexity: "standard" },
		];
		const criteria = acceptanceCriteriaFromTasks(tasks);
		assert.equal(criteria.length, 2);
		assert.equal(criteria[0].label, "Task 01: Task 1");
		assert.equal(criteria[0].status, "UNCLEAR");
	});
});
