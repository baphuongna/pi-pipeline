import type { ExtensionAPI, ExtensionContext, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { visual_update_plan } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config.ts";
import { registerPipelineTools } from "./tool-registry.ts";
import { emptyPipelineState } from "../types.ts";
import { detectAmbiguity } from "../clarify/ambiguity.ts";
import { totalAmbiguityScore } from "../clarify/scoring.ts";
import { detectComplexity } from "../adaptive/complexity.ts";
import { handlePlan, handlePlanDeepen, handlePlanGo, handlePlanStatus } from "../commands/plan.ts";

// Helper to update plan visual
async function updatePlanVisual(title: string, status: string, tasks: Array<{ id: string; description: string; files: string[]; status: string }>) {
  try {
    await visual_update_plan({
      title,
      status: status as "DRAFT" | "READY" | "APPROVED" | "REJECTED",
      tasks: tasks.map((t) => ({
        id: t.id,
        description: t.description,
        files: t.files,
        status: t.status as "pending" | "in-progress" | "done",
      })),
    });
  } catch { /* ignore if visual not available */ }
}
import { handlePlanReview } from "../commands/review.ts";
import { handleVerify, handleVerifyEvidence } from "../commands/verify.ts";
import { handleClarify } from "../commands/clarify.ts";
import { handleGo } from "../commands/go.ts";

export function registerPiPipeline(pi: ExtensionAPI): void {
	// Pipeline state is session-scoped
	let state = emptyPipelineState();

	pi.on("session_start", (_event, ctx: ExtensionContext) => {
		const { config } = loadConfig(ctx.cwd);

		if (!config.enabled) return;

		// Reset pipeline state for new session
		state = emptyPipelineState();

		// Register pipeline tools
		registerPipelineTools(pi);

		// Register slash commands
		registerPipelineCommands(pi, ctx, () => state, (s) => { state = s; });
	});

	// Hook: input → intent analysis
	pi.on("input", (event) => {
		const text = event.text;
		if (!text) return;

		const signals = detectAmbiguity(text);
		const score = totalAmbiguityScore(signals);

		if (score > 0.5 && state.mode === "IDLE") {
			// Could inject plan mode prefix for complex requests
			state = { ...state, ambiguityScore: score };
		}
	});

	// Hook: context → pipeline context injection
	const contextHook = (): { messages?: Array<Record<string, unknown>> } | undefined => {
		if (state.mode === "GATHERING" || state.mode === "SPEC'ING" || state.mode === "PLANNING") {
			return {
				messages: [
					{ role: "user", content: "[system] You are in planning mode. Ask clarifying questions before implementing." },
				],
			};
		}
		if (state.mode === "EXECUTING") {
			return {
				messages: [
					{ role: "user", content: "[system] Follow the approved plan. Report evidence when each task completes." },
				],
			};
		}
		if (state.mode === "REVIEWING") {
			return {
				messages: [
					{ role: "user", content: "[system] Review ONLY what was asked. Do not add scope." },
				],
			};
		}
		return undefined;
	};
	// Register context hook — cast through unknown to avoid type mismatch with Pi API
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	(pi as unknown as { on: (event: string, handler: () => unknown) => void }).on("context", contextHook);

	// Hook: tool_call → verification gate blocking
	pi.on("tool_call", (event) => {
		const blockReasons: Record<string, string> = {
			edit: "Edits are blocked during verification phase. Complete verification before editing.",
		write: "Write is blocked during verification phase. Complete verification before writing.",
		bash: "Bash is blocked during verification phase.",
		/* agent: "Subagents are paused during verification." */
		/* add more as needed */
		};

		const toolName = (event as { toolName?: string }).toolName ?? "";
		const blocking = state.mode === "REVIEWING";
		if (blocking && blockReasons[toolName]) {
			return { block: true, reason: blockReasons[toolName] };
		}
	});
}

function registerPipelineCommands(
	pi: ExtensionAPI,
	ctx: ExtensionContext,
	getState: () => typeof import("../types.ts").emptyPipelineState extends () => infer R ? R : never,
	setState: (s: typeof import("../types.ts").emptyPipelineState extends () => infer R ? R : never) => void,
): void {
	const state = getState;
	const set = setState;

	// /plan command
	pi.registerCommand("plan", {
		description: "Plan mode: /plan <task>, /plan deepen, /plan go, /plan status, /plan review",
		async handler(args: string, cmdCtx: ExtensionCommandContext) {
			const { config } = loadConfig(ctx.cwd);
			const arg = args?.trim().toLowerCase() ?? "";

			if (arg.startsWith("deepen")) {
				const result = handlePlanDeepen(state(), (t) => t); // identity analyzer as default
				set(result.state);
				cmdCtx.ui.notify(result.message);
			} else if (arg === "go") {
				const result = handlePlanGo(state());
				set(result.state);
				cmdCtx.ui.notify(result.message);
			} else if (arg === "status") {
				const result = handlePlanStatus(state());
				cmdCtx.ui.notify(result.message);
			} else if (arg === "review") {
				const { createSpecComplianceReview, createCodeQualityReview } = await import("../review/two-stage.ts");
				const stage1 = createSpecComplianceReview();
				const stage2 = createCodeQualityReview();
				const result = handlePlanReview(state(), stage1, stage2);
				set(result.state);
				cmdCtx.ui.notify(result.message);
			} else {
				// Use the original (non-lowered) args for the task description
				const taskArgs = args?.trim() ?? "";
				const result = handlePlan(taskArgs, state(), config);
				set(result.state);
				cmdCtx.ui.notify(result.message);
			}
		},
	});

	// /verify command
	pi.registerCommand("verify", {
		description: "Run verification gates: /verify, /verify evidence",
		async handler(args: string, cmdCtx: ExtensionCommandContext) {
			const { config } = loadConfig(ctx.cwd);
			const arg = args?.trim().toLowerCase() ?? "";

			if (arg === "evidence") {
				const taskCtx = {
					changedFiles: [],
					assistantOutput: "",
					hasLsp: false,
					cwd: ctx.cwd,
				};
				const result = handleVerifyEvidence(state(), taskCtx);
				cmdCtx.ui.notify(result.message);
			} else {
				const taskCtx = {
					changedFiles: [],
					assistantOutput: "",
					hasLsp: false,
					cwd: ctx.cwd,
				};
				const result = handleVerify(state(), taskCtx, config);
				set(result.state);
				cmdCtx.ui.notify(result.message);

				// Emit verify:passed event when all gates pass
				if (result.allPassed) {
					pi.events.emit("verify:passed", {
						timestamp: new Date().toISOString(),
						cwd: ctx.cwd,
						gates: result.results?.map((r) => r.gateId) ?? [],
					});
				}
			}
		},
	});

	// /clarify command
	pi.registerCommand("clarify", {
		description: "Force clarification: /clarify <message>",
		async handler(args: string, cmdCtx: ExtensionCommandContext) {
			const { config } = loadConfig(ctx.cwd);
			const message = args?.trim() ?? "";
			if (!message) {
				cmdCtx.ui.notify("Usage: /clarify <message to analyze>");
				return;
			}
			const result = handleClarify(message, state(), config);
			set(result.state);
			cmdCtx.ui.notify(result.message);
		},
	});

	// /go command
	pi.registerCommand("go", {
		description: "Start execution of the current plan",
		async handler(_args: string, cmdCtx: ExtensionCommandContext) {
			const { config } = loadConfig(ctx.cwd);
			const result = handleGo(state(), config);
			set(result.state);
			cmdCtx.ui.notify(result.message);
		},
	});
}
