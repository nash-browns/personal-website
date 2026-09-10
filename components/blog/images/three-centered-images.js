import { MdxImage } from './MdxImage'

export function ThreeCenteredImages({image, altText, titles, subtitles, width, height}) {

    const imageOne = image[0];
    const altTextOne = altText[0];

    const imageTwo = image[1];
    const altTextTwo = altText[1];

    const imageThree = image[2];
    const altTextThree = altText[2];

    return (
        <div className='flex flex-col sm:flex-row justify-center items-center gap-2 w-full h-fit'>
            <div className='grid group w-fit max-w-full min-w-0 not-prose'>
                <div className='col-start-1 row-start-1'>
                    <MdxImage src={imageOne} alt={altTextOne} height={height} width={width}/>
                </div>
                <div className='col-start-1 row-start-1 self-end justify-self-start z-10 w-fit h-fit px-4 py-0 text-white bg-[#bdd2c9] opacity-0 group-hover:opacity-100 transition-opacity ease-in-out delay-150 duration-300 [clip-path:polygon(0_0,100%_0%,95%_100%,0_100%)]'>
                    {
                        titles && titles[0] ? <Title title={titles[0]} subtitle={subtitles && subtitles[0] ? subtitles[0] : ''}/> : <></>
                    }
                </div>
            </div>
            <div className='grid group w-fit max-w-full min-w-0 not-prose'>
                <div className='col-start-1 row-start-1'>
                    <MdxImage src={imageTwo} alt={altTextTwo} height={height} width={width}/>
                </div>
                <div className='col-start-1 row-start-1 self-end justify-self-start z-10 w-fit h-fit px-4 py-0 text-white bg-[#bdd2c9] opacity-0 group-hover:opacity-100 transition-opacity ease-in-out delay-150 duration-300 [clip-path:polygon(0_0,100%_0%,95%_100%,0_100%)]'>
                    {
                        titles && titles[1] ? <Title title={titles[1]} subtitle={subtitles && subtitles[1] ? subtitles[1] : ''}/> : <></>
                    }
                </div>
            </div>
            <div className='grid group w-fit max-w-full min-w-0 not-prose'>
                <div className='col-start-1 row-start-1'>
                    <MdxImage src={imageThree} alt={altTextThree} height={height} width={width}/>
                </div>
                <div className='col-start-1 row-start-1 self-end justify-self-start z-10 w-fit h-fit px-4 py-0 text-white bg-[#bdd2c9] opacity-0 group-hover:opacity-100 transition-opacity ease-in-out delay-150 duration-300 [clip-path:polygon(0_0,100%_0%,95%_100%,0_100%)]'>
                    {
                        titles && titles[2] ? <Title title={titles[2]} subtitle={subtitles && subtitles[2] ? subtitles[2] : ''}/> : <></>
                    }
                </div>
            </div>
        </div>
    )
}



function Title({title, subtitle}) {

    return (
        <div className='flex flex-col justify-start items-start'>
            <span className='text-2xl font-bold'>{title}</span>
            {
                subtitle && subtitle != '' ? <SubTitle subtitle={subtitle}/> : <></>
            }
        </div>
    )
}

function SubTitle({subtitle}) {

    return (
        <span className='text-xs font-semibold'>{subtitle}</span>
    )
}
