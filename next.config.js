/** @type {import('next').NextConfig} */
const withTM = require("next-transpile-modules")([]);

const withPlugins = require("next-compose-plugins");

module.exports = withTM(
    withPlugins(
        [],
        {
            eslint: {
                ignoreDuringBuilds: true,
            },
            images: {
                unoptimized: true,
            },
        },
        { silent: true },
        {
            resolve: {
                extensions: [".ts", ".js"],
            },
        },
        { hideSourcemaps: true },
        {
            rules: [
                {
                    test: /\.tsx?$\.svg$/,
                    use: ["@svgr/webpack", "ts-loader"],
                    exclude: /node_modules/,
                },
            ],
        },
    ),
);
