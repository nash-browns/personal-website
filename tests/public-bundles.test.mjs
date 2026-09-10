import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { test } from 'node:test';

// Check the production output, since development does not split/preload chunks
// the same way. Run `npm run build` before this suite.
const build = path.resolve('.next');
const app = path.join(build, 'server/app');
const sdkPattern = /identitytoolkit\.googleapis\.com|firestore\.googleapis\.com/;

function initialScripts(html) {
    const urls = new Set([...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)]
        .map(match => match[1]).filter(url => url.startsWith('/_next/')));
    assert.ok(urls.size, 'Expected production script tags');
    return [...urls].map(url => fs.readFileSync(path.join(build, url.slice('/_next/'.length)), 'utf8')).join('\n');
}

function clientModules(page) {
    const context = {};
    vm.runInNewContext(fs.readFileSync(path.join(app, `${page}_client-reference-manifest.js`), 'utf8'), context);
    const manifest = Object.values(context.__RSC_MANIFEST)[0];
    return Object.keys(manifest.clientModules).filter(name => /^\[project\]\/(components|lib)\//.test(name));
}

test('all generated public pages exclude Firebase SDKs from initial scripts', () => {
    const pages = fs.readdirSync(app, { recursive: true })
        .filter(file => file.endsWith('.html') && !file.startsWith('_') && !/^(partners|signup|forgot-password)(\/|\.)/.test(file));
    assert.ok(pages.length >= 50, 'Expected a full production build of the public pages');
    for (const page of pages) {
        const html = fs.readFileSync(path.join(app, page), 'utf8');
        assert.doesNotMatch(initialScripts(html), sdkPattern, page);
        assert.equal((html.match(/aria-label="Open navigation"/g) || []).length, 1, `${page}: one navigation bar`);
    }
});

test('homepage and blog index only include their own client components', () => {
    assert.deepEqual(clientModules('page').sort(), ['[project]/components/general/public-navigation.js']);
    assert.deepEqual(clientModules('blog/page').sort(), [
        '[project]/components/blog/blog-browser.js',
        '[project]/components/general/public-navigation.js',
    ]);
});

test('account routes retain authentication and their account navigation', () => {
    for (const route of ['partners', 'partners/dashboard', 'partners/users', 'signup', 'forgot-password']) {
        const modules = clientModules(`${route}/page`);
        assert.ok(modules.includes('[project]/lib/firebase/auth-context.js'), `${route}: AuthProvider`);
        assert.ok(modules.includes('[project]/components/auth/partner-account-links.js'), `${route}: account controls`);
    }
    for (const route of ['partners', 'signup']) {
        const html = fs.readFileSync(path.join(app, `${route}.html`), 'utf8');
        assert.match(initialScripts(html), sdkPattern, route);
        assert.equal((html.match(/aria-label="Open navigation"/g) || []).length, 1, `${route}: one navigation bar`);
    }
});
