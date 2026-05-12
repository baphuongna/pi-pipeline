import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { selectPipeline, describePipeline, hasStep } from "../../src/adaptive/pipeline-selector.ts";
import { DEFAULT_CONFIG } from "../../src/config.ts";

describe("selectPipeline", () => {
	test("selects simple pipeline for simple complexity", () => {
		const pipeline = selectPipeline("simple", DEFAULT_CONFIG);
		assert.equal(pipeline.level, "simple");
		assert.deepEqual(pipeline.steps, DEFAULT_CONFIG.adaptive.simplePipeline);
	});

	test("selects medium pipeline for medium complexity", () => {
		const pipeline = selectPipeline("medium", DEFAULT_CONFIG);
		assert.equal(pipeline.level, "medium");
		assert.deepEqual(pipeline.steps, DEFAULT_CONFIG.adaptive.mediumPipeline);
	});

	test("selects complex pipeline for complex complexity", () => {
		const pipeline = selectPipeline("complex", DEFAULT_CONFIG);
		assert.equal(pipeline.level, "complex");
		assert.deepEqual(pipeline.steps, DEFAULT_CONFIG.adaptive.complexPipeline);
	});
});

describe("describePipeline", () => {
	test("formats pipeline description", () => {
		const pipeline = selectPipeline("simple", DEFAULT_CONFIG);
		const desc = describePipeline(pipeline);
		assert.ok(desc.includes("simple"));
		assert.ok(desc.includes("→"));
	});
});

describe("hasStep", () => {
	test("detects existing step", () => {
		const pipeline = selectPipeline("simple", DEFAULT_CONFIG);
		assert.equal(hasStep(pipeline, "verify"), true);
	});

	test("detects missing step", () => {
		const pipeline = selectPipeline("simple", DEFAULT_CONFIG);
		assert.equal(hasStep(pipeline, "interview"), false);
	});

	test("complex pipeline has interview step", () => {
		const pipeline = selectPipeline("complex", DEFAULT_CONFIG);
		assert.equal(hasStep(pipeline, "interview"), true);
	});
});
