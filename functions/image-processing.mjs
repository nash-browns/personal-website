import sharp from 'sharp';
export const MAX_BYTES = 250 * 1024 * 1024;
export const MAX_PIXELS = 200_000_000;
export async function inspectImage(input) {
    const info = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).metadata();
    if (!['jpeg', 'tiff'].includes(info.format)) throw new Error('The file must contain a JPEG or TIFF image.');
    if ((info.pages || 1) !== 1) throw new Error('Please export a single-image TIFF, not a multi-page file.');
    if (!info.width || !info.height || info.width * info.height > MAX_PIXELS) throw new Error('This image exceeds the 200-megapixel processing limit.');
    return { width: info.width, height: info.height, format: info.format, orientation: info.orientation || 1 };
}
export async function webDerivative(input, output, size) {
    // autoOrient and a fresh sRGB export retain neither source EXIF nor GPS.
    const info = await sharp(input, { limitInputPixels: MAX_PIXELS, failOn: 'error' }).autoOrient().resize({ width: size, height: size, fit: 'inside', withoutEnlargement: true }).toColourspace('srgb').webp({ quality: 85 }).toFile(output);
    return { width: info.width, height: info.height, bytes: info.size, contentType: 'image/webp' };
}
