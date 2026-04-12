const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
	testMatch: ["**/tests/ui/**/*.spec.js", "**/e2e/**/*.spec.js"],
	timeout: 45 * 1000,
	expect: {
		timeout: 10 * 1000,
	},
	fullyParallel: false,
	retries: 0,
	workers: 1,
	reporter: "list",
	use: {
		baseURL: "http://127.0.0.1:3000",
		trace: "on-first-retry",
		screenshot: "only-on-failure",
		video: "retain-on-failure",
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
