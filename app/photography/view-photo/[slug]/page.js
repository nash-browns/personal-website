import { notFound } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { PhotoViewer } from '@/components/blog/art/photo-viewer';
import { Anton, Fira_Sans } from 'next/font/google';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBitcoin } from '@fortawesome/free-brands-svg-icons';
import { getPublishedPhoto, getPhotoCollections } from '@/lib/photography/public';
import { photoBackLink } from '@/lib/photography/navigation.mjs';
import { generateMetadata as gmd } from '@/lib/seo';
import { PhotoDownload } from '@/components/blog/art/photo-download';
import { PhotoPurchase } from '@/components/blog/art/photo-purchase';

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
        <div className="flex w-full flex-1 flex-col bg-[#080808] md:grid md:flex-none md:min-h-[calc(100svh-64px)] md:w-1/2 md:grid-rows-[1fr_auto_1fr]">
            <nav aria-label="Photo navigation" className={`${subheading.className} row-start-1 mx-auto w-full max-w-2xl self-start px-6 pt-3 sm:px-10 md:pt-6 lg:px-12`}>
                <Link href={back.href} className="inline-flex min-h-11 items-center gap-2 text-sm text-stone-400 transition-colors hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white"><span aria-hidden="true">←</span>{back.label}</Link>
            </nav>
            <div className="row-start-2 mx-auto w-full max-w-2xl px-6 py-4 text-left sm:px-10 md:py-8 lg:px-12">
                <h1 className={`${heading.className} text-4xl font-normal leading-tight tracking-wide text-white lg:text-5xl xl:text-6xl`}>{photo.title}</h1>
                <dl className={`${subheading.className} mt-6 flex flex-wrap gap-x-8 gap-y-5 md:mt-8`}>
                    {[['Location',photo.location],['Camera',photo.camera],['Film',photo.film]].map(([label,value])=><div key={label} className="max-w-full"><dt className="text-sm font-normal uppercase text-stone-400">{label}</dt><dd className="break-words pt-2 text-base md:overflow-x-auto md:whitespace-nowrap font-medium text-stone-100 lg:text-xl">{value || '—'}</dd></div>)}
                </dl>
            </div>
            <div className="row-start-3 mx-auto mt-auto grid w-full max-w-2xl grid-cols-2 items-start gap-2 self-end md:mt-0 md:grid-cols-[auto_minmax(0,1fr)] px-6 pb-[max(2rem,env(safe-area-inset-bottom))] pt-4 sm:gap-4 sm:px-10 md:pt-8 lg:px-12">
                    <PhotoDownload id={photo.id} title={photo.title} />
                    <PhotoPurchase headingClassName={heading.className} bodyClassName={subheading.className}>
                        <span aria-hidden="true" className="col-start-1 row-start-1 transition-opacity duration-200 group-hover:opacity-0 group-focus-visible:opacity-0 motion-reduce:transition-none">Purchase</span>
                        <span aria-hidden="true" className="col-start-1 row-start-1 flex flex-nowrap items-center justify-center gap-[0.4em] whitespace-nowrap text-[clamp(7px,3.4cqi,16px)] tracking-normal opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-visible:opacity-100 motion-reduce:transition-none">
                            <span className="inline-flex items-center gap-[0.4em] whitespace-nowrap"><span>52,195 Satoshis</span><FontAwesomeIcon icon={faBitcoin} className="h-[1.15em] w-[1.15em] text-orange-400"/></span>
                            <span>/</span>
                            <span className="inline-flex items-center gap-[0.4em] whitespace-nowrap"><span>11,483,957 Zatoshi</span><span className="h-[1.15em] w-[1.15em] shrink-0 overflow-hidden"><Image src="/z-cash-brandmark-yellow.svg" alt="" width={32} height={32} className="h-full w-full scale-[2]" /></span></span>
                        </span>
                    </PhotoPurchase>
            </div>
        </div>
        <div className="relative order-first aspect-[var(--photo-ratio)] max-h-[80svh] w-full bg-[#080808] md:order-none md:aspect-auto md:max-h-none md:min-h-0 md:w-1/2" style={{ '--photo-ratio': photo.webImage.width && photo.webImage.height ? photo.webImage.width / photo.webImage.height : 1.5 }}><PhotoViewer key={photo.webImage.url} src={photo.webImage.url} alt={photo.altText} blurDataURL={photo.webImage.blurDataURL} /></div>
    </div>;
}
