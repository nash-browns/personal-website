import Image from 'next/image';

import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { 
    faStrava,
    faYoutube,
    faInstagram,
} from '@fortawesome/free-brands-svg-icons';

import garmin from "@/public/garmin-logo-simple.png";
import Link from 'next/link';
import { AddBackground } from '@/components/styles';


export function Footer() {
    return (
        <AddBackground bgColor={'bg-secondary'} hasTopo={true}>
            <footer className={`footer footer-horizontal footer-center text-base-content rounded font-didot`}>
                <div className="w-full h-full p-10">
                    <nav className="grid grid-flow-col gap-4">
                        <Link href={'/blog/articals/nash-browns'} className="link link-hover">About</Link>
                        <Link href={'/partners'} prefetch={false} className="link link-hover">Contact</Link>
                        <Link href={'/partners'} prefetch={false} className="link link-hover">Partners</Link>
                    </nav>
                    <nav>
                        <div className="grid grid-flow-col gap-4">
                            <a target='_blank' href={"https://www.instagram.com/nashtheflash/"}>
                                <FontAwesomeIcon icon={faInstagram} className='h-12 w-12'/>
                            </a>
                            <a target='_blank' href={"https://www.youtube.com/@nashbrowns"}>
                                <FontAwesomeIcon icon={faYoutube} className='h-12 w-12'/>
                            </a>
                            <a target='_blank' href={"https://www.strava.com/athletes/111233131"}>
                                <FontAwesomeIcon icon={faStrava} className='h-12 w-12'/>
                            </a>
                            <a target='_blank' href={"https://connect.garmin.com/modern/profile/c1d46b77-b206-4536-a599-da56c5bac468"}>
                                <Image
                                    src={garmin}
                                    alt='Garmin Logo'
                                    width={64}
                                    height={64}
                                    className='h-12 w-12'
                                    draggable={false}
                                />
                            </a>
                        </div>
                    </nav>
                    <aside>
                        <p>Copyright © {new Date().getFullYear()} - All rights reserved by Nash Browns</p>
                    </aside>
                </div>
            </footer>
        </AddBackground>
    )
}
