import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
import { generateMetadata } from '../lib/seo/metadata.js';
import { generateJsonLd } from '../lib/seo/json-ld.js';
import { sitemapEntryFromHtml } from '../lib/seo/sitemap.mjs';
import { SITE_URL } from '../lib/seo/site.mjs';

const absolute = path => new URL(path, SITE_URL).href;
const decode = text => text.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#x27;', "'").replaceAll('&lt;', '<').replaceAll('&gt;', '>');
function tags(html, tag) {
    return [...html.matchAll(new RegExp(`<${tag}\\b[^>]*>`, 'g'))].map(([markup]) =>
        Object.fromEntries([...markup.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, key, value]) => [key, decode(value)])),
    );
}
function meta(html, name) {
    return tags(html, 'meta').filter(tag => tag.name === name || tag.property === name).map(tag => tag.content);
}
async function builtHtml(route) {
    return readFile(new URL(`../.next/server/app/${route === '/' ? 'index' : route.slice(1)}.html`, import.meta.url), 'utf8');
}
async function posts() {
    const result = [];
    for (const root of ['blog/articles', 'writing']) {
        const folder = new URL(`../app/${root}/`, import.meta.url);
        for (const entry of await readdir(folder, { withFileTypes: true })) {
            if (!entry.isDirectory()) continue;
            const directory = new URL(`${entry.name}/`, folder);
            const file = (await readdir(directory)).find(name => /^page\.(mdx|js)$/.test(name));
            if (!file) continue;
            const source = await readFile(new URL(file, directory), 'utf8');
            const match = source.match(/export const postMetadata = (\{[\s\S]*?\n\});/);
            assert.ok(match, `${root}/${entry.name} has a literal postMetadata export`);
            result.push({ route: `/${root}/${entry.name}`, post: runInNewContext(`(${match[1]})`, {}, { timeout: 100 }) });
        }
    }
    return result;
}

test('article fields use the supplied author, publication date and modification date', () => {
    const metadata = generateMetadata({ title: 'Example', author: 'Example Author', published: '2026-05-01', updated: '2026-06-02' });
    assert.equal(metadata.openGraph.type, 'article');
    assert.equal(metadata.openGraph.publishedTime, '2026-05-01T00:00:00.000Z');
    assert.equal(metadata.openGraph.modifiedTime, '2026-06-02T00:00:00.000Z');
    assert.deepEqual(metadata.openGraph.authors, ['Example Author']);
    assert.deepEqual(metadata.authors, [{ name: 'Example Author' }]);
    assert.equal(generateMetadata({ publishedTime: '2025-01-01' }).openGraph.publishedTime, '2025-01-01T00:00:00.000Z');
});

test('ordinary pages are websites without invented article dates, and explicit website types are respected', () => {
    for (const input of [{}, { title: 'Art', type: 'website', published: '2026-01-01' }]) {
        const metadata = generateMetadata(input);
        assert.equal(metadata.openGraph.type, 'website');
        assert.equal(metadata.openGraph.publishedTime, undefined);
        assert.equal(metadata.openGraph.modifiedTime, undefined);
    }
    assert.equal(generateMetadata({ type: 'article' }).openGraph.publishedTime, undefined);
    assert.equal(generateMetadata({ published: 'invalid' }).openGraph.publishedTime, undefined);
    assert.equal(generateMetadata({ published: '2026-02-01', updated: '2026-01-01' }).openGraph.modifiedTime, '2026-02-01T00:00:00.000Z');
});

test('social images prefer the chosen illustration, fall back to the photo, then the logo', () => {
    for (const [input, expected] of [
        [{ thumbnailIllustration: '/art.jpg', thumbnail: '/photo.jpg' }, '/art.jpg'],
        [{ thumbnail: '/photo.jpg' }, '/photo.jpg'],
        [{ thumbnailIllustration: '', thumbnail: 'https://images.example.test/photo.jpg' }, 'https://images.example.test/photo.jpg'],
        [{}, '/hippy-hokusai-logo.png'],
    ]) {
        const metadata = generateMetadata({ title: 'Preview', description: 'Description', ...input });
        assert.equal(metadata.openGraph.images[0].url, absolute(expected));
        assert.equal(metadata.twitter.images[0].url, absolute(expected));
        assert.equal(metadata.twitter.title, 'Preview');
        assert.equal(metadata.twitter.description, 'Description');
        assert.equal(metadata.twitter.card, 'summary_large_image');
    }
});

test('indexing honors inactive posts and explicit account-page overrides', () => {
    for (const input of [{ isActive: false }, { index: false }, { isActive: true, index: false }]) {
        const metadata = generateMetadata(input);
        assert.equal(metadata.robots.index, false);
        assert.equal(metadata.robots.googleBot.index, false);
        assert.equal(metadata.robots.follow, true);
    }
    assert.equal(generateMetadata({ isActive: true }).robots.index, true);
    assert.equal(generateMetadata().alternates.canonical, './');
    assert.equal(generateMetadata({ url: '/example' }).openGraph.url, '/example');
});

test('JSON-LD shares real dates and resolves local photo and page URLs', () => {
    const input = { published: '2026-04-01', updated: '2026-05-02', thumbnail: '/photo.jpg', thumbnailIllustration: '/art.jpg', url: '/blog/articles/example' };
    const schema = generateJsonLd(input);
    const metadata = generateMetadata(input);
    assert.equal(schema.datePublished, metadata.openGraph.publishedTime);
    assert.equal(schema.dateModified, metadata.openGraph.modifiedTime);
    assert.equal(schema.image, absolute('/photo.jpg'));
    assert.equal(schema.mainEntityOfPage['@id'], absolute(input.url));
    assert.equal(schema.url, absolute(input.url));
    assert.equal(generateJsonLd().datePublished, undefined);
});

