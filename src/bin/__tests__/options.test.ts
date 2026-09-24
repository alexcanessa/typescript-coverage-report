import {
  DEFAULTS,
  collect,
  createProgram,
  normalizeIgnoreFiles,
  parseReporters,
  parseThreshold,
  resolveOptions
} from "../options";
import type { CliOptions } from "../options";

const parse = (argv: string[]) => {
  const program = createProgram({ version: "1.2.3", description: "test" });
  program.exitOverride();
  program.parse(argv, { from: "user" });

  return { opts: program.opts<CliOptions>(), args: program.args };
};

describe("collect", () => {
  it("accumulates rather than overwriting", () => {
    expect(collect("b", collect("a", undefined))).toEqual(["a", "b"]);
  });

  it("starts a new list when there is nothing yet", () => {
    expect(collect("a", undefined)).toEqual(["a"]);
  });
});

describe("normalizeIgnoreFiles", () => {
  it.each([
    ["a string", "src/**", ["src/**"]],
    ["an array", ["a", "b"], ["a", "b"]],
    ["the legacy false default", false, undefined],
    ["true", true, undefined],
    ["undefined", undefined, undefined],
    ["an empty array", [], undefined]
  ])("handles %s", (_label, input, expected) => {
    expect(normalizeIgnoreFiles(input)).toEqual(expected);
  });

  it("discards non-string entries", () => {
    expect(normalizeIgnoreFiles(["a", 1, null, "b"])).toEqual(["a", "b"]);
  });
});

describe("parseThreshold", () => {
  it("parses a number", () => {
    expect(parseThreshold("90")).toBe(90);
    expect(parseThreshold("87.5")).toBe(87.5);
  });

  it("rejects values that are not numbers", () => {
    // parseFloat("abc") is NaN, and `percentage < NaN` is false, so this
    // used to pass silently however low the coverage was.
    expect(() => parseThreshold("abc")).toThrow(/Expected a number/);
  });

  it("rejects values outside 0-100", () => {
    expect(() => parseThreshold("-1")).toThrow(/between 0 and 100/);
    expect(() => parseThreshold("101")).toThrow(/between 0 and 100/);
  });
});

describe("argument parsing", () => {
  it("accumulates repeated --ignore-files (#118)", () => {
    expect(
      parse(["-i", "demo1/*.ts", "-i", "demo2/foo.ts"]).opts.ignoreFiles
    ).toEqual(["demo1/*.ts", "demo2/foo.ts"]);
  });

  it("accepts the long form too", () => {
    expect(
      parse(["--ignore-files", "a/**", "--ignore-files", "b/**"]).opts
        .ignoreFiles
    ).toEqual(["a/**", "b/**"]);
  });

  it("leaves ignoreFiles unset when the flag is absent", () => {
    expect(parse([]).opts.ignoreFiles).toBeUndefined();
  });

  it("collects trailing operands as the file list", () => {
    const { opts, args } = parse(["-t", "90", "src/a.ts", "src/b.ts"]);

    expect(opts.threshold).toBe(90);
    expect(args).toEqual(["src/a.ts", "src/b.ts"]);
  });

  it("does not let repeatable options swallow the file operands", () => {
    const { opts, args } = parse(["-i", "vendor/**", "src/a.ts"]);

    expect(opts.ignoreFiles).toEqual(["vendor/**"]);
    expect(args).toEqual(["src/a.ts"]);
  });

  it("treats boolean flags as flags", () => {
    const { opts } = parse(["-s", "-d", "-c", "-u", "--ignore-catch"]);

    expect(opts).toMatchObject({
      strict: true,
      debug: true,
      cache: true,
      ignoreUnread: true,
      ignoreCatch: true
    });
  });

  it("errors on a non-numeric threshold instead of passing silently", () => {
    expect(() => parse(["--threshold", "abc"])).toThrow();
  });
});

