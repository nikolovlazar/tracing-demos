import { getRouterManifest } from '@tanstack/react-start/router-manifest';
import {
  createStartHandler,
  defaultStreamHandler,
} from '@tanstack/react-start/server';

import { createRouter } from './router';

import * as Sentry from '@sentry/tanstackstart-react';

Sentry.init({
  dsn: 'https://382128e6ec4d247dd107546a6331e90b@o4506044970565632.ingest.us.sentry.io/4509119594364928',

  // Set tracesSampleRate to 1.0 to capture 100%
  // of transactions for tracing.
  // We recommend adjusting this value in production
  // Learn more at
  // https://docs.sentry.io/platforms/javascript/configuration/options/#traces-sample-rate
  tracesSampleRate: 1.0,

  tracePropagationTargets: [
    process.env.API_URL!,
    'localhost',
    'kong',
    'kong:8000',
    '127.0.0.1',
  ],
});

export default createStartHandler({
  createRouter,
  getRouterManifest,
})(Sentry.wrapStreamHandlerWithSentry(defaultStreamHandler));
