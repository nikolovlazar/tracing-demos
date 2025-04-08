import { Links, Meta, Outlet, Scripts, ScrollRestoration } from 'react-router';
import './app.css';

export const links = () => [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  {
    rel: 'preconnect',
    href: 'https://fonts.gstatic.com',
    crossOrigin: 'anonymous',
  },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=Inter:ital,opsz,wght@0,14..32,100..900;1,14..32,100..900&display=swap',
  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang='en'>
      <head>
        <meta charSet='utf-8' />
        <meta name='viewport' content='width=device-width, initial-scale=1' />
        <Meta />
        <Links />
      </head>
      <body>
        <div className='min-h-screen bg-white dark:bg-gray-950'>
          <nav className='bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800'>
            <div className='max-w-7xl mx-auto px-4 sm:px-6 lg:px-8'>
              <div className='flex justify-between h-16'>
                <div className='flex'>
                  <div className='flex-shrink-0 flex items-center'>
                    <h1 className='text-xl font-bold text-gray-900 dark:text-white'>
                      Food Delivery App
                    </h1>
                  </div>
                </div>
                <div className='flex items-center'>
                  <div className='relative'>
                    <button className='p-2 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white'>
                      <svg
                        className='w-6 h-6'
                        fill='none'
                        stroke='currentColor'
                        viewBox='0 0 24 24'
                      >
                        <path
                          strokeLinecap='round'
                          strokeLinejoin='round'
                          strokeWidth={2}
                          d='M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z'
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </nav>
          <main className='max-w-7xl mx-auto py-6 sm:px-6 lg:px-8'>
            {children}
          </main>
        </div>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}

export function ErrorBoundary({ error }: { error: Error }) {
  return (
    <div className='min-h-screen bg-white dark:bg-gray-950 flex items-center justify-center'>
      <div className='text-center'>
        <h1 className='text-4xl font-bold text-gray-900 dark:text-white mb-4'>
          Oops!
        </h1>
        <p className='text-gray-600 dark:text-gray-400'>
          {error.message || 'An unexpected error occurred.'}
        </p>
      </div>
    </div>
  );
}
