import typeCoverageCore from "type-coverage-core";
import getCoverage from "../getCoverage";

describe("getCoverage function", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it("returns calculated data from type-coverage-core", async () => {
    const data = await getCoverage();

    expect(data).toMatchSnapshot();
  });

  it("accepts a tsProjectFile option", async () => {
    typeCoverageCore.lint = jest.fn().mockImplementation(typeCoverageCore.lint);

    const data = await getCoverage({
      tsProjectFile: "./app/tsconfig.json"
    });

    expect(data).toMatchSnapshot();
    // @ts-expect-error
    expect(typeCoverageCore.lint.mock.calls).toMatchSnapshot();
  });

  it("defaults to root project when tsProjectFile is not passed", async () => {
    typeCoverageCore.lint = jest.fn().mockImplementation(typeCoverageCore.lint);

    await getCoverage();

    // @ts-expect-error
    expect(typeCoverageCore.lint.mock.calls).toMatchSnapshot();
  });
});
