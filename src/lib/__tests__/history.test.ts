import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendHistory } from "../history";
import type { CoverageData } from "../getCoverage";

let workspace: string;

const data = (percentage: number): CoverageData =>
  ({
    fileCounts: new Map(),
    anys: [],
    percentage,
    total: 100,
    covered: Math.round(percentage),
    uncovered: 100 - Math.round(percentage)
  }) as unknown as CoverageData;

beforeEach(() => {
  workspace = fs.mkdtempSync(path.join(os.tmpdir(), "tcr-history-"));
});

afterEach(() => {
  fs.rmSync(workspace, { recursive: true, force: true });
});

const read = (file: string) =>
  JSON.parse(fs.readFileSync(path.join(workspace, file), "utf-8"));

describe("appendHistory", () => {
  it("creates the file on the first run", async () => {
    await appendHistory(data(80), path.join(workspace, "h.json"), new Date(0));

    expect(read("h.json")).toEqual([
      {
        timestamp: "1970-01-01T00:00:00.000Z",
        percentage: 80,
        total: 100,
        covered: 80,
        uncovered: 20
      }
    ]);
  });

  it("appends rather than replacing", async () => {
    const file = path.join(workspace, "h.json");
    await appendHistory(data(80), file, new Date(0));
    await appendHistory(data(85), file, new Date(1000));

    expect(
      read("h.json").map((e: { percentage: number }) => e.percentage)
    ).toEqual([80, 85]);
  });

  it("creates missing parent directories", async () => {
    await appendHistory(data(90), path.join(workspace, "a/b/h.json"));

    expect(fs.existsSync(path.join(workspace, "a/b/h.json"))).toBe(true);
  });

  it("starts over rather than failing on a corrupt file", async () => {
    const file = path.join(workspace, "h.json");
    fs.writeFileSync(file, "not json at all");

    await appendHistory(data(70), file, new Date(0));

    expect(read("h.json")).toHaveLength(1);
  });

  it("ignores a file that is valid JSON but not an array", async () => {
    const file = path.join(workspace, "h.json");
    fs.writeFileSync(file, '{"nope": true}');

    await appendHistory(data(70), file, new Date(0));

    expect(Array.isArray(read("h.json"))).toBe(true);
  });

  it("rounds the percentage to four decimal places", async () => {
    await appendHistory(
      data(76.190476190476),
      path.join(workspace, "h.json"),
      new Date(0)
    );

    expect(read("h.json")[0].percentage).toBe(76.1905);
  });
});
