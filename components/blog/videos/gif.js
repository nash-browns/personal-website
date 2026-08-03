'use client'

import { useState } from 'react'

export function Gif({video, topTitle, bottomTitle, height, width}){

    const [ready, setReady] = useState(false)

    return(
        <>
            { topTitle && <p className='m-0'>{topTitle}</p> }
            <div className='flex flex-col justify-center items-center w-full'>
                <div
                    className='relative m-0 max-w-full'
                    style={{ width, aspectRatio: width && height ? `${width} / ${height}` : undefined }}
                >
                    { !ready && <div className='absolute inset-0 bg-gray-200 animate-pulse' /> }
                    <video
                        width={width}
                        height={height}
                        preload="none"
                        autoPlay
                        loop
                        muted
                        playsInline
                        onPlaying={() => setReady(true)}
                        className={`m-0 w-full h-full transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}
                    >
                        <source src={video} type="video/mp4" />
                        Your browser does not support the video tag.
                    </video>
                </div>
            </div>
            { bottomTitle && <p className='m-0'>{bottomTitle}</p> }
        </>
    )
}
