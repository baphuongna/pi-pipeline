import type { PipelineState, TaskContext, GateResult } from "../types.ts";
import type { PipelineExtensionConfig } from "../config.ts";
import { runGates, GATE_CHECKS } from "../verify/gates.ts";
import { checkEvidenceCompleteness } from "../verify/evidence.ts";
import { checkStopTheLine, formatStopTheLine } from "../verify/stop-the-line.ts";
import { matchAntiRationalization } from "../verify/anti-rationalization.ts";

export interface VerifyCommandResult {
	message: string;
	state: PipelineState;
	results?: GateResult[];
}

/**
 * Handle /verify: run verification gates.
 */
export function handleVerify(
	state: PipelineState,
	ctx: TaskContext,
	config: PipelineExtensionConfig,
): VerifyCommandResult {
	if (!config.verification.enabled) {
		return { message: "Verification gates are disabled.", state };
	}

	const gateIds = [...config.verification.gates];
	if (config.verification.tddGate && !gateIds.includes("tdd")) {
		gateIds.push("tdd");
	}

	const results = runGates(ctx, gateIds);

	// Check stop-the-line
	if (config.verification.stopTheLine) {
		const stopResult = checkStopTheLine(results, config.verification.blockingGates);
		if (stopResult.blocked) {
			return {
				message: formatStopTheLine(stopResult) +
					"\n\nGate results:\n" +
					results.map((r) => `  ${r.passed ? "✅" : "❌"} ${r.gateId}: ${r.message}`).join("\n"),
				state,
				results,
			};
		}
	}

	const passed = results.every((r) => r.passed);
	const summary = results.map((r) => `  ${r.passed ? "✅" : "❌"} ${r.gateId}: ${r.message}`).join("\n");

	return {
		message: passed ? `All gates passed!\n${summary}` : `Some gates failed:\n${summary}`,
		state,
		results,
	};
}

/**
 * Handle /verify evidence: show evidence checklist.
 */
export function handleVerifyEvidence(
	state: PipelineState,
	ctx: TaskContext,
): VerifyCommandResult {
	const evidence = checkEvidenceCompleteness(ctx);

	// Check for anti-rationalization in output
	const antiRat = matchAntiRationalization(ctx.assistantOutput);

	const parts: string[] = [];
	parts.push("Evidence Checklist:");
	if (evidence.missing.length === 0) {
		parts.push("  ✅ All evidence provided");
	} else {
		for (const item of evidence.missing) {
			parts.push(`  ❌ ${item}`);
		}
	}

	if (antiRat) {
		parts.push("");
		parts.push(`⚠️ Anti-rationalization detected:`);
		parts.push(`  Excuse: "${antiRat.excuse}"`);
		parts.push(`  Reality: "${antiRat.reality}"`);
	}

	return {
		message: parts.join("\n"),
		state,
	};
}
