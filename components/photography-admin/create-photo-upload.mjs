import { uploadFile } from '../../lib/photography/model.mjs';

// Reuse the draft across retries; no title/location form is required to start.
export async function uploadNewPhoto({ file, draft, signal, request, prepareUpload, onProgress }) {
    uploadFile({ name: file.name, size: file.size, kind: 'original' });
    let ticket;
    try {
        const startUpload = await prepareUpload();
        signal.throwIfAborted();
        if (!draft.id) {
            const result = await request('photos/new', {
                title: 'Untitled',
                location: '', camera: '', film: '', altText: '', collectionIds: [],
            });
            draft.id = result.id;
        }
        signal.throwIfAborted();
        ticket = await request(`photos/${draft.id}/upload`, { name: file.name, size: file.size, kind: 'original' });
        signal.throwIfAborted();
        const task = startUpload(ticket, file);
        const cancel = () => task.cancel();
        signal.addEventListener('abort', cancel, { once: true });
        try {
            await new Promise((resolve, reject) => task.on('state_changed', snapshot => onProgress(Math.round(snapshot.bytesTransferred / snapshot.totalBytes * 100)), reject, resolve));
        } finally { signal.removeEventListener('abort', cancel); }
        signal.throwIfAborted();
        return draft.id;
    } catch (error) {
        if (ticket) await request(`photos/${draft.id}/cancel`, { version: ticket.version }).catch(() => {});
        throw error;
    }
}
