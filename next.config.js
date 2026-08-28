/** @type {import('next').NextConfig} */
const path = require("path");
const tsconfig = require("./tsconfig.json");

function resolveAlias(tsPaths) {
  const alias = {};
  for (const [key, values] of Object.entries(tsPaths)) {
    if (Array.isArray(values)) {
      alias[key] = path.resolve(process.cwd(), values[0]);
    }
  }
  return alias;
}

module.exports = {
  images: {
    unoptimized: true,
  },
  eslint: {
    ignoreDuringBuilds: false,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
  webpack: (config) => {
    config.resolve.extensions = [".ts", ".tsx", ".js", ".jsx"];
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      ...resolveAlias(tsconfig.compilerOptions.paths),
    };
    return config;
  },
  productionBrowserSourceMaps: false,
};
