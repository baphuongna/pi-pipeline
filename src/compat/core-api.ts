/**
 * Pi Core API Targeting
 * 
 * Extensions should declare which Pi API versions they support.
 * This enables graceful degradation when Pi API changes.
 */

export interface PiApiVersion {
	major: number;
	minor: number;
	patch?: number;
}

export interface PiApiFeature {
	name: string;
	minVersion: PiApiVersion;
	deprecated?: boolean;
	deprecatedAt?: PiApiVersion;
	removedAt?: PiApiVersion;
}

export interface PiApiCompatibility {
	supported: PiApiVersion[];
	deprecated: PiApiFeature[];
	removed: string[];
	/** Check if a feature is available */
	hasFeature(feature: string, apiVersion: PiApiVersion): boolean;
	/** Get minimum supported version */
	minVersion(): PiApiVersion;
	/** Get maximum supported version */
	maxVersion(): PiApiVersion;
}

/**
 * Standard Pi API versions
 */
export const PI_API_VERSIONS = {
	// Pi coding agent 0.73.x - base
	V0_73: { major: 0, minor: 73 },

	// Pi coding agent 0.80.x - added structured output
	V0_80: { major: 0, minor: 80 },

	// Pi coding agent 0.85.x - added team workflows
	V0_85: { major: 0, minor: 85 },

	// Pi coding agent 0.90.x - added worktree isolation
	V0_90: { major: 0, minor: 90 },

	// Latest stable
	LATEST: { major: 0, minor: 90 },
} as const;

/**
 * Known Pi API features and their introduction versions
 */
export const PI_API_FEATURES: Record<string, PiApiFeature> = {
	// Core tools
	'tool.register': { name: 'tool.register', minVersion: PI_API_VERSIONS.V0_73 },
	'tool.invoke': { name: 'tool.invoke', minVersion: PI_API_VERSIONS.V0_73 },

	// Structured output
	'structured_output': { name: 'structured_output', minVersion: PI_API_VERSIONS.V0_80 },

	// Team workflows
	'team.create': { name: 'team.create', minVersion: PI_API_VERSIONS.V0_85 },
	'team.status': { name: 'team.status', minVersion: PI_API_VERSIONS.V0_85 },

	// Worktree isolation
	'worktree.isolate': { name: 'worktree.isolate', minVersion: PI_API_VERSIONS.V0_90 },
	'worktree.merge': { name: 'worktree.merge', minVersion: PI_API_VERSIONS.V0_90 },

	// Extension hooks
	'hook.register': { name: 'hook.register', minVersion: PI_API_VERSIONS.V0_73 },
	'hook.task_result': { name: 'hook.task_result', minVersion: PI_API_VERSIONS.V0_80 },
	'hook.context_compact': { name: 'hook.context_compact', minVersion: PI_API_VERSIONS.V0_85 },

	// Memory integration
	'memory.store': { name: 'memory.store', minVersion: PI_API_VERSIONS.V0_73 },
	'memory.search': { name: 'memory.search', minVersion: PI_API_VERSIONS.V0_73 },

	// Streaming
	'stream.events': { name: 'stream.events', minVersion: PI_API_VERSIONS.V0_80 },
};

/**
 * Create compatibility checker
 */
export function createCompatibility(
	supported: PiApiVersion[],
	deprecated: PiApiFeature[] = [],
): PiApiCompatibility {
	return {
		supported,
		deprecated,
		removed: [],

		hasFeature(feature: string, apiVersion: PiApiVersion): boolean {
			const f = PI_API_FEATURES[feature];
			if (!f) return false;
			if (f.removedAt && compareVersions(apiVersion, f.removedAt) >= 0) {
				return false;
			}
			return compareVersions(apiVersion, f.minVersion) >= 0;
		},

		minVersion(): PiApiVersion {
			return supported[0];
		},

		maxVersion(): PiApiVersion {
			return supported[supported.length - 1];
		},
	};
}

/**
 * Compare API versions
 */
export function compareVersions(a: PiApiVersion, b: PiApiVersion): number {
	if (a.major !== b.major) return a.major - b.major;
	if (a.minor !== b.minor) return a.minor - b.minor;
	return (a.patch ?? 0) - (b.patch ?? 0);
}

/**
 * Check extension compatibility with current Pi version
 */
export function checkCompatibility(
	extensionMinVersion: PiApiVersion,
): { compatible: boolean; message?: string } {
	const current = getCurrentPiVersion();

	if (compareVersions(current, extensionMinVersion) < 0) {
		return {
			compatible: false,
			message: `Extension requires Pi API ${extensionMinVersion.major}.${extensionMinVersion.minor}+, but current version is ${current.major}.${current.minor}`,
		};
	}

	return { compatible: true };
}

/**
 * Get current Pi API version from environment
 */
export function getCurrentPiVersion(): PiApiVersion {
	// Try to get from @earendil-works/pi-coding-agent package
	try {
		const pkg = require('@earendil-works/pi-coding-agent/package.json');
		const version = pkg.version;
		const [major, minor] = version.split('.').map(Number);
		return { major, minor };
	} catch {
		// Default to oldest supported version
		return PI_API_VERSIONS.V0_73;
	}
}
