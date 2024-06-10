import { CoverageData } from "../../../getCoverage";

const reportHeaders = ["Percent", "Threshold", "Total", "Covered", "Uncovered"];

const headers = ["Filename", "Percent", "Total", "Covered", "Uncovered"];

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
  <table class="ui table celled">
    <thead>
      <tr>
        ${reportHeaders.map((header) => `<th>${header}</th>`).join("\n")}
      </tr>
    </thead>
    <tbody>
      <tr class="${isSummaryValid ? "positive" : "negative"}">
        <td data-label="Percent">${percentage.toFixed(2) + "%"}</td>
        <td data-label="Threshold">${threshold}%</td>
        <td data-label="Total">${total}</td>
        <td data-label="Covered">${covered}</td>
        <td data-label="Uncovered">${uncovered}</td>
      </tr>
    </tbody>
  </table>
  <h2 class="ui header">Files</h2>
  <table style="margin-top: 2em" class="ui table celled sortable">
    <thead>
      <tr>
        ${headers.map((header) => `<th>${header}</th>`).join("\n")}
      </tr>
    </thead>
    <tbody>
      ${Array.from(fileCounts)
        .map(([filename, { correctCount, totalCount }]) => {
          const percentage =
            totalCount === 0 ? 100 : (correctCount * 100) / totalCount;
          const percentageCoverage = percentage.toFixed(2) + "%";
          const isValid = percentage >= threshold;

          return `
          <tr class="${isValid ? "positive" : "negative"}">
          <td>
            <a style="color: inherit;" href="/files/${filename}.html">${filename}</a>
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
