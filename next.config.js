/** @type {import('next').NextConfig} */
const withTM = require("next-transpile-modules")([]);

const withPlugins = require("next-compose-plugins");

module.exports = withPlugins(
    [
        [withTM, []],
    ],
    {
        images: {
            unoptimized: true,
        },
        webpack: (config) => {
            config.resolve.extensions = [".ts", ".js"];
            config.module.rules.push({
                test: /\.tsx?$\.svg$/,
                use: ["@svgr/webpack", "ts-loader"],
                exclude: /node_modules/,
            });
            return config;
        },
        productionBrowserSourceMaps: false,
    },
    { silent: true }
);
