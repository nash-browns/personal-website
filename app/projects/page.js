import Image from 'next/image';
import Link from 'next/link';

import logo from "@/public/hippy-hokusai-logo.png";

export default function ProjectsHome() {

    return(
        <div className="min-h-[calc(100vh-64px)] w-full">
            <div className="relative flex flex-col justify-center items-center h-full w-full">
                <Project/>
            </div>
        </div>
    )
}

function Project() {
    return(
        <div className="w-11/12 h-fit">
            <div className="flex justify-between items-center">
                <div className="prose grow-0 w-1/2">
                    <h1 className="text-5xl">NashBrowns</h1>
                    <p>My personal website is a creative outlet where I publish art! Everything you see on the blog was written or created by me. That includes all of the writing, art, and even the website itself, which I built using some of my favorite technologies!</p>
                    <Link className="text-xs" href="/blog/articals/nash-browns">See Blog Post</Link>
                </div>
                <div className='flex justify-center items-center w-1/2'>
                    <Image
                        src={logo}
                        alt={'Logo'}
                        width={400}
                        height={400}
                    />
                </div>
            </div>
        </div>
    )
}

