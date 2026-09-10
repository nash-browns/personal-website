/*
 * JSON-LD Structured Data (schema.org)
 *
 * This is separate from generateMetadata() in ./index.js:
 *   - generateMetadata() -> Next.js Metadata object -> rendered as <meta> tags in <head>
 *   - generateJsonLd()   -> a schema.org object that must be rendered yourself inside a
 *                           <script type="application/ld+json"> tag (Next.js has no
 *                           auto-convention for JSON-LD).
 *
 * Render the returned object with the <JsonLd /> component (see components/blog) e.g.
 *   <JsonLd schema={generateJsonLd({ ...postMetadata, url: '/blog/articles/alcan-spring' })} />
 *
 * Docs:
 *   schema.org BlogPosting -> https://schema.org/BlogPosting
 *   Next.js JSON-LD        -> https://nextjs.org/docs/app/building-your-application/optimizing/metadata#json-ld
 *   Google Article schema  -> https://developers.google.com/search/docs/appearance/structured-data/article
 */

import { SITE_URL, SITE_NAME, DEFAULT_DESCRIPTION, DEFAULT_IMAGE, absoluteUrl, articleDates } from './site.mjs';

export function generateJsonLd({
    title = 'Nash Browns',
    description = DEFAULT_DESCRIPTION,
    author = 'Nash Bostwick',
    published,
    publishedTime,
    updated,
    thumbnail,
    thumbnailIllustration,
    keywords = [],
    url,
} = {}) {

    // Prefer a real photo for the structured-data image, fall back to the illustration.
    const image = thumbnail || thumbnailIllustration;

    const { datePublished, dateModified } = articleDates({ published, publishedTime, updated });
    const pageUrl = absoluteUrl(url);

    const jsonLd = {
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        headline: title,
        description,
        datePublished,
        dateModified,
        author: {
            '@type': 'Person',
            name: author,
            url: SITE_URL,
        },
        publisher: {
            '@type': 'Organization',
            name: SITE_NAME,
            logo: {
                '@type': 'ImageObject',
                url: absoluteUrl(DEFAULT_IMAGE),
            },
        },
    };

    // Only include optional fields when we actually have data for them, so the
    // emitted JSON-LD stays clean and valid.
    if (image) jsonLd.image = absoluteUrl(image);
    if (keywords && keywords.length) jsonLd.keywords = keywords.join(', ');
    if (pageUrl) {
        jsonLd.url = pageUrl;
        jsonLd.mainEntityOfPage = {
            '@type': 'WebPage',
            '@id': pageUrl,
        };
    }

    return jsonLd;
}
