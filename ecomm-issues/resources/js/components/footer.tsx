import { Link } from '@inertiajs/react';
import { Bug, Facebook, Instagram, Twitter } from 'lucide-react';

export default function Footer() {
    return (
        <footer className="bg-gray-900 text-white">
            <div className="container mx-auto px-4 py-10">
                <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
                    <div className="space-y-4">
                        <Link href="/" className="flex items-center space-x-2">
                            <Bug className="h-6 w-6 text-red-500" />
                            <span className="text-xl font-bold">ErrorFix</span>
                        </Link>
                        <p className="text-sm text-gray-400">Good'ish solutions for your most frustrating development errors</p>
                        <div className="flex space-x-4">
                            <a href="#" className="text-gray-400 transition-colors hover:text-white">
                                <Twitter className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-gray-400 transition-colors hover:text-white">
                                <Facebook className="h-5 w-5" />
                            </a>
                            <a href="#" className="text-gray-400 transition-colors hover:text-white">
                                <Instagram className="h-5 w-5" />
                            </a>
                        </div>
                    </div>
                    <div>
                        <h3 className="mb-4 text-lg font-medium">Shop</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="/products/1" className="text-gray-400 transition-colors hover:text-white">
                                    All Products
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-400 transition-colors hover:text-white">
                                    Featured Solutions
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-400 transition-colors hover:text-white">
                                    New Arrivals
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-400 transition-colors hover:text-white">
                                    Pricing
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-4 text-lg font-medium">Support</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="#" className="text-gray-400 transition-colors hover:text-white">
                                    Help Center
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-400 transition-colors hover:text-white">
                                    Documentation
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-400 transition-colors hover:text-white">
                                    Contact Us
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-400 transition-colors hover:text-white">
                                    FAQ
                                </Link>
                            </li>
                        </ul>
                    </div>
                    <div>
                        <h3 className="mb-4 text-lg font-medium">Legal</h3>
                        <ul className="space-y-2">
                            <li>
                                <Link href="#" className="text-gray-400 transition-colors hover:text-white">
                                    Terms of Service
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-400 transition-colors hover:text-white">
                                    Privacy Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-400 transition-colors hover:text-white">
                                    Refund Policy
                                </Link>
                            </li>
                            <li>
                                <Link href="#" className="text-gray-400 transition-colors hover:text-white">
                                    Cookie Policy
                                </Link>
                            </li>
                        </ul>
                    </div>
                </div>
                <div className="mt-10 border-t border-gray-800 pt-6 text-center text-sm text-gray-400">
                    <p>&copy; {new Date().getFullYear()} ErrorFix. All rights reserved.</p>
                </div>
            </div>
        </footer>
    );
}
