import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
import path from 'path'
import { defineConfig, loadEnv, normalizePath } from 'vite'
import { patchCssModules } from 'vite-css-modules'
import { VitePWA } from 'vite-plugin-pwa'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgr from 'vite-plugin-svgr'

const pdfjsDistPath = path.dirname(
  createRequire(import.meta.url).resolve('pdfjs-dist/package.json'),
)
const pdfWasmDir = normalizePath(path.join(pdfjsDistPath, 'wasm'))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      svgr(),
      patchCssModules({ generateSourceTypes: true }),
      viteStaticCopy({
        targets: [{ src: pdfWasmDir, dest: '' }],
        hook: 'generateBundle',
      }),
      VitePWA({
        manifest: false,
        registerType: 'autoUpdate',
        workbox: {
          maximumFileSizeToCacheInBytes: 5 * 1000 * 1000,
          cleanupOutdatedCaches: true,
          globPatterns: ['**/*.{js,css,html,gif,png,svg,webmanifest,wasm,mjs}'],
          runtimeCaching: [
            {
              handler: 'CacheFirst',
              // TODO: We should handle this in a more stable way. We might not be using amazon's S3.
              urlPattern: ({ url }) => url.host.endsWith('amazonaws.com'),
              options: { cacheName: 'remote-assets' },
            },
            {
              handler: 'NetworkFirst',
              urlPattern: new RegExp(`^${env.VITE_API_URL}`),
              options: { cacheName: 'api-responses' },
            },
            // TODO: This should be prefetched
            {
              handler: 'CacheFirst',
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              options: { cacheName: 'google-fonts-cache' },
            },
            {
              handler: 'CacheFirst',
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              options: { cacheName: 'gstatic-fonts-cache' },
            },
          ],
        },
      }),
    ],
    server: {
      hmr: env.HMR === 'true',
      host: '0.0.0.0',
    },
    preview: {
      port: 5173,
      cors: {
        origin: '*',
      },
    },
    esbuild: {
      target: 'ES2020',
    },
    css: {
      modules: {
        localsConvention: 'camelCaseOnly',
      },
    },
  }
})
