'use server'

import { addContentDocument as aC, incrementContentDocumentField } from "@/lib/firebase/firestore"

// Called from the client after an article loads (see components/seo/page-view-tracker.js).
// Only partner articles have a content document, so a missing doc just means
// there is nothing to count.
export async function recordArticleView(contentId) {
    if (!contentId || typeof contentId !== 'string' || contentId.length > 128) return false

    try {
        await incrementContentDocumentField({
            contentId,
            incrementAmount: 1,
            fields: ['views'],
        })
        return true
    } catch (error) {
        console.log('Error incrementing page counter:', error)
        return false
    }
}

//CREATE DATA
export async function addContentDocument(contentData) {

    console.log('adding content');

    // const { 
    // 
    // } = contentData;

    await aC(contentData);

}

