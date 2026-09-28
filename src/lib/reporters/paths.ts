/**
 * Normalise a filesystem path for use inside a coverage artefact.
 *
 * type-coverage-core reports paths using the platform separator, so on
 * Windows they arrive as `src\index.ts`. Both lcov and Cobertura are consumed
 * by tools that match these against repository paths -- Codecov, Coveralls,
 * SonarQube, Azure Pipelines -- and all of them expect forward slashes. An
 * artefact generated on a Windows runner would otherwise match no files at
 * all, silently reporting zero coverage rather than failing loudly.
 *
 * Unlike the HTML reporter's toURLPath, this does not percent-encode:
 * these are paths in a data file, not URLs in a document.
 */
export const toPosixPath = (value: string): string =>
  value.split("\\").join("/");

/**
 * Split a path into segments that are safe to use as name components.
 *
 * type-coverage reports paths relative to the working directory, so with
 * `--not-only-in-cwd` a linked package arrives as `../../pkg/a.ts`. Those
 * upward segments are meaningless once the path is used as a *name* -- and
 * actively dangerous when joined back onto a directory, because
 * `path.join(outputDir, "files", "../../pkg/a.ts.html")` resolves outside the
 * output directory and writes into the user's own tree.
 *
 * Each upward segment therefore becomes a literal `__`, which preserves the
 * shape of the tree (and so the depth that relative links are computed from)
 * while keeping every result under its parent. Leading `.` and the empty
 * segment of an absolute path are dropped, and a Windows drive keeps only its
 * letter, `C:` not being a legal directory name.
 */
export const toSafeSegments = (value: string): string[] =>
  toPosixPath(value)
    .split("/")
    .filter((segment) => segment !== "" && segment !== ".")
    .map((segment) => segment.replace(/^([A-Za-z]):$/, "$1"))
    .map((segment) => (segment === ".." ? "__" : segment));
