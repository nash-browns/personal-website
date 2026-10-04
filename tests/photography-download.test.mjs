import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SourceTextModule, SyntheticModule } from 'node:vm';
import { readFile } from 'node:fs/promises';
import { createDownloadGuard, downloadVisitor, DownloadLimitError, MAX_DOWNLOAD_BYTES } from '../lib/photography/download-limits.mjs';
import { validId } from '../lib/photography/model.mjs';

const env = { VERCEL: '1' };
const request = (ip = '192.0.2.1') => new Request('https://example.test/api/photography/download/photo', { headers: { 'x-vercel-forwarded-for': ip } });
function store() {
    let reads = 0, writes = 0, queue = Promise.resolve(), failEmail = false;
    const documents = new Map();
    return {
        collection: collection => ({ doc: id => `${collection}/${id}` }),
        runTransaction(fn) {
            const work = queue.then(async () => {
                const pending = new Map();
                const result = await fn({
                    get: async reference => {
                        assert.equal(pending.size, 0, 'All transaction reads must precede writes');
                        reads++;
                        return { exists: documents.has(reference), data: () => structuredClone(documents.get(reference)) };
                    },
                    set: (reference, value) => { pending.set(reference, structuredClone(value)); },
                    create: (reference, value) => {
                        if (failEmail) { failEmail = false; throw new Error('Queue unavailable'); }
                        assert.ok(!documents.has(reference));
                        pending.set(reference, structuredClone(value));
                    },
                });
                for (const [reference, value] of pending) { documents.set(reference, value); writes++; }
                return result;
            });
            queue = work.catch(() => {});
            return work;
        },
        seed: (reference, value) => documents.set(reference, structuredClone(value)),
        failNextEmail: () => { failEmail = true; },
        stats: () => ({ reads, writes, data: documents.get('photographyDownloadLimits/current'), messages: [...documents].filter(([key]) => key.startsWith('email_queue/')).map(([id, data]) => ({ id, ...data })) }),
    };
}

test('50,000 simultaneous attempts allow only five and do not create 50,000 Firebase reads', async () => {
    const db = store();
    const guard = createDownloadGuard({ db, env, now: () => 0 });
    const req = request();
    const results = await Promise.allSettled(Array.from({ length: 50_000 }, () => guard(req)));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 5);
    assert.equal(db.stats().reads, 5);
    assert.equal(db.stats().writes, 5);
    assert.ok(results.filter(result => result.status === 'rejected').every(result => result.reason.status === 429));
    assert.equal(db.stats().messages.length, 0);
});

test('limits span instances, photo IDs, and restarts; daily counters reset the next UTC day', async () => {
    const db = store(); let time = 0;
    for (let minute = 0; minute < 5; minute++) {
        time = minute * 60_000;
        for (let i = 0; i < 5; i++) await createDownloadGuard({ db, env, now: () => time })(request());
        await assert.rejects(createDownloadGuard({ db, env, now: () => time })(request()), { status: 429 });
    }
    time += 60_000;
    await assert.rejects(createDownloadGuard({ db, env, now: () => time })(request()), { status: 429 });
    assert.equal(db.stats().writes, 25);
    time = 86_400_000;
    await createDownloadGuard({ db, env, now: () => time })(request());
    assert.equal(db.stats().data.total, 1);
    assert.equal(Object.keys(db.stats().data.visitors).length, 1);
    assert.ok(!JSON.stringify(db.stats().data).includes('192.0.2.1'));
});

test('rotating visitors cannot exceed the shared daily cap', async () => {
    const db = store();
    for (let i = 1; i <= 250; i++) await createDownloadGuard({ db, env, now: () => 0 })(request(`192.0.2.${i}`));
    const guard = createDownloadGuard({ db, env, now: () => 0 });
    await assert.rejects(guard(request('198.51.100.1')), { status: 429 });
    const reads = db.stats().reads;
    await assert.rejects(guard(request('198.51.100.2')), { status: 429 });
    assert.equal(db.stats().reads, reads);
    assert.equal(db.stats().data.total, 250);
    const [message] = db.stats().messages;
    assert.equal(db.stats().messages.length, 1);
    assert.equal(message.id, 'email_queue/photography-download-limit-1970-01-01');
    assert.deepEqual(message.to, ['nashb1323@gmail.com']);
    assert.equal(message.from, 'hello@nashbrowns.com');
    assert.match(message.message.text, /250 attempts/);
    assert.match(message.message.text, /1970-01-02 00:00:00 UTC/);
    await assert.rejects(createDownloadGuard({ db, env, now: () => 0 })(request('198.51.100.3')), { status: 429 });
    assert.equal(db.stats().messages.length, 1);
});

test('queue failure does not commit the threshold; retry queues once and the next day can notify again', async () => {
    const db = store();
    db.seed('photographyDownloadLimits/current', { day: 0, total: 249, visitors: {} });
    db.failNextEmail();
    await assert.rejects(createDownloadGuard({ db, env, now: () => 0 })(request()), { status: 503 });
    assert.equal(db.stats().data.total, 249);
    assert.equal(db.stats().messages.length, 0);
    await createDownloadGuard({ db, env, now: () => 0 })(request());
    assert.equal(db.stats().data.total, 250);
    assert.equal(db.stats().messages.length, 1);
    db.seed('photographyDownloadLimits/current', { day: 1, total: 249, visitors: {} });
    await createDownloadGuard({ db, env, now: () => 86_400_000 })(request());
    assert.equal(db.stats().messages.length, 2);
});

