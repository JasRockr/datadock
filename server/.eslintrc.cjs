module.exports = {
  root: true,
  env: { node: true, es2022: true },
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  extends: ['eslint:recommended'],
  ignorePatterns: ['dist/', 'uploads/', 'logs/', 'node_modules/'],
  rules: {
    // Express identifica el middleware de errores por sus 4 argumentos
    'no-unused-vars': ['error', { argsIgnorePattern: '^next$' }],
  },
  overrides: [
    {
      files: ['__tests__/**/*.js'],
      env: { jest: true },
    },
  ],
};
