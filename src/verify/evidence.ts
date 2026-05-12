import type { TaskContext } from "../types.ts";

export interface EvidenceCheckResult {
	passed: boolean;
	missing: string[];
}

/**
 * Check evidence completeness using the IDENTIFY→RUN→READ→VERIFY pattern.
 */
export function checkEvidenceCompleteness(ctx: TaskContext): EvidenceCheckResult {
	const missing: string[] = [];
	const output = ctx.assistantOutput.toLowerCase();

	// IDENTIFY: Was a verification command identified?
	const hasCommand = ctx.testCommand !== undefined && ctx.testCommand.length > 0;
	if (!hasCommand && ctx.changedFiles.length > 0) {
		missing.push("No verification command identified");
	}

	// RUN: Was a command executed?
	const ranCommand = output.includes("ran") || output.includes("executed") || output.includes("npm test") || output.includes("npx");
	if (ctx.changedFiles.length > 0 && !ranCommand) {
		missing.push("No verification command executed");
	}

	// READ: Was output read/acknowledged?
	const readOutput = output.includes("pass") || output.includes("fail") || output.includes("error") || output.includes("output");
	if (ctx.changedFiles.length > 0 && !readOutput) {
		missing.push("No verification output read");
	}

	// VERIFY: Does output confirm success?
	const verified = output.includes("pass") && !output.includes("fail");
	if (ctx.changedFiles.length > 0 && !verified && ranCommand) {
		missing.push("Verification does not confirm success");
	}

	// Changed files listed?
	if (ctx.changedFiles.length === 0 && looksLikeImplementation(output)) {
		missing.push("No changed files listed");
	}

	return {
		passed: missing.length === 0,
		missing,
	};
}

function looksLikeImplementation(output: string): boolean {
	return /implement|added|created|wrote|modified/i.test(output);
}
