import { photoDb, photoBucket } from '@/lib/photography/server';
import { validId } from '@/lib/photography/model.mjs';
export const runtime = 'nodejs';
export async function GET(request, { params }) {
    try {
        const { id, version, size } = await params;
        validId(id); validId(version);
        if (!['web','thumbnail'].includes(size)) return new Response(null, { status: 404 });
        const doc = await photoDb.collection('photos').doc(id).get();
        const photo = doc.data();
        if (photo?.status !== 'published' || photo.webImage?.version !== version) return new Response(null, { status: 404 });
        const path = size === 'web' ? photo.webImage.path : photo.webImage.thumbnailPath;
        const [bytes] = await photoBucket().file(path).download();
        return new Response(bytes, { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'public, max-age=60, s-maxage=60', 'X-Content-Type-Options': 'nosniff' } });
    } catch { return new Response(null, { status: 404 }); }
}
