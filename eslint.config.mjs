import nextPlugin from '@next/eslint-plugin-next'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default tseslint.config(
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      '.claude/**',
      '.serena/**',
      '.vscode/**',
      'dist/**',
      'build/**',
      'out/**'
    ]
  },
  ...tseslint.configs.recommended,
  nextPlugin.configs['core-web-vitals'],
  {
    plugins: {
      'react-hooks': reactHooks
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      // Allow setState in useEffect for hydration patterns (setIsMounted, etc.)
      'react-hooks/set-state-in-effect': 'off',
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }
      ]
    }
  }
)
