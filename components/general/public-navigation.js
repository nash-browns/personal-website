'use client';

import { useSelectedLayoutSegment } from 'next/navigation';

// These layouts render their own navigation inside the account's AuthProvider.
// Public pages only need this small route switch and the server-rendered navbar.
export function PublicNavigation({ children, photographyNavigation }) {
    const segment = useSelectedLayoutSegment();
    if (['admin', 'partners', 'signup', 'forgot-password'].includes(segment)) return null;
    return segment === 'photography' ? photographyNavigation : children;
}
