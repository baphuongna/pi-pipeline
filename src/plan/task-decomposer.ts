import type { PlanTask, TaskComplexity } from "../types.ts";

let taskCounter = 0;

/**
 * Reset the internal task counter (for testing).
 */
export function resetCounter(): void {
	taskCounter = 0;
}

/**
 * Generate a task ID like "01", "02", etc.
 */
export function nextTaskId(): string {
	taskCounter++;
	return String(taskCounter).padStart(2, "0");
}

/**
 * Create a single plan task with the given properties.
 */
export function createTask(
	title: string,
	description: string,
	files: string[],
	opts?: {
		testCommand?: string;
		depends_on?: string[];
		complexity?: TaskComplexity;
		model?: string;
	},
): PlanTask {
	return {
		id: nextTaskId(),
		title,
		description,
		files,
		testCommand: opts?.testCommand,
		depends_on: opts?.depends_on ?? [],
		complexity: opts?.complexity ?? "standard",
		model: opts?.model,
	};
}

/**
 * Decompose a set of requirements into vertical-slice tasks.
 * Each task targets 2-5 minutes of work with complete end-to-end functionality.
 */
export function decomposeIntoTasks(
	requirements: string[],
	fileMap: Record<string, string[]>,
): PlanTask[] {
	resetCounter();
	const tasks: PlanTask[] = [];

	for (const req of requirements) {
		const files = fileMap[req] ?? [];
		tasks.push(
			createTask(
				req.length > 60 ? req.slice(0, 57) + "..." : req,
				req,
				files,
				{
					testCommand: files.length > 0 ? `npm test` : undefined,
					complexity: inferComplexity(req, files),
				},
			),
		);
	}

	return tasks;
}

function inferComplexity(_req: string, files: string[]): TaskComplexity {
	if (files.length > 4) return "architecture";
	if (files.length > 1) return "standard";
	return "mechanical";
}
