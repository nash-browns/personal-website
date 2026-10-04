'use server';
import { getCollectionPhotos } from '@/lib/photography/public';
export async function getPhotographyPhotos(collectionId, page = 1) {
    try { return await getCollectionPhotos(collectionId, page); }
    catch { return { error: true }; }
}
