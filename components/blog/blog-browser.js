'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { BlogCard } from './cards/blog-artical-card';

const BATCH_SIZE = 8;

const OTHER = '__other';

const CATEGORIES = [
    { label: 'Trips', tag: 'Trips' },
    { label: 'Alaska', tag: 'Alaska' },
    { label: 'Tune M1', tag: 'Tune M1' },
    { label: 'Other Shenanigans', tag: OTHER },
];

// "Other Shenanigans" catches everything that doesn't fit a real category
const REAL_CATEGORY_TAGS = CATEGORIES.filter((c) => c.tag !== OTHER).map((c) => c.tag);

function inCategory(article, tag) {
    const tags = article.tags || [];
    if (tag === OTHER) return !REAL_CATEGORY_TAGS.some((t) => tags.includes(t));
    return tags.includes(tag);
}

// Repeating mosaic pattern, one group per 4 cards
const gridItemTemplate = [
    'sm:col-span-2 sm:row-span-3',
    'sm:col-span-2 sm:row-span-1',
    'sm:col-span-1 sm:row-span-2',
    'sm:col-span-1 sm:row-span-2',

    'sm:col-span-2 sm:row-span-1',
    'sm:col-span-2 sm:row-span-3',
    'sm:col-span-1 sm:row-span-2',
    'sm:col-span-1 sm:row-span-2',
];

function getGridDems(count) {
    const blocks = Math.max(1, Math.ceil(count / 4));
    return { gridHeight: blocks * 80, gridRows: blocks * 3 };
}

function matchesQuery(article, q) {
    const haystack = [article.title, article.description, ...(article.tags || [])]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return haystack.includes(q);
}

