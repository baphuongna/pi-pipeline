import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { executeReviewLoop, isLoopExhausted, reviewLoopSummary } from "../../src/review/review-loop.ts";
import type { ReviewChecklistItem } from "../../src/types.ts";

describe("executeReviewLoop", () => {
	test("returns single passed iteration", () => {
		const passFindings: ReviewChecklistItem[] = [
			{ label: "test", status: "PASS", evidence: "ok" },
		];
		const iterations = executeReviewLoop("spec_compliance", () => passFindings, { maxIterations: 3 });
		assert.equal(iterations.length, 1);
		assert.equal(iterations[0].passed, true);
	});

	test("retries up to max iterations on failure", () => {
		let callCount = 0;
		const failFindings: ReviewChecklistItem[] = [
			{ label: "test", status: "FAIL", evidence: "broken" },
		];
		const iterations = executeReviewLoop(
			"spec_compliance",
			() => {
				callCount++;
				return failFindings;
			},
			{ maxIterations: 3 },
		);
		assert.equal(iterations.length, 3);
		assert.equal(callCount, 3);
	});

	test("stops when iteration passes", () => {
		let callCount = 0;
		const iterations = executeReviewLoop(
			"code_quality",
			() => {
				callCount++;
				if (callCount < 3) {
					return [{ label: "test", status: "FAIL", evidence: "" }];
				}
				return [{ label: "test", status: "PASS", evidence: "fixed" }];
			},
			{ maxIterations: 5 },
		);
		assert.equal(iterations.length, 3);
		assert.equal(iterations[2].passed, true);
	});
});

describe("isLoopExhausted", () => {
	test("returns false for empty iterations", () => {
		assert.equal(isLoopExhausted([]), false);
	});

	test("returns false if last iteration passed", () => {
		assert.equal(
			isLoopExhausted([{ stage: "spec_compliance", iteration: 1, findings: [], passed: true }]),
			false,
		);
	});

	test("returns true if last iteration failed", () => {
		assert.equal(
			isLoopExhausted([{ stage: "spec_compliance", iteration: 1, findings: [], passed: false }]),
			true,
		);
	});
});

describe("reviewLoopSummary", () => {
	test("handles empty iterations", () => {
		assert.equal(reviewLoopSummary([]), "No review iterations");
	});

	test("formats iteration summary", () => {
		const summary = reviewLoopSummary([
			{ stage: "spec_compliance", iteration: 1, findings: [{ label: "t", status: "FAIL", evidence: "" }], passed: false },
			{ stage: "spec_compliance", iteration: 2, findings: [], passed: true },
		]);
		assert.ok(summary.includes("FAILED"));
		assert.ok(summary.includes("PASSED"));
	});
});
