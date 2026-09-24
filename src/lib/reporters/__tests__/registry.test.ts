import {
  DEFAULT_REPORTERS,
  REPORTERS,
  REPORTER_NAMES,
  isReporterName,
  runReporters
} from "../index";

describe("reporter registry", () => {
  it("exposes every reporter by name", () => {
    expect(REPORTER_NAMES.sort()).toEqual(
      ["cobertura", "html", "json", "lcov", "text"].sort()
    );
  });

  it("defaults to what ran before reporters were selectable", () => {
    // Upgrading must not silently stop producing the HTML report.
    expect(DEFAULT_REPORTERS).toEqual(["text", "html", "json"]);
  });

  it.each(REPORTER_NAMES)("recognises %s", (name) => {
    expect(isReporterName(name)).toBe(true);
  });

  it("rejects an unknown name", () => {
    expect(isReporterName("junit")).toBe(false);
  });

  it("does not treat inherited Object properties as reporters", () => {
    expect(isReporterName("toString")).toBe(false);
    expect(isReporterName("constructor")).toBe(false);
  });
});

describe("runReporters", () => {
  const data = {
    fileCounts: new Map(),
    anys: [],
    percentage: 100,
    total: 0,
    covered: 0,
    uncovered: 0
  } as never;

  it("runs the named reporters in order", async () => {
    const order: string[] = [];
    const spies = REPORTER_NAMES.map((name) =>
      jest.spyOn(REPORTERS, name).mockImplementation((async () => {
        order.push(name);
      }) as never)
    );

    await runReporters(["json", "text", "lcov"], data, {
      outputDir: "out",
      threshold: 80
    });

    expect(order).toEqual(["json", "text", "lcov"]);
    spies.forEach((spy) => spy.mockRestore());
  });

  it("runs nothing when given an empty list", async () => {
    const spy = jest
      .spyOn(REPORTERS, "json")
      .mockImplementation((async () => undefined) as never);

    await runReporters([], data, { outputDir: "out", threshold: 80 });

    expect(spy).not.toHaveBeenCalled();
    spy.mockRestore();
  });
});
