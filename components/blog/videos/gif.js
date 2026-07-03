//TODO: Remove this component. GIF's can be displied with any of the image components.



export function Gif({video, topTitle, bottomTitle, height, width}){

    return(
        <>
            { topTitle && <p className='m-0'>{topTitle}</p> }
            <div className='flex flex-col justify-center items-center w-full'>
                <video 
                    width={width} 
                    height={height}
                    preload="none"
                    autoPlay
                    loop
                    muted
                    playsInline
                    className='m-0 bg-blue-700'
                >
                    <source src={video} type="video/mp4" />
                    Your browser does not support the video tag.
                </video>
            </div>
            { bottomTitle && <p className='m-0'>{bottomTitle}</p> }
        </>
    )
}

