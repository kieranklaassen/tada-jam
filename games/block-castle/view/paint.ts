import * as THREE from 'three'
import { makeRng, type Rng } from '../rng'

// Every texture of the game, painted on canvases before the first frame.
// Nothing is fetched and nothing is committed as an image. What stands still
// is painted once here and stamped: the wall with its window and shelf, the
// floorboards with their long shadows, the rug.
// No canvas text call is made anywhere: nothing here is a word, a letter, a
// numeral or a sign.

type Ctx = CanvasRenderingContext2D

function canvas(width: number, height: number): [HTMLCanvasElement, Ctx] {
  const element = document.createElement('canvas')
  element.width = width
  element.height = height
  return [element, element.getContext('2d')!]
}

function texture(element: HTMLCanvasElement, repeat = false): THREE.CanvasTexture {
  const made = new THREE.CanvasTexture(element)
  made.colorSpace = THREE.SRGBColorSpace
  made.anisotropy = 4
  if (repeat) made.wrapS = made.wrapT = THREE.RepeatWrapping
  return made
}

const between = (rng: Rng, a: number, b: number): number => a + rng.next() * (b - a)

/** Soft blots of one colour, for mottling a flat fill. */
function mottle(ctx: Ctx, rng: Rng, x: number, y: number, w: number, h: number, count: number, size: [number, number], colour: string, alpha: number): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x, y, w, h)
  ctx.clip()
  ctx.fillStyle = colour
  for (let i = 0; i < count; i++) {
    ctx.globalAlpha = alpha * between(rng, 0.4, 1)
    ctx.beginPath()
    ctx.ellipse(x + rng.next() * w, y + rng.next() * h, between(rng, size[0], size[1]), between(rng, size[0], size[1]) * between(rng, 0.5, 1), rng.next() * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}

// --- The wood of the blocks --------------------------------------------------

/** The atlas is square; each quarter holds one face of raw branch wood. */
export const ATLAS = 1024

/** A quarter of the atlas as a rectangle of texture coordinates, a little inside its edges so nothing bleeds. */
export type Region = { u0: number; v0: number; u1: number; v1: number }
const quarter = (col: number, row: number): Region => {
  const inset = 6 / ATLAS
  return { u0: col * 0.5 + inset, u1: col * 0.5 + 0.5 - inset, v0: 1 - (row * 0.5 + 0.5) + inset, v1: 1 - row * 0.5 - inset }
}
/** Bark, its furrows running up; it wraps from its left edge to its right. */
export const BARK = quarter(0, 0)
/** Sawn wood along the grain, the grain running across. */
export const GRAIN = quarter(1, 0)
/** A sawn end: rings round a heart in the middle, a crack, and a rim of bark. */
export const RINGS = quarter(0, 1)
/** A sawn slab: rings round a heart at the middle of its lower edge. */
export const ARCS = quarter(1, 1)

const WOOD = { pale: '#ecd5a8', ring: '#c79e66', deep: '#a57a48', heart: '#b98b58', crack: '#6f4f31' }
const BARK_TONES = { base: '#84654a', dark: '#4b3626', light: '#a58768', lichen: '#aeb394' }

function paintBark(ctx: Ctx, rng: Rng, x0: number, y0: number, size: number): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, size, size)
  ctx.clip()
  ctx.fillStyle = BARK_TONES.base
  ctx.fillRect(x0, y0, size, size)
  mottle(ctx, rng, x0, y0, size, size, 90, [14, 46], BARK_TONES.light, 0.2)
  // Furrows: dark wavering lines that run up, drawn three times so the bark wraps round a branch.
  for (let i = 0; i < 120; i++) {
    const x = rng.next() * size, wide = between(rng, 1.5, 6), from = rng.next() * size, long = between(rng, 60, 300)
    const sway = between(rng, 3, 12), phase = rng.next() * 6
    const pale = rng.next() < 0.35
    ctx.strokeStyle = pale ? BARK_TONES.light : BARK_TONES.dark
    ctx.globalAlpha = pale ? 0.5 : between(rng, 0.45, 0.9)
    ctx.lineWidth = wide
    ctx.lineCap = 'round'
    for (const shift of [-size, 0, size]) {
      ctx.beginPath()
      for (let s = 0; s <= long; s += 12) {
        const px = x0 + x + shift + Math.sin(s * 0.03 + phase) * sway, py = y0 + ((from + s) % size)
        if (s === 0 || (from + s) % size < 12) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.stroke()
    }
  }
  // Lichen, and the scars where twigs came off.
  mottle(ctx, rng, x0, y0, size, size, 16, [6, 20], BARK_TONES.lichen, 0.5)
  for (let i = 0; i < 5; i++) {
    const x = x0 + between(rng, 40, size - 40), y = y0 + between(rng, 40, size - 40), r = between(rng, 9, 18)
    ctx.globalAlpha = 0.9
    ctx.fillStyle = BARK_TONES.dark
    ctx.beginPath(); ctx.ellipse(x, y, r * 1.4, r, 0, 0, Math.PI * 2); ctx.fill()
    ctx.fillStyle = WOOD.deep
    ctx.beginPath(); ctx.ellipse(x, y, r * 0.8, r * 0.55, 0, 0, Math.PI * 2); ctx.fill()
  }
  ctx.restore()
}

