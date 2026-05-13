/**
 * Prompt Builder Pattern
 * 
 * System prompt builder for agents with extras injection.
 * 
 * Inspired by pi-subagents3's prompts.ts.
 */

export interface PromptExtras {
  /** Persistent memory content to inject */
  memoryBlock?: string;
  /** Preloaded skill contents to inject */
  skillBlocks?: Array<{ name: string; content: string }>;
  /** Custom metadata */
  metadata?: Record<string, unknown>;
}

export interface PromptConfig {
  /** Prompt mode */
  mode: "replace" | "append";
  /** System prompt content */
  systemPrompt?: string;
  /** Environment info */
  envInfo?: EnvInfo;
}

export interface EnvInfo {
  /** Working directory */
  cwd: string;
  /** Is git repository */
  isGitRepo?: boolean;
  /** Current branch */
  branch?: string;
  /** Platform */
  platform?: string;
}

/**
 * Build environment info block.
 */
export function buildEnvBlock(envInfo: EnvInfo): string {
  const lines = [
    `# Environment`,
    `Working directory: ${envInfo.cwd}`,
  ];

  if (envInfo.isGitRepo) {
    lines.push(`Git repository: yes`);
    if (envInfo.branch) {
      lines.push(`Branch: ${envInfo.branch}`);
    }
  } else {
    lines.push(`Not a git repository`);
  }

  if (envInfo.platform) {
    lines.push(`Platform: ${envInfo.platform}`);
  }

  return lines.join("\n");
}

/**
 * Build extras suffix from PromptExtras.
 */
export function buildExtrasSuffix(extras?: PromptExtras): string {
  if (!extras) return "";

  const sections: string[] = [];

  if (extras.memoryBlock) {
    sections.push(extras.memoryBlock);
  }

  if (extras.skillBlocks?.length) {
    for (const skill of extras.skillBlocks) {
      sections.push(`\n# Preloaded Skill: ${skill.name}\n${skill.content}`);
    }
  }

  return sections.length > 0 ? "\n\n" + sections.join("\n") : "";
}

/**
 * Build sub-agent context block.
 */
export function buildSubAgentContext(): string {
  return `<sub_agent_context>
You are operating as a sub-agent invoked to handle a specific task.
- Use the read tool instead of cat/head/tail
- Use the edit tool instead of sed/awk
- Use the write tool instead of echo/heredoc
- Use the find tool instead of bash find/ls for file search
- Use the grep tool instead of bash grep/rg for content search
- Make independent tool calls in parallel
- Use absolute file paths
- Do not use emojis
- Be concise but complete
</sub_agent_context>`;
}

/**
 * Generic base prompt.
 */
export const GENERIC_BASE = `You are a helpful coding assistant.
Be concise, practical, and focused on delivering working solutions.`;

/**
 * Build agent prompt from config.
 */
export function buildAgentPrompt(
  config: PromptConfig,
  extras?: PromptExtras
): string {
  const envBlock = config.envInfo ? buildEnvBlock(config.envInfo) : "";
  const extrasSuffix = buildExtrasSuffix(extras);

  if (config.mode === "append") {
    const identity = config.systemPrompt || GENERIC_BASE;
    const bridge = buildSubAgentContext();
    
    const customSection = config.systemPrompt?.trim()
      ? `\n\n<agent_instructions>\n${config.systemPrompt}\n</agent_instructions>`
      : "";

    return (
      envBlock +
      "\n\n<inherited_system_prompt>\n" +
      identity +
      "\n</inherited_system_prompt>\n\n" +
      bridge +
      customSection +
      extrasSuffix
    );
  }

  // "replace" mode
  const replaceHeader = `You are a coding agent.
You have been invoked to handle a specific task autonomously.

${envBlock}`;

  return replaceHeader + "\n\n" + (config.systemPrompt || "") + extrasSuffix;
}

/**
 * Builder for complex prompts.
 */
export class PromptBuilder {
  private sections: string[] = [];
  private extras: PromptExtras = {};

  /**
   * Add a section.
   */
  section(title: string, content: string): this {
    this.sections.push(`# ${title}\n${content}`);
    return this;
  }

  /**
   * Add environment info.
   */
  env(envInfo: EnvInfo): this {
    this.sections.push(buildEnvBlock(envInfo));
    return this;
  }

  /**
   * Add memory block.
   */
  memory(content: string): this {
    this.extras.memoryBlock = content;
    return this;
  }

  /**
   * Add a skill.
   */
  skill(name: string, content: string): this {
    if (!this.extras.skillBlocks) {
      this.extras.skillBlocks = [];
    }
    this.extras.skillBlocks.push({ name, content });
    return this;
  }

  /**
   * Add custom metadata.
   */
  metadata(key: string, value: unknown): this {
    if (!this.extras.metadata) {
      this.extras.metadata = {};
    }
    this.extras.metadata[key] = value;
    return this;
  }

  /**
   * Build the final prompt.
   */
  build(config?: Partial<PromptConfig>): string {
    const finalConfig: PromptConfig = {
      mode: config?.mode ?? "replace",
      systemPrompt: this.sections.join("\n\n"),
      envInfo: config?.envInfo,
    };
    return buildAgentPrompt(finalConfig, this.extras);
  }

  /**
   * Reset the builder.
   */
  reset(): this {
    this.sections = [];
    this.extras = {};
    return this;
  }
}
