import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  test: {
    include: ['games/**/*.test.{ts,tsx}', 'harness/**/*.test.{ts,tsx}', 'showcases/**/*.test.{ts,tsx}', 'templates/**/*.test.{ts,tsx}', 'test/**/*.test.{ts,tsx}'],
    environment: 'node',
    // The learning games play whole sessions in their tests. Five seconds, vitest's default, is too little for them on a shared runner.
    testTimeout: 30_000,
  },
})
