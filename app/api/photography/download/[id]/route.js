import { photoDb, photoBucket } from '@/lib/photography/server';
import { validId } from '@/lib/photography/model.mjs';
import { reserveDownload } from '@/lib/photography/download-guard';
import { DownloadLimitError, MAX_DOWNLOAD_BYTES } from '@/lib/photography/download-limits.mjs';
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const privateHeaders = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' };
export async function GET(request, { params }) {
    try {
        const id = validId((await params).id);
        // This must run before photo reads or Storage downloads, including for
        // nonexistent IDs. A failed request still consumes an attempt.
        await reserveDownload(request);
        const doc = await photoDb.collection('photos').doc(id).get();
        const photo = doc.data();
        if (photo?.status !== 'published' || !photo.webImage?.path) return new Response('Photo not found.', { status: 404, headers: privateHeaders });
        if (!new RegExp(`^photography/public/${id}/[A-Za-z0-9_-]+/web\\.webp$`).test(photo.webImage.path)) throw new Error('Invalid web image path');
        // Bound both bytes fetched and memory even if an oversized asset is stored.
        const [bytes] = await photoBucket().file(photo.webImage.path).download({ start: 0, end: MAX_DOWNLOAD_BYTES });
        if (bytes.length > MAX_DOWNLOAD_BYTES) throw new Error('Web image is too large');
        const filename = (photo.title || 'photograph').replace(/[^a-zA-Z0-9_-]+/g, '-').slice(0, 100);
        return new Response(bytes, { headers: { ...privateHeaders, 'Content-Type': 'image/webp', 'Content-Disposition': `attachment; filename="${filename}.webp"` } });
    } catch (error) {
        if (error instanceof DownloadLimitError) return new Response(error.message, { status: error.status, headers: { ...privateHeaders, 'Retry-After': String(error.retryAfter) } });
        return new Response('Download unavailable. Please try again later.', { status: error.status === 400 ? 400 : 503, headers: privateHeaders });
    }
}
