module.exports = {
  coverageDirectory: "coverage",
  collectCoverage: true,
  collectCoverageFrom: ["src/**/*.{js,ts,tsx}"],
  moduleFileExtensions: ["js", "ts", "tsx", "json"],
  testMatch: ["**/__tests__/(*.)test.{js,ts,tsx}"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  transform: {
    ".[j|t]sx?$": "babel-jest"
  }
};
