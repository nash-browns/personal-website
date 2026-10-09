// A bounded set of widths keeps CDN variants reusable across screen sizes.
export const PHOTO_WIDTHS = [256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 2400];

export function isPhotographyMedia(src) {
    return typeof src === 'string' && /^\/api\/photography\/media\/[A-Za-z0-9_-]{1,100}\/[A-Za-z0-9_-]{1,100}\/(web|thumbnail)$/.test(src);
}

export function photographyImageLoader({ src, width }) {
    const requestedWidth = PHOTO_WIDTHS.find(candidate => candidate >= width) || PHOTO_WIDTHS.at(-1);
    // Always resize from the web preview, so high-density gallery images are
    // not enlarged from the smaller thumbnail. Originals stay private.
    return `${src.replace(/\/thumbnail$/, '/web')}?w=${requestedWidth}`;
}
