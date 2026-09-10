const SCRIPT_SRC = 'https://strava-embeds.com/embed.js';
let pendingScript;

// The vendor script exposes this bootstrap function to initialize new embeds
// after client-side navigation. Share its download across every activity.
export function loadStravaEmbeds() {
    if (typeof window.__STRAVA_EMBED_BOOTSTRAP__ === 'function') return Promise.resolve();
    if (pendingScript) return pendingScript;

    pendingScript = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        const fail = () => {
            script.remove();
            pendingScript = undefined;
            reject(new Error('Could not load the Strava embed script'));
        };
        script.addEventListener('load', () => {
            if (typeof window.__STRAVA_EMBED_BOOTSTRAP__ === 'function') resolve();
            else fail();
        }, { once: true });
        script.addEventListener('error', fail, { once: true });
        document.head.appendChild(script);
    });

    return pendingScript;
}
