import path from "node:path";
import fs from "node:fs";
import getCoverage, { Options, CoverageData } from "./getCoverage";
import { DEFAULT_REPORTERS, ReporterName, runReporters } from "./reporters";
import { appendHistory } from "./history";
import { createProgress } from "./progress";
import { excludeGitIgnored } from "./gitignore";
import { Comparison, compareToBaseline, readBaseline } from "./compare";
import {
  assertSafeOutputDir,
  excludeOutputDir,
  outputDirIgnoreGlob
} from "./outputDir";

export type ProgramOptions = Options & {
  outputDir: string;
  threshold: number;
  reporters?: readonly ReporterName[];
  generatedAt?: Date;
  historyFile?: string;
  compare?: string;
  respectGitignore?: boolean;
};

const withOutputDirIgnored = (
  ignoreFiles: Options["ignoreFiles"],
  glob: string | undefined
): Options["ignoreFiles"] => {
  if (!glob) {
    return ignoreFiles;
  }

  if (typeof ignoreFiles === "string") {
    return [ignoreFiles, glob];
  }

  if (Array.isArray(ignoreFiles)) {
    return [...ignoreFiles, glob];
  }

  return [glob];
};

export type CoverageReport = CoverageData & {
  comparison?: Comparison;
};

export default async function generateCoverageReport(
  options: ProgramOptions
): Promise<CoverageReport> {
  const outputDir = path.resolve(process.cwd(), options.outputDir);

  assertSafeOutputDir(options.outputDir);

  // NOTE: The previous run's output has to go before the type check, not
  // after it. Leaving it in place meant type-coverage-core reported the
  // report's own JSON and assets as source files, and the HTML reporter then
  // tried to read files that had just been deleted -- an ENOENT that exited
  // the CLI with 255. See #161 and #140.
  await fs.promises.rm(outputDir, { recursive: true, force: true });

  const progress = createProgress();
  progress.update("Analysing types...");

  // NOTE: Spread rather than listed field by field. The previous version
  // forwarded an explicit whitelist, so every option added after it was
  // parsed, documented, and then silently dropped here -- which is exactly
  // what happened to the six --ignore-* flags added in 2.0.0. Only
  // ignoreFiles needs special handling, because the output directory is
  // appended to it.
  const raw = await getCoverage({
    ...options,
    ignoreFiles: withOutputDirIgnored(
      options.ignoreFiles,
      outputDirIgnoreGlob(options.outputDir)
    )
  });

  // NOTE: Belt and braces. The ignore glob is an optimisation; it only
  // applies when the directory is inside the project and core matches globs
  // against working-directory-relative paths. This filter is the guarantee.
  progress.update("Generating report...");

  let data = excludeOutputDir(raw, options.outputDir);

  if (options.respectGitignore) {
    const filtered = excludeGitIgnored(data);

    if (filtered.unavailable) {
      console.warn(
        `--respect-gitignore was asked for but could not be applied: ${filtered.unavailable}`
      );
    }

    data = filtered.data;
  }

  const reporters = options.reporters ?? DEFAULT_REPORTERS;

  await fs.promises.mkdir(outputDir, { recursive: true });

  // Stop before any reporter writes, so the spinner never collides with the
  // terminal table or a warning.
  progress.stop();

  await runReporters(reporters, data, {
    outputDir,
    threshold: options.threshold,
    generatedAt: options.generatedAt
  });

  // NOTE: Only the HTML report links these. fs.cp replaces the ncp
  // dependency, last touched in 2016; it is stable from Node 22.3, below the
  // 22.12 engines floor.
  if (reporters.includes("html")) {
    await fs.promises.cp(
      path.join(__dirname, "../../assets"),
      path.join(outputDir, "assets"),
      { recursive: true }
    );
  }

  if (options.historyFile) {
    await appendHistory(data, options.historyFile, options.generatedAt);
  }

  if (options.compare) {
    return {
      ...data,
      comparison: compareToBaseline(data, await readBaseline(options.compare))
    };
  }

  return data;
}
