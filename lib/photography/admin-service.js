import 'server-only';
import { randomUUID } from 'node:crypto';
import { photoDb as db, photoBucket, serialize } from './server';
import { PhotoError, validId, photoFields, uploadFile, requireRevision, validateOrder, resolvePrintMaster, text, DEFAULT_COLLECTIONS } from './model.mjs';

const now = () => new Date().toISOString();
const photoRef = id => db.collection('photos').doc(validId(id));
const collectionRef = id => db.collection('photoCollections').doc(validId(id));
const assetRef = id => db.collection('photoAssets').doc(validId(id));
function editable(doc) {
    if (!doc.exists) throw new PhotoError('Photo not found.', 404);
    if (doc.data().status === 'deleting') throw new PhotoError('This photo is being deleted. Retry deletion to finish removing it.', 409);
}

async function removePhotoFiles(id) {
    const bucket = photoBucket();
    // The trailing slash prevents a photo ID from matching another ID's prefix.
    for (const area of ['private', 'public']) {
        await bucket.deleteFiles({ prefix: `photography/${area}/${validId(id)}/`, versions: true, force: true });
    }
}

export async function deletePhoto(id, data) {
    const ref = photoRef(id), assets = assetRef(id);
    await db.runTransaction(async tx => {
        const [doc, asset] = await tx.getAll(ref, assets);
        if (!doc.exists || doc.data().status === 'deleting') return;
        requireRevision(doc.data(), data.revision);
        const ids = doc.data().collectionIds || [];
        const collections = ids.length ? await tx.getAll(...ids.map(collectionRef)) : [];
        tx.update(ref, { status: 'deleting', collectionIds: [], collectionOrder: {}, revision: doc.data().revision + 1, updatedAt: now() });
        if (asset.exists) tx.update(assets, { 'pending.status': 'cancelled', updatedAt: now() });
        collections.filter(doc => doc.exists).forEach(doc => tx.update(doc.ref, { revision: doc.data().revision + 1, updatedAt: now() }));
    });
    // Keep the locked record until storage cleanup succeeds so failures are retryable.
    await removePhotoFiles(id);
    await db.runTransaction(async tx => {
        const doc = await tx.get(ref);
        if (doc.exists && doc.data().status !== 'deleting') throw new PhotoError('The photo changed. Reload before deleting.', 409);
        tx.delete(assets);
        tx.delete(ref);
    });
    return { id };
}

