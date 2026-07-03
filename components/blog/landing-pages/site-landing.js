import Image from 'next/image';

import hippyHokusaiNashBrownsLogo from '@/public/hippy-hokusai-logo.png';

export function SiteLanding() {
    return(
            <div className="w-full h-[calc(100vh-64px)] overflow-hidden">
                <div className="flex flex-col justify-center items-center h-full w-full">
                    <div className="h-500 w-500 overflow-hidden">
                        <Image
                            src={hippyHokusaiNashBrownsLogo}
                            alt='NashBrowns Logo'
                            width={500}
                            height={500}
                            className='animate-spin-smooth'
                            sizes="(max-width: 500px) 100vw, 500px"
                            priority
                        />
                    </div>
                </div>
            </div>
    )
}
