import fs from "node:fs";
import path from "node:path";
import { REPORTER_NAMES, isReporterName } from "../lib/reporters";
import type { TypeCoverageConfig } from "./options";

/**
 * What each config key must look like.
 *
 * A value supplied on the command line is parsed and validated by commander;
 * the same value read from a config file used to reach the rest of the tool
 * unchecked. That asymmetry is how "reporters": "lcov" produced an internal
 * TypeError rather than an explanation, and how "atLeast": "90" was accepted
 * as a string when --threshold would have rejected it.
 */
const SCHEMA: Record<
  string,
  "string" | "number" | "boolean" | "string[]" | "glob"
> = {
  outputDir: "string",
  atLeast: "number",
  project: "string",
  historyFile: "string",
  compare: "string",
  cacheDirectory: "string",
  reporters: "string[]",
  ignoreFiles: "glob",
  strict: "boolean",
  debug: "boolean",
  cache: "boolean",
  ignoreCatch: "boolean",
  ignoreUnread: "boolean",
  respectGitignore: "boolean",
  allowEmpty: "boolean",
  ignoreNested: "boolean",
  ignoreAsAssertion: "boolean",
  ignoreTypeAssertion: "boolean",
  ignoreNonNullAssertion: "boolean",
  ignoreObject: "boolean",
  ignoreEmptyType: "boolean",
  reportSemanticError: "boolean",
  reportUnusedIgnore: "boolean",
  notOnlyInCwd: "boolean",
  notOnlyInCWD: "boolean"
};

const describe = (value: unknown): string =>
  Array.isArray(value) ? "an array" : `a ${typeof value}`;

const isValid = (expected: string, value: unknown): boolean => {
  switch (expected) {
    case "string":
      return typeof value === "string";
    case "number":
      return typeof value === "number" && Number.isFinite(value);
    case "boolean":
      return typeof value === "boolean";
    case "string[]":
      return Array.isArray(value) && value.every((v) => typeof v === "string");
    case "glob":
      // Historically a boolean, a string, or an array of strings.
      return (
        typeof value === "boolean" ||
        typeof value === "string" ||
        (Array.isArray(value) && value.every((v) => typeof v === "string"))
      );
    default:
      return true;
  }
};

const EXPECTED_LABEL: Record<string, string> = {
  string: "a string",
  number: "a number",
  boolean: "a boolean",
  "string[]": "an array of strings",
  glob: "a string or an array of strings"
};

/**
 * Checks that go beyond the value's type, mirroring what commander already
 * enforces for the matching flag.
 *
 * Without them a config file is the softer path into the same tool: commander
 * rejects `--threshold -1`, while `"atLeast": -1` was accepted and silently
 * disabled the gate the option exists to provide. An unknown reporter name
 * was worse -- it reached parseReporters inside resolveOptions, which runs
 * outside the try/catch around loadConfig, so the user got a stack trace.
 */
// The cast in each refinement is safe: isValid has already confirmed the type
// by the time one runs, and a key with no SCHEMA entry never reaches here.
const REFINEMENTS: Record<string, (value: unknown) => string | undefined> = {
  atLeast: (value) => {
    const threshold = value as number;

    return threshold < 0 || threshold > 100
      ? `must be a percentage between 0 and 100, got ${threshold}`
      : undefined;
  },
  reporters: (value) => {
    const names = value as string[];

    if (names.length === 0) {
      return `must name at least one of: ${REPORTER_NAMES.join(", ")}`;
    }

    const unknown = names.filter((name) => !isReporterName(name));

    return unknown.length > 0
      ? `has unknown reporter${unknown.length > 1 ? "s" : ""} ` +
          `${unknown.join(", ")}; available: ${REPORTER_NAMES.join(", ")}`
      : undefined;
  }
};

/**
 * Reject a malformed config with an explanation instead of letting it reach
 * the rest of the tool.
 *
 * Only wrong *types* are errors. An unrecognised key is never fatal, because
 * the `typeCoverage` block in package.json is shared with the type-coverage
 * CLI, which has options this package does not expose -- `is`, `detail`,
 * `update`, `showRelativePath` and others. Throwing on those would break
 * working setups that predate this package entirely.
 */
