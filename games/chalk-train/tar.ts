import { between, makeRng, type Rng } from './rng'
import { DANDELION, PUDDLE, TAR, type Pt } from './yard'

// The ground: grey tar in flat daylight, with its stones, its cracks, a weed
// or two, the puddle and the dandelion. The tar is painted once for a surface
// size and kept, and painted again when the puddle changes colour. Nothing on
// it casts or takes a shadow.

type G = CanvasRenderingContext2D

/** How the tar's own units land on a surface: one scale, centred, the whole patch in view. */
export type View = { scale: number; dx: number; dy: number }

export function viewFor(width: number, height: number): View {
  const scale = Math.min(width / TAR.w, height / TAR.h)
  return { scale, dx: (width - TAR.w * scale) / 2, dy: (height - TAR.h * scale) / 2 }
}

export const TAR_GREY = '#63676c'

/** The fine stones in the tar, as a tile. */
function stones(rng: Rng, size = 256): HTMLCanvasElement {
  const tile = document.createElement('canvas')
  tile.width = tile.height = size
  const g = tile.getContext('2d')!
  g.fillStyle = TAR_GREY
  g.fillRect(0, 0, size, size)
  const tones = ['#7f8387', '#8b8f92', '#4a4e53', '#3f4347', '#555a5f', '#8a8377', '#74797e']
  for (let i = 0; i < size * size * 0.09; i++) {
    g.fillStyle = tones[Math.floor(rng.next() * tones.length)]
    g.globalAlpha = between(rng, 0.25, 0.8)
    const r = rng.next() < 0.06 ? between(rng, 1.2, 2.4) : between(rng, 0.4, 1.1)
    g.beginPath()
    g.ellipse(between(rng, 0, size), between(rng, 0, size), r, r * between(rng, 0.6, 1), between(rng, 0, 3), 0, Math.PI * 2)
    g.fill()
  }
  return tile
}

/** A crack: a wandering path with short kinks, from one point toward another. */
function crackPath(rng: Rng, from: Pt, to: Pt, kink = 16): Pt[] {
  const pts: Pt[] = [from]
  const steps = Math.max(4, Math.round(Math.hypot(to.x - from.x, to.y - from.y) / 34))
  for (let i = 1; i < steps; i++) {
    const t = i / steps
    pts.push({ x: from.x + (to.x - from.x) * t + between(rng, -kink, kink), y: from.y + (to.y - from.y) * t + between(rng, -kink, kink) })
  }
  pts.push(to)
  return pts
}

function drawCrack(g: G, pts: readonly Pt[], width: number) {
  const run = (dx: number, dy: number) => {
    g.beginPath()
    pts.forEach((p, i) => (i ? g.lineTo(p.x + dx, p.y + dy) : g.moveTo(p.x + dx, p.y + dy)))
    g.stroke()
  }
  g.lineJoin = 'bevel'
  g.lineCap = 'round'
  g.strokeStyle = '#8b8f93'
  g.globalAlpha = 0.45
  g.lineWidth = width + 2.2
  run(0.9, 1.1)
  g.strokeStyle = '#2b2e32'
  g.globalAlpha = 0.95
  g.lineWidth = width
  run(0, 0)
  g.globalAlpha = 1
}

/** A tuft of grass in a crack. */
function tuft(g: G, rng: Rng, x: number, y: number, size: number) {
  const greens = ['#5f8f4a', '#74a758', '#4f7d42']
  for (let i = 0; i < 9; i++) {
    const lean = between(rng, -0.9, 0.9), len = size * between(rng, 0.6, 1.1)
    g.strokeStyle = greens[i % greens.length]
    g.lineWidth = between(rng, 2, 3.4)
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x + between(rng, -4, 4), y)
    g.quadraticCurveTo(x + lean * len * 0.3, y - len * 0.7, x + lean * len, y - len)
    g.stroke()
  }
}

/** How the dandelion stands: its stalk bent (radians), how much of its seed head has grown, how far its flower is open, and whether it wears a tuft of stuck seeds. */
export type WeedState = { bend: number; seeds: number; bloom: number; tuft: boolean }

