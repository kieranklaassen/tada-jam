import { CELL } from './layout'
import { blob, box, lay, limb, oval, poly, shade, sprite, type Stamps, type Ctx, type Lay, type Outline, type Sprite } from './mosaic'
import type { Rng } from './rng'
import { ANIMALS, THINGS, COATS, type Animal, type Coat, type Thing } from './things'

// Every animal in stones, twice: large on the ground, its feet at the origin,
// and squeezed into one square, whose middle is the origin. Eyes and mouths
// are drawn live, so a glance costs a few paths.

const INK = '#2b2530'
export const HUES: Record<Thing, string> = { bath: '#3f86b8', mud: '#8a5a33', dance: '#c8473c', fly: '#e2b13c', sleep: '#6a559c' }

type Skin = Lay & { edge: string }
const skin = (size: number, colors: string[], edge: string, light: string): Skin => ({ size, colors, edge, light, glass: 1.5, vary: 0.04 })
const SKINS: Record<Animal, (size: number) => Skin> = {
  pig: (s) => skin(s, ['#e0938c', '#d98682', '#e39f96'], '#8f4346', '#f0b9ad'),
  elephant: (s) => skin(s, ['#8c9db0', '#8092a6', '#97a7b8'], '#414f61', '#b3c0cc'),
  cat: (s) => skin(s, ['#d88b36', '#ce7d2c', '#dd9846'], '#74400f', '#edb367'),
  mouse: (s) => skin(s, ['#85716b', '#7b6863', '#907c74'], '#3d302f', '#a8958c'),
  goat: (s) => skin(s, ['#eadfc8', '#e2d5b9', '#efe7d5'], '#84714f', '#f8f3e6'),
  giraffe: (s) => skin(s, ['#e4ba49', '#dbae3d', '#e9c45c'], '#79491b', '#f3d887'),
}
const MARK: Record<Animal, string> = { pig: '#c96d6e', elephant: '#d7a5a0', cat: '#8e4a14', mouse: '#dd9f9c', goat: '#a78752', giraffe: '#a3602a' }

const part = (ctx: Ctx, rng: Rng, o: Outline, s: Lay) => lay(ctx, rng, o, s)
const marks = (who: Animal, size: number): Lay => ({ size, colors: [MARK[who], shade(MARK[who], 0.04)], edge: shade(MARK[who], -0.12), vary: 0.05 })
const dark = (size: number): Lay => ({ size, colors: ['#4a3a3a', '#3d3032'], vary: 0.04 })
const line = (ctx: Ctx, color: string, width: number, ...p: number[]) => {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineCap = 'round'
  ctx.beginPath()
  ctx.moveTo(p[0], p[1])
  for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1])
  ctx.stroke()
}

