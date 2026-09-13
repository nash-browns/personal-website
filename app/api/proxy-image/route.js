import { proxyImage } from '@/lib/images/proxy-image.mjs';

export async function GET(request) {
    return proxyImage(request);
}
