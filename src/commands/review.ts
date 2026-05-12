import type { PipelineState } from "../types.ts";
import type { ReviewStage } from "../types.ts";
import { createSpecComplianceReview, enforceStageOrdering, formatStageReview } from "../review/two-stage.ts";

export interface ReviewCommandResult {
	message: string;
	state: PipelineState;
}

/**
 * Handle /plan review: run two-stage review on the current plan.
 */
export function handlePlanReview(
	state: PipelineState,
	stage1: ReviewStage,
	stage2?: ReviewStage,
): ReviewCommandResult {
	if (!state.plan) {
		return { message: "No plan to review. Use /plan first.", state };
	}

	// Stage 1: Spec compliance
	const stage1Result = stage1;
	const ordering = enforceStageOrdering(stage1Result);

	const parts: string[] = [];
	parts.push(formatStageReview(stage1Result));

	if (!ordering.canProceed) {
		parts.push(`\n${ordering.message}`);
		return { message: parts.join("\n"), state };
	}

	// Stage 2: Code quality (only if stage 1 passed)
	if (stage2) {
		parts.push("");
		parts.push(formatStageReview(stage2));
	} else {
		parts.push("\nStage 1 passed. Ready for Stage 2 (code quality review).");
	}

	return { message: parts.join("\n"), state };
}
