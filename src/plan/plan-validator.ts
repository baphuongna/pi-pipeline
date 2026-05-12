import type { PlanTask } from "../types.ts";

const PLACEHOLDER_PATTERNS = [
	/\bTBD\b/i,
	/\btodo\b/i,
	/\bFIXME\b/i,
	/\badd.*later\b/i,
	/\bimplement.*later\b/i,
	/\betc\./i,
	/\band so on\b/i,
	/\bsimilar to\b/i,
	/\bsame as before\b/i,
];

/**
 * Validate a list of plan tasks for placeholder content.
 * Returns an array of error messages for each violation.
 */
export function validatePlan(tasks: PlanTask[]): string[] {
	const errors: string[] = [];

	for (const task of tasks) {
		for (const pattern of PLACEHOLDER_PATTERNS) {
			if (pattern.test(task.description)) {
				errors.push(`Task ${task.id}: Placeholder detected: "${task.description}"`);
			}
		}
		if (task.files.length === 0) {
			errors.push(`Task ${task.id}: No files specified`);
		}
		if (!task.testCommand) {
			errors.push(`Task ${task.id}: No test/verification command specified`);
		}
	}

	return errors;
}

/**
 * Check if a single task description contains placeholders.
 */
export function hasPlaceholders(description: string): boolean {
	return PLACEHOLDER_PATTERNS.some((p) => p.test(description));
}
