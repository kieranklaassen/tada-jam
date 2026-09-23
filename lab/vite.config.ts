import { defineConfig } from 'vite'

// The lab shell is its own Vite root, so its build lands in lab/dist
// (covered by the `dist/` ignore) and never in the published dist/.
export default defineConfig({
  root: import.meta.dirname,
  base: './',
  server: { host: true, port: 4174, strictPort: true },
  preview: { host: true, port: 4174, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true, target: 'es2022' },
})