function paintGrain(ctx: Ctx, rng: Rng, x0: number, y0: number, size: number): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, size, size)
  ctx.clip()
  ctx.fillStyle = WOOD.pale
  ctx.fillRect(x0, y0, size, size)
  mottle(ctx, rng, x0, y0, size, size, 40, [30, 90], '#f5e4bf', 0.35)
  // Long grain lines, a little wavy, with the odd one dark.
  for (let i = 0; i < 70; i++) {
    const y = y0 + rng.next() * size, sway = between(rng, 2, 10), phase = rng.next() * 6
    ctx.strokeStyle = rng.next() < 0.2 ? WOOD.deep : WOOD.ring
    ctx.globalAlpha = between(rng, 0.25, 0.7)
    ctx.lineWidth = between(rng, 1, 3.5)
    ctx.beginPath()
    for (let s = 0; s <= size; s += 16) ctx.lineTo(x0 + s, y + Math.sin(s * 0.012 + phase) * sway)
    ctx.stroke()
  }
  // The marks of the saw across it, faint.
  ctx.strokeStyle = '#ffffff'
  ctx.lineWidth = 1
  for (let i = 0; i < 46; i++) {
    const x = x0 + rng.next() * size
    ctx.globalAlpha = 0.12
    ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x + between(rng, -6, 6), y0 + size); ctx.stroke()
  }
  ctx.restore()
}

/** Rings round a heart at (cx, cy), out to `reach`. With `rim` the outermost band is bark. */
function paintRings(ctx: Ctx, rng: Rng, x0: number, y0: number, size: number, cx: number, cy: number, reach: number, rim: boolean): void {
  ctx.save()
  ctx.beginPath()
  ctx.rect(x0, y0, size, size)
  ctx.clip()
  ctx.fillStyle = rim ? BARK_TONES.dark : WOOD.pale
  ctx.fillRect(x0, y0, size, size)
  // A lumpy outline, the same lumps for every ring so they nest.
  const lump = (angle: number): number => 1 + 0.035 * Math.sin(angle * 3 + 1) + 0.025 * Math.sin(angle * 5 + 2.4) + 0.012 * Math.sin(angle * 11)
  const ring = (radius: number): void => {
    ctx.beginPath()
    for (let i = 0; i <= 72; i++) {
      const angle = (i / 72) * Math.PI * 2
      ctx.lineTo(x0 + cx + Math.cos(angle) * radius * lump(angle), y0 + cy + Math.sin(angle) * radius * lump(angle))
    }
    ctx.closePath()
  }
  const wood = rim ? reach * 0.93 : reach
  ctx.fillStyle = WOOD.pale
  ring(wood); ctx.fill()
  if (rim) {
    // The thin dark line where the bark begins.
    ctx.strokeStyle = WOOD.crack; ctx.globalAlpha = 0.7; ctx.lineWidth = 3
    ring(wood); ctx.stroke()
  }
  ctx.fillStyle = WOOD.heart
  ctx.globalAlpha = 0.5
  ring(reach * 0.2); ctx.fill()
  let radius = reach * 0.04
  while (radius < wood - 4) {
    ctx.strokeStyle = rng.next() < 0.25 ? WOOD.deep : WOOD.ring
    ctx.globalAlpha = between(rng, 0.45, 0.95)
    ctx.lineWidth = between(rng, 1.2, 3.6)
    ring(radius); ctx.stroke()
    radius += between(rng, 5, 13)
  }
  // The crack every sawn end has: a dark split from near the heart to the bark.
  ctx.globalAlpha = 0.85
  ctx.fillStyle = WOOD.crack
  const angle = between(rng, 3.4, 5.6)
  ctx.beginPath()
  ctx.moveTo(x0 + cx + Math.cos(angle) * reach * 0.08, y0 + cy + Math.sin(angle) * reach * 0.08)
  ctx.lineTo(x0 + cx + Math.cos(angle - 0.03) * wood * 0.92, y0 + cy + Math.sin(angle - 0.03) * wood * 0.92)
  ctx.lineTo(x0 + cx + Math.cos(angle + 0.035) * wood * 0.9, y0 + cy + Math.sin(angle + 0.035) * wood * 0.9)
  ctx.closePath(); ctx.fill()
  ctx.restore()
}

