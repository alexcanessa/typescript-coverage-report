#!/usr/bin/env node
/**
 * Install the packed tarball into a scratch project and run the CLI for real.
 *
 * Unit tests mock type-coverage-core and never touch the HTML reporter, so
 * this is the only place the shipped artefact is exercised end to end:
 * against a matrix TypeScript, with --omit=dev, from the tarball rather than
 * the source tree. A dist that requires react dies here immediately.
 *
 * Env:
 *   TS_VERSION          TypeScript to install alongside (default 5.9.3)
 *   PACKAGE_MANAGER     npm (default) or pnpm. npm is the default because it
 *                       is what most consumers use; the pnpm leg exists
 *                       because its strict node_modules layout fails loudly
 *                       on an undeclared dependency, which is exactly the
 *                       class of bug that shipped in 1.1.0 and 1.1.1.
 *   NPM_INSTALL_FLAGS   extra npm flags, e.g. --legacy-peer-deps
 *   TARBALL             explicit tarball path (default: pack one)
 */
import { execFileSync } from "node:child_process";
import {
  appendFileSync,
  cpSync,
  existsSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const tsVersion = process.env.TS_VERSION ?? "5.9.3";
const extraFlags = (process.env.NPM_INSTALL_FLAGS ?? "")
  .split(" ")
  .filter(Boolean);
const isWindows = process.platform === "win32";

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

const staging = mkdtempSync(path.join(tmpdir(), "tcr-smoke-"));
process.on("exit", () => rmSync(staging, { recursive: true, force: true }));

let tarball = process.env.TARBALL;
if (!tarball) {
  execFileSync("pnpm", ["pack", "--pack-destination", staging], {
    cwd: root,
    stdio: "pipe",
    shell: isWindows
  });
  tarball = path.join(
    staging,
    readdirSync(staging).find((f) => f.endsWith(".tgz"))
  );
}

const project = path.join(staging, "project");
cpSync(path.join(root, "test/fixture"), project, { recursive: true });

const packageManager = process.env.PACKAGE_MANAGER ?? "npm";

const install = () => {
  const args =
    packageManager === "pnpm"
      ? [
          "install",
          path.resolve(tarball),
          `typescript@${tsVersion}`,
          "--prod",
          "--ignore-workspace",
          ...extraFlags
        ]
      : [
          "install",
          path.resolve(tarball),
          `typescript@${tsVersion}`,
          "--omit=dev",
          "--no-audit",
          "--no-fund",
          ...extraFlags
        ];

  execFileSync(packageManager, args, {
    cwd: project,
    stdio: "inherit",
    shell: isWindows
  });
};

install();

// The 1.1.x failure mode: the published dist required these but never
// declared them, so they were absent unless a consumer happened to have them.
for (const forbidden of ["react", "react-dom", "semantic-ui-react"]) {
  check(
    !existsSync(path.join(project, "node_modules", forbidden)),
    `${forbidden} was installed: the package still depends on the React reporter`
  );
}

const bin = path.join(
  project,
  "node_modules",
  ".bin",
  isWindows ? "typescript-coverage-report.cmd" : "typescript-coverage-report"
);

const run = (args) => {
  try {
    execFileSync(bin, args, {
      cwd: project,
      stdio: "inherit",
      shell: isWindows
    });
    return 0;
  } catch (error) {
    return error.status ?? 1;
  }
};

// --- a normal run succeeds ------------------------------------------------
check(
  run(["--outputDir", "out", "--threshold", "0"]) === 0,
  "CLI did not exit 0"
);

for (const file of [
  "out/index.html",
  "out/typescript-coverage.json",
  "out/assets/report.css",
  "out/assets/source-file.js",
  "out/files/src/index.ts.html",
  "out/files/src/tricky.ts.html"
]) {
  check(
    existsSync(path.join(project, file)),
    `missing generated file: ${file}`
  );
}

// --- the JSON report is plausible ----------------------------------------
let data = {};
const jsonPath = path.join(project, "out/typescript-coverage.json");
if (existsSync(jsonPath)) {
  data = JSON.parse(readFileSync(jsonPath, "utf8"));
  check(
    Number.isFinite(data.percentage),
    `percentage is not a number: ${data.percentage}`
  );
  check(
    data.percentage > 0 && data.percentage < 100,
    `fixture should be partially covered, got ${data.percentage}`
  );
  check(
    Object.keys(data.fileCounts ?? {}).length >= 2,
    "fileCounts should list both fixture files"
  );
}

// --- running twice in a row must be stable (#161, #140) -------------------
// The fixture tsconfig deliberately has no "include", so the previous run"s
// output is part of the TypeScript program. Before the fix this polluted the
// table and then failed with ENOENT on the JSON it had just deleted.
const second = run(["--outputDir", "out", "--threshold", "0"]);
check(second === 0, `second consecutive run exited ${second}, expected 0`);

if (existsSync(jsonPath)) {
  const again = JSON.parse(readFileSync(jsonPath, "utf8"));
  check(
    Math.abs(again.percentage - data.percentage) < 0.001,
    `percentage drifted between runs: ${data.percentage} then ${again.percentage}`
  );
  check(
    !Object.keys(again.fileCounts ?? {}).some((f) => f.startsWith("out/")),
    "the report listed its own output directory"
  );
}

// --- the report escapes what it renders (#173) ----------------------------
// test/fixture/src/tricky.ts contains a literal closing textarea tag, raw
// angle brackets and entity text. Unescaped, the tag terminates the editor
// early and everything after it stops being source code.
const trickyPage = path.join(project, "out/files/src/tricky.ts.html");
if (existsSync(trickyPage)) {
  const html = readFileSync(trickyPage, "utf8");
  const closingTags = html.match(/<\/textarea>/g) ?? [];

  check(
    closingTags.length === 1,
    `expected exactly one closing textarea tag, found ${closingTags.length}`
  );
  check(
    !html.includes("<script>alert(1)</script>"),
    "raw script markup from the source leaked into the report"
  );

  const annotations = /<pre id="annotations"[^>]*>([\s\S]*?)<\/pre>/.exec(html);
  check(annotations !== null, "the annotations block is missing");
  if (annotations) {
    const decoded = annotations[1]
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, String.fromCharCode(34))
      .replace(/&#39;/g, String.fromCharCode(39))
      .replace(/&amp;/g, "&");
    try {
      JSON.parse(decoded);
    } catch (error) {
      failures.push(
        `the annotations block is not valid JSON: ${error.message}`
      );
    }
  }
}

// --- the threshold gate still exits 2 ------------------------------------
check(
  run(["--outputDir", "out-high", "--threshold", "100"]) === 2,
  "CLI should exit 2 when coverage is below the threshold"
);

// --- repeated --ignore-files are all honoured (#118) ----------------------
// The first glob matches, the second matches nothing. If only the last
// occurrence won, as it did before, tricky.ts would still be reported.
const ignored = run([
  "--outputDir",
  "out-ignore",
  "--threshold",
  "0",
  "-i",
  "src/tricky.ts",
  "-i",
  "src/does-not-exist.ts"
]);
check(ignored === 0, `run with repeated -i exited ${ignored}`);

const ignoredJson = path.join(project, "out-ignore/typescript-coverage.json");
if (existsSync(ignoredJson)) {
  const reported = Object.keys(
    JSON.parse(readFileSync(ignoredJson, "utf8")).fileCounts ?? {}
  );

  check(
    !reported.some((f) => f.includes("tricky")),
    `the first -i glob was discarded; still reported: ${reported.join(", ")}`
  );
}

// --- report drift across the matrix rather than asserting an exact number --
const summary =
  `| ${process.version} | ts ${tsVersion} | ${packageManager} | ${process.platform} | ` +
  `${Number(data.percentage ?? 0).toFixed(2)}% | ${data.anys?.length ?? "?"} anys |`;
console.log(summary);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, `${summary}\n`);
}

if (failures.length > 0) {
  console.error("\nsmoke-install: FAILED\n");
  for (const message of failures) console.error(`  x ${message}`);
  console.error("");
  process.exit(1);
}
console.log("smoke-install: OK");
