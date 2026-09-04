const path = require('path');

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@crm-credito/database'],
  reactStrictMode: true,
  outputFileTracingRoot: path.join(__dirname, '../..'),
  experimental: {
    serverComponentsExternalPackages: ['@prisma/client', 'bcryptjs'],
  },
};

module.exports = nextConfig;
