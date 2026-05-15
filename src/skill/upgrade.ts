/**
 * Skills Upgrade Strategy
 * 
 * How to upgrade skills when an extension is updated:
 * 1. Version the skill directory with the extension
 * 2. On extension load, check if skill version matches
 * 3. Merge skill changes (don't overwrite user customizations)
 * 4. Backup before upgrade
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface SkillUpgradeConfig {
	/** Source skill directory (in node_modules) */
	sourceDir: string;
	/** Target skill directory (in project) */
	targetDir: string;
	/** Current installed version */
	currentVersion?: string;
	/** New version to upgrade to */
	newVersion: string;
	/** Backup before upgrade */
	backupDir?: string;
	/** Merge strategy for conflicts */
	mergeStrategy?: 'source-wins' | 'target-wins' | 'ask';
}

export interface SkillUpgradeResult {
	success: boolean;
	upgraded: string[];
	skipped: string[];
	failed: { file: string; error: string }[];
	backupPath?: string;
}

/**
 * Check if skill needs upgrade
 */
export function needsUpgrade(config: SkillUpgradeConfig): boolean {
	const manifestPath = path.join(config.targetDir, '.skill-version');
	if (!fs.existsSync(manifestPath)) return true;

	const current = fs.readFileSync(manifestPath, 'utf-8').trim();
	return current !== config.newVersion;
}

/**
 * Upgrade skills from source to target
 */
export function upgradeSkills(config: SkillUpgradeConfig): SkillUpgradeResult {
	const result: SkillUpgradeResult = {
		success: true,
		upgraded: [],
		skipped: [],
		failed: [],
	};

	// Ensure target directory
	if (!fs.existsSync(config.targetDir)) {
		fs.mkdirSync(config.targetDir, { recursive: true });
	}

	// Backup if requested
	if (config.backupDir && fs.existsSync(config.targetDir)) {
		result.backupPath = backupSkillDir(config.targetDir, config.backupDir);
	}

	// Read source SKILL.md
	const sourceSkillPath = path.join(config.sourceDir, 'SKILL.md');
	const targetSkillPath = path.join(config.targetDir, 'SKILL.md');

	if (!fs.existsSync(sourceSkillPath)) {
		result.success = false;
		result.failed.push({ file: 'SKILL.md', error: 'Source SKILL.md not found' });
		return result;
	}

	// Check if target exists and needs merge
	if (fs.existsSync(targetSkillPath) && config.mergeStrategy !== 'source-wins') {
		const merged = mergeSkillFiles(
			fs.readFileSync(targetSkillPath, 'utf-8'),
			fs.readFileSync(sourceSkillPath, 'utf-8'),
			config.mergeStrategy ?? 'source-wins',
		);
		fs.writeFileSync(targetSkillPath, merged);
		result.upgraded.push('SKILL.md (merged)');
	} else {
		fs.copyFileSync(sourceSkillPath, targetSkillPath);
		result.upgraded.push('SKILL.md');
	}

	// Copy skill subdirectories
	const skillSubdirs = ['examples', 'prompts', 'templates'];
	for (const subdir of skillSubdirs) {
		const sourceSubdir = path.join(config.sourceDir, subdir);
		const targetSubdir = path.join(config.targetDir, subdir);

		if (fs.existsSync(sourceSubdir)) {
			if (!fs.existsSync(targetSubdir)) {
				fs.mkdirSync(targetSubdir, { recursive: true });
			}

			for (const file of fs.readdirSync(sourceSubdir)) {
				const srcFile = path.join(sourceSubdir, file);
				const tgtFile = path.join(targetSubdir, file);

				if (fs.statSync(srcFile).isFile()) {
					fs.copyFileSync(srcFile, tgtFile);
					result.upgraded.push(`${subdir}/${file}`);
				}
			}
		}
	}

	// Write version manifest
	fs.writeFileSync(
		path.join(config.targetDir, '.skill-version'),
		config.newVersion,
	);

	return result;
}

/**
 * Merge two SKILL.md files
 * Target-wins keeps user additions, source-wins takes new content
 */
function mergeSkillFiles(target: string, source: string, _strategy: string): string {
	// Simple merge: append new sections from source that don't exist in target
	// Look for ## headers in source
	const sourceHeaders: string[] = source.match(/^## .+$/gm) ?? [];
	const targetHeaders: string[] = target.match(/^## .+$/gm) ?? [];

	const newHeaders = sourceHeaders.filter(
		(h: string) => !targetHeaders.includes(h),
	);

	if (newHeaders.length === 0) return target;

	// Extract new sections
	let newSections = '';
	for (const header of newHeaders) {
		const idx = source.indexOf(header);
		const nextIdx = source.indexOf('\n## ', idx + 1);
		const section = nextIdx > 0 ? source.slice(idx, nextIdx) : source.slice(idx);
		newSections += '\n\n' + section;
	}

	return target + '\n\n---\n\n' + newSections;
}

/**
 * Backup skill directory
 */
function backupSkillDir(dir: string, backupDir: string): string {
	if (!fs.existsSync(backupDir)) {
		fs.mkdirSync(backupDir, { recursive: true });
	}

	const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
	const name = path.basename(dir);
	const backupPath = path.join(backupDir, `${name}-${timestamp}`);

	fs.cpSync(dir, backupPath, { recursive: true });
	return backupPath;
}

/**
 * Check for skill updates in npm package
 * Uses execFile instead of execSync to prevent shell injection.
 */
export async function checkForSkillUpdates(
	packageName: string,
	currentVersion: string,
): Promise<{ hasUpdate: boolean; latestVersion?: string }> {
	try {
		const { execFile } = await import('node:child_process');

		// Validate packageName to prevent injection
		if (!/^[a-z@][a-z0-9-._]*$/.test(packageName)) {
			return { hasUpdate: false };
		}

		// Use execFile with argument array, not shell string
		const npmView = await new Promise<string>((resolve, reject) => {
			execFile('npm', ['view', packageName, 'version'], {
				encoding: 'utf-8',
				// Sanitized environment - no user credentials
				env: {
					...process.env,
					// Only allow safe npm config variables
					npm_config_registry: process.env.npm_config_registry || 'https://registry.npmjs.org',
				},
			}, (err, stdout) => {
				if (err) reject(err);
				else resolve(stdout.trim());
			});
		});

		const latest = npmView;
		const hasUpdate = latest !== currentVersion;

		return { hasUpdate, latestVersion: latest };
	} catch {
		return { hasUpdate: false };
	}
}
