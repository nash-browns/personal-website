'use client'

import { useEffect, useRef } from 'react'
import { recordArticleView } from '@/lib/server-actions/record-article-view'

/*
 * Fires the partner view counter after the page has loaded in the browser.
 * This used to be an awaited Firestore write in app/blog/layout.js, which both
 * blocked every article's HTML response and forced dynamic rendering.
 */
export function PageViewTracker({ contentId }) {
    const lastContentId = useRef(null)
    useEffect(() => {
        // React Strict Mode can replay effects for the same mounted page.
        if (!contentId || lastContentId.current === contentId) return
        lastContentId.current = contentId
        recordArticleView(contentId).catch(() => {})
    }, [contentId])

    return null
}
