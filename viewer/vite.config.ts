import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { patchCssModules } from 'vite-css-modules';

export default defineConfig({
  plugins: [react(), patchCssModules({ generateSourceTypes: true })],
  esbuild: {
    target: 'ES2020',
  },
  server: {
    port: 5174,
  },
  css: {
    modules: {
      localsConvention: 'camelCaseOnly',
    },
  },
});
