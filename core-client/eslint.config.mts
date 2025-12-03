import eslintConfigBase from 'tapestry-core/eslint.config-base.mts'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import tseslint from 'typescript-eslint'
import { Config } from 'eslint/config'

export const config: Config = {
  plugins: {
    'react-hooks': reactHooks,
  },
  rules: {
    ...reactHooks.configs.recommended.rules,
    'react-hooks/exhaustive-deps': [
      'warn',
      {
        additionalHooks: '(^useAsync$)',
      },
    ],
    'no-console': ['warn', { allow: ['warn', 'error'] }],
    'no-restricted-imports': [
      'error',
      {
        paths: [
          {
            name: 'react-select',
            importNames: ['default'],
            message: 'Please use Select from client/src/components/select/',
          },
        ],
      },
    ],
    'no-fallthrough': 'off',
  },
}

export default tseslint.config({
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
})
