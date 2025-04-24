import { StartClient } from '@tanstack/react-start';
import { hydrateRoot } from 'react-dom/client';

import * as Sentry from '@sentry/tanstackstart-react';

import { createRouter } from './router';

const router = createRouter();

Sentry.init({
  dsn: 'https://382128e6ec4d247dd107546a6331e90b@o4506044970565632.ingest.us.sentry.io/4509119594364928',
  debug: true,
  integrations: [
    Sentry.tanstackRouterBrowserTracingIntegration(router),
    Sentry.replayIntegration(),
  ],

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  tracesSampleRate: 1.0,

  // Capture Replay for 10% of all sessions,
  // plus for 100% of sessions with an error.
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,

  tracePropagationTargets: ['localhost', 'http://localhost:3000', '127.0.0.1'],
});

hydrateRoot(document, <StartClient router={router} />);
