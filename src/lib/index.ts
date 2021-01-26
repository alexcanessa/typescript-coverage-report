import getCoverage, { Options, CoverageData } from "./getCoverage";
import { generate as generateText } from "./reporters/text";
import { generate as generateHTML } from "./reporters/html";
import { generate as generateJSON } from "./reporters/json";
import path from "path";
import fs from "fs";
import { ncp } from "ncp";
import { promisify } from "util";
import rimraf from "rimraf";

const asyncNcp = promisify(ncp);

export type ProgramOptions = Options & {
  outputDir: string;
  threshold: number;
};

export default async function generateCoverageReport(
  options: ProgramOptions
): Promise<CoverageData> {
  // NOTE: Cleanup the folder
  const dirPath = path.join(process.cwd(), options.outputDir);

  const data = await getCoverage({
    strict: options.strict,
    debug: options.debug,
    ignoreFiles: options.ignoreFiles,
    ignoreCatch: options.ignoreCatch,
    ignoreUnread: options.ignoreUnread,
    cache: options.cache
  });

  console.log(generateText(data, options.threshold));

  if (fs.existsSync(dirPath)) {
    rimraf.sync(dirPath);
  }
  
  await generateHTML(data, options);
  await asyncNcp(
    path.join(__dirname, "../../assets"),
    path.join(process.cwd(), options.outputDir, "assets")
  );

  await generateJSON(data, options);

  return data;
}
