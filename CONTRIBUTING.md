# Contributing

Thanks for being here. This is a small, widely-used tool and a good first pull
request is genuinely welcome.

## Getting set up

This project uses [pnpm](https://pnpm.io). You need **Node 22.12 or newer** to
develop; the published package supports the same floor.

```bash
git clone https://github.com/alexcanessa/typescript-coverage-report.git
cd typescript-coverage-report
pnpm install          # also installs the git hooks, via the prepare script
pnpm build            # or: pnpm build --watch
pnpm link --global    # to try your build in another project
```

## The checks

| Command                             | What it does                                      | Enforced by          |
| ----------------------------------- | ------------------------------------------------- | -------------------- |
| `pnpm typecheck`                    | `tsc --noEmit` over the source _and_ the tests    | CI                   |
| `pnpm lint`                         | ESLint, autofixing                                | pre-commit hook      |
| `pnpm lint:ci`                      | ESLint, no autofix, zero warnings                 | CI                   |
| `pnpm format` / `pnpm format:check` | Prettier                                          | pre-commit hook / CI |
| `pnpm test`                         | Jest unit tests                                   | CI                   |
| `pnpm build && pnpm type-coverage`  | the tool run on itself, must stay at or above 90% | CI                   |
| `pnpm check:package`                | asserts the npm tarball is actually publishable   | CI                   |
| `pnpm e2e`                          | installs the packed tarball and runs it for real  | CI                   |

CI runs all of these on every pull request. The local hooks only run the fast,
autofixing ones: they exist to save you a round trip, not to be the gate. If a
hook is ever in your way, `--no-verify` is fine; CI is the real check.

Before opening a pull request:

```bash
pnpm typecheck && pnpm lint:ci && pnpm test
```

## Branch names

`type/short-description`, using the same types as commits:

```
feat/lcov-reporter
fix/windows-asset-paths
docs/contributing
chore/bump-eslint
```

This is a convention, not a check. Nothing will reject your branch name.

## Commit messages and pull request titles

We follow [Conventional Commits](https://www.conventionalcommits.org/) (the
Angular convention), and we are **very open to emojis** 🤯 — with one rule.

```
type(optional scope): subject
```

Types: `feat`, `fix`, `perf`, `refactor`, `docs`, `test`, `build`, `ci`,
`chore`, `style`, `revert`.

- ✅ `feat: ✨ add a JSON reporter`
- ✅ `fix(html): handle Windows path separators`
- ❌ `✨ feat: add a JSON reporter`

A **leading** emoji is not parseable as a conventional commit. The release
tooling would silently drop your change from the changelog and it would never
ship — so the emoji goes after the colon.

Because we squash-merge, **the pull request title becomes the commit on
`main`**, so the title is what CI validates. Your individual commits can say
whatever you like; the pre-commit hook will nudge you, but it will not block
your pull request.

## Releases

Do **not** bump the version in `package.json`, and do **not** publish by hand.

[release-please](https://github.com/googleapis/release-please) reads the
conventional commits on `main` and keeps a release pull request open. Merging
it tags the release and publishes to npm from CI. If your change is
user-facing, `feat:` or `fix:` is what makes it ship.

### Maintainer setup

Two things are configured outside the repository and are not yet done:

1. **npm trusted publishing.** On npmjs.com, add a trusted publisher for this
   repository with workflow `release.yml` and environment `npm`. Until then
   the publish step will fail. Once it works, require trusted publishing on the
   package and revoke any legacy automation tokens: that is what makes
   publishing from a laptop impossible rather than merely discouraged.
2. **A GitHub App token for release-please.** It currently runs with the
   default `GITHUB_TOKEN`, and pull requests created with that token do not
   trigger workflows -- so the release pull request does not run CI. This must
   be swapped for a GitHub App token **before** required status checks are
   enabled on `main`, or the release pull request can never satisfy them and
   releases deadlock.

## Tests

Snapshots live next to the tests that create them. If a change to the report
output is intentional, update them with:

```bash
pnpm test -- -u
```

Prefer an explicit assertion over a snapshot for anything that matters —
escaping, path handling, exit codes. Snapshots of escaped markup are unreadable
and tend to get `-u`'d past a real regression.

## Code of Conduct

This project follows the [Contributor Covenant](CODE_OF_CONDUCT.md).

## Recognition

We use the [all-contributors](https://allcontributors.org) specification.
Comment `@all-contributors please add @me for code` on your merged pull request
— every kind of contribution counts, not just code.
