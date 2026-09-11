import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchRiverReadings, normalizeRiverReadings } from '../lib/usgs/river-flow-data.mjs';
import { getRiverGauges, isOldReading, OLD_READING_MS, REFRESH_INTERVAL_MS } from '../lib/usgs/river-gauges.mjs';
import { pollRiverFlow } from '../lib/usgs/poll-river-flow.mjs';

const now = Date.parse('2026-09-10T03:00:00Z');
const station = getRiverGauges('big-sioux').gauges[0].id;
const feature = (overrides = {}) => ({ type: 'Feature', properties: {
    monitoring_location_id: station, parameter_code: '00060', statistic_id: '00011',
    time: '2026-09-10T02:45:00Z', value: '13.2', unit_of_measure: 'ft^3/s',
    approval_status: 'Provisional', qualifier: null, ...overrides,
} });
const collection = (...features) => ({ type: 'FeatureCollection', features });
const normalize = payload => normalizeRiverReadings(payload, 'big-sioux', now);
const settle = () => new Promise(resolve => setImmediate(resolve));

test('normalization keeps configured station order and the newest instantaneous discharge', () => {
    const readings = normalize(collection(
        feature({ value: '4', time: '2026-09-10T02:00:00Z' }),
        feature({ value: '999', monitoring_location_id: 'USGS-unknown' }),
        feature({ value: '999', parameter_code: '00065', time: '2026-09-10T02:55:00Z' }),
        feature({ value: '999', statistic_id: '00003', time: '2026-09-10T02:55:00Z' }),
        feature(),
    ));
    assert.deepEqual(readings.map(reading => reading.id), getRiverGauges('big-sioux').gauges.map(gauge => gauge.id));
    assert.deepEqual(readings[0], { id: station, discharge: 13.2, observedAt: '2026-09-10T02:45:00.000Z', approvalStatus: 'Provisional', qualifier: null });
    assert.equal(readings[1].discharge, null);
    assert.equal(readings[1].observedAt, null);
});

test('missing, flagged, invalid, or incorrectly dimensioned values never become zero or an older value', () => {
    for (const value of [null, undefined, '', ' ', 'Ice', 'NaN', Infinity, -999999, '-999999']) {
        const [reading] = normalize(collection(feature({ value: '10', time: '2026-09-10T02:00:00Z' }), feature({ value, qualifier: 'Ice' })));
        assert.equal(reading.discharge, null, String(value));
        assert.equal(reading.observedAt, '2026-09-10T02:45:00.000Z');
        assert.equal(reading.qualifier, 'Ice');
    }
    assert.equal(normalize(collection(feature({ unit_of_measure: 'm^3/s' })))[0].discharge, null);
    for (const value of [0, '0', -2.5, '-2.5']) assert.equal(normalize(collection(feature({ value })))[0].discharge, Number(value));
});

test('invalid/future dates are omitted, old measurements retain their real timestamps', () => {
    for (const time of ['invalid', null, '2026-09-11T03:00:00Z']) {
        assert.equal(normalize(collection(feature({ time })))[0].observedAt, null);
    }
    const [old] = normalize(collection(feature({ time: '2026-09-09T03:00:00Z' })));
    assert.equal(old.discharge, 13.2);
    assert.equal(isOldReading(old.observedAt, now), true);
    assert.equal(isOldReading(new Date(now - OLD_READING_MS).toISOString(), now), false);
    assert.equal(isOldReading(new Date(now - OLD_READING_MS - 1).toISOString(), now), true);
    assert.equal(isOldReading(null, now), false);
});

test('malformed and paginated responses fail instead of presenting incomplete results', () => {
    for (const payload of [null, {}, { features: [] }, { type: 'FeatureCollection', features: null }, { ...collection(), links: [{ rel: 'next' }] }]) {
        assert.throws(() => normalize(payload), /Incomplete USGS response/);
    }
    assert.equal(normalize(collection()).every(reading => reading.discharge === null), true);
    assert.throws(() => normalizeRiverReadings(collection(), 'toString'), /Unknown river/);
});

test('upstream requests use only whitelisted gauges, the v1 API, timeouts, and a shared five-minute cache', async () => {
    for (const river of ['big-sioux', 'kansas']) {
        let called = false;
        const result = await fetchRiverReadings(river, { apiKey: 'test-only-key', fetchImpl: async (url, options) => {
            called = true;
            const parsed = new URL(url);
            assert.equal(parsed.origin, 'https://api.waterdata.usgs.gov');
            assert.equal(parsed.pathname, '/ogcapi/v1/collections/latest-continuous/items');
            assert.equal(parsed.searchParams.get('filter'), `monitoring_location_id IN (${getRiverGauges(river).gauges.map(({ id }) => `'${id}'`).join(',')}) AND parameter_code = '00060' AND statistic_id = '00011'`);
            assert.equal(parsed.searchParams.get('limit'), '50');
            assert.equal(options.headers['X-Api-Key'], 'test-only-key');
            assert.ok(!url.includes('test-only-key'));
            assert.equal(options.next.revalidate, 300);
            assert.equal(options.redirect, 'error');
            assert.ok(options.signal instanceof AbortSignal);
            return Response.json(collection());
        } });
        assert.ok(called);
        assert.equal(result.river, river);
        assert.equal(result.readings.length, 3);
    }
    await assert.rejects(fetchRiverReadings('https://example.com', { fetchImpl: () => assert.fail('Unknown river must not make a request') }), /Unknown river/);
    await fetchRiverReadings('big-sioux', { apiKey: '', fetchImpl: async (_url, options) => {
        assert.equal(options.headers['X-Api-Key'], undefined);
        return Response.json(collection());
    } });
});

