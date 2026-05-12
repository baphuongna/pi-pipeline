import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { validatePlan, hasPlaceholders } from "../../src/plan/plan-validator.ts";
import type { PlanTask } from "../../src/types.ts";

describe("validatePlan", () => {
	test("passes for valid tasks", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "A", description: "Implement login form with validation", files: ["src/login.ts"], testCommand: "npm test", depends_on: [], complexity: "standard" },
		];
		const errors = validatePlan(tasks);
		assert.equal(errors.length, 0);
	});

	test("detects TBD placeholders", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "A", description: "TBD: implement something", files: ["f.ts"], testCommand: "npm test", depends_on: [], complexity: "standard" },
		];
		const errors = validatePlan(tasks);
		assert.ok(errors.some((e) => e.includes("Placeholder detected")));
	});

	test("detects TODO placeholders", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "A", description: "TODO: implement this later", files: ["f.ts"], testCommand: "npm test", depends_on: [], complexity: "standard" },
		];
		const errors = validatePlan(tasks);
		assert.ok(errors.some((e) => e.includes("Placeholder detected")));
	});

	test("detects missing files", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "A", description: "Do something", files: [], testCommand: "npm test", depends_on: [], complexity: "standard" },
		];
		const errors = validatePlan(tasks);
		assert.ok(errors.some((e) => e.includes("No files specified")));
	});

	test("detects missing test command", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "A", description: "Do something", files: ["f.ts"], depends_on: [], complexity: "standard" },
		];
		const errors = validatePlan(tasks);
		assert.ok(errors.some((e) => e.includes("No test/verification command")));
	});

	test("detects multiple issues in one task", () => {
		const tasks: PlanTask[] = [
			{ id: "01", title: "A", description: "TBD", files: [], depends_on: [], complexity: "standard" },
		];
		const errors = validatePlan(tasks);
		assert.ok(errors.length >= 3);
	});
});

describe("hasPlaceholders", () => {
	test("detects TBD", () => assert.equal(hasPlaceholders("TBD"), true));
	test("detects FIXME", () => assert.equal(hasPlaceholders("FIXME: fix later"), true));
	test("detects 'add later'", () => assert.equal(hasPlaceholders("add tests later"), true));
	test("detects 'etc.'", () => assert.equal(hasPlaceholders("etc."), true));
	test("passes for real content", () => assert.equal(hasPlaceholders("Implement login form with validation"), false));
});
