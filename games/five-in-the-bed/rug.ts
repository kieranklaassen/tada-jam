import { BED } from './bed'
import { C, TUFT, mix, type Ctx } from './paint'
import { makeRng } from './rng'

// The rug, edge to edge: a printed land of roads, a river, a meadow and a
// field of night, and in the middle the mattress, sewn in thicker tufts with a
// ridge down it. `dyeAt` says what colour the tuft at a place was dyed; each
// tuft is one colour, so every edge of the print is fuzzy.

const seg = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const dx = bx - ax, dy = by - ay
  const k = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(px - ax - dx * k, py - ay - dy * k)
}
const ROAD = [-600, 300, 20, 330, 40, 560, 70, 752, 300, 792, 700, 786, 1040, 800, 1142, 740, 1150, 420, 1146, 250, 1200, 110, 1900, 60]
const road = (x: number, y: number): number => {
  let d = Infinity
  for (let i = 0; i + 3 < ROAD.length; i += 2) d = Math.min(d, seg(x, y, ROAD[i], ROAD[i + 1], ROAD[i + 2], ROAD[i + 3]))
  return d
}
const along = (x: number, y: number): number => {
  // How far along the road, near enough for its broken line.
  return y > 700 ? x : y
}
const river = (y: number): number => 168 + Math.sin(y / 90) * 26
const STARS = [[60, 60], [150, 110], [250, 40], [340, 84], [460, 34], [40, 180], [620, 46], [130, 220], [740, 60], [860, 30], [930, 90], [-80, 120], [-160, 40]]
const FLOWERS = [[1060, 60], [1120, 300], [20, 700], [180, 780], [420, 812], [1010, 770], [1170, 560], [1090, 806], [-60, 640], [1250, 380], [1290, 700], [120, 800], [880, 808], [1160, 640]]

export function dyeAt(x: number, y: number): string {
  if (x > BED.left - 26 && x < BED.right + 26 && y > BED.top - 22 && y < BED.bottom + 22) {
    const edge = Math.min(x - BED.left, BED.right - x, y - BED.top, BED.bottom - y)
    if (edge < 0) return C.border
    if (edge < 9) return mix(C.border, C.bed, 0.5)
    const d = Math.abs(x - BED.crest)
    if (d < 32) return C.ridge
    return C.bed
  }
  if (y < 250 - Math.sin(x / 130) * 22 && x < 1010) {
    for (const [sx, sy] of STARS) {
      const a = Math.atan2(y - sy, x - sx), d = Math.hypot(x - sx, y - sy)
      if (d < 13 + 7 * Math.cos(a * 5 + 1.57)) return C.star
    }
    const moon = Math.hypot(x - 90, y - 60 + 10), bite = Math.hypot(x - 108, y - 44)
    if (moon < 34 && bite > 28) return C.star
    return C.night
  }
  const r = road(x, y)
  if (r < 34) {
    if (r < 4 && Math.floor(along(x, y) / 34) % 2 === 0) return C.line
    return r > 29 ? C.roadEdge : C.road
  }
  const w = Math.abs(x - 1218 - river(y) * 0.4)
  if (w < 42) return Math.floor((y + Math.sin(x / 9) * 8) / 26) % 2 ? C.water : C.waterLight
  if (Math.abs(x - 168 + 250 + river(y) * 0.2) < 34) return C.water
  for (const [fx, fy] of FLOWERS) {
    const a = Math.atan2(y - fy, x - fx), d = Math.hypot(x - fx, y - fy)
    if (d < 6) return C.star
    if (d < 15 + 6 * Math.cos(a * 5)) return C.flower
  }
  return Math.sin(x / 47 + Math.sin(y / 61) * 2) > 0.45 ? C.grassDark : C.grass
}

/** How high the sewn relief stands at a place: the mattress's hollows and the ridge catch the light from the upper left. */
function light(x: number): number {
  const d = x - BED.crest
  if (Math.abs(d) < 34) return -d / 34 * 0.55
  return 0
}

export function paintRug(ctx: Ctx, x0: number, y0: number, w: number, h: number): void {
  const rng = makeRng(5)
  const s = TUFT
  // The ground under the pile is dyed too, so that no grass shows between tufts.
  for (let y = y0; y < y0 + h; y += s * 2) for (let x = x0; x < x0 + w; x += s * 2) {
    ctx.fillStyle = mix(dyeAt(x + s, y + s), '#2b1d1a', 0.16)
    ctx.fillRect(x, y, s * 2 + 0.6, s * 2 + 0.6)
  }
  // Each row of tufts lies a little over the one before, as pile does.
  const tufts = new Map<string, number[]>()
  for (let layer = 0; layer < 2; layer++) {
    for (let y = y0 - s; y < y0 + h + s; y += s) for (let x = x0 - s + (layer * s) / 2; x < x0 + w + s; x += s) {
      const jx = x + (rng.next() - 0.5) * s * 1.5, jy = y + (layer * s) / 2 + (rng.next() - 0.5) * s * 1.5
      const inBed = jx > BED.left && jx < BED.right && jy > BED.top && jy < BED.bottom
      const l = inBed ? light(jx) : 0
      const shade = Math.max(-2, Math.min(2, Math.round((rng.next() - 0.55) * 2.6 + l * 5)))
      const base = dyeAt(jx, jy)
      const color = shade < 0 ? mix(base, '#2b1d1a', -shade * 0.09) : mix(base, '#fff6dd', shade * 0.1)
      let list = tufts.get(color)
      if (!list) tufts.set(color, (list = []))
      list.push(jx, jy, (rng.next() - 0.5) * 0.9 + 0.7)
    }
    for (const [color, list] of tufts) {
      ctx.fillStyle = color
      ctx.beginPath()
      for (let i = 0; i < list.length; i += 3) {
        ctx.moveTo(list[i] + s * 0.8, list[i + 1])
        ctx.ellipse(list[i], list[i + 1], s * 0.8, s * 0.48, list[i + 2], 0, Math.PI * 2)
      }
      ctx.fill()
    }
    tufts.clear()
  }
  // The mattress stands up from the rug, and so does the ridge from it.
  const band = (x: number, y: number, bw: number, bh: number, from: string, to: string, across: boolean) => {
    const g = across ? ctx.createLinearGradient(x, 0, x + bw, 0) : ctx.createLinearGradient(0, y, 0, y + bh)
    g.addColorStop(0, from)
    g.addColorStop(1, to)
    ctx.fillStyle = g
    ctx.fillRect(x, y, bw, bh)
  }
  const bt = BED.top, bh = BED.bottom - BED.top
  band(BED.crest + 32, bt, 34, bh, 'rgba(70,40,20,0.5)', 'rgba(70,40,20,0)', true)
  band(BED.crest + 2, bt, 30, bh, 'rgba(70,30,20,0)', 'rgba(70,30,20,0.45)', true)
  band(BED.crest - 24, bt, 12, bh, 'rgba(255,236,200,0)', 'rgba(255,236,200,0.6)', true)
  band(BED.crest - 12, bt, 16, bh, 'rgba(255,236,200,0.6)', 'rgba(255,236,200,0)', true)
  band(BED.left - 26, BED.bottom + 20, BED.right - BED.left + 52, 22, 'rgba(40,28,20,0.35)', 'rgba(40,28,20,0)', false)
  band(BED.right + 24, bt - 20, 20, bh + 42, 'rgba(40,28,20,0.3)', 'rgba(40,28,20,0)', true)
}