const BODIES: Record<Animal, (ctx: Ctx, rng: Rng) => void> = {
  elephant(ctx, rng) {
    const s = SKINS.elephant(11)
    part(ctx, rng, limb(13, 9, -96, -120, -114, -90, -108, -58), SKINS.elephant(5))
    for (const x of [-62, 62]) part(ctx, rng, blob(x - 28, -70, x + 28, -70, x + 30, -4, x + 18, 0, x - 18, 0, x - 30, -4), s)
    part(ctx, rng, blob(-98, -100, -78, -164, -14, -188, 60, -172, 98, -112, 88, -50, 40, -28, -40, -28, -88, -50), s)
    for (const x of [-62, 62]) for (const d of [-14, 0, 14]) part(ctx, rng, oval(x + d, -5, 7, 6), { size: 5, colors: ['#efe4cf'] })
  },
  pig(ctx, rng) {
    const s = SKINS.pig(9)
    part(ctx, rng, limb(9, 7, -66, -74, -84, -86, -80, -104, -68, -94, -80, -80), SKINS.pig(4))
    for (const x of [-44, -16, 18, 44]) part(ctx, rng, blob(x - 12, -30, x + 12, -30, x + 13, -2, x - 13, -2), s)
    part(ctx, rng, oval(0, -62, 72, 48), s)
    for (const x of [-44, -16, 18, 44]) part(ctx, rng, box(x - 12, -8, 24, 8), dark(6))
  },
  cat(ctx, rng) {
    const s = SKINS.cat(8)
    part(ctx, rng, limb(20, 12, 34, -14, 68, -16, 62, -62, 44, -88), s)
    part(ctx, rng, blob(-26, -110, 24, -110, 44, -50, 46, -10, 30, 0, -32, 0, -46, -12, -42, -56), s)
    for (const y of [-74, -56, -38]) for (const k of [-1, 1]) part(ctx, rng, limb(9, 3, k * 40, y + 6, k * 24, y, k * 12, y + 4), marks('cat', 5))
    part(ctx, rng, oval(0, -52, 20, 34), { size: 7, colors: ['#f2dcae', '#eed39d'] })
    for (const x of [-20, 20]) part(ctx, rng, oval(x, -8, 17, 9), s)
  },
  mouse(ctx, rng) {
    const s = SKINS.mouse(7)
    part(ctx, rng, limb(6, 4.4, -26, -10, -54, -4, -58, -26, -44, -34), { size: 3.2, colors: [MARK.mouse] })
    part(ctx, rng, blob(-22, -66, 22, -66, 38, -28, 32, -4, 0, 0, -32, -4, -38, -28), s)
    part(ctx, rng, oval(0, -28, 20, 22), { size: 6, colors: ['#d8c7b6', '#cfbca9'] })
    for (const x of [-18, 18]) part(ctx, rng, oval(x, -4, 15, 6), { size: 5, colors: [MARK.mouse] })
  },
  goat(ctx, rng) {
    const s = SKINS.goat(9)
    part(ctx, rng, limb(18, 10, -58, -100, -76, -116, -70, -132), SKINS.goat(5))
    for (const x of [-46, -18, 20, 46]) part(ctx, rng, blob(x - 12, -58, x + 12, -58, x + 11, -2, x - 11, -2), s)
    part(ctx, rng, blob(-68, -84, -50, -118, 10, -122, 62, -106, 70, -66, 44, -44, -40, -44, -66, -56), s)
    for (const x of [-46, -18, 20, 46]) part(ctx, rng, box(x - 11, -12, 22, 12), dark(6))
  },
  giraffe(ctx, rng) {
    const s = SKINS.giraffe(9)
    part(ctx, rng, limb(8, 7, -54, -150, -74, -130, -70, -100), SKINS.giraffe(4))
    part(ctx, rng, oval(-70, -94, 8, 12), dark(5))
    for (const x of [-38, -14, 16, 38]) part(ctx, rng, blob(x - 10, -100, x + 10, -100, x + 9, -2, x - 9, -2), s)
    part(ctx, rng, blob(-60, -136, -36, -166, 14, -170, 54, -154, 58, -116, 34, -92, -38, -92, -58, -110), s)
    for (const [x, y, r] of [[-34, -134, 13], [-8, -116, 12], [4, -146, 13], [34, -128, 13]]) part(ctx, rng, oval(x, y, r, r * 0.82, x), marks('giraffe', 6))
    for (const x of [-38, -14, 16, 38]) part(ctx, rng, box(x - 10, -12, 20, 12), dark(6))
  },
}

