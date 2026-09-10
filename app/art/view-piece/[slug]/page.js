import Image from 'next/image';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { fetchUnsplashImageById, parseUnsplashText } from '@/app/server-actions/unsplash';
import { generateMetadata as gmd } from '@/lib/seo';
import { UnsplashDownloader } from '@/components/blog/art/download-unsplash';

import { 
    faBitcoin,
} from '@fortawesome/free-brands-svg-icons';

export async function generateMetadata({ params }) {
    let metadata;
    const slug = (await params).slug


    //Fetch Image From Unsplash
    const unsplashData = await fetchUnsplashImageById(slug);
    const { urls, description: unsplashDescription, tags: unsplashTags, width, height } = unsplashData;
    const { title, description } = await parseUnsplashText(unsplashDescription);
    const tags = unsplashTags.map(tag => tag.title);


        metadata = gmd({
            title: title || 'Untitled',
            description,
            thumbnail: urls.regular,
            keywords: [...tags]
        });

  return {
    ...metadata
  }
}

export default async function Page({ params }) {
    const slug = (await params).slug
    
    //Fetch Image From Unsplash
    const unsplashData = await fetchUnsplashImageById(slug);
    const { id, urls, description: unsplashDescription, width, height, links } = unsplashData;
    const { title, description } = await parseUnsplashText(unsplashDescription);


    //Fetch Image From DB
    const readMoreLink = false;

    return (
        <>
            <div className="flex flex-wrap md items-center h-screen max-h-[calc(100vh-64px)]">
                <div className="bg-white w-full md:w-1/2 h-screen max-h-[calc(100vh-64px)] flex flex-col">
                    <div className="mx-32">
                        <Title title={title}/>
                        <Labels/>
                        <Description description={description} />
                        <PhotographerAttribute/>
                        {readMoreLink ? <ReadMore/> : ""}
                    </div>
                    <div className='flex justify-center gap-24 mt-auto w-full'>
                        <UnsplashDownloader imageId={id} title={title || 'Untitled'}/>
                        <Purchase/>
                    </div>
                </div>
                <div className="relative bg-red-600 w-full md:w-1/2 h-screen max-h-[calc(100vh-64px)]">
                    <Art art={urls.raw}/>
                </div>
            </div>
        </>
    )
}

export function Title({title}) {
    return(
        <h1 className="text-6xl font-bold text-black mt-16">{title || 'Untitled'}</h1>
    )
}

export function Labels({labels}) {
    //medium paint/photo/ect...
    return(
        <div className="flex mt-16 font-light text-gray-500">
            <div className="pr-4">
                <span className="uppercase">Country</span>
                <p className="text-2xl text-gray-900 font-semibold pt-2">Japan</p>
            </div>
            <div className="pr-4">
                <span className="uppercase">Region</span>
                <p className="text-2xl text-gray-900 font-semibold pt-2">Kanto</p>
            </div>
            <div className="pr-4">
                <span className="uppercase">island</span>
                <p className="text-2xl text-gray-900 font-semibold pt-2">Honshu</p>
            </div>
        </div>
    )
}

export function Description({description}) {
    return(
        <div className="w-full sm: md:w-2/3 mt-16 text-gray-500 text-sm">
            {description}
        </div>
    )
}

export function PhotographerAttribute({}) {
    return(
        <p className='text-sm text-gray-300 mt-2'>
            Photo by <a className='underline' href='https://unsplash.com/@nashbrowns'>Nash Browns</a> on <a className='underline'  href='https://unsplash.com/?utm_source=your_app_name&utm_medium=referral'>Unsplash</a>
        </p>
    )
}

export function ReadMore({readMore}) {
    return(
        <button className="uppercase mt-5 text-sm font-semibold text-gray-200 hover:underline">
            Read More
        </button>
    )
}

export function Purchase({price}) {
    //price by meduim? art -> $5 photos -> 25??
    return(
        <div className='group w-36'>
            <div className='block group-hover:hidden'>
                <button className="uppercase mt-5 text-lg font-semibold text-gray-200 hover:underline">
                    <div className='flex'>
                        <span>Purchase</span>
                    </div>
                </button>
            </div>
            <div className='hidden group-hover:block'>
                <Price/>
            </div>
        </div>
    )
}

export function Price({price}) {
    return(
        <button className="uppercase mt-5 text-lg font-semibold text-gray-200 hover:underline">
            <div className='relative h-fit w-fit'>
                <span>52,195 Satoshis</span>
                    <FontAwesomeIcon icon={faBitcoin} className='absolute h-5 w-5 -right-5 -top-1 text-orange-200'/>
            </div>
        </button>
    )
}

export function Art({art}) {
    const image = art ? art : `https://images.unsplash.com/photo-1739289354200-f5db511bd08b?q=300`;

    return(
        <div className="relative w-full h-full">
            <Image
                src={image}
                alt={"Article Featured Image"}
                style={{ objectFit: 'cover', margin: '0' }} // navbar, lineheight, paddding, padding, padding?
                fill={true}
            />
        </div>
    )
}
