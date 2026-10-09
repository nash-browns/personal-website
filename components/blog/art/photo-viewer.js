'use client';

import Image from 'next/image';
import { useLayoutEffect, useRef, useState } from 'react';
import { ArtworkImage } from './artwork-image';
import { isPhotographyMedia, photographyImageLoader } from '@/lib/photography/image-loader.mjs';
import styles from './photo-viewer.module.css';

function fitImage(box, ratio) {
    const width = Math.min(box.width, box.height * ratio);
    const height = width / ratio;
    return { left: box.left + (box.width - width) / 2, top: box.top + (box.height - height) / 2, width, height };
}

export function PhotoViewer({ src, alt, blurDataURL }) {
    const trigger = useRef(null), dialog = useRef(null), frame = useRef(null), backdrop = useRef(null);
    const animations = useRef([]), closing = useRef(false), destination = useRef(null);
    const [snapshot, setSnapshot] = useState(null);
    const [sharp, setSharp] = useState(false);

    function sourceBounds(ratio) {
        return fitImage(trigger.current.getBoundingClientRect(), ratio);
    }
    function originTransform(ratio) {
        const source = sourceBounds(ratio), target = destination.current;
        return `translate(${source.left - target.left}px, ${source.top - target.top}px) scale(${source.width / target.width})`;
    }
    function openViewer() {
        const image = trigger.current.querySelector('img');
        if (snapshot || !image?.complete || !image.naturalWidth) return;
        setSharp(false);
        setSnapshot({ url: image.currentSrc || image.src, ratio: image.naturalWidth / image.naturalHeight });
    }

    useLayoutEffect(() => {
        if (!snapshot) return;
        const modal = dialog.current;
        const previousOverflow = document.body.style.overflow;
        const previousPadding = document.body.style.paddingRight;
        const scrollbar = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollbar) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
        modal.showModal();
        closing.current = false;

        function resize() {
            destination.current = fitImage({ left: 16, top: 16, width: modal.clientWidth - 32, height: modal.clientHeight - 32 }, snapshot.ratio);
            const bounds = destination.current;
            Object.assign(frame.current.style, { left: `${bounds.left}px`, top: `${bounds.top}px`, width: `${bounds.width}px`, height: `${bounds.height}px` });
        }
        resize();
        const source = fitImage(trigger.current.getBoundingClientRect(), snapshot.ratio), target = destination.current;
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 450;
        const options = { duration, easing: 'cubic-bezier(.22, 1, .36, 1)' };
        animations.current = [
            frame.current.animate([{ transform: `translate(${source.left - target.left}px, ${source.top - target.top}px) scale(${source.width / target.width})` }, { transform: 'none' }], options),
            backdrop.current.animate([{ opacity: 0 }, { opacity: 1 }], options),
        ];
        window.addEventListener('resize', resize);
        return () => {
            window.removeEventListener('resize', resize);
            animations.current.forEach(animation => animation.cancel());
            modal.close();
            document.body.style.overflow = previousOverflow;
            document.body.style.paddingRight = previousPadding;
        };
    }, [snapshot]);

    async function closeViewer() {
        if (!snapshot || closing.current) return;
        closing.current = true;
        const transform = getComputedStyle(frame.current).transform;
        const opacity = getComputedStyle(backdrop.current).opacity;
        animations.current.forEach(animation => animation.cancel());
        const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 350;
        const options = { duration, easing: 'cubic-bezier(.4, 0, .2, 1)', fill: 'forwards' };
        const closingAnimations = [
            frame.current.animate([{ transform }, { transform: originTransform(snapshot.ratio) }], options),
            backdrop.current.animate([{ opacity }, { opacity: 0 }], options),
        ];
        animations.current = closingAnimations;
        await Promise.all(closingAnimations.map(animation => animation.finished.catch(() => {})));
        setSnapshot(null);
        trigger.current?.focus({ preventScroll: true });
    }

    return <>
        <button ref={trigger} type="button" className={styles.trigger} style={snapshot ? { visibility: 'hidden' } : undefined} onClick={openViewer} aria-label={`View ${alt || 'photograph'} full screen`} aria-haspopup="dialog">
            <ArtworkImage key={src} src={src} alt={alt} blurDataURL={blurDataURL} loading="eager" fetchPriority="high" dark fit="contain" />
        </button>
        <dialog ref={dialog} className={styles.viewer} aria-label={alt ? `Full-screen photograph: ${alt}` : 'Full-screen photograph'} onCancel={event => { event.preventDefault(); closeViewer(); }} onClick={event => { if (event.target === event.currentTarget) closeViewer(); }}>
            {snapshot && <>
                <div ref={backdrop} className={styles.backdrop} aria-hidden="true" />
                <div ref={frame} className={styles.photoFrame}>
                    <Image src={snapshot.url} alt="" aria-hidden="true" fill unoptimized draggable={false} className="object-contain" />
                    <Image src={src} loader={isPhotographyMedia(src) ? photographyImageLoader : undefined} alt={alt} fill sizes={`min(calc(100vw - 32px), calc(${snapshot.ratio * 100}dvh - ${snapshot.ratio * 32}px))`} loading="eager" draggable={false} onLoad={() => setSharp(true)} className={`object-contain transition-opacity duration-300 motion-reduce:transition-none ${sharp ? 'opacity-100' : 'opacity-0'}`} />
                </div>
                <button type="button" className={styles.close} aria-label="Close full-screen photograph" onClick={closeViewer} autoFocus><span aria-hidden="true">×</span></button>
            </>}
        </dialog>
    </>;
}
