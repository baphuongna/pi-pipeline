/**
 * Public API Stability
 * 
 * Extensions should declare stability levels for their exports.
 * Users can check stability before relying on internal APIs.
 */

export type StabilityLevel =
	| 'experimental' // May change without notice
	| 'beta'          // Stable but may change
	| 'stable'        // Guaranteed to not change
	| 'deprecated'    // Will be removed; use alternative
	| 'internal';     // Not part of public API

export interface ExportInfo {
	name: string;
	exportedFrom: string;
	stability: StabilityLevel;
	since?: string;      // Version when first exported
	deprecatedAt?: string; // Version when deprecated
	alternative?: string; // What to use instead
	notes?: string;
}

export interface ApiStabilityReport {
	extension: string;
	version: string;
	exports: ExportInfo[];
	breakingChanges: string[];
	warnings: string[];
}

// Stability patterns for auto-detection
const STABILITY_PATTERNS: Record<StabilityLevel, RegExp[]> = {
	experimental: [/_exp|_experimental|unstable/],
	beta: [/_beta|beta/],
	stable: [/^[^_]/], // Default
	deprecated: [/@deprecated|deprecated/],
	internal: [/_int|_internal|private/],
};

/**
 * Analyze exports from source files
 */
export function analyzeExports(
	extension: string,
	version: string,
	exportedSymbols: string[],
): ApiStabilityReport {
	const exports: ExportInfo[] = [];
	const breakingChanges: string[] = [];
	const warnings: string[] = [];

	for (const symbol of exportedSymbols) {
		let stability: StabilityLevel = 'stable';

		// Auto-detect stability from name
		for (const [level, patterns] of Object.entries(STABILITY_PATTERNS)) {
			if (patterns.some(p => p.test(symbol))) {
				stability = level as StabilityLevel;
				break;
			}
		}

		if (stability === 'deprecated') {
			warnings.push(`${symbol} is deprecated`);
		}

		if (stability === 'internal') {
			warnings.push(`${symbol} is internal and should not be used`);
		}

		exports.push({
			name: symbol,
			exportedFrom: extension,
			stability,
			since: version,
		});
	}

	return {
		extension,
		version,
		exports,
		breakingChanges,
		warnings,
	};
}

/**
 * Create a deprecation warning
 */
export function deprecated(
	alternative?: string,
	since?: string,
): MethodDecorator {
	return function (
		_target: unknown,
		_propertyKey: string | symbol,
		descriptor: PropertyDescriptor,
	) {
		const original = descriptor.value;
		descriptor.value = function (...args: unknown[]) {
			console.warn(
				`[deprecation] ${String(_propertyKey)} is deprecated` +
				(alternative ? `; use ${alternative}` : '') +
				(since ? ` (since ${since})` : ''),
			);
			return (original as (...args: unknown[]) => unknown).apply(this, args);
		};
		return descriptor;
	};
}

/**
 * Mark a symbol as experimental
 */
export const experimental: unique symbol = Symbol('experimental');

export function markExperimental<T>(value: T, message?: string): T {
	if (process.env.NODE_ENV === 'development') {
		console.debug(`[experimental] ${message ?? 'experimental API'}`);
	}
	return value;
}

/**
 * Assert API stability requirement
 */
export function requireStability(
	actual: StabilityLevel,
	required: StabilityLevel,
	apiName: string,
): void {
	const order: StabilityLevel[] = ['internal', 'experimental', 'beta', 'stable', 'deprecated'];
	const actualIdx = order.indexOf(actual);
	const requiredIdx = order.indexOf(required);

	if (required === 'stable' && actual !== 'stable') {
		throw new Error(
			`[api] ${apiName} requires stability 'stable', but got '${actual}'`,
		);
	}
}
