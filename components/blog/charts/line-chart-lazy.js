'use client'

import dynamic from 'next/dynamic'
import { useInView } from '../media/use-in-view'

// Lazy client wrapper so recharts is only downloaded when a graph actually renders.
const Chart = dynamic(
    () => import('./line-chart').then(m => m.LineGraph),
    { ssr: false }
)

export function LineGraph(props) {
    const { ref, hasBeenVisible } = useInView();

    return (
        <div ref={ref} className="w-full min-h-[432px] sm:min-h-[532px] md:min-h-[632px]">
            {hasBeenVisible ? <Chart {...props}/> : (
                <div className="p-4 text-center text-lg font-semibold text-gray-800">
                    {props.title}
                </div>
            )}
        </div>
    );
}
