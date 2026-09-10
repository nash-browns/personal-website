'use server';

import { adminDb } from '@/lib/firebase/admin';
import { FieldValue } from 'firebase-admin/firestore';
import { getSingleBlogPostMetadata } from '@/lib/next-path';

export async function recordArticleView(contentId) {
    if (typeof contentId !== 'string' || contentId.length > 128 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(contentId)) return false;
    try {
        // This public action can only increment a published partner article, never
        // arbitrary content IDs, fields, or amounts supplied by the browser.
        const post = await getSingleBlogPostMetadata(`blog/articles/${contentId}`);
        if (!post?.isActive || !Array.isArray(post.partners) || post.partners.length === 0) return false;
        const reference = adminDb.collection('content').doc(contentId);
        return await adminDb.runTransaction(async transaction => {
            const snapshot = await transaction.get(reference);
            if (!snapshot.exists) return false;
            const content = snapshot.data();
            if (content.type !== 'blog' || !Array.isArray(content.tenant)
                || !content.tenant.some(tenant => post.partners.some(partner => String(partner) === String(tenant)))) return false;
            transaction.update(reference, { views: FieldValue.increment(1) });
            return true;
        });
    } catch (error) {
        console.error('Unable to record article view:', error.code || error.message);
        return false;
    }
}
