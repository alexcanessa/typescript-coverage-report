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
  // Floored from the measured value. Ratchet up, never down -- with one
  // documented exception: src/bin/typescript-coverage-report.ts is an entry
  // script whose branches end in process.exit, so it is exercised by the
  // packaged end-to-end test rather than by jest. Adding logic there can
  // lower this number without lowering real coverage.
  coverageThreshold: {
    global: {
      statements: 85,
      branches: 79,
      functions: 89,
      lines: 85
    }
  }
};
