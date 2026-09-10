import Link from "next/link";
import { folderPaths, getBlogPostMetadata } from "@/lib/next-path"

import { generateMetadata } from '@/lib/seo';

export const metadata = generateMetadata({
    title:"Writing",
    description:"All Short Stories",
    keywords: ['Writing','Nash Browns', 'Nash Bostwick']
});

export default function WritingHome() {

    return(
        <div className="w-full">
            <WritingList/>
        </div>
    )
}

async function WritingList() {
    const allArticals = folderPaths('app/writing');
    const metadata = await getBlogPostMetadata('app/writing', allArticals)
    const activeArticalMetadata = metadata.filter((article) => article.isActive)
    const orderedArticals = sortByClosestPublishedDate(activeArticalMetadata)

    return(
        <ul>
            {
                orderedArticals.map((article, i) => {
                    return (
                        <li key={i} className={``}>
                            <Link href={`/writing${article.folder}`}>{article.title}</Link>
                        </li>
                    )
                })
            }
        </ul>
    )
}


function sortByClosestPublishedDate(posts) {
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


