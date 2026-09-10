import { toIsoDate } from './site.mjs';

// Read the built metadata so the sitemap follows the same indexing decision as
// the page, including isActive changes in either MDX or JavaScript articles.
export function sitemapEntryFromHtml(html, loc) {
    const metadata = new Map();
    for (const [tag] of html.matchAll(/<meta\b[^>]*>/g)) {
        const attributes = Object.fromEntries(
            [...tag.matchAll(/\b(name|property|content)="([^"]*)"/g)].map(([, key, value]) => [key, value]),
        );
        const name = attributes.name || attributes.property;
        if (name) metadata.set(name, attributes.content || '');
    }
    for (const name of ['robots', 'googlebot']) {
        if (/\b(noindex|none)\b/i.test(metadata.get(name) || '')) return null;
    }
    // Assets and other non-page responses do not belong in this sitemap.
    if (!/<html\b/.test(html)) return null;
    const lastmod = toIsoDate(metadata.get('article:modified_time'))
        || toIsoDate(metadata.get('article:published_time'));
    return { loc, ...(lastmod ? { lastmod } : {}) };
}
