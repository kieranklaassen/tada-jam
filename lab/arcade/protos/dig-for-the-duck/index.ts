// Dig for the Duck: rub tunnels through a cross-section of earth so the pond
// water pours down into the bathtub and floats the rubber duck. The water is a
// small cellular automaton (8 pixel cells); the dirt is a full-resolution
// canvas that the finger erases, so tunnels are round and the water reads wet.

import { blinkAt, circle, ellipse, face, hint, label, rrect, sprite, squash, star, volume } from '../../kit/draw.ts'
import { clamp, damp, dist, ease, lerp, rnd, spring, TAU } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'

const CS = 8
const COLS = Math.ceil(W / CS)
const ROWS = Math.ceil(H / CS)
const GROUND = 14
const GY = GROUND * CS
const BED = 96
const BY = BED * CS

const EMPTY = 0
const DIRT = 1
const MUD = 2
const ROCK = 3
const TUBC = 4
const SPONGE = 5

const TUB_W = 40
const TUB_H = 11
const TUB_TOP = BED - 1 - TUB_H
const TUB_CELLS = TUB_W * TUB_H
const CAVE_TOP = 72 * CS
const DIG_R = 30
const SPONGE_CAP = 130
const MAX_WATER = 5000
const HUD_X = 74

const RIM = '#55331a'
const RIM_MUD = '#2e1c10'

interface Circle {
  x: number
  y: number
  r: number
}

interface Pond {
  col: number
  half: number
  depth: number
  cells: number[]
  full: number
  have: number
  boost: number
  rainAcc: number
  bounce: Spring
}

interface RockFace extends Circle {
  grump: number
}

interface Treasure {
  x: number
  y: number
  char: string
  size: number
  value: number
  chest: boolean
  // 0 buried, 1 popping out, 2 collected.
  state: number
  t: number
  phase: number
}

interface SpongeBlock {
  c0: number
  r0: number
  w: number
  h: number
  absorbed: number
  cooldown: number
  squeeze: number
  around: number[]
  sq: Spring
}

interface Mole {
  x: number
  y: number
  a: number
  turn: number
  pause: number
  dash: number
  lastX: number
  lastY: number
  hop: Spring
  wow: number
}

interface Bubble {
  x: number
  y: number
  r: number
  vy: number
  phase: number
  life: number
}

interface Config {
  ponds: number[]
  half: number
  depth: number
  tub: number
  slab: { x1: number; x2: number; y: number } | null
  boulders: number
  mud: { x: number; y: number; rx: number; ry: number } | null
  sponge: { c: number; r: number } | null
  mole: boolean
  chest: boolean
  treasures: number
}

