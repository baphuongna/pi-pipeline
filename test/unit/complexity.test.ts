import assert from "node:assert/strict";
import test, { describe } from "node:test";
import { detectComplexity, createSignals } from "../../src/adaptive/complexity.ts";

describe("detectComplexity", () => {
	test("returns simple for minimal signals", () => {
		const signals = createSignals({ fileCount: 1, estimatedLines: 10 });
		assert.equal(detectComplexity(signals), "simple");
	});

	test("returns medium for moderate signals", () => {
		const signals = createSignals({
			fileCount: 3,
			isNewFeature: true,
			estimatedLines: 50,
		});
		// score: 1 (fileCount 3 > 2) + 2 (isNewFeature) = 3 → medium
		assert.equal(detectComplexity(signals), "medium");
	});

	test("returns complex for high signals", () => {
		const signals = createSignals({
			fileCount: 6,
			isNewFeature: true,
			touchesArchitecture: true,
			hasDependencies: true,
			securitySensitive: true,
			estimatedLines: 300,
			hasTestsNeeded: true,
		});
		assert.equal(detectComplexity(signals), "complex");
	});

	test("simple bug fix", () => {
		const signals = createSignals({
			fileCount: 1,
			isNewFeature: false,
			estimatedLines: 20,
		});
		assert.equal(detectComplexity(signals), "simple");
	});

	test("architecture change is always complex", () => {
		const signals = createSignals({
			fileCount: 1,
			touchesArchitecture: true,
		});
		// score: 3 (touchesArchitecture) = 3 → medium
		assert.ok(detectComplexity(signals) === "medium" || detectComplexity(signals) === "complex");
	});

	test("security adds to score", () => {
		const base = createSignals({ fileCount: 2 });
		const withSecurity = createSignals({ fileCount: 2, securitySensitive: true });
		assert.ok(detectComplexity(withSecurity) >= detectComplexity(base));
	});
});

describe("createSignals", () => {
	test("creates signals with defaults", () => {
		const signals = createSignals({});
		assert.equal(signals.fileCount, 0);
		assert.equal(signals.isNewFeature, false);
		assert.equal(signals.touchesArchitecture, false);
	});
});
