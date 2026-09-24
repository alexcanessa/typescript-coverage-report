import chalk from "chalk";
import { generate } from "../text";
import type { CoverageData } from "../../getCoverage";

const ESC = String.fromCharCode(27);
const GREEN = `${ESC}[32m`;
const RED = `${ESC}[31m`;

const data: CoverageData = {
  fileCounts: new Map([
    ["src/good.ts", { correctCount: 10, totalCount: 10 }],
    ["src/bad.ts", { correctCount: 1, totalCount: 10 }]
  ]),
  anys: [],
  percentage: 55,
  total: 20,
  covered: 11,
  uncovered: 9
};

describe("text reporter", () => {
  const originalLevel = chalk.level;

  beforeEach(() => {
    // Assert on the text, not on ANSI escapes.
    chalk.level = 0;
  });

  afterEach(() => {
    chalk.level = originalLevel;
  });

  it("is idempotent across calls", () => {
    // The table used to be module-level state, so a second call to the
    // exported library API appended to the first call's rows.
    const first = generate(data, 80);
    const second = generate(data, 80);

    expect(second).toBe(first);
  });

  it("does not accumulate rows when called repeatedly", () => {
    generate(data, 80);
    generate(data, 80);
    const third = generate(data, 80);

    expect(third.match(/src\/good\.ts/g)).toHaveLength(1);
    expect(third.match(/src\/bad\.ts/g)).toHaveLength(1);
  });

  it("includes the totals in the header", () => {
    const output = generate(data, 80);

    expect(output).toContain("55.00%");
    expect(output).toContain("(20)");
    expect(output).toContain("(11)");
    expect(output).toContain("(9)");
  });

  it("shows per-file percentages", () => {
    const output = generate(data, 80);

    expect(output).toContain("100.00%");
    expect(output).toContain("10.00%");
  });

  it("lists every file", () => {
    const output = generate(data, 80);

    expect(output).toContain("src/good.ts");
    expect(output).toContain("src/bad.ts");
  });

  it("colours rows by the threshold", () => {
    chalk.level = 1;
    const output = generate(data, 80);

    // good.ts is above the threshold, bad.ts below, so both colours appear.
    expect(output).toContain(GREEN);
    expect(output).toContain(RED);
  });

  it("treats a file with no counted identifiers as fully covered", () => {
    const output = generate(
      {
        ...data,
        fileCounts: new Map([
          ["src/empty.ts", { correctCount: 0, totalCount: 0 }]
        ])
      },
      80
    );

    expect(output).toContain("100.00%");
  });
});
