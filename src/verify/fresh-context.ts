import type { Plan } from "../types.ts";

export interface FreshContextConfig {
	inherit: string[];
	exclude: string[];
	freshContext: boolean;
}

/**
 * Build a fresh-context verification config for a verifier subagent.
 * The verifier can see the plan and changed files but NOT the
 * implementation chat, previous reviews, or agent rationale.
 */
export function buildFreshContextConfig(_plan: Plan): FreshContextConfig {
	return {
		inherit: ["plan", "changed_files"],
		exclude: ["implementation_chat", "previous_reviews", "agent_rationale"],
		freshContext: true,
	};
}

/**
 * Validate that a fresh-context config is correct.
 */
export function validateFreshContextConfig(config: FreshContextConfig): string[] {
	const errors: string[] = [];
	if (!config.inherit.includes("plan")) {
		errors.push("Fresh context config must inherit 'plan'");
	}
	if (!config.inherit.includes("changed_files")) {
		errors.push("Fresh context config must inherit 'changed_files'");
	}
	if (!config.exclude.includes("implementation_chat")) {
		errors.push("Fresh context config must exclude 'implementation_chat'");
	}
	if (!config.freshContext) {
		errors.push("Fresh context must be enabled");
	}
	return errors;
}
