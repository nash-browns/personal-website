import { generateMetadata } from '@/lib/seo';
import { Suspense } from "react"
import { SignUp } from '@/components/general/sign-up';
import { AddBackground } from "@/components/styles";
import { SimpleSpinner } from "@/components/loading"


export const metadata = generateMetadata({
    title: 'Sign Up',
    description: 'Create a Nash Browns partner account.',
    index: false,
});

export default function SignUpPage() {
    return (
        <Suspense fallback={<SimpleSpinner/>}>
            <div className="flex justify-center items-center bg-[url('/local-images/signup/sking.jpg')] bg-no-repeat bg-cover w-full h-[calc(100vh-64px)] aspect-16/9">
                <AddBackground bgColor="bg-base-100 rounded-xl">
                    <div className="flex flex-col justify-center items-start w-fit m-auto py-4 px-3 opacity-90">
                        <div className="mx-auto w-fit">
                            <div className="flex justify-center items-center w-full text-base-content">
                                <h2 className={`text-3xl p-0 font-didot`}>Sign Up</h2>
                            </div>
                            <SignUp/>
                        </div>
                    </div>
                </AddBackground>
            </div>
        </Suspense>
    );
}
