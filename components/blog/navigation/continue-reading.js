'use server'
import Image from 'next/image';
import Link from 'next/link';
import { getSingleBlogPostMetadata } from "@/lib/next-path"
import { AddBackground } from '../../styles';

export async function ContinueReading({articleOne, articleTwo, articleThree}) {

    return(
        <>
            <div className='w-full'>
                <h2 className='text-center font-mono'>Related Articles</h2>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3 justify-between items-start w-full">
                <RelatedCard article={articleOne}/>
                <RelatedCard article={articleTwo}/>
                <RelatedCard article={articleThree}/>
            </div>
        </>
    )
}

async function RelatedCard({article}) {
    const {title, thumbnail, thumbnailIllustration, description} = await getSingleBlogPostMetadata(article);

    return(
        <div className='w-full h-full rounded-2xl overflow-hidden'>
            <AddBackground bgColor={'bg-secondary'} hasTopo={true}>
                <figure className='relative w-full h-52 my-0'>
                    <Image
                        alt={`${title} Feature Image`}
                        src={thumbnailIllustration ? thumbnailIllustration : thumbnail}
                        fill
                        sizes="(min-width: 1152px) 368px, (min-width: 768px) calc(33.333vw - 20px), calc(100vw - 32px)"
                        style={{
                            objectFit: 'cover', // cover, contain, none
                        }}
                    />
                </figure>
                <div className="flex flex-col justify-between items-start p-3">
                    <h2 className="grow mt-2 mb-1 text-slate-700 min-h-20 line-clamp-2">{title}</h2>
                    <p className='text-slate-600 font-light text-md line-clamp-4'>{description}</p>

                    <div className="grow place-self-end">
                        <Link href={article}>
                            <button className="btn btn-info">View Article</button>
                        </Link>
                    </div>
                </div>
            </AddBackground>
        </div>
    )
}
