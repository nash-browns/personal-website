import { generateMetadata } from '@/lib/seo';
import { SiteLanding } from '@/components/blog/landing-pages/site-landing';

export const metadata = generateMetadata({
    title:"Nash Browns",
    description:"Just Jokes:)",
    keywords: ['Projects', 'Art', 'Outdoor', 'Travel', 'Blog', 'Alaska', 'Nash Bostwick']
});

export default function Home() {
    return (
        <SiteLanding/>
    )
}

