import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONFIG_FILES, configPathFromArgv, loadConfig } from "../config";

let workspace: string;

const write = (name: string, contents: unknown) =>
  fs.writeFileSync(
    path.join(workspace, name),
    typeof contents === "string" ? contents : JSON.stringify(contents)
  );

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), "tcr-config-"));
});

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe("loadConfig", () => {
  it("returns an empty config in a bare directory", () => {
    expect(loadConfig(workspace)).toEqual({});
  });

  it("reads the typeCoverage block from package.json", () => {
    write("package.json", { name: "x", typeCoverage: { atLeast: 95 } });

    expect(loadConfig(workspace)).toEqual({ atLeast: 95 });
  });

  it("tolerates a package.json with no typeCoverage block", () => {
    write("package.json", { name: "x" });

    expect(loadConfig(workspace)).toEqual({});
  });

  it("tolerates an unreadable package.json rather than failing the run", () => {
    write("package.json", "not json");

    expect(loadConfig(workspace)).toEqual({});
  });

  it.each(CONFIG_FILES)("reads %s", (name) => {
    write(name, { atLeast: 91 });

    expect(loadConfig(workspace)).toEqual({ atLeast: 91 });
  });

  it("prefers a dedicated config file over package.json", () => {
    write("package.json", { typeCoverage: { atLeast: 10 } });
    write(".typecoveragerc", { atLeast: 90 });

    expect(loadConfig(workspace)).toEqual({ atLeast: 90 });
  });

  it("uses only the first config file found, rather than merging", () => {
    // Merging would make it ambiguous which file a setting came from.
    write(".typecoveragerc", { atLeast: 90 });
    write(".typecoveragerc.json", { atLeast: 20, outputDir: "other" });

    expect(loadConfig(workspace)).toEqual({ atLeast: 90 });
  });

  it("reads an explicitly given path", () => {
    write("custom.json", { atLeast: 77 });

    expect(loadConfig(workspace, "custom.json")).toEqual({ atLeast: 77 });
  });

  it("prefers the explicit path over any discovered file", () => {
    write(".typecoveragerc", { atLeast: 90 });
    write("custom.json", { atLeast: 55 });

    expect(loadConfig(workspace, "custom.json")).toEqual({ atLeast: 55 });
  });

  it("throws when an explicitly given path does not exist", () => {
    expect(() => loadConfig(workspace, "nope.json")).toThrow(
      /Config file not found: nope\.json/
    );
  });

  it("throws a readable error for malformed JSON", () => {
    // Silently falling back would leave the user wondering why their
    // settings were ignored.
    write(".typecoveragerc", "{ not json");

    expect(() => loadConfig(workspace)).toThrow(
      /\.typecoveragerc is not valid JSON/
    );
  });

  it("supports every documented option", () => {
    write(".typecoveragerc", {
      atLeast: 90,
      outputDir: "cov",
      strict: true,
      reporters: ["lcov"],
      ignoreFiles: ["vendor/**"],
      historyFile: "h.json"
    });

    expect(loadConfig(workspace)).toMatchObject({
      atLeast: 90,
      outputDir: "cov",
      strict: true,
      reporters: ["lcov"],
      historyFile: "h.json"
    });
  });
});

describe("validating the typeCoverage block in package.json", () => {
  // The validation call used to sit inside readPackageJSON's try/catch, whose
  // catch exists only to tolerate a missing package.json. So a block with one
  // bad key threw, was swallowed, and loadConfig returned {} -- the run then
  // used defaults for every *other* key in the block, silently.
  it("reports a bad value instead of discarding the whole block", () => {
    write("package.json", {
      typeCoverage: { atLeast: 95, outputDir: "docs-out", reporters: "lcov" }
    });

    expect(() => loadConfig(workspace)).toThrow(
      /package\.json typeCoverage is not valid/
    );
  });

  it("names the offending key", () => {
    write("package.json", { typeCoverage: { atLeast: "95" } });

    expect(() => loadConfig(workspace)).toThrow(/"atLeast" must be a number/);
  });

  it("still tolerates keys belonging to the type-coverage CLI", () => {
    write("package.json", {
      typeCoverage: { atLeast: 95, is: 90, detail: true, update: true }
    });

    expect(loadConfig(workspace)).toMatchObject({ atLeast: 95 });
  });
});

describe("values that are the right type but out of range", () => {
  it.each([
    [-1, /"atLeast" must be a percentage between 0 and 100, got -1/],
    [101, /"atLeast" must be a percentage between 0 and 100, got 101/]
  ])("rejects atLeast %s, as --threshold would", (atLeast, expected) => {
    write(".typecoveragerc", { atLeast });

    expect(() => loadConfig(workspace)).toThrow(expected);
  });

  it.each([0, 100, 90.5])("accepts atLeast %s", (atLeast) => {
    write(".typecoveragerc", { atLeast });

    expect(loadConfig(workspace)).toEqual({ atLeast });
  });

  it("rejects an unknown reporter name", () => {
    write(".typecoveragerc", { reporters: ["htlm"] });

    expect(() => loadConfig(workspace)).toThrow(
      /"reporters" has unknown reporter htlm; available: /
    );
  });

  it("lists every unknown reporter name", () => {
    write(".typecoveragerc", { reporters: ["htlm", "lcvo"] });

    expect(() => loadConfig(workspace)).toThrow(
      /has unknown reporters htlm, lcvo/
    );
  });

  it("rejects an empty reporters array", () => {
    write(".typecoveragerc", { reporters: [] });

    expect(() => loadConfig(workspace)).toThrow(
      /"reporters" must name at least one of/
    );
  });

  it("accepts known reporter names", () => {
    write(".typecoveragerc", { reporters: ["lcov", "json"] });

    expect(loadConfig(workspace)).toEqual({ reporters: ["lcov", "json"] });
  });

  it("collects every problem rather than stopping at the first", () => {
    write(".typecoveragerc", { atLeast: 200, reporters: ["nope"] });

    expect(() => loadConfig(workspace)).toThrow(/atLeast[\s\S]*reporters/);
  });
});

describe("configPathFromArgv", () => {
  const argv = (...args: string[]) => ["node", "bin", ...args];

  it("finds the value after a bare --config", () => {
    expect(configPathFromArgv(argv("--config", "./ci.json"))).toBe("./ci.json");
  });

  it("finds the value attached with an equals sign", () => {
    // commander accepts this form, so reading only the bare token meant the
    // run silently used a different config than the one the user named.
    expect(configPathFromArgv(argv("--config=./ci.json"))).toBe("./ci.json");
  });

  it("returns undefined when --config is absent", () => {
    expect(configPathFromArgv(argv("-r", "lcov"))).toBeUndefined();
  });

  it("returns undefined for a trailing --config, leaving commander to report it", () => {
    expect(configPathFromArgv(argv("--config"))).toBeUndefined();
  });

  it("returns undefined for an empty attached value", () => {
    expect(configPathFromArgv(argv("--config="))).toBeUndefined();
  });

  it("is not confused by a similarly named option", () => {
    expect(configPathFromArgv(argv("--configure", "x"))).toBeUndefined();
  });

  it("does not treat a file operand as the value", () => {
    expect(configPathFromArgv(argv("src/a.ts", "--config", "b.json"))).toBe(
      "b.json"
    );
  });
});
