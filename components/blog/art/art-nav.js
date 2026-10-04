'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';

export function ArtNav({ collections, selected, title }) {
    const dialogRef = useRef(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!open) return;
        const previous = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => { document.body.style.overflow = previous; };
    }, [open]);

    function showCollections() {
        dialogRef.current.showModal();
        setOpen(true);
    }

    function closeCollections() {
        dialogRef.current.close();
    }

    return (
        <>
            <button type="button" onClick={showCollections} aria-label={`Browse photography collections. Currently showing ${title}.`} title="Browse collections" aria-haspopup="dialog" aria-controls="art-collections" aria-expanded={open} className="fixed left-0 top-1/2 z-40 flex min-h-14 min-w-11 -translate-y-1/2 items-center justify-center rounded-r-lg border border-l-0 border-stone-800 bg-black text-white shadow-sm transition-colors hover:bg-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">
                <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /></svg>
                <span aria-hidden="true" className="absolute bottom-2 h-1 w-1 rounded-full bg-white" />
            </button>
            <dialog ref={dialogRef} id="art-collections" aria-labelledby="art-collections-title" onClose={() => setOpen(false)} onClick={event => { if (event.target === event.currentTarget) closeCollections(); }} className="fixed inset-y-0 left-0 right-auto m-0 h-dvh max-h-none w-80 max-w-[90vw] border-r border-stone-800 bg-black p-0 text-white shadow-xl backdrop:bg-black/40">
                <div className="flex min-h-full flex-col gap-8 p-6">
                    <div className="flex items-center justify-between gap-4">
                        <h2 id="art-collections-title" className="text-lg font-medium">Browse photographs</h2>
                        <button type="button" onClick={closeCollections} aria-label="Close collections" className="flex h-11 w-11 shrink-0 items-center justify-center text-3xl font-normal hover:bg-stone-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-white">×</button>
                    </div>
                    <nav aria-label="Photography collections" className="flex flex-col gap-1">
                        {collections.map(collection => (
                            <Link key={collection.id} href={`/photography?collection=${encodeURIComponent(collection.id)}`} onClick={closeCollections} aria-current={selected === collection.id ? 'page' : undefined} className={`flex min-h-12 items-center justify-between gap-4 rounded-sm px-3 py-3 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${selected === collection.id ? 'bg-stone-800 text-white' : 'hover:bg-stone-900'}`}>
                                <span>{collection.title}</span>
                                {Number.isFinite(collection.total_photos) && <span className="tabular-nums">{String(collection.total_photos).padStart(2, '0')}</span>}
                            </Link>
                        ))}
                    </nav>
                    <p className="mt-auto border-t border-stone-800 pt-5 text-xs leading-relaxed text-white">Photography by Nash Browns.<br />Choose a collection and take a look around.</p>
                </div>
            </dialog>
        </>
    );
}
