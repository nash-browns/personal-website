'use client';

import { useEffect, useRef, useState } from 'react';

// Keep media out of the initial load, but give embeds a small head start as the
// reader approaches. Video playback uses a zero margin and continues observing.
export function useInView({ rootMargin = '300px 0px', once = true } = {}) {
    const ref = useRef(null);
    const [visibility, setVisibility] = useState({ isVisible: false, hasBeenVisible: false });

    useEffect(() => {
        const element = ref.current;
        if (!element) return;
        let active = true;

        const update = (isVisible) => {
            if (!active) return;
            setVisibility(previous => ({
                isVisible,
                hasBeenVisible: previous.hasBeenVisible || isVisible,
            }));
        };

        if (!('IntersectionObserver' in window)) {
            queueMicrotask(() => update(true));
            return () => { active = false; };
        }

        const observer = new IntersectionObserver(([entry]) => {
            update(entry.isIntersecting);
            if (once && entry.isIntersecting) observer.disconnect();
        }, { rootMargin });
        observer.observe(element);

        return () => {
            active = false;
            observer.disconnect();
        };
    }, [rootMargin, once]);

    return { ref, ...visibility };
}
