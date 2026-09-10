import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import Image from 'next/image'
import {
    faArrowRight,
    faArrowDown,
} from '@awesome.me/kit-237330da78/icons/classic/light'

export function YoutubeAd({videoID, description}) {
    const videoURL = `https://www.youtube.com/watch?v=${videoID}`;

    return(
        <div className="not-prose h-fit w-full my-6 sm:my-8 bg-[#1E4C8A] bg-[url('/textures/default-noise-8.png')] bg-repeat bg-[length:25px] sm:bg-[length:50px] border-[3px] border-black rounded-lg shadow-[5px_5px_0_0_#E0386F] p-3 sm:p-4">
            <div className="flex flex-col gap-3 sm:gap-4 md:flex-row justify-between items-center w-full">
                <div className='flex flex-col items-center justify-center md:justify-start md:items-start text-center md:text-left'>
                    <h2 className='m-0 font-mono font-bold uppercase tracking-wide text-[#EBD9B4] text-2xl sm:text-3xl lg:text-4xl'>Rather Watch?</h2>
                    <span className="mt-1 text-sm sm:text-base text-[#EBD9B4]">{description}</span>
                </div>
                <div className='flex flex-col items-center justify-center text-[#EBD9B4]'>
                    {/* The layout switches to a row at md:, so the arrow must too */}
                    <FontAwesomeIcon icon={faArrowRight} className='hidden md:block h-8 w-8 sm:h-10 sm:w-10'/>
                    <FontAwesomeIcon icon={faArrowDown} className='md:hidden h-8 w-8 sm:h-10 sm:w-10'/>
                    <span className="text-xs sm:text-sm">Click the video to go to YouTube</span>
                </div>
                <div className="w-full md:w-[45%]">
                    <a href={videoURL} aria-label={`Watch on YouTube${description ? `: ${description}` : ''}`} className='group block border-[3px] border-black rounded-md overflow-hidden'>
                        <div className='relative aspect-video w-full'>
                            <Image
                                src={`https://img.youtube.com/vi/${videoID}/hqdefault.jpg`}
                                alt={description || 'YouTube video preview'}
                                fill
                                sizes="(min-width: 768px) 400px, 100vw"
                                className="object-cover"
                                loading="lazy"
                            />
                            <span aria-hidden="true" className="absolute inset-0 flex items-center justify-center">
                                <svg viewBox="0 0 68 48" className="w-16 drop-shadow-lg transition-transform group-hover:scale-110">
                                    <rect width="68" height="48" rx="12" fill="#f00" />
                                    <path d="M28 14v20l18-10z" fill="#fff" />
                                </svg>
                            </span>
                        </div>
                    </a>
                </div>
            </div>
        </div>
    )
}
