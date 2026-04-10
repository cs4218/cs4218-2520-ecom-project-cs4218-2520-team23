export default {
  // display name
  displayName: "backend",

  // when testing backend
  testEnvironment: "node",

  // which test to run
  testMatch: [
    "<rootDir>/controllers/*.test.js",
    "<rootDir>/models/*.test.js",
    "<rootDir>/helpers/*.test.js",
    "<rootDir>/middlewares/*.test.js",
    "<rootDir>/controllers/*.integration.test.js",
    "<rootDir>/middlewares/*.integration.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  coverageDirectory: "<rootDir>/coverage/backend",
  collectCoverageFrom: [
    "controllers/**/*.js",
    "models/**/*.js",
    "helpers/**/*.js",
    "middlewares/**/*.js",
    "routes/**/*.js",
    "config/**/*.js",
    "server.js",
    "!**/*.test.js",
    "!**/*.integration.test.js",
    "!**/__mocks__/**",
  ],
  coverageThreshold: {
    global: {
      lines: 80,
      functions: 80,
    },
  },
};