export const validateConfig = (
  config: Record<string, unknown>,
  source: string
): void => {
  const problems: string[] = [];

  for (const [key, value] of Object.entries(config)) {
    if (value === undefined) {
      continue;
    }

    const expected = SCHEMA[key];

    if (!expected) {
      // Only worth mentioning when it looks like a near miss for something
      // we do support; an unknown key is otherwise somebody else's option.
      const suggestion = Object.keys(SCHEMA).find(
        (known) => known.toLowerCase() === key.toLowerCase()
      );

      if (suggestion) {
        console.warn(
          `${source}: unknown option "${key}" - did you mean "${suggestion}"?`
        );
      }

      continue;
    }

    if (!isValid(expected, value)) {
      problems.push(
        `"${key}" must be ${EXPECTED_LABEL[expected]}, got ${describe(value)}`
      );

      continue;
    }

    const refined = REFINEMENTS[key]?.(value);

    if (refined) {
      problems.push(`"${key}" ${refined}`);
    }
  }

  if (problems.length > 0) {
    throw new Error(
      `${source} is not valid:\n` + problems.map((p) => `  - ${p}`).join("\n")
    );
  }
};

/**
 * Load configuration for a run.
 *
 * Requested in #13: "Especially if we start increasing the number of options,
 * a config file will be very useful - especially in CI/CD." That issue is
 * six years old and the option count has roughly tripled since, so the case
 * has only got stronger.
 *
 * The precedence the issue proposed is what is implemented, in resolveOptions:
 * defaults, then config, then CLI flags.
 *
 * Deliberately no new dependency. The issue author noted having "a look at
 * all the read config packages and not really happy with any of those", and
 * for a tool whose whole job is reducing a project's dependency surface,
 * pulling in a config loader to read one file would be a poor trade.
 */
export const CONFIG_FILES = [
  ".typecoveragerc",
  ".typecoveragerc.json",
  "typescript-coverage-report.config.json"
] as const;

const readJSONFile = (file: string): unknown => {
  const contents = fs.readFileSync(file, "utf-8");

  try {
    return JSON.parse(contents);
  } catch (error) {
    // A malformed config is a mistake worth surfacing, not something to
    // silently fall back from: the run would otherwise use defaults and the
    // user would wonder why their settings were ignored.
    throw new Error(
      `${path.basename(file)} is not valid JSON: ${(error as Error).message}`,
      { cause: error }
    );
  }
};

const readPackageJSON = (cwd: string): TypeCoverageConfig => {
  let config: TypeCoverageConfig;

  try {
    const parsed = readJSONFile(path.join(cwd, "package.json")) as {
      typeCoverage?: TypeCoverageConfig;
    };

    config = parsed.typeCoverage ?? {};
  } catch {
    // No package.json, or one we cannot read, is normal: the CLI must still
    // run in a bare directory.
    return {};
  }

  // Deliberately outside that catch. Validation used to sit inside it, so a
  // block with one bad key threw, was swallowed, and the run silently
  // discarded every *other* key in the block as well -- no error, no
  // settings, just defaults.
  validateConfig(
    config as Record<string, unknown>,
    "package.json typeCoverage"
  );

  return config;
};

/**
 * A dedicated config file wins over the `typeCoverage` block in package.json,
 * which stays supported. Only the first file found is read; they are not
 * merged, so which one applies is never ambiguous.
 */
export const loadConfig = (
  cwd: string = process.cwd(),
  explicitPath?: string
): TypeCoverageConfig => {
  if (explicitPath) {
    const resolved = path.resolve(cwd, explicitPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Config file not found: ${explicitPath}`);
    }

    const config = readJSONFile(resolved) as Record<string, unknown>;

    validateConfig(config, path.basename(resolved));

    return config as TypeCoverageConfig;
  }

  for (const name of CONFIG_FILES) {
    const candidate = path.join(cwd, name);

    if (fs.existsSync(candidate)) {
      const config = readJSONFile(candidate) as Record<string, unknown>;

      validateConfig(config, name);

      return config as TypeCoverageConfig;
    }
  }

  return readPackageJSON(cwd);
};

/**
 * Find the --config value in argv, before commander has parsed anything.
 *
 * The config supplies the defaults --help would describe, so it has to be
 * read first. Matching only the exact token `--config` missed the equally
 * valid `--config=./ci.json`, and the run then silently used auto-discovery
 * or package.json instead of the file the user named.
 *
 * A bare trailing `--config` yields undefined on purpose: commander reports a
 * missing option-argument better than this could.
 */
export const configPathFromArgv = (argv: string[]): string | undefined => {
  const index = argv.findIndex(
    (arg) => arg === "--config" || arg.startsWith("--config=")
  );

  if (index === -1) {
    return undefined;
  }

  const value = argv[index].startsWith("--config=")
    ? argv[index].slice("--config=".length)
    : argv[index + 1];

  return value === "" ? undefined : value;
};
