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

  // ignore all node_modules except styleMock (needed for css imports)
  transformIgnorePatterns: ["/node_modules/(?!(styleMock\\.js)$)"],

  // only run these tests
  testMatch: [
    "<rootDir>/client/src/**/*.test.js",
    "<rootDir>/client/src/hooks/useCategory.test.js",
    "<rootDir>/client/src/pages/Categories.test.js",
    "<rootDir>/client/src/pages/CartPage.test.js",
    "<rootDir>/client/src/context/cart.test.js",
  ],

  // jest code coverage
  collectCoverage: true,
  collectCoverageFrom: [
    "client/src/pages/Auth/**",
    "client/src/pages/Auth/Login.js",
    "client/src/pages/Auth/Register.js",
    "client/src/pages/admin/*.js",
    "client/src/pages/user/Dashboard.js",
    "client/src/pages/CategoryProduct.js",
    "client/src/pages/ProductDetails.js",
    "client/src/components/UserMenu.js",
    "client/src/hooks/useCategory.js",
    "client/src/pages/Categories.js",
    "client/src/pages/CartPage.js",
    "client/src/context/cart.js",
    "client/src/components/Routes/*.js",
  ],
  coverageThreshold: {
    global: {
      lines: 90,
      functions: 90,
    },
  },
  setupFilesAfterEnv: ["<rootDir>/client/src/setupTests.js"],
};
