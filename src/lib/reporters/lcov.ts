import fs from "node:fs";
import path from "node:path";
import type { CoverageData } from "../getCoverage";
import { lineCoverageForFile, uncoveredLinesByFile } from "./lineCoverage";
import { toPosixPath } from "./paths";

type Options = {
  outputDir: string;
};

/**
 * Emit an lcov.info file.
 *
 * This is the artifact most CI tooling already understands: Codecov,
 * Coveralls, SonarQube, Jenkins and GitHub Actions coverage annotations all
 * ingest it. It is also what makes per-file deltas between branches possible
 * (#172) without this tool needing to know anything about git.
 *
 * Records emitted: TN, SF, DA, LF, LH. Function and branch records are
 * deliberately omitted rather than emitted as zeroes, since type coverage has
 * no meaningful notion of either and a zeroed FNF/BRF would be read as
 * genuinely uncovered.
 *
 * See lineCoverage.ts for how identifier coverage is projected onto lines.
 */
export const generate = async (
  data: CoverageData,
  options: Options
): Promise<void> => {
  const uncoveredByFile = uncoveredLinesByFile(data);
  const records: string[] = [];

  for (const filename of data.fileCounts.keys()) {
    let sourceCode: string;

    try {
      sourceCode = await fs.promises.readFile(filename, "utf-8");
    } catch {
      // Consistent with the HTML reporter: skip a file we cannot read rather
      // than failing the whole run.
      continue;
    }

    const { lines, found, hit } = lineCoverageForFile(
      sourceCode,
      uncoveredByFile.get(filename) ?? []
    );

    const record = ["TN:", `SF:${toPosixPath(filename)}`];

    for (const [lineNumber, hits] of [...lines.entries()].sort(
      ([a], [b]) => a - b
    )) {
      record.push(`DA:${lineNumber},${hits}`);
    }

    record.push(`LF:${found}`, `LH:${hit}`, "end_of_record");
    records.push(record.join("\n"));
  }

  await fs.promises.writeFile(
    path.join(options.outputDir, "lcov.info"),
    records.length > 0 ? `${records.join("\n")}\n` : ""
  );
};
