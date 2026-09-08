/*
 * Page by Page MetaData
 * title = The text that will be displayed in the tab
 * <meta name="description" content="A description of the page"> = Use this tag to provide a short description of the page. In some situations, this description is used in the snippet shown in search results.
 *
 * These meta tags control the behavior of search engine crawling and indexing.
 * <meta name="robots" content="..., ...">
 * <meta name="googlebot" content="..., ...">
 *
 * Search Box on Google, below turns off the search box
 * <meta name="google" content="nositelinkssearchbox">
 *
 * Turns off translation:
 * <meta name="googlebot" content="notranslate">
 *
 * Tells google the site is mobil friendly
 * <meta name="viewport" content="...">
 *
 *
 *
 *
 * add this to the top level page (home page) when the site is ready to launch
 * Need to change the content
 * <meta name="google-site-verification" content="+nxGUDJ4QpAZ5l9Bsjdi102tLVC21AIh5d1Nl23908vVuFHs34="/>
 *
 *
 * Google doc -> https://developers.google.com/search/docs/crawling-indexing/special-tags
 * Next doc -> https://nextjs.org/docs/app/api-reference/functions/generate-metadata#metadata-fields
 * */


export function generateMetadata({
    title= "Nash Browns",
    description='This is a blog article written by Nash Bostwick. It contains information on places that he has been, projects that he is working on, and other information that he finds interesting.',
    keywords=['Nash Bostwick', 'blog', 'Nash Browns'],
    thumbnail='/hippy-hokusai-logo.png',
    thumbnailIllustration='/hippy-hokusai-logo.png',
    publishedTime='2023-01-01T00:00:00.000Z',
}={}) {

    const meta = {    
        title,
        description,
        keywords,
        openGraph: {
            title: title,
            description: description,
            type: 'article',
            publishedTime: publishedTime,
            authors: ['Nash'],
            siteName: 'Nash Browns',
            images: [
                {
                    url: thumbnailIllustration, // Must be an absolute URL
                    // width: 800,
                    // height: 600,
                },
            ]
        },


        //Defaults
        generator: 'Next.js',
        applicationName: 'NashBrowns',
        referrer: 'origin-when-cross-origin',
        authors: [{ name: 'Nash Bostwick' }],
        creator: 'Nash Bostwick',
        publisher: 'Nash Bostwick',
        formatDetection: {
            email: false,
            address: false,
            telephone: false,
        },
        robots: {
            index: true,
            follow: true,
            nocache: false,
            googleBot: {
                index: true,
                follow: true,
                noimageindex: false,
                'max-video-preview': -1,
                'max-image-preview': 'large',
                'max-snippet': -1,
            },
        },
    }

    return {...meta};

}
