import React from "react";
import SummaryPage from "../";
import { render } from "@testing-library/react";

describe("SummaryPage component", () => {
  it("renders correctly", () => {
    const { container } = render(
      <SummaryPage
        fileCounts={
          new Map([["index.html", { totalCount: 100, correctCount: 100 }]])
        }
        percentage={100}
        total={100}
        covered={100}
        uncovered={0}
        threshold={90}
      />
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});
