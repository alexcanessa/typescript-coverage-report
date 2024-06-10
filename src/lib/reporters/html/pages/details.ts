const headers = [
  "Filename",
  "Percent",
  "Threshold",
  "Total",
  "Covered",
  "Uncovered"
];

type Annotation = {
  file: string;
  line: number;
  character: number;
  text: string;
};

type Props = {
  filename: string;
  sourceCode: string;
  totalCount: number;
  correctCount: number;
  annotations: readonly Annotation[];
  threshold: number;
};

export const generateDetailsPage = ({
  filename,
  sourceCode,
  totalCount,
  correctCount,
  annotations,
  threshold
}: Props) => {
  const percentage = totalCount === 0 ? 100 : (correctCount * 100) / totalCount;
  const percentageCoverage = percentage.toFixed(2) + "%";
  const isValid = percentage >= threshold;

  return `<section style="margin-top: 3em;">
  <h1>
    <a href="/index.html">TypeScript coverage report</a>
  </h1>
  <table>
    <thead>
      <tr>
        ${headers.map((header) => `<th>${header}</th>`).join("\n")}
      </tr>
    </thead>
    <tbody>
      <tr class="${isValid ? "positive" : "negative"}">
        <td>${filename}</td>
        <td>${percentageCoverage}</td>
        <td>${threshold}%</td>
        <td>${totalCount}</td>
        <td>${correctCount}</td>
        <td>${totalCount - correctCount}</td>
      </tr>
    </tbody>
  </table>
  <textarea
    id="editor"
    value="${sourceCode}"
    readonly
    style="margin-top: 3em;"
  />
  <pre id="annotations" style="display: none;">
    ${JSON.stringify(annotations)}
  </pre>
</section>`;
};
