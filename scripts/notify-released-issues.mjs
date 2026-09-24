#!/usr/bin/env node
/**
 * Comment on every issue a release closed, telling people it shipped.
 *
 * Closing an issue when the fix merges is not the same as it being usable:
 * on this project the gap between "fixed on main" and "published" has
 * historically been months, and issues #21 and #28 exist purely because
 * nobody was told. This closes that loop automatically.
 *
 * Works from the squash-merge history: every commit on main carries its pull
 * request number, and GitHub knows which issues each pull request closed.
 *
 * Idempotent. Each comment carries a hidden marker so re-running a release,
 * or running this by hand afterwards, never double-posts.
 *
 * Env:
 *   GITHUB_TOKEN  required, needs issues: write
 *   GITHUB_REPOSITORY  owner/repo
 *   TAG           the tag just released, e.g. 2.1.0
 *   PREVIOUS_TAG  optional; discovered from git when omitted
 *   DRY_RUN       set to skip posting, for local checks
 */
import { execFileSync } from "node:child_process";

const repository = process.env.GITHUB_REPOSITORY;
const tag = process.env.TAG;
const dryRun = Boolean(process.env.DRY_RUN);

if (!repository || !tag) {
  console.error("GITHUB_REPOSITORY and TAG are required.");
  process.exit(1);
}

const [owner, repo] = repository.split("/");

const git = (...args) => execFileSync("git", args, { encoding: "utf8" }).trim();

const gh = (args, input) =>
  execFileSync("gh", args, {
    encoding: "utf8",
    input,
    maxBuffer: 16 * 1024 * 1024
  });

const previousTag =
  process.env.PREVIOUS_TAG ||
  (() => {
    try {
      return git("describe", "--tags", "--abbrev=0", `${tag}^`);
    } catch {
      return "";
    }
  })();

const range = previousTag ? `${previousTag}..${tag}` : tag;
const subjects = git("log", range, "--format=%s").split("\n").filter(Boolean);

// Squash merges put the pull request number in the subject: "feat: x (#123)".
const pullNumbers = [
  ...new Set(
    subjects.flatMap((subject) =>
      [...subject.matchAll(/\(#(\d+)\)/g)].map((m) => m[1])
    )
  )
];

console.log(`Release ${tag} (since ${previousTag || "the beginning"})`);
console.log(
  `  ${subjects.length} commits, ${pullNumbers.length} pull requests`
);

// GitHub knows which issues a pull request closed; deriving it from commit
// text would miss "Fixes #n" written in a pull request body.
const closedIssues = new Set();

for (const number of pullNumbers) {
  const query = `
    query($owner:String!,$repo:String!,$number:Int!){
      repository(owner:$owner,name:$repo){
        pullRequest(number:$number){
          closingIssuesReferences(first:20){ nodes { number } }
        }
      }
    }`;

  try {
    const result = JSON.parse(
      gh([
        "api",
        "graphql",
        "-f",
        `query=${query}`,
        "-F",
        `owner=${owner}`,
        "-F",
        `repo=${repo}`,
        "-F",
        `number=${number}`
      ])
    );

    for (const issue of result.data.repository.pullRequest
      ?.closingIssuesReferences?.nodes ?? []) {
      closedIssues.add(issue.number);
    }
  } catch (error) {
    // One unreadable pull request must not stop the rest being notified.
    console.warn(
      `  could not read #${number}: ${error.message.split("\n")[0]}`
    );
  }
}

if (closedIssues.size === 0) {
  console.log("  no issues closed by this release");
  process.exit(0);
}

const marker = `<!-- released-in:${tag} -->`;
const releaseUrl = `https://github.com/${repository}/releases/tag/${tag}`;
const body =
  `${marker}\n` +
  `This shipped in [**${tag}**](${releaseUrl}).\n\n` +
  "```shell\n" +
  `npm install --save-dev typescript-coverage-report@${tag}\n` +
  "```\n\n" +
  "If it does not behave as you expect, please reopen — a fix that does not " +
  "actually work for you is not a fix.";

let posted = 0;

for (const issue of [...closedIssues].sort((a, b) => a - b)) {
  const existing = JSON.parse(
    gh(["api", `repos/${repository}/issues/${issue}/comments`, "--paginate"])
  );

  if (existing.some((comment) => comment.body?.includes(marker))) {
    console.log(`  #${issue} already notified`);
    continue;
  }

  if (dryRun) {
    console.log(`  #${issue} would be notified`);
    continue;
  }

  gh([
    "api",
    `repos/${repository}/issues/${issue}/comments`,
    "-f",
    `body=${body}`
  ]);
  console.log(`  #${issue} notified`);
  posted += 1;
}

console.log(`Done. ${posted} issue${posted === 1 ? "" : "s"} notified.`);
