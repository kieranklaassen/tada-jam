// The park: what lives in it, how big each thing is, and where it all goes.
// World units are bigger than the screen; the camera in index.ts zooms out a
// step each time the hole sizes up, until the whole park is in view.

export const WW = 2810
export const WH = 1952
// Ground foreshortening: a circle on the ground is drawn this much flatter.
export const K = 0.62
// Hole radius at the start of each size level, and the zoom that goes with it.
export const R = [36, 58, 92, 145, 225, 340] as const
export const Z = [1.9, 1.45, 1.1, 0.82, 0.6, 0.42] as const
export const TOP = R.length - 1
export const START = { x: WW / 2, y: 1100 }
export const POND = { x: 2290, y: 1230, rx: 320, ry: 180 }
export const SAND = { x: 520, y: 1350, rx: 300, ry: 175 }
export const PLAZA = { x: WW / 2, y: 690, rx: 520, ry: 235 }
export const ROAD = { top: WH - 300, bottom: WH - 80 }
// Footprint radius as a share of the drawn size.
const FOOT = 0.34
// How far from the start each size must stand (0 is anywhere).
const CLEAR = [0, 0, 400, 520, 640, 0]

export type Move = 'wander' | 'flee' | 'roll' | 'swim'
export type Cue = 'yelp' | 'squeak' | 'quack' | 'honk' | 'siren' | 'strum' | 'bell' | 'leaf' | 'splash' | 'moo' | 'meow' | 'ribbit' | 'boing' | 'jingle'

export interface Kind {
  e: string
  tier: number
  size: number
  move?: Move
  cue?: Cue
  cry?: string
  // How many copies go in the bag the layout draws from (default 2).
  n?: number
  // First round it shows up in.
  from?: number
  road?: boolean
}

const KINDS: Kind[] = [
  { e: '🍓', tier: 0, size: 50, n: 4 },
  { e: '🫐', tier: 0, size: 42, n: 3 },
  { e: '🍒', tier: 0, size: 48, n: 3 },
  { e: '🍪', tier: 0, size: 52, n: 4 },
  { e: '🥜', tier: 0, size: 38 },
  { e: '🍬', tier: 0, size: 42, n: 3 },
  { e: '🧀', tier: 0, size: 48 },
  { e: '🍇', tier: 0, size: 54 },
  { e: '🥨', tier: 0, size: 52 },
  { e: '🐜', tier: 0, size: 40, move: 'wander', n: 3 },
  { e: '🐞', tier: 0, size: 40, move: 'wander' },
  { e: '🍂', tier: 0, size: 46, n: 5, from: 1 },
  { e: '❄️', tier: 0, size: 44, n: 5, from: 2 },

  { e: '🥪', tier: 1, size: 98, n: 3 },
  { e: '🍎', tier: 1, size: 84, n: 3 },
  { e: '🧁', tier: 1, size: 90 },
  { e: '🍩', tier: 1, size: 88, n: 3 },
  { e: '🍔', tier: 1, size: 96 },
  { e: '🥤', tier: 1, size: 100 },
  { e: '🍕', tier: 1, size: 96 },
  { e: '⚽', tier: 1, size: 84, move: 'roll', cue: 'boing' },
  { e: '🐿️', tier: 1, size: 94, move: 'flee', cue: 'squeak', cry: 'EEK!' },
  { e: '🐸', tier: 1, size: 86, move: 'flee', cue: 'ribbit', cry: 'RIBBIT!', n: 1 },
  { e: '🐧', tier: 1, size: 96, move: 'flee', cue: 'squeak', cry: 'MEEP!', from: 2 },

  { e: '🧺', tier: 2, size: 160, n: 3 },
  { e: '🍉', tier: 2, size: 150 },
  { e: '🧸', tier: 2, size: 150 },
  { e: '🪣', tier: 2, size: 134 },
  { e: '🛹', tier: 2, size: 144, n: 1 },
  { e: '🎸', tier: 2, size: 166, cue: 'strum', n: 1 },
  { e: '🏀', tier: 2, size: 132, move: 'roll', cue: 'boing', n: 1 },
  { e: '🐕', tier: 2, size: 166, move: 'wander', cue: 'yelp', cry: 'WOOF?!', n: 3 },
  { e: '🐈', tier: 2, size: 140, move: 'flee', cue: 'meow', cry: 'MEOW!', n: 1 },
  { e: '🎃', tier: 2, size: 150, from: 1 },
  { e: '⛄', tier: 2, size: 160, from: 2 },

  { e: '🪑', tier: 3, size: 210, n: 3 },
  { e: '🚲', tier: 3, size: 255, cue: 'bell' },
  { e: '⛱️', tier: 3, size: 265 },
  { e: '🛒', tier: 3, size: 225, n: 1 },
  { e: '🛴', tier: 3, size: 220, cue: 'bell', n: 1 },
  { e: '⛺', tier: 3, size: 265, n: 1 },
  { e: '🗑️', tier: 3, size: 200, n: 1 },
  { e: '🐄', tier: 3, size: 250, move: 'wander', cue: 'moo', cry: 'MOO?!', n: 1, from: 1 },

  { e: '🌳', tier: 4, size: 410, cue: 'leaf', n: 4 },
  { e: '🌲', tier: 4, size: 400, cue: 'leaf', n: 2 },
  { e: '⛲', tier: 4, size: 370, cue: 'splash', n: 1 },
  { e: '🎄', tier: 4, size: 400, cue: 'jingle', n: 2, from: 2 },
  { e: '🚗', tier: 4, size: 300, cue: 'honk', cry: 'BEEP!', road: true },
  { e: '🚙', tier: 4, size: 310, cue: 'honk', cry: 'BEEP BEEP!', road: true },
  { e: '🚌', tier: 4, size: 390, cue: 'honk', cry: 'HONK!', road: true },
  { e: '🚓', tier: 4, size: 300, cue: 'siren', cry: 'WEE-OO!', road: true },
  { e: '🍦', tier: 4, size: 330, cue: 'jingle', road: false, n: 1 },

  { e: '🎡', tier: 5, size: 580, cue: 'jingle' },
  { e: '🎪', tier: 5, size: 640, cue: 'jingle' },
]

