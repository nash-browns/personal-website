import Image from 'next/image';

export function HashBrownsLoader({loadingText, color}) {
    return (
        <div className='w-full h-full flex flex-col justify-center items-center'>
            <div className='flex flex-col justify-center items-center w-full p-2 overflow-hidden bg-transparent'>
                <Image
                    src={"/loading.svg"}
                    alt='NashBrowns Logo'
                    width={150}
                    height={75}
                    loading="eager"
                    style={{ width: 150, height: 'auto' }}
                    className={`-mb-9 ${color == 'white' ? 'invert' : ''}`}
                />
                <Image
                    src={"/nashbrowns-logo.png"}
                    alt='NashBrowns Logo'
                    width={150}
                    height={150}
                    loading="eager"
                    style={{ width: 150, height: 'auto' }}
                    className='animate-spin-smooth mt-0'
                />
            </div>
            <p className={`font-inter ${color == 'white' ? 'text-white' : 'text-black'}`}>{loadingText}</p>
        </div>
    )
}
