import { Command, InvalidArgumentError } from "commander";
import {
  DEFAULT_REPORTERS,
  REPORTER_NAMES,
  ReporterName,
  isReporterName
} from "../lib/reporters";

/** The `typeCoverage` block a consumer may put in their package.json. */
export type TypeCoverageConfig = {
  outputDir?: string;
  atLeast?: number;
  strict?: boolean;
  debug?: boolean;
  cache?: boolean;
  project?: string;
  // Historically documented as a boolean, actually used as a glob or globs.
  ignoreFiles?: boolean | string | string[];
  ignoreCatch?: boolean;
  ignoreUnread?: boolean;
  reporters?: string[];
  historyFile?: string;
  ignoreNested?: boolean;
  ignoreAsAssertion?: boolean;
  ignoreTypeAssertion?: boolean;
  ignoreNonNullAssertion?: boolean;
  ignoreObject?: boolean;
  ignoreEmptyType?: boolean;
};

/** Exactly the flags the user typed; everything is optional. */
export type CliOptions = {
  outputDir?: string;
  threshold?: number;
  strict?: boolean;
  debug?: boolean;
  cache?: boolean;
  project?: string;
  ignoreFiles?: string[];
  ignoreCatch?: boolean;
  ignoreUnread?: boolean;
  reporters?: ReporterName[];
  historyFile?: string;
  ignoreNested?: boolean;
  ignoreAsAssertion?: boolean;
  ignoreTypeAssertion?: boolean;
  ignoreNonNullAssertion?: boolean;
  ignoreObject?: boolean;
  ignoreEmptyType?: boolean;
};

export type ResolvedOptions = {
  outputDir: string;
  threshold: number;
  tsProjectFile: string;
  strict: boolean;
  debug: boolean;
  cache: boolean;
  ignoreFiles?: string[];
  ignoreCatch: boolean;
  ignoreUnread: boolean;
  files?: string[];
  reporters: ReporterName[];
  historyFile?: string;
  ignoreNested: boolean;
  ignoreAsAssertion: boolean;
  ignoreTypeAssertion: boolean;
  ignoreNonNullAssertion: boolean;
  ignoreObject: boolean;
  ignoreEmptyType: boolean;
};

export const DEFAULTS = {
  outputDir: "coverage-ts",
  threshold: 80,
  project: ".",
  strict: false,
  debug: false,
  cache: false,
  ignoreCatch: false,
  ignoreUnread: false
} as const;

/**
 * Accumulate a repeatable option instead of overwriting it.
 *
 * Without this, `-i a -i b` kept only `b` -- while the option's own help text
 * advertised passing it more than once. See #118.
 */
export const collect = (value: string, previous?: string[]): string[] => [
  ...(previous ?? []),
  value
];

/**
 * Coerce the package.json value into the shape type-coverage-core expects.
 *
 * The default used to be the boolean `false`, which reached core as
 * `ignoreFiles: true` when `-i` was passed without a value and made it call
 * `.some` on a boolean.
 */
export const normalizeIgnoreFiles = (value: unknown): string[] | undefined => {
  if (typeof value === "string") {
    return [value];
  }

  if (Array.isArray(value)) {
    const globs = value.filter(
      (item): item is string => typeof item === "string"
    );

    return globs.length > 0 ? globs : undefined;
  }

  return undefined;
};

/**
 * Parse a comma-separated reporter list, rejecting unknown names up front.
 *
 * Failing here rather than silently ignoring a typo matters: a CI job
 * asking for "lcov" and getting nothing would look like the tool produced
 * no artefact, which is the failure this option exists to prevent.
 */
export const parseReporters = (value: string): ReporterName[] => {
  const names = value
    .split(",")
    .map((name) => name.trim())
    .filter((name) => name !== "");

  if (names.length === 0) {
    throw new InvalidArgumentError(
      `Expected at least one of: ${REPORTER_NAMES.join(", ")}.`
    );
  }

  const unknown = names.filter((name) => !isReporterName(name));

  if (unknown.length > 0) {
    throw new InvalidArgumentError(
      `Unknown reporter${unknown.length > 1 ? "s" : ""} ` +
        `${unknown.join(", ")}. Available: ${REPORTER_NAMES.join(", ")}.`
    );
  }

  return [...new Set(names as ReporterName[])];
};

/**
 * `--threshold abc` used to produce NaN, and `percentage < NaN` is false, so
 * the run passed silently however bad the coverage was.
 */
export const parseThreshold = (value: string): number => {
  const parsed = Number.parseFloat(value);

  if (!Number.isFinite(parsed)) {
    throw new InvalidArgumentError(
      "Expected a number, for example --threshold 90."
    );
  }

  if (parsed < 0 || parsed > 100) {
    throw new InvalidArgumentError("Expected a percentage between 0 and 100.");
  }

  return parsed;
};

