import { CoverageData } from "../getCoverage";
import fs from "fs";
import path from "path";

type Options = {
  outputDir: string;
  threshold: number;
};

export const generate = async (
  coverageData: CoverageData,
  options?: Options
): Promise<void> => {
  // Maps cannot be serialized in JSON.stringify
  const serializableFileCounts = Object.fromEntries(coverageData.fileCounts);

  await fs.promises.writeFile(
    path.join(options.outputDir, "typescript-coverage.json"),
    JSON.stringify(
      {
        ...coverageData,
        fileCounts: serializableFileCounts
      },
      null,
      2
    )
  );
};
