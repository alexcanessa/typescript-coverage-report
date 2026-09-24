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

const npm = (...args) =>
  execFileSync("npm", args, {
    cwd: project,
    stdio: "inherit",
    shell: isWindows
  });

npm(
  "install",
  path.resolve(tarball),
  `typescript@${tsVersion}`,
  "--omit=dev",
  "--no-audit",
  "--no-fund",
  ...extraFlags
);

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

// --- the threshold gate still exits 2 ------------------------------------
check(
  run(["--outputDir", "out-high", "--threshold", "100"]) === 2,
  "CLI should exit 2 when coverage is below the threshold"
);

// --- report drift across the matrix rather than asserting an exact number --
const summary =
  `| ${process.version} | ts ${tsVersion} | ${process.platform} | ` +
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
