import getOptions from "../getOptions";

describe("getOptions function", () => {
  it("returns a list of options with default values", () => {
    const options = getOptions({
      options: [
        {
          long: "--version"
        },
        {
          long: "--outputDir",
          defaultValue: "coverage-ts"
        },
        {
          long: "--strict",
          defaultValue: false
        }
      ],
      outputDir: "coverage-type"
    });

    expect(options).toMatchSnapshot();
  });
});
