import getCoverage from "../getCoverage";

describe("getCoverage function", () => {
  it("returns calculated data from type-coverage-core", async (done) => {
    const data = await getCoverage();

    expect(data).toMatchSnapshot();

    done();
  });
});