const FINDS = ['💎', '💎', '💎', '🦴', '🪙', '🪙', '🥾', '🧦', '🦷', '🗝️', '🏺']

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const cell = new Uint8Array(COLS * ROWS)
  const water = new Uint8Array(COLS * ROWS)

  const makeCanvas = (): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const c = document.createElement('canvas')
    c.width = W
    c.height = H
    return [c, c.getContext('2d')!]
  }
  const [bgC, bg] = makeCanvas()
  const [dirtC, d] = makeCanvas()
  const [rockC, rk] = makeCanvas()
  const [snapC, snap] = makeCanvas()

  const MS = 2
  const MW = COLS * MS
  const MH = ROWS * MS
  const small = (w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] => {
    const c = document.createElement('canvas')
    c.width = w
    c.height = h
    return [c, c.getContext('2d')!]
  }
  const [lowMainC, lowMain] = small(COLS, ROWS)
  const [midMainC, midMain] = small(MW, MH)
  const mainData = lowMain.createImageData(COLS, ROWS)

  const rr = (a: number, b: number) => a + stage.rand() * (b - a)

  // ---- level state -------------------------------------------------------
  let level = 0
  let ponds: Pond[] = []
  let tubX0 = 0
  let tubCx = 0
  let caveL = 0
  let caveR = 0
  let rocks: Circle[] = []
  let rockFaces: RockFace[] = []
  let treasures: Treasure[] = []
  let sponge: SpongeBlock | null = null
  let mole: Mole | null = null
  let hasMud = false
  let bubbles: Bubble[] = []
  let foam: { x: number; r: number; grow: number }[] = []

  let won = false
  let wonAt = 0
  let slide = 1
  let tubCount = 0
  let tubDirty = 0
  let surfaceY = BY - CS
  let gotFirstWater = false

  // ---- session state -----------------------------------------------------
  let ducks = 0
  let gems = 0
  let findStreak = 0
  const hudDuck = spring(1, 260, 9)
  const hudGem = spring(1, 260, 9)
  let lastTouchAt = -3
  let everTouched = false
  let lastDigSound = -1
  let lastTink = -1
  let lastSplash = -1
  let lastTrickle = 0
  let lastPop = 0
  let popStep = 0
  let flow = 0
  let gushing = false
  let simAcc = 0
  let tick = 0
  let seed = 9731
  let waterTotal = 0
  let frame = 0

  const duck = { x: 0, y: 0, flip: 1, sq: spring(1, 240, 9), quack: 0, wing: 0 }

  // ---- static backdrop ---------------------------------------------------
  const paintBackdrop = () => {
    const sky = bg.createLinearGradient(0, 0, 0, GY + 10)
    sky.addColorStop(0, '#6fcbff')
    sky.addColorStop(1, '#d7f5ff')
    bg.fillStyle = sky
    bg.fillRect(0, 0, W, GY + 10)
    ellipse(bg, 220, GY + 30, 330, 70, '#9fdc8a')
    ellipse(bg, 800, GY + 40, 420, 90, '#8fd27c')
    ellipse(bg, 1120, GY + 30, 200, 60, '#9fdc8a')
    // Underground: what shows through a tunnel.
    const cave = bg.createLinearGradient(0, GY, 0, H)
    cave.addColorStop(0, '#4a2f1c')
    cave.addColorStop(1, '#2a1a12')
    bg.fillStyle = cave
    bg.fillRect(0, GY + 8, W, H - GY)
    for (let i = 0; i < 260; i++) {
      const x = Math.random() * W
      const y = GY + 12 + Math.random() * (H - GY)
      ellipse(bg, x, y, rnd(6, 22), rnd(4, 10), Math.random() < 0.5 ? 'rgba(0,0,0,0.16)' : 'rgba(255,210,160,0.05)', rnd(-0.4, 0.4))
    }
  }
  paintBackdrop()

  // ---- geometry helpers --------------------------------------------------
  const inCave = (px: number, py: number): boolean => {
    if (px < caveL || px > caveR || py < CAVE_TOP || py >= BY) return false
    const rad = 90
    if (py < CAVE_TOP + rad) {
      if (px < caveL + rad) return dist(px, py, caveL + rad, CAVE_TOP + rad) < rad
      if (px > caveR - rad) return dist(px, py, caveR - rad, CAVE_TOP + rad) < rad
    }
    return true
  }

  const inPond = (p: Pond, px: number, py: number, margin: number): boolean => {
    const ex = (px - p.col * CS) / (p.half * CS + margin)
    const ey = (py - GY) / (p.depth * CS + margin)
    return ex * ex + ey * ey < 1
  }

  // Too close to a pond or to the tub's cave for an obstacle to sit there.
  const blocked = (px: number, py: number, margin: number): boolean => {
    for (const p of ponds) if (inPond(p, px, py, margin)) return true
    return px > caveL - margin && px < caveR + margin && py > CAVE_TOP - margin
  }

  const eraseCircle = (x: number, y: number, r: number, rim: string) => {
    d.globalCompositeOperation = 'source-atop'
    d.fillStyle = rim
    d.beginPath()
    d.arc(x, y, r + 4, 0, TAU)
    d.fill()
    d.globalCompositeOperation = 'destination-out'
    d.beginPath()
    d.arc(x, y, r - 1, 0, TAU)
    d.fill()
    d.globalCompositeOperation = 'source-over'
  }

  // ---- level configs -----------------------------------------------------
  const config = (n: number): Config => {
    if (n === 0) return { ponds: [46], half: 25, depth: 14, tub: 96, slab: null, boulders: 0, mud: null, sponge: null, mole: false, chest: false, treasures: 4 }
    if (n === 1) return { ponds: [104], half: 25, depth: 14, tub: 40, slab: { x1: 420, x2: 760, y: 420 }, boulders: 2, mud: null, sponge: null, mole: true, chest: true, treasures: 4 }
    if (n === 2) return { ponds: [74], half: 25, depth: 14, tub: 74, slab: null, boulders: 2, mud: { x: 592, y: 340, rx: 215, ry: 44 }, sponge: { c: 69, r: 56 }, mole: false, chest: false, treasures: 5 }
    if (n === 3) return { ponds: [32, 112], half: 19, depth: 13, tub: 74, slab: { x1: 410, x2: 775, y: 515 }, boulders: 1, mud: { x: 300, y: 400, rx: 90, ry: 70 }, sponge: null, mole: true, chest: true, treasures: 5 }
    const two = stage.rand() < 0.4
    const pondCols = two ? [Math.round(rr(33, 46)), Math.round(rr(100, 114))] : [Math.round(rr(34, 114))]
    const tub = Math.round(rr(28, 120))
    const px = pondCols[0]! * CS
    const tx = tub * CS
    const midX = (px + tx) / 2
    const midY = rr(380, 470)
    const wantSponge = stage.rand() < 0.45
    return {
      ponds: pondCols,
      half: two ? 19 : 25,
      depth: two ? 13 : 14,
      tub,
      slab: stage.rand() < 0.55 ? { x1: clamp(midX - 170, 150, W - 480), x2: clamp(midX + 170, 480, W - 150), y: midY + 60 } : null,
      boulders: 2 + Math.floor(stage.rand() * 2),
      mud: stage.rand() < 0.6 ? { x: clamp(midX + rr(-120, 120), 200, W - 200), y: rr(300, 380), rx: rr(110, 200), ry: rr(40, 60) } : null,
      sponge: wantSponge ? { c: Math.round(clamp(midX / CS + rr(-10, 10), 12, COLS - 24)), r: 44 } : null,
      mole: stage.rand() < 0.75,
      chest: stage.rand() < 0.6,
      treasures: 5,
    }
  }

  const addRock = (x: number, y: number, r: number) => {
    rocks.push({ x, y, r })
    const c0 = Math.max(1, Math.floor((x - r) / CS))
    const c1 = Math.min(COLS - 2, Math.ceil((x + r) / CS))
    const r0 = Math.max(GROUND + 1, Math.floor((y - r) / CS))
    const r1 = Math.min(BED - 1, Math.ceil((y + r) / CS))
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const i = row * COLS + col
        if (cell[i] !== DIRT && cell[i] !== MUD) continue
        if (dist(col * CS + 4, row * CS + 4, x, y) < r) cell[i] = ROCK
      }
    }
  }

  const build = (n: number) => {
    const cfg = config(n)
    cell.fill(DIRT)
    water.fill(0)
    for (let row = 0; row < ROWS; row++) {
      for (let col = 0; col < COLS; col++) {
        const i = row * COLS + col
        if (row < GROUND) cell[i] = EMPTY
        if (row >= BED || col === 0 || col === COLS - 1) cell[i] = ROCK
      }
    }
    rocks = []
    rockFaces = []
    treasures = []
    bubbles = []
    foam = []
    sponge = null
    mole = null
    won = false
    gotFirstWater = false
    tubCount = 0
    tubDirty = 0
    findStreak = 0
    surfaceY = BY - CS

    tubCx = cfg.tub * CS
    tubX0 = cfg.tub - TUB_W / 2
    caveL = (tubX0 - 4) * CS
    caveR = (tubX0 + TUB_W + 4) * CS

    ponds = cfg.ponds.map((col) => ({ col, half: cfg.half, depth: cfg.depth, cells: [], full: 0, have: 0, boost: 0, rainAcc: 0, bounce: spring(1, 200, 9) }))

    // Mud first, so rocks and holes can overwrite it.
    hasMud = cfg.mud !== null
    if (cfg.mud) {
      const m = cfg.mud
      for (let row = GROUND + 2; row < BED; row++) {
        for (let col = 1; col < COLS - 1; col++) {
          const px = col * CS + 4
          const py = row * CS + 4
          const ex = (px - m.x) / m.rx
          const ey = (py - m.y) / m.ry
          const wob = 1 + Math.sin(px * 0.045) * 0.12 + Math.sin(py * 0.09) * 0.08
          if (ex * ex + ey * ey < wob && !blocked(px, py, 14)) cell[row * COLS + col] = MUD
        }
      }
    }

    // Pond and cave.
    for (const p of ponds) {
      for (let row = GROUND; row < GROUND + p.depth + 1; row++) {
        for (let col = p.col - p.half - 1; col <= p.col + p.half + 1; col++) {
          if (col < 1 || col > COLS - 2) continue
          if (!inPond(p, col * CS + 4, row * CS + 4, 0)) continue
          const i = row * COLS + col
          cell[i] = EMPTY
          p.cells.push(i)
          if (row >= GROUND + 1) water[i] = 1
        }
      }
      p.full = p.cells.reduce((sum, i) => sum + (water[i] ? 1 : 0), 0)
      p.have = p.full
    }
    for (let row = 72; row < BED; row++) {
      for (let col = tubX0 - 5; col <= tubX0 + TUB_W + 5; col++) {
        if (col < 1 || col > COLS - 2) continue
        if (inCave(col * CS + 4, row * CS + 4)) cell[row * COLS + col] = EMPTY
      }
    }
    for (let row = TUB_TOP; row < BED; row++) {
      for (let col = tubX0 - 2; col < tubX0 + TUB_W + 2; col++) {
        const wall = col < tubX0 || col >= tubX0 + TUB_W || row === BED - 1
        if (wall) cell[row * COLS + col] = TUBC
      }
    }

    // Rocks.
    if (cfg.slab) {
      const s = cfg.slab
      let k = 0
      for (let x = s.x1; x <= s.x2; x += 36) {
        const r = 30 + Math.sin(k * 1.7) * 6
        const y = s.y + Math.sin(k * 0.9) * 12
        k++
        if (blocked(x, y, r + 6)) continue
        addRock(x, y, r)
        if (k === 3 || k === 8) rockFaces.push({ x, y: y - 2, r, grump: 0 })
      }
    }
    let tries = 0
    let placed = 0
    while (placed < cfg.boulders && tries++ < 200) {
      const x = rr(130, W - 130)
      const y = rr(GY + 150, BY - 110)
      if (blocked(x, y, 95)) continue
      if (rocks.some((o) => dist(o.x, o.y, x, y) < 150)) continue
      const big = rr(40, 50)
      addRock(x, y, big)
      addRock(x + rr(-34, -20), y + rr(8, 22), big * 0.7)
      addRock(x + rr(20, 36), y + rr(6, 24), big * 0.75)
      rockFaces.push({ x, y: y - 4, r: big, grump: 0 })
      placed++
    }

    // Sponge.
    if (cfg.sponge) {
      const s: SpongeBlock = { c0: cfg.sponge.c, r0: cfg.sponge.r, w: 11, h: 6, absorbed: 0, cooldown: 0, squeeze: 0, around: [], sq: spring(1, 230, 8) }
      let ok = true
      for (let row = s.r0; row < s.r0 + s.h && ok; row++) {
        for (let col = s.c0; col < s.c0 + s.w; col++) {
          const t = cell[row * COLS + col]
          if ((t !== DIRT && t !== MUD) || blocked(col * CS, row * CS, 20)) ok = false
        }
      }
      if (ok) {
        for (let row = s.r0 - 1; row <= s.r0 + s.h; row++) {
          for (let col = s.c0 - 1; col <= s.c0 + s.w; col++) {
            const inside = row >= s.r0 && row < s.r0 + s.h && col >= s.c0 && col < s.c0 + s.w
            if (inside) cell[row * COLS + col] = SPONGE
            else s.around.push(row * COLS + col)
          }
        }
        sponge = s
      }
    }

    // Buried things.
    const addTreasure = (x: number, y: number, chest: boolean) => {
      const char = chest ? '' : FINDS[Math.floor(stage.rand() * FINDS.length)]!
      treasures.push({ x, y, char, size: chest ? 70 : 46, value: chest ? 5 : 1, chest, state: 0, t: 0, phase: rr(0, 6) })
    }
    const freeSpot = (x: number, y: number, pad: number): boolean => {
      if (blocked(x, y, pad)) return false
      if (treasures.some((t) => dist(t.x, t.y, x, y) < 120)) return false
      for (let oy = -2; oy <= 2; oy++) {
        for (let ox = -2; ox <= 2; ox++) {
          const t = cell[Math.floor(y / CS + oy) * COLS + Math.floor(x / CS + ox)]
          if (t !== DIRT) return false
        }
      }
      return true
    }
    if (n === 0) {
      // One gem right on the obvious path, so the first dig finds something.
      const p = ponds[0]!
      addTreasure(lerp(p.col * CS, tubCx, 0.5), lerp(GY + p.depth * CS, CAVE_TOP, 0.5), false)
      treasures[0]!.char = '💎'
    }
    if (cfg.chest) {
      for (let k = 0; k < 80; k++) {
        const x = rr(90, W - 90)
        const y = rr(BY - 260, BY - 60)
        if (freeSpot(x, y, 50)) {
          addTreasure(x, y, true)
          break
        }
      }
    }
    tries = 0
    while (treasures.length < cfg.treasures + (cfg.chest ? 1 : 0) && tries++ < 300) {
      const x = rr(70, W - 70)
      const y = rr(GY + 60, BY - 40)
      if (freeSpot(x, y, 26)) addTreasure(x, y, false)
    }

    // Mole.
    if (cfg.mole) {
      for (let k = 0; k < 60; k++) {
        const x = rr(120, W - 120)
        const y = rr(GY + 200, BY - 160)
        if (blocked(x, y, 90) || cell[Math.floor(y / CS) * COLS + Math.floor(x / CS)] !== DIRT) continue
        mole = { x, y, a: rr(0, TAU), turn: 0, pause: 0, dash: 0, lastX: x, lastY: y, hop: spring(0, 200, 10), wow: 0 }
        break
      }
    }

    duck.x = tubCx
    duck.y = BY - CS - 26
    paintDirt(cfg)
    paintRocks()
    if (mole) carve(mole.x, mole.y, 20, false)
  }

  // ---- painting the level's canvases -------------------------------------
  const paintDirt = (cfg: Config) => {
    d.globalCompositeOperation = 'source-over'
    d.clearRect(0, 0, W, H)
    const grad = d.createLinearGradient(0, GY, 0, H)
    grad.addColorStop(0, '#d39a58')
    grad.addColorStop(0.45, '#b97d44')
    grad.addColorStop(1, '#8c5a30')
    d.fillStyle = grad
    d.fillRect(0, GY, W, H - GY)
    // Strata.
    for (let k = 0; k < 7; k++) {
      const y0 = GY + 60 + k * 95 + rnd(-20, 20)
      d.beginPath()
      d.moveTo(0, y0)
      for (let x = 0; x <= W; x += 40) d.lineTo(x, y0 + Math.sin(x * 0.011 + k * 2) * 14 + Math.sin(x * 0.03 + k) * 5)
      d.lineTo(W, y0 + 34)
      for (let x = W; x >= 0; x -= 40) d.lineTo(x, y0 + 34 + Math.sin(x * 0.009 + k * 3) * 16)
      d.closePath()
      d.fillStyle = k % 2 === 0 ? 'rgba(90,50,20,0.13)' : 'rgba(255,220,160,0.10)'
      d.fill()
    }
    for (let i = 0; i < 1300; i++) {
      const x = Math.random() * W
      const y = GY + 8 + Math.random() * (H - GY)
      d.fillStyle = Math.random() < 0.55 ? 'rgba(70,38,14,0.28)' : 'rgba(255,225,170,0.30)'
      d.beginPath()
      d.arc(x, y, rnd(1.2, 3.6), 0, TAU)
      d.fill()
    }
    for (let i = 0; i < 70; i++) {
      const x = Math.random() * W
      const y = GY + 30 + Math.random() * (H - GY - 40)
      ellipse(d, x, y, rnd(5, 11), rnd(3, 7), 'rgba(80,45,20,0.35)', rnd(-0.5, 0.5))
      ellipse(d, x - 1, y - 2, rnd(3, 6), rnd(2, 3), 'rgba(255,230,190,0.25)', 0)
    }
    // Mud.
    if (cfg.mud) {
      for (let pass = 0; pass < 2; pass++) {
        d.fillStyle = pass === 0 ? '#3d2615' : '#5a3a22'
        const grow = pass === 0 ? 5 : 1.5
        for (let row = GROUND; row < BED; row++) {
          for (let col = 1; col < COLS - 1; col++) {
            if (cell[row * COLS + col] !== MUD) continue
            d.beginPath()
            d.arc(col * CS + 4, row * CS + 4, 6.5 + grow, 0, TAU)
            d.fill()
          }
        }
      }
      const m = cfg.mud
      for (let i = 0; i < 46; i++) {
        const x = m.x + rnd(-1, 1) * m.rx * 0.85
        const y = m.y + rnd(-1, 1) * m.ry * 0.6
        if (cell[Math.floor(y / CS) * COLS + Math.floor(x / CS)] !== MUD) continue
        ellipse(d, x, y, rnd(8, 18), rnd(3, 6), 'rgba(255,220,180,0.16)', rnd(-0.2, 0.2))
        ellipse(d, x + rnd(-20, 20), y + rnd(4, 12), rnd(3, 6), rnd(3, 6), 'rgba(20,10,5,0.35)', 0)
      }
    }
    // Grass.
    d.fillStyle = '#4fae4a'
    d.fillRect(0, GY - 4, W, 20)
    d.fillStyle = '#6fcf5c'
    d.fillRect(0, GY - 8, W, 12)
    d.fillStyle = '#6fcf5c'
    for (let x = 0; x < W; x += 9) {
      const h = rnd(8, 20)
      d.beginPath()
      d.moveTo(x - 5, GY - 4)
      d.lineTo(x + rnd(-4, 4), GY - 6 - h)
      d.lineTo(x + 5, GY - 4)
      d.fill()
    }
    d.fillStyle = '#3f9440'
    for (let x = 4; x < W; x += 16) {
      d.beginPath()
      d.moveTo(x - 6, GY + 14)
      d.lineTo(x, GY + 14 + rnd(5, 12))
      d.lineTo(x + 6, GY + 14)
      d.fill()
    }
    const plants = ['🌼', '🌷', '🍄', '🌻', '🌱']
    for (let x = 150; x < W - 140; x += rnd(70, 130)) {
      if (ponds.some((p) => Math.abs(x - p.col * CS) < p.half * CS + 30)) continue
      sprite(d, plants[Math.floor(Math.random() * plants.length)]!, x, GY - 24, rnd(30, 42))
    }
    // Holes that exist from the start.
    for (const p of ponds) {
      const path = () => {
        d.beginPath()
        d.ellipse(p.col * CS, GY, p.half * CS - 2, p.depth * CS - 2, 0, 0, TAU)
      }
      d.globalCompositeOperation = 'source-atop'
      d.strokeStyle = RIM
      d.lineWidth = 12
      path()
      d.stroke()
      d.globalCompositeOperation = 'destination-out'
      path()
      d.fill()
      d.globalCompositeOperation = 'source-over'
    }
    const cavePath = () => {
      d.beginPath()
      d.roundRect(caveL + 1, CAVE_TOP + 1, caveR - caveL - 2, BY - CAVE_TOP + 10, [90, 90, 0, 0])
    }
    d.globalCompositeOperation = 'source-atop'
    d.strokeStyle = RIM
    d.lineWidth = 12
    cavePath()
    d.stroke()
    d.globalCompositeOperation = 'destination-out'
    cavePath()
    d.fill()
    d.globalCompositeOperation = 'source-over'
  }

  const paintRocks = () => {
    rk.clearRect(0, 0, W, H)
    // Bedrock floor.
    rk.fillStyle = '#4b4e5c'
    rk.fillRect(0, BY - 2, W, H - BY + 2)
    for (let x = 0; x < W + 40; x += 46) {
      ellipse(rk, x + rnd(-6, 6), BY + 16, 30, 17, '#6b6f80')
      ellipse(rk, x + rnd(-6, 6) - 6, BY + 10, 16, 6, '#858a9c')
      ellipse(rk, x + 23, BY + 44, 30, 15, '#5b5f6e')
    }
    for (const r of rocks) circle(rk, r.x, r.y, r.r + 5, '#4b4e5c')
    for (const r of rocks) circle(rk, r.x, r.y, r.r + 1, '#8a8fa2')
    for (const r of rocks) ellipse(rk, r.x - r.r * 0.2, r.y - r.r * 0.28, r.r * 0.62, r.r * 0.5, '#a3a8ba', -0.3)
    for (const r of rocks) {
      ellipse(rk, r.x + r.r * 0.3, r.y + r.r * 0.45, r.r * 0.3, r.r * 0.12, 'rgba(60,62,75,0.35)', -0.2)
      ellipse(rk, r.x - r.r * 0.4, r.y - r.r * 0.5, r.r * 0.22, r.r * 0.1, 'rgba(255,255,255,0.35)', -0.5)
    }
  }

  // ---- digging -----------------------------------------------------------
  const uncovered = (t: Treasure): boolean => {
    const cc = Math.floor(t.x / CS)
    const cr = Math.floor(t.y / CS)
    const rad = t.chest ? 4 : 3
    let open = 0
    let all = 0
    for (let oy = -rad; oy <= rad; oy++) {
      for (let ox = -rad; ox <= rad; ox++) {
        if (ox * ox + oy * oy > rad * rad) continue
        all++
        if (cell[(cr + oy) * COLS + cc + ox] === EMPTY) open++
      }
    }
    return cell[cr * COLS + cc] === EMPTY || open / all > 0.45
  }

  const findTreasure = (t: Treasure) => {
    t.state = 1
    t.t = 0
    findStreak++
    if (t.chest) {
      sfx.win()
      sfx.thud(0.8)
      fx.shake(9)
      fx.hitstop(60)
      fx.burst(t.x, t.y - 10, { count: 46, color: ['#ffd23d', '#ffe98a', '#ffb02e'], speed: 620, life: 1.1, shape: 'star', size: 13, gravity: 900, angle: -Math.PI / 2, spread: 1.8 })
      fx.text(t.x, t.y - 80, 'TREASURE!', { color: '#ffe14d', size: 54 })
    } else {
      sfx.coin(findStreak)
      fx.burst(t.x, t.y, { count: 16, color: ['#ffffff', '#ffe98a', '#9be4ff'], speed: 380, life: 0.6, shape: 'star', size: 10 })
      fx.ring(t.x, t.y, '#fff3b0', 70, 0.35)
    }
  }

  // Clear dirt cells in a disc and erase the picture to match. Returns how
  // many cells went, and whether the disc touched something that cannot go.
  const carve = (x: number, y: number, r: number, byFinger: boolean): number => {
    const c0 = Math.max(1, Math.floor((x - r) / CS))
    const c1 = Math.min(COLS - 2, Math.floor((x + r) / CS))
    const r0 = Math.max(GROUND, Math.floor((y - r) / CS))
    const r1 = Math.min(BED - 1, Math.floor((y + r) / CS))
    let n = 0
    let mud = 0
    let hard = false
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const dx = col * CS + 4 - x
        const dy = row * CS + 4 - y
        if (dx * dx + dy * dy > r * r) continue
        const i = row * COLS + col
        const t = cell[i]
        if (t === DIRT || t === MUD) {
          cell[i] = EMPTY
          n++
          if (t === MUD) mud++
        } else if (t === ROCK && row < BED) hard = true
      }
    }
    if (n > 0) {
      eraseCircle(x, y, r, mud > n / 2 ? RIM_MUD : RIM)
      for (const t of treasures) {
        if (t.state === 0 && dist(t.x, t.y, x, y) < r + 50 && uncovered(t)) findTreasure(t)
      }
    }
    if (!byFinger) return n
    const now = stage.time
    if (n > 0) {
      const brown = mud > n / 2 ? ['#3d2615', '#5a3a22', '#2e1c10'] : ['#d39a58', '#8c5a30', '#b97d44', '#6b4424']
      fx.burst(x, y, { count: Math.min(7, 2 + (n >> 3)), color: brown, speed: 260, life: 0.55, size: 9, gravity: 1300, shape: 'square', angle: -Math.PI / 2, spread: 2.6 })
      if (now - lastDigSound > 0.06) {
        lastDigSound = now
        sfx.noise({ dur: 0.07, vol: 0.2, freq: mud > 0 ? rnd(260, 480) : rnd(520, 1300), filter: 'bandpass', q: 1.2 })
        if (Math.random() < 0.25) sfx.crunch()
      }
    } else if (hard && now - lastTink > 0.12) {
      lastTink = now
      sfx.tone({ freq: rnd(1500, 2100), dur: 0.05, type: 'triangle', vol: 0.12 })
      sfx.tick()
      fx.burst(x, y, { count: 5, color: ['#fff6c9', '#ffffff'], speed: 300, life: 0.25, size: 7, shape: 'spark' })
      for (const f of rockFaces) if (dist(f.x, f.y, x, y) < f.r + 70) f.grump = 1.2
    }
    return n
  }

  const waterNear = (x: number, y: number): boolean => {
    const cc = Math.floor(x / CS)
    const cr = Math.floor(y / CS)
    for (let oy = -2; oy <= 2; oy++) for (let ox = -2; ox <= 2; ox++) if (water[(cr + oy) * COLS + cc + ox]) return true
    return false
  }

  const digAt = (x: number, y: number, first: boolean) => {
    const n = carve(x, y, DIG_R, true)
    if (n > 0) return
    const now = stage.time
    if (waterNear(x, y)) {
      if (now - lastSplash > 0.11) {
        lastSplash = now
        fx.burst(x, y, { count: 7, color: ['#9be4ff', '#ffffff', '#35b6f2'], speed: 330, life: 0.45, size: 8, gravity: 1200, angle: -Math.PI / 2, spread: 2 })
        sfx.tone({ freq: rnd(500, 800), to: rnd(1100, 1500), dur: 0.07, type: 'sine', vol: 0.12 })
      }
    } else if (first) {
      fx.burst(x, y, { count: 5, color: 'rgba(255,240,210,0.7)', speed: 120, life: 0.4, size: 8 })
      sfx.tone({ freq: rnd(300, 380), to: 220, dur: 0.06, type: 'sine', vol: 0.1 })
    }
  }

  // ---- water -------------------------------------------------------------
  const step = (): number => {
    let moved = 0
    tick++
    for (let r = ROWS - 2; r >= 1; r--) {
      const ltr = ((r + tick) & 1) === 0
      const base = r * COLS
      for (let k = 1; k < COLS - 1; k++) {
        const i = base + (ltr ? k : COLS - 1 - k)
        let w = water[i]!
        if (w === 0) continue
        const b = i + COLS
        seed = (Math.imul(seed, 1664525) + 1013904223) | 0
        const bits = seed >>> 16
        if (w === 1) {
          if (cell[b] === MUD || cell[i - 1] === MUD || cell[i + 1] === MUD || cell[i - COLS] === MUD) w = 2
          else if (water[i - COLS] === 2 && (bits & 3) === 0) w = 2
          else if ((water[i - 1] === 2 || water[i + 1] === 2) && (bits & 15) === 0) w = 2
          if (w === 2) water[i] = 2
        }
        if (cell[b] === EMPTY && water[b] === 0) {
          water[b] = w
          water[i] = 0
          moved++
          continue
        }
        const dd = (bits & 16) === 0 ? 1 : -1
        // Down a slope.
        if (cell[i + dd] === EMPTY && water[i + dd] === 0 && cell[b + dd] === EMPTY && water[b + dd] === 0) {
          water[b + dd] = w
          water[i] = 0
          moved++
          continue
        }
        if (cell[i - dd] === EMPTY && water[i - dd] === 0 && cell[b - dd] === EMPTY && water[b - dd] === 0) {
          water[b - dd] = w
          water[i] = 0
          moved++
          continue
        }
        if (water[i - COLS] !== 0) {
          // Under pressure: fill a gap beside.
          if (cell[i + dd] === EMPTY && water[i + dd] === 0) {
            water[i + dd] = w
            water[i] = 0
            moved++
          } else if (cell[i - dd] === EMPTY && water[i - dd] === 0) {
            water[i - dd] = w
            water[i] = 0
            moved++
          }
          continue
        }
        // On the surface: look a little way along for somewhere lower.
        for (let t = 0; t < 2; t++) {
          const dir = t === 0 ? dd : -dd
          let found = 0
          for (let s = 1; s <= 16; s++) {
            const j = i + dir * s
            if (cell[j] !== EMPTY || water[j] !== 0) break
            if (cell[j + COLS] === EMPTY && water[j + COLS] === 0) {
              found = j
              break
            }
          }
          if (found) {
            water[found] = w
            water[i] = 0
            moved++
            break
          }
        }
      }
    }
    return moved
  }

  // The automaton only ever moves water down and sideways, so on its own a
  // tunnel that dips and climbs again would stall. This pass finds each
  // connected body of water and lifts a few cells from its highest surface to
  // any lower surface that still has air above it: water finds its level, and
  // a shaft dug upward from a flooded tunnel becomes a fountain.
  const seen = new Uint8Array(COLS * ROWS)
  const queue = new Int32Array(COLS * ROWS)
  const tops: number[] = []
  const lows: number[] = []
  const equalise = () => {
    seen.fill(0)
    for (let start = COLS; start < COLS * BED; start++) {
      if (water[start] === 0 || seen[start] !== 0) continue
      let head = 0
      let tail = 0
      let top = ROWS
      queue[tail++] = start
      seen[start] = 1
      while (head < tail) {
        const i = queue[head++]!
        const r = (i / COLS) | 0
        if (r < top) top = r
        if (water[i - 1] !== 0 && seen[i - 1] === 0) {
          seen[i - 1] = 1
          queue[tail++] = i - 1
        }
        if (water[i + 1] !== 0 && seen[i + 1] === 0) {
          seen[i + 1] = 1
          queue[tail++] = i + 1
        }
        if (water[i - COLS] !== 0 && seen[i - COLS] === 0) {
          seen[i - COLS] = 1
          queue[tail++] = i - COLS
        }
        if (water[i + COLS] !== 0 && seen[i + COLS] === 0) {
          seen[i + COLS] = 1
          queue[tail++] = i + COLS
        }
      }
      if (tail < 30) continue
      tops.length = 0
      lows.length = 0
      for (let k = 0; k < tail; k++) {
        const i = queue[k]!
        const r = (i / COLS) | 0
        if (r <= top + 1) {
          if (water[i - COLS] === 0) tops.push(i)
        } else if (r > top + 3 && cell[i - COLS] === EMPTY && water[i - COLS] === 0 && (cell[i + COLS] !== EMPTY || water[i + COLS] !== 0)) lows.push(i - COLS)
      }
      for (let k = 0; k < 16 && tops.length > 0 && lows.length > 0; k++) {
        const to = lows[Math.floor(Math.random() * lows.length)]!
        if (water[to] !== 0) continue
        const from = tops.pop()!
        water[to] = water[from]!
        water[from] = 0
      }
    }
  }

  const addWater = (i: number, kind: number): boolean => {
    if (cell[i] !== EMPTY || water[i] !== 0) return false
    water[i] = kind
    return true
  }

  // The grid is painted one pixel per cell, scaled up with smoothing, and
  // stacked on itself so the soft edge tightens into a blobby, wet outline.
  const drawWater = (g: CanvasRenderingContext2D) => {
    const m = mainData.data
    g.beginPath()
    let r0 = ROWS
    let r1 = -1
    for (let r = 1; r < ROWS - 1; r++) {
      let o = r * COLS * 4
      let rowAny = false
      for (let i = r * COLS, end = i + COLS; i < end; i++, o += 4) {
        const w = water[i]
        if (w === 0) {
          m[o + 3] = 0
          continue
        }
        rowAny = true
        // A light skin where a settled surface meets air.
        if (water[i - COLS] === 0 && cell[i - COLS] === EMPTY && water[i - 2] !== 0 && water[i + 2] !== 0 && water[i - 1] !== 0 && water[i + 1] !== 0 && water[i + COLS] !== 0) g.rect((i - r * COLS) * CS, r * CS + 1, CS, 3)
        if (w === 1) {
          m[o] = 47
          m[o + 1] = 178
          m[o + 2] = 245
        } else {
          m[o] = 168
          m[o + 1] = 115
          m[o + 2] = 60
        }
        m[o + 3] = 255
      }
      if (rowAny) {
        if (r < r0) r0 = r
        r1 = r
      }
    }
    if (r1 < 0) return
    // Only the band of rows that holds water is scaled up.
    r0 = Math.max(0, r0 - 2)
    r1 = Math.min(ROWS - 1, r1 + 2)
    const rows = r1 - r0 + 1
    lowMain.putImageData(mainData, 0, 0)
    midMain.clearRect(0, 0, MW, MH)
    for (let k = 0; k < 4; k++) midMain.drawImage(lowMainC, 0, r0, COLS, rows, 0, r0 * MS, MW, rows * MS)
    g.drawImage(midMainC, 0, r0 * MS, MW, rows * MS, 0, r0 * CS, COLS * CS, rows * CS)
    g.fillStyle = 'rgba(255,255,255,0.45)'
    g.fill()
  }

  // ---- characters --------------------------------------------------------
  const drawDuck = (g: CanvasRenderingContext2D, x: number, y: number, s: number, flip: number, sleepy: boolean, lx: number, ly: number, blink: number, open: number, wing: number) => {
    g.save()
    g.translate(x, y)
    g.scale(flip * s, s)
    ellipse(g, -36, -14, 16, 10, '#ffc928', 0.7)
    ellipse(g, 0, 0, 43, 29, '#ffd83d')
    ellipse(g, -4, 10, 34, 15, '#ffc928')
    ellipse(g, -8, -3 - wing * 6, 20, 13, '#ffbf1f', -0.25 - wing * 0.8)
    circle(g, 22, -36, 24, '#ffd83d')
    ellipse(g, 12, -46, 9, 5, 'rgba(255,255,255,0.5)', -0.5)
    // Beak.
    ellipse(g, 47, -30 + open * 5, 13, 6, '#f06a12', 0.1 + open * 0.25)
    ellipse(g, 48, -35 - open * 3, 16, 7, '#ff8f1f', -0.05 - open * 0.2)
    ellipse(g, 24, -24, 7, 4, 'rgba(255,120,120,0.45)')
    // Eye.
    if (blink > 0.5) {
      g.strokeStyle = '#2b2233'
      g.lineWidth = 3
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(24, -41)
      g.lineTo(38, -41)
      g.stroke()
    } else {
      circle(g, 31, -42, 8.5, '#ffffff')
      circle(g, 31 + lx * 3.5, -42 + ly * 3.5, 4.8, '#2b2233')
      circle(g, 29.5 + lx * 3.5, -44 + ly * 3.5, 1.6, '#ffffff')
      if (sleepy) {
        g.fillStyle = '#f2c52e'
        g.beginPath()
        g.arc(31, -42, 9, Math.PI * 1.05, Math.PI * 1.95)
        g.fill()
      }
    }
    g.restore()
  }

  const drawMole = (g: CanvasRenderingContext2D, m: Mole) => {
    const flip = Math.cos(m.a) >= 0 ? 1 : -1
    const tilt = clamp(Math.sin(m.a), -0.6, 0.6) * flip
    g.save()
    g.translate(m.x, m.y - m.hop.value)
    g.rotate(tilt * 0.7)
    g.scale(flip, 1)
    const wig = Math.sin(stage.time * 16) * (m.pause > 0 ? 0 : 1)
    ellipse(g, -22, 6, 8, 5, '#f4a6b4', 0.4)
    ellipse(g, 0, 0, 27, 20, '#7b5643')
    ellipse(g, 2, 7, 18, 10, '#9a735c')
    ellipse(g, 20, 3, 12, 10, '#8b6450')
    circle(g, 31, 4, 6, '#ff8fa8')
    circle(g, 29.5, 2.5, 1.8, 'rgba(255,255,255,0.7)')
    if (m.wow > 0) {
      circle(g, 15, -6, 5, '#ffffff')
      circle(g, 16, -6, 2.4, '#1f1720')
    } else {
      circle(g, 15, -6, 2.6, '#1f1720')
    }
    ellipse(g, 18, 14 + wig * 3, 9, 5, '#f4a6b4', 0.5)
    ellipse(g, 6, 16 - wig * 3, 8, 4.5, '#f4a6b4', 0.3)
    // Hard hat.
    g.fillStyle = '#ffcf33'
    g.beginPath()
    g.arc(2, -14, 15, Math.PI, 0)
    g.fill()
    rrect(g, -16, -16, 40, 6, 3, '#f2b600')
    circle(g, 12, -22, 3.5, '#fff6c9')
    g.restore()
  }

  const drawChest = (g: CanvasRenderingContext2D, x: number, y: number, s: number, open: number) => {
    g.save()
    g.translate(x, y)
    g.scale(s / 70, s / 70)
    if (open > 0) {
      ellipse(g, 0, -14, 26, 10 * open, '#ffe14d')
      star(g, -12, -22 * open, 9, '#fff3b0', 0.3)
      star(g, 12, -26 * open, 7, '#fff3b0', -0.3)
    }
    rrect(g, -32, -10, 64, 38, 6, '#9a5a24', '#5b3210', 4)
    g.save()
    g.translate(-32, -10)
    g.rotate(-open * 0.9)
    rrect(g, 0, -22, 64, 24, 10, '#b46c2c', '#5b3210', 4)
    g.fillStyle = '#ffcf33'
    g.fillRect(27, -22, 10, 24)
    g.restore()
    g.fillStyle = '#ffcf33'
    g.fillRect(-5, -10, 10, 38)
    rrect(g, -8, -4, 16, 14, 3, '#ffe98a', '#a87400', 3)
    g.restore()
  }

  const drawCloud = (g: CanvasRenderingContext2D, p: Pond, raining: boolean) => {
    const x = p.col * CS + Math.sin(stage.time * 0.7 + p.col) * 10
    const y = 44 + Math.sin(stage.time * 1.3 + p.col) * 4
    const [sx, sy] = volume(p.bounce.value)
    squash(g, x, y + 26, sx, sy, () => {
      const shade = raining ? '#dfe8f5' : '#ffffff'
      ellipse(g, x, y + 16, 92, 20, raining ? '#c3d0e4' : '#e3eefb')
      circle(g, x - 54, y + 6, 26, shade)
      circle(g, x - 20, y - 8, 34, shade)
      circle(g, x + 22, y - 4, 30, shade)
      circle(g, x + 56, y + 8, 24, shade)
      ellipse(g, x, y + 10, 78, 18, shade)
      const ptr = stage.pointers.values().next().value as Pointer | undefined
      const lx = ptr ? clamp((ptr.x - x) / 300, -1, 1) : 0
      face(g, x, y, 7, raining ? 'wow' : 'happy', lx, ptr ? 0.8 : 0.4, blinkAt(stage.time, p.col))
    })
  }

  const drawSponge = (g: CanvasRenderingContext2D, s: SpongeBlock) => {
    const x = s.c0 * CS
    const y = s.r0 * CS
    const w = s.w * CS
    const h = s.h * CS
    const fill = clamp(s.absorbed / SPONGE_CAP, 0, 1)
    const [sx, sy] = volume(s.sq.value)
    const swell = 1 + fill * 0.1
    squash(g, x + w / 2, y + h, sx * swell, sy * swell, () => {
      const col = fill > 0.85 ? '#7fc7e8' : fill > 0.4 ? '#c9d97a' : '#ffd84a'
      rrect(g, x - 3, y - 3, w + 6, h + 6, 12, col, fill > 0.85 ? '#3f8fb5' : '#d9a514', 4)
      const holes = [0.12, 0.3, 0.2, 0.75, 0.82, 0.25, 0.9, 0.7, 0.5, 0.12, 0.6, 0.85, 0.06, 0.7]
      for (let k = 0; k < holes.length; k += 2) ellipse(g, x + holes[k]! * w, y + holes[k + 1]! * h, 5, 4, 'rgba(120,80,0,0.25)')
      face(g, x + w / 2, y + h / 2 - 2, 6.5, s.squeeze > 0 ? 'dizzy' : fill > 0.85 ? 'yum' : 'happy', 0, 0, blinkAt(stage.time, 3))
    })
    if (fill > 0.85 && Math.floor(stage.time * 2) % 2 === 0) sprite(g, '💧', x + w + 8, y + 6, 22)
  }

  const drawTubBack = (g: CanvasRenderingContext2D) => {
    const x = tubX0 * CS
    const top = TUB_TOP * CS
    g.fillStyle = '#e4f3f8'
    g.fillRect(x, top, TUB_W * CS, TUB_H * CS)
    g.fillStyle = 'rgba(150,190,210,0.25)'
    for (let k = 1; k < 8; k++) g.fillRect(x + k * 40, top, 3, TUB_H * CS)
  }

  const drawTubFront = (g: CanvasRenderingContext2D) => {
    const left = (tubX0 - 2) * CS
    const right = (tubX0 + TUB_W + 2) * CS
    const top = TUB_TOP * CS
    const path = (grow: number) => {
      g.beginPath()
      g.roundRect(left - grow, top - grow, right - left + grow * 2, BY - top + grow, [6, 6, 26, 26])
      g.rect(tubX0 * CS, top - 10, TUB_W * CS, (BED - 1) * CS - top + 10)
    }
    g.fillStyle = '#9fb1c4'
    path(4)
    g.fill('evenodd')
    g.fillStyle = '#ffffff'
    path(0)
    g.fill('evenodd')
    // Rolled rims and a shine.
    rrect(g, left - 12, top - 8, 36, 16, 8, '#ffffff', '#9fb1c4', 3)
    rrect(g, right - 24, top - 8, 36, 16, 8, '#ffffff', '#9fb1c4', 3)
    rrect(g, left + 4, top + 16, 5, 50, 3, 'rgba(160,190,215,0.6)')
    rrect(g, right - 9, top + 16, 5, 50, 3, 'rgba(160,190,215,0.6)')
    // The fill line the duck is hoping for.
    const lineY = top + TUB_H * CS * 0.27
    if (!won) {
      g.strokeStyle = 'rgba(60,140,200,0.5)'
      g.lineWidth = 3
      g.setLineDash([8, 10])
      g.beginPath()
      g.moveTo(tubX0 * CS + 6, lineY)
      g.lineTo((tubX0 + TUB_W) * CS - 6, lineY)
      g.stroke()
      g.setLineDash([])
    }
  }

  // ---- winning -----------------------------------------------------------
  const quack = (delay = 0) => {
    sfx.tone({ freq: 560, to: 400, dur: 0.1, type: 'sawtooth', vol: 0.2, delay })
    sfx.tone({ freq: 540, to: 360, dur: 0.12, type: 'sawtooth', vol: 0.2, delay: delay + 0.14 })
    duck.quack = 0.45 + delay
  }

  const win = () => {
    won = true
    wonAt = stage.time
    ducks++
    hudDuck.kick(9)
    const clean = tubDirty / Math.max(1, tubCount) < 0.12
    fx.hitstop(70)
    fx.shake(10)
    fx.flash('#ffffff', 0.35, 0.3)
    fx.confetti(tubCx, CAVE_TOP + 20, 90)
    sfx.fanfare()
    quack(0.05)
    quack(0.5)
    duck.sq.value = 1.5
    duck.sq.kick(4)
    fx.text(tubCx, CAVE_TOP - 30, 'QUACK!', { color: '#ffe14d', size: 72, life: 1.4 })
    if (clean && hasMud) {
      gems += 3
      hudGem.kick(9)
      stage.after(0.9, () => {
        fx.text(tubCx, CAVE_TOP + 70, '✨ SPARKLY! +3', { color: '#aef3ff', size: 50, life: 1.5 })
        fx.burst(tubCx, TUB_TOP * CS, { count: 40, color: ['#ffffff', '#aef3ff', '#fff3b0'], speed: 520, life: 1, shape: 'star', size: 12 })
        sfx.ding(4)
        sfx.ding(6)
      })
    }
    for (let k = 0; k < 16; k++) foam.push({ x: tubX0 * CS + 10 + (k / 15) * (TUB_W * CS - 20) + rnd(-8, 8), r: rnd(14, 26), grow: -k * 0.04 })
    stage.after(2.7, () => {
      snap.clearRect(0, 0, W, H)
      drawScene(snap)
      level++
      build(level)
      slide = 0
      sfx.whoosh()
    })
  }

  const popBubble = (b: Bubble) => {
    b.life = 0
    fx.burst(b.x, b.y, { count: 5, color: ['#ffffff', '#c9f1ff'], speed: 160, life: 0.3, size: 5, shape: 'ring' })
    if (stage.time - lastPop > 0.07) {
      lastPop = stage.time
      sfx.pop(popStep++ % 9)
    }
  }

  // ---- the frame ---------------------------------------------------------
  const update = (dt: number) => {
    frame++
    const now = stage.time
    if (slide < 1) slide = Math.min(1, slide + dt / 0.7)

    // Rain keeps every pond topped up, so a level cannot run dry.
    if (frame % 8 === 0) {
      waterTotal = 0
      for (let i = COLS; i < COLS * BED; i++) if (water[i]) waterTotal++
      for (const p of ponds) {
        let have = 0
        for (const i of p.cells) if (water[i]) have++
        p.have = have
      }
    }
    for (const p of ponds) {
      p.bounce.update(dt)
      p.boost = Math.max(0, p.boost - dt)
      const low = p.full - p.have > 25
      // A brimming pond takes no more, so a poked cloud cannot flood the lawn.
      const brim = p.have >= p.cells.length - 12
      const rate = waterTotal > MAX_WATER || brim ? 0 : p.boost > 0 ? 200 : low ? 90 : 0
      p.rainAcc += rate * dt
      while (p.rainAcc >= 1) {
        p.rainAcc -= 1
        const col = p.col + Math.round(rnd(-9, 9))
        addWater(9 * COLS + clamp(col, 2, COLS - 3), 1)
      }
    }

    // Sponge drinks what touches it, and gives it back when squeezed.
    if (sponge) {
      const s = sponge
      s.sq.update(dt)
      s.cooldown = Math.max(0, s.cooldown - dt)
      if (s.squeeze > 0) {
        let out = Math.min(s.squeeze, 8)
        for (let k = 0; k < 30 && out > 0; k++) {
          const i = s.around[Math.floor(Math.random() * s.around.length)]!
          if (addWater(i, 1)) {
            out--
            s.squeeze--
          }
        }
        if (out > 0) s.squeeze = Math.max(0, s.squeeze - 1)
      } else if (s.cooldown <= 0 && s.absorbed < SPONGE_CAP) {
        for (const i of s.around) {
          if (water[i] && s.absorbed < SPONGE_CAP) {
            water[i] = 0
            s.absorbed++
            if (s.absorbed % 12 === 0) {
              s.sq.kick(1.5)
              sfx.tone({ freq: 300 + s.absorbed * 3, to: 200, dur: 0.08, type: 'sine', vol: 0.1 })
            }
          }
        }
      }
    }

    // Water.
    simAcc += dt
    let moved = 0
    let steps = 0
    while (simAcc >= 1 / 72 && steps < 3) {
      simAcc -= 1 / 72
      moved += step()
      steps++
    }
    if (steps === 3) simAcc = 0
    if (frame % 3 === 0) equalise()
    flow = damp(flow, moved, 10, dt)
    if (flow > 70 && !gushing) {
      gushing = true
      sfx.whoosh()
      fx.shake(3, 0.2)
    } else if (flow < 12) gushing = false
    if (flow > 6 && now - lastTrickle > 0.085) {
      lastTrickle = now
      const vol = clamp(flow / 900, 0.015, 0.11)
      sfx.noise({ dur: 0.1, vol, freq: rnd(900, 2600), filter: 'bandpass', q: 2.5 })
      if (Math.random() < 0.35) sfx.tone({ freq: rnd(520, 1000), to: rnd(1100, 1700), dur: 0.05, type: 'sine', vol: vol * 0.6 })
    }

    // The tub.
    let count = 0
    let dirty = 0
    let surf = -1
    for (let row = TUB_TOP; row < BED - 1; row++) {
      let rowCount = 0
      for (let col = tubX0; col < tubX0 + TUB_W; col++) {
        const w = water[row * COLS + col]
        if (w) {
          rowCount++
          if (w === 2) dirty++
        }
      }
      count += rowCount
      if (surf < 0 && rowCount > TUB_W * 0.5) surf = row
    }
    if (count > tubCount + 2 && frame % 5 === 0) {
      // Something is pouring in: splash where it lands.
      const row = (surf < 0 ? BED - 1 : surf) - 2
      for (let col = tubX0; col < tubX0 + TUB_W; col += 2) {
        if (!water[row * COLS + col]) continue
        fx.burst(col * CS, (row + 2) * CS, { count: 4, color: ['#c9f1ff', '#ffffff', '#35b6f2'], speed: 260, life: 0.4, size: 7, gravity: 1100, angle: -Math.PI / 2, spread: 1.6 })
        break
      }
    }
    tubCount = count
    tubDirty = dirty
    surfaceY = surf < 0 ? BY - CS : surf * CS
    if (!gotFirstWater && count > 6) {
      gotFirstWater = true
      sfx.splat()
      quack()
      duck.sq.kick(5)
      fx.text(tubCx, CAVE_TOP + 10, '💦', { size: 54 })
    }
    if (!won && slide >= 1 && count >= TUB_CELLS * 0.73) win()

    // Duck.
    const floatY = surf < 0 ? BY - CS - 27 : surfaceY - 16 + Math.sin(now * 3) * 3
    duck.y = damp(duck.y, floatY, 7, dt)
    duck.x = tubCx + Math.sin(now * 0.6) * (surf < 0 ? 0 : 70)
    duck.sq.update(dt)
    duck.quack = Math.max(0, duck.quack - dt)
    duck.wing = won ? Math.abs(Math.sin(now * 14)) : Math.max(0, duck.wing - dt * 3)

    // Win bubbles.
    if (won && now - wonAt < 2.4 && bubbles.length < 60 && frame % 2 === 0) {
      bubbles.push({ x: tubX0 * CS + rnd(10, TUB_W * CS - 10), y: surfaceY, r: rnd(9, 26), vy: rnd(70, 190), phase: rnd(0, 6), life: rnd(1, 2.4) })
    }
    for (let i = bubbles.length - 1; i >= 0; i--) {
      const b = bubbles[i]!
      b.y -= b.vy * dt
      b.x += Math.sin(now * 3 + b.phase) * 30 * dt
      b.life -= dt
      if (b.life <= 0 || b.y < GY) {
        if (b.life > -1) popBubble(b)
        bubbles.splice(i, 1)
      }
    }
    for (const f of foam) f.grow = Math.min(1, f.grow + dt * 2.2)

    // Mole.
    if (mole) {
      const m = mole
      m.hop.update(dt)
      m.wow = Math.max(0, m.wow - dt)
      m.dash = Math.max(0, m.dash - dt)
      if (m.pause > 0) m.pause -= dt
      else {
        if (Math.abs(m.turn) < 2) {
          m.turn = clamp(m.turn + rnd(-6, 6) * dt, -1.2, 1.2)
          m.a += m.turn * dt
        }
        const speed = m.dash > 0 ? 150 : 42
        const ax = m.x + Math.cos(m.a) * 46
        const ay = m.y + Math.sin(m.a) * 46
        const ahead = cell[Math.floor(ay / CS) * COLS + Math.floor(ax / CS)]
        const out = ax < 70 || ax > W - 70 || ay < GY + 90 || ay > BY - 50
        if (out || blocked(ax, ay, 46) || (ahead !== DIRT && ahead !== MUD && ahead !== EMPTY)) {
          // Something in the way: keep turning one way until the nose is clear.
          if (Math.abs(m.turn) < 2) m.turn = Math.random() < 0.5 ? -3.6 : 3.6
          m.a += m.turn * dt
        } else {
          if (Math.abs(m.turn) > 2) m.turn = 0
          m.x += Math.cos(m.a) * speed * dt
          m.y += Math.sin(m.a) * speed * dt
        }
        if (dist(m.x, m.y, m.lastX, m.lastY) > 5) {
          m.lastX = m.x
          m.lastY = m.y
          const n = carve(m.x, m.y, 19, false)
          if (n > 2 && Math.random() < 0.5) fx.burst(m.x + Math.cos(m.a) * 20, m.y + Math.sin(m.a) * 20, { count: 2, color: ['#d39a58', '#8c5a30'], speed: 140, life: 0.4, size: 7, gravity: 900, shape: 'square' })
        }
        if (Math.random() < dt * 0.14) m.pause = rnd(0.6, 1.4)
      }
    }

    // Finds fly to the counter.
    for (const t of treasures) {
      if (t.state !== 1) continue
      t.t += dt / (t.chest ? 1.5 : 1)
      if (t.t >= 1) {
        t.state = 2
        gems += t.value
        hudGem.kick(8)
        sfx.ding(Math.min(findStreak, 7))
        fx.text(HUD_X + 120, 96, `+${t.value}`, { color: '#fff3b0', size: 34, rise: 30 })
      }
    }
    for (const f of rockFaces) f.grump = Math.max(0, f.grump - dt)
    hudDuck.update(dt)
    hudGem.update(dt)
  }

  const drawScene = (g: CanvasRenderingContext2D) => {
    const now = stage.time
    g.drawImage(bgC, 0, 0)

    // Sun.
    g.save()
    g.translate(W - 84, 58)
    g.rotate(now * 0.25)
    g.fillStyle = '#ffe36b'
    for (let k = 0; k < 10; k++) {
      g.rotate(TAU / 10)
      g.beginPath()
      g.moveTo(-8, -40)
      g.lineTo(0, -56)
      g.lineTo(8, -40)
      g.fill()
    }
    g.restore()
    circle(g, W - 84, 58, 36, '#ffd23d')
    face(g, W - 84, 56, 6.5, won ? 'wow' : 'happy', -0.5, 0.6, blinkAt(now, 7))

    for (const p of ponds) drawCloud(g, p, p.rainAcc > 0 && (p.boost > 0 || p.full - p.have > 25))

    drawTubBack(g)
    for (const t of treasures) {
      if (t.state !== 0) continue
      if (t.chest) drawChest(g, t.x, t.y, t.size, 0)
      else sprite(g, t.char, t.x, t.y, t.size, Math.sin(t.phase) * 0.3)
    }

    // Duck, then water over its bottom so it sits in, not on, the bath.
    const ptr = stage.pointers.values().next().value as Pointer | undefined
    const target = ptr ?? { x: ponds[0]!.col * CS, y: GY }
    const sad = tubCount < 8 && !won
    const lx = clamp((target.x - duck.x) / 260, -1, 1)
    const ly = clamp((target.y - duck.y) / 260, -1, 1)
    if (Math.abs(target.x - duck.x) > 30) duck.flip = target.x > duck.x ? 1 : -1
    const [dsx, dsy] = volume(duck.sq.value)
    squash(g, duck.x, duck.y + 26, dsx, dsy, () => {
      drawDuck(g, duck.x, duck.y, 1, duck.flip, sad && !ptr, lx * duck.flip, ly, blinkAt(now, 1), duck.quack > 0 ? 1 : 0, duck.wing)
    })

    drawWater(g)
    g.drawImage(dirtC, 0, 0)
    g.drawImage(rockC, 0, 0)
    for (const f of rockFaces) {
      const shake = f.grump > 0 ? Math.sin(now * 60) * 2 : 0
      face(g, f.x + shake, f.y, f.r * 0.17, f.grump > 0 ? 'grumpy' : 'sleepy', 0, 0, 0)
    }
    if (sponge) drawSponge(g, sponge)
    if (mole) drawMole(g, mole)
    drawTubFront(g)

    // Foam and bubbles.
    for (const f of foam) {
      if (f.grow <= 0) continue
      const s = ease.outBack(f.grow)
      circle(g, f.x, TUB_TOP * CS - 4, f.r * s, '#ffffff')
      circle(g, f.x - f.r * 0.3, TUB_TOP * CS - 4 - f.r * 0.3, f.r * 0.25 * s, 'rgba(190,235,255,0.9)')
    }
    for (const b of bubbles) {
      circle(g, b.x, b.y, b.r, 'rgba(210,244,255,0.35)', 'rgba(255,255,255,0.95)', 3)
      circle(g, b.x - b.r * 0.35, b.y - b.r * 0.35, b.r * 0.2, '#ffffff')
    }

    // What the duck wants.
    if (sad && slide >= 1) {
      const bx = duck.x + 78
      const by = duck.y - 96 + Math.sin(now * 2.2) * 5
      circle(g, duck.x + 44, duck.y - 58, 6, '#ffffff')
      circle(g, duck.x + 56, duck.y - 70, 9, '#ffffff')
      ellipse(g, bx, by, 40, 34, '#ffffff')
      sprite(g, '💧', bx, by, 40 + Math.sin(now * 4) * 4)
    }

    // Glints over buried things, and finds on their way to the counter.
    for (const t of treasures) {
      if (t.state === 0) {
        const tw = Math.max(0, Math.sin(now * 1.6 + t.phase)) ** 10
        if (tw > 0.02 && cell[Math.floor(t.y / CS) * COLS + Math.floor(t.x / CS)] !== EMPTY) star(g, t.x + 6, t.y - 6, (t.chest ? 16 : 11) * tw, 'rgba(255,255,230,0.95)', now)
      } else if (t.state === 1) {
        const a = clamp(t.t / 0.4, 0, 1)
        const bfly = ease.inOutCubic(clamp((t.t - 0.5) / 0.5, 0, 1))
        const x = lerp(t.x, HUD_X, bfly)
        const y = lerp(t.y - ease.outBack(a) * 60, 96, bfly)
        const s = t.size * lerp(1 + ease.outBack(a) * 0.7, 0.7, bfly)
        if (t.chest) drawChest(g, x, y, s, a)
        else sprite(g, t.char, x, y, s, Math.sin(now * 12) * 0.15)
      }
    }
  }

  build(0)

  return {
    update,
    draw(g) {
      if (slide < 1) {
        const e = ease.inOutCubic(slide)
        g.drawImage(snapC, -W * e, 0)
        g.save()
        g.translate(W * (1 - e), 0)
        drawScene(g)
        g.restore()
      } else drawScene(g)

      // Counters.
      const ds = hudDuck.value
      drawDuck(g, HUD_X - 26, 52, 0.5 * ds, 1, false, 0, 0, 0, 0, 0)
      label(g, `${ducks}`, HUD_X + 24, 44, 38 * ds, '#ffffff', 'rgba(30,20,40,0.85)', 'left')
      sprite(g, '💎', HUD_X - 24, 96, 36 * hudGem.value)
      label(g, `${gems}`, HUD_X + 24, 96, 38 * hudGem.value, '#ffffff', 'rgba(30,20,40,0.85)', 'left')

      // Idle hint: a finger rubbing from the pond down toward the tub.
      const idle = stage.time - lastTouchAt
      if (!won && slide >= 1 && tubCount < TUB_CELLS * 0.3 && idle > (everTouched ? 5 : 1.6)) {
        let best = ponds[0]!
        for (const p of ponds) if (Math.abs(p.col * CS - tubCx) < Math.abs(best.col * CS - tubCx)) best = p
        const t = ease.inOutQuad((stage.time % 2.2) / 2.2)
        const x0 = best.col * CS
        const y0 = GY + best.depth * CS - 24
        hint(g, lerp(x0, lerp(x0, tubCx, 0.85), t), lerp(y0, CAVE_TOP + 10, t), stage.time, 46)
      }
    },
    down(p: Pointer) {
      lastTouchAt = stage.time
      everTouched = true
      fx.ring(p.x, p.y, '#ffffff', 46, 0.28)
      if (slide < 1) {
        sfx.tick()
        return
      }
      // Bubbles first: they float over everything.
      for (const b of bubbles) {
        if (b.life > 0 && dist(b.x, b.y, p.x, p.y) < b.r + 34) {
          popBubble(b)
          b.life = -2
          return
        }
      }
      // Sky: poke the cloud for a shower.
      if (p.y < GY - 26) {
        let best = ponds[0]!
        for (const q of ponds) if (Math.abs(q.col * CS - p.x) < Math.abs(best.col * CS - p.x)) best = q
        best.boost = 1.1
        best.bounce.value = 0.7
        best.bounce.kick(3)
        sfx.boing(Math.round(rnd(0, 3)))
        return
      }
      if (dist(p.x, p.y, duck.x + 8 * duck.flip, duck.y - 16) < 62) {
        quack()
        duck.sq.value = 0.65
        duck.sq.kick(5)
        duck.wing = 1
        fx.burst(duck.x, duck.y - 40, { count: 6, color: ['#ffe14d', '#ffffff'], speed: 220, life: 0.4, shape: 'heart', size: 9 })
        return
      }
      if (mole && dist(p.x, p.y, mole.x, mole.y) < 58) {
        const m = mole
        m.hop.kick(520)
        m.wow = 1
        m.dash = 1.3
        m.pause = 0
        m.a += rnd(1.5, 4.5)
        sfx.tone({ freq: 1300, to: 2100, dur: 0.09, type: 'sine', vol: 0.18 })
        sfx.tone({ freq: 1500, to: 2300, dur: 0.08, type: 'sine', vol: 0.16, delay: 0.1 })
        fx.text(m.x, m.y - 50, '❗', { size: 40, life: 0.6 })
        return
      }
      if (sponge) {
        const s = sponge
        if (p.x > s.c0 * CS - 16 && p.x < (s.c0 + s.w) * CS + 16 && p.y > s.r0 * CS - 16 && p.y < (s.r0 + s.h) * CS + 16) {
          s.sq.value = 0.55
          s.sq.kick(4)
          s.squeeze += s.absorbed
          s.cooldown = 4
          if (s.absorbed > 0) {
            sfx.splat()
            fx.burst(p.x, p.y, { count: 14, color: ['#9be4ff', '#ffffff', '#35b6f2'], speed: 420, life: 0.5, size: 9, gravity: 1000 })
          } else sfx.boing(-2)
          s.absorbed = 0
          return
        }
      }
      if (p.x > (tubX0 - 2) * CS && p.x < (tubX0 + TUB_W + 2) * CS && p.y > TUB_TOP * CS - 8 && !waterNear(p.x, p.y)) {
        sfx.ding(Math.round(rnd(0, 4)))
        return
      }
      digAt(p.x, p.y, true)
    },
    move(p: Pointer) {
      if (slide < 1) return
      lastTouchAt = stage.time
      const len = Math.hypot(p.dx, p.dy)
      const steps = Math.max(1, Math.ceil(len / 9))
      for (let s = 1; s <= steps; s++) {
        const t = s / steps
        digAt(p.x - p.dx * (1 - t), p.y - p.dy * (1 - t), false)
      }
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'dig-for-the-duck',
    name: 'Dig for the Duck',
    emoji: '💧',
    ages: [5, 9],
    pitch: 'Rub tunnels through the dirt so the pond water pours down into the bathtub and floats the rubber duck.',
    howTo: 'Rub to dig from the pond to the tub. Poke the cloud for rain. Look for glints: things are buried.',
    basedOn: "Where's My Water, Sandspiel",
    whyFun: 'Falling water is the toy: every rub crumbles dirt and reroutes a real flow, with buried finds and a loud duck payoff.',
  },
  create,
}
