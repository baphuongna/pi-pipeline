/**
 * SDLC Router - Workflow Path Selection
 * 
 * Pattern from vetc-dev-kit: Route to appropriate workflow path
 */

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

const PATH_A_STEPS = [
  "BA Pipeline: Analyze requirements → Create raw specs",
  "Create data model → Design API contracts",
  "Implement with TDD → Continuous review",
  "Verify with 6 gates → Ship",
];

const PATH_B_STEPS = [
  "Quick Spec: Requirements → Structured spec",
  "Direct implementation → Minimal testing",
  "Ship if simple",
];

const PATH_C_STEPS = [
  "Consensus Plan: Planner + Architect + Critic",
  "Agreement on approach before implementation",
  "Reduce rework from misaligned understanding",
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
