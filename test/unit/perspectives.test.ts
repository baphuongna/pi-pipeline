import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { BUILTIN_PERSPECTIVES, getPerspective, getPerspectives, formatPerspectivePrompt } from "../../src/review/perspectives.ts";

describe("BUILTIN_PERSPECTIVES", () => {
	test("has at least 5 perspectives", () => {
		assert.ok(BUILTIN_PERSPECTIVES.length >= 5);
	});

	test("includes security, performance, maintainability", () => {
		const names = BUILTIN_PERSPECTIVES.map((p) => p.name);
		assert.ok(names.includes("security"));
		assert.ok(names.includes("performance"));
		assert.ok(names.includes("maintainability"));
	});
});

describe("getPerspective", () => {
	test("returns security perspective", () => {
		const p = getPerspective("security");
		assert.ok(p);
		assert.equal(p!.name, "security");
		assert.ok(p!.checklist.length >= 3);
	});

	test("returns undefined for unknown", () => {
		assert.equal(getPerspective("unknown"), undefined);
	});
});

describe("getPerspectives", () => {
	test("returns matching perspectives", () => {
		const ps = getPerspectives(["security", "performance"]);
		assert.equal(ps.length, 2);
	});

	test("skips unknown perspectives", () => {
		const ps = getPerspectives(["security", "nonexistent"]);
		assert.equal(ps.length, 1);
	});
});

describe("formatPerspectivePrompt", () => {
	test("formats perspective as prompt", () => {
		const p = getPerspective("security")!;
		const prompt = formatPerspectivePrompt(p);
		assert.ok(prompt.includes("Security Review"));
		assert.ok(prompt.includes("- [ ]"));
	});
});