export function woodAtlas(): THREE.CanvasTexture {
  const [element, ctx] = canvas(ATLAS, ATLAS)
  const rng = makeRng(71)
  const half = ATLAS / 2
  paintBark(ctx, rng, 0, 0, half)
  paintGrain(ctx, rng, half, 0, half)
  paintRings(ctx, rng, 0, half, half, half / 2, half / 2, half * 0.47, true)
  paintRings(ctx, rng, half, half, half, half / 2, half - 20, half * 1.05, false)
  return texture(element)
}

// --- The room ------------------------------------------------------------------

export const ROOM = {
  rug: '#63803c',
  rugDark: '#4d6a31',
  rugLight: '#7c9a4a',
  floor: '#7a5536',
  floorDark: '#5b3d27',
  wall: '#ead9b8',
  wallShade: '#d3bf9a',
  panel: '#8f9a80',
  panelDark: '#76826a',
  frame: '#b08b5e',
  sun: '#ffd48a',
  shadow: '#2a1d10',
}

export function rugTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(1024, 544)
  const rng = makeRng(5)
  ctx.fillStyle = ROOM.rug
  ctx.fillRect(0, 0, 1024, 544)
  // Wool: thousands of small loops, lighter and darker.
  mottle(ctx, rng, 0, 0, 1024, 544, 2600, [2, 6], ROOM.rugLight, 0.28)
  mottle(ctx, rng, 0, 0, 1024, 544, 2200, [2, 6], ROOM.rugDark, 0.3)
  mottle(ctx, rng, 0, 0, 1024, 544, 30, [40, 120], '#8aa655', 0.1)
  // A border worked in a darker wool, and a row of blanket stitches round the very edge.
  ctx.strokeStyle = ROOM.rugDark
  ctx.globalAlpha = 0.75
  ctx.lineWidth = 16
  ctx.strokeRect(30, 30, 964, 484)
  ctx.globalAlpha = 0.9
  ctx.strokeStyle = '#d9cfa4'
  ctx.lineWidth = 3
  for (let x = 10; x < 1024; x += 18) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 3, 13); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(x, 544); ctx.lineTo(x + 3, 531); ctx.stroke()
  }
  for (let y = 10; y < 544; y += 18) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(13, y + 3); ctx.stroke()
    ctx.beginPath(); ctx.moveTo(1024, y); ctx.lineTo(1011, y + 3); ctx.stroke()
  }
  return texture(element)
}

