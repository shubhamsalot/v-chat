/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false, // Prevents duplicate double-mount WebRTC renegotiation in dev
  images: {
    domains: ["lh3.googleusercontent.com"],
  },
};

export default nextConfig;
