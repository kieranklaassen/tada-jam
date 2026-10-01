// Nature Walk: a woodland path in the season it really is, animals that
// answer attention, a handful of treasures for the basket, and at the end of
// the path the nature table at home. Nothing is counted, nothing hurries, and
// the wheel of the year turns only when the child turns it or sets out again.

import { clamp, damp, dist, ease, inRect, lerp, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { drawBeetle, drawButterfly, drawFigure, drawFrog, drawFrogEyes, drawHare, drawRobin, drawSkyBird, drawSquirrel } from './fauna.ts'
import { CROWN, DOOR, FAR_Y, FROG_ROCK, GROUND_H, GROUND_Y, STREAM_X, TILE, drawCottageDoor, drawFall, drawHill, makeCottage, makeCover, makeFar, makeHaze, makeSky, makeStream, makeTree, pathY, perchOf, startGround, streamHalf, streamX } from './flora.ts'
import { BASKET_HANDLE, BASKET_HOME, BOX, CANDLE, DOORWAY, PEG, SILL, TABLE, WICK, WIN, drawFlame, makeBasket, makeCandle, makeCloth, makeGlow, makeHomeBg, makeView, makeWheel } from './home.ts'
import { TAU, freeSprite, makeSprite, mix, put, rgba, rng, settle } from './paint.ts'
import type { G, Sprite } from './paint.ts'
import type { Staged } from './flora.ts'
import { FINDS, PALETTES, seasonOfMonth } from './seasons.ts'
import type { Kind, Palette, Season, TreeKind } from './seasons.ts'
import * as snd from './sound.ts'
import { KINDS, NOTE, SOFT, makeThings } from './things.ts'

const WORLD = 3700
const START_X = 360
const MIN_X = 300
const COTTAGE = { x: 3380, y: 612 }
const DOOR_WX = COTTAGE.x + DOOR.x
// The basket holds a handful.
const HANDFUL = 5
const WHEEL = { x: 104, y: 116 }
const BAG = { x: 112, y: 662, s: 0.62 }

interface TreeSpot {
  x: number
  y: number
  kind: TreeKind
  s: number
  flip: boolean
}

const TREES: TreeSpot[] = [
  { x: 70, y: 562, kind: 'fir', s: 0.95, flip: false },
  { x: 250, y: 548, kind: 'cherry', s: 0.9, flip: false },
  { x: 930, y: 585, kind: 'oak', s: 1, flip: false },
  { x: 1330, y: 560, kind: 'birch', s: 0.9, flip: true },
  { x: 1960, y: 556, kind: 'cherry', s: 0.85, flip: true },
  { x: 2330, y: 552, kind: 'fir', s: 0.8, flip: false },
  { x: 2500, y: 582, kind: 'birch', s: 1, flip: false },
  { x: 2830, y: 575, kind: 'fir', s: 1.05, flip: false },
  { x: 3070, y: 555, kind: 'cherry', s: 0.8, flip: false },
  { x: 3660, y: 575, kind: 'oak', s: 0.85, flip: true },
]
const OAK = TREES[2]
const BIRCH = TREES[6]

const MID: TreeSpot[] = (() => {
  const r = rng(7)
  const kinds: TreeKind[] = ['birch', 'fir', 'cherry', 'fir', 'oak', 'birch', 'cherry']
  const out: TreeSpot[] = []
  for (let i = 0; i < 15; i++) out.push({ x: -80 + i * 205 + r() * 90, y: 474 + r() * 10, kind: kinds[i % kinds.length], s: 0.46 + r() * 0.14, flip: r() < 0.5 })
  return out
})()

const LEAF = { x: 690, y: pathY(690) - 62 }
const GRASS = { x0: 1520, x1: 1770, y: 606 }
const HARE = { x: 1645, y: 604 }
const POOL: [number, number] = [streamX(604) + 2, 608]
const SPOTS: { x: number; front: boolean }[] = [
  { x: 540, front: true },
  { x: 1050, front: false },
  { x: 1300, front: true },
  { x: 1850, front: false },
  { x: 2265, front: true },
  { x: 2600, front: false },
  { x: 2915, front: false },
]

interface Vis {
  season: Season
  pal: Palette
  sky?: Sprite
  far?: Sprite
  haze?: Sprite
  ground?: Sprite
  groundJob?: Staged
  cover?: Sprite
  stream?: Sprite
  cottage?: Sprite
  cloth?: Sprite
  view?: Sprite
  trees: Partial<Record<TreeKind, Sprite>>
}

interface Turn {
  from: Vis
  to: Vis
  t: number
  ready: boolean
  // How much of the old season's still picture is painted: 3 is all of it.
  snapped: number
}

interface Find {
  // null means "whatever the season has left at this spot".
  kind: Kind | null
  spot: number
  x: number
  y: number
  state: 'ground' | 'toBag' | 'toGround' | 'gone'
  t: number
  pop: Spring
  seed: number
}

interface Fall {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  size: number
  c: number
  // Ambient pieces live for ever and wrap; loose ones settle and fade.
  life: number
  floor: number
  seed: number
}

interface Placed {
  kind: Kind
  x: number
  y: number
  rot: number
  ox: number
  oy: number
  sq: Spring
  sill: boolean
}

interface Drag {
  kind: Kind
  id: number
  x: number
  y: number
  tx: number
  ty: number
  rot: number
  fromBasket: boolean
  // Where it was resting when it was picked up.
  restX: number
  restY: number
  moved: number
  at: number
  lift: number
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  const things = makeThings()
  const wheelSprite = makeWheel()
  const basket = makeBasket()
  const homeBg = makeHomeBg()
  const candleSprite = makeCandle()
  const glow = makeGlow()

  // ---- seasons -----------------------------------------------------------
  const cache = new Map<Season, Vis>()
  const visFor = (season: Season): Vis => {
    let v = cache.get(season)
    if (!v) {
      v = { season, pal: PALETTES[season], trees: {} }
      cache.set(season, v)
    }
    return v
  }
  const spritesOf = (v: Vis): (Sprite | undefined)[] => [v.sky, v.far, v.haze, v.ground, v.cover, v.stream, v.cottage, v.cloth, v.view, v.trees.oak, v.trees.cherry, v.trees.birch, v.trees.fir]
  // The first time a painting is drawn to the screen it has to be handed to
  // the screen's own memory. Drawing it one pixel big ahead of time spreads
  // that over quiet frames instead of the one where a whole season appears.
  const touch = (g: G, s: Sprite | undefined): void => {
    if (s && s.canvas.width > 0) g.drawImage(s.canvas, 0, 0, 1, 1)
  }
  let warmed = false
  const freeVis = (v: Vis): void => {
    for (const s of [v.sky, v.far, v.haze, v.ground, v.groundJob?.sprite, v.cover, v.stream, v.cottage, v.cloth, v.view, v.trees.oak, v.trees.cherry, v.trees.birch, v.trees.fir]) freeSprite(s)
  }

  // The one use of the real clock: which season to open in.
  const opening = seasonOfMonth(new Date().getMonth())
  let vis = visFor(opening)
  let turn: Turn | null = null
  const season = (): Season => (turn ? turn.to.season : vis.season)

  // One missing painting for the walk, nearest things first, or null.
  const missingWalk = (v: Vis, camX: number): (() => void) | null => {
    if (!v.sky) return () => (v.sky = makeSky(v.pal))
    if (!v.ground) {
      return () => {
        v.groundJob ??= startGround(v.pal, v.season)
        if (v.groundJob.step()) {
          v.ground = v.groundJob.sprite
          v.groundJob = undefined
        }
      }
    }
    if (!v.far) return () => (v.far = makeFar(v.pal, v.season))
    if (!v.haze) return () => (v.haze = makeHaze(v.pal))
    if (!v.cover) return () => (v.cover = makeCover(v.pal, v.season))
    for (const t of TREES) {
      const sx = t.x - camX
      if (sx > -420 && sx < W + 420 && !v.trees[t.kind]) return () => (v.trees[t.kind] = makeTree(t.kind, v.season, v.pal))
    }
    for (const t of MID) {
      const sx = t.x - camX * 0.62
      if (sx > -300 && sx < W + 300 && !v.trees[t.kind]) return () => (v.trees[t.kind] = makeTree(t.kind, v.season, v.pal))
    }
    if (!v.stream && Math.abs(STREAM_X - camX - W / 2) < W / 2 + 420) return () => (v.stream = makeStream(v.pal, v.season))
    if (!v.cottage && COTTAGE.x - camX < W + 520) return () => (v.cottage = makeCottage(v.pal, v.season))
    return null
  }
  const missingHome = (v: Vis): (() => void) | null => {
    if (!v.sky) return () => (v.sky = makeSky(v.pal))
    if (!v.cloth) return () => (v.cloth = makeCloth(v.pal))
    if (!v.view) return () => (v.view = makeView(v.pal, v.season, v.sky as Sprite))
    return null
  }

  // ---- shared state ------------------------------------------------------
  let scene: 'walk' | 'home' = 'walk'
  let lastTouch = 0
  let fade: { t: number; phase: 0 | 1 | 2; mid: () => void } | null = null

  // The wheel counts quarter turns and never unwinds.
  const wheel = { idx: opening as number, rot: spring(opening * (Math.PI / 2), 70, 12), ptr: -1, turned: 0, lastTick: 0, swing: spring(0, 30, 3), touchedAtHome: false }
  const wheelSeason = (): Season => ((((wheel.idx % 4) + 4) % 4) as Season)

  // ---- the walk ----------------------------------------------------------
  let cam = 0
  const fig = {
    x: START_X,
    v: 0,
    dir: 1,
    phase: 0,
    walk: 0,
    target: null as number | null,
    gather: null as Find | null,
    toDoor: false,
    busy: false,
    crouch: 0,
    hop: spring(0, 160, 9),
    cap: spring(0, 60, 7),
    look: 0,
    enter: 0,
  }
  let walkPtr: Pointer | null = null
  let finds: Find[] = []
  let bag: Kind[] = []
  const bagSq = spring(1, 220, 11)
  let doorOpen = 0
  const treeShake = TREES.map(() => spring(0, 50, 4.5))
  const falls: Fall[] = []
  let fallSeason: Season = opening
  const prints: { x: number; y: number; side: number }[] = []
  const ripples: { x: number; y: number; t: number }[] = []
  const skyBirds: { x: number; y: number; vx: number; vy: number; flap: number }[] = []
  let nextBird = 6
  let nextBurble = 0

  const leaf = { lift: spring(0, 90, 13), hold: 0, ptr: -1, startY: 0 }
  const beetle = { off: 0, state: 0 as 0 | 1 | 2, step: 0, open: spring(0, 120, 12), wait: 0, tickAt: 0 }
  const squirrel = { out: 0, want: 0, until: 0, tail: spring(0, 140, 8) }
  const hare = { up: spring(0, 70, 11), until: 0, ear: spring(0, 120, 9), pending: 0 }
  const blades = (() => {
    const r = rng(19)
    const out: { x: number; h: number; lean: number; w: number; row: number; bend: number; c: number; head: boolean }[] = []
    const n = 58
    for (let i = 0; i < n; i++) {
      const row = i % 2
      out.push({ x: GRASS.x0 + ((i + r()) / n) * (GRASS.x1 - GRASS.x0), h: row === 0 ? 112 + r() * 52 : 74 + r() * 44, lean: (r() - 0.5) * 0.34, w: 6 + r() * 4, row, bend: 0, c: i % 3, head: r() < 0.3 })
    }
    return out
  })()
  let grassPtr = -1
  let grassX = 0
  let swishAt = 0
  const frog = { state: 0 as 0 | 1 | 2 | 3, t: 0, x: FROG_ROCK[0], y: FROG_ROCK[1], throat: 0 }
  const robin = { perch: 0, from: 0, hop: 1, sing: 0, bob: spring(0, 200, 10) }
  const flutter = [
    { x: 1180, y: 590, c: '#f6e27a' },
    { x: 2380, y: 600, c: '#ffffff' },
    { x: 3150, y: 580, c: '#9fc4ee' },
  ]

  const kindOf = (f: Find, s: Season): Kind => f.kind ?? FINDS[s][f.spot]

  const layFinds = (): void => {
    finds = SPOTS.map((spot, i) => {
      const x = spot.x + (stage.rand() - 0.5) * 50
      return { kind: null, spot: i, x, y: pathY(x) + (spot.front ? 66 : -58), state: 'ground', t: 0, pop: spring(0, 200, 10), seed: i * 1.7 }
    })
  }

  const spawnFalls = (): void => {
    falls.length = 0
    const s = season()
    fallSeason = s
    const pal = PALETTES[s]
    for (let i = 0; i < pal.fallCount; i++) {
      falls.push({
        x: cam - 100 + Math.random() * (W + 200),
        y: Math.random() * H,
        vx: s === 2 ? 12 + Math.random() * 10 : -10 + Math.random() * 8,
        vy: s === 0 ? 30 + Math.random() * 28 : s === 1 ? 22 + Math.random() * 18 : s === 2 ? 5 + Math.random() * 8 : 34 + Math.random() * 26,
        rot: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 2.4,
        size: s === 0 ? 3 + Math.random() * 4 : s === 3 ? 6 + Math.random() * 4 : 4 + Math.random() * 3,
        c: i % pal.fall.length,
        life: 999,
        floor: 0,
        seed: Math.random() * 10,
      })
    }
  }

  const looseFalls = (x: number, y: number, n: number, spread: number, floor: number, up: number): void => {
    const s = season()
    const pal = PALETTES[s]
    const colors = s === 2 ? ['#6aa353', '#8fc068'] : pal.fall
    for (let i = 0; i < n; i++) {
      falls.push({
        x: x + (Math.random() - 0.5) * spread,
        y: y + (Math.random() - 0.5) * spread * 0.5,
        vx: (Math.random() - 0.5) * 50,
        vy: -up * (0.5 + Math.random() * 0.5) + (up === 0 ? 20 + Math.random() * 40 : 0),
        rot: Math.random() * TAU,
        spin: (Math.random() - 0.5) * 5,
        size: s === 0 ? 3 + Math.random() * 3 : 5 + Math.random() * 4,
        // Loose summer leaves borrow the autumn shape.
        c: i % colors.length,
        life: 4 + Math.random() * 2,
        floor: floor + (Math.random() - 0.5) * 16,
        seed: Math.random() * 10,
      })
    }
  }

  const resetWalk = (): void => {
    fig.x = START_X
    fig.v = 0
    fig.dir = 1
    fig.target = null
    fig.gather = null
    fig.toDoor = false
    fig.busy = false
    fig.crouch = 0
    fig.enter = 0
    walkPtr = null
    cam = 0
    bag = []
    doorOpen = 0
    prints.length = 0
    ripples.length = 0
    skyBirds.length = 0
    leaf.lift.value = 0
    leaf.lift.target = 0
    leaf.ptr = -1
    beetle.off = 0
    beetle.state = 0
    squirrel.out = 0
    squirrel.want = 0
    hare.up.value = 0
    hare.up.target = 0
    frog.state = 0
    frog.x = FROG_ROCK[0]
    frog.y = FROG_ROCK[1]
    robin.perch = 0
    robin.hop = 1
    layFinds()
    spawnFalls()
  }

  // ---- home --------------------------------------------------------------
  const placed: Placed[] = []
  let homeBag: Kind[] = []
  let drag: Drag | null = null
  const candle = { lit: false, k: 0, lean: spring(0, 40, 4) }
  const wisps: { x: number; y: number; t: number }[] = []
  let dusk = 0
  let hung = 0
  let hanging = false
  const basketSwing = spring(0, 26, 2.2)
  const homeSq = spring(1, 220, 11)
  let homeDoor = 0
  let leaving = false
  const motes: { x: number; y: number; vx: number; vy: number; life: number }[] = []
  const winFalls: { x: number; y: number; seed: number }[] = []
  for (let i = 0; i < 9; i++) winFalls.push({ x: Math.random() * WIN.w, y: Math.random() * WIN.h, seed: Math.random() * 10 })
  let boxLid = 0

  const slot = (i: number, n: number, s: number): [number, number, number] => [(i - (n - 1) / 2) * 38 * s, (-24 - ((i * 7) % 3) * 6) * s, (i - (n - 1) / 2) * 0.2 + (i % 2 ? 0.12 : -0.1)]

  const startFade = (mid: () => void): void => {
    if (fade) return
    fade = { t: 0, phase: 0, mid }
  }

  const finishTurn = (): void => {
    if (!turn) return
    vis = turn.to
    turn = null
    for (const [s, v] of cache) {
      if (v !== vis) {
        freeVis(v)
        cache.delete(s)
      }
    }
  }

  const enterHome = (): void => {
    finishTurn()
    scene = 'home'
    homeBag = bag.slice()
    bag = []
    candle.lit = false
    candle.k = 0
    dusk = 0
    hung = 0
    hanging = false
    homeDoor = 0
    leaving = false
    drag = null
    wheel.touchedAtHome = false
    wheel.ptr = -1
  }

  const leaveHome = (): void => {
    finishTurn()
    // The year turns while the child is out of the door, unless the child
    // has already turned the wheel to where they want it.
    if (!wheel.touchedAtHome) {
      wheel.idx += 1
      wheel.rot.value = wheel.idx * (Math.PI / 2) - 0.5
    }
    wheel.rot.target = wheel.idx * (Math.PI / 2)
    const next = visFor(wheelSeason())
    if (next !== vis) {
      const old = vis
      vis = next
      freeVis(old)
      cache.delete(old.season)
    }
    scene = 'walk'
    wheel.ptr = -1
    resetWalk()
  }

  // ---- walk: things that happen ------------------------------------------
  const footfall = (): void => {
    const s = season()
    const y = pathY(fig.x)
    const onStones = Math.abs(fig.x - streamX(y)) < 64
    if (onStones) {
      snd.stone(sfx)
      return
    }
    snd.step(sfx, s)
    if (s === 0) {
      prints.push({ x: fig.x, y: y + (prints.length % 2 ? 5 : -3), side: prints.length % 2 })
      if (prints.length > 46) prints.shift()
      fx.burst(fig.x - cam, y, { count: 3, color: '#ffffff', speed: 60, life: 0.35, size: 5, gravity: 200, angle: -Math.PI / 2, spread: 2 })
    } else if (s === 3) {
      looseFalls(fig.x - fig.dir * 6, y - 4, 2, 20, y + 6, 110)
    }
  }

  const arrive = (): void => {
    const f = fig.gather
    if (f) {
      fig.gather = null
      if (f.state !== 'ground') return
      fig.dir = f.x >= fig.x ? 1 : -1
      fig.busy = true
      stage.tween(
        0.26,
        (k) => (fig.crouch = k),
        ease.outQuad,
        () => {
          const carrying = bag.length + finds.filter((o) => o.state === 'toBag').length
          if (f.state === 'ground') {
            if (carrying >= HANDFUL) {
              // The basket is full: the thing is lifted, looked at and laid back.
              f.pop.kick(5)
              bagSq.kick(-2.2)
              snd.wicker(sfx)
            } else {
              f.kind = kindOf(f, season())
              f.state = 'toBag'
              f.t = 0
              snd.chime(sfx, NOTE[f.kind], 0.07)
              snd.rustle(sfx, 0.025)
            }
          }
          stage.tween(0.3, (k) => (fig.crouch = 1 - k), ease.outQuad, () => (fig.busy = false))
        },
      )
      return
    }
    if (fig.toDoor) {
      fig.toDoor = false
      fig.busy = true
      fig.dir = 1
      snd.creak(sfx)
      stage.tween(
        0.9,
        (k) => {
          doorOpen = Math.min(1, k * 2.4)
          fig.enter = clamp((k - 0.3) / 0.7, 0, 1)
        },
        ease.inOutQuad,
        () => startFade(enterHome),
      )
    }
  }

  const rustleTree = (i: number, wx: number, wy: number): void => {
    const t = TREES[i]
    const s = season()
    treeShake[i].kick((wx < t.x ? 1 : -1) * 0.22)
    const c = CROWN[t.kind]
    const bare = s === 0 && t.kind !== 'fir'
    if (s === 0) {
      snd.snowFall(sfx)
      looseFalls(t.x, t.y + c.cy * t.s * 0.7, 12, c.rx * t.s * 1.2, t.y + 6, 0)
    } else {
      snd.rustle(sfx, 0.05)
      if (t.kind !== 'fir') looseFalls(clamp(wx, t.x - c.rx * t.s * 0.7, t.x + c.rx * t.s * 0.7), Math.min(wy, t.y + c.cy * t.s * 0.6), s === 3 ? 7 : 4, 90, t.y + 10, 0)
    }
    if (!bare && Math.random() < 0.35) {
      skyBirds.push({ x: t.x - cam, y: t.y + c.cy * t.s - 40, vx: 150 + Math.random() * 60, vy: -70, flap: 0 })
      snd.peep(sfx)
    }
    if (t === OAK) {
      if (squirrel.want === 0) {
        squirrel.want = 1
        snd.scrabble(sfx)
        snd.chuk(sfx, 0.7)
      } else {
        squirrel.tail.kick(6)
        snd.chuk(sfx, 0.05)
      }
      squirrel.until = stage.time + 7
    }
    if (t === BIRCH) robinSing()
  }

  const robinSing = (): void => {
    if (robin.sing > 0.2 && robin.hop >= 1) {
      robin.from = robin.perch
      robin.perch = 1 - robin.perch
      robin.hop = 0
      snd.peep(sfx)
    } else {
      snd.birdsong(sfx, 0.055)
    }
    robin.sing = 1.3
    robin.bob.kick(40)
  }

  const frogJump = (): void => {
    if (frog.state !== 0) return
    frog.state = 1
    frog.t = 0
    snd.croak(sfx)
  }

  const tapWater = (wx: number, wy: number): void => {
    ripples.push({ x: wx, y: wy, t: 0 })
    snd.plink(sfx)
    fx.burst(wx - cam, wy, { count: 4, color: ['#ffffff', PALETTES[season()].waterLight], speed: 110, life: 0.4, size: 4, gravity: 500, angle: -Math.PI / 2, spread: 1.2 })
    if (season() !== 0) {
      if (frog.state === 0) frogJump()
      else if (frog.state === 2) {
        frog.t = Math.min(frog.t, 0.4)
        ripples.push({ x: frog.x, y: frog.y, t: 0 })
      }
    }
  }

  const onWater = (wx: number, wy: number): boolean => wy > 470 && Math.abs(wx - streamX(wy)) < streamHalf(wy) + 16

  const tapBag = (): void => {
    bagSq.kick(-3)
    snd.wicker(sfx)
    const k = bag.pop()
    if (!k) return
    const x = clamp(fig.x + fig.dir * 70, MIN_X, DOOR_WX - 40)
    finds.push({ kind: k, spot: 0, x, y: pathY(x) + 66, state: 'toGround', t: 0, pop: spring(0, 200, 10), seed: Math.random() * 6 })
  }

  const walkDown = (p: Pointer): void => {
    if (dist(p.x, p.y, WHEEL.x, WHEEL.y) < 98) {
      grabWheel(p)
      return
    }
    if (inRect(p.x, p.y, 16, 560, 200, 210)) {
      tapBag()
      return
    }
    if (fig.busy) return
    const wx = p.x + cam
    const wy = p.y
    const s = season()

    let best: Find | null = null
    let bestD = 66
    for (const f of finds) {
      if (f.state !== 'ground') continue
      const d = dist(wx, wy, f.x, f.y - 16)
      if (d < bestD) {
        bestD = d
        best = f
      }
    }
    if (best) {
      best.pop.kick(4)
      snd.chime(sfx, NOTE[kindOf(best, s)], 0.035)
      fig.gather = best
      fig.toDoor = false
      const side = best.x >= fig.x ? 1 : -1
      fig.target = Math.abs(best.x - fig.x) < 44 ? fig.x : clamp(best.x - side * 40, MIN_X, DOOR_WX)
      if (fig.target === fig.x) {
        fig.target = null
        arrive()
      }
      return
    }

    if (beetle.off > 20 && dist(wx, wy, LEAF.x + 62 + beetle.off, LEAF.y + 6) < 48) {
      beetle.open.kick(9)
      snd.whirr(sfx)
      leaf.hold = stage.time + 2.6
      return
    }
    if (dist(wx, wy, LEAF.x + 62, LEAF.y - 6) < 82) {
      leaf.ptr = p.id
      leaf.startY = p.y
      leaf.lift.target = 0.55
      leaf.hold = stage.time + 2.6
      snd.rustle(sfx, 0.05)
      return
    }
    if (hare.up.value > 0.6 && dist(wx, wy, HARE.x, HARE.y - 62) < 56) {
      hare.ear.kick(7)
      hare.until = stage.time + 6
      snd.thump(sfx)
      return
    }
    if (inRect(wx, wy, GRASS.x0 - 24, GRASS.y - 175, GRASS.x1 - GRASS.x0 + 48, 200)) {
      grassPtr = p.id
      grassX = wx
      snd.swish(sfx)
      swishAt = stage.time
      return
    }
    if (s !== 0 && frog.state === 0 && dist(wx, wy, frog.x, frog.y - 14) < 58) {
      frogJump()
      return
    }
    if (onWater(wx, wy)) {
      tapWater(wx, wy)
      return
    }
    if (dist(wx, wy, fig.x, pathY(fig.x) - 74) < 72) {
      fig.hop.kick(150)
      snd.hum(sfx)
      walkPtr = p
      return
    }
    if (Math.abs(wx - COTTAGE.x) < 215 && wy > 240 && wy < 720) {
      fig.toDoor = true
      fig.gather = null
      fig.target = DOOR_WX
      if (Math.abs(fig.x - DOOR_WX) <= 5) {
        fig.target = null
        arrive()
      } else {
        snd.step(sfx, s)
      }
      return
    }
    // The animals in the trees, then the trees themselves.
    const [qx, qy] = perchOf('oak', 0)
    if (squirrel.out > 0.9 && dist(wx, wy, OAK.x + qx, OAK.y + qy - 30) < 60) {
      rustleTree(2, wx, wy)
      return
    }
    for (let i = TREES.length - 1; i >= 0; i--) {
      const t = TREES[i]
      const c = CROWN[t.kind]
      const inCrown = ((wx - t.x) / (c.rx * t.s)) ** 2 + ((wy - (t.y + c.cy * t.s)) / (c.ry * t.s)) ** 2 < 1
      const onTrunk = Math.abs(wx - t.x) < c.trunk * t.s + 26 && wy < t.y && wy > t.y + c.cy * t.s
      if (inCrown || onTrunk) {
        rustleTree(i, wx, wy)
        return
      }
    }
    if (wy > 462) {
      walkPtr = p
      fig.gather = null
      fig.toDoor = false
      fig.target = clamp(wx, MIN_X, DOOR_WX)
      if (fig.walk < 0.3) snd.step(sfx, s)
      return
    }
    skyBirds.push({ x: p.x, y: p.y, vx: (p.x < W / 2 ? 1 : -1) * (150 + Math.random() * 60), vy: -40 - Math.random() * 30, flap: 0 })
    snd.peep(sfx)
  }

  const grabWheel = (p: Pointer): void => {
    wheel.ptr = p.id
    wheel.turned = 0
    wheel.swing.kick(0.5)
    snd.ratchet(sfx)
    if (scene === 'home') wheel.touchedAtHome = true
  }

  const moveWheel = (p: Pointer): void => {
    const rx = p.x - p.dx - WHEEL.x
    const ry = p.y - p.dy - WHEEL.y
    const lever = Math.max(30, Math.hypot(rx, ry))
    const tangent = (rx * p.dy - ry * p.dx) / (lever * lever)
    const swipe = (Math.abs(p.dx) > Math.abs(p.dy) ? p.dx : p.dy) / 80
    const d = Math.abs(tangent) > Math.abs(swipe) ? tangent : swipe
    wheel.rot.value += d
    wheel.rot.target = wheel.rot.value
    wheel.rot.vel = 0
    wheel.turned += d
    const notch = Math.floor(wheel.rot.value / (Math.PI / 6))
    if (notch !== wheel.lastTick) {
      wheel.lastTick = notch
      snd.ratchet(sfx)
    }
  }

  const releaseWheel = (p: Pointer): void => {
    wheel.ptr = -1
    const before = wheel.idx
    const moved = Math.hypot(p.x - p.startX, p.y - p.startY)
    if (Math.abs(wheel.turned) < 0.14 && moved < 14) wheel.idx += 1
    else {
      // A swipe that did not quite reach the next quarter still carries over.
      const want = wheel.rot.value / (Math.PI / 2)
      wheel.idx = Math.abs(wheel.turned) > 0.35 ? (wheel.turned > 0 ? Math.max(Math.ceil(want - 0.25), before + 1) : Math.min(Math.floor(want + 0.25), before - 1)) : Math.round(want)
    }
    wheel.rot.target = wheel.idx * (Math.PI / 2)
    snd.clonk(sfx)
    if (wheel.idx !== before) snd.seasonChime(sfx, wheelSeason())
  }

  // ---- home: things that happen -------------------------------------------
  const landing = (x: number, y: number): { x: number; y: number; where: 'table' | 'sill' | 'box' | 'basket' } => {
    if (dist(x, y, BOX.x, BOX.y - 30) < 84) return { x: BOX.x, y: BOX.y - 30, where: 'box' }
    if (hung < 0.05 && homeBag.length < HANDFUL && Math.abs(x - BASKET_HOME.x) < 108 && y > BASKET_HOME.y - 90 && y < BASKET_HOME.y + 130) return { x: BASKET_HOME.x, y: BASKET_HOME.y, where: 'basket' }
    if (y < 462 && x > SILL.x0 - 60 && x < SILL.x1 + 60) return { x: clamp(x, SILL.x0, SILL.x1), y: SILL.y, where: 'sill' }
    return { x: clamp(x, TABLE.x0, TABLE.x1), y: clamp(y, TABLE.y0, TABLE.y1), where: 'table' }
  }

  const freeSpot = (): [number, number] => {
    let best: [number, number] = [500, 580]
    let bestScore = -1
    for (let i = 0; i < 16; i++) {
      const x = lerp(TABLE.x0 + 110, TABLE.x1 - 30, stage.rand())
      const y = lerp(TABLE.y0 + 24, TABLE.y1 - 8, stage.rand())
      let score = dist(x, y, CANDLE.x, CANDLE.y) * 0.8
      for (const o of placed) if (!o.sill) score = Math.min(score, dist(x, y, o.x, o.y))
      if (score > bestScore) {
        bestScore = score
        best = [x, y]
      }
    }
    return best
  }

  const drop = (d: Drag, hop: boolean): void => {
    const quick = hop && d.fromBasket
    const [fx0, fy0] = quick ? freeSpot() : [d.x, d.y]
    const to = quick ? { x: fx0, y: fy0, where: 'table' as const } : landing(d.x, d.y)
    if (to.where === 'basket') {
      homeBag.push(d.kind)
      homeSq.kick(-3)
      snd.wicker(sfx)
      return
    }
    const item: Placed = { kind: d.kind, x: to.x, y: to.y, rot: d.rot, ox: d.x - to.x, oy: d.y - to.y - d.lift * 26, sq: spring(1, 240, 12), sill: to.where === 'sill' }
    placed.push(item)
    const sx = item.ox
    const sy = item.oy
    const far = Math.hypot(sx, sy)
    const arc = quick ? 90 : far > 60 ? 30 : 0
    stage.tween(
      quick ? 0.5 : 0.14 + Math.min(0.3, far / 900),
      (k) => {
        item.ox = sx * (1 - k)
        item.oy = sy * (1 - k) - Math.sin(Math.PI * k) * arc
      },
      quick ? ease.inOutQuad : ease.outCubic,
      () => {
        item.ox = 0
        item.oy = 0
        if (to.where === 'box') {
          const at = placed.indexOf(item)
          if (at >= 0) placed.splice(at, 1)
          boxLid = 1
          snd.clonk(sfx)
          return
        }
        item.sq.value = 0.86
        snd.setDown(sfx, SOFT[item.kind])
        if (!SOFT[item.kind]) fx.burst(item.x, item.y, { count: 3, color: '#fff6d8', speed: 40, life: 0.5, size: 3, gravity: -10 })
      },
    )
  }

  const stir = (x: number, y: number, n: number): void => {
    for (let i = 0; i < n; i++) motes.push({ x: x + (Math.random() - 0.5) * 50, y: y + (Math.random() - 0.5) * 40, vx: (Math.random() - 0.5) * 26, vy: -8 - Math.random() * 22, life: 1.6 + Math.random() * 1.4 })
    if (motes.length > 60) motes.splice(0, motes.length - 60)
  }

  const lightCandle = (): void => {
    candle.lit = !candle.lit
    if (candle.lit) {
      snd.match(sfx)
      snd.chime(sfx, -5, 0.08, 0.18)
    } else {
      snd.puff(sfx)
      for (let i = 0; i < 4; i++) wisps.push({ x: CANDLE.x + WICK.x, y: CANDLE.y + WICK.y - i * 5, t: -i * 0.18 })
    }
  }

  const homeDown = (p: Pointer): void => {
    if (dist(p.x, p.y, WHEEL.x, WHEEL.y) < 98) {
      grabWheel(p)
      return
    }
    if (drag || leaving) return
    // Things on the table, nearest the front first.
    let pick = -1
    let pickY = -1
    for (let i = 0; i < placed.length; i++) {
      const o = placed[i]
      if (o.ox !== 0 || o.oy !== 0) continue
      if (dist(p.x, p.y, o.x, o.y - 30) < 54 && o.y > pickY) {
        pick = i
        pickY = o.y
      }
    }
    if (pick >= 0) {
      const o = placed.splice(pick, 1)[0]
      drag = { kind: o.kind, id: p.id, x: o.x, y: o.y, tx: p.x, ty: p.y - 16, rot: o.rot, fromBasket: false, restX: o.x, restY: o.y, moved: 0, at: stage.time, lift: 0 }
      snd.chime(sfx, NOTE[o.kind], 0.035)
      return
    }
    if (hung < 0.05 && !hanging && inRect(p.x, p.y, BASKET_HOME.x - 118, BASKET_HOME.y - 150, 236, 290)) {
      const n = homeBag.length
      homeSq.kick(-2.5)
      snd.wicker(sfx)
      if (n > 0) {
        const s = BASKET_HOME.s
        const i = clamp(Math.round((p.x - BASKET_HOME.x) / (38 * s) + (n - 1) / 2), 0, n - 1)
        const [sx, sy, rot] = slot(i, n, s)
        const kind = homeBag.splice(i, 1)[0]
        drag = { kind, id: p.id, x: BASKET_HOME.x + sx, y: BASKET_HOME.y + sy + 26, tx: p.x, ty: p.y - 16, rot, fromBasket: true, restX: p.x, restY: p.y - 16, moved: 0, at: stage.time, lift: 0 }
      } else {
        // Empty: it goes back on its peg.
        hanging = true
        stage.tween(0.7, (k) => (hung = k), ease.inOutQuad, () => {
          hanging = false
          basketSwing.kick(1.6)
        })
      }
      return
    }
    if (hung > 0.95 && dist(p.x, p.y, PEG.x, PEG.y + 120) < 110) {
      basketSwing.kick(p.x < PEG.x ? 2.2 : -2.2)
      snd.wicker(sfx)
      return
    }
    if (dist(p.x, p.y, CANDLE.x, CANDLE.y - 62) < 72) {
      lightCandle()
      return
    }
    if (p.x > DOORWAY.x - 22 && p.y > 30 && p.y < DOORWAY.bottom + 20) {
      leaving = true
      snd.creak(sfx)
      stage.tween(0.7, (k) => (homeDoor = k), ease.inOutQuad, () => startFade(leaveHome))
      return
    }
    if (dist(p.x, p.y, BOX.x, BOX.y - 30) < 80) {
      boxLid = 1
      snd.clonk(sfx)
      return
    }
    if (inRect(p.x, p.y, WIN.x, WIN.y, WIN.w, WIN.h)) {
      snd.tink(sfx)
      skyBirds.push({ x: p.x, y: p.y, vx: (p.x < WIN.x + WIN.w / 2 ? 1 : -1) * 120, vy: -50, flap: 0 })
      snd.peep(sfx)
      return
    }
    snd.pat(sfx)
    stir(p.x, p.y, 6)
    if (candle.lit && dist(p.x, p.y, CANDLE.x, CANDLE.y - 100) < 190) candle.lean.kick(p.x < CANDLE.x ? 30 : -30)
  }

  // ---- update ------------------------------------------------------------
  const updateWalk = (dt: number): void => {
    const s = season()
    const t = stage.time

    if (walkPtr && walkPtr.down && !fig.busy && !fig.gather && !fig.toDoor) fig.target = clamp(walkPtr.x + cam, MIN_X, DOOR_WX)
    let moving = false
    if (fig.target !== null && !fig.busy && !turn) {
      const dx = fig.target - fig.x
      if (Math.abs(dx) > 5) {
        fig.dir = dx > 0 ? 1 : -1
        fig.v = damp(fig.v, Math.abs(dx) > 380 ? 300 : 215, 7, dt)
        fig.x += fig.dir * Math.min(Math.abs(dx), fig.v * dt)
        moving = true
      } else if (!(walkPtr && walkPtr.down) || fig.gather || fig.toDoor) {
        fig.target = null
        arrive()
      }
    }
    if (!moving) fig.v = damp(fig.v, 0, 12, dt)
    fig.walk = damp(fig.walk, moving ? 1 : 0, 10, dt)
    if (moving) {
      const before = fig.phase
      fig.phase += fig.v * dt * 0.042
      if (Math.floor(fig.phase / Math.PI) !== Math.floor(before / Math.PI)) footfall()
    }
    fig.hop.update(dt)
    fig.cap.target = clamp(fig.v / 280, 0, 1)
    fig.cap.update(dt)
    const want = walkPtr && walkPtr.down ? clamp((walkPtr.x + cam - fig.x) / 200, -1, 1) * fig.dir : 0
    fig.look = damp(fig.look, want, 6, dt)
    // The view holds still while the year turns.
    if (!turn) cam = damp(cam, clamp(fig.x - 430, 0, WORLD - W), 3, dt)

    bagSq.update(dt)
    for (const sp of treeShake) sp.update(dt)
    for (let i = finds.length - 1; i >= 0; i--) {
      const f = finds[i]
      f.pop.update(dt)
      if (f.state === 'toBag') {
        f.t += dt / 0.62
        if (f.t >= 1) {
          bag.push(f.kind as Kind)
          finds.splice(i, 1)
          bagSq.kick(-3.4)
          snd.wicker(sfx)
        }
      } else if (f.state === 'toGround') {
        f.t += dt / 0.55
        if (f.t >= 1) {
          f.state = 'ground'
          f.pop.kick(3)
          snd.setDown(sfx, SOFT[f.kind as Kind])
        }
      }
    }

    // The leaf and what lives under it.
    leaf.lift.update(dt)
    beetle.open.update(dt)
    const uncovered = leaf.lift.value > 0.45
    if (beetle.state === 0) {
      beetle.wait = uncovered ? beetle.wait + dt : 0
      if (beetle.wait > 0.5) beetle.state = 1
    }
    const stepping = (beetle.state === 1 && beetle.off < 66) || beetle.state === 2
    if (beetle.state === 1) beetle.off = Math.min(66, beetle.off + 42 * dt)
    if (beetle.state === 2) {
      beetle.off = Math.max(0, beetle.off - 74 * dt)
      if (beetle.off === 0) beetle.state = 0
    }
    if (stepping) {
      beetle.step += dt * 20
      if (t > beetle.tickAt) {
        beetle.tickAt = t + 0.14
        snd.tick(sfx)
      }
    }
    if (leaf.ptr < 0 && t > leaf.hold && leaf.lift.target > 0) {
      if (beetle.off > 0) beetle.state = 2
      else {
        leaf.lift.target = 0
        beetle.wait = 0
        snd.rustle(sfx, 0.025)
      }
    }

    // The squirrel in the oak.
    squirrel.tail.update(dt)
    squirrel.out = clamp(squirrel.out + (squirrel.want > squirrel.out ? dt / 0.7 : -dt / 0.7), 0, 1)
    if (squirrel.want === 1 && t > squirrel.until) squirrel.want = 0

    // The long grass and the hare.
    const parting = grassPtr >= 0
    for (const b of blades) {
      let target = 0
      if (parting) {
        const d = b.x - grassX
        target = Math.sign(d || 1) * 1.05 * Math.exp(-((d / 78) ** 2))
      } else if (hare.up.value > 0.3) {
        const d = b.x - HARE.x
        target = Math.sign(d || 1) * 0.5 * hare.up.value * Math.exp(-((d / 64) ** 2)) * (b.row === 1 ? 1.5 : 0.6)
      }
      b.bend = damp(b.bend, target, parting ? 11 : 2.2, dt)
    }
    if (parting && Math.abs(grassX - HARE.x) < 125 && hare.up.target === 0 && hare.pending <= 0) hare.pending = 0.24
    if (hare.pending > 0) {
      hare.pending -= dt
      if (hare.pending <= 0) {
        hare.up.target = 1
        hare.until = t + 6
        snd.thump(sfx)
      }
    }
    if (parting && hare.up.target === 1) hare.until = Math.max(hare.until, t + 4)
    if (hare.up.target === 1 && t > hare.until) hare.up.target = 0
    hare.up.update(dt)
    hare.ear.update(dt)

    // The frog.
    if (frog.state === 1) {
      frog.t += dt / 0.55
      const k = Math.min(1, frog.t)
      frog.x = lerp(FROG_ROCK[0], POOL[0], k)
      frog.y = lerp(FROG_ROCK[1], POOL[1], k) - Math.sin(Math.PI * k) * 58
      if (frog.t >= 1) {
        frog.state = 2
        frog.t = 0
        ripples.push({ x: POOL[0], y: POOL[1], t: 0 }, { x: POOL[0], y: POOL[1], t: -0.25 })
        snd.plop(sfx)
        fx.burst(POOL[0] - cam, POOL[1], { count: 8, color: ['#ffffff', PALETTES[s].waterLight], speed: 170, life: 0.5, size: 5, gravity: 620, angle: -Math.PI / 2, spread: 1.5 })
      }
    } else if (frog.state === 2) {
      frog.t += dt
      frog.x = POOL[0] + Math.sin(frog.t * 0.9) * 12
      frog.y = POOL[1] + frog.t * 3
      if (frog.t > 5) {
        frog.state = 3
        frog.t = 0
        ripples.push({ x: frog.x, y: frog.y, t: 0 })
      }
    } else if (frog.state === 3) {
      frog.t += dt / 0.5
      const k = Math.min(1, frog.t)
      const fromX = POOL[0] + Math.sin(5 * 0.9) * 12
      frog.x = lerp(fromX, FROG_ROCK[0], k)
      frog.y = lerp(POOL[1] + 15, FROG_ROCK[1], k) - Math.sin(Math.PI * k) * 34
      if (frog.t >= 1) {
        frog.state = 0
        frog.x = FROG_ROCK[0]
        frog.y = FROG_ROCK[1]
      }
    }
    frog.throat = frog.state === 0 ? Math.max(0, Math.sin(t * 2.2)) : 0

    // The robin.
    robin.bob.update(dt)
    robin.sing = Math.max(0, robin.sing - dt)
    if (robin.hop < 1) robin.hop = Math.min(1, robin.hop + dt / 0.4)

    for (let i = ripples.length - 1; i >= 0; i--) {
      ripples[i].t += dt / 1.1
      if (ripples[i].t >= 1) ripples.splice(i, 1)
    }

    // Quiet sounds of the place, with long gaps.
    if (t > nextBird) {
      nextBird = t + 9 + Math.random() * 9
      if (s === 0) snd.wind(sfx, 0.03)
      else snd.birdsong(sfx, 0.022)
    }
    if (Math.abs(fig.x - STREAM_X) < 460 && t > nextBurble) {
      nextBurble = t + 0.35 + Math.random() * 0.7
      if (s !== 0 || Math.random() < 0.4) snd.burble(sfx)
    }
  }

  const updateFalls = (dt: number): void => {
    const t = stage.time
    for (let i = falls.length - 1; i >= 0; i--) {
      const p = falls[i]
      if (p.life < 900) {
        p.life -= dt
        if (p.life <= 0) {
          falls.splice(i, 1)
          continue
        }
        if (p.y >= p.floor && p.vy >= 0) continue
        p.vy += 150 * dt
        p.vy = Math.min(p.vy, 90)
      }
      p.x += (p.vx + Math.sin(t * 1.3 + p.seed) * 16) * dt
      p.y += p.vy * dt
      p.rot += p.spin * dt
      if (p.life >= 900) {
        if (p.y > H - 30) {
          p.y = -20
          p.x = cam - 100 + Math.random() * (W + 200)
        }
        if (p.x < cam - 160) p.x += W + 300
        else if (p.x > cam + W + 160) p.x -= W + 300
      }
    }
  }

  const updateBirds = (dt: number): void => {
    for (let i = skyBirds.length - 1; i >= 0; i--) {
      const b = skyBirds[i]
      b.x += b.vx * dt
      b.y += b.vy * dt
      b.flap += dt * 16
      if (b.x < -60 || b.x > W + 60 || b.y < -60) skyBirds.splice(i, 1)
    }
  }

  const updateHome = (dt: number): void => {
    if (drag) {
      const d = drag
      const nx = damp(d.x, d.tx, 24, dt)
      const ny = damp(d.y, d.ty, 24, dt)
      d.rot = damp(d.rot, clamp((nx - d.x) * 0.06, -0.5, 0.5), 8, dt)
      d.x = nx
      d.y = ny
      d.lift = damp(d.lift, 1, 14, dt)
    }
    for (const o of placed) o.sq.update(dt)
    homeSq.update(dt)
    basketSwing.update(dt)
    candle.lean.update(dt)
    candle.k = damp(candle.k, candle.lit ? 1 : 0, candle.lit ? 5 : 16, dt)
    for (let i = wisps.length - 1; i >= 0; i--) {
      wisps[i].t += dt / 1.8
      if (wisps[i].t >= 1) wisps.splice(i, 1)
    }
    // When the basket is empty the day settles toward evening and stays there.
    const done = homeBag.length === 0 && !drag && placed.length > 0
    dusk = damp(dusk, done ? 1 : 0, done ? 0.07 : 0.6, dt)
    for (let i = motes.length - 1; i >= 0; i--) {
      const m = motes[i]
      m.life -= dt
      m.x += m.vx * dt
      m.y += m.vy * dt
      m.vx *= 1 - dt
      if (m.life <= 0) motes.splice(i, 1)
    }
    const s = season()
    const fall = s === 0 ? 34 : s === 2 ? 7 : 26
    for (const p of winFalls) {
      p.y += fall * dt
      p.x += Math.sin(stage.time * 1.2 + p.seed) * 12 * dt + (s === 2 ? 8 * dt : 0)
      if (p.y > WIN.h + 10) {
        p.y = -10
        p.x = Math.random() * WIN.w
      }
      if (p.x > WIN.w + 10) p.x = -10
    }
    boxLid = damp(boxLid, 0, 5, dt)
  }

  // ---- draw: the walk ----------------------------------------------------
  const drawBasketAt = (g: G, cx: number, cy: number, s: number, kinds: Kind[], sq: number, rot: number, pivotY: number): void => {
    g.save()
    g.translate(cx, cy + pivotY)
    if (rot) g.rotate(rot)
    g.scale(1 / Math.sqrt(Math.max(0.3, sq)), sq)
    g.translate(0, -pivotY)
    put(g, basket.back, 0, 0, s)
    for (let i = 0; i < kinds.length; i++) {
      const [sx, sy, r] = slot(i, kinds.length, s)
      put(g, things[kinds[i]], sx, sy, 0.86 * s, r)
    }
    put(g, basket.front, 0, 0, s)
    g.restore()
  }

  const drawWheel = (g: G): void => {
    const sway = wheel.swing.value * 0.05 + Math.sin(stage.time * 0.9) * 0.012
    const x = WHEEL.x + sway * 110
    g.strokeStyle = '#8a6a45'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(WHEEL.x, -4)
    g.lineTo(x, WHEEL.y - 70)
    g.stroke()
    g.fillStyle = 'rgba(40,30,20,0.16)'
    g.beginPath()
    g.arc(x + 4, WHEEL.y + 6, 64, 0, TAU)
    g.fill()
    put(g, wheelSprite, x, WHEEL.y, 1, wheel.rot.value)
    // A wooden bead marks the season at the top.
    g.fillStyle = '#8a5a34'
    g.beginPath()
    g.moveTo(x - 10, WHEEL.y - 78)
    g.lineTo(x + 10, WHEEL.y - 78)
    g.lineTo(x, WHEEL.y - 58)
    g.closePath()
    g.fill()
    g.fillStyle = '#c89a62'
    g.beginPath()
    g.arc(x, WHEEL.y - 76, 7.5, 0, TAU)
    g.fill()
  }

  const drawFind = (g: G, f: Find, s: Season): void => {
    const k = kindOf(f, s)
    const sx = f.x - cam
    if (f.state === 'ground') {
      if (sx < -80 || sx > W + 80) return
      const idle = stage.time - lastTouch > 6 ? 0.07 : 0.03
      const hop = Math.abs(f.pop.value) * 42
      g.fillStyle = 'rgba(40,30,20,0.16)'
      g.beginPath()
      g.ellipse(sx, f.y + 5, 29, 7, 0, 0, TAU)
      g.fill()
      put(g, things[k], sx, f.y - 22 - hop, 0.74, Math.sin(stage.time * 1.5 + f.seed) * idle)
      return
    }
    // In the air between the ground and the basket.
    const n = bag.length + 1
    const [bx, by] = slot(n - 1, n, BAG.s)
    const k2 = f.state === 'toBag' ? ease.inOutQuad(clamp(f.t, 0, 1)) : 1 - ease.inOutQuad(clamp(f.t, 0, 1))
    const x = lerp(sx, BAG.x + bx, k2)
    const y = lerp(f.y - 22, BAG.y + by, k2) - Math.sin(Math.PI * k2) * 130
    put(g, things[k], x, y, lerp(0.74, 0.86 * BAG.s, k2), k2 * 1.2)
  }

  const drawGrass = (g: G, pal: Palette, s: Season, row: number): void => {
    const t = stage.time
    for (const b of blades) {
      if (b.row !== row) continue
      const x = b.x - cam
      if (x < -120 || x > W + 120) continue
      const a = b.lean + b.bend + Math.sin(t * 1.2 + b.x * 0.03) * 0.045
      const baseY = GRASS.y + row * 9
      const tx = x + Math.sin(a) * b.h
      const ty = baseY - Math.cos(a) * b.h
      const cx = x + Math.sin(a * 0.35) * b.h * 0.5
      const cy = baseY - Math.cos(a * 0.35) * b.h * 0.55
      g.beginPath()
      g.moveTo(x - b.w / 2, baseY)
      g.quadraticCurveTo(cx - b.w / 3, cy, tx, ty)
      g.quadraticCurveTo(cx + b.w / 3, cy, x + b.w / 2, baseY)
      g.closePath()
      g.fillStyle = row === 0 ? mix(pal.tuft[b.c], pal.groundFar, 0.15) : pal.tuft[b.c]
      g.fill()
      if (s === 0) {
        g.fillStyle = '#ffffff'
        g.beginPath()
        g.arc(tx, ty, 3, 0, TAU)
        g.fill()
      } else if (b.head && s !== 1) {
        g.fillStyle = s === 3 ? '#d9b86a' : '#c9c27a'
        g.beginPath()
        g.ellipse(tx, ty, 3.4, 9, a, 0, TAU)
        g.fill()
      }
    }
  }

  const squirrelAt = (): [number, number, number] => {
    const [px, py] = perchOf('oak', 0)
    const k = ease.inOutQuad(squirrel.out)
    const hx = OAK.x + 5
    const hy = OAK.y - 150
    const mx = OAK.x + 30
    const my = OAK.y - 186
    if (k < 0.5) return [lerp(hx, mx, k * 2), lerp(hy, my, k * 2), k]
    const j = (k - 0.5) * 2
    return [lerp(mx, OAK.x + px, j), lerp(my, OAK.y + py, j) - Math.sin(Math.PI * j) * 20, k]
  }

  // The parts of the wood that hold still: sky, distance, ground, trees, home.
  // `part` 0 paints all of it; 1, 2 and 3 paint the distance, the ground and
  // the trees alone, for the still picture taken when the year turns.
  const drawBackdrop = (g: G, v: Vis, part = 0): void => {
    const pal = v.pal
    const t = stage.time
    if (part <= 1) backdropFar(g, v, pal, t)
    if (part === 0 || part === 2) {
      if (v.ground && v.ground.canvas.width > 0) {
        const off = -(((cam % TILE) + TILE) % TILE)
        g.drawImage(v.ground.canvas, off, GROUND_Y, TILE, GROUND_H)
        if (off + TILE < W) g.drawImage(v.ground.canvas, off + TILE, GROUND_Y, TILE, GROUND_H)
      }
      const stx = STREAM_X - cam
      if (stx > -260 && stx < W + 260) put(g, v.stream, stx, 440)
    }
    if (part === 0 || part === 3) backdropNear(g, v, t)
  }

  const backdropFar = (g: G, v: Vis, pal: Palette, t: number): void => {
    put(g, v.sky, 0, 0)
    drawHill(g, cam * 0.08, 404, 30, 0.0041, 1.3, pal.hillFar)
    drawHill(g, cam * 0.16, 438, 22, 0.0056, 4.1, pal.hillNear)
    put(g, v.far, -cam * 0.35 - 20, FAR_Y)
    for (const m of MID) {
      const sx = m.x - cam * 0.62
      if (sx < -220 || sx > W + 220) continue
      put(g, v.trees[m.kind], sx, m.y, m.s, Math.sin(t * 0.5 + m.x) * 0.004, m.flip ? -1 : 1, 1)
    }
    if (v.haze && v.haze.canvas.width > 0) g.drawImage(v.haze.canvas, 0, 110, W, 370)
  }

  const backdropNear = (g: G, v: Vis, t: number): void => {
    // Trees, with the squirrel peeping round its oak.
    const [qx, qy, qk] = squirrelAt()
    for (let i = 0; i < TREES.length; i++) {
      const tr = TREES[i]
      const sx = tr.x - cam
      const c = CROWN[tr.kind]
      if (sx < -c.rx * tr.s - 80 || sx > W + c.rx * tr.s + 80) continue
      if (tr === OAK && qk < 0.5) {
        g.save()
        g.translate(qx - cam, qy)
        g.rotate(lerp(0.62 + Math.sin(t * 1.1) * 0.04, 0, qk * 2))
        drawSquirrel(g, 0, 0, 1, squirrel.tail.value, false, t % 3.7 < 0.12, 0)
        g.restore()
      }
      put(g, v.trees[tr.kind], sx, tr.y, tr.s, Math.sin(t * 0.55 + tr.x) * 0.004 + treeShake[i].value * 0.06, tr.flip ? -1 : 1, 1)
    }
    const hx = COTTAGE.x - cam
    if (hx < W + 420) put(g, v.cottage, hx, COTTAGE.y)
  }

  // Everything that moves, drawn over the backdrop.
  const drawLife = (g: G, v: Vis): void => {
    const pal = v.pal
    const s = v.season
    const t = stage.time

    const stx = STREAM_X - cam
    if (stx > -260 && stx < W + 260) {
      g.lineWidth = 2.6
      for (let i = 0; i < 8; i++) {
        const yy = 468 + ((i * 47 + t * (s === 0 ? 9 : 24)) % 345)
        const hw = streamHalf(yy) * (s === 0 ? 0.3 : 0.75)
        const xx = streamX(yy) - cam + Math.sin(i * 1.7) * hw * 0.7
        const len = 6 + hw * 0.3
        g.strokeStyle = rgba('#ffffff', 0.42 * Math.sin(((yy - 468) / 345) * Math.PI))
        g.beginPath()
        g.moveTo(xx - len, yy)
        g.quadraticCurveTo(xx, yy - 3, xx + len, yy + 1)
        g.stroke()
      }
      for (const r of ripples) {
        if (r.t < 0) continue
        g.strokeStyle = rgba('#ffffff', (1 - r.t) * 0.7)
        g.lineWidth = 2.4
        for (let k = 0; k < 2; k++) {
          const rad = 8 + (r.t - k * 0.18) * 54
          if (rad < 8) continue
          g.beginPath()
          g.ellipse(r.x - cam, r.y, rad, rad * 0.36, 0, 0, TAU)
          g.stroke()
        }
      }
    }

    // The squirrel out on its branch, and the robin.
    const [qx, qy, qk] = squirrelAt()
    if (qk >= 0.5 && qx - cam > -80 && qx - cam < W + 80) {
      const face = fig.x < qx ? -1 : 1
      drawSquirrel(g, qx - cam, qy, face, squirrel.tail.value + Math.sin(t * 2.2) * 0.1, s === 3, t % 3.7 < 0.12, clamp((fig.x - qx) / 300, -1, 1) * face)
    }
    if (Math.abs(BIRCH.x - cam - W / 2) < W / 2 + 200) {
      const [ax, ay] = perchOf('birch', robin.perch)
      const [bx0, by0] = perchOf('birch', robin.from)
      const k = ease.inOutQuad(robin.hop)
      const rx = BIRCH.x + lerp(bx0, ax, k) - cam
      const ry = BIRCH.y + lerp(by0, ay, k) - Math.sin(Math.PI * k) * 26
      drawRobin(g, rx, ry, robin.perch === 0 ? 1 : -1, robin.sing > 0 ? 0.5 + 0.5 * Math.sin(t * 22) : 0, Math.max(0, robin.bob.value) * 0.2, t % 4.3 < 0.12)
    }

    // Home: smoke from the chimney, and the door.
    const hx = COTTAGE.x - cam
    if (hx < W + 420) {
      for (let i = 0; i < 6; i++) {
        const k = (t * 0.16 + i / 6) % 1
        g.fillStyle = rgba('#ffffff', (1 - k) * 0.4 * Math.min(1, k * 6))
        g.beginPath()
        g.arc(hx + 97 + Math.sin(k * 4 + i) * 12 + k * 34, COTTAGE.y - 412 - k * 120, 9 + k * 20, 0, TAU)
        g.fill()
      }
      drawCottageDoor(g, hx + DOOR.x, COTTAGE.y, Math.max(doorOpen, 0.1 + 0.03 * Math.sin(t * 0.8)))
    }

    // The long grass with the hare in it.
    const gx = (GRASS.x0 + GRASS.x1) / 2 - cam
    if (gx > -260 && gx < W + 260) {
      drawGrass(g, pal, s, 0)
      g.save()
      g.beginPath()
      g.rect(HARE.x - cam - 80, HARE.y - 200, 160, 206)
      g.clip()
      drawHare(g, HARE.x - cam, HARE.y, hare.up.value, s === 0, hare.ear.value + (Math.sin(t * 0.9) > 0.9 ? 0.12 : 0), Math.sin(t * 9) * 0.8 * hare.up.value, t % 4.1 < 0.12)
      g.restore()
      drawGrass(g, pal, s, 1)
    }

    // The leaf and the beetle.
    const lx = LEAF.x - cam
    if (lx > -220 && lx < W + 80) {
      const lift = clamp(leaf.lift.value, -0.05, 1.1) + 0.03 * Math.max(0, Math.sin(t * 0.9))
      g.fillStyle = 'rgba(40,30,20,0.14)'
      g.beginPath()
      g.ellipse(lx + 64, LEAF.y + 14, 64 * (1 - lift * 0.3), 10, 0, 0, TAU)
      g.fill()
      drawBeetle(g, lx + 62 + beetle.off, LEAF.y + 8, beetle.state === 2 ? -1 : 1, beetle.step, clamp(beetle.open.value, 0, 1), t)
      put(g, v.cover, lx, LEAF.y + 10, 1, -lift * 1.0 + 0.05, 1, 0.5 + lift * 0.38)
    }

    for (const f of finds) if (f.state === 'ground' && f.y < pathY(f.x)) drawFind(g, f, s)

    // The frog on its rock, in the air, or only its eyes.
    if (s !== 0 && stx > -260 && stx < W + 260) {
      const blink = t % 3.3 < 0.12
      if (frog.state === 0) drawFrog(g, frog.x - cam, frog.y, 1, 0, 0, blink, frog.throat)
      else if (frog.state === 1) drawFrog(g, frog.x - cam, frog.y, 1, 1, lerp(-0.7, 0.7, Math.min(1, frog.t)), false, 0)
      else if (frog.state === 2) {
        if (frog.t > 0.45) drawFrogEyes(g, frog.x - cam, frog.y, blink)
      } else drawFrog(g, frog.x - cam, frog.y, -1, 1, lerp(-0.6, 0.5, Math.min(1, frog.t)), false, 0)
    }

    if (s === 0) {
      g.fillStyle = 'rgba(120,150,185,0.4)'
      for (const p of prints) {
        const px = p.x - cam
        if (px < -20 || px > W + 20) continue
        g.beginPath()
        g.ellipse(px, p.y, 8, 4.4, 0, 0, TAU)
        g.fill()
      }
    }

    // The child.
    const fy = pathY(fig.x)
    const onStones = Math.abs(fig.x - streamX(fy)) < 64
    const figY = lerp(fy, COTTAGE.y + 4, fig.enter)
    if (fig.enter < 0.98) {
      g.globalAlpha = 1 - clamp((fig.enter - 0.55) / 0.4, 0, 1)
      drawFigure(
        g,
        fig.x - cam,
        figY,
        {
          dir: fig.dir,
          phase: fig.phase,
          walk: fig.walk,
          crouch: fig.crouch,
          hop: Math.max(0, fig.hop.value) + (onStones ? Math.abs(Math.sin(fig.phase)) * 13 * fig.walk : 0),
          look: fig.look,
          blink: t % 3.9 < 0.13,
          capLag: fig.cap.value,
          coat: pal.coat,
          scarf: pal.scarf,
          carried: bag.length,
        },
        t,
      )
      g.globalAlpha = 1
    }

    for (const f of finds) if (f.state === 'ground' && f.y >= pathY(f.x)) drawFind(g, f, s)

    if (s === 1 || s === 2) {
      for (let i = 0; i < flutter.length; i++) {
        const b = flutter[i]
        const bx = b.x + Math.sin(t * 0.6 + i * 2) * 90 + Math.sin(t * 1.7 + i) * 20 - cam
        if (bx < -40 || bx > W + 40) continue
        drawButterfly(g, bx, b.y + Math.sin(t * 1.1 + i * 3) * 34 + Math.sin(t * 2.3) * 8, t * 11 + i, b.c)
      }
    }

    if (s === fallSeason) {
      for (const p of falls) {
        const px = p.x - cam
        if (px < -30 || px > W + 30) continue
        if (p.life < 900) g.globalAlpha = Math.min(1, p.life * 1.5)
        const shape: Season = s === 2 && p.life < 900 ? 3 : s
        const colors = s === 2 && p.life < 900 ? ['#6aa353', '#8fc068'] : pal.fall
        drawFall(g, shape, px, p.y, p.size, p.rot, colors[p.c % colors.length])
        g.globalAlpha = 1
      }
    }

    // Near grass at the very front, sliding past faster than the path.
    const dark = s === 0 ? '#b3a27e' : mix(pal.tuft[0], '#2f3d24', 0.3)
    g.strokeStyle = dark
    g.lineWidth = 7
    for (let i = 0; i < 18; i++) {
      const x = 90 + i * 290 - cam * 1.28
      if (x < -100 || x > W + 100) continue
      for (let k = 0; k < 6; k++) {
        const a = (k - 2.5) * 0.2 + Math.sin(t * 1.1 + i + k) * 0.05
        const h = 54 + ((i * 7 + k * 13) % 5) * 9
        g.beginPath()
        g.moveTo(x + k * 7 - 18, H + 8)
        g.quadraticCurveTo(x + k * 7 - 18 + Math.sin(a) * h * 0.4, H - h * 0.6, x + k * 7 - 18 + Math.sin(a) * h, H + 8 - Math.cos(a) * h)
        g.stroke()
      }
    }
  }

  // While the year turns, the old season's backdrop is one still picture, so
  // only one season's paintings are ever in use at once.
  let snap: Sprite | null = null
  const takeSnap = (v: Vis, part: number): void => {
    // As sharp as the screen, and no sharper: it is on show for two seconds.
    if (!snap) snap = makeSprite(W, H, 0, 0, (globalThis.devicePixelRatio || 1) >= 1.5 ? 1.5 : 1, () => {})
    const sg = snap.canvas.getContext('2d')
    if (!sg) return
    drawBackdrop(sg, v, part)
    settle(snap)
    if (part < 3) return
    for (const key of ['sky', 'far', 'haze', 'ground', 'stream', 'cottage'] as const) {
      freeSprite(v[key])
      v[key] = undefined
    }
    for (const kind of ['oak', 'cherry', 'birch', 'fir'] as const) freeSprite(v.trees[kind])
    v.trees = {}
  }

  const drawHud = (g: G): void => {
    for (const b of skyBirds) drawSkyBird(g, b.x, b.y, b.flap, 11)
    g.fillStyle = 'rgba(40,30,20,0.16)'
    g.beginPath()
    g.ellipse(BAG.x, BAG.y + 76, 84, 13, 0, 0, TAU)
    g.fill()
    drawBasketAt(g, BAG.x, BAG.y, BAG.s, bag, bagSq.value, 0, 122 * BAG.s)
    for (const f of finds) if (f.state !== 'ground') drawFind(g, f, season())
    drawWheel(g)
  }

  // The turning of the year crosses the wood as a soft gust.
  const drawGust = (g: G, x: number, to: Vis): void => {
    const grad = g.createLinearGradient(x - 170, 0, x + 170, 0)
    grad.addColorStop(0, rgba(to.pal.mist, 0))
    grad.addColorStop(0.5, rgba(to.pal.mist, 0.86))
    grad.addColorStop(1, rgba(to.pal.mist, 0))
    g.fillStyle = grad
    g.fillRect(x - 170, 0, 340, H)
    const t = stage.time
    const colors = to.season === 2 ? ['#ffffff', '#f6e27a'] : to.pal.fall
    for (let i = 0; i < 30; i++) {
      const px = x - 60 + Math.sin(t * 2.3 + i * 1.9) * 110
      const py = ((i * 61 + t * 60) % (H + 40)) - 20 + Math.sin(t * 3 + i) * 18
      drawFall(g, to.season, px, py, to.season === 0 ? 5 : 8, t * 2 + i, colors[i % colors.length])
    }
  }

  // ---- draw: home --------------------------------------------------------
  const thingScale = (y: number, sill: boolean): number => (sill ? 0.74 : lerp(0.84, 1.04, clamp((y - TABLE.y0) / (TABLE.y1 - TABLE.y0), 0, 1)))

  const drawPlaced = (g: G, o: Placed): void => {
    const sc = thingScale(o.y, o.sill)
    const air = Math.max(0, -o.oy)
    g.fillStyle = `rgba(60,35,20,${0.2 - Math.min(0.12, air * 0.002)})`
    g.beginPath()
    g.ellipse(o.x + o.ox * 0.9, o.y + 6 * sc, 34 * sc + air * 0.06, 8 * sc, 0, 0, TAU)
    g.fill()
    const sq = o.sq.value
    put(g, things[o.kind], o.x + o.ox, o.y + o.oy - 28 * sc * sq, sc, o.rot * 0.3, 1 / Math.sqrt(Math.max(0.4, sq)), sq)
  }

  const drawHome = (g: G): void => {
    const t = stage.time
    const v = turn ? turn.from : vis
    const s = season()
    const pal = PALETTES[s]

    // Outside, through the window and the door.
    put(g, v.view, WIN.x, WIN.y)
    if (turn && turn.ready) {
      g.globalAlpha = ease.inOutQuad(turn.t)
      put(g, turn.to.view, WIN.x, WIN.y)
      g.globalAlpha = 1
    }
    g.save()
    g.beginPath()
    g.rect(WIN.x, WIN.y, WIN.w, WIN.h)
    g.clip()
    for (let i = 0; i < winFalls.length; i++) {
      const p = winFalls[i]
      if (s === 2 && i > 3) continue
      drawFall(g, s, WIN.x + p.x, WIN.y + p.y, s === 0 ? 4 : 6, t + p.seed, pal.fall[i % pal.fall.length])
    }
    for (const b of skyBirds) drawSkyBird(g, b.x, b.y, b.flap, 9)
    g.fillStyle = `rgba(240,150,90,${dusk * 0.3})`
    g.fillRect(WIN.x, WIN.y, WIN.w, WIN.h)
    g.restore()
    g.fillStyle = mix(pal.skyLow, '#ffffff', 0.35)
    g.fillRect(DOORWAY.x, DOORWAY.y, W - DOORWAY.x, 520)
    g.fillStyle = pal.groundFar
    g.fillRect(DOORWAY.x, 520, W - DOORWAY.x, 80)
    g.fillStyle = pal.path
    g.fillRect(DOORWAY.x, 590, W - DOORWAY.x, DOORWAY.bottom - 590)
    g.fillStyle = `rgba(240,150,90,${dusk * 0.25})`
    g.fillRect(DOORWAY.x, DOORWAY.y, W - DOORWAY.x, DOORWAY.bottom - DOORWAY.y)

    put(g, homeBg, 0, 0)

    // The door, ajar; it stirs a little in the air from outside.
    const edge = DOORWAY.x + 40 + Math.sin(t * 0.7) * 4 + homeDoor * 130
    g.fillStyle = '#a87748'
    g.fillRect(edge, DOORWAY.y, W - edge, DOORWAY.bottom - DOORWAY.y)
    g.strokeStyle = 'rgba(90,58,30,0.5)'
    g.lineWidth = 2
    for (let x = edge + 34; x < W; x += 34) {
      g.beginPath()
      g.moveTo(x, DOORWAY.y)
      g.lineTo(x, DOORWAY.bottom)
      g.stroke()
    }
    g.fillStyle = '#4a4038'
    g.fillRect(edge, 150, W - edge, 13)
    g.fillRect(edge, 620, W - edge, 13)
    g.beginPath()
    g.arc(edge + 24, 420, 9, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,246,214,0.5)'
    g.beginPath()
    g.moveTo(DOORWAY.x, DOORWAY.bottom)
    g.lineTo(edge, DOORWAY.bottom)
    g.lineTo(edge - 70 - homeDoor * 120, H)
    g.lineTo(DOORWAY.x - 150 - homeDoor * 200, H)
    g.closePath()
    g.fill()

    // Things on the sill sit behind everything on the table.
    for (const o of placed) if (o.sill) drawPlaced(g, o)

    // The basket on its peg.
    if (hung > 0) {
      const k = hung
      const s0 = lerp(BASKET_HOME.s, 0.78, k)
      const x = lerp(BASKET_HOME.x, PEG.x, k)
      const y = lerp(BASKET_HOME.y, PEG.y + BASKET_HANDLE * 0.78 - 4, k) - Math.sin(Math.PI * k) * 60
      drawBasketAt(g, x, y, s0, homeBag, 1, basketSwing.value * 0.09 * k, -BASKET_HANDLE * s0)
    }

    put(g, v.cloth, 0, 0)
    if (turn && turn.ready) {
      g.globalAlpha = ease.inOutQuad(turn.t)
      put(g, turn.to.cloth, 0, 0)
      g.globalAlpha = 1
    }
    if (boxLid > 0.02) {
      g.fillStyle = `rgba(255,246,214,${boxLid * 0.35})`
      g.beginPath()
      g.ellipse(BOX.x, BOX.y - 40, 46, 9, 0, 0, TAU)
      g.fill()
    }

    // Everything on the table, back to front.
    const order = placed.filter((o) => !o.sill).sort((a, b) => a.y - b.y)
    let candleDrawn = false
    let basketDrawn = hung > 0
    const baseY = BASKET_HOME.y + 106
    const stand = (y: number): void => {
      if (!candleDrawn && y >= CANDLE.y) {
        candleDrawn = true
        put(g, candleSprite, CANDLE.x, CANDLE.y)
        drawFlame(g, CANDLE.x + WICK.x, CANDLE.y + WICK.y, candle.k, t, candle.lean.value * 0.2)
        for (const w of wisps) {
          if (w.t < 0) continue
          g.strokeStyle = `rgba(150,140,130,${(1 - w.t) * 0.5})`
          g.lineWidth = 3 + w.t * 5
          g.beginPath()
          g.moveTo(w.x + Math.sin(w.t * 7) * 6 * w.t, w.y - w.t * 70)
          g.lineTo(w.x + Math.sin(w.t * 7 + 0.6) * 8 * w.t, w.y - w.t * 70 - 9)
          g.stroke()
        }
      }
      if (!basketDrawn && y >= baseY) {
        basketDrawn = true
        g.fillStyle = 'rgba(60,35,20,0.2)'
        g.beginPath()
        g.ellipse(BASKET_HOME.x + 4, baseY + 6, 96, 13, 0, 0, TAU)
        g.fill()
        drawBasketAt(g, BASKET_HOME.x, BASKET_HOME.y, BASKET_HOME.s, homeBag, homeSq.value, 0, 122 * BASKET_HOME.s)
      }
    }
    for (const o of order) {
      stand(o.y)
      drawPlaced(g, o)
    }
    stand(9999)

    if (drag) {
      const d = drag
      const sc = thingScale(d.y, false) * (1 + d.lift * 0.1)
      g.fillStyle = 'rgba(60,35,20,0.14)'
      g.beginPath()
      g.ellipse(d.x, d.y + 6, 36 + d.lift * 6, 9, 0, 0, TAU)
      g.fill()
      put(g, things[d.kind], d.x, d.y - 28 - d.lift * 26, sc, d.rot)
    }

    // Evening, and the candle's own light.
    if (dusk > 0.01) {
      g.fillStyle = `rgba(150,74,30,${dusk * 0.15})`
      g.fillRect(0, 0, W, H)
    }
    if (candle.k > 0.01) {
      g.globalAlpha = candle.k * (0.55 + dusk * 0.4) * (0.94 + 0.06 * Math.sin(t * 11))
      put(g, glow, CANDLE.x, CANDLE.y - 124, 1 + dusk * 0.25)
      g.globalAlpha = 1
    }
    for (const m of motes) {
      g.fillStyle = `rgba(255,246,214,${Math.min(0.8, m.life * 0.5)})`
      g.beginPath()
      g.arc(m.x, m.y, 2.2, 0, TAU)
      g.fill()
    }
    drawWheel(g)
  }

  // ---- begin -------------------------------------------------------------
  {
    let job = missingWalk(vis, 0)
    while (job) {
      job()
      job = missingWalk(vis, 0)
    }
  }
  resetWalk()

  return {
    update(dt) {
      // Paint at most one missing thing a frame, so nothing hitches.
      const paintFor = (v: Vis): (() => void) | null => (scene === 'walk' ? missingWalk(v, cam) : missingHome(v))
      const job = paintFor(turn ? turn.to : vis)
      if (turn && turn.snapped < 3) {
        turn.snapped++
        takeSnap(turn.from, turn.snapped)
      } else if (job) job()
      else if (turn && !turn.ready) {
        turn.ready = true
        if (scene === 'walk') {
          snd.wind(sfx, 0.06)
          spawnFalls()
        }
      }

      // The wheel, and the season following it.
      wheel.rot.update(dt)
      wheel.swing.update(dt)
      if (!turn && !fade && wheel.ptr < 0 && wheelSeason() !== vis.season) {
        turn = { from: vis, to: visFor(wheelSeason()), t: 0, ready: false, snapped: scene === 'walk' ? 0 : 3 }
      }
      if (turn && turn.ready) {
        turn.t += dt / (scene === 'walk' ? 1.8 : 1.2)
        if (turn.t >= 1) finishTurn()
      }

      if (fade) {
        if (fade.phase === 0) {
          fade.t += dt / 0.6
          if (fade.t >= 1) {
            fade.t = 1
            fade.phase = 1
            fade.mid()
          }
        } else if (fade.phase === 1) {
          if (!paintFor(vis)) fade.phase = 2
        } else {
          fade.t -= dt / 0.8
          if (fade.t <= 0) fade = null
        }
      }

      if (scene === 'walk') {
        updateWalk(dt)
        updateFalls(dt)
      } else updateHome(dt)
      updateBirds(dt)
    },

    draw(g) {
      if (!warmed) {
        warmed = true
        for (const k of KINDS) touch(g, things[k])
        for (const sp of [wheelSprite, basket.back, basket.front, homeBg, candleSprite, glow]) touch(g, sp)
      }
      if (turn && !turn.ready) for (const sp of spritesOf(turn.to)) touch(g, sp)
      if (scene === 'walk') {
        if (turn && turn.ready) {
          const x = lerp(-180, W + 180, ease.inOutQuad(clamp(turn.t, 0, 1)))
          g.save()
          g.beginPath()
          g.rect(x, 0, W - x, H)
          g.clip()
          put(g, snap ?? undefined, 0, 0)
          drawLife(g, turn.from)
          g.restore()
          g.save()
          g.beginPath()
          g.rect(0, 0, x, H)
          g.clip()
          drawBackdrop(g, turn.to)
          drawLife(g, turn.to)
          g.restore()
          drawGust(g, x, turn.to)
        } else if (turn) {
          if (turn.snapped < 3) drawBackdrop(g, turn.from)
          else put(g, snap ?? undefined, 0, 0)
          drawLife(g, turn.from)
        } else {
          drawBackdrop(g, vis)
          drawLife(g, vis)
        }
        drawHud(g)
      } else drawHome(g)
      if (fade) {
        g.fillStyle = `rgba(251,240,216,${ease.inOutQuad(clamp(fade.t, 0, 1))})`
        g.fillRect(0, 0, W, H)
      }
    },

    down(p) {
      lastTouch = stage.time
      if (fade) return
      if (scene === 'walk') walkDown(p)
      else homeDown(p)
    },

    move(p) {
      if (p.id === wheel.ptr) {
        moveWheel(p)
        return
      }
      if (scene === 'walk') {
        if (p.id === leaf.ptr) {
          leaf.lift.target = clamp(0.55 + (leaf.startY - p.y) / 110, 0.2, 1)
          leaf.hold = stage.time + 2.6
        } else if (p.id === grassPtr) {
          grassX = p.x + cam
          if (stage.time - swishAt > 0.16 && Math.abs(p.dx) > 1.5) {
            swishAt = stage.time
            snd.swish(sfx)
          }
        }
      } else if (drag && p.id === drag.id) {
        drag.tx = p.x
        drag.ty = p.y - 16
        drag.moved += Math.hypot(p.dx, p.dy)
      }
    },

    up(p) {
      if (p.id === wheel.ptr) {
        releaseWheel(p)
        return
      }
      if (p.id === leaf.ptr) {
        leaf.ptr = -1
        leaf.lift.target = Math.max(leaf.lift.target, 0.75)
        leaf.hold = stage.time + 2.6
      }
      if (p.id === grassPtr) grassPtr = -1
      if (walkPtr && p.id === walkPtr.id) walkPtr = null
      if (drag && p.id === drag.id) {
        const d = drag
        drag = null
        const still = d.moved < 14
        if (still && !d.fromBasket) {
          // Only touched: it settles back exactly where it was.
          d.x = d.restX
          d.y = d.restY
          d.lift = 0.4
        } else if (!still) {
          d.x = d.tx
          d.y = d.ty
        }
        drop(d, still && stage.time - d.at < 0.4)
      }
    },

    dispose() {
      for (const v of cache.values()) freeVis(v)
      cache.clear()
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'nature-walk',
    name: 'Nature Walk',
    emoji: '🍂',
    ages: [3, 7],
    set: 'gentle',
    pitch: 'Walk a woodland path in the season it really is, meet the animals, gather a handful of treasures, and arrange them on the nature table at home.',
    howTo: 'Drag ahead of the child to walk. Lift the big leaf, stroke the long grass, tap the stream and the trees. Tap a treasure to gather it. Tap the cottage to go in, set each treasure on the cloth, light the candle. Swipe the wooden wheel to turn the season; the door leads out again.',
    basedOn: 'The Waldorf nature table and seasonal walk; Montessori care of the environment and nature study.',
    whyFun: 'One finger parts the grass, lifts the leaf and turns the whole year, and the wood answers each time; then every found thing is set down exactly where the child wants it.',
  },
  create,
}
