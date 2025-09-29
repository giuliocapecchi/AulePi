/** @type {import('next').NextConfig} */
const nextConfig = {
    // dev server optimizations
    experimental: {
        optimizePackageImports: ['mapbox-gl', '@radix-ui/react-accordion', '@radix-ui/react-hover-card', 'lucide-react'],
        turbo: {
            rules: {
                '*.svg': {
                    loaders: ['@svgr/webpack'],
                    as: '*.js',
                },
            },
        },
    },
    
    // webpack config to optimize bundle size
    webpack: (config, { dev, isServer }) => {
        if (dev && !isServer) {
            config.optimization = {
                ...config.optimization,
                splitChunks: {
                    chunks: 'all',
                    cacheGroups: {
                        mapbox: {
                            test: /[\\/]node_modules[\\/](mapbox-gl)[\\/]/,
                            name: 'mapbox-gl',
                            chunks: 'all',
                            priority: 10,
                        },
                        radix: {
                            test: /[\\/]node_modules[\\/](@radix-ui)[\\/]/,
                            name: 'radix-ui',
                            chunks: 'all',
                            priority: 9,
                        },
                    },
                },
            };
        }
        return config;
    },
    
    // transpile specific packages
    transpilePackages: ['mapbox-gl'],

    // image optimizations
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
};

export default nextConfig;
