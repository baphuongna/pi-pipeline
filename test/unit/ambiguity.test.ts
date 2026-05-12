import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { detectAmbiguity, mentionsFiles, looksLikeCodingTask } from "../../src/clarify/ambiguity.ts";

describe("mentionsFiles", () => {
	test("detects backtick-quoted files", () => {
		assert.equal(mentionsFiles("fix the bug in `src/foo.ts`"), 1);
	});

	test("detects path-like references", () => {
		assert.equal(mentionsFiles("update src/utils/helper.ts"), 1);
		assert.equal(mentionsFiles("fix test/unit/config.test.ts"), 1);
	});

	test("returns 0 for no files", () => {
		assert.equal(mentionsFiles("fix the bug"), 0);
	});
});

describe("looksLikeCodingTask", () => {
	test("detects fix/implement/add", () => {
		assert.equal(looksLikeCodingTask("fix the login bug"), true);
		assert.equal(looksLikeCodingTask("implement the feature"), true);
		assert.equal(looksLikeCodingTask("add a new field"), true);
	});

	test("returns false for questions", () => {
		assert.equal(looksLikeCodingTask("what is the meaning of life?"), false);
	});
});

describe("detectAmbiguity", () => {
	test("detects vague_action", () => {
		const signals = detectAmbiguity("improve the performance");
		assert.ok(signals.some((s) => s.type === "vague_action"));
		// no_files not triggered: "improve" matches vague_action but not looksLikeCodingTask
	});

	test("detects architecture_change", () => {
		const signals = detectAmbiguity("rewrite the authentication module");
		assert.ok(signals.some((s) => s.type === "architecture_change"));
	});

	test("detects security_sensitive", () => {
		const signals = detectAmbiguity("fix the auth token handling");
		assert.ok(signals.some((s) => s.type === "security_sensitive"));
	});

	test("detects ambiguous_reference in short messages", () => {
		const signals = detectAmbiguity("fix it");
		assert.ok(signals.some((s) => s.type === "ambiguous_reference"));
	});

	test("does not detect ambiguous_reference in long messages", () => {
		const signals = detectAmbiguity("fix it in the login page by updating the validation logic and adding proper error handling for all the edge cases we discussed yesterday");
		assert.ok(!signals.some((s) => s.type === "ambiguous_reference"));
	});

	test("detects unclear_scope", () => {
		const signals = detectAmbiguity("refactor everything");
		assert.ok(signals.some((s) => s.type === "unclear_scope"));
	});

	test("returns empty for clear specific tasks", () => {
		const signals = detectAmbiguity("change the greeting in `src/hello.ts` from 'hi' to 'hello'");
		assert.equal(signals.length, 0);
	});

	test("detects multiple signals", () => {
		const signals = detectAmbiguity("improve the auth system completely");
		assert.ok(signals.length >= 2);
	});
});
