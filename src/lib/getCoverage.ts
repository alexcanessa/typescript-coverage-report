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

const getCoverage = async (
  options?: Pick<LintOptions, "strict" | "debug">
): Promise<CoverageData> => {
  const { anys, fileCounts, totalCount, correctCount } = await lint(".", {
    ...options,
    fileCounts: true
  });

  return {
    fileCounts,
    anys,
    percentage: (correctCount * 100) / totalCount,
    total: totalCount,
    covered: correctCount,
    uncovered: totalCount - correctCount
  };
};

export default getCoverage;
