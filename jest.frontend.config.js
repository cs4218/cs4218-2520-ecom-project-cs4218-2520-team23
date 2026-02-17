export default {
	// name displayed during tests
	displayName: "frontend",

	// simulates browser environment in jest
	// e.g., using document.querySelector in your tests
	testEnvironment: "jest-environment-jsdom",

	// jest does not recognise jsx files by default, so we use babel to transform any jsx files
	transform: {
		"^.+\\.jsx?$": "babel-jest",
	},

	// tells jest how to handle css/scss imports in your tests
	moduleNameMapper: {
		"\\.(css|scss)$": "identity-obj-proxy",
	},

	moduleDirectories: ['node_modules', 'client/node_modules'],

	// ignore all node_modules except styleMock (needed for css imports), and react-icons (needed for icon imports)
	transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js|react-icons)/)"],

	// only run these tests
	// testMatch: ["<rootDir>/client/src/pages/Auth/*.test.js"],
	testMatch: ["<rootDir>/client/src/pages/**/*.test.{js,jsx,ts,tsx}"],

	// jest code coverage
	collectCoverage: true,
	collectCoverageFrom: ["client/src/pages/**/*.{js,jsx}"],
	coverageThreshold: {
		global: {
			lines: 100,
			functions: 100,
		},
	},
	setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
