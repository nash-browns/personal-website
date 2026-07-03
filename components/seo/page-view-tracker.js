'use client'

import { useEffect } from 'react'
import { recordArticleView } from '@/lib/server-actions/firebase/firestore/content'

/*
 * Fires the partner view counter after the page has loaded in the browser.
 * This used to be an awaited Firestore write in app/blog/layout.js, which both
 * blocked every article's HTML response and forced dynamic rendering.
 */
export function PageViewTracker({ contentId }) {
    useEffect(() => {
        if (!contentId) return
        recordArticleView(contentId).catch(() => {})
    }, [contentId])

    return null
}
