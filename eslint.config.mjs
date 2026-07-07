import tseslint from 'typescript-eslint'
import js from '@eslint/js'

/**
 * Custom ESLint rule: disallow .select('*') on Supabase queries.
 * Forces explicit column selection for query performance.
 */
function noSelectStar(context) {
  return {
    CallExpression(node) {
      if (
        node.callee.type === 'MemberExpression' &&
        node.callee.property.name === 'select' &&
        node.arguments.length >= 1 &&
        node.arguments[0].type === 'Literal' &&
        node.arguments[0].value === '*'
      ) {
        context.report({
          node: node.arguments[0],
          message: 'Avoid .select("*") — specify exact columns for query performance.',
        })
      }
    },
  }
}

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'audit_artifacts/'],
  },
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    plugins: {
      'custom': {
        rules: {
          'no-select-star': {
            create: noSelectStar,
          },
        },
      },
    },
    rules: {
      'custom/no-select-star': 'warn',
    },
  },
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      globals: {
        Deno: 'readonly',
        console: 'readonly',
        fetch: 'readonly',
        URL: 'readonly',
        Headers: 'readonly',
        Request: 'readonly',
        Response: 'readonly',
        AbortController: 'readonly',
        crypto: 'readonly',
        Uint8Array: 'readonly',
        TextEncoder: 'readonly',
        TextDecoder: 'readonly',
        Buffer: 'readonly',
        atob: 'readonly',
        btoa: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      'no-restricted-globals': 'off',
    },
  },
]
