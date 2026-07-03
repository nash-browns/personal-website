import Image from 'next/image';

export function TravelFeature({title, subheading, imageUrl, altText, imgWidth, imgHeight}) {
    return(
        <>
            <h1 className='mb-0'>{title}</h1>
            <h4 className='mt-0 mb-0'>{subheading}</h4>
            <div className='flex flex-col justify-center items-center'>
                <Image
                    src={imageUrl}
                    width={imgWidth}
                    height={imgHeight}
                    alt={altText}
                    sizes={imgWidth ? `(max-width: ${imgWidth}px) 100vw, ${imgWidth}px` : undefined}
                    priority
                />
            </div>
        </>
    )
}
