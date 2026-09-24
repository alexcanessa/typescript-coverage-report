import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { excludeGitIgnored, gitIgnoredPaths } from "../gitignore";
import type { CoverageData } from "../getCoverage";

let repo: string;

const makeRepo = (gitignore: string): string => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "tcr-gitignore-"));

  execFileSync("git", ["init", "-q"], { cwd: dir });
  fs.writeFileSync(path.join(dir, ".gitignore"), gitignore);

  return dir;
};

const data = (files: string[]): CoverageData =>
  ({
    fileCounts: new Map(
      files.map((name) => [name, { correctCount: 1, totalCount: 2 }])
    ),
    anys: files.map((file) => ({
      file,
      line: 0,
      character: 0,
      text: "x",
      kind: 1
    })),
    percentage: 50,
    total: files.length * 2,
    covered: files.length,
    uncovered: files.length
  }) as unknown as CoverageData;

afterEach(() => {
  if (repo) {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

describe("gitIgnoredPaths", () => {
  it("reports an ignored file", () => {
    repo = makeRepo("dist\n");

    expect([
      ...gitIgnoredPaths(["dist/a.ts", "src/a.ts"], repo).ignored
    ]).toEqual(["dist/a.ts"]);
  });

  it("reports nothing when nothing matches", () => {
    repo = makeRepo("dist\n");

    expect(gitIgnoredPaths(["src/a.ts"], repo).ignored.size).toBe(0);
  });

  it("returns early for an empty list", () => {
    repo = makeRepo("dist\n");

    expect(gitIgnoredPaths([], repo).ignored.size).toBe(0);
  });

  it("honours negation", () => {
    // Works because the pattern excludes the directory's *contents*.
    repo = makeRepo("build/*\n!build/keep.ts\n");
    const { ignored } = gitIgnoredPaths(
      ["build/drop.ts", "build/keep.ts"],
      repo
    );

    expect([...ignored]).toEqual(["build/drop.ts"]);
  });

  it("does not re-include a file whose parent directory is excluded", () => {
    // git: "It is not possible to re-include a file if a parent directory of
    // that file is excluded." So "build/" beats "!build/keep.ts". This is
    // exactly the kind of rule a hand-rolled matcher gets wrong, and the
    // reason this delegates to git rather than parsing .gitignore here.
    repo = makeRepo("build/\n!build/keep.ts\n");
    const { ignored } = gitIgnoredPaths(
      ["build/drop.ts", "build/keep.ts"],
      repo
    );

    expect([...ignored].sort()).toEqual(["build/drop.ts", "build/keep.ts"]);
  });

  it("honours a nested .gitignore", () => {
    repo = makeRepo("");
    fs.mkdirSync(path.join(repo, "packages/a"), { recursive: true });
    fs.writeFileSync(path.join(repo, "packages/a/.gitignore"), "out\n");

    expect([
      ...gitIgnoredPaths(["packages/a/out/x.ts", "packages/a/src/x.ts"], repo)
        .ignored
    ]).toEqual(["packages/a/out/x.ts"]);
  });

  it("reports git being unavailable rather than guessing", () => {
    // A directory that is not a repository: the question cannot be answered,
    // so nothing should be dropped.
    const notARepo = fs.mkdtempSync(path.join(os.tmpdir(), "tcr-norepo-"));

    try {
      const result = gitIgnoredPaths(["a.ts"], notARepo);

      expect(result.ignored.size).toBe(0);
      expect(result.unavailable).toBe("not a git repository");
    } finally {
      fs.rmSync(notARepo, { recursive: true, force: true });
    }
  });
});

describe("excludeGitIgnored", () => {
  it("drops ignored files and their anys", () => {
    repo = makeRepo("dist\n");
    const { data: result } = excludeGitIgnored(
      data(["dist/a.ts", "src/a.ts"]),
      repo
    );

    expect([...result.fileCounts.keys()]).toEqual(["src/a.ts"]);
    expect(result.anys.map(({ file }) => file)).toEqual(["src/a.ts"]);
  });

  it("adjusts the totals by subtraction", () => {
    repo = makeRepo("dist\n");
    const { data: result } = excludeGitIgnored(
      data(["dist/a.ts", "src/a.ts"]),
      repo
    );

    expect(result.total).toBe(2);
    expect(result.covered).toBe(1);
    expect(result.percentage).toBe(50);
  });

  it("returns the original data untouched when nothing is ignored", () => {
    repo = makeRepo("nothing-matches\n");
    const original = data(["src/a.ts"]);

    expect(excludeGitIgnored(original, repo).data).toBe(original);
  });

  it("leaves the data alone and explains when git cannot answer", () => {
    const notARepo = fs.mkdtempSync(path.join(os.tmpdir(), "tcr-norepo2-"));

    try {
      const original = data(["a.ts"]);
      const result = excludeGitIgnored(original, notARepo);

      expect(result.data).toBe(original);
      expect(result.unavailable).toBe("not a git repository");
    } finally {
      fs.rmSync(notARepo, { recursive: true, force: true });
    }
  });

  it("reports 100% when everything was ignored", () => {
    repo = makeRepo("dist\n");

    expect(excludeGitIgnored(data(["dist/a.ts"]), repo).data.percentage).toBe(
      100
    );
  });
});
