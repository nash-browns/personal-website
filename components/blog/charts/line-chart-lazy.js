'use client'

import dynamic from 'next/dynamic'

// Lazy client wrapper so recharts is only downloaded when a graph actually renders.
export const LineGraph = dynamic(
    () => import('./line-chart').then(m => m.LineGraph),
    { ssr: false }
)
