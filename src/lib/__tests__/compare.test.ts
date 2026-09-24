import fs from "node:fs";
import os from "node:os";
import nodePath from "node:path";
import { compareToBaseline, formatComparison, readBaseline } from "../compare";
import type { CoverageData } from "../getCoverage";

const data = (
  files: Record<string, [number, number]>,
  percentage = 0
): CoverageData =>
  ({
    fileCounts: new Map(
      Object.entries(files).map(([name, [correctCount, totalCount]]) => [
        name,
        { correctCount, totalCount }
      ])
    ),
    anys: [],
    percentage,
    total: 0,
    covered: 0,
    uncovered: 0
  }) as unknown as CoverageData;

const baseline = (files: Record<string, [number, number]>, percentage = 0) => ({
  percentage,
  fileCounts: Object.fromEntries(
    Object.entries(files).map(([name, [correctCount, totalCount]]) => [
      name,
      { correctCount, totalCount }
    ])
  )
});

describe("compareToBaseline", () => {
  it("reports a file whose percentage dropped", () => {
    const result = compareToBaseline(
      data({ "a.ts": [1, 2] }),
      baseline({ "a.ts": [2, 2] })
    );

    expect(result.decreased).toEqual([
      { filename: "a.ts", before: 100, after: 50 }
    ]);
  });

  it("reports nothing when coverage improved", () => {
    expect(
      compareToBaseline(data({ "a.ts": [2, 2] }), baseline({ "a.ts": [1, 2] }))
        .decreased
    ).toEqual([]);
  });

  it("reports nothing when coverage is unchanged", () => {
    expect(
      compareToBaseline(data({ "a.ts": [1, 2] }), baseline({ "a.ts": [1, 2] }))
        .decreased
    ).toEqual([]);
  });

  it("compares percentages, not raw counts", () => {
    // Adding covered code to a file must not read as a regression.
    expect(
      compareToBaseline(data({ "a.ts": [8, 10] }), baseline({ "a.ts": [4, 5] }))
        .decreased
    ).toEqual([]);
  });

  it("ignores a file that is new since the baseline", () => {
    // New files are guarded by the overall threshold, not by this check.
    expect(
      compareToBaseline(
        data({ "new.ts": [0, 2] }),
        baseline({ "a.ts": [2, 2] })
      ).decreased
    ).toEqual([]);
  });

  it("ignores a file that was deleted", () => {
    expect(
      compareToBaseline(data({}), baseline({ "gone.ts": [2, 2] })).decreased
    ).toEqual([]);
  });

  it("treats a file with no counted identifiers as fully covered", () => {
    expect(
      compareToBaseline(data({ "a.ts": [0, 0] }), baseline({ "a.ts": [2, 2] }))
        .decreased
    ).toEqual([]);
  });

  it("does not report a floating point artefact as a regression", () => {
    // 2/3 computed from different counts must not trip the comparison.
    expect(
      compareToBaseline(data({ "a.ts": [2, 3] }), baseline({ "a.ts": [4, 6] }))
        .decreased
    ).toEqual([]);
  });

  it("sorts several regressions by filename", () => {
    const result = compareToBaseline(
      data({ "b.ts": [0, 2], "a.ts": [0, 2] }),
      baseline({ "a.ts": [2, 2], "b.ts": [2, 2] })
    );

    expect(result.decreased.map(({ filename }) => filename)).toEqual([
      "a.ts",
      "b.ts"
    ]);
  });

  it("carries the overall percentages through", () => {
    const result = compareToBaseline(
      data({ "a.ts": [1, 2] }, 50),
      baseline({ "a.ts": [2, 2] }, 100)
    );

    expect(result).toMatchObject({ overallBefore: 100, overallAfter: 50 });
  });

  it("tolerates a baseline with no fileCounts", () => {
    expect(compareToBaseline(data({ "a.ts": [1, 2] }), {}).decreased).toEqual(
      []
    );
  });
});

describe("formatComparison", () => {
  it("says so plainly when nothing decreased", () => {
    const output = formatComparison({
      decreased: [],
      overallBefore: 80,
      overallAfter: 85
    });

    expect(output).toContain("80.00% to 85.00%");
    expect(output).toContain("No file decreased.");
  });

  it("lists each regression with its delta", () => {
    const output = formatComparison({
      decreased: [{ filename: "a.ts", before: 100, after: 50 }],
      overallBefore: 100,
      overallAfter: 50
    });

    expect(output).toContain("1 file decreased:");
    expect(output).toContain("a.ts: 100.00% -> 50.00% (-50.00)");
  });

  it("pluralises correctly", () => {
    const output = formatComparison({
      decreased: [
        { filename: "a.ts", before: 100, after: 50 },
        { filename: "b.ts", before: 100, after: 50 }
      ],
      overallBefore: 100,
      overallAfter: 50
    });

    expect(output).toContain("2 files decreased:");
  });
});

describe("readBaseline", () => {
  let workspace: string;

  beforeEach(() => {
    workspace = fs.mkdtempSync(nodePath.join(os.tmpdir(), "tcr-baseline-"));
  });

  afterEach(() => {
    fs.rmSync(workspace, { recursive: true, force: true });
  });

  it("reads a coverage report", async () => {
    const file = nodePath.join(workspace, "b.json");
    fs.writeFileSync(file, JSON.stringify({ percentage: 80, fileCounts: {} }));

    await expect(readBaseline(file)).resolves.toMatchObject({ percentage: 80 });
  });

  it("throws a useful error when the file is missing", async () => {
    await expect(
      readBaseline(nodePath.join(workspace, "nope.json"))
    ).rejects.toThrow();
  });

  it("rejects a file that is valid JSON but not a report", async () => {
    const file = nodePath.join(workspace, "b.json");
    fs.writeFileSync(file, "null");

    await expect(readBaseline(file)).rejects.toThrow(/not a coverage report/);
  });

  it("rejects a file that is not JSON at all", async () => {
    const file = nodePath.join(workspace, "b.json");
    fs.writeFileSync(file, "definitely not json");

    await expect(readBaseline(file)).rejects.toThrow();
  });
});
