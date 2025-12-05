import eslintConfigBase from 'tapestry-core/eslint.config-base.mts'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config({
  extends: [...eslintConfigBase],
  languageOptions: {
    parser: tseslint.parser,
    ecmaVersion: 2023,
    globals: globals.es2023,
    parserOptions: {
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
