// Bread Day: a farmhouse kitchen table on baking day. Flour from the crock,
// water from the jug, a wooden spoon; then the dough is turned onto the board
// and kneaded, pulled into rolls and ropes, covered to rise, baked in the wood
// oven and handed round the family. Nothing is counted and nothing hurries.
// The kitchen waits at every step for the child's own hand.

import { TAU, clamp, damp, dist, lerp } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import {
  ROLL_MASS,
  ROPE_R,
  SEG,
  addCrease,
  crust,
  dentBlob,
  drawBlob,
  drawPiece,
  growth,
  jiggleBlob,
  makeBlob,
  makePiece,
  massFor,
  notchBlob,
  pieceCentre,
  pieceLength,
  pieceReach,
  pullBlob,
  pushBlob,
  radiusAt,
  restAt,
  squashBlob,
  stepBlob,
  thickFor,
} from './dough.ts'
import type { Blob, Piece, Press } from './dough.ts'
import { drawFigure, drawHands, holdPoint, makeFamily } from './family.ts'
import type { Figure } from './family.ts'
import {
  BOARD,
  BOWL,
  CLOTH,
  CROCK,
  FLOOR,
  JUG,
  OVEN,
  PEG,
  SALT,
  SEEDS,
  TABLE_Y,
  WINDOW,
  buildBackdrop,
  buildBoard,
  buildBowl,
  buildCloth,
  buildClothHung,
  buildCrock,
  buildDish,
  buildJug,
  buildPuff,
  buildScoop,
  buildSpoon,
  css,
  drawSprite,
  mixRgb,
  mouthPath,
  seedShape,
} from './scene.ts'
import type { RGB } from './scene.ts'

const HW = BOARD.w / 2
const HH = BOARD.h / 2
// Pixels of pushing that take the dough from shaggy to smooth, and how far
// along it must be before a piece will come away instead of springing back.
const WORK_DIST = 6000
const READY = 0.5
const MIN_R = 54
const MAX_PIECES = 8
const MAX_NODES = 22
const TEAR = 62
const RISE_TIME = 9
const SCOOP_HOME = { x: CROCK.x + 2, y: CROCK.y - 120, rot: 1.12 }
const JUG_HOME = { x: JUG.x, y: JUG.y - 78 }
const SPOON_REST = { x: FLOOR.x + 60, y: FLOOR.y - 4 }
const BALL_SCALE = 0.62

interface Clump {
  x: number
  y: number
  vx: number
  vy: number
  r: number
  phase: number
}

interface Grain {
  x: number
  y: number
  vy: number
  toY: number
  salt: boolean
  kind: number
  rot: number
}

interface Wisp {
  x: number
  y: number
  age: number
  life: number
  size: number
  phase: number
}

interface Speck {
  x: number
  y: number
  kind: number
  rot: number
}

interface Ripple {
  x: number
  y: number
  age: number
}

type Hold =
  | { kind: 'none' }
  | { kind: 'scoop' }
  | { kind: 'jug' }
  | { kind: 'pinch'; salt: boolean; left: number; acc: number; lastX: number; lastY: number }
  | { kind: 'spoon'; travel: number }
  | { kind: 'ball' }
  | { kind: 'knead'; mode: 'in' | 'out'; lastX: number; lastY: number; travel: number; stretched: boolean; out: number }
  | { kind: 'draw'; piece: Piece; anchorX: number; anchorY: number }
  | { kind: 'piece'; piece: Piece; node: number; moved: number; lastX: number; lastY: number; offX: number; offY: number }
  | { kind: 'cloth' }
  | { kind: 'board'; grab: number }

function inEllipse(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (x - cx) / rx
  const dy = (y - cy) / ry
  return dx * dx + dy * dy <= 1
}

