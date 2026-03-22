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

	moduleDirectories: ["node_modules", "client/node_modules"],

	// ignore all node_modules except styleMock (needed for css imports), and react-icons (needed for icon imports)
	transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js|react-icons)/)"],

	// only run these tests
	testMatch: [
		"<rootDir>/client/src/**/*.test.js",
		"<rootDir>/client/src/hooks/useCategory.test.js",
		"<rootDir>/client/src/pages/Categories.test.js",
		"<rootDir>/client/src/pages/CartPage.test.js",
		"<rootDir>/client/src/context/cart.test.js",
		"<rootDir>/client/src/pages/**/*.test.{js,jsx,ts,tsx}",
		"<rootDir>/client/src/components/**/*.test.{js,jsx,ts,tsx}",
		"<rootDir>/client/src/components/**/*.integration.test.{js,jsx,ts,tsx}",
		"<rootDir>/client/src/pages/**/*.integration.test.{js,jsx,ts,tsx}",
	],

	// jest code coverage
	collectCoverage: true,
	coverageDirectory: "<rootDir>/coverage/frontend",
	collectCoverageFrom: [
		"client/src/**/*.{js,jsx}",
		"!client/src/**/*.test.{js,jsx,ts,tsx}",
		"!client/src/**/*.integration.test.{js,jsx,ts,tsx}",
		"!client/src/**/__mocks__/**",
		"!client/src/setupTests.js",
		"!client/src/_site/**",
	],
	coverageThreshold: {
		global: {
			lines: 90,
			functions: 90,
		},
	},
	setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
