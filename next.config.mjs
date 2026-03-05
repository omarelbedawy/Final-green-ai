/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@opentelemetry/instrumentation', 'genkit', '@genkit-ai/core'],
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