const HEADS: Record<Animal, (ctx: Ctx, rng: Rng) => void> = {
  elephant(ctx, rng) {
    const s = SKINS.elephant(9)
    for (const k of [-1, 1]) {
      part(ctx, rng, blob(k * 34, -60, k * 78, -76, k * 108, -40, k * 100, 14, k * 70, 34, k * 42, 6), s)
      part(ctx, rng, blob(k * 56, -42, k * 80, -50, k * 92, -22, k * 82, 8, k * 62, 8), marks('elephant', 8))
    }
    part(ctx, rng, blob(-52, -44, -30, -78, 30, -78, 52, -44, 50, 4, 28, 26, -28, 26, -50, 4), s)
    part(ctx, rng, limb(40, 22, 0, -8, 0, 34, 10, 70, 34, 78), s)
    for (const y of [18, 34, 50, 64]) line(ctx, '#5d6c80', 2.4, -13 + y * 0.1, y, 13 + y * 0.1, y + 1)
    for (const k of [-1, 1]) part(ctx, rng, limb(10, 7, k * 24, 18, k * 34, 34, k * 30, 46), { size: 5, colors: ['#f4ead6'] })
  },
  pig(ctx, rng) {
    const s = SKINS.pig(8)
    for (const k of [-1, 1]) part(ctx, rng, blob(k * 16, -44, k * 40, -62, k * 52, -24, k * 30, -22), s)
    part(ctx, rng, oval(0, -8, 50, 42), s)
    for (const k of [-1, 1]) part(ctx, rng, oval(k * 34, 8, 10, 7), marks('pig', 5))
    part(ctx, rng, oval(0, 6, 25, 18), { ...s, size: 7, colors: ['#efb0a5', '#eba69c'] })
    for (const k of [-1, 1]) part(ctx, rng, oval(k * 9, 6, 4.5, 6.5), dark(4))
  },
  cat(ctx, rng) {
    const s = SKINS.cat(8)
    for (const k of [-1, 1]) {
      part(ctx, rng, poly(k * 12, -50, k * 44, -74, k * 48, -22), s)
      part(ctx, rng, poly(k * 24, -48, k * 39, -60, k * 40, -38), { size: 5, colors: ['#e8a59a'] })
    }
    part(ctx, rng, blob(-50, -20, -34, -52, 0, -60, 34, -52, 50, -20, 34, 12, 0, 20, -34, 12), s)
    for (const x of [-14, 0, 14]) part(ctx, rng, limb(8, 4, x, -58, x * 0.8, -40), marks('cat', 5))
    for (const k of [-1, 1]) part(ctx, rng, limb(8, 3, k * 48, -10, k * 34, -8), marks('cat', 5))
    for (const k of [-1, 1]) part(ctx, rng, oval(k * 11, 4, 13, 10), { size: 6, colors: ['#f2dcae', '#eed39d'] })
    part(ctx, rng, poly(-7, -8, 7, -8, 0, 1), { size: 4.5, colors: ['#a4433f'] })
    for (const k of [-1, 1]) for (const d of [-4, 4]) line(ctx, '#5c3512', 1.8, k * 22, 2 + d * 0.4, k * 62, -2 + d * 2)
  },
  mouse(ctx, rng) {
    const s = SKINS.mouse(7)
    for (const k of [-1, 1]) {
      part(ctx, rng, oval(k * 32, -40, 25, 24), s)
      part(ctx, rng, oval(k * 32, -39, 15, 14), marks('mouse', 6))
    }
    part(ctx, rng, blob(-36, -18, -22, -40, 22, -40, 36, -18, 22, 8, 0, 16, -22, 8), s)
    part(ctx, rng, oval(0, 4, 8, 6), { size: 5, colors: ['#e58f90'] })
    for (const k of [-1, 1]) for (const d of [-3, 3]) line(ctx, '#3d302f', 1.4, k * 12, 4 + d * 0.5, k * 40, 2 + d * 2)
  },
  goat(ctx, rng) {
    const s = SKINS.goat(8)
    for (const k of [-1, 1]) {
      part(ctx, rng, limb(17, 6, k * 18, -46, k * 34, -76, k * 58, -80, k * 62, -62), { size: 6, colors: ['#a78752', '#97783f', '#b89a66'], edge: '#5f4a22' })
      part(ctx, rng, blob(k * 28, -36, k * 62, -34, k * 72, -18, k * 34, -20), s)
    }
    part(ctx, rng, blob(-36, -44, 0, -56, 36, -44, 32, -4, 24, 28, 0, 38, -24, 28, -32, -4), s)
    part(ctx, rng, blob(-22, 10, 22, 10, 18, 30, 0, 36, -18, 30), { size: 6, colors: ['#d8bfa4', '#cfb394'] })
    for (const k of [-1, 1]) part(ctx, rng, oval(k * 8, 16, 3.4, 4.6), dark(3.4))
    part(ctx, rng, poly(-12, 34, 12, 34, 4, 60, -2, 64), s)
  },
  giraffe(ctx, rng) {
    const s = SKINS.giraffe(8)
    part(ctx, rng, limb(48, 32, 6, 14, -2, -70, 0, -140), s)
    for (const [x, y] of [[2, -10], [-8, -36], [6, -56], [-6, -84], [6, -108]]) part(ctx, rng, oval(x, y, 10, 9, y), marks('giraffe', 6))
    for (const k of [-1, 1]) {
      part(ctx, rng, limb(9, 9, k * 14, -188, k * 18, -216), SKINS.giraffe(5))
      part(ctx, rng, oval(k * 18, -220, 8, 8), dark(5))
      part(ctx, rng, blob(k * 26, -184, k * 52, -198, k * 58, -180, k * 30, -170), s)
    }
    part(ctx, rng, blob(-32, -176, 0, -198, 32, -176, 26, -140, 22, -118, 0, -108, -22, -118, -26, -140), s)
    part(ctx, rng, blob(-21, -132, 21, -132, 20, -116, 0, -108, -20, -116), { size: 6, colors: ['#f0dba6', '#ead192'] })
    for (const k of [-1, 1]) part(ctx, rng, oval(k * 8, -124, 3.2, 4.2), dark(3.2))
  },
}

