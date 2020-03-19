#!/usr/bin/env node

import { program } from "commander";
import generateCoverageReport from "../lib";
import getOptions from "../lib/getOptions";

const {
  version,
  description,
  typeCoverage = {}
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require("../../package.json");

const argvWithVersion = (argvs: string[]): string[] => {
  const vPos = argvs.indexOf("-v");

  if (vPos > -1) {
    argvs[vPos] = "-V";
  }

  return argvs;
};

program
  .version(version)
  .description(description)
  .option(
    "-o, --outputDir [string]",
    "The output directory where to generate the report.",
    "coverage-ts"
  )
  .option(
    "-t, --threshold [number]",
    "The minimum percentage of coverage required.",
    parseFloat,
    typeCoverage.atLeast || 80
  )
  .option("-s, --strict [boolean]", "Run the check in strict mode.", false)
  .option("-d, --debug [boolean]", "Show debug information.", false)
  .parse(argvWithVersion(process.argv));

const options = getOptions(program);

generateCoverageReport(options)
  .then(({ percentage }) => {
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
