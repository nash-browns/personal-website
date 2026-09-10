import { AuthProvider } from '@/lib/firebase/auth-context';
import { NavBar } from '@/components/general/navbar';
import { PartnerAccountLinks } from './partner-account-links';

export function AccountLayout({ children }) {
    return (
        <AuthProvider>
            <NavBar
                partnerLinks={<PartnerAccountLinks/>}
                mobilePartnerLinks={<PartnerAccountLinks mobile/>}
            />
            {children}
        </AuthProvider>
    );
}
