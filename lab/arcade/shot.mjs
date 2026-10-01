// Play an arcade prototype in a headless browser and save screenshots, so a
// builder can look at what a child would see. Local only (needs Playwright's
// Chromium) and needs a lab server running:
//
//   npm run lab:dev -- --port 4175        (or lab:serve on 4174, with --base)
//   node lab/arcade/shot.mjs <key>
//   node lab/arcade/shot.mjs <key> --actions '[["tap",590,410],["shot","after-tap"]]'
//   node lab/arcade/shot.mjs <key> --actions-file path/to/actions.json
//   node lab/arcade/shot.mjs --all --base http://127.0.0.1:4174
//
// The page is 1180 by 820 with the strip hidden, so action coordinates are the
// game's own logical coordinates. Actions:
//
//   ["tap", x, y]                     press and release
//   ["hold", x, y, ms]                press, wait, release
//   ["drag", x1, y1, x2, y2, ms?]     press, move in a straight line, release
//   ["path", [[x, y], ...], ms?]      press, move through the points, release
//   ["wait", ms]                      let real time pass
//   ["ff", seconds]                   run the game forward without waiting
//   ["restart"]
//   ["shot", "name"]                  save shots/<key>/NN-name.png
//
// Without actions it runs a generic mash (taps, drags, holds, a fling) with a
// screenshot every couple of seconds. It prints a JSON summary: thrown errors,
// console errors, and the mean and worst frame cost.

import { mkdirSync, readFileSync, readdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const here = dirname(fileURLToPath(import.meta.url))
const args = process.argv.slice(2)
const flag = (name) => {
  const at = args.indexOf(name)
  return at === -1 ? undefined : args[at + 1]
}
const base = (flag('--base') ?? `http://127.0.0.1:${flag('--port') ?? 4175}`).replace(/\/$/, '')
const all = args.includes('--all')
const valued = new Set(['--base', '--port', '--actions', '--actions-file'])
const positional = args.filter((a, i) => !a.startsWith('--') && !valued.has(args[i - 1]))

const keys = all
  ? readdirSync(join(here, 'protos'), { withFileTypes: true })
      .filter((d) => d.isDirectory() && !d.name.startsWith('_') && !d.name.startsWith('.'))
      .map((d) => d.name)
      .sort()
  : positional
if (keys.length === 0) {
  console.error('usage: node lab/arcade/shot.mjs <key> [--actions json | --actions-file path] [--port 4175 | --base url]')
  process.exit(1)
}

let actions = null
if (flag('--actions')) actions = JSON.parse(flag('--actions'))
else if (flag('--actions-file')) actions = JSON.parse(readFileSync(flag('--actions-file'), 'utf8'))

const MASH = [
  ['wait', 700],
  ['shot', 'first-frame'],
  ['tap', 590, 410],
  ['wait', 250],
  ['tap', 300, 560],
  ['tap', 880, 560],
  ['wait', 400],
  ['shot', 'after-taps'],
  ['drag', 300, 600, 880, 300, 450],
  ['wait', 500],
  ['drag', 880, 620, 300, 250, 300],
  ['wait', 600],
  ['shot', 'after-drags'],
  ['tap', 200, 250],
  ['tap', 590, 250],
  ['tap', 980, 250],
  ['hold', 590, 600, 700],
  ['wait', 500],
  ['path', [[200, 650], [450, 350], [700, 650], [950, 350]], 600],
  ['wait', 800],
  ['shot', 'after-mash'],
  ['tap', 150, 700],
  ['tap', 1030, 700],
  ['tap', 590, 700],
  ['drag', 590, 650, 590, 200, 200],
  ['wait', 2500],
  ['shot', 'later'],
]

async function moveThrough(page, points, ms) {
  const steps = Math.max(2, Math.round(ms / 16))
  const lengths = []
  let total = 0
  for (let i = 1; i < points.length; i++) {
    const d = Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1])
    lengths.push(d)
    total += d
  }
  await page.mouse.move(points[0][0], points[0][1])
  await page.mouse.down()
  for (let s = 1; s <= steps; s++) {
    let want = (s / steps) * total
    let i = 0
    while (i < lengths.length - 1 && want > lengths[i]) want -= lengths[i++]
    const t = lengths[i] > 0 ? Math.min(1, want / lengths[i]) : 1
    await page.mouse.move(points[i][0] + (points[i + 1][0] - points[i][0]) * t, points[i][1] + (points[i + 1][1] - points[i][1]) * t)
    await page.waitForTimeout(ms / steps)
  }
  await page.mouse.up()
}

