/**
 * @jest-environment jsdom
 */

import React from "react";
import DetailPage from "../";
import { render } from "@testing-library/react";

describe("DetailPage component", () => {
  it("renders correctly", () => {
    const { container } = render(
      <DetailPage
        totalCount={100}
        correctCount={100}
        threshold={90}
        annotations={[]}
        filename="index.ts"
        sourceCode="<p>Test</p>"
      />
    );

    expect(container.firstChild).toMatchSnapshot();
  });
});
