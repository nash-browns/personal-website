import { getRiverGauges } from '@/lib/usgs/river-gauges.mjs';
import { fetchRiverReadings } from '@/lib/usgs/river-flow-data.mjs';

export async function GET(_request, { params }) {
    const { river } = await params;
    if (!getRiverGauges(river)) {
        return Response.json({ error: 'Unknown river' }, { status: 404, headers: { 'Cache-Control': 'no-store' } });
    }
    try {
        // Share successful public readings briefly at the CDN. Browsers still
        // revalidate; measured timestamps and client-side age checks stay intact.
        const data = await fetchRiverReadings(river);
        return Response.json(data, { headers: {
            'Cache-Control': 'public, max-age=0, must-revalidate',
            'Vercel-CDN-Cache-Control': 'public, s-maxage=60',
        } });
    } catch (error) {
        console.error('Unable to load river flow:', error.message);
        return Response.json({ error: 'USGS readings are temporarily unavailable.' }, {
            status: 503,
            headers: { 'Cache-Control': 'no-store', 'Retry-After': '60' },
        });
    }
}