async function play(browser, key) {
  const outDir = join(here, 'shots', key)
  rmSync(outDir, { recursive: true, force: true })
  mkdirSync(outDir, { recursive: true })
  const context = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  const consoleErrors = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text().slice(0, 600))
  })
  page.on('pageerror', (error) => consoleErrors.push(String(error.stack ?? error).slice(0, 600)))

  const shots = []
  let n = 0
  try {
    await page.goto(`${base}/arcade/#/play/${key}?chrome=0`, { waitUntil: 'load', timeout: 20000 })
    await page.waitForFunction(() => window.__arcade?.ready === true, null, { timeout: 20000 })
    for (const action of actions ?? MASH) {
      const [kind, ...rest] = action
      if (kind === 'tap') {
        await page.mouse.move(rest[0], rest[1])
        await page.mouse.down()
        await page.waitForTimeout(40)
        await page.mouse.up()
        await page.waitForTimeout(90)
      } else if (kind === 'hold') {
        await page.mouse.move(rest[0], rest[1])
        await page.mouse.down()
        await page.waitForTimeout(rest[2] ?? 600)
        await page.mouse.up()
      } else if (kind === 'drag') {
        await moveThrough(page, [[rest[0], rest[1]], [rest[2], rest[3]]], rest[4] ?? 400)
      } else if (kind === 'path') {
        await moveThrough(page, rest[0], rest[1] ?? 600)
      } else if (kind === 'wait') {
        await page.waitForTimeout(rest[0] ?? 500)
      } else if (kind === 'ff') {
        await page.evaluate((seconds) => window.__arcade?.stage?.fastForward(seconds), rest[0] ?? 1)
        await page.waitForTimeout(60)
      } else if (kind === 'restart') {
        await page.evaluate(() => window.__arcade?.stage?.restart())
        await page.waitForTimeout(60)
      } else if (kind === 'shot') {
        const file = join(outDir, `${String(++n).padStart(2, '0')}-${String(rest[0] ?? 'shot').replace(/[^a-z0-9-]/gi, '_')}.png`)
        await page.screenshot({ path: file })
        shots.push(file)
      } else {
        throw new Error(`unknown action ${JSON.stringify(action)}`)
      }
    }
  } catch (error) {
    consoleErrors.push(`shot tool: ${String(error.message ?? error).slice(0, 600)}`)
  }
  const state = await page
    .evaluate(() => ({
      errors: [...(window.__arcade?.stage?.errors ?? [])],
      loadErrors: window.__arcade?.loadErrors ?? {},
      stats: window.__arcade?.stage?.stats ?? null,
    }))
    .catch(() => ({ errors: ['page did not answer'], loadErrors: {}, stats: null }))
  await context.close()
  const loadError = state.loadErrors[key]
  return {
    key,
    ok: state.errors.length === 0 && consoleErrors.length === 0 && !loadError && state.stats !== null,
    thrown: state.errors.map((e) => e.slice(0, 900)),
    loadError: loadError ?? null,
    consoleErrors,
    frameMs: state.stats ? { mean: Number(state.stats.avgMs.toFixed(2)), worst: Number(state.stats.worstMs.toFixed(2)), frames: state.stats.frames } : null,
    shots,
  }
}

const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] })
let failed = 0
try {
  for (const key of keys) {
    const result = await play(browser, key)
    if (!result.ok) failed++
    if (all) console.log(`${result.ok ? 'ok  ' : 'FAIL'} ${key.padEnd(28)} ${result.frameMs ? `${result.frameMs.mean} ms mean, ${result.frameMs.worst} ms worst` : ''} ${[...result.thrown, ...result.consoleErrors, result.loadError ?? ''].join(' | ').slice(0, 300)}`)
    else console.log(JSON.stringify(result, null, 2))
  }
} finally {
  await browser.close()
}
if (failed > 0) {
  if (all) console.log(`${failed} of ${keys.length} failed`)
  process.exitCode = 1
}
