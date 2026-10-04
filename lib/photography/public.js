import 'server-only';
import { unstable_cache } from 'next/cache';
import { photoDb } from './server';
import { publicPhoto, validId } from './model.mjs';

export const getPhotoCollections = unstable_cache(async () => {
    const [collections, photos] = await Promise.all([photoDb.collection('photoCollections').get(), photoDb.collection('photos').where('status', '==', 'published').get()]);
    return collections.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(item => !item.archived)
        .sort((a, b) => a.sortOrder - b.sortOrder || a.id.localeCompare(b.id))
        .map(item => ({ id: item.id, title: item.title, total_photos: photos.docs.filter(doc => doc.data().collectionIds?.includes(item.id)).length }));
}, ['photography-collections'], { tags: ['photography'], revalidate: 60 });

export const getPublishedPhoto = unstable_cache(async id => {
    validId(id);
    const doc = await photoDb.collection('photos').doc(id).get();
    const data = doc.data();
    return doc.exists && data.status === 'published' && data.webImage ? { ...publicPhoto(doc.id, data), collectionIds: data.collectionIds || [] } : null;
}, ['photography-photo'], { tags: ['photography'], revalidate: 60 });

export const getCollectionPhotos = unstable_cache(async (id, page = 1) => {
    validId(id);
    if (!Number.isSafeInteger(page) || page < 1) throw new Error('Invalid page');
    const collection = await photoDb.collection('photoCollections').doc(id).get();
    if (!collection.exists || collection.data().archived) return { photos: [], hasMore: false };
    // Membership is indexed automatically. Sorting here avoids requiring a new
    // composite index every time the owner creates a collection.
    const result = await photoDb.collection('photos').where('collectionIds', 'array-contains', id).get();
    const photos = result.docs.map(doc => ({ ...doc.data(), id: doc.id })).filter(item => item.status === 'published' && item.webImage)
        .sort((a, b) => (a.collectionOrder?.[id] ?? 0) - (b.collectionOrder?.[id] ?? 0) || a.id.localeCompare(b.id));
    const start = (page - 1) * 30;
    return { photos: photos.slice(start, start + 30).map(photo => publicPhoto(photo.id, photo)), hasMore: photos.length > start + 30 };
}, ['photography-collection-photos'], { tags: ['photography'], revalidate: 60 });
