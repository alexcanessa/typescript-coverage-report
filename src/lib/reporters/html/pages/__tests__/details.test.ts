import { generateDetailsPage } from "../details";

const decode = (value: string): string =>
  value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&");

const render = (
  overrides: Partial<Parameters<typeof generateDetailsPage>[0]> = {}
) =>
  generateDetailsPage({
    filename: "src/index.ts",
    sourceCode: "export const a: number = 1;",
    totalCount: 10,
    correctCount: 8,
    annotations: [],
    threshold: 80,
    ...overrides
  });

describe("generateDetailsPage", () => {
  it("renders the counts", () => {
    const html = render();

    expect(html).toContain("<td>80.00%</td>");
    expect(html).toContain("<td>10</td>");
    expect(html).toContain("<td>8</td>");
    expect(html).toContain("<td>2</td>");
  });

  it("treats a percentage exactly on the threshold as passing", () => {
    expect(
      render({ totalCount: 10, correctCount: 8, threshold: 80 })
    ).toContain('class="positive"');
    expect(
      render({ totalCount: 10, correctCount: 7, threshold: 80 })
    ).toContain('class="negative"');
  });

  it("reports 100% for a file with no counted identifiers", () => {
    expect(render({ totalCount: 0, correctCount: 0 })).toContain(
      "<td>100.00%</td>"
    );
  });

  describe("escaping", () => {
    it("does not let source code terminate the textarea", () => {
      // The regression: React escaped this automatically, template literals
      // do not. A source file containing a literal closing tag ended the
      // editor early and broke every annotation on the page.
      const html = render({
        sourceCode: 'const x = "</textarea><script>alert(1)</script>";'
      });

      expect(html.match(/<\/textarea>/g)).toHaveLength(1);
      expect(html).toContain("&lt;/textarea&gt;");
      expect(html).not.toContain("<script>alert(1)</script>");
    });

    it("round-trips the source exactly once decoded", () => {
      const sourceCode = "const a = \"a & b\"; // <tag> & 'quoted'";
      const html = render({ sourceCode });
      const textarea = /<textarea[^>]*>([\s\S]*?)<\/textarea>/.exec(html);

      expect(textarea).not.toBeNull();
      expect(decode(textarea![1])).toBe(sourceCode);
    });

    it("does not corrupt source that already contains entity text", () => {
      // Unescaped, the browser would decode this and display "a & b",
      // silently misrepresenting the file.
      const html = render({ sourceCode: "const s = 'a &amp; b';" });

      expect(html).toContain("&amp;amp;");
    });

    it("keeps the annotations parseable as JSON", () => {
      const annotations = [
        { file: "src/index.ts", line: 1, character: 5, text: '"<any>" & more' }
      ];
      const html = render({ annotations });
      const block = /<pre id="annotations"[^>]*>([\s\S]*?)<\/pre>/.exec(html);

      expect(block).not.toBeNull();
      expect(JSON.parse(decode(block![1]))).toEqual(annotations);
    });

    it("escapes the filename in the table", () => {
      expect(render({ filename: "src/<weird>&.ts" })).toContain(
        "src/&lt;weird&gt;&amp;.ts"
      );
    });
  });

  it("puts the source flush against the opening textarea tag", () => {
    // HTML parsers strip exactly one leading newline inside a textarea. A
    // newline here would shift every line by one and misplace every gutter
    // marker that assets/source-file.js draws.
    expect(render({ sourceCode: "line one" })).toContain(
      ">line one</textarea>"
    );
  });

  describe("link back to the index", () => {
    it.each([
      ["a.ts", "../index.html"],
      ["src/a.ts", "../../index.html"],
      ["src/deep/nested/a.ts", "../../../../index.html"]
    ])("walks up from %s", (filename, expected) => {
      expect(render({ filename })).toContain(`href="${expected}"`);
    });
  });
});
