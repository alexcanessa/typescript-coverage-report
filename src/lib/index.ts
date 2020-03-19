import getCoverage, { CoverageData } from "./getCoverage";
import { generate as generateText } from "./reporters/text";
import { generate as generateHTML } from "./reporters/html";
import path from "path";
import fs from "fs";
import { ncp } from "ncp";
import { promisify } from "util";
import { LintOptions } from "type-coverage-core";

const asyncNcp = promisify(ncp);

export type Options = Pick<LintOptions, "strict" | "debug"> & {
  outputDir: string;
  threshold: number;
};

export default async function generateCoverageReport(
  options: Options
): Promise<CoverageData> {
  // NOTE: Cleanup the folder
  fs.rmdirSync(path.join(process.cwd(), "coverage-ts"), { recursive: true });

  const data = await getCoverage({
    strict: options.strict,
    debug: options.debug
  });

  console.log(generateText(data, options.threshold));

  await generateHTML(data, options);
  await asyncNcp(
    path.join(__dirname, "../../assets"),
    path.join(process.cwd(), "coverage-ts/assets")
  );

  return data;
}
