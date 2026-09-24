import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CONFIG_FILES, loadConfig } from "../config";

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
