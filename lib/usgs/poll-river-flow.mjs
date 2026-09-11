import { REFRESH_INTERVAL_MS } from './river-gauges.mjs';

// Called only while the widget is near the viewport. Stop releases all work;
// visibility changes resume updates after the reader returns to the tab.
export function pollRiverFlow({ river, onState, request = fetch, documentTarget = document,
    timers = globalThis, now = Date.now }) {
    let stopped = false;
    let pending = false;
    let controller;
    let timeout;

    async function refresh() {
        if (stopped || pending || documentTarget.hidden) return;
        pending = true;
        controller = new AbortController();
        timeout = timers.setTimeout(() => controller.abort(), 15000);
        onState({ loading: true, error: null, now: now() });
        try {
            const response = await request(`/api/river-flow/${encodeURIComponent(river)}`, { signal: controller.signal });
            if (!response.ok) throw new Error('Readings unavailable');
            const data = await response.json();
            if (data.river !== river || !Array.isArray(data.readings)) throw new Error('Invalid readings');
            if (!stopped) onState({ readings: data.readings, loading: false, error: null, now: now() });
        } catch {
            if (!stopped) onState({ loading: false, error: 'Unable to refresh USGS readings. You can still open the official gauges below.', now: now() });
        } finally {
            timers.clearTimeout(timeout);
            pending = false;
        }
    }

    queueMicrotask(refresh);
    const interval = timers.setInterval(refresh, REFRESH_INTERVAL_MS);
    documentTarget.addEventListener('visibilitychange', refresh);
    return {
        refresh,
        stop() {
            stopped = true;
            controller?.abort();
            timers.clearTimeout(timeout);
            timers.clearInterval(interval);
            documentTarget.removeEventListener('visibilitychange', refresh);
        },
    };
}
