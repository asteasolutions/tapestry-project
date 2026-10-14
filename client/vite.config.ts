import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
import path from 'path'
import { defineConfig, loadEnv, normalizePath, Plugin } from 'vite'
import { patchCssModules } from 'vite-css-modules'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgr from 'vite-plugin-svgr'
import { blueskyClientMetadata, CLIENT_METADATA_PATH } from './src/auth/bluesky/client-metadata'

const pdfjsDistPath = path.dirname(
  createRequire(import.meta.url).resolve('pdfjs-dist/package.json'),
)
const pdfWasmDir = normalizePath(path.join(pdfjsDistPath, 'wasm'))

function blueskyClientMetadataPlugin(publicUrl: string | undefined): Plugin {
  return {
    name: 'bluesky-client-metadata',
    generateBundle() {
      if (!publicUrl) {
        this.warn(
          `VITE_ATPROTO_CLIENT_ID is not set, so ${CLIENT_METADATA_PATH} won't be generated and Bluesky login will only work on localhost`,
        )
        return
      }
      this.emitFile({
        type: 'asset',
        fileName: CLIENT_METADATA_PATH.slice(1),
        source: JSON.stringify(blueskyClientMetadata(publicUrl), null, 2),
      })
    },
    // The dev server serves the metadata for whatever host it's accessed on, since the client ID
    // must match the URL of the metadata. Note that on localhost a loopback client is used instead.
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== CLIENT_METADATA_PATH) return next()

        const metadata = blueskyClientMetadata(`http://${req.headers.host}`)
        res.setHeader('Content-Type', 'application/json')
        res.end(JSON.stringify(metadata, null, 2))
      })
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      svgr(),
      patchCssModules({ generateSourceTypes: true }),
      viteStaticCopy({
        targets: [{ src: pdfWasmDir, dest: '' }],
      }),
      blueskyClientMetadataPlugin(env.VITE_ATPROTO_CLIENT_ID),
    ],
    build: {
      assetsInlineLimit: 0,
    },
    server: {
      hmr: env.HMR === 'true',
      host: '0.0.0.0',
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
