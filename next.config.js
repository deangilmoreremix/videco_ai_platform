/** @type {import('next').NextConfig} */
const withTM = require("next-transpile-modules")([]);

module.exports = withTM({
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  webpack: (config) => {
    config.module.rules.push({
      test: /\.tsx?$\.svg$/,
      use: ["@svgr/webpack", "ts-loader"],
      exclude: /node_modules/,
    });
    return config;
  },
});
