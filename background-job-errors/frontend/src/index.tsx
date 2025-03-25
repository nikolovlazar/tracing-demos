/* @refresh reload */
import { render } from 'solid-js/web';
import * as Sentry from '@sentry/solid';
import './index.css';
import App from './App';

Sentry.init({
  dsn: 'https://3521ec9c583739252817b67d6f1a4e9e@o4506044970565632.ingest.us.sentry.io/4509039640772608',
  integrations: [Sentry.browserTracingIntegration()],
  tracesSampleRate: 1.0,
  tracePropagationTargets: ['localhost'],
});

const root = document.getElementById('root');

if (import.meta.env.DEV && !(root instanceof HTMLElement)) {
  throw new Error(
    'Root element not found. Did you forget to add it to your index.html? Or maybe the id attribute got misspelled?'
  );
}

render(() => <App />, root!);
