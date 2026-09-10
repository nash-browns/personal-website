'use client'

import { useEffect, useRef, useState } from 'react';
import { useInView } from '../media/use-in-view';
import { loadStravaEmbeds } from './load-strava-embeds.mjs';

export function Strava({ stravaId, token }) {
    const { ref, hasBeenVisible } = useInView();
    const hostRef = useRef(null);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        if (!hasBeenVisible) return;
        const host = hostRef.current;
        if (!host) return;
        let active = true;

        // Only expose nearby activities to Strava's document-wide bootstrap.
        // The vendor replaces this node, so React owns its host, not its children.
        const placeholder = document.createElement('div');
        placeholder.className = 'strava-embed-placeholder';
        Object.assign(placeholder.dataset, {
            embedType: 'activity', embedId: stravaId, style: 'standard', fromEmbed: 'false',
            ...(token ? { token } : {}),
        });
        host.appendChild(placeholder);

        loadStravaEmbeds().then(() => {
            if (!active) return;
            window.__STRAVA_EMBED_BOOTSTRAP__();
            setReady(true);
        }).catch(() => {
            // Keep a usable activity link if the third-party embed is unavailable.
            if (active) setReady(false);
        });

        return () => {
            active = false;
            host.replaceChildren();
        };
    }, [hasBeenVisible, stravaId, token]);

    return (
        <div ref={ref} className="relative flex justify-center w-full min-h-[650px]">
            <div ref={hostRef} className="w-full max-w-[554px]" />
            {!ready && (
                <a href={`https://www.strava.com/activities/${stravaId}`} target="_blank" rel="noopener noreferrer"
                    className="absolute top-1/2 underline text-center">
                    View activity on Strava
                </a>
            )}
        </div>
    );
}
