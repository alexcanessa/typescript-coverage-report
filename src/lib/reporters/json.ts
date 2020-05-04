import { CoverageData } from "../getCoverage";
import fs from "fs";
import path from "path";
import { promisify } from "util";

type Options = {
  outputDir: string;
  threshold: number;
};

const writeFile = promisify(fs.writeFile);

export const generate = async (
  coverageData: CoverageData,
  options?: Options
): Promise<void> => {
  await writeFile(
    path.join(options.outputDir, "typescript-coverage.json"),
    JSON.stringify(coverageData, null, 2)
  );
};
