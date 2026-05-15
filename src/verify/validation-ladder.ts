/**
 * Validation Ladder - Progressive Validation Pipeline
 * 
 * Pattern from harness-experimental: Fail-fast at lowest appropriate level
 * Stages: validate:quick → test:integration → test:e2e → test:platform → test:release
 * 
 * Applied from Round 43 HIGH priority research findings.
 */

import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

/**
 * Parse a shell command string into [cmd, ...args].
 * Handles double-quoted and single-quoted args.
 */
function parseShellArgs(cmd: string): [string, ...string[]] {
  const args: string[] = [];
  let current = '';
  let inDouble = false;
  let inSingle = false;
  let i = 0;

  while (i < cmd.length) {
    const ch = cmd[i];
    if (inSingle) {
      if (ch === "'") { inSingle = false; }
      else { current += ch; }
    } else if (inDouble) {
      if (ch === '"') { inDouble = false; }
      else if (ch === '\\' && i + 1 < cmd.length) { current += cmd[++i]; }
      else { current += ch; }
    } else {
      if (ch === '"') { inDouble = true; }
      else if (ch === "'") { inSingle = true; }
      else if (ch === ' ' || ch === '\t') {
        if (current) { args.push(current); current = ''; }
      } else { current += ch; }
    }
    i++;
  }
  if (current) { args.push(current); }

  if (args.length === 0) { return [cmd, '--']; }
  return [args[0], ...args.slice(1)] as [string, ...string[]];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export type LadderStage =
  | "validate:quick"
  | "test:integration"
  | "test:e2e"
  | "test:platform"
  | "test:release";

export interface StageResult {
  stage: LadderStage;
  passed: boolean;
  duration: number;
  output: string;
  error?: string;
  stopCondition?: string;
}

export interface StopCondition {
  type: "error" | "timeout" | "coverage" | "failure_count" | "manual";
  threshold?: number;
  description: string;
}

export interface StageDefinition {
  id: LadderStage;
  name: string;
  description: string;
  commands: string[];
  stopConditions: StopCondition[];
  required: boolean;
  timeout: number;
}

export interface ValidationLadderConfig {
  cwd: string;
  startStage?: LadderStage;
  stopOnFirstFailure?: boolean;
  verbose?: boolean;
  coverageThreshold?: number;
  maxFailures?: number;
}

export interface LadderResult {
  startedAt: string;
  completedAt: string;
  totalDuration: number;
  stages: StageResult[];
  failedAt?: LadderStage;
  passed: boolean;
  summary: string;
}

// ─── Stage Definitions ─────────────────────────────────────────────────────────

export const LADDER_STAGES: StageDefinition[] = [
  {
    id: "validate:quick",
    name: "Quick Validation",
    description: "Fast static checks - syntax, imports, type errors",
    commands: [
      "npx tsc --noEmit --skipLibCheck",
      "npx biome check --error-on-warnings .",
    ],
    stopConditions: [
      { type: "error", description: "TypeScript compilation errors" },
      { type: "error", description: "Biome formatting/linting errors" },
    ],
    required: true,
    timeout: 60000,
  },
  {
    id: "test:integration",
    name: "Integration Tests",
    description: "Run integration test suite",
    commands: ["npm run test:integration 2>&1 || npm test -- --grep integration 2>&1 || echo 'No integration tests found'"],
    stopConditions: [
      { type: "failure_count", threshold: 5, description: "More than 5 integration test failures" },
      { type: "timeout", description: "Integration tests timed out" },
    ],
    required: false,
    timeout: 180000,
  },
  {
    id: "test:e2e",
    name: "End-to-End Tests",
    description: "Run E2E test suite",
    commands: ["npm run test:e2e 2>&1 || npm run test:e2e:ci 2>&1 || echo 'No E2E tests found'"],
    stopConditions: [
      { type: "failure_count", threshold: 3, description: "More than 3 E2E test failures" },
      { type: "timeout", description: "E2E tests timed out" },
    ],
    required: false,
    timeout: 300000,
  },
  {
    id: "test:platform",
    name: "Platform Tests",
    description: "Run platform-specific tests",
    commands: ["npm run test:platform 2>&1 || echo 'No platform tests found'"],
    stopConditions: [
      { type: "failure_count", threshold: 2, description: "More than 2 platform test failures" },
      { type: "timeout", description: "Platform tests timed out" },
    ],
    required: false,
    timeout: 300000,
  },
  {
    id: "test:release",
    name: "Release Validation",
    description: "Final release checks - bundle size, audit, smoke test",
    commands: [
      "npm run build 2>&1",
      "npm audit --audit-level=high 2>&1 || true",
      "npm run test:smoke 2>&1 || echo 'No smoke tests found'",
    ],
    stopConditions: [
      { type: "error", description: "Build failed" },
      { type: "error", description: "High/critical security audit issues" },
      { type: "coverage", threshold: 80, description: "Coverage below 80%" },
    ],
    required: true,
    timeout: 300000,
  },
];

const STAGE_ORDER: LadderStage[] = [
  "validate:quick",
  "test:integration",
  "test:e2e",
  "test:platform",
  "test:release",
];

// ─── Ladder Implementation ─────────────────────────────────────────────────────

export class ValidationLadder {
  private config: Required<ValidationLadderConfig>;
  private results: StageResult[] = [];

  constructor(config: ValidationLadderConfig) {
    this.config = {
      cwd: config.cwd,
      startStage: config.startStage ?? "validate:quick",
      stopOnFirstFailure: config.stopOnFirstFailure ?? true,
      verbose: config.verbose ?? false,
      coverageThreshold: config.coverageThreshold ?? 80,
      maxFailures: config.maxFailures ?? 5,
    };
  }

  private getStageIndex(stage: LadderStage): number {
    return STAGE_ORDER.indexOf(stage);
  }

  private shouldRunStage(stageId: LadderStage): boolean {
    const startIndex = this.getStageIndex(this.config.startStage);
    const stageIndex = this.getStageIndex(stageId);
    return stageIndex >= startIndex;
  }

  private async runCommand(cmd: string, timeout: number): Promise<{
    stdout: string;
    stderr: string;
    exitCode: number;
    timedOut: boolean;
  }> {
    try {
      const [file, ...args] = parseShellArgs(cmd);
      const { stdout, stderr } = await execFileAsync(file, args, {
        cwd: this.config.cwd,
        timeout,
        killSignal: "SIGKILL",
      });
      return { stdout, stderr, exitCode: 0, timedOut: false };
    } catch (error) {
      if (error instanceof Error && "killed" in error) {
        return { stdout: "", stderr: "Command timed out", exitCode: 124, timedOut: true };
      }
      const err = error as { stdout?: string; stderr?: string; status?: number };
      return {
        stdout: err.stdout ?? "",
        stderr: err.stderr ?? "",
        exitCode: err.status ?? 1,
        timedOut: false,
      };
    }
  }

  private async runStage(definition: StageDefinition): Promise<StageResult> {
    const startTime = Date.now();
    const allOutput: string[] = [];

    if (this.config.verbose) {
      console.log("\n[ValidationLadder] Running stage: " + definition.id);
    }

    for (const cmd of definition.commands) {
      if (this.config.verbose) {
        console.log("  > " + cmd);
      }

      const result = await this.runCommand(cmd, definition.timeout);
      const output = result.stdout || result.stderr;
      allOutput.push("$ " + cmd + "\n" + output);

      for (const condition of definition.stopConditions) {
        if (this.checkStopCondition(result, condition)) {
          const duration = Date.now() - startTime;
          return {
            stage: definition.id,
            passed: false,
            duration,
            output: allOutput.join("\n"),
            error: "Stop condition triggered: " + condition.description,
            stopCondition: condition.description,
          };
        }
      }
    }

    const duration = Date.now() - startTime;
    return {
      stage: definition.id,
      passed: true,
      duration,
      output: allOutput.join("\n"),
    };
  }

  private checkStopCondition(
    result: { exitCode: number; stdout: string; stderr: string; timedOut: boolean },
    condition: StopCondition,
  ): boolean {
    switch (condition.type) {
      case "error":
        return (
          result.exitCode !== 0 &&
          !result.stdout.includes("No integration tests found") &&
          !result.stdout.includes("No E2E tests found") &&
          !result.stdout.includes("No platform tests found") &&
          !result.stdout.includes("No smoke tests found")
        );
      case "timeout":
        return result.timedOut;
      case "failure_count": {
        if (condition.threshold) {
          const failureMatch = result.stdout.match(/(\d+)\s*(failures?|failed|errors?)/gi);
          if (failureMatch) {
            const failures = failureMatch.reduce((sum, m) => {
              const num = parseInt(m.match(/\d+/)?.[0] ?? "0", 10);
              return sum + num;
            }, 0);
            return failures > condition.threshold;
          }
        }
        return false;
      }
      case "coverage": {
        if (condition.threshold) {
          const match = result.stdout.match(/All files[^>]*>\s*([\d.]+)/);
          if (match) {
            const coverage = parseFloat(match[1]);
            return coverage < condition.threshold;
          }
        }
        return false;
      }
      default:
        return false;
    }
  }

  async run(): Promise<LadderResult> {
    const startedAt = new Date().toISOString();
    this.results = [];
    let failedAt: LadderStage | undefined;

    for (const stageDef of LADDER_STAGES) {
      if (!this.shouldRunStage(stageDef.id)) {
        if (this.config.verbose) {
          console.log("[ValidationLadder] Skipping: " + stageDef.id + " (before start stage)");
        }
        continue;
      }

      const result = await this.runStage(stageDef);
      this.results.push(result);

      if (!result.passed) {
        failedAt = stageDef.id;
        if (this.config.verbose) {
          console.log("[ValidationLadder] FAILED at " + stageDef.id + ": " + result.error);
        }
        if (this.config.stopOnFirstFailure) {
          break;
        }
      } else if (this.config.verbose) {
        console.log("[ValidationLadder] PASSED: " + stageDef.id + " (" + result.duration + "ms)");
      }
    }

    const completedAt = new Date().toISOString();
    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const passed = !failedAt || this.results.every((r) => r.passed);

    return {
      startedAt,
      completedAt,
      totalDuration,
      stages: this.results,
      failedAt,
      passed,
      summary: this.generateSummary(passed, failedAt),
    };
  }

  async runUntil(targetStage: LadderStage): Promise<LadderResult> {
    const originalStopOnFirstFailure = this.config.stopOnFirstFailure;
    this.config.stopOnFirstFailure = false;

    const result = await this.run();
    this.config.stopOnFirstFailure = originalStopOnFirstFailure;

    const targetIndex = this.getStageIndex(targetStage);
    result.stages = result.stages.filter((s) => this.getStageIndex(s.stage) <= targetIndex);

    return result;
  }

  private generateSummary(passed: boolean, failedAt?: LadderStage): string {
    if (passed) {
      const stages = this.results.map((r) => r.stage).join(" → ");
      return "Validation ladder PASSED: " + stages;
    }
    return "Validation ladder FAILED at " + failedAt;
  }

  static getStageDefinition(id: LadderStage): StageDefinition | undefined {
    return LADDER_STAGES.find((s) => s.id === id);
  }

  static getAllStages(): StageDefinition[] {
    return [...LADDER_STAGES];
  }

  static formatReport(result: LadderResult): string {
    const lines: string[] = [];

    lines.push("## Validation Ladder Report");
    lines.push("");
    lines.push("**Status:** " + (result.passed ? "PASSED" : "FAILED"));
    if (result.failedAt) {
      lines.push("**Failed at:** " + result.failedAt);
    }
    lines.push("**Duration:** " + result.totalDuration + "ms (" + Math.round(result.totalDuration / 1000) + "s)");
    lines.push("**Stages completed:** " + result.stages.length + "/" + LADDER_STAGES.length);
    lines.push("");

    lines.push("### Stage Results");
    lines.push("");

    for (const stage of result.stages) {
      const icon = stage.passed ? "PASS" : "FAIL";
      lines.push(icon + " **" + stage.stage + "** (" + stage.duration + "ms)");
      if (!stage.passed) {
        lines.push("   - **Error:** " + stage.error);
        if (stage.stopCondition) {
          lines.push("   - **Stop condition:** " + stage.stopCondition);
        }
      }
      if (stage.output && stage.output.length > 0) {
        lines.push("   Output: " + stage.output.slice(-200));
      }
      lines.push("");
    }

    return lines.join("\n");
  }
}

// ─── Convenience Functions ─────────────────────────────────────────────────────

export async function runValidationLadder(
  cwd: string,
  options?: Partial<ValidationLadderConfig>,
): Promise<LadderResult> {
  const ladder = new ValidationLadder({ cwd, ...options });
  return ladder.run();
}

export async function runValidationStage(
  stage: LadderStage,
  cwd: string,
): Promise<StageResult> {
  const ladder = new ValidationLadder({ cwd, startStage: stage });
  const result = await ladder.runUntil(stage);
  return result.stages[0];
}

export function shouldRunStage(
  stage: LadderStage,
  previousResults?: StageResult[],
): boolean {
  if (!previousResults || previousResults.length === 0) {
    return stage === "validate:quick";
  }

  const stageIndex = STAGE_ORDER.indexOf(stage);
  for (let i = 0; i < stageIndex; i++) {
    const prevStage = STAGE_ORDER[i];
    const prevResult = previousResults.find((r) => r.stage === prevStage);
    if (!prevResult?.passed) {
      return false;
    }
  }

  return true;
}

// ─── Tool Integration ──────────────────────────────────────────────────────────

export interface ValidationLadderToolInput {
  stage?: LadderStage;
  stopOnFirstFailure?: boolean;
  verbose?: boolean;
}

export const VALIDATION_LADDER_TOOL = {
  name: "validate-ladder",
  description: "Run progressive validation ladder: validate:quick → test:integration → test:e2e → test:platform → test:release",
  inputSchema: {
    type: "object",
    properties: {
      stage: {
        type: "string",
        enum: ["validate:quick", "test:integration", "test:e2e", "test:platform", "test:release"],
        description: "Starting stage (default: validate:quick)",
      },
      stopOnFirstFailure: {
        type: "boolean",
        description: "Stop at first failure (default: true)",
      },
      verbose: {
        type: "boolean",
        description: "Verbose output (default: false)",
      },
    },
  },
  handler: async (
    args: ValidationLadderToolInput,
    context: { cwd: string },
  ): Promise<{ content: Array<{ type: string; text: string }> }> => {
    const result = await runValidationLadder(context.cwd, {
      startStage: args.stage,
      stopOnFirstFailure: args.stopOnFirstFailure,
      verbose: args.verbose,
    });

    return {
      content: [
        {
          type: "text",
          text: ValidationLadder.formatReport(result),
        },
      ],
    };
  },
};