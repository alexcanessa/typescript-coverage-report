import React from "react";
import path from "path";
import { Container, Table, Header } from "semantic-ui-react";

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

const DetailPage = ({
  filename,
  sourceCode,
  totalCount,
  correctCount,
  annotations,
  threshold
}: Props) => {
  const percentage = (correctCount * 100) / totalCount;
  const percentageCoverage = percentage.toFixed(2) + "%";
  const isValid = percentage >= threshold;

  return (
    <Container style={{ marginTop: "3em" }}>
      <Header as="h1">
        <a href={path.relative(`${filename}.html`, "index.html")}>
          TypeScript coverage report
        </a>
      </Header>
      <Table celled style={{ marginTop: "2em" }}>
        <Table.Header>
          <Table.Row>
            {headers.map((header, index) => (
              <Table.HeaderCell key={index}>{header}</Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row negative={!isValid} positive={isValid}>
            <Table.Cell>{filename}</Table.Cell>
            <Table.Cell>{percentageCoverage}</Table.Cell>
            <Table.Cell>{threshold}%</Table.Cell>
            <Table.Cell>{totalCount}</Table.Cell>
            <Table.Cell>{correctCount}</Table.Cell>
            <Table.Cell>{totalCount - correctCount}</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
      <textarea
        id="editor"
        value={sourceCode}
        readOnly
        style={{ marginTop: "3em" }}
      />
      <pre id="annotations" style={{ display: "none" }}>
        {JSON.stringify(annotations)}
      </pre>
    </Container>
  );
};

export default DetailPage;
