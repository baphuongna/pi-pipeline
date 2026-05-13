/**
 * Green Contract Verifier - Pattern from pi-crew green-contract.ts
 * 
 * Verification level hierarchy for pipeline stages.
 */

export type GreenLevel = "none" | "targeted" | "package" | "workspace" | "merge_ready";

export interface VerificationCommand {
  cmd: string;
  status: "passed" | "failed" | "not_run";
  exitCode?: number | null;
  output?: string;
}

export interface VerificationContract {
  requiredGreenLevel: GreenLevel;
  commands: string[];
  allowManualEvidence: boolean;
}

export interface VerificationEvidence {
  requiredGreenLevel: GreenLevel;
  observedGreenLevel: GreenLevel;
  satisfied: boolean;
  commands: VerificationCommand[];
  notes?: string;
}

const GREEN_ORDER: Record<GreenLevel, number> = {
  none: 0,
  targeted: 1,
  package: 2,
  workspace: 3,
  merge_ready: 4,
};

export function greenLevelSatisfies(observed: GreenLevel, required: GreenLevel): boolean {
  return GREEN_ORDER[observed] >= GREEN_ORDER[required];
}

export function evaluateGreenContract(
  contract: VerificationContract,
  evidence?: Partial<VerificationEvidence>
): { satisfied: boolean; gap: GreenLevel | null } {
  const observed = evidence?.observedGreenLevel ?? "none";
  const satisfied = greenLevelSatisfies(observed, contract.requiredGreenLevel);
  
  if (satisfied) {
    return { satisfied: true, gap: null };
  }
  
  // Find the gap
  const gap = contract.requiredGreenLevel;
  return { satisfied: false, gap };
}

export function createVerificationEvidence(
  contract: VerificationContract,
  success: boolean,
  commandResults?: VerificationCommand[]
): VerificationEvidence {
  const observed: GreenLevel = success 
    ? (contract.allowManualEvidence ? contract.requiredGreenLevel : "targeted")
    : "none";
  
  const evidence: VerificationEvidence = {
    requiredGreenLevel: contract.requiredGreenLevel,
    observedGreenLevel: observed,
    satisfied: greenLevelSatisfies(observed, contract.requiredGreenLevel),
    commands: commandResults ?? contract.commands.map(cmd => ({ cmd, status: "not_run" as const })),
  };
  
  return evidence;
}

export function formatGreenStatus(evidence: VerificationEvidence): string {
  const status = evidence.satisfied ? "✅" : "❌";
  return `${status} Green: ${evidence.observedGreenLevel} → required: ${evidence.requiredGreenLevel}`;
}
