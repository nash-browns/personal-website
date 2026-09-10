import assert from 'node:assert/strict';
import fs from 'node:fs';
import { test } from 'node:test';
import { compile, run } from '@mdx-js/mdx';
import * as runtime from 'react/jsx-runtime';
import { renderToStaticMarkup } from 'react-dom/server';
import remarkMediaDefaults from '../lib/mdx/remark-media-defaults.mjs';

test('MDX iframe defaults preserve content and explicit loading overrides', async () => {
    const compiled = await compile(`<section>
<iframe src="https://example.com/map" title="Route" width="640" height="480" />
<iframe src="https://example.com/video" loading="eager" />
<iframe src="https://example.com/audio" loading={'lazy'} />
</section>`, { outputFormat: 'function-body', remarkPlugins: [remarkMediaDefaults] });
    const article = await run(compiled, runtime);
    const html = renderToStaticMarkup(article.default({}));
    assert.equal((html.match(/loading="lazy"/g) || []).length, 2);
    assert.equal((html.match(/loading="eager"/g) || []).length, 1);
    assert.match(html, /title="Route" width="640" height="480"/);
    assert.match(html, /src="https:\/\/example.com\/map"/);
});

// A small DOM double checks the shared network request without contacting Strava.
async function withStravaLoader(check) {
    const previousWindow = globalThis.window;
    const previousDocument = globalThis.document;
    const scripts = [];
    globalThis.window = {};
    globalThis.document = {
        createElement: () => ({
            events: {},
            addEventListener(name, callback) { this.events[name] = callback; },
            remove() { this.removed = true; },
        }),
        head: { appendChild(script) { scripts.push(script); } },
    };
    try {
        const { loadStravaEmbeds } = await import(`../components/blog/activity-trackers/load-strava-embeds.mjs?test=${Math.random()}`);
        await check(loadStravaEmbeds, scripts);
    } finally {
        if (previousWindow === undefined) delete globalThis.window;
        else globalThis.window = previousWindow;
        if (previousDocument === undefined) delete globalThis.document;
        else globalThis.document = previousDocument;
    }
}

test('concurrent Strava embeds share one download, including later navigation', async () => {
    await withStravaLoader(async (load, scripts) => {
        const first = load();
        const second = load();
        assert.equal(first, second);
        assert.equal(scripts.length, 1);
        assert.equal(scripts[0].src, 'https://strava-embeds.com/embed.js');
        window.__STRAVA_EMBED_BOOTSTRAP__ = () => {};
        scripts[0].events.load();
        await Promise.all([first, second]);
        await load();
        assert.equal(scripts.length, 1);
    });
});

for (const failure of ['error', 'load']) {
    test(`Strava can retry after ${failure === 'error' ? 'a network failure' : 'a script without its bootstrap API'}`, async () => {
        await withStravaLoader(async (load, scripts) => {
            const first = load();
            const rejected = assert.rejects(first, /Could not load/);
            scripts[0].events[failure]();
            await rejected;
            assert.equal(scripts[0].removed, true);
            const retry = load();
            assert.equal(scripts.length, 2);
            window.__STRAVA_EMBED_BOOTSTRAP__ = () => {};
            scripts[1].events.load();
            await retry;
        });
    });
}

const articles = new URL('../.next/server/app/blog/articles/', import.meta.url);

test('production articles defer every inline iframe and use previews for YouTube link cards', () => {
    const pages = fs.readdirSync(articles).filter(file => file.endsWith('.html'));
    assert.ok(pages.length >= 40, 'Run a full production build before this suite');
    let frames = 0;
    let previews = 0;
    for (const page of pages) {
        const html = fs.readFileSync(new URL(page, articles), 'utf8');
        for (const [tag] of html.matchAll(/<iframe\b[^>]*>/g)) {
            assert.match(tag, /loading="lazy"/, page);
            frames++;
        }
        const cards = [...html.matchAll(/<a\b[^>]*aria-label="Watch on YouTube[^>]*>([\s\S]*?)<\/a>/g)];
        for (const [, contents] of cards) {
            assert.match(contents, /<img\b[^>]*loading="lazy"/);
            assert.doesNotMatch(contents, /<iframe/);
            previews++;
        }
    }
    assert.ok(frames >= 20);
    assert.ok(previews >= 7);
});

test('article clips have no download source before visibility; photo essays retain only cover priority', () => {
    const pages = fs.readdirSync(articles).filter(file => file.endsWith('.html'));
    let clips = 0;
    for (const page of pages) {
        const html = fs.readFileSync(new URL(page, articles), 'utf8');
        for (const [video] of html.matchAll(/<video\b[^>]*preload="none"[\s\S]*?<\/video>/g)) {
            assert.doesNotMatch(video, /\bsrc=|<source\b|\bautoPlay=/, page);
            assert.match(video, /\bwidth="[1-9]\d*"/, `${page}: reserve clip width`);
            assert.match(video, /\bheight="[1-9]\d*"/, `${page}: reserve clip height`);
            clips++;
        }
    }
    assert.ok(clips >= 6);
    for (const page of ['france-may-2026.html', 'japan-april-2026.html']) {
        const html = fs.readFileSync(new URL(page, articles), 'utf8');
        const images = [...html.matchAll(/<img\b[^>]*>/g)].map(match => match[0]);
        assert.equal(images.filter(tag => !tag.includes('loading="lazy"')).length, 2, `${page}: logo and cover`);
        assert.match(html, /<link rel="preload" as="image"/);
    }
});
