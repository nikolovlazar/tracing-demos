import { Button } from '@/components/ui/button';
import { Link } from '@inertiajs/react';
import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Hero() {
    const [text, setText] = useState('');
    const fullText = 'Code breaks... fix it faster';

    useEffect(() => {
        let currentIndex = 0;
        const interval = setInterval(() => {
            if (currentIndex <= fullText.length) {
                setText(fullText.slice(0, currentIndex));
                currentIndex++;
            } else {
                clearInterval(interval);
            }
        }, 100);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="relative">
            <div
                className="absolute inset-0 z-0 bg-cover bg-center"
                style={{
                    backgroundImage:
                        'url(https://images.unsplash.com/photo-1555066931-4365d14bab8c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1950&q=80)',
                    opacity: 0.3,
                }}
            />
            <div className="from-background absolute inset-0 z-10 bg-gradient-to-r to-transparent" />

            <div className="relative z-20 container">
                <div className="flex min-h-[70vh] flex-col items-start justify-center py-16">
                    <h1 className="text-primary mb-6 max-w-[50%] text-5xl leading-tight font-bold tracking-tight md:text-7xl">
                        {text}
                        <motion.span animate={{ opacity: [0, 1, 0] }} transition={{ repeat: Infinity, duration: 1 }} className="ml-1 inline-block">
                            |
                        </motion.span>
                    </h1>
                    <p className="text-muted-foreground ma x-w-xl mb-8 w-1/2 text-lg md:text-xl">
                        Because debugging is twice as hard as writing the code in the first place. Buy our premium error fixes and get back to
                        building features instead of fixing bugs. Your git blame history will thank you.
                    </p>
                    <div className="flex flex-col gap-4 sm:flex-row">
                        <Button asChild size="lg" className="bg-red-600 px-8 py-6 text-lg text-white hover:bg-red-700">
                            <Link href="/products/1">Fix Now</Link>
                        </Button>
                        <Button variant="outline" size="lg" className="border-red-600 px-8 py-6 text-lg text-red-500 hover:bg-red-600/10">
                            <Link href="#featured">Browse Featured Products</Link>
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
}
