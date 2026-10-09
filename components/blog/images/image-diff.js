'use client';
import Image from 'next/image';
import { useRef, useState, useCallback, useEffect } from 'react';

export function ImageDiff({ imageBefore, imageAfter, beforeAltText, afterAltText, height }) {
    const containerRef = useRef(null);
    const [sliderPos, setSliderPos] = useState(50);
    const isDragging = useRef(false);

    const updatePosition = useCallback((clientX) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        setSliderPos(pct);
    }, []);

    const onMouseDown  = useCallback((e) => { isDragging.current = true;  updatePosition(e.clientX); }, [updatePosition]);
    const onMouseMove  = useCallback((e) => { if (isDragging.current) updatePosition(e.clientX); }, [updatePosition]);
    const onMouseUp    = useCallback(() =>  { isDragging.current = false; }, []);
    const onTouchStart = useCallback((e) => { isDragging.current = true;  updatePosition(e.touches[0].clientX); }, [updatePosition]);
    const onTouchMove  = useCallback((e) => { if (isDragging.current) updatePosition(e.touches[0].clientX); }, [updatePosition]);

    useEffect(() => {
        window.addEventListener('mouseup', onMouseUp);
        return () => window.removeEventListener('mouseup', onMouseUp);
    }, [onMouseUp]);

    const fixedHeight = !!height;

    return (
        <div
            className="not-prose -ml-2 sm:-ml-3 lg:-ml-4 my-4 sm:my-6 w-[calc(100vw-16px)] sm:w-screen max-w-6xl px-2 sm:px-4"
        >
        <div
            ref={containerRef}
            className="relative overflow-hidden select-none cursor-col-resize touch-none"
            style={fixedHeight ? { height } : {}}
            onMouseDown={onMouseDown}
            onMouseMove={onMouseMove}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onMouseUp}
        >
            {/* The base image reserves space before either download completes. */}
            <Image
                src={imageAfter}
                fill={fixedHeight}
                sizes="(min-width: 1152px) 1120px, calc(100vw - 32px)"
                loading="lazy"
                decoding="async"
                alt={afterAltText}
                className={`w-full pointer-events-none ${fixedHeight ? 'absolute inset-0 h-full object-cover' : 'block h-auto'}`}
                draggable={false}
            />
            {/* The before image is clipped to the left of the slider. */}
            <Image
                src={imageBefore}
                fill
                sizes="(min-width: 1152px) 1120px, calc(100vw - 32px)"
                loading="lazy"
                decoding="async"
                alt={beforeAltText}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
                draggable={false}
            />
            {/* Divider line */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-lg z-10 pointer-events-none"
                style={{ left: `calc(${sliderPos}% - 1px)` }}
            >
                {/* Handle */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white border-2 border-gray-300 shadow-lg" />
            </div>
        </div>
        </div>
    );
}
