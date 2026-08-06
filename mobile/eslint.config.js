const tseslint = require('typescript-eslint')

module.exports = tseslint.config(
  ...tseslint.configs.recommended,
  {
    ignores: ['android/', 'ios/', 'node_modules/', 'babel.config.js', 'metro.config.js', 'index.js'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      parserOptions: {
        projectService: false,
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
)
