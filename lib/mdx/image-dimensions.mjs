import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const manifestPath = path.join(root, 'data/article-image-dimensions.json');
const cacheDirectory = path.join(root, '.next/cache/article-image-dimensions');
const inFlight = new Map();
const allowedHosts = new Set(['firebasestorage.googleapis.com', 'images.unsplash.com', 'img.youtube.com']);
let active = 0;
const waiting = [];
let savedManifest;

async function limit(task) {
    if (active >= 4) await new Promise(resolve => waiting.push(resolve));
    else active++;
    try { return await task(); }
    finally {
        const next = waiting.shift();
        if (next) next();
        else active--;
    }
}

export function validateSource(src) {
    if (src.startsWith('/') && !src.startsWith('//')) {
        const publicDirectory = path.join(root, 'public');
        const filename = path.resolve(publicDirectory, '.' + decodeURIComponent(src));
        if (!filename.startsWith(publicDirectory + path.sep)) throw new Error('Image path must stay inside public/.');
        return filename;
    }
    const url = new URL(src);
    if (url.protocol !== 'https:' || !allowedHosts.has(url.hostname) || url.username || url.password || url.port) {
        throw new Error('Article image URL must use an allowed HTTPS image host.');
    }
    return url;
}

export function dimensionsFromMetadata(metadata) {
    // A GIF's pageHeight describes a frame, not a strip of all animation frames.
    const height = metadata.pageHeight ?? metadata.height;
    const rotated = [5, 6, 7, 8].includes(metadata.orientation);
    const dimensions = rotated ? { width: height, height: metadata.width } : { width: metadata.width, height };
    if (!Number.isInteger(dimensions.width) || !Number.isInteger(dimensions.height) || dimensions.width <= 0 || dimensions.height <= 0) {
        throw new Error('Image does not contain valid dimensions.');
    }
    return dimensions;
}

async function readJson(filename) {
    try { return JSON.parse(await fs.readFile(filename, 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}

async function remoteHeader(url, maxBytes) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
        const response = await fetch(url, { headers: { Range: `bytes=0-${maxBytes - 1}` }, redirect: 'error', signal: controller.signal });
        if (!response.ok) throw new Error(`Image host returned HTTP ${response.status}.`);
        const reader = response.body.getReader();
        const chunks = [];
        let size = 0;
        try {
            while (size < maxBytes) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = value.subarray(0, maxBytes - size);
                chunks.push(chunk);
                size += chunk.length;
            }
        } finally { await reader.cancel(); }
        return Buffer.concat(chunks);
    } finally { clearTimeout(timeout); }
}

export async function readImageDimensions(src, { refresh = false } = {}) {
    const location = validateSource(src);
    if (typeof location === 'string') return dimensionsFromMetadata(await sharp(location).metadata());

    const key = createHash('sha256').update(src).digest('hex');
    const cacheFile = path.join(cacheDirectory, `${key}.json`);
    if (!refresh) {
        const saved = (await (savedManifest ??= readJson(manifestPath)))?.[src] ?? await readJson(cacheFile);
        if (saved) return dimensionsFromMetadata(saved);
    }
    if (!inFlight.has(src)) {
        inFlight.set(src, limit(async () => {
            try {
                let metadata;
                for (const bytes of [256 * 1024, 4 * 1024 * 1024, 20 * 1024 * 1024]) {
                    const buffer = await remoteHeader(location, bytes);
                    try { metadata = await sharp(buffer).metadata(); break; }
                    catch (error) { if (bytes === 20 * 1024 * 1024) throw error; }
                }
                const dimensions = dimensionsFromMetadata(metadata);
                await fs.mkdir(cacheDirectory, { recursive: true });
                const temporary = `${cacheFile}.${process.pid}.tmp`;
                await fs.writeFile(temporary, JSON.stringify(dimensions));
                await fs.rename(temporary, cacheFile);
                return dimensions;
            } catch (error) {
                throw new Error(`Could not read dimensions for ${src.split('?')[0]}: ${error.message}`);
            }
        }).finally(() => inFlight.delete(src)));
    }
    return inFlight.get(src);
}
