import React from "react";
import path from "path";
import { Container, Header, Table } from "semantic-ui-react";
import { CoverageData } from "../../lib/getCoverage";

const headers = ["Filename", "Percent", "Total", "Covered", "Uncovered"];

type Props = Omit<CoverageData, "anys"> & {
  threshold: number;
};

const SummaryPage = ({
  fileCounts,
  percentage,
  total,
  covered,
  uncovered,
  threshold
}: Props) => {
  const isSummaryValid = percentage >= threshold;

  return (
    <Container style={{ marginTop: "3em" }}>
      <Header as="h1">TypeScript coverage report</Header>
      <Header as="h2">Summary</Header>
      <Table celled>
        <Table.Header>
          <Table.Row>
            {["Percent", "Threshold", "Total", "Covered", "Uncovered"].map(
              (header, index) => (
                <Table.HeaderCell key={index}>{header}</Table.HeaderCell>
              )
            )}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          <Table.Row negative={!isSummaryValid} positive={isSummaryValid}>
            <Table.Cell>{percentage.toFixed(2) + "%"}</Table.Cell>
            <Table.Cell>{threshold}%</Table.Cell>
            <Table.Cell>{total}</Table.Cell>
            <Table.Cell>{covered}</Table.Cell>
            <Table.Cell>{uncovered}</Table.Cell>
          </Table.Row>
        </Table.Body>
      </Table>
      <Header as="h2">Files</Header>
      <Table celled style={{ marginTop: "2em" }}>
        <Table.Header>
          <Table.Row>
            {headers.map((header, index) => (
              <Table.HeaderCell key={index}>{header}</Table.HeaderCell>
            ))}
          </Table.Row>
        </Table.Header>
        <Table.Body>
          {Array.from(fileCounts).map(
            ([filename, { correctCount, totalCount }], index) => {
              const percentage = (correctCount * 100) / totalCount;
              const percentageCoverage = percentage.toFixed(2) + "%";
              const isValid = percentage >= threshold;

              return (
                <Table.Row key={index} negative={!isValid} positive={isValid}>
                  <Table.Cell selectable>
                    <a
                      style={{ color: "inherit" }}
                      href={path.join("files", `${filename}.html`)}
                    >
                      {filename}
                    </a>
                  </Table.Cell>
                  <Table.Cell>{percentageCoverage}</Table.Cell>
                  <Table.Cell>{totalCount}</Table.Cell>
                  <Table.Cell>{correctCount}</Table.Cell>
                  <Table.Cell>{totalCount - correctCount}</Table.Cell>
                </Table.Row>
              );
            }
          )}
        </Table.Body>
      </Table>
    </Container>
  );
};

export default SummaryPage;
