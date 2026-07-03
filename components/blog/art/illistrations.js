'use client'
import { readFiles } from "@/lib/next-path"
import { MdxLayout } from "../mdx-layout"
import { ArtCollection } from "./art-collection"

export function Photos() {
    const allArt = readFiles('public/art', 1);

    return(
        <div className='grid grid-cols-1 justify-items-stretch w-full min-h-[calc(100vh-64px)] bg-[#f2f1ed] text-gray-700'>
            <MdxLayout>
                <div className="bg-[#f2f1ed] w-full">
                    <ArtCollection allArt={allArt} />
                </div>
            </MdxLayout>
        </div>
    )
}

