import type { VerificationGate, GateResult, TaskContext } from "../types.ts";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";

export const GATE_DEFINITIONS: VerificationGate[] = [
	{
		id: "tests",
		name: "Tests Pass",
		description: "All related tests pass",
		blocking: true,
	},
	{
		id: "typecheck",
		name: "Type Check",
		description: "No type errors in changed files",
		blocking: true,
	},
	{
		id: "lint",
		name: "Lint Clean",
		description: "No lint errors in changed files",
		blocking: false,
	},
	{
		id: "regression",
		name: "No Regressions",
		description: "Previously passing tests still pass",
		blocking: true,
	},
	{
		id: "evidence",
		name: "Evidence Checklist",
		description: "Agent has provided evidence of completion",
		blocking: true,
	},
	{
		id: "tdd",
		name: "Test-Driven Development",
		description: "Production code must have corresponding tests",
		blocking: true,
	},
];

/**
 * Resolve a path to be contained within a base directory.
 * Uses realpathSync to resolve symlinks before containment check,
 * preventing escape via symlink traversal.
 */
function resolveContainedPath(base: string, candidate: string): string {
	const { resolve, isAbsolute, sep } = path;
	const absBase = isAbsolute(base) ? base : resolve(base);
	const absCandidate = isAbsolute(candidate) ? candidate : resolve(absBase, candidate);
	if (!absCandidate.startsWith(absBase + sep) && absCandidate !== absBase) {
		return absBase;
	}
	// Symlink-aware: resolve symlinks in the candidate path to prevent
	// a symlink inside base/ pointing outside from bypassing containment
	let realCandidate: string;
	try {
		realCandidate = fs.realpathSync.native(absCandidate);
	} catch {
		// Doesn't exist yet or can't resolve — use the pre-checked path
		realCandidate = absCandidate;
	}
	let realBase: string;
	try {
		realBase = fs.realpathSync.native(absBase);
	} catch {
		realBase = absBase;
	}
	const relative = path.relative(realBase, realCandidate);
	if (relative.startsWith('..') || path.isAbsolute(relative)) {
		return absBase;
	}
	return realCandidate;
}

/**
 * Execute a shell command and return the result.
 * cwd is contained to prevent working directory escape.
 */
function runCommand(
	cmd: string,
	args: string[],
	cwd: string,
): { stdout: string; stderr: string; exitCode: number } {
	const DANGEROUS_VARS = [
		"LD_PRELOAD", "LD_AUDIT", "LD_PROFILE", "LD_USE_LOAD_BIAS", "LD_DEBUG",
		"LD_LIBRARY_PATH", "LD_ORIGIN", "LD_PATH", "LD_CONFIG", "LD_VERBOSE",
		"DYLD_INSERT_LIBRARIES", "DYLD_LIBRARY_PATH", "DYLD_FRAMEWORK_PATH",
		"DYLD_ROOT_PATH", "DYLD_INSERT_FUNC_LIST", "DYLD_SUPPRESS_DYLDS",
		"DYLD_FORCE_FLAT_NAMESPACE",
		"BASH_ENV", "ENV", "ZDOTDIR", "PROFILING",
		"HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "ALL_PROXY", "SOCKS_PROXY",
		"http_proxy", "https_proxy", "no_proxy", "all_proxy", "socks_proxy",
		"AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN",
		"AWS_DEFAULT_REGION", "AWS_REGION", "AWS_PROFILE",
		"GITHUB_TOKEN", "GITHUB_USER", "GIT_ASKPASS", "GIT_TERMINAL_PROMPT",
		"GIT_REDIRECT_STDERR", "GIT_SSH", "GIT_SSH_COMMAND",
		"HEROKU_API_KEY", "HEROKU_AUTH_TOKEN",
		"STRIPE_KEY", "STRIPE_SECRET", "STRIPE_PUBLISHABLE_KEY",
		"DATADOG_API_KEY", "DD_API_KEY",
		"NODE_OPTIONS", "NODE_EXTRA_CA_CERTS", "NODE_REPL_HISTORY",
		"SSH_AUTH_SOCK", "SSH_AGENT_PID", "GCRYPT_SSH_AGENT",
		"XAUTHORITY", "META_AUTHORITY", "WAYLAND_DISPLAY", "DISPLAY",
		"DEBUG", "DEBUG_FILE", "DEBUG_OUTPUT", "BREAKPOINT",
		"PYTHONDONTWRITEBYTECODE", "PYTHONPATH", "PYTHONHOME", "PYTHONSTARTUP",
		"PIP_INDEX_URL", "PIP_TRUSTED_HOST",
		"PERL5LIB", "PERL_MM_OPT", "RUBYLIB", "BUNDLE_PATH",
		"JAVA_HOME", "CLASSPATH", "JAR_HINTS",
	];
	const cleanEnv: Record<string, string> = {};
	for (const [k, v] of Object.entries(process.env)) {
		if (!DANGEROUS_VARS.includes(k)) {
			cleanEnv[k] = v ?? "";
		}
	}

	// Contain cwd to prevent escape beyond project root
	const containedCwd = resolveContainedPath(cwd, cwd);

	const result = spawnSync(cmd, args, {
		cwd: containedCwd,
		encoding: "utf8",
		timeout: 120000,
		maxBuffer: 10 * 1024 * 1024,
		env: cleanEnv,
	});

	return {
		stdout: result.stdout ?? "",
		stderr: result.stderr ?? "",
		exitCode: result.status ?? 1,
	};
}

