import assert from "node:assert/strict";
import test from "node:test";
import * as fs from "node:fs";
import * as path from "node:path";
import { writeArtifact, readArtifact, cleanupArtifacts } from "../../src/artifact/artifact-store.ts";

const TEST_ROOT = "/tmp/test-artifacts-cleanup-v2";

test("writeArtifact - creates artifact with hash", () => {
  fs.rmSync(TEST_ROOT, { recursive: true, force: true });
  
  const artifact = writeArtifact({
    root: TEST_ROOT,
    kind: "result",
    relativePath: "test.txt",
    content: "Hello World",
    producer: "test",
  });
  
  assert.strictEqual(artifact.kind, "result");
  assert.strictEqual(artifact.contentHash.length, 64); // SHA256
  assert.ok(fs.existsSync(artifact.path));
  assert.strictEqual(artifact.producer, "test");
  assert.strictEqual(artifact.retention, "run");
});

test("readArtifact - reads artifact content", () => {
  const content = readArtifact("test.txt", TEST_ROOT);
  assert.strictEqual(content, "Hello World");
});

test("readArtifact - returns undefined for missing", () => {
  const content = readArtifact("missing.txt", TEST_ROOT);
  assert.strictEqual(content, undefined);
});

test("writeArtifact - handles nested paths", () => {
  const artifact = writeArtifact({
    root: TEST_ROOT,
    kind: "metadata",
    relativePath: "nested/deep/path.txt",
    content: "Nested content",
    producer: "test",
  });
  
  assert.ok(fs.existsSync(artifact.path));
  const content = readArtifact("nested/deep/path.txt", TEST_ROOT);
  assert.strictEqual(content, "Nested content");
});

test("cleanupArtifacts - respects 24h grace period", () => {
  // Cleanup has 24h grace period - it won't clean if recently cleaned
  const cleaned = cleanupArtifacts(TEST_ROOT, 1);
  assert.strictEqual(cleaned, 0); // Grace period not elapsed
});