/** Squeezed into one square, with what does not fit bulging out at the sides. */
const SQUARES: Record<Animal, (ctx: Ctx, rng: Rng) => void> = {
  elephant(ctx, rng) {
    const s = SKINS.elephant(6.5)
    for (const k of [-1, 1]) {
      part(ctx, rng, blob(k * 26, -28, k * 48, -32, k * 58, -8, k * 52, 22, k * 30, 18), s)
      part(ctx, rng, blob(k * 36, -18, k * 46, -20, k * 51, -4, k * 46, 12, k * 36, 8), marks('elephant', 5.5))
    }
    part(ctx, rng, blob(-36, -30, -16, -39, 16, -39, 36, -30, 38, 12, 34, 38, -34, 38, -38, 12), s)
    part(ctx, rng, limb(22, 12, 0, -4, 0, 18, 10, 30, 28, 26), s)
  },
  pig(ctx, rng) {
    const s = SKINS.pig(6.5)
    for (const k of [-1, 1]) part(ctx, rng, blob(k * 12, -30, k * 34, -40, k * 40, -14, k * 24, -16), s)
    part(ctx, rng, blob(-38, -8, -26, -32, 26, -32, 38, -8, 38, 26, 30, 38, -30, 38, -38, 26), s)
    part(ctx, rng, oval(0, 10, 20, 14), { ...s, size: 5.5, colors: ['#efb0a5', '#eba69c'] })
    for (const k of [-1, 1]) part(ctx, rng, oval(k * 7, 10, 3.6, 5), dark(3.4))
  },
  cat(ctx, rng) {
    const s = SKINS.cat(6.2)
    part(ctx, rng, limb(11, 7, 34, 28, 54, 24, 52, -4, 44, -16), s)
    for (const k of [-1, 1]) part(ctx, rng, poly(k * 8, -30, k * 34, -44, k * 38, -10), s)
    part(ctx, rng, blob(-38, -4, -28, -28, 28, -28, 38, -4, 38, 28, 28, 38, -28, 38, -38, 28), s)
    for (const x of [-12, 0, 12]) part(ctx, rng, limb(6, 3, x, -30, x * 0.8, -14), marks('cat', 4))
    for (const k of [-1, 1]) part(ctx, rng, oval(k * 9, 14, 11, 8), { size: 5, colors: ['#f2dcae', '#eed39d'] })
    part(ctx, rng, poly(-6, 3, 6, 3, 0, 10), { size: 4, colors: ['#a4433f'] })
  },
  mouse(ctx, rng) {
    const s = SKINS.mouse(5.6)
    part(ctx, rng, limb(5, 4, -14, 34, -34, 34, -38, 18, -30, 12), { size: 3, colors: [MARK.mouse] })
    part(ctx, rng, blob(-14, 6, 14, 6, 20, 24, 16, 38, -16, 38, -20, 24), s)
    for (const k of [-1, 1]) {
      part(ctx, rng, oval(k * 20, -24, 16, 15), s)
      part(ctx, rng, oval(k * 20, -23, 9.5, 9), marks('mouse', 4.5))
    }
    part(ctx, rng, blob(-24, -10, -14, -24, 14, -24, 24, -10, 14, 8, 0, 13, -14, 8), s)
    part(ctx, rng, oval(0, 5, 5.5, 4), { size: 4, colors: ['#e58f90'] })
  },
  goat(ctx, rng) {
    const s = SKINS.goat(6.2)
    for (const k of [-1, 1]) {
      part(ctx, rng, limb(11, 5, k * 14, -28, k * 30, -44, k * 48, -38, k * 46, -24), { size: 4.6, colors: ['#a78752', '#97783f', '#b89a66'], edge: '#5f4a22' })
      part(ctx, rng, blob(k * 26, -10, k * 46, -8, k * 52, 4, k * 28, 4), s)
    }
    part(ctx, rng, blob(-34, -22, 0, -34, 34, -22, 36, 8, 30, 36, -30, 36, -36, 8), s)
    part(ctx, rng, blob(-18, 12, 18, 12, 15, 28, 0, 33, -15, 28), { size: 5, colors: ['#d8bfa4', '#cfb394'] })
    for (const k of [-1, 1]) part(ctx, rng, oval(k * 6, 18, 2.8, 3.8), dark(3))
  },
  giraffe(ctx, rng) {
    const s = SKINS.giraffe(6.2)
    part(ctx, rng, blob(-38, 8, -20, 2, 24, 8, 38, 18, 34, 38, -34, 38), s)
    part(ctx, rng, limb(17, 14, 26, 24, 44, 4, 36, -24, 10, -30, -22, -26), s)
    for (const [x, y] of [[40, 2], [30, -22], [-18, 26], [6, 28]]) part(ctx, rng, oval(x, y, 5.5, 5), marks('giraffe', 4.5))
    for (const k of [-1, 1]) {
      part(ctx, rng, limb(6, 6, -8 + k * 8, -26, -8 + k * 11, -44), SKINS.giraffe(3.4))
      part(ctx, rng, blob(-8 + k * 18, -26, -8 + k * 34, -34, -8 + k * 36, -22, -8 + k * 20, -18), s)
    }
    part(ctx, rng, blob(-32, -20, -8, -32, 16, -20, 12, 4, 6, 18, -8, 22, -22, 18, -28, 4), s)
    part(ctx, rng, blob(-22, 4, 6, 4, 5, 16, -8, 20, -21, 16), { size: 5, colors: ['#f0dba6', '#ead192'] })
  },
}

