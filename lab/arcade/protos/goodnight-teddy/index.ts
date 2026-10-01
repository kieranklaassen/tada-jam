// Goodnight, Teddy: one evening, from a muddy bear to a dark, still room.
// Bath (tap, soap, jug, towel), then through the door to the bedroom
// (pyjamas, sleeves, buttons, bed, blanket, a friend, music box, curtains,
// lamp). Nothing here keeps count or hurries: every state is something the
// child can see in the room, and the evening ends when Teddy is asleep in the
// dark. Opening the curtains brings morning; carrying him out of the door
// turns the day and a new evening begins.

import { blinkAt } from '../../kit/draw.ts'
import { clamp, damp, dist, ease, inRect, lerp, shuffle, spring, TAU } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { blobPath, mix, rgb } from './paint.ts'
import type { RGB } from './paint.ts'
import {
  BED,
  CHEST,
  DOOR_A,
  DOOR_B,
  DRAWER,
  JUG_HOME,
  LAMP,
  MAT,
  MBOX,
  NIGHT,
  RAIL,
  RUG,
  SHELF,
  SOAP_HOME,
  TAP,
  TOWEL_HOME,
  TUB,
  TUB_FRONT,
  WIN,
  drawKnob,
  paintBathroom,
  paintBedroom,
  paintTubFront,
} from './rooms.ts'
import { ARM_L, ARM_R, BODY, BUTTON_Y, EAR_L, EAR_R, HEAD, LEG_L, LEG_R, ZONES, drawFriend, drawPyjamaItem, drawTeddy, sleevePoint } from './teddy.ts'
import type { FriendKind, Spot, TeddyLook } from './teddy.ts'

type Home = 'mat' | 'tub' | 'rug' | 'bed'

interface Move {
  fx: number
  fy: number
  tx: number
  ty: number
  t: number
  dur: number
  peak: number
}

type Hold =
  | { kind: 'teddy'; moved: number }
  | { kind: 'soap' | 'jug' | 'towel'; ox: number; oy: number }
  | { kind: 'pj'; index: number }
  | { kind: 'friend'; index: number; ox: number; oy: number }
  | { kind: 'blanket' }
  | { kind: 'curtain'; side: 0 | 1; off: number; acc: number }
  | { kind: 'crank'; last: number; turned: number }
  | { kind: 'sleeve'; side: 0 | 1; acc: number }

interface Art {
  scale: number
  bath: HTMLCanvasElement
  bed: HTMLCanvasElement
  tub: HTMLCanvasElement
  glow: HTMLCanvasElement
}

// Painted once and kept across restarts, so a new evening costs nothing.
let art: Art | null = null

function getArt(): Art {
  if (art) return art
  const scale = clamp(Math.round((globalThis.devicePixelRatio ?? 1) * 2) / 2, 1, 2)
  const make = (w: number, h: number, ox: number, oy: number, paint: (g: CanvasRenderingContext2D) => void): HTMLCanvasElement => {
    const canvas = document.createElement('canvas')
    canvas.width = Math.ceil(w * scale)
    canvas.height = Math.ceil(h * scale)
    const g = canvas.getContext('2d')
    if (g) {
      g.scale(scale, scale)
      g.translate(-ox, -oy)
      g.lineCap = 'round'
      g.lineJoin = 'round'
      paint(g)
    }
    return canvas
  }
  const glow = document.createElement('canvas')
  glow.width = 256
  glow.height = 256
  const gg = glow.getContext('2d')
  if (gg) {
    const grad = gg.createRadialGradient(128, 128, 0, 128, 128, 128)
    grad.addColorStop(0, 'rgba(255,214,140,0.9)')
    grad.addColorStop(0.25, 'rgba(255,196,120,0.42)')
    grad.addColorStop(0.6, 'rgba(255,180,110,0.12)')
    grad.addColorStop(1, 'rgba(255,170,100,0)')
    gg.fillStyle = grad
    gg.fillRect(0, 0, 256, 256)
  }
  art = {
    scale,
    bath: make(W, H, 0, 0, paintBathroom),
    bed: make(W, H, 0, 0, paintBedroom),
    tub: make(TUB_FRONT.w, TUB_FRONT.h, TUB_FRONT.x, TUB_FRONT.y, paintTubFront),
    glow,
  }
  return art
}

// Where the day's mud can be. Seven of these are chosen each evening.
const MUD: readonly Omit<Spot, 'amount' | 'seed'>[] = [
  { zone: HEAD, x: -56, y: -236, r: 22 },
  { zone: HEAD, x: 30, y: -340, r: 22 },
  { zone: HEAD, x: 66, y: -292, r: 17 },
  { zone: EAR_L, x: -76, y: -368, r: 17 },
  { zone: EAR_R, x: 78, y: -366, r: 16 },
  { zone: BODY, x: 34, y: -176, r: 27 },
  { zone: BODY, x: -40, y: -150, r: 24 },
  { zone: ARM_L, x: -116, y: -150, r: 19 },
  { zone: ARM_R, x: 118, y: -158, r: 19 },
  { zone: LEG_L, x: -76, y: -34, r: 24 },
  { zone: LEG_R, x: 74, y: -30, r: 22 },
  { zone: BODY, x: 8, y: -74, r: 22 },
]

// The cork is on a cord over the rim, with a wooden ring to pull.
const PLUG = { x: 806, y: 566 }
// The jug tips about a point near its lip, so its body rises as it pours.
const JUG_PIVOT = { x: -30, y: -104 }
const CUR = { top: RAIL.y + 4, bottom: 366, outerL: 438, outerR: 692, closedL: 553, closedR: 577, openL: 486, openR: 644 }
const LAMP_LEVELS = [1, 0.4, 0] as const
// A rocking tune on five notes that never quite comes home. -1 is a rest.
const LULLABY = [4, 3, 4, -1, 2, 3, 4, -1, 5, 4, 3, 2, 3, -1, 4, -1, 4, 3, 2, -1, 1, 2, 3, -1, 4, 3, 1, 2, 4, -1, -1, -1] as const
const STARS: readonly (readonly [number, number, number])[] = [
  [565, 150, 2.6],
  [560, 236, 2],
  [570, 306, 2.3],
  [486, 132, 2],
  [520, 196, 1.6],
  [500, 280, 2.2],
  [610, 128, 1.8],
  [640, 214, 2.4],
  [600, 268, 1.6],
  [656, 318, 2],
  [472, 330, 1.7],
  [538, 118, 1.5],
]

