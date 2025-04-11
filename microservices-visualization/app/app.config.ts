import { defineConfig } from '@tanstack/react-start/config';
import viteTsConfigPaths from 'vite-tsconfig-paths';
import tailwindcss from '@tailwindcss/vite';
import { sentryVitePlugin } from '@sentry/vite-plugin';
import { wrapVinxiConfigWithSentry } from '@sentry/tanstackstart-react';

const config = defineConfig({
  tsr: {
    appDirectory: 'src',
  },
  vite: {
    plugins: [
      // this is the plugin that enables path aliases
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
      sentryVitePlugin({
        org: 'nikolovlazar',
        project: 'microservices-app',
        authToken: process.env.SENTRY_AUTH_TOKEN,
        silent: !process.env.CI,
      }),
    ],
  },
});

export default wrapVinxiConfigWithSentry(config, {
  org: 'nikolovlazar',
  project: 'microservices-app',
  authToken: process.env.SENTRY_AUTH_TOKEN,

  silent: !process.env.CI,
});
