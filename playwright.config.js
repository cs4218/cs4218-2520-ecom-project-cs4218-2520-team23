const { defineConfig, devices } = require("@playwright/test");

module.exports = defineConfig({
	testMatch: ["**/tests/ui/**/*.spec.js", "**/tests/ui/**/*.spec.ts", "**/e2e/**/*.spec.js", "**/e2e/**/*.spec.ts"],
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
	webServer: {
		command: "BROWSER=none npm run client",
		port: 3000,
		timeout: 120 * 1000,
		reuseExistingServer: true,
	},
	projects: [
		{
			name: "chromium",
			use: { ...devices["Desktop Chrome"] },
		},
	],
});
