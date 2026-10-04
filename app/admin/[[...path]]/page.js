import { cookies } from 'next/headers';
import { notFound } from 'next/navigation';
import { readServerUser } from '@/lib/firebase/server-session';
import { isOwner } from '@/lib/photography/model.mjs';
import { library } from '@/lib/photography/admin-service';
import { AdminSignIn } from '@/components/photography-admin/sign-in';
import { PhotographyAdmin } from '@/components/photography-admin/admin';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Photography admin' };
export default async function AdminPage({ params }) {
    const path = (await params).path || [];
    if (!(path.length === 0 || path[0] === 'collections' && path.length <= 2 || path[0] === 'photos' && path.length === 2)) notFound();
    const user = await readServerUser(await cookies());
    if (!isOwner(user)) return <AdminSignIn denied={!!user} />;
    return <PhotographyAdmin path={path} initialData={await library()} />;
}
