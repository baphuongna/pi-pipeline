import type { ExtensionAPI, ToolDefinition } from "@mariozechner/pi-coding-agent";
import { Type } from "typebox";

interface PipelineToolResult {
	content: Array<{ type: "text"; text: string }>;
	details: { tool: string; status: "ok" | "error" };
	isError?: boolean;
}

function pipelineResult(text: string, isError = false): PipelineToolResult {
	return {
		content: [{ type: "text", text }],
		details: { tool: "pi-pipeline", status: isError ? "error" : "ok" },
		...(isError ? { isError: true as const } : {}),
	};
}

export function registerPipelineTools(pi: ExtensionAPI): void {
	// pipeline_status
	pi.registerTool({
		name: "pipeline_status",
		label: "Pipeline Status",
		description: "Get the current pipeline state including plan mode, task progress, and complexity level.",
		parameters: Type.Object({}) as never,
		async execute(_id, _params, _signal, _onUpdate, _ctx) {
			try {
				// Return a placeholder status — real state is in the session
				return pipelineResult("Pipeline status: use /plan status for current state.");
			} catch (error) {
				return pipelineResult(error instanceof Error ? error.message : String(error), true);
			}
		},
	} satisfies ToolDefinition);

	// pipeline_verify
	pi.registerTool({
		name: "pipeline_verify",
		label: "Pipeline Verify",
		description: "Run verification gates for the current task. Checks tests, typecheck, lint, regression, and evidence completeness.",
		parameters: Type.Object({
			testCommand: Type.Optional(Type.String({ description: "Test command to run for verification." })),
			changedFiles: Type.Optional(Type.Array(Type.String(), { description: "List of changed files." })),
			assistantOutput: Type.Optional(Type.String({ description: "Recent assistant output for evidence check." })),
		}) as never,
		async execute(_id, params, _signal, _onUpdate, _ctx) {
			const p = params as {
				testCommand?: string;
				changedFiles?: string[];
				assistantOutput?: string;
			};

			try {
				const { runGates } = await import("../verify/gates.ts");
				const { checkStopTheLine, formatStopTheLine } = await import("../verify/stop-the-line.ts");

				const ctx = {
					testCommand: p.testCommand,
					changedFiles: p.changedFiles ?? [],
					assistantOutput: p.assistantOutput ?? "",
					hasLsp: false,
					cwd: _ctx.cwd,
				};

				const gateIds = ["tests", "typecheck", "lint", "regression", "evidence"];
				const results = runGates(ctx, gateIds);
				const blockingIds = ["tests", "typecheck", "regression", "evidence"];
				const stopResult = checkStopTheLine(results, blockingIds);

				const parts: string[] = [];
				if (stopResult.blocked) {
					parts.push(formatStopTheLine(stopResult));
					parts.push("");
				}

				parts.push("Gate Results:");
				for (const r of results) {
					parts.push(`  ${r.passed ? "✅" : "❌"} ${r.gateId}: ${r.message}`);
				}

				return pipelineResult(parts.join("\n"));
			} catch (error) {
				return pipelineResult(error instanceof Error ? error.message : String(error), true);
			}
		},
	} satisfies ToolDefinition);
}
