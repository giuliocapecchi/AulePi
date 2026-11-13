/** @type {import('next').NextConfig} */
const nextConfig = {
    experimental: {
        optimizePackageImports: ['mapbox-gl', '@radix-ui/react-accordion', '@radix-ui/react-hover-card', 'lucide-react'],
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
