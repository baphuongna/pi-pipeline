import type { Plan, PlanTask } from "../types.ts";
import { validatePlan } from "./plan-validator.ts";

/**
 * Deepen a plan by refining low-confidence (architecture) tasks.
 * Returns a new plan with refined tasks.
 */
export function deepenPlan(
	plan: Plan,
	analyzer: (task: PlanTask) => PlanTask,
): Plan {
	const refinedTasks = plan.tasks.map((task) => {
		if (task.complexity === "architecture") {
			return analyzer(task);
		}
		return task;
	});

	const issues = validatePlan(refinedTasks);
	return {
		...plan,
		tasks: refinedTasks,
		issues,
		state: "PLANNING",
	};
}
