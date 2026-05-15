import * as fs from "node:fs";
import * as path from "node:path";

export interface ClarificationConfig {
	enabled: boolean;
	ambiguityThreshold: number;
	mode: "auto" | "manual";
	maxQuestions: number;
	socraticForComplex: boolean;
}

export interface PlanConfig {
	enabled: boolean;
	noPlaceholders: boolean;
	showInChunks: boolean;
	maxTasksPerPlan: number;
	deepeningEnabled: boolean;
}

export interface VerificationConfig {
	enabled: boolean;
	gates: string[];
	blockingGates: string[];
	stopTheLine: boolean;
	freshContextVerification: boolean;
	antiRationalization: boolean;
	maxReviewIterations: number;
	tddGate: boolean;
}

export interface ReviewConfig {
	enabled: boolean;
	twoStage: boolean;
	perspectives: string[];
}

export interface AdaptiveConfig {
	enabled: boolean;
	simplePipeline: string[];
	mediumPipeline: string[];
	complexPipeline: string[];
}

export interface PipelineExtensionConfig {
	enabled: boolean;
	clarification: ClarificationConfig;
	plan: PlanConfig;
	verification: VerificationConfig;
	review: ReviewConfig;
	adaptive: AdaptiveConfig;
}

const DEFAULT_CONFIG: PipelineExtensionConfig = {
	enabled: true,
	clarification: {
		enabled: true,
		ambiguityThreshold: 0.5,
		mode: "auto",
		maxQuestions: 5,
		socraticForComplex: true,
	},
	plan: {
		enabled: true,
		noPlaceholders: true,
		showInChunks: true,
		maxTasksPerPlan: 20,
		deepeningEnabled: true,
	},
	verification: {
		enabled: true,
		gates: ["tests", "typecheck", "lint", "regression", "evidence"],
		blockingGates: ["tests", "typecheck", "regression", "evidence"],
		stopTheLine: true,
		freshContextVerification: true,
		antiRationalization: true,
		maxReviewIterations: 3,
		tddGate: false,
	},
	review: {
		enabled: true,
		twoStage: true,
		perspectives: ["security", "performance", "maintainability"],
	},
	adaptive: {
		enabled: true,
		simplePipeline: ["clarify-quick", "edit", "verify"],
		mediumPipeline: ["clarify", "plan-light", "implement", "verify", "review"],
		complexPipeline: ["interview", "spec", "plan", "implement-subagent", "fresh-verify", "two-stage-review"],
	},
};

/** Recursively merge `override` into `base`, handling nested objects.
 * Does not mutate either argument.
 */
function deepMerge(base: Record<string, unknown>, override: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = { ...base };
	for (const key of Object.keys(override)) {
		const bv = base[key];
		const ov = override[key];
		if (
			bv !== undefined && ov !== undefined &&
			typeof bv === "object" && !Array.isArray(bv) &&
			typeof ov === "object" && !Array.isArray(ov)
		) {
			result[key] = deepMerge(bv as Record<string, unknown>, ov as Record<string, unknown>);
		} else {
			result[key] = ov;
		}
	}
	return result;
}

export { DEFAULT_CONFIG, deepMerge };

export function loadConfig(cwd: string): { config: PipelineExtensionConfig; source: "file" | "defaults" } {
	const configPath = path.join(cwd, ".pi", "pi-pipeline.json");

	if (!fs.existsSync(configPath)) {
		return { config: structuredClone(DEFAULT_CONFIG), source: "defaults" };
	}

	try {
		const raw = fs.readFileSync(configPath, "utf-8");
		const parsed = JSON.parse(raw);

		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			return { config: structuredClone(DEFAULT_CONFIG), source: "defaults" };
		}

		const config = deepMerge(
			structuredClone(DEFAULT_CONFIG) as unknown as Record<string, unknown>,
			parsed as Record<string, unknown>,
		) as unknown as PipelineExtensionConfig;

		return { config, source: "file" };
	} catch {
		return { config: structuredClone(DEFAULT_CONFIG), source: "defaults" };
	}
}
