/*
 * For a detailed explanation regarding each configuration property, visit:
 * https://jestjs.io/docs/configuration
 */

module.exports = {
  // Automatically clear mock calls, instances, contexts and results before every test
  clearMocks: true,

  // Indicates whether the coverage information should be collected while executing the test
  collectCoverage: false,

  // The directory where Jest should output its coverage files
  coverageDirectory: "tests\\coverage",

  // Indicates which provider should be used to instrument code for coverage
  coverageProvider: "v8",

  // A path to a module which exports an async function that is triggered once before all test suites
  globalSetup: "./tests/JestSetup-GUI.js",

  // A path to a module which exports an async function that is triggered once after all test suites
  globalTeardown: "./tests/JestTeardown.js",

  testMatch: [
    "**/?(*.)+(guispec|guitest).[tj]s?(x)"
  ],


  // A list of paths to directories that Jest should use to search for files in
  roots: [
    "<rootDir>\\tests"
  ],
};
