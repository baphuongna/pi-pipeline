/**
 * Boil the Lake - Pattern from gstack ethos
 * 
 * Completeness-first development philosophy.
 */

export interface CompletenessEstimate {
  approachA: {
    name: string;
    coverage: number;
    estimatedLines: number;
    costRatio: number;
  };
  approachB: {
    name: string;
    coverage: number;
    estimatedLines: number;
    costRatio: number;
  };
  recommendation: "A" | "B" | "either";
}

/**
 * Boil the Lake decision logic
 * 
 * When the complete implementation costs minutes more than the shortcut — 
 * do the complete thing. Every time.
 */
export function shouldComplete(
  coverageA: number,
  linesA: number,
  coverageB: number,
  linesB: number
): { complete: boolean; reason: string } {
  if (coverageA > coverageB) {
    const deltaLines = linesA - linesB;
    
    if (coverageA - coverageB >= 10 && deltaLines <= 100) {
      return { 
        complete: true, 
        reason: `A covers ${coverageA}% vs B's ${coverageB}% — completeness is cheap with AI` 
      };
    }
    
    if (coverageA - coverageB >= 20) {
      return { 
        complete: true, 
        reason: `A covers ${coverageA - coverageB}% more — do the complete thing` 
      };
    }
  }
  
  if (coverageA >= 90 && coverageB < 90) {
    return { complete: true, reason: "A achieves 90%+ coverage" };
  }
  
  return { complete: false, reason: "B is sufficient for this task" };
}

/**
 * Compression ratios for AI-assisted work
 */
export const COMPRESSION_RATIOS = {
  boilerplate: { humanHours: 48, aiMinutes: 15, ratio: 100 },
  tests: { humanHours: 24, aiMinutes: 15, ratio: 50 },
  feature: { humanHours: 120, aiMinutes: 30, ratio: 30 },
  bugFix: { humanHours: 4, aiMinutes: 15, ratio: 20 },
  architecture: { humanHours: 48, aiHours: 4, ratio: 5 },
  research: { humanHours: 24, aiHours: 3, ratio: 3 },
} as const;

type CompressionTask = keyof typeof COMPRESSION_RATIOS;

function formatDuration(hours: number, minutes?: number): string {
  if (minutes !== undefined) {
    return hours > 0 ? `${hours}h human / ${minutes}min AI` : `${minutes}min AI`;
  }
  return hours > 1 ? `${hours}h human` : `${hours}h AI`;
}

/**
 * Format compression ratio as human-readable
 */
export function formatCompressionRatio(
  task: CompressionTask,
  actualHumanHours?: number,
  actualAiMinutes?: number
): string {
  const base = COMPRESSION_RATIOS[task];
  
  if (actualHumanHours && actualAiMinutes) {
    const ratio = (actualHumanHours * 60) / actualAiMinutes;
    return `~${Math.round(ratio)}x compression (${formatDuration(actualHumanHours, actualAiMinutes)})`;
  }
  
  const aiHrs = (base as { aiHours?: number }).aiHours;
  const aiMins = (base as { aiMinutes?: number }).aiMinutes;
  const humanStr = aiHrs !== undefined
    ? formatDuration(base.humanHours, aiHrs)
    : formatDuration(base.humanHours, aiMins ?? 15);
  
  return `~${base.ratio}x compression (${humanStr})`;
}

/**
 * Search before building heuristic
 */
export function searchBeforeBuildingCheck(
  taskType: "pattern" | "infrastructure" | "runtime" | "unknown"
): { shouldSearch: boolean; layers: string[] } {
  const layers = [
    "Layer 1: Tried and true — standard patterns",
    "Layer 2: New and popular — current best practices",
    "Layer 3: Search first — has someone solved this?",
  ];
  
  const shouldSearch = taskType !== "unknown";
  
  return { shouldSearch, layers };
}
