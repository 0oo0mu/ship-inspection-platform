/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Supabase Storage 이미지 허용
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
