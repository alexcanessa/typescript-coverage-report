import { createProgram, resolveOptions } from "../options";
import type { ResolvedOptions } from "../options";

/**
 * Contract tests for the seams between components.
 *
 * Every bug this file guards against had passing tests either side of it. The
 * CLI parsed the flag correctly and the type checker accepted the option
 * correctly; the hop between them dropped it. These assertions derive their
 * expectations from the code rather than a hand-written list, so a new option
 * cannot be added to one end and silently forgotten at the other.
 */

const camel = (flag: string): string =>
  flag
    .replace(/^--/, "")
    .replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());

const longFlags = (): string[] =>
  createProgram()
    .options.map((option) => option.long)
    .filter((long): long is string => Boolean(long))
    .map(camel)
    // --config is read from argv before commander parses, because it
    // supplies the defaults commander would otherwise describe in --help.
    .filter((name) => !["version", "help", "config"].includes(name));

/** Options consumed by this package rather than passed to the type checker. */
const LOCAL_ONLY = new Set([
  "outputDir",
  "threshold",
  "reporters",
  "historyFile",
  "compare",
  "respectGitignore",
  "allowEmpty",
  "config"
]);

/** Flags whose resolved key is deliberately named differently. */
const RENAMED: Record<string, string> = {
  project: "tsProjectFile",
  notOnlyInCwd: "notOnlyInCWD"
};

describe("every CLI flag reaches the resolved options", () => {
  it.each(longFlags())("%s is resolved", (flag) => {
    const resolved = resolveOptions({}, {});
    const key = RENAMED[flag] ?? flag;

    expect(Object.keys(resolved)).toContain(key);
  });
});

describe("every resolved option is accounted for", () => {
  // Guards the bug fixed in 2.1.1: the orchestrator forwarded a whitelist, so
  // options added later were parsed, documented and then dropped. Anything
  // resolved must either go to the type checker or be listed as local.
  const CORE_OPTIONS = new Set([
    "tsProjectFile",
    "strict",
    "debug",
    "cache",
    "cacheDirectory",
    "ignoreFiles",
    "ignoreCatch",
    "ignoreUnread",
    "ignoreNested",
    "ignoreAsAssertion",
    "ignoreTypeAssertion",
    "ignoreNonNullAssertion",
    "ignoreObject",
    "ignoreEmptyType",
    "reportSemanticError",
    "reportUnusedIgnore",
    "notOnlyInCWD",
    "files"
  ]);

  it.each(Object.keys(resolveOptions({}, {})) as (keyof ResolvedOptions)[])(
    "%s is either a core option or a local one",
    (key) => {
      expect(CORE_OPTIONS.has(key) || LOCAL_ONLY.has(key)).toBe(true);
    }
  );
});

describe("a flag and a config file behave the same way", () => {
  // The config path used to skip the validation the CLI applied, so
  // "atLeast": "90" was accepted where --threshold "90" was rejected.
  const booleanFlags = (): string[] =>
    createProgram()
      .options.filter(
        (option) => Boolean(option.long) && !option.required && !option.optional
      )
      .map((option) => camel(option.long as string))
      .filter((name) => !["version", "help", "config"].includes(name));

  it.each(booleanFlags())("%s can be set from a config file too", (key) => {
    const viaFlag = resolveOptions({ [key]: true }, {});
    const viaConfig = resolveOptions({}, { [key]: true });
    const changed = Object.keys(viaFlag).filter(
      (k) => viaFlag[k as keyof ResolvedOptions] === true
    );

    expect(changed.length).toBeGreaterThan(0);

    for (const k of changed) {
      expect(viaConfig[k as keyof ResolvedOptions]).toBe(true);
    }
  });
});
