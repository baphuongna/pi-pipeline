import type { PipelineState, Plan, PlanTask } from "../types.ts";
import type { PipelineExtensionConfig } from "../config.ts";
import { detectAmbiguity } from "../clarify/ambiguity.ts";
import { totalAmbiguityScore } from "../clarify/scoring.ts";
import { generateQuestionnaire, formatQuestionnaire } from "../clarify/questionnaire.ts";
import { generateSocraticQuestions, SOCRATIC_PHASES } from "../clarify/socratic.ts";
import { validatePlan } from "../plan/plan-validator.ts";
import { deepenPlan } from "../plan/deepen.ts";
import { planStatus, transition, createPlan } from "../plan/plan-mode.ts";

export interface PlanCommandResult {
	message: string;
	state: PipelineState;
	plan?: Plan;
}

/**
 * Handle /plan command: enter plan mode and start gathering requirements.
 */
export function handlePlan(
	args: string,
	state: PipelineState,
	config: PipelineExtensionConfig,
): PlanCommandResult {
	const task = args.trim();

	if (!task) {
		return {
			message: "What would you like to plan? Please describe the task or feature.",
			state: { ...state, mode: "GATHERING" },
		};
	}

	// Detect ambiguity
	const signals = detectAmbiguity(task);
	const score = totalAmbiguityScore(signals);
	const newState: PipelineState = {
		...state,
		mode: "GATHERING",
		ambiguityScore: score,
		plan: createPlan(task),
	};

	if (score > config.clarification.ambiguityThreshold && config.clarification.enabled) {
		const questionnaire = generateQuestionnaire(task, signals);
		const formatted = formatQuestionnaire(questionnaire);
		return {
			message: `I'd like to clarify before starting:\n\n${formatted}`,
			state: newState,
			plan: newState.plan ?? undefined,
		};
	}

	return {
		message: `Planning: "${task}"\n\nAmbiguity score: ${score.toFixed(2)} — no clarification needed. Generating spec...`,
		state: { ...newState, mode: "SPEC'ING" },
		plan: newState.plan ?? undefined,
	};
}

/**
 * Handle /plan deepen: deepen the current plan.
 */
export function handlePlanDeepen(
	state: PipelineState,
	analyzer: (task: PlanTask) => PlanTask,
): PlanCommandResult {
	if (!state.plan) {
		return {
			message: "No plan to deepen. Use /plan first.",
			state,
		};
	}

	const deepened = deepenPlan(state.plan, analyzer);
	const newState: PipelineState = { ...state, plan: deepened };

	if (deepened.issues.length > 0) {
		return {
			message: `Plan deepened with issues:\n${deepened.issues.map((i) => `- ${i}`).join("\n")}`,
			state: newState,
			plan: deepened,
		};
	}

	return {
		message: `Plan deepened successfully. ${deepened.tasks.length} tasks ready.`,
		state: newState,
		plan: deepened,
	};
}

/**
 * Handle /plan go: start execution of the approved plan.
 */
export function handlePlanGo(state: PipelineState): PlanCommandResult {
	if (!state.plan) {
		return { message: "No plan to execute. Use /plan first.", state };
	}

	if (state.mode !== "READY") {
		return {
			message: `Cannot start execution from state ${state.mode}. Plan must be in READY state.`,
			state,
		};
	}

	const errors = validatePlan(state.plan.tasks);
	if (errors.length > 0) {
		return {
			message: `Plan has validation errors:\n${errors.map((e) => `- ${e}`).join("\n")}\n\nFix these before executing.`,
			state,
		};
	}

	try {
		const newState = transition(state, "EXECUTING");
		return {
			message: `Executing plan: "${state.plan.title}"\n${state.plan.tasks.length} tasks to run.`,
			state: newState,
		};
	} catch (err) {
		return {
			message: `Cannot transition to EXECUTING: ${(err as Error).message}`,
			state,
		};
	}
}

/**
 * Handle /plan status: show current plan status.
 */
export function handlePlanStatus(state: PipelineState): PlanCommandResult {
	return {
		message: planStatus(state),
		state,
	};
}
