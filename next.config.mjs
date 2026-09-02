/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/venues',
        destination: '/training',
        permanent: false,
      },
      {
        source: '/classes',
        destination: '/training',
        permanent: false,
      },
      {
        source: '/students',
        destination: '/training',
        permanent: false,
      }
    ];
  },
};

export default nextConfig;
