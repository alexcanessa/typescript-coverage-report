import path from "node:path";
import type { CoverageData } from "./getCoverage";

/**
 * Is `file` contained within `parent`?
 *
 * Deliberately not a `startsWith` check: "coverage-ts" is a string prefix of
 * "coverage-ts-old", so a naive comparison would also swallow a sibling
 * directory. Comparing the relative path is the only reliable form, and it
 * handles Windows separators for free.
 */
export const isInside = (
  parent: string,
  file: string,
  cwd = process.cwd()
): boolean => {
  const relative = path.relative(parent, path.resolve(cwd, file));

  return (
    relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative)
  );
};

/**
 * Refuse output directories whose removal would destroy the user's work.
 *
 * The report directory is deleted on every run. That deletion now happens
 * before the type check rather than after it, so it fires in strictly more
 * cases than it used to and is worth guarding.
 */
export const assertSafeOutputDir = (
  outputDir: string,
  cwd = process.cwd()
): void => {
  const resolved = path.resolve(cwd, outputDir);
  const relative = path.relative(resolved, cwd);
  const isCwdOrAncestor =
    relative === "" ||
    (!relative.startsWith("..") && !path.isAbsolute(relative));

  if (isCwdOrAncestor) {
    throw new Error(
      `Refusing to use "${outputDir}" as the output directory: it resolves to ` +
        `${resolved}, which is the current directory or one of its parents, ` +
        `and the output directory is deleted on every run.`
    );
  }
};

/**
 * Drop the report's own output from a previous run.
 *
 * type-coverage-core reports whatever the TypeScript program contains. When a
 * project has no explicit `include`, that program picks up the last run's
 * generated JSON and assets, which both pollutes the table and makes the HTML
 * reporter read files that are about to be deleted.
 *
 * Totals are adjusted by subtraction rather than recomputed from fileCounts:
 * under --strict, core increments totalCount for unused ignore directives
 * without reflecting them in fileCounts, so recomputing would silently change
 * the numbers reported to strict users.
 */
export const excludeOutputDir = (
  data: CoverageData,
  outputDir: string,
  cwd = process.cwd()
): CoverageData => {
  const resolved = path.resolve(cwd, outputDir);
  const fileCounts: CoverageData["fileCounts"] = new Map();
  let removedTotal = 0;
  let removedCorrect = 0;
  let removed = 0;

  for (const [filename, counts] of data.fileCounts) {
    if (isInside(resolved, filename, cwd)) {
      removed += 1;
      removedTotal += counts.totalCount;
      removedCorrect += counts.correctCount;
      continue;
    }

    fileCounts.set(filename, counts);
  }

  if (removed === 0) {
    return data;
  }

  const total = data.total - removedTotal;
  const covered = data.covered - removedCorrect;

  return {
    fileCounts,
    anys: data.anys.filter(({ file }) => !isInside(resolved, file, cwd)),
    percentage: total === 0 ? 100 : (covered * 100) / total,
    total,
    covered,
    uncovered: total - covered
  };
};

/**
 * A glob that keeps the output directory out of the type check in the first
 * place. Only meaningful when the directory sits inside the project, since
 * core matches globs against paths relative to the working directory.
 */
export const outputDirIgnoreGlob = (
  outputDir: string,
  cwd = process.cwd()
): string | undefined => {
  const relative = path.relative(cwd, path.resolve(cwd, outputDir));

  if (
    relative === "" ||
    relative.startsWith("..") ||
    path.isAbsolute(relative)
  ) {
    return undefined;
  }

  return `${relative.split(path.sep).join("/")}/**`;
};
