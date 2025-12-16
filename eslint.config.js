import js from '@eslint/js';
import globals from 'globals';
import json from '@eslint/json';
import css from '@eslint/css';
import markdown from '@eslint/markdown';

export default [
  // JavaScript files - recommended rules
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      ...js.configs.recommended.rules,
      // Code quality
      'no-unused-vars': ['error', { argsIgnorePattern: '^_', caughtErrorsIgnorePattern: '^_' }],
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

  // Test files - add Mocha globals
  {
    files: ['**/*.test.js', '**/*.spec.js', 'test/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.browser,
        ...globals.es2021,
        ...globals.mocha, // Adds describe, it, beforeEach, afterEach, etc.
      },
    },
  },

  {
    files: ['**/*.json'],
    plugins: { json },
    language: 'json/json',
    rules: { ...json.configs.recommended.rules },
  },

  {
    files: ['**/*.jsonc'],
    plugins: { json },
    language: 'json/jsonc',
    rules: { ...json.configs.recommended.rules },
  },

  {
    files: ['**/*.css'],
    plugins: { css },
    language: 'css/css',
    rules: { ...css.configs.recommended.rules },
  },

  {
    files: ['**/*.md'],
    plugins: { markdown },
    language: 'markdown/gfm',
    rules: { ...markdown.configs.recommended.rules },
  },

  // Ignore patterns
  {
    ignores: [
      'dist/**',
      'build/**',
      'node_modules/**',
      'coverage/**',
      '*.min.js',
      '**/package-lock.json',
    ],
  },
];
