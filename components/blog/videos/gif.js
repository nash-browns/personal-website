'use client'

import { useEffect, useState } from 'react'
import { useInView } from '../media/use-in-view'

export function Gif({video, topTitle, bottomTitle, height, width}){

    const [ready, setReady] = useState(false)
    const { ref, isVisible, hasBeenVisible } = useInView({ rootMargin: '0px', once: false })

    useEffect(() => {
        const player = ref.current;
        if (!player) return;
        if (isVisible) {
            // Muted inline playback can still be blocked by browser preferences.
            player.play().catch(() => {});
        } else {
            player.pause();
        }
        return () => player.pause();
    }, [isVisible, video, ref]);

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
                        ref={ref}
                        src={hasBeenVisible ? video : undefined}
                        width={width}
                        height={height}
                        preload="none"
                        loop
                        muted
                        playsInline
                        onLoadedData={() => setReady(true)}
                        className={`m-0 w-full h-full transition-opacity duration-300 ${ready ? 'opacity-100' : 'opacity-0'}`}
                    >
                        Your browser does not support the video tag.
                    </video>
                    <noscript><a href={video}>View video</a></noscript>
                </div>
            </div>
            { bottomTitle && <p className='m-0'>{bottomTitle}</p> }
        </>
    )
}
