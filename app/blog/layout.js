import { AddBackground } from '@/components/styles';
import { Footer } from '@/components/blog/footer';

/*
 * Keep this layout free of request-time data (headers, cookies, next-extra's
 * pathname()) so blog pages stay statically generated. Per-article JSON-LD and
 * the partner view counter live in <ArticleSeo/>, rendered by each page.mdx.
 */
export default function MDXPage({ children }) {
    return (
        <>
            <AddBackground>
                <div className="grid grid-cols-1 justify-items-stretch w-full min-h-[calc(100vh-64px)] text-gray-900">
                    {children}
                </div>
            </AddBackground>
            <Footer/>
        </>
    )
}
