'use client';

import { useEffect, useRef, useState } from 'react';
import { useInView } from '../media/use-in-view';
import { getRiverGauges, gaugeUrl, isOldReading } from '@/lib/usgs/river-gauges.mjs';
import { pollRiverFlow } from '@/lib/usgs/poll-river-flow.mjs';

export function RiverFlow({ river }) {
    return <RiverFlowReadings key={river} river={river}/>;
}

function RiverFlowReadings({ river }) {
    const config = getRiverGauges(river);
    const { ref, isVisible } = useInView({ once: false });
    const poller = useRef(null);
    const [state, setState] = useState({ readings: null, loading: false, error: null, now: null });

    useEffect(() => {
        if (!isVisible || !config) return;
        const active = pollRiverFlow({ river, onState: update => setState(previous => ({ ...previous, ...update })) });
        poller.current = active;
        return () => { active.stop(); poller.current = null; };
    }, [isVisible, river, config]);

    if (!config) return null;
    const dateFormat = new Intl.DateTimeFormat('en-US', {
        month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
        timeZone: config.timeZone, timeZoneName: 'short',
    });
    const numberFormat = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 });

    return (
        <section ref={ref} aria-label={`${config.name} flow readings`} className="not-prose my-6 w-full rounded-2xl border border-base-content/20 bg-base-100/70 p-4 text-base-content sm:p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <h3 className="text-xl font-semibold">Latest reported flow</h3>
                    <p className="mt-1 text-sm">{config.name} · USGS gauges</p>
                </div>
                <button type="button" className="btn btn-sm btn-outline" disabled={state.loading || !isVisible} onClick={() => poller.current?.refresh()}>
                    {state.loading ? 'Refreshing…' : 'Refresh'}
                </button>
            </div>
            <div role="status" aria-live="polite">
                {state.error && <p className="mt-4 text-sm">{state.error}{state.readings ? ' Last received readings are shown.' : ''}</p>}
                {!state.readings && !state.error && <p className="mt-4 text-sm">Loading USGS readings…</p>}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-3">
                {config.gauges.map(gauge => {
                    const reading = state.readings?.find(item => item.id === gauge.id);
                    const hasValue = reading?.discharge !== null && reading?.discharge !== undefined;
                    const old = reading?.observedAt && isOldReading(reading.observedAt, state.now);
                    return (
                        <div key={gauge.id} className="flex min-w-0 flex-col rounded-xl border border-base-content/15 p-4">
                            <h4 className="min-h-12 text-sm font-semibold leading-6">{gauge.name}</h4>
                            <p className="my-3 text-3xl font-semibold tabular-nums">
                                {hasValue ? <>{numberFormat.format(reading.discharge)} <span className="text-sm font-normal">CFS</span></> : <span className="text-base font-normal">{state.readings || state.error ? 'Reading unavailable' : '—'}</span>}
                            </p>
                            {reading?.observedAt && <p className="text-xs leading-5">Measured <time dateTime={reading.observedAt}>{dateFormat.format(new Date(reading.observedAt))}</time></p>}
                            {old && <p className="mt-1 text-xs font-semibold">Reading is over 2 hours old</p>}
                            {reading?.approvalStatus === 'Provisional' && <p className="mt-1 text-xs">Provisional</p>}
                            {reading?.qualifier && <p className="mt-1 break-words text-xs">USGS flag: {reading.qualifier}</p>}
                            <a className="mt-auto pt-4 text-sm underline underline-offset-4" href={gaugeUrl(gauge.id)} target="_blank" rel="noopener noreferrer" aria-label={`Open ${gauge.name} on USGS (new tab)`}>View gauge on USGS ↗</a>
                        </div>
                    );
                })}
            </div>
            <p className="mt-4 text-xs leading-5">CFS means cubic feet per second. Checks for updates every 5 minutes while visible. Readings may be delayed, and provisional data can change.</p>
        </section>
    );
}
