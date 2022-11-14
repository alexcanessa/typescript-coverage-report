import {
  lint,
  AnyInfo,
  FileTypeCheckResult,
  LintOptions
} from "type-coverage-core";

type FileCount = Map<
  string,
  Pick<FileTypeCheckResult, "correctCount" | "totalCount">
>;

export type CoverageData = {
  fileCounts: FileCount;
  anys: AnyInfo[];
  percentage: number;
  total: number;
  covered: number;
  uncovered: number;
};

export type Options = Partial<
  Pick<
    LintOptions,
    "strict" | "debug" | "ignoreFiles" | "ignoreCatch" | "files"
  > & {
    cache: LintOptions["enableCache"];
    ignoreUnread: LintOptions["ignoreUnreadAnys"];
    tsProjectFile: string;
  }
>;

const getCoverage = async (options?: Options): Promise<CoverageData> => {
  const {
    tsProjectFile = ".",
    strict,
    debug,
    ignoreFiles,
    ignoreCatch,
    cache: enableCache,
    ignoreUnread: ignoreUnreadAnys,
    files
  } = options || {};

  const { anys, fileCounts, totalCount, correctCount } = await lint(
    tsProjectFile,
    {
      strict,
      debug,
      ignoreFiles,
      ignoreCatch,
      enableCache,
      ignoreUnreadAnys,
      fileCounts: true,
      files
    }
  );
  const percentage = totalCount === 0 ? 100 : (correctCount * 100) / totalCount;

  return {
    fileCounts,
    anys,
    percentage,
    total: totalCount,
    covered: correctCount,
    uncovered: totalCount - correctCount
  };
};

export default getCoverage;
