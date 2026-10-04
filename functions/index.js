import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { onObjectFinalized } from 'firebase-functions/v2/storage';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { inspectImage, webDerivative, MAX_BYTES } from './image-processing.mjs';

initializeApp();
export const processPhotographyUpload = onObjectFinalized({
    bucket: 'nash-browns.firebasestorage.app', region: 'us-central1',
    memory: '2GiB', cpu: 1, concurrency: 1, maxInstances: 2, timeoutSeconds: 540, retry: false,
}, async event => {
    const object = event.data;
    const privateObject = object.name?.match(/^photography\/private\/([A-Za-z0-9_-]+)\//);
    if (!privateObject) return;
    const db = getFirestore(), photoRef = db.collection('photos').doc(privateObject[1]);
    const bucket = getStorage().bucket(object.bucket);
    const photo = await photoRef.get();
    if (!photo.exists || photo.data().status === 'deleting') {
        // Resumable uploads and in-flight workers may finish after deletion.
        await bucket.file(object.name, { generation: object.generation }).delete({ ignoreNotFound: true });
        return;
    }
    const match = object.name?.match(/^photography\/private\/([A-Za-z0-9_-]+)\/(original|print)\/([A-Za-z0-9_-]+)\/source\.(tif|tiff|jpeg|jpg)$/);
    if (!match) return;
    const [, id, kind, version] = match;
    const ref = db.collection('photoAssets').doc(id);
    const claimed = await db.runTransaction(async tx => {
        const [doc, photo] = await tx.getAll(ref, photoRef), pending = doc.data()?.pending;
        if (!photo.exists || photo.data().status === 'deleting') return false;
        if (!pending || pending.version !== version || pending.path !== object.name || ['ready','cancelled','error'].includes(pending.status)) return false;
        if (pending.status === 'processing' && pending.leaseUntil > Date.now()) return false;
        tx.update(ref, { 'pending.status': 'processing', 'pending.leaseUntil': Date.now() + 600000, updatedAt: new Date().toISOString() });
        return true;
    });
    if (!claimed) return;
    const folder = await mkdtemp(join(tmpdir(), 'photography-'));
    try {
        if (Number(object.size) > MAX_BYTES || Number(object.size) < 1) throw new Error('File exceeds the 250 MB upload limit.');
        const file = bucket.file(object.name, { generation: object.generation });
        const source = join(folder, 'source');
        await file.download({ destination: source });
        // Originals never have permanent bearer download links.
        await file.setMetadata({ metadata: { firebaseStorageDownloadTokens: null } });
        const info = await inspectImage(source);
        const original = { ...info, bytes: (await stat(source)).size, path: object.name, version, generation: object.generation };
        let ready;
        if (kind === 'original') {
            ready = { version };
            for (const [name, size] of [['web', 2400], ['thumbnail', 1000]]) {
                const output = join(folder, `${name}.webp`);
                const derivative = await webDerivative(source, output, size);
                const path = `photography/private/${id}/previews/${version}/${name}.webp`;
                await bucket.upload(output, { destination: path, metadata: { contentType: 'image/webp', cacheControl: 'private,no-store' } });
                ready[name] = { ...derivative, path };
            }
        }
        await db.runTransaction(async tx => {
            const doc = await tx.get(ref);
            if (doc.data()?.pending?.version !== version || doc.data().pending.status === 'cancelled') return;
            tx.update(ref, { [kind === 'print' ? 'printMaster' : 'original']: original, ...(ready ? { ready } : {}), 'pending.status': 'ready', 'pending.error': '', updatedAt: new Date().toISOString() });
        });
    } catch (error) {
        await db.runTransaction(async tx => {
            const doc = await tx.get(ref);
            if (doc.data()?.pending?.version !== version || doc.data().pending.status === 'cancelled') return;
            tx.update(ref, { 'pending.status': 'error', 'pending.error': 'Image processing failed. Check the file format and size, then retry or upload a new file.', updatedAt: new Date().toISOString() });
        });
        console.error('Photography processing failed', { photoId: id, version, message: error.message });
    } finally {
        await rm(folder, { recursive: true, force: true });
        const photo = await photoRef.get();
        if (!photo.exists || photo.data().status === 'deleting') {
            await bucket.deleteFiles({ prefix: `photography/private/${id}/`, versions: true, force: true });
        }
    }
});
