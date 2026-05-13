/**
 * Architecture Decision Record - Pattern from gsd-2 ADR
 * 
 * Structured decision tracking for pipeline architecture.
 */

export type DecisionStatus = "proposed" | "accepted" | "rejected" | "superseded";

export interface ArchitectureDecision {
  id: string;
  title: string;
  status: DecisionStatus;
  date: string;
  deciders: string[];
  related?: string[];
  context: string;
  decision: string;
  consequences: {
    positive: string[];
    negative: string[];
    neutral: string[];
  };
  supersededBy?: string;
  notes?: string;
}

export interface DecisionRegistry {
  decisions: Map<string, ArchitectureDecision>;
  add(decision: ArchitectureDecision): void;
  get(id: string): ArchitectureDecision | undefined;
  list(): ArchitectureDecision[];
  supersede(id: string, by: string): void;
}

export function createDecisionRegistry(): DecisionRegistry {
  const decisions = new Map<string, ArchitectureDecision>();
  
  return {
    decisions,
    
    add(decision: ArchitectureDecision): void {
      decisions.set(decision.id, decision);
    },
    
    get(id: string): ArchitectureDecision | undefined {
      return decisions.get(id);
    },
    
    list(): ArchitectureDecision[] {
      return Array.from(decisions.values())
        .sort((a, b) => b.date.localeCompare(a.date));
    },
    
    supersede(id: string, by: string): void {
      const decision = decisions.get(id);
      if (decision) {
        decision.status = "superseded";
        decision.supersededBy = by;
      }
    },
  };
}

/**
 * Format decision as markdown
 */
export function formatDecisionAsMarkdown(decision: ArchitectureDecision): string {
  const lines: string[] = [
    `# ${decision.id}: ${decision.title}`,
    "",
    `**Status:** ${decision.status}`,
    `**Date:** ${decision.date}`,
    `**Deciders:** ${decision.deciders.join(", ")}`,
    decision.related?.length ? `**Related:** ${decision.related.join(", ")}` : "",
    "",
    "## Context",
    "",
    decision.context,
    "",
    "## Decision",
    "",
    decision.decision,
    "",
    "## Consequences",
    "",
  ];
  
  if (decision.consequences.positive.length) {
    lines.push("### Positive");
    decision.consequences.positive.forEach(c => lines.push(`- ${c}`));
    lines.push("");
  }
  
  if (decision.consequences.negative.length) {
    lines.push("### Negative");
    decision.consequences.negative.forEach(c => lines.push(`- ${c}`));
    lines.push("");
  }
  
  if (decision.consequences.neutral.length) {
    lines.push("### Neutral");
    decision.consequences.neutral.forEach(c => lines.push(`- ${c}`));
    lines.push("");
  }
  
  if (decision.supersededBy) {
    lines.push(`**Superseded by:** ${decision.supersededBy}`);
    lines.push("");
  }
  
  return lines.join("\n");
}

/**
 * Create ADR from template
 */
export function createADR(params: {
  id: string;
  title: string;
  deciders: string[];
  context: string;
  decision: string;
  positive?: string[];
  negative?: string[];
  neutral?: string[];
}): ArchitectureDecision {
  return {
    id: params.id,
    title: params.title,
    status: "proposed",
    date: new Date().toISOString().split("T")[0],
    deciders: params.deciders,
    context: params.context,
    decision: params.decision,
    consequences: {
      positive: params.positive ?? [],
      negative: params.negative ?? [],
      neutral: params.neutral ?? [],
    },
  };
}