/** The floorboards, as wide as the room and from the wall to past the child's edge. `shadows` are painted in: soft dark shapes in floor units. */
export function floorTexture(span: { x0: number; x1: number; z0: number; z1: number }, shadows: readonly { x: number; z: number; rx: number; rz: number; turn: number; alpha: number }[]): THREE.CanvasTexture {
  const W = 2048, H = 1024
  const [element, ctx] = canvas(W, H)
  const rng = makeRng(11)
  const sx = W / (span.x1 - span.x0), sz = H / (span.z1 - span.z0)
  ctx.fillStyle = ROOM.floor
  ctx.fillRect(0, 0, W, H)
  // Boards that run toward the child, each its own tone, with grain and a dark gap between.
  const board = 0.62 * sx
  for (let x = -rng.next() * board; x < W; x += board) {
    const tone = between(rng, -1, 1)
    ctx.globalAlpha = 0.16 * Math.abs(tone)
    ctx.fillStyle = tone > 0 ? '#a57a4e' : '#3d2616'
    ctx.fillRect(x, 0, board, H)
    ctx.globalAlpha = 1
    for (let i = 0; i < 9; i++) {
      ctx.strokeStyle = rng.next() < 0.5 ? '#94683f' : '#5f4029'
      ctx.globalAlpha = between(rng, 0.12, 0.3)
      ctx.lineWidth = between(rng, 1, 3)
      const gx = x + rng.next() * board
      ctx.beginPath(); ctx.moveTo(gx, 0); ctx.bezierCurveTo(gx + between(rng, -8, 8), H * 0.3, gx + between(rng, -8, 8), H * 0.7, gx + between(rng, -5, 5), H); ctx.stroke()
    }
    ctx.globalAlpha = 0.8
    ctx.fillStyle = '#2f1f12'
    ctx.fillRect(x - 1.5, 0, 3, H)
    // Board ends, staggered, with two nail heads.
    for (let y = rng.next() * H * 0.6; y < H; y += between(rng, 0.45, 0.8) * H) {
      ctx.globalAlpha = 0.7
      ctx.fillRect(x, y, board, 2.5)
      ctx.globalAlpha = 0.6
      for (const nx of [0.2, 0.8]) { ctx.beginPath(); ctx.arc(x + board * nx, y + 12, 3, 0, Math.PI * 2); ctx.fill() }
    }
  }
  // Low sun: warm near the window, cooler and darker toward the far corner.
  const warm = ctx.createLinearGradient(0, 0, W, H)
  warm.addColorStop(0, 'rgba(255, 196, 120, 0.2)')
  warm.addColorStop(0.55, 'rgba(255, 196, 120, 0)')
  warm.addColorStop(1, 'rgba(24, 16, 30, 0.34)')
  ctx.globalAlpha = 1
  ctx.fillStyle = warm
  ctx.fillRect(0, 0, W, H)
  // The shadow under the wall, where floor meets skirting.
  const base = ctx.createLinearGradient(0, 0, 0, 70)
  base.addColorStop(0, 'rgba(30, 18, 8, 0.55)')
  base.addColorStop(1, 'rgba(30, 18, 8, 0)')
  ctx.fillStyle = base
  ctx.fillRect(0, 0, W, 70)
  // What stands still throws its shadow once, here.
  for (const shadow of shadows) {
    const px = (shadow.x - span.x0) * sx, pz = (shadow.z - span.z0) * sz
    const blot = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
    blot.addColorStop(0, `rgba(30, 18, 8, ${shadow.alpha})`)
    blot.addColorStop(0.6, `rgba(30, 18, 8, ${shadow.alpha * 0.7})`)
    blot.addColorStop(1, 'rgba(30, 18, 8, 0)')
    ctx.save()
    ctx.translate(px, pz)
    ctx.rotate(shadow.turn)
    ctx.scale(shadow.rx * sx, shadow.rz * sz)
    ctx.fillStyle = blot
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, Math.PI * 2); ctx.fill()
    ctx.restore()
  }
  // Things from under the trees that got left on the floor: dry leaves, acorn cups, curls of bark.
  // They lie on the bare boards between the rug and the child, where the frame would otherwise be empty.
  for (let i = 0; i < 36; i++) {
    const x = between(rng, 0.17, 0.83) * W, y = between(rng, 0.56, 0.84) * H, r = between(rng, 9, 20), turn = rng.next() * Math.PI
    ctx.save()
    ctx.translate(x, y)
    ctx.rotate(turn)
    ctx.globalAlpha = 0.9
    const kind = i % 3
    if (kind === 0) {
      ctx.fillStyle = ['#b9793a', '#a8652e', '#c28f47'][below4(rng) % 3]
      ctx.beginPath(); ctx.ellipse(0, 0, r * 1.6, r * 0.7, 0, 0, Math.PI * 2); ctx.fill()
      ctx.strokeStyle = '#6f4420'; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(-r * 1.9, 0); ctx.lineTo(r * 1.5, 0); ctx.stroke()
    } else if (kind === 1) {
      // An acorn cup lying on its side: a bowl seen from the side with its hollow in shade, never a ring.
      ctx.fillStyle = '#8a6a48'
      ctx.beginPath(); ctx.ellipse(0, 0, r * 0.62, r * 0.5, 0, 0, Math.PI * 2); ctx.fill()
      ctx.fillStyle = '#5b422c'
      ctx.beginPath(); ctx.ellipse(r * 0.3, 0, r * 0.3, r * 0.42, 0, 0, Math.PI * 2); ctx.fill()
    } else {
      // A flake of bark: a lumpy filled chip with a pale edge, never an open curl, which reads as a letter.
      const lumps = [1, 0.72, 0.95, 0.6, 0.88, 0.7].map((lump) => lump * (0.85 + 0.3 * rng.next()))
      ctx.fillStyle = '#9a7146'
      ctx.beginPath()
      lumps.forEach((lump, k) => {
        const angle = (k / lumps.length) * Math.PI * 2
        const px = Math.cos(angle) * r * 1.1 * lump, py = Math.sin(angle) * r * 0.55 * lump
        if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py)
      })
      ctx.closePath(); ctx.fill()
      ctx.strokeStyle = '#c9a36c'; ctx.lineWidth = 2; ctx.lineJoin = 'round'
      ctx.stroke()
    }
    ctx.restore()
  }
  return texture(element)
}

/** Where the window, the wainscot and the shelf sit on the wall, in wall units from its left edge and from the floor. */
export const WALL = {
  wide: 22,
  tall: 7.4,
  window: { x0: 5.4, x1: 8.6, y0: 2.0, y1: 5.5 },
  panel: 1.55,
}

