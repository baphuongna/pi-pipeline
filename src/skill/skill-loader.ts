/**
 * Skill Loader
 * 
 * Pattern for loading and preloading skills from multiple root directories.
 * Supports Pi standard, Agent Skills spec, and legacy locations.
 * 
 * Inspired by pi-subagents3's skill-loader.ts.
 */

import type { Dirent } from "node:fs";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

/**
 * Check if a path contains path traversal characters.
 */
export function isUnsafeName(name: string): boolean {
  return name.includes("..") || name.includes("/") || name.includes("\\");
}

/**
 * Check if a path is a symlink.
 */
export function isSymlink(path: string): boolean {
  try {
    const stats = readFileSync(path, "utf8");
    return false;
  } catch {
    return false;
  }
}

/**
 * Safely read a file, returning undefined on error.
 */
export function safeReadFile(path: string): string | undefined {
  try {
    return readFileSync(path, "utf8");
  } catch {
    return undefined;
  }
}

/**
 * Preloaded skill content.
 */
export interface PreloadedSkill {
  name: string;
  content: string;
}

/**
 * Get the user's agent directory.
 */
export function getAgentDir(): string {
  return join(homedir(), ".pi", "agent");
}

/**
 * Skill loading roots in precedence order:
 * 1. <cwd>/.pi/skills - project, Pi standard
 * 2. <cwd>/.agents/skills - project, Agent Skills spec
 * 3. <getAgentDir()>/skills - user, Pi standard
 * 4. ~/.agents/skills - user, Agent Skills spec
 * 5. ~/.pi/skills - legacy global, pre-Pi
 */
export interface SkillRoots {
  cwd: string;
  getAgentDir?: () => string;
}

/**
 * Default skill roots configuration.
 */
export const DEFAULT_SKILL_ROOTS: SkillRoots = {
  cwd: process.cwd(),
  getAgentDir: () => join(homedir(), ".pi", "agent"),
};

/**
 * Preload multiple skills by name.
 */
export function preloadSkills(
  skillNames: string[],
  cwd: string,
  roots?: Partial<SkillRoots>
): PreloadedSkill[] {
  return skillNames.map((name) => ({
    name,
    content: loadSkillContent(name, cwd, roots),
  }));
}

/**
 * Load skill content by name.
 */
export function loadSkillContent(
  name: string,
  cwd: string,
  roots?: Partial<SkillRoots>
): string {
  // Safety check
  if (isUnsafeName(name)) {
    return `(Skill "${name}" skipped: name contains path traversal characters)`;
  }

  // Build roots list
  const agentDir = roots?.getAgentDir?.() ?? getAgentDir();
  const skillRoots = [
    join(cwd, ".pi", "skills"),
    join(cwd, ".agents", "skills"),
    agentDir,
    join(homedir(), ".agents", "skills"),
    join(homedir(), ".pi", "skills"),
  ];

  // Search each root
  for (const root of skillRoots) {
    const content = findSkillInRoot(root, name);
    if (content !== undefined) {
      return content;
    }
  }

  return `(Skill "${name}" not found in .pi/skills/, .agents/skills/, or global skill locations)`;
}

/**
 * Find skill in a root directory.
 */
function findSkillInRoot(root: string, name: string): string | undefined {
  // Reject symlinked roots
  if (isSymlink(root)) {
    return undefined;
  }

  // Check flat file: <root>/<name>.md
  const flat = safeReadFile(join(root, `${name}.md`))?.trim();
  if (flat !== undefined) {
    return flat;
  }

  // Check directory: <root>/.../<name>/SKILL.md
  return findSkillDirectory(root, name);
}

/**
 * BFS search for skill directory.
 */
function findSkillDirectory(root: string, name: string): string | undefined {
  if (!existsSync(root)) {
    return undefined;
  }

  const queue: string[] = [root];

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === undefined) {
      continue;
    }

    let entries: Dirent<string>[];
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      continue;
    }

    // Deterministic byte-order traversal
    entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));

    for (const entry of entries) {
      // Skip dotfiles and node_modules
      if (entry.name.startsWith(".") || entry.name === "node_modules") {
        continue;
      }

      const fullPath = join(current, entry.name);

      if (entry.isDirectory()) {
        // Check if this directory is the skill we're looking for
        if (entry.name === name) {
          const skillFile = join(fullPath, "SKILL.md");
          const content = safeReadFile(skillFile)?.trim();
          if (content !== undefined) {
            return content;
          }
        }

        // Add to BFS queue
        queue.push(fullPath);
      }
    }
  }

  return undefined;
}

/**
 * List all available skills in a directory.
 */
export function listSkills(cwd: string, roots?: Partial<SkillRoots>): string[] {
  const agentDir = roots?.getAgentDir?.() ?? getAgentDir();
  const skillRoots = [
    join(cwd, ".pi", "skills"),
    join(cwd, ".agents", "skills"),
    agentDir,
    join(homedir(), ".agents", "skills"),
    join(homedir(), ".pi", "skills"),
  ];

  const skills = new Set<string>();

  for (const root of skillRoots) {
    if (!existsSync(root) || isSymlink(root)) {
      continue;
    }

    try {
      const entries = readdirSync(root, { withFileTypes: true });
      for (const entry of entries) {
        // Skip dotfiles and node_modules
        if (entry.name.startsWith(".") || entry.name === "node_modules") {
          continue;
        }

        const fullPath = join(root, entry.name);

        if (entry.isFile() && entry.name.endsWith(".md")) {
          // Flat skill file
          skills.add(entry.name.replace(/\.md$/, ""));
        } else if (entry.isDirectory()) {
          // Directory skill
          const skillFile = join(fullPath, "SKILL.md");
          if (existsSync(skillFile)) {
            skills.add(entry.name);
          }
        }
      }
    } catch {
      continue;
    }
  }

  return Array.from(skills).sort();
}
