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

const SITE_URL = 'https://www.nashbrowns.com';
const SITE_NAME = 'Nash Browns';

export function generateJsonLd({
    title = 'Nash Browns',
    description = 'This is a blog artical written by Nash Bostwick. It contains information on places that he has been, projects that he is working on, and other information that he finds intresting',
    author = 'Nash Bostwick',
    published = '2023-01-01',
    updated,
    thumbnail,
    thumbnailIllustration,
    keywords = [],
    url,
} = {}) {

    // Prefer a real photo for the structured-data image, fall back to the illustration.
    const image = thumbnail || thumbnailIllustration;

    // schema.org expects ISO 8601 datetimes with a timezone. Our postMetadata stores
    // date-only strings ("2026-05-28"), so normalize them to e.g. "2026-05-28T00:00:00.000Z".
    // Falls back to the original string if it isn't a parseable date.
    const toIso = (date) => {
        if (!date) return undefined;
        const parsed = new Date(date);
        return isNaN(parsed) ? date : parsed.toISOString();
    };

    const datePublished = toIso(published);
    const dateModified = toIso(updated) || datePublished;

    // Resolve a relative route ("/blog/articles/...") to an absolute URL when one is provided.
    const absoluteUrl = url
        ? (url.startsWith('http') ? url : `${SITE_URL}${url}`)
        : undefined;

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
                url: `${SITE_URL}/hippy-hokusai-logo.png`,
            },
        },
    };

    // Only include optional fields when we actually have data for them, so the
    // emitted JSON-LD stays clean and valid.
    if (image) jsonLd.image = image;
    if (keywords && keywords.length) jsonLd.keywords = keywords.join(', ');
    if (absoluteUrl) {
        jsonLd.url = absoluteUrl;
        jsonLd.mainEntityOfPage = {
            '@type': 'WebPage',
            '@id': absoluteUrl,
        };
    }

    return jsonLd;
}
