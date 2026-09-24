#!/usr/bin/env node

import path from "node:path";
import { IPackageJson } from "package-json-type";
import generateCoverageReport from "../lib";
import {
  CliOptions,
  TypeCoverageConfig,
  createProgram,
  resolveOptions
} from "./options";

const { version, description }: IPackageJson = require("../../package.json");

/**
 * Read the consumer's package.json for a `typeCoverage` block.
 *
 * Guarded because this used to run unconditionally at module scope: in a
 * directory without a package.json the CLI died with MODULE_NOT_FOUND before
 * commander could so much as print --help.
 */
const readTypeCoverageConfig = (): TypeCoverageConfig => {
  try {
    const pkg: IPackageJson & { typeCoverage?: TypeCoverageConfig } = require(
      path.join(process.cwd(), "package.json")
    );

    return pkg.typeCoverage ?? {};
  } catch {
    return {};
  }
};

const program = createProgram({
  version: version ?? "",
  description: description ?? ""
});

program.parse();

const options = resolveOptions(
  program.opts<CliOptions>(),
  readTypeCoverageConfig(),
  program.args
);

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
