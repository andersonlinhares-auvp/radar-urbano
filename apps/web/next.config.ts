import type { NextConfig } from 'next';
const config: NextConfig = {
  transpilePackages: ['@radar-urbano/core', '@radar-urbano/db'],
  serverExternalPackages: ['@napi-rs/canvas'],
  webpack: (webpackConfig) => {
    // Resolve .js imports to .ts files in workspace packages
    webpackConfig.resolve = {
      ...webpackConfig.resolve,
      extensionAlias: {
        '.js': ['.ts', '.tsx', '.js'],
        '.jsx': ['.tsx', '.jsx'],
      },
    };
    return webpackConfig;
  },
};
export default config;
