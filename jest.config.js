module.exports = {
  testEnvironment: "node",
  coverageDirectory: "coverage",
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.{js,ts}"],
  moduleFileExtensions: ["js", "ts", "json"],
  testMatch: ["**/__tests__/**/*.test.{js,ts}"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/", "/test/fixture/"],
  transform: {
    // The previous pattern was ".[j|t]sx?$": an unescaped "." matching any
    // character and "[j|t]" a class of j, pipe and t. It worked by accident.
    "^.+\\.[jt]sx?$": "babel-jest"
  },
  // Seeded from the first green run, floored. Ratchet up, never down.
  coverageThreshold: {
    global: {
      statements: 83,
      branches: 79,
      functions: 84,
      lines: 83
    }
  }
};