test('sitemap follows rendered indexing tags and dates, without claiming every page changed at build time', () => {
    for (const name of ['robots', 'googlebot']) {
        assert.equal(sitemapEntryFromHtml(`<html><meta content="noindex, follow" name="${name}"></html>`, '/draft'), null);
    }
    assert.equal(sitemapEntryFromHtml('not HTML', '/icon.png'), null);
    assert.deepEqual(sitemapEntryFromHtml('<html><meta name="robots" content="index, follow"></html>', '/'), { loc: '/' });
    assert.deepEqual(sitemapEntryFromHtml('<html><meta property="article:modified_time" content="2026-07-02T00:00:00.000Z"></html>', '/article'), { loc: '/article', lastmod: '2026-07-02T00:00:00.000Z' });
});

test('every built blog post and story has its own canonical URL, real dates, correct image and indexing tags', async () => {
    const articles = await posts();
    assert.ok(articles.length >= 48);
    for (const { route, post } of articles) {
        const html = await builtHtml(route);
        assert.deepEqual(tags(html, 'link').filter(tag => tag.rel === 'canonical').map(tag => tag.href), [absolute(route)], route);
        assert.deepEqual(meta(html, 'og:url'), [absolute(route)], route);
        assert.deepEqual(meta(html, 'article:published_time'), [new Date(post.published).toISOString()], route);
        const modified = new Date(post.updated) < new Date(post.published) ? post.published : post.updated || post.published;
        assert.deepEqual(meta(html, 'article:modified_time'), [new Date(modified).toISOString()], route);
        assert.deepEqual(meta(html, 'og:type'), ['article'], route);
        assert.deepEqual(meta(html, 'og:image'), [absolute(post.thumbnailIllustration || post.thumbnail || '/hippy-hokusai-logo.png')], route);
        assert.deepEqual(meta(html, 'twitter:image'), meta(html, 'og:image'), route);
        for (const name of ['robots', 'googlebot']) {
            assert.equal(meta(html, name).length, 1, route);
            assert.equal(/\bnoindex\b/.test(meta(html, name)[0]), post.isActive === false, route);
        }
        assert.equal(meta(html, 'viewport').length, 1, route);
        if (route.startsWith('/blog/articles/')) {
            const schemas = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map(([, json]) => JSON.parse(json));
            assert.equal(schemas.length, 1, route);
            assert.equal(schemas[0].datePublished, meta(html, 'article:published_time')[0], route);
            assert.equal(schemas[0].dateModified, meta(html, 'article:modified_time')[0], route);
            assert.equal(schemas[0].url, absolute(route), route);
            assert.equal(schemas[0].image, absolute(post.thumbnail || post.thumbnailIllustration), route);
        }
    }
});

test('ordinary built pages have correct titles, website previews, one viewport and their own canonicals', async () => {
    for (const [route, title, index] of [
        ['/', 'Nash Browns', true], ['/blog', 'Blog', true], ['/writing', 'Writing', true],
        ['/art', 'Art', true], ['/projects', 'Projects', true], ['/partners', 'Partners', true],
        ['/signup', 'Sign Up', false], ['/blog/projects', 'Projects', false],
    ]) {
        const html = await builtHtml(route);
        assert.match(html, new RegExp(`<title>${title}</title>`), route);
        assert.deepEqual(meta(html, 'og:type'), ['website'], route);
        assert.deepEqual(meta(html, 'article:published_time'), [], route);
        assert.equal(meta(html, 'viewport').length, 1, route);
        assert.equal(/\bnoindex\b/.test(meta(html, 'robots')[0]), !index, route);
        assert.equal(new URL(tags(html, 'link').find(tag => tag.rel === 'canonical').href).href, absolute(route), route);
    }
});

test('generated sitemap lists active articles, omits drafts/accounts/assets and preserves real update dates', async () => {
    const xml = await readFile(new URL('../public/sitemap-0.xml', import.meta.url), 'utf8');
    const entries = new Map([...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(([, entry]) => [decode(entry.match(/<loc>(.*?)<\/loc>/)[1]), entry]));
    for (const { route, post } of await posts()) {
        const entry = entries.get(absolute(route));
        assert.equal(!!entry, post.isActive, route);
        if (post.isActive) assert.match(entry, new RegExp(`<lastmod>${new Date(post.updated || post.published).toISOString()}</lastmod>`), route);
    }
    for (const path of ['/signup', '/forgot-password', '/partners/dashboard', '/partners/users', '/blog/projects', '/apple-icon.png', '/icon.png']) {
        assert.equal(entries.has(absolute(path)), false, path);
    }
    for (const path of ['/blog', '/writing', '/art', '/projects', '/partners']) {
        assert.ok(entries.has(absolute(path)), path);
        assert.doesNotMatch(entries.get(absolute(path)), /<lastmod>/, path);
    }
    const robots = await readFile(new URL('../public/robots.txt', import.meta.url), 'utf8');
    assert.match(robots, /Allow: \//);
    assert.ok(robots.includes(`${SITE_URL}/sitemap.xml`));
    assert.doesNotMatch(robots, /Disallow: \/(blog|writing)/);
});
