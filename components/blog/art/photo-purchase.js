'use client';

import { useId, useLayoutEffect, useRef, useState } from 'react';
import styles from './photo-purchase.module.css';

export function PhotoPurchase({ children, headingClassName, bodyClassName }) {
    const dialog = useRef(null);
    const titleId = useId();
    const [open, setOpen] = useState(false);

    useLayoutEffect(() => {
        if (!open) return;
        const modal = dialog.current;
        const previousOverflow = document.body.style.overflow;
        const previousPadding = document.body.style.paddingRight;
        const scrollbar = window.innerWidth - document.documentElement.clientWidth;
        document.body.style.overflow = 'hidden';
        if (scrollbar) document.body.style.paddingRight = `${parseFloat(getComputedStyle(document.body).paddingRight) + scrollbar}px`;
        modal.showModal();
        return () => {
            modal.close();
            document.body.style.overflow = previousOverflow;
            document.body.style.paddingRight = previousPadding;
        };
    }, [open]);

    return <>
        <button type="button" onClick={() => setOpen(true)} aria-haspopup="dialog" aria-label="Purchase: 52,195 Satoshis or 11,483,957 Zatoshi" className="group grid min-h-12 w-full min-w-0 items-center justify-items-center rounded px-2 py-3 text-sm font-semibold uppercase tracking-wide text-white [container-type:inline-size] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white">
            {children}
        </button>
        <dialog ref={dialog} className={`${styles.dialog} ${bodyClassName}`} aria-labelledby={titleId} onClose={() => setOpen(false)} onClick={event => {
            if (event.target !== event.currentTarget) return;
            const bounds = event.currentTarget.getBoundingClientRect();
            if (event.clientX < bounds.left || event.clientX > bounds.right || event.clientY < bounds.top || event.clientY > bounds.bottom) dialog.current.close();
        }}>
            <div className={styles.content}>
                <button type="button" className={styles.close} aria-label="Close purchase notice" onClick={() => dialog.current.close()} autoFocus><span aria-hidden="true">×</span></button>
                <h2 id={titleId} className={`${styles.heading} ${headingClassName}`}>Purchases Currently Unavailable</h2>
                <div className={styles.body}>
                    <p>We apologize for the inconvenience! We are currently getting the website set up to take payments.</p>
                    <p>We want to start our payments journey by accepting the future monetary units, so that we don&apos;t have to upgrade later.</p>
                    <p>We will be accepting Bitcoin and Zcash as soon as humanly possible.</p>
                    <p>Thank you for your understanding.</p>
                    <p className={styles.signature}>Nash Browns Team</p>
                </div>
            </div>
        </dialog>
    </>;
}
