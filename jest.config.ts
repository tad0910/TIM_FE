import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest/presets/js-with-ts-esm",
  testEnvironment: "jsdom",
  testMatch: [
    "<rootDir>/src/**/*.test.ts?(x)",
    "<rootDir>/src/**/*.spec.ts?(x)",
  ],
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  extensionsToTreatAsEsm: [".ts", ".tsx"],
  moduleNameMapper: {
    "^.+\\.(css|scss|sass|less)$": "identity-obj-proxy",
    "^(\\.{1,2}/.*)\\.js$": "$1",
  },
  transform: {
    "^.+\\.(ts|tsx)$": [
      "ts-jest",
      {
        useESM: true,
        tsconfig: "tsconfig.jest.json",
        diagnostics: {
          ignoreCodes: [151002],
        },
      },
    ],
  },
  testEnvironmentOptions: {
    customExportConditions: ["node", "node-addons"],
  },
};

export default config;
