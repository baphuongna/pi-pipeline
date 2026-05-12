import type { AmbiguitySignal } from "../types.ts";

/** Count backtick-quoted or path-like file references in a message. */
export function mentionsFiles(message: string): number {
	// backtick-quoted paths: `src/foo.ts`
	const backtickMatches = message.match(/`[^`]+`/g);
	// path-like references (excluding those already inside backticks): src/foo.ts, ./bar.ts
	const stripped = message.replace(/`[^`]+`/g, "");
	const pathMatches = stripped.match(/(?:\.\/|\/)?(?:src|test|lib|dist|packages)\/\S+/g);
	return (backtickMatches?.length ?? 0) + (pathMatches?.length ?? 0);
}

/** Heuristic: does the message look like a coding task (vs a question)? */
export function looksLikeCodingTask(message: string): boolean {
	return /(?:fix|implement|add|create|remove|delete|update|change|refactor|build|write|set up|configure|install|migrate|port|optimize)\b/i.test(message);
}

/**
 * Detect ambiguity signals in a user message.
 * Implements 6 heuristics from SPEC §4.1.
 */
export function detectAmbiguity(message: string): AmbiguitySignal[] {
	const signals: AmbiguitySignal[] = [];

	// 1. Vague action verbs
	if (/improve|optimize|fix|enhance|refactor|clean up|better/i.test(message)) {
		signals.push({ type: "vague_action", score: 0.5 });
	}

	// 2. No specific files mentioned
	if (mentionsFiles(message) === 0 && looksLikeCodingTask(message)) {
		signals.push({ type: "no_files", score: 0.3 });
	}

	// 3. Architecture change implied
	if (/rewrite|migrate|replace|restructure|redesign/i.test(message)) {
		signals.push({ type: "architecture_change", score: 0.7 });
	}

	// 4. Security-sensitive
	if (/auth|password|token|secret|encrypt|permission|admin/i.test(message)) {
		signals.push({ type: "security_sensitive", score: 0.6 });
	}

	// 5. Multiple interpretations possible (short messages with vague pronouns)
	if (/\bit\b|\bthat\b|\bthis\b|\bthe issue\b|\bthe problem\b/i.test(message) && message.split(" ").length < 20) {
		signals.push({ type: "ambiguous_reference", score: 0.4 });
	}

	// 6. Scope unclear
	if (/\ball\b|\beverything\b|\bcompletely\b|\bentire\b/i.test(message)) {
		signals.push({ type: "unclear_scope", score: 0.4 });
	}

	return signals;
}