function create(stage: Stage): Game {
  const juice = stage.fx
  const sfx = stage.sfx

  const backdrop = buildBackdrop()
  const boardSprite = buildBoard()
  const crockSprite = buildCrock()
  const jugSprite = buildJug()
  const bowlSprite = buildBowl()
  const saltSprite = buildDish('salt')
  const seedSprite = buildDish('seeds')
  const clothSprite = buildCloth()
  const hungSprite = buildClothHung()
  const spoonSprite = buildSpoon()
  const scoopSprite = buildScoop()
  const puffSprite = buildPuff()
  // Flour, salt and stray seeds that land on the table stay there.
  const tableSpecks: Speck[] = []
  let warmed = false

  // ------------------------------------------------------------ state
  let season = Math.floor(stage.rand() * 4)
  let light = 0
  let night = 0
  let dawning = false
  let lastTouch = -2.5
  let warm = 0

  const crock = { left: 3 }
  const scoop = { x: SCOOP_HOME.x, y: SCOOP_HOME.y, rot: SCOOP_HOME.rot, load: 0, away: false, hiss: 0, clumpAcc: 0 }
  const jug = { x: JUG_HOME.x, y: JUG_HOME.y, rot: 0, water: 1, away: false, pouring: false, gurgle: 0, landX: FLOOR.x }
  const bowl = { flour: 0, water: 0, salt: 0, mix: 0, smear: false, clumps: [] as Clump[], ripples: [] as Ripple[] }
  const spoon = { x: SPOON_REST.x, y: SPOON_REST.y, knockAt: -1 }
  // The dough before it reaches the board: lying in the bowl, in the hand, or
  // on its way over.
  const ball = { x: FLOOR.x, y: FLOOR.y, k: BALL_SCALE, fly: -1, fromX: 0, fromY: 0, fromK: BALL_SCALE }
  // `ballDough` is dough that has come together but not yet reached the
  // board; `mainDough` is the dough (later the loaf) lying on the board.
  let ballDough: Blob | null = null
  let doughAt: 'bowl' | 'hand' | 'fly' = 'bowl'
  let mainDough: Blob | null = null
  const pieces: Piece[] = []
  const board = { slide: 0, state: 'home' as 'home' | 'held' | 'in' | 'oven' | 'out' | 'back', baked: false, specks: [] as Speck[] }
  const cloth = { x: PEG.x, y: PEG.y + 90, spread: 0, state: 'peg' as 'peg' | 'held' | 'cover' | 'toCover' | 'toPeg', swing: 0, swingVel: 0, lean: 0 }
  const oven = { door: 0, doorTo: 0, crackle: 1.5 }
  const family: Figure[] = makeFamily()
  let familyCalled = false
  let restSince = -1
  const cat = { twitch: 0 }
  const holds = new Map<number, Hold>()
  const grains: Grain[] = []
  const wisps: Wisp[] = []
  const presses: Press[] = []
  let wispAcc = 0
  let rustle = 0
  const soundAt = new Map<string, number>()

  // ------------------------------------------------------------ sound
  // Everything is the sound of the thing itself, kept low.
  const every = (key: string, gap: number): boolean => {
    const last = soundAt.get(key) ?? -10
    if (stage.time - last < gap) return false
    soundAt.set(key, stage.time)
    return true
  }
  const vary = (amount = 0.06) => 1 + (Math.random() * 2 - 1) * amount
  const knock = (v = 1, pitch = 1) => {
    sfx.tone({ freq: 250 * pitch * vary(), to: 150 * pitch, dur: 0.07, type: 'sine', vol: 0.11 * v })
    sfx.noise({ dur: 0.03, freq: 1100, vol: 0.035 * v, filter: 'lowpass' })
  }
  const pat = (v = 1) => {
    sfx.tone({ freq: 150 * vary(), to: 88, dur: 0.15, type: 'sine', vol: 0.15 * v })
    sfx.noise({ dur: 0.1, freq: 260, vol: 0.05 * v, filter: 'lowpass' })
  }
  const squish = (v = 1) => sfx.noise({ dur: 0.13, freq: 560 * vary(0.2), to: 190, vol: 0.045 * v, filter: 'lowpass' })
  const shuff = (v = 1) => sfx.noise({ dur: 0.14, freq: 2600, to: 1300, vol: 0.05 * v, q: 0.7 })
  const clothSound = () => sfx.noise({ dur: 0.26, freq: 1000, to: 380, vol: 0.055, filter: 'lowpass' })
  const tick = (v = 1) => sfx.tone({ freq: 2300 + Math.random() * 1200, dur: 0.02, type: 'sine', vol: 0.022 * v })
  const softTap = (x: number, y: number) => {
    if (y > TABLE_Y) {
      knock(0.8, 0.9)
      juice.ring(x, y, 'rgba(255,250,236,0.45)', 24, 0.35)
    } else {
      sfx.noise({ dur: 0.05, freq: 380, vol: 0.05, filter: 'lowpass' })
      juice.ring(x, y, 'rgba(255,250,236,0.4)', 20, 0.3)
    }
  }
  const flourPuff = (x: number, y: number, count = 8, speed = 120) =>
    juice.burst(x, y, { count, color: ['#fffaf0', '#f5ecda'], speed, life: 0.55, size: 5, gravity: 30, drag: 0.9 })

  // kind 4 is flour, 5 is salt; 0 to 2 are seeds.
  const stampDust = (x: number, y: number, spread: number, count: number, kind: number) => {
    if (y < TABLE_Y) return
    for (let i = 0; i < count; i++) {
      const a = Math.random() * TAU
      const d = Math.sqrt(Math.random()) * spread
      tableSpecks.push({ x: x + Math.cos(a) * d, y: Math.max(TABLE_Y + 6, y + Math.sin(a) * d * 0.6), kind, rot: Math.random() * TAU })
    }
    if (tableSpecks.length > 260) tableSpecks.splice(0, tableSpecks.length - 260)
  }

  // ------------------------------------------------------------ helpers
  const holding = (kind: Hold['kind']): boolean => {
    for (const hold of holds.values()) if (hold.kind === kind) return true
    return false
  }
  const pieceHeld = (piece: Piece): boolean => {
    for (const hold of holds.values()) if ((hold.kind === 'piece' || hold.kind === 'draw') && hold.piece === piece) return true
    return false
  }
  const boardAt = (): { x: number; y: number; scale: number } => {
    const s = board.slide
    const quick = Math.min(1, s * 1.6)
    return { x: lerp(BOARD.x, OVEN.inX, quick), y: lerp(BOARD.y, OVEN.inY, s), scale: lerp(1, OVEN.inScale, quick) }
  }
  const overBoard = (x: number, y: number, pad = 0): boolean => Math.abs(x - BOARD.x) < HW + pad && Math.abs(y - BOARD.y) < HH + pad
  const familySeated = (): boolean => family.every((f) => f.here > 0.9)
  const canTear = (): boolean => mainDough !== null && mainDough.work >= READY && mainDough.R > MIN_R && pieces.length < MAX_PIECES
  const shrinkDough = (mass: number) => {
    if (mainDough) mainDough.R = Math.sqrt(Math.max(34 * 34, mainDough.R * mainDough.R - mass / Math.PI))
  }
  const breadLeft = (): boolean => mainDough !== null || pieces.length > 0

  const addFlour = (amount: number, atX: number) => {
    bowl.flour += amount
    bowl.smear = false
    scoop.clumpAcc += amount
    while (scoop.clumpAcc >= 0.2 && bowl.clumps.length < 15) {
      scoop.clumpAcc -= 0.2
      bowl.clumps.push({ x: clamp(atX * 0.6 + (Math.random() - 0.5) * 70, -72, 72), y: (Math.random() - 0.45) * 34, vx: 0, vy: 0, r: 23 + Math.random() * 9, phase: Math.random() * TAU })
    }
    if (ballDough && doughAt === 'bowl') {
      // More flour worked into dough that has already come together.
      ballDough.R = Math.sqrt(ballDough.R * ballDough.R + amount * 1500)
      bowl.flour = 0
      bowl.clumps.length = 0
    }
  }

  const formBall = () => {
    let cx = 0
    let cy = 0
    for (const clump of bowl.clumps) {
      cx += clump.x
      cy += clump.y
    }
    const n = Math.max(1, bowl.clumps.length)
    const R = 62 + 16.5 * Math.min(3, bowl.flour) + 5 * Math.min(1, bowl.water)
    ballDough = makeBlob(0, 0, R, Math.random)
    doughAt = 'bowl'
    ball.x = FLOOR.x + (cx / n) * 0.5
    ball.y = FLOOR.y + (cy / n) * 0.5 - 2
    ball.k = BALL_SCALE
    squashBlob(ballDough, -0.12)
    bowl.clumps.length = 0
    bowl.flour = 0
    bowl.water = 0
    bowl.mix = 0
    bowl.smear = true
    sfx.tone({ freq: 230, to: 150, dur: 0.14, type: 'sine', vol: 0.12 })
    squish(1.2)
  }

  const landOnBoard = () => {
    const arriving = ballDough
    if (!arriving) return
    ballDough = null
    doughAt = 'bowl'
    let loaf = mainDough
    if (loaf) {
      // A second batch joins the first.
      loaf.R = Math.sqrt(loaf.R * loaf.R + arriving.R * arriving.R)
      loaf.work *= 0.6
    } else {
      loaf = arriving
      loaf.x = 0
      loaf.y = 2
      mainDough = loaf
    }
    squashBlob(loaf, 0.2)
    sfx.tone({ freq: 140, to: 62, dur: 0.24, type: 'sine', vol: 0.22 })
    sfx.noise({ dur: 0.12, freq: 240, vol: 0.09, filter: 'lowpass' })
    juice.burst(BOARD.x + loaf.x, BOARD.y + loaf.y + 30, { count: 18, color: ['#fffaf0', '#f5ecda'], speed: 260, life: 0.6, size: 6, gravity: 0, drag: 0.88, angle: -Math.PI / 2, spread: TAU })
  }

  const callFamily = () => {
    if (familyCalled) return
    familyCalled = true
    family.forEach((f, i) => {
      stage.after(0.5 + i * 0.5, () => {
        stage.tween(1.3, (t) => (f.here = t))
        sfx.tone({ freq: 120, to: 90, dur: 0.12, type: 'sine', vol: 0.06, delay: 0.9 })
      })
    })
  }

  const freshMorning = () => {
    season = (season + 1) % 4
    crock.left = 3
    scoop.load = 0
    scoop.x = SCOOP_HOME.x
    scoop.y = SCOOP_HOME.y
    scoop.rot = SCOOP_HOME.rot
    scoop.away = false
    jug.water = 1
    bowl.flour = 0
    bowl.water = 0
    bowl.salt = 0
    bowl.mix = 0
    bowl.smear = false
    bowl.clumps.length = 0
    ballDough = null
    mainDough = null
    doughAt = 'bowl'
    pieces.length = 0
    board.baked = false
    board.specks.length = 0
    board.slide = 0
    board.state = 'home'
    cloth.state = 'peg'
    cloth.spread = 0
    oven.doorTo = 0
    for (const f of family) {
      f.here = 0
      f.hold = null
      f.queue.length = 0
    }
    familyCalled = false
    restSince = -1
    warm = 0
    wisps.length = 0
    grains.length = 0
    tableSpecks.length = 0
  }

  const newDay = () => {
    if (dawning) return
    dawning = true
    holds.clear()
    sfx.tone({ freq: 392, dur: 0.9, type: 'sine', vol: 0.05, attack: 0.2 })
    stage.tween(
      1.5,
      (t) => {
        night = t
        for (const f of family) f.here = Math.min(f.here, 1 - t)
      },
      (t) => t * t * (3 - 2 * t),
      () => {
        freshMorning()
        light = 0
        stage.after(0.5, () => {
          // A bird outside, and the morning comes up.
          for (let i = 0; i < 3; i++) sfx.tone({ freq: 2500 + i * 240, to: 3000 + i * 200, dur: 0.07, type: 'sine', vol: 0.03, delay: 0.25 + i * 0.13 })
          stage.tween(
            1.7,
            (t) => (night = 1 - t),
            (t) => t * t * (3 - 2 * t),
            () => {
              night = 0
              dawning = false
              lastTouch = stage.time
            },
          )
        })
      },
    )
  }

  // For looking at a later step without baking a whole loaf first: the shot
  // script may set `__breadDay` before the page loads. Nothing in play sets it.
  const jump = (globalThis as { __breadDay?: string }).__breadDay
  if (jump) {
    const loaf = makeBlob(0, 2, jump === 'dough' || jump === 'smooth' ? 112 : 86, Math.random)
    loaf.work = jump === 'dough' ? 0 : 1
    mainDough = loaf
    crock.left = 0
    jug.water = 0
    bowl.smear = true
    if (jump === 'shaped' || jump === 'baked') {
      const roll = (x: number, y: number) => pieces.push(makePiece(x, y, ROLL_MASS, 1))
      roll(-178, -76)
      roll(196, 48)
      roll(120, 84)
      for (const pts of [
        [-200, 60, -180, 84, -150, 92, -122, 86],
        [130, -90, 170, -98, 204, -80, 212, -44, 190, -18, 156, -22],
      ]) {
        const rope = makePiece(0, 0, 0, 1)
        rope.nodes = []
        for (let i = 0; i + 3 < pts.length; i += 2) {
          const steps = Math.max(1, Math.round(dist(pts[i]!, pts[i + 1]!, pts[i + 2]!, pts[i + 3]!) / SEG))
          for (let k = 0; k < steps; k++) rope.nodes.push({ x: lerp(pts[i]!, pts[i + 2]!, k / steps), y: lerp(pts[i + 1]!, pts[i + 3]!, k / steps) })
        }
        rope.mass = massFor(pieceLength(rope), ROPE_R)
        rope.thick = ROPE_R
        pieces.push(rope)
      }
      for (let i = 0; i < 16; i++) loaf.seeds.push({ a: i * 2.4, f: 0.15 + ((i * 37) % 60) / 100, kind: i % 3, rot: i })
    }
    if (jump === 'baked') {
      for (const item of [loaf, ...pieces]) {
        item.rise = 1
        item.bake = 1
      }
      board.baked = true
      warm = 1
      callFamily()
    }
  }

  // ------------------------------------------------------------ pieces
  const settle = (piece: Piece) => {
    if (piece.nodes.length > 1 && pieceLength(piece) < 34) {
      const head = piece.nodes[piece.nodes.length - 1]!
      piece.nodes = [{ x: head.x, y: head.y }]
    }
    piece.thick = piece.nodes.length === 1 ? Math.sqrt(piece.mass / Math.PI) : Math.max(ROPE_R, thickFor(piece.mass, pieceLength(piece)))
    piece.wobVel += 3
  }

  const tear = (id: number, lx: number, ly: number) => {
    if (!mainDough) return
    const piece = makePiece(lx, ly, ROLL_MASS, mainDough.work)
    piece.rise = mainDough.rise
    piece.wob = 0.25
    shrinkDough(ROLL_MASS)
    pieces.push(piece)
    holds.set(id, { kind: 'draw', piece, anchorX: lx, anchorY: ly })
    sfx.tone({ freq: 330 * vary(), to: 190, dur: 0.07, type: 'sine', vol: 0.11 })
    sfx.noise({ dur: 0.05, freq: 700, vol: 0.05, filter: 'lowpass' })
    flourPuff(BOARD.x + lx, BOARD.y + ly, 5, 70)
    jiggleBlob(mainDough, 0.5)
  }

  const drawOut = (hold: Extract<Hold, { kind: 'draw' }>, lx: number, ly: number) => {
    const piece = hold.piece
    const nodes = piece.nodes
    const head = nodes[nodes.length - 1]!
    head.x = lx
    head.y = ly
    if (nodes.length === 1 && dist(lx, ly, hold.anchorX, hold.anchorY) > SEG) nodes.unshift({ x: hold.anchorX, y: hold.anchorY })
    if (nodes.length >= 2) {
      let prev = nodes[nodes.length - 2]!
      let d = dist(prev.x, prev.y, head.x, head.y)
      while (d > SEG) {
        const t = SEG / d
        const next = { x: prev.x + (head.x - prev.x) * t, y: prev.y + (head.y - prev.y) * t }
        nodes.splice(nodes.length - 1, 0, next)
        prev = next
        d -= SEG
        const need = massFor(pieceLength(piece), ROPE_R) - piece.mass
        if (need > 0) {
          if (nodes.length <= MAX_NODES && mainDough && mainDough.R > MIN_R) {
            piece.mass += need
            shrinkDough(need)
            if (every('stretch', 0.12)) sfx.tone({ freq: 210 + nodes.length * 9, to: 240 + nodes.length * 9, dur: 0.06, type: 'sine', vol: 0.035 })
          } else {
            // No more to give: the tail follows, like a snake.
            nodes.shift()
          }
        }
      }
      piece.thick = Math.max(ROPE_R, thickFor(piece.mass, pieceLength(piece)))
    }
  }

  const dragPiece = (piece: Piece, node: number, lx: number, ly: number) => {
    const nodes = piece.nodes
    const grabbed = nodes[node]!
    grabbed.x = lx
    grabbed.y = ly
    const follow = (a: { x: number; y: number }, b: { x: number; y: number }) => {
      const d = dist(a.x, a.y, b.x, b.y)
      if (d > SEG) {
        a.x = b.x + ((a.x - b.x) * SEG) / d
        a.y = b.y + ((a.y - b.y) * SEG) / d
      }
    }
    for (let i = node + 1; i < nodes.length; i++) follow(nodes[i]!, nodes[i - 1]!)
    for (let i = node - 1; i >= 0; i--) follow(nodes[i]!, nodes[i + 1]!)
  }

  // Bread leaves crumbs where it lay.
  const crumbs = (lx: number, ly: number, count: number) => {
    for (let i = 0; i < count && board.specks.length < 90; i++) board.specks.push({ x: lx + (Math.random() - 0.5) * 60, y: ly + (Math.random() - 0.5) * 40, kind: 3, rot: Math.random() * 3 })
  }

  const giveTo = (piece: Piece, wx: number) => {
    let best = 0
    for (let i = 1; i < family.length; i++) if (Math.abs(family[i]!.x - wx) < Math.abs(family[best]!.x - wx)) best = i
    const f = family[best]!
    const at = pieces.indexOf(piece)
    if (at >= 0) pieces.splice(at, 1)
    const c = pieceCentre(piece)
    piece.owner = best
    piece.fromX = BOARD.x + c.x
    piece.fromY = BOARD.y + c.y
    piece.give = 0
    if (f.hold) {
      f.queue.push(piece)
    } else {
      f.hold = piece
      f.wait = 1.3
    }
    f.nod = 1
    // Only the sound of crust in the hands.
    sfx.noise({ dur: 0.07, freq: 1500, vol: 0.035, q: 1.5, delay: 0.4 })
    sfx.tone({ freq: 190, to: 130, dur: 0.08, type: 'sine', vol: 0.06, delay: 0.4 })
  }

  const tearBread = (id: number, angle: number, wx: number, wy: number) => {
    const loaf = mainDough
    if (!loaf) return
    let piece: Piece
    if (loaf.R < 66) {
      // The last of the loaf comes away whole.
      piece = makePiece(loaf.x, loaf.y, Math.PI * loaf.R * loaf.R, loaf.work)
      for (const seed of loaf.seeds) {
        if (piece.seeds.length < 14) piece.seeds.push({ i: 0, ox: Math.cos(seed.a) * seed.f * loaf.R * 0.8, oy: Math.sin(seed.a) * seed.f * loaf.R * 0.7, kind: seed.kind, rot: seed.rot })
      }
      piece.torn = loaf.notch.some((n) => n > 0.1)
      mainDough = null
    } else {
      // A big loaf breaks into big pieces, so it is never a long job.
      const take = Math.max(1100, (loaf.R * loaf.R - 3000) * 0.42)
      piece = makePiece(wx - BOARD.x, wy - BOARD.y, take * Math.PI * 0.85, loaf.work)
      piece.torn = true
      piece.phase = angle + Math.PI
      notchBlob(loaf, angle, 0.4)
      loaf.R = Math.sqrt(loaf.R * loaf.R - take)
    }
    piece.rise = loaf.rise
    piece.bake = loaf.bake
    crumbs(wx - BOARD.x, wy - BOARD.y, 5)
    pieces.push(piece)
    holds.set(id, { kind: 'piece', piece, node: 0, moved: 99, lastX: wx, lastY: wy, offX: 0, offY: 0 })
    const tone = crust(loaf.bake, 1)
    for (let i = 0; i < 3; i++) sfx.noise({ dur: 0.035, freq: 1800 + Math.random() * 1600, vol: 0.05, delay: i * 0.03, q: 2 })
    sfx.noise({ dur: 0.12, freq: 500, to: 220, vol: 0.05, filter: 'lowpass' })
    juice.burst(wx, wy, { count: 7, color: [css(tone.base), '#f6e9cb'], speed: 110, life: 0.5, size: 4, gravity: 420 })
    for (let i = 0; i < 4; i++) wisps.push({ x: wx + (Math.random() - 0.5) * 30, y: wy - 10, age: 0, life: 1.8 + Math.random(), size: 14 + Math.random() * 10, phase: Math.random() * TAU })
  }

  const landGrain = (grain: Grain) => {
    if (grain.salt) {
      if (inEllipse(grain.x, grain.y, BOWL.x, BOWL.y, BOWL.rx - 12, BOWL.ry - 8)) {
        bowl.salt++
        if (every('salt', 0.05)) tick(0.8)
      } else {
        stampDust(grain.x, grain.y, 2, 1, 5)
      }
      return
    }
    if (every('seed', 0.045)) tick()
    const onBoard = board.state === 'home' && overBoard(grain.x, grain.y, -4)
    if (!onBoard) {
      stampDust(grain.x, grain.y, 0, 1, grain.kind)
      return
    }
    const lx = grain.x - BOARD.x
    const ly = grain.y - BOARD.y
    for (let i = pieces.length - 1; i >= 0; i--) {
      const piece = pieces[i]!
      const reach = piece.thick * growth(piece.rise, piece.bake) * 0.86
      for (let n = 0; n < piece.nodes.length; n++) {
        const node = piece.nodes[n]!
        if (dist(lx, ly, node.x, node.y) < reach) {
          if (piece.seeds.length < 26) piece.seeds.push({ i: n, ox: (lx - node.x) / growth(piece.rise, piece.bake), oy: (ly - node.y) / growth(piece.rise, piece.bake), kind: grain.kind, rot: grain.rot })
          piece.wobVel += 0.4
          return
        }
      }
    }
    if (mainDough) {
      const dx = lx - mainDough.x
      const dy = ly - mainDough.y
      const angle = Math.atan2(dy, dx)
      const r = radiusAt(mainDough, angle) * growth(mainDough.rise, mainDough.bake)
      const d = Math.hypot(dx, dy)
      if (d < r * 0.9) {
        if (mainDough.seeds.length < 60) mainDough.seeds.push({ a: angle, f: d / r, kind: grain.kind, rot: grain.rot })
        return
      }
    }
    if (board.specks.length < 70) board.specks.push({ x: lx, y: ly, kind: grain.kind, rot: grain.rot })
  }

  // ------------------------------------------------------------ touch
  const pick = (p: Pointer): Hold => {
    const { x, y } = p
    // The cloth, on its peg or over the dough.
    if (cloth.state === 'peg' && !holding('cloth') && Math.abs(x - PEG.x) < 68 && y > PEG.y - 26 && y < PEG.y + 214) {
      cloth.state = 'held'
      cloth.x = PEG.x
      cloth.y = PEG.y + 96
      clothSound()
      return { kind: 'cloth' }
    }
    if (cloth.state === 'cover' && board.state === 'home' && overBoard(x, y, 22)) {
      cloth.state = 'held'
      clothSound()
      return { kind: 'cloth' }
    }
    // The board's handle.
    if (board.state === 'home' && !holding('board') && x > BOARD.x + HW - 8 && Math.abs(y - BOARD.y) < 66) {
      if (cloth.state === 'cover' || cloth.state === 'toCover') {
        cloth.state = 'toPeg'
        clothSound()
      }
      board.state = 'held'
      knock(0.9, 0.8)
      return { kind: 'board', grab: y }
    }
    // The oven.
    if (x > OVEN.left && x < OVEN.right && y < TABLE_Y - 2) {
      if (board.state === 'oven') {
        oven.doorTo = 1
        board.state = 'out'
      } else if (board.state === 'home' || board.state === 'back') {
        oven.doorTo = oven.doorTo > 0.5 ? 0 : 1
      }
      sfx.tone({ freq: 250, to: 330, dur: 0.2, type: 'triangle', vol: 0.035 })
      sfx.tone({ freq: 110, to: 70, dur: 0.12, type: 'sine', vol: 0.14, delay: 0.16 })
      return { kind: 'none' }
    }
    if (dist(x, y, SALT.x, SALT.y) < 60 && !holding('pinch')) {
      tick(1.4)
      return { kind: 'pinch', salt: true, left: 9, acc: 0, lastX: x, lastY: y }
    }
    if (dist(x, y, SEEDS.x, SEEDS.y) < 60 && !holding('pinch')) {
      tick(1.4)
      sfx.noise({ dur: 0.05, freq: 3200, vol: 0.03, q: 2 })
      return { kind: 'pinch', salt: false, left: 18, acc: 0, lastX: x, lastY: y }
    }
    if (Math.abs(x - CROCK.x) < 96 && y > CROCK.y - 236 && y < CROCK.y + 12 && !scoop.away && !holding('scoop')) {
      scoop.away = true
      if (crock.left > 0.02) {
        scoop.load = Math.min(1, crock.left)
        crock.left -= scoop.load
        shuff(1.2)
        flourPuff(CROCK.x, CROCK.y - 136, 5, 60)
      } else {
        knock(1, 1.3)
      }
      return { kind: 'scoop' }
    }
    if (!jug.away && !holding('jug') && Math.abs(x - JUG.x) < 84 && y > JUG.y - 176 && y < JUG.y + 24) {
      jug.away = true
      sfx.tone({ freq: 620, to: 520, dur: 0.05, type: 'sine', vol: 0.04 })
      if (jug.water > 0.05) sfx.noise({ dur: 0.12, freq: 900, vol: 0.035, q: 3 })
      return { kind: 'jug' }
    }
    // The mixing bowl.
    if (inEllipse(x, y, BOWL.x, BOWL.y + 14, BOWL.rx + 4, BOWL.ry + 30)) {
      if (restSince >= 0 && stage.time - restSince > 1.5) {
        knock(0.8)
        newDay()
        return { kind: 'none' }
      }
      if (ballDough && doughAt === 'bowl' && dist(x, y, ball.x, ball.y) < ballDough.R * ball.k + 22) {
        doughAt = 'hand'
        squashBlob(ballDough, 0.1)
        pat(0.8)
        return { kind: 'ball' }
      }
      if (!holding('spoon')) {
        knock(0.7, 1.15)
        return { kind: 'spoon', travel: 0 }
      }
      return { kind: 'none' }
    }
    // The board and what is on it.
    if (board.state === 'home' && cloth.state !== 'cover' && cloth.state !== 'toCover' && overBoard(x, y, 6)) {
      const lx = x - BOARD.x
      const ly = y - BOARD.y
      let best: Piece | null = null
      let bestNode = 0
      let bestD = 24
      for (const piece of pieces) {
        if (pieceHeld(piece)) continue
        const reach = piece.thick * growth(piece.rise, piece.bake)
        for (let n = 0; n < piece.nodes.length; n++) {
          const d = dist(lx, ly, piece.nodes[n]!.x, piece.nodes[n]!.y) - reach
          if (d < bestD) {
            bestD = d
            best = piece
            bestNode = n
          }
        }
      }
      const loaf = mainDough
      if (loaf) {
        const dx = lx - loaf.x
        const dy = ly - loaf.y
        const d = Math.hypot(dx, dy)
        const r = radiusAt(loaf, Math.atan2(dy, dx)) * growth(loaf.rise, loaf.bake)
        // A touch well inside the dough is for the dough, even with a roll close by.
        if (d < r + 6 && (!best || bestD > 0)) {
          if (board.baked) {
            if (loaf.R < 66) {
              tearBread(p.id, 0, x, y)
              return holds.get(p.id) ?? { kind: 'none' }
            }
            knock(0.9, 0.62)
            return { kind: 'knead', mode: 'in', lastX: x, lastY: y, travel: 0, stretched: false, out: 0 }
          }
          squashBlob(loaf, 0.1)
          pat()
          return { kind: 'knead', mode: 'in', lastX: x, lastY: y, travel: 0, stretched: false, out: 0 }
        }
        if (!best && !board.baked && d < r + 84) {
          return { kind: 'knead', mode: 'out', lastX: x, lastY: y, travel: 0, stretched: false, out: 0 }
        }
      }
      if (best) {
        if (board.baked) knock(0.7, 0.75)
        else pat(0.6)
        best.wobVel += 2.2
        if (board.baked) crumbs(lx, ly, 3)
        const grabbed = best.nodes[bestNode]!
        return { kind: 'piece', piece: best, node: bestNode, moved: 0, lastX: x, lastY: y, offX: grabbed.x - lx, offY: grabbed.y - ly }
      }
      knock(0.9, 0.85)
      flourPuff(x, y, 5, 70)
      return { kind: 'none' }
    }
    // The family.
    for (const f of family) {
      if (f.here > 0.9 && Math.abs(x - f.x) < f.r * 1.9 && y > f.headY - f.r - 10 && y < TABLE_Y + 16) {
        f.nod = 1
        // Wool under the finger.
        sfx.noise({ dur: 0.12, freq: 700, vol: 0.04, filter: 'lowpass' })
        return { kind: 'none' }
      }
    }
    // The cat on the sill, and the tree outside.
    if (dist(x, y, WINDOW.x + 66, WINDOW.y + WINDOW.h - 16) < 62) {
      cat.twitch = 1
      sfx.tone({ freq: 340, to: 300, dur: 0.3, type: 'triangle', vol: 0.035, attack: 0.08 })
      return { kind: 'none' }
    }
    if (x > WINDOW.x - 10 && x < WINDOW.x + WINDOW.w + 10 && y > WINDOW.y - 10 && y < WINDOW.y + WINDOW.h + 10) {
      rustle = 1
      sfx.noise({ dur: 0.4, freq: 3000, to: 1800, vol: 0.03, filter: 'highpass' })
      return { kind: 'none' }
    }
    softTap(x, y)
    return { kind: 'none' }
  }

  const release = (p: Pointer, hold: Hold) => {
    if (hold.kind === 'pinch') {
      // Whatever is left in the fingers falls where they are.
      for (let i = 0; i < hold.left; i++) {
        grains.push({ x: p.x + (Math.random() - 0.5) * 34, y: p.y - 34, vy: 40 + Math.random() * 60, toY: p.y + (Math.random() - 0.3) * 22, salt: hold.salt, kind: i % 3, rot: Math.random() * TAU })
      }
    } else if (hold.kind === 'ball') {
      if (!ballDough) return
      const out = !inEllipse(p.x, p.y, BOWL.x, BOWL.y, BOWL.rx - 16, BOWL.ry + 6)
      const ready = board.state === 'home' && !board.baked
      if (out && ready) {
        if (cloth.state === 'cover' || cloth.state === 'toCover') cloth.state = 'toPeg'
        doughAt = 'fly'
        ball.fly = 0
        ball.fromX = ball.x
        ball.fromY = ball.y
        ball.fromK = ball.k
        sfx.noise({ dur: 0.2, freq: 500, to: 900, vol: 0.03, q: 0.8 })
      } else {
        doughAt = 'bowl'
        ball.x = clamp(ball.x, FLOOR.x - 40, FLOOR.x + 40)
        ball.y = FLOOR.y - 2
        squashBlob(ballDough, 0.12)
        pat(0.7)
      }
    } else if (hold.kind === 'knead') {
      if (mainDough && !board.baked) {
        jiggleBlob(mainDough, hold.stretched ? 0.9 : 0.35)
        if (hold.stretched) sfx.tone({ freq: 170, to: 120, dur: 0.1, type: 'sine', vol: 0.08 })
      }
    } else if (hold.kind === 'draw') {
      settle(hold.piece)
      pat(0.6)
    } else if (hold.kind === 'piece') {
      const piece = hold.piece
      if (!pieces.includes(piece)) return
      const node = piece.nodes[Math.min(hold.node, piece.nodes.length - 1)]!
      if (hold.moved < 9) {
        // A tap: a rope twists into a plait (or untwists); a roll is patted.
        if (piece.nodes.length > 3 && !board.baked) {
          piece.twistTo = piece.twistTo > 0.5 ? 0 : 1
          sfx.noise({ dur: 0.16, freq: 420, to: 760, vol: 0.05, filter: 'lowpass' })
        }
        piece.wobVel += 3
        return
      }
      if (board.baked && familySeated() && p.y < TABLE_Y + 100 && p.x < OVEN.left + 20) {
        giveTo(piece, p.x)
        return
      }
      const loaf = mainDough
      if (loaf && !board.baked) {
        const dx = node.x - loaf.x
        const dy = node.y - loaf.y
        if (Math.hypot(dx, dy) < radiusAt(loaf, Math.atan2(dy, dx)) * growth(loaf.rise, loaf.bake) * 0.7) {
          // Pressed back into the big dough.
          loaf.R = Math.sqrt(loaf.R * loaf.R + piece.mass / Math.PI)
          squashBlob(loaf, 0.1)
          pieces.splice(pieces.indexOf(piece), 1)
          squish(1.3)
          pat(0.8)
          return
        }
      }
      piece.wobVel += 3
      if (board.baked) knock(0.6, 0.75)
      else pat(0.6)
    } else if (hold.kind === 'cloth') {
      if (board.state === 'home' && overBoard(p.x, p.y, 50)) {
        cloth.state = 'toCover'
      } else {
        cloth.state = 'toPeg'
      }
      clothSound()
    } else if (hold.kind === 'board') {
      if (board.slide > 0.42) {
        board.state = 'in'
        oven.doorTo = 1
      } else {
        board.state = 'back'
      }
    }
  }

  // ------------------------------------------------------------ update
  const scoopOverBowl = (): boolean => Math.abs(scoop.x + 30 - BOWL.x) < BOWL.rx - 26 && scoop.y > BOWL.y - 250 && scoop.y < BOWL.y + 30
  const pourScoop = (dt: number) => {
    if (scoop.rot < 0.6 || scoop.load <= 0) return
    const tipX = scoop.x + Math.cos(scoop.rot) * 44
    const tipY = scoop.y + Math.sin(scoop.rot) * 44
    const amount = Math.min(scoop.load, dt / 0.9)
    scoop.load -= amount
    addFlour(amount, tipX - FLOOR.x)
    juice.burst(tipX, tipY, { count: 2, color: ['#fffaf0', '#f3ead8'], speed: 70, life: clamp((FLOOR.y - tipY) / 520, 0.12, 0.5), size: 6, gravity: 1500, angle: Math.PI / 2, spread: 0.6, drag: 1 })
    scoop.hiss -= dt
    if (scoop.hiss <= 0) {
      scoop.hiss = 0.09
      sfx.noise({ dur: 0.12, freq: 3400, vol: 0.03, filter: 'highpass' })
    }
    if (scoop.load <= 0) juice.burst(tipX, FLOOR.y - 10, { count: 6, color: '#fffaf0', speed: 60, life: 0.5, size: 5, gravity: -20, drag: 0.9 })
  }

  const updateHolds = (dt: number) => {
    presses.length = 0
    jug.pouring = false
    for (const [id, hold] of holds) {
      const p = stage.pointers.get(id)
      if (!p) continue
      if (hold.kind === 'scoop') {
        const px = scoop.x
        const py = scoop.y
        scoop.x = damp(scoop.x, p.x - 8, 20, dt)
        scoop.y = damp(scoop.y, p.y - 46, 20, dt)
        const over = scoopOverBowl()
        scoop.rot = damp(scoop.rot, over && scoop.load > 0 ? 1.05 : over ? 0.5 : 0, 9, dt)
        if (over) {
          pourScoop(dt)
        } else if (scoop.load > 0.2 && Math.hypot(scoop.x - px, scoop.y - py) > 900 * dt && every('spill', 0.12)) {
          // Carried too fast, a little flour shakes off and dusts the table.
          flourPuff(scoop.x, scoop.y, 3, 50)
          stampDust(scoop.x, Math.max(TABLE_Y + 30, scoop.y + 70), 26, 14, 4)
        }
      } else if (hold.kind === 'jug') {
        jug.x = damp(jug.x, p.x - 6, 18, dt)
        jug.y = damp(jug.y, p.y - 62, 18, dt)
        const tipX = jug.x + 96
        const over = Math.abs(tipX - BOWL.x) < BOWL.rx - 30 && jug.y < BOWL.y - 16 && jug.y > BOWL.y - 330
        jug.rot = damp(jug.rot, over ? 0.95 : 0, 8, dt)
        if (over && jug.rot > 0.7 && jug.water > 0) {
          const flow = Math.min(jug.water, dt / 2.6)
          jug.water -= flow
          bowl.water += flow
          bowl.smear = false
          jug.pouring = true
          jug.landX = clamp(tipX + 10, FLOOR.x - 84, FLOOR.x + 84)
          if (ballDough && doughAt === 'bowl') {
            ballDough.R = Math.sqrt(ballDough.R * ballDough.R + flow * 600)
            bowl.water -= flow
          }
          jug.gurgle -= dt
          if (jug.gurgle <= 0) {
            jug.gurgle = 0.085
            const fill = bowl.water
            sfx.noise({ dur: 0.11, freq: 800 + fill * 900 + Math.random() * 300, vol: 0.06, q: 3.5 })
            if (Math.random() < 0.45) sfx.tone({ freq: 500 + fill * 500 + Math.random() * 400, to: 900 + Math.random() * 500, dur: 0.05, type: 'sine', vol: 0.025 })
            bowl.ripples.push({ x: jug.landX, y: FLOOR.y - 2, age: 0 })
          }
          juice.burst(jug.landX, FLOOR.y - 6, { count: 1, color: ['#e6f1f5', '#cfe2ea'], speed: 110, life: 0.3, size: 4, gravity: 600, angle: -Math.PI / 2, spread: 1.6 })
        }
      } else if (hold.kind === 'pinch') {
        // Salt and seeds fall as the fingers move over the bowl or the board,
        // so they land along the path the hand takes.
        const fine = hold.salt ? inEllipse(p.x, p.y, BOWL.x, BOWL.y, BOWL.rx - 6, BOWL.ry + 10) : board.state === 'home' && cloth.state !== 'cover' && overBoard(p.x, p.y, 10)
        const moved = Math.hypot(p.x - hold.lastX, p.y - hold.lastY)
        hold.lastX = p.x
        hold.lastY = p.y
        if (fine && hold.left > 0) {
          hold.acc += moved / 20 + dt * 2.2
          while (hold.acc > 1 && hold.left > 0) {
            hold.acc -= 1
            hold.left--
            grains.push({ x: p.x + (Math.random() - 0.5) * 30, y: p.y - 34, vy: 30 + Math.random() * 50, toY: p.y + (Math.random() - 0.4) * 26, salt: hold.salt, kind: hold.left % 3, rot: Math.random() * TAU })
          }
        }
      } else if (hold.kind === 'spoon') {
        // The spoon stays inside the bowl.
        let tx = p.x - FLOOR.x
        let ty = p.y - FLOOR.y
        const reach = Math.hypot(tx / (FLOOR.rx + 8), ty / (FLOOR.ry + 8))
        let rim = false
        if (reach > 1) {
          tx /= reach
          ty /= reach
          rim = true
        }
        const nx = damp(spoon.x, FLOOR.x + tx, 26, dt)
        const ny = damp(spoon.y, FLOOR.y + ty, 26, dt)
        const mx = nx - spoon.x
        const my = ny - spoon.y
        spoon.x = nx
        spoon.y = ny
        const moved = Math.hypot(mx, my)
        hold.travel += moved
        if (rim && moved > 2.5 && every('rim', 0.2)) knock(0.55, 1.2)
        for (const clump of bowl.clumps) {
          const d = dist(spoon.x - FLOOR.x, spoon.y - FLOOR.y, clump.x, clump.y)
          if (d < clump.r + 26) {
            clump.vx += mx * 9
            clump.vy += my * 9
          }
        }
        if (ballDough && doughAt === 'bowl') {
          const d = dist(spoon.x, spoon.y, ball.x, ball.y)
          if (d < ballDough.R * ball.k + 14 && moved > 0.3) {
            ball.x += mx * 0.8
            ball.y += my * 0.8
            pushBlob(ballDough, mx, my, 0.8)
            if (every('ballpush', 0.3)) squish(0.8)
          }
        }
        const wet = bowl.water > 0.05
        const floury = bowl.flour > 0.1
        if (wet && floury && !ballDough) {
          if (bowl.flour >= 0.5 && bowl.water >= 0.12) bowl.mix = Math.min(1, bowl.mix + moved / 2600)
          if (bowl.mix >= 1) formBall()
        }
        if (hold.travel > 120) {
          hold.travel = 0
          if (wet && floury) squish(0.9 + bowl.mix * 0.5)
          else if (wet) sfx.noise({ dur: 0.16, freq: 760 * vary(0.2), vol: 0.04, q: 2.5 })
          else if (floury) shuff(0.7)
          else knock(0.4, 1.3)
          if (wet) bowl.ripples.push({ x: spoon.x, y: spoon.y, age: 0 })
        }
      } else if (hold.kind === 'ball') {
        if (ballDough) {
          const nx = damp(ball.x, p.x, 16, dt)
          const ny = damp(ball.y, p.y - 10, 16, dt)
          pushBlob(ballDough, (nx - ball.x) * 0.5, (ny - ball.y) * 0.5, 0.6)
          ball.x = nx
          ball.y = ny
          ball.k = damp(ball.k, 0.88, 6, dt)
        }
      } else if (hold.kind === 'knead') {
        const loaf = mainDough
        if (!loaf || board.state !== 'home') continue
        const mx = p.x - hold.lastX
        const my = p.y - hold.lastY
        hold.lastX = p.x
        hold.lastY = p.y
        const moved = Math.hypot(mx, my)
        const lx = p.x - BOARD.x - loaf.x
        const ly = p.y - BOARD.y - loaf.y
        const d = Math.hypot(lx, ly)
        const angle = Math.atan2(ly, lx)
        const s = growth(loaf.rise, loaf.bake)
        const rest = restAt(loaf, angle) * s
        if (board.baked) {
          if (d > rest + 22) tearBread(id, angle, p.x, p.y)
          continue
        }
        if (hold.mode === 'out') {
          if (d < rest * 0.5) {
            hold.mode = 'in'
            addCrease(loaf, lx, ly, mx, my)
            pat(0.7)
          } else if (d < rest + 70) {
            dentBlob(loaf, lx / s, ly / s, 50 / s)
          }
        }
        if (hold.mode === 'in') {
          const beyond = d - rest
          // Near the edge the dough is pushed out ahead of the finger.
          if (beyond > -34 && beyond < 4) pullBlob(loaf, angle, (beyond + 34) / s, dt)
          if (beyond < 4) {
            pushBlob(loaf, mx, my, clamp(d / rest, 0, 1))
            presses.push({ x: p.x - BOARD.x, y: p.y - BOARD.y })
            hold.stretched = false
            hold.out = 0
          } else {
            const can = canTear()
            hold.out += dt
            const reach = can ? Math.min(beyond, 170) : 130 * (1 - Math.exp(-beyond / 130))
            pullBlob(loaf, angle, (reach + 34) / s, dt)
            hold.stretched = true
            if (moved > 1 && every('pull', 0.14)) sfx.tone({ freq: 180 + reach * 1.1, to: 200 + reach * 1.1, dur: 0.07, type: 'sine', vol: 0.03 })
            if (can && beyond > TEAR && hold.out > 0.2) {
              tear(id, p.x - BOARD.x, p.y - BOARD.y)
              continue
            }
            if (!can && beyond > 230) {
              // It slips out of the fingers and springs back.
              holds.set(id, { kind: 'none' })
              jiggleBlob(loaf, 1)
              sfx.tone({ freq: 170, to: 120, dur: 0.1, type: 'sine', vol: 0.08 })
              continue
            }
          }
        }
        if (moved > 0 && d < rest + 60) {
          const before = loaf.work
          loaf.work = Math.min(1, loaf.work + moved / WORK_DIST)
          if (before < READY && loaf.work >= READY) jiggleBlob(loaf, 0.5)
          // Kneading knocks the air out of risen dough.
          if (loaf.rise > 0) loaf.rise = Math.max(0, loaf.rise - moved / 700)
          hold.travel += moved
          if (hold.travel > 115) {
            hold.travel = 0
            squish(0.8 + loaf.work * 0.4)
            if (Math.random() < 0.5) flourPuff(p.x, p.y + 6, 3, 50)
            if (hold.mode === 'in' && d > rest * 0.45 && Math.random() < 0.6) addCrease(loaf, lx, ly, mx, my)
          }
        }
      } else if (hold.kind === 'draw') {
        drawOut(hold, p.x - BOARD.x, p.y - BOARD.y)
      } else if (hold.kind === 'piece') {
        hold.moved += dist(p.x, p.y, hold.lastX, hold.lastY)
        hold.lastX = p.x
        hold.lastY = p.y
        if (hold.moved < 9) continue
        // The piece comes along by the spot it was taken hold of.
        hold.offX = damp(hold.offX, 0, 6, dt)
        hold.offY = damp(hold.offY, 0, 6, dt)
        const lx = p.x - BOARD.x + hold.offX
        const ly = p.y - BOARD.y + hold.offY
        const at = Math.min(hold.node, hold.piece.nodes.length - 1)
        const node = hold.piece.nodes[at]!
        if (hold.piece.bake > 0.12) {
          // Baked bread keeps its shape: the whole piece moves as one.
          const dx = lx - node.x
          const dy = ly - node.y
          for (const other of hold.piece.nodes) {
            other.x += dx
            other.y += dy
          }
        } else {
          dragPiece(hold.piece, at, lx, ly)
        }
      } else if (hold.kind === 'cloth') {
        const nx = damp(cloth.x, p.x, 13, dt)
        cloth.lean = damp(cloth.lean, clamp((nx - cloth.x) / Math.max(dt, 0.001) / 1600, -0.3, 0.3), 8, dt)
        cloth.x = nx
        cloth.y = damp(cloth.y, p.y + 14, 13, dt)
        cloth.spread = damp(cloth.spread, 0.6, 8, dt)
      } else if (hold.kind === 'board') {
        const want = clamp((hold.grab - p.y) / (BOARD.y - OVEN.inY - 60), 0, 1)
        board.slide = damp(board.slide, want, 16, dt)
        oven.doorTo = board.slide > 0.22 ? 1 : 0
      }
    }
  }

  const updateBowl = (dt: number) => {
    const clumps = bowl.clumps
    if (clumps.length > 0) {
      let cx = 0
      let cy = 0
      for (const clump of clumps) {
        cx += clump.x
        cy += clump.y
      }
      cx /= clumps.length
      cy /= clumps.length
      const pull = bowl.mix * bowl.mix * 9
      const apart = 0.86 - bowl.mix * 0.3
      for (let i = 0; i < clumps.length; i++) {
        const a = clumps[i]!
        a.vx += (cx - a.x) * pull * dt
        a.vy += (cy - a.y) * pull * dt
        for (let j = i + 1; j < clumps.length; j++) {
          const b = clumps[j]!
          const dx = b.x - a.x
          const dy = (b.y - a.y) * 1.5
          const d = Math.hypot(dx, dy) || 0.01
          const min = (a.r + b.r) * 0.62 * apart
          if (d < min) {
            const push = ((min - d) / d) * 5 * dt
            a.x -= dx * push
            a.y -= (dy / 1.5) * push
            b.x += dx * push
            b.y += (dy / 1.5) * push
          }
        }
        a.x += a.vx * dt
        a.y += a.vy * dt
        const slow = Math.exp(-7 * dt)
        a.vx *= slow
        a.vy *= slow
        const lim = Math.hypot(a.x / (FLOOR.rx - a.r * 0.55), a.y / (FLOOR.ry - a.r * 0.3))
        if (lim > 1) {
          a.x /= lim
          a.y /= lim
          a.vx *= 0.4
          a.vy *= 0.4
        }
      }
    }
    for (let i = bowl.ripples.length - 1; i >= 0; i--) {
      const ripple = bowl.ripples[i]!
      ripple.age += dt
      if (ripple.age > 0.9) bowl.ripples.splice(i, 1)
    }
    if (bowl.ripples.length > 8) bowl.ripples.splice(0, bowl.ripples.length - 8)

    if (ballDough && doughAt === 'bowl') {
      // The ball lies on the floor of the bowl.
      const rx = Math.max(8, FLOOR.rx - ballDough.R * ball.k * 0.62)
      const ry = Math.max(5, FLOOR.ry - ballDough.R * ball.k * 0.36)
      const lim = Math.hypot((ball.x - FLOOR.x) / rx, (ball.y - (FLOOR.y - 2)) / ry)
      if (lim > 1) {
        ball.x = FLOOR.x + (ball.x - FLOOR.x) / lim
        ball.y = FLOOR.y - 2 + (ball.y - (FLOOR.y - 2)) / lim
      }
      ball.k = damp(ball.k, BALL_SCALE, 8, dt)
    }
    if (ballDough && doughAt === 'fly') {
      ball.fly = Math.min(1, ball.fly + dt / 0.5)
      const t = ball.fly * ball.fly * (3 - 2 * ball.fly)
      const toX = BOARD.x + (mainDough ? mainDough.x : 0)
      const toY = BOARD.y + (mainDough ? mainDough.y : 2)
      ball.x = lerp(ball.fromX, toX, t)
      ball.y = lerp(ball.fromY, toY, t) - Math.sin(t * Math.PI) * 70
      ball.k = lerp(ball.fromK, 1, t)
      if (ball.fly >= 1) landOnBoard()
    }
    if (ballDough) stepBlob(ballDough, dt)
  }

  const updateTools = (dt: number) => {
    if (scoop.away && !holding('scoop') && scoop.load > 0 && scoopOverBowl()) {
      // Let go over the bowl: the scoop finishes tipping before it goes home.
      scoop.rot = damp(scoop.rot, 1.05, 9, dt)
      pourScoop(dt)
    } else if (scoop.away && !holding('scoop')) {
      scoop.x = damp(scoop.x, SCOOP_HOME.x, 10, dt)
      scoop.y = damp(scoop.y, SCOOP_HOME.y, 10, dt)
      scoop.rot = damp(scoop.rot, SCOOP_HOME.rot, 10, dt)
      if (dist(scoop.x, scoop.y, SCOOP_HOME.x, SCOOP_HOME.y) < 5) {
        scoop.away = false
        scoop.x = SCOOP_HOME.x
        scoop.y = SCOOP_HOME.y
        scoop.rot = SCOOP_HOME.rot
        if (scoop.load > 0) {
          crock.left += scoop.load
          scoop.load = 0
          shuff(0.6)
        } else {
          knock(0.6, 1.3)
        }
      }
    }
    if (jug.away && !holding('jug')) {
      jug.x = damp(jug.x, JUG_HOME.x, 9, dt)
      jug.y = damp(jug.y, JUG_HOME.y, 9, dt)
      jug.rot = damp(jug.rot, 0, 10, dt)
      if (dist(jug.x, jug.y, JUG_HOME.x, JUG_HOME.y) < 4) {
        jug.away = false
        jug.x = JUG_HOME.x
        jug.y = JUG_HOME.y
        jug.rot = 0
        sfx.tone({ freq: 170, to: 95, dur: 0.12, type: 'sine', vol: 0.13 })
        sfx.tone({ freq: 700, dur: 0.05, type: 'sine', vol: 0.02 })
      }
    }
    if (!holding('spoon') && !ballDough && bowl.clumps.length === 0) {
      spoon.x = damp(spoon.x, SPOON_REST.x, 2, dt)
      spoon.y = damp(spoon.y, SPOON_REST.y, 2, dt)
    }
    // The cloth.
    if (cloth.state === 'toCover') {
      cloth.x = damp(cloth.x, BOARD.x, 10, dt)
      cloth.y = damp(cloth.y, BOARD.y, 10, dt)
      cloth.spread = damp(cloth.spread, 1, 9, dt)
      cloth.lean = damp(cloth.lean, 0, 8, dt)
      if (cloth.spread > 0.985 && dist(cloth.x, cloth.y, BOARD.x, BOARD.y) < 3) {
        cloth.state = 'cover'
        cloth.spread = 1
        cloth.x = BOARD.x
        cloth.y = BOARD.y
      }
    } else if (cloth.state === 'toPeg') {
      cloth.x = damp(cloth.x, PEG.x, 9, dt)
      cloth.y = damp(cloth.y, PEG.y + 96, 9, dt)
      cloth.spread = damp(cloth.spread, 0.16, 9, dt)
      cloth.lean = damp(cloth.lean, 0, 8, dt)
      if (cloth.spread < 0.2 && dist(cloth.x, cloth.y, PEG.x, PEG.y + 96) < 6) {
        cloth.state = 'peg'
        cloth.swingVel += 1.2
      }
    }
    cloth.swingVel += (-cloth.swing * 30 - cloth.swingVel * 2.2) * dt
    cloth.swing += cloth.swingVel * dt
    // The board on its way in and out of the oven.
    if (board.state === 'in') {
      board.slide = Math.min(1, board.slide + dt / 0.7)
      if (board.slide >= 1) {
        board.state = 'oven'
        oven.doorTo = 0
        stage.after(0.3, () => sfx.tone({ freq: 110, to: 70, dur: 0.12, type: 'sine', vol: 0.14 }))
      }
    } else if (board.state === 'back') {
      board.slide = Math.max(0, board.slide - dt / 0.5)
      if (board.slide <= 0) {
        board.state = 'home'
        oven.doorTo = 0
        knock(0.8, 0.8)
      }
    } else if (board.state === 'out') {
      if (oven.door > 0.8) board.slide = Math.max(0, board.slide - dt / 1.1)
      if (board.slide <= 0) {
        board.state = 'home'
        oven.doorTo = 0
        knock(0.9, 0.8)
        const loaf = mainDough
        const done = Math.max(loaf ? loaf.bake : 0, ...pieces.map((piece) => piece.bake))
        if (done > 0.12) {
          board.baked = true
          warm = 1
          callFamily()
          for (let i = 0; i < 9; i++) wisps.push({ x: BOARD.x + (Math.random() - 0.5) * HW * 1.4, y: BOARD.y - 20 + (Math.random() - 0.5) * 60, age: 0, life: 2 + Math.random() * 1.4, size: 18 + Math.random() * 14, phase: Math.random() * TAU })
        }
      }
    }
    oven.door = damp(oven.door, oven.doorTo, 9, dt)
  }

  const updateBoard = (dt: number) => {
    const loaf = mainDough
    const covered = cloth.state === 'cover'
    const baking = board.state === 'oven' && oven.door < 0.3
    if (loaf) {
      loaf.flat = damp(loaf.flat, presses.length > 0 ? 1 : 0, 14, dt)
      stepBlob(loaf, dt)
      loaf.x = damp(loaf.x, 0, 2, dt)
      loaf.y = damp(loaf.y, 2, 2, dt)
      if (covered && !board.baked) loaf.rise = Math.min(1, loaf.rise + dt / RISE_TIME)
      if (baking) loaf.bake = Math.min(1.45, loaf.bake + (loaf.bake < 1 ? dt / 10 : dt / 36))
    }
    for (let i = 0; i < pieces.length; i++) {
      const piece = pieces[i]!
      piece.wobVel += (-piece.wob * 190 - piece.wobVel * 11) * dt
      piece.wob = clamp(piece.wob + piece.wobVel * dt, -0.4, 0.4)
      piece.twist = damp(piece.twist, piece.twistTo, 7, dt)
      if (covered && !board.baked) piece.rise = Math.min(1, piece.rise + dt / RISE_TIME)
      if (baking) piece.bake = Math.min(1.45, piece.bake + (piece.bake < 1 ? dt / 10 : dt / 36))
      if (pieceHeld(piece)) continue
      const s = growth(piece.rise, piece.bake)
      const reach = piece.thick * s
      const rate = Math.min(1, dt * 12)
      for (const node of piece.nodes) {
        // Everything stays on the board.
        const tx = clamp(node.x, -HW + reach + 8, HW - reach - 8)
        const ty = clamp(node.y, -HH + reach * 0.92 + 6, HH - reach * 0.92 - 6)
        node.x += (tx - node.x) * rate
        node.y += (ty - node.y) * rate
        // And out from under the big dough.
        if (loaf) {
          const dx = node.x - loaf.x
          const dy = node.y - loaf.y
          const d = Math.hypot(dx, dy) || 0.01
          const min = radiusAt(loaf, Math.atan2(dy, dx)) * growth(loaf.rise, loaf.bake) + reach * 0.8
          if (d < min) {
            const push = Math.min(min - d, 260 * dt)
            node.x += (dx / d) * push
            node.y += (dy / d) * push
          }
        }
      }
      if (piece.nodes.length === 1) {
        const a = piece.nodes[0]!
        for (let j = 0; j < pieces.length; j++) {
          if (j === i) continue
          const other = pieces[j]!
          if (pieceHeld(other)) continue
          const min = (reach + other.thick * growth(other.rise, other.bake)) * 0.94
          for (const b of other.nodes) {
            const dx = a.x - b.x
            const dy = a.y - b.y
            const d = Math.hypot(dx, dy) || 0.01
            if (d < min) {
              const push = Math.min(min - d, 200 * dt) * (other.nodes.length === 1 ? 0.5 : 1)
              a.x += (dx / d) * push
              a.y += (dy / d) * push
            }
          }
        }
      }
    }
    // The oven is alive while it bakes or stands open.
    if (baking || oven.door > 0.5) {
      oven.crackle -= dt
      if (oven.crackle <= 0) {
        oven.crackle = 0.5 + Math.random() * 1.5
        sfx.noise({ dur: 0.02, freq: 2600 + Math.random() * 1500, vol: 0.028, filter: 'highpass' })
        if (Math.random() < 0.4) sfx.noise({ dur: 0.03, freq: 1800, vol: 0.02, filter: 'highpass', delay: 0.07 })
      }
    }
  }

  const updateFamily = (dt: number) => {
    for (const f of family) {
      f.bite = Math.max(0, f.bite - dt / 0.8)
      f.nod = Math.max(0, f.nod - dt * 2.2)
      for (const waiting of f.queue) waiting.give = Math.min(1, waiting.give + dt / 0.5)
      const piece = f.hold
      if (!piece) continue
      if (piece.give < 1) {
        piece.give = Math.min(1, piece.give + dt / 0.5)
        continue
      }
      f.wait -= dt
      if (f.wait > 0) continue
      f.wait = 1.35 + Math.random() * 0.5
      f.bite = 1
      const bites = clamp(Math.round(piece.mass / 1500), 3, 6)
      piece.eaten += 1 / bites
      sfx.noise({ dur: 0.05, freq: 800, vol: 0.03, filter: 'lowpass', delay: 0.25 })
      sfx.noise({ dur: 0.04, freq: 2400, vol: 0.016, q: 2, delay: 0.25 })
      const point = holdPoint(f)
      juice.burst(point.x, point.y - 10, { count: 3, color: [css(crust(piece.bake, 1).base), '#f6e9cb'], speed: 50, life: 0.5, size: 3, gravity: 500 })
      if (piece.eaten >= 0.999) {
        const next = f.queue.shift() ?? null
        if (next) {
          next.fromX = f.x + f.r * 2.1
          next.fromY = TABLE_Y + 26
          next.give = 0
        }
        f.hold = next
        f.wait = 1.4
      }
    }
    // The ending: all the bread has been handed round and eaten.
    const shared = board.baked && !breadLeft() && familySeated() && family.every((f) => f.hold === null && f.queue.length === 0)
    if (shared && restSince < 0) restSince = stage.time
  }

  const updateAir = (dt: number) => {
    for (let i = grains.length - 1; i >= 0; i--) {
      const grain = grains[i]!
      grain.vy += 900 * dt
      grain.y += grain.vy * dt
      if (grain.y >= grain.toY) {
        grain.y = grain.toY
        landGrain(grain)
        grains.splice(i, 1)
      }
    }
    for (let i = wisps.length - 1; i >= 0; i--) {
      const wisp = wisps[i]!
      wisp.age += dt
      wisp.y -= 26 * dt
      wisp.x += Math.sin(wisp.age * 1.7 + wisp.phase) * 14 * dt
      if (wisp.age >= wisp.life) wisps.splice(i, 1)
    }
    // Warm bread steams, less as it cools.
    if (board.baked && warm > 0.05 && board.state === 'home') {
      warm = Math.max(0, warm - dt / 150)
      wispAcc += dt * warm
      if (wispAcc > 0.34 && wisps.length < 24) {
        wispAcc = 0
        const spots: { x: number; y: number }[] = []
        if (mainDough) spots.push({ x: BOARD.x + mainDough.x, y: BOARD.y + mainDough.y - mainDough.R * 0.4 })
        for (const piece of pieces) {
          const c = pieceCentre(piece)
          spots.push({ x: BOARD.x + c.x, y: BOARD.y + c.y - 16 })
        }
        for (const f of family) if (f.hold && f.hold.give >= 1) spots.push({ x: f.x, y: holdPoint(f).y - 20 })
        if (spots.length > 0) {
          const spot = spots[Math.floor(Math.random() * spots.length)]!
          wisps.push({ x: spot.x + (Math.random() - 0.5) * 30, y: spot.y, age: 0, life: 2.2 + Math.random() * 1.6, size: 13 + Math.random() * 12, phase: Math.random() * TAU })
        }
      }
    }
    cat.twitch = Math.max(0, cat.twitch - dt * 1.4)
    rustle = Math.max(0, rustle - dt * 0.9)

    // The day moves on with the work, never by the clock.
    let to = 0
    if (restSince >= 0) to = 1
    else if (board.baked) to = 0.82
    else if (board.state === 'oven' || board.state === 'in' || board.state === 'out') to = 0.62
    else if (mainDough && (mainDough.rise > 0.02 || cloth.state === 'cover')) to = 0.45
    else if (mainDough) to = 0.28
    else if (bowl.flour > 0 || ballDough) to = 0.12
    light = damp(light, to, 0.45, dt)
  }

  // ------------------------------------------------------------ drawing
  const SKY_MORNING: readonly [RGB, RGB] = [
    [190, 222, 236],
    [247, 238, 214],
  ]
  const SKY_EVENING: readonly [RGB, RGB] = [
    [238, 204, 150],
    [250, 226, 180],
  ]
  const SKY_NIGHT: readonly [RGB, RGB] = [
    [34, 44, 82],
    [70, 84, 122],
  ]
  const LEAVES: readonly (readonly string[])[] = [
    ['#a8c98a', '#bfd89c', '#f3c9d0'],
    ['#6f9c5c', '#86b06a', '#5d8a50'],
    ['#d99a4a', '#c9703c', '#e2b65a'],
    [],
  ]
  const HILLS: readonly (readonly [string, string])[] = [
    ['#b9d6a0', '#9cc487'],
    ['#9cc487', '#7fae6e'],
    ['#d8c07e', '#c2a468'],
    ['#f1f3f2', '#dfe6e8'],
  ]

  let sky: CanvasGradient | null = null
  let skyLight = -1
  let skyNight = -1
  let ovenGlow: CanvasGradient | null = null

  const drawWindow = (g: CanvasRenderingContext2D) => {
    const { x, y, w, h } = WINDOW
    const t = stage.time
    g.save()
    g.beginPath()
    g.rect(x, y, w, h)
    g.clip()
    if (!sky || Math.abs(light - skyLight) > 0.004 || Math.abs(night - skyNight) > 0.004) {
      skyLight = light
      skyNight = night
      sky = g.createLinearGradient(0, y, 0, y + h)
      sky.addColorStop(0, css(mixRgb(mixRgb(SKY_MORNING[0], SKY_EVENING[0], light), SKY_NIGHT[0], night)))
      sky.addColorStop(1, css(mixRgb(mixRgb(SKY_MORNING[1], SKY_EVENING[1], light), SKY_NIGHT[1], night)))
    }
    g.fillStyle = sky
    g.fillRect(x, y, w, h)
    if (night > 0.3) {
      g.fillStyle = `rgba(255,250,225,${(night - 0.3) * 1.2})`
      for (const [sx, sy] of [
        [36, 30],
        [92, 52],
        [150, 24],
        [186, 70],
        [60, 84],
      ] as const) {
        g.beginPath()
        g.arc(x + sx, y + sy, 1.8, 0, TAU)
        g.fill()
      }
    }
    const hills = HILLS[season]!
    g.fillStyle = hills[0]
    g.beginPath()
    g.moveTo(x, y + h)
    g.lineTo(x, y + h * 0.68)
    g.quadraticCurveTo(x + w * 0.3, y + h * 0.5, x + w * 0.62, y + h * 0.7)
    g.quadraticCurveTo(x + w * 0.85, y + h * 0.78, x + w, y + h * 0.66)
    g.lineTo(x + w, y + h)
    g.fill()
    g.fillStyle = hills[1]
    g.beginPath()
    g.moveTo(x, y + h)
    g.lineTo(x, y + h * 0.86)
    g.quadraticCurveTo(x + w * 0.5, y + h * 0.72, x + w, y + h * 0.88)
    g.lineTo(x + w, y + h)
    g.fill()
    // A bough of the apple tree, reaching in from the right.
    const sway = Math.sin(t * 0.7) * 2 + Math.sin(t * 1.9) * rustle * 5
    g.strokeStyle = '#7a5a3c'
    g.lineWidth = 8
    g.beginPath()
    g.moveTo(x + w + 6, y + 20)
    g.quadraticCurveTo(x + w * 0.74, y + 34, x + w * 0.5, y + 62 + sway * 0.5)
    g.stroke()
    g.lineWidth = 4.5
    g.beginPath()
    g.moveTo(x + w * 0.78, y + 34)
    g.quadraticCurveTo(x + w * 0.7, y + 68, x + w * 0.6, y + 96 + sway)
    g.moveTo(x + w * 0.66, y + 44)
    g.quadraticCurveTo(x + w * 0.56, y + 30, x + w * 0.44, y + 28 + sway * 0.6)
    g.stroke()
    const leaves = LEAVES[season]!
    if (leaves.length > 0) {
      for (let i = 0; i < 15; i++) {
        const lx = x + w * (0.4 + ((i * 37) % 60) / 100) + Math.sin(t * 0.8 + i) * (1.5 + rustle * 5)
        const ly = y + 20 + ((i * 53) % 84) + sway * 0.6 + Math.cos(t * 0.9 + i * 2) * (1 + rustle * 3)
        g.fillStyle = leaves[i % leaves.length]!
        g.beginPath()
        g.ellipse(lx, ly, 15, 10, i * 0.9, 0, TAU)
        g.fill()
      }
    } else {
      // Winter: snow along the bough, and a little falling.
      g.strokeStyle = '#ffffff'
      g.lineWidth = 4
      g.beginPath()
      g.moveTo(x + w, y + 15)
      g.quadraticCurveTo(x + w * 0.74, y + 28, x + w * 0.52, y + 56 + sway * 0.5)
      g.stroke()
      g.fillStyle = 'rgba(255,255,255,0.9)'
      for (let i = 0; i < 12; i++) {
        const fx = x + ((i * 61 + Math.sin(t * 0.5 + i) * 12 + 400) % w)
        const fy = y + ((i * 47 + t * (12 + (i % 3) * 5)) % h)
        g.beginPath()
        g.arc(fx, fy, 2.2, 0, TAU)
        g.fill()
      }
    }
    g.restore()

    // Frame, glazing bars and a deep sill.
    g.strokeStyle = 'rgba(96,66,36,0.25)'
    g.lineWidth = 14
    g.strokeRect(x + 2, y + 4, w, h)
    g.strokeStyle = '#b98a54'
    g.lineWidth = 12
    g.strokeRect(x, y, w, h)
    g.lineWidth = 6
    g.beginPath()
    g.moveTo(x + w / 2, y)
    g.lineTo(x + w / 2, y + h)
    g.moveTo(x, y + h * 0.46)
    g.lineTo(x + w, y + h * 0.46)
    g.stroke()
    g.strokeStyle = 'rgba(255,238,205,0.5)'
    g.lineWidth = 2
    g.strokeRect(x - 3, y - 3, w + 6, h + 6)
    g.fillStyle = 'rgba(96,66,36,0.22)'
    g.fillRect(x - 12, y + h + 14, w + 30, 7)
    g.fillStyle = '#c4955c'
    g.strokeStyle = '#94693a'
    g.lineWidth = 2
    g.beginPath()
    g.roundRect(x - 16, y + h + 2, w + 32, 14, 4)
    g.fill()
    g.stroke()

    // The cat, asleep on the sill.
    const cx = x + 66
    const cy = y + h - 12
    const breath = Math.sin(t * 1.1) * 1.3
    g.fillStyle = '#8b7662'
    g.strokeStyle = '#66533f'
    g.lineWidth = 2.2
    g.beginPath()
    g.ellipse(cx + 6, cy - 4 - breath * 0.5, 46, 21 + breath, 0, 0, TAU)
    g.fill()
    g.stroke()
    g.strokeStyle = 'rgba(92,72,54,0.6)'
    g.lineWidth = 3
    for (let i = 0; i < 4; i++) {
      g.beginPath()
      g.moveTo(cx - 4 + i * 13, cy - 23 - breath)
      g.quadraticCurveTo(cx + 2 + i * 13, cy - 13, cx - 2 + i * 13, cy - 5)
      g.stroke()
    }
    // Tail, curled round in front.
    const flick = Math.sin(t * 9) * cat.twitch * 5
    g.strokeStyle = '#66533f'
    g.lineWidth = 11
    g.beginPath()
    g.moveTo(cx + 46, cy - 2)
    g.quadraticCurveTo(cx + 34, cy + 16, cx - 6, cy + 11 + flick)
    g.stroke()
    g.strokeStyle = '#8b7662'
    g.lineWidth = 7
    g.stroke()
    // Head and ears.
    const hx = cx - 32
    const hy = cy - 12
    const ear = cat.twitch * Math.sin(t * 22) * 0.2
    g.fillStyle = '#8b7662'
    g.strokeStyle = '#66533f'
    g.lineWidth = 2.2
    for (const side of [-1, 1]) {
      g.save()
      g.translate(hx + side * 10, hy - 11)
      g.rotate(side * 0.25 + (side === 1 ? ear : 0))
      g.beginPath()
      g.moveTo(-7, 3)
      g.lineTo(0, -12)
      g.lineTo(7, 3)
      g.closePath()
      g.fill()
      g.stroke()
      g.restore()
    }
    g.beginPath()
    g.arc(hx, hy, 16, 0, TAU)
    g.fill()
    g.stroke()
    g.strokeStyle = '#4a3a2c'
    g.lineWidth = 2
    for (const side of [-1, 1]) {
      g.beginPath()
      g.arc(hx + side * 6.5, hy - 1, 3.6, 0.15 * Math.PI, 0.85 * Math.PI)
      g.stroke()
    }
    g.fillStyle = '#c98f86'
    g.beginPath()
    g.ellipse(hx, hy + 5, 2.2, 1.6, 0, 0, TAU)
    g.fill()
  }

  const drawOven = (g: CanvasRenderingContext2D) => {
    const t = stage.time
    const flick = 0.82 + Math.sin(t * 2.3) * 0.07 + Math.sin(t * 3.7 + 1) * 0.05 + Math.sin(t * 7.1) * 0.03
    g.save()
    mouthPath(g)
    g.clip()
    if (!ovenGlow) {
      ovenGlow = g.createRadialGradient(OVEN.x, OVEN.mouthBottom + 6, 12, OVEN.x, OVEN.mouthBottom - 30, 210)
      ovenGlow.addColorStop(0, 'rgba(255,196,96,0.95)')
      ovenGlow.addColorStop(0.45, 'rgba(214,96,40,0.62)')
      ovenGlow.addColorStop(1, 'rgba(90,34,16,0)')
    }
    g.globalAlpha = flick
    g.fillStyle = ovenGlow
    g.fillRect(OVEN.mouthL, OVEN.mouthTop - 10, OVEN.mouthR - OVEN.mouthL, OVEN.mouthBottom - OVEN.mouthTop + 10)
    g.globalAlpha = 1
    // Flames at the back, either side of where the bread goes.
    for (let i = 0; i < 6; i++) {
      const fx = [888, 908, 930, 1070, 1092, 1112][i]!
      const fh = (34 + (i % 3) * 14) * (0.8 + Math.sin(t * (2.1 + i * 0.37) + i * 2) * 0.2)
      const lean = Math.sin(t * 1.7 + i) * 5
      g.fillStyle = i % 2 === 0 ? 'rgba(255,170,60,0.85)' : 'rgba(255,214,110,0.8)'
      g.beginPath()
      g.moveTo(fx - 11, OVEN.mouthBottom - 4)
      g.quadraticCurveTo(fx - 12, OVEN.mouthBottom - fh * 0.5, fx + lean, OVEN.mouthBottom - fh)
      g.quadraticCurveTo(fx + 12, OVEN.mouthBottom - fh * 0.5, fx + 11, OVEN.mouthBottom - 4)
      g.fill()
    }
    // Embers.
    for (let i = 0; i < 12; i++) {
      const ex = OVEN.mouthL + 14 + i * 21
      const ember = 0.5 + Math.sin(t * 1.3 + i * 1.7) * 0.3
      g.fillStyle = `rgba(255,${130 + ember * 70},60,${0.5 + ember * 0.4})`
      g.beginPath()
      g.ellipse(ex, OVEN.mouthBottom - 5, 12, 6, 0, 0, TAU)
      g.fill()
    }
    g.restore()

    // The board, sliding in or baking.
    if (board.slide > 0.3) {
      g.save()
      mouthPath(g)
      g.rect(0, OVEN.mouthBottom - 1, W, H)
      g.clip()
      const at = boardAt()
      drawBoardAt(g, at.x, at.y, at.scale, false)
      if (board.slide > 0.9) {
        // Firelight on the bread.
        g.fillStyle = `rgba(255,150,60,${0.12 * flick})`
        g.fillRect(OVEN.mouthL, OVEN.mouthTop, OVEN.mouthR - OVEN.mouthL, OVEN.mouthBottom - OVEN.mouthTop)
      }
      g.restore()
    }

    // The iron door with its glass, hinged at the bottom.
    const shut = 1 - oven.door
    if (shut > 0.04) {
      g.save()
      g.translate(0, OVEN.mouthBottom)
      g.scale(1, shut)
      g.translate(0, -OVEN.mouthBottom)
      mouthPath(g, 1)
      g.fillStyle = 'rgba(60,40,30,0.16)'
      g.fill()
      g.save()
      mouthPath(g, 1)
      g.clip()
      g.fillStyle = 'rgba(255,255,255,0.09)'
      g.beginPath()
      g.moveTo(900, 280)
      g.lineTo(980, 100)
      g.lineTo(1010, 100)
      g.lineTo(930, 280)
      g.moveTo(1030, 280)
      g.lineTo(1094, 130)
      g.lineTo(1106, 130)
      g.lineTo(1042, 280)
      g.fill()
      g.restore()
      mouthPath(g, 1)
      g.strokeStyle = '#3d3632'
      g.lineWidth = 10
      g.stroke()
      g.strokeStyle = 'rgba(255,255,255,0.14)'
      g.lineWidth = 2
      mouthPath(g, 5)
      g.stroke()
      // The latch.
      g.fillStyle = '#3d3632'
      g.beginPath()
      g.roundRect(OVEN.x - 26, OVEN.mouthTop - 4, 52, 15, 6)
      g.fill()
      g.fillStyle = '#c9a35c'
      g.beginPath()
      g.arc(OVEN.x, OVEN.mouthTop + 3, 6, 0, TAU)
      g.fill()
      g.restore()
    }
    if (oven.door > 0.04) {
      g.fillStyle = '#3d3632'
      g.beginPath()
      g.roundRect(OVEN.mouthL - 6, OVEN.mouthBottom - 3, OVEN.mouthR - OVEN.mouthL + 12, 6 + 14 * oven.door, 5)
      g.fill()
      g.fillStyle = 'rgba(255,190,120,0.28)'
      g.beginPath()
      g.roundRect(OVEN.mouthL + 12, OVEN.mouthBottom + 2, OVEN.mouthR - OVEN.mouthL - 24, 8 * oven.door, 3)
      g.fill()
    }
    // The fire's light on the hearth and the table in front.
    g.fillStyle = `rgba(255,170,80,${0.06 * flick * (0.4 + oven.door * 0.6)})`
    g.beginPath()
    g.ellipse(OVEN.x, TABLE_Y + 30, 190, 50, 0, 0, TAU)
    g.fill()
  }

  const drawBoardAt = (g: CanvasRenderingContext2D, x: number, y: number, scale: number, shadow: boolean) => {
    g.save()
    g.translate(x, y)
    g.scale(scale, scale)
    if (shadow) {
      g.fillStyle = 'rgba(92,58,28,0.2)'
      g.beginPath()
      g.roundRect(-HW + 4, -HH + 14, BOARD.w + 4, BOARD.h + 4, 32)
      g.fill()
    }
    drawSprite(g, boardSprite, 0, 0)
    for (const speck of board.specks) {
      if (speck.kind === 3) {
        g.fillStyle = '#d9b47a'
        g.beginPath()
        g.arc(speck.x, speck.y, 1.6 + (speck.rot % 1.4), 0, TAU)
        g.fill()
      } else {
        seedShape(g, speck.x, speck.y, speck.kind, speck.rot)
      }
    }
    const loaf = mainDough
    const breath = loaf && !board.baked ? Math.sin(stage.time * 1.3) * 0.007 : 0
    // Things farther back are drawn first.
    for (const piece of pieces) {
      if (pieceHeld(piece) || (loaf && pieceCentre(piece).y > loaf.y)) continue
      drawPiece(g, piece)
    }
    if (loaf) drawBlob(g, loaf, loaf.x, loaf.y, presses, breath)
    for (const piece of pieces) {
      if (pieceHeld(piece) || !loaf || pieceCentre(piece).y <= loaf.y) continue
      drawPiece(g, piece)
    }
    g.restore()
  }

  const drawClothSpread = (g: CanvasRenderingContext2D) => {
    const k = cloth.spread
    const flutter = cloth.state === 'held' ? Math.sin(stage.time * 7) * 0.02 : 0
    g.save()
    g.translate(cloth.x, cloth.y)
    g.rotate(cloth.lean * 0.5)
    g.scale(k, k * (1 + flutter))
    if (cloth.state !== 'cover') {
      g.fillStyle = 'rgba(92,58,28,0.14)'
      g.beginPath()
      g.roundRect(-CLOTH.w / 2 + 16, -CLOTH.h / 2 + 30, CLOTH.w, CLOTH.h, 30)
      g.fill()
    }
    drawSprite(g, clothSprite, 0, 0)
    if (cloth.state === 'cover' || cloth.state === 'toCover') {
      // The dough shows through as soft mounds, which grow as it rises.
      const lump = (lx: number, ly: number, r: number) => {
        // Only shade and light, so the weave and the stripes run on over it.
        g.fillStyle = 'rgba(128,104,70,0.17)'
        g.beginPath()
        g.ellipse(lx + r * 0.14, ly + r * 0.22, r * 1.08, r, 0, 0, TAU)
        g.fill()
        g.fillStyle = 'rgba(248,243,230,0.34)'
        g.beginPath()
        g.ellipse(lx - r * 0.03, ly - r * 0.05, r, r * 0.92, 0, 0, TAU)
        g.fill()
        g.fillStyle = 'rgba(255,255,252,0.34)'
        g.beginPath()
        g.ellipse(lx - r * 0.24, ly - r * 0.3, r * 0.56, r * 0.36, -0.4, 0, TAU)
        g.fill()
      }
      const loaf = mainDough
      if (loaf) lump(loaf.x, loaf.y - 4 - loaf.rise * 6, loaf.R * growth(loaf.rise, 0) * 0.96)
      for (const piece of pieces) {
        const r = piece.thick * growth(piece.rise, 0)
        const step = piece.nodes.length === 1 ? 1 : 2
        for (let n = 0; n < piece.nodes.length; n += step) lump(piece.nodes[n]!.x, piece.nodes[n]!.y - 2 - piece.rise * 3, r * 1.04)
      }
    }
    g.restore()
  }

  const drawBowlContents = (g: CanvasRenderingContext2D) => {
    g.save()
    g.beginPath()
    g.ellipse(BOWL.x, BOWL.y, BOWL.rx - 10, BOWL.ry - 8, 0, 0, TAU)
    g.clip()
    if (bowl.smear) {
      // What the dough left behind.
      g.fillStyle = 'rgba(242,229,201,0.5)'
      for (let i = 0; i < 6; i++) {
        g.beginPath()
        g.ellipse(FLOOR.x + Math.cos(i * 2.3) * 58, FLOOR.y + Math.sin(i * 2.3) * 26, 20 + (i % 3) * 7, 6 + (i % 2) * 3, i * 1.1, 0, TAU)
        g.fill()
      }
    }
    const pool = Math.sqrt(clamp(bowl.water, 0, 1)) * (1 - bowl.mix * 0.92)
    if (pool > 0.03) {
      g.fillStyle = 'rgba(178,210,226,0.78)'
      g.beginPath()
      g.ellipse(FLOOR.x, FLOOR.y + 2, FLOOR.rx * pool * 1.04, FLOOR.ry * pool * 1.02, 0, 0, TAU)
      g.fill()
      g.strokeStyle = 'rgba(255,255,255,0.6)'
      g.lineWidth = 2.4
      g.beginPath()
      g.ellipse(FLOOR.x - 6, FLOOR.y - 2, FLOOR.rx * pool * 0.78, FLOOR.ry * pool * 0.7, 0, Math.PI * 1.08, Math.PI * 1.5)
      g.stroke()
      for (const ripple of bowl.ripples) {
        const a = ripple.age / 0.9
        g.strokeStyle = `rgba(255,255,255,${0.55 * (1 - a)})`
        g.lineWidth = 2
        g.beginPath()
        g.ellipse(ripple.x, ripple.y, 8 + a * 34, 4 + a * 17, 0, 0, TAU)
        g.stroke()
      }
    }
    if (bowl.clumps.length > 0) {
      const flour: RGB = [250, 245, 233]
      const wetDough: RGB = [238, 223, 190]
      const body = mixRgb(flour, wetDough, bowl.mix)
      const line = mixRgb([226, 214, 190], [196, 170, 128], bowl.mix)
      const order = bowl.clumps.sort((a, b) => a.y - b.y)
      // Drawn as one heap: all the shadows, all the edges, then all the
      // bodies, so the lumps run together like flour does.
      const swell = 1 + bowl.mix * 0.22
      g.fillStyle = 'rgba(92,58,28,0.16)'
      for (const clump of order) {
        g.beginPath()
        g.ellipse(FLOOR.x + clump.x + 3, FLOOR.y + clump.y + 9, clump.r * swell * 1.04, clump.r * swell * 0.72, 0, 0, TAU)
        g.fill()
      }
      g.fillStyle = css(line)
      for (const clump of order) {
        g.beginPath()
        g.ellipse(FLOOR.x + clump.x, FLOOR.y + clump.y, clump.r * swell + 2.2, clump.r * swell * 0.74 + 2.2, Math.sin(clump.phase) * 0.3, 0, TAU)
        g.fill()
      }
      g.fillStyle = css(body)
      for (const clump of order) {
        g.beginPath()
        g.ellipse(FLOOR.x + clump.x, FLOOR.y + clump.y, clump.r * swell, clump.r * swell * 0.74, Math.sin(clump.phase) * 0.3, 0, TAU)
        g.fill()
      }
      // Soft light on the top of each lump, and a little shade below.
      g.fillStyle = css(mixRgb([236, 226, 204], [214, 194, 156], bowl.mix), 0.55)
      for (const clump of order) {
        g.beginPath()
        g.ellipse(FLOOR.x + clump.x + clump.r * 0.1, FLOOR.y + clump.y + clump.r * 0.3, clump.r * swell * 0.7, clump.r * swell * 0.26, 0.1, 0, TAU)
        g.fill()
      }
      g.fillStyle = `rgba(255,255,255,${0.55 - bowl.mix * 0.25})`
      for (const clump of order) {
        g.beginPath()
        g.ellipse(FLOOR.x + clump.x - clump.r * 0.18, FLOOR.y + clump.y - clump.r * 0.24, clump.r * 0.56, clump.r * 0.26, -0.3, 0, TAU)
        g.fill()
      }
      if (bowl.mix > 0.05 && bowl.mix < 1) {
        // Wet streaks where the water is going in.
        g.fillStyle = `rgba(206,184,142,${0.5 * Math.sin(bowl.mix * Math.PI)})`
        for (const clump of order) {
          g.beginPath()
          g.ellipse(FLOOR.x + clump.x + Math.cos(clump.phase) * clump.r * 0.3, FLOOR.y + clump.y + Math.sin(clump.phase) * clump.r * 0.2, clump.r * 0.34, clump.r * 0.16, clump.phase, 0, TAU)
          g.fill()
        }
      }
    }
    g.restore()
  }

  const drawBall = (g: CanvasRenderingContext2D) => {
    if (!ballDough) return
    g.save()
    g.translate(ball.x, ball.y)
    g.scale(ball.k, ball.k)
    drawBlob(g, ballDough, 0, 0, [], Math.sin(stage.time * 1.3) * 0.008)
    g.restore()
  }

  const drawSpoon = (g: CanvasRenderingContext2D) => {
    const angle = -1.02 + ((spoon.x - BOWL.x) / BOWL.rx) * 0.3
    g.fillStyle = 'rgba(70,44,22,0.18)'
    g.beginPath()
    g.ellipse(spoon.x + 4, spoon.y + 6, 28, 16, 0, 0, TAU)
    g.fill()
    drawSprite(g, spoonSprite, spoon.x, spoon.y, angle)
  }

  const drawScoop = (g: CanvasRenderingContext2D) => {
    g.save()
    g.translate(scoop.x, scoop.y)
    g.rotate(scoop.rot)
    g.scale(-1, 1)
    drawSprite(g, scoopSprite, 0, 0)
    if (scoop.load > 0.02) {
      const heap = scoop.load
      g.fillStyle = '#faf5e9'
      g.strokeStyle = '#e0d5be'
      g.lineWidth = 2
      g.beginPath()
      g.moveTo(-39, -8)
      g.quadraticCurveTo(-20, -12 - heap * 34, 4, -12 - heap * 30)
      g.quadraticCurveTo(26, -12 - heap * 30, 44, -10)
      g.quadraticCurveTo(2, -1, -39, -8)
      g.closePath()
      g.fill()
      g.stroke()
      g.fillStyle = 'rgba(255,255,255,0.7)'
      g.beginPath()
      g.ellipse(-6, -12 - heap * 20, 14, 5 * heap + 1, -0.2, 0, TAU)
      g.fill()
    }
    g.restore()
  }

  const drawCrock = (g: CanvasRenderingContext2D) => {
    const mx = CROCK.x
    const my = CROCK.y - 132
    g.fillStyle = 'rgba(92,58,28,0.2)'
    g.beginPath()
    g.ellipse(CROCK.x + 8, CROCK.y - 4, 74, 18, 0, 0, TAU)
    g.fill()
    drawSprite(g, crockSprite, CROCK.x, CROCK.y)
    g.fillStyle = '#8a775c'
    g.beginPath()
    g.ellipse(mx, my, 62, 20, 0, 0, TAU)
    g.fill()
    const level = clamp(crock.left / 3, 0, 1)
    g.save()
    g.beginPath()
    g.ellipse(mx, my, 62, 20, 0, 0, TAU)
    g.clip()
    if (level > 0.01) {
      g.fillStyle = '#faf5e9'
      g.beginPath()
      g.ellipse(mx, my + 8 + (1 - level) * 15, 62 - (1 - level) * 6, 19, 0, 0, TAU)
      g.fill()
      g.fillStyle = 'rgba(214,202,178,0.6)'
      g.beginPath()
      g.ellipse(mx + 14, my + 14 + (1 - level) * 15, 34, 9, 0.1, 0, TAU)
      g.fill()
    } else {
      // The last dusting on the bottom.
      g.fillStyle = 'rgba(250,245,233,0.35)'
      g.beginPath()
      g.ellipse(mx - 6, my + 12, 30, 6, 0, 0, TAU)
      g.fill()
    }
    g.restore()
    if (!scoop.away) {
      // The scoop stands in the crock; its bowl is down in the flour.
      g.save()
      g.beginPath()
      g.rect(mx - 140, my - 240, 280, 240)
      g.ellipse(mx, my, 62, 20, 0, 0, TAU)
      g.clip()
      drawScoop(g)
      g.restore()
    }
    g.strokeStyle = '#b7a481'
    g.lineWidth = 6
    g.beginPath()
    g.ellipse(mx, my, 64, 22, 0, 0, TAU)
    g.stroke()
    g.strokeStyle = '#efe6d3'
    g.lineWidth = 3
    g.beginPath()
    g.ellipse(mx, my - 1, 64, 22, 0, 0, TAU)
    g.stroke()
  }

  const drawJug = (g: CanvasRenderingContext2D) => {
    if (!jug.away) {
      g.fillStyle = 'rgba(92,58,28,0.2)'
      g.beginPath()
      g.ellipse(JUG.x + 8, JUG.y - 2, 60, 15, 0, 0, TAU)
      g.fill()
    }
    drawSprite(g, jugSprite, jug.x, jug.y, jug.rot)
    if (jug.water > 0.02) {
      g.save()
      g.translate(jug.x, jug.y)
      g.rotate(jug.rot)
      g.fillStyle = 'rgba(206,228,238,0.9)'
      g.beginPath()
      g.ellipse(4, -76, 29, 6, -0.08, 0, TAU)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.8)'
      g.beginPath()
      g.ellipse(-6, -77, 10, 2, -0.08, 0, TAU)
      g.fill()
      g.restore()
    }
    if (jug.pouring) {
      // Water falls from the lip in one wavering thread.
      const c = Math.cos(jug.rot)
      const s = Math.sin(jug.rot)
      const tx = jug.x + 54 * c + 84 * s
      const ty = jug.y + 54 * s - 84 * c
      const wob = Math.sin(stage.time * 31) * 2.2
      const path = () => {
        g.beginPath()
        g.moveTo(tx, ty)
        g.bezierCurveTo(tx + 14, ty + 6, jug.landX + wob, ty + 50, jug.landX, FLOOR.y - 4)
      }
      path()
      g.strokeStyle = 'rgba(178,212,228,0.9)'
      g.lineWidth = 9
      g.stroke()
      path()
      g.strokeStyle = 'rgba(255,255,255,0.75)'
      g.lineWidth = 3
      g.stroke()
    }
  }

  const drawPinch = (g: CanvasRenderingContext2D, hold: Extract<Hold, { kind: 'pinch' }>, p: Pointer) => {
    for (let i = 0; i < hold.left; i++) {
      const a = i * 2.4
      const d = 4 + (i % 4) * 3.4
      const x = p.x + Math.cos(a) * d
      const y = p.y - 38 + Math.sin(a) * d * 0.6
      if (hold.salt) {
        g.fillStyle = i % 2 === 0 ? '#ffffff' : '#ece6d8'
        g.beginPath()
        g.arc(x, y, 2.4, 0, TAU)
        g.fill()
      } else {
        seedShape(g, x, y, i % 3, a, 1.2)
      }
    }
  }

  // A soft gleam on whatever comes next: the material inviting, no more.
  const invite = (): { x: number; y: number } | null => {
    if (night > 0 || holds.size > 0 || stage.time - lastTouch < 6) return null
    if (restSince >= 0) return { x: BOWL.x - 86, y: BOWL.y - 58 }
    if (board.baked) return null
    if (board.state === 'oven') {
      const done = Math.max(mainDough ? mainDough.bake : 0, ...pieces.map((piece) => piece.bake))
      return done > 0.85 ? { x: OVEN.x - 50, y: OVEN.mouthTop + 40 } : null
    }
    if (board.state !== 'home') return null
    if (mainDough) {
      if (mainDough.work < READY) return { x: BOARD.x + mainDough.x - mainDough.R * 0.3, y: BOARD.y + mainDough.y - mainDough.R * 0.42 }
      if (cloth.state === 'peg' && mainDough.rise < 0.05) return { x: PEG.x - 18, y: PEG.y + 70 }
      if (cloth.state === 'cover') return mainDough.rise >= 1 ? { x: BOARD.x - HW + 40, y: BOARD.y - HH + 20 } : null
      return { x: BOARD.x + HW + 46, y: BOARD.y - 8 }
    }
    if (ballDough) return doughAt === 'bowl' ? { x: ball.x - 18, y: ball.y - ballDough.R * ball.k * 0.45 } : null
    if (bowl.flour < 0.5) return crock.left > 0.02 ? { x: CROCK.x - 30, y: CROCK.y - 210 } : null
    if (bowl.water < 0.12) return jug.water > 0.02 ? { x: JUG.x - 30, y: JUG.y - 96 } : null
    return { x: spoon.x + 84, y: spoon.y - 128 }
  }

  const drawGleam = (g: CanvasRenderingContext2D, x: number, y: number) => {
    const pulse = Math.sin(stage.time * 1.5) * 0.5 + 0.5
    const a = pulse * pulse * 0.7
    if (a < 0.02) return
    g.save()
    g.translate(x, y)
    g.rotate(-0.6)
    g.fillStyle = `rgba(255,253,240,${a * 0.5})`
    g.beginPath()
    g.ellipse(0, 0, 26, 9, 0, 0, TAU)
    g.fill()
    g.fillStyle = `rgba(255,255,255,${a})`
    g.beginPath()
    g.ellipse(0, 0, 15, 4.5, 0, 0, TAU)
    g.fill()
    g.restore()
  }

  const drawGiven = (g: CanvasRenderingContext2D, piece: Piece, toX: number, toY: number, small: number) => {
    const c = pieceCentre(piece)
    const t = piece.give * piece.give * (3 - 2 * piece.give)
    const fit = Math.min(1, 44 / pieceReach(piece)) * small
    const k = lerp(1, fit * (1 - piece.eaten * 0.7), t)
    const x = lerp(piece.fromX, toX, t)
    const y = lerp(piece.fromY, toY, t) - Math.sin(t * Math.PI) * 40
    g.save()
    g.translate(x, y)
    g.scale(k, k)
    g.translate(-c.x, -c.y)
    drawPiece(g, piece)
    g.restore()
  }

  return {
    update(dt) {
      updateHolds(dt)
      updateTools(dt)
      updateBowl(dt)
      updateBoard(dt)
      updateFamily(dt)
      updateAir(dt)
    },

    draw(g) {
      const t = stage.time
      g.drawImage(backdrop, 0, 0, W, H)
      drawWindow(g)

      // The cloth on its peg, stirring a little.
      if (cloth.state === 'peg') drawSprite(g, hungSprite, PEG.x, PEG.y, Math.sin(t * 0.8) * 0.012 + cloth.swing * 0.12)

      drawOven(g)

      // The family, behind the table.
      if (family[0]!.here > 0 || family[1]!.here > 0 || family[2]!.here > 0) {
        g.save()
        g.beginPath()
        g.rect(0, 0, W, TABLE_Y - 1)
        g.clip()
        for (const f of family) drawFigure(g, f, t)
        g.restore()
        for (const f of family) {
          if (f.hold && f.hold.give >= 1) {
            const point = holdPoint(f)
            drawGiven(g, f.hold, point.x, point.y, 1)
          }
          drawHands(g, f)
          f.queue.forEach((piece, i) => {
            if (piece.give >= 1) drawGiven(g, piece, f.x + f.r * 2.1 + i * 26, TABLE_Y + 26, 0.62)
          })
        }
      }

      // Morning light through the window, lying across the table.
      const sun = (0.15 - light * 0.03) * (1 - night)
      if (sun > 0.004) {
        const shift = light * 170
        g.fillStyle = `rgba(255,${(248 - light * 24) | 0},${(216 - light * 56) | 0},${sun})`
        for (let row = 0; row < 2; row++) {
          for (let col = 0; col < 2; col++) {
            const x0 = 168 + shift + col * 124 + row * 52
            const y0 = 366 + row * 88
            g.beginPath()
            g.moveTo(x0, y0)
            g.lineTo(x0 + 110, y0)
            g.lineTo(x0 + 110 + 46, y0 + 78)
            g.lineTo(x0 + 46, y0 + 78)
            g.closePath()
            g.fill()
          }
        }
        g.fillStyle = `rgba(255,252,236,${0.5 * (1 - night)})`
        for (let i = 0; i < 9; i++) {
          g.beginPath()
          g.arc(150 + shift + i * 34 + Math.sin(t * 0.3 + i * 1.7) * 22, 250 + ((i * 53 + t * 5) % 120), 1.5, 0, TAU)
          g.fill()
        }
      }
      if (tableSpecks.length > 0) {
        // Whatever was spilt stays where it fell.
        g.fillStyle = 'rgba(255,252,243,0.8)'
        g.beginPath()
        for (const speck of tableSpecks) {
          if (speck.kind < 4) continue
          const r = speck.kind === 5 ? 1.5 : 1 + (speck.rot % 2)
          g.moveTo(speck.x + r, speck.y)
          g.arc(speck.x, speck.y, r, 0, TAU)
        }
        g.fill()
        for (const speck of tableSpecks) if (speck.kind < 4) seedShape(g, speck.x, speck.y, speck.kind, speck.rot)
      }
      if (!warmed) {
        // Touch the sprites that are not on screen yet, so their first real
        // use does not cost a long frame.
        warmed = true
        g.globalAlpha = 0.004
        drawSprite(g, clothSprite, W / 2, H / 2)
        drawSprite(g, puffSprite, W / 2, H / 2)
        g.globalAlpha = 1
      }

      // The back of the table: crock, salt, seeds.
      drawCrock(g)
      for (const [dish, at] of [
        [saltSprite, SALT],
        [seedSprite, SEEDS],
      ] as const) {
        g.fillStyle = 'rgba(92,58,28,0.2)'
        g.beginPath()
        g.ellipse(at.x + 5, at.y + 30, 46, 11, 0, 0, TAU)
        g.fill()
        drawSprite(g, dish, at.x, at.y)
      }

      // The mixing bowl.
      g.fillStyle = 'rgba(92,58,28,0.2)'
      g.beginPath()
      g.ellipse(BOWL.x + 10, BOWL.y + 112, 112, 22, 0, 0, TAU)
      g.fill()
      drawSprite(g, bowlSprite, BOWL.x, BOWL.y)
      drawBowlContents(g)
      if (ballDough && doughAt === 'bowl') drawBall(g)
      drawSpoon(g)
      // The near rim, over whatever is inside.
      g.strokeStyle = '#7f552f'
      g.lineWidth = 2.6
      g.beginPath()
      g.ellipse(BOWL.x, BOWL.y, BOWL.rx, BOWL.ry, 0, 0, Math.PI)
      g.stroke()
      g.strokeStyle = '#dbaa72'
      g.lineWidth = 6
      g.beginPath()
      g.ellipse(BOWL.x, BOWL.y, BOWL.rx - 5, BOWL.ry - 4, 0, 0.06 * Math.PI, 0.94 * Math.PI)
      g.stroke()

      // The board, when it is on the table.
      if (board.slide <= 0.3) {
        const at = boardAt()
        drawBoardAt(g, at.x, at.y, at.scale, true)
      }
      if (cloth.state !== 'peg' && cloth.state !== 'held') drawClothSpread(g)
      drawJug(g)

      // In the hand: over everything.
      if (cloth.state === 'held') drawClothSpread(g)
      if (ballDough && (doughAt === 'hand' || doughAt === 'fly')) drawBall(g)
      if (scoop.away) drawScoop(g)
      const at = boardAt()
      for (const [id, hold] of holds) {
        if (hold.kind === 'pinch') {
          const p = stage.pointers.get(id)
          if (p) drawPinch(g, hold, p)
        } else if ((hold.kind === 'piece' || hold.kind === 'draw') && pieces.includes(hold.piece)) {
          g.save()
          g.translate(at.x, at.y)
          drawPiece(g, hold.piece)
          g.restore()
        }
      }
      for (const f of family) {
        if (f.hold && f.hold.give < 1) {
          const point = holdPoint(f)
          drawGiven(g, f.hold, point.x, point.y, 1)
        }
        f.queue.forEach((piece, i) => {
          if (piece.give < 1) drawGiven(g, piece, f.x + f.r * 2.1 + i * 26, TABLE_Y + 26, 0.62)
        })
      }
      for (const grain of grains) {
        if (grain.salt) {
          g.fillStyle = '#ffffff'
          g.beginPath()
          g.arc(grain.x, grain.y, 2.2, 0, TAU)
          g.fill()
        } else {
          seedShape(g, grain.x, grain.y, grain.kind, grain.rot, 1.15)
        }
      }
      for (const wisp of wisps) {
        const a = wisp.age / wisp.life
        g.globalAlpha = 0.5 * Math.sin(a * Math.PI)
        const wide = (wisp.size * (0.9 + a * 1.1)) / 30
        drawSprite(g, puffSprite, wisp.x, wisp.y, Math.sin(wisp.phase + a * 2) * 0.5, wide, wide * 1.7)
      }
      g.globalAlpha = 1

      // The colour of the hour.
      if (light > 0.01) {
        g.fillStyle = `rgba(255,170,90,${0.1 * light})`
        g.fillRect(0, 0, W, H)
      }
      const gleam = invite()
      if (gleam) drawGleam(g, gleam.x, gleam.y)
      if (night > 0.004) {
        g.fillStyle = `rgba(26,32,64,${0.66 * night})`
        g.fillRect(0, 0, W, H)
      }
    },

    down(p) {
      lastTouch = stage.time
      if (night > 0) {
        softTap(p.x, p.y)
        return
      }
      const hold = pick(p)
      if (!holds.has(p.id)) holds.set(p.id, hold)
    },

    move() {
      lastTouch = stage.time
    },

    up(p) {
      lastTouch = stage.time
      const hold = holds.get(p.id)
      holds.delete(p.id)
      if (hold) release(p, hold)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'bread-day',
    name: 'Bread Day',
    emoji: '🍞',
    ages: [3, 7],
    pitch: 'Bake bread from the beginning: scoop flour, pour water, stir, knead the dough, shape rolls, let them rise, bake them in the wood oven and share them warm.',
    howTo: 'Drag the scoop and the jug to the bowl, then stir. Drag the dough onto the board and push it about; once it is smooth, pull pieces off. Drag the cloth over it, then slide the board into the oven by its handle. Tap the oven to take the bread out and hand it round. The empty bowl begins a new day.',
    basedOn: 'Waldorf kindergarten baking day; Montessori practical life (food preparation: scooping, pouring, kneading)',
    whyFun: 'The dough is soft and heavy under the finger: it dents, bulges, stretches to a neck and wobbles back, and gets smoother the more it is worked.',
    set: 'gentle',
  },
  create,
}