export type Eye = { x: number; y: number; r: number }
/** Where the head turns, and the face on it. */
export type Face = { pivot: { x: number; y: number }; eyes: [Eye, Eye]; mouth: { x: number; y: number; w: number }; square: { eyes: [Eye, Eye]; mouth: { x: number; y: number; w: number } } }
const eyes = (x: number, y: number, r: number, cx = 0): [Eye, Eye] => [{ x: cx - x, y, r }, { x: cx + x, y, r }]
export const FACES: Record<Animal, Face> = {
  elephant: { pivot: { x: 0, y: -150 }, eyes: eyes(25, -30, 10), mouth: { x: -24, y: 18, w: 20 }, square: { eyes: eyes(18, -15, 8), mouth: { x: -18, y: 24, w: 18 } } },
  pig: { pivot: { x: 4, y: -84 }, eyes: eyes(20, -18, 9), mouth: { x: 0, y: 27, w: 26 }, square: { eyes: eyes(17, -11, 8), mouth: { x: 0, y: 29, w: 22 } } },
  cat: { pivot: { x: 0, y: -104 }, eyes: eyes(20, -22, 11), mouth: { x: 0, y: 8, w: 16 }, square: { eyes: eyes(17, -7, 9), mouth: { x: 0, y: 17, w: 14 } } },
  mouse: { pivot: { x: 0, y: -62 }, eyes: eyes(14, -16, 9), mouth: { x: 0, y: 11, w: 12 }, square: { eyes: eyes(10, -8, 7), mouth: { x: 0, y: 11, w: 10 } } },
  goat: { pivot: { x: 12, y: -112 }, eyes: eyes(19, -20, 9.5), mouth: { x: 0, y: 26, w: 22 }, square: { eyes: eyes(18, -6, 8), mouth: { x: 0, y: 27, w: 16 } } },
  giraffe: { pivot: { x: 22, y: -146 }, eyes: eyes(19, -164, 10), mouth: { x: 0, y: -113, w: 18 }, square: { eyes: eyes(13, -12, 7.5, -8), mouth: { x: -8, y: 14, w: 14 } } },
}

