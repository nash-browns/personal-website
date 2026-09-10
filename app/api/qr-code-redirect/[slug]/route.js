import { NextResponse } from 'next/server';

export async function GET(req, { params }) {
    const { slug } = await params;

    // Define your redirect mapping
    const redirectMap = {
        "wbb": "https://www.worldclassbikes.com/", //http://localhost:3000/api/qr-code-redirect/wbb
        "example": "/another-page"
    };

    const destination = redirectMap[slug] || "/default-page"; // Default fallback

    return NextResponse.redirect(new URL(destination, req.url), 307);
}
