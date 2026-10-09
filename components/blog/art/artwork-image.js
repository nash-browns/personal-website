'use client';

import Image from 'next/image';
import { useState } from 'react';
import { isPhotographyMedia, photographyImageLoader } from '@/lib/photography/image-loader.mjs';
import styles from './artwork-image.module.css';

export function ArtworkImage({ src, alt, blurDataURL, sizes = '(min-width: 768px) 50vw, 100vw', loading = 'lazy', fetchPriority, film = false, dark = film, fit = film ? 'contain' : 'cover' }) {
    const [status, setStatus] = useState('loading');

    return (
        <div className={`absolute inset-0 overflow-hidden ${dark ? 'bg-[#080808]' : 'bg-stone-100'}`} aria-busy={status === 'loading'}>
            {status === 'loading' && (
                <div role="status" className={`absolute inset-0 ${dark ? 'bg-stone-900' : 'bg-stone-200'}`}>
                    <span className="sr-only">Loading photograph…</span>
                </div>
            )}
            <Image
                src={src}
                loader={isPhotographyMedia(src) ? photographyImageLoader : undefined}
                alt={alt}
                fill
                sizes={sizes}
                loading={loading}
                fetchPriority={fetchPriority}
                placeholder={blurDataURL ? 'blur' : 'empty'}
                blurDataURL={blurDataURL}
                className={`object-center ${fit === 'contain' ? 'object-contain' : 'object-cover'} ${status === 'loaded' && !blurDataURL ? styles.filmReveal : ''} ${status === 'loaded' || (blurDataURL && status === 'loading') ? 'opacity-100' : 'opacity-0'}`}
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