export function BlogBrowser({ articles }) {
    const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [activeTag, setActiveTag] = useState(null);
    const sentinelRef = useRef(null);
    const loadTimerRef = useRef(null);
    // Cards at index >= this value are new this render and get the staggered entrance
    const animBaseRef = useRef(0);

    const isFiltering = query.trim().length > 0 || activeTag !== null;

    const filtered = useMemo(() => {
        let list = articles;
        if (activeTag) list = list.filter((a) => inCategory(a, activeTag));
        const q = query.trim().toLowerCase();
        if (q) list = list.filter((a) => matchesQuery(a, q));
        return list;
    }, [articles, query, activeTag]);

    // When filtering, show every match; otherwise page in batches
    const shown = isFiltering ? filtered : articles.slice(0, visibleCount);
    const hasMore = !isFiltering && visibleCount < articles.length;

    useEffect(() => {
        if (!hasMore || !sentinelRef.current) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (!entries[0].isIntersecting || loadTimerRef.current) return;
                setIsLoadingMore(true);
                loadTimerRef.current = setTimeout(() => {
                    setVisibleCount((c) => c + BATCH_SIZE);
                    setIsLoadingMore(false);
                    loadTimerRef.current = null;
                }, 600);
            },
            { rootMargin: '200px' }
        );

        observer.observe(sentinelRef.current);
        return () => {
            observer.disconnect();
            if (loadTimerRef.current) {
                clearTimeout(loadTimerRef.current);
                loadTimerRef.current = null;
                setIsLoadingMore(false);
            }
        };
    }, [hasMore]);

    // Close the drawer on Escape
    useEffect(() => {
        if (!drawerOpen) return;
        const onKey = (e) => e.key === 'Escape' && setDrawerOpen(false);
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [drawerOpen]);

    const clearFilters = () => {
        setQuery('');
        setActiveTag(null);
    };

    const { gridHeight, gridRows } = getGridDems(shown.length);
    const activeCategory = CATEGORIES.find((c) => c.tag === activeTag);

    const animBase = animBaseRef.current;
    useEffect(() => {
        animBaseRef.current = shown.length;
    }, [shown.length]);

    return (
        <div className="w-full">
            {/* active-filter summary (visible when drawer is closed too) */}
            {isFiltering && (
                <div className="flex items-center justify-center gap-3 pt-3 text-sm text-gray-600">
                    <span>
                        {shown.length} {shown.length === 1 ? 'article' : 'articles'}
                        {activeCategory ? ` in ${activeCategory.label}` : ''}
                        {query.trim() ? ` matching “${query.trim()}”` : ''}
                    </span>
                    <button onClick={clearFilters} className="underline hover:text-gray-900">
                        clear
                    </button>
                </div>
            )}

            {/* card grid */}
            <div
                className="not-prose grid grid-cols-1 sm:grid-cols-4 gap-2 justify-items-center items-center w-full p-2"
                style={{
                    gridTemplateRows: `repeat(${gridRows}, minmax(0, 1fr))`,
                    minHeight: shown.length > 0 ? `calc(${gridHeight}vh - 64px)` : undefined,
                }}
            >
                {shown.length > 0 ? (
                    shown.map((article, i) => (
                        <div
                            key={article.folder}
                            className={`blog-card-enter relative h-full w-full col-span-1 row-span-1 min-h-80 sm:min-h-0 ${gridItemTemplate[i % gridItemTemplate.length]}`}
                            style={{ animationDelay: `${Math.min(Math.max(0, i - animBase), 11) * 110}ms` }}
                        >
                            <Link href={`/blog/articles${article.folder}`}>
                                <BlogCard
                                    title={article.title}
                                    thumbnail={article.thumbnailIllustration ? article.thumbnailIllustration : article.thumbnail}
                                />
                            </Link>
                        </div>
                    ))
                ) : (
                    <div className="col-span-full flex flex-col items-center justify-center min-h-96">
                        <h2 className="text-2xl font-bold text-gray-800 mb-4">No articles found</h2>
                        <p className="text-gray-600">Try a different search or category.</p>
                    </div>
                )}
            </div>

            {/* sentinel + loading indicator */}
            {hasMore && (
                <div ref={sentinelRef} className="flex items-center justify-center gap-3 py-8 text-gray-500">
                    {isLoadingMore ? (
                        <>
                            <span className="inline-block h-5 w-5 rounded-full border-2 border-gray-400 border-t-transparent animate-spin" />
                            <span className="text-sm tracking-wide">Loading more articles…</span>
                        </>
                    ) : (
                        <span className="text-sm text-gray-400">·&nbsp;·&nbsp;·</span>
                    )}
                </div>
            )}

            {/* edge tab */}
            <button
                onClick={() => setDrawerOpen(true)}
                aria-label="Search and browse articles"
                className={`fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-2 rounded-r-lg border border-l-0 border-gray-300 bg-base-200 px-2 py-4 shadow-md transition-transform duration-300 hover:px-3 ${drawerOpen ? '-translate-x-full' : ''}`}
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="text-gray-600">
                    <circle cx="11" cy="11" r="7" />
                    <line x1="21" y1="21" x2="16.5" y2="16.5" />
                </svg>
                {isFiltering && <span className="h-1.5 w-1.5 rounded-full bg-gray-600" />}
            </button>

            {/* backdrop */}
            <div
                onClick={() => setDrawerOpen(false)}
                className={`fixed inset-0 z-40 bg-black/20 transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
            />

            {/* drawer */}
            <aside
                className={`fixed left-0 top-0 z-50 h-full w-72 sm:w-80 border-r border-gray-300 bg-base-200 shadow-2xl transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : '-translate-x-full'}`}
            >
                <div className="flex h-full flex-col gap-6 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold uppercase tracking-wide text-gray-700">Browse</h2>
                        <button onClick={() => setDrawerOpen(false)} aria-label="Close" className="text-2xl leading-none text-gray-500 hover:text-gray-800">
                            ×
                        </button>
                    </div>

                    <input
                        type="search"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Search articles…"
                        className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-800 placeholder-gray-400 focus:border-gray-500 focus:outline-none"
                    />

                    <nav className="flex flex-col gap-1">
                        <button
                            onClick={() => setActiveTag(null)}
                            className={`rounded-md px-3 py-1.5 text-left text-sm ${activeTag === null ? 'bg-gray-800 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                        >
                            All articles
                        </button>
                        {CATEGORIES.map((cat) => (
                            <button
                                key={cat.tag}
                                onClick={() => setActiveTag(activeTag === cat.tag ? null : cat.tag)}
                                className={`rounded-md px-3 py-1.5 text-left text-sm ${activeTag === cat.tag ? 'bg-gray-800 text-white' : 'text-gray-700 hover:bg-gray-200'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </nav>

                    <p className="mt-auto text-xs text-gray-400">
                        {filtered.length} of {articles.length} articles
                    </p>
                </div>
            </aside>
        </div>
    );
}
