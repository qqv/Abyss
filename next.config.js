/** @type {import('next').NextConfig} */
const nextConfig = {
  i18n: {
    locales: ["zh-CN", "en"],
    defaultLocale: "zh-CN",
  },
  webpack: (config, { isServer }) => {
    // 只在客户端构建中应用这些替换
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        net: false,
        tls: false,
        fs: false,
        http: false,
        https: false,
        'socks-proxy-agent': false,
        'https-proxy-agent': false
      };
    }
    return config;
  },
  reactStrictMode: true,
  // 移除静态导出配置，启用动态 API 路由
  // output: 'export',
  distDir: 'out',
  images: {
    unoptimized: true,
    domains: [
      "source.unsplash.com",
      "images.unsplash.com",
      "ext.same-assets.com",
      "ugc.same-assets.com",
    ],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "source.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ext.same-assets.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "ugc.same-assets.com",
        pathname: "/**",
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
