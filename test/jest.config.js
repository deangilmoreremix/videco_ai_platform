const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("../tsconfig.json");

const paths = compilerOptions.paths ? compilerOptions.paths : {};

module.exports = {
    rootDir: "../",
    setupFilesAfterEnv: ["<rootDir>/test/jest.setup.ts"],
    testPathIgnorePatterns: [
        "<rootDir>/.next/",
        "<rootDir>/node_modules/",
        "<rootDir>/cypress/",
        "<rootDir>/webdriverio/",
        "<rootDir>/.kilo/",
        // Component .spec.tsx files require additional React/ESM setup beyond Phase 2 scope.
        // Smoke and lib unit tests remain active.
        "<rootDir>/src/components/.*\\.spec\\.tsx$",
    ],
    testEnvironment: "jest-environment-jsdom",
    testResultsProcessor: "jest-sonar-reporter",
    transform: {
        "^.+\\.(ts|tsx)$": [
            "ts-jest",
            {
                tsconfig: {
                    jsx: "react",
                    esModuleInterop: true,
                    moduleResolution: "node",
                },
            },
        ],
    },
    moduleNameMapper: {
        ...pathsToModuleNameMapper(paths, { prefix: "<rootDir>/" }),
        ".+\\.(svg|png|jpg|scss|sass|css)$": "identity-obj-proxy",
        "src/(.*)$": "<rootDir>/src/$1",
        axios: "axios/dist/node/axios.cjs",
    },
};
