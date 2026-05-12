import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { buildFreshContextConfig, validateFreshContextConfig } from "../../src/verify/fresh-context.ts";
import { createPlan } from "../../src/plan/plan-mode.ts";

describe("buildFreshContextConfig", () => {
	test("returns correct config", () => {
		const plan = createPlan("Test");
		const config = buildFreshContextConfig(plan);
		assert.ok(config.inherit.includes("plan"));
		assert.ok(config.inherit.includes("changed_files"));
		assert.ok(config.exclude.includes("implementation_chat"));
		assert.ok(config.exclude.includes("previous_reviews"));
		assert.ok(config.exclude.includes("agent_rationale"));
		assert.equal(config.freshContext, true);
	});
});

describe("validateFreshContextConfig", () => {
	test("passes for valid config", () => {
		const config = buildFreshContextConfig(createPlan("Test"));
		const errors = validateFreshContextConfig(config);
		assert.equal(errors.length, 0);
	});

	test("fails when plan is not inherited", () => {
		const errors = validateFreshContextConfig({
			inherit: ["changed_files"],
			exclude: ["implementation_chat"],
			freshContext: true,
		});
		assert.ok(errors.some((e) => e.includes("plan")));
	});

	test("fails when implementation_chat is not excluded", () => {
		const errors = validateFreshContextConfig({
			inherit: ["plan", "changed_files"],
			exclude: [],
			freshContext: true,
		});
		assert.ok(errors.some((e) => e.includes("implementation_chat")));
	});

	test("fails when freshContext is false", () => {
		const errors = validateFreshContextConfig({
			inherit: ["plan", "changed_files"],
			exclude: ["implementation_chat"],
			freshContext: false,
		});
		assert.ok(errors.some((e) => e.includes("enabled")));
	});
});
