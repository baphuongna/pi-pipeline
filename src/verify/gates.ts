import type { VerificationGate, GateResult, TaskContext } from "../types.ts";
import { spawnSync } from "node:child_process";
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
 * Execute a shell command and return the result.
 */
function runCommand(
	cmd: string,
	args: string[],
	cwd: string,
): { stdout: string; stderr: string; exitCode: number } {
	// Strip dangerous environment variables before spawning child processes
	const DANGEROUS_VARS = [
			// Loader hijacking
			"LD_PRELOAD", "LD_AUDIT", "LD_PROFILE", "LD_USE_LOAD_BIAS", "LD_DEBUG",
			"LD_LIBRARY_PATH", "LD_ORIGIN", "LD_PATH", "LD_CONFIG", "LD_VERBOSE",
			"DYLD_INSERT_LIBRARIES", "DYLD_LIBRARY_PATH", "DYLD_FRAMEWORK_PATH",
			"DYLD_ROOT_PATH", "DYLD_INSERT_FUNC_LIST", "DYLD_SUPPRESS_DYLDS",
			"DYLD_FORCE_FLAT_NAMESPACE",
			// Shell/profile injection
			"BASH_ENV", "ENV", "ZDOTDIR", "PROFILING",
			// Proxy manipulation
			"HTTP_PROXY", "HTTPS_PROXY", "NO_PROXY", "ALL_PROXY", "SOCKS_PROXY",
			"http_proxy", "https_proxy", "no_proxy", "all_proxy", "socks_proxy",
			// Credential exposure
			"AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN",
			"AWS_DEFAULT_REGION", "AWS_REGION", "AWS_PROFILE",
			"GITHUB_TOKEN", "GITHUB_USER", "GIT_ASKPASS", "GIT_TERMINAL_PROMPT",
			"GIT_REDIRECT_STDERR", "GIT_SSH", "GIT_SSH_COMMAND",
			"HEROKU_API_KEY", "HEROKU_AUTH_TOKEN",
			"STRIPE_KEY", "STRIPE_SECRET", "STRIPE_PUBLISHABLE_KEY",
			"DATADOG_API_KEY", "DD_API_KEY",
			// Node/V8 options abuse
			"NODE_OPTIONS", "NODE_EXTRA_CA_CERTS", "NODE_REPL_HISTORY",
			// SSH/Agent
			"SSH_AUTH_SOCK", "SSH_AGENT_PID", "GCRYPT_SSH_AGENT",
			// X11/Display
			"XAUTHORITY", "META_AUTHORITY", "WAYLAND_DISPLAY", "DISPLAY",
			// GDB/Debug
			"DEBUG", "DEBUG_FILE", "DEBUG_OUTPUT", "BREAKPOINT",
			// Python
			"PYTHONDONTWRITEBYTECODE", "PYTHONPATH", "PYTHONHOME", "PYTHONSTARTUP",
			"PIP_INDEX_URL", "PIP_TRUSTED_HOST",
			// Misc injection
			"PERL5LIB", "PERL_MM_OPT", "RUBYLIB", "BUNDLE_PATH",
			"JAVA_HOME", "CLASSPATH", "JAR_HINTS",
		];
		const cleanEnv: Record<string, string> = {};
		for (const [k, v] of Object.entries(process.env)) {
			if (!DANGEROUS_VARS.includes(k)) {
				cleanEnv[k] = v ?? "";
			}
		}
		const result = spawnSync(cmd, args, {
			cwd,
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
 * Check the typecheck gate — actually runs tsc.
 */
export function checkTypecheckGate(ctx: TaskContext): GateResult {
	if (ctx.changedFiles.length === 0) {
		return { gateId: "typecheck", passed: true, evidence: "No changed files", message: "Skipped" };
	}

	try {
		// Try tsc --noEmit on changed files
		const tscResult = runCommand(
			"npx",
			["tsc", "--noEmit", "--project", path.join(ctx.cwd, "tsconfig.json")],
			ctx.cwd,
		);
		const passed = tscResult.exitCode === 0;

		return {
			gateId: "typecheck",
			passed,
			evidence: `tsc --noEmit exit code: ${tscResult.exitCode}\n${tscResult.stdout.slice(0, 500)}`,
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

	// Try eslint first, then prettier
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

	// No linter found — skip non-blocking
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
 * Check the evidence gate — verifies agent provided completion evidence.
 */
export function checkEvidenceGate(ctx: TaskContext): GateResult {
	const output = ctx.assistantOutput.toLowerCase();
	const checklist: Record<string, boolean> = {
		"Changed files listed": ctx.changedFiles.length > 0,
		"Tests mentioned": output.includes("test"),
		"Verification command run": output.includes("ran") || output.includes("executed") || output.includes("npm test"),
		"No errors remaining": !output.includes("error") || output.includes("fixed"),
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

/**
 * Map of gate IDs to their check functions.
 */
export const GATE_CHECKS: Record<string, (ctx: TaskContext) => GateResult> = {
	tests: checkTestsGate,
	typecheck: checkTypecheckGate,
	lint: checkLintGate,
	regression: checkRegressionGate,
	evidence: checkEvidenceGate,
	tdd: checkTddGate,
};

/**
 * Run specified gates against a task context.
 */
export function runGates(ctx: TaskContext, gateIds: string[]): GateResult[] {
	return gateIds
		.filter((id) => GATE_CHECKS[id])
		.map((id) => GATE_CHECKS[id](ctx));
}

/**
 * Get the gate definition by ID.
 */
export function getGateDefinition(id: string): VerificationGate | undefined {
	return GATE_DEFINITIONS.find((g) => g.id === id);
}
