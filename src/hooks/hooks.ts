/**
 * Cross-Extension Hook System
 * 
 * Shared hooks that work across all extensions.
 * Extensions register hooks; the hook runner coordinates.
 */

export type HookName =
	| 'onToolInvoke'
	| 'onToolResult'
	| 'onContextCompact'
	| 'onTaskStart'
	| 'onTaskComplete'
	| 'onError'
	| 'onShutdown';

export interface HookContext {
	extension: string;
	timestamp: string;
	requestId?: string;
	[key: string]: unknown;
}

export type HookHandler<T = unknown> = (
	ctx: HookContext,
	data: T,
) => Promise<void> | void;

export interface HookRegistration {
	name: HookName;
	handler: HookHandler;
	priority?: number; // Higher = runs first
	filter?: (ctx: HookContext) => boolean;
	extension?: string;
}

const globalHooks = new Map<HookName, HookRegistration[]>();

/**
 * Register a hook
 */
export function registerHook(registration: HookRegistration): void {
	const existing = globalHooks.get(registration.name) ?? [];
	existing.push(registration);
	existing.sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
	globalHooks.set(registration.name, existing);
}

/**
 * Run all hooks for a name
 */
export async function runHooks<T>(
	name: HookName,
	ctx: HookContext,
	data: T,
): Promise<void> {
	const hooks = globalHooks.get(name) ?? [];

	for (const hook of hooks) {
		// Apply filter if present
		if (hook.filter && !hook.filter(ctx)) {
			continue;
		}

		try {
			await hook.handler(ctx, data);
		} catch (error) {
			console.error(`[hooks] ${ctx.extension} hook '${name}' failed:`, error);
		}
	}
}

/**
 * Clear all hooks (for testing)
 */
export function clearHooks(): void {
	globalHooks.clear();
}

/**
 * Pre-built hook for logging
 */
export function createLoggingHook(
	extension: string,
): HookRegistration[] {
	return [
		{
			name: 'onToolInvoke',
			extension,
			priority: -100,
			handler: (_ctx, data) => {
				const d = data as { tool: string; params: unknown };
				console.debug(`[${extension}] tool.invoke: ${d.tool}`);
			},
		},
		{
			name: 'onTaskComplete',
			extension,
			priority: -100,
			handler: (_ctx, data) => {
				const d = data as { taskId: string; success: boolean };
				console.debug(`[${extension}] task.complete: ${d.taskId} (${d.success ? 'ok' : 'fail'})`);
			},
		},
	];
}
