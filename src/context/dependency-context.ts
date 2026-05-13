/**
 * Dependency Context - Pattern from pi-crew task-output-context.ts
 * 
 * Aggregates results from dependent pipeline stages.
 */

export interface StageResult {
  stageId: string;
  role: string;
  status: "pending" | "running" | "completed" | "failed";
  output: string;
  structuredOutput?: Record<string, unknown>;
  artifacts?: string[];
  usage?: {
    inputTokens: number;
    outputTokens: number;
    durationMs: number;
  };
}

export interface DependencyContext {
  dependencies: StageResult[];
  sharedReads: Array<{
    name: string;
    content: string;
  }>;
}

export interface PipelineTask {
  id: string;
  stepId: string;
  dependsOn: string[];
  status: string;
  resultArtifact?: {
    path: string;
  };
}

/**
 * Collect results from completed dependencies
 */
export function collectDependencyContext(
  tasks: PipelineTask[],
  currentTask: PipelineTask,
  readArtifact: (path: string) => string | undefined
): DependencyContext {
  const taskMap = new Map(tasks.map(t => [t.id, t]));
  
  // Get dependency results
  const dependencies: StageResult[] = [];
  
  for (const depId of currentTask.dependsOn) {
    const depTask = taskMap.get(depId);
    if (!depTask) continue;
    
    let output = "";
    if (depTask.resultArtifact) {
      output = readArtifact(depTask.resultArtifact.path) ?? "";
    }
    
    // Try to parse as JSON for structured output
    let structuredOutput: Record<string, unknown> | undefined;
    try {
      structuredOutput = JSON.parse(output);
    } catch {
      // Not JSON, use raw text
    }
    
    dependencies.push({
      stageId: depTask.id,
      role: depTask.stepId,
      status: depTask.status as StageResult["status"],
      output,
      structuredOutput,
    });
  }
  
  return { dependencies, sharedReads: [] };
}

/**
 * Format dependency context for prompt
 */
export function formatDependencyContext(context: DependencyContext): string {
  const parts: string[] = [];
  
  if (context.dependencies.length > 0) {
    parts.push("## Dependencies");
    
    for (const dep of context.dependencies) {
      parts.push(`\n### ${dep.stageId} (${dep.status})`);
      
      if (dep.output) {
        // Truncate long outputs
        const truncated = dep.output.length > 2000 
          ? dep.output.slice(0, 2000) + "\n...(truncated)"
          : dep.output;
        parts.push(truncated);
      }
      
      if (dep.structuredOutput) {
        parts.push(`\nStructured output:\n\`\`\`json\n${JSON.stringify(dep.structuredOutput, null, 2)}\n\`\`\``);
      }
    }
  }
  
  return parts.join("\n");
}
