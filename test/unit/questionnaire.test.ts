import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { generateQuestionnaire, formatQuestionnaire } from "../../src/clarify/questionnaire.ts";
import type { AmbiguitySignal } from "../../src/types.ts";

describe("generateQuestionnaire", () => {
	test("generates questions from vague_action signal", () => {
		const signals: AmbiguitySignal[] = [{ type: "vague_action", score: 0.5 }];
		const q = generateQuestionnaire("improve the code", signals);
		assert.equal(q.questions.length, 1);
		assert.equal(q.questions[0].id, "q_vague_action");
		assert.equal(q.questions[0].type, "single_choice");
		assert.ok(q.questions[0].options);
		assert.ok(q.questions[0].options!.length >= 4);
		assert.equal(q.questions[0].required, true);
	});

	test("generates questions from no_files signal", () => {
		const signals: AmbiguitySignal[] = [{ type: "no_files", score: 0.3 }];
		const q = generateQuestionnaire("fix it", signals);
		assert.equal(q.questions.length, 1);
		assert.equal(q.questions[0].id, "q_no_files");
		assert.equal(q.questions[0].type, "text");
	});

	test("generates questions from security_sensitive signal", () => {
		const signals: AmbiguitySignal[] = [{ type: "security_sensitive", score: 0.6 }];
		const q = generateQuestionnaire("fix auth", signals);
		assert.equal(q.questions.length, 1);
		assert.equal(q.questions[0].type, "multi_choice");
	});

	test("generates multiple questions from multiple signals", () => {
		const signals: AmbiguitySignal[] = [
			{ type: "vague_action", score: 0.5 },
			{ type: "unclear_scope", score: 0.4 },
		];
		const q = generateQuestionnaire("improve everything", signals);
		assert.equal(q.questions.length, 2);
	});

	test("returns empty questionnaire for no signals", () => {
		const q = generateQuestionnaire("clear task", []);
		assert.equal(q.questions.length, 0);
	});
});

describe("formatQuestionnaire", () => {
	test("formats questions with options", () => {
		const q = generateQuestionnaire("improve the code", [
			{ type: "vague_action", score: 0.5 },
		]);
		const formatted = formatQuestionnaire(q);
		assert.ok(formatted.includes("1."));
		assert.ok(formatted.includes("a)"));
	});

	test("formats text questions without options", () => {
		const q = generateQuestionnaire("fix it", [
			{ type: "no_files", score: 0.3 },
		]);
		const formatted = formatQuestionnaire(q);
		assert.ok(formatted.includes("1."));
		assert.ok(!formatted.includes("a)"));
	});
});
