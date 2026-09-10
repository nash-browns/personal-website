import { cookies } from 'next/headers';
import { readServerUser } from '@/lib/firebase/server-session';
import { getPartnerDashboardData } from '@/lib/firebase/partner-page-data';
import { PartnerDashboard } from '@/components/pages/partner-dashboard';
import { generateMetadata } from '@/lib/seo';

export const metadata = generateMetadata({
    index: false,
    title:"Dashboard",
    description:"Nash Browns Partner Login Page",
    keywords: ['Nash Browns', 'Nash', 'Browns', 'Login']
});

export default async function Partners() {
    const user = await readServerUser(await cookies());
    const data = await getPartnerDashboardData(user);
    return <PartnerDashboard data={data}/>;
}
