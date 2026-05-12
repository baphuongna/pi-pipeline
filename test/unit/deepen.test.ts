import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { deepenPlan } from "../../src/plan/deepen.ts";
import type { Plan, PlanTask } from "../../src/types.ts";

describe("deepenPlan", () => {
	test("refines architecture tasks", () => {
		const plan: Plan = {
			title: "Test",
			spec: "",
			tasks: [
				{ id: "01", title: "Simple", description: "Do simple thing", files: ["f.ts"], testCommand: "npm test", depends_on: [], complexity: "mechanical" },
				{ id: "02", title: "Complex", description: "TBD: build something", files: ["a.ts", "b.ts"], depends_on: [], complexity: "architecture" },
			],
			issues: [],
			createdAt: "",
			state: "READY",
		};

		const analyzer = (task: PlanTask): PlanTask => {
			if (task.complexity === "architecture") {
				return { ...task, description: "Build auth system with JWT tokens", testCommand: "npm test" };
			}
			return task;
		};

		const deepened = deepenPlan(plan, analyzer);
		assert.equal(deepened.tasks[0].description, "Do simple thing"); // unchanged
		assert.equal(deepened.tasks[1].description, "Build auth system with JWT tokens"); // refined
		assert.equal(deepened.state, "PLANNING");
	});

	test("reports issues after deepening", () => {
		const plan: Plan = {
			title: "Test",
			spec: "",
			tasks: [
				{ id: "01", title: "A", description: "TBD", files: ["f.ts"], depends_on: [], complexity: "architecture" },
			],
			issues: [],
			createdAt: "",
			state: "READY",
		};

		const analyzer = (task: PlanTask): PlanTask => task; // identity — leaves TBD
		const deepened = deepenPlan(plan, analyzer);
		assert.ok(deepened.issues.length > 0);
	});
});
