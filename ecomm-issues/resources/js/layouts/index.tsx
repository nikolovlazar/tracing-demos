import Footer from '@/components/footer';
import Header from '@/components/header';
import { Toaster } from '@/components/ui/sonner';
import { CartProvider } from '@/context/cart-context';

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <>
            <CartProvider>
                <div className="flex min-h-screen flex-col">
                    <Header />
                    <main className="flex-1">{children}</main>
                    <Footer />
                </div>
                <Toaster />
            </CartProvider>
        </>
    );
}
