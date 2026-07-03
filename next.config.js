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
        eslint: {
            ignoreDuringBuilds: true,
        },
        webpack: (config) => {
            config.resolve.extensions = [".ts", ".tsx", ".js", ".jsx"];
            return config;
        },
        productionBrowserSourceMaps: false,
    },
    { silent: true }
);
