import sharp from 'sharp';
import path from 'path';

export async function getImageDimensions(image) {
    const local = false;

    const imagePathLocal = path.join(process.cwd(), 'public/hippy-hokusai-logo.png');
    // const imagePathExternal = `https://images.unsplash.com/photo-1739104627818-d9159a7daa8d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`;
    // const imagePathExternal = `https://images.unsplash.com/photo-1739317588560-ba14d976ff79?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`;
    // const imagePathExternal = `https://images.unsplash.com/photo-1739317588560-ba14d976ff79?q=80&w=3000&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D`;
    const imagePathExternal = image

    try {
        if (local) {
            // Process local file directly
            const metadata = await sharp(imagePathLocal).metadata();
            console.log(`Local Image - Width: ${metadata.width}, Height: ${metadata.height}`);
            return metadata;
        } else {
            // Fetch remote image as a buffer using fetch
            const response = await fetch(imagePathExternal);
            if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);

            const arrayBuffer = await response.arrayBuffer();
            const imageBuffer = Buffer.from(arrayBuffer);

            // Process the buffer with sharp
            const metadata = await sharp(imageBuffer).metadata();
            console.log(`External Image - Width: ${metadata.width}, Height: ${metadata.height}`);
            return metadata;
        }
    } catch (error) {
        console.error('Error reading image dimensions:', error);
    }
}