/** The back wall: plaster in low sun, a boarded lower part, a window to see through, and what hangs and stands along it. */
export function wallTexture(): THREE.CanvasTexture {
  const W = 2048, H = Math.round((2048 * WALL.tall) / WALL.wide)
  const [element, ctx] = canvas(W, H)
  const rng = makeRng(23)
  const u = W / WALL.wide
  const Y = (y: number): number => H - y * u
  ctx.fillStyle = ROOM.wall
  ctx.fillRect(0, 0, W, H)
  mottle(ctx, rng, 0, 0, W, H, 160, [30, 120], ROOM.wallShade, 0.12)
  mottle(ctx, rng, 0, 0, W, H, 90, [20, 90], '#fbeed0', 0.14)
  // The corner of the room falls away into shade at the right, and the sun warms the plaster by the window.
  const shade = ctx.createLinearGradient(0, 0, W, 0)
  shade.addColorStop(0, 'rgba(120, 84, 60, 0.18)')
  shade.addColorStop(0.3, 'rgba(255, 214, 150, 0.2)')
  shade.addColorStop(0.6, 'rgba(255, 214, 150, 0)')
  shade.addColorStop(1, 'rgba(60, 44, 56, 0.4)')
  ctx.fillStyle = shade
  ctx.fillRect(0, 0, W, H)

  // The boarded lower wall, its rail and the skirting.
  ctx.fillStyle = ROOM.panel
  ctx.fillRect(0, Y(WALL.panel), W, WALL.panel * u)
  mottle(ctx, rng, 0, Y(WALL.panel), W, WALL.panel * u, 120, [10, 60], ROOM.panelDark, 0.2)
  ctx.strokeStyle = ROOM.panelDark
  ctx.lineWidth = 3
  for (let x = 0; x < W; x += 0.42 * u) { ctx.globalAlpha = 0.8; ctx.beginPath(); ctx.moveTo(x, Y(WALL.panel)); ctx.lineTo(x, H); ctx.stroke() }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#a3ad92'
  ctx.fillRect(0, Y(WALL.panel) - 10, W, 16)
  ctx.fillStyle = 'rgba(40, 30, 20, 0.35)'
  ctx.fillRect(0, Y(WALL.panel) + 6, W, 6)
  ctx.fillStyle = ROOM.panelDark
  ctx.fillRect(0, Y(0.3), W, 0.3 * u)
  ctx.fillStyle = 'rgba(30, 20, 12, 0.3)'
  ctx.fillRect(0, Y(0.3), W, 4)
  ctx.fillRect(W * 0.6, Y(WALL.panel), W * 0.4, WALL.panel * u)

  // The window: a wooden frame round a hole, a deep sill, and two upright bars. The hole is cut clear through.
  const win = WALL.window
  const wx = win.x0 * u, wy = Y(win.y1), ww = (win.x1 - win.x0) * u, wh = (win.y1 - win.y0) * u
  ctx.fillStyle = ROOM.frame
  ctx.fillRect(wx - 22, wy - 22, ww + 44, wh + 44)
  ctx.fillStyle = '#8c6a44'
  ctx.fillRect(wx - 22, wy + wh + 6, ww + 44, 16)
  ctx.fillStyle = '#c7a273'
  ctx.fillRect(wx - 40, wy + wh + 14, ww + 80, 20)
  ctx.fillStyle = 'rgba(40, 26, 12, 0.35)'
  ctx.fillRect(wx - 40, wy + wh + 34, ww + 80, 12)
  ctx.clearRect(wx, wy, ww, wh)
  ctx.fillStyle = ROOM.frame
  for (const bar of [1 / 3, 2 / 3]) ctx.fillRect(wx + ww * bar - 7, wy, 14, wh)
  // Sun on the reveal of the frame.
  ctx.fillStyle = 'rgba(255, 226, 170, 0.55)'
  ctx.fillRect(wx + ww, wy - 4, 10, wh + 8)
  // A linen curtain drawn back to the right of the window.
  const cx = wx + ww + 26
  ctx.fillStyle = '#e4d6b6'
  ctx.beginPath()
  ctx.moveTo(cx, wy - 50); ctx.lineTo(cx + 130, wy - 50)
  ctx.bezierCurveTo(cx + 120, wy + wh * 0.5, cx + 70, wy + wh * 0.72, cx + 46, wy + wh * 0.78)
  ctx.bezierCurveTo(cx + 90, wy + wh * 0.9, cx + 110, wy + wh + 40, cx + 104, wy + wh + 90)
  ctx.lineTo(cx - 6, wy + wh + 90)
  ctx.bezierCurveTo(cx + 6, wy + wh * 0.9, cx + 20, wy + wh * 0.8, cx + 30, wy + wh * 0.76)
  ctx.bezierCurveTo(cx + 8, wy + wh * 0.5, cx, wy + wh * 0.2, cx, wy - 50)
  ctx.fill()
  ctx.strokeStyle = '#c4b28c'; ctx.lineWidth = 3; ctx.globalAlpha = 0.7
  for (let i = 1; i < 6; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 21, wy - 50); ctx.quadraticCurveTo(cx + i * 19, wy + wh * 0.4, cx + 30 + i * 3, wy + wh * 0.76); ctx.stroke() }
  ctx.globalAlpha = 1
  ctx.fillStyle = '#9a7648'
  ctx.fillRect(cx + 22, wy + wh * 0.74, 34, 12)
  ctx.fillRect(wx - 60, wy - 62, ww + 260, 12)

  // A shelf on two brackets along the right of the wall, with what was brought in from the wood.
  const shelfY = Y(3.35), sx0 = 11.6 * u, sx1 = 18.4 * u
  ctx.fillStyle = 'rgba(40, 26, 12, 0.3)'
  ctx.fillRect(sx0 + 14, shelfY + 18, sx1 - sx0, 16)
  ctx.fillStyle = '#b58f61'
  ctx.fillRect(sx0, shelfY, sx1 - sx0, 20)
  ctx.fillStyle = '#8c6a44'
  for (const bx of [sx0 + 60, sx1 - 90]) { ctx.beginPath(); ctx.moveTo(bx, shelfY + 20); ctx.lineTo(bx + 30, shelfY + 20); ctx.lineTo(bx, shelfY + 86); ctx.closePath(); ctx.fill() }
  // Pine cones in a row, big to small.
  let px = sx0 + 60
  for (let i = 0; i < 4; i++) {
    const h = 96 - i * 16, w = h * 0.62
    ctx.fillStyle = '#7b5a3c'
    ctx.beginPath(); ctx.ellipse(px, shelfY - h / 2, w / 2, h / 2, 0, 0, Math.PI * 2); ctx.fill()
    ctx.strokeStyle = '#a8845c'; ctx.lineWidth = 3
    for (let row = 1; row < 6; row++) { ctx.beginPath(); ctx.arc(px, shelfY - h + row * h / 6 - 6, w * 0.5 * Math.sin((row / 6) * Math.PI), 0.25, Math.PI - 0.25); ctx.stroke() }
    px += w + 22
  }
  // A clay jar of sticks.
  const jx = px + 70
  ctx.strokeStyle = '#7a5d42'; ctx.lineWidth = 7; ctx.lineCap = 'round'
  for (const [dx, top] of [[-22, 190], [-6, 230], [8, 205], [24, 175]] as const) { ctx.beginPath(); ctx.moveTo(jx + dx * 0.3, shelfY - 60); ctx.lineTo(jx + dx, shelfY - top); ctx.stroke() }
  ctx.fillStyle = '#b9a184'
  ctx.beginPath(); ctx.moveTo(jx - 36, shelfY); ctx.quadraticCurveTo(jx - 58, shelfY - 60, jx - 28, shelfY - 104); ctx.lineTo(jx + 28, shelfY - 104); ctx.quadraticCurveTo(jx + 58, shelfY - 60, jx + 36, shelfY); ctx.closePath(); ctx.fill()
  ctx.fillStyle = 'rgba(255, 240, 210, 0.3)'
  ctx.beginPath(); ctx.ellipse(jx - 20, shelfY - 56, 8, 30, 0.1, 0, Math.PI * 2); ctx.fill()
  // A wooden bowl of conkers.
  const bx = jx + 190
  ctx.fillStyle = '#6e3219'
  for (const [dx, dy] of [[-34, -52], [-6, -62], [24, -54], [-20, -40], [10, -42]] as const) { ctx.beginPath(); ctx.arc(bx + dx, shelfY + dy, 19, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = 'rgba(255, 230, 190, 0.5)'
  for (const [dx, dy] of [[-40, -60], [-12, -70], [18, -62]] as const) { ctx.beginPath(); ctx.arc(bx + dx, shelfY + dy, 5, 0, Math.PI * 2); ctx.fill() }
  ctx.fillStyle = '#a07a4e'
  ctx.beginPath(); ctx.moveTo(bx - 70, shelfY - 44); ctx.quadraticCurveTo(bx, shelfY + 30, bx + 70, shelfY - 44); ctx.closePath(); ctx.fill()
  // Bunches of dried leaves and seed heads hung by their stalks under the shelf.
  for (let i = 0; i < 4; i++) {
    const hx = sx0 + 340 + i * 95, top = shelfY + 22, long = 120 + (i % 2) * 30
    ctx.strokeStyle = '#8a7a52'; ctx.lineWidth = 3
    for (let s = -3; s <= 3; s++) { ctx.beginPath(); ctx.moveTo(hx, top); ctx.quadraticCurveTo(hx + s * 4, top + long * 0.5, hx + s * 12, top + long); ctx.stroke() }
    ctx.fillStyle = ['#a9a06a', '#b98d56', '#8f9a66', '#b7a274'][i]
    for (let s = -3; s <= 3; s++) { ctx.beginPath(); ctx.ellipse(hx + s * 12, top + long + 10, 9, 20, s * 0.12, 0, Math.PI * 2); ctx.fill() }
    ctx.fillStyle = '#7a6844'
    ctx.fillRect(hx - 9, top + 30, 18, 8)
  }
  const made = texture(element)
  return made
}

/** What is seen through the window: a pale evening sky, far hills, and the trunk the branch grows from. */
export function outsideTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(512, 512)
  const sky = ctx.createLinearGradient(0, 0, 0, 512)
  sky.addColorStop(0, '#bcd6e0')
  sky.addColorStop(0.55, '#f6e3b4')
  sky.addColorStop(1, '#f9c98a')
  ctx.fillStyle = sky
  ctx.fillRect(0, 0, 512, 512)
  // The low sun itself, a pale disc in haze.
  const sun = ctx.createRadialGradient(150, 330, 0, 150, 330, 190)
  sun.addColorStop(0, 'rgba(255, 250, 225, 1)')
  sun.addColorStop(0.2, 'rgba(255, 238, 190, 0.8)')
  sun.addColorStop(1, 'rgba(255, 230, 170, 0)')
  ctx.fillStyle = sun
  ctx.fillRect(0, 0, 512, 512)
  ctx.fillStyle = '#b7c2a0'
  ctx.beginPath(); ctx.moveTo(0, 420); ctx.quadraticCurveTo(140, 350, 290, 410); ctx.quadraticCurveTo(410, 450, 512, 390); ctx.lineTo(512, 512); ctx.lineTo(0, 512); ctx.fill()
  ctx.fillStyle = '#93a67c'
  ctx.beginPath(); ctx.moveTo(0, 470); ctx.quadraticCurveTo(200, 420, 512, 462); ctx.lineTo(512, 512); ctx.lineTo(0, 512); ctx.fill()
  return texture(element)
}

