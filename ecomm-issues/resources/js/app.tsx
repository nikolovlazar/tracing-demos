import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import * as Sentry from '@sentry/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

Sentry.init({
    dsn: 'https://ffd58318a67ea9d5fafbb266f5bf8314@o4506044970565632.ingest.us.sentry.io/4509227274338304',
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],

    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost'],

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
});

createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx')),
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
