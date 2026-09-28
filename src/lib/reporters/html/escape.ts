import { toSafeSegments } from "../paths";

/**
 * Escaping helpers for the generated report.
 *
 * Until 1.1.0 the report was rendered with React, which escaped every
 * interpolated value automatically. The rewrite to template literals kept the
 * markup but dropped the escaping, so file names and source code now land in
 * the HTML verbatim. That is both a correctness bug (a source file containing
 * `&amp;` is displayed wrongly) and a structural one (a file containing a literal
 * closing textarea tag terminates the editor early and breaks highlighting).
 */

const HTML_ENTITIES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

/** Escape a value for interpolation into element content or an attribute. */
export const escapeHTML = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => HTML_ENTITIES[character]);

/**
 * Turn a filesystem path into a URL path.
 *
 * Separators are normalised because path.join produces backslashes on
 * Windows, which are not path separators in a URL, and each segment is
 * percent-encoded so that a file named `my file#1.ts` still links correctly.
 */
export const toURLPath = (value: string): string =>
  value
    .split(/[\\/]/)
    .map((segment) => encodeURIComponent(segment))
    .join("/");

/**
 * Map a source path onto the path its detail page gets inside `files/`.
 *
 * See toSafeSegments for why the upward segments cannot be left alone: a file
 * outside the working directory would otherwise have its detail page written
 * outside the output directory entirely.
 */
export const toPagePath = (filename: string): string =>
  toSafeSegments(filename).join("/");

/**
 * The URL prefix that walks from a detail page back to the report root.
 *
 * Takes the path produced by {@link toPagePath}, not the source path: a page
 * sits as many directories below the root as its *page* path has segments,
 * and the two differ as soon as the source path is absolute or reaches
 * outside the working directory.
 *
 * This replaces `path.relative(filename, "assets")`, which passed a *file*
 * path where a directory was expected. That happened to produce the right
 * answer -- the extra `..` from treating the file as a directory cancels out
 * the extra `files/` level -- but only by coincidence, and it emitted
 * backslashes on Windows.
 */
export const relativeToRoot = (pagePath: string): string =>
  "../".repeat(toURLPath(pagePath).split("/").length);