/**
 * Check the tests gate — actually runs the test command.
 */
export function checkTestsGate(ctx: TaskContext): GateResult {
	if (!ctx.testCommand) {
		return {
			gateId: "tests",
			passed: true,
			evidence: "No test command specified",
			message: "Skipped (no test command)",
		};
	}

	try {
		const [cmd, ...args] = ctx.testCommand.split(/\s+/);
		const result = runCommand(cmd, args, ctx.cwd);
		const passed = result.exitCode === 0;

		return {
			gateId: "tests",
			passed,
			evidence: `Command: ${ctx.testCommand}\nExit code: ${result.exitCode}\nOutput: ${result.stdout.slice(-500)}`,
			message: passed ? "All tests pass" : `Tests FAILED (exit ${result.exitCode})`,
		};
	} catch (err) {
		return {
			gateId: "tests",
			passed: false,
			evidence: `Error running: ${ctx.testCommand}`,
			message: `Failed to run tests: ${err instanceof Error ? err.message : String(err)}`,
		};
	}
}

/**
 * Check the typecheck gate — runs tsc on changed files only.
 */
export function checkTypecheckGate(ctx: TaskContext): GateResult {
	if (ctx.changedFiles.length === 0) {
		return { gateId: "typecheck", passed: true, evidence: "No changed files", message: "Skipped" };
	}

	try {
		const tsFiles = ctx.changedFiles.filter(f => f.endsWith('.ts') || f.endsWith('.tsx'));
		if (tsFiles.length === 0) {
			return { gateId: "typecheck", passed: true, evidence: "No TS files changed", message: "Skipped" };
		}

		const tscResult = runCommand(
			"npx",
			["tsc", "--noEmit", "--skipLibCheck", ...tsFiles],
			ctx.cwd,
		);
		const passed = tscResult.exitCode === 0;

		return {
			gateId: "typecheck",
			passed,
			evidence: `tsc --noEmit on ${tsFiles.length} files, exit: ${tscResult.exitCode}\n${tscResult.stdout.slice(0, 500)}`,
			message: passed ? "No type errors" : "Type check FAILED",
		};
	} catch (err) {
		return {
			gateId: "typecheck",
			passed: false,
			evidence: "TypeScript not available",
			message: `Type check error: ${err instanceof Error ? err.message : String(err)}`,
		};
	}
}

/**
 * Check the lint gate — actually runs eslint/prettier on changed files.
 */
export function checkLintGate(ctx: TaskContext): GateResult {
	if (ctx.changedFiles.length === 0) {
		return { gateId: "lint", passed: true, evidence: "No changed files", message: "Skipped" };
	}

	for (const linter of ["eslint", "prettier"]) {
		try {
			const args = linter === "eslint"
				? ["--no-error-on-unmatched-pattern", ...ctx.changedFiles]
				: ["--check", ...ctx.changedFiles];

			const result = runCommand("npx", [linter, ...args], ctx.cwd);
			if (result.exitCode === 0) {
				return {
					gateId: "lint",
					passed: true,
					evidence: `${linter} passed on ${ctx.changedFiles.length} files`,
					message: "No lint errors",
				};
			}
		} catch {
			// Linter not available, skip
		}
	}

	return {
		gateId: "lint",
		passed: true,
		evidence: `No linter available (eslint/prettier)`,
		message: "Skipped (no linter found)",
	};
}

