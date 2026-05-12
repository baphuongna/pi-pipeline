import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { SOCRATIC_PHASES, generateSocraticQuestions, nextPhase } from "../../src/clarify/socratic.ts";

describe("SOCRATIC_PHASES", () => {
	test("has 5 phases", () => {
		assert.equal(SOCRATIC_PHASES.length, 5);
	});

	test("each phase has name, prompt, and questions", () => {
		for (const phase of SOCRATIC_PHASES) {
			assert.ok(phase.name.length > 0);
			assert.ok(phase.prompt.length > 0);
			assert.ok(phase.questions.length > 0);
		}
	});

	test("phases are in correct order", () => {
		assert.equal(SOCRATIC_PHASES[0].name, "Scope Discovery");
		assert.equal(SOCRATIC_PHASES[1].name, "Constraint Exploration");
		assert.equal(SOCRATIC_PHASES[2].name, "Edge Case Discovery");
		assert.equal(SOCRATIC_PHASES[3].name, "Acceptance Criteria");
		assert.equal(SOCRATIC_PHASES[4].name, "Priority Clarification");
	});
});

describe("generateSocraticQuestions", () => {
	test("returns prompt + questions for complex tasks", () => {
		const qs = generateSocraticQuestions("build an auth system", "complex", 0);
		assert.ok(qs.length >= 2);
		assert.equal(qs[0], SOCRATIC_PHASES[0].prompt);
	});

	test("returns only prompt for non-complex tasks", () => {
		const qs = generateSocraticQuestions("fix a typo", "simple", 0);
		assert.equal(qs.length, 1);
		assert.equal(qs[0], SOCRATIC_PHASES[0].prompt);
	});

	test("returns empty for invalid phase", () => {
		const qs = generateSocraticQuestions("test", "simple", -1);
		assert.equal(qs.length, 0);
		const qs2 = generateSocraticQuestions("test", "simple", 99);
		assert.equal(qs2.length, 0);
	});
});

describe("nextPhase", () => {
	test("advances when ambiguity is low", () => {
		assert.equal(nextPhase(0, 0.2), 1);
		assert.equal(nextPhase(1, 0.1), 2);
	});

	test("stays when ambiguity is high", () => {
		assert.equal(nextPhase(0, 0.5), 0);
		assert.equal(nextPhase(2, 0.8), 2);
	});

	test("does not advance past last phase", () => {
		assert.equal(nextPhase(4, 0.1), 4);
	});
});
