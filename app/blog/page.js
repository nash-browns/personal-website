import { folderPaths, getBlogPostMetadata } from "@/lib/next-path"
import { BlogBrowser } from "@/components/blog"
import { generateMetadata } from '@/lib/seo';

export const metadata = generateMetadata({
    title:"Blog",
    description:"All Blog Articles",
    keywords: ['Projects', 'Art', 'Outdoor', 'Travel', 'Blog', 'Alaska', 'Nash Bostwick']
});

export default function BlogHome() {

    return(
        <div className='prose-lg flex flex-col justify-self-center items-start w-full sm:px-0 text-gray-600'>
            <BlogList/>
        </div>
    )
}

async function BlogList() {
    const allArticals = folderPaths('app/blog/articles');

    if (!allArticals || allArticals.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-96">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">No articles found in directory</h2>
                <p className="text-gray-600">Please check back later for new content.</p>
            </div>
        );
    }

    const metadata = await getBlogPostMetadata('app/blog/articles', allArticals)
    const activeArticalMetadata = (metadata || []).filter((article) => article.isActive)

    if (activeArticalMetadata.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-96">
                <h2 className="text-2xl font-bold text-gray-800 mb-4">No active articles found</h2>
                <p className="text-gray-600">Please check back later for new content.</p>
            </div>
        );
    }

    const orderedArticals = sortByClosestPublishedDate(activeArticalMetadata)

    return <BlogBrowser articles={orderedArticals} />
}

function sortByClosestPublishedDate(posts) {
    if (!posts || posts.length === 0) {
        return [];
    }

    return posts.sort((a, b) => {
        const today = new Date();

        // Ensure proper parsing of YYYY-MM-DD format
        const dateA = parseDate(a.published);
        const dateB = parseDate(b.published);

        // Sort by closest to today
        return Math.abs(dateA - today) - Math.abs(dateB - today);
    });
}

function parseDate(dateStr) {
    // Ensure YYYY-MM-DD format is correctly parsed
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(year, month - 1, day); // Month is 0-based in JS Date
}
