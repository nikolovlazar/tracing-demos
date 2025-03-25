import { sentryVitePlugin } from "@sentry/vite-plugin";
import { defineConfig } from 'vite';
import solidPlugin from 'vite-plugin-solid';

export default defineConfig({
  plugins: [solidPlugin(), sentryVitePlugin({
    org: "nikolovlazar",
    project: "background-job-errors-solid"
  })],
  server: {
    port: 3000,
  },
  build: {
    target: 'esnext',
    sourcemap: true
  },
});