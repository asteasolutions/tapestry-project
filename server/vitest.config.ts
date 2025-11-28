import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    exclude: ['node_modules'],
    globalSetup: './src/__tests__/setup.ts',
    maxWorkers: 1,
  },
})
