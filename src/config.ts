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

export { DEFAULT_CONFIG };

export function loadConfig(cwd: string): { config: PipelineExtensionConfig; source: "file" | "defaults" } {
	const configPath = path.join(cwd, ".pi", "pi-pipeline.json");

	if (!fs.existsSync(configPath)) {
		return { config: structuredClone(DEFAULT_CONFIG), source: "defaults" };
	}

	try {
		const raw = fs.readFileSync(configPath, "utf-8");
		const parsed: unknown = JSON.parse(raw);

		if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
			return { config: structuredClone(DEFAULT_CONFIG), source: "defaults" };
		}

		const user = parsed as Record<string, unknown>;
		const config = structuredClone(DEFAULT_CONFIG);

		if (typeof user.enabled === "boolean") config.enabled = user.enabled;

		// Merge clarification
		if (typeof user.clarification === "object" && user.clarification !== null && !Array.isArray(user.clarification)) {
			const c = user.clarification as Record<string, unknown>;
			if (typeof c.enabled === "boolean") config.clarification.enabled = c.enabled;
			if (typeof c.ambiguityThreshold === "number") config.clarification.ambiguityThreshold = c.ambiguityThreshold;
			if (c.mode === "auto" || c.mode === "manual") config.clarification.mode = c.mode;
			if (typeof c.maxQuestions === "number") config.clarification.maxQuestions = c.maxQuestions;
			if (typeof c.socraticForComplex === "boolean") config.clarification.socraticForComplex = c.socraticForComplex;
		}

		// Merge plan
		if (typeof user.plan === "object" && user.plan !== null && !Array.isArray(user.plan)) {
			const p = user.plan as Record<string, unknown>;
			if (typeof p.enabled === "boolean") config.plan.enabled = p.enabled;
			if (typeof p.noPlaceholders === "boolean") config.plan.noPlaceholders = p.noPlaceholders;
			if (typeof p.showInChunks === "boolean") config.plan.showInChunks = p.showInChunks;
			if (typeof p.maxTasksPerPlan === "number") config.plan.maxTasksPerPlan = p.maxTasksPerPlan;
			if (typeof p.deepeningEnabled === "boolean") config.plan.deepeningEnabled = p.deepeningEnabled;
		}

		// Merge verification
		if (typeof user.verification === "object" && user.verification !== null && !Array.isArray(user.verification)) {
			const v = user.verification as Record<string, unknown>;
			if (typeof v.enabled === "boolean") config.verification.enabled = v.enabled;
			if (Array.isArray(v.gates)) config.verification.gates = v.gates as string[];
			if (Array.isArray(v.blockingGates)) config.verification.blockingGates = v.blockingGates as string[];
			if (typeof v.stopTheLine === "boolean") config.verification.stopTheLine = v.stopTheLine;
			if (typeof v.freshContextVerification === "boolean") config.verification.freshContextVerification = v.freshContextVerification;
			if (typeof v.antiRationalization === "boolean") config.verification.antiRationalization = v.antiRationalization;
			if (typeof v.maxReviewIterations === "number") config.verification.maxReviewIterations = v.maxReviewIterations;
			if (typeof v.tddGate === "boolean") config.verification.tddGate = v.tddGate;
		}

		// Merge review
		if (typeof user.review === "object" && user.review !== null && !Array.isArray(user.review)) {
			const r = user.review as Record<string, unknown>;
			if (typeof r.enabled === "boolean") config.review.enabled = r.enabled;
			if (typeof r.twoStage === "boolean") config.review.twoStage = r.twoStage;
			if (Array.isArray(r.perspectives)) config.review.perspectives = r.perspectives as string[];
		}

		// Merge adaptive
		if (typeof user.adaptive === "object" && user.adaptive !== null && !Array.isArray(user.adaptive)) {
			const a = user.adaptive as Record<string, unknown>;
			if (typeof a.enabled === "boolean") config.adaptive.enabled = a.enabled;
			if (Array.isArray(a.simplePipeline)) config.adaptive.simplePipeline = a.simplePipeline as string[];
			if (Array.isArray(a.mediumPipeline)) config.adaptive.mediumPipeline = a.mediumPipeline as string[];
			if (Array.isArray(a.complexPipeline)) config.adaptive.complexPipeline = a.complexPipeline as string[];
		}

		return { config, source: "file" };
	} catch {
		return { config: structuredClone(DEFAULT_CONFIG), source: "defaults" };
	}
}
