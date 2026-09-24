/**
 * Third-party assets the generated report loads from a CDN.
 *
 * Kept in one place with Subresource Integrity hashes. The report is an HTML
 * page developers open locally, and it previously pulled four unpinned-by-hash
 * scripts and stylesheets; a compromised or swapped CDN file would run with
 * whatever the page can reach.
 *
 * CodeMirror was pinned at 5.58.2 since 2020. The fix for template-literal
 * types breaking the highlighter landed upstream shortly after and was linked
 * on #61 five years ago.
 */

export type ExternalAsset = {
  url: string;
  integrity: string;
};

/** Latest of the CodeMirror 5 line. CodeMirror 6 is ESM-only and would need a bundler. */
const CODEMIRROR_VERSION = "5.65.21";
const CODEMIRROR_CDN = `https://cdnjs.cloudflare.com/ajax/libs/codemirror/${CODEMIRROR_VERSION}`;

export const SEMANTIC_UI_CSS: ExternalAsset = {
  url: "https://cdn.jsdelivr.net/npm/semantic-ui@2.4.2/dist/semantic.min.css",
  integrity:
    "sha384-JKIDqM48bt14NZpzl9v0AP36VK2C/X6RuSPfimxpoWdSANUXblZUX1cgdQw8cZUK"
};

export const SORTTABLE_JS: ExternalAsset = {
  url: "https://cdn.jsdelivr.net/npm/sorttable@1.0.2/sorttable.min.js",
  integrity:
    "sha384-o61HqOhO/13uVgXay+xXi8W5P5UYDK+voHjwFghH8qTzv4+Y4lkN1mAqlZLr3M0j"
};

export const CODEMIRROR_JS: ExternalAsset = {
  url: `${CODEMIRROR_CDN}/codemirror.min.js`,
  integrity:
    "sha512-2GhuAIxcoXqN+nBSa8DZSpChVQNliC1wHHgTE6BEkISu+0+3ywUEF5RJrmWyD67Kxm6XjJkULfpU8hdzLMuFhA=="
};

export const CODEMIRROR_JAVASCRIPT_MODE_JS: ExternalAsset = {
  url: `${CODEMIRROR_CDN}/mode/javascript/javascript.min.js`,
  integrity:
    "sha512-k1xN8Ok3EjJVqkyue+rrYB9WJi34a101SAdtjJGS4sM0ZSFTb7IBseqeCL4OcKzmQRmtrKIYqVROZYIpHXc3Mg=="
};

export const CODEMIRROR_CSS: ExternalAsset = {
  url: `${CODEMIRROR_CDN}/codemirror.min.css`,
  integrity:
    "sha512-yAvYFCgl0jKssk1XXo079Ec7sVXfN3OIotWiUP7zTrHhcRxMgRnEFjYhesnBZSfYPkd3sX7BmVTaWQLXvITMnQ=="
};

export const isExternalAsset = (
  asset: string | ExternalAsset
): asset is ExternalAsset => typeof asset !== "string";
