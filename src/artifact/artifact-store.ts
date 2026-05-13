/**
 * Artifact Store - Pattern from pi-crew artifact-store.ts
 * 
 * Atomic artifact writing with content hash for integrity.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createHash } from "node:crypto";

export type ArtifactKind = 
  | "prompt" | "result" | "log" | "metadata" 
  | "diff" | "transcript" | "evidence" | "snapshot";

export interface ArtifactDescriptor {
  kind: ArtifactKind;
  path: string;
  relativePath: string;
  createdAt: string;
  producer: string;
  sizeBytes: number;
  contentHash: string;
  retention: "run" | "session" | "permanent";
}

export interface WriteArtifactOptions {
  root: string;
  kind: ArtifactKind;
  relativePath: string;
  content: string;
  producer: string;
  retention?: ArtifactDescriptor["retention"];
}

function hashContent(content: string): string {
  return createHash("sha256").update(content).digest("hex");
}

function resolveArtifactPath(baseDir: string, relativePath: string): string {
  const normalized = relativePath.replaceAll("\\", "/").replace(/^\.\/+/, "");
  if (!normalized || normalized.includes("..") || path.isAbsolute(normalized)) {
    throw new Error(`Invalid artifact path: ${relativePath}`);
  }
  
  const base = path.resolve(baseDir);
  const resolved = path.resolve(base, normalized);
  const relative = path.relative(base, resolved);
  
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    throw new Error(`Path traversal detected: ${relativePath}`);
  }
  
  return resolved;
}

export function writeArtifact(options: WriteArtifactOptions): ArtifactDescriptor {
  const { root, kind, relativePath, content, producer, retention = "run" } = options;
  
  fs.mkdirSync(root, { recursive: true });
  
  const filePath = resolveArtifactPath(root, relativePath);
  const dir = path.dirname(filePath);
  fs.mkdirSync(dir, { recursive: true });
  
  const contentHash = hashContent(content);
  
  // Atomic write using rename
  const tempPath = `${filePath}.tmp.${Date.now()}`;
  fs.writeFileSync(tempPath, content, "utf-8");
  fs.renameSync(tempPath, filePath);
  
  const stats = fs.statSync(filePath);
  
  return {
    kind,
    path: filePath,
    relativePath,
    createdAt: new Date().toISOString(),
    producer,
    sizeBytes: stats.size,
    contentHash,
    retention,
  };
}

export function readArtifact(relativePath: string, root: string): string | undefined {
  try {
    const filePath = resolveArtifactPath(root, relativePath);
    return fs.readFileSync(filePath, "utf-8");
  } catch {
    return undefined;
  }
}

export function verifyArtifact(artifact: ArtifactDescriptor, root: string): boolean {
  const content = readArtifact(artifact.relativePath, root);
  if (!content) return false;
  
  const hash = hashContent(content);
  return hash === artifact.contentHash;
}

/**
 * Cleanup artifacts older than maxAgeDays
 */
export function cleanupArtifacts(
  root: string,
  maxAgeDays: number,
  markerFile = ".last-cleanup"
): number {
  if (!fs.existsSync(root)) return 0;
  
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - maxAgeMs;
  let cleaned = 0;
  
  // Check marker file
  const markerPath = path.join(root, markerFile);
  if (fs.existsSync(markerPath)) {
    const markerMtime = fs.statSync(markerPath).mtimeMs;
    if (Date.now() - markerMtime < 24 * 60 * 60 * 1000) {
      return 0; // Recently cleaned
    }
  }
  
  try {
    const entries = fs.readdirSync(root, { withFileTypes: true });
    
    for (const entry of entries) {
      if (entry.name === markerFile) continue;
      
      const target = path.join(root, entry.name);
      try {
        const stat = fs.statSync(target);
        if (stat.mtimeMs < cutoff) {
          if (stat.isDirectory()) {
            fs.rmSync(target, { recursive: true, force: true });
          } else {
            fs.unlinkSync(target);
          }
          cleaned++;
        }
      } catch {
        // Ignore errors
      }
    }
    
    // Write marker
    fs.writeFileSync(markerPath, String(Date.now()), "utf-8");
  } catch {
    // Ignore errors
  }
  
  return cleaned;
}
