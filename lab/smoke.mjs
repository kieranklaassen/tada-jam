// Local smoke check for the lab shell. Not run in CI (it needs Playwright's
// WebKit). For every prototype it opens the play view in a touch WebKit at
// 1180 by 820, taps the middle, and checks that the canvas is not blank and
// that nothing logged an error.
//
//   npm run lab:build && npm run lab:smoke
//
// It serves lab/dist with `vite preview` on port 4174 (strictPort) and stops
// the server when it is done. If the port is taken, it says so and exits.

import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { webkit } from 'playwright'

const labDir = dirname(fileURLToPath(import.meta.url))
const rootDir = resolve(labDir, '..')
const PORT = 4174
const BASE = `http://127.0.0.1:${PORT}/`

function fail(message) {
  console.error(`lab smoke: ${message}`)
  process.exitCode = 1
}

if (!existsSync(join(labDir, 'dist', 'index.html'))) {
  fail('lab/dist is missing. Run `npm run lab:build` first.')
  process.exit(1)
}

// Every prototype key: the folders under lab/protos (hidden and underscore
// folders skipped, like the contract suite) plus the reference.
const protosDir = join(labDir, 'protos')
const protoKeys = existsSync(protosDir)
  ? readdirSync(protosDir, { withFileTypes: true })
      .filter((e) => e.isDirectory() && !e.name.startsWith('_') && !e.name.startsWith('.'))
      .map((e) => e.name)
      .sort()
  : []
const keys = [...protoKeys, 'example']

const viteBin = join(rootDir, 'node_modules', '.bin', 'vite')
const preview = spawn(viteBin, ['preview', '--config', 'lab/vite.config.ts', '--port', String(PORT), '--strictPort'], {
  cwd: rootDir,
  stdio: ['ignore', 'pipe', 'pipe'],
})
let previewLog = ''
let previewExited = false
preview.stdout.on('data', (chunk) => (previewLog += chunk))
preview.stderr.on('data', (chunk) => (previewLog += chunk))
preview.on('exit', () => (previewExited = true))

function stopPreview() {
  if (!previewExited) preview.kill('SIGTERM')
}
process.on('exit', stopPreview)
process.on('SIGINT', () => {
  stopPreview()
  process.exit(130)
})

async function waitForServer() {
  const deadline = Date.now() + 20000
  while (Date.now() < deadline) {
    if (previewExited) throw new Error(`vite preview exited early (is port ${PORT} in use?):\n${previewLog}`)
    try {
      const response = await fetch(BASE)
      if (response.ok) return
    } catch {
      // not up yet
    }
    await new Promise((done) => setTimeout(done, 200))
  }
  throw new Error(`vite preview did not answer on ${BASE} within 20 s:\n${previewLog}`)
}

// Distinct colours among a grid of sampled pixels. A blank (transparent or
// one-colour) canvas has one.
async function distinctColours(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector('canvas')
    if (!canvas) return -1
    const ctx = canvas.getContext('2d')
    if (!ctx) return -1
    const seen = new Set()
    for (let i = 1; i < 24; i++) {
      for (let j = 1; j < 16; j++) {
        const x = Math.floor((canvas.width * i) / 24)
        const y = Math.floor((canvas.height * j) / 16)
        seen.add(Array.from(ctx.getImageData(x, y, 1, 1).data).join(','))
      }
    }
    return seen.size
  })
}

async function checkPage(context, label, url, check) {
  const page = await context.newPage()
  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console error: ${message.text()}`)
  })
  page.on('pageerror', (error) => errors.push(`page error: ${error.message}`))
  const problems = []
  let detail = ''
  try {
    await page.goto(url, { waitUntil: 'load' })
    detail = await check(page, problems)
  } catch (error) {
    problems.push(error instanceof Error ? error.message : String(error))
  } finally {
    problems.push(...errors)
    await page.close()
  }
  if (problems.length > 0) {
    fail(`${label} failed:\n  ${problems.join('\n  ')}`)
    return
  }
  console.log(`ok   ${label}${detail ? ` (${detail})` : ''}`)
}

async function main() {
  await waitForServer()
  let browser
  try {
    browser = await webkit.launch({ headless: true })
  } catch (error) {
    throw new Error(`could not start Playwright WebKit (try \`npx playwright install webkit\`): ${error.message}`)
  }
  try {
    const context = await browser.newContext({
      viewport: { width: 1180, height: 820 },
      deviceScaleFactor: 2,
      hasTouch: true,
    })

    await checkPage(context, 'list', BASE, async (page, problems) => {
      await page.waitForSelector('a.card', { timeout: 5000 })
      const cards = await page.$$eval('a.card', (nodes) => nodes.map((n) => n.getBoundingClientRect().height))
      if (cards.length < 1) problems.push('the list shows no cards')
      if (cards.some((h) => h < 48)) problems.push('a card is shorter than 48 px')
      return `${cards.length} cards`
    })

    for (const key of keys) {
      await checkPage(context, key, `${BASE}#/play/${key}?chrome=0`, async (page, problems) => {
        await page.waitForSelector('canvas', { timeout: 5000 })
        // Real time, so the loop has run some frames.
        await page.waitForTimeout(800)
        await page.touchscreen.tap(590, 410)
        await page.waitForTimeout(500)
        const colours = await distinctColours(page)
        if (colours < 0) problems.push('no canvas with a 2D context')
        else if (colours < 2) problems.push(`the canvas looks blank (${colours} distinct colour sampled)`)
        return `${colours} colours sampled`
      })
    }
  } finally {
    await browser.close()
  }
}

try {
  await main()
} catch (error) {
  fail(error instanceof Error ? error.message : String(error))
} finally {
  stopPreview()
}
if (process.exitCode) console.error('lab smoke: FAILED')
else console.log('lab smoke: all good')
