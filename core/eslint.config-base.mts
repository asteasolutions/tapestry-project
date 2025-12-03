import js from '@eslint/js'
import tseslint from 'typescript-eslint'

export const allowDefaultProject = ['*.mts', '.prettierrc.cjs']

export default tseslint.config({
  extends: [
    js.configs.recommended,
    ...tseslint.configs.recommendedTypeChecked,
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    parserOptions: {
      projectService: {
        allowDefaultProject,
      },
    },
  },
  files: ['**/*.{ts,tsx}'],
  plugins: {
    '@typescript-eslint': tseslint.plugin,
  },
  rules: {
    '@typescript-eslint/no-unnecessary-condition': 'warn',
    '@typescript-eslint/no-unused-vars': [
      'error',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
    '@typescript-eslint/consistent-type-definitions': 'off',
    '@typescript-eslint/switch-exhaustiveness-check': 'error',
    '@typescript-eslint/no-misused-promises': 'off',
    '@typescript-eslint/prefer-nullish-coalescing': [
      'warn',
      {
        ignorePrimitives: true,
      },
    ],
  },
})
