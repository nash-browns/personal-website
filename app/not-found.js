import Image from 'next/image';
import Link from 'next/link';
import { Anton } from 'next/font/google';

import hippyHokusaiNashBrownsLogo from '@/public/hippy-hokusai-logo.png';

const heading = Anton({ weight: '400', subsets: ['latin'] });

export const metadata = {
    title: 'Page Not Found | Nash Browns',
};

export default function NotFound() {
    return (
        <div className="w-full h-[calc(100vh-64px)] overflow-hidden">
            <div className="flex flex-col justify-center items-center gap-6 h-full w-full px-4">
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
                <h1 className={`${heading.className} text-4xl lg:text-6xl tracking-[0.1em]`}>404</h1>
                <nav className={`${heading.className} flex gap-6 tracking-[0.1em] text-base lg:text-2xl`}>
                    <Link href="/" className="hover:underline">Home</Link>
                    <Link href="/blog" className="hover:underline">Blog</Link>
                    <Link href="/photography" className="hover:underline">Photography</Link>
                </nav>
            </div>
        </div>
    );
}
