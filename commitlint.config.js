module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // The project is "very open to emojis" and to proper nouns/acronyms in
    // subjects, both of which config-conventional's default would reject.
    "subject-case": [0],
    // Pasted stack traces, tables and URLs must not be rewrapped.
    "body-max-line-length": [0],
    "footer-max-line-length": [0],
    "header-max-length": [2, "always", 100]
  },
  helpUrl:
    "https://github.com/alexcanessa/typescript-coverage-report/blob/main/CONTRIBUTING.md#commit-messages"
};
