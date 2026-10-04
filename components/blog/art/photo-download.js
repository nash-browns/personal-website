'use client';
import { useState } from 'react';
export function PhotoDownload({ id, title }) {
    const [busy, setBusy] = useState(false),
        [error, setError] = useState('');
    async function download() {
        setBusy(true);
        setError('');
        try {
            const response = await fetch(`/api/photography/download/${id}`);
            if (!response.ok) {
                const retryAfter = Number(response.headers.get('Retry-After'));
                if (response.status === 429) {
                    const minutes = Math.max(1, Math.ceil(retryAfter / 60));
                    throw new Error(
                        minutes >= 60
                            ? 'Download limit reached. Please try again tomorrow.'
                            : `Download limit reached. Please try again in ${minutes} ${minutes === 1 ? 'minute' : 'minutes'}.`,
                    );
                }
                throw new Error(
                    response.status === 503
                        ? 'Downloads are temporarily unavailable. Please try again later.'
                        : 'The download could not start. Please try again.',
                );
            }
            const url = URL.createObjectURL(await response.blob());
            const link = document.createElement('a');
            link.href = url;
            link.download = `${title.replace(/[^a-zA-Z0-9_-]+/g, '-')}.webp`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        } catch (error) {
            setError(error.message);
        } finally {
            setBusy(false);
        }
    }
    return (
        <div className="text-center">
            <button
                type="button"
                onClick={download}
                disabled={busy}
                className="inline-flex min-h-12 items-center justify-center rounded px-2 py-3 text-sm font-semibold uppercase tracking-wide text-white transition-colors duration-200 hover:text-stone-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white disabled:cursor-wait disabled:opacity-60 sm:px-4"
            >
                {busy ? 'Downloading…' : 'Download'}
            </button>
            {error && (
                <p role="alert" className="mt-2 max-w-48 text-xs text-red-300">
                    {error}
                </p>
            )}
        </div>
    );
}
