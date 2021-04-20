import typeCoverageCore from "type-coverage-core";
import getCoverage from "../getCoverage";

describe("getCoverage function", () => {
  it("returns calculated data from type-coverage-core", async (done) => {
    const data = await getCoverage();

    expect(data).toMatchSnapshot();

    done();
  });

  it("tsProjectFile is passed into lint function, if provided", async (done) => {
    typeCoverageCore.lint = jest.fn().mockImplementation(typeCoverageCore.lint);

    const data = await getCoverage({
      tsProjectFile: "./app/tsconfig.json"
    });

    expect(data).toMatchSnapshot();
    expect(typeCoverageCore.lint).toHaveBeenCalledWith("./app/tsconfig.json", {
      debug: undefined,
      enableCache: undefined,
      fileCounts: true,
      ignoreCatch: undefined,
      ignoreFiles: undefined,
      ignoreUnreadAnys: undefined,
      strict: undefined
    });
    done();
  });

  it("default project root is passed into lint function", async (done) => {
    typeCoverageCore.lint = jest.fn().mockImplementation(typeCoverageCore.lint);

    const data = await getCoverage();

    expect(data).toMatchSnapshot();
    expect(typeCoverageCore.lint).toHaveBeenCalledWith(".", {
      debug: undefined,
      enableCache: undefined,
      fileCounts: true,
      ignoreCatch: undefined,
      ignoreFiles: undefined,
      ignoreUnreadAnys: undefined,
      strict: undefined
    });
    done();
  });
});
