import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { totalAmbiguityScore } from "../../src/clarify/scoring.ts";
import type { AmbiguitySignal } from "../../src/types.ts";

describe("totalAmbiguityScore", () => {
	test("returns 0 for empty signals", () => {
		assert.equal(totalAmbiguityScore([]), 0);
	});

	test("returns the score for a single signal", () => {
		const signals: AmbiguitySignal[] = [{ type: "vague_action", score: 0.5 }];
		assert.equal(totalAmbiguityScore(signals), 0.5);
	});

	test("sums multiple signals", () => {
		const signals: AmbiguitySignal[] = [
			{ type: "vague_action", score: 0.3 },
			{ type: "no_files", score: 0.2 },
		];
		assert.equal(totalAmbiguityScore(signals), 0.5);
	});

	test("caps at 1.0", () => {
		const signals: AmbiguitySignal[] = [
			{ type: "a", score: 0.7 },
			{ type: "b", score: 0.6 },
			{ type: "c", score: 0.5 },
		];
		assert.equal(totalAmbiguityScore(signals), 1.0);
	});
});
