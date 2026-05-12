import type { PipelineState } from "../types.ts";
import type { PipelineExtensionConfig } from "../config.ts";
import { detectAmbiguity } from "../clarify/ambiguity.ts";
import { totalAmbiguityScore } from "../clarify/scoring.ts";
import { generateQuestionnaire, formatQuestionnaire } from "../clarify/questionnaire.ts";
import { generateSocraticQuestions, SOCRATIC_PHASES } from "../clarify/socratic.ts";

export interface ClarifyCommandResult {
	message: string;
	state: PipelineState;
}

/**
 * Handle /clarify: force clarification of the given message.
 */
export function handleClarify(
	message: string,
	state: PipelineState,
	config: PipelineExtensionConfig,
): ClarifyCommandResult {
	const signals = detectAmbiguity(message);
	const score = totalAmbiguityScore(signals);

	const newState: PipelineState = { ...state, ambiguityScore: score };

	// If complex, use Socratic interview
	if (state.complexity === "complex" && config.clarification.socraticForComplex) {
		const questions = generateSocraticQuestions(message, "complex", state.socraticPhase);
		const phase = SOCRATIC_PHASES[state.socraticPhase];

		const parts: string[] = [
			`**${phase.name}** (Phase ${state.socraticPhase + 1}/${SOCRATIC_PHASES.length})`,
			"",
			...questions,
		];

		return {
			message: parts.join("\n"),
			state: {
				...newState,
				socraticPhase: state.socraticPhase, // stay until user answers
			},
		};
	}

	// Default: structured questionnaire
	if (signals.length > 0) {
		const questionnaire = generateQuestionnaire(message, signals);
		const formatted = formatQuestionnaire(questionnaire);
		return {
			message: `Ambiguity detected (score: ${score.toFixed(2)}):\n\n${formatted}`,
			state: newState,
		};
	}

	return {
		message: `No ambiguity detected (score: ${score.toFixed(2)}). Ready to proceed.`,
		state: newState,
	};
}