/** A branch in leaf, on clear: it grows in from the right edge. The view sways it. */
export function branchTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(512, 512)
  const rng = makeRng(31)
  ctx.strokeStyle = '#6a4f38'
  ctx.lineCap = 'round'
  const twig = (x: number, y: number, angle: number, long: number, wide: number, depth: number): void => {
    const ex = x + Math.cos(angle) * long, ey = y + Math.sin(angle) * long
    ctx.lineWidth = wide
    ctx.globalAlpha = 1
    ctx.strokeStyle = '#6a4f38'
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(ex, ey); ctx.stroke()
    if (depth === 0) {
      for (let i = 0; i < 7; i++) {
        const lx = x + (ex - x) * between(rng, 0.2, 1.05), ly = y + (ey - y) * between(rng, 0.2, 1.05)
        ctx.fillStyle = ['#7f9a4c', '#96ad58', '#b7a548', '#6c8a44'][below4(rng)]
        ctx.globalAlpha = 0.95
        ctx.beginPath(); ctx.ellipse(lx + between(rng, -16, 16), ly + between(rng, -16, 16), between(rng, 13, 22), between(rng, 7, 11), rng.next() * Math.PI, 0, Math.PI * 2); ctx.fill()
      }
      return
    }
    for (let i = 0; i < 3; i++) twig(x + (ex - x) * between(rng, 0.35, 1), y + (ey - y) * between(rng, 0.35, 1), angle + between(rng, -0.9, 0.9), long * between(rng, 0.45, 0.7), Math.max(2, wide * 0.6), depth - 1)
  }
  twig(520, 150, Math.PI * 0.93, 300, 16, 2)
  twig(520, 60, Math.PI * 1.02, 220, 10, 1)
  return texture(element)
}

