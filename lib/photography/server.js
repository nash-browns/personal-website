import 'server-only';
import { cookies } from 'next/headers';
import { getStorage } from 'firebase-admin/storage';
import { adminDb } from '@/lib/firebase/admin';
import { readServerUser } from '@/lib/firebase/server-session';
import { isOwner, PhotoError } from './model.mjs';

export { adminDb as photoDb };
export function photoBucket() {
    const name = process.env.PHOTOGRAPHY_STORAGE_BUCKET || process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
    if (!name) throw new PhotoError('Photography storage is not configured.', 503);
    return getStorage().bucket(name);
}
export async function requirePhotoOwner() {
    const user = await readServerUser(await cookies());
    if (!user) throw new PhotoError('Please sign in.', 401);
    if (!isOwner(user)) throw new PhotoError('This account does not have photography admin access.', 403);
    return user;
}
export function requireSameOrigin(request) {
    const origin = request.headers.get('origin');
    const expected = new URL(request.url);
    expected.host = request.headers.get('host') || expected.host;
    if (origin !== expected.origin) throw new PhotoError('Invalid request origin.', 403);
}
export function serialize(doc) {
    return JSON.parse(JSON.stringify({ ...doc.data(), id: doc.id }));
}