/**
 * Precedence: an explicit flag beats package.json, which beats the default.
 *
 * Kept out of commander deliberately. Seeding a repeatable option's commander
 * default would make the collector *append* to the configured value on the
 * first occurrence rather than replace it, so config and flags would merge
 * instead of override.
 */
export const resolveOptions = (
  cli: CliOptions,
  config: TypeCoverageConfig = {},
  files: string[] = []
): ResolvedOptions => ({
  outputDir: cli.outputDir ?? config.outputDir ?? DEFAULTS.outputDir,
  threshold: cli.threshold ?? config.atLeast ?? DEFAULTS.threshold,
  tsProjectFile: cli.project ?? config.project ?? DEFAULTS.project,
  strict: cli.strict ?? config.strict ?? DEFAULTS.strict,
  debug: cli.debug ?? config.debug ?? DEFAULTS.debug,
  cache: cli.cache ?? config.cache ?? DEFAULTS.cache,
  ignoreFiles: cli.ignoreFiles ?? normalizeIgnoreFiles(config.ignoreFiles),
  ignoreCatch: cli.ignoreCatch ?? config.ignoreCatch ?? DEFAULTS.ignoreCatch,
  ignoreUnread:
    cli.ignoreUnread ?? config.ignoreUnread ?? DEFAULTS.ignoreUnread,
  files: files.length > 0 ? files : undefined,
  reporters:
    cli.reporters ??
    (config.reporters
      ? parseReporters(config.reporters.join(","))
      : undefined) ??
    DEFAULT_REPORTERS,
  historyFile: cli.historyFile ?? config.historyFile,
  ignoreNested: cli.ignoreNested ?? config.ignoreNested ?? false,
  ignoreAsAssertion: cli.ignoreAsAssertion ?? config.ignoreAsAssertion ?? false,
  ignoreTypeAssertion:
    cli.ignoreTypeAssertion ?? config.ignoreTypeAssertion ?? false,
  ignoreNonNullAssertion:
    cli.ignoreNonNullAssertion ?? config.ignoreNonNullAssertion ?? false,
  ignoreObject: cli.ignoreObject ?? config.ignoreObject ?? false,
  ignoreEmptyType: cli.ignoreEmptyType ?? config.ignoreEmptyType ?? false
});

/**
 * Built as a factory so tests can parse argv in-process rather than spawning
 * the binary.
 */
export const createProgram = ({
  version = "",
  description = ""
}: { version?: string; description?: string } = {}): Command =>
  new Command()
    .name("typescript-coverage-report")
    .description(description)
    // -v was previously faked by rewriting argv to -V before parsing, which
    // also mangled a legitimate -v appearing as an option value.
    .version(version, "-v, --version")
    .option(
      "-o, --outputDir <path>",
      `the output directory where to generate the report (default: ${DEFAULTS.outputDir})`
    )
    .option(
      "-t, --threshold <number>",
      `the minimum percentage of coverage required (default: ${DEFAULTS.threshold})`,
      parseThreshold
    )
    .option("-s, --strict", "run the check in strict mode")
    .option("-d, --debug", "show debug information")
    .option("-c, --cache", "save and reuse type check result from cache")
    .option(
      "-p, --project <path>",
      `file path to the tsconfig file, eg: --project "./app/tsconfig.app.json" (default: ${DEFAULTS.project})`
    )
    .option(
      "-i, --ignore-files <glob>",
      'ignore files matching a glob; repeatable, eg: -i "demo1/*.ts" -i "demo2/foo.ts"',
      collect
    )
    .option(
      "-r, --reporters <list>",
      `comma-separated list of reporters to run: ${REPORTER_NAMES.join(", ")} ` +
        `(default: ${DEFAULT_REPORTERS.join(",")})`,
      parseReporters
    )
    .option(
      "--history-file <path>",
      "append this run's totals to a JSON file, for tracking coverage over time"
    )
    .option(
      "--ignore-catch",
      "ignore type any for (try-)catch clause variables"
    )
    .option(
      "-u, --ignore-unread",
      "allow writes to variables with implicit any types"
    )
    .option("--ignore-nested", "ignore nested anys, such as Promise<any>")
    .option("--ignore-as-assertion", "ignore assertions such as foo as string")
    .option("--ignore-type-assertion", "ignore assertions such as <string>foo")
    .option(
      "--ignore-non-null-assertion",
      "ignore non-null assertions such as foo!"
    )
    .option("--ignore-object", "ignore the Object type")
    .option("--ignore-empty-type", "ignore the empty type {}")
    .argument(
      "[files...]",
      "only check these files, useful with tools like lint-staged"
    )
    .showHelpAfterError();
