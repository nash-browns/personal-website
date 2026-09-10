import { getUserTenant } from './tenant-auth';
import { getTenantServer } from './firestore/tenants';
import { getTenantContent } from './firestore/content';
import { getAllUsersForTenant } from './firestore/users';

const hasTenant = id => id !== null && id !== undefined && id !== '';

export async function getPartnerDashboardData(user) {
    if (!user) return { userId: null, status: 'signed-out' };
    try {
        const tenantId = await getUserTenant(user.email);
        if (!hasTenant(tenantId)) return { userId: user.uid, status: 'unassigned' };
        if (String(tenantId) === '0') return { userId: user.uid, status: 'ready', tenantId: '0' };
        const [tenant, content] = await Promise.all([getTenantServer(tenantId), getTenantContent(tenantId)]);
        const byDate = (a, b) => new Date(b.published_at) - new Date(a.published_at);
        return {
            userId: user.uid, status: 'ready', tenantId: String(tenantId),
            tenantData: JSON.stringify(tenant),
            tenantVideos: JSON.stringify(content.filter(item => item.type === 'video').sort(byDate)),
            tenantArticles: JSON.stringify(content.filter(item => item.type === 'blog').sort(byDate)),
        };
    } catch {
        return { userId: user.uid, status: 'error' };
    }
}

export async function getPartnerUsersData(user) {
    if (!user) return { userId: null, status: 'signed-out', users: [] };
    try {
        const tenantId = await getUserTenant(user.email);
        if (!hasTenant(tenantId)) return { userId: user.uid, status: 'unassigned', users: [] };
        const users = await getAllUsersForTenant(tenantId);
        return { userId: user.uid, status: 'ready', users: JSON.parse(JSON.stringify(users)) };
    } catch {
        return { userId: user.uid, status: 'error', users: [] };
    }
}
