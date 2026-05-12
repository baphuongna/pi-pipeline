import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { checkEvidenceCompleteness } from "../../src/verify/evidence.ts";
import type { TaskContext } from "../../src/types.ts";

describe("checkEvidenceCompleteness", () => {
	test("passes for complete evidence", () => {
		const ctx: TaskContext = {
			testCommand: "npm test",
			hasLsp: false,
			changedFiles: ["src/main.ts"],
			assistantOutput: "I ran npm test and all tests pass. No errors remaining.",
			cwd: "/tmp",
		};
		const result = checkEvidenceCompleteness(ctx);
		assert.equal(result.passed, true);
		assert.equal(result.missing.length, 0);
	});

	test("fails when no verification command identified", () => {
		const ctx: TaskContext = {
			testCommand: undefined,
			hasLsp: false,
			changedFiles: ["src/main.ts"],
			assistantOutput: "I implemented the feature",
			cwd: "/tmp",
		};
		const result = checkEvidenceCompleteness(ctx);
		assert.equal(result.passed, false);
		assert.ok(result.missing.some((m) => m.includes("verification command")));
	});

	test("passes when no changes made", () => {
		const ctx: TaskContext = {
			testCommand: undefined,
			hasLsp: false,
			changedFiles: [],
			assistantOutput: "Nothing to change",
			cwd: "/tmp",
		};
		const result = checkEvidenceCompleteness(ctx);
		assert.equal(result.passed, true);
	});
});
