import { getRiverGauges, REFRESH_INTERVAL_MS } from './river-gauges.mjs';

const endpoint = 'https://api.waterdata.usgs.gov/ogcapi/v1/collections/latest-continuous/items';

export function normalizeRiverReadings(payload, river, now = Date.now()) {
    const config = getRiverGauges(river);
    if (!config) throw new Error('Unknown river');
    if (payload?.type !== 'FeatureCollection' || !Array.isArray(payload.features)
        || payload.links?.some(link => link.rel === 'next')) {
        throw new Error('Incomplete USGS response');
    }

    return config.gauges.map(({ id }) => {
        // Pick the newest instantaneous discharge observation for this station.
        // A missing/flagged latest value must not fall back to an older number.
        const candidates = payload.features.map(feature => feature.properties).filter(reading =>
            reading?.monitoring_location_id === id && reading.parameter_code === '00060'
            && reading.statistic_id === '00011' && Number.isFinite(Date.parse(reading.time))
            && Date.parse(reading.time) <= now + 5 * 60 * 1000);
        candidates.sort((a, b) => Date.parse(b.time) - Date.parse(a.time));
        const reading = candidates[0];
        const raw = reading?.value;
        const numeric = (typeof raw === 'number' || (typeof raw === 'string' && raw.trim() !== '')) ? Number(raw) : NaN;
        const discharge = reading?.unit_of_measure === 'ft^3/s' && Number.isFinite(numeric) && numeric !== -999999
            ? numeric : null;
        return {
            id,
            discharge,
            observedAt: reading ? new Date(reading.time).toISOString() : null,
            approvalStatus: ['Provisional', 'Approved'].includes(reading?.approval_status) ? reading.approval_status : null,
            qualifier: typeof reading?.qualifier === 'string' ? reading.qualifier.slice(0, 100) : null,
        };
    });
}

export async function fetchRiverReadings(river, { fetchImpl = fetch, apiKey = process.env.USGS_API_KEY } = {}) {
    const config = getRiverGauges(river);
    if (!config) throw new Error('Unknown river');
    const query = new URLSearchParams({
        f: 'json',
        filter: `monitoring_location_id IN (${config.gauges.map(({ id }) => `'${id}'`).join(',')}) AND parameter_code = '00060' AND statistic_id = '00011'`,
        limit: '50',
    });
    const response = await fetchImpl(`${endpoint}?${query}`, {
        headers: { Accept: 'application/geo+json', ...(apiKey ? { 'X-Api-Key': apiKey } : {}) },
        redirect: 'error',
        signal: AbortSignal.timeout(10000),
        next: { revalidate: REFRESH_INTERVAL_MS / 1000 },
    });
    if (!response.ok) throw new Error(`USGS returned HTTP ${response.status}`);
    return { river, readings: normalizeRiverReadings(await response.json(), river) };
}
