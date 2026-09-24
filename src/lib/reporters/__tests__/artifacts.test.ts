import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generate as generateLcov } from "../lcov";
import { generate as generateCobertura } from "../cobertura";
import { toPosixPath } from "../paths";
import type { CoverageData } from "../../getCoverage";

let workspace: string;
let previousCwd: string;

const SOURCE = [
  "// a comment",
  "export const typed: number = 1;",
  "",
  "export const untyped: any = 2;"
].join("\n");

const data: CoverageData = {
  fileCounts: new Map([["src/a.ts", { correctCount: 1, totalCount: 2 }]]),
  // Line 3 zero-based is source line 4, where the any lives.
  anys: [
    { file: "src/a.ts", line: 3, character: 13, text: "untyped", kind: 1 }
  ],
  percentage: 50,
  total: 2,
  covered: 1,
  uncovered: 1
} as unknown as CoverageData;

beforeEach(() => {
  previousCwd = process.cwd();
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), "tcr-artifacts-"));
  fs.mkdirSync(path.join(workspace, "src"), { recursive: true });
  fs.writeFileSync(path.join(workspace, "src/a.ts"), SOURCE);
  process.chdir(workspace);
});

afterEach(() => {
  process.chdir(previousCwd);
  fs.rmSync(workspace, { recursive: true, force: true });
});

describe("lcov reporter", () => {
  const read = async () => {
    await generateLcov(data, { outputDir: workspace });

    return fs.readFileSync(path.join(workspace, "lcov.info"), "utf-8");
  };

  it("writes lcov.info", async () => {
    expect(await read()).toContain("SF:src/a.ts");
  });

  it("marks the any line as not hit and the typed line as hit", async () => {
    const lcov = await read();

    expect(lcov).toContain("DA:2,1");
    expect(lcov).toContain("DA:4,0");
  });

  it("omits blank and comment lines", async () => {
    const lcov = await read();

    expect(lcov).not.toContain("DA:1,");
    expect(lcov).not.toContain("DA:3,");
  });

  it("keeps LF and LH consistent with the DA records", async () => {
    const lcov = await read();
    const records = lcov.match(/^DA:/gm) ?? [];
    const hits = lcov.match(/^DA:\d+,[1-9]/gm) ?? [];

    expect(lcov).toContain(`LF:${records.length}`);
    expect(lcov).toContain(`LH:${hits.length}`);
  });

  it("terminates the record", async () => {
    expect(await read()).toContain("end_of_record");
  });

  it("omits function and branch records rather than zeroing them", async () => {
    // A zeroed FNF or BRF reads as genuinely uncovered to most tools.
    const lcov = await read();

    expect(lcov).not.toContain("FNF:");
    expect(lcov).not.toContain("BRF:");
  });

  it("skips a file it cannot read instead of failing the run", async () => {
    const missing = {
      ...data,
      fileCounts: new Map([["src/gone.ts", { correctCount: 0, totalCount: 0 }]])
    } as unknown as CoverageData;

    await expect(
      generateLcov(missing, { outputDir: workspace })
    ).resolves.toBeUndefined();
    expect(fs.readFileSync(path.join(workspace, "lcov.info"), "utf-8")).toBe(
      ""
    );
  });
});

describe("cobertura reporter", () => {
  const read = async () => {
    await generateCobertura(data, {
      outputDir: workspace,
      generatedAt: new Date(0)
    });

    return fs.readFileSync(
      path.join(workspace, "cobertura-coverage.xml"),
      "utf-8"
    );
  };

  it("writes cobertura-coverage.xml", async () => {
    expect(await read()).toContain("<coverage ");
  });

  it("carries an explicit line rate, which is what CI runners display", async () => {
    const xml = await read();

    expect(xml).toContain('lines-covered="1"');
    expect(xml).toContain('lines-valid="2"');
    expect(xml).toContain('line-rate="0.5000"');
  });

  it("emits the file as a class with its per-line hits", async () => {
    const xml = await read();

    expect(xml).toContain('filename="src/a.ts"');
    expect(xml).toContain('<line number="2" hits="1"/>');
    expect(xml).toContain('<line number="4" hits="0"/>');
  });

  it("uses the directory as the package name", async () => {
    expect(await read()).toContain('<package name="src"');
  });

  it("uses an injectable timestamp", async () => {
    expect(await read()).toContain('timestamp="0"');
  });

  it("escapes XML special characters in file names", async () => {
    fs.writeFileSync(path.join(workspace, "src/a&b.ts"), "const a = 1;");
    const odd = {
      ...data,
      fileCounts: new Map([["src/a&b.ts", { correctCount: 1, totalCount: 1 }]]),
      anys: []
    } as unknown as CoverageData;

    await generateCobertura(odd, { outputDir: workspace });
    const xml = fs.readFileSync(
      path.join(workspace, "cobertura-coverage.xml"),
      "utf-8"
    );

    expect(xml).toContain("a&amp;b.ts");
    expect(xml).not.toContain("a&b.ts");
  });

  it("reports an empty run as fully covered rather than dividing by zero", async () => {
    const empty = {
      ...data,
      fileCounts: new Map(),
      anys: []
    } as unknown as CoverageData;

    await generateCobertura(empty, { outputDir: workspace });
    const xml = fs.readFileSync(
      path.join(workspace, "cobertura-coverage.xml"),
      "utf-8"
    );

    expect(xml).toContain('line-rate="1.0000"');
  });
});

describe("windows paths", () => {
  // type-coverage-core reports the platform separator, so on Windows these
  // arrive as src\a.ts. Codecov, SonarQube and Azure all match artefact paths
  // against repository paths and expect forward slashes; emitting backslashes
  // means matching nothing and silently reporting zero coverage.
  const windowsData = {
    fileCounts: new Map([["src\\a.ts", { correctCount: 1, totalCount: 2 }]]),
    anys: [],
    percentage: 50,
    total: 2,
    covered: 1,
    uncovered: 1
  } as unknown as CoverageData;

  beforeEach(() => {
    fs.writeFileSync(path.join(workspace, "src/a.ts"), SOURCE);
  });

  it("lcov writes SF with forward slashes", async () => {
    // The file itself is read through the platform path, so seed both spellings.
    fs.writeFileSync(path.join(workspace, "src", "a.ts"), SOURCE);
    await generateLcov(
      {
        ...windowsData,
        fileCounts: new Map([["src/a.ts", { correctCount: 1, totalCount: 2 }]])
      } as unknown as CoverageData,
      { outputDir: workspace }
    );

    const lcov = fs.readFileSync(path.join(workspace, "lcov.info"), "utf-8");
    expect(lcov).toContain("SF:src/a.ts");
    expect(lcov).not.toContain("\\");
  });

  it("cobertura writes filename and package with forward slashes", async () => {
    await generateCobertura(
      {
        ...windowsData,
        fileCounts: new Map([["src/a.ts", { correctCount: 1, totalCount: 2 }]])
      } as unknown as CoverageData,
      { outputDir: workspace }
    );

    const xml = fs.readFileSync(
      path.join(workspace, "cobertura-coverage.xml"),
      "utf-8"
    );
    expect(xml).toContain('filename="src/a.ts"');
    expect(xml).toContain('<package name="src"');
  });
});

describe("toPosixPath", () => {
  it("converts backslashes and leaves posix paths alone", () => {
    expect(toPosixPath("src\\lib\\a.ts")).toBe("src/lib/a.ts");
    expect(toPosixPath("src/lib/a.ts")).toBe("src/lib/a.ts");
  });
});
