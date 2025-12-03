import eslintConfigBase, { allowDefaultProject } from 'tapestry-core/eslint.config-base.mts'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  { ignores: ['dist'] },
  {
    extends: [...eslintConfigBase],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2023,
      globals: globals.es2023,
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        projectService: {
          allowDefaultProject: [...allowDefaultProject, 'prisma/scripts/*.ts'],
        },
      },
    },
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@prisma/client/*'],
              allowImportNames: ['ITXClientDenyList', 'GetResult'],
              message: 'Please use only ITXClientDenyList and GetResult from @prisma/client/*',
            },
          ],
        },
      ],
    },
  },
)
