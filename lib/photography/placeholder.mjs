import { createImagePlaceholder } from '../images/placeholder.mjs';

export async function withPhotoPlaceholder(image, bucket) {
    if (!image || image.blurDataURL) return image;
    // Only read the processed public preview; originals stay private.
    if (!/^photography\/public\/[A-Za-z0-9_-]+\/[A-Za-z0-9_-]+\/web\.webp$/.test(image.path)) return image;
    try {
        const maxBytes = 10 * 1024 * 1024;
        const [buffer] = await bucket.file(image.path).download({ start: 0, end: maxBytes });
        if (buffer.length > maxBytes) return image;
        return { ...image, blurDataURL: await createImagePlaceholder(buffer) };
    } catch {
        // A cosmetic preview must never prevent publication. A later save retries.
        return image;
    }
}
