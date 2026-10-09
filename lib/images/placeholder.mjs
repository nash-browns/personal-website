import sharp from 'sharp';

// Run during content preparation/publishing, never on a public page request.
export async function createImagePlaceholder(input) {
    const buffer = await sharp(input, { limitInputPixels: 20_000_000, failOn: 'error' })
        .autoOrient().resize({ width: 8, height: 8, fit: 'inside', withoutEnlargement: true })
        .toColourspace('srgb').webp({ quality: 30 }).toBuffer();
    const data = `data:image/webp;base64,${buffer.toString('base64')}`;
    if (data.length > 512) throw new Error('Image placeholder exceeds its size budget.');
    return data;
}