const DUSK_TOP: RGB = [92, 92, 150]
const DUSK_LOW: RGB = [226, 160, 150]
const NIGHT_TOP: RGB = [18, 24, 62]
const NIGHT_LOW: RGB = [38, 48, 98]
const MORN_TOP: RGB = [166, 210, 238]
const MORN_LOW: RGB = [254, 228, 178]

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const pics = getArt()

  // ---------------------------------------------------------------- state
  let room = 0
  let veil = 1
  let veilTarget = 0
  let veilRate = 1.6
  let veilColor = '#fff4d8'
  let atVeil: (() => void) | null = null
  let lastTouch = 0
  const holds = new Map<number, Hold>()

  const look: TeddyLook = {
    x: MAT.x,
    y: MAT.y,
    rot: 0,
    sx: 1,
    sy: 1,
    lying: false,
    eye: 0,
    lookX: 0,
    lookY: 0,
    smile: 0.2,
    armLift: 0,
    wet: [0, 0, 0, 0, 0, 0, 0, 0],
    fluff: [0, 0, 0, 0, 0, 0, 0, 0],
    spots: shuffle(MUD, stage.rand)
      .slice(0, 7)
      .map((m, i) => ({ ...m, amount: 1, seed: i + 1 + Math.floor(stage.rand() * 20) })),
    foam: [],
    leaf: 1,
    pj: null,
  }
  let home: Home = 'mat'
  let holder = -1
  let lifted = false
  let grabX = 0
  let grabY = 0
  let wantX = look.x
  let wantY = look.y
  let move: Move | null = null
  let behindTub = false
  let clearOfTub = true
  const rot = spring(0, 70, 9)
  const sq = spring(1, 260, 13)
  let sleepEye = 0
  let sleptFor = 0
  let patSmile = 0
  let stretch = 0
  let dripUntil = 0
  let dripAt = 0

  // Bathroom.
  let tapOn = false
  let tapAngle = 0
  let tapAngleTo = 0
  let flow = 0
  let level = 0
  let shown = 0
  let soapy = 0
  let waterSndAt = 0
  let plugged = true
  let drainSndAt = 0
  const plugPull = spring(0, 150, 9)
  const ripples: { x: number; y: number; r: number; life: number }[] = []
  // `freeAt`: a tool waits a moment where the hand left it before it drifts
  // home, so a lifted finger can pick it straight up again.
  const soap = { x: SOAP_HOME.x, y: SOAP_HOME.y, held: -1, acc: 0, snd: 0, tilt: 0, freeAt: 0 }
  const jug = { x: JUG_HOME.x, y: JUG_HOME.y, held: -1, tilt: 0, water: 1, sndAt: 0, splashAt: 0, pouring: false, landX: 0, landY: 0, onTeddy: false, dip: false, freeAt: 0 }
  const towel = { x: TOWEL_HOME.x, y: TOWEL_HOME.y, held: -1, acc: 0, hang: 1, vx: 0, vy: 0, freeAt: 0 }
  const towelSway = spring(0, 40, 4)

  // Bedroom.
  let drawerTo = 0.2
  let drawer = 0.2
  const pjs = [0, 1, 2].map((style) => ({ style, x: 0, y: 0, where: 'drawer' as 'drawer' | 'held' | 'teddy', back: 1 }))
  const kinds: FriendKind[] = shuffle(['bunny', 'lamb', 'mouse'] as const, stage.rand)
  const friends = kinds.map((kind, i) => {
    const hx = SHELF.x + 62 + i * 108
    return { kind, x: hx, y: SHELF.y + 2, hx, hy: SHELF.y + 2, where: 'shelf' as 'shelf' | 'bed' | 'held', held: -1, sq: spring(1, 240, 12), rot: 0 }
  })
  // The bed is made, with the blanket turned down a little way.
  let blanketY = BED.footY - 52
  let blanketPull = BED.x + BED.w / 2
  let blanketAcc = 0
  let openL = 1
  let openR = 1
  let lampIndex = 0
  let lampGlow = 1
  const bead = spring(0, 120, 6)
  let crank = 0
  let wound = 0
  let noteAt = 0
  let noteIndex = 0
  let lullaby = 0
  let lid = 0
  let nightSky = 0
  let nightTo = 0
  let isMorning = false
  let morning = 0
  let birdAt = 0
  let bright = 1

  // --------------------------------------------------------------- sounds
  const cloth = (vol = 0.05) => sfx.noise({ dur: 0.14, freq: 520 + Math.random() * 260, vol, filter: 'lowpass' })
  const plip = (vol = 0.07) => {
    const f = 520 + Math.random() * 340
    sfx.tone({ freq: f, to: f * 2.1, dur: 0.07, vol, type: 'sine' })
  }
  const tok = (freq = 190, vol = 0.07) => sfx.tone({ freq: freq * (0.95 + Math.random() * 0.1), to: freq * 0.6, dur: 0.07, type: 'sine', vol })
  const pat = (vol = 0.09) => {
    sfx.tone({ freq: 172, to: 92, dur: 0.12, type: 'sine', vol })
    sfx.noise({ dur: 0.08, freq: 380, vol: vol * 0.5, filter: 'lowpass' })
  }
  const woodClick = (vol = 0.05) => sfx.tone({ freq: 900 * (0.9 + Math.random() * 0.2), to: 600, dur: 0.035, type: 'triangle', vol })
  const chime = (step: number, vol = 0.08, delay = 0) => {
    const f = sfx.scale(step)
    sfx.tone({ freq: f, dur: 1.3, type: 'sine', vol, delay, attack: 0.004 })
    sfx.tone({ freq: f * 2.005, dur: 0.5, type: 'sine', vol: vol * 0.22, delay })
    sfx.tone({ freq: f * 3.01, dur: 0.16, type: 'sine', vol: vol * 0.1, delay })
  }
  const splash = (vol = 0.14) => {
    sfx.noise({ dur: 0.35, freq: 1100, to: 240, vol, filter: 'lowpass' })
    plip(vol * 0.5)
  }

  // -------------------------------------------------------------- helpers
  const surfY = () => lerp(TUB.rimY + 30, TUB.rimY + 4, shown)
  const frontRim = (x: number) => TUB.rimY + TUB.ry * Math.sqrt(Math.max(0, 1 - ((x - TUB.cx) / TUB.rx) ** 2))
  const inOpening = (x: number, y: number) => ((x - TUB.cx) / TUB.rx) ** 2 + ((y - TUB.rimY) / (TUB.ry + 10)) ** 2 < 1
  const settled = () => holder < 0 && !move
  const inBed = () => home === 'bed' && settled()
  const tucked = () => clamp((BED.footY - blanketY) / (BED.footY - BED.chinY), 0, 1)
  const edgeL = () => lerp(CUR.closedL, CUR.openL, openL)
  const edgeR = () => lerp(CUR.closedR, CUR.openR, openR)
  const inBedRect = (x: number, y: number) => inRect(x, y, BED.x - 10, BED.y, BED.w + 20, BED.h + 20)
  const slot = (i: number): [number, number] => [DRAWER.x + 48 + i * 77, DRAWER.y + 8 + 34 * drawer]

  const homePos = (h: Home): [number, number] => (h === 'mat' ? [MAT.x, MAT.y] : h === 'tub' ? [TUB.cx, TUB.seatY] : h === 'rug' ? [RUG.x, RUG.y] : [BED.tx, BED.ty])

  const zoneAt = (px: number, py: number, pad: number): number => {
    const lx = px - look.x
    const ly = py - look.y
    let best = -1
    let bestD = 1e9
    for (let i = 0; i < ZONES.length; i++) {
      const z = ZONES[i]!
      const zy = look.lying && i >= LEG_L ? 8 : z.y
      const d = dist(lx, ly, z.x, zy) - z.r
      if (d < pad && d < bestD) {
        best = i
        bestD = d
      }
    }
    return best
  }

  const teddyHit = (px: number, py: number): boolean => {
    if (behindTub && py > frontRim(px) - 4) return false
    return zoneAt(px, py, 8) >= 0
  }

  const ripple = (x: number, y: number, r = 6) => {
    if (ripples.length > 14) ripples.shift()
    ripples.push({ x, y, r, life: 1 })
  }

  const touchRing = (p: Pointer, alpha = 0.45) => fx.ring(p.x, p.y, `rgba(255,246,222,${alpha})`, 28, 0.4)

  const setVeil = (color: string, rate: number, then: () => void) => {
    veilColor = color
    veilRate = rate
    veilTarget = 1
    atVeil = then
  }

  // ---------------------------------------------------------------- teddy
  const liftTeddy = () => {
    lifted = true
    look.lying = false
    sq.value = 1.07
    wantY -= 14
    pat(0.06)
    clearOfTub = home !== 'tub'
    if (home === 'tub' && level > 0.1) {
      ripple(look.x, surfY(), 40)
      plip(0.06)
      dripUntil = stage.time + 14
    }
  }

  const grabTeddy = (p: Pointer) => {
    holder = p.id
    grabX = look.x - p.x
    grabY = look.y - p.y
    wantX = look.x
    wantY = look.y
    lifted = false
    holds.set(p.id, { kind: 'teddy', moved: 0 })
    if (home === 'bed') {
      // In bed a touch is a pat; only a real pull lifts him out.
      sq.value = 0.96
      patSmile = 1
      pat(0.07)
    } else {
      liftTeddy()
    }
  }

  const startMove = (to: Home) => {
    const [tx, ty] = homePos(to)
    const peak = to === 'tub' ? Math.max(50, look.y - 468) : to === 'bed' ? 50 : 34
    const d = dist(look.x, look.y, tx, ty)
    move = { fx: look.x, fy: look.y, tx, ty, t: 0, dur: clamp(d / 900, 0.28, 0.6) + 0.12, peak }
    home = to
    if (to !== 'tub') behindTub = false
  }

  const land = () => {
    move = null
    sq.value = 0.86
    rot.value *= 0.3
    if (home === 'tub') {
      behindTub = true
      if (level > 0.1) {
        patSmile = 1
        splash(0.15)
        for (let i = 0; i < 3; i++) ripple(TUB.cx + (i - 1) * 60, surfY(), 30 + i * 20)
        fx.burst(TUB.cx, surfY() - 6, { count: 9, color: ['#bfe0ea', '#e6f5f8'], speed: 260, life: 0.55, size: 6, gravity: 900, angle: -Math.PI / 2, spread: 2.2 })
      } else {
        tok(210, 0.1)
      }
    } else if (home === 'bed') {
      look.lying = true
      pat(0.1)
      cloth(0.05)
      if (!isMorning) nightTo = 1
    } else {
      pat(0.1)
    }
  }

  const goBedroom = () => {
    cloth(0.04)
    setVeil('#f6dcb8', 2.4, () => {
      room = 1
      home = 'rug'
      look.x = RUG.x
      look.y = RUG.y - 30
      wantX = look.x
      wantY = look.y
      behindTub = false
      tapOn = false
      flow = 0
      holds.clear()
      soap.held = jug.held = towel.held = -1
      startMove('rug')
    })
  }

  const newDay = () => {
    // Off to play. The day turns behind a slow wash of daylight.
    setVeil('#fff4d8', 0.7, () => stage.restart())
  }

  const dropTeddy = () => {
    holder = -1
    if (!lifted) return
    lifted = false
    if (room === 0) {
      if (look.x > 1000) {
        goBedroom()
        return
      }
      startMove(!clearOfTub || Math.abs(look.x - TUB.cx) < 255 ? 'tub' : 'mat')
    } else {
      if (isMorning && look.x < 215) {
        newDay()
        return
      }
      startMove(look.x > 700 ? 'bed' : 'rug')
    }
  }

  const zoneDry = (z: number) => {
    look.wet[z] = 0
    look.fluff[z] = 1
    const zone = ZONES[z]!
    fx.burst(look.x + zone.x, look.y + zone.y, { count: 5, color: ['#fff6e2', '#f3dcb4'], speed: 70, life: 0.7, size: 6, gravity: -30, drag: 0.94 })
    sfx.noise({ dur: 0.22, freq: 2600, vol: 0.03, filter: 'highpass' })
    sq.kick(0.8)
  }

  // ------------------------------------------------------------- the bath
  const jugTip = (): [number, number] => {
    const c = Math.cos(jug.tilt)
    const s = Math.sin(jug.tilt)
    return [jug.x + JUG_PIVOT.x - 10 * c - 8 * s, jug.y + JUG_PIVOT.y + 10 * s - 8 * c]
  }

  const soak = (z: number) => {
    look.wet[z] = 1
    look.fluff[z] = 0
  }

  const toggleTap = () => {
    tapOn = !tapOn
    tapAngleTo += tapOn ? Math.PI / 2 : -Math.PI / 2
    sfx.tone({ freq: 760, to: tapOn ? 1040 : 600, dur: 0.1, type: 'sine', vol: 0.035 })
    woodClick(0.04)
    waterSndAt = 0
  }

  const rubSoap = (p: Pointer) => {
    const d = Math.hypot(p.dx, p.dy)
    if (d <= 0) return
    const lx = soap.x - look.x
    const ly = soap.y - look.y
    const z = settled() ? zoneAt(soap.x, soap.y, 26) : -1
    if (z < 0) return
    const inWater = home === 'tub' && level > 0.15
    const canLather = inWater || (look.wet[z] ?? 0) > 0.4
    soap.snd += d
    if (!canLather) {
      // Dry soap on dry fur only squeaks.
      if (soap.snd > 70) {
        soap.snd = 0
        sfx.noise({ dur: 0.06, freq: 1800, vol: 0.02, q: 4 })
        sq.kick(0.25)
      }
      return
    }
    soak(z)
    if (z === HEAD) look.leaf = Math.max(0, look.leaf - d / 120)
    for (const spot of look.spots) {
      if (spot.amount > 0 && dist(lx, ly, spot.x, spot.y) < spot.r + 50) spot.amount = Math.max(0, spot.amount - d / 150)
    }
    soapy = Math.min(1, soapy + d / 7000)
    soap.acc += d
    const waterLine = home === 'tub' ? surfY() - look.y - 8 : 1e9
    if (soap.acc > 20 && ly < waterLine + 30) {
      soap.acc = 0
      const zone = ZONES[z]!
      let bx = lx + (Math.random() - 0.5) * 34 - zone.x
      let by = ly + (Math.random() - 0.5) * 30 - zone.y
      const far = Math.hypot(bx, by) / (zone.r * 0.76)
      if (far > 1) {
        bx /= far
        by /= far
      }
      const blob = { x: zone.x + bx, y: zone.y + by, r: 9 + Math.random() * 9, pop: 0 }
      if (look.foam.length >= 64) look.foam.splice(Math.floor(Math.random() * 20), 1)
      look.foam.push(blob)
    }
    if (soap.snd > 44) {
      soap.snd = 0
      sfx.noise({ dur: 0.1, freq: 2300 + Math.random() * 900, vol: 0.035, q: 3 })
      sq.kick(0.35)
      if (Math.random() < 0.35) {
        fx.burst(soap.x, soap.y - 20, { count: 1, color: 'rgba(255,255,255,0.85)', shape: 'ring', speed: 46, life: 1.3, size: 9, gravity: -50, angle: -Math.PI / 2, spread: 1.4, drag: 0.97 })
        sfx.tone({ freq: 1300 + Math.random() * 500, to: 1900, dur: 0.035, type: 'sine', vol: 0.02, delay: 0.5 + Math.random() * 0.5 })
      }
    }
  }

  const rubTowel = (p: Pointer) => {
    const d = Math.hypot(p.dx, p.dy)
    if (d <= 0) return
    towel.acc += d
    if (towel.acc > 46) {
      towel.acc = 0
      cloth(0.05)
    }
    if (!settled()) return
    const lx = towel.x - look.x
    const ly = towel.y - look.y
    const soaking = home === 'tub' && level > 0.15
    let touched = false
    for (let z = 0; z < ZONES.length; z++) {
      const zone = ZONES[z]!
      const zy = look.lying && z >= LEG_L ? 8 : zone.y
      if (dist(lx, ly, zone.x, zy) > zone.r + 62) continue
      touched = true
      const w = look.wet[z] ?? 0
      if (w <= 0 || soaking) continue
      const next = w - d / 300
      look.fluff[z] = Math.min(1, (look.fluff[z] ?? 0) + d / 300)
      if (next <= 0) zoneDry(z)
      else look.wet[z] = next
    }
    if (touched) {
      sq.kick(d * 0.006)
      rot.kick(p.dx * 0.004)
      for (let i = look.foam.length - 1; i >= 0; i--) {
        const f = look.foam[i]!
        if (dist(lx, ly, f.x, f.y) < 80) {
          f.r -= d * 0.12
          if (f.r < 4) look.foam.splice(i, 1)
        }
      }
    }
  }

  const updateBath = (dt: number) => {
    tapAngle = damp(tapAngle, tapAngleTo, 9, dt)
    flow = damp(flow, tapOn ? 1 : 0, 6, dt)
    const before = level
    if (tapOn) level += dt / 5.5
    if (!plugged) level -= dt / 4
    level = clamp(level, 0, 1)
    plugPull.target = plugged ? 0 : 1
    plugPull.update(dt)
    if (!plugged && room === 0) {
      // The water goes down the hole with a gurgle, and a last glug.
      if (level > 0.02 && stage.time >= drainSndAt) {
        drainSndAt = stage.time + 0.34 + Math.random() * 0.2
        const f = 190 + Math.random() * 130
        sfx.tone({ freq: f, to: f * 0.55, dur: 0.2, type: 'sine', vol: 0.07 })
        sfx.noise({ dur: 0.3, freq: 520, vol: 0.035, q: 1.2 })
        ripple(TUB.cx + 150, surfY() + 6, 4)
      }
      if (before > 0.02 && level <= 0.02) {
        sfx.tone({ freq: 280, to: 110, dur: 0.3, type: 'sine', vol: 0.09 })
        sfx.tone({ freq: 340, to: 120, dur: 0.3, type: 'sine', vol: 0.07, delay: 0.28 })
        soapy = 0
      }
    }
    const lift = home === 'tub' && settled() ? 0.12 : 0
    shown = damp(shown, Math.min(1.08, level + (level > 0.05 ? lift : 0)), 4, dt)
    if (room === 0 && flow > 0.5 && stage.time >= waterSndAt) {
      waterSndAt = stage.time + 0.36
      const full = level >= 1 ? 0.6 : 1
      sfx.noise({ dur: 0.5, freq: 1300 + Math.random() * 500, vol: 0.04 * full, q: 0.7 })
      sfx.noise({ dur: 0.5, freq: lerp(240, 640, level), vol: 0.05 * full, filter: 'lowpass' })
      if (level > 0.03) {
        ripple(TAP.sx, surfY(), 5)
        fx.burst(TAP.sx, surfY() - 2, { count: 2, color: ['#bfe0ea', '#e6f5f8'], speed: 110, life: 0.35, size: 4, gravity: 600, angle: -Math.PI / 2, spread: 2 })
      }
    }
    for (let i = ripples.length - 1; i >= 0; i--) {
      const r = ripples[i]!
      r.r += dt * 70
      r.life -= dt * 0.9
      if (r.life <= 0) ripples.splice(i, 1)
    }
    for (const f of look.foam) f.pop = Math.min(1, f.pop + dt * 7)

    // Sitting in the water: fur soaks, the mud below the waterline lets go.
    if (home === 'tub' && settled() && level > 0.2) {
      for (const z of [BODY, ARM_L, ARM_R, LEG_L, LEG_R]) {
        look.wet[z] = Math.min(1, (look.wet[z] ?? 0) + dt * 2.5)
        look.fluff[z] = Math.max(0, (look.fluff[z] ?? 0) - dt * 2.5)
      }
      const line = surfY() - look.y
      for (const spot of look.spots) if (spot.y > line - 10 && spot.amount > 0) spot.amount = Math.max(0, spot.amount - dt / 2.2)
      for (let i = look.foam.length - 1; i >= 0; i--) {
        const f = look.foam[i]!
        if (f.y > line - 4) {
          f.r -= dt * 14
          if (f.r < 3) look.foam.splice(i, 1)
        }
      }
    }

    // Tools drift home when the hand lets go.
    if (soap.held < 0 && stage.time >= soap.freeAt) {
      soap.x = damp(soap.x, SOAP_HOME.x, 9, dt)
      soap.y = damp(soap.y, SOAP_HOME.y, 9, dt)
    }
    soap.tilt = damp(soap.tilt, soap.held >= 0 ? -0.25 : 0, 8, dt)
    if (towel.held < 0) {
      if (stage.time >= towel.freeAt) {
        towel.x = damp(towel.x, TOWEL_HOME.x, 9, dt)
        towel.y = damp(towel.y, TOWEL_HOME.y, 9, dt)
      }
      const near = dist(towel.x, towel.y, TOWEL_HOME.x, TOWEL_HOME.y) < 26
      if (near && towel.hang < 0.5) {
        towelSway.kick(60)
        cloth(0.05)
      }
      towel.hang = near ? Math.min(1, towel.hang + dt * 5) : 0
    } else {
      towel.hang = 0
    }
    towel.vx = damp(towel.vx, 0, 6, dt)
    towel.vy = damp(towel.vy, 0, 6, dt)
    towelSway.update(dt)

    // The jug: lifted over the tub it tips and pours; dipped in, it fills.
    const overTub = jug.held >= 0 && jug.y < 486 && jug.x - 41 > TUB.cx - TUB.rx + 20 && jug.x - 41 < TUB.cx + TUB.rx - 20
    jug.dip = jug.held >= 0 && jug.y > 500 && jug.y < 660 && Math.abs(jug.x - TUB.cx) < TUB.rx - 50 && level > 0.2
    if (jug.held < 0 && stage.time >= jug.freeAt) {
      jug.x = damp(jug.x, JUG_HOME.x, 9, dt)
      jug.y = damp(jug.y, JUG_HOME.y, 9, dt)
    }
    jug.tilt = damp(jug.tilt, overTub ? 1.15 + (1 - jug.water) * 0.5 : jug.dip ? 0.75 : 0, 6, dt)
    if (jug.dip && jug.water < 1) {
      jug.water = Math.min(1, jug.water + dt * 1.5)
      if (stage.time >= jug.sndAt) {
        jug.sndAt = stage.time + 0.2
        sfx.tone({ freq: 170 + jug.water * 160, to: 300 + jug.water * 200, dur: 0.1, type: 'sine', vol: 0.07 })
        ripple(jug.x, surfY(), 14)
      }
    }
    jug.pouring = overTub && jug.tilt > 0.8 && jug.water > 0
    if (jug.pouring) {
      jug.water = Math.max(0, jug.water - dt / 9)
      const [tipX, tipY] = jugTip()
      jug.landX = tipX - 4
      let landY = level > 0.03 ? surfY() : TUB.rimY + 30
      jug.onTeddy = false
      if (home === 'tub' && settled()) {
        const dx = jug.landX - look.x
        let top = 1e9
        if (Math.abs(dx) < 98) top = look.y - 285 - 90 * Math.sqrt(1 - (dx / 100) ** 2)
        else if (Math.abs(dx) < 150) top = look.y - 215
        // Poured from beside his face it still wets him from there down.
        if (top < 1e8 && tipY < look.y - 150) {
          top = Math.max(top, tipY + 10)
          landY = top
          jug.onTeddy = true
          const high = top < look.y - 250
          if (high && Math.abs(dx) < 100) {
            soak(HEAD)
            look.leaf = Math.max(0, look.leaf - dt * 2)
          }
          if (high && Math.abs(dx + 74) < 58) soak(EAR_L)
          if (high && Math.abs(dx - 74) < 58) soak(EAR_R)
          if (dx < -60) soak(ARM_L)
          if (dx > 60) soak(ARM_R)
          soak(BODY)
          for (let i = look.foam.length - 1; i >= 0; i--) {
            const f = look.foam[i]!
            if (Math.abs(f.x - dx) < 84 && f.y > top - look.y - 24) {
              f.r -= dt * 20
              f.y += dt * 50
              if (f.r < 3.5) look.foam.splice(i, 1)
            }
          }
          // Water alone only loosens mud; soap takes it off.
          for (const spot of look.spots) {
            if (Math.abs(spot.x - dx) < 80 && spot.y > top - look.y - 30 && spot.amount > 0.45) spot.amount = Math.max(0.45, spot.amount - dt * 0.5)
          }
        }
      }
      jug.landY = landY
      if (level < 1) level = Math.min(1, level + dt * 0.02)
      if (stage.time >= jug.sndAt) {
        jug.sndAt = stage.time + 0.3
        sfx.noise({ dur: 0.34, freq: 1000 + Math.random() * 400, vol: 0.05, q: 0.9 })
        plip(0.035)
      }
      if (stage.time >= jug.splashAt) {
        jug.splashAt = stage.time + 0.1
        fx.burst(jug.landX, landY, { count: 2, color: ['#bfe0ea', '#e6f5f8'], speed: 120, life: 0.35, size: 4.5, gravity: 600, angle: -Math.PI / 2, spread: 2.4 })
        if (!jug.onTeddy) ripple(jug.landX, landY, 6)
      }
    }

    // Out of the water he drips for a while.
    if (room === 0 && home !== 'tub' && stage.time < dripUntil && stage.time >= dripAt) {
      dripAt = stage.time + 0.28
      const wetZones = [BODY, ARM_L, ARM_R, LEG_L, LEG_R, HEAD].filter((z) => (look.wet[z] ?? 0) > 0.5)
      if (wetZones.length > 0) {
        const z = ZONES[wetZones[Math.floor(Math.random() * wetZones.length)]!]!
        fx.burst(look.x + z.x + (Math.random() - 0.5) * 60, look.y + z.y + z.r * 0.6, { count: 1, color: '#a9d2e2', speed: 12, life: 0.5, size: 5, gravity: 900 })
      }
    }
  }

  // ---------------------------------------------------------- the bedroom
  const stepLamp = () => {
    lampIndex = (lampIndex + 1) % LAMP_LEVELS.length
    bead.kick(110)
    sfx.tone({ freq: 1500, dur: 0.02, type: 'square', vol: 0.025 })
    tok(320, 0.05)
  }

  const putOn = (index: number) => {
    const item = pjs[index]!
    for (const other of pjs) {
      if (other.where === 'teddy') {
        other.where = 'drawer'
        other.x = look.x
        other.y = look.y - 130
        other.back = 0
      }
    }
    item.where = 'teddy'
    look.pj = { style: item.style, sleeve: [0, 0], button: [0, 0, 0] }
    sq.value = 0.92
    cloth(0.08)
    pat(0.05)
  }

  const dressTarget = (p: Pointer): Hold | { kind: 'button'; index: number } | null => {
    const pj = look.pj
    if (!pj || !settled()) return null
    if (home === 'bed' && p.y > blanketY - 26) return null
    let best: Hold | { kind: 'button'; index: number } | null = null
    let score = 1
    for (const side of [0, 1] as const) {
      if (pj.sleeve[side] >= 1) continue
      const [sx, sy] = sleevePoint(side === 0 ? -1 : 1)
      const d = dist(p.x, p.y, look.x + sx, look.y + sy) / 90
      if (d < score) {
        score = d
        best = { kind: 'sleeve', side, acc: 0 }
      }
    }
    for (let i = 0; i < 3; i++) {
      if (pj.button[i]! > 0) continue
      const d = dist(p.x, p.y, look.x + 18, look.y + BUTTON_Y[i]!) / 60
      if (d < score) {
        score = d
        best = { kind: 'button', index: i }
      }
    }
    return best
  }

  const pushButton = (index: number) => {
    const pj = look.pj
    if (!pj) return
    pj.button[index as 0 | 1 | 2] = 0.02
    cloth(0.04)
    sq.kick(-0.6)
    stage.tween(
      0.3,
      (t) => {
        pj.button[index as 0 | 1 | 2] = Math.max(0.02, t)
      },
      ease.inOutQuad,
      () => {
        woodClick(0.07)
        sfx.tone({ freq: 230, to: 310, dur: 0.06, type: 'sine', vol: 0.06 })
      },
    )
  }

  const dawn = () => {
    isMorning = true
    wound = 0
    lullaby = 0
    birdAt = stage.time + 2.4
    stage.after(2.2, () => {
      stage.tween(1.8, (t) => (stretch = Math.sin(t * Math.PI)), ease.linear)
      cloth(0.04)
    })
  }

  // Morning only comes when the child goes to the curtains after he has slept.
  const maybeDawn = () => {
    if (!isMorning && sleptFor > 2 && (openL + openR) / 2 > 0.5) dawn()
  }

  const chirp = () => {
    const base = 2300 + Math.random() * 500
    for (let i = 0; i < 3; i++) sfx.tone({ freq: base + i * 180, to: base + 500 + i * 120, dur: 0.07, type: 'sine', vol: 0.03, delay: i * 0.13 })
  }

  const updateBedroom = (dt: number) => {
    drawer = damp(drawer, drawerTo, 9, dt)
    lampGlow = damp(lampGlow, LAMP_LEVELS[lampIndex]!, 3.5, dt)
    bead.update(dt)
    nightSky = Math.min(nightTo, nightSky + dt * 0.14)
    if (isMorning) morning = Math.min(1, morning + dt / 4.5)

    for (let i = 0; i < pjs.length; i++) {
      const item = pjs[i]!
      if (item.where !== 'drawer' || item.back >= 1) continue
      const [sx, sy] = slot(i)
      item.x = damp(item.x, sx, 8, dt)
      item.y = damp(item.y, sy, 8, dt)
      if (dist(item.x, item.y, sx, sy) < 4) item.back = 1
    }
    for (const f of friends) {
      f.sq.update(dt)
      if (f.where === 'shelf' && f.held < 0) {
        f.x = damp(f.x, f.hx, 9, dt)
        f.y = damp(f.y, f.hy, 9, dt)
      }
      f.rot = damp(f.rot, 0, 6, dt)
    }

    // The music box unwinds, slower and slower.
    crank += dt * (wound > 0 && !holdsKind('crank') ? -2.4 * (0.4 + wound) : 0)
    const playing = wound > 0 && !holdsKind('crank')
    lid = damp(lid, playing ? 1 : 0, 5, dt)
    if (playing) {
      wound = Math.max(0, wound - dt / 24)
      lullaby = Math.min(1, lullaby + dt / 9)
      if (stage.time >= noteAt) {
        const step = LULLABY[noteIndex % LULLABY.length]!
        noteIndex++
        noteAt = stage.time + lerp(0.78, 0.42, Math.min(1, wound * 2.5))
        if (step >= 0 && room === 1) chime(step, 0.075)
      }
    }

    // How light the room is, from the lamp and whatever the window lets in.
    const skyLight = lerp(lerp(0.4, 0.1, nightSky), 1.5, morning)
    const open = (openL + openR) / 2
    bright = clamp(0.12 + lampGlow * 0.75 + open * skyLight * 0.6, 0, 1)
    const dark = clamp((0.62 - bright) / 0.45, 0, 1)

    // Teddy's eyes: heavy with the blanket and the tune, shut in the dark.
    let drowsy = 0
    if (inBed()) drowsy = isMorning ? (dark > 0.6 ? 0.8 : 0) : 0.1 + 0.25 * tucked() + 0.3 * lullaby + 0.45 * dark
    const eyeTo = drowsy >= 0.75 ? 1 : drowsy * 0.72
    sleepEye += clamp(eyeTo - sleepEye, -dt * 0.8, dt * 0.32)
    if (sleepEye > 0.97 && !isMorning) sleptFor += dt

    if (isMorning && morning > 0.4 && room === 1 && stage.time >= birdAt) {
      birdAt = stage.time + 12 + Math.random() * 9
      chirp()
    }
  }

  const holdsKind = (kind: Hold['kind']): boolean => {
    for (const h of holds.values()) if (h.kind === kind) return true
    return false
  }

  // ----------------------------------------------------------------- hint
  // After a quiet while the next thing in the room catches the light.
  const hintAt = (): [number, number] | null => {
    if (holds.size > 0 || move || veil > 0.05) return null
    if (room === 0) {
      const dirty = look.spots.some((s) => s.amount > 0.3)
      const foamy = look.foam.length > 3
      const wet = look.wet.some((w) => w > 0.3)
      if (home === 'mat') {
        if (dirty && level < 0.5) return tapOn ? null : [TAP.hx + 10, TAP.hy - 8]
        if (dirty) return [TUB.cx - 110, surfY() - 2]
        if (wet || foamy) return [TOWEL_HOME.x - 28, TOWEL_HOME.y + 96]
        return [DOOR_A.x + 50, 420]
      }
      if (level < 0.3) return tapOn ? null : [TAP.hx + 10, TAP.hy - 8]
      if (dirty) return [soap.x - 12, soap.y - 10]
      if (foamy) return [jug.x - 14, jug.y - 74]
      return [TOWEL_HOME.x - 28, TOWEL_HOME.y + 96]
    }
    if (isMorning || sleepEye > 0.9 || bright < 0.5) return null
    const pj = look.pj
    if (!pj) {
      if (drawerTo < 0.5) return [DRAWER.x + 62, DRAWER.y + 40]
      const [sx, sy] = slot(1)
      return [sx + 10, sy - 6]
    }
    if (home !== 'bed' || tucked() < 0.3) {
      for (const side of [0, 1] as const) {
        if (pj.sleeve[side] < 1) {
          const [sx, sy] = sleevePoint(side === 0 ? -1 : 1)
          return [look.x + sx, look.y + sy + 40]
        }
      }
      for (let i = 0; i < 3; i++) if (pj.button[i]! < 1) return [look.x + 26, look.y + BUTTON_Y[i]! - 6]
    }
    if (home !== 'bed') return [BED.x + BED.w / 2 + 60, 380]
    if (tucked() < 0.6) return [BED.x + BED.w / 2, blanketY + 16]
    if (!friends.some((f) => f.where === 'bed')) return [friends[1]!.x + 26, friends[1]!.y - 22]
    if (lullaby < 0.2 && wound <= 0) return [MBOX.ax + 4, MBOX.ay - 6]
    if (openL > 0.3) return [edgeL() - 12, 230]
    if (openR > 0.3) return [edgeR() + 12, 230]
    if (lampIndex < 2) return [LAMP.x + 44, LAMP.y - 44]
    return null
  }

  // ------------------------------------------------------------- pointers
  const downBath = (p: Pointer) => {
    if (soap.held < 0 && dist(p.x, p.y, soap.x, soap.y) < 64) {
      soap.held = p.id
      holds.set(p.id, { kind: 'soap', ox: soap.x - p.x, oy: soap.y - p.y - 6 })
      sfx.noise({ dur: 0.05, freq: 2000, vol: 0.03, q: 3 })
      tok(260, 0.04)
      return
    }
    if (jug.held < 0 && dist(p.x, p.y, jug.x, jug.y - 58) < 80) {
      jug.held = p.id
      holds.set(p.id, { kind: 'jug', ox: jug.x - p.x, oy: jug.y - p.y - 8 })
      sfx.tone({ freq: 620, to: 560, dur: 0.12, type: 'triangle', vol: 0.035 })
      if (jug.water > 0.2) plip(0.04)
      return
    }
    if (towel.held < 0 && (towel.hang > 0.5 ? inRect(p.x, p.y, towel.x - 72, towel.y - 14, 144, 232) : dist(p.x, p.y, towel.x, towel.y) < 96)) {
      towel.held = p.id
      holds.set(p.id, { kind: 'towel', ox: 0, oy: 0 })
      towel.x = p.x
      towel.y = p.y
      cloth(0.07)
      return
    }
    if (dist(p.x, p.y, TAP.hx, TAP.hy) < 74) {
      toggleTap()
      return
    }
    if (dist(p.x, p.y, PLUG.x, PLUG.y + plugPull.value * 40) < 52) {
      plugged = !plugged
      plugPull.kick(plugged ? -3 : 3)
      if (plugged) tok(240, 0.07)
      else sfx.tone({ freq: 420, to: 170, dur: 0.09, type: 'sine', vol: 0.09 })
      drainSndAt = stage.time + 0.15
      return
    }
    if (holder < 0 && !move && teddyHit(p.x, p.y)) {
      grabTeddy(p)
      return
    }
    if (level > 0.05 && inOpening(p.x, p.y)) {
      ripple(p.x, clamp(p.y, surfY() - 14, surfY() + 20), 6)
      plip(0.08)
      fx.burst(p.x, surfY(), { count: 3, color: ['#bfe0ea', '#e6f5f8'], speed: 130, life: 0.4, size: 4.5, gravity: 700, angle: -Math.PI / 2, spread: 1.6 })
      return
    }
    if (inRect(p.x, p.y, TUB.cx - TUB.rx, TUB.rimY - 30, TUB.rx * 2, TUB.bottom - TUB.rimY + 50)) {
      tok(level > 0.5 ? 180 : 240, 0.09)
      touchRing(p, 0.3)
      return
    }
    touchRing(p)
    if (p.y > 660) tok(210, 0.06)
    else if (inRect(p.x, p.y, 56, 52, 218, 240)) sfx.tone({ freq: 1900, dur: 0.08, type: 'sine', vol: 0.025 })
    else pat(0.05)
  }

  const downBedroom = (p: Pointer) => {
    for (let i = friends.length - 1; i >= 0; i--) {
      const f = friends[i]!
      if (f.held >= 0 || dist(p.x, p.y, f.x, f.y - 50) > 64) continue
      if (f.where === 'bed' && p.y > blanketY - 14) continue
      f.held = p.id
      f.where = 'held'
      f.sq.value = 1.12
      holds.set(p.id, { kind: 'friend', index: i, ox: f.x - p.x, oy: f.y - p.y })
      cloth(0.05)
      if (f.kind === 'bunny') {
        sfx.tone({ freq: 2100, dur: 0.25, type: 'sine', vol: 0.03 })
        sfx.tone({ freq: 3160, dur: 0.14, type: 'sine', vol: 0.014 })
      }
      return
    }
    if (drawer > 0.7) {
      for (let i = 0; i < pjs.length; i++) {
        const item = pjs[i]!
        const [sx, sy] = slot(i)
        if (item.where !== 'drawer' || item.back < 1 || dist(p.x, p.y, sx, sy) > 50) continue
        item.where = 'held'
        item.x = p.x
        item.y = p.y
        holds.set(p.id, { kind: 'pj', index: i })
        cloth(0.07)
        return
      }
    }
    if (dist(p.x, p.y, MBOX.ax, MBOX.ay) < 58 || inRect(p.x, p.y, MBOX.x - 6, MBOX.y - 12, MBOX.w + 12, MBOX.h + 14)) {
      holds.set(p.id, { kind: 'crank', last: Math.atan2(p.y - MBOX.ay, p.x - MBOX.ax), turned: 0 })
      wound = Math.min(1, wound + 0.22)
      crank += 1.2
      for (let i = 0; i < 3; i++) sfx.tone({ freq: 1700 + i * 60, dur: 0.02, type: 'triangle', vol: 0.04, delay: i * 0.06 })
      noteAt = stage.time + 0.5
      return
    }
    if (inRect(p.x, p.y, LAMP.x - 72, LAMP.y - 170, 150, 172)) {
      stepLamp()
      return
    }
    if (holder < 0 && !move) {
      if (home === 'bed') {
        if (inBedRect(p.x, p.y) && p.y > blanketY - 26) {
          holds.set(p.id, { kind: 'blanket' })
          blanketPull = p.x
          cloth(0.06)
          return
        }
        const target = dressTarget(p)
        if (target && target.kind === 'button') {
          pushButton(target.index)
          return
        }
        if (target) {
          holds.set(p.id, target)
          cloth(0.05)
          return
        }
        if (teddyHit(p.x, p.y)) {
          grabTeddy(p)
          return
        }
      } else {
        const target = dressTarget(p)
        if (target && target.kind === 'button') {
          pushButton(target.index)
          return
        }
        if (target) {
          holds.set(p.id, target)
          cloth(0.05)
          return
        }
        if (teddyHit(p.x, p.y)) {
          grabTeddy(p)
          return
        }
      }
    }
    if (inBedRect(p.x, p.y) && p.y > blanketY - 26 && !holdsKind('blanket')) {
      holds.set(p.id, { kind: 'blanket' })
      blanketPull = p.x
      cloth(0.06)
      return
    }
    if (inRect(p.x, p.y, 428, 74, 276, 300)) {
      const side: 0 | 1 = p.x < (edgeL() + edgeR()) / 2 ? 0 : 1
      holds.set(p.id, { kind: 'curtain', side, off: (side === 0 ? edgeL() : edgeR()) - p.x, acc: 0 })
      cloth(0.05)
      woodClick(0.03)
      maybeDawn()
      return
    }
    if (dist(p.x, p.y, NIGHT.x, NIGHT.y) < 44) {
      chime(-3, 0.035)
      return
    }
    if (inRect(p.x, p.y, DRAWER.x - 8, DRAWER.y - 6, DRAWER.w + 16, DRAWER.h + 12 + 70 * drawer)) {
      drawerTo = drawerTo > 0.5 ? 0 : 1
      sfx.noise({ dur: 0.28, freq: 480, vol: 0.06, q: 2 })
      stage.after(0.22, () => tok(210, 0.08))
      return
    }
    if (inRect(p.x, p.y, DOOR_B.x - 10, DOOR_B.y, DOOR_B.w + 30, DOOR_B.h)) {
      tok(230, 0.07)
      touchRing(p, 0.3)
      return
    }
    touchRing(p, 0.15 + 0.3 * bright)
    if (inBedRect(p.x, p.y) || inRect(p.x, p.y, BED.x, 300, BED.w, 120)) pat(0.06)
    else if (inRect(p.x, p.y, CHEST.x, CHEST.y, CHEST.w, CHEST.h) || p.y > 640) tok(200, 0.05 + 0.02 * bright)
    else pat(0.04)
  }

  const moveHold = (p: Pointer, h: Hold) => {
    const d = Math.hypot(p.dx, p.dy)
    if (h.kind === 'teddy') {
      h.moved += d
      if (!lifted && h.moved > 28) liftTeddy()
      if (lifted) {
        wantX = p.x + grabX
        wantY = p.y + grabY - 14
      }
    } else if (h.kind === 'soap') {
      soap.x = p.x + h.ox
      soap.y = p.y + h.oy
      rubSoap(p)
    } else if (h.kind === 'jug') {
      jug.x = clamp(p.x + h.ox, 60, W - 40)
      jug.y = clamp(p.y + h.oy, 150, 760)
    } else if (h.kind === 'towel') {
      towel.x = p.x
      towel.y = p.y
      towel.vx = p.vx
      towel.vy = p.vy
      rubTowel(p)
    } else if (h.kind === 'pj') {
      const item = pjs[h.index]!
      item.x = p.x
      item.y = p.y
    } else if (h.kind === 'friend') {
      const f = friends[h.index]!
      f.x = p.x + h.ox
      f.y = p.y + h.oy
      f.rot = clamp(p.vx * 0.0006, -0.4, 0.4)
    } else if (h.kind === 'blanket') {
      const before = blanketY
      blanketY = clamp(blanketY + p.dy, BED.chinY, BED.footY)
      blanketPull = clamp(p.x, BED.x + 60, BED.x + BED.w - 60)
      blanketAcc += Math.abs(blanketY - before)
      if (blanketAcc > 38) {
        blanketAcc = 0
        cloth(0.055)
      }
    } else if (h.kind === 'curtain') {
      const x = p.x + h.off
      const before = h.side === 0 ? openL : openR
      if (h.side === 0) openL = clamp((CUR.closedL - x) / (CUR.closedL - CUR.openL), 0, 1)
      else openR = clamp((x - CUR.closedR) / (CUR.openR - CUR.closedR), 0, 1)
      h.acc += Math.abs((h.side === 0 ? openL : openR) - before) * 68
      if (h.acc > 12) {
        h.acc = 0
        woodClick(0.04)
        cloth(0.03)
      }
      maybeDawn()
    } else if (h.kind === 'crank') {
      const a = Math.atan2(p.y - MBOX.ay, p.x - MBOX.ax)
      let da = a - h.last
      if (da > Math.PI) da -= TAU
      if (da < -Math.PI) da += TAU
      h.last = a
      if (dist(p.x, p.y, MBOX.ax, MBOX.ay) > 12) {
        crank += da
        wound = Math.min(1, wound + Math.abs(da) / 14)
        h.turned += Math.abs(da)
        if (h.turned > 0.5) {
          h.turned = 0
          sfx.tone({ freq: 1700 + Math.random() * 120, dur: 0.02, type: 'triangle', vol: 0.04 })
        }
      }
    } else if (h.kind === 'sleeve') {
      const pj = look.pj
      if (!pj) return
      const before = pj.sleeve[h.side]
      if (before >= 1) return
      const next = Math.min(1, before + d / 150)
      pj.sleeve[h.side] = next
      h.acc += d
      if (h.acc > 40) {
        h.acc = 0
        cloth(0.045)
      }
      if (before < 0.9 && next >= 0.9) {
        sfx.tone({ freq: 300, to: 520, dur: 0.07, type: 'sine', vol: 0.08 })
        sq.kick(1.2)
        rot.kick(h.side === 0 ? -0.5 : 0.5)
      }
    }
  }

  const upHold = (p: Pointer, h: Hold) => {
    if (h.kind === 'teddy') {
      dropTeddy()
    } else if (h.kind === 'soap') {
      soap.held = -1
      soap.freeAt = stage.time + 0.9
      stage.after(1.2, () => {
        if (soap.held < 0) tok(300, 0.035)
      })
    } else if (h.kind === 'jug') {
      jug.held = -1
      jug.freeAt = stage.time + 0.9
      stage.after(1.2, () => {
        if (jug.held < 0) sfx.tone({ freq: 560, to: 500, dur: 0.1, type: 'triangle', vol: 0.035 })
      })
    } else if (h.kind === 'towel') {
      towel.held = -1
      towel.freeAt = stage.time + 0.9
    } else if (h.kind === 'pj') {
      const item = pjs[h.index]!
      if (settled() && dist(p.x, p.y, look.x, look.y - 150) < 210 && !(home === 'bed' && tucked() > 0.5)) {
        putOn(h.index)
      } else {
        item.where = 'drawer'
        item.back = 0
        cloth(0.04)
      }
    } else if (h.kind === 'friend') {
      const f = friends[h.index]!
      f.held = -1
      f.sq.value = 0.82
      if (inRect(p.x, p.y, BED.x - 20, 300, BED.w + 40, BED.h + 30)) {
        f.where = 'bed'
        f.x = clamp(f.x, BED.x + 34, BED.x + BED.w - 34)
        f.y = clamp(f.y, 446, 690)
        // Beside Teddy's head, never on his face.
        if (home === 'bed' && f.y - 60 < BED.ty - 190 && Math.abs(f.x - BED.tx) < 132) {
          f.x = f.x < BED.tx - 20 ? BED.tx - 138 : BED.tx + 138
          f.x = clamp(f.x, BED.x + 30, BED.x + BED.w - 34)
        }
        pat(0.07)
      } else {
        f.where = 'shelf'
        cloth(0.04)
        stage.after(0.35, () => tok(230, 0.04))
      }
    } else if (h.kind === 'blanket') {
      cloth(0.04)
    }
  }

  // ---------------------------------------------------------------- frame
  const update = (dt: number) => {
    // The veil between rooms and between days.
    if (veil !== veilTarget) {
      veil = veilTarget > veil ? Math.min(veilTarget, veil + dt * veilRate) : Math.max(veilTarget, veil - dt * Math.min(veilRate, 1.6))
      if (veil >= 1 && atVeil) {
        const then = atVeil
        atVeil = null
        veilTarget = 0
        then()
      }
    }

    // Teddy follows the hand with a little lag, which is his weight.
    if (holder >= 0 && lifted) {
      let tx = clamp(wantX, 100, W - 70)
      let ty = clamp(wantY, 330, 772)
      if (!clearOfTub) {
        if (Math.abs(tx - TUB.cx) > 150) ty = Math.min(ty, 518)
        if (look.y > 536) tx = clamp(tx, TUB.cx - 150, TUB.cx + 150)
        else clearOfTub = true
      }
      look.x = damp(look.x, tx, 20, dt)
      look.y = damp(look.y, ty, 20, dt)
      rot.target = clamp((tx - look.x) * 0.012, -0.32, 0.32)
      behindTub = !clearOfTub
    } else if (move) {
      const m = move
      m.t = Math.min(1, m.t + dt / m.dur)
      const e = ease.inOutQuad(m.t)
      look.x = lerp(m.fx, m.tx, e)
      look.y = lerp(m.fy, m.ty, e) - Math.sin(e * Math.PI) * m.peak
      rot.target = 0
      if (home === 'tub' && m.t > 0.55) behindTub = true
      if (m.t >= 1) land()
    } else {
      rot.target = 0
    }
    rot.update(dt)
    sq.update(dt)
    patSmile = Math.max(0, patSmile - dt * 0.5)

    updateBath(dt)
    updateBedroom(dt)

    // His face.
    const asleep = sleepEye > 0.97
    const breathe = Math.sin(stage.time * (asleep ? 1.0 : 1.7)) * (asleep ? 0.016 : 0.009)
    const s = sq.value * (1 + breathe)
    look.sy = s
    look.sx = 1 / Math.sqrt(sq.value)
    look.rot = rot.value
    look.armLift = damp(look.armLift, holder >= 0 && lifted ? 1 : stretch, 9, dt)
    const blink = sleepEye < 0.5 ? blinkAt(stage.time, 2) * 0.92 : 0
    const heavy = sleepEye > 0.12 && sleepEye < 0.9 ? Math.max(0, Math.sin(stage.time * 1.3)) ** 8 * 0.5 : 0
    look.eye = clamp(Math.max(sleepEye, blink) + heavy, 0, 1)
    const fluffy = look.fluff.reduce((a, b) => a + b, 0) / look.fluff.length
    const smileTo = asleep ? 0.45 : isMorning ? 0.9 : 0.2 + fluffy * 0.45 + patSmile * 0.4
    look.smile = damp(look.smile, smileTo, 3, dt)
    let lx = Math.sin(stage.time * 0.4) * 0.3
    let ly = 0
    for (const p of stage.pointers.values()) {
      lx = clamp((p.x - look.x) / 260, -1, 1)
      ly = clamp((p.y - (look.y - 300)) / 260, -1, 1)
    }
    look.lookX = damp(look.lookX, lx, 6, dt)
    look.lookY = damp(look.lookY, ly, 6, dt)
  }

  // ----------------------------------------------------------------- draw
  const drawWater = (g: CanvasRenderingContext2D, front: boolean) => {
    if (shown < 0.03) return
    const y = surfY() + Math.sin(stage.time * 1.3) * 0.8
    const rx = TUB.rx * lerp(0.8, 0.965, shown)
    const ry = TUB.ry * lerp(0.42, 0.84, shown)
    g.save()
    g.beginPath()
    g.ellipse(TUB.cx, TUB.rimY, TUB.rx - 5, TUB.ry - 2, 0, 0, TAU)
    g.clip()
    if (front) {
      g.beginPath()
      g.rect(0, y - 3, W, 120)
      g.clip()
    }
    const water = mix([150, 198, 214], [214, 232, 232], soapy)
    g.fillStyle = rgb(water, front ? 0.8 : 1)
    g.beginPath()
    g.ellipse(TUB.cx, y, rx, ry, 0, 0, TAU)
    g.fill()
    if (!front) {
      g.fillStyle = 'rgba(255,255,255,0.28)'
      g.beginPath()
      g.ellipse(TUB.cx - rx * 0.3, y - ry * 0.45, rx * 0.42, ry * 0.2, 0, 0, TAU)
      g.fill()
    }
    g.lineWidth = 2
    for (const r of ripples) {
      g.strokeStyle = `rgba(255,255,255,${(0.6 * r.life).toFixed(3)})`
      g.beginPath()
      g.ellipse(r.x, clamp(r.y, y - ry, y + ry), r.r, r.r * 0.2, 0, 0, TAU)
      g.stroke()
    }
    if (front && home === 'tub' && settled()) {
      // The water closes round his middle.
      g.strokeStyle = 'rgba(255,255,255,0.55)'
      g.lineWidth = 2.5
      g.beginPath()
      g.ellipse(look.x, y + 4, 128 + Math.sin(stage.time * 1.6) * 3, 11, 0, 0, TAU)
      g.stroke()
    }
    if (soapy > 0.05) {
      g.fillStyle = `rgba(255,255,255,${(0.75 * Math.min(1, soapy * 3)).toFixed(3)})`
      g.beginPath()
      for (let i = 0; i < 9; i++) {
        const a = i * 2.4 + stage.time * 0.05
        const fxx = TUB.cx + Math.cos(a) * rx * (0.5 + 0.4 * Math.sin(i * 1.7))
        const fyy = y + Math.sin(a) * ry * 0.8
        g.moveTo(fxx + 12, fyy)
        g.ellipse(fxx, fyy, 8 + (i % 3) * 4, 3 + (i % 2) * 1.5, 0, 0, TAU)
      }
      g.fill()
    }
    g.restore()
  }

  const drawStream = (g: CanvasRenderingContext2D, x: number, y1: number, y2: number, width: number) => {
    if (width < 0.5 || y2 <= y1) return
    const w = Math.sin(stage.time * 22) * 1.2
    g.lineCap = 'round'
    g.strokeStyle = 'rgba(168,210,226,0.9)'
    g.lineWidth = width
    g.beginPath()
    g.moveTo(x, y1)
    g.quadraticCurveTo(x + w, (y1 + y2) / 2, x - w * 0.5, y2)
    g.stroke()
    g.strokeStyle = 'rgba(255,255,255,0.7)'
    g.lineWidth = width * 0.3
    g.beginPath()
    g.moveTo(x - width * 0.18, y1)
    g.quadraticCurveTo(x + w - width * 0.18, (y1 + y2) / 2, x - w * 0.5 - width * 0.1, y2)
    g.stroke()
  }

  const drawTapHandle = (g: CanvasRenderingContext2D) => {
    g.save()
    g.translate(TAP.hx, TAP.hy)
    g.rotate(tapAngle + 0.3)
    for (const [w, c] of [
      [13, '#96763a'],
      [9, '#cba454'],
    ] as const) {
      g.strokeStyle = c
      g.lineWidth = w
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(-30, 0)
      g.lineTo(30, 0)
      g.moveTo(0, -30)
      g.lineTo(0, 30)
      g.stroke()
    }
    for (const [kx, ky] of [
      [-32, 0],
      [32, 0],
      [0, -32],
      [0, 32],
    ] as const) {
      g.fillStyle = '#96763a'
      g.beginPath()
      g.arc(kx, ky + 1.5, 10, 0, TAU)
      g.fill()
      g.fillStyle = '#d6b060'
      g.beginPath()
      g.arc(kx, ky, 9, 0, TAU)
      g.fill()
    }
    g.fillStyle = '#e6c67a'
    g.beginPath()
    g.arc(0, 0, 10, 0, TAU)
    g.fill()
    g.restore()
    g.fillStyle = 'rgba(255,250,225,0.7)'
    g.beginPath()
    g.arc(TAP.hx - 3, TAP.hy - 3, 3.5, 0, TAU)
    g.fill()
  }

  const drawPlug = (g: CanvasRenderingContext2D) => {
    const top = frontRim(PLUG.x) - 4
    const y = PLUG.y + plugPull.value * 40
    const sway = Math.sin(stage.time * 0.9) * 1.5
    g.strokeStyle = '#8f7a60'
    g.lineWidth = 3
    g.beginPath()
    g.moveTo(PLUG.x, top)
    g.quadraticCurveTo(PLUG.x + sway * 0.5, (top + y) / 2, PLUG.x + sway, y - 15)
    g.stroke()
    g.strokeStyle = '#7d5630'
    g.lineWidth = 8
    g.beginPath()
    g.arc(PLUG.x + sway, y + 1.5, 15, 0, TAU)
    g.stroke()
    g.strokeStyle = '#d9ad74'
    g.lineWidth = 6
    g.beginPath()
    g.arc(PLUG.x + sway, y, 15, 0, TAU)
    g.stroke()
  }

  const drawSoap = (g: CanvasRenderingContext2D) => {
    g.save()
    g.translate(soap.x, soap.y)
    g.rotate(soap.tilt)
    g.fillStyle = '#d6c08e'
    g.beginPath()
    g.roundRect(-33, -16, 68, 38, 15)
    g.fill()
    g.fillStyle = '#f7ecc8'
    g.beginPath()
    g.roundRect(-35, -20, 68, 37, 15)
    g.fill()
    g.strokeStyle = 'rgba(190,160,100,0.5)'
    g.lineWidth = 2
    g.beginPath()
    g.ellipse(-1, -2, 20, 9, 0, 0, TAU)
    g.stroke()
    g.fillStyle = 'rgba(255,255,255,0.65)'
    g.beginPath()
    g.ellipse(-16, -12, 11, 3.5, -0.1, 0, TAU)
    g.fill()
    g.restore()
  }

  const drawJug = (g: CanvasRenderingContext2D) => {
    g.save()
    g.translate(jug.x + JUG_PIVOT.x, jug.y + JUG_PIVOT.y)
    g.rotate(-jug.tilt)
    g.translate(-JUG_PIVOT.x, -JUG_PIVOT.y)
    // Handle.
    for (const [w, c] of [
      [13, '#cfc6b0'],
      [8, '#f7f2e6'],
    ] as const) {
      g.strokeStyle = c
      g.lineWidth = w
      g.beginPath()
      g.moveTo(32, -94)
      g.bezierCurveTo(74, -92, 70, -44, 38, -30)
      g.stroke()
    }
    const body = () => {
      g.beginPath()
      g.moveTo(-28, 0)
      g.quadraticCurveTo(-50, -40, -38, -80)
      g.quadraticCurveTo(-33, -98, -44, -113)
      g.lineTo(30, -108)
      g.quadraticCurveTo(33, -94, 39, -80)
      g.quadraticCurveTo(50, -40, 28, 0)
      g.quadraticCurveTo(0, 7, -28, 0)
      g.closePath()
    }
    body()
    g.fillStyle = '#f7f2e6'
    g.fill()
    g.save()
    g.clip()
    g.fillStyle = 'rgba(150,130,100,0.2)'
    g.fillRect(12, -120, 50, 130)
    g.fillStyle = 'rgba(150,130,100,0.14)'
    g.fillRect(-60, -16, 120, 30)
    g.fillStyle = 'rgba(255,255,255,0.7)'
    g.beginPath()
    g.ellipse(-24, -50, 6, 30, 0.1, 0, TAU)
    g.fill()
    // A painted band.
    g.strokeStyle = '#7f95b4'
    g.lineWidth = 5
    g.beginPath()
    g.moveTo(-52, -26)
    g.quadraticCurveTo(0, -18, 52, -26)
    g.stroke()
    g.restore()
    // Mouth of the jug and the water in it.
    g.fillStyle = '#b9b09a'
    g.beginPath()
    g.ellipse(-6, -110, 37, 7, 0.06, 0, TAU)
    g.fill()
    if (jug.water > 0.02) {
      g.fillStyle = '#a9d0de'
      g.beginPath()
      g.ellipse(-6, -109, 33 * Math.min(1, 0.35 + jug.water), 5.5 * Math.min(1, 0.35 + jug.water), 0.06, 0, TAU)
      g.fill()
    }
    g.strokeStyle = '#7f95b4'
    g.lineWidth = 4
    g.beginPath()
    g.ellipse(-6, -110, 37, 7, 0.06, 0, TAU)
    g.stroke()
    g.restore()
  }

  const drawTowel = (g: CanvasRenderingContext2D) => {
    const stripe = '#d59484'
    if (towel.hang > 0.5) {
      const hx = towel.x
      const hy = towel.y
      const s = towelSway.value * 0.2 + Math.sin(stage.time * 0.7) * 1.5
      const path = () => {
        g.beginPath()
        g.moveTo(hx - 14, hy - 6)
        g.quadraticCurveTo(hx - 58, hy + 26, hx - 60 + s * 0.3, hy + 110)
        g.lineTo(hx - 58 + s, hy + 200)
        g.quadraticCurveTo(hx - 30 + s, hy + 208, hx + s, hy + 201)
        g.quadraticCurveTo(hx + 30 + s, hy + 194, hx + 58 + s, hy + 203)
        g.lineTo(hx + 60 + s * 0.3, hy + 110)
        g.quadraticCurveTo(hx + 58, hy + 26, hx + 14, hy - 6)
        g.closePath()
      }
      g.save()
      g.translate(4, 5)
      path()
      g.fillStyle = 'rgba(110,70,40,0.16)'
      g.fill()
      g.restore()
      path()
      g.fillStyle = '#f6ecd8'
      g.fill()
      g.save()
      g.clip()
      g.strokeStyle = stripe
      g.lineWidth = 7
      g.beginPath()
      g.moveTo(hx - 70 + s, hy + 166)
      g.quadraticCurveTo(hx + s, hy + 172, hx + 70 + s, hy + 166)
      g.moveTo(hx - 70 + s, hy + 181)
      g.quadraticCurveTo(hx + s, hy + 187, hx + 70 + s, hy + 181)
      g.stroke()
      g.strokeStyle = 'rgba(170,140,100,0.3)'
      g.lineWidth = 3
      g.beginPath()
      for (const k of [-0.55, 0, 0.5]) {
        g.moveTo(hx + k * 14, hy + 4)
        g.quadraticCurveTo(hx + k * 60, hy + 80, hx + k * 62 + s, hy + 200)
      }
      g.stroke()
      g.restore()
    } else {
      const cx = towel.x
      const cy = towel.y
      const tx = clamp(-towel.vx * 0.09, -70, 70)
      const ty = clamp(-towel.vy * 0.09 + 34, -50, 80)
      g.fillStyle = 'rgba(110,70,40,0.16)'
      blobPath(g, cx + 5, cy + 8, 80, 60, 0.08, 3, 10)
      g.fill()
      // A corner trailing behind the hand.
      g.fillStyle = '#eadfc8'
      g.beginPath()
      g.moveTo(cx - 40, cy + 10)
      g.quadraticCurveTo(cx + tx * 0.6 - 30, cy + ty * 0.6 + 40, cx + tx, cy + ty + 50)
      g.quadraticCurveTo(cx + tx * 0.6 + 40, cy + ty * 0.6 + 30, cx + 40, cy + 10)
      g.closePath()
      g.fill()
      blobPath(g, cx, cy, 80, 60, 0.08, 3, 10)
      g.fillStyle = '#f6ecd8'
      g.fill()
      g.save()
      g.clip()
      g.strokeStyle = stripe
      g.lineWidth = 7
      g.beginPath()
      g.moveTo(cx - 90, cy + 22)
      g.quadraticCurveTo(cx, cy + 44, cx + 90, cy + 18)
      g.moveTo(cx - 90, cy + 37)
      g.quadraticCurveTo(cx, cy + 59, cx + 90, cy + 33)
      g.stroke()
      g.strokeStyle = 'rgba(170,140,100,0.3)'
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(cx - 50, cy - 40)
      g.quadraticCurveTo(cx - 20, cy - 10, cx - 44, cy + 20)
      g.moveTo(cx + 10, cy - 52)
      g.quadraticCurveTo(cx + 30, cy - 20, cx + 8, cy + 6)
      g.moveTo(cx + 54, cy - 30)
      g.quadraticCurveTo(cx + 40, cy - 6, cx + 60, cy + 10)
      g.stroke()
      g.restore()
    }
  }

  const drawSteam = (g: CanvasRenderingContext2D) => {
    if (level < 0.4) return
    g.lineCap = 'round'
    for (let i = 0; i < 4; i++) {
      const phase = (stage.time * 0.09 + i * 0.27) % 1
      const x = TUB.cx + [-232, -182, 186, 236][i]! + Math.sin(stage.time * 0.5 + i * 2) * 10
      const y = TUB.rimY - 4 - phase * 190
      const a = Math.sin(phase * Math.PI) * 0.075 * Math.min(1, (level - 0.4) * 3)
      g.strokeStyle = `rgba(255,255,255,${a.toFixed(3)})`
      for (const width of [30, 18]) {
        g.lineWidth = width
        g.beginPath()
        g.moveTo(x, y + 60)
        g.bezierCurveTo(x + 16, y + 36, x - 16, y + 18, x + 4, y - 10)
        g.stroke()
      }
    }
  }

  const glint = (g: CanvasRenderingContext2D, x: number, y: number, strength: number) => {
    const k = (Math.sin(stage.time * 1.7) + 1) / 2
    const s = 7 + 9 * k
    g.save()
    g.globalAlpha = (0.2 + 0.65 * k) * strength
    g.translate(x, y)
    g.fillStyle = '#fffbe8'
    g.beginPath()
    g.moveTo(0, -s * 1.7)
    g.quadraticCurveTo(0, 0, s * 1.7, 0)
    g.quadraticCurveTo(0, 0, 0, s * 1.7)
    g.quadraticCurveTo(0, 0, -s * 1.7, 0)
    g.quadraticCurveTo(0, 0, 0, -s * 1.7)
    g.fill()
    g.beginPath()
    g.arc(0, 0, s * 0.45, 0, TAU)
    g.fill()
    g.restore()
  }

  const drawHint = (g: CanvasRenderingContext2D) => {
    const idle = stage.time - lastTouch
    if (idle < 7) return
    const at = hintAt()
    if (at) glint(g, at[0], at[1], Math.min(1, (idle - 7) / 2))
  }

  const drawBathroom = (g: CanvasRenderingContext2D) => {
    g.drawImage(pics.bath, 0, 0, W, H)
    // Dust in the last of the sun.
    g.fillStyle = 'rgba(255,240,200,0.5)'
    g.beginPath()
    for (let i = 0; i < 7; i++) {
      const t = stage.time * 0.03 + i * 0.37
      const x = 300 + ((i * 97 + t * 300) % 420)
      const y = 150 + ((i * 61) % 240) + Math.sin(t * 9 + i) * 14
      g.moveTo(x + 2, y)
      g.arc(x, y, 1.6 + (i % 3) * 0.5, 0, TAU)
    }
    g.fill()
    // The doorway breathes with lamplight.
    g.fillStyle = `rgba(255,232,170,${(0.1 + 0.07 * Math.sin(stage.time * 0.8)).toFixed(3)})`
    g.fillRect(DOOR_A.x, DOOR_A.y, DOOR_A.w, DOOR_A.h)

    drawTapHandle(g)
    drawWater(g, false)
    const yEnd = level > 0.03 ? surfY() : TUB.bottom - 20
    drawStream(g, TAP.sx, TAP.sy, yEnd, 10 * flow)
    const jugInTub = jug.held >= 0 && jug.y > 496 && Math.abs(jug.x - TUB.cx) < TUB.rx
    if (jugInTub) drawJug(g)
    if (behindTub) drawTeddy(g, look)
    if (jug.pouring && jug.onTeddy) {
      // The rinse running down him.
      g.strokeStyle = 'rgba(190,225,238,0.55)'
      g.lineWidth = 5
      g.lineCap = 'round'
      g.beginPath()
      for (let i = -1; i <= 1; i++) {
        const x = jug.landX + i * 26
        const wob = Math.sin(stage.time * 9 + i * 2) * 5
        g.moveTo(x, jug.landY + 14)
        g.quadraticCurveTo(x + wob + i * 16, jug.landY + 90, x + i * 26, surfY() - 6)
      }
      g.stroke()
    }
    drawWater(g, true)
    g.drawImage(pics.tub, TUB_FRONT.x, TUB_FRONT.y, TUB_FRONT.w, TUB_FRONT.h)
    drawPlug(g)
    drawSteam(g)
    if (!jugInTub && jug.held < 0) drawJug(g)
    if (soap.held < 0) drawSoap(g)
    if (towel.held < 0) drawTowel(g)
    if (!behindTub) drawTeddy(g, look)
    if (!jugInTub && jug.held >= 0) drawJug(g)
    if (jug.pouring) {
      const [tipX, tipY] = jugTip()
      drawStream(g, tipX - 4, tipY + 3, jug.landY, 9 * Math.min(1, 0.4 + jug.water * 3))
    }
    if (soap.held >= 0) drawSoap(g)
    if (towel.held >= 0) drawTowel(g)
    drawHint(g)
  }

  const drawSky = (g: CanvasRenderingContext2D, x: number, w: number) => {
    const top = mix(mix(DUSK_TOP, NIGHT_TOP, nightSky), MORN_TOP, morning)
    const low = mix(mix(DUSK_LOW, NIGHT_LOW, nightSky), MORN_LOW, morning)
    g.save()
    g.beginPath()
    g.rect(x, WIN.y, w, WIN.h)
    g.clip()
    const grad = g.createLinearGradient(0, WIN.y, 0, WIN.y + WIN.h)
    grad.addColorStop(0, rgb(top))
    grad.addColorStop(1, rgb(low))
    g.fillStyle = grad
    g.fillRect(x, WIN.y, w, WIN.h)
    const starry = nightSky * (1 - morning)
    if (starry > 0.03) {
      g.fillStyle = '#fff8dc'
      for (let i = 0; i < STARS.length; i++) {
        const st = STARS[i]!
        g.globalAlpha = starry * (0.55 + 0.45 * Math.sin(stage.time * (0.6 + (i % 4) * 0.23) + i * 1.9))
        g.beginPath()
        g.arc(st[0], st[1], st[2], 0, TAU)
        g.fill()
      }
      // A thin moon: a disc with a bite clipped out of it.
      g.save()
      g.globalAlpha = starry
      g.beginPath()
      g.rect(WIN.x, WIN.y, WIN.w, WIN.h)
      g.arc(605, 170, 18, 0, TAU)
      g.clip('evenodd')
      g.fillStyle = '#fff3c4'
      g.beginPath()
      g.arc(614, 176, 20, 0, TAU)
      g.fill()
      g.restore()
    }
    // Far hills, and in the morning the sun behind them.
    if (morning > 0.02) {
      const sun = g.createRadialGradient(540, 350, 4, 540, 350, 150)
      sun.addColorStop(0, `rgba(255,244,200,${morning.toFixed(3)})`)
      sun.addColorStop(1, 'rgba(255,230,170,0)')
      g.fillStyle = sun
      g.fillRect(x, WIN.y, w, WIN.h)
    }
    g.fillStyle = rgb(mix(mix([110, 98, 136], [28, 34, 70], nightSky), [150, 180, 140], morning))
    g.beginPath()
    g.moveTo(WIN.x, WIN.y + WIN.h)
    g.lineTo(WIN.x, 330)
    g.quadraticCurveTo(510, 296, 566, 332)
    g.quadraticCurveTo(620, 306, WIN.x + WIN.w, 326)
    g.lineTo(WIN.x + WIN.w, WIN.y + WIN.h)
    g.fill()
    if (morning > 0.5) {
      // A small bird on the sill outside.
      const a = (morning - 0.5) * 2
      const hop = Math.abs(Math.sin(stage.time * 0.9)) > 0.97 ? -3 : 0
      g.globalAlpha = a
      g.fillStyle = '#8a6f5c'
      g.beginPath()
      g.ellipse(500, 356 + hop, 15, 12, -0.2, 0, TAU)
      g.fill()
      g.beginPath()
      g.arc(511, 345 + hop, 8.5, 0, TAU)
      g.fill()
      g.fillStyle = '#e2a08c'
      g.beginPath()
      g.ellipse(505, 360 + hop, 9, 7, -0.2, 0, TAU)
      g.fill()
      g.fillStyle = '#d6a04c'
      g.beginPath()
      g.moveTo(518, 343 + hop)
      g.lineTo(527, 346 + hop)
      g.lineTo(518, 349 + hop)
      g.fill()
      g.fillStyle = '#2e2420'
      g.beginPath()
      g.arc(513, 343 + hop, 1.6, 0, TAU)
      g.fill()
      g.globalAlpha = 1
    }
    // Glazing bars, dark against the sky.
    g.strokeStyle = rgb(mix([150, 106, 64], [40, 40, 70], (1 - bright) * 0.8))
    g.lineWidth = 7
    g.beginPath()
    g.moveTo(WIN.x + WIN.w / 2, WIN.y)
    g.lineTo(WIN.x + WIN.w / 2, WIN.y + WIN.h)
    g.moveTo(WIN.x, WIN.y + WIN.h * 0.48)
    g.lineTo(WIN.x + WIN.w, WIN.y + WIN.h * 0.48)
    g.stroke()
    g.restore()
  }

  const drawCurtain = (g: CanvasRenderingContext2D, side: 0 | 1) => {
    const outer = side === 0 ? CUR.outerL : CUR.outerR
    const inner = side === 0 ? edgeL() : edgeR()
    const dir = side === 0 ? 1 : -1
    const width = Math.abs(inner - outer)
    const folds = 6
    const sway = Math.sin(stage.time * 0.6 + side * 2) * 2.5
    const top = CUR.top
    const bottom = CUR.bottom
    const path = () => {
      g.beginPath()
      g.moveTo(outer, top)
      g.lineTo(inner, top)
      g.quadraticCurveTo(inner + dir * 5, (top + bottom) / 2, inner + sway, bottom)
      for (let i = folds - 1; i >= 0; i--) {
        const x1 = outer + dir * ((i + 0.5) / folds) * width + sway * (i / folds)
        const x0 = outer + dir * (i / folds) * width + sway * (i / folds)
        g.quadraticCurveTo(x1, bottom + 9, x0, bottom)
      }
      g.closePath()
    }
    path()
    g.fillStyle = '#dd9c90'
    g.fill()
    g.save()
    g.clip()
    for (let i = 0; i < folds; i++) {
      const x = outer + dir * ((i + 0.5) / folds) * width
      const w = width / folds
      g.fillStyle = 'rgba(255,226,208,0.34)'
      g.fillRect(x - w * 0.22, top, w * 0.44, bottom - top + 12)
      g.fillStyle = 'rgba(150,80,70,0.2)'
      g.fillRect(outer + dir * (i / folds) * width - 2, top, 4, bottom - top + 12)
    }
    // A stitched band above the hem.
    g.strokeStyle = 'rgba(250,232,206,0.8)'
    g.lineWidth = 4
    g.beginPath()
    g.moveTo(outer, bottom - 24)
    g.lineTo(inner + sway, bottom - 24)
    g.stroke()
    g.restore()
    // Wooden rings on the rail.
    g.strokeStyle = '#96683e'
    g.lineWidth = 3.5
    for (let i = 0; i <= folds; i++) {
      const x = outer + dir * (i / folds) * width
      g.beginPath()
      g.ellipse(x, RAIL.y, 5, 9, 0, 0, TAU)
      g.stroke()
    }
  }

  const drawLamp = (g: CanvasRenderingContext2D, lit: boolean) => {
    const x = LAMP.x
    const y = LAMP.y
    const shade = mix([196, 178, 146], [255, 232, 176], lampGlow)
    g.fillStyle = rgb(mix(shade, [120, 90, 60], lit ? 0 : 0.25))
    g.beginPath()
    g.moveTo(x - 34, y - 156)
    g.lineTo(x + 34, y - 156)
    g.quadraticCurveTo(x + 52, y - 110, x + 62, y - 70)
    g.quadraticCurveTo(x, y - 60, x - 62, y - 70)
    g.quadraticCurveTo(x - 52, y - 110, x - 34, y - 156)
    g.fill()
    g.fillStyle = rgb(shade)
    g.beginPath()
    g.moveTo(x - 32, y - 154)
    g.lineTo(x + 28, y - 154)
    g.quadraticCurveTo(x + 44, y - 110, x + 52, y - 72)
    g.quadraticCurveTo(x - 4, y - 64, x - 58, y - 72)
    g.quadraticCurveTo(x - 50, y - 110, x - 32, y - 154)
    g.fill()
    if (lampGlow > 0.02) {
      g.fillStyle = `rgba(255,246,214,${(0.55 * lampGlow).toFixed(3)})`
      g.beginPath()
      g.ellipse(x - 2, y - 104, 24, 30, 0, 0, TAU)
      g.fill()
    }
    // Linen weave.
    g.strokeStyle = 'rgba(150,120,80,0.16)'
    g.lineWidth = 1.5
    g.beginPath()
    for (let i = -3; i <= 3; i++) {
      g.moveTo(x + i * 10, y - 154)
      g.lineTo(x + i * 17, y - 68)
    }
    g.stroke()
    // The cord and its wooden bead.
    const by = y - 34 + bead.value * 0.12
    g.strokeStyle = '#8f7a60'
    g.lineWidth = 2
    g.beginPath()
    g.moveTo(x + 44, y - 70)
    g.lineTo(x + 44, by)
    g.stroke()
    g.fillStyle = '#b98352'
    g.beginPath()
    g.arc(x + 44, by + 6, 8, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,236,200,0.6)'
    g.beginPath()
    g.arc(x + 42, by + 4, 3, 0, TAU)
    g.fill()
  }

  const drawMusicBox = (g: CanvasRenderingContext2D) => {
    const { x, y, w, h, ax, ay } = MBOX
    // Lid, lifted a little while it plays.
    g.save()
    g.translate(x, y + 8)
    g.rotate(-lid * 0.22)
    g.fillStyle = '#a8743f'
    g.beginPath()
    g.roundRect(-2, -12, w + 4, 14, 5)
    g.fill()
    g.fillStyle = '#c08a52'
    g.beginPath()
    g.roundRect(-2, -14, w + 4, 12, 5)
    g.fill()
    g.restore()
    if (lid > 0.05) {
      g.fillStyle = `rgba(226,190,110,${lid.toFixed(3)})`
      g.fillRect(x + 12, y + 2, w - 24, 6)
    }
    g.fillStyle = '#a8743f'
    g.beginPath()
    g.roundRect(x, y + 8, w, h - 8, 6)
    g.fill()
    g.fillStyle = '#cf9a60'
    g.beginPath()
    g.roundRect(x, y + 6, w - 3, h - 10, 6)
    g.fill()
    // A painted moon on the front.
    g.fillStyle = '#f3dfae'
    g.beginPath()
    g.arc(x + w / 2 - 4, y + h / 2 + 4, 13, 0, TAU)
    g.fill()
    g.fillStyle = '#cf9a60'
    g.beginPath()
    g.arc(x + w / 2 + 2, y + h / 2 + 1, 11.5, 0, TAU)
    g.fill()
    // Crank.
    const kx = ax + Math.cos(crank) * 20
    const ky = ay + Math.sin(crank) * 20
    g.strokeStyle = '#96763a'
    g.lineWidth = 7
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(x + w - 2, ay)
    g.lineTo(ax, ay)
    g.lineTo(kx, ky)
    g.stroke()
    g.strokeStyle = '#d6b060'
    g.lineWidth = 3.5
    g.beginPath()
    g.moveTo(x + w - 2, ay - 1)
    g.lineTo(ax, ay - 1)
    g.lineTo(kx, ky - 1)
    g.stroke()
    g.fillStyle = '#8f5f38'
    g.beginPath()
    g.arc(kx, ky + 1.5, 10, 0, TAU)
    g.fill()
    g.fillStyle = '#c98f5a'
    g.beginPath()
    g.arc(kx, ky, 9, 0, TAU)
    g.fill()
  }

  const drawDrawer = (g: CanvasRenderingContext2D) => {
    const { x, y, w, h } = DRAWER
    const open = drawer
    // The tray, seen from above, with the folded pyjamas in it.
    const trayH = 8 + 62 * open
    g.fillStyle = '#8a6440'
    g.beginPath()
    g.roundRect(x + 4, y + 2, w - 8, trayH + 10, 5)
    g.fill()
    g.save()
    g.beginPath()
    g.rect(x + 8, y + 2, w - 16, trayH + 6)
    g.clip()
    g.fillStyle = '#f1e6cf'
    g.fillRect(x + 8, y + 2, w - 16, trayH + 12)
    for (let i = 0; i < pjs.length; i++) {
      const item = pjs[i]!
      if (item.where !== 'drawer' || item.back < 1) continue
      const [sx, sy] = slot(i)
      drawPyjamaItem(g, item.style, sx, sy, 0)
    }
    g.restore()
    // The drawer front comes towards us.
    const fy = y + 70 * open
    const grow = 5 * open
    g.fillStyle = 'rgba(70,40,20,0.2)'
    g.beginPath()
    g.roundRect(x - grow, fy + 6, w + grow * 2, h, 7)
    g.fill()
    g.fillStyle = '#b8864f'
    g.beginPath()
    g.roundRect(x - grow, fy + 3, w + grow * 2, h, 7)
    g.fill()
    g.fillStyle = '#dcb07a'
    g.beginPath()
    g.roundRect(x - grow, fy, w + grow * 2, h - 2, 7)
    g.fill()
    g.strokeStyle = 'rgba(120,80,40,0.18)'
    g.lineWidth = 1.5
    g.beginPath()
    for (let i = 1; i < 6; i++) {
      g.moveTo(x - grow + 6, fy + i * 14 + (i % 2) * 3)
      g.quadraticCurveTo(x + w / 2, fy + i * 14 + 5 - (i % 3) * 3, x + w + grow - 6, fy + i * 14)
    }
    g.stroke()
    drawKnob(g, x + 62, fy + h / 2)
    drawKnob(g, x + w - 62, fy + h / 2)
  }

  const drawBlanket = (g: CanvasRenderingContext2D) => {
    const asleep = sleepEye > 0.97
    const breath = inBed() ? Math.sin(stage.time * (asleep ? 1.0 : 1.7)) * (asleep ? 2.4 : 1.2) : 0
    const top = blanketY + (tucked() > 0.3 ? breath : 0)
    const x0 = BED.x - 8
    const x1 = BED.x + BED.w + 8
    const y1 = BED.y + BED.h - 2
    const held = holdsKind('blanket')
    const peakX = held ? blanketPull : BED.x + BED.w / 2
    const peakY = top - (held ? 22 : 12)
    const path = (dy: number) => {
      g.beginPath()
      g.moveTo(x0, top + 14 + dy)
      g.quadraticCurveTo(peakX, peakY + dy, x1, top + 14 + dy)
    }
    // Soft shadow the blanket lays on whatever is under its edge.
    g.strokeStyle = 'rgba(70,50,60,0.14)'
    g.lineWidth = 10
    path(-6)
    g.stroke()
    path(0)
    g.lineTo(x1, y1)
    g.quadraticCurveTo(x1, y1 + 4, x1 - 14, y1 + 4)
    g.lineTo(x0 + 14, y1 + 4)
    g.quadraticCurveTo(x0, y1 + 4, x0, y1)
    g.closePath()
    g.fillStyle = '#8fa2c6'
    g.fill()
    g.save()
    g.clip()
    // Wool, quilted in soft diamonds.
    g.strokeStyle = 'rgba(240,236,250,0.22)'
    g.lineWidth = 2.5
    g.beginPath()
    for (let i = -8; i < 12; i++) {
      g.moveTo(x0 + i * 62, top - 30)
      g.lineTo(x0 + i * 62 + 300, top + 490)
      g.moveTo(x0 + i * 62 + 300, top - 30)
      g.lineTo(x0 + i * 62, top + 490)
    }
    g.stroke()
    // Whoever is under it makes a soft hill.
    if (inBed() && top < BED.ty - 80) {
      const hill = g.createRadialGradient(BED.tx - 20, BED.ty - 150, 20, BED.tx, BED.ty - 100, 190)
      hill.addColorStop(0, 'rgba(214,224,246,0.5)')
      hill.addColorStop(0.7, 'rgba(160,176,214,0.12)')
      hill.addColorStop(1, 'rgba(90,100,150,0)')
      g.fillStyle = hill
      g.beginPath()
      g.ellipse(BED.tx, BED.ty - 90 - breath, 150, 190, 0, 0, TAU)
      g.fill()
    }
    for (const f of friends) {
      if (f.where !== 'bed' || top > f.y - 30) continue
      g.fillStyle = 'rgba(214,224,246,0.3)'
      g.beginPath()
      g.ellipse(f.x, Math.max(top + 40, f.y - 24), 34, 36, 0, 0, TAU)
      g.fill()
    }
    g.fillStyle = 'rgba(60,70,120,0.16)'
    g.fillRect(x0, y1 - 40, x1 - x0, 50)
    // The turned-back top: the cream underside.
    g.strokeStyle = '#f3e9d4'
    g.lineWidth = 34
    path(10)
    g.stroke()
    g.strokeStyle = 'rgba(200,170,130,0.5)'
    g.lineWidth = 2
    g.setLineDash([7, 7])
    path(22)
    g.stroke()
    g.setLineDash([])
    g.restore()
  }

  const drawNightLight = (g: CanvasRenderingContext2D) => {
    const { x, y } = NIGHT
    g.fillStyle = '#a8743f'
    g.beginPath()
    g.roundRect(x - 16, y + 16, 32, 9, 3)
    g.fill()
    g.fillStyle = '#fff0bc'
    g.beginPath()
    g.arc(x, y - 4, 21, 0, TAU)
    g.fill()
    g.fillStyle = '#f6d98e'
    g.beginPath()
    g.arc(x + 9, y - 8, 17, 0, TAU)
    g.fill()
    g.fillStyle = '#fff0bc'
    g.beginPath()
    g.arc(x - 12, y - 4, 6, 0, TAU)
    g.fill()
  }

  const drawBedroom = (g: CanvasRenderingContext2D) => {
    g.drawImage(pics.bed, 0, 0, W, H)
    // Through the door: dim in the evening, full of daylight in the morning.
    if (morning > 0.02) {
      const pulse = 0.85 + 0.15 * Math.sin(stage.time * 0.9)
      g.fillStyle = `rgba(255,240,196,${(morning * pulse).toFixed(3)})`
      g.fillRect(DOOR_B.x + 2, DOOR_B.y, DOOR_B.w - 4, DOOR_B.h)
      for (const spread of [0, 40, 90]) {
        g.fillStyle = `rgba(255,236,180,${(0.1 * morning * pulse).toFixed(3)})`
        g.beginPath()
        g.moveTo(DOOR_B.x, 642)
        g.lineTo(DOOR_B.x + DOOR_B.w, 642)
        g.lineTo(DOOR_B.x + DOOR_B.w + 150 + spread, 800)
        g.lineTo(DOOR_B.x, 800)
        g.closePath()
        g.fill()
      }
    }
    drawSky(g, WIN.x, WIN.w)
    drawCurtain(g, 0)
    drawCurtain(g, 1)
    drawNightLight(g)
    drawLamp(g, false)
    drawMusicBox(g)
    drawDrawer(g)
    for (const f of friends) if (f.where === 'shelf' && f.held < 0) drawFriend(g, f.kind, f.x, f.y, f.rot, f.sq.value)

    const teddyInBed = home === 'bed' && !(holder >= 0 && lifted) && !move
    if (teddyInBed) drawTeddy(g, look)
    for (const f of friends) if (f.where === 'bed') drawFriend(g, f.kind, f.x, f.y, f.rot, f.sq.value)
    drawBlanket(g)
    if (!teddyInBed) drawTeddy(g, look)
    for (const item of pjs) {
      if (item.where === 'held') drawPyjamaItem(g, item.style, item.x, item.y + 20, 1)
      else if (item.where === 'drawer' && item.back < 1) drawPyjamaItem(g, item.style, item.x, item.y, 0)
    }
    for (const f of friends) if (f.held >= 0) drawFriend(g, f.kind, f.x, f.y, f.rot, f.sq.value)

    // Morning sun across the floor.
    const open = (openL + openR) / 2
    if (morning * open > 0.02) {
      for (const spread of [0, 30, 64]) {
        g.fillStyle = `rgba(255,232,170,${(0.075 * morning * open).toFixed(3)})`
        g.beginPath()
        g.moveTo(edgeL(), WIN.y)
        g.lineTo(edgeR(), WIN.y)
        g.lineTo(edgeR() + 330 + spread, 800)
        g.lineTo(edgeL() + 60 - spread, 800)
        g.closePath()
        g.fill()
      }
    }

    // The dark, and the lights left in it.
    const dark = (1 - bright) * 0.86
    if (dark > 0.01) {
      g.fillStyle = `rgba(16,20,56,${dark.toFixed(3)})`
      g.fillRect(0, 0, W, H)
      const gap = edgeR() - edgeL()
      // The sky does not dim with the room.
      drawSky(g, edgeL() + 3, gap - 6)
      // Moonlight through the gap, falling across the pillow.
      const beam = dark * nightSky * (1 - morning) * Math.min(1, gap / 30)
      if (beam > 0.02) {
        g.save()
        g.globalCompositeOperation = 'lighter'
        for (const [spread, a] of [
          [0, 0.05],
          [26, 0.035],
          [56, 0.025],
        ] as const) {
          g.fillStyle = `rgba(120,140,210,${(a * beam).toFixed(3)})`
          g.beginPath()
          g.moveTo(edgeL() + 3, 120)
          g.lineTo(edgeR() - 3, 120)
          g.lineTo(1000 + spread, 500)
          g.lineTo(800 - spread, 500)
          g.closePath()
          g.fill()
        }
        g.restore()
      }
      g.save()
      g.globalCompositeOperation = 'lighter'
      const pulse = 0.9 + 0.1 * Math.sin(stage.time * 0.9)
      g.globalAlpha = dark * 0.85 * pulse
      g.drawImage(pics.glow, NIGHT.x - 230, NIGHT.y - 230, 460, 460)
      g.restore()
      g.save()
      g.globalAlpha = Math.min(1, dark * 1.5)
      drawNightLight(g)
      g.restore()
    }
    if (lampGlow > 0.02) {
      g.save()
      g.globalCompositeOperation = 'lighter'
      g.globalAlpha = lampGlow * (0.3 + dark * 0.7) * (0.96 + 0.04 * Math.sin(stage.time * 2.3))
      g.drawImage(pics.glow, LAMP.x - 300, LAMP.y - 400, 600, 600)
      g.restore()
      if (dark > 0.05) {
        g.save()
        g.globalAlpha = Math.min(1, dark * 2) * lampGlow
        drawLamp(g, true)
        g.restore()
      }
    }
    drawHint(g)
  }

  return {
    update,
    draw(g) {
      if (room === 0) drawBathroom(g)
      else drawBedroom(g)
      if (veil > 0.003) {
        g.globalAlpha = ease.inOutQuad(clamp(veil, 0, 1))
        g.fillStyle = veilColor
        g.fillRect(0, 0, W, H)
        g.globalAlpha = 1
      }
    },
    down(p) {
      lastTouch = stage.time
      if (veilTarget === 1) return
      if (room === 0) downBath(p)
      else downBedroom(p)
    },
    move(p) {
      lastTouch = stage.time
      const h = holds.get(p.id)
      if (h) moveHold(p, h)
    },
    up(p) {
      const h = holds.get(p.id)
      if (!h) return
      holds.delete(p.id)
      upHold(p, h)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'goodnight-teddy',
    name: 'Goodnight, Teddy',
    emoji: '🧸',
    ages: [3, 7],
    pitch: 'Bath a muddy teddy, rub him dry and fluffy, button his pyjamas, tuck him in, and make the room dark until he sleeps.',
    howTo:
      'Turn the tap, lift Teddy in, rub with the soap, pour the jug, lift him out and rub with the towel. Carry him to the doorway. Open the drawer, drag pyjamas on, pull each sleeve, press each button. Carry him to bed, pull the blanket up, bring a friend, wind the music box, draw the curtains, tap the lamp. Open the curtains for morning; carry him out of the door for a new evening.',
    basedOn: 'Montessori care of self shown through doll play (washing, dressing, the button frame); the Waldorf evening rhythm and putting a doll to bed',
    whyFun: 'Wet dark fur turns pale and fluffy under the towel; a blanket pulls up to the chin; the room goes dark one light at a time, by your own hand.',
    set: 'gentle',
  },
  create,
}
