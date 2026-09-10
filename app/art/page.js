import { generateMetadata } from '@/lib/seo';
import { readFiles } from "@/lib/next-path"
import { ArtNav } from '@/components/blog/art/art-nav';
import { Photos } from '@/components/blog/art/photos';
import { getMyUnsplashCollections } from "../server-actions/unsplash";

export const metadata = generateMetadata({
    title: 'Art',
    description: 'Photography and artwork by Nash Bostwick.',
    index: true,
});

export default async function ArtHome() {
    const collections = await getMyUnsplashCollections();
    const simplifiedCollections = collections.map(({ id, title }) => ({ id, title }));

    return(
        <div className="flex">
            <ArtNav collections={simplifiedCollections}/>
            <Photos/>
        </div>
    )
}

