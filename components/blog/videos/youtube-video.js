import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faCameraMovie } from '@awesome.me/kit-237330da78/icons/classic/solid'


export function YoutubeVideo({videoId}){
    const autoPlay = 'autoplay=0'
    const mute = 'mute=0'
    const loop = 'loop=0'
    const playlist = `playlist=${videoId}`
    const origin = 'origin=https://nashbrowns.com'

    return(
        <div className='not-prose flex justify-center items-center w-full px-2 sm:px-0 my-6 sm:my-8'>
            <div className="h-fit w-full max-w-4xl bg-[#5B2A86] bg-[url('/textures/default-noise-8.png')] bg-repeat bg-[length:25px] sm:bg-[length:50px] border-[3px] border-black rounded-lg shadow-[5px_5px_0_0_#D6541F] px-3 sm:px-4 py-2 pb-4 sm:pb-5">
                <div className='flex justify-center items-center gap-2 sm:gap-4'>
                    <FontAwesomeIcon icon={faCameraMovie} className='h-6 w-6 sm:h-10 sm:w-10 pb-2 text-[#E0386F]'/>
                    <h2 className='text-center font-mono font-bold uppercase tracking-wide text-[#EBD9B4] text-2xl sm:text-4xl lg:text-5xl my-4 sm:my-6'>
                        {/* The long title only fits once the layout is wide enough */}
                        <span className='hidden md:inline'>Watch On Youtube</span>
                        <span className='md:hidden'>YouTube</span>
                    </h2>
                </div>
                <div className="flex justify-center items-center w-full">
                    <div className="w-full max-w-full overflow-hidden border-[3px] border-black rounded-md">
                        <iframe
                            src={`https://www.youtube.com/embed/${videoId}?si=1plKHiXuvLu5gtVo&${autoPlay}&${mute}&${loop}&${playlist}&${origin}`}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                            referrerPolicy="strict-origin-when-cross-origin"
                            allowFullScreen
                            className="block w-full h-auto"
                            style={{
                                aspectRatio: '16 / 9',
                                maxWidth: '100%'
                            }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
