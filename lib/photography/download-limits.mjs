import { createHash } from 'node:crypto';
import { isIP } from 'node:net';
import { OWNER_EMAIL } from './model.mjs';

export const DOWNLOAD_LIMITS = Object.freeze({ perMinute: 5, perDay: 25, dailyTotal: 250, localPerMinute: 30 });
export const MAX_DOWNLOAD_BYTES = 10 * 1024 * 1024;
const MINUTE = 60_000;
const DAY = 86_400_000;

export class DownloadLimitError extends Error {
    constructor(message, status, retryAfter) {
        super(message);
        this.status = status;
        this.retryAfter = retryAfter;
    }
}

export function downloadVisitor(request, env = process.env) {
    // Only trust forwarding headers supplied by the hosting platform. Other
    // deployments share a conservative fallback bucket until a proxy is configured.
    const address = env.VERCEL === '1' ? request.headers.get('x-vercel-forwarded-for')?.trim() : null;
    if (isIP(address || '') === 4) return address;
    if (isIP(address || '') === 6) {
        const normalized = new URL(`http://[${address}]`).hostname.slice(1, -1);
        const [left, right] = normalized.split('::');
        const start = left ? left.split(':') : [];
        const end = right ? right.split(':') : [];
        const groups = right === undefined ? start : [...start, ...Array(8 - start.length - end.length).fill('0'), ...end];
        // A visitor cannot bypass limits by rotating IPv6 addresses in one /64.
        return groups.slice(0, 4).map(group => Number.parseInt(group, 16).toString(16)).join(':');
    }
    return 'shared-unidentified-visitor';
}

export function createDownloadGuard({ db, now = Date.now, env = process.env }) {
    let localDay = -1;
    let localMinute = -1;
    let localCount = 0;
    let pausedUntil = 0;
    let pauseStatus = 429;
    const visitors = new Map();
    const reference = db.collection('photographyDownloadLimits').doc('current');

    return async function reserveDownload(request) {
        const time = now();
        const day = Math.floor(time / DAY);
        const minute = Math.floor(time / MINUTE);
        const dayEnd = (day + 1) * DAY;
        const minuteEnd = (minute + 1) * MINUTE;
        const reject = (until, status = 429) => {
            throw new DownloadLimitError(status === 429
                ? 'Download limit reached. Please try again later.'
                : 'Downloads are temporarily paused. Please try again later.', status, Math.max(1, Math.ceil((until - time) / 1000)));
        };
        if (env.PHOTOGRAPHY_DOWNLOADS_ENABLED === 'false') reject(time + MINUTE, 503);
        if (pausedUntil > time) reject(pausedUntil, pauseStatus);
        if (localDay !== day) { visitors.clear(); localDay = day; }
        if (localMinute !== minute) { localMinute = minute; localCount = 0; }
        if (localCount >= DOWNLOAD_LIMITS.localPerMinute) reject(minuteEnd);
        const key = createHash('sha256').update(`${day}:${downloadVisitor(request, env)}`).digest('hex');
        const local = visitors.get(key) || { minute, count: 0, total: 0, blockedUntil: 0 };
        if (local.blockedUntil > time) reject(local.blockedUntil);
        if (local.minute !== minute) { local.minute = minute; local.count = 0; }
        if (local.total >= DOWNLOAD_LIMITS.perDay) reject(dayEnd);
        if (local.count >= DOWNLOAD_LIMITS.perMinute) reject(minuteEnd);
        // Reserve locally before awaiting anything: a burst cannot start thousands
        // of Firebase requests in one instance. The transaction is authoritative.
        local.count++;
        local.total++;
        localCount++;
        visitors.set(key, local);
        // Bound memory even under rotating-IP traffic; shared quotas remain intact.
        if (visitors.size > 1000) visitors.delete(visitors.keys().next().value);

        let result;
        try {
            result = await db.runTransaction(async transaction => {
                const snapshot = await transaction.get(reference);
                const stored = snapshot.data();
                // A request started before midnight must not replace a newer day.
                if (stored?.day > day) return { until: time + MINUTE };
                const state = stored?.day === day ? stored : { day, total: 0, visitors: {} };
                async function queueLimitAlert() {
                    const date = new Date(day * DAY).toISOString().slice(0, 10);
                    const alert = db.collection('email_queue').doc(`photography-download-limit-${date}`);
                    const existing = await transaction.get(alert);
                    // Never rewrite a queued/delivered message: the email worker
                    // owns its delivery state. The stable ID also survives retries.
                    if (!existing.exists) transaction.create(alert, {
                        to: [OWNER_EMAIL],
                        from: 'hello@nashbrowns.com',
                        message: {
                            subject: 'Photography download limit reached — nashbrowns.com',
                            text: [
                                `The site-wide photography download limit of ${DOWNLOAD_LIMITS.dailyTotal} attempts was reached on ${date} (UTC).`,
                                `Further downloads are paused until ${new Date(dayEnd).toISOString().replace('T', ' ').replace('.000Z', ' UTC')}. The gallery is still available.`,
                                'This limit counts download attempts, including unsuccessful requests. It may indicate unusually high traffic or automated activity.',
                                'Manage photographs: https://nashbrowns.com/admin',
                                'This notification is sent once per UTC day when the site-wide limit is reached.',
                            ].join('\n\n'),
                        },
                    });
                }
                if (state.total >= DOWNLOAD_LIMITS.dailyTotal) {
                    // Also notify if the limit was already reached before this
                    // feature was deployed. Keep the existing quota in force.
                    if (!state.alertQueued) {
                        await queueLimitAlert();
                        transaction.set(reference, { ...state, alertQueued: true });
                    }
                    return { until: dayEnd, global: true };
                }
                const visitor = state.visitors[key] || { minute, count: 0, total: 0 };
                if (visitor.total >= DOWNLOAD_LIMITS.perDay) return { until: dayEnd };
                const count = visitor.minute === minute ? visitor.count : 0;
                if (count >= DOWNLOAD_LIMITS.perMinute) return { until: minuteEnd };
                const full = state.total + 1 >= DOWNLOAD_LIMITS.dailyTotal;
                // Queue and reserve together: concurrent instances cannot lose or
                // duplicate the alert at the threshold.
                if (full) await queueLimitAlert();
                // One bounded document is overwritten each day. No raw IPs, growing
                // request log, TTL job, or per-request documents are required.
                transaction.set(reference, {
                    day,
                    total: state.total + 1,
                    ...(full ? { alertQueued: true } : {}),
                    visitors: { ...state.visitors, [key]: { minute, count: count + 1, total: visitor.total + 1 } },
                });
                return { full };
            }, { maxAttempts: 3 });
        } catch {
            // Fail closed, and briefly avoid repeated DB calls during an outage.
            pausedUntil = time + 5000;
            pauseStatus = 503;
            reject(pausedUntil, 503);
        }
        if (result.global || result.full) { pausedUntil = dayEnd; pauseStatus = 429; }
        if (result.until) { local.blockedUntil = result.until; reject(result.until); }
    };
}
