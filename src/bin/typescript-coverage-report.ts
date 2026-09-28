#!/usr/bin/env node

import { IPackageJson } from "package-json-type";
import generateCoverageReport from "../lib";
import { formatComparison } from "../lib/compare";
import { CliOptions, createProgram, resolveOptions } from "./options";
import { configPathFromArgv, loadConfig } from "./config";

const { version, description }: IPackageJson = require("../../package.json");

// NOTE: Read --config before commander parses, because the config supplies
// the defaults commander would otherwise be describing in --help.
const configPath = configPathFromArgv(process.argv);

let config;

try {
  config = loadConfig(process.cwd(), configPath);
} catch (error) {
  // A bad config is a usage mistake, so report it the way commander reports
  // one rather than dumping a stack trace at the user.
  console.error(`error: ${(error as Error).message}`);
  process.exit(1);
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
  process.exit(1);
}

generateCoverageReport(options)
  .then(({ percentage, comparison, fileCounts }) => {
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

      process.exit(1);
    }

    if (comparison) {
      console.log(formatComparison(comparison));

      if (comparison.decreased.length > 0) {
        // A distinct code from the threshold failure: a run can be above the
        // threshold and still have made a file worse, and CI may want to
        // treat the two differently.
        process.exit(3);
      }
    }

    if (percentage < options.threshold) {
      console.error(
        `\nThe TypeScript coverage ${percentage.toFixed(
          2
        )}% is lower than the threshold ${options.threshold}%`
      );

      process.exit(2);
    }

    process.exit(0);
  })
  .catch((error) => {
    console.error(error);

    process.exit(255);
  });
