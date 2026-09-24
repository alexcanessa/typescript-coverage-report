import fs from "node:fs";
import path from "node:path";
import type { CoverageData } from "../getCoverage";
import { lineCoverageForFile, uncoveredLinesByFile } from "./lineCoverage";
import { toPosixPath } from "./paths";

type Options = {
  outputDir: string;
  generatedAt?: Date;
};

type ClassCoverage = {
  name: string;
  filename: string;
  lineRate: number;
  lines: Map<number, number>;
};

const escapeXML = (value: string): string =>
  value.replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&apos;"
      })[character] as string
  );

const rate = (hit: number, found: number): number =>
  found === 0 ? 1 : hit / found;

/**
 * Emit a Cobertura XML report.
 *
 * Requested in #20 for Azure Pipelines, which renders Cobertura natively; it
 * is also what Jenkins and GitLab read. Unlike lcov, Cobertura carries
 * explicit line-rate attributes at every level, so the summary a CI runner
 * displays comes straight from the numbers here rather than being recomputed.
 *
 * Branch and complexity attributes are present because the schema requires
 * them, and are zero because type coverage has no equivalent.
 */
export const generate = async (
  data: CoverageData,
  options: Options
): Promise<void> => {
  const uncoveredByFile = uncoveredLinesByFile(data);
  const byPackage = new Map<string, ClassCoverage[]>();
  let totalFound = 0;
  let totalHit = 0;

  for (const filename of data.fileCounts.keys()) {
    let sourceCode: string;

    try {
      sourceCode = await fs.promises.readFile(filename, "utf-8");
    } catch {
      continue;
    }

    const { lines, found, hit } = lineCoverageForFile(
      sourceCode,
      uncoveredByFile.get(filename) ?? []
    );

    totalFound += found;
    totalHit += hit;

    // Cobertura packages map to directories; "." keeps root files valid.
    const packageName = path.dirname(filename).split(path.sep).join(".") || ".";
    const classes = byPackage.get(packageName) ?? [];

    classes.push({
      name: path.basename(filename),
      filename: toPosixPath(filename),
      lineRate: rate(hit, found),
      lines
    });
    byPackage.set(packageName, classes);
  }

  const timestamp = (options.generatedAt ?? new Date()).getTime();
  const xml: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE coverage SYSTEM "http://cobertura.sourceforge.net/xml/coverage-04.dtd">',
    `<coverage line-rate="${rate(totalHit, totalFound).toFixed(4)}" branch-rate="0" ` +
      `lines-covered="${totalHit}" lines-valid="${totalFound}" ` +
      `branches-covered="0" branches-valid="0" complexity="0" ` +
      `version="2.0.0" timestamp="${timestamp}">`,
    "  <sources>",
    `    <source>${escapeXML(process.cwd())}</source>`,
    "  </sources>",
    "  <packages>"
  ];

  for (const [packageName, classes] of [...byPackage.entries()].sort(
    ([a], [b]) => a.localeCompare(b)
  )) {
    const found = classes.reduce((total, { lines }) => total + lines.size, 0);
    const hit = classes.reduce(
      (total, { lines }) =>
        total + [...lines.values()].filter((hits) => hits > 0).length,
      0
    );

    xml.push(
      `    <package name="${escapeXML(packageName)}" ` +
        `line-rate="${rate(hit, found).toFixed(4)}" branch-rate="0" complexity="0">`,
      "      <classes>"
    );

    for (const klass of classes) {
      xml.push(
        `        <class name="${escapeXML(klass.name)}" ` +
          `filename="${escapeXML(klass.filename)}" ` +
          `line-rate="${klass.lineRate.toFixed(4)}" branch-rate="0" complexity="0">`,
        "          <methods/>",
        "          <lines>"
      );

      for (const [lineNumber, hits] of [...klass.lines.entries()].sort(
        ([a], [b]) => a - b
      )) {
        xml.push(`            <line number="${lineNumber}" hits="${hits}"/>`);
      }

      xml.push("          </lines>", "        </class>");
    }

    xml.push("      </classes>", "    </package>");
  }

  xml.push("  </packages>", "</coverage>", "");

  await fs.promises.writeFile(
    path.join(options.outputDir, "cobertura-coverage.xml"),
    xml.join("\n")
  );
};
