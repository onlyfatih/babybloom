// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  { ignores: ['dist/*', 'dist-large/*', 'dist-real/*', '.expo/*'] },
  {
    // Architecture guardrails (docs/architecture.md): domain stays pure; screens never touch providers.
    files: ['src/domain/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['react', 'react-native', 'expo-*', '@/ui/*', '@/data/*', '@/features/*', '@/infrastructure/*'] }] },
  },
  {
    files: ['src/ui/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: ['@/features/*', '@/data/*'] }] },
  },
  {
    files: ['src/app/**', 'src/features/**'],
    rules: { 'no-restricted-imports': ['error', { patterns: [{ group: ['@/data/providers/*/*'], allowImportNames: ['demoControls'], message: 'Use repositories via useBackend(); provider internals stay in src/data/providers.' }] }] },
  },
]);
