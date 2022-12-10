#!/usr/bin/env node

import { program } from "commander";
import generateCoverageReport, { ProgramOptions } from "../lib";
import path from "path";
import { IPackageJson } from "package-json-type";

type TypeCoverageConfig = {
  outputDir?: string;
  atLeast?: number;
  strict?: boolean;
  debug?: boolean;
  cache?: boolean;
  project?: string;
  ignoreFiles?: boolean;
  ignoreCatch?: boolean;
  ignoreUnread?: boolean;
};

const {
  version,
  description
}: // eslint-disable-next-line @typescript-eslint/no-var-requires
IPackageJson = require("../../package.json");

const {
  typeCoverage = {}
}: // eslint-disable-next-line @typescript-eslint/no-var-requires
IPackageJson & { typeCoverage?: TypeCoverageConfig } = require(path.join(
  process.cwd(),
  "/package.json"
));

const argvWithVersion = (argvs: string[]): string[] => {
  const vPos = argvs.indexOf("-v");

  if (vPos > -1) {
    argvs[vPos] = "-V";
  }

  return argvs;
};

const {
  outputDir = "typescript-coverage",
  atLeast = 80,
  strict = false,
  debug = false,
  cache = false,
  project = ".",
  ignoreFiles = false,
  ignoreCatch = false,
  ignoreUnread = false
} = typeCoverage;

program
  .version(version)
  .description(description)
  .option(
    "-o, --outputDir [string]",
    "the output directory where to generate the report.",
    outputDir
  )
  .option(
    "-t, --threshold [number]",
    "the minimum percentage of coverage required.",
    parseFloat,
    atLeast
  )
  .option("-s, --strict [boolean]", "run the check in strict mode.", strict)
  .option("-d, --debug [boolean]", "show debug information.", debug)
  .option(
    "-c, --cache [boolean]",
    "save and reuse type check result from cache.",
    cache
  )
  .option(
    "-p, --project [string]",
    'file path to tsconfig file, eg: --project "./app/tsconfig.app.json"',
    project
  )
  .option(
    "-i, --ignore-files [string[]]",
    'ignore specified files, eg: --ignore-files "demo1/*.ts" --ignore-files "demo2/foo.ts"',
    ignoreFiles
  )
  .option(
    "--ignore-catch [boolean]",
    "ignore type any for (try-)catch clause variable",
    ignoreCatch
  )
  .option(
    "-u, --ignore-unread [boolean]",
    "allow writes to variables with implicit any types",
    ignoreUnread
  )
  .option(
    "-- [string[]]",
    "only checks these files, useful for usage with tools like lint-staged"
  )
  .parse(argvWithVersion(process.argv));

const options: ProgramOptions = {
  /* camelCase keys matching "long" flags in options above */
  outputDir: program.outputDir,
  threshold: program.threshold,
  tsProjectFile: program.project,
  strict: program.strict,
  debug: program.debug,
  cache: program.cache,
  ignoreFiles: program.ignoreFiles,
  ignoreCatch: program.ignoreCatch,
  ignoreUnread: program.ignoreUnread,
  files: program.args.length > 0 ? program.args : undefined
};

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
