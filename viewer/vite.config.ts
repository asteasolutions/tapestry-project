import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { patchCssModules } from 'vite-css-modules'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), svgr(), patchCssModules({ generateSourceTypes: true })],
  resolve: {
    // @asteasolutions/epub-reader imports plain lodash internally, but declares only
    // lodash-es. Resolve it to the real dependency instead of installing both.
    alias: {
      lodash: 'lodash-es',
    },
  },
  build: {
    assetsInlineLimit: 0,
  },
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
})
