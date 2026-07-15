import createMDX from '@next/mdx';
import remarkGfm from 'remark-gfm';

/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
    images: {
        formats: ['image/avif', 'image/webp'],
        minimumCacheTTL: 2678400, // 31 days — floor for optimized-image caching when the source sends short/no cache headers
        // domains: ['images.unsplash.com'],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "firebasestorage.googleapis.com",
                pathname: "/v0/b/**",
            },
            {
                protocol: "https",
                hostname: "images.unsplash.com",
                // pathname: "/v0/b/**",
            },
            {
                protocol: "https",
                hostname: "img.youtube.com",
                // pathname: "/v0/b/**",
            },
        ],
    },
    async redirects() {
        return [
            {
                source: '/blog/articals/:slug*',
                destination: '/blog/articles/:slug*',
                permanent: true, // 308 redirect
            },
        ];
    },
    // experimental: {
    //     outputFileTracingIncludes: {
    //         '/mtn-bike-kc': ['./public/**/*'],
    //     },
    // },
};

const withMDX = createMDX({
    // Add markdown plugins here, as desired
    options: {
        remarkPlugins: [remarkGfm],
        rehypePlugins: [],
    },
})

// Merge MDX config with Next.js config
export default withMDX(nextConfig)

