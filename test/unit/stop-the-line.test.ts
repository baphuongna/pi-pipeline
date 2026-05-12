import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { checkStopTheLine, formatStopTheLine } from "../../src/verify/stop-the-line.ts";
import type { GateResult } from "../../src/types.ts";

describe("checkStopTheLine", () => {
	test("is not blocked when all blocking gates pass", () => {
		const results: GateResult[] = [
			{ gateId: "tests", passed: true, evidence: "", message: "" },
			{ gateId: "typecheck", passed: true, evidence: "", message: "" },
		];
		const result = checkStopTheLine(results, ["tests", "typecheck"]);
		assert.equal(result.blocked, false);
		assert.equal(result.failedGates.length, 0);
	});

	test("is blocked when a blocking gate fails", () => {
		const results: GateResult[] = [
			{ gateId: "tests", passed: false, evidence: "", message: "Tests failed" },
			{ gateId: "lint", passed: false, evidence: "", message: "Lint errors" },
		];
		const result = checkStopTheLine(results, ["tests"]);
		assert.equal(result.blocked, true);
		assert.deepEqual(result.failedGates, ["tests"]);
	});

	test("is not blocked when only non-blocking gate fails", () => {
		const results: GateResult[] = [
			{ gateId: "tests", passed: true, evidence: "", message: "" },
			{ gateId: "lint", passed: false, evidence: "", message: "Lint errors" },
		];
		const result = checkStopTheLine(results, ["tests"]);
		assert.equal(result.blocked, false);
	});

	test("reports all failed blocking gates", () => {
		const results: GateResult[] = [
			{ gateId: "tests", passed: false, evidence: "", message: "" },
			{ gateId: "typecheck", passed: false, evidence: "", message: "" },
			{ gateId: "lint", passed: true, evidence: "", message: "" },
		];
		const result = checkStopTheLine(results, ["tests", "typecheck", "lint"]);
		assert.equal(result.blocked, true);
		assert.equal(result.failedGates.length, 2);
	});
});

describe("formatStopTheLine", () => {
	test("returns empty when not blocked", () => {
		assert.equal(formatStopTheLine({ blocked: false, failedGates: [] }), "");
	});

	test("formats message when blocked", () => {
		const msg = formatStopTheLine({ blocked: true, failedGates: ["tests"] });
		assert.ok(msg.includes("STOP"));
		assert.ok(msg.includes("tests"));
	});
});
