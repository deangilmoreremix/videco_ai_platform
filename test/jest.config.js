const { pathsToModuleNameMapper } = require("ts-jest");
const { compilerOptions } = require("../tsconfig.json");

const paths = compilerOptions.paths ? compilerOptions.paths : {};

/** @type {import('jest').Config} */
module.exports = {
    rootDir: "../",
    preset: "ts-jest",
    testEnvironment: "jest-environment-jsdom",
    setupFilesAfterEnv: ["<rootDir>/test/jest.setup.ts"],
    testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
    transform: {
        "^.+\\.(ts|tsx|js|jsx|mjs)$": [
            "ts-jest",
            {
                tsconfig: {
                    jsx: "react-jsx",
                    isolatedModules: false,
                    allowJs: true,
                },
                isolatedModules: true,
            },
        ],
    },
    moduleNameMapper: {
        ...pathsToModuleNameMapper(paths, { prefix: "<rootDir>/" }),
        ".+\\.(svg|png|jpg|scss|sass|css)$": "identity-obj-proxy",
        "^src/(.*)$": "<rootDir>/src/$1",
        axios: "axios/dist/node/axios.cjs",
        // jsdom resolves the ESM browser build; use the CJS one.
        "^jose$": "<rootDir>/node_modules/jose/dist/node/cjs/index.js",
    },
};
