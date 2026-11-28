/**
 * Database / RLS / Storage integration tests against the LOCAL Supabase stack.
 *   npx supabase start --workdir backend && npm run test:db
 * Identities are created with the local admin API (setup only); every
 * authorization assertion runs with that user's own session.
 */
module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/backend/tests/**/*.test.ts'],
  transform: { '^.+\\.tsx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  moduleNameMapper: { '^@/(.*)$': '<rootDir>/src/$1' },
  testTimeout: 30000,
  maxWorkers: 1,
};
