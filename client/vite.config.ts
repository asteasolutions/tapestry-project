import { defineConfig, loadEnv, normalizePath } from 'vite'
import react from '@vitejs/plugin-react'
import svgr from 'vite-plugin-svgr'
import { viteStaticCopy } from 'vite-plugin-static-copy'
import { patchCssModules } from 'vite-css-modules'
import path from 'path'
import { createRequire } from 'module'

const pdfjsDistPath = path.dirname(
  createRequire(import.meta.url).resolve('pdfjs-dist/package.json'),
)
const pdfWasmDir = normalizePath(path.join(pdfjsDistPath, 'wasm'))

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      react(),
      svgr(),
      patchCssModules({ generateSourceTypes: true }),
      viteStaticCopy({
        targets: [
          {
            src: pdfWasmDir,
            dest: '',
          },
        ],
      }),
    ],
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