// One per park, tucked away somewhere: the rare thing to hope for.
export const GEM = '💎'
const GEM_KIND: Kind = { e: GEM, tier: 1, size: 80 }

const DUCK: Kind = { e: '🦆', tier: 2, size: 132, move: 'swim', cue: 'quack', cry: 'QUACK!' }

// What the meter shows as "you can eat this next".
export const NEXT = ['🍓', '🥪', '🧺', '🚲', '🌳', '🎪'] as const

export interface Item {
  k: Kind
  tier: number
  size: number
  // Footprint radius on the ground.
  s: number
  x: number
  y: number
  homeX: number
  homeY: number
  state: 'idle' | 'fall' | 'gone'
  // Fall progress 0..1, where it started, how long it takes, which way it spins.
  t: number
  fromX: number
  fromY: number
  dur: number
  spin: number
  // Seconds until it pops in (or, in the final gulp, until it is sucked in).
  delay: number
  pop: number
  wob: number
  lean: number
  phase: number
  hop: number
  hopDelay: number
  vx: number
  vy: number
  flip: number
  timer: number
  alarmed: boolean
  roll: number
}

export interface Park {
  items: Item[]
  need: number[]
  tufts: { x: number; y: number }[]
  flowers: { x: number; y: number; c: number }[]
}

function inEllipse(x: number, y: number, e: { x: number; y: number; rx: number; ry: number }, pad: number): boolean {
  const dx = (x - e.x) / (e.rx + pad)
  const dy = (y - e.y) / (e.ry + pad * K)
  return dx * dx + dy * dy < 1
}

// True when a thing of size `ss` standing at (sx, sy) would be hidden behind
// the picture of a bigger thing standing at (bx, by).
function hides(bx: number, by: number, bs: number, sx: number, sy: number, ss: number): boolean {
  return sy < by + 4 && sy > by - bs * 0.8 && Math.abs(sx - bx) < bs * 0.42 + ss * 0.3
}

