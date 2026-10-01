// Ice Palace: cut ice from the pond, gather snow and icicles, and build. Pull
// the sun down and the frost children hang a light in every clear block, old
// King Winter walks through the gate you made and sits, and the northern
// lights unroll. Lift the sun and it is morning: fresh snow, the pond whole.
//
// By day the hand builds and nothing else happens. By dusk the hand rests and
// the world answers what was built, in the shape it was built. Printed in four
// inks: night blue, ice white, gold, one red.

import { TAU, clamp, damp, dist, ease, lerp, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { DRIFT, GROUND, ICE_H, INK, PAPER, POND, SKY_H, SUN, boughHalf, boughY, buildArt, farHill, inDrift, inPond, ink, nearHill, put } from './art.ts'
import type { Sprite } from './art.ts'

type G = CanvasRenderingContext2D
type Kind = 'ice' | 'snow' | 'icicle'

interface Block {
  id: number
  kind: Kind
  w: number
  h: number
  x: number
  y: number
  // Where it rests (its centre) once it is part of the building.
  tx: number
  ty: number
  vy: number
  // loose: lying on the pond or the drift. sink: on its way back in.
  state: 'loose' | 'held' | 'fall' | 'rest' | 'sink'
  // Has it ever stood on the snow? Only then does the pond take it back.
  landed: boolean
  round: boolean
  variant: number
  sq: Spring
  appear: number
  lit: number
  litWant: boolean
  pulse: number
  cap: number
  capWant: boolean
  frost: HTMLCanvasElement | null
  frostG: G | null
  frostAmt: number
  stamps: number
}

interface Hole {
  x: number
  y: number
  ang: number
  len: number
  // 1 is open water; it freezes over toward 0.
  open: number
  closing: boolean
  // The cut edge, a little ragged, and the paler rim of ice around it.
  edge: number[]
  rim: number[]
}

interface Icicle {
  x: number
  len: number
  grown: number
  there: boolean
  wob: Spring
}

type Hold =
  | { kind: 'sun'; oy: number }
  | { kind: 'cut'; x0: number; y0: number; x1: number; y1: number; scored: boolean; far: number }
  | { kind: 'block'; b: Block; ox: number; oy: number; mode: 'press' | 'carry' | 'breath' | 'draw'; t0: number; sx: number; sy: number; lx: number; ly: number; next: number; far: number }
  | { kind: 'icicle'; i: number; sx: number; sy: number }
  | { kind: 'idle' }

interface Seat {
  x: number
  y: number
  b: Block | null
}

interface Child {
  mode: 'away' | 'skate' | 'fly' | 'hang' | 'sit'
  dest: 'pond' | 'job' | 'seat' | 'off'
  x: number
  y: number
  lean: number
  a: number
  speed: number
  kx: number
  ky: number
  fig: number
  t: number
  dur: number
  fromX: number
  fromY: number
  job: Block | null
  seat: Seat | null
  wait: number
  hop: Spring
  trail: number[]
  trailAt: number
}

interface Flake {
  x: number
  y: number
  vx: number
  vy: number
  s: number
  dark: boolean
  life: number
}

const ICE_W = [92, 138, 184] as const
// How long a still finger rests on ice before its warmth frosts it.
const HOLD = 0.55
const smooth = (a: number, b: number, v: number): number => {
  const t = clamp((v - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}
const overlap = (ax: number, aw: number, bx: number, bw: number): number => Math.min(ax + aw / 2, bx + bw / 2) - Math.max(ax - aw / 2, bx - bw / 2)

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const S = Math.min(2, Math.max(1, globalThis.devicePixelRatio || 1))
  const art = buildArt(11 + Math.floor(stage.rand() * 1000), S)
  const crest = Math.min(farHill(SUN.x), nearHill(SUN.x))
  const SUN_SET = crest + 36

  // ---------------------------------------------------------------- sound

  const v = (amount = 0.05): number => 1 + (Math.random() * 2 - 1) * amount
  const snd = {
    scrape: () => sfx.noise({ dur: 0.05, freq: 4300 * v(0.2), filter: 'highpass', vol: 0.03 }),
    tick: () => sfx.noise({ dur: 0.02, freq: 2800, q: 2, vol: 0.07 }),
    // The ringing crack of a block coming free: a snap, then the ice sings.
    crack: (w: number) => {
      const f = w > 150 ? 880 : w > 100 ? 1046 : 1318
      sfx.noise({ dur: 0.035, freq: 2300, q: 1.4, vol: 0.12 })
      sfx.tone({ freq: f * v(0.01), dur: 0.9, vol: 0.07 })
      sfx.tone({ freq: f * 1.5, dur: 0.7, vol: 0.03, delay: 0.03 })
      sfx.tone({ freq: f * 2.76, dur: 0.4, vol: 0.02 })
    },
    ting: (w: number, vol = 0.055) => {
      const f = w > 150 ? 880 : w > 100 ? 1046 : 1318
      sfx.tone({ freq: f * v(0.008), dur: 0.6, vol })
      sfx.tone({ freq: f * 2.76, dur: 0.25, vol: vol * 0.3 })
    },
    tock: () => {
      sfx.tone({ freq: 330 * v(), to: 250, dur: 0.06, vol: 0.06 })
      sfx.noise({ dur: 0.02, freq: 1800, q: 2, vol: 0.04 })
    },
    clink: (k = 1) => {
      sfx.tone({ freq: 1500 * v(0.03), to: 1440, dur: 0.14, vol: 0.05 * k })
      sfx.tone({ freq: 170, to: 105, dur: 0.09, vol: 0.09 * k })
      sfx.noise({ dur: 0.05, freq: 520, filter: 'lowpass', vol: 0.06 * k })
    },
    pmf: (k = 1) => {
      sfx.noise({ dur: 0.17, freq: 380, to: 150, filter: 'lowpass', vol: 0.12 * k })
      sfx.tone({ freq: 118, to: 78, dur: 0.1, vol: 0.05 * k })
    },
    crunch: () => {
      sfx.noise({ dur: 0.09, freq: 1100 * v(0.1), q: 1.2, vol: 0.08 })
      sfx.noise({ dur: 0.08, freq: 880 * v(0.1), q: 1.2, vol: 0.06, delay: 0.08 })
    },
    tink: (vol = 0.05) => {
      sfx.tone({ freq: 2350 * v(0.03), dur: 0.3, vol })
      sfx.tone({ freq: 3520 * v(0.03), dur: 0.14, vol: vol * 0.4 })
      sfx.noise({ dur: 0.015, freq: 5200, filter: 'highpass', vol: vol * 0.8 })
    },
    breath: () => sfx.noise({ dur: 0.3, freq: 900, to: 480, filter: 'lowpass', vol: 0.035 }),
    scratch: () => sfx.noise({ dur: 0.03, freq: 5200 * v(0.15), q: 3, vol: 0.022 }),
    plip: () => sfx.tone({ freq: 520 * v(), to: 900, dur: 0.07, vol: 0.05 }),
    splash: () => {
      sfx.noise({ dur: 0.25, freq: 950, to: 300, filter: 'lowpass', vol: 0.07 })
      sfx.tone({ freq: 420, to: 760, dur: 0.09, vol: 0.04, delay: 0.05 })
    },
    step: () => sfx.noise({ dur: 0.1, freq: 320, to: 180, filter: 'lowpass', vol: 0.05 }),
    skate: () => sfx.noise({ dur: 0.5, freq: 3000, to: 5200, q: 1.5, vol: 0.012 }),
    chime: (step: number, vol = 0.05) => sfx.note(step, 0.7, 'sine', vol),
    fifth: () => {
      sfx.tone({ freq: 293.66, dur: 3, vol: 0.035, attack: 1.2 })
      sfx.tone({ freq: 440, dur: 3, vol: 0.03, attack: 1.2 })
      sfx.tone({ freq: 587.33, dur: 2.4, vol: 0.018, attack: 1, delay: 1.2 })
    },
    chirp: () => {
      sfx.tone({ freq: 2900, to: 3500, dur: 0.06, vol: 0.025 })
      sfx.tone({ freq: 3300, to: 2800, dur: 0.07, vol: 0.02, delay: 0.09 })
    },
  }

  const puff = (x: number, y: number, count = 7, up = true): void => {
    fx.burst(x, y, { count, color: [PAPER, PAPER, '#8f97b8'], speed: 150, life: 0.5, size: 5, gravity: 520, shape: 'square', angle: -Math.PI / 2, spread: up ? Math.PI * 0.9 : TAU, drag: 0.94 })
  }
  const chips = (x: number, y: number, count = 3): void => {
    fx.burst(x, y, { count, color: [PAPER, '#b8bfd6'], speed: 120, life: 0.35, size: 4, gravity: 600, shape: 'square', angle: -Math.PI / 2, spread: Math.PI * 0.7 })
  }

  // ---------------------------------------------------------------- the day

  let sunY = SUN.top
  let night = false
  let nightK = 0
  let lastLevel = 0
  let lastTouch = -10
  let snowT = 0
  let capCheck = 0
  let auroraOn = false
  let auroraK = 0
  let skateAt = 0
  let skateCx = POND.x
  let skateCy = POND.y
  let skatePull = 0

  const blocks: Block[] = []
  const holes: Hole[] = []
  const scratches: number[][] = []
  const marks: { x: number; y: number; a: number }[] = []
  const skyStars: { x: number; y: number; k: number; s: number }[] = []
  const flakes: Flake[] = []
  const holds = new Map<number, Hold>()
  let nextId = 1
  let scoops = 0
  const SCOOPS = 7
  const dents: [number, number][] = [
    [-70, -38],
    [20, -52],
    [84, -20],
    [-110, -4],
    [-16, -14],
    [48, 12],
    [-66, 22],
  ]

  const icicles: Icicle[] = []
  for (let i = 0; i < 6; i++) icicles.push({ x: 96 + i * 58, len: 0.74 + ((i * 37) % 5) * 0.07, grown: 1, there: true, wob: spring(0, 90, 5) })
  const icicleTop = (ic: Icicle): number => boughY(ic.x) + boughHalf(ic.x) - 3

  const robin = { x: 300, face: 1, hop: spring(0, 160, 9), next: 6 }
  const robinY = (): number => boughY(robin.x) - boughHalf(robin.x) - 19

  const clouds = [
    { x: 240, y: 86, s: 1, v: 5 },
    { x: 760, y: 150, s: 0.74, v: 3.4 },
  ]
  for (let i = 0; i < 12; i++) flakes.push({ x: stage.rand() * W, y: stage.rand() * H, vx: 0, vy: 26 + stage.rand() * 20, s: 3 + stage.rand() * 2, dark: stage.rand() < 0.5, life: 1e9 })

  const twinkles: [number, number, number][] = []
  for (let i = 0; i < 12; i++) twinkles.push([40 + stage.rand() * (W - 80), 20 + stage.rand() * 220, stage.rand() * TAU])

  // ---------------------------------------------------------------- blocks

  const makeBlock = (kind: Kind, w: number, h: number, x: number, y: number): Block => {
    const b: Block = {
      id: nextId++,
      kind,
      w,
      h,
      x,
      y,
      tx: x,
      ty: y,
      vy: 0,
      state: 'loose',
      landed: false,
      round: false,
      variant: nextId % 3,
      sq: spring(1, 260, 13),
      appear: 0,
      lit: 0,
      litWant: false,
      pulse: 0,
      cap: 0,
      capWant: false,
      frost: null,
      frostG: null,
      frostAmt: 0,
      stamps: 0,
    }
    blocks.push(b)
    return b
  }

  const built = (b: Block): boolean => b.state === 'rest' || b.state === 'fall'

  // Where a carried block would come to rest if let go at x, y. A block held
  // beside another goes beside it; held above, it goes on top. Edges that
  // nearly line up are lined up.
  const planDrop = (b: Block, x: number, y: number): [number, number] => {
    const lo = 36 + b.w / 2
    const hi = W - 36 - b.w / 2
    let cx = clamp(x, lo, hi)
    const bottom = y + b.h / 2
    for (let pass = 0; pass < 3; pass++) {
      for (const o of blocks) {
        if (o === b || !built(o)) continue
        if (overlap(cx, b.w, o.tx, o.w) > 4 && bottom > o.ty - o.h / 2 + 26) cx = cx < o.tx ? o.tx - o.w / 2 - b.w / 2 : o.tx + o.w / 2 + b.w / 2
      }
    }
    cx = clamp(cx, lo, hi)
    let best = 17
    for (const o of blocks) {
      if (o === b || !built(o)) continue
      const al = o.tx - o.w / 2
      const ar = o.tx + o.w / 2
      for (const d of [al - (cx - b.w / 2), ar - (cx + b.w / 2), ar - (cx - b.w / 2), al - (cx + b.w / 2), o.tx - cx]) {
        if (Math.abs(d) < Math.abs(best)) best = d
      }
    }
    if (Math.abs(best) < 17) cx += best
    let top = GROUND
    for (const o of blocks) {
      if (o === b || !built(o)) continue
      if (overlap(cx, b.w, o.tx, o.w) > 6) top = Math.min(top, o.ty - o.h / 2)
    }
    return [cx, top - b.h / 2]
  }

  // After something is taken away, what stood on it comes gently down.
  const settle = (): void => {
    const list = blocks.filter(built).sort((a, b) => b.ty + b.h / 2 - (a.ty + a.h / 2))
    const done: Block[] = []
    for (const b of list) {
      let top = GROUND
      for (const o of done) if (overlap(b.tx, b.w, o.tx, o.w) > 6) top = Math.min(top, o.ty - o.h / 2)
      const ty = top - b.h / 2
      if (Math.abs(ty - b.ty) > 0.5) {
        b.ty = ty
        b.state = 'fall'
        b.vy = 0
      }
      done.push(b)
    }
  }

  // How much of a block's top has something standing on it, 0 to 1.
  const covered = (b: Block): number => {
    let sum = 0
    for (const o of blocks) {
      if (o === b || !built(o)) continue
      const ov = overlap(b.tx, b.w, o.tx, o.w)
      if (ov > 6 && Math.abs(o.ty + o.h / 2 - (b.ty - b.h / 2)) < 3) sum += ov
    }
    return sum / b.w
  }
  const freeTop = (b: Block): boolean => covered(b) === 0

  const zoneOf = (b: Block): 'pond' | 'drift' | 'land' => {
    const fy = b.y + b.h * 0.25
    if (inPond(b.x, fy, 0.94)) return 'pond'
    if (inDrift(b.x, fy, 0.92)) return 'drift'
    return 'land'
  }

  const dropSound = (b: Block, k: number): void => {
    if (b.kind === 'ice') snd.clink(k)
    else if (b.kind === 'snow') snd.pmf(k)
    else snd.tink(0.04 * k)
  }

  const shedCap = (b: Block): void => {
    if (b.cap > 0.3) puff(b.x, b.y - b.h / 2, 6)
    b.cap = 0
    b.capWant = false
  }

  const land = (b: Block, fell: number): void => {
    b.state = 'rest'
    b.landed = true
    b.x = b.tx
    b.y = b.ty
    b.vy = 0
    const k = clamp(0.5 + fell / 300, 0.5, 1)
    b.sq.value = b.kind === 'snow' ? 1 - 0.16 * k : 1 - 0.07 * k
    dropSound(b, k)
    const bottom = b.ty + b.h / 2
    if (bottom > GROUND - 2) puff(b.x, bottom, 6)
    else chips(b.x, bottom, 3)
    for (const o of blocks) {
      if (o !== b && built(o) && overlap(b.tx, b.w, o.tx, o.w) > 6 && Math.abs(o.ty - o.h / 2 - bottom) < 3) {
        if (b.kind !== 'icicle') shedCap(o)
        o.sq.value = Math.min(o.sq.value, 0.97)
      }
    }
  }

  const release = (b: Block): void => {
    const zone = zoneOf(b)
    if (zone === 'pond' && b.kind === 'ice' && b.landed) {
      let best: Hole | null = null
      for (const hl of holes) if (!hl.closing && (!best || dist(hl.x, hl.y, b.x, b.y) < dist(best.x, best.y, b.x, b.y))) best = hl
      if (best) {
        // Back where it came from: it slips into the water and the hole skins over.
        b.state = 'sink'
        b.tx = best.x
        b.ty = best.y - 6
        best.closing = true
        snd.splash()
        chips(best.x, best.y - 8, 6)
        return
      }
    }
    if (zone === 'drift' && b.kind === 'snow' && b.landed) {
      b.state = 'sink'
      b.tx = b.x
      b.ty = b.y + 10
      scoops = Math.max(0, scoops - 1)
      snd.pmf(0.8)
      puff(b.x, b.y, 8)
      return
    }
    if (zone !== 'land') {
      b.state = 'loose'
      b.y = Math.min(b.y, H - 70 - b.h / 2)
      b.tx = b.x
      b.ty = b.y
      b.sq.value = 0.94
      dropSound(b, 0.5)
      return
    }
    const [tx, ty] = planDrop(b, b.x, b.y)
    b.tx = tx
    b.ty = ty
    b.vy = 0
    b.state = 'fall'
    if (b.y > ty) b.y = ty
  }

  const blockAt = (x: number, y: number): Block | null => {
    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i]!
      if (b.state === 'sink' || b.state === 'held') continue
      const px = b.kind === 'icicle' ? 28 : 10
      if (Math.abs(x - b.x) < b.w / 2 + px && Math.abs(y - b.y) < b.h / 2 + 10) return b
    }
    return null
  }

  // ---------------------------------------------------------------- frost

  const frostOf = (b: Block): G => {
    if (!b.frostG) {
      const c = document.createElement('canvas')
      c.width = Math.ceil(b.w * S)
      c.height = Math.ceil(b.h * S)
      const g = c.getContext('2d')
      if (!g) throw new Error('no 2d context')
      g.scale(S, S)
      g.translate(b.w / 2, b.h / 2)
      g.lineCap = 'round'
      g.beginPath()
      g.rect(-b.w / 2 + 5, -b.h / 2 + 5, b.w - 10, b.h - 10)
      g.clip()
      b.frost = c
      b.frostG = g
    }
    return b.frostG
  }

  const breathe = (b: Block, lx: number, ly: number, spreadR: number): void => {
    // Frost stays a veil: once the glass is misted over, more breath adds nothing.
    if (b.stamps > (b.w * b.h) / 190) return
    b.stamps++
    const g = frostOf(b)
    const a = Math.random() * TAU
    const d = Math.sqrt(Math.random()) * spreadR
    const s = 0.5 + Math.random() * 0.5
    g.globalCompositeOperation = 'source-over'
    g.save()
    g.globalAlpha = 0.42
    g.translate(lx + Math.cos(a) * d, ly + Math.sin(a) * d)
    g.rotate(Math.random() * TAU)
    g.drawImage(art.frost.c, -48 * s, -48 * s, 96 * s, 96 * s)
    g.restore()
  }

  // A finger in the frost leaves a clear line that feathers like a fern.
  const frostLine = (b: Block, x0: number, y0: number, x1: number, y1: number, barb: boolean): void => {
    const g = frostOf(b)
    g.globalCompositeOperation = 'source-atop'
    g.strokeStyle = INK
    g.lineWidth = 4.2
    g.beginPath()
    g.moveTo(x0, y0)
    g.lineTo(x1, y1)
    g.stroke()
    if (barb) {
      const a = Math.atan2(y1 - y0, x1 - x0)
      g.lineWidth = 2.2
      for (const side of [-1, 1]) {
        g.beginPath()
        g.moveTo(x1, y1)
        g.lineTo(x1 + Math.cos(a + side * 0.9) * 9, y1 + Math.sin(a + side * 0.9) * 9)
        g.stroke()
      }
    }
  }

  const frostStar = (b: Block, x: number, y: number): void => {
    const g = frostOf(b)
    g.globalCompositeOperation = 'source-atop'
    g.strokeStyle = INK
    g.lineWidth = 3
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI + 0.3
      g.beginPath()
      g.moveTo(x - Math.cos(a) * 11, y - Math.sin(a) * 11)
      g.lineTo(x + Math.cos(a) * 11, y + Math.sin(a) * 11)
      g.stroke()
    }
  }

  // ---------------------------------------------------------------- the pond

  const onHole = (x: number, y: number): boolean => {
    for (const hl of holes) if (hl.open > 0.5 && Math.abs(x - hl.x) < hl.len * 0.4 && Math.abs(y - hl.y) < 20) return true
    return false
  }

  const clampPond = (x: number, y: number): [number, number] => {
    const dx = (x - POND.x) / (POND.rx * 0.9)
    const dy = (y - POND.y) / (POND.ry * 0.82)
    const d = Math.hypot(dx, dy)
    if (d <= 1) return [x, y]
    return [POND.x + (dx / d) * POND.rx * 0.9, POND.y + (dy / d) * POND.ry * 0.82]
  }

  const ragged = (q: [number, number][], out: number): number[] => {
    const pts: number[] = []
    for (let i = 0; i < 4; i++) {
      const a = q[i]!
      const b = q[(i + 1) % 4]!
      for (let j = 0; j < 4; j++) {
        const t = j / 4
        pts.push(a[0] + (b[0] - a[0]) * t + (Math.random() - 0.5) * 2.6, a[1] + (b[1] - a[1]) * t + (Math.random() - 0.5) * 2.6)
      }
    }
    if (out) {
      let cx = 0
      let cy = 0
      for (const p of q) {
        cx += p[0] / 4
        cy += p[1] / 4
      }
      for (let i = 0; i < pts.length; i += 2) {
        pts[i] = pts[i]! + Math.sign(pts[i]! - cx) * out
        pts[i + 1] = pts[i + 1]! + Math.sign(pts[i + 1]! - cy) * out * (pts[i + 1]! < cy ? 1.6 : 0.5)
      }
    }
    return pts
  }

  const holeQuad = (hl: { x: number; y: number; ang: number; len: number }, grow = 1): [number, number][] => {
    const c = Math.cos(hl.ang)
    const s = Math.sin(hl.ang)
    const a = (hl.len / 2) * grow
    const nx = -s * 28 * grow
    const ny = c * 15 * grow
    return [
      [hl.x - c * a - nx, hl.y - s * a - ny],
      [hl.x + c * a - nx, hl.y + s * a - ny],
      [hl.x + c * a + nx, hl.y + s * a + ny],
      [hl.x - c * a + nx, hl.y - s * a + ny],
    ]
  }

  const finishCut = (h: Extract<Hold, { kind: 'cut' }>): void => {
    const len = dist(h.x0, h.y0, h.x1, h.y1)
    const mx = (h.x0 + h.x1) / 2
    const my = (h.y0 + h.y1) / 2
    const open = holes.filter((hl) => !hl.closing).length
    if (len < 60 || open >= 12) {
      // Only a score in the ice. It stays until fresh snow covers it.
      if (len > 8) scratches.push([h.x0, h.y0, h.x1, h.y1])
      else {
        const a = Math.random() * Math.PI
        for (let i = 0; i < 3; i++) {
          const c = Math.cos(a + i * 1.05) * 11
          const s = Math.sin(a + i * 1.05) * 5
          scratches.push([h.x0 - c, h.y0 - s, h.x0 + c, h.y0 + s])
        }
      }
      while (scratches.length > 24) scratches.shift()
      if (len >= 60) snd.tock()
      return
    }
    const w = len < 140 ? ICE_W[0] : len < 215 ? ICE_W[1] : ICE_W[2]
    let ang = Math.atan2(h.y1 - h.y0, h.x1 - h.x0)
    if (Math.cos(ang) < 0) ang += Math.PI
    const q = holeQuad({ x: mx, y: my, ang, len: w * 0.92 })
    holes.push({ x: mx, y: my, ang, len: w * 0.92, open: 1, closing: false, edge: ragged(q, 0), rim: ragged(q, 3) })
    const b = makeBlock('ice', w, ICE_H, mx, my - 4)
    b.ty = Math.max(my - ICE_H / 2 - 12, 560)
    b.y = my - 10
    b.appear = 0.55
    b.sq.value = 1.12
    snd.crack(w)
    chips(mx, my - 6, 8)
    fx.burst(mx, my, { count: 6, color: [INK, '#56618f'], speed: 130, life: 0.45, size: 4, gravity: 700, shape: 'circle', angle: -Math.PI / 2, spread: Math.PI * 0.8 })
  }

  // ---------------------------------------------------------------- the folk

  const children: Child[] = []
  for (let i = 0; i < 3; i++) {
    children.push({
      mode: 'away',
      dest: 'pond',
      x: -80,
      y: POND.y,
      lean: 0,
      a: i * 2.1,
      speed: 0.62 + i * 0.09,
      kx: 0.66 - i * 0.14,
      ky: 0.5 - i * 0.08,
      fig: i === 1 ? 2 : 1,
      t: 0,
      dur: 1,
      fromX: 0,
      fromY: 0,
      job: null,
      seat: null,
      wait: 0,
      hop: spring(0, 150, 9),
      trail: [],
      trailAt: 0,
    })
  }
  let jobs: Block[] = []
  let seats: Seat[] | null = null

  const skatePos = (c: Child, a: number): [number, number] => [skateCx + Math.cos(a) * POND.rx * c.kx, skateCy + 4 + Math.sin(a * c.fig) * POND.ry * c.ky]

  const king = { mode: 'away' as 'away' | 'wait' | 'walk' | 'sit' | 'leave', x: W + 100, feet: GROUND + 2, destX: 640, destFeet: GROUND + 4, t: 0, sitK: 0, front: false, step: 0, nod: spring(0, 120, 9), throne: null as Block | null }

  interface Opening {
    x: number
    w: number
    h: number
  }

  // Openings the child left: a gap on the ground between two blocks with a
  // block across the top.
  const openings = (): Opening[] => {
    const rest = blocks.filter((b) => b.state === 'rest')
    const out: Opening[] = []
    for (const top of rest) {
      const bottom = top.ty + top.h / 2
      if (bottom > GROUND - 40) continue
      const x0 = top.tx - top.w / 2
      const x1 = top.tx + top.w / 2
      const below: [number, number][] = []
      for (const o of rest) {
        if (o === top || o.ty - o.h / 2 < bottom - 2) continue
        const a = Math.max(x0, o.tx - o.w / 2)
        const b = Math.min(x1, o.tx + o.w / 2)
        if (b - a > 2) below.push([a, b])
      }
      below.sort((p, q) => p[0] - q[0])
      let end: number | null = null
      for (const [a, b] of below) {
        if (end !== null && a - end >= 40) out.push({ x: (a + end) / 2, w: a - end, h: GROUND - bottom })
        end = end === null ? b : Math.max(end, b)
      }
    }
    return out
  }

  const kingGate = (): Opening | null => {
    let best: Opening | null = null
    for (const o of openings()) if (o.w >= 70 && o.h >= 120 && (!best || o.w * o.h > best.w * best.h)) best = o
    return best
  }

  const planKing = (): void => {
    king.throne = null
    const gate = kingGate()
    if (gate) {
      king.destX = gate.x
      king.destFeet = GROUND + 5
      return
    }
    // No gate: a snow seat on the ground will do for a throne.
    let throne: Block | null = null
    for (const b of blocks) if (b.state === 'rest' && b.kind === 'snow' && b.ty + b.h / 2 > GROUND - 2 && freeTop(b) && (!throne || b.tx > throne.tx)) throne = b
    if (throne) {
      king.throne = throne
      king.destX = throne.tx
      king.destFeet = GROUND - 22
      return
    }
    let left = W
    let right = -1
    for (const b of blocks) {
      if (!built(b)) continue
      left = Math.min(left, b.tx - b.w / 2)
      right = Math.max(right, b.tx + b.w / 2)
    }
    king.destX = right < 0 ? 660 : right + 100 < W - 150 ? right + 100 : Math.max(110, left - 100)
    king.destFeet = GROUND + 5
  }

  const planSeats = (): Seat[] => {
    const out: Seat[] = []
    const gate = kingGate()
    for (const o of openings()) {
      if (gate && Math.abs(o.x - gate.x) < 4 && o.h === gate.h) continue
      if (o.w >= 40 && o.h >= 56) out.push({ x: o.x, y: GROUND - 30, b: null })
    }
    for (const b of blocks) {
      if (b.state === 'rest' && b.kind === 'snow' && b !== king.throne && freeTop(b)) out.push({ x: b.tx, y: b.ty - b.h / 2 - 24, b })
    }
    return out
  }

  const send = (c: Child, dest: Child['dest'], dur: number): void => {
    c.mode = 'fly'
    c.dest = dest
    c.t = 0
    c.dur = dur
    c.fromX = c.x
    c.fromY = c.y
  }

  const flyTarget = (c: Child): [number, number] => {
    if (c.dest === 'job' && c.job) return c.job.kind === 'icicle' ? [c.job.x + 14, c.job.y - c.job.h / 2 + 4] : [c.job.x + c.job.w / 2 - 20, c.job.y - c.job.h / 2 - 14]
    if (c.dest === 'seat' && c.seat) return [c.seat.x, c.seat.y]
    if (c.dest === 'off') return [-90, POND.y - 110]
    return skatePos(c, c.a)
  }

  const startNight = (): void => {
    night = true
    holds.forEach((h, id) => {
      if (h.kind === 'cut') holds.set(id, { kind: 'idle' })
    })
    jobs = blocks.filter((b) => b.state !== 'sink' && b.kind !== 'snow').sort((a, b) => a.x - b.x || b.y - a.y)
    seats = null
    children.forEach((c, i) => {
      if (c.mode === 'away') {
        c.x = -60 - i * 50
        c.y = POND.y - 60 - i * 26
      }
      c.job = null
      c.seat = null
      c.wait = 0.8 + i * 0.6
      send(c, 'pond', 1.7 + i * 0.35)
    })
    king.mode = 'wait'
    king.t = 2.6
    snd.chime(-3, 0.05)
  }

  const startMorning = (): void => {
    night = false
    auroraOn = false
    snowT = 7
    capCheck = 0
    for (const b of blocks) b.litWant = false
    for (const hl of holes) hl.closing = true
    children.forEach((c, i) => {
      c.job = null
      c.seat = null
      if (c.mode !== 'away') send(c, 'off', 1.5 + i * 0.3)
    })
    if (king.mode !== 'away') king.mode = 'leave'
    scoops = 0
    scratches.length = 0
    for (const ic of icicles) {
      if (!ic.there) {
        ic.there = true
        ic.grown = 0
      }
    }
    snd.chime(2, 0.05)
    snd.chime(4, 0.035)
  }

  const updateChild = (c: Child, i: number, dt: number): void => {
    c.hop.update(dt)
    if (c.mode === 'away') return
    const px = c.x
    if (c.mode === 'skate') {
      c.a += c.speed * dt
      const [x, y] = skatePos(c, c.a)
      c.x = damp(c.x, x, 10, dt)
      c.y = damp(c.y, y, 10, dt)
      c.trailAt -= dt
      if (c.trailAt <= 0) {
        c.trailAt = 0.07
        c.trail.push(c.x, c.y + 30)
        if (c.trail.length > 56) c.trail.splice(0, 2)
      }
      c.wait -= dt
      if (night && c.wait <= 0) {
        const job = jobs.shift()
        if (job) {
          c.job = job
          send(c, 'job', clamp(dist(c.x, c.y, job.x, job.y) / 430, 0.7, 1.3))
        } else {
          if (!seats) seats = planSeats()
          // The first child always keeps to the ice.
          const seat = i === 0 ? undefined : seats.shift()
          if (seat) {
            c.seat = seat
            send(c, 'seat', 1.4)
          } else c.wait = 1e9
        }
      }
    } else if (c.mode === 'fly') {
      c.t = Math.min(1, c.t + dt / c.dur)
      const [tx, ty] = flyTarget(c)
      const e = ease.inOutQuad(c.t)
      const arc = Math.sin(e * Math.PI) * Math.min(90, 30 + dist(c.fromX, c.fromY, tx, ty) * 0.18)
      c.x = lerp(c.fromX, tx, e)
      c.y = lerp(c.fromY, ty, e) - arc
      if (c.t >= 1) {
        if (c.dest === 'job') {
          c.mode = 'hang'
          c.t = 0.34
          const b = c.job
          if (b && !b.litWant) {
            b.litWant = true
            b.pulse = 1
            snd.chime(Math.round(clamp((b.x - 100) / 110, 0, 9)) - 2 + (b.y < 420 ? 5 : 0), 0.045)
          }
        } else if (c.dest === 'seat') {
          c.mode = 'sit'
          c.hop.value = -5
        } else if (c.dest === 'off') {
          c.mode = 'away'
          c.trail.length = 0
        } else {
          c.mode = 'skate'
        }
      }
    } else if (c.mode === 'hang') {
      c.t -= dt
      if (c.t <= 0) {
        const job = jobs.shift()
        c.job = job ?? null
        if (job) send(c, 'job', clamp(dist(c.x, c.y, job.x, job.y) / 430, 0.55, 1.2))
        else {
          c.wait = 1.2 + i * 0.8
          send(c, 'pond', 1.3)
        }
      }
    } else if (c.mode === 'sit') {
      const s = c.seat
      if (s && s.b) {
        // Its seat was taken away: back to the ice, no fuss.
        if (s.b.state !== 'rest' || Math.abs(s.b.tx - s.x) > 3) {
          c.seat = null
          c.wait = 1e9
          send(c, 'pond', 1.3)
        } else {
          c.x = s.x
          c.y = s.b.ty - s.b.h / 2 - 24
        }
      }
    }
    c.lean = damp(c.lean, clamp((c.x - px) / Math.max(dt, 0.001) / 420, -0.4, 0.4), 8, dt)
  }

  const updateKing = (dt: number): void => {
    king.nod.update(dt)
    if (king.mode === 'wait') {
      king.t -= dt
      if (king.t <= 0) {
        planKing()
        king.front = false
        king.mode = 'walk'
      }
    } else if (king.mode === 'walk') {
      const d = king.destX - king.x
      const stepX = Math.sign(d) * Math.min(Math.abs(d), 84 * dt)
      king.x += stepX
      king.sitK = Math.max(0, king.sitK - dt * 2)
      king.feet = damp(king.feet, GROUND + 2, 4, dt)
      king.step -= dt
      if (king.step <= 0 && king.x < W + 30) {
        king.step = 0.56
        snd.step()
      }
      if (Math.abs(d) < 1) {
        king.mode = 'sit'
        king.front = true
      }
    } else if (king.mode === 'sit') {
      if (king.throne && king.throne.state !== 'rest') {
        king.throne = null
        king.destFeet = GROUND + 5
      }
      king.sitK = Math.min(1, king.sitK + dt * 1.1)
      king.feet = damp(king.feet, king.destFeet, 4, dt)
      if (king.sitK >= 1 && !auroraOn && night) {
        auroraOn = true
        snd.fifth()
      }
    } else if (king.mode === 'leave') {
      if (king.sitK > 0) {
        king.sitK = Math.max(0, king.sitK - dt * 1.6)
        king.feet = damp(king.feet, GROUND + 2, 5, dt)
      } else {
        king.front = false
        king.x += 120 * dt
        if (king.x > W + 100) king.mode = 'away'
      }
    }
  }

  // ---------------------------------------------------------------- touch

  const local = (b: Block, p: Pointer): [number, number] => [clamp(p.x - b.x, -b.w / 2 + 5, b.w / 2 - 5), clamp(p.y - b.y, -b.h / 2 + 5, b.h / 2 - 5)]

  const pickUp = (h: Extract<Hold, { kind: 'block' }>, p: Pointer): void => {
    const b = h.b
    const was = built(b)
    b.state = 'held'
    h.mode = 'carry'
    h.ox = clamp(b.x - p.x, -b.w / 2 + 8, b.w / 2 - 8)
    h.oy = clamp(b.y - p.y, -b.h / 2 + 8, b.h / 2 - 8)
    const at = blocks.indexOf(b)
    if (at >= 0) {
      blocks.splice(at, 1)
      blocks.push(b)
    }
    shedCap(b)
    if (was) settle()
    b.sq.value = 1.07
    if (b.kind === 'ice') sfx.tone({ freq: 1250 * v(0.03), dur: 0.12, vol: 0.03 })
    else if (b.kind === 'snow') sfx.noise({ dur: 0.07, freq: 700, filter: 'lowpass', vol: 0.05 })
    else snd.tink(0.025)
  }

  const tapBlock = (b: Block, p: Pointer): void => {
    b.sq.value = 0.93
    if (b.kind === 'ice') {
      b.pulse = 1
      if (b.lit > 0.5) snd.chime(Math.round(clamp((b.x - 100) / 110, 0, 9)) - 2, 0.05)
      else snd.ting(b.w)
      if (b.frostAmt > 0.12) {
        const [lx, ly] = local(b, p)
        frostStar(b, lx, ly)
      }
    } else if (b.kind === 'snow') {
      // Pat it round, pat it square.
      b.round = !b.round
      b.w = b.round ? 64 : 92
      b.h = b.round ? 62 : 64
      if (built(b)) {
        b.ty = b.ty + (b.round ? 1 : -1)
        b.y = b.ty
        settle()
      }
      b.sq.value = 0.8
      snd.pmf(0.7)
      puff(b.x, b.y + b.h / 2 - 4, 5)
    } else {
      b.pulse = 1
      snd.tink(0.04)
    }
  }

  const levelOf = (y: number): number => Math.round(clamp((y - SUN.top) / (SUN_SET - SUN.top), 0, 1) * 5)

  const down = (p: Pointer): void => {
    lastTouch = stage.time
    if (dist(p.x, p.y, SUN.x, Math.min(sunY, crest - 10)) < 92) {
      holds.set(p.id, { kind: 'sun', oy: sunY - p.y })
      lastLevel = levelOf(sunY)
      snd.chime(4 - lastLevel, 0.05)
      return
    }
    const b = blockAt(p.x, p.y)
    if (b) {
      holds.set(p.id, { kind: 'block', b, ox: b.x - p.x, oy: b.y - p.y, mode: 'press', t0: stage.time, sx: p.x, sy: p.y, lx: 0, ly: 0, next: 0, far: 0 })
      b.sq.value = 0.96
      if (b.kind === 'ice') sfx.tone({ freq: 1700 * v(0.04), dur: 0.05, vol: 0.02 })
      else if (b.kind === 'snow') sfx.noise({ dur: 0.05, freq: 500, filter: 'lowpass', vol: 0.04 })
      return
    }
    if (!night) {
      let near = -1
      for (let i = 0; i < icicles.length; i++) {
        const ic = icicles[i]!
        if (!ic.there || ic.grown < 0.9) continue
        const d = dist(p.x, p.y, ic.x, icicleTop(ic) + 44)
        if (d < 62 && (near < 0 || d < dist(p.x, p.y, icicles[near]!.x, icicleTop(icicles[near]!) + 44))) near = i
      }
      if (near >= 0) {
        holds.set(p.id, { kind: 'icicle', i: near, sx: p.x, sy: p.y })
        icicles[near]!.wob.kick(p.x < icicles[near]!.x ? 3 : -3)
        snd.tink(0.03)
        return
      }
      if (inDrift(p.x, p.y, 1.04)) {
        if (scoops < SCOOPS) {
          // A mitten-full, packed square as it comes away.
          scoops++
          const s = makeBlock('snow', 92, 64, p.x, p.y)
          s.state = 'held'
          s.appear = 0.5
          holds.set(p.id, { kind: 'block', b: s, ox: 0, oy: 0, mode: 'carry', t0: stage.time, sx: p.x, sy: p.y, lx: 0, ly: 0, next: 0, far: 0 })
          snd.crunch()
          puff(p.x, p.y, 8)
        } else {
          snd.pmf(0.5)
          puff(p.x, p.y, 4)
          holds.set(p.id, { kind: 'idle' })
        }
        return
      }
      if (inPond(p.x, p.y, 0.97)) {
        if (onHole(p.x, p.y)) {
          snd.plip()
          fx.ring(p.x, p.y, PAPER, 26, 0.5)
          holds.set(p.id, { kind: 'idle' })
        } else {
          const [x, y] = clampPond(p.x, p.y)
          holds.set(p.id, { kind: 'cut', x0: x, y0: y, x1: x, y1: y, scored: false, far: 0 })
          snd.tock()
          chips(x, y, 2)
        }
        return
      }
    } else if (inPond(p.x, p.y, 0.97)) {
      // The skaters swing over to see.
      skateCx = clamp(p.x, POND.x - 70, POND.x + 70)
      skateCy = clamp(p.y, POND.y - 14, POND.y + 14)
      skatePull = 5
      snd.skate()
      fx.ring(p.x, p.y, PAPER, 30, 0.5)
      holds.set(p.id, { kind: 'idle' })
      return
    }
    holds.set(p.id, { kind: 'idle' })
    if (dist(p.x, p.y, robin.x, robinY()) < 56) {
      robin.hop.kick(-150)
      robin.face = -robin.face
      robin.x = robin.x > 250 ? 208 : 300
      if (!night) snd.chirp()
      return
    }
    for (const c of children) {
      if (c.mode !== 'away' && dist(p.x, p.y, c.x, c.y) < 52) {
        c.hop.kick(-120)
        snd.chime(6, 0.03)
        return
      }
    }
    if (king.mode !== 'away' && Math.abs(p.x - king.x) < 60 && p.y > king.feet - 190 && p.y < king.feet + 10) {
      king.nod.kick(3)
      snd.chime(-5, 0.045)
      return
    }
    if (p.y < Math.min(farHill(p.x), nearHill(p.x)) - 6) {
      if (night) {
        skyStars.push({ x: p.x, y: p.y, k: 0, s: 0.7 + Math.random() * 0.5 })
        if (skyStars.length > 40) skyStars.shift()
        snd.chime(5 + Math.floor(Math.random() * 4), 0.03)
      } else {
        for (let i = 0; i < 5; i++) flakes.push({ x: p.x + (Math.random() - 0.5) * 50, y: p.y + (Math.random() - 0.5) * 24, vx: (Math.random() - 0.5) * 16, vy: 34 + Math.random() * 26, s: 3.5 + Math.random() * 2.5, dark: Math.random() < 0.4, life: 9 })
        sfx.tone({ freq: 1568 * v(0.02), dur: 0.25, vol: 0.018 })
      }
      return
    }
    // Bare snow keeps the print of a finger until fresh snow falls.
    marks.push({ x: p.x, y: p.y, a: 1 })
    if (marks.length > 36) marks.shift()
    snd.pmf(0.45)
    puff(p.x, p.y, 5)
  }

  const move = (p: Pointer): void => {
    const h = holds.get(p.id)
    if (!h) return
    lastTouch = stage.time
    if (h.kind === 'sun') {
      sunY = clamp(p.y + h.oy, SUN.top - 14, SUN_SET)
      const level = levelOf(sunY)
      if (level !== lastLevel) {
        lastLevel = level
        snd.chime(4 - level, 0.045)
      }
    } else if (h.kind === 'cut') {
      const [x, y] = clampPond(p.x, p.y)
      h.far += dist(x, y, h.x1, h.y1)
      h.x1 = x
      h.y1 = y
      if (h.far > 24) {
        h.far = 0
        snd.scrape()
        chips(x, y, 1)
      }
      if (!h.scored && dist(h.x0, h.y0, x, y) >= 60) {
        h.scored = true
        snd.tick()
      }
    } else if (h.kind === 'icicle') {
      const ic = icicles[h.i]!
      if (dist(p.x, p.y, h.sx, h.sy) > 16 && ic.there) {
        // Snap.
        ic.there = false
        const b = makeBlock('icicle', 40, 100, p.x, p.y)
        b.state = 'held'
        b.appear = 1
        holds.set(p.id, { kind: 'block', b, ox: 0, oy: 0, mode: 'carry', t0: stage.time, sx: p.x, sy: p.y, lx: 0, ly: 0, next: 0, far: 0 })
        snd.tink(0.06)
        chips(ic.x, icicleTop(ic) + 6, 4)
      }
    } else if (h.kind === 'block') {
      const b = h.b
      if (h.mode === 'press') {
        if (dist(p.x, p.y, h.sx, h.sy) > 12) {
          pickUp(h, p)
        }
      } else if (h.mode === 'breath') {
        if (dist(p.x, p.y, h.sx, h.sy) > 14) {
          h.mode = 'draw'
          ;[h.lx, h.ly] = local(b, p)
        }
      } else if (h.mode === 'draw') {
        if (Math.abs(p.x - b.x) > b.w / 2 + 20 || Math.abs(p.y - b.y) > b.h / 2 + 20) pickUp(h, p)
        else {
          const [lx, ly] = local(b, p)
          const d = dist(lx, ly, h.lx, h.ly)
          if (d > 2.5) {
            h.far += d
            const barb = h.far > 11
            if (barb) {
              h.far = 0
              snd.scratch()
            }
            frostLine(b, h.lx, h.ly, lx, ly, barb)
            h.lx = lx
            h.ly = ly
          }
        }
      }
    }
  }

  const up = (p: Pointer): void => {
    const h = holds.get(p.id)
    if (!h) return
    holds.delete(p.id)
    if (h.kind === 'cut') finishCut(h)
    else if (h.kind === 'icicle') icicles[h.i]!.wob.kick(2)
    else if (h.kind === 'block') {
      if (h.mode === 'press') tapBlock(h.b, p)
      else if (h.mode === 'carry') release(h.b)
    }
  }

  // ---------------------------------------------------------------- update

  const update = (dt: number): void => {
    const t = stage.time

    // Fingers that are down.
    for (const [id, h] of holds) {
      if (h.kind !== 'block') continue
      const p = stage.pointers.get(id)
      if (!p) continue
      const b = h.b
      if (h.mode === 'press' && b.kind === 'ice' && b.state === 'rest' && t - h.t0 > HOLD) {
        h.mode = 'breath'
        h.next = 0
        h.sx = p.x
        h.sy = p.y
      }
      if (h.mode === 'breath') {
        const held = t - h.t0 - HOLD
        b.frostAmt = Math.min(1.6, b.frostAmt + dt * 0.9)
        h.next -= dt
        const [lx, ly] = local(b, p)
        if (Math.random() < 0.3) breathe(b, lx, ly, 8 + Math.min(1, held / 1.2) * b.w * 0.5)
        if (h.next <= 0) {
          h.next = 0.34
          snd.breath()
        }
      } else if (h.mode === 'carry') {
        b.x = damp(b.x, p.x + h.ox, 26, dt)
        b.y = damp(b.y, p.y + h.oy - 12, 26, dt)
      }
    }

    // The sun settles when it is let go low, and turns the day.
    let sunHeld = false
    for (const h of holds.values()) if (h.kind === 'sun') sunHeld = true
    if (!sunHeld && (night || sunY > crest - 6)) sunY = damp(sunY, SUN_SET, 3, dt)
    if (!night && sunY > crest + 12) startNight()
    else if (night && sunY < crest - 26) startMorning()
    nightK = clamp(nightK + (night ? dt / 2.6 : -dt / 1.8), 0, 1)

    for (let i = blocks.length - 1; i >= 0; i--) {
      const b = blocks[i]!
      b.sq.update(dt)
      b.pulse = Math.max(0, b.pulse - dt * 1.6)
      b.lit = clamp(b.lit + (b.litWant ? dt * 1.6 : -dt * 0.9), 0, 1)
      b.cap = clamp(b.cap + (b.capWant ? dt * 0.3 : 0), 0, 1)
      if (b.state === 'sink') {
        b.x = damp(b.x, b.tx, 9, dt)
        b.y = damp(b.y, b.ty, 9, dt)
        b.appear -= dt * 2.2
        if (b.appear <= 0.05) blocks.splice(i, 1)
        continue
      }
      b.appear = Math.min(1, b.appear + dt * 4)
      if (b.state === 'loose' && !b.landed && b.y > b.ty) b.y = damp(b.y, b.ty, 10, dt)
      if (b.state === 'fall') {
        const from = b.y
        b.vy += 2600 * dt
        b.y += b.vy * dt
        b.x = damp(b.x, b.tx, 22, dt)
        if (b.y >= b.ty) land(b, Math.max(0, b.vy * 0.12) + (b.ty - from))
      }
    }

    for (let i = holes.length - 1; i >= 0; i--) {
      const hl = holes[i]!
      if (hl.closing) {
        hl.open -= dt * 0.55
        if (hl.open <= 0) holes.splice(i, 1)
      }
    }

    for (const ic of icicles) {
      ic.wob.update(dt)
      if (ic.there && ic.grown < 1) ic.grown = Math.min(1, ic.grown + dt * 0.28)
    }

    // Fresh snow in the morning: it lies on whatever has open sky above it.
    if (snowT > 0) {
      snowT -= dt
      if (flakes.length < 130 && Math.random() < dt * 34) flakes.push({ x: Math.random() * W, y: -10, vx: (Math.random() - 0.5) * 18, vy: 70 + Math.random() * 60, s: 3.5 + Math.random() * 3, dark: Math.random() < 0.45, life: 14 })
      capCheck -= dt
      if (capCheck <= 0 && snowT < 6) {
        capCheck = 0.5
        for (const b of blocks) if (b.state === 'rest' && b.kind !== 'icicle' && covered(b) < 0.45) b.capWant = true
      }
      for (const m of marks) m.a -= dt * 0.3
      while (marks.length && marks[0]!.a <= 0) marks.shift()
      for (const s of skyStars) s.k -= dt * 2
    } else {
      for (const b of blocks) b.capWant = false
    }
    for (let i = skyStars.length - 1; i >= 0; i--) {
      const s = skyStars[i]!
      if (night) s.k = Math.min(1, s.k + dt * 5)
      else {
        s.k -= dt * 0.6
        if (s.k <= 0) skyStars.splice(i, 1)
      }
    }
    for (let i = flakes.length - 1; i >= 0; i--) {
      const f = flakes[i]!
      f.y += f.vy * dt
      f.x += (f.vx + Math.sin(t * 0.9 + f.s * 9) * 9) * dt
      f.life -= dt
      if (f.y > H + 10) {
        if (f.life > 1e6) {
          f.y = -10
          f.x = Math.random() * W
        } else flakes.splice(i, 1)
      } else if (f.life <= 0) flakes.splice(i, 1)
    }

    for (const c of clouds) {
      c.x += c.v * dt
      if (c.x > W + 170) c.x = -170
    }

    robin.hop.update(dt)
    robin.next -= dt
    if (robin.next <= 0 && !night) {
      robin.next = 5 + Math.random() * 7
      robin.hop.kick(-70)
      if (Math.random() < 0.5) robin.face = -robin.face
    }

    children.forEach((c, i) => updateChild(c, i, dt))
    updateKing(dt)
    auroraK = clamp(auroraK + (auroraOn ? dt * 0.2 : -dt * 0.7), 0, 1)
    if (skatePull > 0) skatePull -= dt
    else {
      skateCx = damp(skateCx, POND.x, 0.6, dt)
      skateCy = damp(skateCy, POND.y, 0.6, dt)
    }
    if (night && t > skateAt && children.some((c) => c.mode === 'skate')) {
      skateAt = t + 3.5 + Math.random() * 4
      snd.skate()
    }
  }

  // ---------------------------------------------------------------- draw

  const putS = (g: G, s: Sprite, x: number, y: number, k: number, rot = 0): void => {
    g.save()
    g.translate(x, y)
    if (rot) g.rotate(rot)
    g.scale(k, k)
    g.drawImage(s.c, -s.w / 2, -s.h / 2, s.w, s.h)
    g.restore()
  }

  const drawBlock = (g: G, b: Block, through: number): void => {
    const t = stage.time
    const held = b.state === 'held'
    const sy = b.sq.value
    const plain = b.appear > 0.999 && Math.abs(sy - 1) < 0.004 && !held
    if (!plain) {
      const k = b.appear * (held ? 1.05 : 1)
      g.save()
      g.translate(b.x, b.y + b.h / 2)
      g.scale((1 + (1 - sy) * 0.5) * k, sy * k)
      g.translate(-b.x, -(b.y + b.h / 2))
    }
    if (b.kind === 'ice') {
      const sp = art.ice(b.w, b.variant)
      put(g, sp.day, b.x, b.y)
      const gold = Math.max(b.lit, through)
      if (gold > 0.01) {
        g.globalAlpha = gold
        put(g, sp.gold, b.x, b.y)
        g.globalAlpha = 1
      }
      if (b.frost) {
        g.globalAlpha = 0.88 - 0.2 * gold
        g.drawImage(b.frost, b.x - b.w / 2, b.y - b.h / 2, b.w, b.h)
        g.globalAlpha = 1
      }
      if (b.lit > 0.02) {
        const k = b.lit * (0.92 + 0.08 * Math.sin(t * 1.7 + b.id * 2.3) + b.pulse * 0.35)
        putS(g, art.light, b.x, b.y - 4, k, Math.sin(t * 0.9 + b.id) * 0.06)
      } else if (!night) {
        // By day the clear ice catches the light now and then.
        const glint = Math.max(0, Math.sin(t * 0.7 + b.id * 1.9)) ** 14 + b.pulse
        if (glint > 0.04) putS(g, art.star, b.x - b.w / 2 + 16, b.y - b.h / 2 + 14, Math.min(1, glint) * 0.8, t * 0.4)
      }
    } else if (b.kind === 'snow') {
      put(g, b.round ? art.ball : art.brick, b.x, b.y)
      if (nightK > 0.01) {
        g.globalAlpha = nightK
        put(g, b.round ? art.ballNight : art.brickNight, b.x, b.y)
        g.globalAlpha = 1
      }
    } else {
      put(g, art.spire, b.x, b.y)
      if (b.lit > 0.02) putS(g, art.star, b.x - 1, b.y - b.h / 2 + 2, b.lit * (0.95 + 0.12 * Math.sin(t * 2.1 + b.id) + b.pulse * 0.4), t * 0.3 + b.id)
      else if (b.pulse > 0.04 && !night) putS(g, art.star, b.x - 1, b.y - b.h / 2 + 4, b.pulse * 0.6, 0)
    }
    if (b.cap > 0.02) {
      const cs = art.cap(b.w)
      const hh = cs.h * (0.35 + 0.65 * b.cap)
      g.globalAlpha = Math.min(1, b.cap * 3)
      g.drawImage(cs.c, b.x - cs.w / 2, b.y - b.h / 2 + 8 - hh * 0.66, cs.w, hh)
      g.globalAlpha = 1
    }
    if (!plain) g.restore()
  }

  const drawKing = (g: G): void => {
    const t = stage.time
    const walking = king.mode === 'walk' || (king.mode === 'leave' && king.sitK <= 0)
    const bob = walking ? Math.abs(Math.sin(t * 5.6)) * 3 : 0
    const tilt = (walking ? Math.sin(t * 5.6) * 0.025 : 0) + king.nod.value * 0.05
    const face = king.mode === 'leave' && king.sitK <= 0 ? -1 : 1
    g.save()
    g.translate(king.x, king.feet - bob)
    g.rotate(tilt)
    g.scale(face, 1)
    if (king.sitK < 0.99) {
      g.globalAlpha = 1 - king.sitK
      g.drawImage(art.kingStand.c, -art.kingStand.w / 2, -88 - art.kingStand.h / 2, art.kingStand.w, art.kingStand.h)
    }
    if (king.sitK > 0.01) {
      g.globalAlpha = king.sitK
      g.drawImage(art.kingSit.c, -art.kingSit.w / 2, -60 - art.kingSit.h / 2, art.kingSit.w, art.kingSit.h)
    }
    g.globalAlpha = 1
    g.restore()
  }

  const draw = (g: G): void => {
    const t = stage.time
    const sunT = clamp((sunY - SUN.top) / (crest - SUN.top), 0, 1)
    const golden = smooth(0.32, 0.95, sunT)
    const day = 1 - nightK
    const through = golden * day * 0.9

    // Sky: three plates, one over another.
    if (nightK < 1) g.drawImage(art.skyDay, 0, 0, W, SKY_H)
    if (golden * day > 0.01) {
      g.globalAlpha = golden * day
      g.drawImage(art.skyGold, 0, 0, W, SKY_H)
    }
    if (nightK > 0) {
      g.globalAlpha = nightK
      g.drawImage(art.skyNight, 0, 0, W, SKY_H)
    }
    g.globalAlpha = 1
    if (day > 0.02) {
      g.globalAlpha = day
      for (const c of clouds) g.drawImage(art.cloud.c, c.x - (art.cloud.w * c.s) / 2, c.y - (art.cloud.h * c.s) / 2, art.cloud.w * c.s, art.cloud.h * c.s)
      g.globalAlpha = 1
    }
    if (nightK > 0.3) {
      for (const [x, y, ph] of twinkles) {
        const k = Math.max(0, Math.sin(t * 0.8 + ph)) * (nightK - 0.3) * 1.4
        if (k > 0.08) putS(g, art.star, x, y, k * 0.62, ph)
      }
      for (const s of skyStars) if (s.k > 0.02) putS(g, art.star, s.x, s.y, ease.outBack(clamp(s.k, 0, 1)) * s.s * (0.9 + 0.1 * Math.sin(t * 2 + s.x)), s.x)
    }

    // The northern lights unroll from one side, a strip at a time.
    if (auroraK > 0.005) {
      for (let i = 0; i < art.aurora.length; i++) {
        const a = art.aurora[i]!
        const slices = 14
        const sw = a.w / slices
        const bx = [40, 360, 660][i]! + Math.sin(t * 0.21 + i * 2) * 16
        const by = [38, 6, 50][i]!
        for (let s = 0; s < slices; s++) {
          const reveal = clamp(auroraK * 4.2 - (i * 0.9 + s / slices), 0, 1)
          if (reveal <= 0) continue
          g.globalAlpha = reveal * (0.78 + 0.16 * Math.sin(t * 0.6 + s * 0.7 + i))
          const dy = Math.sin(t * 0.45 + s * 0.5 + i * 2.2) * 9 - (1 - reveal) * 26
          g.drawImage(a.c, s * sw * S, 0, sw * S, a.h * S, bx + s * sw, by + dy, sw + 0.6, a.h)
        }
      }
      g.globalAlpha = 1
    }

    // The sun: gold when high, red as it comes down to the ridge.
    const red = smooth(0.3, 0.92, sunT)
    if (day > 0.02 && sunT < 0.98) {
      // Once something is built and the hand is still, the sun's rays breathe.
      const invite = !night && t - lastTouch > 6 && blocks.length >= 3 ? 1 + 0.07 * Math.sin(t * 1.6) : 1
      g.globalAlpha = day * (1 - golden * 0.7)
      putS(g, art.rays, SUN.x, sunY, invite, t * 0.05)
      g.globalAlpha = 1
    }
    if (red > 0.02) {
      g.globalAlpha = red * (0.55 + 0.25 * day + (night ? 0.12 * Math.sin(t * 0.8) : 0))
      put(g, art.afterglow, SUN.x, crest - 34)
      g.globalAlpha = 1
    }
    if (red < 0.99) put(g, art.sunGold, SUN.x, sunY)
    if (red > 0.01) {
      g.globalAlpha = red
      put(g, art.sunRed, SUN.x + 2, sunY + 1.5)
      g.globalAlpha = 1
    }

    if (nightK < 1) g.drawImage(art.landDay, 0, 0, W, H)
    if (nightK > 0) {
      g.globalAlpha = nightK
      g.drawImage(art.landNight, 0, 0, W, H)
      g.globalAlpha = 1
    }

    // On the bough.
    g.save()
    g.translate(robin.x, robinY() + Math.min(0, robin.hop.value))
    g.scale(robin.face, 1)
    g.drawImage(nightK > 0.5 ? art.robinNight.c : art.robin.c, -art.robin.w / 2, -art.robin.h / 2, art.robin.w, art.robin.h)
    g.restore()
    for (const ic of icicles) {
      if (!ic.there) continue
      const top = icicleTop(ic)
      const hh = art.icicle.h * ic.len * ic.grown
      g.save()
      g.translate(ic.x, top)
      g.rotate(ic.wob.value * 0.06)
      g.drawImage(nightK > 0.5 ? art.icicleNight.c : art.icicle.c, (-art.icicle.w * (0.6 + 0.4 * ic.grown)) / 2, -5 * ic.len, art.icicle.w * (0.6 + 0.4 * ic.grown), hh)
      g.restore()
    }

    if (king.mode !== 'away' && !king.front) drawKing(g)

    // What the hand has left in the snow and on the ice.
    for (const m of marks) {
      g.globalAlpha = clamp(m.a, 0, 1)
      put(g, art.mark, m.x, m.y)
    }
    g.globalAlpha = 1
    for (let i = 0; i < scoops; i++) {
      const d = dents[i]!
      put(g, art.dent, DRIFT.x + d[0], DRIFT.y + d[1])
    }
    for (const hl of holes) {
      g.globalAlpha = clamp(hl.open * 1.6, 0, 1)
      g.fillStyle = PAPER
      g.beginPath()
      g.moveTo(hl.rim[0]!, hl.rim[1]!)
      for (let i = 2; i < hl.rim.length; i += 2) g.lineTo(hl.rim[i]!, hl.rim[i + 1]!)
      g.closePath()
      g.fill()
      g.fillStyle = INK
      g.beginPath()
      g.moveTo(hl.edge[0]!, hl.edge[1]!)
      for (let i = 2; i < hl.edge.length; i += 2) g.lineTo(hl.edge[i]!, hl.edge[i + 1]!)
      g.closePath()
      g.fill()
      g.strokeStyle = PAPER
      g.lineWidth = 1.8
      const c = Math.cos(hl.ang)
      const s = Math.sin(hl.ang)
      const wv = Math.sin(t * 1.3 + hl.x) * 3
      g.beginPath()
      g.moveTo(hl.x - c * hl.len * 0.28 + wv, hl.y - s * hl.len * 0.28 + 3)
      g.lineTo(hl.x + c * hl.len * 0.08 + wv, hl.y + s * hl.len * 0.08 + 3)
      g.moveTo(hl.x + c * hl.len * 0.02 - wv, hl.y + s * hl.len * 0.02 - 4)
      g.lineTo(hl.x + c * hl.len * 0.3 - wv, hl.y + s * hl.len * 0.3 - 4)
      g.stroke()
    }
    g.globalAlpha = 1
    if (scratches.length) {
      g.strokeStyle = PAPER
      g.lineWidth = 3
      g.beginPath()
      for (const s of scratches) {
        g.moveTo(s[0]!, s[1]!)
        g.lineTo(s[2]!, s[3]!)
      }
      g.stroke()
    }
    for (const h of holds.values()) {
      if (h.kind !== 'cut') continue
      const len = dist(h.x0, h.y0, h.x1, h.y1)
      if (len >= 60) {
        // The block the saw has marked out.
        const w = len < 140 ? ICE_W[0] : len < 215 ? ICE_W[1] : ICE_W[2]
        let ang = Math.atan2(h.y1 - h.y0, h.x1 - h.x0)
        if (Math.cos(ang) < 0) ang += Math.PI
        const q = holeQuad({ x: (h.x0 + h.x1) / 2, y: (h.y0 + h.y1) / 2, ang, len: w * 0.92 })
        g.strokeStyle = INK
        g.lineWidth = 2.6
        g.setLineDash([7, 6])
        g.beginPath()
        g.moveTo(q[0]![0], q[0]![1])
        for (let i = 1; i < 4; i++) g.lineTo(q[i]![0], q[i]![1])
        g.closePath()
        g.stroke()
        g.setLineDash([])
      }
      g.strokeStyle = PAPER
      g.lineWidth = 5
      g.beginPath()
      g.moveTo(h.x0, h.y0)
      g.lineTo(h.x1, h.y1)
      g.stroke()
      g.strokeStyle = INK
      g.lineWidth = 1.6
      g.beginPath()
      g.moveTo(h.x0, h.y0 + 2.5)
      g.lineTo(h.x1, h.y1 + 2.5)
      g.stroke()
    }

    // Light on the snow: the low sun through ice by day's end, lanterns by night.
    if (through > 0.02) {
      for (const b of blocks) {
        if (b.kind !== 'ice' || !built(b)) continue
        const up = GROUND - (b.y + b.h / 2)
        const len = b.w + 60 + 240 * golden
        const x1 = b.x + b.w / 2 - up * (0.4 + 0.7 * golden)
        g.globalAlpha = through * 0.92
        g.drawImage(art.streak.c, x1 - len, GROUND - 6 + (b.id % 3) * 7, len, art.streak.h)
      }
      g.globalAlpha = 1
    }
    for (const b of blocks) {
      if (b.lit < 0.02 || b.kind !== 'ice') continue
      g.globalAlpha = b.lit * (0.8 + 0.08 * Math.sin(t * 1.3 + b.id) + b.pulse * 0.2)
      const k = b.w > 100 ? 1.25 : 1
      const hx = Math.round(b.x / 9) * 9
      const hy = Math.round(b.y / 9) * 9
      g.drawImage(art.halo.c, hx - (art.halo.w * k) / 2, hy - art.halo.h / 2, art.halo.w * k, art.halo.h)
    }
    g.globalAlpha = 1

    for (const b of blocks) {
      if (b.state === 'rest' && b.ty + b.h / 2 > GROUND - 2) g.drawImage(art.dash.c, b.x - b.w * 0.58, GROUND - 2, b.w * 1.16, art.dash.h)
    }

    // Where the block in the hand would come to rest.
    for (const h of holds.values()) {
      if (h.kind !== 'block' || h.mode !== 'carry' || zoneOf(h.b) !== 'land') continue
      const [gx, gy] = planDrop(h.b, h.b.x, h.b.y)
      g.strokeStyle = ink(0.45)
      g.lineWidth = 2.4
      g.setLineDash([6, 7])
      g.strokeRect(gx - h.b.w / 2 + 2, gy - h.b.h / 2 + 2, h.b.w - 4, h.b.h - 4)
      g.setLineDash([])
    }

    for (const b of blocks) if (built(b)) drawBlock(g, b, through)
    if (king.mode !== 'away' && king.front) drawKing(g)
    for (const b of blocks) if (b.state === 'loose' || b.state === 'sink') drawBlock(g, b, through * 0.7)

    // The frost children and the lines their skates leave.
    g.strokeStyle = PAPER
    g.lineWidth = 1.6
    for (const c of children) {
      if (c.trail.length < 4) continue
      g.globalAlpha = 0.75 * nightK
      g.beginPath()
      g.moveTo(c.trail[0]!, c.trail[1]!)
      for (let i = 2; i < c.trail.length; i += 2) g.lineTo(c.trail[i]!, c.trail[i + 1]!)
      g.stroke()
    }
    g.globalAlpha = 1
    for (const c of children) {
      if (c.mode === 'away') continue
      const y = c.y + Math.min(0, c.hop.value) + (c.mode === 'sit' ? Math.sin(t * 1.1 + c.a) * 1.2 : 0)
      putS(g, art.child, c.x, y, 1, c.lean)
      const carrying = c.mode === 'sit' || c.mode === 'hang' || (c.mode === 'fly' && c.dest === 'job')
      if (carrying) putS(g, art.star, c.x + 17, y + 6, 0.55 + 0.06 * Math.sin(t * 3 + c.a), t * 0.5)
    }

    for (const b of blocks) if (b.state === 'held') drawBlock(g, b, through * 0.7)

    for (const f of flakes) {
      g.fillStyle = f.dark ? '#a3b6e6' : PAPER
      g.fillRect(f.x, f.y, f.s, f.s)
    }

    // Idle: the pond glints, which is where the day begins.
    if (!night && t - lastTouch > 5 && blocks.length === 0) {
      const ph = (t * 0.22) % 1
      const gx = POND.x - 150 + ph * 300
      const k = Math.sin(ph * Math.PI)
      putS(g, art.star, gx, POND.y - 10 + Math.sin(ph * 9) * 12, k * 0.9, t * 0.6)
      putS(g, art.star, gx - 44, POND.y + 16, k * 0.5, -t * 0.5)
    }

    g.drawImage(art.grain, 0, 0, W, H)
  }

  return {
    update,
    draw,
    down,
    move,
    up,
    dispose() {
      holds.clear()
      blocks.length = 0
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'ice-palace',
    name: 'Ice Palace',
    emoji: '❄️',
    ages: [3, 7],
    set: 'gentle',
    pitch: 'Cut ice from the pond, gather snow and icicles, and build a palace; at dusk the frost children light it and King Winter comes to sit in it.',
    howTo: 'Draw a line across the pond to cut a block (a longer line, a longer block). Scoop snow from the drift, snap icicles from the bough, and stack them on the snow. Tap snow to pat it round. Hold a finger on ice to frost it, then draw in the frost. Pull the sun down behind the hill for night; lift it again for morning.',
    basedOn: 'Waldorf winter festivals and block play: King Winter and the frost children, building with plain natural pieces, the rhythm of day and dusk',
    whyFun: 'A line dragged across the ice lifts out a ringing block; blocks set down with weight where you put them; then everything clear that you built glows gold from inside.',
  },
  create,
}
