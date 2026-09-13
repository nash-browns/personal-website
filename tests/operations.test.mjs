import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import { test } from 'node:test';

async function loadModule(file, dependencies, globals = {}) {
    const context = vm.createContext({ Response, Date, console, ...globals });
    const module = new vm.SourceTextModule(await readFile(new URL(file, import.meta.url), 'utf8'), { context });
    await module.link(specifier => {
        const exports = dependencies[specifier];
        assert.ok(exports, `Unexpected dependency: ${specifier}`);
        return new vm.SyntheticModule(Object.keys(exports), function () {
            for (const [name, value] of Object.entries(exports)) this.setExport(name, value);
        }, { context });
    });
    await module.evaluate();
    return module.namespace;
}

test('only successful river readings can be cached, and measurement timestamps survive', async () => {
    let fail = false;
    let calls = 0;
    const data = { river: 'test-river', readings: [{ observedAt: '2026-09-13T12:00:00.000Z', discharge: 123 }] };
    const route = await loadModule('../app/api/river-flow/[river]/route.js', {
        '@/lib/usgs/river-gauges.mjs': { getRiverGauges: river => river === 'test-river' },
        '@/lib/usgs/river-flow-data.mjs': { fetchRiverReadings: async () => {
            calls++;
            if (fail) throw new Error('Upstream unavailable');
            return data;
        } },
    }, { console: { error() {} } });
    const request = river => route.GET(null, { params: Promise.resolve({ river }) });
    const success = await request('test-river');
    assert.equal(success.status, 200);
    assert.equal(success.headers.get('vercel-cdn-cache-control'), 'public, s-maxage=60');
    assert.match(success.headers.get('cache-control'), /max-age=0/);
    assert.deepEqual(await success.json(), data);
    fail = true;
    const failure = await request('test-river');
    assert.equal(failure.status, 503);
    assert.equal(failure.headers.get('cache-control'), 'no-store');
    assert.equal(failure.headers.get('vercel-cdn-cache-control'), null);
    const missing = await request('unknown');
    assert.equal(missing.status, 404);
    assert.equal(missing.headers.get('cache-control'), 'no-store');
    assert.equal(calls, 2);
});

test('contact success and provider failures never log submitted data or error details', async () => {
    const logs = [];
    const submitted = { email: 'private@example.com', first_name: 'Private', last_name: 'Person', phone: '555-0100', message: 'Private message' };
    let fail = false;
    const route = await loadModule('../lib/server-actions/firebase/firestore/incoming-requests.js', {
        'node:crypto': { randomUUID: () => 'test-request-id' },
        '@/lib/firebase/firestore': { addIncomingRequest: async data => {
            assert.equal(data.email, submitted.email);
            if (fail) throw new Error(JSON.stringify(submitted));
        } },
    }, { console: { info: value => logs.push(value), error: value => logs.push(value) } });
    assert.equal((await route.addIncomingRequest(submitted)).success, true);
    fail = true;
    await assert.rejects(route.addIncomingRequest(submitted), { message: 'Unable to submit your message. Please try again.' });
    assert.deepEqual(logs.map(line => JSON.parse(line).outcome), ['success', 'failure']);
    for (const value of Object.values(submitted)) assert.ok(!logs.join('').includes(value));
    assert.ok(logs.every(line => JSON.parse(line).requestId === 'test-request-id'));
});