export function buildPark(rand: () => number, round: number): Park {
  const items: Item[] = []
  const rr = (a: number, b: number) => a + rand() * (b - a)
  // A stand-in for the hole's starting spot, so nothing big lands on it.
  const spots: { x: number; y: number; size: number; s: number }[] = [{ x: START.x, y: START.y, size: 150, s: 70 }]

  const make = (k: Kind, x: number, y: number): Item => {
    const item: Item = {
      k,
      tier: k.tier,
      size: k.size,
      s: k.size * FOOT,
      x,
      y,
      homeX: x,
      homeY: y,
      state: 'idle',
      t: 0,
      fromX: x,
      fromY: y,
      dur: 0.5,
      spin: rand() < 0.5 ? -1 : 1,
      delay: Math.hypot(x - START.x, y - START.y) / 1900 + rand() * 0.25,
      pop: 0,
      wob: 0,
      lean: 0,
      phase: rand() * 6.28,
      hop: 0,
      hopDelay: 0,
      vx: 0,
      vy: 0,
      flip: 1,
      timer: rand() * 2,
      alarmed: false,
      roll: 0,
    }
    items.push(item)
    spots.push(item)
    return item
  }

  const blocked = (k: Kind, x: number, y: number): boolean => {
    const s = k.size * FOOT
    if (k.move !== 'swim' && inEllipse(x, y, POND, s + 24)) return true
    if (!k.road && y > ROAD.top - 10) return true
    // Keep the first view about food: big things stand back from the start.
    const clear = CLEAR[k.tier] ?? 0
    if (clear > 0 && Math.hypot(x - START.x, (y - START.y) / 0.7) < clear) return true
    // Nothing bigger than a crumb stands in front of the hole's first spot.
    if (k.tier >= 1 && y > START.y - 20 && y - k.size * 0.95 < START.y + 40 && Math.abs(x - START.x) < k.size * 0.45 + 60) return true
    // Nothing tall pokes up into the first view from below it.
    if (k.tier >= 3 && y > START.y && y - k.size * 0.9 < START.y + 250 && Math.abs(x - START.x) < 420) return true
    for (const q of spots) {
      const dx = q.x - x
      const dy = (q.y - y) / K
      const gap = (s + q.s) * 1.1 + 10
      if (dx * dx + dy * dy < gap * gap) return true
      if (q.size > k.size * 1.3 && hides(q.x, q.y, q.size, x, y, k.size)) return true
      if (k.size > q.size * 1.3 && hides(x, y, k.size, q.x, q.y, q.size)) return true
    }
    return false
  }

  const tryPlace = (k: Kind, hx: number, hy: number, cx = START.x, cy = START.y): boolean => {
    const mx = k.size * 0.46 + 16
    for (let i = 0; i < 50; i++) {
      const x = Math.min(WW - mx, Math.max(mx, rr(cx - hx, cx + hx)))
      const y = Math.min(ROAD.top - 20, Math.max(Math.max(130, k.size * 0.92), rr(cy - hy, cy + hy)))
      if (blocked(k, x, y)) continue
      make(k, x, y)
      return true
    }
    return false
  }

  const bag = (tier: number, filter: (k: Kind) => boolean = () => true): (() => Kind) => {
    const pool: Kind[] = []
    for (const k of KINDS) {
      if (k.tier !== tier || (k.from ?? 0) > round || !filter(k)) continue
      // A thing that first shows up this round is the round's novelty.
      const copies = (k.n ?? 2) * (k.from !== undefined && k.from === round ? 2 : 1)
      for (let i = 0; i < copies; i++) pool.push(k)
    }
    let left: Kind[] = []
    return () => {
      if (left.length === 0) {
        left = [...pool]
        for (let i = left.length - 1; i > 0; i--) {
          const j = Math.floor(rand() * (i + 1))
          ;[left[i], left[j]] = [left[j]!, left[i]!]
        }
      }
      return left.pop()!
    }
  }

  const dense = 1 + Math.min(round, 2) * 0.22
  const byE = (e: string) => KINDS.find((k) => k.e === e)!

  // The two giants have fixed spots.
  make(byE('🎪'), PLAZA.x, PLAZA.y + 40)
  make(byE('🎡'), 560, 800)

  // Traffic along the road.
  const cars = bag(4, (k) => k.road === true)
  const slots = [330, 980, 1700, 2380]
  for (const slot of slots) {
    const k = cars()
    make(k, slot + rr(-90, 90), WH - 150 + rr(-25, 25))
  }

  // Ducks on the pond.
  for (let i = 0; i < 3; i++) {
    const duck = make(DUCK, POND.x, POND.y)
    duck.phase = (i / 3) * 6.28 + rr(0, 0.8)
  }

  const big = bag(4, (k) => !k.road)
  for (let i = 0; i < Math.round(7 * dense); i++) tryPlace(big(), WW / 2, WH / 2, WW / 2, WH / 2)

  const t3 = bag(3)
  for (let i = 0; i < Math.round(13 * dense); i++) tryPlace(t3(), 1000, 640)

  const t2 = bag(2)
  for (let i = 0; i < Math.round(11 * dense); i++) tryPlace(t2(), 730, 480)
  for (let i = 0; i < 3; i++) tryPlace(t2(), WW / 2, WH / 2, WW / 2, WH / 2)

  // The gem hides out toward an edge of the park.
  for (let i = 0; i < 30; i++) {
    const a = rr(0, 6.28)
    if (tryPlace(GEM_KIND, 60, 60, WW / 2 + Math.cos(a) * rr(700, 1200), START.y + Math.sin(a) * rr(350, 600))) break
  }

  const t1 = bag(1)
  for (let i = 0; i < Math.round(15 * dense); i++) tryPlace(t1(), 540, 370)
  for (let i = 0; i < 7; i++) tryPlace(t1(), 1100, 700)

  // Crumbs: a ring right beside the hole, a cloud around it, a few far off.
  const t0 = bag(0)
  const still = bag(0, (k) => !k.move)
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * 6.28 + rr(-0.25, 0.25)
    const d = rr(100, 165)
    const k = still()
    const x = START.x + Math.cos(a) * d
    const y = START.y + Math.sin(a) * d * K
    if (!blocked(k, x, y)) make(k, x, y)
  }
  for (let i = 0; i < Math.round(24 * dense); i++) tryPlace(t0(), 340, 235)
  for (let i = 0; i < 16; i++) tryPlace(t0(), 1100, 700)

  const count = [0, 0, 0, 0, 0, 0]
  for (const item of items) count[item.tier]!++
  const cap = [11, 10, 9, 8, 6, 1]
  const need = count.map((n, tier) => Math.max(2, Math.min(cap[tier]!, Math.ceil(n * 0.6))))

  const tufts: Park['tufts'] = []
  for (let i = 0; i < 340; i++) {
    const x = rr(20, WW - 20)
    const y = rr(20, WH - 20)
    if (inEllipse(x, y, POND, 20) || inEllipse(x, y, PLAZA, 20) || inEllipse(x, y, SAND, 20) || (y > ROAD.top - 20 && y < ROAD.bottom + 20)) continue
    tufts.push({ x, y })
  }
  const flowers: Park['flowers'] = []
  for (let i = 0; i < 40; i++) {
    const cx = rr(60, WW - 60)
    const cy = rr(60, ROAD.top - 60)
    const c = Math.floor(rand() * 3)
    for (let j = 0; j < 5; j++) {
      const x = cx + rr(-46, 46)
      const y = cy + rr(-28, 28)
      if (inEllipse(x, y, POND, 20) || inEllipse(x, y, PLAZA, 10) || inEllipse(x, y, SAND, 10)) continue
      flowers.push({ x, y, c })
    }
  }

  return { items, need, tufts, flowers }
}
