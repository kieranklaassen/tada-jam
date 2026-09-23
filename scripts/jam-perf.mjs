import { chromium, webkit } from 'playwright'
import { appendFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

// Shared perf probe for any jam game, on a production build in a real browser.
// Serve the build first (npm run serve:lan), then:
//   npm run perf:jam -- <game> [webkit|chrome] [cpuThrottle=1] [auto|full|tierN] [base=http://localhost:4173]
// 5 s of warm-up, then about 40 s of scripted play: taps across a 4x3 grid of
// the screen with a drag toward the middle every third action, 8 s hands off,
// and the same again. Frame intervals come from a page-level
// requestAnimationFrame loop (what the display actually got); tier, draw calls
// and CPU time come from the game's own window.__jamPerf (Pebble Table: its
// canvas data attributes). "worst1s" is the fewest frames in any one-second
// window, which is what "never under 45 fps" judges.
// `full` pins each game's full-quality tier (tier numbering differs per game;
// see COUNTS_UP); `tierN` pins raw tier N. WebKit cannot be CPU-throttled.
// Env: SIZE=2 multiplies the viewport (SIZE=2 is four times the pixels, a
// stand-in for a weaker GPU); BUSY and QUIET set the play and rest seconds;
// OUT sets the results folder (one JSON line per run in results.jsonl, plus a
// screenshot).
// Needs the Playwright browsers: npx playwright install webkit chromium (Chrome
// runs are the installed Google Chrome via channel 'chrome').
const [, , game, engine = 'webkit', throttleArg = '1', mode = 'auto', base = 'http://localhost:4173'] = process.argv
if (!game) {
  console.error('usage: npm run perf:jam -- <game> [webkit|chrome] [cpuThrottle] [auto|full|tierN] [base]')
  process.exit(1)
}
const throttle = Number(throttleArg)
const SIZE = Number(process.env.SIZE ?? 1)
const W = 1180 * SIZE
const H = 820 * SIZE
const OUT = process.env.OUT ?? join(tmpdir(), 'jam-perf')
mkdirSync(OUT, { recursive: true })

// Most games number tiers from 0 = full quality (DPR 2) down to 3 = minimal (DPR 1). These count the other way,
// so their full tier is 3. Pebble Table has no URL pin; it pins through its grown-up overlay.
const COUNTS_UP = new Set(['light-garden', 'bedtime-forest', 'critter-clay'])
const FULL_TIER = COUNTS_UP.has(game) ? 3 : 0
// DPR by raw tier index, to report tiers comparably.
const DPR_BY_TIER = { [game]: COUNTS_UP.has(game) ? [1, 1.25, 1.5, 2] : [2, 1.5, 1.25, 1] }
const PEBBLE_DPR = { full: 2, balanced: 1.5, lean: 1.25, minimal: 1 }

const launcher = engine === 'webkit' ? webkit : chromium
const browser = await launcher.launch(engine === 'webkit' ? { headless: true } : { channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2, hasTouch: true })
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
await page.goto(base + '/')
await page.evaluate(() => { localStorage.clear(); localStorage.setItem('tada-jam:prefs', JSON.stringify({ childAge: 5 })) })
if (engine === 'chrome' && throttle > 1) {
  const cdp = await context.newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: throttle })
}
const pin = mode.startsWith('tier') ? `&tier=${mode.slice(4)}` : mode === 'full' && game !== 'pebble-table' ? `&tier=${FULL_TIER}` : ''
await page.goto(`${base}/?chrome=0${pin}#/play/${game}`)
await page.waitForTimeout(1500)
if (mode === 'full' && game === 'pebble-table') {
  const tripleTap = () => page.evaluate(() => { const el = document.querySelector('[data-grown-up-corner]'); for (let i = 0; i < 3; i++) el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })) })
  await page.waitForSelector('[data-grown-up-corner]')
  await tripleTap()
  await page.locator('[data-grown-up-overlay] button', { hasText: 'full' }).first().click()
  await tripleTap()
}
await page.waitForTimeout(3500)

const readGame = () => page.evaluate(() => {
  const perf = window.__jamPerf
  if (perf) {
    const cpu = perf.cpuMs.filter((v) => Number.isFinite(v))
    return { tier: perf.tier, calls: perf.drawCalls, tris: perf.triangles, cpu: cpu.slice(-120) }
  }
  const c = document.querySelector('canvas')
  return { tier: c?.dataset.quality ?? null, calls: Number(c?.dataset.calls ?? NaN), tris: Number(c?.dataset.triangles ?? NaN), cpu: [] }
})

