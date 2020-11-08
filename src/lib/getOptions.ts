import { Option } from "commander";
import { ProgramOptions } from "./";

type CommandOption = Option & {
  defaultValue?: string;
};

const ignoredOptions = ["version"];

const getOptionName = (option: CommandOption): string =>
  option.long.replace("--", "");

const getOptions = (program: any) => {
  return (program.options as CommandOption[])
    .filter((option) => !ignoredOptions.includes(getOptionName(option)))
    .reduce((carry, option) => {
      return {
        ...carry,
        [getOptionName(option)]:
          program[getOptionName(option)] || option.defaultValue
      };
    }, {}) as ProgramOptions;
};

export default getOptions;
