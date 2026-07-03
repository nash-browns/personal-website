import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
    faArrowRight,
    faArrowDown,
} from '@awesome.me/kit-237330da78/icons/classic/light'

export function YoutubeAd({videoID, description}) {
    const videoURL = `https://www.youtube.com/watch?v=${videoID}`;

    const autoPlay = 'autoplay=0'
    const mute = 'mute=0'
    const loop = 'loop=0'
    const playlist = `playlist=${videoID}`
    const origin = 'origin=https://nashbrowns.com'

    return(
        <div className="h-fit w-full my-6 sm:my-8 bg-gray-400 bg-[url('/textures/default-noise-8.png')] bg-repeat bg-[length:25px] sm:bg-[length:50px] border-[#d0cfcd] rounded-xl p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:gap-4 md:flex-row justify-between items-center w-full">
                <div className='flex flex-col items-center justify-center md:justify-start md:items-start text-center md:text-left'>
                    <h1 className='text-gray-700 mb-0 text-xl sm:text-3xl lg:text-4xl'>Rather Watch?</h1>
                    <span className="text-sm sm:text-base">{description}</span>
                </div>
                <div className='flex flex-col items-center justify-center'>
                    {/* The layout switches to a row at md:, so the arrow must too */}
                    <FontAwesomeIcon icon={faArrowRight} className='hidden md:block h-8 w-8 sm:h-10 sm:w-10'/>
                    <FontAwesomeIcon icon={faArrowDown} className='md:hidden h-8 w-8 sm:h-10 sm:w-10'/>
                    <span className="text-xs sm:text-sm">Click the video to go to YouTube</span>
                </div>
                <div className="w-full md:w-[45%]">
                    <a href={videoURL} className='block'>
                        <div className='pointer-events-none w-full'>
                            <iframe 
                                src={`https://www.youtube.com/embed/${videoID}?si=1plKHiXuvLu5gtVo&${autoPlay}&${mute}&${loop}&${playlist}&${origin}`}
                                title="YouTube video player" 
                                frameBorder="0" 
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" 
                                referrerPolicy="strict-origin-when-cross-origin" 
                                allowFullScreen
                                className="w-full h-auto pointer-events-none"
                                style={{
                                    aspectRatio: '16 / 9',
                                    maxWidth: '100%'
                                }}
                            />
                        </div>
                    </a>
                </div>
            </div>
        </div>
    )
}
