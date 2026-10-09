export const OWNER_EMAIL = 'nashb1323@gmail.com';
export const OWNER_UID = 'bVcYU2LVoKUoTjxzFdH8jZHI0GD2';
export const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;
export const DEFAULT_COLLECTIONS = [
    { id: 'featured', title: 'Featured', sortOrder: 0 },
    { id: 'arizona', title: 'Arizona', sortOrder: 1 },
    { id: 'kansas_city', title: 'Kansas City', sortOrder: 2 },
];
export class PhotoError extends Error {
    constructor(message, status = 400) { super(message); this.status = status; }
}
export function isOwner(user) {
    return !!user && user.uid === OWNER_UID && user.email === OWNER_EMAIL && user.emailVerified === true;
}
export function validId(value) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]{1,100}$/.test(value)) throw new PhotoError('Invalid identifier.');
    return value;
}
export function text(value, name, max = 200, required = false) {
    if (typeof value !== 'string' || value.length > max || (required && !value.trim())) throw new PhotoError(`Please enter a valid ${name}.`);
    return value.trim();
}
export function photoFields(data) {
    if (!Array.isArray(data.collectionIds) || data.collectionIds.length > 50) throw new PhotoError('Choose up to 50 collections.');
    return {
        title: text(data.title, 'title', 200, true),
        location: text(data.location || '', 'location'),
        camera: text(data.camera || '', 'camera'),
        film: text(data.film || '', 'film'),
        altText: text(data.altText || '', 'alt text', 1000),
        collectionIds: [...new Set(data.collectionIds.map(validId))],
    };
}
export function uploadFile(data) {
    const name = text(data.name, 'filename', 250, true);
    const extension = name.split('.').pop().toLowerCase();
    if (!['tif', 'tiff', 'jpg', 'jpeg'].includes(extension)) throw new PhotoError('Choose a TIFF or JPEG file.');
    if (!Number.isSafeInteger(data.size) || data.size < 1 || data.size > MAX_UPLOAD_BYTES) throw new PhotoError('Files must be between 1 byte and 250 MB.');
    if (!['original', 'print'].includes(data.kind)) throw new PhotoError('Choose an original or print master.');
    return { name, size: data.size, kind: data.kind, extension, contentType: ['tif', 'tiff'].includes(extension) ? 'image/tiff' : 'image/jpeg' };
}
export function requireRevision(current, expected) {
    if (!Number.isSafeInteger(expected) || current.revision !== expected) throw new PhotoError('This record changed in another tab. Reload before saving.', 409);
}
export function validateOrder(ids, currentIds) {
    if (!Array.isArray(ids) || ids.length !== currentIds.length || new Set(ids).size !== ids.length || ids.some(id => !currentIds.includes(id))) throw new PhotoError('The list changed. Reload before saving its order.', 409);
    if (ids.length > 400) throw new PhotoError('Ordering supports up to 400 items per collection.');
    return ids;
}
// Keep a single full-quality file unless an explicit print-specific override exists.
// Resolve at read time so existing originals and replacement uploads work too.
export function resolvePrintMaster(asset) {
    return asset?.printMaster || asset?.original || null;
}
export function photoAltText(photo) {
    return photo.altText?.trim() || `${photo.title} is a photograph created by Nash Browns`;
}
export function publicPhoto(id, photo) {
    return { id, title: photo.title, location: photo.location || '', camera: photo.camera || '', film: photo.film || '', altText: photoAltText(photo),
        width: photo.webImage?.width, height: photo.webImage?.height,
        webImage: photo.webImage ? { url: photo.webImage.url, thumbnailUrl: photo.webImage.thumbnailUrl, width: photo.webImage.width, height: photo.webImage.height,
            ...(photo.webImage.blurDataURL ? { blurDataURL: photo.webImage.blurDataURL } : {}) } : null };
}
