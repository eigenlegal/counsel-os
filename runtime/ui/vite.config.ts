import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The runtime serves this build from its own origin (`runtime/ui/dist`, see
 * `runtime/src/server/static.ts`), so the app is always at the root and the
 * API is same-origin: no base path to configure, no CORS, no API host.
 *
 * `vite dev` is the one case where that is not true — the page comes from
 * Vite's port and the runtime is on its own — so the dev server proxies
 * exactly the API prefixes the runtime enforces (`API_PREFIXES` in
 * `runtime/src/server/routes.ts`). Anything not on that list is the SPA
 * shell, in dev the same way it is in production.
 */
const RUNTIME_URL = process.env.RUNTIME_URL ?? 'http://127.0.0.1:7431';

const API_PREFIXES = ['/health', '/threads', '/runs', '/vault', '/settings', '/proposals'];

export default defineConfig({
  plugins: [react()],
  base: '/',
  build: { outDir: 'dist', emptyOutDir: true, sourcemap: true },
  server: {
    proxy: Object.fromEntries(API_PREFIXES.map(prefix => [prefix, { target: RUNTIME_URL, changeOrigin: false }])),
  },
});
