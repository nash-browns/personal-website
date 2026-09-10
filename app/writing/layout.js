import { MdxLayout } from '@/components/blog/mdx-layout';
import { Footer } from '@/components/blog/footer';

export default function WritingLayout({ children }) {
    return (
        <>
            <div className="w-full h-full min-h-screen">
                <MdxLayout>
                    {children}
                </MdxLayout>
            </div>
            <Footer/>
        </>
    );
}
