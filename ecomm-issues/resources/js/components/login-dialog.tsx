import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useForm } from '@inertiajs/react';
import { Loader2 } from 'lucide-react';

type LoginForm = {
    email: string;
    password: string;
};

interface LoginDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function LoginDialog({ open, onOpenChange }: LoginDialogProps) {
    const { data, setData, post, processing, errors, reset } = useForm<Required<LoginForm>>({
        email: '',
        password: '',
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="border-gray-800 bg-gray-900 sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="text-xl text-red-500">Login to ErrorFix</DialogTitle>
                    <DialogDescription>Enter your credentials to access the multiverse's best products.</DialogDescription>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            value={data.email}
                            onChange={(e) => setData('email', e.target.value)}
                            placeholder="you@example.com"
                            className="border-gray-700 bg-gray-800"
                            required
                            disabled={processing}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            value={data.password}
                            onChange={(e) => setData('password', e.target.value)}
                            placeholder="••••••••"
                            className="border-gray-700 bg-gray-800"
                            required
                            disabled={processing}
                        />
                        <p className="text-muted-foreground text-xs">For demo purposes, any password will work with a valid email format.</p>
                    </div>

                    {errors.email && <div className="text-sm font-medium text-red-500">{errors.email}</div>}
                    {errors.password && <div className="text-sm font-medium text-red-500">{errors.password}</div>}

                    <DialogFooter>
                        <Button type="submit" className="w-full bg-red-600 text-white hover:bg-red-700" disabled={processing}>
                            {processing ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Logging in...
                                </>
                            ) : (
                                'Login'
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
