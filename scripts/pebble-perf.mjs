import { chromium, webkit } from 'playwright'
import * as THREE from 'three'

// Frame-time profile of Pebble Table in a real browser: 5 s idle on a busy
// Fair Feeding table, a ten-stone spill, then a stone dragged around.
// Serve a production build first (npm run serve:lan), then:
//   node scripts/pebble-perf.mjs [chrome|webkit|swift] [cpuThrottle=1] [base=http://localhost:4173] [dpr=2]
// chrome takes a CPU throttle (CDP); webkit cannot be throttled; swift is
// Chrome on SwiftShader, a software GPU, which makes pixel and vertex cost
// visible the way a weak tablet GPU would. TIER=full|balanced|lean|minimal
// pins a quality tier through the grown-up overlay; SETTLE=ms waits before
// measuring so the automatic governor can settle.
const [, , engine = 'chrome', throttle = '1', base = 'http://localhost:4173', dprArg = '2'] = process.argv
const W = 1180
const H = 820

const camera = new THREE.PerspectiveCamera(27, W / H, 20, 2000)
{
  const target = new THREE.Vector3(1, 0, 2)
  const pitch = (46 * Math.PI) / 180
  const vHalf = THREE.MathUtils.degToRad(13.5)
  const hHalf = Math.atan(Math.tan(vHalf) * (W / H))
  const d = Math.max(82 / Math.tan(hHalf), 46 / Math.tan(vHalf))
  camera.position.set(target.x, Math.sin(pitch) * d, target.z + Math.cos(pitch) * d)
  camera.lookAt(target)
  camera.updateMatrixWorld()
  camera.updateProjectionMatrix()
}
const S = (x, y, h = 1.3) => {
  const v = new THREE.Vector3((x - 800) * 0.1, h, (y - 500) * 0.1).project(camera)
  return { x: ((v.x + 1) / 2) * W, y: ((1 - v.y) / 2) * H }
}

const plate = { 0: [780, 265], 1: [1065, 470], 4: [495, 470] }
let id = 1
const pieces = []
const add = (q, x, y) => pieces.push({ id: id++, q, x, y })
for (const seat of [0, 1, 4]) {
  const [x, y] = plate[seat]
  add(4, x - 24, y + 4)
  add(4, x + 22, y - 6)
}
add(4, 790, 470)
add(2, 560, 820)
add(2, 610, 830)
const used = pieces.reduce((s, p) => s + p.q, 0)
const state = { v: 1, total: 80, bag: 80 - used, pieces, liveMat: 'feeding', shelf: ['feeding', 'scale'], parked: { feeding: [], scale: [] }, seats: [true, true, false, false, true], nextId: id }

const launcher = engine === 'webkit' ? webkit : chromium
const args = engine === 'swift' ? ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : ['--enable-gpu', '--use-angle=metal', '--ignore-gpu-blocklist']
const browser = await launcher.launch(engine === 'webkit' ? { headless: true } : { channel: 'chrome', headless: true, args })
const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: Number(dprArg), hasTouch: false })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))
await page.goto(base + '/')
await page.evaluate((s) => {
  localStorage.clear()
  localStorage.setItem('tada-jam:prefs', JSON.stringify({ childAge: 4, language: 'nl', theme: 'meadow' }))
  localStorage.setItem('tada-jam:slot:pebble-table', JSON.stringify(s))
}, state)
if (engine !== 'webkit' && Number(throttle) > 1) {
  const cdp = await page.context().newCDPSession(page)
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: Number(throttle) })
}
await page.goto(base + '/?chrome=0#/play/pebble-table')
await page.waitForTimeout(1500)
if (process.env.TIER) {
  const tripleTap = () => page.evaluate(() => { const el = document.querySelector('[data-grown-up-corner]'); for (let i = 0; i < 3; i++) el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })) })
  await page.waitForSelector('[data-grown-up-corner]')
  await tripleTap()
  await page.locator('[data-grown-up-overlay] button', { hasText: process.env.TIER }).first().click()
  await tripleTap()
}
await page.waitForTimeout(Number(process.env.SETTLE ?? 1500))

const startFrames = () =>
  page.evaluate(() => {
    window.__frames = []
    window.__stop = false
    let last = performance.now()
    const tick = (now) => {
      window.__frames.push(now - last)
      last = now
      if (!window.__stop) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  })
const stopFrames = async () => {
  const frames = (await page.evaluate(() => {
    window.__stop = true
    return window.__frames
  })).slice(3)
  const sorted = [...frames].sort((a, b) => a - b)
  const avg = frames.reduce((a, b) => a + b, 0) / frames.length
  return {
    fps: +(1000 / avg).toFixed(1),
    avgMs: +avg.toFixed(1),
    p90: +sorted[Math.floor(sorted.length * 0.9)].toFixed(1),
    p99: +sorted[Math.floor(sorted.length * 0.99)].toFixed(1),
    over20: +((frames.filter((f) => f > 20).length / frames.length) * 100).toFixed(0),
  }
}

const phases = {}
await startFrames()
await page.waitForTimeout(5000)
phases.idle = await stopFrames()

await startFrames()
const bag = S(180, 815, 4)
await page.mouse.move(bag.x, bag.y)
await page.mouse.down()
await page.waitForTimeout(60)
await page.mouse.up()
await page.waitForTimeout(3500)
phases.spill = await stopFrames()

await startFrames()
const from = S(560, 820, 1)
const to = S(900, 700, 1)
await page.mouse.move(from.x, from.y)
await page.mouse.down()
await page.mouse.move(to.x, to.y, { steps: 60 })
await page.mouse.move(from.x, from.y, { steps: 60 })
await page.mouse.up()
await page.waitForTimeout(500)
phases.drag = await stopFrames()

const quality = await page.evaluate(() => { const c = document.querySelector('[data-quality]'); return c ? `${c.dataset.quality} ${c.dataset.calls} draws ${c.dataset.triangles} tris` : null })
if (process.env.SHOT) await page.screenshot({ path: process.env.SHOT })
console.log(JSON.stringify({ engine, throttle: Number(throttle), dpr: Number(dprArg), quality, ...phases, errors: errors.slice(0, 2) }))
await browser.close()
