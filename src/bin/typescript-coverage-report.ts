#!/usr/bin/env node

import { program } from "commander";
import * as fs from "fs";
import * as path from "path";
import generateCoverageReport from "../lib";
import getOptions from "../lib/getOptions";

const {
  version,
  description
  // eslint-disable-next-line @typescript-eslint/no-var-requires
} = require("../../package.json");

/**
 * Sets a default coverage threshold of `80`.
 * If user provides `atLeast` in their `typeCoverage` configuration in
 * their package.json, we set that as the program's default instead.
 */
const getAtLeast = () => {
  let atLeast = 80;

  const packageJsonPath = path.resolve(process.cwd(), "package.json");

  if (fs.existsSync(packageJsonPath)) {
    const currentPackageJson: {
      typeCoverage?: {
        atLeast?: number;
      };
    } = JSON.parse(fs.readFileSync(packageJsonPath).toString());

    if (currentPackageJson.typeCoverage?.atLeast) {
      atLeast = currentPackageJson.typeCoverage.atLeast;
    }
  }

  return atLeast;
};

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
    getAtLeast()
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
