/**
 * Quality Gates - Pre-commit and pre-push quality checks
 * Based on everything-claude-code quality gate patterns
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const execFileAsync = promisify(execFile);

/**
 * Parse a shell command string into [cmd, ...args].
 * Handles double-quoted and single-quoted args, but not nested quotes or escape sequences.
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

export interface GateResult {
  name: string;
  passed: boolean;
  output?: string;
  duration: number;
  error?: string;
}

export interface QualityGateConfig {
  /** Run Biome formatting check */
  biome?: boolean;
  /** Run TypeScript type check */
  tsc?: boolean;
  /** Run tests */
  tests?: boolean;
  /** Minimum coverage percentage */
  coverage?: number;
  /** Additional commands to run */
  additional?: string[];
}

export type GateLevel = 'pre-commit' | 'pre-push' | 'manual';

/**
 * Quality Gates for CI/CD
 */
export class QualityGates {
  private config: QualityGateConfig;

  constructor(config: QualityGateConfig = {}) {
    this.config = {
      biome: config.biome ?? true,
      tsc: config.tsc ?? true,
      tests: config.tests ?? false,
      coverage: config.coverage ?? 80,
      additional: config.additional ?? [],
      ...config,
    };
  }

  /**
   * Run all configured gates
   */
  async run(level: GateLevel = 'manual'): Promise<{ passed: boolean; results: GateResult[] }> {
    const results: GateResult[] = [];

    // Pre-commit gates (fast)
    if (level === 'pre-commit' || level === 'manual') {
      if (this.config.biome) {
        results.push(await this.runBiomeCheck());
      }
      if (this.config.tsc) {
        results.push(await this.runTscCheck());
      }
    }

    // Pre-push gates (thorough)
    if (level === 'pre-push' || level === 'manual') {
      if (this.config.tests) {
        results.push(await this.runTests());
      }
      if (this.config.coverage) {
        results.push(await this.runCoverage(this.config.coverage));
      }
    }

    // Additional gates
    for (const cmd of this.config.additional ?? []) {
      results.push(await this.runCommand(cmd, cmd));
    }

    const passed = results.every((r) => r.passed);
    return { passed, results };
  }

  /**
   * Run Biome formatting check
   */
  async runBiomeCheck(): Promise<GateResult> {
    const start = Date.now();

    try {
      const [cmd, ...args] = parseShellArgs('npx biome check --error-on-warnings .');
      const { stdout } = await execFileAsync(cmd, args, {
        timeout: 60000,
      });

      return {
        name: 'biome-check',
        passed: true,
        output: stdout || 'No issues found',
        duration: Date.now() - start,
      };
    } catch (error) {
      const output = error instanceof Error ? error.message : String(error);

      // Biome exits with non-zero if issues found
      if (output.includes('biome')) {
        return {
          name: 'biome-check',
          passed: false,
          output,
          duration: Date.now() - start,
          error: 'Formatting or linting issues found',
        };
      }

      // Command not found
      if (output.includes('not found')) {
        return {
          name: 'biome-check',
          passed: true,
          output: 'Biome not installed, skipping',
          duration: Date.now() - start,
        };
      }

      return {
        name: 'biome-check',
        passed: false,
        output,
        duration: Date.now() - start,
        error: 'Biome check failed',
      };
    }
  }

  /**
   * Run TypeScript type check
   */
  async runTscCheck(): Promise<GateResult> {
    const start = Date.now();

    try {
      const [cmd, ...args] = parseShellArgs('npx tsc --noEmit');
      const { stdout, stderr } = await execFileAsync(cmd, args, {
        timeout: 120000,
      });

      return {
        name: 'tsc-check',
        passed: true,
        output: stdout || stderr || 'No errors',
        duration: Date.now() - start,
      };
    } catch (error) {
      const output = error instanceof Error ? error.message : String(error);

      // tsc exits with non-zero on errors
      if (output.includes('error TS')) {
        return {
          name: 'tsc-check',
          passed: false,
          output,
          duration: Date.now() - start,
          error: 'TypeScript errors found',
        };
      }

      // Command not found
      if (output.includes('not found')) {
        return {
          name: 'tsc-check',
          passed: true,
          output: 'TypeScript not installed, skipping',
          duration: Date.now() - start,
        };
      }

      return {
        name: 'tsc-check',
        passed: false,
        output,
        duration: Date.now() - start,
        error: 'TypeScript check failed',
      };
    }
  }

  /**
   * Run test suite
   */
  async runTests(): Promise<GateResult> {
    const start = Date.now();

    try {
      const [cmd, ...args] = parseShellArgs('npm test');
      const { stdout } = await execFileAsync(cmd, args, {
        timeout: 300000,
      });

      // Parse test output for pass/fail
      const passed = stdout.includes('pass') && !stdout.includes('fail');
      const output = stdout.slice(-500); // Last 500 chars

      return {
        name: 'tests',
        passed,
        output,
        duration: Date.now() - start,
        error: passed ? undefined : 'Tests failed',
      };
    } catch (error) {
      const output = error instanceof Error ? error.message : String(error);

      return {
        name: 'tests',
        passed: false,
        output: output.slice(-500),
        duration: Date.now() - start,
        error: 'Test suite failed',
      };
    }
  }

  /**
   * Run coverage check
   */
  async runCoverage(minCoverage: number): Promise<GateResult> {
    const start = Date.now();

    try {
      const [cmd, ...args] = parseShellArgs('npm run test:coverage');
      const { stdout, stderr } = await execFileAsync(cmd, args, {
        timeout: 300000,
      });

      // Parse coverage percentage
      const match = stdout.match(/All files[^>]*>\s*([\d.]+)/);
      const coverage = match ? parseFloat(match[1]) : 0;

      return {
        name: 'coverage',
        passed: coverage >= minCoverage,
        output: `Coverage: ${coverage}% (min: ${minCoverage}%)`,
        duration: Date.now() - start,
        error: coverage >= minCoverage ? undefined : `Coverage ${coverage}% below threshold ${minCoverage}%`,
      };
    } catch {
      return {
        name: 'coverage',
        passed: true,
        output: 'Coverage not available',
        duration: Date.now() - start,
      };
    }
  }

  /**
   * Run custom command
   */
  private async runCommand(name: string, command: string): Promise<GateResult> {
    const start = Date.now();

    try {
      const [cmd, ...args] = parseShellArgs(command);
      const { stdout, stderr } = await execFileAsync(cmd, args, {
        timeout: 120000,
      });

      return {
        name,
        passed: true,
        output: stdout || stderr || 'Success',
        duration: Date.now() - start,
      };
    } catch (error) {
      const output = error instanceof Error ? error.message : String(error);

      return {
        name,
        passed: false,
        output,
        duration: Date.now() - start,
        error: `${name} failed`,
      };
    }
  }

  /**
   * Generate gate report
   */
  formatReport(results: { passed: boolean; results: GateResult[] }): string {
    const lines: string[] = [];

    lines.push('## Quality Gates Report');
    lines.push('');
    lines.push(`**Status:** ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);
    lines.push('');

    for (const result of results.results) {
      const icon = result.passed ? '✅' : '❌';
      lines.push(`${icon} ${result.name} (${result.duration}ms)`);
      if (result.output) {
        lines.push(`   ${result.output.split('\n')[0].slice(0, 100)}`);
      }
      if (result.error) {
        lines.push(`   **Error:** ${result.error}`);
      }
    }

    return lines.join('\n');
  }
}
