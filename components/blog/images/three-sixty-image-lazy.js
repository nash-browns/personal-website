'use client'

import dynamic from 'next/dynamic'
import { HashBrownsLoader } from '../loaders/hash-browns-loader'

// Lazy client wrapper so three.js is only downloaded when a 360 image actually renders.
// Calling dynamic() from the server-component barrel put three.js in every page's first load.
export const ThreeSixtyImage = dynamic(
    () => import('./three-sixty-image').then(m => m.ThreeSixtyImage),
    { ssr: false, loading: () => <HashBrownsLoader /> }
)
