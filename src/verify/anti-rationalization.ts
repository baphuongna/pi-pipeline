export interface AntiRationalizationEntry {
	excuse: string;
	reality: string;
}

export const ANTI_RATIONALIZATION: AntiRationalizationEntry[] = [
	{
		excuse: "The test is flaky",
		reality: "Fix the test or fix the code. There is no such thing as a flaky test, only an unreliable one.",
	},
	{
		excuse: "This is just a minor issue",
		reality: "Minor issues compound into major bugs. Fix it now.",
	},
	{
		excuse: "I'll add tests later",
		reality: "Later never comes. Write the test now.",
	},
	{
		excuse: "The existing code doesn't have tests",
		reality: "Be the change you want to see. Start the testing tradition.",
	},
	{
		excuse: "It works on my machine",
		reality: "Then make it work everywhere. That's what tests are for.",
	},
	{
		excuse: "This is a simple change, no need for tests",
		reality: "Simple changes cause the most bugs because they're not taken seriously.",
	},
	{
		excuse: "I don't know how to test this",
		reality: "That's exactly why you should test it — to learn how.",
	},
	{
		excuse: "The test would be too complex",
		reality: "If the test is too complex, the code is too complex. Simplify both.",
	},
	{
		excuse: "I've manually verified it works",
		reality: "Manual verification doesn't survive the next change. Automate it.",
	},
	{
		excuse: "It's just a prototype",
		reality: "Prototypes have a way of becoming production. Test it.",
	},
	{
		excuse: "I don't have time to write tests",
		reality: "You have time to debug later? Write the test now.",
	},
	{
		excuse: "The reviewer will catch issues",
		reality: "Reviewers are human. Tests are not. Both are needed.",
	},
];

/**
 * Match an anti-rationalization entry from text.
 * Returns the first matching entry, or undefined.
 */
export function matchAntiRationalization(text: string): AntiRationalizationEntry | undefined {
	const lower = text.toLowerCase();
	return ANTI_RATIONALIZATION.find((entry) => lower.includes(entry.excuse.toLowerCase()));
}
