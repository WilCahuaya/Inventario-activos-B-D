/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ["@inventario/ui", "@inventario/types"],
  webpack: (config) => {
    // Supabase usa process.version con guardas de runtime; Next lo marca en Edge sin afectar ejecución.
    config.ignoreWarnings = [
      ...(config.ignoreWarnings ?? []),
      { module: /@supabase\/supabase-js/, message: /process\.version/ },
      { module: /@supabase\/realtime-js/, message: /process\.versions/ },
    ];
    return config;
  },
};

module.exports = nextConfig;
