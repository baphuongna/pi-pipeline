export interface SocraticPhase {
	name: string;
	prompt: string;
	questions: string[];
}

export const SOCRATIC_PHASES: SocraticPhase[] = [
	{
		name: "Scope Discovery",
		prompt: "What's the end goal? What should be different when this is done?",
		questions: [
			"What is the specific outcome you expect?",
			"What should be different after this change?",
			"Who are the users or consumers of this change?",
		],
	},
	{
		name: "Constraint Exploration",
		prompt: "Any constraints I should know about? Performance? Compatibility? Timeline?",
		questions: [
			"Are there performance requirements?",
			"Any backward compatibility constraints?",
			"What is the timeline or deadline?",
		],
	},
	{
		name: "Edge Case Discovery",
		prompt: "What happens at the boundaries? How should the system handle failures?",
		questions: [
			"What edge cases need to be handled?",
			"How should the system behave on error?",
			"Are there any known failure modes to prevent?",
		],
	},
	{
		name: "Acceptance Criteria",
		prompt: "How will you know this is done? What does 'done' look like?",
		questions: [
			"What are the acceptance criteria?",
			"How will you verify the change works correctly?",
			"What tests should pass?",
		],
	},
	{
		name: "Priority Clarification",
		prompt: "If tradeoffs are needed, what matters most?",
		questions: [
			"Speed or correctness — which matters more?",
			"Should I prioritize minimal changes or thorough coverage?",
			"Is there anything that is explicitly out of scope?",
		],
	},
];

/**
 * Generate Socratic questions for a given phase and complexity level.
 * For complex tasks, returns all questions for the current phase.
 * For simpler tasks, returns only the prompt.
 */
export function generateSocraticQuestions(message: string, complexity: string, phaseIndex: number): string[] {
	if (phaseIndex < 0 || phaseIndex >= SOCRATIC_PHASES.length) return [];
	const phase = SOCRATIC_PHASES[phaseIndex];
	if (complexity === "complex") {
		return [phase.prompt, ...phase.questions];
	}
	return [phase.prompt];
}

/**
 * Determine the next Socratic phase.
 * Advances if ambiguity score is low enough; stays on current phase otherwise.
 */
export function nextPhase(current: number, ambiguityScore: number): number {
	if (current >= SOCRATIC_PHASES.length - 1) return current;
	if (ambiguityScore < 0.3) return current + 1;
	return current;
}