const SPLATS: Record<Animal, [number, number, number][]> = {
  elephant: [[-50, -120, 26], [36, -80, 30], [64, -140, 20], [-20, -60, 22], [10, -150, 18]],
  pig: [[-40, -70, 20], [36, -54, 22], [0, -40, 18], [50, -84, 12]],
  cat: [[-20, -70, 16], [22, -36, 18], [-14, -20, 14], [56, -44, 9]],
  mouse: [[-14, -40, 12], [16, -26, 13], [0, -56, 9]],
  goat: [[-40, -90, 20], [30, -76, 22], [-6, -66, 16], [52, -100, 12]],
  giraffe: [[-30, -130, 18], [28, -118, 20], [0, -150, 14], [-14, -60, 10], [38, -70, 10]],
}
const HEAD_SPLATS: Record<Animal, [number, number, number][]> = {
  elephant: [[-30, -60, 16], [74, -20, 18], [8, 40, 9]],
  pig: [[-26, -34, 13], [34, -8, 12]],
  cat: [[26, -44, 13], [-36, 0, 10]],
  mouse: [[-30, -44, 11], [18, -28, 8]],
  goat: [[-18, -40, 12], [20, 2, 11]],
  giraffe: [[-4, -70, 13], [16, -178, 10], [4, -24, 12]],
}

const MUD: Lay = { size: 6, colors: ['#6b4426', '#704829'], edge: '#5a371b', glass: 5, vary: 0.02 }
const FIZZ: Lay = { size: 6, colors: ['#b08a5e', '#c19c70', '#a37d52'], edge: '#7d5c38', glass: 9, vary: 0.05 }
const FOAM: Lay = { size: 6, colors: ['#f4fbfb', '#e8f5f6'], edge: '#b4d6e0', grout: '#dcedf1', glass: 9, vary: 0.015 }
const splat = (ctx: Ctx, rng: Rng, x: number, y: number, r: number, how: Lay) => {
  const p: number[] = []
  for (let i = 0; i < 9; i++) { const a = (i / 9) * Math.PI * 2, d = r * (0.75 + rng.next() * 0.5); p.push(x + Math.cos(a) * d, y + Math.sin(a) * d * 0.85) }
  lay(ctx, rng, blob(...p), { ...how, size: Math.max(4, Math.min(how.size, r * 0.5)) })
}
const foam = (ctx: Ctx, rng: Rng, x: number, y: number, r: number) => { for (const [dx, dy, k] of [[-0.6, 0.2, 0.7], [0.6, 0.15, 0.7], [0, -0.3, 0.85]]) lay(ctx, rng, oval(x + dx * r, y + dy * r, r * k, r * k), FOAM) }

const boxes: Record<Animal, [number, number, number, number]> = { elephant: [-126, -200, 250, 206], pig: [-92, -116, 176, 122], cat: [-54, -118, 130, 124], mouse: [-64, -74, 112, 80], goat: [-84, -140, 164, 146], giraffe: [-84, -180, 152, 186] }
const headBoxes: Record<Animal, [number, number, number, number]> = { elephant: [-114, -84, 230, 174], pig: [-58, -68, 116, 110], cat: [-66, -80, 132, 106], mouse: [-62, -70, 124, 92], goat: [-78, -88, 156, 158], giraffe: [-64, -234, 128, 266] }
const of = <T>(make: (who: Animal) => T): Record<Animal, T> => Object.fromEntries(ANIMALS.map((who) => [who, make(who)])) as Record<Animal, T>
const coats = <T>(make: (coat: Coat) => T): Record<Coat, T> => Object.fromEntries(COATS.map((coat) => [coat, make(coat)])) as Record<Coat, T>
const TOPS: Record<Animal, number> = { pig: -44, elephant: -68, cat: -46, mouse: -38, goat: -44, giraffe: -192 }
const spatter = (c: Ctx, r: Rng, coat: Coat, at: readonly [number, number, number][]) => {
  if (coat !== 'clean' && coat !== 'bubbly') for (const [x, y, k] of at) splat(c, r, x, y, k * 0.9, coat === 'muddy' ? MUD : FIZZ)
}
/** Every body, head and square in every coat, laid as one picture. */
export const BODY: Record<Coat, Record<Animal, Sprite>> = coats((coat) => of((who) => sprite(`body-${who}-${coat}`, ...boxes[who], (c, r, under) => {
  if (coat === 'clean') BODIES[who](c, r)
  else under(BODY.clean[who])
  spatter(c, r, coat, SPLATS[who])
  if (coat === 'bubbly') for (const [x, y, k] of SPLATS[who].slice(0, 3)) foam(c, r, x, y + 10, k * 0.6)
})))
export const HEAD: Record<Coat, Record<Animal, Sprite>> = coats((coat) => of((who) => sprite(`head-${who}-${coat}`, ...headBoxes[who], (c, r, under) => {
  if (coat === 'clean') HEADS[who](c, r)
  else under(HEAD.clean[who])
  spatter(c, r, coat, HEAD_SPLATS[who])
  if (coat === 'bubbly' || coat === 'fizzy') foam(c, r, 0, TOPS[who], who === 'mouse' ? 12 : 17)
})))
export const SQUEEZED: Record<Coat, Record<Animal, Sprite>> = coats((coat) => of((who) => sprite(`square-${who}-${coat}`, -66, -56, 132, 100, (c, r, under) => {
  if (coat === 'clean') SQUARES[who](c, r)
  else under(SQUEEZED.clean[who])
  spatter(c, r, coat, [[-24, 26, 11], [25, -24, 10], [22, 30, 8]])
  if (coat === 'bubbly') { foam(c, r, 4, -36, 11); foam(c, r, -26, 28, 8) }
})))

