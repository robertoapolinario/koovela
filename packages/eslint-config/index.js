import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';
import i18next from 'eslint-plugin-i18next';
import koovela from './rules/index.js';

/** Config base da Koovela (ESLint 9, flat config). */
export default tseslint.config(
  {
    ignores: [
      '**/dist/**', '**/build/**', '**/node_modules/**', '**/coverage/**', '**/src/generated/**', '**/.react-router/**',
      '**/.expo/**', '**/android/**', '**/ios/**', '**/test-results/**', '**/playwright-report/**', '**/.turbo/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettier,
  { files: ['**/*.cjs'], languageOptions: { sourceType: 'commonjs', globals: { module: 'writable', require: 'readonly' } } },
  {
    plugins: { koovela },
    rules: {
      'koovela/no-number-money': 'error',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' }],
    },
  },
  {
    // Código de interface: todo .tsx (os padrões são relativos ao eslint.config.js de cada pacote).
    files: ['**/*.tsx'],
    ignores: ['**/__tests__/**', '**/*.test.tsx', '**/e2e/**'],
    plugins: { i18next },
    rules: {
      'koovela/no-raw-design-values': 'error',
      // Texto de interface só por i18n (REQ-FND-064)
      'i18next/no-literal-string': [
        'error',
        // Texto visível e rótulos acessíveis; atributos técnicos (role, className, testID…) ficam de fora.
        { mode: 'jsx-only', 'jsx-attributes': { include: ['aria-label', 'title', 'alt', 'placeholder', 'accessibilityLabel', 'accessibilityHint', 'label'] } },
      ],
    },
  },
);
