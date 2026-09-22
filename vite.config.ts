import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
  },
  test: {
    include: ['games/**/*.test.{ts,tsx}', 'harness/**/*.test.{ts,tsx}', 'test/**/*.test.ts'],
    environment: 'node',
  },
})
