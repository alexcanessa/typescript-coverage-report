# Changelog

## [2.0.0](https://github.com/alexcanessa/typescript-coverage-report/compare/1.1.1...2.0.0) (2026-09-24)


### ⚠ BREAKING CHANGES

* Node 22.12 or newer is required. Node 20 reached end of life on 2026-04-30, so every previously supported line was already unsupported upstream. This also allowed ncp and rimraf to be dropped for Node built-ins, taking the runtime dependency surface from six packages to four.
* declare the 2.0 breaking changes ([#192](https://github.com/alexcanessa/typescript-coverage-report/issues/192))

### Features

* add TypeScript 6 support ([34b31d9](https://github.com/alexcanessa/typescript-coverage-report/commit/34b31d9d35a1e445a85da5041d937089cdfefc8e))
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