test('upstream failures propagate to the route error handler', async () => {
    for (const status of [429, 500, 503]) {
        await assert.rejects(fetchRiverReadings('big-sioux', { fetchImpl: async () => new Response(null, { status }) }), new RegExp(`HTTP ${status}`));
    }
    await assert.rejects(fetchRiverReadings('big-sioux', { fetchImpl: async () => { throw new DOMException('Timed out', 'TimeoutError'); } }), { name: 'TimeoutError' });
    await assert.rejects(fetchRiverReadings('big-sioux', { fetchImpl: async () => Response.json({}) }), /Incomplete USGS response/);
});

function harness(request, { hidden = false } = {}) {
    const documentTarget = new EventTarget();
    documentTarget.hidden = hidden;
    const timeouts = new Map();
    const intervals = new Map();
    const timers = {
        setTimeout(callback, delay) { timeouts.set(callback, delay); return callback; },
        clearTimeout(id) { timeouts.delete(id); },
        setInterval(callback, delay) { intervals.set(callback, delay); return callback; },
        clearInterval(id) { intervals.delete(id); },
    };
    let state = {};
    const updates = [];
    const poller = pollRiverFlow({ river: 'big-sioux', request, documentTarget, timers, now: () => now,
        onState(update) { updates.push(update); state = { ...state, ...update }; } });
    return { poller, documentTarget, timeouts, intervals, updates, get state() { return state; } };
}
const success = () => Response.json({ river: 'big-sioux', readings: normalize(collection(feature())) });

test('polling skips hidden tabs, resumes on return, and cleans up on stop', async () => {
    let calls = 0;
    const h = harness(async () => { calls++; return success(); }, { hidden: true });
    await settle();
    assert.equal(calls, 0);
    assert.deepEqual([...h.intervals.values()], [REFRESH_INTERVAL_MS]);
    h.documentTarget.hidden = false;
    h.documentTarget.dispatchEvent(new Event('visibilitychange'));
    await settle();
    assert.equal(calls, 1);
    assert.equal(h.state.readings[0].discharge, 13.2);
    assert.equal(h.timeouts.size, 0);
    await [...h.intervals.keys()][0]();
    assert.equal(calls, 2);
    h.documentTarget.hidden = true;
    await h.poller.refresh();
    assert.equal(calls, 2);
    h.poller.stop();
    assert.equal(h.intervals.size, 0);
    h.documentTarget.hidden = false;
    h.documentTarget.dispatchEvent(new Event('visibilitychange'));
    await h.poller.refresh();
    assert.equal(calls, 2);
});

test('overlapping refreshes are suppressed, removal aborts requests and ignores late results', async () => {
    let resolve;
    let signal;
    let calls = 0;
    const h = harness((_url, options) => {
        calls++; signal = options.signal;
        return new Promise(done => { resolve = done; });
    });
    await settle();
    await h.poller.refresh();
    assert.equal(calls, 1);
    assert.equal(signal.aborted, false);
    h.poller.stop();
    const updatesAtStop = h.updates.length;
    assert.equal(signal.aborted, true);
    assert.equal(h.timeouts.size, 0);
    assert.equal(h.intervals.size, 0);
    resolve(success());
    await settle();
    assert.equal(h.updates.length, updatesAtStop);
});

test('failed refreshes retain earlier readings and recover on retry', async () => {
    let fail = false;
    const h = harness(async () => fail ? new Response(null, { status: 503 }) : success());
    await settle();
    const earlier = h.state.readings;
    fail = true;
    await h.poller.refresh();
    assert.match(h.state.error, /Unable to refresh/);
    assert.equal(h.state.readings, earlier);
    assert.equal(h.state.loading, false);
    fail = false;
    await h.poller.refresh();
    assert.equal(h.state.error, null);
    assert.equal(h.state.readings[0].discharge, 13.2);
    h.poller.stop();
});

test('stalled requests time out and initial failures still allow retries', async () => {
    let shouldHang = true;
    const h = harness((_url, { signal }) => shouldHang ? new Promise((_resolve, reject) => {
        signal.addEventListener('abort', () => reject(signal.reason), { once: true });
    }) : Promise.resolve(success()));
    await settle();
    assert.deepEqual([...h.timeouts.values()], [15000]);
    [...h.timeouts.keys()][0]();
    await settle();
    assert.match(h.state.error, /Unable to refresh/);
    assert.equal(h.state.loading, false);
    assert.equal(h.state.readings, undefined);
    shouldHang = false;
    await h.poller.refresh();
    assert.equal(h.state.error, null);
    h.poller.stop();
});

test('stopping before the first microtask prevents any request', async () => {
    const h = harness(() => assert.fail('Unmounted widget must not load'));
    h.poller.stop();
    await settle();
    assert.equal(h.updates.length, 0);
});
