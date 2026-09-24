import { lineCoverageForFile, uncoveredLinesByFile } from "../lineCoverage";
import type { CoverageData } from "../../getCoverage";

describe("lineCoverageForFile", () => {
  it("marks lines containing an uncovered identifier as not hit", () => {
    const { lines, found, hit } = lineCoverageForFile(
      [
        "const a: number = 1;",
        "const b: any = 2;",
        "const c: string = 'x';"
      ].join("\n"),
      [2]
    );

    expect(lines.get(1)).toBe(1);
    expect(lines.get(2)).toBe(0);
    expect(lines.get(3)).toBe(1);
    expect(found).toBe(3);
    expect(hit).toBe(2);
  });

  it("excludes blank lines from the denominator", () => {
    expect(
      lineCoverageForFile("const a = 1;\n\n\nconst b = 2;", []).found
    ).toBe(2);
  });

  it.each([
    ["a line comment", "// a comment"],
    ["a block comment opener", "/* a comment"],
    ["a block comment body", " * more comment"],
    ["a block comment closer", "*/"]
  ])("excludes %s", (_label, line) => {
    expect(lineCoverageForFile(`const a = 1;\n${line}`, []).found).toBe(1);
  });

  it("still reports a commented line that carries an uncovered identifier", () => {
    // The heuristic must never be able to hide an any. A line the comment
    // rules would skip is emitted anyway when it holds an uncovered type.
    const { lines, found } = lineCoverageForFile("const a = 1;\n// x", [2]);

    expect(lines.get(2)).toBe(0);
    expect(found).toBe(2);
  });

  it("reports a fully covered file as all hit", () => {
    const { found, hit } = lineCoverageForFile(
      "const a = 1;\nconst b = 2;",
      []
    );

    expect(found).toBe(2);
    expect(hit).toBe(2);
  });

  it("handles an empty file", () => {
    expect(lineCoverageForFile("", [])).toMatchObject({ found: 0, hit: 0 });
  });

  it("keeps DA records consistent with LF and LH", () => {
    // genhtml and Codecov both reject a file where these disagree.
    const { lines, found, hit } = lineCoverageForFile(
      "const a = 1;\nconst b: any = 2;\n\n// c\nconst d = 3;",
      [2]
    );

    expect(lines.size).toBe(found);
    expect([...lines.values()].filter((hits) => hits > 0)).toHaveLength(hit);
  });
});

describe("uncoveredLinesByFile", () => {
  const data = {
    fileCounts: new Map(),
    anys: [
      { file: "a.ts", line: 0, character: 1, text: "x", kind: 1 },
      { file: "a.ts", line: 4, character: 1, text: "y", kind: 1 },
      { file: "b.ts", line: 2, character: 1, text: "z", kind: 1 }
    ],
    percentage: 0,
    total: 0,
    covered: 0,
    uncovered: 0
  } as unknown as CoverageData;

  it("converts core's 0-based lines to 1-based", () => {
    // Verified against type-coverage-core: an `any` on source line 2 is
    // reported as line 1.
    expect([...(uncoveredLinesByFile(data).get("a.ts") ?? [])]).toEqual([1, 5]);
  });

  it("groups by file", () => {
    expect([...uncoveredLinesByFile(data).keys()]).toEqual(["a.ts", "b.ts"]);
  });

  it("deduplicates several anys on one line", () => {
    const sameLine = {
      ...data,
      anys: [
        { file: "a.ts", line: 3, character: 1, text: "x", kind: 1 },
        { file: "a.ts", line: 3, character: 9, text: "y", kind: 1 }
      ]
    } as unknown as CoverageData;

    expect([...(uncoveredLinesByFile(sameLine).get("a.ts") ?? [])]).toEqual([
      4
    ]);
  });
});
