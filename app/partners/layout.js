import { Footer } from '@/components/blog/footer';
import { AccountLayout } from '@/components/auth/account-layout';

import { generateMetadata } from '@/lib/seo';
export const metadata = generateMetadata({
    title:"Partners",
    description:"Nash Browns Partner Login Page",
    keywords: []
});

export default function PartnerLayout({ children }) {
    
    return (
        <AccountLayout>
            <div className='min-h-screen'>
                {children}
            </div>
            <Footer/>
        </AccountLayout>
    );
}
