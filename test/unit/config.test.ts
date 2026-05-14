import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { loadConfig, DEFAULT_CONFIG, deepMerge } from "../../src/config.ts";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

describe("DEFAULT_CONFIG", () => {
	test("has expected defaults", () => {
		assert.equal(DEFAULT_CONFIG.enabled, true);
		assert.equal(DEFAULT_CONFIG.clarification.enabled, true);
		assert.equal(DEFAULT_CONFIG.clarification.ambiguityThreshold, 0.5);
		assert.equal(DEFAULT_CONFIG.clarification.mode, "auto");
		assert.equal(DEFAULT_CONFIG.clarification.maxQuestions, 5);
		assert.equal(DEFAULT_CONFIG.clarification.socraticForComplex, true);
		assert.equal(DEFAULT_CONFIG.plan.enabled, true);
		assert.equal(DEFAULT_CONFIG.plan.noPlaceholders, true);
		assert.equal(DEFAULT_CONFIG.plan.maxTasksPerPlan, 20);
		assert.equal(DEFAULT_CONFIG.verification.enabled, true);
		assert.deepEqual(DEFAULT_CONFIG.verification.gates, ["tests", "typecheck", "lint", "regression", "evidence"]);
		assert.deepEqual(DEFAULT_CONFIG.verification.blockingGates, ["tests", "typecheck", "regression", "evidence"]);
		assert.equal(DEFAULT_CONFIG.verification.stopTheLine, true);
		assert.equal(DEFAULT_CONFIG.verification.tddGate, false);
		assert.equal(DEFAULT_CONFIG.review.enabled, true);
		assert.equal(DEFAULT_CONFIG.review.twoStage, true);
		assert.equal(DEFAULT_CONFIG.adaptive.enabled, true);
		assert.equal(DEFAULT_CONFIG.adaptive.simplePipeline.length, 3);
		assert.equal(DEFAULT_CONFIG.adaptive.mediumPipeline.length, 5);
		assert.equal(DEFAULT_CONFIG.adaptive.complexPipeline.length, 6);
	});
});

describe("loadConfig", () => {
	test("returns defaults when no config file exists", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-pipeline-test-"));
		try {
			const { config, source } = loadConfig(dir);
			assert.equal(source, "defaults");
			assert.equal(config.enabled, true);
			assert.equal(config.clarification.ambiguityThreshold, 0.5);
			assert.equal(config.plan.noPlaceholders, true);
		} finally {
			fs.rmSync(dir, { recursive: true });
		}
	});

	test("reads .pi/pi-pipeline.json", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-pipeline-test-"));
		try {
			fs.mkdirSync(path.join(dir, ".pi"), { recursive: true });
			fs.writeFileSync(path.join(dir, ".pi", "pi-pipeline.json"), JSON.stringify({
				enabled: false,
				clarification: { ambiguityThreshold: 0.7 },
				verification: { tddGate: true, stopTheLine: false },
			}));
			const { config, source } = loadConfig(dir);
			assert.equal(source, "file");
			assert.equal(config.enabled, false);
			assert.equal(config.clarification.ambiguityThreshold, 0.7);
			assert.equal(config.verification.tddGate, true);
			assert.equal(config.verification.stopTheLine, false);
			// Defaults preserved
			assert.equal(config.clarification.enabled, true);
			assert.equal(config.plan.noPlaceholders, true);
		} finally {
			fs.rmSync(dir, { recursive: true });
		}
	});

	test("handles malformed JSON gracefully", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-pipeline-test-"));
		try {
			fs.mkdirSync(path.join(dir, ".pi"), { recursive: true });
			fs.writeFileSync(path.join(dir, ".pi", "pi-pipeline.json"), "not json {{{");
			const { config, source } = loadConfig(dir);
			assert.equal(source, "defaults");
			assert.equal(config.enabled, true);
		} finally {
			fs.rmSync(dir, { recursive: true });
		}
	});

	test("handles non-object root gracefully", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-pipeline-test-"));
		try {
			fs.mkdirSync(path.join(dir, ".pi"), { recursive: true });
			fs.writeFileSync(path.join(dir, ".pi", "pi-pipeline.json"), "42");
			const { config, source } = loadConfig(dir);
			assert.equal(source, "defaults");
		} finally {
			fs.rmSync(dir, { recursive: true });
		}
	});

	test("deep-merges nested objects: only override nested field without losing siblings", () => {
		const dir = fs.mkdtempSync(path.join(os.tmpdir(), "pi-pipeline-test-"));
		try {
			fs.mkdirSync(path.join(dir, ".pi"), { recursive: true });
			fs.writeFileSync(path.join(dir, ".pi", "pi-pipeline.json"), JSON.stringify({
				clarification: { mode: "manual" },
			}));
			const { config } = loadConfig(dir);
			// Deep merge: only mode overridden, other clarification fields preserved
			assert.equal(config.clarification.mode, "manual");
			assert.equal(config.clarification.enabled, true);
			assert.equal(config.clarification.ambiguityThreshold, 0.5);
			assert.equal(config.clarification.maxQuestions, 5);
			assert.equal(config.clarification.socraticForComplex, true);
		} finally {
			fs.rmSync(dir, { recursive: true });
		}
	});

	test("deepMerge utility exports and works correctly", () => {
		const base = { a: 1, b: { c: 2, d: 3 }, e: [1, 2] };
		const override = { b: { c: 99 }, f: 10 };
		const result = deepMerge(base as Record<string, unknown>, override) as Record<string, unknown>;
		assert.equal(result.a, 1);
		assert.equal((result.b as Record<string, unknown>).c, 99);
		assert.equal((result.b as Record<string, unknown>).d, 3); // sibling preserved
		assert.equal(result.f, 10);
		assert.ok(Array.isArray(result.e)); // arrays replaced, not merged
	});
});
