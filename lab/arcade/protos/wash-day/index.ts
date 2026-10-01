// Wash Day: a basket of muddy play clothes, a wooden tub, a washboard, a line
// between two trees. Rub, wring, peg, wait for the sun, fold, carry indoors.
// Nothing here counts, hurries or praises; the cloth and the water answer.

import { TAU, clamp, damp, dist, ease, lerp, rnd, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import {
  BASKET_RX,
  BLANKET,
  BOARD_H,
  BOARD_TOP,
  BOARD_W,
  DOOR,
  LINE_X0,
  LINE_X1,
  LINE_Y,
  PAD,
  PATTERNS,
  SEASONS,
  SOAP_HOME,
  TX,
  WATER_RX,
  WATER_RY,
  WATER_Y,
  drawBird,
  drawPeg,
  layer,
  paintBag,
  paintBasketBack,
  paintBasketFront,
  paintBoard,
  paintCloud,
  paintCrown,
  paintDoor,
  paintGardenGrass,
  paintGardenLand,
  paintGardenThings,
  paintGarment,
  paintMud,
  paintTubBack,
  paintTubFront,
  paintVeil,
  rgba,
} from './art.ts'
import type { Kind, Layer, MudGrid } from './art.ts'

// Each new wash day turns the season on, so "again" is the same work in a
// different light. Kept at module level so it survives the stage's restart;
// only the child opening the door moves it on.
let dayNumber = 0
let doorOpened = false

const SLOTS = [340, 510, 680, 850]
const BAG_X = 196
const SAG = 26
// Where the top of a garment sits while it lies on the washboard.
const TUB_TOP = 486
// Wetness after a good wringing; above this the cloth is sopping.
const WRUNG = 0.45
// Cloth laid flat on the ground is drawn a little smaller than on the line.
const GS = 0.88
const BASKET_HOME = { x: 925, y: 606 }
const DOOR_IN = { x: DOOR.x + DOOR.w / 2, y: 596 }
const PALETTE = ['#c9654a', '#6f93bd', '#dd8f96', '#e3b04f', '#8fb07f', '#a08cc0', '#efe2c2']

type Place = 'basket' | 'held' | 'tub' | 'rack' | 'line' | 'ground' | 'glide'

interface Glide {
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
  dur: number
  lift: number
  flat: boolean
  done: () => void
}

interface Sud {
  x: number
  y: number
  r: number
  life: number
}

interface Garment {
  kind: Kind
  color: string
  w: number
  h: number
  cw: number
  ch: number
  anchors: [number, number][]
  base: Layer
  mud: Layer
  tex: Layer
  back: Layer
  grid: MudGrid
  mudSum: number
  mudAlpha: number
  clean: boolean
  wet: number
  wetQ: number
  dirty: boolean
  place: Place
  // Top middle while hanging or held; the centre while lying flat.
  x: number
  y: number
  glide: Glide | null
  holder: Pointer | null
  slot: number
  pegs: boolean[]
  pivot: number
  drape: Spring
  tilt: Spring
  swing: Spring
  tw: Spring
  rubY: number
  acc: number
  dripAt: number
  fold: number
  foldP: number
  foldTo: number
  foldSide: -1 | 1
  flat: HTMLCanvasElement
  flatBack: HTMLCanvasElement
  fw: number
  fh: number
  rot: number
  phase: number
  suds: Sud[]
  tugX: number
  tugTo: number
}

type Grab =
  | { kind: 'carry'; gm: Garment }
  | { kind: 'rub'; gm: Garment; travel: number }
  | { kind: 'wring'; gm: Garment }
  | { kind: 'fold'; gm: Garment; travel: number }
  | { kind: 'tug'; gm: Garment }
  | { kind: 'soap' }
  | { kind: 'peg'; x: number; y: number }
  | { kind: 'basket'; dx: number; dy: number }
  | { kind: 'water'; travel: number }
  | { kind: 'idle' }

interface Drop {
  x: number
  y: number
  vx: number
  vy: number
  land: number
  inTub: boolean
}

interface Ripple {
  x: number
  y: number
  age: number
  size: number
}

interface Bubble {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  life: number
  seed: number
}

interface Leaf {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  life: number
  color: string
}

interface FlyPeg {
  x0: number
  y0: number
  x1: number
  y1: number
  t: number
  done: () => void
}

// A small seeded generator: a given day is always painted the same way.
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Sprites that never change: painted once per page, reused by every day.
interface Shared {
  s: number
  clouds: Layer[]
  tubBack: Layer
  tubFront: Layer
  board: Layer
  basketBack: Layer
  basketFront: Layer
  bag: Layer
  doorLeaf: Layer
  inside: Layer
  veil: Layer
}

interface GarmentArt {
  kind: Kind
  color: string
  trim: string
  base: Layer
  mud: Layer
  tex: Layer
  back: Layer
  grid: MudGrid | null
  mudSeed: number
}

// What one day needs painted: the garden in its season and that day's clothes.
// `jobs` are the sittings still to do; a new day is got ready a job at a time
// while the finished one rests, so opening the door costs nothing.
interface DayArt {
  day: number
  s: number
  bg: Layer
  crowns: Layer[]
  garb: GarmentArt[]
  jobs: (() => void)[]
  used: boolean
}

let shared: Shared | null = null
let dayArt: DayArt | null = null
let nextArt: DayArt | null = null

function paintShared(s: number): Shared {
  const rand = seeded(5)
  const clouds = [layer(280, 96, s), layer(220, 80, s)]
  for (const c of clouds) paintCloud(c, rand)
  const tubBack = layer(500, 150, s)
  paintTubBack(tubBack, TX - 250, 540)
  const tubFront = layer(500, 270, s)
  paintTubFront(tubFront, TX - 250, 550, rand)
  const board = layer(BOARD_W, BOARD_H, s)
  paintBoard(board, rand)
  const basketBack = layer(240, 70, s)
  paintBasketBack(basketBack, 120, 36)
  const basketFront = layer(240, 150, s)
  paintBasketFront(basketFront, 120, 30, rand)
  const bag = layer(110, 140, s)
  paintBag(bag)
  const doorLeaf = layer(DOOR.w, DOOR.h, s)
  paintDoor(doorLeaf, rand)
  const inside = layer(DOOR.w, DOOR.h, 1)
  const g = inside.g
  const room = g.createLinearGradient(0, 0, 0, DOOR.h)
  room.addColorStop(0, '#49342a')
  room.addColorStop(1, '#7a5338')
  g.fillStyle = room
  g.fillRect(0, 0, DOOR.w, DOOR.h)
  const lamp = g.createRadialGradient(46, 120, 4, 46, 120, 130)
  lamp.addColorStop(0, 'rgba(255,220,150,0.95)')
  lamp.addColorStop(1, 'rgba(255,200,120,0)')
  g.fillStyle = lamp
  g.fillRect(0, 0, DOOR.w, DOOR.h)
  g.fillStyle = '#b98a5c'
  g.fillRect(0, DOOR.h - 44, DOOR.w, 44)
  for (let x = 0; x < DOOR.w; x += 26) {
    g.fillStyle = 'rgba(70,44,24,0.35)'
    g.fillRect(x, DOOR.h - 44, 2, 44)
  }
  const veil = layer(W, H, 1)
  paintVeil(veil, rand)
  return { s, clouds, tubBack, tubFront, board, basketBack, basketFront, bag, doorLeaf, inside, veil }
}

function planDay(day: number, s: number): DayArt {
  const rand = seeded(9001 + day * 7919)
  const season = SEASONS[day % SEASONS.length]!
  const bg = layer(W, H, s)
  const crowns = [layer(520, 300, s), layer(520, 300, s)]
  let kinds: Kind[] = ['trousers', 'dress', 'sock', 'shirt']
  let colors = ['#6f93bd', '#dd8f96', '#e3b04f', '#c9654a']
  if (day > 0) {
    const pool: Kind[] = ['shirt', 'trousers', 'dress', 'sock', 'kerchief']
    const pal = [...PALETTE]
    for (let i = pool.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      const tmp = pool[i]!
      pool[i] = pool[j]!
      pool[j] = tmp
    }
    for (let i = pal.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1))
      const tmp = pal[i]!
      pal[i] = pal[j]!
      pal[j] = tmp
    }
    kinds = pool.slice(0, 4)
    colors = pal.slice(0, 4)
  }
  const garb: GarmentArt[] = kinds.map((kind, i) => {
    const color = kind === 'kerchief' ? '#efe2c2' : colors[i]!
    const p = PATTERNS[kind]
    const cw = p.w + PAD * 2
    const ch = p.h + PAD * 2
    return { kind, color, trim: color === '#efe2c2' ? '#c9654a' : '#f6ecd4', base: layer(cw, ch, s), mud: layer(cw, ch, s), tex: layer(cw, ch, s), back: layer(cw, ch, s), grid: null, mudSeed: Math.floor(rand() * 1e9) }
  })
  const jobs: (() => void)[] = [
    () => paintGardenLand(bg, season, rand),
    () => paintGardenGrass(bg, season, rand),
    () => paintGardenThings(bg, rand),
    () => paintCrown(crowns[0]!, season, rand),
    () => paintCrown(crowns[1]!, season, rand),
  ]
  for (const ga of garb) {
    jobs.push(() => paintGarment(ga.base, ga.kind, ga.color, ga.trim, rand))
    jobs.push(() => {
      ga.grid = paintMud(ga.mud, ga.kind, seeded(ga.mudSeed))
    })
  }
  return { day, s, bg, crowns, garb, jobs, used: false }
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const waking = doorOpened
  doorOpened = false
  if (waking) dayNumber++
  const day = dayNumber
  const season = SEASONS[day % SEASONS.length]!
  const S = clamp(globalThis.devicePixelRatio || 1, 1, 2)
  const rand = seeded(77 + day * 131)

  // ------------------------------------------------------------ painted layers
  if (!shared || shared.s !== S) shared = paintShared(S)
  const { clouds, tubBack, tubFront, board, basketBack, basketFront, bag, doorLeaf, inside, veil } = shared
  let art: DayArt
  if (nextArt && nextArt.day === day && nextArt.s === S) art = nextArt
  else if (dayArt && dayArt.day === day && dayArt.s === S) art = dayArt
  else art = planDay(day, S)
  nextArt = null
  while (art.jobs.length > 0) art.jobs.shift()!()
  if (art.used) {
    // The same day begun over: the clothes are muddy again.
    for (const ga of art.garb) {
      ga.mud.g.clearRect(0, 0, ga.mud.w, ga.mud.h)
      ga.grid = paintMud(ga.mud, ga.kind, seeded(ga.mudSeed))
    }
  }
  art.used = true
  dayArt = art
  const { bg, crowns } = art

  // ------------------------------------------------------------------- sound
  const lastAt: Record<string, number> = {}
  const ok = (key: string, gap: number): boolean => {
    if (stage.time - (lastAt[key] ?? -9) < gap) return false
    lastAt[key] = stage.time
    return true
  }
  const plip = (vol = 0.045, delay = 0) => {
    const f = rnd(720, 1300)
    sfx.tone({ freq: f, to: f * 1.7, dur: 0.06, type: 'sine', vol, delay })
  }
  const splashSound = () => {
    sfx.noise({ dur: 0.3, freq: 1400, to: 350, vol: 0.12, filter: 'lowpass' })
    sfx.tone({ freq: 250, to: 110, dur: 0.14, type: 'sine', vol: 0.07 })
    plip(0.04, 0.12)
    plip(0.035, 0.22)
  }
  const clothSound = (vol = 0.07) => sfx.noise({ dur: 0.14, freq: 520, to: 220, vol, filter: 'lowpass' })
  const tok = () => sfx.tone({ freq: rnd(620, 760), to: 480, dur: 0.05, type: 'triangle', vol: 0.07 })
  // Each peg place on the line has its own soft note, like a wooden chime bar.
  const pegSound = (gm: Garment, c: number) => {
    sfx.tone({ freq: 1900, to: 1300, dur: 0.03, type: 'triangle', vol: 0.08 })
    sfx.noise({ dur: 0.02, freq: 3600, vol: 0.04, filter: 'highpass' })
    sfx.note(gm.slot * 2 + c - 4, 0.34, 'sine', 0.05)
  }
  const chirp = () => {
    for (let i = 0; i < 3; i++) sfx.tone({ freq: rnd(2500, 2900), to: rnd(3200, 3700), dur: 0.06, type: 'sine', vol: 0.03, delay: i * 0.11 })
  }
  const rustle = (vol = 0.03) => sfx.noise({ dur: 0.28, freq: 3000, to: 1800, vol, q: 0.7 })

  // ------------------------------------------------------------------- state
  const lineDip = spring(0, 80, 5)
  const lineMid = (LINE_X0 + LINE_X1) / 2
  const lineHalf = (LINE_X1 - LINE_X0) / 2
  const lineY = (x: number): number => {
    const u = (x - lineMid) / lineHalf
    return LINE_Y + (SAG + lineDip.value) * (1 - u * u)
  }

  let wind = 0.3
  let gust = 0
  let murk = 0
  let foam = 0
  let lastTouch = 0
  let lastInvite = 0
  let chapter: 'play' | 'leaving' | 'rest' | 'waking' = waking ? 'waking' : 'play'
  let restGlow = 0
  let prepTick = 0
  let bagCount = 7
  const bagSwing = spring(0, 26, 2.2)
  const crownKick = [spring(0, 30, 4), spring(0, 30, 4)]
  const door = spring(waking ? 1 : 0, 34, 9)
  door.target = door.value
  const doorRattle = spring(0, 300, 14)
  const grabs = new Map<number, Grab>()
  const fingers = new Map<number, Pointer>()
  const drops: Drop[] = []
  const ripples: Ripple[] = []
  const bubbles: Bubble[] = []
  const leaves: Leaf[] = []
  const flyPegs: FlyPeg[] = []
  const soap = { x: SOAP_HOME.x, y: SOAP_HOME.y, held: null as Pointer | null, wob: spring(0, 160, 9) }
  const basket = {
    x: BASKET_HOME.x,
    y: BASKET_HOME.y,
    items: [] as Garment[],
    sq: spring(1, 220, 11),
    heap: spring(0, 120, 8),
    holder: null as Pointer | null,
    grab: { dx: 0, dy: 0 },
    scale: 1,
    alpha: 1,
    hidden: false,
  }
  const bird = { state: 'away' as 'away' | 'coming' | 'perched' | 'leaving', x: 1260, y: 40, fromX: 0, fromY: 0, toX: 0, toY: 0, t: 0, perch: 0, face: -1, next: 14, until: 0, hop: spring(0, 260, 12), look: 0, lookAt: 0 }

  // Where foam gathers: along the waterline of the board and loose on the water.
  const foamSpots: { x: number; y: number; r: number; seed: number }[] = []
  for (let i = 0; i < 46; i++) {
    const loose = i % 3 === 2
    foamSpots.push({
      x: loose ? TX + (rand() - 0.5) * 320 : TX + (rand() - 0.5) * 250,
      y: loose ? WATER_Y + 14 + rand() * 22 : 640 + rand() * 9,
      r: 4 + rand() * 7,
      seed: rand() * TAU,
    })
  }
  const tufts: { x: number; y: number; h: number; seed: number }[] = []
  for (let i = 0; i < 16; i++) tufts.push({ x: 30 + i * 76 + (rand() - 0.5) * 40, y: H + 6, h: 34 + rand() * 30, seed: rand() * TAU })

  // ---------------------------------------------------------------- garments
  const makeGarment = (ga: GarmentArt): Garment => {
    const { kind, color, base, mud, tex, back } = ga
    const p = PATTERNS[kind]
    const cw = p.w + PAD * 2
    const ch = p.h + PAD * 2
    const grid = ga.grid!
    return {
      kind,
      color,
      w: p.w,
      h: p.h,
      cw,
      ch,
      anchors: p.anchors,
      base,
      mud,
      tex,
      back,
      grid,
      mudSum: grid.total,
      mudAlpha: 1,
      clean: false,
      wet: 0,
      wetQ: -1,
      dirty: true,
      place: 'basket',
      x: 0,
      y: 0,
      glide: null,
      holder: null,
      slot: -1,
      pegs: p.anchors.map(() => false),
      pivot: -1,
      drape: spring(0, 90, 11),
      tilt: spring(0, 46, 6),
      swing: spring(0, 60, 6),
      tw: spring(0, 70, 7),
      rubY: 0,
      acc: 0,
      dripAt: 0,
      fold: 0,
      foldP: 0,
      foldTo: 0,
      foldSide: -1,
      flat: tex.c,
      flatBack: back.c,
      fw: cw,
      fh: ch,
      rot: 0,
      phase: rand() * TAU,
      suds: [],
      tugX: 0,
      tugTo: 0,
    }
  }

  // Wet cloth is darker, and dries from the top down.
  const compose = (gm: Garment) => {
    gm.wetQ = Math.round(gm.wet * 40)
    gm.dirty = false
    const c = gm.tex.c
    const t = gm.tex.g
    t.save()
    t.setTransform(1, 0, 0, 1, 0, 0)
    t.globalCompositeOperation = 'source-over'
    t.globalAlpha = 1
    t.clearRect(0, 0, c.width, c.height)
    t.drawImage(gm.base.c, 0, 0)
    if (gm.wet > 0.004) {
      const f = Math.min(1, gm.wet / WRUNG)
      const soak = gm.wet > WRUNG ? (gm.wet - WRUNG) * 0.16 : 0
      const top = 0.34 * clamp(f * 2 - 1, 0, 1) + soak
      const low = 0.34 * clamp(f * 2, 0, 1) + soak
      const grad = t.createLinearGradient(0, 0, 0, c.height)
      grad.addColorStop(0, `rgba(40,34,50,${top})`)
      grad.addColorStop(1, `rgba(40,34,50,${low})`)
      t.globalCompositeOperation = 'source-atop'
      t.fillStyle = grad
      t.fillRect(0, 0, c.width, c.height)
      t.globalCompositeOperation = 'source-over'
    }
    if (gm.mudAlpha > 0.01) {
      t.globalAlpha = gm.mudAlpha
      t.drawImage(gm.mud.c, 0, 0)
    }
    t.restore()
    const b = gm.back.g
    b.save()
    b.setTransform(1, 0, 0, 1, 0, 0)
    b.globalCompositeOperation = 'source-over'
    b.clearRect(0, 0, c.width, c.height)
    b.drawImage(c, 0, 0)
    b.globalCompositeOperation = 'source-atop'
    b.fillStyle = 'rgba(58,40,26,0.2)'
    b.fillRect(0, 0, c.width, c.height)
    b.restore()
  }

  const resetFold = (gm: Garment) => {
    gm.fold = 0
    gm.foldP = 0
    gm.foldTo = 0
    gm.flat = gm.tex.c
    gm.flatBack = gm.back.c
    gm.fw = gm.cw
    gm.fh = gm.ch
  }

  const darkCopy = (src: HTMLCanvasElement): HTMLCanvasElement => {
    const out = document.createElement('canvas')
    out.width = src.width
    out.height = src.height
    const o = out.getContext('2d')!
    o.drawImage(src, 0, 0)
    o.globalCompositeOperation = 'source-atop'
    o.fillStyle = 'rgba(58,40,26,0.2)'
    o.fillRect(0, 0, out.width, out.height)
    return out
  }

  // Bake one fold: the moving half lies mirrored on the half that stayed.
  const bakeFold = (gm: Garment) => {
    const src = gm.flat
    const sb = gm.flatBack
    const sw = src.width
    const sh = src.height
    const out = document.createElement('canvas')
    const side = gm.foldSide
    if (gm.fold === 0) {
      const hw = Math.floor(sw / 2)
      out.width = hw
      out.height = sh
      const o = out.getContext('2d')!
      o.drawImage(src, side < 0 ? sw - hw : 0, 0, hw, sh, 0, 0, hw, sh)
      o.save()
      o.translate(hw, 0)
      o.scale(-1, 1)
      o.drawImage(sb, side < 0 ? 0 : sw - hw, 0, hw, sh, 0, 0, hw, sh)
      o.restore()
      o.globalCompositeOperation = 'source-atop'
      o.fillStyle = 'rgba(255,248,228,0.3)'
      o.fillRect(side < 0 ? 0 : hw - 3 * S, 0, 3 * S, sh)
      gm.x += (side < 0 ? 1 : -1) * ((gm.fw * GS) / 4)
      gm.fw /= 2
    } else {
      const hh = Math.floor(sh / 2)
      out.width = sw
      out.height = hh
      const o = out.getContext('2d')!
      o.drawImage(src, 0, side < 0 ? sh - hh : 0, sw, hh, 0, 0, sw, hh)
      o.save()
      o.translate(0, hh)
      o.scale(1, -1)
      o.drawImage(sb, 0, side < 0 ? 0 : sh - hh, sw, hh, 0, 0, sw, hh)
      o.restore()
      o.globalCompositeOperation = 'source-atop'
      o.fillStyle = 'rgba(255,248,228,0.3)'
      o.fillRect(0, side < 0 ? 0 : hh - 3 * S, sw, 3 * S)
      gm.y += (side < 0 ? 1 : -1) * ((gm.fh * GS) / 4)
      gm.fh /= 2
    }
    gm.flat = out
    gm.flatBack = darkCopy(out)
    gm.fold++
    gm.foldP = 0
    gm.foldTo = 0
  }

  const garments: Garment[] = []
  for (const ga of art.garb) {
    const gm = makeGarment(ga)
    compose(gm)
    garments.push(gm)
    basket.items.push(gm)
  }

  const pegCount = (gm: Garment): number => gm.pegs.reduce((n, on) => n + (on ? 1 : 0), 0)
  const isDry = (gm: Garment): boolean => gm.wet <= 0.004
  const foldable = (gm: Garment): boolean => gm.clean && gm.mudAlpha <= 0.01 && isDry(gm) && gm.fold < 2
  const basketReady = (): boolean => basket.items.length === garments.length && basket.items.every((gm) => gm.fold === 2)
  const slotFree = (i: number): boolean => !garments.some((gm) => gm.slot === i)
  const pivotX = (gm: Garment): number => (gm.pivot < 0 ? 0 : gm.anchors[gm.pivot]![0])
  const pegPos = (gm: Garment, c: number): [number, number] => {
    const x = SLOTS[gm.slot]! + gm.anchors[c]![0]
    return [x, lineY(x) - 5]
  }
  const hemY = (gm: Garment): number => BOARD_TOP + 2 + gm.h * 0.68 + PAD

  // ------------------------------------------------------------- small things
  const ripple = (x: number, y: number, size = 1) => {
    if (ripples.length > 24) ripples.shift()
    ripples.push({ x: clamp(x, TX - WATER_RX + 20, TX + WATER_RX - 20), y: clamp(y, WATER_Y - WATER_RY + 8, WATER_Y + WATER_RY - 6), age: 0, size })
  }
  const overWater = (x: number, y: number, grow = 1): boolean => ((x - TX) / (WATER_RX * grow)) ** 2 + ((y - WATER_Y) / (WATER_RY * grow)) ** 2 < 1
  const addDrop = (x: number, y: number, vx = 0, vy = 60) => {
    if (drops.length > 90) drops.shift()
    const inTub = Math.abs(x - TX) < WATER_RX - 14 && y < WATER_Y + 20
    drops.push({ x, y, vx, vy, inTub, land: inTub ? WATER_Y + rnd(-4, 26) : clamp(y + rnd(150, 230), 470, 790) })
  }
  const freeBubble = (x: number, y: number) => {
    if (bubbles.length > 14) return
    bubbles.push({ x, y, vx: rnd(-14, 22), vy: rnd(-46, -24), r: rnd(7, 15), life: rnd(3.5, 6.5), seed: rnd(0, TAU) })
  }
  const splash = (x: number, y: number, n = 9) => {
    fx.burst(x, y, { count: n, color: ['#e9f6f6', '#cfe9ec', '#ffffff'], speed: 230, gravity: 900, life: 0.5, size: 6, angle: -Math.PI / 2, spread: 1.7 })
    ripple(x, y + 8, 1.4)
    ripple(x - 40, y + 14, 1)
    ripple(x + 46, y + 12, 1)
  }
  const dropLeaf = (x: number, y: number) => {
    if (leaves.length > 16) return
    leaves.push({ x, y, vx: rnd(4, 26), vy: rnd(16, 30), rot: rnd(0, TAU), life: rnd(5, 8), color: season.crown[Math.floor(rnd(1, 4))]! })
  }
  const flyPeg = (x0: number, y0: number, x1: number, y1: number, done: () => void) => flyPegs.push({ x0, y0, x1, y1, t: 0, done })
  const bagMouth = (): [number, number] => [BAG_X + rnd(-14, 14), lineY(BAG_X) + 40]
  const startle = () => {
    if (bird.state !== 'perched' && bird.state !== 'coming') return
    bird.state = 'leaving'
    bird.fromX = bird.x
    bird.fromY = bird.y
    bird.toX = bird.x < W / 2 ? -80 : W + 80
    bird.toY = rnd(20, 90)
    bird.face = bird.toX < bird.x ? -1 : 1
    bird.t = 0
    bird.next = stage.time + rnd(16, 26)
    lineDip.kick(-40)
  }

  // ------------------------------------------------------------ moving cloth
  const glideTo = (gm: Garment, x: number, y: number, flat: boolean, dur: number, lift: number, done: () => void) => {
    gm.place = 'glide'
    gm.holder = null
    gm.glide = { x0: gm.x, y0: gm.y, x1: x, y1: y, t: 0, dur, lift, flat, done }
  }
  // A held garment hangs from its top; lying down it is placed by its middle.
  const toFlat = (gm: Garment) => {
    gm.y += (gm.fh * GS) / 2
  }

  const hang = (gm: Garment, slot: number) => {
    resetFold(gm)
    gm.slot = slot
    gm.pegs = gm.anchors.map(() => false)
    gm.pivot = -1
    gm.tilt.value = 0
    gm.tilt.target = 0
    gm.drape.value = 0
    gm.drape.target = 0.3
    if (bird.state === 'perched' && Math.abs(bird.x - SLOTS[slot]!) < 100) startle()
    glideTo(gm, SLOTS[slot]!, lineY(SLOTS[slot]!), false, 0.2, 10, () => {
      gm.place = 'line'
      lineDip.kick(70)
      clothSound(0.08)
    })
  }

  const dunk = (gm: Garment) => {
    resetFold(gm)
    glideTo(gm, TX, TUB_TOP, false, 0.22, 24, () => {
      gm.place = 'tub'
      gm.wet = 1
      gm.rubY = 14
      splash(TX, 640, 12)
      splashSound()
      foam = Math.min(1, foam + 0.03)
    })
  }

  const groundSpot = (x: number, y: number): [number, number] => {
    let gy = clamp(y, 590, 712)
    let gx = clamp(x, 150, 1000)
    // Never on top of the tub: beside it, on whichever side is nearer.
    if (Math.abs(gx - TX) < 285) {
      if (gx < TX - 120) {
        gx = TX - 262
        gy = Math.min(gy, 636)
      } else gx = TX + 285
    }
    return [gx, gy]
  }

  const layDown = (gm: Garment, x: number, y: number, rot: number) => {
    toFlat(gm)
    gm.rot = rot
    glideTo(gm, x, y, true, 0.24, 18, () => {
      gm.place = 'ground'
      clothSound(0.06)
    })
  }

  const intoBasket = (gm: Garment) => {
    toFlat(gm)
    glideTo(gm, basket.x, basket.y - 26, true, 0.22, 26, () => {
      gm.place = 'basket'
      basket.items.push(gm)
      basket.sq.value = 0.93
      clothSound(0.07)
      sfx.tone({ freq: 150, to: 95, dur: 0.1, type: 'sine', vol: 0.06 })
      sfx.noise({ dur: 0.03, freq: 900, vol: 0.03, q: 6, delay: 0.05 })
      if (basketReady()) door.target = 0.45
    })
  }

  const release = (gm: Garment, p: Pointer) => {
    gm.holder = null
    const tubBusy = garments.some((o) => o !== gm && (o.place === 'tub' || o.place === 'rack' || (o.place === 'glide' && o.glide !== null && !o.glide.flat && o.glide.x1 === TX)))
    const nearBasket = !basket.hidden && Math.abs(p.x - basket.x) < 120 && p.y > basket.y - 130 && p.y < basket.y + 110
    if (p.y < 400) {
      let best = -1
      for (let i = 0; i < SLOTS.length; i++) {
        if (!slotFree(i)) continue
        if (best < 0 || Math.abs(SLOTS[i]! - p.x) < Math.abs(SLOTS[best]! - p.x)) best = i
      }
      if (best >= 0) {
        hang(gm, best)
        return
      }
    }
    if (!tubBusy && Math.abs(p.x - TX) < 185 && p.y > 430 && p.y < 730) {
      dunk(gm)
      return
    }
    if (nearBasket) {
      if (gm.fold === 2 || !gm.clean || !isDry(gm)) {
        if (gm.fold !== 2) resetFold(gm)
        intoBasket(gm)
      } else {
        const waiting = garments.filter((o) => o.place === 'ground' && dist(o.x, o.y, BLANKET.x, BLANKET.y) < 90).length
        layDown(gm, BLANKET.x - waiting * 10, BLANKET.y - 14 - waiting * 8, 0)
      }
      return
    }
    const [gx, gy] = groundSpot(p.x, p.y + (gm.fh * GS) / 2)
    layDown(gm, gx, gy, gm.clean && isDry(gm) ? 0 : rnd(-0.22, 0.22))
  }

  const pickUp = (gm: Garment, p: Pointer) => {
    if (gm.place === 'ground') gm.y -= (gm.fh * GS) / 2
    if (gm.place === 'line') {
      gm.x = SLOTS[gm.slot]!
      gm.y = lineY(gm.x)
      lineDip.kick(-50)
    }
    if (gm.place === 'rack') {
      gm.x = TX
      gm.y = BOARD_TOP + 2
    }
    gm.slot = -1
    gm.place = 'held'
    gm.holder = p
    gm.rot = 0
    gm.suds.length = 0
    grabs.set(p.id, { kind: 'carry', gm })
    clothSound(0.05)
  }

  // --------------------------------------------------------------- the work
  const rub = (gm: Garment, x0: number, y0: number, x1: number, y1: number, soapy: boolean): boolean => {
    const d = Math.hypot(x1 - x0, y1 - y0)
    const steps = Math.max(1, Math.ceil(d / 12))
    const top = TUB_TOP + gm.rubY - 5
    const R = soapy ? 46 : 40
    const m = gm.mud.g
    const G = gm.grid
    let removed = 0
    let touched = false
    for (let i = 1; i <= steps; i++) {
      const lx = lerp(x0, x1, i / steps) - TX
      const ly = lerp(y0, y1, i / steps) - top
      if (Math.abs(lx) > gm.w / 2 + 26 || ly < -26 || ly > gm.h + 26) continue
      touched = true
      if (gm.clean) continue
      const cx = lx + gm.cw / 2
      const cy = ly + PAD
      const grad = m.createRadialGradient(cx, cy, 4, cx, cy, R)
      grad.addColorStop(0, 'rgba(0,0,0,0.8)')
      grad.addColorStop(1, 'rgba(0,0,0,0)')
      m.globalCompositeOperation = 'destination-out'
      m.fillStyle = grad
      m.beginPath()
      m.arc(cx, cy, R, 0, TAU)
      m.fill()
      m.globalCompositeOperation = 'source-over'
      const i0 = Math.max(0, Math.floor((cx - R) / G.cell))
      const i1 = Math.min(G.cols - 1, Math.floor((cx + R) / G.cell))
      const j0 = Math.max(0, Math.floor((cy - R) / G.cell))
      const j1 = Math.min(G.rows - 1, Math.floor((cy + R) / G.cell))
      for (let j = j0; j <= j1; j++) {
        for (let k = i0; k <= i1; k++) {
          const v = G.cells[j * G.cols + k]!
          if (v <= 0) continue
          const dd = Math.hypot((k + 0.5) * G.cell - cx, (j + 0.5) * G.cell - cy)
          if (dd >= R) continue
          const nv = Math.max(0, v - 0.7 * (1 - dd / R))
          removed += v - nv
          G.cells[j * G.cols + k] = nv
        }
      }
      gm.dirty = true
      if (Math.random() < (soapy ? 0.9 : 0.5)) {
        if (gm.suds.length > 34) gm.suds.shift()
        gm.suds.push({ x: lx + rnd(-16, 16), y: ly + rnd(-16, 16), r: rnd(4, soapy ? 13 : 10), life: 1 })
      }
    }
    if (!touched) return false
    if (removed > 0) {
      gm.mudSum -= removed
      murk = Math.min(1, murk + (removed / G.total) * 0.25)
      if (!gm.clean && gm.mudSum / G.total < 0.2) {
        gm.clean = true
        stage.tween(0.8, (t) => {
          gm.mudAlpha = 1 - t
          gm.dirty = true
        })
      }
    }
    foam = Math.min(1, foam + d / (soapy ? 3200 : 6500))
    return true
  }

  const liftToRack = (gm: Garment) => {
    gm.x = TX
    gm.y = TUB_TOP + gm.rubY
    gm.suds.length = 0
    gm.drape.value = 0
    gm.drape.target = 0.32
    glideTo(gm, TX, BOARD_TOP + 2, false, 0.26, 0, () => {
      gm.place = 'rack'
      gm.dripAt = stage.time + 0.2
    })
    for (let i = 0; i < 14; i++) addDrop(TX + rnd(-gm.w / 2, gm.w / 2), rnd(560, 620), rnd(-20, 20), rnd(0, 80))
    sfx.noise({ dur: 0.34, freq: 1500, to: 420, vol: 0.08, filter: 'lowpass' })
    plip(0.04, 0.1)
    plip(0.04, 0.2)
    plip(0.035, 0.32)
  }

  const wring = (gm: Garment, d: number) => {
    gm.tw.target = Math.min(2.6, gm.tw.target + d / 150)
    if (gm.wet > WRUNG) {
      const flow = (gm.wet - WRUNG) / (1 - WRUNG)
      gm.wet = Math.max(WRUNG, gm.wet - (d * 0.55) / 540)
      gm.acc += d * (0.4 + flow)
      while (gm.acc > 15) {
        gm.acc -= 15
        addDrop(TX + rnd(-14, 14), hemY(gm) - rnd(0, 20), rnd(-16, 16), rnd(60, 140))
      }
      if (ok('trickle', 0.075)) plip(0.03 + 0.02 * flow)
      if (ok('gush', 0.3)) sfx.noise({ dur: 0.3, freq: 1100, to: 500, vol: 0.015 + 0.035 * flow, filter: 'lowpass' })
      if (gm.wet <= WRUNG) {
        plip(0.04, 0.1)
        plip(0.035, 0.26)
      }
    } else if (ok('creak', 0.28)) sfx.noise({ dur: 0.09, freq: 320, vol: 0.035, filter: 'lowpass' })
  }

  const pegOn = (gm: Garment, c: number) => {
    gm.pegs[c] = true
    const n = pegCount(gm)
    if (n === 1) gm.pivot = c
    gm.drape.target = 0
    gm.tilt.target = n >= gm.anchors.length ? 0 : gm.anchors[gm.pivot]![0] < 0 ? 0.4 : -0.4
    gm.tilt.kick(n >= gm.anchors.length ? 0 : 0.6)
    lineDip.kick(46)
    pegSound(gm, c)
  }

  const unpeg = (gm: Garment, c: number) => {
    const [px, py] = pegPos(gm, c)
    gm.pegs[c] = false
    const n = pegCount(gm)
    if (n === 0) {
      gm.tilt.target = 0
      gm.drape.target = 0.3
    } else {
      gm.pivot = gm.pegs.findIndex((on) => on)
      gm.tilt.target = gm.anchors[gm.pivot]![0] < 0 ? 0.4 : -0.4
    }
    lineDip.kick(-36)
    pegSound(gm, c)
    const [bx, by] = bagMouth()
    flyPeg(px, py, bx, by, () => {
      bagCount++
      bagSwing.kick(0.5)
      tok()
    })
  }

  const leave = () => {
    chapter = 'leaving'
    // Tomorrow's garden and clothes start being painted now, a little each frame.
    if (!nextArt || nextArt.day !== day + 1 || nextArt.s !== S) nextArt = planDay(day + 1, S)
    basket.holder = null
    const fromX = basket.x
    const fromY = basket.y
    door.target = 1
    stage.tween(
      1.0,
      (t) => {
        basket.x = lerp(fromX, DOOR_IN.x, t)
        basket.y = lerp(fromY, DOOR_IN.y, t)
        basket.scale = lerp(1, 0.56, t)
        basket.alpha = clamp((1 - t) / 0.3, 0, 1)
      },
      ease.inOutQuad,
      () => {
        basket.hidden = true
        door.target = 0.5
        stage.after(0.5, () => {
          sfx.tone({ freq: 120, to: 72, dur: 0.16, type: 'sine', vol: 0.09 })
          sfx.noise({ dur: 0.08, freq: 300, vol: 0.05, filter: 'lowpass' })
          sfx.tone({ freq: 1500, to: 1100, dur: 0.03, type: 'triangle', vol: 0.04, delay: 0.16 })
          chapter = 'rest'
          bird.next = stage.time + 2.5
        })
      },
    )
  }

  if (chapter === 'waking') {
    basket.x = DOOR_IN.x
    basket.y = DOOR_IN.y
    basket.scale = 0.56
    basket.alpha = 0
    stage.tween(
      1.2,
      (t) => {
        basket.x = lerp(DOOR_IN.x, BASKET_HOME.x, t)
        basket.y = lerp(DOOR_IN.y, BASKET_HOME.y, t)
        basket.scale = lerp(0.56, 1, t)
        basket.alpha = clamp(t / 0.3, 0, 1)
      },
      ease.inOutQuad,
      () => {
        basket.sq.value = 0.94
        door.target = 0
        chapter = 'play'
        sfx.tone({ freq: 150, to: 95, dur: 0.1, type: 'sine', vol: 0.06 })
      },
    )
  }

  // ------------------------------------------------------------------- touch
  const ambient = (p: Pointer) => {
    if ((bird.state === 'perched' || bird.state === 'coming') && dist(p.x, p.y, bird.x, bird.y - 8) < 70) {
      chirp()
      startle()
      return
    }
    if (overWater(p.x, p.y, 1.04) || (Math.abs(p.x - TX) < 110 && p.y > BOARD_TOP && p.y < 640)) {
      grabs.set(p.id, { kind: 'water', travel: 0 })
      if (Math.abs(p.x - TX) < 104 && p.y < 640) sfx.noise({ dur: 0.05, freq: rnd(1100, 1700), vol: 0.05, q: 3 })
      else {
        ripple(p.x, p.y, 1.3)
        plip(0.05)
        fx.burst(p.x, p.y, { count: 4, color: '#e9f6f6', speed: 150, gravity: 800, life: 0.4, size: 5, angle: -Math.PI / 2, spread: 1.2 })
      }
      return
    }
    if (p.x > LINE_X0 && p.x < LINE_X1 && Math.abs(p.y - lineY(p.x)) < 30) {
      lineDip.kick(130)
      sfx.tone({ freq: 150, to: 138, dur: 0.34, type: 'sine', vol: 0.06 })
      startle()
      return
    }
    if (p.x > DOOR.x - 12 && p.x < DOOR.x + DOOR.w + 12 && p.y > DOOR.y && p.y < DOOR.y + DOOR.h + 20) {
      doorRattle.kick(17)
      sfx.tone({ freq: 190, to: 120, dur: 0.07, type: 'sine', vol: 0.07 })
      sfx.tone({ freq: 180, to: 115, dur: 0.07, type: 'sine', vol: 0.06, delay: 0.14 })
      return
    }
    const tree = (p.x < 300 && p.y < 150) || (Math.abs(p.x - 96) < 44 && p.y < 590) ? 0 : (p.x > 800 && p.y < 150) || (Math.abs(p.x - 978) < 44 && p.y < 560) ? 1 : -1
    if (tree >= 0) {
      crownKick[tree]!.kick(3)
      rustle(0.035)
      dropLeaf(tree === 0 ? rnd(30, 240) : rnd(860, 1100), rnd(80, 130))
      dropLeaf(tree === 0 ? rnd(30, 240) : rnd(860, 1100), rnd(60, 120))
      return
    }
    if (p.y < 392) {
      gust = Math.min(1, gust + 0.55)
      if (ok('gust', 0.4)) sfx.noise({ dur: 0.8, freq: 420, to: 900, vol: 0.03, q: 0.6 })
      return
    }
    // Grass: the nearest tufts stir.
    for (const tf of tufts) if (Math.abs(tf.x - p.x) < 120) tf.seed += 0.9
    fx.burst(p.x, p.y, { count: 3, color: [season.grassLight, season.grassDark], speed: 110, gravity: 320, life: 0.4, size: 5, shape: 'spark', angle: -Math.PI / 2, spread: 1.3 })
    sfx.noise({ dur: 0.08, freq: 2600, vol: 0.025, filter: 'highpass' })
  }

  const hitGround = (gm: Garment, p: Pointer): boolean => Math.abs(p.x - gm.x) < Math.max(62, (gm.fw * GS) / 2) && Math.abs(p.y - gm.y) < Math.max(56, (gm.fh * GS) / 2)

  const down = (p: Pointer) => {
    lastTouch = stage.time
    // A finger that comes down again without having lifted lets go first.
    const prior = fingers.get(p.id)
    if (prior && prior !== p && grabs.has(p.id)) up(prior)
    fingers.set(p.id, p)
    grabs.set(p.id, { kind: 'idle' })
    if (chapter === 'leaving' || chapter === 'waking') {
      ambient(p)
      return
    }
    // Pegs on the line come off with a touch.
    for (const gm of garments) {
      if (gm.place !== 'line') continue
      for (let c = 0; c < gm.pegs.length; c++) {
        if (!gm.pegs[c]) continue
        const [px, py] = pegPos(gm, c)
        if (dist(p.x, p.y, px, py - 4) < 44) {
          unpeg(gm, c)
          return
        }
      }
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]!
      if (dist(p.x, p.y, b.x, b.y) > b.r + 22) continue
      // A bubble under the finger pops, and the touch still does its work.
      bubbles.splice(i, 1)
      fx.burst(b.x, b.y, { count: 5, color: '#ffffff', speed: 90, gravity: 200, life: 0.3, size: 4 })
      plip(0.05)
    }
    if (bagCount > 0 && dist(p.x, p.y, BAG_X, lineY(BAG_X) + 74) < 76) {
      bagCount--
      const [bx, by] = bagMouth()
      grabs.set(p.id, { kind: 'peg', x: bx, y: by })
      bagSwing.kick(0.9)
      tok()
      return
    }
    if (!soap.held && dist(p.x, p.y, soap.x, soap.y) < 62) {
      soap.held = p
      soap.wob.kick(40)
      grabs.set(p.id, { kind: 'soap' })
      tok()
      return
    }
    // Cloth lying on the grass or the folding cloth: topmost first.
    for (let i = garments.length - 1; i >= 0; i--) {
      const gm = garments[i]!
      if (gm.place !== 'ground' || !hitGround(gm, p)) continue
      if (foldable(gm)) {
        const sideways = gm.fold === 0
        gm.foldSide = (sideways ? p.x < gm.x : p.y < gm.y) ? -1 : 1
        gm.foldTo = 0
        grabs.set(p.id, { kind: 'fold', gm, travel: 0 })
        clothSound(0.04)
      } else pickUp(gm, p)
      return
    }
    for (const gm of garments) {
      if (gm.place === 'rack' && Math.abs(p.x - TX) < gm.w / 2 + 34 && p.y > BOARD_TOP - 30 && p.y < hemY(gm) + 40) {
        grabs.set(p.id, { kind: 'wring', gm })
        gm.tw.target = 0.25
        clothSound(0.05)
        return
      }
      if (gm.place === 'tub' && Math.abs(p.x - TX) < 160 && p.y > TUB_TOP - 44 && p.y < 724) {
        grabs.set(p.id, { kind: 'rub', gm, travel: 0 })
        if (rub(gm, p.x, p.y, p.x, p.y, false)) gm.rubY += 5
        ripple(p.x, 650, 1)
        if (ok('rub', 0.045)) sfx.noise({ dur: 0.055, freq: rnd(1100, 1700), vol: 0.05, q: 3 })
        plip(0.03)
        return
      }
    }
    for (let i = garments.length - 1; i >= 0; i--) {
      const gm = garments[i]!
      if (gm.place !== 'line') continue
      const sx = SLOTS[gm.slot]!
      const ly = lineY(sx)
      if (Math.abs(p.x - sx) > gm.w / 2 + 14 || p.y < ly - 22 || p.y > ly + gm.h + 20) continue
      if (pegCount(gm) > 0) {
        grabs.set(p.id, { kind: 'tug', gm })
        if (ok('tug', 0.2)) sfx.tone({ freq: 520, to: 430, dur: 0.05, type: 'triangle', vol: 0.03 })
        lineDip.kick(40)
      } else pickUp(gm, p)
      return
    }
    if (!basket.hidden && Math.abs(p.x - basket.x) < BASKET_RX + 12 && p.y > basket.y - 96 && p.y < basket.y + 110) {
      if (basketReady()) {
        basket.holder = p
        basket.grab.dx = basket.x - p.x
        basket.grab.dy = basket.y - p.y
        grabs.set(p.id, { kind: 'basket', dx: 0, dy: 0 })
        door.target = 1
        basket.sq.value = 1.06
        sfx.noise({ dur: 0.05, freq: 900, vol: 0.035, q: 6 })
        sfx.noise({ dur: 0.05, freq: 760, vol: 0.03, q: 6, delay: 0.09 })
      } else if (basket.items.length > 0) {
        const gm = basket.items.pop()!
        gm.x = basket.x
        gm.y = basket.y - 70
        basket.sq.value = 1.05
        pickUp(gm, p)
        sfx.noise({ dur: 0.05, freq: 900, vol: 0.03, q: 6 })
      } else {
        basket.sq.value = 0.95
        sfx.noise({ dur: 0.05, freq: 900, vol: 0.035, q: 6 })
        sfx.noise({ dur: 0.05, freq: 760, vol: 0.03, q: 6, delay: 0.09 })
      }
      return
    }
    if (chapter === 'rest' && p.x > DOOR.x - 16 && p.y > DOOR.y - 10 && p.y < DOOR.y + DOOR.h + 30) {
      chapter = 'waking'
      door.target = 1
      sfx.tone({ freq: 210, to: 250, dur: 0.3, type: 'sine', vol: 0.03, attack: 0.08 })
      tok()
      stage.after(0.6, () => {
        doorOpened = true
        stage.restart()
      })
      return
    }
    ambient(p)
  }

  const move = (p: Pointer) => {
    const grab = grabs.get(p.id)
    if (!grab) return
    lastTouch = stage.time
    const d = Math.hypot(p.dx, p.dy)
    if (grab.kind === 'rub') {
      const gm = grab.gm
      if (gm.place !== 'tub') return
      if (gm.clean && (p.y < TUB_TOP - 40 || Math.abs(p.x - TX) > 165 || p.y > 735)) {
        liftToRack(gm)
        grabs.set(p.id, { kind: 'idle' })
        return
      }
      if (rub(gm, p.x - p.dx, p.y - p.dy, p.x, p.y, false)) {
        gm.rubY = clamp(gm.rubY + p.dy * 0.3, -16, 20)
        grab.travel += d
        if (grab.travel > 20) {
          grab.travel = 0
          if (ok('rub', 0.045)) sfx.noise({ dur: 0.055, freq: rnd(1100, 1700), vol: 0.05, q: 3 })
          if (Math.random() < 0.16) freeBubble(p.x + rnd(-20, 20), p.y - 10)
        }
        if (ok('slosh', 0.5)) {
          sfx.noise({ dur: 0.2, freq: 700, to: 300, vol: 0.045, filter: 'lowpass' })
          ripple(TX + rnd(-120, 120), 652, 1.1)
          plip(0.03, 0.08)
        }
      } else {
        // Beside the cloth: the bare ridges rattle, the water stirs.
        grab.travel += d
        if (grab.travel > 14) {
          grab.travel = 0
          if (p.y < 640 && Math.abs(p.x - TX) < 104) {
            if (ok('ridge', 0.03)) sfx.noise({ dur: 0.04, freq: rnd(1300, 1900), vol: 0.04, q: 4 })
          } else if (overWater(p.x, p.y, 1.02)) {
            ripple(p.x, p.y, 1)
            if (ok('stir', 0.13)) plip(0.035)
          }
        }
      }
    } else if (grab.kind === 'wring') {
      const gm = grab.gm
      if (gm.place !== 'rack') return
      wring(gm, d)
      // Sopping cloth stays over the tub; once wrung it comes away with the hand.
      if (gm.wet <= WRUNG && (p.y < BOARD_TOP - 34 || Math.abs(p.x - TX) > 172 || p.y > 735)) {
        gm.tw.target = 0
        pickUp(gm, p)
      }
    } else if (grab.kind === 'fold') {
      const gm = grab.gm
      if (gm.place !== 'ground' || gm.foldTo !== 0) return
      grab.travel += d
      gm.foldP = clamp(grab.travel / 120, 0, 1)
      if (gm.foldP >= 1) {
        bakeFold(gm)
        clothSound(0.07)
        grabs.set(p.id, { kind: 'idle' })
      }
    } else if (grab.kind === 'tug') {
      const gm = grab.gm
      if (gm.place !== 'line') return
      gm.tugTo = clamp((p.x - p.startX) * 0.012, -0.7, 0.7)
      // Pull hard enough and the pegs let go, as dolly pegs do.
      if (dist(p.x, p.y, p.startX, p.startY) > 120) {
        gm.tugTo = 0
        for (let c = 0; c < gm.pegs.length; c++) if (gm.pegs[c]) unpeg(gm, c)
        pickUp(gm, p)
      }
    } else if (grab.kind === 'soap') {
      const gm = garments.find((o) => o.place === 'tub')
      if (gm && rub(gm, p.x - p.dx, p.y - p.dy, p.x, p.y, true)) {
        gm.rubY = clamp(gm.rubY + p.dy * 0.2, -16, 20)
        if (ok('soap', 0.07)) sfx.noise({ dur: 0.07, freq: rnd(600, 900), vol: 0.035, filter: 'lowpass' })
        if (Math.random() < 0.05) freeBubble(p.x + rnd(-20, 20), p.y - 10)
      }
    } else if (grab.kind === 'water') {
      grab.travel += d
      if (Math.abs(p.x - TX) < 104 && p.y > BOARD_TOP + 50 && p.y < 640) {
        // A finger down the bare washboard rattles over the ridges.
        if (grab.travel > 11) {
          grab.travel = 0
          if (ok('ridge', 0.03)) sfx.noise({ dur: 0.04, freq: rnd(1300, 1900), vol: 0.04, q: 4 })
        }
      } else if (grab.travel > 30 && overWater(p.x, p.y, 1.02)) {
        grab.travel = 0
        ripple(p.x, p.y, 1)
        if (ok('stir', 0.13)) plip(0.035)
      }
    }
  }

  function up(p: Pointer): void {
    const grab = grabs.get(p.id)
    grabs.delete(p.id)
    if (!grab) return
    if (grab.kind === 'carry') {
      if (grab.gm.place === 'held' && grab.gm.holder === p) release(grab.gm, p)
    } else if (grab.kind === 'wring') {
      grab.gm.tw.target = 0
    } else if (grab.kind === 'fold') {
      const gm = grab.gm
      if (gm.place === 'ground' && gm.foldP > 0 && gm.foldTo === 0) gm.foldTo = gm.foldP > 0.4 ? 1 : -1
    } else if (grab.kind === 'tug') {
      grab.gm.tugTo = 0
    } else if (grab.kind === 'soap') {
      soap.held = null
      soap.wob.kick(-30)
    } else if (grab.kind === 'peg') {
      let best: { gm: Garment; c: number; d: number } | null = null
      for (const gm of garments) {
        if (gm.place !== 'line') continue
        for (let c = 0; c < gm.pegs.length; c++) {
          if (gm.pegs[c]) continue
          const [px, py] = pegPos(gm, c)
          // Anywhere on the hanging cloth counts for its nearer free corner.
          const onCloth = Math.abs(p.x - SLOTS[gm.slot]!) < gm.w / 2 + 20 && p.y > py - 60 && p.y < py + gm.h
          const dd = dist(p.x, p.y, px, py)
          if ((dd < 115 || onCloth) && (!best || dd < best.d)) best = { gm, c, d: dd }
        }
      }
      if (best) pegOn(best.gm, best.c)
      else {
        const [bx, by] = bagMouth()
        flyPeg(grab.x, grab.y, bx, by, () => {
          bagCount++
          bagSwing.kick(0.5)
          tok()
        })
      }
    } else if (grab.kind === 'basket') {
      if (basket.holder !== p) return
      basket.holder = null
      if (p.x > 1010 || basket.x > 1000) leave()
      else {
        door.target = 0.45
        basket.sq.value = 0.94
        sfx.tone({ freq: 150, to: 95, dur: 0.1, type: 'sine', vol: 0.05 })
      }
    }
  }

  // ------------------------------------------------------------------ update
  const invite = () => {
    if (chapter !== 'play') return
    const racked = garments.find((gm) => gm.place === 'rack')
    const tubbed = garments.find((gm) => gm.place === 'tub')
    const unpegged = garments.find((gm) => gm.place === 'line' && pegCount(gm) < gm.anchors.length)
    if (basketReady()) doorRattle.kick(9)
    else if (racked) addDrop(TX + rnd(-10, 10), hemY(racked), 0, 20)
    else if (tubbed) ripple(TX + rnd(-130, 130), 655, 1.2)
    else if (unpegged && bagCount > 0) bagSwing.kick(1.1)
    else if (basket.items.length > 0) basket.heap.kick(90)
    else gust = Math.min(1, gust + 0.3)
  }

  const updateBird = (dt: number) => {
    const t = stage.time
    bird.hop.update(dt)
    if (bird.state === 'away') {
      if (t < bird.next) return
      const spots = SLOTS.filter((_, i) => slotFree(i))
      spots.push(928)
      bird.perch = spots[Math.floor(rnd(0, spots.length))]!
      bird.state = 'coming'
      bird.fromX = Math.random() < 0.5 ? -60 : W + 60
      bird.fromY = rnd(30, 110)
      bird.face = bird.fromX < bird.perch ? 1 : -1
      bird.t = 0
    } else if (bird.state === 'coming') {
      bird.t = Math.min(1, bird.t + dt / 2.2)
      const k = ease.outCubic(bird.t)
      const ty = lineY(bird.perch) - 13
      bird.x = lerp(bird.fromX, bird.perch, k)
      bird.y = lerp(bird.fromY, ty, k) - Math.sin(k * Math.PI) * 40
      if (bird.t >= 1) {
        bird.state = 'perched'
        bird.until = t + (chapter === 'rest' ? rnd(30, 50) : rnd(14, 22))
        lineDip.kick(34)
        bird.hop.kick(-60)
        if (chapter === 'rest') chirp()
      }
    } else if (bird.state === 'perched') {
      bird.x = bird.perch
      bird.y = lineY(bird.perch) - 13
      if (t > bird.lookAt) {
        bird.lookAt = t + rnd(1.2, 3.2)
        bird.look = Math.random() < 0.3 ? 0 : rnd(-2, 2)
        if (Math.random() < 0.3) bird.face = bird.face === 1 ? -1 : 1
        if (Math.random() < 0.3) bird.hop.kick(-70)
      }
      if (t > bird.until || garments.some((gm) => gm.slot >= 0 && SLOTS[gm.slot] === bird.perch)) startle()
    } else {
      bird.t = Math.min(1, bird.t + dt / 2)
      const k = ease.inQuad(bird.t)
      bird.x = lerp(bird.fromX, bird.toX, k)
      bird.y = lerp(bird.fromY, bird.toY, k) - Math.sin(k * Math.PI) * 30
      if (bird.t >= 1) bird.state = 'away'
    }
  }

  const update = (dt: number) => {
    const t = stage.time
    gust = Math.max(0, gust - dt * 0.3)
    wind = 0.3 + 0.2 * Math.sin(t * 0.37) + 0.12 * Math.sin(t * 0.91 + 1.7) + gust
    lineDip.update(dt)
    bagSwing.target = wind * 0.06
    bagSwing.update(dt)
    for (const k of crownKick) k.update(dt)
    door.update(dt)
    doorRattle.update(dt)
    basket.sq.target = 1
    basket.sq.update(dt)
    basket.heap.update(dt)
    soap.wob.update(dt)
    if (chapter === 'rest') restGlow = Math.min(1, restGlow + dt / 8)
    if (chapter !== 'play' && nextArt && nextArt.jobs.length > 0 && ++prepTick % 4 === 0) nextArt.jobs.shift()!()

    if (basket.holder) {
      basket.x = damp(basket.x, clamp(basket.holder.x + basket.grab.dx, 120, 1120), 14, dt)
      basket.y = damp(basket.y, clamp(basket.holder.y + basket.grab.dy, 470, 690), 14, dt)
    } else if (chapter === 'play' && !basket.hidden) {
      basket.x = damp(basket.x, BASKET_HOME.x, 7, dt)
      basket.y = damp(basket.y, BASKET_HOME.y, 7, dt)
    }

    soap.x = damp(soap.x, soap.held ? soap.held.x : SOAP_HOME.x, soap.held ? 24 : 8, dt)
    soap.y = damp(soap.y, soap.held ? soap.held.y - 16 : SOAP_HOME.y, soap.held ? 24 : 8, dt)

    for (const [id, grab] of grabs) {
      if (grab.kind !== 'peg') continue
      const p = stage.pointers.get(id)
      if (!p) continue
      grab.x = damp(grab.x, p.x, 26, dt)
      grab.y = damp(grab.y, p.y - 22, 26, dt)
    }

    // Nothing stays in a hand that is no longer there.
    if (soap.held && stage.pointers.get(soap.held.id) !== soap.held) soap.held = null
    if (basket.holder && stage.pointers.get(basket.holder.id) !== basket.holder) {
      basket.holder = null
      if (chapter === 'play') door.target = 0.45
    }
    for (const gm of garments) {
      if (gm.place === 'held' && gm.holder && stage.pointers.get(gm.holder.id) !== gm.holder) release(gm, gm.holder)
      gm.drape.update(dt)
      gm.tilt.update(dt)
      gm.swing.update(dt)
      gm.tw.update(dt)
      gm.tugX = damp(gm.tugX, gm.tugTo, 12, dt)
      gm.rubY = damp(gm.rubY, 0, 5, dt)
      if (gm.place === 'glide' && gm.glide) {
        const gl = gm.glide
        gl.t = Math.min(1, gl.t + dt / gl.dur)
        const k = ease.inOutQuad(gl.t)
        gm.x = lerp(gl.x0, gl.x1, k)
        gm.y = lerp(gl.y0, gl.y1, k) - Math.sin(k * Math.PI) * gl.lift
        if (gl.t >= 1) {
          gm.glide = null
          gl.done()
        }
      } else if (gm.place === 'held' && gm.holder) {
        const tx = gm.holder.x
        const ty = gm.holder.y - (gm.fold > 0 ? (gm.fh * GS) / 2 : 14)
        gm.swing.target = clamp((gm.x - tx) * 0.02, -0.7, 0.7)
        gm.x = damp(gm.x, tx, 22, dt)
        gm.y = damp(gm.y, ty, 22, dt)
        if (gm.wet > 0.3 && t > gm.dripAt) {
          gm.dripAt = t + rnd(0.5, 1.1)
          addDrop(gm.x + rnd(-gm.w / 3, gm.w / 3), gm.y + gm.h)
        }
      } else if (gm.place === 'line') {
        const n = pegCount(gm)
        const rate = (WRUNG / 22) * (n >= gm.anchors.length ? 1 : n > 0 ? 0.75 : 0.55)
        if (gm.wet > 0) gm.wet = Math.max(0, gm.wet - rate * dt * (0.8 + wind * 0.6))
        if (gm.wet > 0.34 && t > gm.dripAt) {
          gm.dripAt = t + rnd(1.1, 2.4)
          addDrop(SLOTS[gm.slot]! + rnd(-gm.w / 3, gm.w / 3), lineY(SLOTS[gm.slot]!) + gm.h * (1 - gm.drape.value))
        }
      } else if (gm.place === 'ground') {
        if (gm.wet > 0) gm.wet = Math.max(0, gm.wet - (WRUNG / 50) * dt)
        if (gm.foldTo !== 0) {
          gm.foldP = clamp(gm.foldP + gm.foldTo * dt * 5, 0, 1)
          if (gm.foldP >= 1) {
            bakeFold(gm)
            clothSound(0.07)
          } else if (gm.foldP <= 0) gm.foldTo = 0
        }
      } else if (gm.place === 'rack') {
        const wringing = [...grabs.values()].some((gr) => gr.kind === 'wring' && gr.gm === gm)
        if (!wringing) gm.tw.target = 0
        if (gm.wet > WRUNG + 0.01 && t > gm.dripAt) {
          const fast = gm.wet > 0.8
          gm.dripAt = t + (fast ? rnd(0.28, 0.5) : rnd(1.3, 2.4))
          if (fast) gm.wet -= 0.004
          addDrop(TX + rnd(-gm.w / 3, gm.w / 3), hemY(gm) - rnd(0, 12), 0, 20)
        }
      }
      if (gm.suds.length > 0) {
        const fade = gm.place === 'tub' ? 0.1 : 1.6
        for (let i = gm.suds.length - 1; i >= 0; i--) {
          const s = gm.suds[i]!
          s.life -= dt * fade
          if (s.life <= 0) gm.suds.splice(i, 1)
        }
      }
      if (gm.dirty || Math.round(gm.wet * 40) !== gm.wetQ) compose(gm)
    }

    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i]!
      d.vy += 1100 * dt
      d.x += d.vx * dt
      d.y += d.vy * dt
      if (d.y < d.land) continue
      drops.splice(i, 1)
      if (d.inTub) {
        ripple(d.x, d.land, 0.7)
        if (ok('drip', 0.09)) plip(0.028)
      }
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]!
      r.age += dt
      if (r.age > 1.3) ripples.splice(i, 1)
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]!
      b.life -= dt
      b.vy = damp(b.vy, -12, 1.2, dt)
      b.vx = damp(b.vx, 10 + wind * 40, 0.8, dt)
      b.x += (b.vx + Math.sin(t * 2 + b.seed) * 12) * dt
      b.y += b.vy * dt
      if (b.life <= 0 || b.y < -30 || b.x > W + 30) bubbles.splice(i, 1)
    }
    for (let i = leaves.length - 1; i >= 0; i--) {
      const l = leaves[i]!
      l.life -= dt
      l.x += (l.vx + wind * 40 + Math.sin(t * 2.2 + l.rot) * 26) * dt
      l.y += l.vy * dt
      l.rot += dt * 1.6
      if (l.life <= 0 || l.y > 760) leaves.splice(i, 1)
    }
    for (let i = flyPegs.length - 1; i >= 0; i--) {
      const f = flyPegs[i]!
      f.t += dt / 0.34
      if (f.t < 1) continue
      flyPegs.splice(i, 1)
      f.done()
    }
    foam = Math.max(0, foam - dt * 0.004)
    // A leaf or a petal now and then, as the season has it.
    if (ok('leaf', day % 3 === 0 ? 11 : 4.5) && t > 2) dropLeaf(Math.random() < 0.5 ? rnd(20, 250) : rnd(850, 1120), rnd(90, 130))
    updateBird(dt)
    if (t - lastTouch > 6 && t - lastInvite > 5) {
      lastInvite = t
      invite()
    }
  }

  // -------------------------------------------------------------------- draw
  const drawCloth = (g: CanvasRenderingContext2D, gm: Garment, ax: number, ay: number, sway: number, drape: number, tw: number) => {
    const s = gm.tex.s
    const src = gm.tex.c
    const k = Math.min(1, drape / 0.06)
    const twn = Math.min(1, tw)
    if (drape > 0.01) {
      const dh = drape * gm.h
      const bw = gm.cw * (1 - 0.42 * twn)
      g.save()
      g.translate(ax, ay)
      g.scale(1, -1)
      g.drawImage(gm.back.c, 0, PAD * s, src.width, dh * s, -bw / 2, -dh * 0.94, bw, dh * 0.94)
      g.restore()
    }
    const y0 = PAD * k + drape * gm.h
    const total = gm.ch - y0
    const top = ay - (PAD + 5) * (1 - k)
    const n = tw > 0.03 ? 26 : 18
    const tt = stage.time
    for (let i = 0; i < n; i++) {
      const v = (i + 0.5) / n
      let off = sway * 30 * v ** 1.5 + Math.sin(tt * 2.1 + v * 3.4 + gm.phase) * sway * 5 * v
      let wf = 1
      if (tw > 0.03) {
        const a = v * tw * 4.2 + gm.phase
        wf = (1 - 0.42 * twn * (0.35 + 0.65 * v)) * (0.8 + 0.2 * Math.abs(Math.cos(a)))
        off += Math.sin(a) * 6 * twn * v
      }
      g.drawImage(src, 0, (y0 + (i / n) * total) * s, src.width, (total / n) * s, ax - (gm.cw / 2) * wf + off, top + (i / n) * total, gm.cw * wf, total / n + 0.7)
    }
  }

  const drawFlat = (g: CanvasRenderingContext2D, gm: Garment, cx: number, cy: number) => {
    const fw = gm.fw * GS
    const fh = gm.fh * GS
    g.save()
    g.translate(cx, cy)
    g.rotate(gm.rot)
    g.fillStyle = 'rgba(60,60,30,0.1)'
    g.beginPath()
    g.ellipse(4, fh * 0.42, fw * 0.4, fh * 0.12, 0, 0, TAU)
    g.fill()
    const src = gm.flat
    if (gm.foldP <= 0.001 || gm.fold >= 2) {
      g.drawImage(src, -fw / 2, -fh / 2, fw, fh)
      g.restore()
      return
    }
    const c = Math.cos(gm.foldP * Math.PI)
    const flap = c > 0 ? src : gm.flatBack
    const lift = Math.sin(gm.foldP * Math.PI) * 9
    const sw = src.width
    const sh = src.height
    if (gm.fold === 0) {
      if (gm.foldSide < 0) {
        g.drawImage(src, sw / 2, 0, sw / 2, sh, 0, -fh / 2, fw / 2, fh)
        g.scale(c, 1)
        g.drawImage(flap, 0, 0, sw / 2, sh, -fw / 2, -fh / 2 - lift, fw / 2, fh)
      } else {
        g.drawImage(src, 0, 0, sw / 2, sh, -fw / 2, -fh / 2, fw / 2, fh)
        g.scale(c, 1)
        g.drawImage(flap, sw / 2, 0, sw / 2, sh, 0, -fh / 2 - lift, fw / 2, fh)
      }
    } else if (gm.foldSide < 0) {
      g.drawImage(src, 0, sh / 2, sw, sh / 2, -fw / 2, 0, fw, fh / 2)
      g.scale(1, c)
      g.drawImage(flap, 0, 0, sw, sh / 2, -fw / 2 - lift * 0.4, -fh / 2, fw, fh / 2)
    } else {
      g.drawImage(src, 0, 0, sw, sh / 2, -fw / 2, -fh / 2, fw, fh / 2)
      g.scale(1, c)
      g.drawImage(flap, 0, sh / 2, sw, sh / 2, -fw / 2 - lift * 0.4, 0, fw, fh / 2)
    }
    g.restore()
  }

  const drawOnLine = (g: CanvasRenderingContext2D, gm: Garment) => {
    const sx = SLOTS[gm.slot]!
    const px = sx + pivotX(gm)
    const py = lineY(px)
    const t = stage.time
    const n = pegCount(gm)
    const loose = (1 - 0.62 * Math.min(1, gm.wet / WRUNG)) * (n === 0 ? 0.55 : 1)
    const sway = (wind * 0.42 + Math.sin(t * (0.95 + (gm.phase % 1) * 0.3) + gm.phase) * (0.16 + wind * 0.45)) * loose + gm.tugX
    g.save()
    g.translate(px, py)
    g.rotate(gm.tilt.value + sway * 0.03)
    drawCloth(g, gm, -pivotX(gm), 0, sway, gm.drape.value, 0)
    g.restore()
    for (let c = 0; c < gm.pegs.length; c++) {
      if (!gm.pegs[c]) continue
      const [x, y] = pegPos(gm, c)
      drawPeg(g, x, y, gm.tugX * 0.2)
    }
  }

  const drawSuds = (g: CanvasRenderingContext2D, gm: Garment) => {
    if (gm.suds.length === 0) return
    const top = TUB_TOP + gm.rubY - 5
    g.fillStyle = 'rgba(255,255,255,0.86)'
    g.beginPath()
    for (const s of gm.suds) {
      const r = s.r * Math.min(1, s.life * 3)
      g.moveTo(TX + s.x + r, top + s.y)
      g.arc(TX + s.x, top + s.y, r, 0, TAU)
    }
    g.fill()
    g.strokeStyle = 'rgba(120,160,175,0.45)'
    g.lineWidth = 1.2
    g.stroke()
  }

  const waterColor = (alpha: number): string => {
    const r = Math.round(lerp(168, 190, murk))
    const gg = Math.round(lerp(215, 184, murk))
    const b = Math.round(lerp(218, 160, murk))
    return `rgba(${r},${gg},${b},${alpha})`
  }

  const drawRipples = (g: CanvasRenderingContext2D) => {
    g.lineWidth = 2
    for (const r of ripples) {
      const k = r.age / 1.3
      g.strokeStyle = `rgba(255,255,255,${0.6 * (1 - k)})`
      g.beginPath()
      g.ellipse(r.x, r.y, (10 + k * 54) * r.size, (3 + k * 15) * r.size, 0, 0, TAU)
      g.stroke()
    }
  }

  const drawTub = (g: CanvasRenderingContext2D) => {
    const t = stage.time
    g.drawImage(tubBack.c, TX - 250, 540, 500, 150)
    g.save()
    g.beginPath()
    g.ellipse(TX, WATER_Y, WATER_RX, WATER_RY, 0, 0, TAU)
    g.fillStyle = waterColor(1)
    g.fill()
    g.clip()
    g.fillStyle = 'rgba(40,74,84,0.16)'
    g.beginPath()
    g.ellipse(TX, WATER_Y - 34, WATER_RX, 26, 0, 0, TAU)
    g.fill()
    drawRipples(g)
    g.restore()

    g.drawImage(board.c, TX - BOARD_W / 2, 400, BOARD_W, BOARD_H)
    const tubbed = garments.find((gm) => gm.place === 'tub')
    if (tubbed) {
      drawCloth(g, tubbed, TX, TUB_TOP + tubbed.rubY, 0, 0, 0)
      drawSuds(g, tubbed)
    }
    for (const gm of garments) if (gm.place === 'glide' && gm.glide && !gm.glide.flat && gm.glide.x1 === TX) drawCloth(g, gm, gm.x, gm.y, 0, gm.drape.value, 0)

    // The water in front of the board: what dips in is seen through it.
    g.save()
    g.beginPath()
    g.rect(TX - WATER_RX, 640, WATER_RX * 2, 60)
    g.clip()
    g.beginPath()
    g.ellipse(TX, WATER_Y, WATER_RX, WATER_RY, 0, 0, TAU)
    g.fillStyle = waterColor(0.74)
    g.fill()
    g.clip()
    for (let i = 0; i < 4; i++) {
      g.fillStyle = `rgba(255,255,255,${0.2 + 0.1 * Math.sin(t * 0.9 + i * 1.9)})`
      g.beginPath()
      g.ellipse(TX - 120 + i * 82 + Math.sin(t * 0.5 + i) * 10, 652 + (i % 2) * 9, 30 + i * 4, 2.6, 0, 0, TAU)
      g.fill()
    }
    drawRipples(g)
    g.restore()

    const shown = Math.floor(foam * foamSpots.length)
    if (shown > 0) {
      g.fillStyle = 'rgba(255,255,255,0.88)'
      g.beginPath()
      for (let i = 0; i < shown; i++) {
        const f = foamSpots[i]!
        const y = f.y + Math.sin(t * 1.3 + f.seed) * 1.2
        g.moveTo(f.x + f.r, y)
        g.arc(f.x, y, f.r, 0, TAU)
      }
      g.fill()
      g.strokeStyle = 'rgba(120,160,175,0.4)'
      g.lineWidth = 1.2
      g.stroke()
    }

    const racked = garments.find((gm) => gm.place === 'rack')
    if (racked) drawCloth(g, racked, TX, BOARD_TOP + 2, 0, racked.drape.value, Math.abs(racked.tw.value))
    g.drawImage(tubFront.c, TX - 250, 550, 500, 270)
  }

  const drawSoap = (g: CanvasRenderingContext2D) => {
    g.save()
    g.translate(soap.x, soap.y)
    g.rotate(-0.12 + soap.wob.value * 0.05)
    if (soap.held) {
      g.fillStyle = 'rgba(40,50,20,0.12)'
      g.beginPath()
      g.ellipse(6, 40, 30, 7, 0, 0, TAU)
      g.fill()
    }
    g.fillStyle = '#d9c58e'
    g.beginPath()
    g.roundRect(-34, -14, 68, 34, 11)
    g.fill()
    g.fillStyle = '#f5e9bf'
    g.beginPath()
    g.roundRect(-34, -19, 68, 32, 11)
    g.fill()
    g.strokeStyle = 'rgba(150,120,60,0.5)'
    g.lineWidth = 1.6
    g.stroke()
    g.beginPath()
    g.ellipse(0, -3, 19, 8, 0, 0, TAU)
    g.strokeStyle = 'rgba(190,160,90,0.55)'
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.55)'
    g.beginPath()
    g.ellipse(-16, -12, 9, 2.6, -0.1, 0, TAU)
    g.fill()
    g.restore()
  }

  const HEAP: [number, number, number][] = [
    [-38, -8, -0.5],
    [34, -12, 0.5],
    [-10, -28, 0.16],
    [14, -40, -0.22],
  ]

  const drawBasket = (g: CanvasRenderingContext2D) => {
    if (basket.hidden || basket.alpha <= 0.01) return
    g.save()
    g.globalAlpha = basket.alpha
    g.fillStyle = 'rgba(50,60,30,0.2)'
    g.beginPath()
    g.ellipse(basket.x + 8, basket.y + 100 * basket.scale, 98 * basket.scale, 16 * basket.scale, 0, 0, TAU)
    g.fill()
    g.translate(basket.x, basket.y + 92 * basket.scale)
    g.scale(basket.scale * (2 - basket.sq.value), basket.scale * basket.sq.value)
    g.translate(0, -92)
    g.drawImage(basketBack.c, -120, -36, 240, 70)
    g.save()
    g.beginPath()
    g.rect(-BASKET_RX - 2, -170, BASKET_RX * 2 + 4, 192)
    g.clip()
    let stack = 0
    basket.items.forEach((gm, i) => {
      if (gm.fold === 2) return
      const [hx, hy, hr] = HEAP[i % HEAP.length]!
      const lift = i === basket.items.length - 1 ? basket.heap.value : 0
      g.save()
      g.translate(hx, hy - lift)
      g.rotate(hr + lift * 0.02)
      g.drawImage(gm.tex.c, -gm.cw * 0.31, -gm.ch * 0.31, gm.cw * 0.62, gm.ch * 0.62)
      g.restore()
    })
    for (const gm of basket.items) {
      if (gm.fold !== 2) continue
      const y = 2 - stack * 17
      const wv = 118 - stack * 4
      g.fillStyle = gm.color
      g.beginPath()
      g.roundRect(-wv / 2, y - 18, wv, 19, 8)
      g.fill()
      g.strokeStyle = 'rgba(74,50,34,0.4)'
      g.lineWidth = 1.6
      g.stroke()
      g.fillStyle = 'rgba(255,248,228,0.28)'
      g.beginPath()
      g.roundRect(-wv / 2 + 5, y - 16, wv - 10, 5, 3)
      g.fill()
      g.strokeStyle = 'rgba(74,50,34,0.22)'
      g.beginPath()
      g.moveTo(-wv / 2 + 6, y - 8)
      g.lineTo(wv / 2 - 6, y - 8)
      g.stroke()
      stack++
    }
    g.restore()
    g.drawImage(basketFront.c, -120, -30, 240, 150)
    g.restore()
  }

  const drawDoor = (g: CanvasRenderingContext2D) => {
    const o = clamp(door.value + doorRattle.value * 0.06, 0, 1.15)
    const c = Math.cos(o * 1.3)
    const wv = DOOR.w * c
    if (o > 0.004) {
      g.drawImage(inside.c, DOOR.x, DOOR.y, DOOR.w, DOOR.h)
      if (chapter === 'rest') {
        // The lamp inside breathes a little: the way back in, and out again.
        g.fillStyle = `rgba(255,214,140,${0.1 + 0.08 * Math.sin(stage.time * 1.1)})`
        g.fillRect(DOOR.x, DOOR.y, DOOR.w - wv, DOOR.h)
      }
    }
    g.drawImage(doorLeaf.c, DOOR.x + DOOR.w - wv, DOOR.y, wv, DOOR.h)
    if (o > 0.004) {
      g.fillStyle = `rgba(40,24,12,${0.4 * (1 - c)})`
      g.fillRect(DOOR.x + DOOR.w - wv, DOOR.y, wv, DOOR.h)
    }
  }

  const drawBag = (g: CanvasRenderingContext2D) => {
    const y = lineY(BAG_X)
    g.save()
    g.translate(BAG_X, y)
    g.rotate(bagSwing.value)
    g.strokeStyle = '#b9a67c'
    g.lineWidth = 2.4
    g.beginPath()
    g.moveTo(-38, 48)
    g.lineTo(0, 0)
    g.lineTo(38, 48)
    g.stroke()
    g.fillStyle = '#6f5a3c'
    g.beginPath()
    g.ellipse(0, 50, 38, 9, 0, 0, TAU)
    g.fill()
    for (let i = 0; i < bagCount; i++) drawPeg(g, -27 + i * 9 + (i % 2) * 2, 40 - (i % 2) * 6 - (i % 3) * 2, (i - 3) * 0.09, 0.95)
    g.drawImage(bag.c, -55, 0, 110, 140)
    g.restore()
  }

  const draw = (g: CanvasRenderingContext2D) => {
    const t = stage.time
    g.drawImage(bg.c, 0, 0, W, H)

    // Clouds keep to the open sky between the trees.
    for (let i = 0; i < clouds.length; i++) {
      const c = clouds[i]!
      const span = 880
      const x = 110 + ((t * (5 + i * 3) + i * 430 + 200) % span)
      const fade = clamp(Math.min(x - 110, 990 - x - c.w) / 120, 0, 1)
      if (fade <= 0) continue
      g.globalAlpha = fade * 0.9
      g.drawImage(c.c, x, 36 + i * 74, c.w, c.h)
    }
    g.globalAlpha = 1

    drawDoor(g)

    // The line, sagging a little more under its load.
    g.beginPath()
    g.moveTo(LINE_X0, LINE_Y)
    g.quadraticCurveTo(lineMid, LINE_Y + 2 * (SAG + lineDip.value), LINE_X1, LINE_Y)
    g.strokeStyle = '#9a8660'
    g.lineWidth = 4.6
    g.stroke()
    g.strokeStyle = '#eadcb6'
    g.lineWidth = 2.2
    g.stroke()

    for (let i = 0; i < 2; i++) {
      const c = crowns[i]!
      const px = i === 0 ? 80 : 1004
      g.save()
      g.translate(px, 130)
      g.rotate(Math.sin(t * 0.55 + i * 2) * 0.008 + wind * 0.012 + crownKick[i]!.value * 0.05)
      g.drawImage(c.c, -c.w / 2 + (i === 0 ? -20 : 20), -c.h + 18, c.w, c.h)
      g.restore()
    }

    drawBag(g)
    for (const gm of garments) if (gm.place === 'line') drawOnLine(g, gm)
    if (bird.state === 'perched') drawBird(g, bird.x, bird.y, bird.face, 0, bird.hop.value, bird.look)

    drawTub(g)
    if (!soap.held) drawSoap(g)
    drawBasket(g)
    for (const gm of garments) if (gm.place === 'ground') drawFlat(g, gm, gm.x, gm.y)

    for (const gm of garments) {
      if (gm.place === 'glide' && gm.glide) {
        if (gm.glide.flat) drawFlat(g, gm, gm.x, gm.y)
        else if (gm.glide.x1 !== TX) drawCloth(g, gm, gm.x, gm.y, 0, gm.drape.value, 0)
      } else if (gm.place === 'held') {
        if (gm.fold > 0) drawFlat(g, gm, gm.x, gm.y + (gm.fh * GS) / 2)
        else {
          g.save()
          g.translate(gm.x, gm.y)
          g.rotate(gm.swing.value)
          drawCloth(g, gm, 0, 0, gm.swing.value * 0.8, 0, 0)
          g.restore()
        }
      }
    }
    if (soap.held) drawSoap(g)
    for (const f of flyPegs) {
      const k = ease.inOutQuad(clamp(f.t, 0, 1))
      drawPeg(g, lerp(f.x0, f.x1, k), lerp(f.y0, f.y1, k) - Math.sin(k * Math.PI) * 50, k * TAU)
    }
    for (const [id, grab] of grabs) {
      if (grab.kind !== 'peg') continue
      const p = stage.pointers.get(id)
      drawPeg(g, grab.x, grab.y, p ? clamp((grab.x - p.x) * 0.02, -0.5, 0.5) : 0, 1.25)
    }

    if (drops.length > 0) {
      g.beginPath()
      for (const d of drops) {
        g.moveTo(d.x - d.vx * 0.016, d.y - Math.min(14, d.vy * 0.022))
        g.lineTo(d.x, d.y)
      }
      g.strokeStyle = 'rgba(90,140,160,0.55)'
      g.lineWidth = 5
      g.stroke()
      g.strokeStyle = '#e6f6f7'
      g.lineWidth = 3
      g.stroke()
    }
    for (const b of bubbles) {
      const a = Math.min(1, b.life)
      g.strokeStyle = `rgba(255,255,255,${0.85 * a})`
      g.fillStyle = `rgba(215,238,250,${0.2 * a})`
      g.lineWidth = 1.8
      g.beginPath()
      g.arc(b.x, b.y, b.r, 0, TAU)
      g.fill()
      g.stroke()
      g.strokeStyle = `rgba(240,190,220,${0.5 * a})`
      g.beginPath()
      g.arc(b.x, b.y, b.r - 2.4, 0.4, 1.9)
      g.stroke()
      g.fillStyle = `rgba(255,255,255,${0.8 * a})`
      g.beginPath()
      g.arc(b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.18, 0, TAU)
      g.fill()
    }
    for (const l of leaves) {
      g.save()
      g.translate(l.x, l.y)
      g.rotate(l.rot)
      g.globalAlpha = Math.min(1, l.life)
      g.fillStyle = l.color
      g.beginPath()
      g.ellipse(0, 0, 8, 4 * Math.abs(Math.cos(l.rot * 1.7)) + 1, 0, 0, TAU)
      g.fill()
      g.restore()
    }
    g.globalAlpha = 1
    if (bird.state === 'coming' || bird.state === 'leaving') drawBird(g, bird.x, bird.y, bird.face, (Math.sin(t * 26) + 1) / 2 + 0.05, 0, 0)

    // Grass at the very front, leaning with the wind.
    for (let pass = 0; pass < 2; pass++) {
      g.beginPath()
      for (const tf of tufts) {
        for (let b = 0; b < 5; b++) {
          if ((b + (pass === 0 ? 0 : 1)) % 2 === 0) continue
          const bx = tf.x + (b - 2) * 9
          const bend = (wind * 16 + Math.sin(t * 1.4 + tf.seed + b) * 5) * (0.6 + b * 0.12)
          const hh = tf.h * (0.7 + ((b * 37) % 10) / 22)
          g.moveTo(bx, tf.y)
          g.quadraticCurveTo(bx + bend * 0.3, tf.y - hh * 0.6, bx + bend, tf.y - hh)
        }
      }
      g.strokeStyle = pass === 0 ? rgba(season.grassDark, 0.9) : rgba(season.grassLight, 0.9)
      g.lineWidth = 4
      g.stroke()
    }

    if (restGlow > 0.01) {
      g.fillStyle = `rgba(255,206,140,${0.1 * restGlow})`
      g.fillRect(0, 0, W, H)
    }
    g.drawImage(veil.c, 0, 0, W, H)
  }

  return { update, draw, down, move, up }
}

export const proto: Proto = {
  meta: {
    key: 'wash-day',
    name: 'Wash Day',
    emoji: '🧺',
    ages: [3, 7],
    pitch: 'Wash muddy play clothes in a wooden tub, wring them, peg them on the line, and fold them when the sun has dried them.',
    howTo: 'Carry a garment to the tub and rub the mud off. Pull it up, drag across it to wring, hang it and press pegs on. When it is dry, take the pegs off, fold it on the cloth and lay it in the basket; carry the full basket to the door. Open the door again for another wash day.',
    basedOn: 'Montessori cloth washing (practical life); the Waldorf kindergarten washing day',
    whyFun: 'Mud lifts off under the finger on a ridged washboard, water runs out when the cloth is twisted, and each peg presses on with a wooden click.',
    set: 'gentle',
  },
  create,
}
