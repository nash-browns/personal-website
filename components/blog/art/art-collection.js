'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useEffect, useState } from 'react';
import hippyHokusaiLogo from '@/public/hippy-hokusai-logo-dark.png';
import { getPhotographyPhotos } from '@/app/server-actions/photography';
import { ArtworkImage } from './artwork-image';
import styles from './contact-sheet.module.css';

export function ArtLoading() {
    return (
        <div role="status" className="min-h-[calc(100svh-64px)] bg-[#080808]">
            <span className="sr-only">Loading photographs…</span>
        </div>
    );
}

export function ArtCollection({ collectionId, title, collections = [], initialResult = null }) {
    const [result, setResult] = useState(initialResult);
    const [attempt, setAttempt] = useState(0);
    const [page, setPage] = useState(1);
    const [loadingMore, setLoadingMore] = useState(false);
    const [moreError, setMoreError] = useState(false);

    useEffect(() => {
        if (initialResult && attempt === 0) return;
        let cancelled = false;
        getPhotographyPhotos(collectionId).then(data => {
            if (!cancelled) setResult(data);
        }).catch(() => {
            if (!cancelled) setResult({ error: true });
        });
        return () => { cancelled = true; };
    }, [collectionId, initialResult, attempt]);

    async function loadMore() {
        setLoadingMore(true);
        setMoreError(false);
        try {
            const next = await getPhotographyPhotos(collectionId, page + 1);
            if (next.error) throw new Error('Photos unavailable');
            setResult(current => ({
                ...next,
                photos: [...current.photos, ...next.photos.filter(photo => !current.photos.some(existing => existing.id === photo.id))],
            }));
            setPage(current => current + 1);
        } catch {
            setMoreError(true);
        } finally {
            setLoadingMore(false);
        }
    }

    if (!result) return <ArtLoading />;
    if (result.error) return (
        <section role="alert" className="px-6 py-24 text-center">
            <h2 className="text-2xl">The photographs couldn’t load.</h2>
            <p className="mt-3 text-sm text-stone-400">Please try again in a moment.</p>
            <button type="button" onClick={() => { setResult(null); setAttempt(value => value + 1); }} className="mt-6 min-h-11 border border-stone-400 px-6 py-2 text-sm hover:bg-stone-800">Try again</button>
        </section>
    );
    if (!result.photos.length) return (
        <section aria-label={title} className="flex min-h-[calc(100svh-64px)] flex-col items-center justify-center gap-6 px-6 py-10 text-center">
            <h2 className="sr-only">{title} has no photographs yet. Explore a collection below.</h2>
            <div className="w-full max-w-[min(500px,55svh)] overflow-hidden">
                <Image
                    src={hippyHokusaiLogo}
                    alt="Nash Browns Hippy Hokusai logo"
                    width={500}
                    height={500}
                    sizes="(max-width: 548px) calc(100vw - 48px), 500px"
                    className="h-auto w-full motion-safe:animate-spin-smooth"
                    preload
                />
            </div>
            <nav aria-label="Explore photography collections" className="flex flex-wrap justify-center gap-x-6 gap-y-2 sm:gap-x-10">
                {collections.map(collection => (
                    <Link key={collection.id} href={`/photography?collection=${encodeURIComponent(collection.id)}`} aria-current={collection.id === collectionId ? 'page' : undefined} className={`inline-flex min-h-11 items-center border-b text-sm text-white transition-colors hover:border-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white ${collection.id === collectionId ? 'border-white' : 'border-transparent'}`}>{collection.title}</Link>
                ))}
            </nav>
        </section>
    );

    return (
        <section aria-label={title} className="flex min-h-[calc(100svh-64px)] flex-col">
            <div className={styles.sheet}>
                {result.photos.map((photo, index) => {
                    const name = photo.title || 'Untitled photograph';
                    const frameNumber = String(index + 1).padStart(2, '0');
                    const collection = { id: collectionId, title };
                    return (
                        <figure key={photo.id} className={styles.frame}>
                            <div className={styles.filmTop} aria-hidden="true">
                                <span>{frameNumber}</span><span className={styles.filmTitle} title={name}>{name}</span><span>▸</span>
                            </div>
                            <Link href={`/photography/view-photo/${photo.id}?collection=${encodeURIComponent(collectionId)}`} prefetch={false} aria-label={`View ${name}`} className={styles.exposure}>
                                <div className={photo.height > photo.width ? styles.portrait : styles.landscape}>
                                    <ArtworkImage
                                        key={photo.webImage.thumbnailUrl || photo.webImage.url}
                                        src={photo.webImage.thumbnailUrl || photo.webImage.url}
                                        alt={photo.altText || name}
                                        blurDataURL={photo.webImage.blurDataURL}
                                        sizes={photo.height > photo.width
                                            ? '(min-width: 1800px) calc(13.333vw - 9.6px), (min-width: 900px) calc(22.222vw - 10.667px), calc(33.333vw - 8px)'
                                            : '(min-width: 1800px) calc(20vw - 14.4px), (min-width: 900px) calc(33.333vw - 16px), calc(50vw - 12px)'}
                                        loading={index < 2 ? 'eager' : 'lazy'}
                                        fetchPriority={index === 0 ? 'high' : undefined}
                                        film
                                    />
                                </div>
                                <span className={styles.photoTitle}>{name}<span aria-hidden="true"> ↗</span></span>
                            </Link>
                            <figcaption className={styles.filmBottom}>
                                <span className={styles.frameNumber} aria-hidden="true">{frameNumber}A</span>
                                <span className="sr-only">{name}. Photo by </span>
                                <span className={styles.credit}>Nash Browns</span>
                                <span className="sr-only"> · Collection: </span>
                                <Link href={`/photography?collection=${encodeURIComponent(collection.id)}`} prefetch={false} className={`${styles.credit} ${styles.collectionName}`} title={collection.title}>{collection.title}</Link>
                            </figcaption>
                        </figure>
                    );
                })}
            </div>
            {moreError && <p role="alert" className="px-5 text-center text-sm">More photographs couldn’t load. Please try again.</p>}
            {result.hasMore && <div className="py-8 text-center"><button type="button" onClick={loadMore} disabled={loadingMore} className="min-h-12 border border-stone-400 px-6 py-3 text-sm hover:bg-stone-800 disabled:opacity-50">{loadingMore ? 'Loading…' : moreError ? 'Try again' : 'More photographs'}</button></div>}
            <footer className="mt-auto flex flex-wrap items-center justify-between gap-4 px-5 py-4 text-xs text-stone-400 sm:px-7">
                <p>{result.photos.length} {result.photos.length === 1 ? 'photograph' : 'photographs'}{result.hasMore ? ' shown' : ''} · {title}</p>
                <a href="#photography-top" className="flex min-h-11 items-center gap-3 hover:text-white">Back to top <span aria-hidden="true">↑</span></a>
            </footer>
        </section>
    );
}
