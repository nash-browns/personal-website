export const SITE_URL = process.env.SITE_URL || 'https://www.nashbrowns.com';
export const SITE_NAME = 'Nash Browns';
export const DEFAULT_IMAGE = '/hippy-hokusai-logo.png';
export const DEFAULT_DESCRIPTION = 'Travel stories, outdoor adventures, photography, and projects by Nash Bostwick.';

export function absoluteUrl(value) {
    return value ? new URL(value, SITE_URL).href : undefined;
}

export function toIsoDate(value) {
    if (!value) return undefined;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function articleDates({ published, publishedTime, updated }) {
    const datePublished = toIsoDate(published || publishedTime);
    const updatedDate = toIsoDate(updated);
    // An older draft timestamp must not claim the article changed before publication.
    const dateModified = updatedDate && (!datePublished || updatedDate >= datePublished)
        ? updatedDate : datePublished;
    return { datePublished, dateModified };
}
