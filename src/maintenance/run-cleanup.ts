/**
 * Run Cleanup - Pattern from pi-crew run-maintenance.ts
 * 
 * Pruning of old pipeline runs with audit trail.
 */

import * as fs from "node:fs";
import * as path from "node:path";

export interface CleanupResult {
  kept: string[];
  removed: string[];
  auditPath?: string;
  bytesFreed: number;
}

export interface PipelineRun {
  runId: string;
  status: string;
  stateRoot: string;
  artifactsRoot: string;
  updatedAt: string;
  createdAt: string;
}

export function isFinished(status: string): boolean {
  return status === "completed" || status === "failed" || 
         status === "cancelled" || status === "skipped";
}

export function pruneRuns(
  runs: PipelineRun[],
  options: {
    keep?: number;
    maxAgeDays?: number;
    cwd?: string;
  } = {}
): CleanupResult {
  const { keep = 10, maxAgeDays = 7 } = options;
  
  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  
  // Sort by updatedAt descending
  const sorted = [...runs].sort((a, b) => 
    b.updatedAt.localeCompare(a.updatedAt)
  );
  
  // Split into keep and remove
  const kept: string[] = [];
  const removed: string[] = [];
  let bytesFreed = 0;
  
  for (let i = 0; i < sorted.length; i++) {
    const run = sorted[i];
    const ageMs = now - new Date(run.updatedAt).getTime();
    
    // Keep recent runs
    if (i < keep) {
      kept.push(run.runId);
      continue;
    }
    
    // Keep unfinished runs
    if (!isFinished(run.status)) {
      kept.push(run.runId);
      continue;
    }
    
    // Remove old finished runs
    if (ageMs > maxAgeMs) {
      const removedBytes = getDirectorySize(run.stateRoot) + 
                          getDirectorySize(run.artifactsRoot);
      
      try {
        fs.rmSync(run.stateRoot, { recursive: true, force: true });
        fs.rmSync(run.artifactsRoot, { recursive: true, force: true });
        removed.push(run.runId);
        bytesFreed += removedBytes;
      } catch (err) {
        console.error(`Failed to remove run ${run.runId}:`, err);
      }
    } else {
      kept.push(run.runId);
    }
  }
  
  return { kept, removed, bytesFreed };
}

function getDirectorySize(dir: string): number {
  if (!fs.existsSync(dir)) return 0;
  
  let size = 0;
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        size += getDirectorySize(fullPath);
      } else {
        size += fs.statSync(fullPath).size;
      }
    }
  } catch {
    // Ignore errors
  }
  return size;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}
