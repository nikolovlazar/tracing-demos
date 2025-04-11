import { StartClient } from '@tanstack/react-start';
import { hydrateRoot } from 'react-dom/client';

import * as Sentry from '@sentry/tanstackstart-react';

import { createRouter } from './router';

const router = createRouter();

Sentry.init({
  dsn: process.env.VITE_SENTRY_DSN,
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
