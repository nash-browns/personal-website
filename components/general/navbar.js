import Image from 'next/image';
import Link from 'next/link';
import { Anton } from 'next/font/google';
import { NavigationLink } from './navigation-link';

import { AddBackground } from '@/components/styles';

import hokuasiWordLogo from '@/public/hokusai-nashborwns-logo.png'

const heading = Anton({ weight: '400', subsets: ['latin'] });
const navigationTypography = `${heading.className} font-normal [&_a]:text-base lg:[&_a]:text-2xl [&_a]:tracking-[0.1em] [&_a]:leading-relaxed`;

const menuItems = [
    {name: 'Blog', href: '/blog'},
    {name: 'Photography', href: '/photography'},
    // {name: 'Projects', href: '/projects'},
    // {name: 'Marketing', href: '/blog/marketing'},
    // {name: 'Outdoor', href: '/blog/outdoor'},
    // {name: 'Travel', href: '/blog/travel'},
]

export function NavBar({ partnerLinks = <PartnerLink/>, mobilePartnerLinks = <PartnerLink/>, dark = false }) {
    if (dark) {
        return (
            <nav aria-label="Site navigation" className={`${navigationTypography} flex h-16 items-center justify-center bg-[#080808] text-white`}>
                {menuItems.map(item => (
                    <NavigationLink key={item.href} href={item.href} className="inline-flex min-h-11 items-center px-4 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white">{item.name}</NavigationLink>
                ))}
            </nav>
        );
    }

    return(
        <AddBackground bgColor="bg-base-300">
        <div className={`${navigationTypography} navbar h-11 max-h-11 border-b-4 border-black text-base-content`}>
            <div className="navbar-start">
                <div className="dropdown">
                    <div tabIndex={0} role="button" aria-label="Open navigation" className="btn btn-ghost lg:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /></svg>
                    </div>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-50 p-2 shadow rounded-box w-52 text-base bg-base-100">
                        {
                            menuItems.map((item) => (
                                <li key={item.name}><NavigationLink href={item.href}>{item.name}</NavigationLink></li>
                            ))
                        }
                        {mobilePartnerLinks}
                    </ul>
                </div>
                <Link className="" href='/' >
                    <Image
                        src={hokuasiWordLogo}
                        alt='Nash Browns Logo Long'
                        width={248}
                        height={48}
                        className="w-48 h-auto"
                        sizes="192px"
                        loading="eager"
                    />
                </Link>
            </div>
            <div className="navbar-center hidden lg:flex">
                <ul className='menu menu-horizontal px-1 text-2xl'>
                    {
                        menuItems.map((item) => (
                            <li key={item.name}><NavigationLink href={item.href}>{item.name}</NavigationLink></li>
                        ))
                    }
                </ul>
            </div>
            <div className="navbar-end">
                <ul className="menu menu-horizontal px-1 text-2xl hidden lg:flex text-base-content">
                    {partnerLinks}
                </ul>
            </div>
        </div>
        </AddBackground>
    )
}

function PartnerLink() {
    return (
        <li><Link href='/partners' prefetch={false}>Partners</Link></li>
    )
}
