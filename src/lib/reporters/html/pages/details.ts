import { escapeHTML, relativeToRoot, toURLPath } from "../escape";

type Annotation = {
  file: string;
  line: number;
  character: number;
  text: string;
};

type GenerateDetailsPageContext = {
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
}: GenerateDetailsPageContext) => {
  const percentage = totalCount === 0 ? 100 : (correctCount * 100) / totalCount;
  const percentageCoverage = percentage.toFixed(2) + "%";
  const isValid = percentage >= threshold;

  const relativePathToIndex = `${relativeToRoot(filename)}index.html`;

  // NOTE: The source and the annotations are both escaped. The browser
  // decodes entities back to the original text before CodeMirror reads
  // textarea.value and before JSON.parse sees the annotations' textContent,
  // so the editor still receives byte-identical source.
  //
  // NOTE: There must be no newline between the opening textarea tag and the
  // content. HTML parsers strip exactly one leading newline inside a
  // textarea, which would shift every line by one and misplace every
  // CodeMirror gutter marker.
  return `
    <div style="margin-top: 3em;" class="ui container">
      <h1 class="ui header">
        <a href="${toURLPath(relativePathToIndex)}">TypeScript coverage report</a>
      </h1>
      <table class="ui table celled fixed">
        <thead>
          <tr>
            <th class="ten wide">Filename</th>
            <th>Percent</th>
            <th>Threshold</th>
            <th>Total</th>
            <th>Covered</th>
            <th>Uncovered</th>
          </tr>
        </thead>
        <tbody>
          <tr class="${isValid ? "positive" : "negative"}">
            <td>${escapeHTML(filename)}</td>
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
        readonly
        style="margin-top: 3em;"
      >${escapeHTML(sourceCode)}</textarea>
      <pre id="annotations" style="display: none;">
        ${escapeHTML(JSON.stringify(annotations))}
      </pre>
    </div>
  `;
};
