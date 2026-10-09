import { SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_IMAGE, absoluteUrl, articleDates } from './site.mjs';

export function generateMetadata({
    title = SITE_NAME,
    description = DEFAULT_DESCRIPTION,
    keywords = ['Nash Bostwick', 'blog', SITE_NAME],
    thumbnail,
    thumbnailIllustration,
    published,
    publishedTime,
    updated,
    author = 'Nash Bostwick',
    type = published || publishedTime ? 'article' : 'website',
    // Next.js resolves ./ against the current route, including statically built MDX.
    url = './',
    isActive,
    index = true,
} = {}) {
    // Inactive posts must stay out of search even if indexing is explicitly enabled.
    const shouldIndex = isActive !== false && index;
    const image = absoluteUrl(thumbnailIllustration || thumbnail || DEFAULT_IMAGE);
    const { datePublished, dateModified } = articleDates({ published, publishedTime, updated });

    return {
        title,
        description,
        keywords,
        alternates: { canonical: url },
        openGraph: {
            title,
            description,
            url,
            type,
            ...(type === 'article' ? {
                publishedTime: datePublished,
                modifiedTime: dateModified,
                authors: [author],
            } : {}),
            siteName: SITE_NAME,
            images: [{ url: image, alt: title }],
        },
        twitter: {
            card: 'summary_large_image',
            title,
            description,
            images: [{ url: image, alt: title }],
        },
        generator: 'Next.js',
        applicationName: 'NashBrowns',
        referrer: 'origin-when-cross-origin',
        authors: [{ name: author }],
        creator: author,
        publisher: 'Nash Bostwick',
        formatDetection: { email: false, address: false, telephone: false },
        robots: {
            index: shouldIndex,
            follow: true,
            googleBot: {
                index: shouldIndex,
                follow: true,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
    };
}
