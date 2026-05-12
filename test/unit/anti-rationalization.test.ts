import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { ANTI_RATIONALIZATION, matchAntiRationalization } from "../../src/verify/anti-rationalization.ts";

describe("ANTI_RATIONALIZATION", () => {
	test("has exactly 12 entries", () => {
		assert.equal(ANTI_RATIONALIZATION.length, 12);
	});

	test("each entry has excuse and reality", () => {
		for (const entry of ANTI_RATIONALIZATION) {
			assert.ok(entry.excuse.length > 0, "excuse must not be empty");
			assert.ok(entry.reality.length > 0, "reality must not be empty");
		}
	});
});

describe("matchAntiRationalization", () => {
	test("matches 'flaky test' excuse", () => {
		const result = matchAntiRationalization("The test is flaky so I skipped it");
		assert.ok(result);
		assert.equal(result!.excuse, "The test is flaky");
	});

	test("matches 'minor issue' excuse", () => {
		const result = matchAntiRationalization("this is just a minor issue, we can ignore it");
		assert.ok(result);
		assert.equal(result!.excuse, "This is just a minor issue");
	});

	test("matches 'add tests later' excuse", () => {
		const result = matchAntiRationalization("I'll add tests later when I have time");
		assert.ok(result);
		assert.equal(result!.excuse, "I'll add tests later");
	});

	test("matches 'works on my machine' excuse", () => {
		const result = matchAntiRationalization("It works on my machine so it should be fine");
		assert.ok(result);
		assert.equal(result!.excuse, "It works on my machine");
	});

	test("matches 'simple change' excuse", () => {
		const result = matchAntiRationalization("This is a simple change, no need for tests");
		assert.ok(result);
	});

	test("matches 'prototype' excuse", () => {
		const result = matchAntiRationalization("It's just a prototype, we'll test later");
		assert.ok(result);
	});

	test("returns undefined for clean text", () => {
		const result = matchAntiRationalization("All tests pass and I have verified the output");
		assert.equal(result, undefined);
	});

	test("is case-insensitive", () => {
		const result = matchAntiRationalization("THE TEST IS FLAKY");
		assert.ok(result);
	});
});
