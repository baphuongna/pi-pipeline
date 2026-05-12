import type { PipelineState } from "../types.ts";
import type { PipelineExtensionConfig } from "../config.ts";
import { transition } from "../plan/plan-mode.ts";
import { selectPipeline, describePipeline } from "../adaptive/pipeline-selector.ts";

export interface GoCommandResult {
	message: string;
	state: PipelineState;
}

/**
 * Handle /go: start execution based on current pipeline state.
 */
export function handleGo(
	state: PipelineState,
	config: PipelineExtensionConfig,
): GoCommandResult {
	// If in IDLE with no plan, suggest /plan first
	if (state.mode === "IDLE") {
		return {
			message: "No plan in progress. Use /plan <task> to start planning first.",
			state,
		};
	}

	// If in READY state, start execution
	if (state.mode === "READY") {
		try {
			const newState = transition(state, "EXECUTING");
			const pipeline = selectPipeline(state.complexity, config);
			return {
				message: `Starting execution!\n${describePipeline(pipeline)}\n\nPlan: "${state.plan?.title ?? "unnamed"}"\nTasks: ${state.plan?.tasks.length ?? 0}`,
				state: newState,
			};
		} catch (err) {
			return {
				message: `Cannot start execution: ${(err as Error).message}`,
				state,
			};
		}
	}

	// If already executing
	if (state.mode === "EXECUTING") {
		return {
			message: `Already executing plan: "${state.plan?.title ?? "unnamed"}" (${state.currentTaskIndex}/${state.plan?.tasks.length ?? 0} tasks done)`,
			state,
		};
	}

	// In other states, suggest the appropriate action
	const suggestions: Record<string, string> = {
		"GATHERING": "Still gathering requirements. Answer clarification questions or describe the task in more detail.",
		"SPEC'ING": "Spec is being generated. Review and approve it.",
		"PLANNING": "Plan is being generated. Review and approve it.",
		"REVIEWING": "Review in progress. Check review results.",
		"COMPLETE": "Pipeline is complete. Use /plan to start a new one.",
	};

	return {
		message: suggestions[state.mode] ?? `Current state: ${state.mode}. Use /plan status for details.`,
		state,
	};
}
