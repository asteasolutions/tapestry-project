import eslintConfigBase from 'tapestry-core/eslint.config-base.mts'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import { config } from 'tapestry-core-client/eslint.config.mts'

export default tseslint.config(
  { ignores: ['dist'] },
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
)
