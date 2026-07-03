import { MdxImage } from './MdxImage'

export function CenteredImage({image, altText, title, subtitle, width = 800, height}) {

    return (
        <div
            className='grid group mx-auto my-1 not-prose shrink-0'
            style={{ width: `min(100%, ${width}px)` }}
        >
            <div className='col-start-1 row-start-1'>
                <MdxImage src={image} alt={altText} width={width} height={height} style={{ width: '100%', height: 'auto' }} sizes={`(max-width: ${width}px) 100vw, ${width}px`}/>
            </div>
            <div className='col-start-1 row-start-1 self-end justify-self-start z-10 w-fit h-fit px-4 py-0 text-white bg-[#bdd2c9] opacity-0 group-hover:opacity-100 transition-opacity ease-in-out delay-150 duration-300 [clip-path:polygon(0_0,100%_0%,95%_100%,0_100%)]'>
                {
                    title ? <Title title={title} subtitle={subtitle}/> : <></>
                }
            </div>
        </div>
    )
}


function Title({title, subtitle}) {

    return (
        <div className='flex flex-col justify-start items-start'>
            <span className='text-4xl font-bold pr-3'>{title}</span>
            {
                subtitle ? <SubTitle subtitle={subtitle}/> : <></>
            }
        </div>
    )
}

function SubTitle({subtitle}) {

    return (
        <span className='text-md font-semibold'>{subtitle}</span>
    )
}
