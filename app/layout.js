import { generateMetadata } from '@/lib/seo';
import { SITE_URL } from '@/lib/seo/site.mjs';
import { NavBar } from "@/components/general/navbar"
import { PublicNavigation } from "@/components/general/public-navigation"

// Vercel
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from '@vercel/analytics/react';

//Fonts
import { inter, neue, spartan, didot } from "@/lib/fonts";

//Defualt Styles
import { AddBackground } from "@/components/styles";

import "./globals.css";

export const metadata = {
    ...generateMetadata(),
    metadataBase: new URL(SITE_URL),
};

export const viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
};

export default async function RootLayout({ children }) {

    return (
        <html lang="en" className={`${inter.variable} ${neue.variable} ${spartan.variable} ${didot.variable}`} data-theme="retro">
            <body className='min-h-screen'>
                <AddBackground bgColor={'bg-base-200'}>
                    <PublicNavigation>
                        <NavBar/>
                    </PublicNavigation>
                    {children}
                    <SpeedInsights />
                    <Analytics/>
                </AddBackground>
            </body>
        </html>
    );
}
