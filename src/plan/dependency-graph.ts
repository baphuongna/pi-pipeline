import type { PlanTask } from "../types.ts";

/**
 * Perform a topological sort of tasks based on their `depends_on` fields.
 * Returns tasks in valid execution order.
 * Throws if a circular dependency is detected.
 */
export function topologicalSort(tasks: PlanTask[]): PlanTask[] {
	const taskMap = new Map<string, PlanTask>();
	for (const t of tasks) taskMap.set(t.id, t);

	const visited = new Set<string>();
	const visiting = new Set<string>();
	const result: PlanTask[] = [];

	function visit(id: string): void {
		if (visited.has(id)) return;
		if (visiting.has(id)) {
			throw new Error(`Circular dependency detected involving task: ${id}`);
		}
		const task = taskMap.get(id);
		if (!task) throw new Error(`Unknown task dependency: ${id}`);

		visiting.add(id);
		for (const dep of task.depends_on) {
			visit(dep);
		}
		visiting.delete(id);
		visited.add(id);
		result.push(task);
	}

	for (const t of tasks) {
		visit(t.id);
	}

	return result;
}

/**
 * Validate that all depends_on references exist in the task list.
 * Returns an array of error messages.
 */
export function validateDependencies(tasks: PlanTask[]): string[] {
	const errors: string[] = [];
	const ids = new Set(tasks.map((t) => t.id));

	for (const task of tasks) {
		for (const dep of task.depends_on) {
			if (!ids.has(dep)) {
				errors.push(`Task ${task.id} depends on unknown task: ${dep}`);
			}
		}
	}

	return errors;
}
