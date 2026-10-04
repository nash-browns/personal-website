'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function NavigationLink({ href, children, className = '' }) {
    const pathname = usePathname();
    const active = pathname === href || pathname?.startsWith(`${href}/`);

    return (
        <Link href={href} aria-current={active ? 'page' : undefined} className={`${className} underline-offset-4 ${active ? 'underline' : ''}`}>
            {children}
        </Link>
    );
}
