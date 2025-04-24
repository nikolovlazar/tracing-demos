import { createFileRoute } from '@tanstack/react-router';
import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import * as Sentry from '@sentry/tanstackstart-react';
import { placeOrderFn } from '../functions/place-order.function';
export interface CartItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

export interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

const cartItems: CartItem[] = [
  {
    id: 1,
    name: 'Margherita Pizza',
    price: 12.99,
    quantity: 1,
  },
  {
    id: 2,
    name: 'Caesar Salad',
    price: 8.99,
    quantity: 2,
  },
  {
    id: 3,
    name: 'Garlic Bread',
    price: 4.99,
    quantity: 1,
  },
];

function HomePage() {
  const [orderStatus, setOrderStatus] = useState<'idle' | 'success' | 'error'>(
    'idle'
  );

  const placeOrder = useMutation({
    mutationFn: placeOrderFn,
    onSuccess: () => {
      setOrderStatus('success');
    },
    onError: () => {
      setOrderStatus('error');
    },
  });

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    Sentry.startSpan(
      {
        name: 'Place Order',
        op: 'function',
      },
      (span) => {
        const sentryTrace = Sentry.spanToTraceHeader(span);
        const baggage = Sentry.spanToBaggageHeader(span);

        console.log('sentryTrace: ', sentryTrace);
        console.log('baggage: ', baggage);

        placeOrder.mutate({
          headers: {
            'sentry-trace': sentryTrace,
            baggage: baggage ?? '',
          },
          data: {
            customerId: formData.get('customerId') as string,
            deliveryAddress: formData.get('deliveryAddress') as string,
            items: cartItems.map((item) => ({
              id: item.id,
              name: item.name,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        });
      }
    );
  };

  return (
    <div className='max-w-2xl mx-auto'>
      <div className='bg-white dark:bg-gray-900 rounded-lg shadow-sm p-6'>
        <h2 className='text-2xl font-bold text-gray-900 dark:text-white mb-6'>
          Your Cart
        </h2>

        <div className='space-y-4'>
          {cartItems.map((item) => (
            <div
              key={item.id}
              className='flex justify-between items-center py-4 border-b border-gray-200 dark:border-gray-800'
            >
              <div>
                <h3 className='text-lg font-medium text-gray-900 dark:text-white'>
                  {item.name}
                </h3>
                <p className='text-sm text-gray-500 dark:text-gray-400'>
                  Quantity: {item.quantity}
                </p>
              </div>
              <p className='text-lg font-medium text-gray-900 dark:text-white'>
                ${(item.price * item.quantity).toFixed(2)}
              </p>
            </div>
          ))}
        </div>

        <div className='mt-6 space-y-2'>
          <div className='flex justify-between text-gray-600 dark:text-gray-400'>
            <span>Subtotal</span>
            <span>${subtotal.toFixed(2)}</span>
          </div>
          <div className='flex justify-between text-gray-600 dark:text-gray-400'>
            <span>Tax (10%)</span>
            <span>${tax.toFixed(2)}</span>
          </div>
          <div className='flex justify-between text-lg font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-800'>
            <span>Total</span>
            <span>${total.toFixed(2)}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className='mt-6 space-y-4'>
          <div>
            <label
              htmlFor='deliveryAddress'
              className='block text-sm font-medium text-gray-700 dark:text-gray-300'
            >
              Delivery Address
            </label>
            <input
              type='text'
              id='deliveryAddress'
              name='deliveryAddress'
              defaultValue='123 Main St, Anytown, Canada'
              required
              className='mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:bg-gray-800 dark:border-gray-700'
            />
          </div>

          <input type='hidden' name='customerId' value='1' />

          <button
            type='submit'
            disabled={placeOrder.isPending}
            className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {placeOrder.isPending ? 'Placing Order...' : 'Place Order'}
          </button>

          {orderStatus === 'success' && (
            <p className='mt-4 text-green-600 dark:text-green-400 text-center'>
              Order placed successfully!
            </p>
          )}

          {orderStatus === 'error' && (
            <p className='mt-4 text-red-600 dark:text-red-400 text-center'>
              Failed to place order. Please try again.
            </p>
          )}
        </form>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/')({
  component: HomePage,
});
