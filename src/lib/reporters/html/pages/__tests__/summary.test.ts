import { generateSummaryPage } from "../summary";
import type { CoverageData } from "../../../../getCoverage";

const render = (
  overrides: Partial<Omit<CoverageData, "anys"> & { threshold: number }> = {}
) =>
  generateSummaryPage({
    fileCounts: new Map([
      ["src/index.ts", { correctCount: 8, totalCount: 10 }]
    ]),
    percentage: 80,
    total: 10,
    covered: 8,
    uncovered: 2,
    threshold: 80,
    ...overrides
  });

describe("generateSummaryPage", () => {
  it("renders the summary row", () => {
    const html = render();

    expect(html).toContain("<td>80.00%</td>");
    expect(html).toContain("<td>80%</td>");
  });

  it("treats a percentage exactly on the threshold as passing", () => {
    expect(render({ percentage: 80, threshold: 80 })).toContain(
      'class="positive"'
    );
    expect(render({ percentage: 79.99, threshold: 80 })).toContain(
      'class="negative"'
    );
  });

  it("renders one row per file", () => {
    const html = render({
      fileCounts: new Map([
        ["src/a.ts", { correctCount: 1, totalCount: 2 }],
        ["src/b.ts", { correctCount: 2, totalCount: 2 }]
      ])
    });

    expect(html).toContain('href="files/src/a.ts.html"');
    expect(html).toContain('href="files/src/b.ts.html"');
  });

  it("escapes file names in both the link text and the title attribute", () => {
    const html = render({
      fileCounts: new Map([
        ["src/<weird>&.ts", { correctCount: 1, totalCount: 2 }]
      ])
    });

    expect(html).toContain('title="src/&lt;weird&gt;&amp;.ts"');
    expect(html).not.toContain("<weird>");
  });

  it("percent-encodes characters that would break the href", () => {
    const html = render({
      fileCounts: new Map([
        ["src/my file#1.ts", { correctCount: 1, totalCount: 2 }]
      ])
    });

    expect(html).toContain('href="files/src/my%20file%231.ts.html"');
  });

  it("uses forward slashes even for Windows-style paths", () => {
    const html = render({
      fileCounts: new Map([
        ["src\\lib\\a.ts", { correctCount: 1, totalCount: 2 }]
      ])
    });

    // Only the href is normalised; the link text keeps the real on-disk path.
    expect(html).toContain('href="files/src/lib/a.ts.html"');
    expect(/href="[^"]*\\/.test(html)).toBe(false);
  });

  it("reports 100% for a file with no counted identifiers", () => {
    const html = render({
      fileCounts: new Map([
        ["src/empty.ts", { correctCount: 0, totalCount: 0 }]
      ])
    });

    expect(html).toContain("<td>100.00%</td>");
  });
});
