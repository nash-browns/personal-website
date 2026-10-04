'use client';

import { useSearchParams } from 'next/navigation';
import { ArtNav } from './art-nav';
import { ArtCollection } from './art-collection';

export function Photos({ collections = [], initialCollectionId, initialResult = null }) {
    const searchParams = useSearchParams();
    const selectedCollection = collections.find(item => item.id === searchParams.get('collection')) || collections.find(item => item.id === 'featured') || collections[0];
    if (!selectedCollection) return <p role="status" className="px-6 py-24 text-center text-stone-400">The collections couldn’t load. Please refresh to try again.</p>;
    const { id: selected, title } = selectedCollection;

    return (
        <>
            <ArtNav collections={collections} selected={selected} title={title} />
            <ArtCollection key={selected} collectionId={selected} title={title} collections={collections} initialResult={selected === initialCollectionId ? initialResult : null} />
        </>
    );
}
