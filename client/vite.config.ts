import react from '@vitejs/plugin-react'
import { createRequire } from 'module'
import path from 'path'
import { defineConfig, loadEnv, normalizePath, Plugin } from 'vite'
import { patchCssModules } from 'vite-css-modules'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import svgr from 'vite-plugin-svgr'
import { blueskyClientMetadata } from './src/auth/bluesky/client-metadata'

const pdfjsDistPath = path.dirname(
  createRequire(import.meta.url).resolve('pdfjs-dist/package.json'),
)
const pdfWasmDir = normalizePath(path.join(pdfjsDistPath, 'wasm'))

function blueskyClientMetadataPlugin(client_id: string | undefined, redirectUri: string): Plugin {
  if (!client_id) {
    return {
      name: 'bluesky-client-metadata',
      configResolved() {
        console.warn(
          'VITE_ATPROTO_CLIENT_ID is not set. Bluesky login metadata will not be generated.',
        )
      },
    }
  }
  const metadataPath = new URL(client_id).pathname
  const fileName = metadataPath.slice(1)

  return {
    name: 'bluesky-client-metadata',
    generateBundle() {
      this.emitFile({
        type: 'asset',
        fileName: fileName,
        source: JSON.stringify(blueskyClientMetadata(client_id, redirectUri), null, 2),
      })
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (req.url?.split('?')[0] !== metadataPath) return next()

        const metadata = blueskyClientMetadata(client_id, redirectUri)
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
      // Not importing src/config.ts here since it can only be evaluated on the frontend
      env.VITE_AUTH_PROVIDERS.toLowerCase().includes('bluesky') &&
        blueskyClientMetadataPlugin(env.VITE_ATPROTO_CLIENT_ID, env.VITE_OAUTH_REDIRECT_URI),
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
