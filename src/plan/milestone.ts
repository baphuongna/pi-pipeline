import type { Milestone, PlanTask } from "../types.ts";

/**
 * Create milestones by grouping tasks that share the same dependency level.
 * Tasks with no dependencies are milestone 1, tasks depending only on milestone 1
 * are milestone 2, etc.
 */
export function createMilestones(tasks: PlanTask[]): Milestone[] {
	const taskMap = new Map(tasks.map((t) => [t.id, t]));
	const milestoneOf = new Map<string, number>();

	function getLevel(id: string): number {
		if (milestoneOf.has(id)) return milestoneOf.get(id)!;
		const task = taskMap.get(id);
		if (!task || task.depends_on.length === 0) {
			milestoneOf.set(id, 1);
			return 1;
		}
		const maxDepLevel = Math.max(...task.depends_on.map((d) => getLevel(d)));
		const level = maxDepLevel + 1;
		milestoneOf.set(id, level);
		return level;
	}

	for (const task of tasks) {
		getLevel(task.id);
	}

	// Group by level
	const groups = new Map<number, string[]>();
	for (const [id, level] of milestoneOf) {
		if (!groups.has(level)) groups.set(level, []);
		groups.get(level)!.push(id);
	}

	const milestones: Milestone[] = [];
	const sortedLevels = [...groups.keys()].sort((a, b) => a - b);
	for (const level of sortedLevels) {
		const taskIds = groups.get(level)!;
		const titles = taskIds.map((id) => taskMap.get(id)?.title).filter(Boolean);
		milestones.push({
			id: `M${level}`,
			title: `Milestone ${level}: ${titles.join(", ")}`,
			taskIds,
			completed: false,
		});
	}

	return milestones;
}

/**
 * Mark a milestone as completed if all its tasks are done.
 */
export function completeMilestone(milestone: Milestone, completedTaskIds: Set<string>): Milestone {
	const allDone = milestone.taskIds.every((id) => completedTaskIds.has(id));
	return { ...milestone, completed: allDone };
}
