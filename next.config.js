/** @type {import('next').NextConfig} */
module.exports = {
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
};
