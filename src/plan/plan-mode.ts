import type { PlanModeState, Plan, PlanTask, PipelineState } from "../types.ts";

/** Valid state transitions for the plan mode state machine. */
const TRANSITIONS: Record<PlanModeState, PlanModeState[]> = {
	"IDLE": ["GATHERING"],
	"GATHERING": ["SPEC'ING", "IDLE"],
	"SPEC'ING": ["PLANNING", "GATHERING"],
	"PLANNING": ["READY", "SPEC'ING"],
	"READY": ["EXECUTING", "PLANNING"],
	"EXECUTING": ["REVIEWING", "READY"],
	"REVIEWING": ["COMPLETE", "EXECUTING"],
	"COMPLETE": ["IDLE"],
};

/**
 * Check if a transition from `from` to `to` is valid.
 */
export function canTransition(from: PlanModeState, to: PlanModeState): boolean {
	return TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Attempt a state transition. Returns the new state on success, or throws.
 */
export function transition(state: PipelineState, to: PlanModeState): PipelineState {
	if (!canTransition(state.mode, to)) {
		throw new Error(`Invalid state transition: ${state.mode} → ${to}`);
	}
	return { ...state, mode: to };
}

/**
 * Create a new plan with empty tasks in the GATHERING state.
 */
export function createPlan(title: string): Plan {
	return {
		title,
		spec: "",
		tasks: [],
		issues: [],
		createdAt: new Date().toISOString(),
		state: "GATHERING",
	};
}

/**
 * Get the ordered tasks from a plan (sorted by dependency).
 */
export function orderedTasks(plan: Plan): PlanTask[] {
	return [...plan.tasks].sort((a, b) => {
		// If a depends on b, a comes after
		if (a.depends_on.includes(b.id)) return 1;
		// If b depends on a, b comes after
		if (b.depends_on.includes(a.id)) return -1;
		return 0;
	});
}

/**
 * Get the status string for the current plan state.
 */
export function planStatus(state: PipelineState): string {
	const lines: string[] = [];
	lines.push(`State: ${state.mode}`);
	if (state.plan) {
		lines.push(`Plan: ${state.plan.title}`);
		lines.push(`Tasks: ${state.plan.tasks.length}`);
		const completed = state.currentTaskIndex;
		lines.push(`Progress: ${completed}/${state.plan.tasks.length}`);
		if (state.plan.issues.length > 0) {
			lines.push(`Issues: ${state.plan.issues.join(", ")}`);
		}
	}
	lines.push(`Complexity: ${state.complexity}`);
	lines.push(`Ambiguity: ${state.ambiguityScore.toFixed(2)}`);
	return lines.join("\n");
}
