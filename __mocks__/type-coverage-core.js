"use strict";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const lint = (project, options) => {
  return {
    anys: [],
    fileCounts: new Map([
      ["index.html", { totalCount: 100, correctCount: 100 }]
    ]),
    totalCount: 100,
    correctCount: 100
  };
};

module.exports = {
  lint
};
