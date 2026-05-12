import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { selectModel } from "../../src/adaptive/model-selector.ts";

describe("selectModel", () => {
	test("returns strongest for verification phase", () => {
		assert.equal(selectModel("simple", "verification"), "strongest");
		assert.equal(selectModel("medium", "verification"), "strongest");
		assert.equal(selectModel("complex", "verification"), "strongest");
	});

	test("returns strongest for review phase", () => {
		assert.equal(selectModel("simple", "review"), "strongest");
	});

	test("returns strongest for architecture phase", () => {
		assert.equal(selectModel("simple", "architecture"), "strongest");
	});

	test("returns strongest for planning phase", () => {
		assert.equal(selectModel("simple", "planning"), "strongest");
	});

	test("returns fast-cheap for simple implementing", () => {
		assert.equal(selectModel("simple", "implementing"), "fast-cheap");
	});

	test("returns undefined for medium implementing", () => {
		assert.equal(selectModel("medium", "implementing"), undefined);
	});

	test("returns strongest for complex implementing", () => {
		assert.equal(selectModel("complex", "implementing"), "strongest");
	});

	test("returns undefined for medium clarification", () => {
		assert.equal(selectModel("medium", "clarification"), undefined);
	});
});
