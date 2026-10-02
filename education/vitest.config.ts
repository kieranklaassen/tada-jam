import { defineConfig } from 'vitest/config'

// The education pack has its own test run. The root config lists explicit
// include globs (games, harness, showcases, test), so nothing under
// education/ reaches `npm test`.
export default defineConfig({
  root: import.meta.dirname,
  test: {
    include: ['**/*.test.ts'],
    exclude: ['node_modules/**'],
    environment: 'node',
    // Several tests spawn git or validate the whole corpus; on a busy machine
    // or a shared CI runner they pass the default five seconds.
    testTimeout: 30_000,
  },
})
