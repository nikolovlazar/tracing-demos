'use client';

import { useCart } from '@/context/cart-context';
import { cn } from '@/lib/utils';
import { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import { Bug, LogOut, Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CartModal } from './cart-modal';
import { LoginDialog } from './login-dialog';
import { Button } from './ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from './ui/dropdown-menu';

export default function Header() {
    const { url, props } = usePage<SharedData>();
    const pathname = '/' + url.split('/').splice(3).join('/');
    const { itemCount } = useCart();
    const [isCartOpen, setIsCartOpen] = useState(false);
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const [isLoginOpen, setIsLoginOpen] = useState(false);

    const { auth } = props;
    const isAuthenticated = !!auth && !!auth.user;
    const user = auth.user;

    useEffect(() => {
        const handleScroll = () => {
            setIsScrolled(window.scrollY > 10);
        };

        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Close mobile menu when route changes
    useEffect(() => {
        setIsMobileMenuOpen(false);
    }, [pathname]);

    return (
        <header
            className={cn(
                'sticky top-0 z-50 w-full transition-all duration-300',
                isScrolled ? 'bg-background/95 shadow-sm backdrop-blur-sm' : 'bg-background',
            )}
        >
            <div className="container flex h-16 items-center justify-between">
                <div className="flex items-center">
                    <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
                        {isMobileMenuOpen ? <X /> : <Menu />}
                    </Button>

                    <Link href="/" className="flex items-center space-x-2">
                        <Bug className="h-6 w-6 text-red-500" />
                        <span className="text-xl font-bold">ErrorFix</span>
                    </Link>

                    <nav className="ml-10 hidden space-x-6 md:flex">
                        <Link
                            href="/"
                            className={cn(
                                'text-sm font-medium transition-colors hover:text-red-500',
                                pathname === '/' ? 'text-red-500' : 'text-muted-foreground',
                            )}
                        >
                            Home
                        </Link>
                        <Link
                            href="/products/1"
                            className={cn(
                                'text-sm font-medium transition-colors hover:text-red-500',
                                pathname.startsWith('/products') ? 'text-red-500' : 'text-muted-foreground',
                            )}
                        >
                            Shop
                        </Link>
                        <Link
                            href="/cart"
                            className={cn(
                                'text-sm font-medium transition-colors hover:text-red-500',
                                pathname === '/cart' ? 'text-red-500' : 'text-muted-foreground',
                            )}
                        >
                            Cart
                        </Link>
                    </nav>
                </div>

                <div className="flex items-center space-x-4">
                    <Button variant="ghost" size="icon">
                        <Search className="h-5 w-5" />
                    </Button>

                    <Button variant="ghost" size="icon" className="relative" onClick={() => setIsCartOpen(true)}>
                        <ShoppingCart className="h-5 w-5" />
                        {itemCount > 0 && (
                            <span className="text-primary-foreground absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs">
                                {itemCount}
                            </span>
                        )}
                    </Button>

                    {isAuthenticated ? (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="relative">
                                    <User className="h-5 w-5" />
                                    <span className="absolute -top-1 -right-1 flex h-3 w-3 rounded-full bg-red-500"></span>
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="border-gray-800 bg-gray-900">
                                <DropdownMenuLabel className="text-red-500">{user?.name || 'User'}</DropdownMenuLabel>
                                <DropdownMenuSeparator className="bg-gray-800" />
                                <DropdownMenuItem className="text-destructive flex cursor-pointer items-center" onClick={() => {}}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    <span>Logout</span>
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    ) : (
                        <Button
                            variant="outline"
                            size="sm"
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                            onClick={() => setIsLoginOpen(true)}
                        >
                            Login
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile Menu */}
            {isMobileMenuOpen && (
                <div className="border-t md:hidden">
                    <div className="container space-y-2 py-4">
                        <Link href="/" className={cn('block py-2 text-sm font-medium', pathname === '/' ? 'text-red-500' : 'text-muted-foreground')}>
                            Home
                        </Link>
                        <Link
                            href="/products/1"
                            className={cn(
                                'block py-2 text-sm font-medium',
                                pathname.startsWith('/products') ? 'text-red-500' : 'text-muted-foreground',
                            )}
                        >
                            Shop
                        </Link>
                        <Link
                            href="/cart"
                            className={cn('block py-2 text-sm font-medium', pathname === '/cart' ? 'text-red-500' : 'text-muted-foreground')}
                        >
                            Cart
                        </Link>
                    </div>
                </div>
            )}

            <CartModal open={isCartOpen} onClose={() => setIsCartOpen(false)} />
            <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
        </header>
    );
}
