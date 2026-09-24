import fs from "node:fs";
import path from "node:path";
import type { TypeCoverageConfig } from "./options";

/**
 * Load configuration for a run.
 *
 * Requested in #13: "Especially if we start increasing the number of options,
 * a config file will be very useful - especially in CI/CD." That issue is
 * six years old and the option count has roughly tripled since, so the case
 * has only got stronger.
 *
 * The precedence the issue proposed is what is implemented, in resolveOptions:
 * defaults, then config, then CLI flags.
 *
 * Deliberately no new dependency. The issue author noted having "a look at
 * all the read config packages and not really happy with any of those", and
 * for a tool whose whole job is reducing a project's dependency surface,
 * pulling in a config loader to read one file would be a poor trade.
 */
export const CONFIG_FILES = [
  ".typecoveragerc",
  ".typecoveragerc.json",
  "typescript-coverage-report.config.json"
] as const;

const readJSONFile = (file: string): unknown => {
  const contents = fs.readFileSync(file, "utf-8");

  try {
    return JSON.parse(contents);
  } catch (error) {
    // A malformed config is a mistake worth surfacing, not something to
    // silently fall back from: the run would otherwise use defaults and the
    // user would wonder why their settings were ignored.
    throw new Error(
      `${path.basename(file)} is not valid JSON: ${(error as Error).message}`,
      { cause: error }
    );
  }
};

const readPackageJSON = (cwd: string): TypeCoverageConfig => {
  try {
    const parsed = readJSONFile(path.join(cwd, "package.json")) as {
      typeCoverage?: TypeCoverageConfig;
    };

    return parsed.typeCoverage ?? {};
  } catch {
    // No package.json, or one we cannot read, is normal: the CLI must still
    // run in a bare directory.
    return {};
  }
};

/**
 * A dedicated config file wins over the `typeCoverage` block in package.json,
 * which stays supported. Only the first file found is read; they are not
 * merged, so which one applies is never ambiguous.
 */
export const loadConfig = (
  cwd: string = process.cwd(),
  explicitPath?: string
): TypeCoverageConfig => {
  if (explicitPath) {
    const resolved = path.resolve(cwd, explicitPath);

    if (!fs.existsSync(resolved)) {
      throw new Error(`Config file not found: ${explicitPath}`);
    }

    return readJSONFile(resolved) as TypeCoverageConfig;
  }

  for (const name of CONFIG_FILES) {
    const candidate = path.join(cwd, name);

    if (fs.existsSync(candidate)) {
      return readJSONFile(candidate) as TypeCoverageConfig;
    }
  }

  return readPackageJSON(cwd);
};
