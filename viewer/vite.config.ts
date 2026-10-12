import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { patchCssModules } from 'vite-css-modules'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  // Relative asset URLs so the built app can be served from any path
  base: './',
  plugins: [react(), svgr(), patchCssModules({ generateSourceTypes: true })],
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
