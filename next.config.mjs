import createMDX from '@next/mdx';
import { fileURLToPath } from 'node:url';

/** @type {import('next').NextConfig} */
const nextConfig = {
    pageExtensions: ['js', 'jsx', 'md', 'mdx', 'ts', 'tsx'],
    async headers() {
        // Start resource restrictions in report-only mode: violations appear in
        // browser diagnostics while maps, authentication, and embeds keep working.
        const reportOnlyPolicy = [
            "default-src 'self'",
            "base-uri 'self'",
            "object-src 'none'",
            "script-src 'self' 'unsafe-inline' https://strava-embeds.com https://maps.googleapis.com https://maps.gstatic.com https://apis.google.com https://www.googletagmanager.com https://va.vercel-scripts.com https://vercel.live",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com",
            "img-src 'self' data: blob: https://firebasestorage.googleapis.com https://images.unsplash.com https://img.youtube.com https://*.googleusercontent.com https://*.gstatic.com https://*.googleapis.com https://*.mapbox.com",
            "font-src 'self' https://fonts.gstatic.com",
            "connect-src 'self' https://*.googleapis.com https://*.firebaseio.com wss://*.firebaseio.com https://*.mapbox.com https://*.google-analytics.com https://*.analytics.google.com https://vitals.vercel-insights.com https://vercel.live wss://*.pusher.com",
            "frame-src 'self' https://www.google.com https://maps.google.com https://www.youtube.com https://www.youtube-nocookie.com https://strava-embeds.com https://www.strava.com https://www.alltrails.com https://ridewithgps.com https://bikekatytrail.com https://open.spotify.com https://*.firebaseapp.com https://vercel.live",
            "media-src 'self' blob: https://firebasestorage.googleapis.com",
            "worker-src 'self' blob:",
            "form-action 'self'",
        ].join('; ');
        return [{ source: '/:path*', headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Content-Security-Policy', value: "frame-ancestors 'self'; object-src 'none'; base-uri 'self'" },
            { key: 'Content-Security-Policy-Report-Only', value: reportOnlyPolicy },
        ] }];
    },
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
    // Metadata helpers read these source files at runtime instead of importing them.
    outputFileTracingIncludes: {
        '/*': ['./app/blog/articles/**/page.{js,mdx}', './app/writing/**/page.mdx'],
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
        remarkPlugins: [
            'remark-gfm',
            fileURLToPath(new URL('./lib/mdx/remark-article-images.mjs', import.meta.url)),
            fileURLToPath(new URL('./lib/mdx/remark-media-defaults.mjs', import.meta.url)),
        ],
        rehypePlugins: [],
    },
})

// Merge MDX config with Next.js config
export default withMDX(nextConfig)