describe("resolveOptions", () => {
  it("falls back to the documented defaults", () => {
    expect(resolveOptions({}, {})).toMatchObject({
      outputDir: DEFAULTS.outputDir,
      threshold: DEFAULTS.threshold,
      tsProjectFile: DEFAULTS.project,
      strict: false,
      ignoreFiles: undefined,
      files: undefined
    });
  });

  it("reads package.json config when no flag is given", () => {
    expect(
      resolveOptions({}, { atLeast: 95, outputDir: "docs", strict: true })
    ).toMatchObject({ threshold: 95, outputDir: "docs", strict: true });
  });

  it("lets an explicit flag win over package.json", () => {
    expect(resolveOptions({ threshold: 50 }, { atLeast: 95 }).threshold).toBe(
      50
    );
  });

  it("replaces configured ignoreFiles rather than appending to them", () => {
    // If commander's default were seeded from config, the collector would
    // receive it as `previous` and produce ["config/**", "cli/**"].
    expect(
      resolveOptions(
        { ignoreFiles: ["cli/**"] },
        { ignoreFiles: ["config/**"] }
      ).ignoreFiles
    ).toEqual(["cli/**"]);
  });

  it("normalises a string ignoreFiles from package.json", () => {
    expect(resolveOptions({}, { ignoreFiles: "src/**" }).ignoreFiles).toEqual([
      "src/**"
    ]);
  });

  it("tolerates the legacy boolean ignoreFiles", () => {
    expect(
      resolveOptions({}, { ignoreFiles: false }).ignoreFiles
    ).toBeUndefined();
  });

  it("passes trailing operands through as files", () => {
    expect(resolveOptions({}, {}, ["a.ts"]).files).toEqual(["a.ts"]);
  });

  it("respects `strict: false` in config over the default", () => {
    expect(resolveOptions({}, { strict: false }).strict).toBe(false);
  });
});

describe("parseReporters", () => {
  it("parses a comma-separated list", () => {
    expect(parseReporters("lcov,cobertura")).toEqual(["lcov", "cobertura"]);
  });

  it("tolerates whitespace", () => {
    expect(parseReporters(" json , lcov ")).toEqual(["json", "lcov"]);
  });

  it("deduplicates", () => {
    expect(parseReporters("json,json")).toEqual(["json"]);
  });

  it("rejects an unknown reporter rather than silently skipping it", () => {
    // A CI job asking for a reporter and getting no artefact would look like
    // the tool produced nothing, which is the failure this option prevents.
    expect(() => parseReporters("lcov,junit")).toThrow(/Unknown reporter/);
  });

  it("names the available reporters in the error", () => {
    expect(() => parseReporters("nope")).toThrow(
      /text, html, json, lcov, cobertura/
    );
  });

  it("rejects an empty list", () => {
    expect(() => parseReporters("  ")).toThrow(/at least one/);
  });
});

describe("reporter selection", () => {
  it("defaults to text, html and json", () => {
    expect(resolveOptions({}, {}).reporters).toEqual(["text", "html", "json"]);
  });

  it("lets a flag select artefacts only", () => {
    expect(parse(["-r", "lcov,cobertura"]).opts.reporters).toEqual([
      "lcov",
      "cobertura"
    ]);
  });

  it("reads reporters from package.json", () => {
    expect(resolveOptions({}, { reporters: ["lcov"] }).reporters).toEqual([
      "lcov"
    ]);
  });

  it("lets the flag win over package.json", () => {
    expect(
      resolveOptions({ reporters: ["json"] }, { reporters: ["lcov"] }).reporters
    ).toEqual(["json"]);
  });
});

describe("the newly exposed ignore options", () => {
  it.each([
    ["--ignore-nested", "ignoreNested"],
    ["--ignore-as-assertion", "ignoreAsAssertion"],
    ["--ignore-type-assertion", "ignoreTypeAssertion"],
    ["--ignore-non-null-assertion", "ignoreNonNullAssertion"],
    ["--ignore-object", "ignoreObject"],
    ["--ignore-empty-type", "ignoreEmptyType"]
  ])("%s sets %s", (flag, key) => {
    expect(parse([flag]).opts).toMatchObject({ [key]: true });
  });

  it("defaults them all to false", () => {
    expect(resolveOptions({}, {})).toMatchObject({
      ignoreNested: false,
      ignoreAsAssertion: false,
      ignoreTypeAssertion: false,
      ignoreNonNullAssertion: false,
      ignoreObject: false,
      ignoreEmptyType: false
    });
  });

  it("reads them from package.json", () => {
    expect(
      resolveOptions({}, { ignoreAsAssertion: true }).ignoreAsAssertion
    ).toBe(true);
  });
});

describe("--history-file", () => {
  it("is parsed from the CLI", () => {
    expect(parse(["--history-file", "cov.json"]).opts.historyFile).toBe(
      "cov.json"
    );
  });

  it("is read from package.json", () => {
    expect(resolveOptions({}, { historyFile: "h.json" }).historyFile).toBe(
      "h.json"
    );
  });

  it("is undefined when not asked for", () => {
    expect(resolveOptions({}, {}).historyFile).toBeUndefined();
  });
});
