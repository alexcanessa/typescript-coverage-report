import path from "node:path";
import { CoverageData } from "../../../getCoverage";

type GenerateSummaryPageContext = Omit<CoverageData, "anys"> & {
  threshold: number;
};

export const generateSummaryPage = ({
  fileCounts,
  percentage,
  total,
  covered,
  uncovered,
  threshold
}: GenerateSummaryPageContext) => {
  const isSummaryValid = percentage >= threshold;

  return `
  <div style="margin-top: 3em;" class="ui container">
  <h1 class="ui header">TypeScript coverage report</h1>
  <h2 class="ui header">Summary</h2>
  <table class="ui table celled fixed">
    <thead>
      <tr>
        <th>Percent</th>
        <th>Threshold</th>
        <th>Total</th>
        <th>Covered</th>
        <th>Uncovered</th>
      </tr>
    </thead>
    <tbody>
      <tr class="${isSummaryValid ? "positive" : "negative"}">
        <td>${percentage.toFixed(2) + "%"}</td>
        <td>${threshold}%</td>
        <td>${total}</td>
        <td>${covered}</td>
        <td>${uncovered}</td>
      </tr>
    </tbody>
  </table>
  <h2 class="ui header">Files</h2>
  <table style="margin-top: 2em" id="coverage-table" class="ui table celled fixed sortable">
    <thead>
      <tr>
        <th class="ten wide">Filename</th>
        <th>Percent</th>
        <th>Total</th>
        <th>Covered</th>
        <th>Uncovered</th>
      </tr>
    </thead>
    <tbody>
      ${Array.from(fileCounts)
        .map(([filename, { correctCount, totalCount }]) => {
          const percentage =
            totalCount === 0 ? 100 : (correctCount * 100) / totalCount;
          const percentageCoverage = percentage.toFixed(2) + "%";
          const isValid = percentage >= threshold;

          const pathToFile = path.join("files", `${filename}.html`);

          return `
          <tr class="${isValid ? "positive" : "negative"}">
            <td title="${filename}">
              <a style="color: inherit;" href="${pathToFile}">${filename}</a>
            </td>
            <td>${percentageCoverage}</td>
            <td>${totalCount}</td>
            <td>${correctCount}</td>
            <td>${totalCount - correctCount}</td>
          </tr>`;
        })
        .join("\n")}
    </tbody>
  </table>
</section>`;
};
