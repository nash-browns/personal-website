import Image from 'next/image';
import { ContactUs } from '@/components/blog/forms/contact-us';
import { Login } from '@/components/general/login';
import { generateMetadata } from '@/lib/seo';

//Images
import hippyDoor from '@/public/local-images/login/hippy-door.png'

export const metadata = generateMetadata({
    title:"Partners",
    description:"Nash Browns Partner Login Page",
    keywords: ['Nash Browns', 'Nash', 'Browns', 'Login']
});

export default function Partners() {
    return(
        <>
            <LoginForm/>
            <br className="md:hidden"/>
            <div id="contact" className="flex justify-center items-center bg-[url('/local-images/login/hippy-coperation.jpg')] bg-no-repeat bg-cover w-full min-h-screen aspect-16/9">
                <div className="flex flex-col justify-center items-start w-3/4 m-auto py-10 px-3 rounded-xl bg-base-100/50 backdrop-blur-md shadow-md border border-transparent">
                    <ContactUs/>
                </div>
            </div>
        </>
    )
}


function LoginForm() {
    return(
        <div className="relative flex items-center justify-center w-full min-h-screen md:w-3/4 md:mx-auto md:gap-40 md:justify-evenly md:min-h-[calc(100vh-64px)]">
            <div className="absolute inset-0 md:relative md:inset-auto md:w-96 md:min-w-0 md:aspect-[2/3]">
                <Image
                    alt="Door"
                    src={hippyDoor}
                    fill
                    sizes="(min-width: 768px) 384px, 100vw"
                    loading="eager"
                    fetchPriority="high"
                    className="object-cover object-left-top"
                />
            </div>
            <div className="relative flex flex-col justify-center items-start w-3/4 m-auto py-10 px-3 rounded-xl opacity-90 bg-[url('/textures/noise-grey-2.png')] bg-repeat bg-[length:50px] md:w-fit md:min-w-80 md:m-0 md:p-0 md:rounded-none md:opacity-100 md:bg-none">
                <Login/>
            </div>
        </div>
    )
}
