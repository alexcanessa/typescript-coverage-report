import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { generate } from "../index";
import type { CoverageData } from "../../../getCoverage";

/**
 * The type checker reports paths relative to the working directory, so a file
 * outside it arrives prefixed with `..`. Joining that onto the output
 * directory walks back out of it, and the detail page lands in the user's
 * source tree -- or, with one more level, outside the project entirely.
 *
 * This became reachable when --not-only-in-cwd started working: until then
 * the flag was dropped before it reached the type checker, so `..` paths never
 * appeared in fileCounts at all.
 *
 * These tests use the real filesystem deliberately. The bug is in the path
 * that reaches fs, so a mocked fs would assert the very call that is wrong.
 */
describe("detail pages stay inside the output directory", () => {
  let root: string;
  let projectDir: string;
  let outputDir: string;
  let originalCwd: string;

  const coverageFor = (filenames: string[]): CoverageData => ({
    fileCounts: new Map(
      filenames.map((filename) => [
        filename,
        { correctCount: 1, totalCount: 2 }
      ])
    ),
    anys: [],
    percentage: 50,
    total: 2 * filenames.length,
    covered: filenames.length,
    uncovered: filenames.length
  });

  const walk = (dir: string): string[] =>
    fs.existsSync(dir)
      ? fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
          const full = path.join(dir, entry.name);

          return entry.isDirectory() ? walk(full) : [full];
        })
      : [];

  /** Create the source file a relative filename points at. */
  const seedSource = (filename: string): void => {
    const absolute = path.resolve(projectDir, filename);

    fs.mkdirSync(path.dirname(absolute), { recursive: true });
    fs.writeFileSync(absolute, "export const value = 1;\n");
  };

  beforeEach(() => {
    originalCwd = process.cwd();
    root = fs.realpathSync(
      fs.mkdtempSync(path.join(os.tmpdir(), "tcr-containment-"))
    );
    // Nested so that even ../../../ stays inside the directory we clean up.
    projectDir = path.join(root, "a", "b", "project");
    outputDir = path.join(projectDir, "coverage-ts");
    fs.mkdirSync(outputDir, { recursive: true });
    process.chdir(projectDir);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("writes a page for a file outside the working directory", async () => {
    seedSource("../../linked/src/a.ts");

    await generate(coverageFor(["../../linked/src/a.ts"]), {
      outputDir,
      threshold: 80,
      generatedAt: new Date(0)
    });

    expect(
      fs.existsSync(
        path.join(outputDir, "files", "__", "__", "linked", "src", "a.ts.html")
      )
    ).toBe(true);
  });

  it("writes nothing outside the output directory", async () => {
    // Deep enough that a naive join escapes the project, not just files/.
    const filename = "../../../elsewhere/evil.ts";
    seedSource(filename);
    const before = new Set(walk(root));

    await generate(coverageFor([filename]), {
      outputDir,
      threshold: 80,
      generatedAt: new Date(0)
    });

    const created = walk(root).filter((file) => !before.has(file));

    expect(created).not.toHaveLength(0);
    created.forEach((file) => {
      expect(path.relative(outputDir, file).startsWith("..")).toBe(false);
    });
  });

  it("keeps every page under files/", async () => {
    const filenames = ["src/a.ts", "../b.ts", "../../pkg/c.ts", "./d.ts"];
    filenames.forEach(seedSource);

    await generate(coverageFor(filenames), {
      outputDir,
      threshold: 80,
      generatedAt: new Date(0)
    });

    const filesDir = path.join(outputDir, "files");
    const pages = walk(filesDir);

    expect(pages).toHaveLength(filenames.length);
    pages.forEach((page) => {
      expect(path.relative(filesDir, page).startsWith("..")).toBe(false);
    });
  });

  it("links a relocated page to the assets it can actually reach", async () => {
    seedSource("../../pkg/c.ts");

    await generate(coverageFor(["../../pkg/c.ts"]), {
      outputDir,
      threshold: 80,
      generatedAt: new Date(0)
    });

    const page = path.join(outputDir, "files", "__", "__", "pkg", "c.ts.html");
    const html = fs.readFileSync(page, "utf-8");
    const href = /href="(\.\.[^"]*report\.css)"/.exec(html)?.[1];

    expect(href).toBeDefined();
    expect(path.resolve(path.dirname(page), href as string)).toBe(
      path.join(outputDir, "assets", "report.css")
    );
  });

  it("links the summary to the page it actually wrote", async () => {
    seedSource("../../pkg/c.ts");

    await generate(coverageFor(["../../pkg/c.ts"]), {
      outputDir,
      threshold: 80,
      generatedAt: new Date(0)
    });

    const summary = fs.readFileSync(
      path.join(outputDir, "index.html"),
      "utf-8"
    );
    const href = /<a [^>]*href="(files[^"]+)"/.exec(summary)?.[1];

    expect(href).toBeDefined();
    expect(fs.existsSync(path.join(outputDir, decodeURI(href as string)))).toBe(
      true
    );
  });
});
