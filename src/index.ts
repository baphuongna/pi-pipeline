import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";
import { registerPiPipeline } from "./src/extension/register.ts";

export default function (pi: ExtensionAPI): void {
	registerPiPipeline(pi);
}

// Work items exports
export { createWorkItemTracker, type WorkItem, type WorkItemFilter } from './track/work-items.js';

// Skill registry exports
export { createSkillRegistry, type SkillDocument, type NewSkill, type SkillSearchResult } from './skill/skill-registry.js';

// Session planning exports
export { createSessionPlanner, type SessionPlan, type Milestone } from './plan/session-plan.js';

// Dependency graph exports
export { createDependencyGraph, type DependencyNode, type DependencyGraph } from './graph/dependency-graph.js';

// Spec-driven workflow exports
export { createSpecWorkflow, type SpecDocument, type Task, type SpecWorkflow } from './spec/spec-workflow.js';
