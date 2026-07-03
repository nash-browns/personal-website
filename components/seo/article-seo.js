import { generateJsonLd } from '@/lib/seo'
import { JsonLd } from './json-ld'
import { PageViewTracker } from './page-view-tracker'

/*
 * <ArticleSeo /> — drop-in SEO/analytics block for blog articles.
 *
 * Renders the schema.org BlogPosting JSON-LD at build time and, for partner
 * articles, mounts the client-side view tracker. Articles include it right
 * after their metadata exports:
 *
 *   <ArticleSeo post={postMetadata} slug="alcan-spring" />
 *
 * This replaces the old app/blog/layout.js approach that sniffed the request
 * path with next-extra's pathname(), which forced every article to be
 * server-rendered on demand instead of statically generated.
 */
export function ArticleSeo({ post, slug }) {
    if (!post?.title || !slug) return null

    const jsonLd = generateJsonLd({ ...post, url: `/blog/articles/${slug}` })

    return (
        <>
            <JsonLd schema={jsonLd} />
            {post.partners && <PageViewTracker contentId={slug} />}
        </>
    )
}