/** The plain slab of one vote: one stone, one colour, nothing on it. */
export const slab = (ctx: Ctx, color: string): void => {
  const k = CELL / 2 - 1.5
  ctx.fillStyle = shade(color, -0.16)
  ctx.fillRect(-k, -k, k * 2, k * 2)
  ctx.fillStyle = color
  ctx.fillRect(-k, -k, k * 2 - 3, k * 2 - 3)
}
const things = <T>(make: (t: Thing) => T): Record<Thing, T> => Object.fromEntries(THINGS.map((t) => [t, make(t)])) as Record<Thing, T>
export const SLAB = things((t) => sprite(`slab-${t}`, -CELL / 2, -CELL / 2, CELL, CELL, (c) => slab(c, HUES[t])))
/** What is left on the wall while its animal is elsewhere: the slab with its face. */
export const PORTRAIT = things((t) => of((who) => sprite(`portrait-${t}-${who}`, -CELL / 2, -CELL / 2, CELL, CELL, (ctx, _rng, under) => {
  slab(ctx, HUES[t])
  ctx.save()
  ctx.scale(0.72, 0.72)
  under(SQUEEZED.clean[who])
  whites(ctx, FACES[who].square.eyes)
  pupils(ctx, FACES[who].square.eyes)
  ctx.restore()
})))

