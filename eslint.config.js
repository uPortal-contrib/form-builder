import js from '@eslint/js';
import globals from 'globals';

export default [
  // JavaScript files - recommended rules
  js.configs.recommended,
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      // Code quality
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],

      // Formatting (complement Prettier)
      'no-trailing-spaces': 'error',
      'eol-last': ['error', 'always'],
      'linebreak-style': ['error', 'unix'],
      'no-multiple-empty-lines': ['error', { max: 1, maxEOF: 0 }],

      // Best practices
      'prefer-const': 'error',
      'no-var': 'error',
    },
  },

  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      '*.min.js',
      'rollup.config.js',
    ],
  },
];
