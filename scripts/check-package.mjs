#!/usr/bin/env node
/**
 * Assert that the tarball we would publish is actually usable.
 *
 * This exists because of v1.1.0/v1.1.1, which were published with a stale
 * dist/ containing the pre-refactor React reporter. Node resolved
 * dist/lib/reporters/html.js ahead of dist/lib/reporters/html/index.js, so
 * every install ran deleted code that required react, react-dom and
 * semantic-ui-react -- none of them declared dependencies. Nothing in the
 * repo could have caught that, because nothing ever inspected the tarball.
 *
 * Runs against a real packed tarball rather than `npm pack --dry-run --json`,
 * so it is package-manager agnostic and checks the bytes that would ship.
 */
import { execFileSync } from "node:child_process";
import {
  mkdtempSync,
  readFileSync,
  readdirSync,
  statSync,
  rmSync
} from "node:fs";
import { builtinModules } from "node:module";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));

const failures = [];
const check = (ok, message) => {
  if (!ok) failures.push(message);
};

const staging = mkdtempSync(path.join(tmpdir(), "tcr-pack-"));
process.on("exit", () => rmSync(staging, { recursive: true, force: true }));

// `pack` runs prepack, which cleans and rebuilds, so this exercises the real
// publish path rather than whatever happens to be sitting in dist/.
execFileSync("pnpm", ["pack", "--pack-destination", staging], {
  cwd: root,
  stdio: "pipe",
  shell: process.platform === "win32"
});

const tarball = readdirSync(staging).find((f) => f.endsWith(".tgz"));
if (!tarball) {
  console.error("check-package: pnpm pack produced no tarball");
  process.exit(1);
}
const tarballPath = path.join(staging, tarball);

execFileSync("tar", ["-xzf", tarballPath, "-C", staging]);
const unpacked = path.join(staging, "package");

const walk = (dir, base = "") =>
  readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const rel = base ? `${base}/${entry.name}` : entry.name;
    return entry.isDirectory() ? walk(path.join(dir, entry.name), rel) : [rel];
  });

const files = new Set(walk(unpacked));
const unpackedSize = [...files].reduce(
  (total, f) => total + statSync(path.join(unpacked, f)).size,
  0
);

// --- entry points must resolve inside the tarball -------------------------
check(
  pkg.main && files.has(pkg.main),
  `main "${pkg.main}" is not in the tarball`
);
check(
  pkg.types && files.has(pkg.types),
  `types "${pkg.types}" is not in the tarball`
);
for (const [name, target] of Object.entries(pkg.bin ?? {})) {
  check(
    files.has(target),
    `bin "${name}" -> "${target}" is not in the tarball`
  );
}

// --- dist is actually populated -------------------------------------------
const dist = [...files].filter((f) => f.startsWith("dist/"));
check(
  dist.length >= 10,
  `expected at least 10 dist files, found ${dist.length}`
);
check(
  dist.some((f) => f.endsWith(".d.ts")),
  "no .d.ts emitted despite declaration:true"
);

// --- runtime assets -------------------------------------------------------
// src/lib/index.ts copies these from __dirname/../../assets at runtime, so a
// dist-only allowlist yields a package whose reports are silently unstyled.
for (const asset of ["assets/report.css", "assets/source-file.js"]) {
  check(
    files.has(asset),
    `runtime asset "${asset}" is missing -> unstyled reports`
  );
}

// --- nothing that must never ship -----------------------------------------
const forbidden = [
  "src/",
  "test/",
  "docs/",
  "_site/",
  "coverage/",
  "coverage-ts/",
  "__mocks__/",
  ".github/",
  "images/",
  "scripts/",
  "dist/components/"
];
const forbiddenExact = [
  "yarn.lock",
  "pnpm-lock.yaml",
  "package-lock.json",
  "tsconfig.json",
  "jest.config.js",
  "babel.config.js",
  "commitlint.config.js",
  "eslint.config.js",
  ".all-contributorsrc",
  "pnpm-workspace.yaml"
];
for (const f of files) {
  const dir = forbidden.find((p) => f.startsWith(p));
  if (dir) failures.push(`"${f}" must not be published (matched "${dir}")`);
  if (forbiddenExact.includes(f)) failures.push(`"${f}" must not be published`);
}

// The exact artefact that broke 1.1.0/1.1.1.
check(
  !files.has("dist/lib/reporters/html.js"),
  "dist/lib/reporters/html.js is present: this is the stale React reporter " +
    "that shadows html/index.js and caused #171/#175"
);

// --- the bin is executable as a CLI ---------------------------------------
const binTarget = Object.values(pkg.bin ?? {})[0];
if (binTarget && files.has(binTarget)) {
  const source = readFileSync(path.join(unpacked, binTarget), "utf8");
  check(source.startsWith("#!"), `${binTarget} is missing its shebang`);
}

// --- every require() must be declared or a builtin ------------------------
// This is the assertion that fails loudly on the react regression.
const declared = new Set([
  ...Object.keys(pkg.dependencies ?? {}),
  ...Object.keys(pkg.peerDependencies ?? {}),
  ...builtinModules
]);
for (const file of dist.filter((f) => f.endsWith(".js"))) {
  const source = readFileSync(path.join(unpacked, file), "utf8");
  for (const match of source.matchAll(/require\(\s*["']([^"']+)["']\s*\)/g)) {
    const spec = match[1];
    if (spec.startsWith(".") || spec.startsWith("node:")) continue;
    const name = spec.startsWith("@")
      ? spec.split("/").slice(0, 2).join("/")
      : spec.split("/")[0];
    if (!declared.has(name)) {
      failures.push(
        `${file} requires "${name}", which is not a declared dependency`
      );
    }
  }
}

// --- size ceiling catches accidental inclusions ---------------------------
check(
  unpackedSize < 1_500_000,
  `unpacked size ${unpackedSize} exceeds 1.5MB - something unintended is being published`
);

// --- release-time only ----------------------------------------------------
if (process.env.EXPECT_VERSION) {
  check(
    pkg.version === process.env.EXPECT_VERSION,
    `package.json version ${pkg.version} != expected ${process.env.EXPECT_VERSION}`
  );
}

if (failures.length > 0) {
  console.error("\ncheck-package: FAILED\n");
  for (const message of failures) console.error(`  x ${message}`);
  console.error("");
  process.exit(1);
}

console.log(
  `check-package: OK  ${tarball}  ${files.size} files, ` +
    `${dist.length} in dist, ${(unpackedSize / 1024).toFixed(0)}kB unpacked`
);
