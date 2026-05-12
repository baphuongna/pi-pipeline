import type { PerspectiveDefinition } from "../types.ts";

export const BUILTIN_PERSPECTIVES: PerspectiveDefinition[] = [
	{
		name: "security",
		label: "Security",
		description: "Review for security vulnerabilities and trust-boundary issues",
		checklist: [
			"Input validation is complete",
			"No injection vulnerabilities",
			"Authentication/authorization is correct",
			"Sensitive data is properly handled",
			"No hardcoded secrets or credentials",
		],
	},
	{
		name: "performance",
		label: "Performance",
		description: "Review for performance regressions and bottlenecks",
		checklist: [
			"No unnecessary allocations or copies",
			"Algorithm complexity is appropriate",
			"No blocking operations in async paths",
			"Caching is used where appropriate",
			"Database queries are efficient",
		],
	},
	{
		name: "maintainability",
		label: "Maintainability",
		description: "Review for code clarity, naming, and maintainability",
		checklist: [
			"Code is self-documenting",
			"Naming is clear and consistent",
			"Functions are small and focused",
			"Abstractions are appropriate",
			"Dependencies are minimal",
		],
	},
	{
		name: "style",
		label: "Code Style",
		description: "Review for code style and formatting consistency",
		checklist: [
			"Follows project style guide",
			"Consistent formatting",
			"Proper use of language idioms",
		],
	},
	{
		name: "testing",
		label: "Testing",
		description: "Review for test adequacy and quality",
		checklist: [
			"Unit tests cover happy path",
			"Edge cases are tested",
			"Error cases are tested",
			"Tests are deterministic",
			"Tests are independent",
		],
	},
];

/**
 * Get a perspective by name.
 */
export function getPerspective(name: string): PerspectiveDefinition | undefined {
	return BUILTIN_PERSPECTIVES.find((p) => p.name === name);
}

/**
 * Get multiple perspectives by names.
 */
export function getPerspectives(names: string[]): PerspectiveDefinition[] {
	return names
		.map((n) => getPerspective(n))
		.filter((p): p is PerspectiveDefinition => p !== undefined);
}

/**
 * Format perspectives as a review prompt.
 */
export function formatPerspectivePrompt(perspective: PerspectiveDefinition): string {
	const lines: string[] = [
		`## ${perspective.label} Review`,
		"",
		perspective.description,
		"",
		"Checklist:",
	];
	for (const item of perspective.checklist) {
		lines.push(`- [ ] ${item}`);
	}
	return lines.join("\n");
}
