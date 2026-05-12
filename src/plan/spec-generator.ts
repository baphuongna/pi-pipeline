import type { Plan, PlanTask, ReviewChecklistItem } from "../types.ts";

export interface SpecSection {
	heading: string;
	content: string;
}

/**
 * Generate a spec from gathered requirements.
 */
export function generateSpec(
	title: string,
	context: string,
	requirements: string[],
	scopeIn: string[],
	scopeOut: string[],
	acceptanceCriteria: string[],
	technicalNotes: string,
	filesLikelyAffected: string[],
): Plan {
	const sections: SpecSection[] = [
		{ heading: "Context", content: context },
		{
			heading: "Requirements",
			content: requirements.map((r) => `- ${r}`).join("\n"),
		},
		{
			heading: "Scope",
			content:
				"### In Scope\n" +
				scopeIn.map((s) => `- ${s}`).join("\n") +
				"\n### Out of Scope\n" +
				scopeOut.map((s) => `- ${s}`).join("\n"),
		},
		{
			heading: "Acceptance Criteria",
			content: acceptanceCriteria.map((c) => `- [ ] ${c}`).join("\n"),
		},
		{ heading: "Technical Notes", content: technicalNotes },
		{
			heading: "Files Likely Affected",
			content: filesLikelyAffected.map((f) => `- \`${f}\``).join("\n"),
		},
	];

	const spec = sections.map((s) => `## ${s.heading}\n\n${s.content}`).join("\n\n");

	return {
		title,
		spec: `# Spec: ${title}\n\n${spec}`,
		tasks: [],
		issues: [],
		createdAt: new Date().toISOString(),
		state: "SPEC'ING",
	};
}

/**
 * Format spec sections as an array of chunk strings for incremental display.
 */
export function chunkSpec(plan: Plan): string[] {
	const lines = plan.spec.split("\n");
	const chunks: string[] = [];
	let current: string[] = [];

	for (const line of lines) {
		if (line.startsWith("## ") && current.length > 0) {
			chunks.push(current.join("\n"));
			current = [];
		}
		current.push(line);
	}
	if (current.length > 0) {
		chunks.push(current.join("\n"));
	}

	return chunks;
}

/**
 * Generate acceptance criteria checklist from plan tasks.
 */
export function acceptanceCriteriaFromTasks(tasks: PlanTask[]): ReviewChecklistItem[] {
	return tasks.map((t) => ({
		label: `Task ${t.id}: ${t.title}`,
		status: "UNCLEAR" as const,
		evidence: "",
	}));
}
