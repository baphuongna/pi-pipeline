import assert from "node:assert/strict";
import test, { describe } from "node:test";
import {
	SPEC_COMPLIANCE_CHECKLIST,
	CODE_QUALITY_CHECKLIST,
	createSpecComplianceReview,
	createCodeQualityReview,
	enforceStageOrdering,
	formatStageReview,
} from "../../src/review/two-stage.ts";

describe("SPEC_COMPLIANCE_CHECKLIST", () => {
	test("has 5 items", () => {
		assert.equal(SPEC_COMPLIANCE_CHECKLIST.length, 5);
	});
});

describe("CODE_QUALITY_CHECKLIST", () => {
	test("has 7 items", () => {
		assert.equal(CODE_QUALITY_CHECKLIST.length, 7);
	});
});

describe("createSpecComplianceReview", () => {
	test("creates review with default checklist", () => {
		const stage = createSpecComplianceReview();
		assert.equal(stage.stage, "spec_compliance");
		assert.equal(stage.findings.length, 5);
		assert.equal(stage.passed, true); // all UNCLEAR → no FAILs → passes
	});

	test("creates review with overrides", () => {
		const stage = createSpecComplianceReview([
			{ status: "PASS", evidence: "verified" },
		]);
		assert.equal(stage.findings[0].status, "PASS");
		assert.equal(stage.findings[0].evidence, "verified");
	});
});

describe("createCodeQualityReview", () => {
	test("creates review with default checklist", () => {
		const stage = createCodeQualityReview();
		assert.equal(stage.stage, "code_quality");
		assert.equal(stage.findings.length, 7);
	});
});

describe("enforceStageOrdering", () => {
	test("allows proceeding when stage 1 passes", () => {
		const stage1 = createSpecComplianceReview([
			{ status: "PASS", evidence: "" },
			{ status: "PASS", evidence: "" },
			{ status: "PASS", evidence: "" },
			{ status: "PASS", evidence: "" },
			{ status: "PASS", evidence: "" },
		]);
		assert.equal(stage1.passed, true);
		const result = enforceStageOrdering(stage1);
		assert.equal(result.canProceed, true);
	});

	test("blocks when stage 1 has failures", () => {
		const stage1 = createSpecComplianceReview([
			{ status: "PASS", evidence: "" },
			{ status: "FAIL", evidence: "missing" },
		]);
		const result = enforceStageOrdering(stage1);
		assert.equal(result.canProceed, false);
		assert.ok(result.message.includes("must pass first"));
	});
});

describe("formatStageReview", () => {
	test("formats stage review", () => {
		const stage = createSpecComplianceReview([
			{ status: "PASS", evidence: "verified" },
		]);
		const formatted = formatStageReview(stage);
		assert.ok(formatted.includes("Stage 1"));
		assert.ok(formatted.includes("✅"));
	});
});
