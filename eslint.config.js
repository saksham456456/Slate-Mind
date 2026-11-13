'use strict';
const globals = require('globals');

const common = {
  'no-unused-vars': ['warn', { args: 'after-used', caughtErrors: 'none' }],
  'no-empty': ['warn', { allowEmptyCatch: false }],
  eqeqeq: ['warn', 'always', { null: 'ignore' }],
  'prefer-const': 'warn',
  'no-redeclare': 'error',
};

module.exports = [
  { ignores: ['node_modules/**', 'public/samples.js'] },
  {
    // Server, API handlers, tests
    files: ['server.js', 'lib/**/*.js', 'api/**/*.js', 'test/**/*.js', 'eslint.config.js'],
    languageOptions: { sourceType: 'commonjs', ecmaVersion: 2022, globals: globals.node },
    rules: { ...common, 'no-undef': 'error', 'no-var': 'warn' },
  },
  {
    // Browser scripts are plain <script> tags that share one global scope, so
    // cross-file names look "undefined" to ESLint: no-undef stays off here.
    files: ['public/**/*.js'],
    ignores: ['public/sw.js'],
    languageOptions: { sourceType: 'script', ecmaVersion: 2022, globals: globals.browser },
    rules: { ...common, 'no-undef': 'off', 'no-var': 'warn' },
  },
  {
    files: ['public/sw.js'],
    languageOptions: { sourceType: 'script', ecmaVersion: 2022, globals: globals.serviceworker },
    rules: { ...common, 'no-undef': 'error' },
  },
  {
    // state.js declares globals with `var` on purpose: other scripts and the test sandbox read them as globals
    files: ['public/state.js'],
    rules: { 'no-var': 'off', 'no-unused-vars': 'off' },
  },
];
