const js = require("@eslint/js");
const globals = require("globals");
const tseslint = require("typescript-eslint");
const jest = require("eslint-plugin-jest");
const prettier = require("eslint-plugin-prettier/recommended");

module.exports = tseslint.config(
  {
    // Flat config ignores .eslintignore entirely, so it lives here now.
    ignores: [
      "dist/**",
      "coverage/**",
      "coverage-ts/**",
      "docs/**",
      "_site/**",
      "node_modules/**"
    ]
  },

  js.configs.recommended,
  ...tseslint.configs.recommended,

  {
    languageOptions: {
      globals: { ...globals.node },
      ecmaVersion: 2022,
      sourceType: "commonjs"
    },
    rules: {
      "@typescript-eslint/explicit-function-return-type": "off",
      "@typescript-eslint/no-explicit-any": "off"
    }
  },

  {
    // Tooling config and mocks are genuine CommonJS.
    files: ["**/*.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" }
  },

  {
    // Source is authored as ES modules and compiled to CJS by tsc.
    files: ["src/**/*.ts"],
    languageOptions: { sourceType: "module" }
  },

  {
    // The CLI intentionally require()s package.json at runtime.
    files: ["src/bin/**/*.ts"],
    rules: { "@typescript-eslint/no-require-imports": "off" }
  },

  {
    // Shipped verbatim to the browser alongside the HTML report; never compiled.
    files: ["assets/**/*.js"],
    languageOptions: {
      globals: { ...globals.browser, CodeMirror: "readonly" }
    }
  },

  {
    // Replaces the old `*.test.tsx` override, which matched nothing.
    files: ["**/__tests__/**/*.{js,ts,tsx}", "__mocks__/**/*.js"],
    ...jest.configs["flat/recommended"],
    languageOptions: {
      globals: { ...globals.node, ...globals.jest }
    }
  },

  // Must stay last: turns off every rule that would fight Prettier.
  prettier
);
