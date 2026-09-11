import { getRiverGauges } from '@/lib/usgs/river-gauges.mjs';
import { fetchRiverReadings } from '@/lib/usgs/river-flow-data.mjs';

export async function GET(_request, { params }) {
    const { river } = await params;
    if (!getRiverGauges(river)) {
        return Response.json({ error: 'Unknown river' }, { status: 404 });
    }
    try {
        // Cache the upstream fetch, not the page or its display-time freshness.
        const data = await fetchRiverReadings(river);
        return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
    } catch (error) {
        console.error('Unable to load river flow:', error.message);
        return Response.json({ error: 'USGS readings are temporarily unavailable.' }, {
            status: 503,
            headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
        });
    }
}
