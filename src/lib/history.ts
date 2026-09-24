import fs from "node:fs";
import path from "node:path";
import type { CoverageData } from "./getCoverage";

/**
 * One recorded run.
 *
 * Requested in #74: type-coverage has a --history-file option for "storing
 * total sum of the coverage", which this tool never exposed. It is kept here
 * rather than passed to type-coverage-core because core has no such option --
 * it belongs to the type-coverage CLI, which this package does not use.
 *
 * Per-file counts are deliberately not stored. The file is meant to be
 * committed or archived, and on a large project a per-file record would grow
 * without bound. The lcov and cobertura reporters already carry per-file
 * detail for tools that want to diff it.
 */
export type HistoryEntry = {
  timestamp: string;
  percentage: number;
  total: number;
  covered: number;
  uncovered: number;
};

const readHistory = async (historyFile: string): Promise<HistoryEntry[]> => {
  try {
    const contents = await fs.promises.readFile(historyFile, "utf-8");
    const parsed: unknown = JSON.parse(contents);

    return Array.isArray(parsed) ? (parsed as HistoryEntry[]) : [];
  } catch {
    // Missing or unreadable is the normal first-run case; a corrupt file is
    // not worth failing a coverage run over.
    return [];
  }
};

export const appendHistory = async (
  data: CoverageData,
  historyFile: string,
  generatedAt: Date = new Date()
): Promise<void> => {
  const resolved = path.resolve(process.cwd(), historyFile);
  const entries = await readHistory(resolved);

  entries.push({
    timestamp: generatedAt.toISOString(),
    percentage: Number(data.percentage.toFixed(4)),
    total: data.total,
    covered: data.covered,
    uncovered: data.uncovered
  });

  await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
  await fs.promises.writeFile(
    resolved,
    `${JSON.stringify(entries, null, 2)}\n`
  );
};
