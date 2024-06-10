import { CoverageData } from "../../../getCoverage";

const globalHeaders = ["Percent", "Threshold", "Total", "Covered", "Uncovered"];

const headers = ["Filename", "Percent", "Total", "Covered", "Uncovered"];

type Props = Omit<CoverageData, "anys"> & {
  threshold: number;
};

export const generateSummaryPage = ({
  fileCounts,
  percentage,
  total,
  covered,
  uncovered,
  threshold
}: Props) => {
  const isSummaryValid = percentage >= threshold;

  return `
  <section style="margin-top: 3em;">
  <h1>TypeScript coverage report</h1>
  <h2>Summary</h2>
  <table>
    <thead>
      <tr>
        ${globalHeaders.map((header) => `<th>${header}</th>`).join("\n")}
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
  <h2>Files</h2>
  <table style="margin-top: 2em;" class="sortable">
    <thead>
      <tr>
        ${headers.map((header) => `<th>${header}</th>`).join("\n")}
      </tr>
    </thead>
    <tbody>
      ${Array.from(fileCounts).map(
        ([filename, { correctCount, totalCount }]) => {
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
        </tr>
        `;
        }
      )}
    </tbody>
  </table>
</section>`;
};
