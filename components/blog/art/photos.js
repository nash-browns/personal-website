'use client'
// import { readFiles } from "@/lib/next-path"

import { MdxLayout } from "../mdx-layout"
import { ArtNav } from "./art-nav"
import { ArtCollection } from "./art-collection"
import { Suspense } from "react";
import { SimpleSpinner } from "@/components/loading"

export function Photos() {
    // const allArt = readFiles('public/art', 1);

    return(
        <div className='grid grid-cols-1 justify-items-stretch w-full min-h-[calc(100vh-64px)] bg-[#f2f1ed] text-gray-700'>
            <MdxLayout>
                <div className="bg-[#f2f1ed] w-full">
                    <Suspense fallback={<SimpleSpinner/>}>
                        {/* <ArtCollection allArt={allArt} /> */}
                        <ArtCollection/>
                    </Suspense>
                </div>
            </MdxLayout>
        </div>
    )
}
