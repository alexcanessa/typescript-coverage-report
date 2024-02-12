import { generate } from "../json";
import fs from "fs";
import path from "path";
import { CoverageData } from "../../getCoverage";

const fsMocked = fs.promises as jest.Mocked<typeof fs.promises>;
jest.mock("fs", () => ({
  promises: {
    writeFile: jest.fn().mockResolvedValue(undefined)
  }
}));

describe("generate function", () => {
  const coverageData: CoverageData = {
    fileCounts: new Map([
      ["file1.ts", { correctCount: 10, totalCount: 15 }],
      ["file2.ts", { correctCount: 5, totalCount: 5 }]
    ]),
    anys: [{ file: "file1.ts", character: 1, kind: 1, line: 2, text: "test" }],
    percentage: 75,
    total: 20,
    covered: 15,
    uncovered: 5
  };

  const options = {
    outputDir: "./coverage",
    threshold: 80
  };

  it("writes the correct file with serialized coverage data", async () => {
    await generate(coverageData, options);

    const expectedFilePath = path.join(
      options.outputDir,
      "typescript-coverage.json"
    );
    expect(fsMocked.writeFile).toHaveBeenCalledWith(
      expectedFilePath,
      expect.any(String)
    );

    expect(
      JSON.parse(fsMocked.writeFile.mock.calls[0][1].toString())
    ).toMatchObject({
      fileCounts: {
        "file1.ts": {
          correctCount: expect.any(Number),
          totalCount: expect.any(Number)
        },
        "file2.ts": expect.any(Object)
      },
      anys: [
        {
          file: expect.any(String),
          character: expect.any(Number),
          kind: expect.any(Number),
          line: expect.any(Number),
          text: expect.any(String)
        }
      ],
      percentage: expect.any(Number),
      total: expect.any(Number),
      covered: expect.any(Number),
      uncovered: expect.any(Number)
    });
  });
});
