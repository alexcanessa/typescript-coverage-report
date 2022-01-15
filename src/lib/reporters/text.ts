import Table, { Cell } from "cli-table3";
import { CoverageData } from "../getCoverage";
import chalk from "chalk";

const coverageTable = new Table({
  chars: { mid: "", "left-mid": "", "mid-mid": "", "right-mid": "" },
  colAligns: ["left", "right", "right", "right", "right"],
  style: { "padding-left": 1, "padding-right": 1 }
});

const calculatePercantage = (correct: number, total: number): number => {
  if (total === 0) {
    return 100;
  }

  return (correct * 100) / total;
};

const calculatePercantageWithString = (
  correct: number,
  total: number
): string => {
  return `${calculatePercantage(correct, total).toFixed(2)}%`;
};

export const generate = (
  { fileCounts, percentage, total, covered, uncovered }: CoverageData,
  threshold: number
): string => {
  const headers = [
    "filenames" + chalk.gray(` (${fileCounts.size})`),
    "percent" + chalk.gray(` (${percentage.toFixed(2)}%)`),
    "total" + chalk.gray(` (${total})`),
    "covered" + chalk.gray(` (${covered})`),
    "uncovered" + chalk.gray(` (${uncovered})`)
  ];

  coverageTable.push(
    // @ts-expect-error For some reason TS doesn't narrow to horizontal table.
    headers,
    headers.map(() => chalk.gray("---"))
  );

  fileCounts.forEach(
    (
      {
        totalCount,
        correctCount
      }: { totalCount: number; correctCount: number },
      filename: string
    ) => {
      const colorCell = (cell: Cell): Cell => {
        const color =
          Math.floor(calculatePercantage(correctCount, totalCount)) >= threshold
            ? chalk.green
            : chalk.red;
        if (typeof cell === "object" && "content" in cell) {
          return { ...cell, content: color(cell.content) };
        }

        return color(cell);
      };

      coverageTable.push(
        // @ts-expect-error For some reason TS doesn't narrow to horizontal table.
        [
          filename,
          calculatePercantageWithString(correctCount, totalCount),
          totalCount,
          correctCount,
          totalCount - correctCount
        ].map((val) => colorCell(val))
      );
    }
  );

  return "" + coverageTable;
};
