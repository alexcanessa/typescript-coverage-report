# Changelog

## [2.1.1](https://github.com/alexcanessa/typescript-coverage-report/compare/2.1.0...2.1.1) (2026-09-26)


### Bug Fixes

* forward every option to the type checker ([#207](https://github.com/alexcanessa/typescript-coverage-report/issues/207)) ([313d58f](https://github.com/alexcanessa/typescript-coverage-report/commit/313d58f63630e5805deb3676413225ae47fff196))

## [2.1.0](https://github.com/alexcanessa/typescript-coverage-report/compare/2.0.0...2.1.0) (2026-09-24)


### Features

* fail when a file's coverage decreases ([#199](https://github.com/alexcanessa/typescript-coverage-report/issues/199)) ([5f1b560](https://github.com/alexcanessa/typescript-coverage-report/commit/5f1b5603192b66c1407abf0aaf609e34b0357dfa))
* optionally exclude files that git ignores ([#204](https://github.com/alexcanessa/typescript-coverage-report/issues/204)) ([6eb7d29](https://github.com/alexcanessa/typescript-coverage-report/commit/6eb7d2966e53625893e1783056205fd3949a3e24))
* show activity while the type check runs ([#202](https://github.com/alexcanessa/typescript-coverage-report/issues/202)) ([d41815e](https://github.com/alexcanessa/typescript-coverage-report/commit/d41815ead3bbaac0123f66bca69da0f89bfcba43))
* support a configuration file ([#201](https://github.com/alexcanessa/typescript-coverage-report/issues/201)) ([08b8b5d](https://github.com/alexcanessa/typescript-coverage-report/commit/08b8b5de43ead3c29d3eb90a588353610ee8ae0e))


### Bug Fixes

* fail when no files were analysed ([#205](https://github.com/alexcanessa/typescript-coverage-report/issues/205)) ([804d87a](https://github.com/alexcanessa/typescript-coverage-report/commit/804d87a3d70ac42fa942053e5895015031260627))


### Documentation

* correct inaccurate claims in the README ([#206](https://github.com/alexcanessa/typescript-coverage-report/issues/206)) ([08c21f1](https://github.com/alexcanessa/typescript-coverage-report/commit/08c21f16a41a82a2144b09af116266cb4ead002f))

## [2.0.0](https://github.com/alexcanessa/typescript-coverage-report/compare/1.1.1...2.0.0) (2026-09-24)


### ⚠ BREAKING CHANGES

**Most projects need to change nothing.** See [MIGRATING.md](https://github.com/alexcanessa/typescript-coverage-report/blob/main/MIGRATING.md) for the full guide.

Two of these look cosmetic and are not: `--strict false` used to turn strict mode _on_, and an invalid `--threshold` used to exit `0` however low the coverage was.

* **Node 22.12 or newer is required.** Node 20 reached end of life on 2026-04-30, so every previously supported line was already unsupported upstream. This also allowed `ncp` and `rimraf` to be dropped for Node built-ins, taking the runtime dependency surface from six packages to four.
* **`-V` no longer prints the version.** Use `-v` or `--version`. The CLI used to rewrite `-v` to `-V` before parsing, which also corrupted a legitimate `-v` used as an option value. `-V` was never documented.
* **Boolean flags no longer take a value.** `--strict`, `--debug`, `--cache`, `--ignore-catch` and `--ignore-unread` are plain flags. Passing `--strict false` previously set the string `"false"`, which is truthy, so it *enabled* strict mode; omitting the flag will change your numbers.
* **`--ignore-files` requires a value, and repeats now accumulate**, as its help text always claimed ([#118](https://github.com/alexcanessa/typescript-coverage-report/issues/118)). Previously only the last occurrence took effect, so reports will now ignore more files than before.
* **An invalid `--threshold` is now a usage error.** `--threshold abc` parsed as `NaN`, and `percentage < NaN` is `false`, so the run exited `0` regardless of coverage. Any CI gate with a typo in it has never fired, and will now.
* **The report no longer includes its own previous output** ([#161](https://github.com/alexcanessa/typescript-coverage-report/issues/161), [#140](https://github.com/alexcanessa/typescript-coverage-report/issues/140)). Projects whose tsconfig has no `include` were grading the generated report as source; percentages may change, and a second consecutive run no longer fails with `ENOENT` and exit `255`.
* **TypeScript 7 is not supported.** It replaced the classic compiler API that `type-coverage-core` is built on, so `require("typescript")` no longer returns `createProgram` or the type checker. CI carries a canary job against it.

### 🎯 New: artefacts your CI can actually read

The tool has always gated a build by exiting `2` below the threshold, but the only outputs were a bespoke JSON file and an HTML page. It now emits the two formats CI systems understand natively, and lets you choose which reporters run ([#196](https://github.com/alexcanessa/typescript-coverage-report/issues/196)):

```shell
$ typescript-coverage-report --reporters lcov --threshold 90       # Codecov, Coveralls, SonarQube
$ typescript-coverage-report --reporters cobertura --threshold 90  # Azure Pipelines, Jenkins, GitLab
```

Uploading `lcov.info` is also what gives you per-file coverage deltas on a pull request, without this tool needing to know anything about git. Closes [#162](https://github.com/alexcanessa/typescript-coverage-report/issues/162), [#20](https://github.com/alexcanessa/typescript-coverage-report/issues/20), [#73](https://github.com/alexcanessa/typescript-coverage-report/issues/73), [#74](https://github.com/alexcanessa/typescript-coverage-report/issues/74) and [#67](https://github.com/alexcanessa/typescript-coverage-report/issues/67).

### 📦 If you are pinned to `^0.8.0`

1.1.0 and 1.1.1 shipped a `dist/` that still required `react`, `react-dom` and `semantic-ui-react` without declaring them ([#171](https://github.com/alexcanessa/typescript-coverage-report/issues/171), [#175](https://github.com/alexcanessa/typescript-coverage-report/issues/175), [#167](https://github.com/alexcanessa/typescript-coverage-report/issues/167), [#160](https://github.com/alexcanessa/typescript-coverage-report/issues/160), [#125](https://github.com/alexcanessa/typescript-coverage-report/issues/125)). This is the first release in eighteen months that installs and runs correctly, and CI now asserts that every `require()` in the published tarball resolves to a declared dependency.

### Features

* add TypeScript 6 support ([79148b8](https://github.com/alexcanessa/typescript-coverage-report/commit/79148b87d8950054c403d673dc9dfa9d38ff7c45))
* emit lcov and cobertura reports, and make reporters selectable ([#196](https://github.com/alexcanessa/typescript-coverage-report/issues/196)) ([a364758](https://github.com/alexcanessa/typescript-coverage-report/commit/a364758f9fc3c294b7155843a4d4baf121b3d424))


### Bug Fixes

* escape HTML in the generated report ([#182](https://github.com/alexcanessa/typescript-coverage-report/issues/182)) ([b9ac4af](https://github.com/alexcanessa/typescript-coverage-report/commit/b9ac4af9895f5ad99018fca3bdc59598c5582e75))
* honour repeated --ignore-files and upgrade commander ([#183](https://github.com/alexcanessa/typescript-coverage-report/issues/183)) ([ca99846](https://github.com/alexcanessa/typescript-coverage-report/commit/ca99846fd61797da7b149e51499de8e88aa77e17))
* pin report assets, drop two dependencies, make the text table per-call ([#184](https://github.com/alexcanessa/typescript-coverage-report/issues/184)) ([85dbbdb](https://github.com/alexcanessa/typescript-coverage-report/commit/85dbbdb3a92bf252f2e77ba6ed6bf5b9c62fde54))
* publish a correct package ([#179](https://github.com/alexcanessa/typescript-coverage-report/issues/179)) ([7eca1fc](https://github.com/alexcanessa/typescript-coverage-report/commit/7eca1fc182d81986203ee431b9a28bba06c79548))
* stop the report polluting its own next run ([#181](https://github.com/alexcanessa/typescript-coverage-report/issues/181)) ([3f5dde7](https://github.com/alexcanessa/typescript-coverage-report/commit/3f5dde78ec02eb9525d74adcb052ee0b7d59e8ef))


### Documentation

* add a migration guide for 2.0 ([#194](https://github.com/alexcanessa/typescript-coverage-report/issues/194)) ([b93fd03](https://github.com/alexcanessa/typescript-coverage-report/commit/b93fd0354dd889f1303d3a19c8cbc9f3d6010df0))
* add contributor governance ([#187](https://github.com/alexcanessa/typescript-coverage-report/issues/187)) ([b65f516](https://github.com/alexcanessa/typescript-coverage-report/commit/b65f516f6632550bcb1f51709cb43542257eeaaa))


### Build System

* declare the 2.0 breaking changes ([#192](https://github.com/alexcanessa/typescript-coverage-report/issues/192)) ([a5faad7](https://github.com/alexcanessa/typescript-coverage-report/commit/a5faad7d1708d9610822b4a14799cb9dac0397a1))
