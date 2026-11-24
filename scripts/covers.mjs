// Takes the home page's cover pictures: each game of a production build, full
// screen with nothing over it, a few seconds in. Run it when a game's look has
// changed or a game was added, with the build being served
// (npm run build && npm run preview -- --port 4173):
//
//   npm run covers                  every game and showcase
//   npm run covers -- <key> <key>   only these
//   npm run covers -- <key>@9       nine seconds in, for a game that opens slowly
//   npm run covers -- old/<key>     an old game, a demo of the lab (old/ alone takes them all)
//   BASE=http://localhost:4173      where the build is served
//
// Covers land in harness/covers/<key>.webp. They are the jam's own, outside
// games/, so a game's folder still ports to Tada as it is.
import { readdirSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const base = process.env.BASE ?? 'http://localhost:4173'
const SECONDS = 6
const VIEW = { width: 1180, height: 820 }
const COVER = { width: 720, height: 500, quality: 0.78 }

const folders = (path) => readdirSync(new URL(path, import.meta.url), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name)
const asked = process.argv.slice(2)
const OLD = 'old/'
const named = asked.flatMap((arg) => (arg === OLD ? folders('../lab/arcade/protos/').map((key) => OLD + key) : [arg]))
const jobs = (named.length ? named : [...folders('../games/'), ...folders('../showcases/')]).map((arg) => {
  const [key, seconds] = arg.split('@')
  return { key, seconds: Number(seconds) || SECONDS }
})

const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] })
// A second page shrinks and encodes, so no image library is needed.
const encoder = await (await browser.newContext()).newPage()
let failed = 0

async function take({ key, seconds }) {
  const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: 1 })
  const page = await context.newPage()
  try {
    await page.goto(key.startsWith(OLD) ? `${base}/lab/arcade/index.html?chrome=0#/play/${key.slice(OLD.length)}` : `${base}/?chrome=0#/play/${key}`)
    await page.waitForTimeout(seconds * 1000)
    const png = await page.screenshot({ timeout: 120_000 })
    const webp = await encoder.evaluate(
      async ({ data, width, height, quality }) => {
        const image = new Image()
        image.src = `data:image/png;base64,${data}`
        await image.decode()
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const g = canvas.getContext('2d')
        g.imageSmoothingQuality = 'high'
        g.drawImage(image, 0, 0, width, height)
        return canvas.toDataURL('image/webp', quality).split(',')[1]
      },
      { data: png.toString('base64'), ...COVER },
    )
    writeFileSync(new URL(`../harness/covers/${key}.webp`, import.meta.url), Buffer.from(webp, 'base64'))
    console.log(`${key}: taken`)
  } catch (error) {
    failed += 1
    console.error(`${key}: ${error.message}`)
  } finally {
    await context.close()
  }
}

const queue = [...jobs]
await Promise.all(Array.from({ length: 2 }, async () => { for (let job = queue.shift(); job; job = queue.shift()) await take(job) }))
await browser.close()
process.exit(failed ? 1 : 0)
