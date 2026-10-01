// Tea Time: a low table under a tree, three patient guests, and a tray. The
// child sets a cup on each saucer and pours. The pour is the whole game: bring
// the pot to a cup and it waits beside it; draw the finger down and it tips,
// the stream as thick as the tilt, the sound of the filling cup climbing as the
// tea nears the brim. Too much runs into the saucer and onto the cloth, and
// the sponge takes it up again. Nothing counts, hurries or cheers.

import { TAU, clamp, damp, ease, lerp, rnd, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { FAR, GLASS, INK, LOOKS, MILKY, POT_BELLY, TEA, TRAY, createArt, jugBody, leftEdge, put, rightEdge } from './art.ts'
import type { G } from './art.ts'

// How high a thing rides above the cloth while it is in the hand.
const LIFT = 26
const SEATS = [300, 590, 880]
const PLACE_Y = 418
const CLOTH_TOP = 396
const CLOTH_BOTTOM = 746
const HUES = ['#d99c8c', '#a9be98', '#e3bd6e']
// Things further up the table are a little smaller.
const depth = (y: number): number => 0.86 + clamp((y - 400) / 300, -0.05, 1.15) * 0.17
const PEEK = 978
const GONE = 1320

interface Geo {
  // The pivot near the spout, and the spout's mouth, in the vessel's own
  // coordinates (origin at the middle of its base).
  px: number
  py: number
  tipX: number
  tipY: number
  // Radians at full tilt.
  max: number
  // Where the pivot is held while pouring, from the cup's base, in cup scale.
  stX: number
  stY: number
  // The zone beside a cup where the vessel is caught and held to pour.
  zx: number
  zy: number
  zrx: number
  zry: number
  // Cups per second at full tilt.
  flow: number
  milk: boolean
}

const POT_GEO: Geo = { px: -70, py: -66, tipX: -117, tipY: -95, max: 0.9, stX: 66, stY: -108, zx: 112, zy: 14, zrx: 138, zry: 94, flow: 0.3, milk: false }
const JUG_GEO: Geo = { px: -26, py: -70, tipX: -43, tipY: -87, max: 1.08, stX: 44, stY: -92, zx: 62, zy: 8, zrx: 72, zry: 72, flow: 0.12, milk: true }

interface Base {
  // Where it stands on the cloth (its shadow); it is drawn `lift` above that.
  x: number
  y: number
  // Where it is gliding to once let go.
  tx: number
  ty: number
  lift: number
  s: number
  sway: Spring
  bounce: Spring
  // The pointer holding it, or -1.
  held: number
  offX: number
  offY: number
  grabX: number
  grabY: number
  // The finger, for its speed.
  fx: number
  fy: number
  speed: number
  r: number
  onTray: boolean
  landed: boolean
}

interface Cup extends Base {
  kind: 'cup'
  hue: number
  // Tea in the cup, 1 is the brim; and how much of it is milk.
  v: number
  milk: number
  // The colour shown, which follows the milk slowly, and the swirl of new milk.
  mix: number
  cloud: number
  ripple: number
  drip: number
  // The place it stands on, and the guest holding it, or -1.
  saucer: number
  guest: number
  lastPour: number
  // 1 is seen from above; less as a guest tips it to drink.
  open: number
}

interface Drop {
  x: number
  y: number
  vx: number
  vy: number
  w: number
  vol: number
  link: boolean
  cup: Cup | null
  inCup: boolean
  floor: number
  s: number
}

interface Pourer extends Base {
  kind: 'pot' | 'jug'
  geo: Geo
  vol: number
  cap: number
  // 0..1 from the finger, and what is drawn.
  tilt: number
  shown: number
  // The cup it is held beside, and the last one, for the blend into place.
  target: Cup | null
  near: Cup | null
  capMix: number
  noCap: Cup | null
  noCapT: number
  dwell: number
  refX: number
  refY: number
  drops: Drop[]
  slosh: Spring
  flowing: number
  dripT: number
  // Seconds held at a cup without tipping.
  still: number
  // Downward travel past full tilt, and whether it was just picked up.
  over: number
  fresh: boolean
  pickX: number
  pickY: number
}

interface Biscuit extends Base {
  kind: 'biscuit'
  bites: number
  guest: number
  turn: number
}

interface Sponge extends Base {
  kind: 'sponge'
  wet: number
  px: number
  py: number
  rub: number
}

type Thing = Cup | Pourer | Biscuit | Sponge

interface Place {
  x: number
  y: number
  puddle: number
  milk: number
}

interface Stain {
  x: number
  y: number
  amt: number
  milk: number
  shape: number[]
}

type GuestState = 'idle' | 'reach' | 'lift' | 'sip' | 'lower' | 'back' | 'breach' | 'bcarry' | 'nibble' | 'bback'

interface Guest {
  i: number
  x: number
  kind: number
  state: GuestState
  t: number
  pause: number
  served: boolean
  cup: Cup | null
  bis: Biscuit | null
  lx: Spring
  ly: Spring
  rx: Spring
  ry: Spring
  nod: Spring
  lean: Spring
  lookX: number
  lookY: number
  blinkIn: number
  blink: number
  shut: number
  from: number
}

// Each guest drinks in its own way: the doll daintily with both hands, the
// bear in long slow gulps from one paw, the wooden rabbit in quick stiff sips.
const WAYS = [
  { reach: 0.6, lift: 1.0, sip: 1.1, size: 0.27, pauseMin: 3.4, pauseMax: 5.2, stiff: 70, dampen: 15, nod: 3.2 },
  { reach: 0.65, lift: 0.95, sip: 1.7, size: 0.44, pauseMin: 4.4, pauseMax: 6.4, stiff: 46, dampen: 12, nod: 2.2 },
  { reach: 0.32, lift: 0.5, sip: 0.6, size: 0.19, pauseMin: 2.4, pauseMax: 3.6, stiff: 250, dampen: 17, nod: 5 },
]

type Grab = { kind: 'thing'; thing: Thing } | { kind: 'tray'; startX: number; startDx: number; moved: number } | { kind: 'brush'; acc: number }

interface Puff {
  x: number
  y: number
  age: number
  life: number
  ph: number
  size: number
}

interface Debris {
  x: number
  y: number
  leaf: number
  rot: number
  size: number
}

interface Falling {
  x: number
  y: number
  ph: number
  rot: number
  land: number
  which: number
  rest: number
}

function create(stage: Stage): Game {
  const { sfx, fx } = stage
  const art = createArt()
  const vary = (amount = 0.04): number => 1 + (Math.random() * 2 - 1) * amount

  // The sound of each material, quietly.
  const snd = {
    tink(v = 1) {
      sfx.tone({ freq: 1850 * vary(), dur: 0.09, vol: 0.05 * v })
      sfx.tone({ freq: 2790 * vary(), dur: 0.05, vol: 0.02 * v })
    },
    clink(v = 1) {
      sfx.tone({ freq: 2060 * vary(), dur: 0.08, vol: 0.07 * v })
      sfx.tone({ freq: 3130 * vary(), dur: 0.05, vol: 0.03 * v, delay: 0.012 })
      sfx.noise({ dur: 0.02, freq: 4500, filter: 'highpass', vol: 0.03 * v })
    },
    glass(v = 1) {
      sfx.tone({ freq: 1320 * vary(), dur: 0.14, vol: 0.045 * v })
      sfx.tone({ freq: 2210 * vary(), dur: 0.08, vol: 0.018 * v })
    },
    cloth(v = 1) {
      sfx.noise({ dur: 0.07, freq: 260, filter: 'lowpass', vol: 0.08 * v })
    },
    wood(v = 1) {
      sfx.tone({ freq: 300 * vary(), to: 210, dur: 0.08, type: 'triangle', vol: 0.09 * v })
      sfx.noise({ dur: 0.04, freq: 700, filter: 'lowpass', vol: 0.05 * v })
    },
    tok() {
      sfx.tone({ freq: 620 * vary(), to: 500, dur: 0.05, type: 'triangle', vol: 0.07 })
    },
    pat() {
      sfx.noise({ dur: 0.05, freq: 380, filter: 'lowpass', vol: 0.06 })
    },
    rustle() {
      sfx.noise({ dur: 0.3, freq: 3200, to: 5200, filter: 'bandpass', q: 0.7, vol: 0.03 })
      sfx.noise({ dur: 0.2, freq: 4200, filter: 'highpass', vol: 0.014, delay: 0.1 })
    },
    brush() {
      sfx.noise({ dur: 0.09, freq: 1800, filter: 'bandpass', q: 0.6, vol: 0.02 })
    },
    wipe() {
      sfx.noise({ dur: 0.13, freq: 520 * vary(0.2), to: 900, filter: 'bandpass', q: 1.4, vol: 0.05 })
    },
    crunch() {
      sfx.noise({ dur: 0.03, freq: 2600 * vary(0.2), q: 2, vol: 0.06 })
      sfx.noise({ dur: 0.03, freq: 1900 * vary(0.2), q: 2, vol: 0.045, delay: 0.05 })
    },
    slide() {
      sfx.noise({ dur: 0.14, freq: 320 * vary(0.2), filter: 'lowpass', vol: 0.045 })
    },
    chime(step: number, vol = 0.05, delay = 0) {
      const f = sfx.scale(step)
      sfx.tone({ freq: f, dur: 1.5, vol, delay, attack: 0.004 })
      sfx.tone({ freq: f * 2.76, dur: 0.4, vol: vol * 0.22, delay })
    },
  }

  const base = (x: number, y: number, r: number): Base => ({
    x,
    y,
    tx: x,
    ty: y,
    lift: 0,
    s: depth(y),
    sway: spring(0, 160, 9),
    bounce: spring(1, 300, 14),
    held: -1,
    offX: 0,
    offY: 0,
    grabX: 0,
    grabY: 0,
    fx: 0,
    fy: 0,
    speed: 0,
    r,
    onTray: true,
    landed: true,
  })

  const places: Place[] = SEATS.map((x) => ({ x, y: PLACE_Y, puddle: 0, milk: 0 }))
  const tray = { dx: 0, to: 0, mode: 'home' as 'home' | 'away' | 'peek', moving: false, awayAt: 0, wob: spring(0, 220, 12), slid: 0 }

  const CUP_HOME: Array<[number, number]> = [
    [424, 702],
    [520, 702],
    [616, 702],
  ]
  const PLATE = { x: 902, y: 690 }
  const BISCUIT_AT: Array<[number, number]> = [
    [-46, -4],
    [-16, -10],
    [18, -8],
    [48, -1],
    [2, 7],
  ]

  const cups: Cup[] = CUP_HOME.map(([x, y], i) => ({ ...base(x, y, 40), kind: 'cup', hue: i, v: 0, milk: 0, mix: 0, cloud: 0, ripple: 0, drip: 0, saucer: -1, guest: -1, lastPour: -10, open: 1 }))
  const pourer = (kind: 'pot' | 'jug', x: number, y: number, r: number, geo: Geo, cap: number): Pourer => ({
    ...base(x, y, r),
    kind,
    geo,
    vol: cap,
    cap,
    tilt: 0,
    shown: 0,
    target: null,
    near: null,
    capMix: 0,
    noCap: null,
    noCapT: 0,
    dwell: 0,
    refX: 0,
    refY: 0,
    drops: [],
    slosh: spring(0, 90, 5),
    flowing: 0,
    dripT: 0,
    still: 0,
    over: 0,
    fresh: false,
    pickX: 0,
    pickY: 0,
  })
  const pot = pourer('pot', 258, 690, 76, POT_GEO, 4.2)
  const jug = pourer('jug', 762, 696, 34, JUG_GEO, 0.9)
  const sponge: Sponge = { ...base(1024, 708, 34), kind: 'sponge', wet: 0, px: 0, py: 0, rub: 0 }
  let biscuits: Biscuit[] = []
  const newBiscuits = (): void => {
    for (const [ox, oy] of BISCUIT_AT) biscuits.push({ ...base(PLATE.x + tray.dx + ox, PLATE.y + oy, 22), kind: 'biscuit', bites: 0, guest: -1, turn: rnd(0, TAU) })
  }
  // Everything that can be picked up, rebuilt only when a biscuit comes or goes.
  let all: Thing[] = []
  const relist = (): void => {
    all = [...cups, pot, jug, sponge, ...biscuits]
  }
  newBiscuits()
  relist()
  const things = (): Thing[] => all
  const resting: Thing[] = []
  const lifted: Thing[] = []
  const byDepth = (a: Thing, b: Thing): number => a.y - b.y

  const stains: Stain[] = []
  const debris: Debris[] = []
  const falling: Falling[] = []
  const puffs: Puff[] = []
  const pats: Array<{ x: number; y: number; age: number }> = []
  const grabs = new Map<number, Grab>()

  const guests: Guest[] = SEATS.map((x, i) => {
    const way = WAYS[i]!
    const hand = (v: number): Spring => spring(v, way.stiff, way.dampen)
    return {
      i,
      x,
      kind: i,
      state: 'idle',
      t: 0,
      pause: 0,
      served: false,
      cup: null,
      bis: null,
      lx: hand(x - 58),
      ly: hand(FAR + 16),
      rx: hand(x + 58),
      ry: hand(FAR + 16),
      nod: spring(0, 120, 9),
      lean: spring(0, 90, 7),
      lookX: 0,
      lookY: 0,
      blinkIn: 1.5 + i * 0.9,
      blink: 0,
      shut: 0,
      from: 0,
    }
  })

  const chime = spring(0, 14, 0.9)
  const dapples = Array.from({ length: 9 }, (_, i) => ({ x: 120 + stage.rand() * 940, y: 380 + stage.rand() * 400, rx: 70 + stage.rand() * 90, ph: stage.rand() * TAU, dark: i % 3 === 2 }))
  // Sprigs hanging in front of the canopy, kept clear of the heads and the chime.
  const boughs = [44, 150, 436, 508, 730, 1004, 1168].map((x, i) => ({ x: x + stage.rand() * 16, y: i === 0 ? 118 : 4 + stage.rand() * 22, which: i % 3, ph: stage.rand() * TAU, size: 0.8 + stage.rand() * 0.3 }))

  let lastTouch = 0
  // Tea has been poured since this tray came; a guest has drunk.
  let used = false
  let party = false
  let rest = 0
  let backFor = 0
  let sung = false
  let wind = 0
  let nextLeaf = 12
  let nextSigh = 16
  let blipT = 0
  let bedT = 0
  let landedAt = -1
  let landedIn: Cup | null = null
  let landedFlow = 0
  let landedMilk = false
  let spillAt = -1
  let patterT = 0
  let teaFill: CanvasGradient | null = null

  // ------------------------------------------------------------ geometry

  const pose = (p: Pourer): { x: number; y: number; s: number; a: number } => {
    let x = p.x
    let y = p.y - p.lift * LIFT
    let s = p.s
    const c = p.near
    if (c && p.capMix > 0.001) {
      const m = ease.inOutQuad(p.capMix)
      x = lerp(x, c.x + (p.geo.stX - p.geo.px) * c.s, m)
      y = lerp(y, c.y + (p.geo.stY - p.geo.py) * c.s, m)
      s = lerp(s, c.s, m)
    }
    return { x, y, s, a: p.shown * p.geo.max }
  }

  const tipOf = (p: Pourer, at: { x: number; y: number; s: number; a: number }): [number, number] => {
    const dx = p.geo.tipX - p.geo.px
    const dy = p.geo.tipY - p.geo.py
    const c = Math.cos(at.a)
    const sn = Math.sin(at.a)
    return [at.x + (p.geo.px + dx * c + dy * sn) * at.s, at.y + (p.geo.py - dx * sn + dy * c) * at.s]
  }

  const inZone = (p: Pourer, c: Cup, grow = 1): boolean => {
    const dx = (p.x - (c.x + p.geo.zx * c.s)) / (p.geo.zrx * c.s * grow)
    const dy = (p.y - (c.y + p.geo.zy)) / (p.geo.zry * c.s * grow)
    return dx * dx + dy * dy < 1
  }

  const onTrayAt = (x: number, y: number): boolean => x > TRAY.x0 + 22 + tray.dx && x < TRAY.x1 - 22 + tray.dx && y > TRAY.y0 + 14
  const onCloth = (x: number, y: number): boolean => y > FAR + 4 && x > leftEdge(y) && x < rightEdge(y)
  const cupsBack = (): boolean => cups.every((c) => c.onTray && c.landed && c.held < 0 && c.guest < 0)
  const tidy = (): boolean => cupsBack() && pot.onTray && pot.landed && jug.onTray && jug.landed
  const cupOn = (i: number): Cup | null => cups.find((c) => c.saucer === i && c.landed && c.held < 0 && c.guest < 0) ?? null

  // Where a thing comes to rest: on the cloth, clear of its neighbours.
  const restSpot = (t: Thing, x0: number, y0: number): [number, number] => {
    let x = x0
    let y = clamp(y0, CLOTH_TOP, CLOTH_BOTTOM)
    // On the tray means well on it, not astride its far wall.
    const overTray = (): boolean => tray.mode === 'home' && x > TRAY.x0 + tray.dx && x < TRAY.x1 + tray.dx && y > TRAY.y0 - 12
    const ontoTray = (): void => {
      if (!overTray()) return
      y = Math.max(y, TRAY.y0 + 62)
      x = clamp(x, TRAY.x0 + tray.dx + 52, TRAY.x1 + tray.dx - 52)
    }
    ontoTray()
    const others = all
    for (let pass = 0; pass < 5; pass++) {
      const push = (ox: number, oy: number, or: number): void => {
        const dx = x - ox
        const dy = (y - oy) * 2.3
        const d = Math.hypot(dx, dy)
        const min = (t.r + or) * 0.86 * depth(y)
        if (d >= min) return
        const ux = d < 0.01 ? 1 : dx / d
        const uy = d < 0.01 ? 0 : dy / d
        x += ux * (min - d)
        y += (uy * (min - d)) / 2.3
      }
      for (const o of others) {
        if (o === t || o.held >= 0) continue
        if (o.kind === 'cup' && o.guest >= 0) continue
        if (o.kind === 'biscuit' && o.guest >= 0) continue
        // The pot's spout and handle need room beside a cup.
        const wide = (t.kind === 'pot' && o.kind === 'cup') || (t.kind === 'cup' && o.kind === 'pot') ? 50 : 0
        push(o.tx, o.ty, o.r + wide)
      }
      if (t.kind !== 'biscuit') {
        for (const pl of places) push(pl.x, pl.y, t.kind === 'pot' ? 100 : 56)
        if (tray.mode === 'home') push(PLATE.x + tray.dx, PLATE.y, 80)
      }
      y = clamp(y, CLOTH_TOP, CLOTH_BOTTOM)
      const margin = t.kind === 'pot' ? 118 * depth(y) : t.r * 0.7 + 10
      x = clamp(x, Math.max(36, leftEdge(y) + margin), Math.min(W - 36, rightEdge(y) - margin))
      ontoTray()
    }
    return [x, y]
  }

  // ------------------------------------------------------------ liquids

  const addStain = (x: number, y: number, vol: number, milk: boolean): void => {
    spillAt = stage.time
    let near: Stain | null = null
    for (const s of stains) if (Math.hypot(s.x - x, (s.y - y) * 2) < 80) near = s
    if (!near) {
      if (stains.length > 14) stains.shift()
      near = { x, y, amt: 0, milk: 0, shape: Array.from({ length: 11 }, () => 0.78 + Math.random() * 0.44) }
      stains.push(near)
    }
    const total = near.amt + vol
    near.x = lerp(near.x, x, vol / Math.max(total, 0.001) / 2)
    near.milk = (near.milk * near.amt + (milk ? vol : 0)) / Math.max(total, 0.001)
    near.amt = Math.min(1.3, total)
  }

  const receive = (c: Cup, vol: number, milk: boolean): void => {
    if (!milk) used = true
    c.v += vol
    if (milk) {
      c.milk += vol
      c.cloud = Math.min(1, c.cloud + vol * 9)
    }
    c.lastPour = stage.time
    c.ripple = 1
    if (c.v <= 1) return
    const over = c.v - 1
    c.milk *= 1 / c.v
    c.v = 1
    c.drip = 1
    const frac = c.milk
    const place = c.saucer >= 0 ? places[c.saucer]! : null
    if (place && place.puddle < 0.3) {
      place.milk = (place.milk * place.puddle + frac * over) / (place.puddle + over)
      place.puddle += over
      spillAt = stage.time
    } else {
      addStain(c.x + (place ? 34 : 18) * c.s, c.y + (place ? 16 : 8), over, frac > 0.5)
    }
  }

  const steam = (x: number, y: number, size: number): void => {
    if (puffs.length > 56) return
    puffs.push({ x: x + rnd(-4, 4), y, age: 0, life: rnd(1.5, 2.3), ph: rnd(0, TAU), size })
  }

  // ------------------------------------------------------------ hands

  const pick = (x: number, y: number): Thing | null => {
    let best: Thing | null = null
    let bestD = 1
    for (const t of things()) {
      if (t.held >= 0) continue
      if (t.kind === 'cup' && t.guest >= 0) continue
      if (t.kind === 'biscuit' && t.guest >= 0) continue
      let cy = 30
      let rx = 56
      let ry = 50
      if (t.kind === 'pot') {
        cy = 66
        rx = 126
        ry = 92
      } else if (t.kind === 'jug') {
        cy = 44
        rx = 54
        ry = 60
      } else if (t.kind === 'sponge') {
        cy = 14
        rx = 52
        ry = 38
      } else if (t.kind === 'biscuit') {
        cy = 8
        rx = 36
        ry = 30
      }
      const s = t.s
      const dx = (x - t.x) / (rx * s)
      const dy = (y - (t.y - t.lift * LIFT - cy * s)) / (ry * s)
      const d = dx * dx + dy * dy
      if (d < bestD) {
        bestD = d
        best = t
      }
    }
    return best
  }

  const grab = (t: Thing, p: Pointer): void => {
    if (t.kind === 'pot' || t.kind === 'jug') {
      t.noCap = null
      t.dwell = 0
      t.fresh = true
      t.pickX = p.x
      t.pickY = p.y
    }
    t.held = p.id
    t.landed = false
    t.onTray = false
    t.offX = t.x - p.x
    t.offY = t.y - p.y
    t.grabX = t.offX
    t.grabY = t.offY
    t.fx = p.x
    t.fy = p.y
    t.speed = 600
    if (t.kind === 'cup') {
      t.saucer = -1
      snd.tink()
    } else if (t.kind === 'pot' || t.kind === 'jug') {
      snd.glass()
      t.slosh.kick(0.8)
    } else if (t.kind === 'sponge') {
      t.px = t.x
      t.py = t.y
      t.bounce.value = 0.8
      snd.cloth(0.7)
    } else {
      sfx.tone({ freq: 900 * vary(0.1), dur: 0.03, type: 'triangle', vol: 0.04 })
    }
    grabs.set(p.id, { kind: 'thing', thing: t })
  }

  const letGo = (t: Thing): void => {
    if ((t.kind === 'pot' || t.kind === 'jug') && t.target) {
      const at = pose(t)
      t.x = at.x
      t.y = t.target.y + 26
      t.lift = Math.max(0, (t.y - at.y) / LIFT)
      t.s = at.s
      t.target = null
      t.capMix = 0
      t.tilt = 0
    }
    t.held = -1
    let x = t.x
    let y = t.y
    let snapped = false
    if (t.kind === 'cup') {
      // A cup let go near an empty saucer goes onto it.
      let best = -1
      let bestD = 104
      places.forEach((pl, i) => {
        if (cups.some((c) => c !== t && c.saucer === i)) return
        const d = Math.hypot(pl.x - x, (pl.y - y) * 1.3)
        const d2 = Math.hypot(pl.x - x, pl.y - (y - t.lift * LIFT - 30))
        if (Math.min(d, d2) < bestD) {
          bestD = Math.min(d, d2)
          best = i
        }
      })
      if (best >= 0) {
        t.saucer = best
        x = places[best]!.x
        y = places[best]!.y
        snapped = true
      }
    }
    if (!snapped) [x, y] = restSpot(t, x, y)
    t.tx = x
    t.ty = y
  }

  const land = (t: Thing): void => {
    t.landed = true
    t.onTray = tray.mode === 'home' && onTrayAt(t.x, t.y)
    if (t.kind === 'cup') {
      if (t.saucer >= 0) snd.clink()
      else if (t.onTray) snd.wood(0.7)
      else snd.cloth()
      t.sway.kick(rnd(-0.6, 0.6))
    } else if (t.kind === 'pot' || t.kind === 'jug') {
      if (t.onTray) snd.wood()
      else snd.cloth()
      snd.glass(0.4)
      t.slosh.kick(rnd(-0.8, 0.8))
    } else {
      t.bounce.value = 0.82
      if (t.kind === 'biscuit') sfx.tone({ freq: 700 * vary(0.1), dur: 0.03, type: 'triangle', vol: 0.035 })
      else snd.cloth(0.6)
    }
  }

  // ------------------------------------------------------------ the tray

  const shiftTray = (dx: number): void => {
    const d = dx - tray.dx
    if (d === 0) return
    tray.dx = dx
    for (const t of things()) {
      if (!t.onTray || t.held >= 0) continue
      t.x += d
      t.tx += d
    }
    tray.slid += Math.abs(d)
    if (tray.slid > 46) {
      tray.slid = 0
      snd.slide()
    }
  }

  // A fresh tray, laid in the kitchen: full pot, clean cups, milk, biscuits.
  const layTray = (): void => {
    CUP_HOME.forEach(([x, y], i) => {
      const c = cups[i]!
      Object.assign(c, base(x + tray.dx, y, 40), { v: 0, milk: 0, mix: 0, cloud: 0, ripple: 0, drip: 0, saucer: -1, guest: -1, lastPour: -10, open: 1 })
    })
    Object.assign(pot, base(258 + tray.dx, 690, 76), { vol: pot.cap, tilt: 0, shown: 0, target: null, near: null, capMix: 0, drops: [] })
    Object.assign(jug, base(762 + tray.dx, 696, 34), { vol: jug.cap, tilt: 0, shown: 0, target: null, near: null, capMix: 0, drops: [] })
    if (sponge.onTray) Object.assign(sponge, base(1024 + tray.dx, 708, 34), { wet: 0 })
    biscuits = biscuits.filter((b) => !b.onTray)
    if (biscuits.length < 6) newBiscuits()
    relist()
    used = false
    party = false
  }

  const updateTray = (dt: number): void => {
    tray.wob.update(dt)
    if (tray.moving) {
      const next = damp(tray.dx, tray.to, 4.2, dt)
      const step = Math.sign(tray.to - tray.dx) * Math.max(Math.abs(next - tray.dx), 30 * dt)
      const arrived = Math.abs(tray.to - tray.dx) <= Math.abs(step)
      shiftTray(arrived ? tray.to : tray.dx + step)
      if (arrived) {
        tray.moving = false
        if (tray.to === GONE) {
          tray.mode = 'away'
          tray.awayAt = stage.time
          layTray()
        } else if (tray.to === 0) {
          if (tray.mode !== 'home') {
            tray.mode = 'home'
            snd.wood(0.8)
            snd.tink(0.5)
            pot.slosh.kick(1.2)
            jug.slosh.kick(-1)
            for (const c of cups) c.sway.kick(rnd(-0.5, 0.5))
          }
        }
      }
    }
    // Some way off, someone has laid a fresh tray; its end shows at the edge.
    if (tray.mode === 'away' && !tray.moving && stage.time - tray.awayAt > 2.4) {
      tray.mode = 'peek'
      tray.to = PEEK
      tray.moving = true
    }
  }

  // ------------------------------------------------------------ pouring

  const updatePourer = (p: Pourer, dt: number): void => {
    const finger = p.held >= 0 ? stage.pointers.get(p.held) : undefined
    if (p.noCap) {
      p.noCapT -= dt
      if (p.noCapT <= 0 || !inZone(p, p.noCap, 1.12)) p.noCap = null
    }
    if (p.target) {
      const c = p.target
      if (!finger || c.held >= 0 || c.guest >= 0) {
        if (finger) freeFrom(p, finger)
      } else if (Math.abs(finger.x - p.refX) > 128 || finger.y < p.refY - 150 || p.over > 110 || p.speed > 750) {
        // Carried off sideways, lifted away, pulled right down, or snatched.
        freeFrom(p, finger)
      }
    } else if (finger && p.held >= 0) {
      // Held still beside a cup, it is caught there to pour.
      let found: Cup | null = null
      let foundD = Infinity
      for (const c of cups) {
        if (c === p.noCap || c.held >= 0 || c.guest >= 0 || !c.landed || !inZone(p, c)) continue
        const d = Math.hypot(p.x - (c.x + p.geo.zx * c.s), (p.y - (c.y + p.geo.zy)) * 1.5)
        if (d < foundD) {
          foundD = d
          found = c
        }
      }
      if (found && p.speed < 300) p.dwell += dt
      else p.dwell = 0
      // Picked up where it stood beside a cup, it takes a steadier hold to
      // settle there again (the finger staying put, or going slowly for a good
      // half second), so carrying it away does not pour.
      if (!found) p.fresh = false
      const put = Math.hypot(finger.x - p.pickX, finger.y - p.pickY) < 26
      if (found && p.dwell > (p.fresh ? (put ? 0.3 : 0.55) : 0.07)) {
        p.target = found
        p.near = found
        p.tilt = 0
        p.over = 0
        p.fresh = false
        p.refX = finger.x
        p.refY = finger.y
        p.dwell = 0
        snd.glass(0.5)
        p.slosh.kick(0.6)
      }
    }
    p.capMix = p.target ? Math.min(1, p.capMix + dt / 0.22) : 0
    if (!p.target) p.tilt = 0
    // Held at a cup and not yet tipped, it rocks a little toward it: an
    // invitation, never enough to pour.
    p.still = p.target && p.tilt < 0.04 ? p.still + dt : 0
    const rock = p.still > 1 ? Math.min(1, p.still - 1) * (0.05 + 0.04 * Math.sin((p.still - 1) * 3.2 - 1.2)) : 0
    const before = p.shown
    p.shown = damp(p.shown, p.tilt + rock, p.target ? 26 : 12, dt)
    p.slosh.kick((p.shown - before) * 26)
    p.slosh.update(dt)

    // The fuller the pot, the sooner it runs.
    const frac = p.vol / p.cap
    const start = lerp(0.52, 0.2, Math.sqrt(frac))
    let flow = p.vol > 0 ? clamp((p.shown - start) / (1 - start), 0, 1) ** 1.35 : 0
    if (p.vol < 0.06) flow *= p.vol / 0.06 + 0.1
    const at = pose(p)
    const [tx, ty] = tipOf(p, at)
    const aim = p.target ?? p.near
    const floor = aim ? aim.y + 4 : p.y
    if (flow > 0.035) {
      const amount = Math.min(p.vol, flow * p.geo.flow * dt)
      p.vol -= amount
      const last = p.drops[p.drops.length - 1]
      p.drops.push({ x: tx, y: ty, vx: -(26 + 120 * flow) * at.s, vy: (30 + 60 * flow) * at.s, w: (2.6 + 7.4 * Math.sqrt(flow)) * at.s * (p.geo.milk ? 0.75 : 1), vol: amount, link: p.flowing > 0.035 && !!last, cup: aim, inCup: false, floor, s: at.s })
    } else if (p.shown > start * 0.75 && p.vol > 0 && p.target) {
      // Almost: a drop gathers at the spout and falls.
      p.dripT -= dt
      if (p.dripT <= 0) {
        p.dripT = rnd(0.35, 0.6)
        const amount = Math.min(p.vol, 0.004)
        p.vol -= amount
        p.drops.push({ x: tx, y: ty, vx: -10, vy: 20, w: 4.5 * at.s, vol: amount, link: false, cup: aim, inCup: false, floor, s: at.s })
      }
    }
    p.flowing = flow

    if (p.drops.length > 0) {
      let write = 0
      for (const d of p.drops) {
        d.vy += 1700 * d.s * dt
        d.x += d.vx * dt
        d.y += d.vy * dt
        const c = d.cup
        let gone = false
        if (c && c.held < 0 && c.guest < 0) {
          const rim = c.y - 58 * c.s
          if (!d.inCup && d.y >= rim && d.y - d.vy * dt <= rim + 12 && Math.abs(d.x - c.x) < 39 * c.s) d.inCup = true
          if (d.inCup && d.y >= rim + (1 - c.v) * 22 * c.s) {
            receive(c, d.vol, p.geo.milk)
            landedAt = stage.time
            landedIn = c
            landedFlow = Math.max(flow, 0.15)
            landedMilk = p.geo.milk
            if (Math.random() < 0.25) fx.burst(d.x, d.y, { count: 1, color: p.geo.milk ? '#fffaf0' : '#c57a2a', speed: 70, life: 0.25, size: 3, gravity: 500, angle: -Math.PI / 2, spread: 1.6 })
            gone = true
          }
        }
        if (!gone && !d.inCup && d.y >= d.floor) {
          addStain(d.x, d.floor, d.vol, p.geo.milk)
          if (Math.random() < 0.3) fx.burst(d.x, d.floor, { count: 1, color: p.geo.milk ? '#fffaf0' : '#c57a2a', speed: 90, life: 0.25, size: 3, gravity: 600, angle: -Math.PI / 2, spread: 2 })
          gone = true
        }
        if (!gone) p.drops[write++] = d
      }
      p.drops.length = write
    }
  }

  // The vessel leaves the cup and follows the finger again.
  const freeFrom = (p: Pourer, finger: Pointer): void => {
    const at = pose(p)
    p.noCap = p.target
    p.noCapT = 0.5
    p.target = null
    p.capMix = 0
    p.tilt = 0
    p.x = at.x
    p.y = at.y + p.lift * LIFT
    p.s = at.s
    p.offX = p.x - finger.x
    p.offY = p.y - finger.y
  }

  // Water into a vessel: little rising blips over a soft hiss. The blips sit
  // higher the fuller the cup, which is how the child hears when to stop.
  const pourSound = (dt: number): void => {
    const c = landedIn
    if (!c || stage.time - landedAt > 0.09) {
      blipT = 0
      bedT = 0
    } else {
      const full = c.v >= 0.999
      const fill = clamp(c.v, 0, 1)
      blipT -= dt
      let guard = 0
      while (blipT <= 0 && guard++ < 3) {
        blipT += rnd(0.5, 1.5) / (13 + 17 * landedFlow)
        const f = 420 * (1 + 2.4 * fill ** 1.4) * rnd(0.93, 1.1) * (landedMilk ? 0.8 : 1)
        sfx.tone({ freq: f, to: f * rnd(1.25, 1.6), dur: rnd(0.04, 0.08), vol: (0.028 + 0.03 * landedFlow) * (landedMilk ? 0.7 : 1) * (full ? 0.5 : 1) })
      }
      bedT -= dt
      if (bedT <= 0) {
        bedT = 0.11
        sfx.noise({ dur: 0.16, freq: 650 + 1500 * fill, q: 0.9, vol: 0.01 + 0.018 * landedFlow })
      }
    }
    // Tea going where it should not: a duller patter on linen and china.
    patterT -= dt
    if (stage.time - spillAt < 0.09 && patterT <= 0) {
      patterT = 0.1
      sfx.noise({ dur: 0.08, freq: 420 * vary(0.2), filter: 'lowpass', vol: 0.05 })
    }
  }

  // ------------------------------------------------------------ the guests

  const go = (gs: Guest, state: GuestState): void => {
    gs.state = state
    gs.t = 0
  }

  const biscuitFor = (gs: Guest): Biscuit | null => {
    for (const b of biscuits) {
      if (b.held >= 0 || !b.landed || b.guest >= 0 || b.onTray) continue
      if (Math.abs(b.x - gs.x) < 146 && b.y < 486) return b
    }
    return null
  }

  const crumbs = (x: number, y: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      if (debris.length > 70) debris.shift()
      debris.push({ x: x + rnd(-34, 34), y: y + rnd(0, 34), leaf: -1, rot: rnd(0, TAU), size: rnd(1.6, 3.4) })
    }
  }

  const updateGuest = (gs: Guest, dt: number): void => {
    const way = WAYS[gs.kind]!
    const look = LOOKS[gs.kind]!
    const cs = depth(PLACE_Y)
    const place = places[gs.i]!
    const asleep = rest > 0.3
    const restY = FAR + 16
    let lx = gs.x - 58
    let ly = restY
    let rx = gs.x + 58
    let ry = restY
    const gy = gs.kind === 2 ? 36 : 30
    const grip = (cx: number, cy: number): void => {
      if (gs.kind === 1) {
        rx = cx + 44 * cs
        ry = cy - 30 * cs
      } else {
        lx = cx - 41 * cs
        rx = cx + 41 * cs
        ly = ry = cy - gy * cs
      }
    }
    const mouthX = gs.x
    const mouthCupY = FAR + look.mouthY + 50 * cs
    gs.t += dt
    let sipping = false

    switch (gs.state) {
      case 'idle': {
        const cup = cupOn(gs.i)
        const ok = !!cup && cup.v > 0.04 && stage.time - cup.lastPour > 1.3 && pot.target !== cup && jug.target !== cup && !asleep
        if (ok && !gs.served) {
          gs.served = true
          gs.pause = 1 + gs.kind * 0.45 + rnd(0, 0.5)
        }
        if (!ok) gs.served = false
        // Nobody takes up a cup while the pot or the milk is being brought to it.
        for (const v of [pot, jug]) if (v.held >= 0 && Math.abs(v.x - place.x - 60) < 230 && v.y < 570) gs.pause = Math.max(gs.pause, 1.3)
        if (ok && cup) {
          gs.pause -= dt
          if (gs.pause <= 0) {
            gs.cup = cup
            go(gs, 'reach')
          }
        }
        if (gs.state === 'idle' && !asleep && (!ok || gs.pause > 1.4)) {
          const b = biscuitFor(gs)
          if (b) {
            gs.bis = b
            b.guest = gs.i
            go(gs, 'breach')
          }
        }
        break
      }
      case 'reach': {
        const c = gs.cup
        if (!c || c.held >= 0 || c.saucer !== gs.i) {
          gs.cup = null
          go(gs, 'back')
          break
        }
        grip(c.x, c.y)
        if (gs.t >= way.reach) {
          c.guest = gs.i
          snd.tink(0.45)
          go(gs, 'lift')
        }
        break
      }
      case 'lift': {
        grip(mouthX, mouthCupY)
        if (gs.t >= way.lift && gs.cup) {
          gs.from = gs.cup.v
          if (gs.kind === 0) sfx.noise({ dur: 0.5, freq: 1300, to: 2300, q: 3, vol: 0.028 })
          else if (gs.kind === 1) sfx.noise({ dur: 1.1, freq: 700, to: 1500, q: 2.4, vol: 0.036 })
          else sfx.noise({ dur: 0.22, freq: 1900, to: 2900, q: 3, vol: 0.024 })
          go(gs, 'sip')
        }
        break
      }
      case 'sip': {
        sipping = true
        grip(mouthX, mouthCupY - 12)
        const c = gs.cup
        if (c) {
          const next = Math.max(0, gs.from - way.size * ease.inOutQuad(clamp(gs.t / way.sip, 0, 1)))
          if (c.v > 0.0001) c.milk *= next / c.v
          c.v = next
        }
        if (gs.t >= way.sip) {
          party = true
          go(gs, 'lower')
        }
        break
      }
      case 'lower': {
        grip(place.x, place.y)
        const c = gs.cup
        if (gs.t >= way.lift && c) {
          c.guest = -1
          c.x = c.tx = place.x
          c.y = c.ty = place.y
          c.saucer = gs.i
          c.landed = true
          c.open = 1
          c.sway.kick(rnd(-0.4, 0.4))
          snd.clink(0.55)
          gs.cup = null
          gs.nod.kick(way.nod)
          if (gs.kind === 1) gs.lean.kick(0.5)
          go(gs, 'back')
        }
        break
      }
      case 'back': {
        if (gs.t >= way.reach + 0.2) {
          if (gs.kind === 2) snd.tok()
          gs.pause = rnd(way.pauseMin, way.pauseMax)
          go(gs, 'idle')
        }
        break
      }
      case 'breach': {
        const b = gs.bis
        if (!b || b.held >= 0) {
          if (b) b.guest = -1
          gs.bis = null
          go(gs, 'bback')
          break
        }
        if (gs.kind === 1) {
          lx = b.x - 6
          ly = b.y - 14
        } else if (gs.kind === 0) {
          rx = b.x + 6
          ry = b.y - 14
        } else {
          lx = b.x - 18
          rx = b.x + 18
          ly = ry = b.y - 12
        }
        if (gs.t >= 0.6) go(gs, 'bcarry')
        break
      }
      case 'bcarry':
      case 'nibble': {
        const my = FAR + look.mouthY + 12
        if (gs.kind === 1) {
          lx = gs.x - 16
          ly = my + 6
        } else if (gs.kind === 0) {
          rx = gs.x + 15
          ry = my + 6
        } else {
          lx = gs.x - 18
          rx = gs.x + 18
          ly = ry = my + 8
        }
        const b = gs.bis
        if (gs.state === 'bcarry') {
          if (gs.t >= 0.75) go(gs, 'nibble')
        } else if (b) {
          const due = Math.floor((gs.t + 0.55) / 0.8)
          if (due > b.bites && b.bites < 3) {
            b.bites++
            snd.crunch()
            gs.nod.kick(1.6)
            crumbs(gs.x, FAR + 8, 2)
            fx.burst(gs.x, FAR + look.mouthY + 8, { count: 3, color: '#d9ad68', speed: 60, life: 0.5, size: 3, gravity: 500, angle: Math.PI / 2, spread: 1.4 })
          }
          if (gs.t >= 2.5) {
            biscuits = biscuits.filter((o) => o !== b)
            relist()
            gs.bis = null
            go(gs, 'bback')
          }
        }
        break
      }
      case 'bback': {
        if (gs.t >= 0.6) {
          if (gs.kind === 2) snd.tok()
          go(gs, 'idle')
        }
        break
      }
    }

    gs.lx.target = lx
    gs.ly.target = ly
    gs.rx.target = rx
    gs.ry.target = ry
    gs.lx.update(dt)
    gs.ly.update(dt)
    gs.rx.update(dt)
    gs.ry.update(dt)
    gs.nod.update(dt)
    gs.lean.update(dt)

    const c = gs.cup
    if (c && c.guest === gs.i) {
      if (gs.kind === 1) {
        c.x = gs.rx.value - 44 * cs
        c.y = gs.ry.value + 30 * cs
      } else {
        c.x = (gs.lx.value + gs.rx.value) / 2
        c.y = (gs.ly.value + gs.ry.value) / 2 + gy * cs
      }
      c.tx = c.x
      c.ty = c.y
      c.s = cs
      c.open = damp(c.open, sipping ? 0.3 : lerp(1, 0.55, clamp((place.y - c.y) / 120, 0, 1)), 9, dt)
    }
    const b = gs.bis
    if (b && (gs.state === 'bcarry' || gs.state === 'nibble')) {
      if (gs.kind === 1) {
        b.x = gs.lx.value + 12
        b.y = gs.ly.value + 2
      } else if (gs.kind === 0) {
        b.x = gs.rx.value - 12
        b.y = gs.ry.value + 2
      } else {
        b.x = (gs.lx.value + gs.rx.value) / 2
        b.y = gs.ly.value + 8
      }
      b.tx = b.x
      b.ty = b.y
      b.s = cs
    }

    // Eyes: a slow blink now and then, closed with content while drinking,
    // and closing for a doze once the tea things are cleared.
    gs.blinkIn -= dt
    if (gs.blinkIn <= 0) {
      gs.blinkIn = rnd(2.6, 5.5)
      gs.blink = 1
    }
    gs.blink = Math.max(0, gs.blink - dt * 5)
    gs.shut = damp(gs.shut, sipping && gs.kind !== 2 ? 1 : 0, 6, dt)
    // They watch whatever is being carried, calmly; otherwise their own place.
    let wantX = 0
    let wantY = 0.5
    for (const g of grabs.values()) {
      if (g.kind !== 'thing') continue
      wantX = clamp((g.thing.x - gs.x) / 320, -1, 1)
      wantY = clamp((g.thing.y - 300) / 300, -0.2, 1)
    }
    gs.lookX = damp(gs.lookX, wantX, 2.4, dt)
    gs.lookY = damp(gs.lookY, wantY, 2.4, dt)
  }

  // ------------------------------------------------------------ update

  const update = (dt: number): void => {
    const time = stage.time
    wind = Math.sin(time * 0.23) * 0.6 + Math.sin(time * 0.071 + 2) * 0.4

    for (const t of things()) {
      const finger = t.held >= 0 ? stage.pointers.get(t.held) : undefined
      if (t.held >= 0 && !finger) letGo(t)
      if (finger) {
        const moved = Math.hypot(finger.x - t.fx, finger.y - t.fy)
        t.speed = damp(t.speed, moved / Math.max(dt, 0.001), 18, dt)
        t.sway.target = clamp(-(finger.x - t.fx) * 0.012, -0.16, 0.16)
        // What is inside leans back as the vessel is carried, and swills when it stops.
        if (t.kind === 'pot' || t.kind === 'jug') t.slosh.target = t.target ? 0 : clamp((-(finger.x - t.fx) / Math.max(dt, 0.001)) * 0.004, -3, 3)
        t.fx = finger.x
        t.fy = finger.y
        const caught = (t.kind === 'pot' || t.kind === 'jug') && t.target
        if (!caught) {
          // After leaving a cup the vessel swings back under the finger.
          t.offX = damp(t.offX, t.grabX, 9, dt)
          t.offY = damp(t.offY, t.grabY, 9, dt)
          t.x = finger.x + t.offX
          t.y = finger.y + t.offY
          t.s = damp(t.s, depth(clamp(t.y, CLOTH_TOP, CLOTH_BOTTOM)), 12, dt)
          t.lift = damp(t.lift, 1, 22, dt)
        }
      } else if (!t.landed && !(t.kind === 'cup' && t.guest >= 0) && !(t.kind === 'biscuit' && t.guest >= 0)) {
        t.sway.target = 0
        if (t.kind === 'pot' || t.kind === 'jug') t.slosh.target = 0
        t.x = damp(t.x, t.tx, 16, dt)
        t.y = damp(t.y, t.ty, 16, dt)
        t.s = damp(t.s, depth(t.ty), 14, dt)
        t.lift = Math.max(0, t.lift - dt / 0.14)
        if (t.lift === 0) {
          t.x = t.tx
          t.y = t.ty
          land(t)
        }
      } else {
        t.sway.target = 0
        if (t.landed) t.s = damp(t.s, depth(t.y), 14, dt)
      }
      t.sway.update(dt)
      t.bounce.update(dt)
    }

    updatePourer(pot, dt)
    updatePourer(jug, dt)
    pourSound(dt)

    for (const c of cups) {
      const want = c.v > 0.01 ? clamp((c.milk / c.v) * 3.2, 0, 1) ** 0.7 : 0
      c.mix = damp(c.mix, want, 0.9, dt)
      c.cloud = Math.max(0, c.cloud - dt * 0.3)
      c.ripple = Math.max(0, c.ripple - dt * 2.2)
      c.drip = Math.max(0, c.drip - dt * 0.5)
      if (c.v > 0.1 && Math.random() < dt * 3.2 * c.v) steam(c.x, c.y - c.lift * LIFT - 62 * c.s, 0.8 * c.s)
    }
    if (pot.vol > 0.2 && Math.random() < dt * 2.4) {
      const [tx, ty] = tipOf(pot, pose(pot))
      if (tx < W + 20) steam(tx - 2, ty - 4, 0.62 * pot.s)
    }
    for (const pf of puffs) {
      pf.age += dt
      pf.y -= (30 + 14 * (pf.age / pf.life)) * dt
      pf.x += wind * 9 * dt
    }
    for (let i = puffs.length - 1; i >= 0; i--) if (puffs[i]!.age >= puffs[i]!.life) puffs.splice(i, 1)

    for (const gs of guests) updateGuest(gs, dt)

    // The sponge takes up tea wherever it is rubbed.
    if (sponge.held >= 0) {
      const moved = Math.hypot(sponge.x - sponge.px, sponge.y - sponge.py)
      const wy = sponge.y - sponge.lift * LIFT + 12
      let took = 0
      for (let i = stains.length - 1; i >= 0; i--) {
        const st = stains[i]!
        const reach = (30 + 70 * Math.sqrt(st.amt)) * depth(st.y)
        if (Math.hypot(st.x - sponge.x, (st.y - wy) * 1.6) > reach + 30) continue
        const take = Math.min(st.amt, moved * 0.0042 + dt * 0.02)
        st.amt -= take
        took += take
        if (st.amt < 0.012) stains.splice(i, 1)
      }
      for (const pl of places) {
        if (pl.puddle <= 0 || Math.hypot(pl.x - sponge.x, (pl.y - wy) * 1.4) > 86) continue
        const take = Math.min(pl.puddle, moved * 0.0034)
        pl.puddle -= take
        took += take
        if (pl.puddle < 0.01) pl.puddle = 0
      }
      sponge.wet = Math.min(1, sponge.wet + took * 1.6)
      sponge.rub += moved
      if (sponge.rub > 44) {
        sponge.rub = 0
        if (took > 0) snd.wipe()
        else if (onCloth(sponge.x, wy)) snd.brush()
      }
      if (took > 0) sponge.bounce.target = 0.86
      else sponge.bounce.target = 0.94
    } else {
      sponge.bounce.target = 1
    }
    sponge.px = sponge.x
    sponge.py = sponge.y

    updateTray(dt)

    // Rest: once a guest has drunk and the cups are back on the tray, the
    // afternoon settles and the guests doze. It stays so until the child
    // carries the tray off and pulls in a fresh one.
    backFor = party && cupsBack() ? backFor + dt : 0
    const resting = tray.mode !== 'home' || backFor > 2.5
    rest = clamp(rest + (resting ? dt * 0.22 : -dt * 0.9), 0, 1)
    if (rest > 0.55 && !sung) {
      sung = true
      chime.kick(0.5)
      snd.chime(2, 0.04)
      snd.chime(0, 0.035, 1.1)
      snd.chime(-2, 0.03, 2.3)
    }
    if (rest < 0.1) sung = false

    // Slow idle life: a breath of wind in the chime, a leaf letting go.
    chime.target = wind * 0.05
    chime.update(dt)
    if (time > nextSigh) {
      nextSigh = time + rnd(22, 36)
      if (time - lastTouch > 3) {
        chime.kick(0.35)
        snd.chime(Math.floor(rnd(-3, 2)), 0.022)
      }
    }
    if (time > nextLeaf) {
      nextLeaf = time + rnd(18, 32)
      dropLeaf(rnd(140, W - 140))
    }
    for (let i = falling.length - 1; i >= 0; i--) {
      const f = falling[i]!
      if (f.y < f.land) {
        f.ph += dt * 2.1
        f.y += (34 + Math.sin(f.ph * 2) * 10) * dt
        f.x += (Math.sin(f.ph) * 34 + wind * 16) * dt
        f.rot = Math.sin(f.ph) * 0.9
      } else if (onCloth(f.x, f.y) && f.y < TRAY.y0 - 20) {
        if (debris.filter((d) => d.leaf >= 0).length < 3) debris.push({ x: f.x, y: f.y, leaf: f.which, rot: f.rot, size: 1 })
        falling.splice(i, 1)
      } else {
        f.rest += dt
        if (f.rest > 5) falling.splice(i, 1)
      }
    }
    for (let i = pats.length - 1; i >= 0; i--) {
      pats[i]!.age += dt
      if (pats[i]!.age > 0.5) pats.splice(i, 1)
    }
  }

  const dropLeaf = (x: number): void => {
    if (falling.length > 5) return
    const overCloth = x > 150 && x < W - 150
    falling.push({ x, y: rnd(60, 90), ph: rnd(0, TAU), rot: 0, land: overCloth ? rnd(420, 560) : rnd(380, 700), which: Math.random() < 0.5 ? 0 : 1, rest: 0 })
  }

  // ------------------------------------------------------------ drawing

  const tea = (mix: number, k = 1, a = 1): string => {
    const r = Math.min(255, lerp(TEA[0], MILKY[0], mix) * k) | 0
    const gg = Math.min(255, lerp(TEA[1], MILKY[1], mix) * k) | 0
    const b = Math.min(255, lerp(TEA[2], MILKY[2], mix) * k) | 0
    return a >= 1 ? `rgb(${r},${gg},${b})` : `rgba(${r},${gg},${b},${a})`
  }

  const shade = (g: G, x: number, y: number, rx: number, alpha: number): void => {
    if (alpha <= 0.01) return
    g.globalAlpha = alpha
    g.drawImage(art.shade.c, x - rx, y - rx * 0.3, rx * 2, rx * 0.6)
    g.globalAlpha = 1
  }

  const drawCup = (g: G, c: Cup): void => {
    const y = c.y - c.lift * LIFT
    if (c.guest < 0 && c.saucer < 0) shade(g, c.x + 2, c.y + 2, 42 * c.s, 0.3 - c.lift * 0.1)
    g.save()
    g.translate(c.x, y)
    g.scale(c.s, c.s)
    g.rotate(c.sway.value * 0.6)
    const ry = 13 * c.open
    const rimY = -58 + (1 - c.open) * 4
    // Handle.
    const handle = (): void => {
      g.beginPath()
      g.moveTo(-35, -46)
      g.bezierCurveTo(-67, -52, -66, -12, -29, -17)
    }
    handle()
    g.strokeStyle = INK
    g.lineWidth = 10
    g.stroke()
    handle()
    g.strokeStyle = '#f6efe0'
    g.lineWidth = 6
    g.stroke()
    // Inside, and the tea.
    g.beginPath()
    g.ellipse(0, rimY, 42, ry, 0, 0, TAU)
    g.fillStyle = '#e2d6bf'
    g.fill()
    g.save()
    g.clip()
    g.fillStyle = 'rgba(110,86,60,0.16)'
    g.beginPath()
    g.ellipse(0, rimY + ry * 0.9, 40, ry * 1.1, 0, 0, TAU)
    g.fill()
    g.restore()
    g.beginPath()
    g.ellipse(0, rimY, 42, ry, 0, 0, TAU)
    if (c.v > 0.012) {
      g.save()
      g.clip()
      const k = 0.6 + 0.4 * c.v
      const ty = rimY + (1 - c.v) * 24 * c.open
      const lean = c.sway.value * 26
      g.beginPath()
      g.ellipse(lean, ty, 41.5 * k, ry * k + 0.6, 0, 0, TAU)
      g.fillStyle = tea(c.mix)
      g.fill()
      g.strokeStyle = tea(c.mix, 1.5, 0.6)
      g.lineWidth = 2
      g.beginPath()
      g.ellipse(lean, ty, 41.5 * k * 0.68, ry * k * 0.6, 0, Math.PI * 1.05, Math.PI * 1.6)
      g.stroke()
      if (c.cloud > 0.02) {
        const a = stage.time * 1.5
        g.strokeStyle = `rgba(255,250,238,${(c.cloud * 0.85).toFixed(2)})`
        g.lineWidth = 3.4
        g.beginPath()
        g.ellipse(lean, ty, 41.5 * k * 0.42, ry * k * 0.42, 0, a, a + 2.4)
        g.stroke()
        g.beginPath()
        g.ellipse(lean, ty, 41.5 * k * 0.72, ry * k * 0.72, 0, a + 3.2, a + 4.9)
        g.stroke()
      }
      if (c.ripple > 0.02) {
        g.strokeStyle = `rgba(255,236,200,${(c.ripple * 0.5).toFixed(2)})`
        g.lineWidth = 1.8
        g.beginPath()
        g.ellipse(lean, ty, 41.5 * k * (1 - c.ripple * 0.7), ry * k * (1 - c.ripple * 0.7), 0, 0, TAU)
        g.stroke()
      }
      g.restore()
    }
    // The outside: cream above, dipped in colour below.
    const body = (): void => {
      g.beginPath()
      g.moveTo(-42, rimY)
      g.bezierCurveTo(-42, -26, -35, -4, -21, -3)
      g.quadraticCurveTo(0, 2, 21, -3)
      g.bezierCurveTo(35, -4, 42, -26, 42, rimY)
      g.ellipse(0, rimY, 42, ry, 0, 0, Math.PI, false)
      g.closePath()
    }
    body()
    g.fillStyle = '#f6efe0'
    g.fill()
    g.save()
    g.clip()
    g.beginPath()
    g.moveTo(-50, -27)
    g.bezierCurveTo(-24, -20, -10, -30, 8, -24)
    g.bezierCurveTo(22, -19, 36, -29, 50, -24)
    g.lineTo(50, 10)
    g.lineTo(-50, 10)
    g.closePath()
    g.fillStyle = HUES[c.hue]!
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.35)'
    g.beginPath()
    g.ellipse(-24, -30, 7, 20, 0.12, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(96,70,52,0.1)'
    g.beginPath()
    g.ellipse(34, -28, 12, 30, -0.1, 0, TAU)
    g.fill()
    g.restore()
    if (c.drip > 0.02) {
      g.strokeStyle = tea(c.mix, 1, 0.85 * Math.min(1, c.drip * 3))
      g.lineWidth = 4
      g.beginPath()
      g.moveTo(15, rimY + ry)
      g.lineTo(14, rimY + ry + 36 * Math.min(1, (1 - c.drip) * 3 + 0.2))
      g.stroke()
    }
    body()
    g.strokeStyle = INK
    g.lineWidth = 2
    g.stroke()
    g.beginPath()
    g.ellipse(0, rimY, 42, ry, 0, 0, TAU)
    g.stroke()
    g.restore()
  }

  const drawStream = (g: G, p: Pourer): void => {
    const drops = p.drops
    const n = drops.length
    if (n === 0) return
    const fill = p.geo.milk ? '#fffaf0' : 'rgba(178,98,30,0.95)'
    let i = 0
    while (i < n) {
      let j = i
      while (j + 1 < n && drops[j + 1]!.link) j++
      g.fillStyle = fill
      if (j === i) {
        const d = drops[i]!
        g.beginPath()
        g.ellipse(d.x, d.y, d.w * 0.5, d.w * 0.75, 0, 0, TAU)
        g.fill()
      } else {
        g.beginPath()
        for (let k = i; k <= j; k++) {
          const d = drops[k]!
          if (k === i) g.moveTo(d.x - d.w / 2, d.y)
          else g.lineTo(d.x - d.w / 2, d.y)
        }
        for (let k = j; k >= i; k--) {
          const d = drops[k]!
          g.lineTo(d.x + d.w / 2, d.y)
        }
        g.closePath()
        g.fill()
        if (p.geo.milk) {
          g.strokeStyle = 'rgba(150,136,110,0.5)'
          g.lineWidth = 1
          g.stroke()
        } else {
          g.strokeStyle = 'rgba(255,214,150,0.55)'
          g.lineWidth = 1.4
          g.beginPath()
          for (let k = i; k <= j; k++) {
            const d = drops[k]!
            if (k === i) g.moveTo(d.x - d.w * 0.2, d.y)
            else g.lineTo(d.x - d.w * 0.2, d.y)
          }
          g.stroke()
        }
        const end = drops[i]!
        g.beginPath()
        g.ellipse(end.x, end.y, end.w / 2, end.w * 0.6, 0, 0, TAU)
        g.fill()
      }
      i = j + 1
    }
  }

  const drawPourer = (g: G, p: Pourer): void => {
    const at = pose(p)
    if (at.x > W + 150) return
    const ground = p.target ? p.target.y + 22 : p.y
    shade(g, at.x + 4, ground + 2, (p.kind === 'pot' ? 92 : 44) * at.s, 0.34 - Math.min(0.2, (ground - at.y) * 0.004))
    g.save()
    g.translate(at.x, at.y)
    g.scale(at.s, at.s)
    g.translate(p.geo.px, p.geo.py)
    g.rotate(-at.a + p.sway.value * 0.5)
    g.translate(-p.geo.px, -p.geo.py)
    const frac = p.vol / p.cap
    const level = at.a - p.sway.value * 0.5 + p.slosh.value * 0.06
    if (p.kind === 'pot') {
      const b = POT_BELLY
      g.beginPath()
      g.ellipse(b.x, b.y, b.rx, b.ry, 0, 0, TAU)
      g.fillStyle = GLASS
      g.fill()
      if (frac > 0.004) {
        g.save()
        g.beginPath()
        g.ellipse(b.x, b.y, b.rx - 4.5, b.ry - 4.5, 0, 0, TAU)
        g.clip()
        g.translate(b.x, b.y)
        g.rotate(level)
        const ly = lerp(55, -40, frac ** 0.85)
        if (!teaFill) {
          teaFill = g.createLinearGradient(0, -50, 0, 70)
          teaFill.addColorStop(0, 'rgba(222,140,44,0.93)')
          teaFill.addColorStop(1, 'rgba(164,84,20,0.96)')
        }
        g.fillStyle = teaFill
        g.fillRect(-140, ly, 280, 220)
        // The surface, as wide as the belly is at that height.
        const half = 76 * Math.sqrt(Math.max(0.03, 1 - (ly / 58) ** 2))
        g.fillStyle = 'rgba(240,176,84,0.9)'
        g.beginPath()
        g.ellipse(0, ly, half, 4.5, 0, 0, TAU)
        g.fill()
        g.restore()
      }
      put(g, art.pot, 0, 0)
      // An idle glint: the glass catching the light, nothing more.
      const idle = stage.time - lastTouch - 6
      if (idle > 0 && p.held < 0 && frac > 0.2 && idle % 5 < 0.9) {
        const u = (idle % 5) / 0.9
        g.save()
        g.beginPath()
        g.ellipse(b.x, b.y, b.rx - 3, b.ry - 3, 0, 0, TAU)
        g.clip()
        g.translate(lerp(-110, 110, u), b.y)
        g.rotate(0.45)
        g.fillStyle = `rgba(255,255,255,${(Math.sin(u * Math.PI) * 0.5).toFixed(2)})`
        g.fillRect(-9, -90, 18, 180)
        g.restore()
      }
    } else {
      jugBody(g)
      g.fillStyle = GLASS
      g.fill()
      if (frac > 0.004) {
        g.save()
        jugBody(g, 3.5)
        g.clip()
        g.translate(0, -42)
        g.rotate(level)
        const ly = lerp(36, -30, frac)
        g.fillStyle = '#fffaf0'
        g.fillRect(-80, ly, 160, 120)
        g.fillStyle = 'rgba(200,188,160,0.5)'
        g.fillRect(-80, ly, 160, 2.5)
        g.restore()
      }
      put(g, art.jug, 0, 0)
    }
    g.restore()
  }

  const biscuitPath = (g: G, b: Biscuit, rx: number, ry: number): void => {
    g.beginPath()
    const n = 26
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU
      let px = Math.cos(a) * (1 + Math.sin(i * 2.9 + b.turn) * 0.03)
      let py = Math.sin(a) * (1 + Math.cos(i * 3.7 + b.turn) * 0.03)
      // Bites are taken out of the upper right, one beside the next.
      for (let k = 0; k < b.bites; k++) {
        const ba = -0.5 - k * 0.95
        const bx = Math.cos(ba) * 0.95
        const by = Math.sin(ba) * 0.95
        const d = Math.hypot(px - bx, py - by)
        if (d < 0.62) {
          const pull = 0.62 / Math.max(d, 0.05)
          px = bx + (px - bx) * pull
          py = by + (py - by) * pull
          const back = Math.hypot(px, py)
          if (back > 1) {
            px /= back
            py /= back
          }
        }
      }
      if (i === 0) g.moveTo(px * rx, py * ry)
      else g.lineTo(px * rx, py * ry)
    }
    g.closePath()
  }

  const drawBiscuit = (g: G, b: Biscuit): void => {
    const inHand = b.guest >= 0 && (guests[b.guest]!.state === 'bcarry' || guests[b.guest]!.state === 'nibble')
    const y = b.y - b.lift * LIFT
    const ry = inHand || b.held >= 0 ? 21 : 13
    if (!inHand) shade(g, b.x + 1, b.y + 3, 26 * b.s, 0.3 - b.lift * 0.1)
    g.save()
    g.translate(b.x, y - (inHand ? 0 : 6 * b.s))
    g.scale(b.s * (2 - b.bounce.value), b.s * b.bounce.value)
    g.rotate(b.sway.value)
    g.save()
    g.translate(0, 4)
    biscuitPath(g, b, 23, ry)
    g.fillStyle = '#b98a48'
    g.fill()
    g.restore()
    biscuitPath(g, b, 23, ry)
    g.fillStyle = '#e0b56e'
    g.fill()
    g.strokeStyle = 'rgba(140,96,44,0.7)'
    g.lineWidth = 1.8
    g.stroke()
    g.fillStyle = 'rgba(150,104,48,0.6)'
    for (let i = 0; i < 5; i++) {
      const a = b.turn + (i / 5) * TAU
      const px = Math.cos(a) * 11
      const py = Math.sin(a) * 11 * (ry / 23)
      if (b.bites > 0 && px > 0 && py < 2) continue
      g.beginPath()
      g.arc(px, py, 1.7, 0, TAU)
      g.fill()
    }
    g.restore()
  }

  const drawSponge = (g: G): void => {
    const y = sponge.y - sponge.lift * LIFT
    shade(g, sponge.x + 1, sponge.y + 2, 40 * sponge.s, 0.2 - sponge.lift * 0.08)
    const b = sponge.bounce.value
    put(g, art.sponge, sponge.x, y, sponge.sway.value, sponge.s * (2 - b), sponge.s * b)
    if (sponge.wet > 0.02) {
      g.fillStyle = `rgba(150,92,36,${(sponge.wet * 0.34).toFixed(2)})`
      g.beginPath()
      g.ellipse(sponge.x, y - 12 * sponge.s * b, 30 * sponge.s, 11 * sponge.s * b, 0, 0, TAU)
      g.fill()
    }
  }

  const drawThing = (g: G, t: Thing): void => {
    if (t.kind === 'cup') drawCup(g, t)
    else if (t.kind === 'biscuit') drawBiscuit(g, t)
    else if (t.kind === 'sponge') drawSponge(g)
    else drawPourer(g, t)
  }

  const drawGuest = (g: G, gs: Guest): void => {
    const look = LOOKS[gs.kind]!
    const time = stage.time
    const sleepy = ease.inOutQuad(rest)
    const breath = gs.kind === 2 ? 0 : Math.sin(time * (1.5 - sleepy * 0.5) + gs.i * 2.1)
    put(g, art.bodies[gs.kind]!, gs.x, FAR + 2, 0, 1, 1 + breath * 0.008)
    const nod = gs.nod.value
    const headY = FAR + look.neckY - breath * 1.2 + nod * 5 + sleepy * 4 - gs.shut * 3
    const rot = gs.lean.value * 0.12 + sleepy * (gs.i === 1 ? -0.07 : 0.06) + (gs.kind === 1 ? gs.shut * -0.05 : 0)
    g.save()
    g.translate(gs.x, headY)
    g.rotate(rot)
    put(g, art.heads[gs.kind]!, 0, 0)
    // Eyes: two dots, a line when shut.
    const open = (1 - gs.blink) * (1 - gs.shut) * (1 - sleepy)
    const ex = gs.lookX * 3
    const ey = gs.lookY * 2.4
    g.fillStyle = '#3d2f2a'
    g.strokeStyle = '#3d2f2a'
    g.lineWidth = 2.4
    for (const side of [-1, 1]) {
      const x = side * look.eyeX + ex
      const y = look.eyeY + ey
      if (open > 0.25) {
        g.beginPath()
        g.ellipse(x, y, look.eyeR, look.eyeR * open, 0, 0, TAU)
        g.fill()
        if (gs.kind === 1) {
          g.fillStyle = 'rgba(255,255,255,0.7)'
          g.beginPath()
          g.arc(x - 1.4, y - 1.6, 1.3, 0, TAU)
          g.fill()
          g.fillStyle = '#3d2f2a'
        }
      } else {
        g.beginPath()
        g.moveTo(x - look.eyeR * 1.2, y + 1)
        g.quadraticCurveTo(x, y + 4, x + look.eyeR * 1.2, y + 1)
        g.stroke()
      }
    }
    g.restore()
  }

  const drawArm = (g: G, gs: Guest, side: number): void => {
    const look = LOOKS[gs.kind]!
    const sx = gs.x + side * look.shoulderX
    const sy = FAR + look.shoulderY
    const hx = side < 0 ? gs.lx.value : gs.rx.value
    const hy = side < 0 ? gs.ly.value : gs.ry.value
    const mx = (sx + hx) / 2 + side * 16
    const my = (sy + hy) / 2 + 12
    for (const pass of [0, 1]) {
      g.strokeStyle = pass === 0 ? INK : look.arm
      g.lineWidth = pass === 0 ? look.armW + 3.4 : look.armW
      g.beginPath()
      g.moveTo(sx, sy)
      g.quadraticCurveTo(mx, my, hx, hy)
      g.stroke()
    }
    g.beginPath()
    g.arc(hx, hy, look.handR, 0, TAU)
    g.fillStyle = look.hand
    g.fill()
    g.strokeStyle = INK
    g.lineWidth = 2
    g.stroke()
    if (gs.kind === 1) {
      g.beginPath()
      g.ellipse(hx, hy + 2, look.handR * 0.55, look.handR * 0.45, 0, 0, TAU)
      g.fillStyle = '#e2c49c'
      g.fill()
    } else if (gs.kind === 2) {
      g.beginPath()
      g.arc(sx, sy, 3.2, 0, TAU)
      g.fillStyle = 'rgba(130,96,60,0.8)'
      g.fill()
    }
  }

  const drawChime = (g: G): void => {
    const x = 1092
    g.save()
    g.translate(x, 30)
    g.rotate(chime.value)
    g.strokeStyle = 'rgba(96,70,52,0.7)'
    g.lineWidth = 1.6
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(0, 44)
    g.stroke()
    g.beginPath()
    g.ellipse(0, 48, 30, 7, 0, 0, TAU)
    g.fillStyle = '#c6935c'
    g.fill()
    g.strokeStyle = 'rgba(92,60,34,0.75)'
    g.lineWidth = 2
    g.stroke()
    const lengths = [66, 84, 58, 76]
    lengths.forEach((len, i) => {
      const tx = -21 + i * 14
      const swing = chime.vel * 0.05 * (i % 2 ? 1 : -1)
      g.save()
      g.translate(tx, 52)
      g.rotate(swing)
      g.strokeStyle = 'rgba(96,70,52,0.6)'
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(0, 10)
      g.stroke()
      g.beginPath()
      g.roundRect(-4.5, 10, 9, len, 3)
      g.fillStyle = i % 2 ? '#dcc28e' : '#d2b47c'
      g.fill()
      g.strokeStyle = 'rgba(110,84,50,0.7)'
      g.lineWidth = 1.6
      g.stroke()
      g.restore()
    })
    g.strokeStyle = 'rgba(96,70,52,0.6)'
    g.lineWidth = 1.2
    g.beginPath()
    g.moveTo(0, 52)
    g.lineTo(chime.vel * 3, 154)
    g.stroke()
    put(g, art.leaf[1]!, chime.vel * 3, 166, 0.3 + chime.vel * 0.3, 1.1)
    g.restore()
  }

  const draw = (g: G): void => {
    const time = stage.time
    g.drawImage(art.top.c, 0, 0, W, FAR)
    drawChime(g)
    for (const gs of guests) drawGuest(g, gs)
    g.drawImage(art.low.c, 0, FAR, W, H - FAR)

    // What the cloth has caught: tea, crumbs, a leaf.
    for (const st of stains) {
      const rad = (14 + 64 * Math.sqrt(Math.min(st.amt, 1.3))) * depth(st.y)
      const n = st.shape.length
      for (const pass of [0, 1]) {
        g.beginPath()
        for (let i = 0; i <= n; i++) {
          const a = ((i % n) / n) * TAU
          const b = (((i + 1) % n) / n) * TAU
          const ra = rad * st.shape[i % n]! * (pass ? 0.72 : 1)
          const rb = rad * st.shape[(i + 1) % n]! * (pass ? 0.72 : 1)
          const ax = st.x + Math.cos(a) * ra
          const ay = st.y + Math.sin(a) * ra * 0.4
          const bx = st.x + Math.cos(b) * rb
          const by = st.y + Math.sin(b) * rb * 0.4
          if (i === 0) g.moveTo((ax + bx) / 2, (ay + by) / 2)
          else g.quadraticCurveTo(ax, ay, (ax + bx) / 2, (ay + by) / 2)
        }
        g.closePath()
        const k = Math.min(1, st.amt * 6 + 0.25)
        g.fillStyle = st.milk > 0.5 ? `rgba(206,196,176,${(0.3 * k).toFixed(2)})` : `rgba(176,116,52,${((pass ? 0.2 : 0.27) * k).toFixed(2)})`
        g.fill()
        if (pass === 0) {
          g.strokeStyle = st.milk > 0.5 ? `rgba(170,160,140,${(0.3 * k).toFixed(2)})` : `rgba(150,92,36,${(0.3 * k).toFixed(2)})`
          g.lineWidth = 1.6
          g.stroke()
        }
      }
    }
    for (const d of debris) {
      if (d.leaf >= 0) {
        shade(g, d.x, d.y + 3, 16, 0.2)
        put(g, art.leaf[d.leaf]!, d.x, d.y, d.rot + 1.4, 0.95, 0.6)
      } else {
        g.fillStyle = '#c8974e'
        g.beginPath()
        g.ellipse(d.x, d.y, d.size, d.size * 0.6, d.rot, 0, TAU)
        g.fill()
      }
    }
    for (const pt of pats) {
      const u = pt.age / 0.5
      g.strokeStyle = `rgba(140,110,76,${((1 - u) * 0.3).toFixed(2)})`
      g.lineWidth = 2
      g.beginPath()
      g.ellipse(pt.x, pt.y, 12 + u * 30, (12 + u * 30) * 0.4, 0, 0, TAU)
      g.stroke()
    }

    places.forEach((pl) => {
      const s = depth(pl.y)
      put(g, art.saucer, pl.x, pl.y, 0, s)
      if (pl.puddle > 0.004) {
        const k = Math.min(1, pl.puddle / 0.3)
        g.fillStyle = tea(clamp(pl.milk * 3, 0, 1), 1, 0.8)
        g.beginPath()
        g.ellipse(pl.x, pl.y + 1, (27 + 24 * k) * s, (27 + 24 * k) * s * 0.3, 0, 0, TAU)
        g.fill()
      }
    })

    const trayX = tray.dx + tray.wob.value
    if (trayX < W) {
      put(g, art.tray, trayX, 0)
      put(g, art.plate, PLATE.x + trayX, PLATE.y)
    }

    // Arms reach over the table; a cup or biscuit in a guest's hands goes
    // with them.
    for (const gs of guests) {
      const c = gs.cup
      const b = gs.bis
      const carrying = b && (gs.state === 'bcarry' || gs.state === 'nibble')
      if (c && c.guest === gs.i) drawCup(g, c)
      if (carrying && gs.kind === 2) drawBiscuit(g, b)
      drawArm(g, gs, -1)
      drawArm(g, gs, 1)
      if (carrying && gs.kind !== 2) drawBiscuit(g, b)
    }

    resting.length = 0
    lifted.length = 0
    for (const t of all) {
      if (t.kind === 'cup' && t.guest >= 0) continue
      if (t.kind === 'biscuit' && t.guest >= 0 && (guests[t.guest]!.state === 'bcarry' || guests[t.guest]!.state === 'nibble')) continue
      if (t.held >= 0 || t.lift >= 0.01) lifted.push(t)
      else resting.push(t)
    }
    resting.sort(byDepth)
    lifted.sort(byDepth)
    for (const t of resting) drawThing(g, t)
    for (const t of lifted) drawThing(g, t)
    drawStream(g, pot)
    drawStream(g, jug)

    for (const pf of puffs) {
      const u = pf.age / pf.life
      const a = Math.sin(Math.min(1, u * 1.15) * Math.PI) * 0.27
      const size = (16 + u * 26) * pf.size
      g.globalAlpha = a
      g.drawImage(art.puff.c, pf.x + Math.sin(pf.age * 2.4 + pf.ph) * 9 * u - size, pf.y - size * 1.25, size * 2, size * 2.5)
    }
    g.globalAlpha = 1

    // Light through the leaves, moving slowly over everything.
    for (const d of dapples) {
      const x = d.x + Math.sin(time * 0.17 + d.ph) * 30 + wind * 14
      const y = d.y + Math.cos(time * 0.13 + d.ph * 1.7) * 14
      g.globalAlpha = d.dark ? 0.06 : 0.28 + Math.sin(time * 0.4 + d.ph) * 0.06
      g.drawImage(d.dark ? art.shade.c : art.light.c, x - d.rx, y - d.rx * 0.42, d.rx * 2, d.rx * 0.84)
    }
    g.globalAlpha = 1
    if (rest > 0.01) {
      g.fillStyle = `rgba(255,186,104,${(rest * 0.11).toFixed(3)})`
      g.fillRect(0, 0, W, H)
    }

    for (const f of falling) {
      const fade = f.y >= f.land ? clamp(1 - (f.rest - 3) / 2, 0, 1) : 1
      g.globalAlpha = fade
      put(g, art.leaf[f.which]!, f.x, f.y, f.rot + 1.2, 0.9, f.y >= f.land ? 0.55 : 0.9)
    }
    g.globalAlpha = 1
    for (const b of boughs) put(g, art.clusters[b.which]!, b.x, b.y, Math.sin(time * 0.6 + b.ph) * 0.05 + wind * 0.07, b.size)
  }

  // ------------------------------------------------------------ touch

  const down = (p: Pointer): void => {
    lastTouch = stage.time
    const t = pick(p.x, p.y)
    if (t) {
      grab(t, p)
      return
    }
    // The tray itself.
    const onTrayWood = p.x > TRAY.x0 + tray.dx - 30 && p.x < TRAY.x1 + tray.dx + 30 && p.y > TRAY.y0 - 16 && p.y < TRAY.y1 + 20
    if (tray.mode === 'peek' && (onTrayWood || (p.x > W - 130 && p.y > TRAY.y0 - 110 && p.y < TRAY.y1 + 20))) {
      tray.moving = false
      grabs.set(p.id, { kind: 'tray', startX: p.x, startDx: tray.dx, moved: 0 })
      tray.wob.kick(-60)
      snd.wood(0.6)
      return
    }
    if (tray.mode === 'home' && onTrayWood) {
      snd.wood(0.7)
      if (tidy() && used) {
        tray.moving = false
        grabs.set(p.id, { kind: 'tray', startX: p.x, startDx: tray.dx, moved: 0 })
      } else {
        tray.wob.kick(30)
        if (Math.hypot(p.x - PLATE.x - tray.dx, (p.y - PLATE.y) * 2.4) < 92) snd.tink(0.6)
        // Whatever belongs on the tray and is still out stirs where it stands.
        if (used) {
          for (const c of cups) if (!c.onTray && c.landed && c.guest < 0) c.sway.kick(c.x < p.x ? 1.1 : -1.1)
          for (const v of [pot, jug]) if (!v.onTray && v.landed) v.slosh.kick(2.4)
          if (!tidy()) snd.glass(0.35)
        }
      }
      return
    }
    if (Math.hypot(p.x - 1092, p.y - 120) < 84) {
      chime.kick(p.x < 1092 ? 1.6 : -1.6)
      const first = Math.floor(rnd(-2, 3))
      snd.chime(first, 0.055)
      snd.chime(first + 2, 0.04, 0.16)
      snd.chime(first - 1, 0.03, 0.4)
      return
    }
    for (const gs of guests) {
      if (Math.abs(p.x - gs.x) < 92 && p.y > 70 && p.y < FAR + 6) {
        gs.lean.kick(p.x < gs.x ? 2.4 : -2.4)
        gs.nod.kick(1.4)
        gs.blink = 1
        if (gs.kind === 2) snd.tok()
        else snd.pat()
        return
      }
    }
    if (onCloth(p.x, p.y)) {
      pats.push({ x: p.x, y: p.y, age: 0 })
      if (places.some((pl) => Math.hypot(pl.x - p.x, (pl.y - p.y) * 2.6) < 60)) snd.tink(0.6)
      else snd.pat()
      grabs.set(p.id, { kind: 'brush', acc: 0 })
      return
    }
    // Anywhere else stirs the tree: a rustle, and a leaf lets go.
    snd.rustle()
    for (const b of boughs) if (Math.abs(b.x - p.x) < 200) b.ph += 0.9
    dropLeaf(clamp(p.x + rnd(-40, 40), 30, W - 30))
  }

  const move = (p: Pointer): void => {
    const gr = grabs.get(p.id)
    if (!gr) return
    lastTouch = stage.time
    if (gr.kind === 'thing') {
      const t = gr.thing
      if ((t.kind === 'pot' || t.kind === 'jug') && t.target) {
        // Draw the finger down and it tips; ease back up and it rights itself.
        // Pulling on well past full tilt takes the vessel away from the cup.
        const want = t.tilt + p.dy / (92 * t.target.s)
        t.over = want > 1 ? t.over + (want - 1) * 92 : p.dy < 0 ? 0 : t.over
        t.tilt = clamp(want, 0, 1)
        t.still = 0
      }
    } else if (gr.kind === 'tray') {
      gr.moved += Math.abs(p.dx)
      const want = gr.startDx + (p.x - gr.startX)
      shiftTray(tray.mode === 'peek' ? clamp(want, 0, PEEK + 20) : Math.max(0, want))
    } else {
      // A bare hand on the cloth brushes crumbs and leaves along.
      gr.acc += Math.hypot(p.dx, p.dy)
      let swept = false
      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i]!
        if (Math.hypot(d.x - p.x, (d.y - p.y) * 1.5) > 44) continue
        d.x += p.dx * 1.15 + rnd(-1.5, 1.5)
        d.y += p.dy * 1.15 + rnd(-1, 1)
        d.rot += p.dx * 0.03
        swept = true
        if (!onCloth(d.x, d.y)) debris.splice(i, 1)
      }
      if (gr.acc > 60) {
        gr.acc = 0
        if (swept) snd.brush()
      }
    }
  }

  const up = (p: Pointer): void => {
    const gr = grabs.get(p.id)
    grabs.delete(p.id)
    if (!gr) return
    if (gr.kind === 'thing') {
      if (gr.thing.held === p.id) letGo(gr.thing)
    } else if (gr.kind === 'tray') {
      tray.moving = true
      if (tray.mode === 'peek') tray.to = tray.dx < PEEK - 250 ? 0 : PEEK
      else tray.to = tray.dx > 230 ? GONE : 0
    }
  }

  return { update, draw, down, move, up }
}

export const proto: Proto = {
  meta: {
    key: 'tea-time',
    name: 'Tea Time',
    emoji: '🫖',
    ages: [3, 7],
    set: 'gentle',
    pitch: 'Lay a cup for the doll, the bear and the wooden rabbit, pour the tea, add milk, hand round biscuits, mop up what spills, and clear away.',
    howTo: 'Put a cup on a saucer. Carry the teapot to the cup and hold it there, then draw your finger down to tip it and back up to stop. The sponge wipes spills. When the cups are back on the tray, slide the tray away to the right, and pull the fresh one in.',
    basedOn: 'Montessori practical life (pouring, table setting, wiping a spill); Waldorf doll play',
    whyFun: 'The pour is in the hand: the stream follows the tilt, the tea rises in the cup, and the sound of the filling cup climbs until it is time to stop.',
  },
  create,
}