/** The dandelion: a rosette of toothed leaves flat on the tar, a stalk that bends from its foot, and a head. */
export function drawDandelion(g: G, rng: Rng, state: WeedState = { bend: 0, seeds: 1, bloom: 0, tuft: false }) {
  const { x, y } = DANDELION
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI / 2 + (i - 3) * 0.62 + between(rng, -0.1, 0.1), len = between(rng, 30, 44)
    g.save()
    g.translate(x, y)
    g.rotate(a)
    g.fillStyle = i % 2 ? '#6fa353' : '#5c9048'
    g.beginPath()
    g.moveTo(0, 0)
    for (let k = 1; k <= 4; k++) { g.lineTo((len * k) / 4 - 3, -7 + k * 0.6); g.lineTo((len * k) / 4, -3) }
    g.lineTo(len + 5, 0)
    for (let k = 4; k >= 1; k--) { g.lineTo((len * k) / 4, 3); g.lineTo((len * k) / 4 - 3, 7 - k * 0.6) }
    g.closePath()
    g.fill()
    g.restore()
  }
  // The head rides the top of the stalk, which leans over from its foot.
  const lean = Math.max(-1.3, Math.min(1.3, state.bend))
  const hx = x + 4 + Math.sin(lean) * 56, hy = y - Math.cos(lean) * 56
  g.strokeStyle = '#8fb86a'
  g.lineWidth = 4
  g.lineCap = 'round'
  g.beginPath()
  g.moveTo(x, y - 2)
  g.quadraticCurveTo(x + 9 + Math.sin(lean) * 16, y - 28, hx, hy + 6)
  g.stroke()
  const bloom = Math.max(0, Math.min(1, state.bloom)), seeds = Math.max(0, Math.min(1, state.seeds)) * (1 - bloom)
  if (bloom > 0.02) {
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2
      g.strokeStyle = i % 2 ? '#f6c431' : '#ffd84a'
      g.lineWidth = 4
      g.beginPath()
      g.moveTo(hx, hy)
      g.lineTo(hx + Math.cos(a) * 15 * bloom, hy + Math.sin(a) * 15 * bloom)
      g.stroke()
    }
    g.fillStyle = '#eda91f'
    g.beginPath()
    g.arc(hx, hy, 5 * bloom, 0, Math.PI * 2)
    g.fill()
  }
  if (seeds > 0.02) {
    // The seed head: a pale ball of fine spokes, growing back from the middle.
    g.fillStyle = `rgba(244,244,238,${0.28 * seeds})`
    g.beginPath()
    g.arc(hx, hy, 17 * seeds, 0, Math.PI * 2)
    g.fill()
    g.strokeStyle = 'rgba(248,248,242,0.85)'
    g.lineWidth = 1.2
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2 + between(rng, -0.08, 0.08), r = between(rng, 13, 17) * seeds
      g.beginPath()
      g.moveTo(hx, hy)
      g.lineTo(hx + Math.cos(a) * r, hy + Math.sin(a) * r)
      g.stroke()
      g.fillStyle = 'rgba(255,255,250,0.95)'
      g.beginPath()
      g.arc(hx + Math.cos(a) * r, hy + Math.sin(a) * r, 1.5, 0, Math.PI * 2)
      g.fill()
    }
  }
  if (state.tuft) {
    // A furry tuft of seeds stuck in chalk.
    g.fillStyle = 'rgba(250,250,244,0.9)'
    for (let i = 0; i < 34; i++) {
      const a = between(rng, 0, Math.PI * 2), d = between(rng, 4, 24)
      g.beginPath()
      g.arc(hx + Math.cos(a) * d, hy + Math.sin(a) * d * 0.9, between(rng, 1.2, 2.6), 0, Math.PI * 2)
      g.fill()
    }
  }
  g.fillStyle = '#b9a98a'
  g.beginPath()
  g.arc(hx, hy, 3, 0, Math.PI * 2)
  g.fill()
}

