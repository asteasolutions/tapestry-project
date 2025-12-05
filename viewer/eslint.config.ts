import eslintConfigBase from 'tapestry-core/eslint.config-base.mts'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import { config } from 'tapestry-core-client/eslint.config.mts'

export default defineConfig([
  globalIgnores(['dist']),
  {
    extends: [...eslintConfigBase],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
      },
    },
    ...config,
  },
])
