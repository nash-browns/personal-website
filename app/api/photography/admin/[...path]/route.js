import { revalidateTag, revalidatePath } from 'next/cache';
import { photoDb, photoBucket, requirePhotoOwner, requireSameOrigin } from '@/lib/photography/server';
import { PhotoError, validId } from '@/lib/photography/model.mjs';
import * as service from '@/lib/photography/admin-service';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
const headers = { 'Cache-Control': 'private, no-store' };
const json = (data, status = 200) => Response.json(data, { status, headers });
function failure(error) {
    if (!(error instanceof PhotoError)) console.error('Photography admin request failed:', error.code || error.name);
    return json({ error: error instanceof PhotoError ? error.message : 'The request failed. Please try again.' }, error.status || 500);
}
export async function GET(request, { params }) {
    try {
        await requirePhotoOwner();
        const path = (await params).path;
        if (path.length === 1 && path[0] === 'library') return json(await service.library());
        if (path.length === 2 && path[0] === 'assets') return json(await service.asset(path[1]));
        if (path.length === 2 && path[0] === 'preview') {
            const id = validId(path[1]);
            const doc = await photoDb.collection('photoAssets').doc(id).get();
            const ready = doc.data()?.ready;
            const assetPath = new URL(request.url).searchParams.get('size') === 'thumbnail' ? ready?.thumbnail?.path || ready?.web?.path : ready?.web?.path;
            if (!assetPath) throw new PhotoError('Preview not ready.', 404);
            const [bytes] = await photoBucket().file(assetPath).download();
            return new Response(bytes, { headers: { ...headers, 'Content-Type': 'image/webp', 'X-Content-Type-Options': 'nosniff' } });
        }
        throw new PhotoError('Not found.', 404);
    } catch (error) { return failure(error); }
}
export async function POST(request, { params }) {
    try {
        requireSameOrigin(request);
        await requirePhotoOwner();
        if (!request.headers.get('content-type')?.startsWith('application/json')) throw new PhotoError('JSON required.', 415);
        const raw = await request.text();
        if (raw.length > 100000) throw new PhotoError('Request too large.', 413);
        let data; try { data = JSON.parse(raw); } catch { throw new PhotoError('Invalid JSON.'); }
        if (!data || typeof data !== 'object' || Array.isArray(data)) throw new PhotoError('Invalid request.');
        const path = (await params).path;
        let result = {};
        if (path.join('/') === 'initialize') await service.initializeCollections();
        else if (path.join('/') === 'collections/order') await service.reorderCollections(data);
        else if (path.length === 2 && path[0] === 'collections') result = await service.saveCollection(path[1], data);
        else if (path.length === 3 && path[0] === 'collections' && path[2] === 'order') await service.reorderPhotos(path[1], data);
        else if (path.length === 2 && path[0] === 'photos') result = await service.savePhoto(path[1], data);
        else if (path.length === 3 && path[0] === 'photos') {
            if (path[2] === 'upload') result = await service.beginUpload(path[1], data);
            else if (path[2] === 'retry') result = await service.retryUpload(path[1]);
            else if (path[2] === 'cancel') await service.cancelUpload(path[1], data.version);
            else if (path[2] === 'status') await service.setPhotoStatus(path[1], data);
            else if (path[2] === 'save') result = await service.savePhoto(path[1], data, { publish: true });
            else if (path[2] === 'delete') {
                try { result = await service.deletePhoto(path[1], data); }
                finally {
                    // Even partial cleanup removes the photo from public galleries.
                    revalidateTag('photography', { expire: 0 });
                    revalidatePath('/photography', 'layout');
                }
            }
            else throw new PhotoError('Not found.', 404);
        } else throw new PhotoError('Not found.', 404);
        revalidateTag('photography', { expire: 0 });
        revalidatePath('/photography', 'layout');
        return json({ success: true, ...result });
    } catch (error) { return failure(error); }
}
