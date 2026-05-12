import type { GateResult } from "../types.ts";

export interface StopTheLineResult {
	blocked: boolean;
	failedGates: string[];
}

/**
 * Check if stop-the-line should be triggered.
 * If any blocking gate failed, block all subsequent work.
 */
export function checkStopTheLine(
	results: GateResult[],
	blockingGateIds: string[],
): StopTheLineResult {
	const blockingSet = new Set(blockingGateIds);
	const failedGates = results
		.filter((r) => !r.passed && blockingSet.has(r.gateId))
		.map((r) => r.gateId);

	return {
		blocked: failedGates.length > 0,
		failedGates,
	};
}

/**
 * Format a stop-the-line message.
 */
export function formatStopTheLine(result: StopTheLineResult): string {
	if (!result.blocked) return "";
	return `STOP: Verification gate(s) failed: ${result.failedGates.join(", ")}.\nAll work is blocked until these gates pass.`;
}
