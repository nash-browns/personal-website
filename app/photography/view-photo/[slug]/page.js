import { notFound } from 'next/navigation';
import Link from 'next/link';
import { PhotoViewer } from '@/components/blog/art/photo-viewer';
import { Anton, Fira_Sans } from 'next/font/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBitcoin } from '@fortawesome/free-brands-svg-icons';
import { getPublishedPhoto, getPhotoCollections } from '@/lib/photography/public';
import { photoBackLink } from '@/lib/photography/navigation.mjs';
import { generateMetadata as gmd } from '@/lib/seo';
import { PhotoDownload } from '@/components/blog/art/photo-download';

const heading = Anton({ weight: '400', subsets: ['latin'] });
const subheading = Fira_Sans({ weight: ['400', '500'], subsets: ['latin'] });
async function loadPhoto(params) {
    const id = (await params).slug;
    if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) notFound();
    const photo = await getPublishedPhoto(id);
    if (!photo) notFound();
    return photo;
}
export async function generateMetadata({ params }) {
    const photo = await loadPhoto(params);
    return gmd({ title: photo.title, description: photo.altText, thumbnail: photo.webImage.url, url: `/photography/view-photo/${photo.id}` });
}
export default async function Page({ params, searchParams }) {
    const [photo, collections, query] = await Promise.all([loadPhoto(params), getPhotoCollections().catch(() => []), searchParams]);
    const back = photoBackLink(photo, collections, query?.collection);
    return <div className="flex min-h-[calc(100svh-64px)] flex-col bg-[#080808] text-stone-100 md:flex-row">
        <div className="grid min-h-[calc(100svh-64px)] w-full grid-rows-[1fr_auto_1fr] bg-[#080808] md:w-1/2">
            <nav aria-label="Photo navigation" className={`${subheading.className} row-start-1 mx-auto w-full max-w-2xl self-start px-6 pt-6 sm:px-10 lg:px-12`}>
                <Link href={back.href} className="inline-flex min-h-11 items-center gap-2 text-sm text-stone-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><span aria-hidden="true">←</span>{back.label}</Link>
            </nav>
            <div className="row-start-2 mx-auto w-full max-w-2xl px-6 py-8 text-left sm:px-10 lg:px-12">
                <h1 className={`${heading.className} text-4xl font-normal leading-tight tracking-wide text-white lg:text-5xl xl:text-6xl`}>{photo.title}</h1>
                <dl className={`${subheading.className} mt-8 flex flex-wrap gap-x-8 gap-y-5`}>
                    {[['Location',photo.location],['Camera',photo.camera],['Film',photo.film]].map(([label,value])=><div key={label} className="max-w-full"><dt className="text-sm font-normal uppercase text-stone-400">{label}</dt><dd className="overflow-x-auto whitespace-nowrap pt-2 text-base font-medium text-stone-100 lg:text-xl">{value || '—'}</dd></div>)}
                </dl>
            </div>
            <div className="row-start-3 mx-auto flex w-full max-w-2xl flex-wrap justify-start gap-4 self-end px-6 pb-8 pt-8 sm:px-10 lg:px-12">
                    <PhotoDownload id={photo.id} title={photo.title} />
                    <button type="button" aria-label="Purchase" title="Print purchasing is coming soon" className="group inline-flex min-h-12 w-48 items-center justify-center rounded px-4 py-3 text-sm font-semibold uppercase tracking-wide text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
                        <span className="group-hover:hidden group-focus-visible:hidden">Purchase</span><span className="hidden items-center gap-2 group-hover:inline-flex group-focus-visible:inline-flex"><span>52,195 Satoshis</span><FontAwesomeIcon icon={faBitcoin} className="h-4 w-4 text-orange-400"/></span>
                    </button>
            </div>
        </div>
        <div className="relative min-h-[70svh] w-full bg-[#080808] md:min-h-0 md:w-1/2"><PhotoViewer key={photo.webImage.url} src={photo.webImage.url} alt={photo.altText} /></div>
    </div>;
}
