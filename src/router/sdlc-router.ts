/**
 * SDLC Router - Workflow Path Selection
 * 
 * Pattern from vetc-dev-kit: Route to appropriate workflow path
 * Validation ladder integration from harness-experimental Round 43 research
 */

import type { LadderStage } from "../verify/validation-ladder.ts";

export type SDLCPath = "a" | "b" | "c";

export interface RouterContext {
  hasBAInput: boolean;
  complexity: "low" | "medium" | "high";
  urgency: "low" | "medium" | "high";
  hasAmbiguity: boolean;
  requiresConsensus: boolean;
}

export interface PathRecommendation {
  path: SDLCPath;
  reason: string;
  steps: string[];
}

// Validation ladder stages per SDLC path
const PATH_A_VALIDATION: LadderStage[] = [
  "validate:quick",
  "test:integration",
  "test:e2e",
  "test:platform",
  "test:release",
];

const PATH_B_VALIDATION: LadderStage[] = [
  "validate:quick",
  "test:integration",
];

const PATH_C_VALIDATION: LadderStage[] = [
  "validate:quick",
  "test:integration",
  "test:e2e",
];

const PATH_A_STEPS = [
  "BA Pipeline: Analyze requirements → Create raw specs",
  "Create data model → Design API contracts",
  "Implement with TDD → Continuous review",
  "Validation ladder: validate:quick → test:integration → test:e2e → test:platform → test:release",
  "Ship",
];

const PATH_B_STEPS = [
  "Quick Spec: Requirements → Structured spec",
  "Direct implementation → Minimal testing",
  "Validation ladder: validate:quick → test:integration",
  "Ship if simple",
];

const PATH_C_STEPS = [
  "Consensus Plan: Planner + Architect + Critic",
  "Agreement on approach before implementation",
  "Reduce rework from misaligned understanding",
  "Validation ladder: validate:quick → test:integration → test:e2e",
];

/**
 * Route to appropriate SDLC path based on context
 */
export function routeSDLC(ctx: RouterContext): PathRecommendation {
  // High ambiguity → Consensus required
  if (ctx.hasAmbiguity || ctx.requiresConsensus) {
    return {
      path: "c",
      reason: "Ambiguity detected or consensus required",
      steps: PATH_C_STEPS,
    };
  }
  
  // High complexity or BA input available → Full pipeline
  if (ctx.complexity === "high" || (ctx.hasBAInput && ctx.complexity === "medium")) {
    return {
      path: "a",
      reason: "High complexity or full BA input available",
      steps: PATH_A_STEPS,
    };
  }
  
  // Low complexity and urgency → Quick path
  if (ctx.complexity === "low" && ctx.urgency === "high") {
    return {
      path: "b",
      reason: "Low complexity, high urgency → quick path",
      steps: PATH_B_STEPS,
    };
  }
  
  // Default to path A (full pipeline)
  return {
    path: "a",
    reason: "Default path for standard complexity",
    steps: PATH_A_STEPS,
  };
}

/**
 * Get path description
 */
export function getPathDescription(path: SDLCPath): string {
  switch (path) {
    case "a": return "BA Pipeline (Full)";
    case "b": return "Quick Spec";
    case "c": return "Consensus Plan";
  }
}

/**
 * Check if path requires additional steps
 */
export function requiresAdditionalSteps(path: SDLCPath): boolean {
  return path !== "b";
}

/**
 * Estimate time based on path
 */
export function estimateTime(path: SDLCPath, complexity: RouterContext["complexity"]): string {
  const base: Record<SDLCPath, string> = {
    a: "2-4 hours",
    b: "15-30 minutes",
    c: "30-60 minutes",
  };
  
  return base[path];
}

/**
 * Get validation stages for a given SDLC path
 */
export function getValidationStages(path: SDLCPath): LadderStage[] {
  switch (path) {
    case "a": return PATH_A_VALIDATION;
    case "b": return PATH_B_VALIDATION;
    case "c": return PATH_C_VALIDATION;
  }
}

/**
 * Check if validation ladder should be used for a path
 */
export function requiresValidationLadder(path: SDLCPath): boolean {
  return path === "a" || path === "c";
}

/**
 * Get minimal validation stage for quick path
 */
export function getMinimalValidationStage(path: SDLCPath): LadderStage {
  const stages = getValidationStages(path);
  return stages[0];
}
