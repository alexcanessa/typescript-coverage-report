import type { CoverageData } from "../getCoverage";

/**
 * Project identifier-level type coverage onto lines.
 *
 * Type coverage counts *identifiers*, but LCOV and Cobertura are line-based.
 * The established convention for this class of tool -- flow-coverage-report,
 * which this project was modelled on, does the same -- is to mark a line as
 * uncovered when it contains at least one uncovered identifier.
 *
 * Blank lines and comment-only lines are excluded from the denominator, so a
 * file padded with licence headers does not score better than one without.
 * The heuristic is deliberately simple: it does not track multi-line comment
 * state across string literals, and it does not need to. A misclassified line
 * changes a percentage slightly; it never hides an `any`, because every line
 * carrying an uncovered identifier is always emitted as uncovered.
 *
 * The authoritative identifier-level numbers stay in the JSON reporter, the
 * terminal table and the exit code. These line rates exist so CI tools can
 * render and diff the report.
 */
export type LineCoverage = {
  /** 1-based line number to hit count: 0 uncovered, 1 covered. */
  lines: Map<number, number>;
  found: number;
  hit: number;
};

const isCountableLine = (line: string): boolean => {
  const trimmed = line.trim();

  if (trimmed === "") {
    return false;
  }

  return !(
    trimmed.startsWith("//") ||
    trimmed.startsWith("/*") ||
    trimmed.startsWith("*") ||
    trimmed === "*/"
  );
};

export const lineCoverageForFile = (
  sourceCode: string,
  uncoveredLines: Iterable<number>
): LineCoverage => {
  const uncovered = new Set(uncoveredLines);
  const lines = new Map<number, number>();
  const sourceLines = sourceCode.split("\n");

  sourceLines.forEach((line, index) => {
    const lineNumber = index + 1;

    // A line carrying an uncovered identifier is always reported, even if the
    // heuristic would otherwise have skipped it.
    if (uncovered.has(lineNumber)) {
      lines.set(lineNumber, 0);
      return;
    }

    if (isCountableLine(line)) {
      lines.set(lineNumber, 1);
    }
  });

  let hit = 0;
  for (const hits of lines.values()) {
    if (hits > 0) {
      hit += 1;
    }
  }

  return { lines, found: lines.size, hit };
};

/**
 * Group uncovered identifiers by file, as 1-based line numbers.
 *
 * type-coverage-core reports 0-based lines, matching the TypeScript compiler;
 * every consumer of this module wants them 1-based.
 */
export const uncoveredLinesByFile = (
  data: CoverageData
): Map<string, Set<number>> => {
  const byFile = new Map<string, Set<number>>();

  for (const { file, line } of data.anys) {
    const lines = byFile.get(file) ?? new Set<number>();
    lines.add(line + 1);
    byFile.set(file, lines);
  }

  return byFile;
};
