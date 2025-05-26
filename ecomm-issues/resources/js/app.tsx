import '../css/app.css';

import { createInertiaApp } from '@inertiajs/react';
import * as Sentry from '@sentry/react';
import { resolvePageComponent } from 'laravel-vite-plugin/inertia-helpers';
import { createRoot } from 'react-dom/client';

const appName = import.meta.env.VITE_APP_NAME || 'Laravel';

const client = Sentry.init({
    dsn: 'https://ffd58318a67ea9d5fafbb266f5bf8314@o4506044970565632.ingest.us.sentry.io/4509227274338304',
    integrations: [Sentry.browserTracingIntegration({
        instrumentNavigation: false,
    }), Sentry.replayIntegration()],

    tracesSampleRate: 1.0,
    tracePropagationTargets: ['localhost'],

    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
});


createInertiaApp({
    title: (title) => `${title} - ${appName}`,
    resolve: (name) => {
        let routeName = name;

        if (name === 'products/show') {
            routeName = 'products/{product_id}';
        }

        Sentry.startBrowserTracingNavigationSpan(client!, {
            name: routeName,
            op: 'navigation',
            attributes: {
                [Sentry.SEMANTIC_ATTRIBUTE_SENTRY_SOURCE]: 'route',
            }
        })
        return resolvePageComponent(`./pages/${name}.tsx`, import.meta.glob('./pages/**/*.tsx'));
    },
    setup({ el, App, props }) {
        const root = createRoot(el);

        root.render(<App {...props} />);
    },
    progress: {
        color: '#4B5563',
    },
});
