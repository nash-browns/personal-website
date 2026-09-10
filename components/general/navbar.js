import Image from 'next/image';
import Link from 'next/link';

import { AddBackground } from '@/components/styles';

import hokuasiWordLogo from '@/public/hokusai-nashborwns-logo.png'

const menuItems = [
    {name: 'Blog', href: '/blog'},
    // {name: 'Projects', href: '/projects'},
    // {name: 'Marketing', href: '/blog/marketing'},
    // {name: 'Outdoor', href: '/blog/outdoor'},
    // {name: 'Travel', href: '/blog/travel'},
]

export function NavBar({ partnerLinks = <PartnerLink/>, mobilePartnerLinks = <PartnerLink/> }) {

    return(
        <AddBackground bgColor='bg-base-300'>
        <div className="navbar h-11 max-h-11 border-b-4 border-black text-base-content">
            <div className="navbar-start">
                <div className="dropdown">
                    <div tabIndex={0} role="button" aria-label="Open navigation" className="btn btn-ghost lg:hidden">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h8m-8 6h16" /></svg>
                    </div>
                    <ul tabIndex={0} className="menu menu-sm dropdown-content mt-3 z-[1] p-2 shadow bg-base-100 rounded-box w-52 text-base">
                        {
                            menuItems.map((item) => (
                                <li key={item.name}><Link href={item.href}>{item.name}</Link></li>
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
                        priority
                    />
                </Link>
            </div>
            <div className="navbar-center hidden lg:flex">
                <ul className='menu menu-horizontal px-1 text-2xl font-didot'>
                    {
                        menuItems.map((item) => (
                            <li key={item.name}><Link href={item.href}>{item.name}</Link></li>
                        ))
                    }
                </ul>
            </div>
            <div className="navbar-end">
                <ul className='menu menu-horizontal px-1 text-2xl text-base-content font-didot hidden lg:flex'>
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
