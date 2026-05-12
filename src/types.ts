// ─── Ambiguity & Clarification ────────────────────────────────────────────────

export interface AmbiguitySignal {
	type: string;
	score: number; // 0–1
}

export interface Question {
	id: string;
	text: string;
	type: "single_choice" | "multi_choice" | "text" | "confirm";
	options?: string[];
	required: boolean;
}

export interface Questionnaire {
	questions: Question[];
}

// ─── Plan Mode ────────────────────────────────────────────────────────────────

export type PlanModeState =
	| "IDLE"
	| "GATHERING"
	| "SPEC'ING"
	| "PLANNING"
	| "READY"
	| "EXECUTING"
	| "REVIEWING"
	| "COMPLETE";

export type TaskComplexity = "mechanical" | "standard" | "architecture";

export interface PlanTask {
	id: string;
	title: string;
	description: string;
	files: string[];
	testCommand?: string;
	depends_on: string[];
	complexity: TaskComplexity;
	model?: string;
}

export interface Plan {
	title: string;
	spec: string;
	tasks: PlanTask[];
	issues: string[];
	createdAt: string;
	state: PlanModeState;
}

export interface Milestone {
	id: string;
	title: string;
	taskIds: string[];
	completed: boolean;
}

// ─── Verification ─────────────────────────────────────────────────────────────

export interface TaskContext {
	testCommand?: string;
	hasLsp: boolean;
	changedFiles: string[];
	assistantOutput: string;
	cwd: string;
}

export interface VerificationGate {
	id: string;
	name: string;
	description: string;
	blocking: boolean;
}

export interface GateResult {
	gateId: string;
	passed: boolean;
	evidence: string;
	message: string;
}

// ─── Complexity & Adaptive ────────────────────────────────────────────────────

export interface ComplexitySignals {
	fileCount: number;
	isNewFeature: boolean;
	touchesArchitecture: boolean;
	hasDependencies: boolean;
	securitySensitive: boolean;
	estimatedLines: number;
	hasTestsNeeded: boolean;
}

export type ComplexityLevel = "simple" | "medium" | "complex";

export type PipelinePhase =
	| "clarification"
	| "planning"
	| "architecture"
	| "implementing"
	| "verification"
	| "review";

// ─── Review ───────────────────────────────────────────────────────────────────

export interface ReviewChecklistItem {
	label: string;
	status: "PASS" | "FAIL" | "UNCLEAR";
	evidence: string;
}

export interface ReviewStage {
	stage: "spec_compliance" | "code_quality";
	passed: boolean;
	findings: ReviewChecklistItem[];
}

export interface ReviewIteration {
	stage: "spec_compliance" | "code_quality";
	iteration: number;
	findings: ReviewChecklistItem[];
	passed: boolean;
}

export interface PerspectiveDefinition {
	name: string;
	label: string;
	description: string;
	checklist: string[];
}

// ─── Pipeline State ───────────────────────────────────────────────────────────

export interface PipelineState {
	mode: PlanModeState;
	plan: Plan | null;
	complexity: ComplexityLevel;
	ambiguityScore: number;
	socraticPhase: number;
	reviewIterations: ReviewIteration[];
	currentTaskIndex: number;
}

export function emptyPipelineState(): PipelineState {
	return {
		mode: "IDLE",
		plan: null,
		complexity: "simple",
		ambiguityScore: 0,
		socraticPhase: 0,
		reviewIterations: [],
		currentTaskIndex: 0,
	};
}
