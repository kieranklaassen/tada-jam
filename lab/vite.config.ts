import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { defineConfig } from 'vite'
import type { Connect, Plugin } from 'vite'

// The arcade round keeps the owner's ratings in lab/arcade/RATINGS.json. The
// dev and preview servers both serve this one endpoint; it reads and writes
// that one file and nothing else.
const RATINGS_FILE = join(import.meta.dirname, 'arcade', 'RATINGS.json')
const KEY = /^[a-z0-9]+(-[a-z0-9]+)*$/

function readRatings(): Record<string, unknown> {
  if (!existsSync(RATINGS_FILE)) return {}
  try {
    const parsed: unknown = JSON.parse(readFileSync(RATINGS_FILE, 'utf8'))
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : {}
  } catch {
    return {}
  }
}

const ratingsMiddleware: Connect.NextHandleFunction = (req, res, next) => {
  if (!req.url || req.url.split('?')[0] !== '/__arcade/ratings') return next()
  res.setHeader('content-type', 'application/json')
  res.setHeader('cache-control', 'no-store')
  if (req.method === 'GET') {
    res.end(JSON.stringify(readRatings()))
    return
  }
  if (req.method !== 'POST') {
    res.statusCode = 405
    res.end('{}')
    return
  }
  let body = ''
  req.on('data', (chunk: Buffer) => {
    body += chunk
    if (body.length > 20_000) req.destroy()
  })
  req.on('end', () => {
    try {
      const { key, rating } = JSON.parse(body) as { key?: unknown; rating?: { stars?: unknown; verdict?: unknown; note?: unknown; at?: unknown } }
      if (typeof key !== 'string' || !KEY.test(key) || !rating || typeof rating !== 'object') throw new Error('bad rating')
      const all = readRatings()
      all[key] = {
        stars: typeof rating.stars === 'number' ? Math.max(0, Math.min(5, Math.round(rating.stars))) : 0,
        verdict: rating.verdict === 'build' || rating.verdict === 'maybe' || rating.verdict === 'no' ? rating.verdict : '',
        note: typeof rating.note === 'string' ? rating.note.slice(0, 2000) : '',
        at: typeof rating.at === 'string' ? rating.at.slice(0, 40) : '',
      }
      const sorted = Object.fromEntries(Object.entries(all).sort(([a], [b]) => a.localeCompare(b)))
      writeFileSync(RATINGS_FILE, `${JSON.stringify(sorted, null, 2)}\n`)
      res.end('{"ok":true}')
    } catch {
      res.statusCode = 400
      res.end('{"ok":false}')
    }
  })
}

const arcadeRatings: Plugin = {
  name: 'arcade-ratings',
  configureServer(server) {
    server.middlewares.use(ratingsMiddleware)
    // The arcade shell finds prototypes with import.meta.glob. With HMR off
    // (LAB_NO_HMR) a new protos/<key>/index.ts would stay invisible until the
    // shell was re-saved, so drop the shell's cached transform when one appears.
    const shell = join(import.meta.dirname, 'arcade', 'shell', 'main.ts')
    const refresh = (file: string) => {
      if (!file.includes('/arcade/protos/') || !file.endsWith('/index.ts')) return
      for (const mod of server.moduleGraph.getModulesByFile(shell) ?? []) server.moduleGraph.invalidateModule(mod)
    }
    server.watcher.on('add', refresh)
    server.watcher.on('unlink', refresh)
  },
  configurePreviewServer(server) {
    server.middlewares.use(ratingsMiddleware)
  },
}

// LAB_HIDE=key,key leaves arcade prototypes out of a build: the shell skips
// them and their source is replaced by a stub, so a prototype that is still
// being written cannot break the build for the finished ones.
const hiddenKeys = (process.env.LAB_HIDE ?? '').split(',').filter(Boolean)
const hideUnfinished: Plugin = {
  name: 'arcade-hide-unfinished',
  load(id) {
    const match = /\/arcade\/protos\/([^/]+)\/index\.ts$/.exec(id.split('?')[0]!)
    return match && hiddenKeys.includes(match[1]!) ? 'export const proto = null' : null
  },
}

// Every build also writes arcade/catalog.json: the demos grouped by type, with
// what each group and demo is testing (arcade/catalog.ts) and each demo's name,
// emoji, ages and pitch (its own meta). The jam's home screen reads that file
// to list the demos; it never imports anything from the lab.
interface CatalogSource {
  CATALOG: readonly { id: string; title: string; testing: string; demos: readonly { key: string; question: string; look?: string }[] }[]
}
interface ProtoSource {
  proto?: { meta?: { name: string; emoji: string; ages: [number, number]; pitch: string } }
}
const demoCatalog: Plugin = {
  name: 'arcade-demo-catalog',
  apply: 'build',
  async generateBundle() {
    const arcade = join(import.meta.dirname, 'arcade')
    const { CATALOG } = (await import(pathToFileURL(join(arcade, 'catalog.ts')).href)) as CatalogSource
    const groups = []
    for (const group of CATALOG) {
      const demos = []
      for (const demo of group.demos) {
        const file = join(arcade, 'protos', demo.key, 'index.ts')
        if (hiddenKeys.includes(demo.key) || !existsSync(file)) continue
        const meta = ((await import(pathToFileURL(file).href)) as ProtoSource).proto?.meta
        if (!meta) continue
        demos.push({ ...demo, name: meta.name, emoji: meta.emoji, ages: meta.ages, pitch: meta.pitch })
      }
      if (demos.length > 0) groups.push({ id: group.id, title: group.title, testing: group.testing, demos })
    }
    this.emitFile({ type: 'asset', fileName: 'arcade/catalog.json', source: `${JSON.stringify({ groups }, null, 1)}\n` })
  },
}

// The lab shell is its own Vite root, so its build lands in lab/dist
// (covered by the `dist/` ignore) and never in the published dist/. It has two
// pages: the first round's shell at / and the arcade round at /arcade/.
export default defineConfig({
  root: import.meta.dirname,
  base: './',
  plugins: [arcadeRatings, hideUnfinished, demoCatalog],
  define: { __ARCADE_HIDE__: JSON.stringify(hiddenKeys.join(',')) },
  // LAB_NO_HMR=1 stops the dev server reloading every open page on any file
  // change, which matters when many builders share one server and the
  // screenshot tool is mid-run.
  server: { host: true, port: 4174, strictPort: true, hmr: process.env.LAB_NO_HMR ? false : undefined },
  preview: { host: true, port: 4174, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: {
        main: join(import.meta.dirname, 'index.html'),
        arcade: join(import.meta.dirname, 'arcade', 'index.html'),
      },
    },
  },
})
