module.exports = {
  prefix: "v",
  ignoreIssuesWith: ["duplicate", "wontfix", "invalid", "help wanted"],
  template: {
    issue: "- [{{text}}]({{url}}) {{name}}"
  },
  dataSource: "milestones",
  milestoneMatch: "v{{tag_name}}",
  groupBy: {
    "Enhancements:": ["enhancement"],
    "Bug Fixes:": ["bug"]
  }
};
