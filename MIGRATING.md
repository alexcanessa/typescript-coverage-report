# Migrating to 2.0

2.0 is mostly a repair release. The headline is that **1.1.0 and 1.1.1 were
broken on npm** and 2.0 is the first version in eighteen months that installs
and runs correctly. If you are pinned to `^0.8.0` because of that, this is the
upgrade that unpins you.

Everything below is a genuine behaviour change. Most projects will need to
change nothing.

## At a glance

| Change                                  | Do you need to act?                             |
| --------------------------------------- | ----------------------------------------------- |
| Node 22.12 or newer required            | Only if you run Node 20 or older                |
| `-V` no longer prints the version       | Only if you scripted `-V`                       |
| Boolean flags take no value             | Only if you pass `--strict false` or similar    |
| `--ignore-files` repeats now accumulate | Check your reports — more files are ignored now |
| Invalid `--threshold` is an error       | Only if it was already silently broken          |
| The report excludes its own output      | Your percentage may change, for the better      |
| TypeScript 7 unsupported                | Stay on TypeScript 6 or older                   |

## Node 22.12 or newer is required

`engines` now declares `>=22.12.0`.

Node 20 reached end of life on 2026-04-30, so every previously supported line
was already unsupported upstream. Raising the floor also let the package drop
two dependencies in favour of Node built-ins: `ncp`, last published in 2016,
and `rimraf`. The runtime dependency surface is now four packages instead of
six.

If you are on an older Node, stay on 1.x until you can upgrade — though note
1.1.x is broken on npm, so in practice that means `0.8.0`.

## `-V` no longer prints the version

Use `-v` or `--version`.

The CLI used to rewrite `-v` to `-V` before handing argv to the parser, which
also corrupted a legitimate `-v` appearing as an option _value_. `-V` was never
documented.

## Boolean flags no longer take a value

`--strict`, `--debug`, `--cache`, `--ignore-catch` and `--ignore-unread` are
now plain flags.

```diff
- typescript-coverage-report --strict true
+ typescript-coverage-report --strict

- typescript-coverage-report --strict false
+ typescript-coverage-report
```

This one is worth checking even though it looks cosmetic. `--strict false`
previously set the **string** `"false"`, which is truthy in JavaScript — so it
turned strict mode _on_. If you passed it expecting to disable strict mode, you
were getting the opposite, and omitting the flag now will change your numbers.

## `--ignore-files` requires a value, and repeats accumulate

```shell
typescript-coverage-report -i "demo1/*.ts" -i "demo2/foo.ts"
```

Both globs now take effect. Previously only the last one did, despite the help
text advertising exactly this usage ([#118](https://github.com/alexcanessa/typescript-coverage-report/issues/118)).

**If you pass `-i` more than once, your reports will now ignore more files than
before**, so your percentage may move. That is the fix working, but it is a
visible change.

Passing `-i` with no value is now a usage error rather than silently reaching
the type checker as a boolean.

## An invalid `--threshold` is now an error

```shell
$ typescript-coverage-report --threshold abc
error: option '-t, --threshold <number>' argument 'abc' is invalid.
```

Previously `parseFloat("abc")` produced `NaN`, and `percentage < NaN` is
`false`, so **the run exited 0 however low the coverage was**. If you had a
typo in a CI script, that gate has never fired. Expect it to fire now.

Thresholds are also validated to be between 0 and 100.

## The report no longer includes its own previous output

If your `tsconfig.json` has no `include`, the previous run's generated files
were part of the type check and appeared in the coverage table
([#161](https://github.com/alexcanessa/typescript-coverage-report/issues/161),
[#140](https://github.com/alexcanessa/typescript-coverage-report/issues/140)).

Your percentage may change as a result. It was wrong before: the report was
grading its own output. A second consecutive run also used to fail with
`ENOENT` and exit `255`; it no longer does.

## TypeScript 7 is not supported

`peerDependencies` covers `2 || 3 || 4 || 5 || 6`.

TypeScript 7 replaced the classic compiler API that `type-coverage-core` is
built on: `require("typescript")` no longer returns `createProgram` or the type
checker, so the analysis cannot run at all. CI carries a canary job against
TypeScript 7 and this page will change when upstream catches up.

TypeScript 4.9, 5.0, 5.9 and 6.0 are all covered by the compatibility matrix on
every pull request.

## Also worth knowing

Not breaking, but visible:

- **HTML in the report is now escaped.** Source files containing `</textarea>`,
  `<`, `&` or entity text used to corrupt the page and silently break syntax
  highlighting ([#173](https://github.com/alexcanessa/typescript-coverage-report/issues/173)).
- **CodeMirror moved from 5.58.2 to 5.65.21**, fixing highlighting for
  template-literal types and emoji
  ([#61](https://github.com/alexcanessa/typescript-coverage-report/issues/61),
  [#68](https://github.com/alexcanessa/typescript-coverage-report/issues/68)).
  All CDN assets are now pinned with Subresource Integrity hashes.
- **A nested `--outputDir`** such as `reports/coverage-ts` now works.
- **`typescript-coverage-report` now ships its own type declarations.**
