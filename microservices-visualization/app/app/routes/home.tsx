import { type MetaFunction, useFetcher } from 'react-router';
import type { Route } from './+types/home';

export const meta: MetaFunction = () => {
  return [
    { title: 'Food Delivery App' },
    { name: 'description', content: 'Order your favorite food' },
  ];
};

export async function action({ request }: Route.ActionArgs) {
  const formData = await request.formData();
  const items = formData.get('items');
  const customerId = formData.get('customerId');
  const deliveryAddress = formData.get('deliveryAddress');

  try {
    const apiUrl = `${process.env.API_URL}/orders`;

    console.log('API URL:', apiUrl);

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        customerId,
        deliveryAddress,
        items: JSON.parse(items as string),
      }),
    });

    if (!response.ok) {
      console.error('Failed to place order:', response.statusText);
      throw new Error('Failed to place order');
    }

    return { status: 'success' };
  } catch (error) {
    console.error('Error placing order:', error);
    return { status: 'error' };
  }
}

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export default function Home() {
  const fetcher = useFetcher();
  const isSubmitting = fetcher.state === 'submitting';

  // Mock cart data
  const cartItems: CartItem[] = [
    {
      id: '1',
      name: 'Margherita Pizza',
      price: 12.99,
      quantity: 1,
    },
    {
      id: '2',
      name: 'Caesar Salad',
      price: 8.99,
      quantity: 2,
    },
    {
      id: '3',
      name: 'Garlic Bread',
      price: 4.99,
      quantity: 1,
    },
  ];

  const subtotal = cartItems.reduce(
    (total, item) => total + item.price * item.quantity,
    0
  );
  const tax = subtotal * 0.1; // 10% tax
  const total = subtotal + tax;

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

        <fetcher.Form method='post' className='mt-6 space-y-4'>
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
          <input
            type='hidden'
            name='items'
            value={JSON.stringify(
              cartItems.map((item) => ({
                itemId: item.id,
                name: item.name,
                quantity: item.quantity,
                price: item.price,
              }))
            )}
          />

          <button
            type='submit'
            disabled={isSubmitting}
            className='w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed'
          >
            {isSubmitting ? 'Placing Order...' : 'Place Order'}
          </button>

          {fetcher.data?.status === 'success' && (
            <p className='mt-4 text-green-600 dark:text-green-400 text-center'>
              Order placed successfully!
            </p>
          )}

          {fetcher.data?.status === 'error' && (
            <p className='mt-4 text-red-600 dark:text-red-400 text-center'>
              Failed to place order. Please try again.
            </p>
          )}
        </fetcher.Form>
      </div>
    </div>
  );
}