await page.evaluate(() => {
  window.__frames = []
  window.__stop = false
  let last = performance.now()
  const tick = (now) => { window.__frames.push([now, now - last]); last = now; if (!window.__stop) requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
})
const samples = []
let polling = true
const poll = (async () => { while (polling) { try { samples.push(await readGame()) } catch {} await page.waitForTimeout(500) } })()

const at = (fx, fy) => ({ x: fx * W, y: fy * H })
const tap = async (p) => { await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(70); await page.mouse.up() }
const drag = async (a, b) => { await page.mouse.move(a.x, a.y); await page.mouse.down(); await page.waitForTimeout(120); await page.mouse.move(b.x, b.y, { steps: 20 }); await page.waitForTimeout(150); await page.mouse.up() }
const grid = []
for (const fy of [0.35, 0.55, 0.75]) for (const fx of [0.2, 0.4, 0.6, 0.8]) grid.push(at(fx, fy))
const drags = [[at(0.15, 0.85), at(0.45, 0.5)], [at(0.5, 0.85), at(0.6, 0.45)], [at(0.85, 0.8), at(0.55, 0.55)], [at(0.3, 0.6), at(0.7, 0.6)], [at(0.7, 0.4), at(0.3, 0.7)], [at(0.5, 0.5), at(0.2, 0.3)]]
const t0 = Date.now()
const busy = async (seconds) => {
  const end = Date.now() + seconds * 1000
  let i = 0
  while (Date.now() < end) {
    if (i % 3 === 2) await drag(...drags[(i / 3 | 0) % drags.length])
    else await tap(grid[i % grid.length])
    i += 1
    await page.waitForTimeout(700)
  }
}
const BUSY = Number(process.env.BUSY ?? 16)
await busy(BUSY)
await page.waitForTimeout(Number(process.env.QUIET ?? 8) * 1000)
await busy(BUSY)
polling = false
await poll
const frames = (await page.evaluate(() => { window.__stop = true; return window.__frames })).slice(3)
await page.screenshot({ path: `${OUT}/${game}-${engine}${throttle > 1 ? throttle : ''}-${mode}.png` })
await browser.close()

const intervals = frames.map((f) => f[1])
const sorted = [...intervals].sort((a, b) => a - b)
const total = intervals.reduce((a, b) => a + b, 0)
// Worst one-second window by frames delivered.
let worst = Infinity
for (let i = 0, j = 0; i < frames.length; i++) {
  while (j < frames.length && frames[j][0] - frames[i][0] < 1000) j++
  if (j >= frames.length) break
  worst = Math.min(worst, j - i)
}
const dips = []
for (let t = frames[0][0]; t < frames.at(-1)[0] - 1000; t += 1000) {
  const n = frames.filter((f) => f[0] >= t && f[0] < t + 1000).length
  if (n < 50) dips.push([+((t - frames[0][0]) / 1000).toFixed(0), n])
}
const tiers = samples.map((s) => s.tier)
const dprOf = (t) => (game === 'pebble-table' ? PEBBLE_DPR[t] : DPR_BY_TIER[game]?.[t])
const cpu = samples.flatMap((s) => s.cpu).filter((v) => v > 0).sort((a, b) => a - b)
const result = {
  game, engine, throttle, mode, size: SIZE,
  seconds: +((Date.now() - t0) / 1000).toFixed(0),
  fps: +(1000 / (total / intervals.length)).toFixed(1),
  worst1s: worst === Infinity ? null : worst,
  p99: +sorted[Math.floor(sorted.length * 0.99)].toFixed(1),
  over25: intervals.filter((v) => v > 25).length,
  over25pct: +((intervals.filter((v) => v > 25).length / intervals.length) * 100).toFixed(1),
  frames: intervals.length,
  callsMax: Math.max(...samples.map((s) => s.calls).filter(Number.isFinite)),
  callsEnd: samples.at(-1)?.calls,
  tierEnd: tiers.at(-1), dprEnd: dprOf(tiers.at(-1)),
  dprMin: Math.min(...tiers.map(dprOf).filter(Number.isFinite)),
  cpuP95: cpu.length ? +cpu[Math.floor(cpu.length * 0.95)].toFixed(1) : null,
  dips,
  tierPath: tiers.filter((t, i) => i === 0 || t !== tiers[i - 1]),
  errors,
}
appendFileSync(`${OUT}/results.jsonl`, JSON.stringify(result) + '\n')
console.log(JSON.stringify(result))
