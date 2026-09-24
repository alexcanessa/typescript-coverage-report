# Security Policy

## Supported versions

Only the latest published minor of `typescript-coverage-report` receives fixes.

| Version | Supported |
| ------- | --------- |
| 1.1.x   | ✅        |
| < 1.1   | ❌        |

## Reporting a vulnerability

Please **do not open a public issue**.

Use GitHub's private reporting:
[Report a vulnerability](https://github.com/alexcanessa/typescript-coverage-report/security/advisories/new).

You should get an acknowledgement within 7 days. This is a volunteer-maintained
project, so please allow up to 90 days for a fix before public disclosure.

## Scope

This is a development-time CLI. It reads your source, drives the TypeScript
compiler API through `type-coverage-core`, and writes an HTML and JSON report.
The most relevant risks are therefore:

- **HTML injection into the generated report** from file names or source
  content. The report is a page developers open locally.
- **Arbitrary file writes** via `--outputDir`.

Both are in scope. Vulnerabilities in `typescript` or `type-coverage-core`
should be reported to those projects.
