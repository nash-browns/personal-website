import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { test } from 'node:test';
import { compile, run, createProcessor } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkArticleImages, { collectArticleImages } from '../lib/mdx/remark-article-images.mjs';
import { dimensionsFromMetadata, readImageDimensions, validateSource, manifestPath } from '../lib/mdx/image-dimensions.mjs';

async function renderFixture(source, getDimensions) {
    const compiled = await compile(source, { outputFormat: 'function-body', remarkPlugins: [[remarkArticleImages, { getDimensions }]] });
    const article = await run(compiled, runtime);
    const rendered = [];
    const capture = name => props => { rendered.push({ name, ...props }); return null; };
    renderToStaticMarkup(article.default({ components: Object.fromEntries(['CenteredImage', 'TwoCenteredImages', 'ThreeCenteredImages', 'PhotoCarousel', 'ImageFeature'].map(name => [name, capture(name)])) }));
    return { article, rendered };
}

test('local and remote strings get intrinsic dimensions while display width and hero URLs are preserved', async () => {
    const remote = 'https://firebasestorage.googleapis.com/v0/b/example/o/photo.jpg?alt=media';
    const { article, rendered } = await renderFixture(`export const local = '/photo.JPEG';
export const remote = ${JSON.stringify(remote)};

<ImageFeature image={remote} threeSixty />
<CenteredImage image={local} width={800} />
<TwoCenteredImages image={[local, remote]} width={400} />`, async src => src === remote ? { width: 1600, height: 900 } : { width: 600, height: 1200 });
    assert.equal(article.local, '/photo.JPEG');
    assert.equal(article.remote, remote);
    assert.equal(rendered[0].image, remote);
    assert.deepEqual(rendered[1].image, { src: '/photo.JPEG', width: 600, height: 1200 });
    assert.equal(rendered[1].width, 800);
    assert.deepEqual(rendered[2].image[1], { src: remote, width: 1600, height: 900 });
});

test('inline images and gallery entries receive dimensions without changing captions', async () => {
    const { rendered } = await renderFixture(`<CenteredImage image="/photo.png" />
<PhotoCarousel photoUrls={[{photoUrl: '/photo.gif', title: 'Camp', show: true}]} />`, async () => ({ width: 120, height: 240 }));
    assert.deepEqual(rendered[0].image, { src: '/photo.png', width: 120, height: 240 });
    assert.deepEqual(rendered[1].photoUrls[0], { photoUrl: { src: '/photo.gif', width: 120, height: 240 }, title: 'Camp', show: true });
});

test('dynamic expressions and circular declarations fail clearly without executing article code', async () => {
    for (const source of ["<CenteredImage image={fetch('/private')} />", "export const a = b;\nexport const b = a;\n\n<CenteredImage image={a} />"]) {
        await assert.rejects(compile(source, { remarkPlugins: [remarkArticleImages] }), /literal local path or HTTPS URL/);
    }
});

test('dimension failures identify the image instead of inventing square dimensions', async () => {
    await assert.rejects(renderFixture('<CenteredImage image="/missing.jpg" />', async src => { throw new Error(`Missing ${src}`); }), /Missing \/missing.jpg/);
});

test('orientation and animation metadata preserve the displayed frame aspect ratio', () => {
    assert.deepEqual(dimensionsFromMetadata({ width: 400, height: 300, orientation: 6 }), { width: 300, height: 400 });
    assert.deepEqual(dimensionsFromMetadata({ width: 162, height: 17568, pageHeight: 288 }), { width: 162, height: 288 });
    assert.throws(() => dimensionsFromMetadata({ width: 0, height: 100 }), /valid dimensions/);
});

test('dimension reader restricts paths and remote hosts', () => {
    for (const src of ['/../package.json', '/%2e%2e/package.json', '//example.com/photo.jpg', 'http://127.0.0.1/photo.jpg', 'https://example.com/photo.jpg']) {
        assert.throws(() => validateSource(src));
    }
    assert.match(validateSource('/loading.svg'), /public\/loading\.svg$/);
});

test('every article layout image has cached or local dimensions and consistent declarations', async () => {
    const directory = new URL('../app/blog/articles/', import.meta.url);
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const processor = createProcessor();
    let count = 0;
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const filename = new URL(`${entry.name}/page.mdx`, directory);
        let source;
        try { source = await fs.readFile(filename, 'utf8'); }
        catch (error) { if (error.code === 'ENOENT') continue; throw error; }
        assert.doesNotMatch(source, /^import \w+ from ['"]@\/public\//m, filename.pathname);
        assert.doesNotMatch(source, /^export const \w+ = \{ src:/m, filename.pathname);
        for (const { src } of collectArticleImages(processor.parse(source))) {
            if (src.startsWith('https:')) assert.ok(manifest[src]?.width > 0 && manifest[src]?.height > 0, `${entry.name}: ${src}`);
            else assert.ok((await readImageDimensions(src)).width > 0);
            count++;
        }
    }
    assert.ok(count > 200);
});

test('tracked remote dimensions are usable with networking disabled', async () => {
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf8'));
    const src = Object.keys(manifest).find(key => key.startsWith('https:'));
    const originalFetch = globalThis.fetch;
    globalThis.fetch = () => { throw new Error('Network must not be used for cached dimensions'); };
    try { assert.deepEqual(await readImageDimensions(src), manifest[src]); }
    finally { globalThis.fetch = originalFetch; }
});
