import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { createTask, decomposeIntoTasks, resetCounter, nextTaskId } from "../../src/plan/task-decomposer.ts";

describe("nextTaskId", () => {
	test("generates sequential IDs", () => {
		resetCounter();
		assert.equal(nextTaskId(), "01");
		assert.equal(nextTaskId(), "02");
		assert.equal(nextTaskId(), "03");
	});
});

describe("createTask", () => {
	test("creates a task with defaults", () => {
		resetCounter();
		const task = createTask("Test Task", "Do something", ["file.ts"]);
		assert.equal(task.id, "01");
		assert.equal(task.title, "Test Task");
		assert.deepEqual(task.files, ["file.ts"]);
		assert.equal(task.complexity, "standard");
		assert.deepEqual(task.depends_on, []);
		assert.equal(task.testCommand, undefined);
	});

	test("creates a task with options", () => {
		resetCounter();
		const task = createTask("Test", "desc", ["f.ts"], {
			testCommand: "npm test",
			depends_on: ["01"],
			complexity: "architecture",
			model: "strongest",
		});
		assert.equal(task.testCommand, "npm test");
		assert.equal(task.complexity, "architecture");
		assert.equal(task.model, "strongest");
	});
});

describe("decomposeIntoTasks", () => {
	test("creates tasks from requirements", () => {
		const tasks = decomposeIntoTasks(
			["Add login", "Add session"],
			{
				"Add login": ["src/auth.ts"],
				"Add session": ["src/session.ts"],
			},
		);
		assert.equal(tasks.length, 2);
		assert.ok(tasks[0].id);
		assert.ok(tasks[0].title);
	});

	test("infers complexity from file count", () => {
		const tasks = decomposeIntoTasks(
			["Big task"],
			{
				"Big task": ["a.ts", "b.ts", "c.ts", "d.ts", "e.ts"],
			},
		);
		assert.equal(tasks[0].complexity, "architecture");
	});
});
