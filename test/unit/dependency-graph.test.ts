import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { topologicalSort, validateDependencies } from "../../src/plan/dependency-graph.ts";
import type { PlanTask } from "../../src/types.ts";

describe("topologicalSort", () => {
	test("sorts independent tasks in order", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "A", description: "d", files: [], depends_on: [], complexity: "standard" },
			{ id: "02", title: "B", description: "d", files: [], depends_on: [], complexity: "standard" },
		];
		const sorted = topologicalSort(tasks);
		assert.equal(sorted.length, 2);
	});

	test("respects dependency ordering", () => {
		const tasks: PlanTask[] = [
			{ id: "02", title: "B", description: "d", files: [], depends_on: ["01"], complexity: "standard" },
			{ id: "01", title: "A", description: "d", files: [], depends_on: [], complexity: "standard" },
		];
		const sorted = topologicalSort(tasks);
		assert.equal(sorted[0].id, "01");
		assert.equal(sorted[1].id, "02");
	});

	test("handles transitive dependencies", () => {
		const tasks: PlanTask[] = [
			{ id: "03", title: "C", description: "d", files: [], depends_on: ["02"], complexity: "standard" },
			{ id: "02", title: "B", description: "d", files: [], depends_on: ["01"], complexity: "standard" },
			{ id: "01", title: "A", description: "d", files: [], depends_on: [], complexity: "standard" },
		];
		const sorted = topologicalSort(tasks);
		assert.equal(sorted[0].id, "01");
		assert.equal(sorted[1].id, "02");
		assert.equal(sorted[2].id, "03");
	});

	test("throws on circular dependency", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "A", description: "d", files: [], depends_on: ["02"], complexity: "standard" },
			{ id: "02", title: "B", description: "d", files: [], depends_on: ["01"], complexity: "standard" },
		];
		assert.throws(() => topologicalSort(tasks), /Circular dependency/);
	});

	test("throws on unknown dependency", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "A", description: "d", files: [], depends_on: ["99"], complexity: "standard" },
		];
		assert.throws(() => topologicalSort(tasks), /Unknown task dependency: 99/);
	});
});

describe("validateDependencies", () => {
	test("returns empty for valid dependencies", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "A", description: "d", files: [], depends_on: [], complexity: "standard" },
			{ id: "02", title: "B", description: "d", files: [], depends_on: ["01"], complexity: "standard" },
		];
		assert.deepEqual(validateDependencies(tasks), []);
	});

	test("returns errors for missing dependencies", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "A", description: "d", files: [], depends_on: ["99"], complexity: "standard" },
		];
		const errors = validateDependencies(tasks);
		assert.equal(errors.length, 1);
		assert.ok(errors[0].includes("unknown task: 99"));
	});
});
