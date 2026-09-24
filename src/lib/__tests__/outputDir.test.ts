import path from "node:path";
import {
  assertSafeOutputDir,
  excludeOutputDir,
  isInside,
  outputDirIgnoreGlob
} from "../outputDir";
import type { CoverageData } from "../getCoverage";

const cwd = path.resolve("/project");

describe("isInside", () => {
  it("matches a file within the directory", () => {
    expect(
      isInside(path.join(cwd, "coverage-ts"), "coverage-ts/index.html", cwd)
    ).toBe(true);
  });

  it("matches a nested file", () => {
    expect(
      isInside(
        path.join(cwd, "coverage-ts"),
        "coverage-ts/assets/source-file.js",
        cwd
      )
    ).toBe(true);
  });

  it("does not match a sibling that shares a name prefix", () => {
    // A startsWith() check would wrongly swallow this one.
    expect(
      isInside(path.join(cwd, "coverage-ts"), "coverage-ts-old/index.html", cwd)
    ).toBe(false);
  });

  it("does not match an unrelated file", () => {
    expect(isInside(path.join(cwd, "coverage-ts"), "src/index.ts", cwd)).toBe(
      false
    );
  });

  it("does not match the directory itself", () => {
    expect(isInside(path.join(cwd, "coverage-ts"), "coverage-ts", cwd)).toBe(
      false
    );
  });

  it("handles absolute paths", () => {
    expect(
      isInside(
        path.join(cwd, "coverage-ts"),
        path.join(cwd, "coverage-ts", "a.html"),
        cwd
      )
    ).toBe(true);
  });
});

describe("assertSafeOutputDir", () => {
  it("allows a directory inside the project", () => {
    expect(() => assertSafeOutputDir("coverage-ts", cwd)).not.toThrow();
  });

  it("allows a nested directory", () => {
    expect(() => assertSafeOutputDir("reports/coverage-ts", cwd)).not.toThrow();
  });

  it("allows a directory outside the project", () => {
    expect(() =>
      assertSafeOutputDir(path.resolve("/tmp/report"), cwd)
    ).not.toThrow();
  });

  it("refuses the working directory itself", () => {
    expect(() => assertSafeOutputDir(".", cwd)).toThrow(/current directory/);
  });

  it("refuses a parent of the working directory", () => {
    expect(() => assertSafeOutputDir("..", cwd)).toThrow(
      /current directory or one of its parents/
    );
  });

  it("refuses the filesystem root", () => {
    expect(() => assertSafeOutputDir(path.parse(cwd).root, cwd)).toThrow();
  });
});

describe("outputDirIgnoreGlob", () => {
  it("builds a glob for a directory inside the project", () => {
    expect(outputDirIgnoreGlob("coverage-ts", cwd)).toBe("coverage-ts/**");
  });

  it("uses forward slashes for nested directories", () => {
    expect(outputDirIgnoreGlob(path.join("reports", "ts"), cwd)).toBe(
      "reports/ts/**"
    );
  });

  it("returns undefined for a directory outside the project", () => {
    expect(
      outputDirIgnoreGlob(path.resolve("/tmp/report"), cwd)
    ).toBeUndefined();
  });
});

describe("excludeOutputDir", () => {
  const data: CoverageData = {
    fileCounts: new Map([
      ["src/index.ts", { correctCount: 8, totalCount: 10 }],
      ["coverage-ts/assets/source-file.js", { correctCount: 5, totalCount: 5 }],
      ["coverage-ts-old/keep.ts", { correctCount: 2, totalCount: 4 }]
    ]),
    anys: [
      { file: "src/index.ts", line: 1, character: 1, text: "any" },
      {
        file: "coverage-ts/assets/source-file.js",
        line: 2,
        character: 1,
        text: "any"
      }
    ],
    percentage: 78.94,
    total: 19,
    covered: 15,
    uncovered: 4
  };

  it("drops files that live in the output directory", () => {
    const result = excludeOutputDir(data, "coverage-ts", cwd);

    expect([...result.fileCounts.keys()]).toEqual([
      "src/index.ts",
      "coverage-ts-old/keep.ts"
    ]);
  });

  it("drops the matching annotations", () => {
    const result = excludeOutputDir(data, "coverage-ts", cwd);

    expect(result.anys).toEqual([
      { file: "src/index.ts", line: 1, character: 1, text: "any" }
    ]);
  });

  it("adjusts the totals by subtraction", () => {
    const result = excludeOutputDir(data, "coverage-ts", cwd);

    expect(result.total).toBe(14);
    expect(result.covered).toBe(10);
    expect(result.uncovered).toBe(4);
    expect(result.percentage).toBeCloseTo((10 * 100) / 14);
  });

  it("returns the original object when nothing matches", () => {
    expect(excludeOutputDir(data, "somewhere-else", cwd)).toBe(data);
  });

  it("reports 100% when everything was excluded", () => {
    const only: CoverageData = {
      fileCounts: new Map([["out/a.js", { correctCount: 1, totalCount: 2 }]]),
      anys: [],
      percentage: 50,
      total: 2,
      covered: 1,
      uncovered: 1
    };

    expect(excludeOutputDir(only, "out", cwd).percentage).toBe(100);
  });
});
