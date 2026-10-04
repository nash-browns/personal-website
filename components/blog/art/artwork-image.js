'use client';

import Image from 'next/image';
import { useState } from 'react';
import styles from './artwork-image.module.css';

export function ArtworkImage({ src, alt, sizes = '(max-width: 767px) 100vw, 50vw', loading = 'eager', film = false, dark = film, revealDelay = 0, fit = film ? 'contain' : 'cover' }) {
    const [status, setStatus] = useState('loading');

    return (
        <div className={`absolute inset-0 overflow-hidden ${dark ? 'bg-[#080808]' : 'bg-stone-100'}`} aria-busy={status === 'loading'}>
            {status === 'loading' && (
                <div role="status" className={`absolute inset-0 ${film ? '' : `motion-safe:animate-pulse ${dark ? 'bg-stone-900' : 'bg-stone-200'}`}`}>
                    <span className="sr-only">Loading photograph…</span>
                </div>
            )}
            <Image
                src={src}
                alt={alt}
                fill
                sizes={sizes}
                loading={loading}
                className={`object-center ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${film ? (status === 'loaded' ? styles.filmReveal : '') : 'transition-opacity duration-500 motion-reduce:transition-none'} ${status === 'loaded' ? 'opacity-100' : 'opacity-0'}`}
                style={film ? { '--reveal-delay': `${revealDelay}ms` } : undefined}
                onLoad={() => setStatus('loaded')}
                onError={() => setStatus('error')}
            />
            {status === 'error' && (
                <div role="status" className={`absolute inset-0 flex items-center justify-center p-6 text-center text-sm ${dark ? 'text-stone-300' : 'text-gray-500'}`}>
                    This photograph couldn’t load. Please refresh to try again.
                </div>
            )}
        </div>
    );
}
