// Bark Boats: a calm building prototype in the gentle set, painted as a long
// watercolour. On a mossy bank lie the makings of little boats. The child
// stands a hull on the flat stone, presses a twig in for a mast, threads a
// leaf on for a sail, loads a berry or an acorn cap; a gnome no bigger than a
// thumb climbs aboard. Carried to the water and let go, the boat is taken by
// the brook, and the picture follows it downstream into the evening: a frog,
// reeds to be nudged off, a water sprite's push, stepping stones, a
// kingfisher, a small waterfall, and at last a still pond at dusk, where the
// gnome steps off and lights a lamp beside the boats sent before. It stays
// there until the child lifts the sun again for a new morning on the bank.
//
// Nothing is scored, timed or praised, and nothing sinks. What the child
// built is exactly what sails, and it sails the way it was built.

import { TAU, clamp, damp, dist, ease, lerp, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { GNOME, drawBoat, lampPoint, mastFoot, mastTop, sailCentre } from './boat.ts'
import type { Look, Pose } from './boat.ts'
import { createBox, drawSprite } from './paint.ts'
import type { G, Sprite } from './paint.ts'
import { paintPieces } from './pieces.ts'
import type { CargoDef, HullDef, MastDef, SailDef } from './pieces.ts'
import { createScroll } from './scroll.ts'
import { DROP, FROG_STONE, KINGFISHER, LEN, LIP_FAR, LIP_NEAR, REEDS, REEDS_CLEAR, SLOTS, SPRITE_AT, STEP_STONES, STONE, STONE_GAPS, duskAt, farEdge, flowLane, lipX, nearEdge, padOf, ridge, sinkAt, sstep } from './world.ts'
import type { Snag } from './world.ts'

type Phase = 'bank' | 'journey' | 'moor' | 'pond' | 'dawn'
type Kind = 'mast' | 'sail' | 'cargo'

// A loose making on the bank (or, with `on` set, a part of a boat).
interface Piece {
  kind: Kind
  type: string
  sprite: Sprite
  x: number
  y: number
  rot: number
  // How it lies when it rests.
  restRot: number
  on: Boat | null
  // Easing somewhere by itself (back to the bank, or off a boat).
  glideX: number
  glideY: number
  gliding: boolean
  lift: Spring
  wob: Spring
  // How big a touch it answers to.
  reach: number
}

interface Boat {
  hull: HullDef
  look: Look
  mast: Piece | null
  sail: Piece | null
  cargo: Piece[]
  // The keel point.
  x: number
  y: number
  rot: number
  restRot: number
  stood: boolean
  glideX: number
  glideY: number
  gliding: boolean
  lift: Spring
  dip: Spring
  sway: Spring
  mastT: number
  sailT: number
  billow: Spring
  gnome: boolean
  gone: boolean
}

interface Held {
  piece: Piece | null
  boat: Boat | null
  sun: boolean
  dx: number
  dy: number
  // The sail, mast or cargo under the finger when a boat was taken hold of:
  // a drag carries the whole boat, a tap takes that part off.
  part: Piece | null
  moved: number
  at: number
  // How far along a twig it was taken hold of.
  along: number
}

// The boat on the brook.
interface Voyage {
  boat: Boat
  x: number
  // The lane, as a y at the upper level; `level` is how far down the fall.
  y: number
  level: number
  vx: number
  push: number
  off: number
  yaw: number
  bobT: number
  roll: Spring
  gust: number
  snag: Snag | null
  freed: boolean
  // The open lane a freed boat is making for.
  goal: number
  passed: Set<Snag>
  falling: number
  fallen: boolean
  slot: number
  arrive: number
  lamp: number
  wake: number
}

// A boat that came to rest in the pond on an earlier day.
interface Moored {
  look: Look
  slot: number
  bobT: number
  nudge: Spring
}

interface Ripple {
  x: number
  y: number
  t: number
  life: number
  r: number
}

interface Wisp {
  x: number
  y: number
  vx: number
  t: number
  life: number
  curl: number
}

interface Flier {
  x: number
  y: number
  tx: number
  ty: number
  t: number
  sprite: Sprite
}

const BANK_FLOOR = 772

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const dpr = Math.min(2, Math.max(1, (globalThis as { devicePixelRatio?: number }).devicePixelRatio ?? 1))
  const box = createBox()
  const scroll = createScroll(box, dpr > 1 ? 1.5 : 1)
  const P = paintPieces(box, dpr)
  let painting = true
  let done = false
  const warm = [...P.warm].reverse()

  // ------------------------------------------------------------ state

  let phase: Phase = 'bank'
  let camX = 0
  let camY = 0
  let lastTouch = 0
  let pieces: Piece[] = []
  let boats: Boat[] = []
  let voyage: Voyage | null = null
  const fleet: Moored[] = []
  const held = new Map<number, Held>()
  const ripples: Ripple[] = []
  const wisps: Wisp[] = []
  let mist = 0
  let dawnT = 0
  let sunLift = 0
  const sunGlow = spring(0, 60, 9)
  let brookAt = 0.6
  let cricketAt = 3
  let tuneAt = 2
  let lastSwish = -1
  let overWater = 0
  // The quiet invitation on the bank: now and then a waiting hull stirs.
  const hint = { boat: null as Boat | null, t: 1, at: 0 }

  const gnome = {
    // 'home' beside the toadstool, 'walk' to a boat, 'hop' in or out, 'aboard',
    // 'pad' on a lily pad in the pond.
    state: 'home' as 'home' | 'walk' | 'hop' | 'aboard' | 'pad',
    x: 492,
    y: 606,
    face: 1,
    boat: null as Boat | null,
    hopT: 0,
    fromX: 0,
    fromY: 0,
    toX: 0,
    toY: 0,
    stepAt: 0,
    bob: spring(0, 160, 9),
    then: null as (() => void) | null,
  }

  const frog = { x: FROG_STONE.x + 4, y: FROG_STONE.y - 22, away: 0, hop: 0, croaked: false, squat: spring(1, 200, 10) }
  const nixie = { state: 'under' as 'under' | 'rise' | 'push' | 'sink', x: 0, y: 0, t: 0, done: false }
  const kf = { state: 'perch' as 'perch' | 'fly' | 'ride' | 'leave' | 'gone', x: KINGFISHER.x, y: KINGFISHER.y, fromX: 0, fromY: 0, t: 0, flap: 0 }
  const reedSway = spring(0, 30, 3)
  const stoneDip = STEP_STONES.map(() => spring(0, 120, 8))
  // Lily pads: one astern of each mooring for the gnome to step onto, and a
  // few more besides.
  const pads = [
    ...SLOTS.map((sl, i) => ({ ...padOf(sl), flower: i === 3 })),
    { x: 4700, y: 880, flower: true },
    { x: 5060, y: 772, flower: true },
    { x: 4420, y: 700, flower: false },
    { x: 5010, y: 640, flower: false },
    { x: 4860, y: 610, flower: true },
  ].map((p) => ({ ...p, dip: spring(0, 90, 6), ph: p.x * 0.013 }))
  const fliers: Flier[] = [
    { x: 300, y: 380, tx: 300, ty: 380, t: 0, sprite: P.butterflies[0]! },
    { x: 860, y: 350, tx: 860, ty: 350, t: 1.7, sprite: P.butterflies[1]! },
  ]
  const dragon = { x: REEDS.x - 30, y: REEDS.y - 120, tx: REEDS.x - 30, ty: REEDS.y - 120, t: 0 }
  const flies = Array.from({ length: 11 }, (_, i) => ({ x: 4300 + ((i * 97) % 820), y: 560 + ((i * 61) % 280), ph: i * 1.7 }))

  // ------------------------------------------------------------ sound

  // Everything is the sound of the thing itself, kept low.
  const snd = {
    wood(pitch = 1) {
      sfx.tone({ freq: 300 * pitch, to: 190 * pitch, dur: 0.07, type: 'triangle', vol: 0.11 })
      sfx.noise({ dur: 0.04, vol: 0.05, freq: 900, filter: 'bandpass', q: 1 })
    },
    leaf() {
      sfx.noise({ dur: 0.13, vol: 0.06, freq: 3200, to: 1800, filter: 'bandpass', q: 0.8 })
    },
    shell() {
      sfx.tone({ freq: 620, to: 430, dur: 0.06, type: 'sine', vol: 0.1 })
      sfx.tone({ freq: 1240, to: 900, dur: 0.03, type: 'sine', vol: 0.03 })
    },
    berry() {
      sfx.tone({ freq: 360, to: 250, dur: 0.06, type: 'sine', vol: 0.09 })
    },
    stone() {
      sfx.tone({ freq: 170, to: 110, dur: 0.1, type: 'triangle', vol: 0.14 })
      sfx.noise({ dur: 0.06, vol: 0.06, freq: 420, filter: 'lowpass' })
    },
    moss() {
      sfx.noise({ dur: 0.07, vol: 0.05, freq: 300, filter: 'lowpass' })
    },
    air() {
      sfx.noise({ dur: 0.22, vol: 0.035, freq: 1500, to: 2400, filter: 'bandpass', q: 0.6 })
    },
    drip(vol = 0.05) {
      const f = 700 + Math.random() * 900
      sfx.tone({ freq: f, to: f * 1.7, dur: 0.06, type: 'sine', vol })
    },
    plop() {
      sfx.tone({ freq: 320, to: 120, dur: 0.14, type: 'sine', vol: 0.13 })
      sfx.noise({ dur: 0.2, vol: 0.09, freq: 700, to: 260, filter: 'lowpass' })
      sfx.tone({ freq: 760, to: 1300, dur: 0.07, type: 'sine', vol: 0.05, delay: 0.09 })
    },
    swish() {
      if (stage.time - lastSwish < 0.13) return
      lastSwish = stage.time
      sfx.noise({ dur: 0.16, vol: 0.045, freq: 700, to: 1200, filter: 'bandpass', q: 0.9 })
    },
    wind() {
      if (stage.time - lastSwish < 0.13) return
      lastSwish = stage.time
      sfx.noise({ dur: 0.24, vol: 0.04, freq: 1700, to: 2600, filter: 'bandpass', q: 0.5 })
    },
    step() {
      sfx.tone({ freq: 520, to: 400, dur: 0.03, type: 'triangle', vol: 0.05 })
    },
    croak() {
      sfx.tone({ freq: 190, to: 150, dur: 0.11, type: 'triangle', vol: 0.09 })
      sfx.tone({ freq: 210, to: 160, dur: 0.14, type: 'triangle', vol: 0.09, delay: 0.16 })
    },
    chime(step: number, vol = 0.07, delay = 0) {
      sfx.tone({ freq: sfx.scale(step), dur: 0.9, type: 'sine', vol, delay, attack: 0.012 })
      sfx.tone({ freq: sfx.scale(step) * 2, dur: 0.4, type: 'sine', vol: vol * 0.25, delay, attack: 0.012 })
    },
    bird() {
      sfx.tone({ freq: 2500, to: 3300, dur: 0.07, type: 'sine', vol: 0.035 })
      sfx.tone({ freq: 3000, to: 2500, dur: 0.09, type: 'sine', vol: 0.03, delay: 0.1 })
    },
    splash() {
      sfx.noise({ dur: 0.42, vol: 0.13, freq: 1500, to: 380, filter: 'lowpass' })
      sfx.tone({ freq: 240, to: 90, dur: 0.2, type: 'sine', vol: 0.12 })
      for (let i = 0; i < 4; i++) sfx.tone({ freq: 800 + i * 240, to: 1500 + i * 260, dur: 0.06, type: 'sine', vol: 0.03, delay: 0.14 + i * 0.07 })
    },
  }

  // ------------------------------------------------------------ the bank

  const piece = (kind: Kind, type: string, sprite: Sprite, x: number, y: number, rot: number, reach: number): Piece => ({
    kind,
    type,
    sprite,
    x,
    y,
    rot,
    restRot: rot,
    on: null,
    glideX: x,
    glideY: y,
    gliding: false,
    lift: spring(0, 200, 16),
    wob: spring(0, 150, 7),
    reach,
  })

  const hullAt = (hull: HullDef, x: number, y: number, rot: number): Boat => ({
    hull,
    look: { hull, mast: null, sail: null, cargo: [] },
    mast: null,
    sail: null,
    cargo: [],
    x,
    y,
    rot,
    restRot: rot,
    stood: false,
    glideX: x,
    glideY: y,
    gliding: false,
    lift: spring(0, 200, 16),
    dip: spring(1, 220, 9),
    sway: spring(0, 90, 5),
    mastT: 1,
    sailT: 1,
    billow: spring(0, 40, 5),
    gnome: false,
    gone: false,
  })

  // The makings, laid out afresh each morning: hulls to the left of the
  // stone, twigs and leaves to the right, cargo along the front.
  const layBank = () => {
    const j = (n: number) => (stage.rand() - 0.5) * n
    const flip = stage.rand() < 0.5
    const hs = P.hulls
    boats = [
      hullAt(flip ? hs.barkA! : hs.barkB!, 160 + j(16), 652 + j(8), -0.1 + j(0.06)),
      hullAt(hs.nutA!, 356 + j(14), 648 + j(8), 0.16 + j(0.06)),
      hullAt(flip ? hs.barkB! : hs.barkA!, 196 + j(16), 752 + j(8), 0.07 + j(0.06)),
      hullAt(hs.nutB!, 380 + j(14), 748 + j(8), -0.14 + j(0.06)),
    ]
    const m = P.masts
    const s = P.sails
    const c = P.cargo
    pieces = [
      piece('mast', 'twigA', m.twigA!.sprite, 796 + j(10), 612 + j(4), 1.5 + j(0.1), 34),
      piece('mast', 'twigB', m.twigB!.sprite, 818 + j(10), 642 + j(4), 1.62 + j(0.1), 34),
      piece('mast', 'twigC', m.twigC!.sprite, 800 + j(10), 672 + j(4), 1.46 + j(0.1), 34),
      piece('sail', 'birch', s.birch!.sprite, 1096 + j(8), 652 + j(6), -0.4 + j(0.3), 50),
      piece('sail', 'feather', s.feather!.sprite, 1016 + j(8), 690 + j(4), 1.42 + j(0.1), 44),
      piece('sail', 'lime', s.lime!.sprite, 838 + j(8), 742 + j(5), -0.6 + j(0.3), 62),
      piece('sail', 'maple', s.maple!.sprite, 964 + j(8), 752 + j(4), 0.5 + j(0.3), 62),
      piece('sail', 'oak', s.oak!.sprite, 1082 + j(6), 752 + j(4), 1.25 + j(0.2), 54),
      piece('cargo', 'acorn', c.acorn!.sprite, 470 + j(8), 746 + j(6), j(0.3), 42),
      piece('cargo', 'berries', c.berries!.sprite, 542 + j(8), 762 + j(4), j(0.3), 42),
      piece('cargo', 'daisy', c.daisy!.sprite, 612 + j(8), 748 + j(6), j(0.3), 42),
      piece('cargo', 'acorn', c.acorn!.sprite, 682 + j(8), 764 + j(4), j(0.3), 42),
      piece('cargo', 'berries', c.berries!.sprite, 748 + j(6), 744 + j(4), j(0.3), 42),
    ]
    gnome.state = 'home'
    gnome.x = 492
    gnome.y = 606
    gnome.face = 1
    gnome.boat = null
    gnome.then = null
  }
  layBank()

  const mastDef = (p: Piece | null): MastDef | null => (p ? P.masts[p.type]! : null)
  const sailDef = (p: Piece | null): SailDef | null => (p ? P.sails[p.type]! : null)
  const cargoDef = (p: Piece): CargoDef => P.cargo[p.type]!

  const onBank = (x: number, y: number): boolean => x > 30 && x < 1250 && y > nearEdge(x) + 6
  const bankY = (x: number, y: number, pad: number): number => clamp(y, nearEdge(x) + pad, BANK_FLOOR)
  const stoneFree = (but: Boat): boolean => !boats.some((b) => b !== but && !b.gone && Math.abs(b.x - STONE.x) < 150 && Math.abs(b.y - STONE.y) < 30)

  const ripple = (x: number, y: number, r = 34, life = 1.1) => {
    if (ripples.length > 36) ripples.shift()
    ripples.push({ x, y, t: 0, life, r })
  }

  const drops = (sx: number, sy: number, n: number, speed: number) => {
    fx.burst(sx, sy, { count: n, color: ['#f8f2e4', '#bfe2ea', '#8cc4dc'], speed, life: 0.55, size: 5, gravity: 620, angle: -Math.PI / 2, spread: 1.5, drag: 0.98 })
  }

  // A boat's parts in world space, for touching them.
  const boatSail = (b: Boat): { x: number; y: number } => {
    const c = sailCentre(b.look)
    return { x: b.x + c.x, y: b.y + c.y }
  }

  // Take a part off a boat: it is a loose piece again, in the hand.
  const detach = (p: Piece) => {
    const b = p.on
    if (!b) return
    if (b.mast === p) {
      b.mast = null
      b.look.mast = null
      // The sail slips off with its mast and comes to rest beside the boat.
      if (b.sail) {
        const s = b.sail
        const at = boatSail(b)
        b.sail = null
        b.look.sail = null
        s.on = null
        s.x = at.x
        s.y = at.y
        s.rot = 0
        setDown(s, b.x + b.hull.halfW + 50 + Math.random() * 40, b.y + 10 + Math.random() * 40)
      }
      p.x = b.x + b.hull.mastX
      p.y = b.y + mastFoot(b.look)
      p.rot = 0
    } else if (b.sail === p) {
      const at = boatSail(b)
      b.sail = null
      b.look.sail = null
      p.x = at.x
      p.y = at.y
      p.rot = 0
    } else {
      const i = b.cargo.indexOf(p)
      if (i >= 0) {
        p.x = b.x + b.look.cargo[i]!.dx
        p.y = b.y + b.hull.deckY
        b.cargo.splice(i, 1)
        b.look.cargo.splice(i, 1)
      }
    }
    p.on = null
    b.dip.value = 1.04
  }

  // Let a loose piece settle at a place on the bank.
  const setDown = (p: Piece, x: number, y: number) => {
    const gx = clamp(x, 44, p.kind === 'mast' ? 960 : 1140)
    p.glideX = gx
    p.glideY = bankY(gx, y, p.kind === 'cargo' ? 26 : 40)
    p.gliding = true
    p.restRot = p.kind === 'mast' ? 1.5 + (Math.random() - 0.5) * 0.3 : p.kind === 'sail' ? (Math.random() - 0.5) * 1.4 : (Math.random() - 0.5) * 0.4
  }

  // Fit a piece to a boat if it has a place there. True if it went on.
  const attach = (p: Piece, b: Boat, dropX: number): boolean => {
    if (p.kind === 'mast') {
      if (b.mast) {
        // The new twig takes the old one's place.
        const old = b.mast
        old.on = null
        old.x = b.x + b.hull.mastX
        old.y = b.y + mastFoot(b.look)
        old.rot = 0
        setDown(old, b.x - b.hull.halfW - 50, b.y + 26)
      }
      b.mast = p
      b.look.mast = mastDef(p)
      b.mastT = 0
      stage.tween(0.34, (t) => (b.mastT = t), ease.outBack)
      b.dip.value = 0.86
      b.sway.kick(1.4)
      snd.wood(1.25)
      snd.chime(-5, 0.045, 0.05)
    } else if (p.kind === 'sail') {
      if (!b.mast) {
        // No mast to thread it on: a twig nearby stirs.
        const tw = pieces.find((q) => q.kind === 'mast' && !q.on)
        if (tw) tw.wob.kick(3)
        return false
      }
      if (b.sail) {
        const old = b.sail
        const at = boatSail(b)
        old.on = null
        old.x = at.x
        old.y = at.y
        old.rot = 0
        setDown(old, b.x + b.hull.halfW + 46 + Math.random() * 44, b.y + 6 + Math.random() * 44)
      }
      b.sail = p
      b.look.sail = sailDef(p)
      b.sailT = 0
      stage.tween(0.42, (t) => (b.sailT = t), ease.outBack)
      b.billow.value = 0.9
      b.sway.kick(-0.8)
      snd.leaf()
      snd.chime(-2, 0.045, 0.08)
    } else {
      if (b.cargo.length >= b.hull.holds) return false
      const h = b.hull
      let dx = clamp(dropX - b.x, h.cargoFrom, h.cargoTo)
      // Keep clear of what is already loaded.
      for (let tries = 0; tries < 6; tries++) {
        const hit = b.look.cargo.find((c) => Math.abs(c.dx - dx) < 15)
        if (!hit) break
        const right = dx >= hit.dx ? hit.dx + 16 <= h.cargoTo : hit.dx - 16 < h.cargoFrom
        dx = right ? hit.dx + 16 : hit.dx - 16
      }
      const item = { def: cargoDef(p), dx, hop: 14 }
      b.cargo.push(p)
      b.look.cargo.push(item)
      stage.tween(0.36, (t) => (item.hop = 14 * (1 - t)), ease.outBounce)
      b.dip.value = 0.9
      if (p.type === 'acorn') snd.shell()
      else snd.berry()
      snd.chime(p.type === 'daisy' ? 1 : 0, 0.04, 0.05)
    }
    p.on = b
    p.gliding = false
    if (!b.stood) {
      b.stood = true
      b.restRot = 0
    }
    callGnome(b)
    return true
  }

  // The gnome comes to the first hull that is stood up or built on.
  const callGnome = (b: Boat) => {
    if (gnome.state !== 'home' || phase !== 'bank') return
    gnome.state = 'walk'
    gnome.boat = b
  }

  const board = (b: Boat) => {
    gnome.state = 'aboard'
    gnome.boat = b
    b.gnome = true
    b.dip.value = 0.9
    b.sway.kick(1)
    gnome.bob.value = -5
    snd.wood(1.6)
  }

  const hopTo = (x: number, y: number, then: () => void) => {
    gnome.state = 'hop'
    gnome.hopT = 0
    gnome.fromX = gnome.x
    gnome.fromY = gnome.y
    gnome.toX = x
    gnome.toY = y
    gnome.face = x >= gnome.x ? 1 : -1
    gnome.then = then
  }

  // ------------------------------------------------------------ the voyage

  const launch = (b: Boat) => {
    const yUpper = clamp(b.y - b.hull.draft, farEdge(b.x) + 28, nearEdge(b.x) - 10)
    voyage = {
      boat: b,
      x: b.x,
      y: yUpper,
      level: 0,
      vx: 0,
      push: 0,
      off: yUpper - flowLane(b.x),
      yaw: 0,
      bobT: 0,
      roll: spring(0, 26, 2.2),
      gust: 0,
      snag: null,
      freed: false,
      goal: 0,
      passed: new Set(),
      falling: -1,
      fallen: false,
      slot: -1,
      arrive: -1,
      lamp: 0,
      wake: 0,
    }
    b.gone = true
    b.stood = true
    b.rot = 0
    if (fleet.length >= SLOTS.length) fleet.shift()
    voyage.roll.kick(0.5)
    phase = 'journey'
    ripple(b.x, yUpper, 70, 1.4)
    ripple(b.x, yUpper, 40, 1)
    drops(b.x - camX, yUpper - camY, 9, 190)
    snd.plop()
    // The gnome is not left behind: he hops across from wherever he is.
    if (!b.gnome) {
      const from = boats.find((o) => o.gnome)
      if (from) {
        gnome.x = from.x + from.hull.seatX
        gnome.y = from.y + from.hull.deckY
        from.gnome = false
      }
      gnome.boat = b
      hopTo(b.x + b.hull.seatX, yUpper + b.hull.deckY, () => board(b))
    }
    frog.croaked = false
    nixie.done = false
    nixie.state = 'under'
    kf.state = 'perch'
    kf.x = KINGFISHER.x
    kf.y = KINGFISHER.y
  }

  // Any help frees a snagged boat: it slips sideways into open water (the
  // near side of the reeds, the nearest gap between the stones) and goes on.
  const freeSnag = () => {
    const v = voyage
    if (!v || !v.snag || v.freed) return
    const s = v.snag
    if (s === REEDS) {
      v.goal = REEDS_CLEAR
      reedSway.kick(1.6)
    } else {
      v.goal = STONE_GAPS.reduce((best, gap) => (Math.abs(gap - v.y) < Math.abs(best - v.y) ? gap : best))
      for (const st of STEP_STONES) v.passed.add(st)
    }
    v.off = v.goal - flowLane(v.x)
    v.freed = true
    v.roll.kick(v.goal > v.y ? 0.5 : -0.5)
    ripple(v.x + 30, v.y, 44)
    snd.drip(0.06)
  }

  const nudge = (px: number) => {
    const v = voyage
    if (!v) return
    v.push = Math.min(80, v.push + 40)
    v.roll.kick(px < v.x ? 0.5 : -0.5)
    v.boat.dip.value = 0.92
    freeSnag()
    snd.wood(0.9)
    snd.drip(0.05)
    ripple(v.x, v.y + v.level * DROP, 54)
  }

  // Free pond slots are used in order. (When the pond is full, the boat that
  // has been there longest drifts on as the next one is launched, unseen.)
  const takeSlot = (): number => {
    for (let i = 0; i < SLOTS.length; i++) if (!fleet.some((m) => m.slot === i)) return i
    return 0
  }

  const padFor = (slot: number) => pads[slot]!

  const updateVoyage = (dt: number) => {
    const v = voyage
    if (!v) return
    const b = v.boat
    const look = b.look
    const area = look.sail?.area ?? 0
    const load = look.cargo.length
    v.bobT += dt
    v.roll.update(dt)
    b.billow.update(dt)
    v.gust = Math.max(0, v.gust - dt * 0.5)
    b.billow.target = area > 0 ? clamp(0.25 + v.vx / 160 + v.gust * 0.7, 0, 1.2) : 0

    if (phase === 'pond') {
      v.vx = damp(v.vx, 0, 3, dt)
      v.x += v.vx * dt
      return
    }

    // Over the fall: tip, drop, land with a splash.
    if (v.falling >= 0) {
      v.falling += dt / 0.62
      const t = Math.min(1, v.falling)
      v.level = ease.inQuad(t)
      v.x += 78 * dt
      v.roll.value = Math.sin(t * Math.PI) * 0.42
      if (t >= 1) {
        v.falling = -1
        v.fallen = true
        v.level = 1
        v.vx = 30
        v.push = 30
        v.roll.value = 0.1
        v.roll.kick(-1.4)
        b.dip.value = 0.8
        const sy = v.y + DROP
        ripple(v.x, sy, 90, 1.6)
        ripple(v.x + 10, sy, 56, 1.2)
        ripple(v.x - 20, sy + 6, 30, 0.9)
        drops(v.x - camX, sy - camY, 16, 300)
        snd.splash()
      }
      return
    }

    // What the brook does with this boat: the current, the sail, the load.
    let want = 64 + 30 * area + (b.hull.spins ? 5 : 0) - 2.5 * load
    const lip = lipX(v.y)
    if (!v.fallen) want += 46 * sstep(lip - 150, lip - 10, v.x)
    v.push *= Math.exp(-dt * 0.8)

    // Snags: reeds, stepping stones. A snagged boat waits.
    const reach = b.hull.halfW * 0.9
    if (!v.snag && !v.fallen) {
      for (const s of [REEDS, ...STEP_STONES]) {
        if (v.passed.has(s)) continue
        if (v.x + reach > s.x - s.r && v.x < s.x && Math.abs(v.y - s.y) < s.r * 0.8) {
          v.snag = s
          v.freed = false
          v.roll.kick(0.9)
          b.dip.value = 0.93
          snd.wood(0.7)
          if (s === REEDS) {
            reedSway.kick(2.4)
            snd.leaf()
          } else {
            const i = STEP_STONES.indexOf(s)
            stoneDip[i]?.kick(2)
          }
          ripple(v.x + reach, v.y, 40)
          break
        }
      }
    }
    if (v.snag) {
      const s = v.snag
      if (!v.freed) {
        want = 0
        v.push = 0
        v.vx = damp(v.vx, 0, 9, dt)
      } else {
        // Slipping sideways into open water; it goes on as soon as it is clear.
        v.off = v.goal - flowLane(v.x)
        const blocked = [REEDS, ...STEP_STONES].some((o) => v.x < o.x + o.r && v.x + reach > o.x - o.r && Math.abs(v.y - o.y) < o.r * 0.8)
        if (blocked) {
          want = 0
          v.vx = damp(v.vx, 0, 6, dt)
        } else {
          v.passed.add(s)
          v.snag = null
        }
      }
    }

    // Coming in to the pond: ease across to the mooring and stop there.
    let lane = flowLane(v.x) + v.off
    if (v.fallen && v.x > 4180) {
      if (v.slot < 0) {
        v.slot = takeSlot()
        phase = 'moor'
      }
      const s = SLOTS[v.slot]!
      const k = sstep(4180, s.x - 30, v.x)
      lane = lerp(lane, s.y - DROP, k)
      v.off *= Math.exp(-dt * 0.8)
      const left = s.x - v.x
      want = Math.min(want, left < 3 ? 0 : Math.max(9, left * 0.6))
      v.push = Math.min(v.push, Math.max(0, left * 0.4))
      if (left < 3 && v.arrive < 0) {
        v.arrive = 0
        v.vx = 0
        v.push = 0
        const pad = padFor(v.slot)
        pad.dip.kick(3)
        ripple(v.x + b.hull.halfW, s.y, 50)
        ripple(pad.x, pad.y, 60, 1.4)
        snd.drip(0.06)
        snd.chime(-3, 0.05)
      }
    }
    v.off *= Math.exp(-dt * 0.1)
    // The current parts round the frog's stone.
    if (!v.fallen && v.x > FROG_STONE.x - 200 && v.x < FROG_STONE.x + 50 && v.y < FROG_STONE.y + 54) v.off += dt * 80
    const lo = farEdge(v.x) - (v.x > LIP_FAR.x ? DROP : 0) + 30
    const hi = nearEdge(v.x) - (v.x > LIP_NEAR.x ? DROP : 0) - 12
    v.y = damp(v.y, clamp(lane, Math.min(lo, hi), Math.max(lo, hi)), v.freed ? 2.4 : 1.3, dt)
    v.vx = damp(v.vx, want + v.push, 2.2, dt)
    v.x += v.vx * dt

    // The nutshell turns as it goes: slowly, a little faster when shoved.
    if (b.hull.spins) v.yaw += dt * (look.sail ? 0.1 : 0.34) * (0.4 + v.vx / 70) + dt * v.push * 0.004
    // A wake now and then.
    v.wake -= dt * Math.max(0.2, v.vx / 60)
    if (v.wake <= 0 && v.vx > 12) {
      v.wake = 0.5
      ripple(v.x - b.hull.halfW * 0.7, v.y + v.level * DROP + 2, 22, 0.9)
    }
    if (!v.fallen && v.falling < 0 && v.x >= lip - 8) {
      v.falling = 0
      b.dip.value = 1.06
    }

    // The mooring: the gnome steps off, lights the lamp, and sits.
    if (v.arrive >= 0) {
      const before = v.arrive
      v.arrive += dt
      const pad = padFor(v.slot)
      if (before < 0.7 && v.arrive >= 0.7 && b.gnome) {
        b.gnome = false
        gnome.x = v.x + b.hull.seatX
        gnome.y = v.y + DROP + b.hull.deckY
        b.dip.value = 1.05
        hopTo(pad.x + 4, pad.y - 2, () => {
          gnome.state = 'pad'
          gnome.face = 1
          gnome.bob.value = 4
          pad.dip.kick(4)
          ripple(pad.x, pad.y, 50)
          snd.drip(0.05)
        })
      }
      if (before < 1.9 && v.arrive >= 1.9) {
        gnome.bob.kick(-60)
        stage.tween(1.1, (t) => (v.lamp = t), ease.outCubic)
        sfx.tone({ freq: 2400, to: 1800, dur: 0.05, type: 'triangle', vol: 0.03 })
        snd.chime(2, 0.075, 0.1)
        snd.chime(4, 0.05, 0.5)
      }
      if (before < 3.2 && v.arrive >= 3.2) {
        phase = 'pond'
        lastTouch = stage.time
        tuneAt = 2.5
      }
    }
  }

  // The things along the way that notice the boat.
  const updateWay = (dt: number) => {
    const v = voyage
    frog.squat.update(dt)
    reedSway.update(dt)
    for (const s of stoneDip) s.update(dt)
    if (frog.away > 0) {
      frog.away -= dt
      if (frog.away <= 0) {
        frog.squat.value = 0.7
        ripple(FROG_STONE.x, FROG_STONE.y, 40)
      }
    }
    if (frog.hop > 0) frog.hop = Math.max(0, frog.hop - dt / 0.4)
    if (v && !frog.croaked && frog.away <= 0 && Math.abs(v.x - frog.x) < 60) {
      frog.croaked = true
      frog.squat.value = 1.14
      snd.croak()
    }

    // The water sprite rises behind the boat, pushes, and sinks again.
    if (v && !nixie.done && nixie.state === 'under' && v.x > SPRITE_AT && !v.snag) {
      nixie.state = 'rise'
      nixie.t = 0
      nixie.x = v.x - v.boat.hull.halfW - 96
      nixie.y = v.y + 8
      ripple(nixie.x, nixie.y, 70, 1.6)
      ripple(nixie.x, nixie.y, 40, 1.2)
      snd.chime(4, 0.05)
      snd.chime(2, 0.05, 0.22)
      snd.drip(0.05)
    }
    if (nixie.state !== 'under') {
      nixie.t += dt
      if (v) nixie.x = damp(nixie.x, v.x - v.boat.hull.halfW - 96, nixie.state === 'sink' ? 0.4 : 3, dt)
      if (nixie.state === 'rise' && nixie.t > 1.2) {
        nixie.state = 'push'
        nixie.t = 0
        if (v) {
          v.push = Math.min(120, v.push + 76)
          v.gust = 1
          v.roll.kick(-0.7)
          ripple(v.x - v.boat.hull.halfW, v.y, 60)
          ripple(v.x - v.boat.hull.halfW - 30, v.y, 36)
          for (let i = 0; i < 4; i++) wisps.push({ x: nixie.x + 60, y: nixie.y - 60 - i * 22, vx: 150 + i * 16, t: 0, life: 1, curl: i })
        }
        snd.swish()
        snd.chime(0, 0.06, 0.05)
      } else if (nixie.state === 'push' && nixie.t > 1) {
        nixie.state = 'sink'
        nixie.t = 0
      } else if (nixie.state === 'sink' && nixie.t > 1.3) {
        nixie.state = 'under'
        nixie.done = true
        ripple(nixie.x, nixie.y, 50, 1.4)
      }
    }

    // The kingfisher flies down to ride on the mast, if there is one.
    kf.flap += dt * 22
    if (v && kf.state === 'perch' && v.x > KINGFISHER.x - 150) {
      kf.state = 'fly'
      kf.t = 0
      kf.fromX = kf.x
      kf.fromY = kf.y
      snd.bird()
    }
    if (kf.state === 'fly' && v) {
      kf.t = Math.min(1, kf.t + dt / 1.3)
      const hasMast = !!v.boat.look.mast
      const top = mastTop(v.boat.look)
      const tx = hasMast ? v.x + top.x : v.x + 150
      const ty = hasMast ? v.y + v.boat.hull.draft + top.y - 2 : v.y - 26
      const e = ease.inOutCubic(kf.t)
      kf.x = lerp(kf.fromX, tx, e)
      kf.y = lerp(kf.fromY, ty, e) - Math.sin(kf.t * Math.PI) * (hasMast ? 26 : -10)
      if (kf.t >= 1) {
        if (hasMast) {
          kf.state = 'ride'
          v.roll.kick(0.5)
        } else {
          kf.state = 'leave'
          kf.t = 0
          kf.fromX = kf.x
          kf.fromY = kf.y
          ripple(kf.x, v.y, 30)
          snd.drip(0.05)
        }
      }
    } else if (kf.state === 'ride' && v) {
      const top = mastTop(v.boat.look)
      kf.x = v.x + top.x - Math.sin(v.roll.value * 0.16) * top.y
      kf.y = v.y + v.boat.hull.draft + top.y - 2 + Math.sin(v.bobT * 2.1) * v.boat.hull.bob * 0.5
      if (v.x > lipX(v.y) - 150) {
        kf.state = 'leave'
        kf.t = 0
        kf.fromX = kf.x
        kf.fromY = kf.y
        snd.bird()
      }
    } else if (kf.state === 'leave') {
      kf.t += dt / 2.4
      kf.x = kf.fromX + kf.t * 620
      kf.y = kf.fromY - Math.sin(Math.min(1, kf.t) * Math.PI * 0.5) * 240
      if (kf.t > 1.2) kf.state = 'gone'
    }

    // The dragonfly keeps to the reeds.
    dragon.t -= dt
    if (dragon.t <= 0) {
      dragon.t = 0.8 + Math.random() * 1.8
      dragon.tx = REEDS.x - 60 + Math.random() * 220
      dragon.ty = REEDS.y - 170 + Math.random() * 130
    }
    dragon.x = damp(dragon.x, dragon.tx, 3.4, dt)
    dragon.y = damp(dragon.y, dragon.ty, 3.4, dt)
  }

  // ------------------------------------------------------------ morning again

  const beginDawn = () => {
    if (phase !== 'pond') return
    phase = 'dawn'
    dawnT = 0
    snd.chime(0, 0.06)
    snd.chime(2, 0.06, 0.35)
    snd.chime(4, 0.06, 0.7)
  }

  const newMorning = () => {
    const v = voyage
    if (v) fleet.push({ look: { hull: v.boat.look.hull, mast: v.boat.look.mast, sail: v.boat.look.sail, cargo: v.boat.look.cargo.map((c) => ({ ...c, hop: 0 })) }, slot: v.slot, bobT: v.bobT, nudge: spring(0, 30, 2.5) })
    voyage = null
    camX = 0
    camY = 0
    sunLift = 0
    held.clear()
    ripples.length = 0
    wisps.length = 0
    layBank()
    phase = 'bank'
    lastTouch = stage.time
    fliers[0]!.x = 300
    fliers[1]!.x = 860
    kf.state = 'perch'
    kf.x = KINGFISHER.x
    kf.y = KINGFISHER.y
    snd.bird()
  }

  // ------------------------------------------------------------ touching

  const sunAt = (): { x: number; y: number; k: number } => {
    // High over the bank; it sinks as the picture moves into the evening and
    // rests on the hills over the pond until it is lifted again.
    const k = sstep(2700, LEN - W, camX)
    const rest = ridge(camX + 905) - camY + 4
    return { x: 905, y: lerp(112, rest, k) - sunLift, k }
  }

  const pick = (wx: number, wy: number): { piece: Piece | null; boat: Boat | null } => {
    const top = { piece: null as Piece | null, score: 1 }
    const score = (p: Piece, cx: number, cy: number, reach: number) => {
      const s = dist(wx, wy, cx, cy) / reach
      if (s < top.score) {
        top.score = s
        top.piece = p
      }
    }
    for (const b of boats) {
      if (b.gone) continue
      if (b.sail) {
        // A sail is taken by the leaf itself, not the air beside it.
        const at = boatSail(b)
        const d = sailDef(b.sail)!
        const sx = Math.abs(wx - at.x) / (d.w * 0.5 + 12)
        const sy = Math.abs(wy - at.y) / (d.h * 0.5 + 8)
        const sc = Math.max(sx, sy)
        if (sc < top.score) {
          top.score = sc
          top.piece = b.sail
        }
      }
      if (b.mast && !b.sail) {
        const len = mastDef(b.mast)!.len
        const t = clamp((b.y + mastFoot(b.look) - wy) / len, 0.3, 1)
        score(b.mast, b.x + b.hull.mastX, b.y + mastFoot(b.look) - len * t, 26)
      } else if (b.mast) {
        // With a sail on, only the bare top of the mast is the mast.
        const mt = mastTop(b.look)
        score(b.mast, b.x + mt.x, b.y + mt.y + 8, 20)
      }
      for (let i = 0; i < b.cargo.length; i++) score(b.cargo[i]!, b.x + b.look.cargo[i]!.dx, b.y + b.hull.deckY - 12, 26)
    }
    for (const p of pieces) {
      if (p.on) continue
      if (p.kind === 'mast') {
        // A twig is long: measure to the nearest point along it.
        const len = P.masts[p.type]!.len
        const ux = Math.sin(p.rot)
        const uy = -Math.cos(p.rot)
        const t = clamp((wx - p.x) * ux + (wy - p.y) * uy, 0, len)
        score(p, p.x + ux * t, p.y + uy * t, p.reach)
      } else if (p.kind === 'cargo') {
        score(p, p.x, p.y - 12, p.reach)
      } else {
        // A long leaf or a feather is measured along its length too.
        const d = P.sails[p.type]!
        const half = Math.max(0, d.h * 0.5 - d.w * 0.5)
        const ux = Math.sin(p.rot)
        const uy = -Math.cos(p.rot)
        const t = clamp((wx - p.x) * ux + (wy - p.y) * uy, -half, half)
        score(p, p.x + ux * t, p.y + uy * t, p.reach)
      }
    }
    if (top.piece) return { piece: top.piece, boat: null }
    const under = { boat: null as Boat | null, score: 1 }
    for (const b of boats) {
      if (b.gone) continue
      const dx = Math.abs(wx - b.x) / (b.hull.halfW + 22)
      const dy = Math.abs(wy - (b.y - 34)) / (b.gnome ? 74 : 56)
      const s = Math.max(dx, dy)
      if (s < under.score) {
        under.score = s
        under.boat = b
      }
    }
    return { piece: null, boat: under.boat }
  }

  const touchNothing = (p: Pointer, wx: number, wy: number) => {
    const inWater = wy > farEdge(wx) + 4 && wy < nearEdge(wx) - 2
    if (inWater) {
      ripple(wx, wy, 44)
      ripple(wx, wy, 22, 0.8)
      snd.drip(0.06)
      // Lily pads dip under a finger; a moored boat rocks.
      for (const pad of pads) if (dist(wx, wy, pad.x, pad.y) < 70) pad.dip.kick(4)
      for (const m of fleet) {
        const s = SLOTS[m.slot]!
        if (dist(wx, wy, s.x, s.y - 30) < 120) m.nudge.kick(wx < s.x ? 0.6 : -0.6)
      }
      return
    }
    if (wy >= nearEdge(wx) - 2) {
      snd.moss()
      fx.burst(p.x, p.y, { count: 5, color: ['#9fbf5c', '#c6d67a', '#86a64e'], speed: 70, life: 0.45, size: 4, gravity: 260, angle: -Math.PI / 2, spread: 1.6 })
      return
    }
    // The air: a breath, and the butterflies drift toward it.
    snd.air()
    wisps.push({ x: wx - 30, y: wy, vx: 80, t: 0, life: 0.9, curl: 0 })
    const f = fliers[Math.floor(Math.random() * fliers.length)]!
    if (wy < farEdge(wx)) {
      f.tx = wx
      f.ty = clamp(wy, 260, farEdge(wx) - 20)
      f.t = 2.5
    }
  }

  const down = (p: Pointer) => {
    lastTouch = stage.time
    const wx = p.x + camX
    const wy = p.y + camY
    const sun = sunAt()
    if (dist(p.x, p.y, sun.x, sun.y) < 84) {
      sunGlow.value = 1
      if (phase === 'pond') {
        // Even a tap lifts it a little, to show that it will come.
        sunLift = Math.max(sunLift, 22)
        held.set(p.id, { piece: null, boat: null, sun: true, dx: 0, dy: p.y + sunLift, part: null, moved: 0, at: stage.time, along: 0 })
        snd.chime(-1, 0.05)
      } else {
        snd.chime(phase === 'bank' ? 4 : 2, 0.04)
      }
      return
    }
    if (phase === 'dawn') return

    if (phase === 'bank') {
      const hit = pick(wx, wy)
      const carry = (b: Boat, part: Piece | null) => {
        b.gliding = false
        b.lift.target = 1
        held.set(p.id, { piece: null, boat: b, sun: false, dx: b.x - wx, dy: b.y - wy, part, moved: 0, at: stage.time, along: 0 })
        boats.splice(boats.indexOf(b), 1)
        boats.push(b)
        if (b.hull.spins) snd.shell()
        else snd.wood(0.8)
        if (b.gnome) gnome.bob.kick(-40)
      }
      if (hit.piece && hit.piece.on) {
        // A boat taken hold of by its sail, its mast or its cargo is carried
        // whole; small hands take hold of whatever is biggest.
        carry(hit.piece.on, hit.piece)
        return
      }
      if (hit.piece) {
        const pc = hit.piece
        pc.gliding = false
        pc.lift.target = 1
        let along = 0
        if (pc.kind === 'mast') {
          along = clamp((wx - pc.x) * Math.sin(pc.rot) - (wy - pc.y) * Math.cos(pc.rot), 0, P.masts[pc.type]!.len)
        }
        held.set(p.id, { piece: pc, boat: null, sun: false, dx: pc.x - wx, dy: pc.y - wy, part: null, moved: 0, at: stage.time, along })
        // Bring it to the top of the pile.
        pieces.splice(pieces.indexOf(pc), 1)
        pieces.push(pc)
        if (pc.kind === 'mast') snd.wood(1.1)
        else if (pc.kind === 'sail') snd.leaf()
        else if (pc.type === 'acorn') snd.shell()
        else snd.berry()
        return
      }
      if (hit.boat) {
        carry(hit.boat, null)
        return
      }
      if (gnome.state === 'home' && dist(wx, wy, gnome.x, gnome.y - 30) < 56) {
        gnome.bob.kick(-90)
        snd.step()
        snd.chime(3, 0.035)
        return
      }
      touchNothing(p, wx, wy)
      return
    }

    // On the brook and in the pond.
    const v = voyage
    if (v && phase !== 'pond') {
      const by = v.y + v.level * DROP
      if (Math.abs(wx - v.x) < v.boat.hull.halfW + 30 && wy > by - 200 && wy < by + 44) {
        nudge(wx)
        return
      }
    }
    if (v && phase === 'pond') {
      const s = SLOTS[v.slot]!
      if (dist(wx, wy, s.x, s.y - 40) < 110) {
        v.roll.kick(wx < s.x ? 0.7 : -0.7)
        v.boat.dip.value = 0.93
        ripple(s.x, s.y, 60)
        snd.wood(0.8)
        snd.drip(0.05)
        return
      }
    }
    if (gnome.state === 'pad' && dist(wx, wy, gnome.x, gnome.y - 26) < 54) {
      gnome.bob.kick(-80)
      snd.chime(3, 0.035)
      return
    }
    if (frog.away <= 0 && dist(wx, wy, frog.x, frog.y - 14) < 60) {
      // The frog goes in with a plop and climbs back out in a while.
      frog.away = 4.5
      frog.hop = 1
      ripple(frog.x + 60, FROG_STONE.y + 14, 50)
      ripple(frog.x + 60, FROG_STONE.y + 14, 26, 0.8)
      drops(frog.x + 60 - camX, FROG_STONE.y + 10 - camY, 6, 150)
      snd.plop()
      return
    }
    for (let i = 0; i < STEP_STONES.length; i++) {
      const st = STEP_STONES[i]!
      if (dist(wx, wy, st.x, st.y - 14) < 52) {
        stoneDip[i]!.kick(2.4)
        ripple(st.x, st.y + 4, 46)
        snd.stone()
        return
      }
    }
    if ((kf.state === 'perch' || kf.state === 'ride') && dist(wx, wy, kf.x, kf.y - 16) < 50) {
      snd.bird()
      return
    }
    if (dist(wx, wy, REEDS.x + 66, REEDS.y - 110) < 120) {
      reedSway.kick(wx < REEDS.x + 66 ? 2 : -2)
      snd.leaf()
      return
    }
    if (v && phase !== 'pond') {
      // A poke at the water near the boat pushes it away from the finger.
      const by = v.y + v.level * DROP
      const d = dist(wx, wy, v.x, by)
      if (d < 260 && wy > farEdge(wx)) {
        const f = 1 - d / 260
        v.push = clamp(v.push + (v.x - wx) * 0.24 * f, -30, 80)
        v.off += (by - wy) * 0.4 * f
        if (v.snag && f > 0.25) freeSnag()
      }
    }
    touchNothing(p, wx, wy)
  }

  const move = (p: Pointer) => {
    lastTouch = stage.time
    const wx = p.x + camX
    const wy = p.y + camY
    const h = held.get(p.id)
    if (h) {
      h.moved += Math.abs(p.dx) + Math.abs(p.dy)
      if (h.sun) {
        sunLift = clamp(h.dy - p.y, 0, 200)
        sunGlow.value = Math.max(sunGlow.value, 0.8)
        if (sunLift > 150) {
          held.delete(p.id)
          beginDawn()
        }
      }
      return
    }
    const v = voyage
    if (!v || phase === 'pond' || phase === 'dawn' || phase === 'bank') {
      // Trailing a finger through water leaves a line of ripples.
      if (wy > farEdge(wx) + 4 && wy < nearEdge(wx) - 2 && Math.abs(p.dx) + Math.abs(p.dy) > 3 && Math.random() < 0.3) {
        ripple(wx, wy, 20, 0.7)
        snd.swish()
      }
      return
    }
    // On the brook: a stroke is a breath of wind and a stir of the water.
    const by = v.y + v.level * DROP
    const d = dist(wx, wy, v.x, by - 60)
    const amount = Math.abs(p.dx) + Math.abs(p.dy)
    if (amount < 1.5) return
    const inWater = wy > farEdge(wx) + 4 && wy < nearEdge(wx) - 2
    if (d < 380) {
      const f = 1 - d / 380
      const area = v.boat.look.sail?.area ?? 0
      v.push = clamp(v.push + clamp(p.dx, -24, 50) * f * (0.4 + 1.3 * area) * 0.4, -30, 60 + 30 * area)
      v.off += p.dy * f * 0.5
      v.gust = Math.min(1, v.gust + Math.abs(p.dx) * 0.012 * f * (area > 0 ? 1 : 0.2))
      if (v.snag && amount * f > 5) freeSnag()
    }
    if (inWater) {
      if (Math.random() < 0.35) ripple(wx, wy, 20, 0.7)
      snd.swish()
    } else if (Math.random() < 0.4) {
      wisps.push({ x: wx, y: wy, vx: clamp(p.dx * 16, -260, 260), t: 0, life: 0.8, curl: Math.random() * 3 })
      snd.wind()
    }
  }

  const releasePiece = (pc: Piece) => {
    pc.lift.target = 0
    // Where the piece is, for deciding what it was put on: a twig counts
    // from its middle as well as its foot.
    const len = pc.kind === 'mast' ? P.masts[pc.type]!.len : 0
    const mx = pc.x + Math.sin(pc.rot) * len * 0.5
    const my = pc.y - Math.cos(pc.rot) * len * 0.5
    const near = (b: Boat, x: number, y: number): number => {
      const tall = b.mast ? mastDef(b.mast)!.len + 60 : 120
      const dx = Math.abs(x - b.x) / (b.hull.halfW + 50)
      const dy = y > b.y ? (y - b.y) / 60 : (b.y - y) / (tall + 40)
      return Math.max(dx, dy)
    }
    const best = { boat: null as Boat | null, d: 1 }
    for (const b of boats) {
      if (b.gone) continue
      const d = Math.min(near(b, pc.x, pc.y), near(b, mx, my))
      if (d < best.d) {
        best.d = d
        best.boat = b
      }
    }
    const target = best.boat
    if (target && attach(pc, target, pc.x)) return
    if (target) {
      // No place for it there: it slides off and rests beside the boat.
      setDown(pc, target.x + (pc.x < target.x ? -1 : 1) * (target.hull.halfW + 46 + Math.random() * 36), target.y + 8 + Math.random() * 40)
      return
    }
    const footY = pc.kind === 'sail' ? pc.y + 10 : pc.y
    if (onBank(pc.x, footY)) {
      // It rests where it was put.
      pc.restRot = pc.kind === 'mast' ? 1.5 + (Math.random() - 0.5) * 0.3 : pc.kind === 'sail' ? (Math.random() - 0.5) * 1.6 : (Math.random() - 0.5) * 0.4
      pc.x = clamp(pc.x, 44, pc.kind === 'mast' ? 960 : 1140)
      pc.y = bankY(pc.x, pc.y, pc.kind === 'cargo' ? 26 : 40)
      pc.wob.kick(2)
      if (pc.kind === 'mast') snd.wood(0.9)
      else if (pc.kind === 'sail') snd.leaf()
      else snd.moss()
      return
    }
    // Over the water or the far bank: the brook hands it back to the bank.
    if (pc.y > farEdge(pc.x) && pc.y < nearEdge(pc.x)) {
      ripple(pc.x, pc.y, 34)
      snd.drip(0.06)
    }
    setDown(pc, pc.x, nearEdge(clamp(pc.x, 44, 1140)) + 60)
  }

  // A tap on a part of a boat takes it off: it hops down beside the hull,
  // to be put back, or changed for another.
  const takeOff = (part: Piece, b: Boat) => {
    const side = part.kind === 'mast' ? -1 : 1
    detach(part)
    setDown(part, b.x + side * (b.hull.halfW + 50 + Math.random() * 36), b.y + 8 + Math.random() * 38)
    b.sway.kick(side * 1.2)
    if (part.kind === 'mast') snd.wood(1.1)
    else if (part.kind === 'sail') snd.leaf()
    else if (part.type === 'acorn') snd.shell()
    else snd.berry()
  }

  const releaseBoat = (b: Boat, quiet = false) => {
    b.lift.target = 0
    if (!b.stood) {
      b.stood = true
      b.restRot = 0
    }
    if (phase === 'bank' && b.y - 6 < nearEdge(b.x) && b.x > 20) {
      launch(b)
      return
    }
    // On the bank: onto the flat stone if it is near and free, else where it is.
    if (dist(b.x, b.y, STONE.x, STONE.y) < 190 && stoneFree(b)) {
      b.glideX = STONE.x
      b.glideY = STONE.y
      b.gliding = true
      if (!quiet) {
        snd.stone()
        snd.chime(-7, 0.045, 0.04)
      }
    } else {
      b.x = clamp(b.x, 60, 1140)
      b.y = bankY(b.x, b.y, 44)
      if (!quiet) {
        snd.moss()
        if (b.hull.spins) snd.shell()
        else snd.wood(0.7)
      }
    }
    if (!quiet) {
      b.dip.value = 0.86
      b.sway.kick(1.2)
    }
    callGnome(b)
  }

  const up = (p: Pointer) => {
    const h = held.get(p.id)
    if (!h) return
    held.delete(p.id)
    if (h.sun) {
      if (sunLift > 70) beginDawn()
      return
    }
    if (h.piece) {
      releasePiece(h.piece)
    } else if (h.boat) {
      const tapped = h.part && h.part.on === h.boat && h.moved < 16 && stage.time - h.at < 0.45
      if (tapped && h.part) takeOff(h.part, h.boat)
      releaseBoat(h.boat, !!tapped)
    }
  }

  // ------------------------------------------------------------ update

  const updateHeld = (dt: number) => {
    for (const [id, h] of held) {
      const p = stage.pointers.get(id)
      if (!p) continue
      const wx = p.x + camX
      const wy = p.y + camY
      if (h.piece) {
        const pc = h.piece
        const want = pc.kind === 'mast' ? 0.16 : 0
        pc.rot = damp(pc.rot, want + clamp(p.vx * 0.0004, -0.3, 0.3), 9, dt)
        if (pc.kind === 'mast') {
          // A twig turns upright in the hand, about the place it is held.
          pc.x = damp(pc.x, wx - Math.sin(pc.rot) * h.along, 24, dt)
          pc.y = damp(pc.y, wy + Math.cos(pc.rot) * h.along - 18 * pc.lift.value, 24, dt)
        } else {
          pc.x = damp(pc.x, wx + h.dx, 24, dt)
          pc.y = damp(pc.y, wy + h.dy - 18 * pc.lift.value, 24, dt)
        }
      } else if (h.boat) {
        const b = h.boat
        const px = b.x
        b.x = damp(b.x, wx + h.dx, 22, dt)
        b.y = damp(b.y, wy + h.dy - 14 * b.lift.value, 22, dt)
        b.rot = damp(b.rot, clamp((b.x - px) * 0.012, -0.16, 0.16), 8, dt)
        // Held over the brook, the water stirs under it: this is where it goes.
        if (phase === 'bank' && b.y - 6 < nearEdge(b.x)) {
          overWater -= dt
          if (overWater <= 0) {
            overWater = 0.45
            ripple(b.x, clamp(b.y, farEdge(b.x) + 28, nearEdge(b.x) - 10), 50, 1)
            snd.drip(0.03)
          }
        }
      }
    }
  }

  const updateHint = (dt: number) => {
    hint.t = Math.min(1, hint.t + dt / 0.9)
    if (phase !== 'bank' || held.size > 0 || stage.time - lastTouch < 6 || boats.some((b) => !b.gone && b.gnome)) {
      hint.at = 0
      return
    }
    hint.at -= dt
    if (hint.at > 0) return
    hint.at = 4.2
    const waiting = boats.filter((b) => !b.gone && !b.stood)
    const b = waiting[Math.floor(Math.random() * waiting.length)]
    if (!b) return
    hint.boat = b
    hint.t = 0
    b.sway.kick(1.3)
    b.dip.value = 1.05
  }

  const updateBank = (dt: number) => {
    for (const pc of pieces) {
      pc.lift.update(dt)
      pc.wob.update(dt)
      if (pc.on) continue
      if (pc.gliding) {
        pc.x = damp(pc.x, pc.glideX, 7, dt)
        pc.y = damp(pc.y, pc.glideY, 7, dt)
        if (dist(pc.x, pc.y, pc.glideX, pc.glideY) < 1.5) {
          pc.gliding = false
          pc.wob.kick(2)
          if (pc.kind === 'sail') snd.leaf()
          else snd.moss()
        }
      }
      let isHeld = false
      for (const h of held.values()) if (h.piece === pc) isHeld = true
      if (!isHeld) pc.rot = damp(pc.rot, pc.restRot, 8, dt)
    }
    for (const b of boats) {
      b.lift.update(dt)
      b.dip.update(dt)
      b.sway.update(dt)
      if (b.gone) continue
      b.billow.update(dt)
      b.billow.target = 0.12
      if (b.gliding) {
        b.x = damp(b.x, b.glideX, 8, dt)
        b.y = damp(b.y, b.glideY, 8, dt)
        if (dist(b.x, b.y, b.glideX, b.glideY) < 1.2) {
          b.gliding = false
          b.x = b.glideX
          b.y = b.glideY
        }
      }
      let isHeld = false
      for (const h of held.values()) if (h.boat === b) isHeld = true
      if (!isHeld) b.rot = damp(b.rot, b.restRot, 9, dt)
    }
  }

  const updateGnome = (dt: number) => {
    gnome.bob.update(dt)
    if (gnome.state === 'walk') {
      const b = gnome.boat
      if (!b || b.gone) {
        gnome.state = 'home'
        return
      }
      let carried = false
      for (const h of held.values()) if (h.boat === b) carried = true
      if (carried || b.gliding) return
      // Walk to the stern of the boat, then hop in.
      const tx = b.x - b.hull.halfW - 16
      const ty = Math.max(b.y + 4, nearEdge(gnome.x) + 30)
      const d = dist(gnome.x, gnome.y, tx, ty)
      if (d > 5) {
        const sp = Math.min(d, 150 * dt)
        gnome.face = tx >= gnome.x ? 1 : -1
        gnome.x += ((tx - gnome.x) / d) * sp
        gnome.y += ((ty - gnome.y) / d) * sp
        gnome.stepAt -= dt
        if (gnome.stepAt <= 0) {
          gnome.stepAt = 0.16
          gnome.bob.kick(-55)
          snd.step()
        }
      } else {
        hopTo(b.x + b.hull.seatX, b.y + b.hull.deckY + 2, () => board(b))
      }
    } else if (gnome.state === 'hop') {
      // Follow a moving seat.
      const b = gnome.boat
      const v = voyage
      if (v && b === v.boat && !b.gnome && phase !== 'moor' && phase !== 'pond') {
        gnome.toX = v.x + b.hull.seatX
        gnome.toY = v.y + v.level * DROP + b.hull.deckY
      }
      gnome.hopT = Math.min(1, gnome.hopT + dt / 0.46)
      const t = gnome.hopT
      gnome.x = lerp(gnome.fromX, gnome.toX, t)
      gnome.y = lerp(gnome.fromY, gnome.toY, t) - Math.sin(t * Math.PI) * (36 + dist(gnome.fromX, gnome.fromY, gnome.toX, gnome.toY) * 0.16)
      if (t >= 1) {
        const then = gnome.then
        gnome.then = null
        gnome.state = 'home'
        then?.()
      }
    }
  }

  const updateSky = (dt: number) => {
    sunGlow.update(dt)
    // Butterflies wander near the view; fireflies drift over the pond.
    for (const f of fliers) {
      f.t -= dt
      if (f.t <= 0 || f.x < camX - 80 || f.x > camX + W + 120) {
        f.t = 1.6 + Math.random() * 2.6
        f.tx = camX + 80 + Math.random() * (W - 160)
        f.ty = 290 + camY + Math.random() * 130
      }
      f.x = damp(f.x, f.tx, 0.9, dt)
      f.y = damp(f.y, f.ty, 0.9, dt)
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]!
      r.t += dt
      if (r.t >= r.life) ripples.splice(i, 1)
    }
    for (let i = wisps.length - 1; i >= 0; i--) {
      const w = wisps[i]!
      w.t += dt
      w.x += w.vx * dt
      if (w.t >= w.life) wisps.splice(i, 1)
    }
    while (wisps.length > 26) wisps.shift()
  }

  // The brook is never quite silent, and the evening has crickets and a
  // few slow notes; all of it sparse.
  const updateAmbient = (dt: number) => {
    brookAt -= dt
    if (brookAt <= 0) {
      const d = duskAt(camX + W / 2)
      brookAt = 0.5 + Math.random() * 1.3 + d * 1.2
      snd.drip(0.02 + Math.random() * 0.02)
      // Nearer the fall the water is louder.
      const near = 1 - clamp(Math.abs(camX + 500 - (LIP_FAR.x + LIP_NEAR.x) / 2) / 700, 0, 1)
      if (near > 0.05) {
        sfx.noise({ dur: 0.9, vol: 0.05 * near, freq: 900, to: 600, filter: 'lowpass' })
        brookAt = 0.5
      }
    }
    const dusk = duskAt(camX + W / 2)
    if (dusk > 0.7) {
      cricketAt -= dt
      if (cricketAt <= 0) {
        cricketAt = 2.4 + Math.random() * 3.6
        for (let i = 0; i < 3; i++) sfx.tone({ freq: 4100, dur: 0.035, type: 'sine', vol: 0.012, delay: i * 0.07 })
      }
    }
    if (phase === 'pond') {
      tuneAt -= dt
      if (tuneAt <= 0) {
        tuneAt = 3.6 + Math.random() * 3.4
        const step = [-5, -3, -2, 0, 2][Math.floor(Math.random() * 5)]!
        snd.chime(step, 0.045)
      }
    }
  }

  const update = (dt: number) => {
    // The rest of the sheet, and the cut-outs met downstream, are painted in
    // the background: briskly in the first moments while the child is still
    // looking, then a little each frame, and not at all while a finger is
    // down, so that a drag is never made to stutter.
    if (!done) {
      const budget = stage.time < 2 ? 12 : stage.pointers.size > 0 ? 0 : 6
      const until = performance.now() + budget
      while (warm.length > 0 && performance.now() < until) warm.pop()?.()
      if (warm.length === 0 && painting && performance.now() < until) painting = scroll.work(until - performance.now())
      if (warm.length === 0 && !painting) {
        done = true
        box.done()
      }
    }

    updateHeld(dt)
    updateBank(dt)
    updateHint(dt)
    updateGnome(dt)
    updateVoyage(dt)
    updateWay(dt)
    updateSky(dt)
    updateAmbient(dt)
    for (const pad of pads) pad.dip.update(dt)
    for (const m of fleet) {
      m.bobT += dt
      m.nudge.update(dt)
    }

    // The view follows the boat downstream and sinks with the brook.
    const v = voyage
    if (v && phase !== 'bank') {
      const want = clamp(v.x - 430, 0, LEN - W)
      camX = Math.max(camX, damp(camX, want, 2.6, dt))
      camY = sinkAt(camX + 430)
    }

    if (phase === 'pond') {
      let lifting = false
      for (const h of held.values()) if (h.sun) lifting = true
      if (!lifting) sunLift = damp(sunLift, 0, 3, dt)
    } else if (phase === 'dawn') {
      // The sun goes up, the morning mist comes over, and clears on the bank.
      dawnT += dt
      if (dawnT < 1.9) {
        // Up to where the morning sun stands, so it is there when the mist clears.
        sunLift = damp(sunLift, ridge(camX + 905) - camY + 4 - 112, 3.2, dt)
        mist = ease.inOutQuad(clamp(dawnT / 1.8, 0, 1))
      } else {
        if (voyage) {
          newMorning()
          phase = 'dawn'
        }
        mist = 1 - ease.inOutQuad(clamp((dawnT - 1.9) / 2, 0, 1))
        if (dawnT >= 3.9) {
          mist = 0
          phase = 'bank'
          lastTouch = stage.time
        }
      }
    }
  }

  // ------------------------------------------------------------ draw

  const pose: Pose = { x: 0, y: 0, rot: 0, yaw: 0, dusk: 0, mastT: 1, sailT: 1, billow: 0, flutter: 0, squash: 1, gnome: false, gnomeBob: 0, lamp: 0, waterY: null }

  interface Item {
    y: number
    draw: (g: G) => void
  }
  const items: Item[] = []

  const drawGlints = (g: G) => {
    // Light moving on the water: short pale strokes that drift downstream
    // and fade in and out, each in its own stretch of the brook.
    const t = stage.time
    const first = Math.floor((camX - 60) / 74)
    const last = Math.floor((camX + W + 60) / 74)
    g.lineCap = 'round'
    g.strokeStyle = '#fbf6ea'
    for (let i = first; i <= last; i++) {
      const h = Math.sin(i * 127.1) * 43758.5453
      const r1 = h - Math.floor(h)
      const h2 = Math.sin(i * 269.5) * 18397.37
      const r2 = h2 - Math.floor(h2)
      const still = sstep(4250, 4500, i * 74)
      const ph = (t * (0.16 - still * 0.1) + r1 * 5) % 1
      const x = i * 74 + ph * 74 + r2 * 30
      if (x > LIP_NEAR.x - 20 && x < LIP_FAR.x + 60) continue
      const fy = farEdge(x)
      const ny = nearEdge(x)
      const y = fy + 18 + r2 * (ny - fy - 36)
      const a = Math.sin(ph * Math.PI) * (0.5 + 0.3 * Math.sin(t * 2 + i))
      if (a <= 0.03) continue
      const len = 12 + r1 * 22
      g.globalAlpha = a * 0.8
      g.lineWidth = 2 + r1 * 1.4
      g.beginPath()
      g.moveTo(x - camX, y - camY)
      g.quadraticCurveTo(x - camX + len * 0.5, y - camY - 2.2, x - camX + len, y - camY)
      g.stroke()
    }
    g.globalAlpha = 1
  }

  const drawRipples = (g: G) => {
    g.lineCap = 'round'
    for (const r of ripples) {
      const k = r.t / r.life
      const rad = r.r * (0.25 + 0.75 * ease.outCubic(k))
      const a = (1 - k) * (1 - k)
      const x = r.x - camX
      const y = r.y - camY
      g.globalAlpha = a * 0.85
      g.strokeStyle = '#fbf6ea'
      g.lineWidth = 2.4
      g.beginPath()
      g.ellipse(x, y, rad, rad * 0.34, 0, 0, TAU)
      g.stroke()
      g.globalAlpha = a * 0.4
      g.strokeStyle = '#4f86a8'
      g.lineWidth = 1.2
      g.beginPath()
      g.ellipse(x, y + 1.5, rad * 0.98, rad * 0.33, 0, 0.2, Math.PI - 0.2)
      g.stroke()
    }
    g.globalAlpha = 1
  }

  const drawFall = (g: G) => {
    // The veil keeps falling: pale strokes sliding down the painted face.
    const mid = (LIP_FAR.x + LIP_NEAR.x) / 2
    if (mid < camX - 260 || mid > camX + W + 260) return
    const t = stage.time
    g.lineCap = 'round'
    g.strokeStyle = '#fbf6ea'
    for (let i = 0; i < 16; i++) {
      const u = (i + 0.5) / 16 + Math.sin(i * 7.3) * 0.024
      const ph = (t * (0.7 + (i % 5) * 0.13) + i * 0.37) % 1
      const len = 16 + ((i * 13) % 5) * 7
      const x = lerp(LIP_FAR.x, LIP_NEAR.x, u) - camX + 4 * ph
      const y = lerp(LIP_FAR.y, LIP_NEAR.y, u) - camY + ph * ph * (DROP - len)
      g.globalAlpha = 0.6 * Math.sin(ph * Math.PI)
      g.lineWidth = 2 + (i % 3)
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + 1.5, y + len)
      g.stroke()
    }
    // Foam breathing at the foot.
    for (let i = 0; i < 7; i++) {
      const u = (i + 0.5) / 7
      const x = lerp(LIP_FAR.x, LIP_NEAR.x, u) - camX + 26
      const y = lerp(LIP_FAR.y, LIP_NEAR.y, u) - camY + DROP + 2
      const s = 0.7 + 0.3 * Math.sin(t * 2.2 + i * 1.9)
      g.globalAlpha = 0.5
      g.fillStyle = '#fbf6ea'
      g.beginPath()
      g.ellipse(x, y, 18 * s, 6 * s, 0, 0, TAU)
      g.fill()
    }
    g.globalAlpha = 1
  }

  const lap = (g: G, x: number, y: number, half: number, bob: number) => {
    // Where the hull meets the water: a soft shade and a pale lapping line.
    g.lineCap = 'round'
    g.globalAlpha = 0.24
    g.strokeStyle = '#3f6f92'
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(x - half * 0.8, y + 4)
    g.quadraticCurveTo(x, y + 9 + bob, x + half * 0.82, y + 4)
    g.stroke()
    g.globalAlpha = 0.7
    g.strokeStyle = '#f4f3ee'
    g.lineWidth = 1.8
    g.beginPath()
    g.moveTo(x - half * 0.92, y + 0.5)
    g.quadraticCurveTo(x - half * 0.5, y + 3.4 - bob * 0.4, x - half * 0.1, y + 1.2)
    g.moveTo(x + half * 0.08, y + 1.6)
    g.quadraticCurveTo(x + half * 0.5, y - 0.6 + bob * 0.4, x + half * 0.94, y + 1)
    g.stroke()
    g.globalAlpha = 1
  }

  const glowAt = (g: G, x: number, y: number, size: number, a: number) => {
    if (a <= 0.01) return
    g.globalAlpha = a
    g.drawImage(P.glow, x - size / 2, y - size / 2, size, size)
    g.globalAlpha = 1
  }

  const drawGnomeStanding = (g: G, x: number, y: number, face: number, dusk: number, sit: boolean) => {
    const sq = 1 + gnome.bob.value * 0.004
    drawSprite(g, sit ? P.gnomeSit : P.gnomeStand, x, y + gnome.bob.value * 0.12, 0, GNOME * face, GNOME * sq, dusk)
  }

  const drawSun = (g: G, behindHills: boolean, alpha = 1) => {
    const t = stage.time
    const sun = sunAt()
    // Left alone at the pond, the sun stirs a little on the hill: it can be lifted.
    const idle = phase === 'pond' && t - lastTouch > 8 && sunLift < 1 ? 0.5 + 0.5 * Math.sin(t * 1.2) : 0
    const y = sun.y - idle * 7
    g.save()
    if (behindHills) {
      g.beginPath()
      g.moveTo(sun.x - 130, -10)
      g.lineTo(sun.x + 130, -10)
      for (let sx = sun.x + 130; sx >= sun.x - 130; sx -= 26) g.lineTo(sx, ridge(camX + sx) - camY + 2)
      g.closePath()
      g.clip()
    }
    glowAt(g, sun.x, y, 300 + sunGlow.value * 60 + idle * 40, alpha * (0.25 + sunGlow.value * 0.3 + idle * 0.3))
    const turn = Math.sin(t * 0.25) * 0.05
    const sz = 1 + sunGlow.value * 0.05
    // The evening sun is the same sun, redder; lifted, it yellows again.
    const low = sun.k * (1 - clamp(sunLift / 110, 0, 1))
    g.globalAlpha = alpha
    if (low < 0.99) drawSprite(g, P.sun, sun.x, y, turn, sz, sz, 0)
    if (low > 0.01) {
      g.globalAlpha = alpha * low
      drawSprite(g, P.sunLow, sun.x, y, turn, sz, sz, 0)
    }
    g.restore()
    g.globalAlpha = 1
  }

  const draw = (g: G) => {
    const t = stage.time
    scroll.draw(g, Math.round(camX), Math.round(camY))

    drawSun(g, true)

    drawGlints(g)
    drawFall(g)
    drawRipples(g)

    // Everything that stands in the picture, back to front.
    items.length = 0
    const vis = (x: number, pad = 200) => x > camX - pad && x < camX + W + pad

    if (vis(FROG_STONE.x)) {
      items.push({
        y: FROG_STONE.y,
        draw: () => {
          const d = duskAt(FROG_STONE.x)
          drawSprite(g, P.stones[0]!, FROG_STONE.x - camX, FROG_STONE.y - camY, 0, 1, 1, d)
          if (frog.away <= 0 || frog.hop > 0) {
            const v = voyage
            const face = v && v.x < frog.x - 30 ? -1 : 1
            const hp = frog.hop > 0 ? 1 - frog.hop : 0
            const sq = frog.squat.value
            drawSprite(g, P.frog, frog.x - camX + hp * 60, frog.y - camY - Math.sin(hp * Math.PI) * 40 + hp * 30, hp * 0.6, face * (2 - sq), sq * (1 + 0.02 * Math.sin(t * 2.4)), d)
          }
        },
      })
    }
    if (vis(REEDS.x + 70, 320)) {
      const d = duskAt(REEDS.x)
      const sway = reedSway.value * 0.05 + Math.sin(t * 0.8) * 0.012
      items.push({ y: REEDS.y - 34, draw: () => drawSprite(g, P.reeds[1]!, REEDS.x + 128 - camX, REEDS.y - 30 - camY, -sway * 0.7, 0.86, 0.9, d) })
      items.push({ y: REEDS.y - 24, draw: () => drawSprite(g, P.reeds[1]!, REEDS.x + 10 - camX, REEDS.y - 22 - camY, sway * 0.8, 0.9, 0.9, d) })
      items.push({ y: REEDS.y - 6, draw: () => drawSprite(g, P.reeds[0]!, REEDS.x + 66 - camX, REEDS.y - 4 - camY, sway, 1, 1, d) })
    }
    STEP_STONES.forEach((s, i) => {
      if (!vis(s.x)) return
      const d = duskAt(s.x)
      items.push({ y: s.y, draw: () => drawSprite(g, P.stones[i % 4]!, s.x - camX, s.y - camY + stoneDip[i]!.value * 2, stoneDip[i]!.value * 0.02, 1, 1, d) })
    })
    if (camX > 3000) {
      for (const pad of pads) {
        if (!vis(pad.x)) continue
        items.push({
          y: pad.y - 30,
          draw: () => {
            const dip = pad.dip.value
            drawSprite(g, pad.flower ? P.lilyFlower : P.lily, pad.x - camX, pad.y - camY + dip * 1.6 + Math.sin(t * 0.9 + pad.ph) * 1.2, dip * 0.02, 1, 1 - Math.abs(dip) * 0.03, 1)
          },
        })
      }
      for (const m of fleet) {
        const s = SLOTS[m.slot]!
        if (!vis(s.x, 300)) continue
        items.push({
          y: s.y,
          draw: () => {
            const bob = Math.sin(m.bobT * 1.1) * m.look.hull.bob * 0.4
            pose.x = s.x - camX
            pose.y = s.y - camY + m.look.hull.draft + bob
            pose.rot = Math.sin(m.bobT * 0.8) * m.look.hull.roll * 0.5 + m.nudge.value * 0.12
            pose.yaw = 0
            pose.dusk = 1
            pose.mastT = 1
            pose.sailT = 1
            pose.billow = 0.1 + 0.05 * Math.sin(m.bobT)
            pose.flutter = Math.sin(m.bobT * 2.3) * 0.012 * (m.look.sail?.flutter ?? 0)
            pose.squash = 1
            pose.gnome = false
            pose.lamp = 1
            pose.waterY = s.y - camY + 2
            drawBoat(g, P, m.look, pose)
            lap(g, s.x - camX, s.y - camY, m.look.hull.halfW, bob)
          },
        })
      }
    }

    // The makings and the boats on the bank.
    if (camX < 1300) {
      for (const b of boats) {
        if (b.gone) continue
        items.push({
          y: b.y + b.lift.value * 60,
          draw: () => {
            const lift = b.lift.value
            const x = b.x - camX
            const y = b.y - camY
            g.globalAlpha = 0.8 - lift * 0.3
            drawSprite(g, P.shadow, x + 6 + lift * 10, y + 4 + lift * 22, 0, (b.hull.halfW / 46) * (1 + lift * 0.1), 1.2, 0)
            g.globalAlpha = 1
            pose.x = x
            pose.y = y
            pose.rot = b.rot + b.sway.value * 0.03
            pose.yaw = 0
            pose.dusk = 0
            pose.mastT = b.mastT
            pose.sailT = b.sailT
            pose.billow = b.billow.value
            pose.flutter = Math.sin(t * 2.6 + b.x) * 0.014 * (b.look.sail?.flutter ?? 0) + b.sway.value * 0.02
            pose.squash = b.dip.value
            pose.gnome = b.gnome
            pose.gnomeBob = gnome.bob.value * 0.1
            pose.lamp = 0
            pose.waterY = null
            drawBoat(g, P, b.look, pose)
          },
        })
      }
      for (const pc of pieces) {
        if (pc.on) continue
        const flat = pc.kind === 'mast' ? pc.y : pc.y + (pc.kind === 'sail' ? 10 : 0)
        items.push({
          y: flat + pc.lift.value * 80,
          draw: () => {
            const lift = pc.lift.value
            const x = pc.x - camX
            const y = pc.y - camY
            const sc = 1 + lift * 0.08
            const rot = pc.rot + pc.wob.value * 0.04
            g.globalAlpha = 0.75 - lift * 0.3
            if (pc.kind === 'mast') {
              const len = P.masts[pc.type]!.len
              drawSprite(g, P.shadow, x + Math.sin(rot) * len * 0.5 + 4 + lift * 8, y - Math.cos(rot) * len * 0.5 + 7 + lift * 20, rot - Math.PI / 2, len / 100, 0.5, 0)
            } else if (pc.kind === 'sail') {
              const d = P.sails[pc.type]!
              drawSprite(g, P.shadow, x + 5 + lift * 8, y + 8 + lift * 22, rot + Math.PI / 2, d.h / 110, (d.w / 50) * 0.7, 0)
            } else {
              drawSprite(g, P.shadow, x + 3 + lift * 6, y + 1 + lift * 18, 0, 0.42, 0.7, 0)
            }
            g.globalAlpha = 1
            drawSprite(g, pc.sprite, x, y, rot, sc, sc, 0)
          },
        })
      }
    }

    // The boat on the brook.
    const v = voyage
    if (v) {
      const b = v.boat
      const wy = v.y + v.level * DROP
      items.push({
        y: wy,
        draw: () => {
          const calm = phase === 'pond' ? 0.4 : 1
          const steady = 1 / (1 + b.look.cargo.length * 0.22)
          const bob = Math.sin(v.bobT * 2.1) * b.hull.bob * steady * calm
          const x = v.x - camX
          const y = wy - camY
          const inAir = v.falling >= 0
          pose.x = x
          pose.y = y + b.hull.draft + bob
          pose.rot = Math.sin(v.bobT * 1.4 + 1) * b.hull.roll * steady * calm + v.roll.value * 0.16 + (b.look.sail ? clamp(v.vx / 900, 0, 0.09) * (b.look.sail.area + 0.3) : 0)
          pose.yaw = v.yaw
          pose.dusk = duskAt(v.x)
          pose.mastT = 1
          pose.sailT = 1
          pose.billow = b.billow.value
          pose.flutter = Math.sin(v.bobT * 9) * 0.02 * (b.look.sail?.flutter ?? 0) * (0.4 + v.gust)
          pose.squash = b.dip.value
          pose.gnome = b.gnome
          pose.gnomeBob = gnome.bob.value * 0.1
          pose.lamp = v.lamp
          pose.waterY = inAir ? null : y + 2
          drawBoat(g, P, b.look, pose)
          if (!inAir) lap(g, x, y, b.hull.halfW, bob)
          // A waiting boat's own ripples lean toward open water.
          if (v.snag && !v.freed && t - lastTouch > 5) {
            const k = (t * 0.7) % 1
            g.globalAlpha = (1 - k) * 0.7
            g.strokeStyle = '#fbf6ea'
            g.lineWidth = 2.2
            g.beginPath()
            g.ellipse(x, y - 30 - k * 46, 30 + k * 30, 9 + k * 8, 0, Math.PI * 1.1, Math.PI * 1.9)
            g.stroke()
            g.globalAlpha = 1
          }
        },
      })
    }

    // The water sprite, up to her shoulders in the brook.
    if (nixie.state !== 'under') {
      items.push({
        y: nixie.y - 4,
        draw: () => {
          const rise = nixie.state === 'rise' ? ease.outCubic(clamp(nixie.t / 1.1, 0, 1)) : nixie.state === 'sink' ? 1 - ease.inQuad(clamp(nixie.t / 1.2, 0, 1)) : 1
          const lean = nixie.state === 'push' ? Math.sin(clamp(nixie.t / 0.5, 0, 1) * Math.PI) * 0.16 : 0
          const x = nixie.x - camX
          const y = nixie.y - camY
          g.save()
          g.beginPath()
          g.rect(x - 140, y - 220, 280, 221)
          g.clip()
          g.globalAlpha = 0.5 + 0.42 * rise
          drawSprite(g, P.waterSprite, x, y + (1 - rise) * 130 + Math.sin(t * 2) * 2, lean, 0.92, 0.92, duskAt(nixie.x))
          g.restore()
          g.globalAlpha = 1
          lap(g, x, y, 54, Math.sin(t * 2) * 2)
        },
      })
    }

    // The gnome on his own feet.
    if (gnome.state === 'home' || gnome.state === 'walk' || gnome.state === 'hop' || gnome.state === 'pad') {
      if (vis(gnome.x)) {
        items.push({
          y: gnome.state === 'hop' ? Math.max(gnome.fromY, gnome.toY) + 40 : gnome.y,
          draw: () => {
            const d = duskAt(gnome.x)
            const breathe = gnome.state === 'home' || gnome.state === 'pad' ? Math.sin(t * 1.6) * 0.7 : 0
            if (gnome.state !== 'hop' && gnome.state !== 'pad') {
              g.globalAlpha = 0.6
              drawSprite(g, P.shadow, gnome.x - camX + 2, gnome.y - camY + 1, 0, 0.36, 0.6, 0)
              g.globalAlpha = 1
            }
            drawGnomeStanding(g, gnome.x - camX, gnome.y - camY + breathe, gnome.face, d, gnome.state === 'pad')
          },
        })
      }
    }

    items.sort((a, b) => a.y - b.y)
    for (const it of items) it.draw(g)

    // Lamp light on the pond.
    if (camX > 3000) {
      const flick = 0.88 + 0.08 * Math.sin(t * 7.3) + 0.04 * Math.sin(t * 13.1)
      for (const m of fleet) {
        const s = SLOTS[m.slot]!
        const lp = lampPoint(m.look)
        glowAt(g, s.x + lp.x - camX, s.y + m.look.hull.draft + lp.y - camY + (lp.kind === 'cap' ? -6 : 12), 190, 0.85 * flick)
        glowAt(g, s.x + lp.x - camX, s.y - camY + 18, 170, 0.26 * flick)
      }
      if (v && v.lamp > 0) {
        const lp = lampPoint(v.boat.look)
        const wy = v.y + v.level * DROP
        glowAt(g, v.x + lp.x - camX, wy + v.boat.hull.draft + lp.y - camY + (lp.kind === 'cap' ? -6 : 12), 190 * (0.6 + 0.4 * v.lamp), 0.85 * flick * v.lamp)
        glowAt(g, v.x + lp.x - camX, wy - camY + 18, 170, 0.26 * flick * v.lamp)
      }
      // Fireflies.
      const dusk = duskAt(camX + W / 2)
      if (dusk > 0.5) {
        for (const f of flies) {
          const fxp = f.x + Math.sin(t * 0.31 + f.ph) * 60 + Math.sin(t * 0.83 + f.ph * 2) * 16
          const fyp = f.y + Math.cos(t * 0.27 + f.ph * 1.3) * 34
          const a = (0.5 + 0.5 * Math.sin(t * 1.3 + f.ph * 3)) * (dusk - 0.5) * 2
          if (a > 0.05 && vis(fxp, 20)) {
            g.globalAlpha = a
            g.drawImage(P.spark, fxp - camX - 9, fyp - camY - 9, 18, 18)
          }
        }
        g.globalAlpha = 1
      }
    }

    // What flies.
    for (const f of fliers) {
      if (!vis(f.x, 40)) continue
      const flap = Math.abs(Math.sin(t * 9 + f.t))
      const d = duskAt(f.x)
      const fx0 = f.x - camX
      const fy0 = f.y - camY + Math.sin(t * 5 + f.x * 0.01) * 5
      drawSprite(g, f.sprite, fx0, fy0, 0.3, 0.25 + flap * 0.75, 1, d)
      drawSprite(g, f.sprite, fx0, fy0, -0.3, -(0.25 + flap * 0.75), 1, d)
    }
    if (vis(dragon.x, 40)) drawSprite(g, P.dragonfly, dragon.x - camX, dragon.y - camY + Math.sin(t * 30) * 0.8, Math.sin(t * 1.3) * 0.1, dragon.tx >= dragon.x ? 1 : -1, 1, duskAt(dragon.x))
    if (kf.state !== 'gone' && vis(kf.x, 80)) {
      const flying = kf.state === 'fly' || kf.state === 'leave'
      const d = duskAt(kf.x)
      if (flying) drawSprite(g, P.kingfisherFly, kf.x - camX, kf.y - camY - 14, 0, 1, 0.45 + 0.55 * Math.abs(Math.sin(kf.flap)), d)
      else drawSprite(g, P.kingfisher, kf.x - camX, kf.y - camY, 0, 1, 1 + 0.02 * Math.sin(t * 3), d)
    }

    // Breaths of wind.
    if (wisps.length > 0) {
      g.lineCap = 'round'
      g.strokeStyle = '#fbf6ea'
      for (const w of wisps) {
        const k = w.t / w.life
        g.globalAlpha = Math.sin(k * Math.PI) * 0.75
        g.lineWidth = 2.6
        const x = w.x - camX
        const y = w.y - camY + Math.sin(k * 5 + w.curl) * 5
        g.beginPath()
        g.moveTo(x - 26, y + 3)
        g.quadraticCurveTo(x - 6, y - 7, x + 12, y)
        g.quadraticCurveTo(x + 22, y + 5, x + 17, y + 9)
        g.stroke()
      }
      g.globalAlpha = 1
    }

    // The material invites: after a quiet while a hull, or the water by a
    // finished boat, catches the light.
    if (phase === 'bank' && t - lastTouch > 6 && held.size === 0) {
      const ready = boats.find((b) => !b.gone && b.gnome)
      const k = (t * 0.5) % 1
      const a = Math.sin(k * Math.PI)
      if (ready) {
        const wx = ready.x + 40
        const wy = (farEdge(wx) + nearEdge(wx)) / 2 + 10
        g.strokeStyle = '#fbf6ea'
        g.lineWidth = 2.4
        for (let i = 0; i < 3; i++) {
          g.globalAlpha = a * 0.8 * (1 - i * 0.25)
          g.beginPath()
          g.ellipse(wx - camX + i * 4, wy - camY, 26 + k * 30 + i * 22, 7 + k * 8 + i * 6, 0, 0, TAU)
          g.stroke()
        }
      } else if (hint.boat && !hint.boat.gone && hint.t < 1) {
        // A glint runs along the rim of a hull as it stirs.
        const b = hint.boat
        const u = ease.inOutQuad(hint.t)
        const gx = b.x - camX - b.hull.halfW * 0.7 + u * b.hull.halfW * 1.4
        const gy = b.y - camY + b.hull.rimY + 2
        g.globalAlpha = Math.sin(hint.t * Math.PI) * 0.95
        g.drawImage(P.spark, gx - 26, gy - 26, 52, 52)
        g.drawImage(P.spark, gx - 11, gy - 11, 22, 22)
      }
      g.globalAlpha = 1
    }

    // Morning mist, between one day and the next.
    if (mist > 0.005) {
      g.globalAlpha = mist
      g.fillStyle = '#fbf3de'
      g.fillRect(0, 0, W, H)
      g.globalAlpha = 1
      // The risen sun shines through it.
      drawSun(g, phase === 'dawn' && dawnT < 1.9, 0.35 + 0.65 * (1 - mist))
    }
  }

  return {
    update,
    draw,
    down,
    move,
    up,
    dispose() {
      box.done()
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'bark-boats',
    name: 'Bark Boats',
    emoji: '⛵',
    ages: [3, 7],
    pitch: 'Build a little boat from bark, a twig and a leaf, set it on the brook, and follow it downstream to a pond at dusk where a gnome lights its lamp.',
    howTo: 'Drag a hull onto the flat stone, then a twig, a leaf, some cargo (tap a part to take it off again). Carry the boat to the water and let go. Stroke the air behind the sail, stir the water or tap the boat to help it along. At the pond, lift the sun for a new morning.',
    basedOn: 'Waldorf nature craft (bark and walnut-shell boats), the nature table, and fairy tales of gnomes and water sprites; a journey with a beginning, a middle and a rest',
    whyFun: 'A twig presses in and stands, a leaf threads on and fills; then the brook takes the very boat you made, and it sails the way you built it.',
    set: 'gentle',
  },
  create,
}