test('an already exhausted quota queues an alert without duplicating an existing delivered message', async () => {
    const db = store();
    db.seed('photographyDownloadLimits/current', { day: 0, total: 250, visitors: {} });
    await assert.rejects(createDownloadGuard({ db, env, now: () => 0 })(request()), { status: 429 });
    assert.equal(db.stats().messages.length, 1);
    const delivered = { to: ['nashb1323@gmail.com'], delivery: { state: 'SUCCESS' }, message: { text: 'Already sent' } };
    db.seed('email_queue/photography-download-limit-1970-01-01', delivered);
    db.seed('photographyDownloadLimits/current', { day: 0, total: 250, visitors: {} });
    await assert.rejects(createDownloadGuard({ db, env, now: () => 0 })(request()), { status: 429 });
    assert.deepEqual(db.stats().messages, [{ id: 'email_queue/photography-download-limit-1970-01-01', ...delivered }]);
});

test('rotating-IP bursts are bounded locally before shared reads', async () => {
    const db = store();
    const guard = createDownloadGuard({ db, env, now: () => 0 });
    const results = await Promise.allSettled(Array.from({ length: 100 }, (_, i) => guard(request(`192.0.2.${i + 1}`))));
    assert.equal(results.filter(result => result.status === 'fulfilled').length, 30);
    assert.equal(db.stats().reads, 30);
});

test('untrusted forwarding headers cannot select buckets; IPv6 /64 addresses share limits', () => {
    assert.equal(downloadVisitor(request('192.0.2.1'), {}), downloadVisitor(request('192.0.2.2'), {}));
    assert.equal(downloadVisitor(request('2001:db8:1:2::1'), env), downloadVisitor(request('2001:0db8:0001:0002:abcd::1234'), env));
    assert.equal(downloadVisitor(request('spoof,192.0.2.1'), env), 'shared-unidentified-visitor');
});

test('database failures and emergency pause fail closed', async () => {
    const db = store(); let reads = 0;
    db.runTransaction = async () => { reads++; throw new Error('Offline'); };
    const guard = createDownloadGuard({ db, env, now: () => 0 });
    await assert.rejects(guard(request()), { status: 503 });
    await assert.rejects(guard(request()), { status: 503 });
    assert.equal(reads, 1);
    await assert.rejects(createDownloadGuard({ db, env: { PHOTOGRAPHY_DOWNLOADS_ENABLED: 'false' } })(request()), { status: 503 });
    assert.equal(reads, 1);
});

async function downloadRoute({ denied, photo = { status: 'published', title: 'Mountain', webImage: { path: 'photography/public/photo/v1/web.webp' } }, bytes = Buffer.from('web-image') } = {}) {
    let guards = 0, reads = 0, downloads = 0, range;
    const dependencies = {
        '@/lib/photography/server': {
            photoDb: { collection: () => ({ doc: () => ({ get: async () => { reads++; return { data: () => photo }; } }) }) },
            photoBucket: () => ({ file: () => ({ download: async options => { downloads++; range = options; return [bytes]; } }) }),
        },
        '@/lib/photography/model.mjs': { validId },
        '@/lib/photography/download-guard': { reserveDownload: async () => { guards++; if (denied) throw denied; } },
        '@/lib/photography/download-limits.mjs': { DownloadLimitError, MAX_DOWNLOAD_BYTES },
    };
    const routeModule = new SourceTextModule(await readFile(new URL('../app/api/photography/download/[id]/route.js', import.meta.url), 'utf8'));
    await routeModule.link(name => {
        const exports = dependencies[name]; assert.ok(exports, name);
        return new SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); });
    });
    await routeModule.evaluate();
    return { get: (id = 'photo') => routeModule.namespace.GET(request(), { params: Promise.resolve({ id }) }), stats: () => ({ guards, reads, downloads, range }) };
}

test('blocked download stops before photo/Storage access and cannot be publicly cached', async () => {
    const route = await downloadRoute({ denied: new DownloadLimitError('Please wait.', 429, 60) });
    const response = await route.get();
    assert.equal(response.status, 429);
    assert.equal(response.headers.get('retry-after'), '60');
    assert.equal(response.headers.get('cache-control'), 'private, no-store');
    assert.equal(route.stats().reads, 0);
    assert.equal(route.stats().downloads, 0);
});

test('valid downloads are bounded web images; unpublished/private/oversized assets are rejected', async () => {
    const route = await downloadRoute();
    const response = await route.get();
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-disposition'), /Mountain.webp/);
    assert.equal(await response.text(), 'web-image');
    assert.deepEqual(route.stats().range, { start: 0, end: MAX_DOWNLOAD_BYTES });
    for (const photo of [{ status: 'archived' }, { status: 'published', webImage: { path: 'photography/private/photo/original/v1/source.tiff' } }]) {
        const blocked = await downloadRoute({ photo });
        assert.notEqual((await blocked.get()).status, 200);
        assert.equal(blocked.stats().downloads, 0);
    }
    const oversized = await downloadRoute({ bytes: Buffer.alloc(MAX_DOWNLOAD_BYTES + 1) });
    assert.equal((await oversized.get()).status, 503);
    const invalid = await downloadRoute();
    assert.equal((await invalid.get('../bad')).status, 400);
    assert.equal(invalid.stats().guards, 0);
});