/** The puddle: wet dark tar round an uneven sheet of water holding the pale sky. `tint` is a chalk colour melted in. */
export function drawPuddle(g: G, rng: Rng, tint: string | null) {
  const { x, y, rx, ry } = PUDDLE
  const edge = (grow: number, seed: number) => {
    const wob = makeRng(seed)
    g.beginPath()
    for (let i = 0; i <= 40; i++) {
      const a = (i / 40) * Math.PI * 2
      const k = 1 + 0.07 * Math.sin(a * 3 + 1) + 0.05 * Math.sin(a * 5 + 2) + between(wob, -0.012, 0.012)
      const px = x + Math.cos(a) * (rx + grow) * k, py = y + Math.sin(a) * (ry + grow * 0.7) * k
      if (i) g.lineTo(px, py)
      else g.moveTo(px, py)
    }
    g.closePath()
  }
  // Wet tar round the water: darker, in two uneven rims.
  g.fillStyle = 'rgba(38,41,46,0.17)'
  edge(26, 12)
  g.fill()
  g.fillStyle = 'rgba(34,37,42,0.26)'
  edge(11, 13)
  g.fill()
  g.fillStyle = tint ?? '#8fa3b3'
  g.globalAlpha = tint ? 0.9 : 1
  edge(0, 11)
  g.fill()
  g.globalAlpha = 1
  g.save()
  edge(0, 11)
  g.clip()
  // The sky in it: flat pale bands, no shine and no shadow.
  g.fillStyle = 'rgba(214,226,236,0.55)'
  g.beginPath()
  g.ellipse(x - rx * 0.25, y - ry * 0.25, rx * 0.5, ry * 0.3, -0.1, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = 'rgba(232,240,246,0.6)'
  g.beginPath()
  g.ellipse(x + rx * 0.35, y + ry * 0.2, rx * 0.22, ry * 0.16, 0.1, 0, Math.PI * 2)
  g.fill()
  g.restore()
  void rng
}

/** Paints the ground into `g`, a surface of `width` by `height` logical pixels: everything but the dandelion, which moves and is drawn by the view. */
export function paintTar(g: G, width: number, height: number, view: View, seed: number, water: string | null = null) {
  const rng = makeRng(seed)
  const pattern = g.createPattern(stones(rng), 'repeat')
  g.fillStyle = pattern ?? TAR_GREY
  g.fillRect(0, 0, width, height)
  // Patches where the tar was laid or worn unevenly.
  for (let i = 0; i < 22; i++) {
    const dark = rng.next() < 0.5, rx = between(rng, 120, 340), ry = between(rng, 80, 220)
    g.save()
    g.translate(between(rng, 0, width), between(rng, 0, height))
    g.rotate(between(rng, 0, 3))
    g.scale(rx, ry)
    // Soft to nothing at the rim, so a patch has no edge.
    const fade = g.createRadialGradient(0, 0, 0, 0, 0, 1)
    fade.addColorStop(0, dark ? 'rgba(30,33,38,0.13)' : 'rgba(196,200,204,0.1)')
    fade.addColorStop(1, dark ? 'rgba(30,33,38,0)' : 'rgba(196,200,204,0)')
    g.fillStyle = fade
    g.beginPath()
    g.arc(0, 0, 1, 0, Math.PI * 2)
    g.fill()
    g.restore()
  }
  g.save()
  g.translate(view.dx, view.dy)
  g.scale(view.scale, view.scale)
  // The long crack the dandelion grows in, with one branch, and a short one in a corner.
  const main = crackPath(rng, { x: 520, y: -40 }, { x: DANDELION.x, y: DANDELION.y })
  const tail = crackPath(rng, { x: DANDELION.x, y: DANDELION.y }, { x: 560, y: 520 })
  const branch = crackPath(rng, tail[4], { x: 760, y: 300 }, 10)
  const corner = crackPath(rng, { x: 1240, y: 520 }, { x: 1090, y: 760 }, 12)
  drawCrack(g, main, 3.4)
  drawCrack(g, tail, 2.8)
  drawCrack(g, branch, 1.8)
  drawCrack(g, corner, 2.6)
  tuft(g, rng, corner[3].x, corner[3].y, 24)
  drawPuddle(g, rng, water)
  g.restore()
}

/** A point of the surface, in logical pixels, as a point of the tar. */
export const toTar = (view: View, x: number, y: number): Pt => ({ x: (x - view.dx) / view.scale, y: (y - view.dy) / view.scale })

/** The outline of the water, for clipping what is seen in it. */
export function puddlePath(g: G) {
  const { x, y, rx, ry } = PUDDLE
  g.beginPath()
  g.ellipse(x, y, rx * 0.98, ry * 0.98, 0, 0, Math.PI * 2)
}
