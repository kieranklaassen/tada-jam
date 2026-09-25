import { chromium, webkit } from 'playwright'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

// Pebble Table's Honest Scale, driven by screen positions worked out from the
// shared layout alone, never by object names, so every build gets the same
// input whatever its scene is called (a probe that found the scale by name
// played nothing on a build whose objects had no names, and measured an idle
// scene). Opens straight onto the scale with four stones on the mat (a seeded
// save), then for about 40 s: carry each stone to a pan, tip all four jars,
// drag from in front of each jar onto a pan (whatever part lies there comes
// along), repeat. Measures like perf:jam: frame intervals, the worst one-second
// window, p99, frames over 25 ms, each frame's summed animation-frame callback
// time, and the tiers visited; `instances` counts the drawn instances at the
// end, so a run whose play did nothing shows it.
//   npm run perf:pebble-scale -- <webkit|chrome> <throttle> <base> [size]
const [, , engine = 'webkit', throttleArg = '1', base = 'http://localhost:4173', sizeArg = '1'] = process.argv
const throttle = Number(throttleArg)
const size = Number(sizeArg)
const W = 1180 * size
const H = 820 * size
const hook = readFileSync(fileURLToPath(new URL('./intersections/page.js', import.meta.url)), 'utf8')
const PANS = [{ x: 610, y: 470 }, { x: 990, y: 470 }]
const JARS = { acorn: { x: 540, y: 835 }, shell: { x: 760, y: 860 }, stick: { x: 980, y: 845 }, boulder: { x: 1190, y: 800 } }
const STONES = [0, 1, 2, 3].map((i) => ({ x: 700 + i * 60, y: 640 }))

const browser = await (engine === 'webkit' ? webkit : chromium).launch(engine === 'webkit' ? { headless: true } : { channel: 'chrome', headless: true, args: ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist'] })
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 2 })
await context.addInitScript({ content: hook })
await context.addInitScript(() => { window.__jamAudit.skipRender = false })
await context.addInitScript(() => {
  const raf = window.requestAnimationFrame.bind(window)
  window.__work = []
  let frameSum = 0
  let pending = false
  window.requestAnimationFrame = (cb) => raf((t) => {
    if (!pending) {
      pending = true
      queueMicrotask(() => { pending = false; window.__work.push(frameSum); frameSum = 0 })
    }
    const s = performance.now()
    try { cb(t) } finally { frameSum += performance.now() - s }
  })
})
const page = await context.newPage()
const errors = []
page.on('pageerror', (e) => errors.push(String(e).slice(0, 160)))
if (engine === 'chrome' && throttle > 1) await (await context.newCDPSession(page)).send('Emulation.setCPUThrottlingRate', { rate: throttle })
await page.goto(base + '/')
await page.evaluate((stones) => {
  localStorage.clear()
  localStorage.setItem('tada-jam:prefs', JSON.stringify({ childAge: 6 }))
  const pieces = stones.map((p, i) => ({ id: 500 + i, q: 4, x: p.x, y: p.y }))
  localStorage.setItem('tada-jam:slot:pebble-table', JSON.stringify({ v: 1, total: 80, bag: 64, pieces, liveMat: 'scale', shelf: ['scale', 'feeding', 'door'], parked: { feeding: [], scale: [] }, seats: [true, true, false, false, true], nextId: 600 }))
}, STONES)
await page.goto(`${base}/?chrome=0#/play/pebble-table`)
await page.waitForFunction(() => window.__jamAudit?.main(), null, { timeout: 30000 })
await page.waitForTimeout(5000)

const to3 = (p, y) => [(p.x - 800) * 0.1, y, (p.y - 500) * 0.1]
const px = (f) => ({ x: f[0] * W, y: f[1] * H })
const spot = async (p, y = 0) => px(await page.evaluate((v) => window.__jamAudit.projectFrac(v), to3(p, y)))
// Resolve every screen position before measuring: nothing below walks the scene inside a measured frame.
const at = {}
for (const [k, p] of Object.entries(JARS)) at['jar-' + k] = await spot(p, 14)
for (const [k, p] of Object.entries(JARS)) at['front-' + k] = await spot({ x: p.x + (800 - p.x) * 0.25, y: p.y - 110 }, 1)
for (let i = 0; i < 2; i++) at['pan-' + i] = await spot(PANS[i], 7)
for (let i = 0; i < 4; i++) at['stone-' + i] = await spot(STONES[i], 1)
const tap = async (p) => { await page.mouse.move(p.x, p.y); await page.mouse.down(); await page.waitForTimeout(70); await page.mouse.up() }
const drag = async (a, b, ms = 700) => {
  await page.mouse.move(a.x, a.y)
  await page.mouse.down()
  await page.waitForTimeout(80)
  await page.mouse.move(b.x, b.y, { steps: Math.max(8, Math.round(ms / 40)) })
  await page.waitForTimeout(66)
  await page.mouse.up()
}

await page.evaluate(() => {
  window.__frames = []
  window.__stop = false
  window.__work.length = 0
  let last = performance.now()
  const tick = (now) => { window.__frames.push([now, now - last]); last = now; if (!window.__stop) requestAnimationFrame(tick) }
  requestAnimationFrame(tick)
})
const tiers = new Set()
let polling = true
const poll = (async () => { while (polling) { try { tiers.add(await page.evaluate(() => document.querySelector('canvas')?.dataset.quality ?? null)) } catch {} await page.waitForTimeout(500) } })()
const t0 = Date.now()
let round = 0
while (Date.now() - t0 < 40000) {
  await drag(at['stone-' + (round % 4)], at['pan-' + (round % 2)])
  await page.waitForTimeout(400)
  for (const k of Object.keys(JARS)) { await tap(at['jar-' + k]); await page.waitForTimeout(200) }
  await page.waitForTimeout(1200)
  for (const [i, k] of Object.keys(JARS).entries()) { await drag(at['front-' + k], at['pan-' + (i % 2)], 600); await page.waitForTimeout(200) }
  await page.waitForTimeout(1500)
  round++
}
polling = false
await poll
const frames = (await page.evaluate(() => { window.__stop = true; return window.__frames })).slice(3)
const work = await page.evaluate(() => window.__work.slice())
const bodies = await page.evaluate(() => { let n = 0; window.__jamAudit.main()?.scene.traverse((o) => { if (o.isInstancedMesh) n += o.count }); return n })
await browser.close()

const intervals = frames.map((f) => f[1])
const sorted = [...intervals].sort((a, b) => a - b)
const total = intervals.reduce((a, b) => a + b, 0)
let worst = Infinity
for (let i = 0, j = 0; i < frames.length; i++) {
  while (j < frames.length && frames[j][0] - frames[i][0] < 1000) j++
  if (j >= frames.length) break
  worst = Math.min(worst, j - i)
}
const cpu = work.filter((v) => v > 0).sort((a, b) => a - b)
console.log(JSON.stringify({
  base, engine, throttle, size, rounds: round,
  fps: +(1000 / (total / intervals.length)).toFixed(1), worst1s: worst === Infinity ? null : worst,
  p99: +sorted[Math.floor(sorted.length * 0.99)].toFixed(1), over25: intervals.filter((v) => v > 25).length,
  cpuP50: cpu.length ? +cpu[Math.floor(cpu.length * 0.5)].toFixed(2) : null, cpuP95: cpu.length ? +cpu[Math.floor(cpu.length * 0.95)].toFixed(2) : null,
  tiers: [...tiers], instances: bodies, errors,
}))
