import { Buffer } from 'node:buffer';

// The panorama viewer only needs this site's Firebase bucket, not a general proxy.
const ORIGIN = 'https://firebasestorage.googleapis.com';
const OBJECT_PATH = '/v0/b/nash-browns.firebasestorage.app/o/';
export const MAX_IMAGE_BYTES = 32 * 1024 * 1024;
const DOWNLOAD_TIMEOUT_MS = 10_000;
const IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function allowedImageUrl(value) {
    if (!value || value.length > 4096) throw new Error('Invalid URL');
    const url = new URL(value);
    if (url.origin !== ORIGIN || url.username || url.password || url.hash
        || !url.pathname.startsWith(OBJECT_PATH)) throw new Error('Untrusted source');
    const object = url.pathname.slice(OBJECT_PATH.length);
    const decoded = decodeURIComponent(object);
    if (!object || object.includes('/') || /[\u0000-\u001f\u007f\\]/u.test(decoded)
        || decoded.split('/').some(part => !part || part === '.' || part === '..')) {
        throw new Error('Invalid object');
    }
    if (url.searchParams.get('alt') !== 'media') throw new Error('Not a media request');
    for (const key of url.searchParams.keys()) {
        if (!['alt', 'token'].includes(key) || url.searchParams.getAll(key).length !== 1) {
            throw new Error('Unsupported parameter');
        }
    }
    return url.href;
}

function matchesImageType(bytes, type) {
    if (type === 'image/jpeg') return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
    if (type === 'image/png') return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    return bytes.length >= 12 && bytes.subarray(0, 4).equals(Buffer.from('RIFF'))
        && bytes.subarray(8, 12).equals(Buffer.from('WEBP'));
}

class ProxyError extends Error {
    constructor(status, message) { super(message); this.status = status; }
}

function failure(status, message) {
    return Response.json({ error: message }, {
        status,
        headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
    });
}

export async function proxyImage(request, { fetchImpl = fetch } = {}) {
    let imageUrl;
    try {
        const params = new URL(request.url).searchParams;
        if (params.getAll('url').length !== 1) throw new Error('Expected one URL');
        imageUrl = allowedImageUrl(params.get('url'));
    } catch {
        return failure(400, 'Only image downloads from this site\'s Firebase bucket are allowed.');
    }

    const controller = new AbortController();
    const cancel = () => controller.abort(request.signal.reason);
    request.signal.addEventListener('abort', cancel, { once: true });
    if (request.signal.aborted) cancel();
    let timedOut = false;
    // Keep the deadline active through the body download, not just response headers.
    const timer = setTimeout(() => { timedOut = true; controller.abort(); }, DOWNLOAD_TIMEOUT_MS);
    let reader;
    try {
        controller.signal.throwIfAborted();
        const response = await fetchImpl(imageUrl, {
            redirect: 'error',
            cache: 'no-store',
            signal: controller.signal,
            headers: { Accept: 'image/jpeg, image/png, image/webp' },
        });
        reader = response.body?.getReader();
        if (response.status !== 200 || response.redirected || !reader) {
            throw new ProxyError(502, 'Unable to download the image.');
        }
        const type = response.headers.get('content-type')?.split(';')[0].trim().toLowerCase();
        if (!IMAGE_TYPES.has(type)) throw new ProxyError(502, 'The source did not return a supported image.');
        const length = response.headers.get('content-length');
        if (length !== null && (!/^\d+$/.test(length) || Number(length) > MAX_IMAGE_BYTES)) {
            throw new ProxyError(413, 'The image exceeds the download size limit.');
        }
        const chunks = [];
        let total = 0;
        while (true) {
            controller.signal.throwIfAborted();
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            // Enforce the actual decoded body size even without Content-Length.
            if (total > MAX_IMAGE_BYTES) throw new ProxyError(413, 'The image exceeds the download size limit.');
            chunks.push(Buffer.from(value));
        }
        controller.signal.throwIfAborted();
        const bytes = Buffer.concat(chunks, total);
        if (!matchesImageType(bytes, type)) throw new ProxyError(502, 'The source did not return a supported image.');
        return new Response(bytes, {
            headers: {
                'Content-Type': type,
                'Content-Length': String(total),
                'Cache-Control': 'public, max-age=31536000, immutable',
                'X-Content-Type-Options': 'nosniff',
                'Content-Security-Policy': "default-src 'none'; sandbox",
                'Cross-Origin-Resource-Policy': 'same-origin',
            },
        });
    } catch (error) {
        if (timedOut) return failure(504, 'The image download timed out.');
        if (request.signal.aborted) return failure(499, 'The image request was cancelled.');
        if (error instanceof ProxyError) return failure(error.status, error.message);
        // Never log the upstream URL: it can contain a Firebase download token.
        return failure(502, 'Unable to download the image.');
    } finally {
        clearTimeout(timer);
        request.signal.removeEventListener('abort', cancel);
        controller.abort();
        if (reader) {
            try { await reader.cancel(); } catch { /* The upstream may already be aborted. */ }
            reader.releaseLock();
        }
    }
}
