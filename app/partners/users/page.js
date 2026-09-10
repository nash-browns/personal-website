import { cookies } from 'next/headers';
import { readServerUser } from '@/lib/firebase/server-session';
import { getPartnerUsersData } from '@/lib/firebase/partner-page-data';
import { Users } from '@/components/pages/users';
import { generateMetadata } from '@/lib/seo';

export const metadata = generateMetadata({
    index: false,
    title:"Users",
    description:"View User Information",
    keywords: []
});

export default async function UserPage() {
    const user = await readServerUser(await cookies());
    const data = await getPartnerUsersData(user);
    return <Users data={data}/>;
}
