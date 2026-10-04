'use client';

import { useEffect, useId, useRef, useState } from 'react';
import styles from './admin.module.css';

export function SortableOrderList({ items, ids, setIds, label, disabled, children }) {
    const list = useRef(null);
    const pointer = useRef(null);
    const animation = useRef(null);
    const instructions = useId();
    const [drag, setDrag] = useState(null);
    const [announcement, setAnnouncement] = useState('');

    useEffect(() => () => {
        pointer.current = null;
        cancelAnimationFrame(animation.current);
    }, []);

    function move(id, target) {
        const from = ids.indexOf(id), to = ids.indexOf(target);
        if (disabled || from < 0 || to < 0 || from === to) return;
        const next = [...ids];
        next.splice(to, 0, next.splice(from, 1)[0]);
        setIds(next);
        setAnnouncement(`${items.find(item => item.id === id)?.title} moved to position ${to + 1} of ${ids.length}. Save the order to keep this change.`);
    }

    function updateDrag() {
        const current = pointer.current;
        if (!current || !list.current) return;
        const offset = current.y - current.startY + window.scrollY - current.startScroll;
        current.moved ||= Math.abs(offset) > 5;
        const bounds = list.current.getBoundingClientRect();
        let target = null, nearest = Infinity;
        if (current.x >= bounds.left && current.x <= bounds.right) {
            for (const row of list.current.children) {
                const box = row.getBoundingClientRect();
                const center = row.dataset.sortId === current.id ? current.startCenter + current.startScroll - window.scrollY : box.top + box.height / 2;
                const distance = Math.abs(current.y - center);
                if (distance < nearest) { nearest = distance; target = row.dataset.sortId; }
            }
        }
        current.target = target;
        current.offset = offset;
        setDrag({ id: current.id, target, offset });
    }

    function autoScroll() {
        const current = pointer.current;
        if (!current || !list.current) return;
        const edge = 72;
        const speed = current.y < edge ? -12 : current.y > window.innerHeight - edge ? 12 : 0;
        if (speed && current.moved) {
            window.scrollBy(0, speed);
            updateDrag();
        }
        animation.current = requestAnimationFrame(autoScroll);
    }

    function finish(cancel = false) {
        const current = pointer.current;
        pointer.current = null;
        cancelAnimationFrame(animation.current);
        setDrag(null);
        if (!cancel && current?.moved && current.target) move(current.id, current.target);
        else if (current?.moved) setAnnouncement('Reordering cancelled.');
    }

    return <>
        <p id={instructions} className="sr-only">Drag an item by its handle to reorder. You can also focus a handle and use the Up and Down arrow keys. Press Escape to cancel a drag.</p>
        <p className="sr-only" role="status" aria-live="polite">{announcement}</p>
        <ol ref={list} className={styles.list} aria-label={label}>
            {ids.map((id, index) => {
                const item = items.find(item => item.id === id);
                if (!item) return null;
                const active = drag?.id === id;
                const target = drag?.target === id && !active;
                const below = drag && ids.indexOf(drag.id) < index;
                return <li key={id} data-sort-id={id} className={`${styles.row} ${styles.sortableRow} ${active ? styles.draggingRow : ''} ${target ? (below ? styles.dropAfter : styles.dropBefore) : ''}`} style={active ? { transform: `translateY(${drag.offset}px)` } : undefined}>
                    <div>{children(item)}<p className={styles.muted}>Position {index + 1}</p></div>
                    <button type="button" className={styles.dragHandle} disabled={disabled || ids.length < 2} aria-label={`Reorder ${item.title}`} aria-describedby={instructions} title="Drag to reorder" onPointerDown={event => {
                        if (disabled || event.button !== 0 || pointer.current) return;
                        event.preventDefault();
                        event.currentTarget.focus({ preventScroll: true });
                        event.currentTarget.setPointerCapture(event.pointerId);
                        const row = event.currentTarget.closest('li').getBoundingClientRect();
                        pointer.current = { id, pointerId: event.pointerId, startY: event.clientY, startCenter: row.top + row.height / 2, x: event.clientX, y: event.clientY, startScroll: window.scrollY, offset: 0, target: id, moved: false };
                        updateDrag();
                        animation.current = requestAnimationFrame(autoScroll);
                    }} onPointerMove={event => {
                        if (pointer.current?.pointerId !== event.pointerId) return;
                        pointer.current.x = event.clientX;
                        pointer.current.y = event.clientY;
                        updateDrag();
                    }} onPointerUp={() => finish()} onPointerCancel={() => finish(true)} onLostPointerCapture={() => { if (pointer.current) finish(true); }} onKeyDown={event => {
                        if (event.key === 'Escape' && pointer.current) { event.preventDefault(); finish(true); }
                        if (!pointer.current && ['ArrowUp', 'ArrowDown'].includes(event.key)) {
                            event.preventDefault();
                            move(id, ids[index + (event.key === 'ArrowUp' ? -1 : 1)]);
                        }
                    }}>
                        <svg aria-hidden="true" width="18" height="24" viewBox="0 0 18 24" fill="currentColor"><circle cx="5" cy="5" r="1.5"/><circle cx="13" cy="5" r="1.5"/><circle cx="5" cy="12" r="1.5"/><circle cx="13" cy="12" r="1.5"/><circle cx="5" cy="19" r="1.5"/><circle cx="13" cy="19" r="1.5"/></svg>
                    </button>
                </li>;
            })}
        </ol>
    </>;
}