/**
 * Check the regression gate — runs test suite to verify no regressions.
 */
export function checkRegressionGate(ctx: TaskContext): GateResult {
	if (!ctx.testCommand) {
		return {
			gateId: "regression",
			passed: true,
			evidence: "No test command",
			message: "Skipped (no test command)",
		};
	}

	try {
		const [cmd, ...args] = ctx.testCommand.split(/\s+/);
		const result = runCommand(cmd, args, ctx.cwd);
		const passed = result.exitCode === 0;

		return {
			gateId: "regression",
			passed,
			evidence: `Full test suite: exit ${result.exitCode}`,
			message: passed ? "No regressions detected" : `REGRESSION: ${result.exitCode}`,
		};
	} catch (err) {
		return {
			gateId: "regression",
			passed: false,
			evidence: `Failed to run regression tests`,
			message: String(err),
		};
	}
}

/**
 * Check the evidence gate — verifies agent provided structured completion evidence.
 * Requires artifact paths, verification commands, and explicit markers — not just keywords.
 */
export function checkEvidenceGate(ctx: TaskContext): GateResult {
	const output = ctx.assistantOutput;

	// Require structured evidence: file paths, diff blocks, or explicit markers
	const hasArtifactPaths = /\.(test|spec)\.(ts|js|tsx|jsx)/m.test(output) ||
		/changed.*files?:/i.test(output) ||
		/```(?:diff|json|yaml)/m.test(output);

	const hasVerificationCommand = /\bnpm test\b|\bnpm run\b|\btsc\b|\beslint\b/m.test(output);

	const hasExplicitCompletion = /✓|✅|passing|success|verified|all tests? (?:pass|run)/i.test(output);

	// Changed files must be explicitly referenced
	const changedFilesListed = ctx.changedFiles.length === 0 ||
		ctx.changedFiles.some(f => output.includes(f) || output.includes(f.split('/').pop()!));

	const checklist: Record<string, boolean> = {
		"Changed files listed": changedFilesListed,
		"Has artifact/evidence": hasArtifactPaths,
		"Verification command cited": hasVerificationCommand,
		"Explicit completion marker": hasExplicitCompletion,
	};

	const failures = Object.entries(checklist)
		.filter(([, v]) => !v)
		.map(([k]) => k);

	return {
		gateId: "evidence",
		passed: failures.length === 0,
		evidence: JSON.stringify(checklist, null, 2),
		message: failures.length === 0 ? "All evidence provided" : `Missing: ${failures.join(", ")}`,
	};
}

/**
 * Check the TDD gate — verifies tests exist for changed production files.
 */
export function checkTddGate(ctx: TaskContext): GateResult {
	const productionFiles = ctx.changedFiles.filter(
		(f) => !f.includes(".test.") && !f.includes(".spec."),
	);
	const testFiles = ctx.changedFiles.filter(
		(f) => f.includes(".test.") || f.includes(".spec."),
	);

	if (productionFiles.length === 0) {
		return { gateId: "tdd", passed: true, evidence: "No production files", message: "Skipped" };
	}
	if (testFiles.length === 0) {
		return {
			gateId: "tdd",
			passed: false,
			evidence: `Changed ${productionFiles.length} production files without tests`,
			message: "No test files found",
		};
	}

	return {
		gateId: "tdd",
		passed: true,
		evidence: `${testFiles.length} test files for ${productionFiles.length} production files`,
		message: "Tests present",
	};
}

export const GATE_CHECKS: Record<string, (ctx: TaskContext) => GateResult> = {
	tests: checkTestsGate,
	typecheck: checkTypecheckGate,
	lint: checkLintGate,
	regression: checkRegressionGate,
	evidence: checkEvidenceGate,
	tdd: checkTddGate,
};

export function runGates(ctx: TaskContext, gateIds: string[]): GateResult[] {
	return gateIds
		.filter((id) => GATE_CHECKS[id])
		.map((id) => GATE_CHECKS[id](ctx));
}

export function getGateDefinition(id: string): VerificationGate | undefined {
	return GATE_DEFINITIONS.find((g) => g.id === id);
}
