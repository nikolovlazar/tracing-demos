import { CheckoutSummary } from '@/components/checkout-summary';
import { LoginDialog } from '@/components/login-dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useCart } from '@/context/cart-context';
import Layout from '@/layouts';
import { SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/react';
import axios from 'axios';
import { CheckCircle, CreditCard, Lock } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type PurchaseForm = {
    email: string;
    cardNumber: string;
    expiryDate: string;
    cvv: string;
    nameOnCard: string;
    items: Array<{ id: string; quantity: number }>;
    totalAmount: number;
};

const CheckoutPage = () => {
    const { props } = usePage<SharedData>();
    const { items, totalPrice, clearCart } = useCart();
    const [isLoginOpen, setIsLoginOpen] = useState(false);
    const [purchaseComplete, setPurchaseComplete] = useState(false);

    // Mock payment data
    const mockPaymentData = {
        cardNumber: '4242 4242 4242 4242',
        expiryDate: '12/25',
        cvv: '123',
        nameOnCard: 'Rick Sanchez',
    };

    const [data, setData] = useState<PurchaseForm>({
        email: props.auth?.user?.email || '',
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        nameOnCard: '',
        items: [],
        totalAmount: 0,
    });

    const [processing, setProcessing] = useState(false);

    const { auth } = props;
    const isAuthenticated = !!auth && !!auth.user;

    // Mock payment data state
    const [useMockPayment, setUseMockPayment] = useState(false);

    useEffect(() => {
        if (items.length > 0 && totalPrice > 0 && data.items.length === 0) {
            setData({
                ...data,
                items: items.map((item) => ({ id: `${item.id}`, quantity: item.quantity })),
                totalAmount: totalPrice,
            });
        }
    }, [items, data, setData, totalPrice]);

    useEffect(() => {
        if (props.auth?.user?.email && data.email === '') {
            setData({ ...data, email: props.auth.user.email });
        }
    }, [props, data, setData]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Prevent checkout if not authenticated
        if (!isAuthenticated) {
            setIsLoginOpen(true);
            return;
        }

        setProcessing(true);

        try {
            const response = await axios.post('/purchase', data, {
                headers: {
                    Accept: 'application/json',
                },
            });

            if (response.status === 200) {
                clearCart();
                setPurchaseComplete(true);
            }
        } catch (error: any) {
            if (error.response?.data?.message?.includes('admin email')) {
                toast.error('Email Not Allowed', { 
                    description: 'Purchasing with the admin email is not allowed. Please use a different email address.'
                });
            } else {
                toast.error('Error', {
                    description: error.response?.data?.message || 'An unexpected error occurred during checkout.',
                });
            }
        } finally {
            setProcessing(false);
    };

    if (purchaseComplete) {
        return (
            <div className="container mx-auto flex max-w-md flex-col items-center justify-center space-y-6 py-16">
                <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-900">
                    <CheckCircle className="h-10 w-10 text-green-500" />
                </div>
                <h1 className="text-center text-3xl font-bold">Errors Fixed!</h1>
                <p className="text-muted-foreground text-center">
                    Thank you for your purchase. We've sent a confirmation email with your purchase list.
                </p>
                <Button className="bg-green-600 text-white hover:bg-green-700" asChild>
                    <Link href="/">Continue Shopping</Link>
                </Button>
            </div>
        );
    }

    if (items.length === 0 && !purchaseComplete) {
        return null;
    }

    return (
        <div className="container mx-auto max-w-5xl px-4 py-10">
            {!isAuthenticated && (
                <div className="mx-auto mb-6 max-w-3xl rounded-lg border border-red-800 bg-red-900/30 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="font-medium text-red-200">Login Required</h2>
                            <p className="text-sm text-red-300">You must be logged in to complete checkout</p>
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setIsLoginOpen(true)}
                            className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                        >
                            Login
                        </Button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 grid-rows-[30px_1fr] gap-8 lg:grid-cols-7">
                <h1 className="mb-6 text-center text-3xl font-bold text-red-500 lg:col-span-4">Secure Checkout</h1>
                <div className="lg:col-span-4">
                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="space-y-4 rounded-lg border border-gray-800 p-4">
                            <div className="flex items-center">
                                <h2 className="text-xl font-semibold">Contact Information</h2>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="email">Email</Label>
                                    <Input
                                        id="email"
                                        type="email"
                                        value={data.email}
                                        onChange={(e) => setData({ ...data, email: e.target.value })}
                                        required
                                        disabled={isAuthenticated}
                                        className="border-gray-700 bg-gray-800"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4 rounded-lg border border-gray-800 p-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <Lock className="mr-2 h-4 w-4 text-red-500" />
                                    <h2 className="text-xl font-semibold">Payment</h2>
                                </div>

                                <div className="flex items-center space-x-2">
                                    <Checkbox
                                        id="useMockPayment"
                                        checked={useMockPayment}
                                        onCheckedChange={(checked) => {
                                            setUseMockPayment(checked === true);
                                            if (checked) {
                                                setData({
                                                    ...data,
                                                    cardNumber: mockPaymentData.cardNumber,
                                                    expiryDate: mockPaymentData.expiryDate,
                                                    cvv: mockPaymentData.cvv,
                                                    nameOnCard: mockPaymentData.nameOnCard,
                                                });
                                            } else {
                                                setData({
                                                    ...data,
                                                    cardNumber: '',
                                                    expiryDate: '',
                                                    cvv: '',
                                                    nameOnCard: '',
                                                });
                                            }
                                        }}
                                        className="border-red-500 data-[state=checked]:bg-red-500 data-[state=checked]:text-white"
                                    />
                                    <Label htmlFor="useMockPayment" className="cursor-pointer text-sm">
                                        Use test payment data
                                    </Label>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="space-y-2">
                                    <Label htmlFor="cardNumber">Card Number</Label>
                                    <div className="relative">
                                        <Input
                                            id="cardNumber"
                                            placeholder="1234 5678 9012 3456"
                                            value={data.cardNumber}
                                            onChange={(e) => setData({ ...data, cardNumber: e.target.value })}
                                            required
                                            className="border-gray-700 bg-gray-800 pr-10 pl-3"
                                        />
                                        <CreditCard className="text-muted-foreground absolute top-1/2 right-3 -translate-y-1/2 transform" />
                                    </div>
                                    <p className="text-muted-foreground text-xs">For demo purposes, any card number will work.</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="expiryDate">Expiry Date</Label>
                                        <Input
                                            id="expiryDate"
                                            placeholder="MM/YY"
                                            value={data.expiryDate}
                                            onChange={(e) => setData({ ...data, expiryDate: e.target.value })}
                                            required
                                            className="border-gray-700 bg-gray-800"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="cvv">Security Code</Label>
                                        <Input
                                            id="cvv"
                                            placeholder="123"
                                            value={data.cvv}
                                            onChange={(e) => setData({ ...data, cvv: e.target.value })}
                                            required
                                            className="border-gray-700 bg-gray-800"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="nameOnCard">Name on Card</Label>
                                    <Input
                                        id="nameOnCard"
                                        value={data.nameOnCard}
                                        onChange={(e) => setData({ ...data, nameOnCard: e.target.value })}
                                        required
                                        className="border-gray-700 bg-gray-800"
                                    />
                                </div>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full bg-red-600 text-white hover:bg-red-700"
                            size="lg"
                            disabled={processing || !isAuthenticated}
                        >
                            {!isAuthenticated ? 'Login Required' : processing ? 'Processing...' : `Pay $${totalPrice.toFixed(2)}`}
                        </Button>

                        <div className="text-muted-foreground flex items-center justify-center text-xs">
                            <Lock className="mr-1 h-3 w-3" />
                            <span>Secure checkout powered by ErrorFix</span>
                        </div>
                    </form>
                </div>

                <div className="lg:col-span-3">
                    <CheckoutSummary />
                </div>
            </div>

            <LoginDialog open={isLoginOpen} onOpenChange={setIsLoginOpen} />
        </div>
    );
};

CheckoutPage.layout = (page: React.ReactNode) => <Layout>{page}</Layout>;

export default CheckoutPage;
