import { defineConfig } from 'vitest/config'

// The lab has its own test run. The root config lists explicit include globs
// (games, harness, test), so nothing under lab/ reaches `npm test`.
export default defineConfig({
  root: import.meta.dirname,
  test: {
    include: ['**/*.test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    environment: 'node',
  },
})
