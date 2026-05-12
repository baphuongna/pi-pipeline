import type { ComplexitySignals, ComplexityLevel } from "../types.ts";

/**
 * Detect task complexity from a set of signals.
 * Returns "simple", "medium", or "complex" based on the SPEC §8.1 algorithm.
 */
export function detectComplexity(signals: ComplexitySignals): ComplexityLevel {
	let score = 0;

	if (signals.fileCount > 5) score += 3;
	else if (signals.fileCount > 2) score += 1;

	if (signals.isNewFeature) score += 2;
	if (signals.touchesArchitecture) score += 3;
	if (signals.hasDependencies) score += 2;
	if (signals.securitySensitive) score += 1;
	if (signals.estimatedLines > 200) score += 2;
	if (signals.hasTestsNeeded) score += 1;

	if (score <= 2) return "simple";
	if (score <= 5) return "medium";
	return "complex";
}

/**
 * Create a complexity signals object from heuristics.
 */
export function createSignals(opts: Partial<ComplexitySignals>): ComplexitySignals {
	return {
		fileCount: opts.fileCount ?? 0,
		isNewFeature: opts.isNewFeature ?? false,
		touchesArchitecture: opts.touchesArchitecture ?? false,
		hasDependencies: opts.hasDependencies ?? false,
		securitySensitive: opts.securitySensitive ?? false,
		estimatedLines: opts.estimatedLines ?? 0,
		hasTestsNeeded: opts.hasTestsNeeded ?? false,
	};
}
