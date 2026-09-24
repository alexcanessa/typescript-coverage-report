import fs from "node:fs";
import path from "node:path";
import type { CoverageData } from "./getCoverage";

/**
 * Compare a run against an earlier report.
 *
 * Requested in #172: "compare TS coverage per file on current branch vs base
 * branch and report delta". The tool deliberately does not learn about git to
 * do this -- it takes a baseline file, which the caller produces however it
 * likes (a checkout of the base branch, a stored artefact, a committed file).
 * That keeps it usable outside CI and avoids duplicating what Codecov already
 * does well from the lcov report.
 */
export type FileDelta = {
  filename: string;
  before: number;
  after: number;
};

export type Comparison = {
  decreased: FileDelta[];
  overallBefore: number;
  overallAfter: number;
};

type BaselineFile = {
  percentage?: number;
  fileCounts?: Record<string, { correctCount: number; totalCount: number }>;
};

const percentageOf = (correctCount: number, totalCount: number): number =>
  totalCount === 0 ? 100 : (correctCount * 100) / totalCount;

/** A file's percentage is compared, not its raw counts: adding covered code to
 *  a file should not read as a regression. */
export const compareToBaseline = (
  data: CoverageData,
  baseline: BaselineFile
): Comparison => {
  const decreased: FileDelta[] = [];
  const baselineCounts = baseline.fileCounts ?? {};

  for (const [filename, { correctCount, totalCount }] of data.fileCounts) {
    const previous = baselineCounts[filename];

    // A file absent from the baseline is new. New files are not regressions;
    // the overall threshold is what guards those.
    if (!previous) {
      continue;
    }

    const before = percentageOf(previous.correctCount, previous.totalCount);
    const after = percentageOf(correctCount, totalCount);

    // Compare with a small epsilon: floating point means 79.99999999 vs 80
    // would otherwise be reported as a regression.
    if (after < before - 1e-9) {
      decreased.push({ filename, before, after });
    }
  }

  return {
    decreased: decreased.sort((a, b) => a.filename.localeCompare(b.filename)),
    overallBefore: baseline.percentage ?? 0,
    overallAfter: data.percentage
  };
};

export const readBaseline = async (
  baselineFile: string
): Promise<BaselineFile> => {
  const resolved = path.resolve(process.cwd(), baselineFile);
  const contents = await fs.promises.readFile(resolved, "utf-8");
  const parsed: unknown = JSON.parse(contents);

  if (typeof parsed !== "object" || parsed === null) {
    throw new Error(`${baselineFile} is not a coverage report.`);
  }

  return parsed as BaselineFile;
};

export const formatComparison = ({
  decreased,
  overallBefore,
  overallAfter
}: Comparison): string => {
  const lines = [
    `\nType coverage went from ${overallBefore.toFixed(2)}% to ${overallAfter.toFixed(2)}%.`
  ];

  if (decreased.length === 0) {
    lines.push("No file decreased.");

    return lines.join("\n");
  }

  lines.push(
    `\n${decreased.length} file${decreased.length > 1 ? "s" : ""} decreased:`
  );

  for (const { filename, before, after } of decreased) {
    lines.push(
      `  ${filename}: ${before.toFixed(2)}% -> ${after.toFixed(2)}% ` +
        `(-${(before - after).toFixed(2)})`
    );
  }

  return lines.join("\n");
};
