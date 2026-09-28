#!/usr/bin/env node

import { IPackageJson } from "package-json-type";
import generateCoverageReport from "../lib";
import { formatComparison } from "../lib/compare";
import { CliOptions, createProgram, resolveOptions } from "./options";
import { configPathFromArgv, loadConfig } from "./config";

const { version, description }: IPackageJson = require("../../package.json");

/**
 * Set an exit code rather than calling process.exit().
 *
 * Writes to a pipe are asynchronous on POSIX and process.exit() does not wait
 * for them, so `typescript-coverage-report | tee coverage.log` could lose the
 * tail of the coverage table -- the larger the project, the more likely.
 * Returning the code lets the process end once stdout has drained.
 */
const main = async (): Promise<number> => {
  // NOTE: Read --config before commander parses, because the config supplies
  // the defaults commander would otherwise be describing in --help.
  let config;

  try {
    config = loadConfig(process.cwd(), configPathFromArgv(process.argv));
  } catch (error) {
    // A bad config is a usage mistake, so report it the way commander reports
    // one rather than dumping a stack trace at the user.
    console.error(`error: ${(error as Error).message}`);

    return 1;
  }

  const program = createProgram({
    version: version ?? "",
    description: description ?? ""
  });

  program.parse();

  let options;

  try {
    options = resolveOptions(program.opts<CliOptions>(), config, program.args);
  } catch (error) {
    // resolveOptions still parses config-supplied values, and it runs after
    // commander has handed back control -- so without this a bad value in a
    // config file surfaced as a raw stack trace rather than a usage error.
    console.error(`error: ${(error as Error).message}`);

    return 1;
  }

  const { percentage, comparison, fileCounts } =
    await generateCoverageReport(options);

  // A run that analysed nothing reports 100%, which silently satisfies any
  // threshold. That is how a monorepo root whose tsconfig only lists
  // `references` appeared to pass while checking nothing at all (#168).
  if (fileCounts.size === 0 && !options.allowEmpty) {
    console.error(
      "\nNo files were analysed, so there is nothing to report.\n\n" +
        "Common causes:\n" +
        "  - the tsconfig only lists `references`, which are not followed;\n" +
        "    point --project at a package's tsconfig instead\n" +
        "  - --project points at a tsconfig whose `include` matches nothing\n" +
        "  - every file was excluded by --ignore-files or --respect-gitignore\n\n" +
        "Pass --allow-empty if an empty result is expected."
    );

    return 1;
  }

  if (comparison) {
    console.log(formatComparison(comparison));

    if (comparison.decreased.length > 0) {
      // A distinct code from the threshold failure: a run can be above the
      // threshold and still have made a file worse, and CI may want to treat
      // the two differently.
      return 3;
    }
  }

  if (percentage < options.threshold) {
    console.error(
      `\nThe TypeScript coverage ${percentage.toFixed(
        2
      )}% is lower than the threshold ${options.threshold}%`
    );

    return 2;
  }

  return 0;
};

main().then(
  (code) => {
    process.exitCode = code;
  },
  (error) => {
    console.error(error);

    process.exitCode = 255;
  }
);