function whites(ctx: Ctx, at: readonly Eye[]): void {
  for (const e of at) {
    ctx.beginPath()
    ctx.ellipse(e.x, e.y, e.r, e.r * 1.12, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#fbf6e8'
    ctx.fill()
    ctx.strokeStyle = INK
    ctx.lineWidth = 1.8
    ctx.stroke()
  }
}
function pupils(ctx: Ctx, at: readonly Eye[]): void {
  for (const e of at) {
    ctx.fillStyle = INK
    ctx.beginPath()
    ctx.ellipse(e.x, e.y, e.r * 0.58, e.r * 0.58, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.ellipse(e.x - e.r * 0.2, e.y - e.r * 0.22, e.r * 0.21, e.r * 0.21, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}
export type Eyes = { at: readonly [Eye, Eye]; white: Sprite; pupil: Sprite }
/** A pair of eyes: white stone and dark glass, each one picture about the middle between them. */
export function eyesOf(name: string, at: readonly [Eye, Eye]): Eyes {
  const cx = (at[0].x + at[1].x) / 2, w = Math.abs(at[1].x - at[0].x) + at[0].r * 2 + 6, h = at[0].r * 2.3 + 6
  const about = at.map((e) => ({ x: e.x - cx, y: 0, r: e.r }))
  return { at, white: sprite(`${name}-white`, -w / 2, -h / 2, w, h, (c) => whites(c, about)), pupil: sprite(`${name}-pupil`, -w / 2, -h / 2, w, h, (c) => pupils(c, about)) }
}
/** `lid` is 1 open and 0 shut. */
export function drawEyes(ctx: Ctx, stamps: Stamps, eyes: Eyes, gx: number, gy: number, lid: number): void {
  const [a, b] = eyes.at, cx = (a.x + b.x) / 2
  if (lid < 0.2) {
    ctx.strokeStyle = INK
    ctx.lineWidth = 3.2
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const e of eyes.at) { ctx.moveTo(e.x - e.r, e.y); ctx.quadraticCurveTo(e.x, e.y + e.r * 0.8, e.x + e.r, e.y) }
    ctx.stroke()
    stamps.count++
    return
  }
  stamps.stamp(ctx, eyes.white, cx, a.y, 0, 1, lid)
  stamps.stamp(ctx, eyes.pupil, cx + gx * a.r * 0.38, a.y + gy * a.r * 0.38 * lid, 0, 1, Math.min(1, lid * 1.3))
}

export type Mouth = 'line' | 'smile' | 'open' | 'round' | 'frown' | 'wave'
export function drawMouth(ctx: Ctx, stamps: Stamps, m: { x: number; y: number; w: number }, kind: Mouth): void {
  const { x, y, w } = m, h = w / 2
  stamps.count++
  ctx.strokeStyle = INK
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.beginPath()
  if (kind === 'open' || kind === 'round') {
    ctx.fillStyle = '#6d2430'
    if (kind === 'open') { ctx.moveTo(x - h, y - 2); ctx.quadraticCurveTo(x, y - 4, x + h, y - 2); ctx.quadraticCurveTo(x + h * 0.6, y + w * 0.75, x, y + w * 0.75); ctx.quadraticCurveTo(x - h * 0.6, y + w * 0.75, x - h, y - 2) }
    else ctx.ellipse(x, y + 3, w * 0.28, w * 0.34, 0, 0, Math.PI * 2)
    ctx.fill()
    return
  }
  if (kind === 'smile') { ctx.moveTo(x - h, y - 2); ctx.quadraticCurveTo(x, y + h, x + h, y - 2) }
  else if (kind === 'frown') { ctx.moveTo(x - h, y + 5); ctx.quadraticCurveTo(x, y - h * 0.7, x + h, y + 5) }
  else if (kind === 'wave') { ctx.moveTo(x - h, y); ctx.quadraticCurveTo(x - h / 2, y - 6, x, y); ctx.quadraticCurveTo(x + h / 2, y + 6, x + h, y) }
  else { ctx.moveTo(x - h * 0.7, y); ctx.lineTo(x + h * 0.7, y) }
  ctx.stroke()
}

// --- the mole ---------------------------------------------------------------

const MOLE_SKIN: Skin = skin(8, ['#7d6f80', '#887989', '#746678'], '#40364a', '#9a8b9c')
export const MOLE_SPRITE = sprite('mole', -62, -62, 124, 112, (ctx, rng) => {
  lay(ctx, rng, blob(-40, 50, -50, 0, -30, -46, 0, -56, 30, -46, 50, 0, 40, 50), MOLE_SKIN)
  lay(ctx, rng, oval(0, 6, 17, 13), { size: 6, colors: ['#e7a19b', '#dd918c'], edge: '#a6565a' })
  for (const k of [-1, 1]) lay(ctx, rng, oval(k * 26, 18, 9, 6), { size: 5, colors: ['#a97a84'] })
})
export const MOLE_FACE = { eyes: eyes(17, -16, 6.5), mouth: { x: 0, y: 30, w: 22 } }
export const EYES = of((who) => ({ big: eyesOf(`eyes-${who}`, FACES[who].eyes), square: eyesOf(`eyes-square-${who}`, FACES[who].square.eyes) }))
export const MOLE_EYES = eyesOf('eyes-mole', MOLE_FACE.eyes)

/** What the game opens with; the rest is laid a few at a time while nothing is happening. */
export const FIRST_SPRITES: Sprite[] = [...ANIMALS.flatMap((who) => [BODY.clean[who], HEAD.clean[who], SQUEEZED.clean[who], EYES[who].big.white, EYES[who].big.pupil, EYES[who].square.white, EYES[who].square.pupil]), ...Object.values(SLAB), MOLE_SPRITE, MOLE_EYES.white, MOLE_EYES.pupil]
export const LATER_SPRITES: Sprite[] = [...COATS.slice(1).flatMap((coat) => ANIMALS.flatMap((who) => [BODY[coat][who], HEAD[coat][who], SQUEEZED[coat][who]])), ...THINGS.flatMap((t) => ANIMALS.map((who) => PORTRAIT[t][who]))]
