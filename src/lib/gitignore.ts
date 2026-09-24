import { execFileSync } from "node:child_process";
import type { CoverageData } from "./getCoverage";

/**
 * Drop files that git ignores.
 *
 * Requested in #69: a `dist` directory listed in .gitignore still appeared in
 * the report. The underlying cause is not this tool -- a tsconfig with no
 * `exclude` compiles `dist`, and the report faithfully shows what TypeScript
 * compiled -- but "it is in my .gitignore" is a reasonable thing to expect to
 * work, and tsconfig is not always under the reporter's control.
 *
 * git is asked rather than .gitignore being parsed here. Correct gitignore
 * semantics include negation, precedence, nested .gitignore files and
 * directory-only patterns; a hand-rolled matcher would be subtly wrong in
 * ways that silently hide or reveal files. `git check-ignore` is the same
 * implementation git itself uses, needs no dependency, and costs one process.
 */
export type GitIgnoreFilter = {
  data: CoverageData;
  unavailable?: string;
};

const CHUNK_SIZE = 500;

/** Which of these paths does git ignore? Empty set when git cannot answer. */
export const gitIgnoredPaths = (
  files: readonly string[],
  cwd: string = process.cwd()
): { ignored: Set<string>; unavailable?: string } => {
  if (files.length === 0) {
    return { ignored: new Set() };
  }

  const ignored = new Set<string>();

  // Chunked to stay clear of argument and pipe limits on large projects.
  for (let index = 0; index < files.length; index += CHUNK_SIZE) {
    const chunk = files.slice(index, index + CHUNK_SIZE);

    try {
      const output = execFileSync("git", ["check-ignore", "--stdin", "-z"], {
        cwd,
        input: `${chunk.join("\0")}\0`,
        encoding: "utf8"
      });

      for (const path of output.split("\0")) {
        if (path !== "") {
          ignored.add(path);
        }
      }
    } catch (error) {
      const status = (error as { status?: number }).status;

      // check-ignore exits 1 when it matched nothing. That is a normal
      // answer, not a failure.
      if (status === 1) {
        continue;
      }

      // Anything else -- git missing, not a repository -- means the question
      // cannot be answered. Report once and leave the data untouched rather
      // than silently dropping nothing or everything.
      return {
        ignored: new Set(),
        unavailable:
          status === 128
            ? "not a git repository"
            : `git check-ignore failed: ${(error as Error).message.split("\n")[0]}`
      };
    }
  }

  return { ignored };
};

/** Totals are adjusted by subtraction, for the same reason excludeOutputDir
 *  does it: under --strict, core counts unused ignore directives in
 *  totalCount without listing them in fileCounts, so recomputing would change
 *  the numbers strict users see. */
export const excludeGitIgnored = (
  data: CoverageData,
  cwd: string = process.cwd()
): GitIgnoreFilter => {
  const { ignored, unavailable } = gitIgnoredPaths(
    [...data.fileCounts.keys()],
    cwd
  );

  if (unavailable || ignored.size === 0) {
    return { data, unavailable };
  }

  const fileCounts: CoverageData["fileCounts"] = new Map();
  let removedTotal = 0;
  let removedCorrect = 0;

  for (const [filename, counts] of data.fileCounts) {
    if (ignored.has(filename)) {
      removedTotal += counts.totalCount;
      removedCorrect += counts.correctCount;
      continue;
    }

    fileCounts.set(filename, counts);
  }

  const total = data.total - removedTotal;
  const covered = data.covered - removedCorrect;

  return {
    data: {
      fileCounts,
      anys: data.anys.filter(({ file }) => !ignored.has(file)),
      percentage: total === 0 ? 100 : (covered * 100) / total,
      total,
      covered,
      uncovered: total - covered
    }
  };
};
