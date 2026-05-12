import type { ReviewIteration, ReviewChecklistItem } from "../types.ts";

export interface ReviewLoopConfig {
	maxIterations: number;
}

const DEFAULT_CONFIG: ReviewLoopConfig = {
	maxIterations: 3,
};

/**
 * Run the review loop: implementer → reviewer → fix, up to maxIterations.
 * Returns the iteration history.
 */
export function executeReviewLoop(
	stage: "spec_compliance" | "code_quality",
	reviewer: (iteration: number) => ReviewChecklistItem[],
	config: ReviewLoopConfig = DEFAULT_CONFIG,
): ReviewIteration[] {
	const iterations: ReviewIteration[] = [];

	for (let i = 1; i <= config.maxIterations; i++) {
		const findings = reviewer(i);
		const passed = findings.every((f) => f.status !== "FAIL");

		iterations.push({
			stage,
			iteration: i,
			findings,
			passed,
		});

		if (passed) break;
	}

	return iterations;
}

/**
 * Check if the review loop has been exhausted without passing.
 */
export function isLoopExhausted(iterations: ReviewIteration[]): boolean {
	if (iterations.length === 0) return false;
	const last = iterations[iterations.length - 1];
	return !last.passed;
}

/**
 * Get a summary of review iterations.
 */
export function reviewLoopSummary(iterations: ReviewIteration[]): string {
	if (iterations.length === 0) return "No review iterations";

	const lines: string[] = [];
	for (const iter of iterations) {
		const failures = iter.findings.filter((f) => f.status === "FAIL").length;
		const status = iter.passed ? "PASSED" : `FAILED (${failures} issues)`;
		lines.push(
			`${iter.stage} iteration ${iter.iteration}: ${status}`,
		);
	}

	return lines.join("\n");
}