function assetView(doc) {
    const asset = serialize(doc);
    return { ...asset, effectivePrintMaster: resolvePrintMaster(asset) };
}
export async function library() {
    const [photos, collections, assets] = await Promise.all(['photos', 'photoCollections', 'photoAssets'].map(name => db.collection(name).get()));
    return { photos: photos.docs.map(serialize), collections: collections.docs.map(serialize).sort((a,b) => a.sortOrder - b.sortOrder), assets: assets.docs.map(assetView) };
}
// Polling upload progress reads this one document instead of the whole library.
export async function asset(id) {
    const doc = await assetRef(id).get();
    if (!doc.exists) throw new PhotoError('Photo not found.', 404);
    return assetView(doc);
}
export async function initializeCollections() {
    await db.runTransaction(async tx => {
        const refs = DEFAULT_COLLECTIONS.map(item => collectionRef(item.id));
        const docs = await tx.getAll(...refs);
        docs.forEach((doc, index) => { if (!doc.exists) tx.create(refs[index], { title: DEFAULT_COLLECTIONS[index].title, sortOrder: index, archived: false, revision: 1, createdAt: now(), updatedAt: now() }); });
    });
}
export async function saveCollection(id, data) {
    const title = text(data.title, 'collection name', 80, true);
    if (id === 'new') {
        const ref = db.collection('photoCollections').doc();
        const all = await db.collection('photoCollections').get();
        await ref.create({ title, archived: false, sortOrder: Math.max(-1,...all.docs.map(doc => doc.data().sortOrder)) + 1, revision: 1, createdAt: now(), updatedAt: now() });
        return { id: ref.id };
    }
    await db.runTransaction(async tx => {
        const ref = collectionRef(id), doc = await tx.get(ref);
        if (!doc.exists) throw new PhotoError('Collection not found.', 404);
        requireRevision(doc.data(), data.revision);
        if (id === 'featured' && data.archived === true) throw new PhotoError('Featured is the default collection and cannot be archived.');
        tx.update(ref, { title, archived: data.archived === true, revision: doc.data().revision + 1, updatedAt: now() });
    });
    return { id };
}
export async function reorderCollections(data) {
    await db.runTransaction(async tx => {
        const snapshot = await tx.get(db.collection('photoCollections'));
        validateOrder(data.ids, snapshot.docs.map(doc => doc.id));
        snapshot.docs.forEach(doc => requireRevision(doc.data(), data.revisions?.[doc.id]));
        data.ids.forEach((id, index) => tx.update(collectionRef(id), { sortOrder: index, revision: data.revisions[id] + 1, updatedAt: now() }));
    });
}
async function publishedImage(id, photo, assets) {
    if (assets?.pending?.kind === 'original' && ['uploading', 'processing'].includes(assets.pending.status)) throw new PhotoError('Wait for the photo to finish processing before saving.');
    const ready = assets?.ready;
    if (!ready && !photo.webImage) throw new PhotoError('Wait for a web image to finish processing.');
    if (!ready || ready.version === photo.webImage?.version) return photo.webImage;
    const root = `photography/public/${id}/${ready.version}`;
    for (const kind of ['web', 'thumbnail']) {
        await photoBucket().file(ready[kind].path).copy(photoBucket().file(`${root}/${kind}.webp`));
        await photoBucket().file(`${root}/${kind}.webp`).setMetadata({ cacheControl: 'public,max-age=3600', metadata: { firebaseStorageDownloadTokens: null } });
    }
    return { version: ready.version, path: `${root}/web.webp`, thumbnailPath: `${root}/thumbnail.webp`, width: ready.web.width, height: ready.web.height,
        url: `/api/photography/media/${id}/${ready.version}/web`, thumbnailUrl: `/api/photography/media/${id}/${ready.version}/thumbnail` };
}
export async function savePhoto(id, data, { publish = false } = {}) {
    if (publish && id === 'new') throw new PhotoError('Upload a photograph first.');
    const fields = photoFields(data);
    const ref = id === 'new' ? db.collection('photos').doc() : photoRef(id);
    let webImage, preparedVersion;
    try {
    if (publish) {
        if (!fields.collectionIds.length) throw new PhotoError('Add at least one collection before saving.');
        const [photo, assets] = await Promise.all([ref.get(), assetRef(id).get()]);
        editable(photo);
        requireRevision(photo.data(), data.revision);
        preparedVersion = assets.data()?.ready?.version || null;
        webImage = await publishedImage(id, photo.data(), assets.data());
    }
    await db.runTransaction(async tx => {
        const doc = await tx.get(ref);
        if (id !== 'new') editable(doc);
        const current = doc.exists ? doc.data() : { collectionIds: [], collectionOrder: {}, status: 'draft', revision: 0 };
        if (doc.exists) requireRevision(current, data.revision);
        if (publish) {
            const assets = (await tx.get(assetRef(id))).data();
            if ((assets?.ready?.version || null) !== preparedVersion || (assets?.pending?.kind === 'original' && ['uploading', 'processing'].includes(assets.pending.status))) throw new PhotoError('The image changed while saving. Wait for processing and try again.', 409);
        }
        const collectionIds = [...new Set([...current.collectionIds, ...fields.collectionIds])];
        const collectionDocs = collectionIds.length ? await tx.getAll(...collectionIds.map(collectionRef)) : [];
        fields.collectionIds.forEach(id => {
            const collection = collectionDocs.find(doc => doc.id === id);
            if (!collection?.exists || (collection.data().archived && !current.collectionIds.includes(id))) throw new PhotoError('Choose an active collection.');
        });
        if (publish && !collectionDocs.some(doc => fields.collectionIds.includes(doc.id) && doc.exists && !doc.data().archived)) throw new PhotoError('Choose at least one active collection before saving.');
        if (current.status === 'published' && !fields.collectionIds.length) throw new PhotoError('Published photos need a collection.');
        const collectionOrder = Object.fromEntries(fields.collectionIds.map(id => [id, current.collectionOrder?.[id] ?? Date.now()]));
        const record = { ...fields, collectionOrder, ...(publish ? { status: 'published', webImage } : {}), revision: current.revision + 1, updatedAt: now() };
        if (doc.exists) tx.update(ref, record);
        else { tx.create(ref, { ...record, status: 'draft', createdAt: now() }); tx.create(assetRef(ref.id), { createdAt: now() }); }
        collectionDocs.filter(doc => doc.exists && current.collectionIds.includes(doc.id) !== fields.collectionIds.includes(doc.id)).forEach(doc => tx.update(doc.ref, { revision: doc.data().revision + 1, updatedAt: now() }));
    });
    } catch (error) {
        if (publish) {
            const current = await ref.get();
            if (!current.exists || current.data().status === 'deleting') await removePhotoFiles(id);
        }
        throw error;
    }
    return { id: ref.id };
}
export async function reorderPhotos(id, data) {
    await db.runTransaction(async tx => {
        const collection = await tx.get(collectionRef(id));
        if (!collection.exists) throw new PhotoError('Collection not found.', 404);
        requireRevision(collection.data(), data.revision);
        const photos = await tx.get(db.collection('photos').where('collectionIds', 'array-contains', id));
        validateOrder(data.ids, photos.docs.map(doc => doc.id));
        photos.docs.forEach(doc => {
            tx.update(doc.ref, { collectionOrder: { ...doc.data().collectionOrder, [id]: data.ids.indexOf(doc.id) }, revision: doc.data().revision + 1, updatedAt: now() });
        });
        tx.update(collection.ref, { revision: collection.data().revision + 1, updatedAt: now() });
    });
}
export async function beginUpload(id, data) {
    const input = uploadFile(data);
    const version = randomUUID();
    const path = `photography/private/${validId(id)}/${input.kind}/${version}/source.${input.extension}`;
    await db.runTransaction(async tx => {
        const photo = await tx.get(photoRef(id));
        editable(photo);
        tx.set(assetRef(id), { pending: { ...input, version, path, status: 'uploading', startedAt: now() }, updatedAt: now() }, { merge: true });
    });
    return { ...input, version, path, bucket: photoBucket().name };
}
export async function retryUpload(id) {
    const [doc, photo] = await Promise.all([assetRef(id).get(), photoRef(id).get()]);
    editable(photo);
    const pending = doc.data()?.pending;
    if (!pending || !['error', 'uploading', 'processing'].includes(pending.status)) throw new PhotoError('There is no upload to retry.');
    const [exists] = await photoBucket().file(pending.path).exists();
    if (!exists) throw new PhotoError('The upload did not finish. Choose the file again.');
    // A new object triggers processing without re-uploading a large original.
    const version = randomUUID();
    const path = pending.path.replace(pending.version, version);
    await db.runTransaction(async tx => {
        const [photo, asset] = await tx.getAll(photoRef(id), assetRef(id));
        editable(photo);
        if (asset.data()?.pending?.version !== pending.version) throw new PhotoError('The upload changed. Reload before retrying.', 409);
        tx.update(asset.ref, { pending: { ...pending, path, version, status: 'uploading', error: '', startedAt: now() }, updatedAt: now() });
    });
    await photoBucket().file(pending.path).copy(photoBucket().file(path));
    return { version };
}
export async function cancelUpload(id, version) {
    await db.runTransaction(async tx => {
        const ref = assetRef(id), doc = await tx.get(ref);
        if (doc.data()?.pending?.version === version) tx.update(ref, { 'pending.status': 'cancelled', updatedAt: now() });
    });
}
export async function setPhotoStatus(id, data) {
    if (!['draft','published','archived'].includes(data.status)) throw new PhotoError('Invalid photo status.');
    const ref = photoRef(id);
    const [photoDoc, assetsDoc] = await Promise.all([ref.get(), assetRef(id).get()]);
    editable(photoDoc);
    const photo = photoDoc.data(), assets = assetsDoc.data();
    requireRevision(photo, data.revision);
    let webImage = photo.webImage;
    try {
    if (data.status === 'published') {
        if (!photo.title || !photo.collectionIds.length) throw new PhotoError('Add a title and at least one collection before publishing.');
        webImage = await publishedImage(id, photo, assets);
    }
    await db.runTransaction(async tx => {
        const current = await tx.get(ref);
        editable(current);
        requireRevision(current.data(), data.revision);
        if (data.status === 'published') {
            const collections = await tx.getAll(...photo.collectionIds.map(collectionRef));
            if (!collections.some(doc => doc.exists && !doc.data().archived)) throw new PhotoError('Choose at least one active collection before publishing.');
        }
        tx.update(ref, { status: data.status, ...(webImage ? { webImage } : {}), revision: photo.revision + 1, updatedAt: now() });
    });
    } catch (error) {
        // A publish that started before deletion must not leave late public copies.
        const current = await ref.get();
        if (!current.exists || current.data().status === 'deleting') await removePhotoFiles(id);
        throw error;
    }
}
