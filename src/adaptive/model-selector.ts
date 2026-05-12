import type { ComplexityLevel, PipelinePhase } from "../types.ts";

/**
 * Select a model based on the current pipeline phase and task complexity.
 * Returns a model hint string or undefined for the default model.
 */
export function selectModel(
	complexity: ComplexityLevel,
	phase: PipelinePhase,
): string | undefined {
	// Verification and review always get the strongest model
	if (phase === "verification" || phase === "review") return "strongest";

	// Architecture and planning always get the strongest model
	if (phase === "architecture" || phase === "planning") return "strongest";

	// Simple tasks get the fast-cheap model
	if (complexity === "simple") return "fast-cheap";

	// Medium tasks use the default model
	if (complexity === "medium") return undefined;

	// Complex tasks get the strongest model
	if (complexity === "complex") return "strongest";

	return undefined;
}
