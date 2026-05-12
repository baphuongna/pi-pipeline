import type { AmbiguitySignal, Question, Questionnaire } from "../types.ts";

/**
 * Generate a structured questionnaire based on detected ambiguity signals.
 * Each signal type maps to a specific question template.
 */
export function generateQuestionnaire(message: string, signals: AmbiguitySignal[]): Questionnaire {
	const questions: Question[] = [];
	const signalTypes = new Set(signals.map((s) => s.type));

	if (signalTypes.has("vague_action")) {
		questions.push({
			id: "q_vague_action",
			text: `What specifically should be done? The request "${message.slice(0, 80)}" uses vague terms.`,
			type: "single_choice",
			options: [
				"Add new functionality",
				"Fix an existing bug",
				"Improve performance",
				"Refactor for clarity",
				"Something else (please describe)",
			],
			required: true,
		});
	}

	if (signalTypes.has("no_files")) {
		questions.push({
			id: "q_no_files",
			text: "Which files or modules should be changed?",
			type: "text",
			required: true,
		});
	}

	if (signalTypes.has("architecture_change")) {
		questions.push({
			id: "q_architecture",
			text: "This sounds like an architecture change. What is the target architecture?",
			type: "text",
			required: true,
		});
	}

	if (signalTypes.has("security_sensitive")) {
		questions.push({
			id: "q_security",
			text: "Security-sensitive area detected. What security requirements apply?",
			type: "multi_choice",
			options: [
				"Input validation required",
				"Authentication/authorization change",
				"Data encryption at rest or in transit",
				"Audit logging needed",
				"No special security requirements",
			],
			required: true,
		});
	}

	if (signalTypes.has("ambiguous_reference")) {
		questions.push({
			id: "q_ambiguous_ref",
			text: "Could you clarify what you are referring to?",
			type: "text",
			required: true,
		});
	}

	if (signalTypes.has("unclear_scope")) {
		questions.push({
			id: "q_unclear_scope",
			text: "What is the specific scope of this change?",
			type: "single_choice",
			options: [
				"One file or function",
				"One module/feature",
				"Multiple modules",
				"Entire codebase",
				"Let me describe the scope",
			],
			required: true,
		});
	}

	return { questions };
}

/**
 * Format a questionnaire as a human-readable string.
 */
export function formatQuestionnaire(q: Questionnaire): string {
	const parts: string[] = [];
	let idx = 1;
	for (const question of q.questions) {
		let text = `${idx}. ${question.text}`;
		if (question.options && question.options.length > 0) {
			const letterOffset = "a".charCodeAt(0);
			text += "\n" + question.options.map((opt, i) => `   ${String.fromCharCode(letterOffset + i)}) ${opt}`).join("\n");
		}
		parts.push(text);
		idx++;
	}
	return parts.join("\n\n");
}