function below4(rng: Rng): number {
  return Math.min(3, Math.floor(rng.next() * 4))
}

/** The patch of sun on the floor: three panes of light with soft edges, seen from above as a plain rectangle. The view lays it out slanted. */
export function sunPatchTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(256, 256)
  ctx.clearRect(0, 0, 256, 256)
  // Each pane is drawn with a soft shadow of its own colour round it, which blurs its edge.
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur = 12
  for (let pane = 0; pane < 3; pane++) ctx.fillRect(26 + pane * 73, 24, 54, 208)
  ctx.shadowBlur = 0
  return texture(element)
}

/** The shadows of leaves, on clear, tiling: the view slides them over the patch of sun. */
export function leafShadowTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(256, 256)
  const rng = makeRng(43)
  ctx.clearRect(0, 0, 256, 256)
  ctx.fillStyle = '#ffffff'
  ctx.shadowColor = '#ffffff'
  ctx.shadowBlur = 5
  for (let i = 0; i < 46; i++) {
    const x = rng.next() * 256, y = rng.next() * 256, rx = between(rng, 10, 22), ry = between(rng, 5, 10), turn = rng.next() * Math.PI
    for (const sx of [-256, 0, 256]) for (const sy of [-256, 0, 256]) { ctx.beginPath(); ctx.ellipse(x + sx, y + sy, rx, ry, turn, 0, Math.PI * 2); ctx.fill() }
  }
  ctx.shadowBlur = 0
  return texture(element, true)
}

