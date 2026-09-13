import Image from 'next/image';

import { ThreeSixtyImage } from '../images/three-sixty-image-lazy'

export function ImageFeature({ title, image, alt, threeSixty=false, video=false }) {
    return(
        <div className="flex flex-col bg-neutral-800 w-full h-[calc(100svh-64px)]">
            {/* Let media shrink so its canvas cannot push the title out of the header. */}
            <div className='relative flex min-h-0 flex-1 items-center justify-center w-full'>
                {
                    threeSixty ? 
                        <ThreeSixtyImage image={image}/> :
                        video ?
                            <video
                                className="absolute top-0 left-0 w-full h-full object-cover m-0"
                                autoPlay
                                loop
                                muted
                                playsInline
                            >
                                <source src={image} type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                            :
                            <Image
                                src={image}
                                alt={alt ? alt : "Article Featured Image"}
                                style={{ objectFit: 'cover', margin: '0' }} // navbar, lineheight, paddding, padding, padding?
                                fill={true}
                                sizes="100vw"
                                loading="eager"
                                fetchPriority="high"
                            />
                }
            </div>
            <div className='bg-neutral-800 w-full h-fit shrink-0'>
                <div className='prose p-3 text-xs sm:text-xl '>
                    <h1 className='uppercase text-info-content'>{title}</h1>
                </div>
            </div>
        </div>
    )
}
