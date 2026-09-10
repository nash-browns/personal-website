import { generateMetadata } from '@/lib/seo';
import { Suspense } from "react"
import { ForgotPassword } from '@/components/auth/forgot-password';
import { AddBackground } from "@/components/styles";
import { SimpleSpinner } from "@/components/loading"


export const metadata = generateMetadata({
    title: 'Reset Password',
    description: 'Reset your Nash Browns account password.',
    index: false,
});

export default async function ForgotPasswordPage({ searchParams }) {
    const { mode, oobCode, apiKey, lang } = await searchParams;

    return (
        <Suspense fallback={<SimpleSpinner/>}>
            <div className="flex justify-center items-center bg-[url('/local-images/forgot-password/dog-shit-3.jpg')] bg-no-repeat bg-cover w-full h-[calc(100vh-64px)] aspect-16/9">
                <AddBackground bgColor="bg-base-100 rounded-xl">
                    <div className="flex flex-col justify-center items-start w-fit m-auto py-4 px-3 opacity-90">
                        <div className="mx-auto w-fit">
                            <div className="flex justify-center items-center w-full text-base-content">
                                <h2 className={`text-3xl p-0 font-didot`}>
                                    {mode === 'resetPassword' ? 'Set New Password' : 'Reset Password'}
                                </h2>
                            </div>
                            <ForgotPassword 
                                mode={mode}
                                oobCode={oobCode}
                                apiKey={apiKey}
                                lang={lang}
                            />
                        </div>
                    </div>
                </AddBackground>
            </div>
        </Suspense>
    );
}