/** A soft round blot on clear: the blob shadows, the wool dust and the glow are all stamped from it. */
export function blotTexture(hard: number): THREE.CanvasTexture {
  const [element, ctx] = canvas(128, 128)
  const blot = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
  blot.addColorStop(0, 'rgba(255, 255, 255, 1)')
  blot.addColorStop(hard, 'rgba(255, 255, 255, 0.85)')
  blot.addColorStop(1, 'rgba(255, 255, 255, 0)')
  ctx.fillStyle = blot
  ctx.fillRect(0, 0, 128, 128)
  return texture(element)
}

/** A square with soft edges: the shadow a block throws, before the view lays it along the sun's way. */
export function softSquareTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(64, 64)
  const edge = 9
  // Squares one inside the other, each a little darker than the one round it.
  for (let i = 0; i <= edge; i++) {
    ctx.clearRect(i, i, 64 - i * 2, 64 - i * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${(i / edge) ** 1.6})`
    ctx.fillRect(i, i, 64 - i * 2, 64 - i * 2)
  }
  return texture(element)
}

/** Water after sunset: dark, with pale ripples lying across it, each an uneven arc, no two alike and none level. It tiles. */
export function waterTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(256, 256)
  const rng = makeRng(83)
  ctx.fillStyle = '#243a63'
  ctx.fillRect(0, 0, 256, 256)
  mottle(ctx, rng, 0, 0, 256, 256, 26, [18, 44], '#1a2c50', 0.5)
  ctx.lineCap = 'round'
  for (let i = 0; i < 46; i++) {
    const x = rng.next() * 256, y = rng.next() * 256, long = between(rng, 14, 46)
    ctx.strokeStyle = i % 3 ? 'rgba(150, 178, 226, 0.5)' : 'rgba(214, 228, 250, 0.6)'
    ctx.lineWidth = between(rng, 1.5, 3.2)
    // A curl of water, not a dash: it bows well up, its crest is off the middle, and one end lies lower than the other.
    const bow = long * between(rng, 0.28, 0.5), crest = long * between(rng, 0.22, 0.78), tilt = between(rng, -0.22, 0.22) * long
    // Drawn again one tile over, so a ripple that crosses an edge carries on.
    for (const dx of [-256, 0, 256]) for (const dy of [-256, 0, 256]) {
      ctx.beginPath()
      ctx.moveTo(x + dx, y + dy)
      ctx.quadraticCurveTo(x + dx + crest, y + dy - bow, x + dx + long, y + dy + tilt)
      ctx.stroke()
    }
  }
  return texture(element, true)
}

/** Wicker: canes woven over and under upright stakes. It tiles. */
export function wickerTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(256, 256)
  const rng = makeRng(57)
  ctx.fillStyle = '#6b4a2a'
  ctx.fillRect(0, 0, 256, 256)
  const rows = 8, stakes = 8
  for (let row = 0; row < rows; row++) {
    const y = (row + 0.5) * (256 / rows)
    for (let stake = 0; stake < stakes; stake++) {
      if ((row + stake) % 2 === 0) continue
      const x = stake * (256 / stakes)
      const cane = ctx.createLinearGradient(0, y - 14, 0, y + 14)
      const tone = between(rng, -10, 10)
      cane.addColorStop(0, `rgb(${150 + tone}, ${110 + tone}, ${62 + tone})`)
      cane.addColorStop(0.45, `rgb(${214 + tone}, ${172 + tone}, ${108 + tone})`)
      cane.addColorStop(1, `rgb(${128 + tone}, ${92 + tone}, ${50 + tone})`)
      ctx.fillStyle = cane
      ctx.beginPath(); ctx.ellipse(x + 16, y, 30, 13, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(x + 16 - 256, y, 30, 13, 0, 0, Math.PI * 2); ctx.fill()
      ctx.beginPath(); ctx.ellipse(x + 16 + 256, y, 30, 13, 0, 0, Math.PI * 2); ctx.fill()
    }
  }
  return texture(element, true)
}

/** The ghost hand: a pale mitten on clear, its fingertip at the top middle. */
export function handTexture(): THREE.CanvasTexture {
  const [element, ctx] = canvas(128, 160)
  ctx.clearRect(0, 0, 128, 160)
  ctx.fillStyle = '#fff7e6'
  ctx.strokeStyle = 'rgba(90, 60, 30, 0.75)'
  ctx.lineWidth = 5
  ctx.lineJoin = 'round'
  ctx.beginPath()
  // One finger up, a thumb to the side, a round palm and a cuff.
  ctx.moveTo(52, 22); ctx.quadraticCurveTo(64, 4, 76, 22); ctx.lineTo(78, 70)
  ctx.quadraticCurveTo(108, 60, 112, 84); ctx.quadraticCurveTo(114, 104, 96, 122)
  ctx.lineTo(96, 150); ctx.lineTo(40, 150); ctx.lineTo(40, 124)
  ctx.quadraticCurveTo(14, 104, 22, 78); ctx.quadraticCurveTo(28, 62, 50, 74)
  ctx.closePath()
  ctx.fill(); ctx.stroke()
  return texture(element)
}
