import fs from "node:fs";
import path from "node:path";
import generateCoverageReport from "../index";
import getCoverage from "../getCoverage";
import { generate as generateHTML } from "../reporters/html";
import { generate as generateJSON } from "../reporters/json";
import type { CoverageData } from "../getCoverage";

jest.mock("node:fs", () => ({
  __esModule: true,
  default: {
    promises: {
      rm: jest.fn().mockResolvedValue(undefined),
      mkdir: jest.fn().mockResolvedValue(undefined),
      cp: jest.fn().mockResolvedValue(undefined)
    }
  }
}));

jest.mock("../getCoverage", () => ({
  __esModule: true,
  default: jest.fn()
}));

jest.mock("../reporters/text", () => ({ generate: jest.fn(() => "") }));
jest.mock("../reporters/html", () => ({ generate: jest.fn() }));
jest.mock("../reporters/json", () => ({ generate: jest.fn() }));

const mockedGetCoverage = getCoverage as jest.MockedFunction<
  typeof getCoverage
>;
const rm = fs.promises.rm as jest.MockedFunction<typeof fs.promises.rm>;
const mkdir = fs.promises.mkdir as jest.MockedFunction<
  typeof fs.promises.mkdir
>;
const cp = fs.promises.cp as jest.MockedFunction<typeof fs.promises.cp>;

const coverage = (overrides: Partial<CoverageData> = {}): CoverageData => ({
  fileCounts: new Map([["src/index.ts", { correctCount: 8, totalCount: 10 }]]),
  anys: [],
  percentage: 80,
  total: 10,
  covered: 8,
  uncovered: 2,
  ...overrides
});

describe("generateCoverageReport", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(console, "log").mockImplementation(() => undefined);
    mockedGetCoverage.mockResolvedValue(coverage());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("deletes the output directory before running the type check", async () => {
    // This is the regression test for #161 and #140. Running the type check
    // first meant the previous run's output was part of the TypeScript
    // program, and deleting it afterwards made the HTML reporter read files
    // that no longer existed (ENOENT -> exit 255).
    await generateCoverageReport({ outputDir: "coverage-ts", threshold: 80 });

    expect(rm).toHaveBeenCalledTimes(1);
    expect(mockedGetCoverage).toHaveBeenCalledTimes(1);
    expect(rm.mock.invocationCallOrder[0]).toBeLessThan(
      mockedGetCoverage.mock.invocationCallOrder[0]
    );
  });

  it("removes the directory recursively and tolerates it being absent", async () => {
    await generateCoverageReport({ outputDir: "coverage-ts", threshold: 80 });

    expect(rm).toHaveBeenCalledWith(
      path.resolve(process.cwd(), "coverage-ts"),
      {
        recursive: true,
        force: true
      }
    );
  });

  it("recreates the output directory recursively, so nested paths work", async () => {
    await generateCoverageReport({
      outputDir: "reports/coverage-ts",
      threshold: 80
    });

    expect(mkdir).toHaveBeenCalledWith(
      path.resolve(process.cwd(), "reports/coverage-ts"),
      { recursive: true }
    );
  });

  it("adds the output directory to ignoreFiles", async () => {
    await generateCoverageReport({ outputDir: "coverage-ts", threshold: 80 });

    expect(mockedGetCoverage).toHaveBeenCalledWith(
      expect.objectContaining({ ignoreFiles: ["coverage-ts/**"] })
    );
  });

  it("preserves caller-supplied ignoreFiles", async () => {
    await generateCoverageReport({
      outputDir: "coverage-ts",
      threshold: 80,
      ignoreFiles: ["vendor/**"]
    });

    expect(mockedGetCoverage).toHaveBeenCalledWith(
      expect.objectContaining({ ignoreFiles: ["vendor/**", "coverage-ts/**"] })
    );
  });

  it("filters the output directory out of the reported data", async () => {
    mockedGetCoverage.mockResolvedValue(
      coverage({
        fileCounts: new Map([
          ["src/index.ts", { correctCount: 8, totalCount: 10 }],
          [
            "coverage-ts/assets/source-file.js",
            { correctCount: 5, totalCount: 5 }
          ]
        ]),
        percentage: 86.66,
        total: 15,
        covered: 13,
        uncovered: 2
      })
    );

    const result = await generateCoverageReport({
      outputDir: "coverage-ts",
      threshold: 80
    });

    expect([...result.fileCounts.keys()]).toEqual(["src/index.ts"]);
    expect(result.total).toBe(10);
    expect(result.covered).toBe(8);
  });

  it("passes the resolved output directory to the reporters", async () => {
    await generateCoverageReport({ outputDir: "coverage-ts", threshold: 80 });

    const expected = path.resolve(process.cwd(), "coverage-ts");
    expect(generateHTML).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ outputDir: expected })
    );
    expect(generateJSON).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ outputDir: expected })
    );
  });

  it("copies the bundled assets into the output directory", async () => {
    await generateCoverageReport({ outputDir: "coverage-ts", threshold: 80 });

    expect(cp).toHaveBeenCalledWith(
      expect.stringContaining("assets"),
      path.join(path.resolve(process.cwd(), "coverage-ts"), "assets"),
      { recursive: true }
    );
  });

  it("refuses to use the working directory as the output directory", async () => {
    await expect(
      generateCoverageReport({ outputDir: ".", threshold: 80 })
    ).rejects.toThrow(/current directory/);

    expect(rm).not.toHaveBeenCalled();
  });
});
