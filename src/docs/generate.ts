/**
 * Documentation Generator
 * 
 * Auto-generate README from source code annotations.
 * Pattern: JSDoc → Markdown conversion with tool registry.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DocConfig {
	/** Source directory */
	sourceDir: string;
	/** Output README path */
	readmePath: string;
	/** Title for the document */
	title?: string;
	/** Include tools section */
	includeTools?: boolean;
	/** Include examples section */
	includeExamples?: boolean;
}

/**
 * Generate README from tool registry
 */
export function generateToolDocs(
	tools: Array<{
		name: string;
		label?: string;
		description?: string;
		parameters?: unknown;
	}>,
): string {
	const lines: string[] = [
		'## Tools',
		'',
		'| Tool | Description |',
		'|------|-------------|',
	];

	for (const tool of tools) {
		const name = tool.label ?? tool.name;
		const desc = tool.description ?? 'No description';
		lines.push(`| \`${tool.name}\` | ${desc} |`);
	}

	return lines.join('\n') + '\n';
}

/**
 * Generate parameter table from schema
 */
export function generateParamDocs(schema: Record<string, unknown>): string {
	const props = (schema.properties as Record<string, unknown>) ?? {};
	const required = (schema.required as string[]) ?? [];

	const lines: string[] = [
		'### Parameters',
		'',
		'| Name | Type | Required | Description |',
		'|------|------|----------|-------------|',
	];

	for (const [name, prop] of Object.entries(props)) {
		const p = prop as Record<string, unknown>;
		const type = String(p.type ?? 'any');
		const desc = String(p.description ?? '');
		const req = required.includes(name) ? '✓' : '';
		lines.push(`| \`${name}\` | ${type} | ${req} | ${desc} |`);
	}

	return lines.join('\n') + '\n';
}

/**
 * Generate full README from package.json and tools
 */
export function generateReadme(
	pkg: { name: string; version: string; description: string },
	tools: DocConfig['includeTools'] extends true ? NonNullable<unknown[]> : never,
): string {
	const lines: string[] = [
		`# ${pkg.name}`,
		'',
		`> ${pkg.description}`,
		'',
		`**Version:** ${pkg.version}`,
		'',
		'## Installation',
		'',
		'```bash',
		`npm install ${pkg.name}`,
		'```',
		'',
		'## Quick Start',
		'',
		'```typescript',
		`import { setup } from '${pkg.name}';`,
		'',
		'await setup();',
		'```',
		'',
	];

	return lines.join('\n');
}

/**
 * Extract JSDoc from a file
 */
export function extractJSDoc(filePath: string): Array<{
	name: string;
	description: string;
	params: Array<{ name: string; type: string; description: string }>;
	returns?: string;
}> {
	const content = fs.readFileSync(filePath, 'utf-8');
	const results: ReturnType<typeof extractJSDoc> = [];

	// Match JSDoc comments
	const jsdocRegex = /\/\*\*([\s\S]*?)\*\/\s*(?:export\s+)?function\s+(\w+)/g;
	let match;

	while ((match = jsdocRegex.exec(content)) !== null) {
		const [full, jsdoc, name] = match;

		// Extract @param tags
		const params: Array<{ name: string; type: string; description: string }> = [];
		const paramRegex = /@param\s+\{([^}]+)\}\s+(\w+)\s+-\s+(.+)/g;
		let paramMatch;

		while ((paramMatch = paramRegex.exec(jsdoc)) !== null) {
			params.push({
				type: paramMatch[1],
				name: paramMatch[2],
				description: paramMatch[3],
			});
		}

		// Extract @returns
		const returnsMatch = /@returns?\s+-\s+(.+)/.exec(jsdoc);
		const descriptionMatch = /^\s*\*\s*(.+)/m.exec(jsdoc);

		results.push({
			name,
			description: descriptionMatch?.[1] ?? '',
			params,
			returns: returnsMatch?.[1],
		});
	}

	return results;
}

/**
 * Update CHANGELOG with new entry
 */
export function updateChangelog(
	changelogPath: string,
	version: string,
	changes: string,
): void {
	const header = `## ${version} (${new Date().toISOString().split('T')[0]})`;
	const entry = [header, '', changes, ''].join('\n');

	let content = '';
	if (fs.existsSync(changelogPath)) {
		content = fs.readFileSync(changelogPath, 'utf-8');
	}

	// Find end of header section
	const lines = content.split('\n');
	const insertIdx = lines.findIndex(l => l.startsWith('## '));

	if (insertIdx > 0) {
		lines.splice(insertIdx, 0, entry);
	} else {
		content = entry + '\n' + content;
	}

	fs.writeFileSync(changelogPath, lines.join('\n'));
}
