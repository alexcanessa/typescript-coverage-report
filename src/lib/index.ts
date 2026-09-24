import path from "node:path";
import fs from "node:fs";
import getCoverage, { Options, CoverageData } from "./getCoverage";
import { generate as generateText } from "./reporters/text";
import { generate as generateHTML } from "./reporters/html";
import { generate as generateJSON } from "./reporters/json";
import {
  assertSafeOutputDir,
  excludeOutputDir,
  outputDirIgnoreGlob
} from "./outputDir";

export type ProgramOptions = Options & {
  outputDir: string;
  threshold: number;
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

export default async function generateCoverageReport(
  options: ProgramOptions
): Promise<CoverageData> {
  const outputDir = path.resolve(process.cwd(), options.outputDir);

  assertSafeOutputDir(options.outputDir);

  // NOTE: The previous run's output has to go before the type check, not
  // after it. Leaving it in place meant type-coverage-core reported the
  // report's own JSON and assets as source files, and the HTML reporter then
  // tried to read files that had just been deleted -- an ENOENT that exited
  // the CLI with 255. See #161 and #140.
  await fs.promises.rm(outputDir, { recursive: true, force: true });

  const raw = await getCoverage({
    tsProjectFile: options.tsProjectFile,
    strict: options.strict,
    debug: options.debug,
    ignoreFiles: withOutputDirIgnored(
      options.ignoreFiles,
      outputDirIgnoreGlob(options.outputDir)
    ),
    ignoreCatch: options.ignoreCatch,
    ignoreUnread: options.ignoreUnread,
    cache: options.cache,
    files: options.files
  });

  // NOTE: Belt and braces. The ignore glob is an optimisation; it only
  // applies when the directory is inside the project and core matches globs
  // against working-directory-relative paths. This filter is the guarantee.
  const data = excludeOutputDir(raw, options.outputDir);

  console.log(generateText(data, options.threshold));

  await fs.promises.mkdir(outputDir, { recursive: true });

  const reporterOptions = { ...options, outputDir };

  await generateHTML(data, reporterOptions);

  // NOTE: fs.cp replaces the ncp dependency, which was last touched in 2016.
  // It is stable from Node 22.3, below the 22.12 engines floor.
  await fs.promises.cp(
    path.join(__dirname, "../../assets"),
    path.join(outputDir, "assets"),
    { recursive: true }
  );

  await generateJSON(data, reporterOptions);

  return data;
}
