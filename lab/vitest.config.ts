import { defineConfig } from 'vitest/config'

// The lab has its own test run. The root config lists explicit include globs
// (games, harness, test), so nothing under lab/ reaches `npm test`.
export default defineConfig({
  root: import.meta.dirname,
  test: {
    include: ['**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    environment: 'node',
    // A few prototype tests take 3 to 4 s on a fast machine; the 5 s default is too tight for a shared CI runner.
    testTimeout: 30_000,
  },
})
