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
