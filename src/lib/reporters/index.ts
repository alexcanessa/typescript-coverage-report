import type { CoverageData } from "../getCoverage";
import { generate as generateText } from "./text";
import { generate as generateJSON } from "./json";
import { generate as generateHTML } from "./html";
import { generate as generateLcov } from "./lcov";
import { generate as generateCobertura } from "./cobertura";

export type ReporterContext = {
  outputDir: string;
  threshold: number;
  generatedAt?: Date;
};

export type Reporter = (
  data: CoverageData,
  context: ReporterContext
) => Promise<void> | void;

/**
 * The reporters a run can emit.
 *
 * Splitting these out is what makes #73 possible -- "I'm not particularly
 * interested in the console output, rather just the HTML output, so it'd be
 * great to have a way to configure which reporters get run" -- and what lets
 * a CI job emit only the artefact it needs.
 */
export const REPORTERS = {
  text: (data, { threshold }) => {
    console.log(generateText(data, threshold));
  },
  html: generateHTML,
  json: generateJSON,
  lcov: generateLcov,
  cobertura: generateCobertura
} satisfies Record<string, Reporter>;

export type ReporterName = keyof typeof REPORTERS;

export const REPORTER_NAMES = Object.keys(REPORTERS) as ReporterName[];

/** What ran before reporters were selectable, so upgrades are a no-op. */
export const DEFAULT_REPORTERS: ReporterName[] = ["text", "html", "json"];

export const isReporterName = (value: string): value is ReporterName =>
  Object.prototype.hasOwnProperty.call(REPORTERS, value);

/**
 * Reporters run in sequence rather than in parallel: several write into the
 * same directory, and the text reporter writing to stdout while another logs
 * a warning interleaves badly.
 */
export const runReporters = async (
  names: readonly ReporterName[],
  data: CoverageData,
  context: ReporterContext
): Promise<void> => {
  for (const name of names) {
    await REPORTERS[name](data, context);
  }
};
