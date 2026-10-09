import sharp from 'sharp';

const MAX_SOURCE_BYTES = 10 * 1024 * 1024;

// Process-local cache only: the route must check current publication before
// using it. Versioned file paths are immutable, even across archive/republish.
export function createPreviewCache({ maxBytes = 64 * 1024 * 1024, maxEntries = 128 } = {}) {
    const entries = new Map(), pending = new Map();
    let bytes = 0;
    return async function get(key, load) {
        if (entries.has(key)) {
            const value = entries.get(key);
            entries.delete(key);
            entries.set(key, value);
            return value;
        }
        if (pending.has(key)) return pending.get(key);
        const work = Promise.resolve().then(load).then(value => {
            if (value.byteLength <= maxBytes) {
                while (entries.size && (bytes + value.byteLength > maxBytes || entries.size >= maxEntries)) {
                    const oldest = entries.keys().next().value;
                    bytes -= entries.get(oldest).byteLength;
                    entries.delete(oldest);
                }
                entries.set(key, value);
                bytes += value.byteLength;
            }
            return value;
        }).finally(() => pending.delete(key));
        pending.set(key, work);
        return work;
    };
}

const cached = createPreviewCache();
let active = 0;
const waiting = [];
async function limited(task) {
    if (active >= 4) {
        if (waiting.length >= 32) throw new Error('Preview processing is busy.');
        await new Promise(resolve => waiting.push(resolve));
    } else active++;
    try { return await task(); }
    finally {
        const next = waiting.shift();
        if (next) next();
        else active--;
    }
}

export async function resizePreview(source, width) {
    const image = sharp(source, { limitInputPixels: 20_000_000, failOn: 'error' });
    const metadata = await image.metadata();
    if (metadata.format !== 'webp' || (metadata.pages || 1) !== 1) throw new Error('Invalid web preview.');
    if (metadata.width <= width) return source;
    return image.resize({ width, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer();
}

export function getPreviewBytes(bucket, path, width) {
    return cached(`${path}:w${width || 'source'}:v1`, () => limited(async () => {
        const source = await cached(path, async () => {
            const [bytes] = await bucket.file(path).download({ start: 0, end: MAX_SOURCE_BYTES });
            if (bytes.byteLength > MAX_SOURCE_BYTES) throw new Error('Web preview exceeds size limit.');
            return bytes;
        });
        return width ? resizePreview(source, width) : source;
    }));
}
