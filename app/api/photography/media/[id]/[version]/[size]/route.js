import { photoDb, photoBucket } from '@/lib/photography/server';
import { validId } from '@/lib/photography/model.mjs';
import { PHOTO_WIDTHS } from '@/lib/photography/image-loader.mjs';
import { getPreviewBytes } from '@/lib/photography/preview-cache.mjs';
export const runtime = 'nodejs';
const noStore = { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' };
const notFound = () => new Response(null, { status: 404, headers: noStore });

export async function GET(request, { params }) {
    let id, version, size, width;
    try {
        ({ id, version, size } = await params);
        validId(id); validId(version);
        if (!['web', 'thumbnail'].includes(size)) return notFound();
        const query = new URL(request.url).searchParams;
        const widths = query.getAll('w');
        if ([...query.keys()].some(key => key !== 'w') || widths.length > 1) return notFound();
        if (widths.length) {
            width = Number(widths[0]);
            if (size !== 'web' || !PHOTO_WIDTHS.includes(width) || String(width) !== widths[0]) return notFound();
        }
    } catch { return notFound(); }

    try {
        const doc = await photoDb.collection('photos').doc(id).get();
        const photo = doc.data();
        if (photo?.status !== 'published' || photo.webImage?.version !== version) return notFound();
        const path = size === 'web' ? photo.webImage.path : photo.webImage.thumbnailPath;
        if (path !== `photography/public/${id}/${version}/${size}.webp`) return notFound();

        // Versioned previews never change in place. Existing cached copies may
        // remain visible for 31 days after archive; new origin requests check
        // publication before reusing either the browser or process-local bytes.
        const etag = `"photo:${id}:${version}:${size}:${width || 'source'}:v1"`;
        const headers = {
            'Content-Type': 'image/webp',
            'Cache-Control': 'public, max-age=2678400, s-maxage=2678400, immutable, must-revalidate',
            'ETag': `W/${etag}`,
            'X-Content-Type-Options': 'nosniff',
        };
        const matches = request.headers.get('if-none-match')?.split(',').some(value => {
            const tag = value.trim().replace(/^W\//, '');
            return tag === '*' || tag === etag;
        });
        if (matches) return new Response(null, { status: 304, headers });

        const bytes = await getPreviewBytes(photoBucket(), path, width);
        return new Response(bytes, { headers });
    } catch (error) {
        // A temporary storage/database failure must not become a cached 404.
        return new Response(null, { status: error.code === 404 ? 404 : 503, headers: noStore });
    }
}
