import type { AmbiguitySignal } from "../types.ts";

/**
 * Combine all ambiguity signal scores into a single total, capped at 1.0.
 */
export function totalAmbiguityScore(signals: AmbiguitySignal[]): number {
	return Math.min(1.0, signals.reduce((sum, s) => sum + s.score, 0));
}
