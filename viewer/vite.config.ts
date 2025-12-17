import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { patchCssModules } from 'vite-css-modules'
import svgr from 'vite-plugin-svgr'

export default defineConfig({
  plugins: [react(), svgr(), patchCssModules({ generateSourceTypes: true })],
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
