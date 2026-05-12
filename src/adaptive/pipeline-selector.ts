import type { ComplexityLevel } from "../types.ts";
import type { PipelineExtensionConfig } from "../config.ts";

export interface PipelineDefinition {
	level: ComplexityLevel;
	steps: string[];
}

/**
 * Select the appropriate pipeline based on complexity level.
 */
export function selectPipeline(
	complexity: ComplexityLevel,
	config: PipelineExtensionConfig,
): PipelineDefinition {
	switch (complexity) {
		case "simple":
			return { level: "simple", steps: [...config.adaptive.simplePipeline] };
		case "medium":
			return { level: "medium", steps: [...config.adaptive.mediumPipeline] };
		case "complex":
			return { level: "complex", steps: [...config.adaptive.complexPipeline] };
	}
}

/**
 * Get a human-readable description of the pipeline.
 */
export function describePipeline(pipeline: PipelineDefinition): string {
	return `Pipeline (${pipeline.level}): ${pipeline.steps.join(" → ")}`;
}

/**
 * Check if a step exists in the pipeline.
 */
export function hasStep(pipeline: PipelineDefinition, step: string): boolean {
	return pipeline.steps.includes(step);
}
