import {
  CODEMIRROR_CSS,
  CODEMIRROR_JAVASCRIPT_MODE_JS,
  CODEMIRROR_JS,
  SEMANTIC_UI_CSS,
  SORTTABLE_JS,
  isExternalAsset
} from "../assets";

const all = [
  SEMANTIC_UI_CSS,
  SORTTABLE_JS,
  CODEMIRROR_JS,
  CODEMIRROR_JAVASCRIPT_MODE_JS,
  CODEMIRROR_CSS
];

describe("external assets", () => {
  it.each(all.map((asset) => [asset.url, asset]))(
    "%s is pinned with a subresource integrity hash",
    (_url, asset) => {
      expect(asset.integrity).toMatch(
        /^sha(256|384|512)-[A-Za-z0-9+/]+={0,2}$/
      );
    }
  );

  it("serves every asset over https", () => {
    for (const asset of all) {
      expect(asset.url.startsWith("https://")).toBe(true);
    }
  });

  it("keeps all CodeMirror assets on one version", () => {
    const versions = [
      CODEMIRROR_JS,
      CODEMIRROR_JAVASCRIPT_MODE_JS,
      CODEMIRROR_CSS
    ].map(({ url }) => /codemirror\/([\d.]+)\//.exec(url)?.[1]);

    expect(new Set(versions).size).toBe(1);
  });

  it("is past the 5.58.2 pin that broke template-literal highlighting (#61)", () => {
    const version =
      /codemirror\/([\d.]+)\//.exec(CODEMIRROR_JS.url)?.[1] ?? "0";
    const [major, minor, patch] = version.split(".").map(Number);

    expect([major, minor, patch] > [5, 58, 2]).toBe(true);
  });

  it("distinguishes pinned external assets from local paths", () => {
    expect(isExternalAsset(CODEMIRROR_JS)).toBe(true);
    expect(isExternalAsset("../assets/report.css")).toBe(false);
  });
});
