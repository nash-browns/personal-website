import { Suspense } from 'react';
import { Fira_Sans } from 'next/font/google';
import { generateMetadata } from '@/lib/seo';
import { Photos } from '@/components/blog/art/photos';
import { ArtLoading } from '@/components/blog/art/art-collection';
import { getPhotoCollections, getCollectionPhotos } from '@/lib/photography/public';

const body = Fira_Sans({ weight: ['400', '500'], subsets: ['latin'] });

export const metadata = generateMetadata({
    title: 'Photography',
    description: 'Photography by Nash Bostwick.',
    index: true,
});

export default async function PhotographyHome() {
    const collections = await getPhotoCollections().catch(() => []);
    const selected = collections.find(item => item.id === 'featured') || collections[0];
    const initialResult = selected ? await getCollectionPhotos(selected.id).catch(() => ({ error: true })) : null;

    return (
        <main id="photography-top" className={`${body.className} min-h-[calc(100svh-64px)] bg-[#080808] text-stone-100`}>
            <h1 className="sr-only">Photography by Nash Browns</h1>
            <Suspense fallback={<ArtLoading />}>
                <Photos collections={collections} initialCollectionId={selected?.id} initialResult={initialResult} />
            </Suspense>
        </main>
    );
}
