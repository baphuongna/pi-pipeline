import type { ReviewStage, ReviewChecklistItem } from "../types.ts";

export const SPEC_COMPLIANCE_CHECKLIST: ReviewChecklistItem[] = [
	{ label: "All requirements in the spec are implemented", status: "UNCLEAR", evidence: "" },
	{ label: "No extra features added that weren't in the spec", status: "UNCLEAR", evidence: "" },
	{ label: "Acceptance criteria are met", status: "UNCLEAR", evidence: "" },
	{ label: "Edge cases from the spec are handled", status: "UNCLEAR", evidence: "" },
	{ label: "Scope is respected (no scope creep)", status: "UNCLEAR", evidence: "" },
];

export const CODE_QUALITY_CHECKLIST: ReviewChecklistItem[] = [
	{ label: "Code follows project conventions", status: "UNCLEAR", evidence: "" },
	{ label: "Error handling is robust", status: "UNCLEAR", evidence: "" },
	{ label: "No security issues", status: "UNCLEAR", evidence: "" },
	{ label: "Naming is clear and consistent", status: "UNCLEAR", evidence: "" },
	{ label: "Code is testable", status: "UNCLEAR", evidence: "" },
	{ label: "No unnecessary complexity", status: "UNCLEAR", evidence: "" },
	{ label: "Tests are adequate", status: "UNCLEAR", evidence: "" },
];

/**
 * Create the Stage 1 review: spec compliance.
 */
export function createSpecComplianceReview(
	overrides?: Partial<ReviewChecklistItem>[],
): ReviewStage {
	const items = overrides
		? SPEC_COMPLIANCE_CHECKLIST.map((item, i) =>
				overrides[i] ? { ...item, ...overrides[i] } : item,
			)
		: [...SPEC_COMPLIANCE_CHECKLIST];

	return {
		stage: "spec_compliance",
		passed: items.every((i) => i.status !== "FAIL"),
		findings: items,
	};
}

/**
 * Create the Stage 2 review: code quality.
 */
export function createCodeQualityReview(
	overrides?: Partial<ReviewChecklistItem>[],
): ReviewStage {
	const items = overrides
		? CODE_QUALITY_CHECKLIST.map((item, i) =>
				overrides[i] ? { ...item, ...overrides[i] } : item,
			)
		: [...CODE_QUALITY_CHECKLIST];

	return {
		stage: "code_quality",
		passed: items.every((i) => i.status !== "FAIL"),
		findings: items,
	};
}

/**
 * Enforce two-stage ordering: Stage 2 cannot start until Stage 1 passes.
 */
export function enforceStageOrdering(
	stage1: ReviewStage,
): { canProceed: boolean; message: string } {
	if (stage1.passed) {
		return { canProceed: true, message: "Stage 1 passed, proceeding to Stage 2" };
	}

	const failures = stage1.findings
		.filter((f) => f.status === "FAIL")
		.map((f) => f.label);

	return {
		canProceed: false,
		message: `Stage 1 (spec compliance) must pass first. Failures: ${failures.join(", ")}`,
	};
}

/**
 * Format a review stage for display.
 */
export function formatStageReview(stage: ReviewStage): string {
	const title = stage.stage === "spec_compliance" ? "Stage 1: Spec Compliance" : "Stage 2: Code Quality";
	const lines: string[] = [title, ""];

	for (const item of stage.findings) {
		const badge = item.status === "PASS" ? "✅" : item.status === "FAIL" ? "❌" : "❓";
		lines.push(`${badge} ${item.label}`);
		if (item.evidence) lines.push(`   Evidence: ${item.evidence}`);
	}

	lines.push("");
	lines.push(stage.passed ? "STAGE PASSED" : "STAGE FAILED");

	return lines.join("\n");
}
