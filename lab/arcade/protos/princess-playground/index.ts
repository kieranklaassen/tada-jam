// Princess Playground: the idea of the owner's four-year-old. A cheeky
// princess, her cat and their friends at the playground. It is a dollhouse:
// pick anyone up, drop them on anything, tap them for mischief. There is no
// goal and no way to fail; every pick-up, drop and splat answers with a face
// and a sound.
//
// The world is a band of grass seen a little from above. A character stands at
// (x, gy) on the ground and can be `h` above it; flights are ballistic in
// (x, gy, h), and the equipment catches whoever lands on it.

import { blinkAt, hint, label, shadow, sprite } from '../../kit/draw.ts'
import { TAU, clamp, damp, dist, ease, lerp, rnd, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { drawText } from '../../kit/text.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { OUT, SPECS, drawChar, drawCrown, grabOf, headOf } from './chars.ts'
import type { Kind, Mood, Pose, Spec } from './chars.ts'
import {
  BAND_BOT,
  BAND_TOP,
  CART,
  CASTLE,
  GRASS_Y,
  MUD,
  SEESAW,
  SLIDE,
  SPRINK,
  SUN,
  SWING,
  TRAMP,
  drawCart,
  drawSeesaw,
  drawSwing,
  drawTramp,
  drawWater,
  inMud,
  inSprinkler,
  makeBackdrop,
  onTramp,
  paintSplat,
  seatPos,
  slidePoint,
  swingSeat,
} from './scene.ts'
import { makeVoice } from './voice.ts'

const G = 1900
const MUD_COLS = ['#6b4423', '#8b5e34', '#5b381d'] as const
const WATER_COLS = ['#aee4ff', '#ffffff', '#7fd0ff'] as const
const STAR_COLS = ['#fff7a8', '#ffffff', '#ffd23f'] as const

// Mischief to find. Each one, the first time, flies up to the bunting.
const STICKERS: readonly (readonly [string, string])[] = [
  ['launch', '🚀'],
  ['mud', '🐷'],
  ['shake', '💦'],
  ['slide', '🎢'],
  ['leap', '🦅'],
  ['flip', '🤸'],
  ['wash', '🛁'],
  ['rasp', '😛'],
  ['toot', '💨'],
  ['silly', '🤪'],
  ['crown', '👑'],
  ['steal', '😼'],
  ['pounce', '🐾'],
  ['hat', '🎩'],
  ['pie', '🥧'],
  ['cone', '🍦'],
  ['trumpet', '🎺'],
  ['flame', '🔥'],
  ['bonk', '💫'],
  ['frog', '🐸'],
]
const FLAG_COLS = ['#ff9ec4', '#ffe14d', '#8fe3a0', '#8fd0ff', '#c9a6ff'] as const
const FLOWERS = ['🌼', '🌸', '🌷', '🌻', '🌼', '🌸', '🍄'] as const
const FRIENDS: readonly Kind[] = ['queen', 'dragon', 'knight', 'frog']

type State = 'idle' | 'held' | 'air' | 'walk' | 'hop' | 'slide' | 'swing' | 'seesaw' | 'ride' | 'away'
type Act = '' | 'rasp' | 'toot' | 'silly' | 'throw' | 'pout' | 'pat' | 'shake' | 'twirl' | 'crouch' | 'groom' | 'meow' | 'trumpet' | 'bonk' | 'flame' | 'ribbit'

interface Char {
  kind: Kind
  spec: Spec
  seed: number
  // Ground position, height above it, and their velocities.
  x: number
  gy: number
  h: number
  vx: number
  vgy: number
  vh: number
  // Where the feet are on screen, and (while held) where the finger has it.
  px: number
  py: number
  lastPX: number
  hx: number
  hy: number
  rot: number
  spin: number
  face: 1 | -1
  state: State
  stretch: Spring
  lean: Spring
  sway: Spring
  mood: Mood
  moodUntil: number
  mud: number
  soot: number
  sitUntil: number
  sitAmt: number
  armsAmt: number
  dangle: number
  airAmt: number
  kickAmt: number
  crown: boolean
  cone: boolean
  coneUntil: number
  puff: number
  flat: number
  flatUntil: number
  trick: number
  act: Act
  actT: number
  actDur: number
  seat: number
  host: Char | null
  slideT: number
  slideV: number
  slideWait: number
  hopT: number
  hopDur: number
  hopFX: number
  hopFY: number
  hopTX: number
  hopTY: number
  hopArc: number
  hopDone: (() => void) | null
  tx: number
  tgy: number
  walkSpeed: number
  walkDone: (() => void) | null
  hover: number
  gait: number
  bounces: number
  boostUntil: number
  trampN: number
  onTramp: boolean
  dizzyUntil: number
  asleep: boolean
  idleAt: number
  tapN: number
  inWater: boolean
  tick: number
  twirlAt: number
  heldBy: number
  grabDX: number
  grabDY: number
  prevHX: number
  holdV: number
  giggleAt: number
  pounce: Char | null
  pouncing: boolean
  // Where it stood when picked up, so a press-and-let-go puts it back.
  homeGy: number
  lookX: number
  lookY: number
}

interface Hold {
  c: Char
  t0: number
  drag: boolean
}

interface Flyer {
  kind: 'sticker' | 'crown' | 'mud'
  emoji: string
  x: number
  y: number
  rot: number
  s: number
}

interface Sticker {
  key: string
  emoji: string
  got: boolean
  shown: boolean
  pop: Spring
  wob: Spring
}

interface Cone {
  slot: number
  x: number
  y: number
  state: 'cart' | 'held' | 'gone'
  heldBy: number
  pop: number
}

interface Cloud {
  x: number
  y: number
  s: number
  v: number
  squash: Spring
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage
  const voice = makeVoice(sfx)
  const back = makeBackdrop(() => stage.rand())
  const bg = back.getContext('2d')!
  const chars: Char[] = []
  const holds = new Map<number, Hold>()
  const coneHolds = new Map<number, Cone>()
  const flyers: Flyer[] = []
  const glass: { x: number; y: number; r: number; t0: number }[] = []
  const sprouts: { x: number; y: number; emoji: string; k: number }[] = []
  const stickers: Sticker[] = STICKERS.map(([key, emoji]) => ({ key, emoji, got: false, shown: false, pop: spring(1, 200, 9), wob: spring(0, 60, 4) }))
  const seesaw = { tilt: -SEESAW.max, vel: 0, target: -SEESAW.max, occ: [null, null] as (Char | null)[] }
  const swing = { ang: 0.1, vel: 0, occ: null as Char | null, pushes: 0, armed: false, autoAt: 0 }
  const tramp = { sag: spring(0, 320, 9) }
  const cart = { x: W + 220, called: false, here: false, ring: spring(0, 160, 5) }
  const cones: Cone[] = [0, 1].map((slot) => ({ slot, x: 0, y: 0, state: 'gone', heldBy: -1, pop: 0 }))
  const clouds: Cloud[] = [
    { x: 210, y: 150, s: 1, v: 7, squash: spring(1, 160, 8) },
    { x: 640, y: 118, s: 0.8, v: 10, squash: spring(1, 160, 8) },
    { x: 900, y: 240, s: 0.7, v: 5, squash: spring(1, 160, 8) },
  ]
  const sun = { spin: 0, vel: 0.2, winkUntil: 0, pop: spring(1, 180, 8) }
  const butterfly = { x: 560, y: 430, off: 0, dartUntil: 0 }
  const focus = { x: W / 2, y: 520, until: 0, who: null as Char | null }
  const tongue = { from: null as Char | null, to: null as Char | null, until: 0 }

  let found = 0
  let lastTouch = -100
  let everTouched = false
  let played = 0
  let attractDone = false
  let nextAuto = 14
  let nextSneak = 1
  let arrived = 0
  let nextArriveAt = 0
  let gush = 0
  let mudRipple = 0
  let bubbleAt = 2
  let flowerN = 0
  let allDone = false
  let quietUntil = 0

  // ------------------------------------------------------------ small helpers

  const makeChar = (kind: Kind, x: number, gy: number): Char => ({
    kind,
    spec: SPECS[kind],
    seed: chars.length * 2.7 + 1,
    x,
    gy,
    h: 0,
    vx: 0,
    vgy: 0,
    vh: 0,
    px: x,
    py: gy,
    lastPX: x,
    hx: x,
    hy: gy,
    rot: 0,
    spin: 0,
    face: 1,
    state: 'idle',
    stretch: spring(1, 240, 11),
    lean: spring(0, 90, 7),
    sway: spring(0, 120, 6),
    mood: 'grin',
    moodUntil: 0,
    mud: 0,
    soot: 0,
    sitUntil: 0,
    sitAmt: 0,
    armsAmt: -0.78,
    dangle: 0,
    airAmt: 0,
    kickAmt: 0,
    crown: kind === 'princess',
    cone: false,
    coneUntil: 0,
    puff: 0,
    flat: 0,
    flatUntil: 0,
    trick: 0,
    act: '',
    actT: 0,
    actDur: 0,
    seat: -1,
    host: null,
    slideT: 0,
    slideV: 0,
    slideWait: 0,
    hopT: 0,
    hopDur: 0.2,
    hopFX: 0,
    hopFY: 0,
    hopTX: 0,
    hopTY: 0,
    hopArc: 0,
    hopDone: null,
    tx: 0,
    tgy: 0,
    walkSpeed: 0,
    walkDone: null,
    hover: 0,
    gait: 0,
    bounces: 0,
    boostUntil: 0,
    trampN: 0,
    onTramp: false,
    dizzyUntil: 0,
    asleep: false,
    idleAt: 4 + Math.random() * 4,
    tapN: 0,
    inWater: false,
    tick: 0,
    twirlAt: 0,
    heldBy: -1,
    grabDX: 0,
    grabDY: 0,
    prevHX: x,
    holdV: 0,
    giggleAt: 0,
    pounce: null,
    pouncing: false,
    homeGy: -1,
    lookX: 0,
    lookY: 0,
  })

  const setMood = (c: Char, mood: Mood, secs: number): void => {
    c.mood = mood
    c.moodUntil = stage.time + secs
  }

  const moodOf = (c: Char): Mood => {
    const t = stage.time
    if (c.soot > 0.6 && c.act !== 'flame') return 'wow'
    switch (c.act) {
      case 'rasp':
        return 'tongue'
      case 'silly':
        return 'silly'
      case 'pout':
      case 'shake':
        return 'grumpy'
      case 'groom':
        return 'yum'
      case 'crouch':
      case 'flame':
      case 'ribbit':
        return 'wow'
      case 'twirl':
      case 'meow':
      case 'pat':
      case 'trumpet':
        return 'joy'
      default:
        break
    }
    if (c.asleep) return 'sleep'
    if (c.flat > 0.3 || t < c.dizzyUntil) return 'dizzy'
    if (t < c.moodUntil) return c.mood
    const cat = c.kind === 'cat'
    if (c.state === 'held') return cat ? 'plain' : 'joy'
    if (c.state === 'air') return cat ? 'wow' : c.vh > -200 ? 'joy' : 'wow'
    if (c.state === 'slide' || c.state === 'swing') return cat ? 'wow' : 'joy'
    if (cat) return c.mud > 0.45 ? 'grumpy' : c.crown ? 'smug' : 'grin'
    if (c.cone) return 'wow'
    return 'grin'
  }

  const beginAct = (c: Char, act: Act, dur: number): void => {
    c.act = act
    c.actT = 0
    c.actDur = dur
    c.trick = 0
  }

  const watch = (c: Char, secs: number): void => {
    focus.who = c
    focus.until = stage.time + secs
  }

  const lookAt = (x: number, y: number, secs: number): void => {
    focus.who = null
    focus.x = x
    focus.y = y
    focus.until = stage.time + secs
  }

  const present = (c: Char): boolean => c.state !== 'away'

  const wake = (c: Char): void => {
    if (!c.asleep) return
    c.asleep = false
    setMood(c, 'wow', 0.7)
  }

  // Everyone else reacts: a face for a moment and a little bounce.
  const crowd = (mood: Mood, secs: number, except: Char | null, hop = true): void => {
    for (const o of chars) {
      if (o === except || !present(o) || o.state === 'held' || o.state === 'air' || o.asleep) continue
      if (o.kind === 'cat' && o.mud > 0.45) continue
      stage.after(rnd(0.05, 0.4), () => {
        if (o.state === 'held' || o.state === 'air' || o.act) return
        setMood(o, mood, secs)
        if (hop) o.stretch.kick(3)
      })
    }
  }

  const nearest = (c: Char, maxD: number, ok: (o: Char) => boolean): Char | null => {
    let best: Char | null = null
    let bestD = maxD
    for (const o of chars) {
      if (o === c || !present(o) || !ok(o)) continue
      const d = dist(c.px, c.py, o.px, o.py)
      if (d < bestD) {
        bestD = d
        best = o
      }
    }
    return best
  }

  const riderOf = (c: Char): Char | null => {
    for (const o of chars) if (o.state === 'ride' && o.host === c) return o
    return null
  }

  const headTop = (c: Char): number => headOf(c.kind, c.sitAmt, c.dangle) * c.stretch.value * (1 - 0.7 * c.flat)

  const flagX = (i: number): number => 60 + (i * (W - 120)) / (STICKERS.length - 1)
  const ropeY = (x: number): number => 22 + 30 * Math.sin((Math.PI * x) / W)

  const stars = (x: number, y: number, count = 10): void => {
    fx.burst(x, y, { count, shape: 'star', color: STAR_COLS, speed: 300, life: 0.8, size: 14, gravity: 200 })
  }

  const dust = (x: number, y: number, big: boolean): void => {
    fx.burst(x, y, { count: big ? 10 : 5, color: '#ffffff', speed: big ? 260 : 150, angle: -Math.PI / 2, spread: Math.PI, life: 0.4, size: 9 })
  }

  // --------------------------------------------------------------- stickers

  const award = (key: string, x: number, y: number): void => {
    // Only what the child set off counts, not what the cast gets up to alone
    // or a newcomer showing off.
    if (stage.time - lastTouch > 7) return
    if (stage.time < quietUntil && (key === 'trumpet' || key === 'flame' || key === 'bonk' || key === 'frog')) return
    const i = stickers.findIndex((s) => s.key === key)
    const s = stickers[i]
    if (!s || s.got) return
    s.got = true
    found++
    const fl: Flyer = { kind: 'sticker', emoji: s.emoji, x, y, rot: 0, s: 0 }
    flyers.push(fl)
    const sx = clamp(x, 40, W - 40)
    const sy = clamp(y, 120, H - 120)
    const tx = flagX(i)
    const ty = ropeY(tx) + 30
    const n = found
    sfx.pop(4)
    stage.tween(
      0.95,
      (k) => {
        const grow = Math.min(1, k / 0.25)
        const go = clamp((k - 0.3) / 0.7, 0, 1)
        const e = ease.inOutCubic(go)
        fl.x = lerp(sx, tx, e)
        fl.y = lerp(sy - 70 * ease.outBack(grow), ty, e) - Math.sin(go * Math.PI) * 40
        fl.s = lerp(ease.outBack(grow) * 2.1, 1, e)
        fl.rot = Math.sin(k * 14) * 0.2 * (1 - go)
      },
      ease.linear,
      () => {
        flyers.splice(flyers.indexOf(fl), 1)
        s.shown = true
        s.pop.value = 1.7
        s.wob.kick(3)
        sfx.ding(n % 8)
        stars(tx, ty, 8)
        if (n === stickers.length && !allDone) {
          allDone = true
          sfx.fanfare()
          for (let k = 0; k < 5; k++) stage.after(k * 0.25, () => fx.confetti(140 + k * 225, 150, 40))
          for (const st of stickers) st.wob.kick(rnd(-4, 4))
          crowd('joy', 3, null)
        } else if (n % 5 === 0) {
          sfx.win()
          fx.confetti(tx, ty + 40, 46)
        }
      },
    )
  }

  // ------------------------------------------------------- flights and falls

  const flightT = (v: number, h0: number, h1: number): number => (v + Math.sqrt(Math.max(0, v * v + 2 * G * (h0 - h1)))) / G

  // Throw `c` from where it is so it comes down at (tx, tgy), `turns` flips on the way.
  const toss = (c: Char, tx: number, tgy: number, v: number, h1 = 0, turns = 0): void => {
    const T = Math.max(0.12, flightT(v, c.h, h1))
    c.vh = v
    c.vx = (tx - c.x) / T
    c.vgy = (tgy - c.gy) / T
    c.spin = turns === 0 ? 0 : (turns * TAU) / T
    c.rot = 0
    c.state = 'air'
    c.bounces = 0
    c.pouncing = false
  }

  const detach = (c: Char): void => {
    if (c.seat >= 0 && seesaw.occ[c.seat] === c) seesaw.occ[c.seat] = null
    if (swing.occ === c) {
      swing.occ = null
      swing.pushes = 0
      swing.armed = false
    }
    c.seat = -1
    c.host = null
    c.onTramp = false
    c.rot = 0
    c.spin = 0
    c.act = ''
    c.trick = 0
    c.hopDone = null
    c.walkDone = null
    c.pounce = null
    c.pouncing = false
    c.inWater = false
    c.hover = 0
  }

  const hopTo = (c: Char, x: number, y: number, dur: number, arc: number, done: () => void): void => {
    c.state = 'hop'
    c.hopT = 0
    c.hopDur = dur
    c.hopFX = c.px
    c.hopFY = c.py
    c.hopTX = x
    c.hopTY = y
    c.hopArc = arc
    c.hopDone = done
  }

  const walkTo = (c: Char, x: number, gy: number, speed: number, done: (() => void) | null): void => {
    c.state = 'walk'
    c.tx = x
    c.tgy = gy
    c.walkSpeed = speed
    c.walkDone = done
    c.gait = 0
  }

  // A rider is thrown clear when its host takes off.
  const fling = (c: Char): void => {
    const o = c.host
    c.host = null
    c.x = c.px
    c.gy = clamp((o ? o.gy : 640) + 4, BAND_TOP, BAND_BOT)
    c.h = Math.max(0, c.gy - c.py)
    c.state = 'air'
    c.vh = 420
    c.vx = rnd(-220, 220)
    c.vgy = 0
    c.spin = rnd(-6, 6)
    c.bounces = 0
    if (c.kind === 'cat') voice.meow()
  }

  const mudHit = (o: Char, amt: number): void => {
    o.mud = Math.min(1, o.mud + amt)
    wake(o)
    sfx.splat()
    o.stretch.value = 0.8
    fx.burst(o.px, o.py - o.spec.cy, { count: 8, color: MUD_COLS, speed: 280, life: 0.5, size: 10, gravity: 1100 })
    if (o.kind === 'cat') {
      setMood(o, 'wow', 0.5)
      o.puff = 1
      if (amt >= 0.45) stage.after(0.7, () => catShake(o))
    } else {
      setMood(o, 'wow', 0.35)
      stage.after(0.35, () => {
        if (o.state === 'held') return
        setMood(o, 'joy', 1.1)
        voice.giggle(o.spec.pitch)
      })
    }
  }

  const mudBall = (fromX: number, fromY: number, o: Char, secs: number, then?: () => void): void => {
    const fl: Flyer = { kind: 'mud', emoji: '', x: fromX, y: fromY, rot: 0, s: 1 }
    flyers.push(fl)
    stage.tween(
      secs,
      (k) => {
        fl.x = lerp(fromX, o.px, k)
        fl.y = lerp(fromY, o.py - o.spec.cy, k) - Math.sin(k * Math.PI) * 110
        fl.rot = k * 9
      },
      ease.linear,
      () => {
        flyers.splice(flyers.indexOf(fl), 1)
        if (present(o)) mudHit(o, 0.5)
        then?.()
      },
    )
  }

  const splashAround = (x: number, gy: number, radius: number, amt: number, except: Char | null): void => {
    for (const o of chars) {
      if (o === except || !present(o) || o.state === 'held') continue
      if (dist(o.px, o.py, x, gy) < radius) mudHit(o, amt)
    }
  }

  const paintMudMarks = (x: number, gy: number, n: number): void => {
    for (let i = 0; i < n; i++) {
      const a = rnd(0, TAU)
      const d = rnd(150, 250)
      const sx = clamp(x + Math.cos(a) * d * 1.1, 20, W - 20)
      const sy = clamp(gy + Math.sin(a) * d * 0.45, GRASS_Y + 30, H - 20)
      paintSplat(bg, sx, sy, rnd(7, 13), '#7d5230', '#a7783f')
    }
  }

  const catShake = (c: Char): void => {
    if ((c.state !== 'idle' && c.state !== 'seesaw') || c.act || c.mud < 0.4) return
    beginAct(c, 'shake', 0.95)
    voice.shake()
    c.puff = 1
    const targets = chars.filter((o) => o !== c && present(o) && o.state !== 'held' && o.state !== 'air').slice(0, 4)
    targets.forEach((o, i) => {
      stage.after(0.2 + i * 0.14, () => {
        if (c.act === 'shake') mudBall(c.px, c.py - 50, o, 0.42)
      })
    })
    stage.after(0.95, () => {
      if (c.state !== 'idle' && c.state !== 'seesaw') return
      c.mud = 0.22
      award('shake', c.px, c.py - 60)
      // Stalk off to dry grass and wash.
      if (c.state === 'idle' && inMud(c.x, c.gy)) {
        toss(c, 150, 606, 560, 0, 0)
        c.bounces = 2
        sfx.whoosh()
        stage.after(1.0, () => {
          if (c.state === 'idle' && !c.act) beginAct(c, 'groom', 1.8)
        })
      }
    })
  }

  const splat = (c: Char, v: number): void => {
    const big = v > 480
    c.state = 'idle'
    c.vx = 0
    c.vgy = 0
    const first = c.mud < 0.5
    c.mud = 1
    c.soot = 0
    c.stretch.value = big ? 0.52 : 0.72
    sfx.splat()
    voice.squelch()
    fx.burst(c.x, c.gy - 8, { count: big ? 28 : 14, color: MUD_COLS, speed: big ? 640 : 380, angle: -Math.PI / 2, spread: Math.PI * 0.95, life: 0.9, size: 14, gravity: 1500 })
    fx.ring(c.x, c.gy, '#8b5e34', big ? 150 : 90, 0.4)
    if (big) {
      fx.shake(8)
      paintMudMarks(c.x, c.gy, 5)
      splashAround(c.x, c.gy, 200, 0.4, c)
    } else if (first) paintMudMarks(c.x, c.gy, 2)
    mudRipple = 1
    award('mud', c.x, c.gy - 70)
    watch(c, 1.5)
    if (c.kind === 'cat') {
      // The cat hates it.
      c.puff = 1
      setMood(c, 'wow', 0.6)
      voice.hiss()
      stage.after(0.65, () => catShake(c))
      crowd('joy', 1.4, c)
    } else {
      setMood(c, 'joy', 1.8)
      if (big) stage.after(0.15, () => voice.giggle(c.spec.pitch))
      crowd('joy', 1.2, c)
    }
    c.idleAt = stage.time + 2.5
  }

  const knock = (o: Char): void => {
    o.sitUntil = stage.time + 1.3
    o.stretch.value = 0.62
    setMood(o, 'wow', 0.5)
    voice.oof(o.spec.pitch)
    sfx.boing(0)
    stars(o.px, o.py - o.spec.cy, 8)
    stage.after(0.5, () => {
      if (o.state !== 'idle') return
      setMood(o, 'joy', 1.2)
      voice.giggle(o.spec.pitch)
    })
  }

  const land = (c: Char, v: number): void => {
    const t = stage.time
    c.h = 0
    c.rot = 0
    c.spin = 0
    c.vh = 0
    c.onTramp = false
    c.px = c.x
    c.py = c.gy
    if (inMud(c.x, c.gy)) {
      c.pounce = null
      c.pouncing = false
      splat(c, v)
      return
    }
    const hard = v > 430
    c.stretch.value = clamp(1 - v / 2300, 0.52, 0.94)
    if (v > 180) {
      dust(c.x, c.gy, hard)
      sfx.thud(clamp(v / 1100, 0.3, 1.2))
    }
    if (hard && c.spec.kid && c.bounces < 2) {
      // Kids come down on their bottoms and bounce.
      c.bounces++
      c.state = 'air'
      c.vh = v * 0.42
      c.vx *= 0.55
      c.vgy *= 0.5
      c.sitUntil = t + 1.4
      sfx.boing(c.bounces - 2)
      if (c.bounces === 1) voice.oof(c.spec.pitch)
      return
    }
    c.state = 'idle'
    c.vx = 0
    c.vgy = 0
    c.idleAt = t + rnd(3, 6)
    if (c.pouncing) {
      const o = c.pounce
      c.pounce = null
      c.pouncing = false
      if (o && o.state === 'idle' && dist(c.x, c.gy, o.x, o.gy) < 100) {
        knock(o)
        c.face = o.x > c.x ? 1 : -1
        toss(c, clamp(c.x - c.face * 120, 60, W - 60), c.gy, 380)
        c.bounces = 2
        setMood(c, 'smug', 1.8)
      } else {
        // Missed: a faceplant.
        c.flat = 0.75
        c.flatUntil = t + 0.3
        voice.oof(1.6)
      }
      return
    }
    if (c.kind === 'cat') {
      if (hard) {
        setMood(c, 'smug', 1.4)
        fx.ring(c.x, c.gy, '#ffffff', 70, 0.3)
      }
    } else if (hard || c.bounces > 0) {
      c.sitUntil = Math.max(c.sitUntil, t + 0.7)
      setMood(c, 'joy', 1.2)
      voice.giggle(c.spec.pitch)
    }
  }

  // ----------------------------------------------------------------- seesaw

  const launch = (o: Char, i: number, power: number): void => {
    const [ex, ey] = seatPos(i, seesaw.tilt)
    seesaw.occ[i] = null
    o.seat = -1
    o.act = ''
    wake(o)
    o.x = ex
    o.gy = SEESAW.gy
    o.h = Math.max(0, SEESAW.gy - ey)
    o.px = ex
    o.py = ey
    o.sitUntil = 0
    const r = riderOf(o)
    if (r) fling(r)
    if (power < 1) {
      // Too light to throw them: they hop, come back down, and it is the
      // dropper who flies.
      o.state = 'air'
      o.vh = 660
      o.vx = 0
      o.vgy = 0
      o.spin = 0
      o.bounces = 2
      setMood(o, 'wow', 0.6)
      voice.oof(o.spec.pitch)
      sfx.boing(1)
      return
    }
    const v = o.spec.launch * clamp(0.85 + 0.15 * power, 1, 1.15)
    const cat = o.kind === 'cat'
    if (i === 0) toss(o, MUD.x + rnd(-45, 45), MUD.y, v, 0, cat ? -2 : -1)
    else {
      toss(o, TRAMP.x + rnd(-22, 22), TRAMP.gy, v, TRAMP.top, cat ? 2 : 1)
      o.boostUntil = 0
    }
    if (cat) {
      voice.yowl()
      o.puff = 1
    } else voice.wheee(o.spec.pitch)
    sfx.slideUp()
    fx.hitstop(70)
    fx.shake(9)
    fx.ring(ex, ey, '#ffffff', 130, 0.35)
    fx.burst(ex, ey - 30, { count: 14, shape: 'spark', color: STAR_COLS, speed: 620, angle: -Math.PI / 2, spread: 0.9, life: 0.4, size: 12, gravity: 0 })
    award('launch', ex, ey - 120)
    watch(o, 2.2)
    crowd('wow', 1.4, o)
  }

  const seatLand = (c: Char, i: number, v: number): void => {
    const side = i === 0 ? -1 : 1
    c.state = 'seesaw'
    c.seat = i
    seesaw.occ[i] = c
    c.vx = 0
    c.vh = 0
    c.vgy = 0
    c.h = 0
    c.rot = 0
    c.spin = 0
    c.gy = SEESAW.gy
    c.onTramp = false
    c.face = i === 0 ? 1 : -1
    c.stretch.value = 0.62
    c.puff = 0
    const [ex, ey] = seatPos(i, seesaw.tilt)
    c.x = ex
    c.px = ex
    c.py = ey
    const wasUp = seesaw.target * side < 0
    if (!wasUp) {
      sfx.thud(0.5)
      sfx.boing(-1)
      return
    }
    const o = seesaw.occ[1 - i]
    seesaw.target = side * SEESAW.max
    seesaw.vel = side * 9
    sfx.thud(clamp(v / 900, 0.7, 1.3))
    sfx.crunch()
    dust(ex, SEESAW.gy, true)
    if (o) {
      launch(o, 1 - i, c.spec.weight / o.spec.weight)
      setMood(c, c.kind === 'cat' ? 'wow' : 'smug', 1.6)
    } else fx.shake(3)
  }

  // A tap pushes that end down, as if someone had stamped on it.
  const stampSeesaw = (i: number): void => {
    const side = i === 0 ? -1 : 1
    const [ex] = seatPos(i, seesaw.tilt)
    if (seesaw.target * side > 0) {
      seesaw.vel -= side * 3
      sfx.thud(0.4)
      const here = seesaw.occ[i]
      if (here) {
        here.stretch.value = 0.8
        voice.squeak(here.spec.pitch)
      }
      return
    }
    seesaw.target = side * SEESAW.max
    seesaw.vel = side * 9
    sfx.thud(0.9)
    sfx.crunch()
    dust(ex, SEESAW.gy, true)
    const o = seesaw.occ[1 - i]
    if (o) launch(o, 1 - i, 1.2)
    else fx.shake(3)
  }

  // ------------------------------------------------------------------ swing

  const sitOnSwing = (c: Char): void => {
    swing.occ = c
    const [sx, sy] = swingSeat(swing.ang)
    hopTo(c, sx, sy, 0.16, 14, () => {
      if (swing.occ !== c) return
      c.state = 'swing'
      c.face = 1
      c.stretch.value = 0.75
      swing.vel += 1.4
      swing.pushes = 0
      swing.armed = false
      swing.autoAt = stage.time + 4
      sfx.thud(0.4)
      if (c.kind === 'cat') voice.mrrp()
      else voice.giggle(c.spec.pitch)
    })
  }

  // Each push lifts the swing to the next height, whatever the phase.
  const SWING_AMPS = [0.36, 0.6, 0.82, 1.0] as const
  const pushSwing = (): void => {
    const dir = Math.abs(swing.vel) > 0.15 ? Math.sign(swing.vel) : swing.ang > 0 ? -1 : 1
    const c = swing.occ && swing.occ.state === 'swing' ? swing.occ : null
    const amp = SWING_AMPS[Math.min(c ? swing.pushes + 1 : 1, SWING_AMPS.length - 1)]!
    const want = 15.4 * (1 - Math.cos(amp))
    const have = 15.4 * (1 - Math.cos(swing.ang))
    swing.vel = dir * Math.max(Math.abs(swing.vel) + 0.4, Math.sqrt(Math.max(0, 2 * (want - have))))
    voice.creak()
    sfx.whoosh()
    if (!c) return
    swing.pushes++
    swing.autoAt = stage.time + 2.6
    setMood(c, c.kind === 'cat' ? 'wow' : 'joy', 1.2)
    sfx.boing(swing.pushes)
    if (c.kind === 'cat') voice.meow()
    else voice.giggle(c.spec.pitch * (1 + 0.08 * swing.pushes))
    c.stretch.kick(2.5)
    if (swing.pushes >= 3) swing.armed = true
  }

  const leapOffSwing = (c: Char): void => {
    const [sx, sy] = swingSeat(swing.ang)
    swing.occ = null
    swing.pushes = 0
    swing.armed = false
    const r = riderOf(c)
    if (r) fling(r)
    c.x = sx
    c.gy = TRAMP.gy
    c.h = Math.max(0, c.gy - sy)
    c.px = sx
    c.py = sy
    c.sitUntil = 0
    toss(c, TRAMP.x + rnd(-20, 20), TRAMP.gy, 700, TRAMP.top, 1)
    c.boostUntil = stage.time + 3
    if (c.kind === 'cat') {
      voice.yowl()
      c.puff = 1
    } else voice.wheee(c.spec.pitch)
    sfx.slideUp()
    stars(sx, sy - 60, 12)
    award('leap', sx, sy - 80)
    watch(c, 2)
    crowd('wow', 1.2, c, false)
  }

  // ------------------------------------------------------------------ slide

  const startSlide = (c: Char): void => {
    const [x0, y0] = slidePoint(0)
    hopTo(c, x0 - 26, y0 - 2, 0.24, 34, () => {
      c.state = 'slide'
      c.slideT = 0
      c.slideV = 0
      c.slideWait = 0.32
      c.face = 1
      c.stretch.value = 0.78
      setMood(c, 'wow', 0.35)
      sfx.pop(1)
    })
  }

  const exitSlide = (c: Char): void => {
    award('slide', c.px, c.py - 70)
    c.x = c.px
    c.gy = SLIDE.baseGy
    c.h = Math.max(0, c.gy - c.py)
    c.rot = 0
    c.spin = 0
    c.state = 'air'
    c.vx = 205
    c.vh = 330
    c.vgy = 75
    c.bounces = 0
    c.pouncing = false
    c.sitUntil = stage.time + 1.6
    sfx.whoosh()
    setMood(c, c.kind === 'cat' ? 'wow' : 'joy', 1.4)
  }

  // ------------------------------------------------------------- trampoline

  const trampBounce = (c: Char, out: number): void => {
    c.h = TRAMP.top
    c.vh = out
    c.vgy = (TRAMP.gy - c.gy) * 2
    // Drift back over the mat, but leave room for a friend beside.
    c.vx = (TRAMP.x + clamp(c.x - TRAMP.x, -64, 64) - c.x) * 0.8
    c.state = 'air'
    c.onTramp = true
    c.rot = 0
    c.bounces = 2
    c.pouncing = false
    c.stretch.value = 0.68
    tramp.sag.value = 18
    c.trampN++
    sfx.boing(Math.min(c.trampN, 7))
    fx.ring(c.x, TRAMP.gy - TRAMP.top, '#dfe8ff', 80, 0.3)
    if (out > 900) {
      c.spin = ((c.trampN % 2 === 0 ? 1 : -1) * TAU) / ((2 * out) / G)
      award('flip', c.x, TRAMP.gy - 200)
      if (c.kind === 'cat') voice.meow()
      else voice.wheee(c.spec.pitch)
      setMood(c, c.kind === 'cat' ? 'wow' : 'joy', 1.2)
    } else c.spin = 0
  }

  const trampLand = (c: Char, v: number): void => {
    const t = stage.time
    const boosted = t < c.boostUntil || v > 1300
    c.boostUntil = 0
    c.puff = 0
    if (!boosted && v * 0.72 < 330) {
      // Settled: stand on the mat until someone taps.
      c.state = 'idle'
      c.onTramp = true
      c.h = TRAMP.top
      c.vx = 0
      c.vh = 0
      c.vgy = 0
      c.rot = 0
      c.spin = 0
      c.stretch.value = 0.82
      tramp.sag.value = 8
      c.trampN = 0
      c.idleAt = t + 4
      return
    }
    trampBounce(c, boosted ? 1180 : clamp(v * 0.72, 0, 1250))
  }

  // Kick the mat: everyone standing on it flies, with a flip.
  const trampKick = (only: Char | null): void => {
    tramp.sag.value = 16
    let any = false
    for (const c of chars) {
      if (!c.onTramp || (only && c !== only)) continue
      any = true
      if (c.state === 'idle') trampBounce(c, 1150)
      else if (c.state === 'air') c.boostUntil = stage.time + 1.6
    }
    if (!any) sfx.boing(rnd(0, 3))
  }

  // -------------------------------------------------------------- sprinkler

  const clean = (c: Char): void => {
    fx.burst(c.x, c.gy - c.spec.cy, { count: 14, shape: 'star', color: ['#fff7a8', '#ffffff', '#aee4ff'], speed: 300, life: 0.8, size: 14, gravity: 100 })
    sfx.ding(4)
    award('wash', c.x, c.gy - c.spec.cy)
    if (c.kind !== 'cat') setMood(c, 'joy', 1.5)
  }

  const soak = (c: Char): void => {
    const dirty = c.mud > 0.05 || c.soot > 0.05
    voice.splash()
    c.cone = false
    wake(c)
    if (c.kind === 'cat') {
      // Cats and water.
      voice.yowl()
      c.puff = 1
      c.mud = 0
      c.soot = 0
      if (dirty) clean(c)
      c.act = ''
      c.onTramp = false
      c.h = 0
      toss(c, c.x < 560 ? c.x + 210 : c.x - 210, clamp(c.gy + 60, BAND_TOP, BAND_BOT), 780, 0, 0)
      c.bounces = 2
      watch(c, 1.5)
      crowd('joy', 1.2, c)
      return
    }
    setMood(c, 'joy', 1.6)
    if (!c.act) beginAct(c, 'twirl', 1.3)
    voice.giggle(c.spec.pitch)
  }

  const wash = (c: Char, dt: number): void => {
    if (!c.inWater) {
      c.inWater = true
      soak(c)
      if (c.state !== 'idle') return
    }
    c.tick += dt
    if (c.tick > 0.2) {
      c.tick = 0
      fx.burst(c.x + rnd(-30, 30), c.gy - rnd(30, c.spec.head), { count: 3, color: WATER_COLS, speed: 160, life: 0.4, size: 7, gravity: 700 })
    }
    if (c.mud > 0 || c.soot > 0) {
      c.mud = Math.max(0, c.mud - dt * 0.75)
      c.soot = 0
      if (c.mud === 0) clean(c)
    }
  }

  // ------------------------------------------------------------- pick-up, drop

  const pickChar = (x: number, y: number): Char | null => {
    let best: Char | null = null
    let bestD = 1
    for (const c of chars) {
      if (!present(c) || c.state === 'held') continue
      const cy = c.py - c.spec.cy * (1 - 0.18 * c.sitAmt)
      const d = Math.hypot((x - c.px) / (c.spec.rx + 24), (y - cy) / (c.spec.ry + 20))
      // Riders and small ones win a tie: they are on top.
      const bias = c.state === 'ride' ? 0.25 : c.spec.small ? 0.1 : 0
      if (d - bias < bestD) {
        bestD = d - bias
        best = c
      }
    }
    return best
  }

  const startDrag = (hold: Hold, p: Pointer): void => {
    const c = hold.c
    hold.drag = true
    if (!present(c) || c.state === 'held') return
    c.homeGy = c.state === 'idle' && !c.onTramp ? c.gy : -1
    detach(c)
    wake(c)
    c.state = 'held'
    c.heldBy = p.id
    const grab = grabOf(c.kind, c.dangle) * c.stretch.value
    c.grabDX = c.px - p.x
    c.grabDY = c.py - grab - p.y
    c.hx = p.x + c.grabDX
    c.hy = p.y + c.grabDY
    c.prevHX = c.hx
    c.holdV = 0
    c.stretch.value = 1.14
    c.giggleAt = stage.time + 1.3
    c.sitUntil = 0
    if (c.kind === 'cat') voice.mrrp()
    else voice.giggle(c.spec.pitch)
    sfx.pop(1)
    watch(c, 2.5)
  }

  const mount = (c: Char, o: Char): void => {
    c.state = 'ride'
    c.host = o
    c.vx = 0
    c.vh = 0
    c.h = 0
    c.stretch.value = 0.7
    c.puff = 0
    o.stretch.value = 0.8
    voice.squeak(c.spec.pitch)
    sfx.pop(2)
    wake(o)
    setMood(o, 'wow', 0.7)
    stage.after(0.7, () => {
      if (c.host !== o || o.state === 'held') return
      setMood(o, o.kind === 'cat' ? 'grumpy' : 'joy', 1.3)
      if (o.kind !== 'cat') voice.giggle(o.spec.pitch)
    })
    if (c.kind === 'cat') setMood(c, 'smug', 2.5)
    award('hat', o.px, o.py - o.spec.head)
    crowd('joy', 1, o, false)
  }

  const pancake = (c: Char, o: Char): void => {
    const t = stage.time
    o.flat = 1
    o.flatUntil = t + 0.55
    o.dizzyUntil = t + 1.5
    wake(o)
    voice.oof(o.spec.pitch)
    sfx.boing(-2)
    stars(o.px, o.py - 40, 10)
    fx.shake(5)
    c.x = o.px
    c.gy = clamp(o.gy + 8, BAND_TOP, BAND_BOT)
    c.h = Math.max(0, c.gy - c.py)
    c.state = 'air'
    c.vh = 640
    c.vx = (c.hx < o.px ? -1 : 1) * 240
    c.vgy = 0
    c.spin = 0
    c.bounces = 0
    setMood(c, 'joy', 1)
    stage.after(0.6, () => {
      sfx.pop(3)
      o.stretch.value = 1.4
    })
    crowd('joy', 1, o)
  }

  // Whose head is under a dropped character?
  const headUnder = (c: Char, ax: number, ay: number, feetY: number): Char | null => {
    let best: Char | null = null
    let bestD = 62
    for (const o of chars) {
      if (o === c || !present(o)) continue
      if (o.state === 'held' || o.state === 'air' || o.state === 'hop' || o.state === 'slide' || o.state === 'walk') continue
      // Never onto something that is itself riding on `c`.
      let up: Char | null = o
      let loop = false
      while (up) {
        if (up === c) loop = true
        up = up.host
      }
      if (loop || riderOf(o)) continue
      const top = o.py - headTop(o)
      const d = Math.abs(ax - o.px)
      // Either the feet or the finger itself is at the head.
      if (d < bestD && ((feetY > top - 80 && feetY < top + 50) || (ay > top - 110 && ay < top + 64))) {
        bestD = d
        best = o
      }
    }
    return best
  }

  const release = (c: Char, p: Pointer | null): void => {
    c.heldBy = -1
    c.lean.target = 0
    const ax = c.hx
    const ay = c.hy
    const feetY = c.py
    const vx0 = p ? clamp(p.vx * 0.55, -950, 950) : 0
    const vy0 = p ? clamp(p.vy * 0.55, -1100, 500) : 0
    const fast = Math.hypot(vx0, vy0) > 520
    c.x = clamp(ax, 45, W - 45)
    c.px = c.x
    c.bounces = 0
    c.pouncing = false
    // Picked up off the grass and let go on the spot: back where it stood.
    const still = p !== null && c.homeGy > 0 && dist(p.x, p.y, p.startX, p.startY) < 30
    if (!fast && !still) {
      const o = headUnder(c, ax, ay, feetY)
      if (o) {
        if (c.spec.small) mount(c, o)
        else pancake(c, o)
        return
      }
      if (!swing.occ && Math.abs(ax - SWING.px) < 112 && ay > 240 && ay < 505) {
        sitOnSwing(c)
        return
      }
      if (ax < 352 && ay < 548 && ay > 150) {
        startSlide(c)
        return
      }
      if (Math.abs(ax - SEESAW.x) < 238 && feetY > 598 && ay < 724) {
        let i = ax < SEESAW.x ? 0 : 1
        if (seesaw.occ[i]) i = 1 - i
        if (!seesaw.occ[i]) {
          const seat = i
          const [ex, ey] = seatPos(seat, seesaw.tilt)
          const d = dist(c.px, c.py, ex, ey)
          seesaw.occ[seat] = c
          c.seat = seat
          hopTo(c, ex, ey, clamp(d / 900, 0.1, 0.24), 12, () => {
            if (seesaw.occ[seat] === c) seesaw.occ[seat] = null
            seatLand(c, seat, 600 + d * 2)
          })
          return
        }
      }
    }
    // Let go in the open: fall (or fly, if flung) to the ground below.
    let gy: number
    let minH = 0
    if (Math.abs(ax - TRAMP.x) < TRAMP.rx + 4 && feetY < TRAMP.gy + 30) {
      gy = TRAMP.gy
      minH = TRAMP.top + 4
    } else if (feetY >= BAND_TOP - 30) gy = clamp(feetY + 26, BAND_TOP, BAND_BOT)
    else if (Math.abs(ax - SPRINK.x) < SPRINK.r) gy = 596
    else gy = 636
    if (still) {
      gy = c.homeGy
      minH = 0
    }
    c.gy = gy
    c.h = Math.max(minH, gy - feetY)
    c.vx = vx0
    c.vh = still ? 260 : -vy0
    c.vgy = 0
    c.spin = fast ? clamp(vx0 * 0.006, -7, 7) : 0
    c.state = 'air'
    if (fast) {
      if (c.kind === 'cat') voice.yowl()
      else voice.wheee(c.spec.pitch)
      sfx.whoosh()
      watch(c, 1.5)
    }
  }

  // ---------------------------------------------------------------- mischief

  const hopUp = (c: Char, v: number): void => {
    if (c.state !== 'idle' || c.onTramp) {
      c.stretch.value = 1.25
      return
    }
    c.state = 'air'
    c.vh = v
    c.vx = 0
    c.vgy = 0
    c.spin = 0
    c.bounces = 2
    c.pouncing = false
  }

  const mouthOf = (c: Char): [number, number] => [c.px, c.py - headTop(c) + (c.spec.kid ? 56 : 44)]

  const raspberry = (c: Char): void => {
    beginAct(c, 'rasp', 1.0)
    voice.raspberry()
    c.stretch.value = 0.9
    for (let i = 0; i < 4; i++) {
      stage.after(i * 0.13, () => {
        if (c.act !== 'rasp') return
        const [mx, my] = mouthOf(c)
        fx.burst(mx, my + 8, { count: 6, color: ['#cfefff', '#ffffff'], speed: 330, angle: Math.PI / 2, spread: 2.4, life: 0.45, size: 6, gravity: 700 })
      })
    }
    const o = nearest(c, 340, (k) => k.state !== 'held' && !k.asleep)
    if (o) {
      setMood(o, 'wow', 0.8)
      o.stretch.kick(3)
    }
    award('rasp', c.px, c.py - 150)
  }

  const toot = (c: Char): void => {
    beginAct(c, 'toot', 0.9)
    c.stretch.value = 0.76
    setMood(c, 'smug', 0.25)
    stage.after(0.22, () => {
      if (c.act !== 'toot') return
      voice.toot()
      setMood(c, 'joy', 1)
      fx.burst(c.px - c.face * 26, c.py - 46, { count: 12, color: ['#d7f5a8', '#f1ffd0', '#bfe88a'], speed: 200, angle: -Math.PI / 2, spread: 2, life: 0.9, size: 24, gravity: -260, drag: 0.94 })
      fx.text(c.px - c.face * 70, c.py - 40, '💨', { size: 50, rise: 50 })
      fx.shake(3)
      hopUp(c, 400)
      for (const o of chars) {
        if (o === c || !present(o) || o.state === 'held' || dist(o.px, o.py, c.px, c.py) > 360) continue
        wake(o)
        setMood(o, 'wow', 1)
        o.stretch.kick(3.5)
        if (o.kind === 'cat') o.puff = 1
      }
      award('toot', c.px, c.py - 120)
    })
  }

  const sillyFace = (c: Char): void => {
    beginAct(c, 'silly', 1.15)
    voice.nyah(c.spec.pitch)
    c.stretch.kick(3)
    award('silly', c.px, c.py - 150)
    crowd('joy', 1, c, false)
  }

  const bonk = (o: Char): void => {
    voice.bonk()
    wake(o)
    o.stretch.value = 0.7
    o.dizzyUntil = stage.time + 1.3
    stars(o.px, o.py - headTop(o), 8)
  }

  const crownAt = (c: Char): [number, number] => [c.px + (c.kind === 'cat' ? 2 : 9) * c.face, c.py - headTop(c) + 4]

  const throwCrown = (c: Char): void => {
    beginAct(c, 'throw', 1.1)
    c.crown = false
    sfx.whoosh()
    c.stretch.kick(3)
    const o = nearest(c, 540, (k) => k.state !== 'held' && k.state !== 'air')
    const [sx, sy] = crownAt(c)
    const toCat = o !== null && o.kind === 'cat'
    const farX = clamp(c.px + c.face * 300, 80, W - 80)
    const fl: Flyer = { kind: 'crown', emoji: '', x: sx, y: sy, rot: 0, s: 1 }
    flyers.push(fl)
    stage.tween(
      toCat ? 0.45 : 1.05,
      (k) => {
        const tx = o ? o.px : farX
        const ty = o ? o.py - headTop(o) - 4 : sy - 70
        if (toCat) {
          fl.x = lerp(sx, tx, k)
          fl.y = lerp(sy, ty, k) - Math.sin(Math.PI * k) * 100
        } else {
          const out = Math.sin(Math.PI * k)
          const [hx, hy] = crownAt(c)
          fl.x = lerp(hx, tx, out)
          fl.y = lerp(hy, ty, out) - Math.sin(TAU * k) * 70 - out * 26
        }
        fl.rot = k * TAU * 3
      },
      ease.linear,
      () => {
        flyers.splice(flyers.indexOf(fl), 1)
        if (toCat && o) {
          // The cat catches it and keeps it.
          o.crown = true
          wake(o)
          setMood(o, 'smug', 3)
          o.stretch.value = 0.8
          sfx.ding(3)
          voice.meow()
          setMood(c, 'wow', 0.8)
          stage.after(0.8, () => {
            if (c.state !== 'held' && !c.act) beginAct(c, 'pout', 1.0)
          })
          award('steal', o.px, o.py - 110)
          crowd('joy', 1.2, c)
        } else {
          c.crown = true
          sfx.ding(2)
          c.stretch.value = 0.85
        }
      },
    )
    if (!toCat) {
      award('crown', sx, sy - 40)
      if (o) stage.after(0.52, () => bonk(o))
    }
  }

  // The princess has no crown: whistle, and whoever has it sends it back.
  const callCrown = (c: Char): void => {
    const thief = chars.find((k) => k.kind === 'cat' && k.crown)
    if (!thief) {
      c.stretch.kick(3)
      return
    }
    beginAct(c, 'throw', 0.7)
    voice.whistle()
    thief.crown = false
    const [sx, sy] = crownAt(thief)
    const fl: Flyer = { kind: 'crown', emoji: '', x: sx, y: sy, rot: 0, s: 1 }
    flyers.push(fl)
    setMood(thief, 'grumpy', 1.6)
    stage.tween(
      0.55,
      (k) => {
        const [tx, ty] = crownAt(c)
        fl.x = lerp(sx, tx, k)
        fl.y = lerp(sy, ty, k) - Math.sin(Math.PI * k) * 120
        fl.rot = k * TAU * 2
      },
      ease.linear,
      () => {
        flyers.splice(flyers.indexOf(fl), 1)
        c.crown = true
        c.stretch.value = 0.82
        sfx.ding(2)
        setMood(c, 'joy', 1.2)
        voice.giggle(c.spec.pitch)
      },
    )
  }

  const mudPie = (c: Char, onGlass: boolean): void => {
    beginAct(c, 'throw', 0.6)
    voice.squelch()
    const sx = c.px + c.face * 40
    const sy = c.py - 110
    const o = onGlass ? null : nearest(c, 760, (k) => k.state !== 'held' && k.state !== 'air')
    award('pie', sx, sy)
    if (o) {
      mudBall(sx, sy, o, 0.48, () => {
        // Kids throw one straight back.
        if (o.spec.kid && o.state === 'idle' && !o.act && c.state === 'idle') {
          stage.after(0.7, () => {
            if (o.state !== 'idle' || o.act || !present(c)) return
            beginAct(o, 'throw', 0.6)
            voice.squelch()
            mudBall(o.px, o.py - 110, c, 0.48)
          })
        }
      })
      return
    }
    // Nobody to hit: it lands on the glass.
    const tx = rnd(260, W - 260)
    const ty = rnd(260, 520)
    const fl: Flyer = { kind: 'mud', emoji: '', x: sx, y: sy, rot: 0, s: 1 }
    flyers.push(fl)
    stage.tween(
      0.4,
      (k) => {
        fl.x = lerp(sx, tx, k)
        fl.y = lerp(sy, ty, k) - Math.sin(Math.PI * k) * 60
        fl.s = 1 + k * k * 5
        fl.rot = k * 5
      },
      ease.linear,
      () => {
        flyers.splice(flyers.indexOf(fl), 1)
        glass.push({ x: tx, y: ty, r: rnd(62, 84), t0: stage.time })
        sfx.splat()
        sfx.thud(0.8)
        fx.shake(7)
        fx.burst(tx, ty, { count: 16, color: MUD_COLS, speed: 520, life: 0.6, size: 13, gravity: 1200 })
        setMood(c, 'joy', 1.4)
        voice.giggle(c.spec.pitch)
      },
    )
  }

  const pounce = (c: Char): void => {
    beginAct(c, 'crouch', 0.4)
    c.stretch.value = 0.76
    voice.mrrp()
    const o = nearest(c, 480, (k) => k.state === 'idle' && !k.onTramp && !k.act)
    if (o) c.face = o.x > c.x ? 1 : -1
    stage.after(0.4, () => {
      if (c.state !== 'idle' || c.act !== 'crouch') return
      c.act = ''
      c.h = 0
      const tx = o ? o.x - c.face * 18 : clamp(c.x + c.face * 220, 60, W - 60)
      toss(c, tx, o ? o.gy + 3 : c.gy, 560)
      c.pounce = o
      c.pouncing = true
      c.bounces = 2
      sfx.whoosh()
      award('pounce', c.px, c.py - 70)
    })
  }

  const stealCrown = (c: Char, p: Char): void => {
    p.crown = false
    const [sx, sy] = crownAt(p)
    const fl: Flyer = { kind: 'crown', emoji: '', x: sx, y: sy, rot: 0, s: 1 }
    flyers.push(fl)
    sfx.whoosh()
    voice.mrrp()
    c.stretch.kick(4)
    setMood(p, 'wow', 0.9)
    stage.tween(
      0.42,
      (k) => {
        const [tx, ty] = crownAt(c)
        fl.x = lerp(sx, tx, k)
        fl.y = lerp(sy, ty, k) - Math.sin(Math.PI * k) * 90
        fl.rot = k * TAU * 2
      },
      ease.linear,
      () => {
        flyers.splice(flyers.indexOf(fl), 1)
        c.crown = true
        c.stretch.value = 0.8
        setMood(c, 'smug', 3)
        sfx.ding(3)
        award('steal', c.px, c.py - 110)
        stage.after(0.4, () => {
          if (p.state !== 'held' && !p.act) beginAct(p, 'pout', 1.1)
        })
        crowd('joy', 1.2, p)
      },
    )
  }

  const meowAct = (c: Char): void => {
    beginAct(c, 'meow', 0.7)
    voice.meow()
    c.stretch.kick(3)
    fx.burst(c.px, c.py - headTop(c), { count: 5, shape: 'heart', color: ['#ff7eb6', '#ff5d8f'], speed: 170, life: 0.9, size: 18, gravity: -140, angle: -Math.PI / 2, spread: 1.6 })
  }

  const trumpet = (c: Char): void => {
    beginAct(c, 'trumpet', 1.15)
    voice.trumpet()
    for (let i = 0; i < 3; i++) stage.after(0.1 + i * 0.14, () => fx.text(c.px + c.face * (50 + i * 26), c.py - 150 - i * 16, '🎵', { size: 36, rise: 70 }))
    stage.after(0.45, () => fx.confetti(c.px, c.py - 170, 16))
    award('trumpet', c.px, c.py - 160)
    crowd('joy', 1.2, c)
  }

  const visorBonk = (c: Char): void => {
    beginAct(c, 'bonk', 1.5)
    stage.after(0.1, () => voice.clank())
    stage.after(0.55, () => {
      if (c.act !== 'bonk') return
      bonk(c)
      award('bonk', c.px, c.py - 160)
      crowd('joy', 1, c, false)
    })
  }

  const flame = (c: Char): void => {
    const o = nearest(c, 400, (k) => k.state !== 'held')
    if (o) c.face = o.px > c.px ? 1 : -1
    beginAct(c, 'flame', 0.95)
    c.stretch.value = 0.82
    stage.after(0.15, () => {
      if (c.act !== 'flame') return
      voice.flame()
      award('flame', c.px + c.face * 80, c.py - 110)
    })
    for (let i = 0; i < 5; i++) {
      stage.after(0.15 + i * 0.09, () => {
        if (c.act !== 'flame') return
        fx.burst(c.px + c.face * 26, c.py - 86, { count: 9, color: ['#ffb02e', '#ff5d2e', '#ffe14d'], speed: 540, angle: c.face > 0 ? -0.12 : Math.PI + 0.12, spread: 0.5, life: 0.42, size: 22, gravity: -200, drag: 0.95 })
      })
    }
    stage.after(0.4, () => {
      if (c.act !== 'flame') return
      for (const k of chars) {
        if (k === c || !present(k) || k.state === 'held') continue
        const dx = (k.px - c.px) * c.face
        if (dx > 20 && dx < 290 && Math.abs(k.py - c.py) < 130) {
          k.soot = 1
          k.act = ''
          k.trick = 0
          wake(k)
          setMood(k, 'wow', 1.6)
          k.stretch.kick(4)
          if (k.kind === 'cat') k.puff = 1
          voice.squeak(k.spec.pitch)
        }
      }
    })
    stage.after(0.95, () => {
      fx.burst(c.px + c.face * 20, c.py - 96, { count: 5, color: ['#b9b9c6', '#dcdce6'], speed: 90, life: 0.9, size: 18, gravity: -200, drag: 0.94 })
      voice.squeak(c.spec.pitch)
    })
  }

  const ribbit = (c: Char): void => {
    beginAct(c, 'ribbit', 0.95)
    voice.ribbit()
    award('frog', c.px, c.py - 120)
    const o = nearest(c, 430, (k) => k.state !== 'held' && k.state !== 'air')
    stage.after(0.42, () => {
      if (c.act !== 'ribbit' || !o) return
      tongue.from = c
      tongue.to = o
      tongue.until = stage.time + 0.24
      sfx.pop(2)
      wake(o)
      setMood(o, 'wow', 1)
      o.stretch.kick(4)
      voice.squeak(o.spec.pitch)
    })
  }

  const eatCone = (c: Char): void => {
    c.cone = false
    sfx.chomp()
    setMood(c, 'yum', 1.5)
    c.stretch.kick(3)
    fx.burst(c.px, c.py - headTop(c), { count: 8, color: ['#ff9ec4', '#e8a95b', '#ffffff'], speed: 220, life: 0.6, size: 9, gravity: 900 })
  }

  const mischief = (c: Char): void => {
    wake(c)
    if (c.state === 'swing') {
      pushSwing()
      return
    }
    if (c.onTramp) {
      trampKick(c)
      return
    }
    if (c.state === 'air' || c.state === 'hop' || c.state === 'slide' || c.state === 'walk' || c.state === 'held' || c.act) {
      c.stretch.kick(3)
      return
    }
    if (c.cone) {
      eatCone(c)
      return
    }
    const n = c.tapN++
    switch (c.kind) {
      case 'princess': {
        if (!c.crown) {
          c.tapN = n
          callCrown(c)
        } else if (c.state === 'idle' && inMud(c.x, c.gy) && n % 2 === 0) mudPie(c, n % 4 === 2)
        else if (n % 4 === 0) raspberry(c)
        else if (n % 4 === 1) toot(c)
        else if (n % 4 === 2) throwCrown(c)
        else sillyFace(c)
        break
      }
      case 'cat': {
        const p = chars.find((k) => k.kind === 'princess' && k.crown && k.state !== 'held' && k.state !== 'air')
        if (n % 3 === 0 && c.state === 'idle') pounce(c)
        else if (n % 3 === 1 && p && !c.crown) stealCrown(c, p)
        else meowAct(c)
        break
      }
      case 'queen':
        if (n % 3 === 2) sillyFace(c)
        else trumpet(c)
        break
      case 'knight':
        if (n % 3 === 2) raspberry(c)
        else visorBonk(c)
        break
      case 'dragon':
        if (n % 3 === 2) toot(c)
        else flame(c)
        break
      default:
        ribbit(c)
        break
    }
  }

  // The small things the cast does when nobody is touching them.
  const fidget = (c: Char): void => {
    const t = stage.time
    c.idleAt = t + rnd(4, 8)
    if (c.asleep) return
    if (c.kind === 'princess' && inMud(c.x, c.gy)) {
      // Mud pies.
      beginAct(c, 'pat', 1.3)
      const px = c.x + rnd(-80, 80)
      const py = c.gy + rnd(0, 26)
      stage.after(1.0, () => {
        if (c.act !== 'pat') return
        bg.fillStyle = '#5b381d'
        bg.beginPath()
        bg.ellipse(px, py, 15, 7, 0, 0, TAU)
        bg.fill()
        bg.fillStyle = '#8b5e34'
        bg.beginPath()
        bg.ellipse(px, py - 4, 12, 7, 0, Math.PI, 0)
        bg.fill()
        if (t - lastTouch < 12) voice.blup()
      })
    } else if (c.kind === 'cat') beginAct(c, 'groom', 1.6)
    else {
      c.stretch.value = 0.86
      c.face = c.face === 1 ? -1 : 1
    }
  }

  // ---------------------------------------------------------- friends, cart

  // Where a newcomer can stand without hiding the swing seat or the seesaw.
  const SPOTS_KID: readonly (readonly [number, number])[] = [
    [850, 636],
    [940, 594],
    [870, 742],
    [430, 655],
  ]
  const SPOTS_SMALL: readonly (readonly [number, number])[] = [
    [700, 606],
    [560, 612],
    [850, 640],
    [940, 594],
    [880, 742],
    [420, 742],
  ]

  const freeSpot = (kid: boolean): readonly [number, number] => {
    const spots = kid ? SPOTS_KID : SPOTS_SMALL
    for (const s of spots) {
      let clear = true
      for (const o of chars) if (present(o) && Math.abs(s[0] - o.x) < 96 && Math.abs(s[1] - o.gy) < 90) clear = false
      if (clear) return s
    }
    return spots[0]!
  }

  const arrive = (kind: Kind): void => {
    const [sx, sgy] = freeSpot(SPECS[kind].kid)
    const fromRight = sx > W / 2
    const c = makeChar(kind, fromRight ? W + 90 : -90, sgy)
    c.px = c.x
    c.py = c.gy
    c.face = fromRight ? -1 : 1
    if (kind === 'dragon') c.hover = 130
    chars.push(c)
    sfx.fanfare()
    const ex = fromRight ? W - 30 : 30
    fx.confetti(ex, sgy - 120, 40)
    fx.ring(ex, sgy - 90, '#ffffff', 160, 0.6)
    watch(c, 3)
    crowd('joy', 2, c)
    walkTo(c, sx, sgy, kind === 'frog' ? 300 : 250, () => {
      c.face = sx > W / 2 ? -1 : 1
      stage.after(0.3, () => {
        if (c.state === 'idle' && !c.act) {
          // Show off its trick; the sticker waits for the child to find it.
          quietUntil = stage.time + 1.5
          mischief(c)
        }
      })
    })
  }

  const slotPos = (slot: number): [number, number] => [cart.x - 30 + slot * 62, CART.gy - 138]

  const stockCone = (cone: Cone): void => {
    if (!cart.here || cone.state !== 'gone') return
    cone.state = 'cart'
    cone.pop = 0
    stage.tween(0.4, (k) => (cone.pop = k), ease.outBack)
    sfx.pop(4)
  }

  const callCart = (): void => {
    cart.called = true
    voice.jingle()
    stage.tween(
      2.4,
      (k) => (cart.x = lerp(W + 220, CART.x, k)),
      ease.outCubic,
      () => {
        cart.here = true
        cart.ring.kick(5)
        voice.bell()
        for (const cone of cones) stage.after(0.2 + cone.slot * 0.2, () => stockCone(cone))
        crowd('joy', 1.5, null)
        lookAt(CART.x, CART.gy - 100, 2.5)
      },
    )
  }

  const dropCone = (cone: Cone, x: number, y: number): void => {
    cone.state = 'gone'
    cone.heldBy = -1
    stage.after(1.5, () => stockCone(cone))
    const o = pickChar(x, y)
    if (o && o.state !== 'air') {
      wake(o)
      const top = o.py - headTop(o)
      if (y < top + (o.spec.kid ? 58 : 40)) {
        // On the head.
        o.cone = true
        o.coneUntil = stage.time + 16
        o.stretch.value = 0.72
        sfx.splat()
        sfx.boing(-1)
        setMood(o, o.kind === 'cat' ? 'grumpy' : 'wow', 1.4)
        fx.burst(o.px, top, { count: 12, color: ['#ff9ec4', '#ffd0e4', '#ffffff'], speed: 300, life: 0.6, size: 11, gravity: 1000 })
        award('cone', o.px, top - 30)
        crowd('joy', 1.4, o)
        stage.after(1.4, () => {
          if (o.cone && o.kind !== 'cat' && o.state !== 'held') {
            setMood(o, 'joy', 1.2)
            voice.giggle(o.spec.pitch)
          }
        })
      } else {
        sfx.chomp()
        setMood(o, 'yum', 1.7)
        o.stretch.kick(4)
        fx.burst(x, y, { count: 8, color: ['#ff9ec4', '#e8a95b', '#ffffff'], speed: 220, life: 0.6, size: 9, gravity: 900 })
        stage.after(0.5, () => {
          if (o.kind === 'cat') voice.meow()
          else voice.giggle(o.spec.pitch)
        })
      }
      return
    }
    // Dropped: it lands scoop first.
    const gy = clamp(y + 50, BAND_TOP, BAND_BOT)
    const fl: Flyer = { kind: 'sticker', emoji: '🍦', x, y, rot: 0, s: 1.9 }
    flyers.push(fl)
    stage.tween(
      0.28,
      (k) => {
        fl.y = lerp(y, gy - 16, k)
        fl.rot = k * Math.PI
      },
      ease.inQuad,
      () => {
        flyers.splice(flyers.indexOf(fl), 1)
        paintSplat(bg, x, gy, 15, '#ff9ec4', '#ffd0e4')
        sfx.splat()
        fx.burst(x, gy - 6, { count: 8, color: ['#ff9ec4', '#ffd0e4'], speed: 240, angle: -Math.PI / 2, spread: 2.4, life: 0.5, size: 10, gravity: 1000 })
        // The cat comes over for a lick.
        const cat = chars.find((k) => k.kind === 'cat')
        if (cat && cat.state === 'idle' && !cat.act && !cat.asleep && !cat.onTramp) {
          walkTo(cat, clamp(x + (cat.x < x ? -40 : 40), 50, W - 50), clamp(gy + 4, BAND_TOP, BAND_BOT), 300, () => beginAct(cat, 'groom', 1.8))
        }
      },
    )
  }

  // --------------------------------------------------------- taps on the world

  const plantFlower = (x: number, y: number): void => {
    const emoji = FLOWERS[flowerN % FLOWERS.length]!
    const sp = { x, y, emoji, k: 0 }
    sprouts.push(sp)
    sfx.pop(flowerN % 6)
    flowerN++
    fx.burst(x, y, { count: 5, color: ['#8fe3a0', '#ffffff'], speed: 160, angle: -Math.PI / 2, spread: 1.6, life: 0.4, size: 7 })
    stage.tween(
      0.4,
      (k) => (sp.k = k),
      ease.outBack,
      () => {
        sprouts.splice(sprouts.indexOf(sp), 1)
        sprite(bg, emoji, x, y - 15, 34)
      },
    )
  }

  const mudSplash = (x: number, y: number): void => {
    sfx.splat()
    voice.blup()
    mudRipple = 1
    fx.burst(x, y, { count: 16, color: MUD_COLS, speed: 460, angle: -Math.PI / 2, spread: 1.7, life: 0.8, size: 12, gravity: 1500 })
    fx.ring(x, y, '#8b5e34', 80, 0.3)
    splashAround(x, y + 20, 170, 0.34, null)
    paintMudMarks(x, y, 1)
  }

  const gushSprinkler = (): void => {
    gush = 1
    voice.splash()
    sfx.slideUp()
    fx.burst(SPRINK.x, SPRINK.y - 30, { count: 20, color: WATER_COLS, speed: 620, angle: -Math.PI / 2, spread: 1.8, life: 0.8, size: 9, gravity: 1100 })
    for (const c of chars) {
      if (!present(c) || c.state !== 'idle' || c.onTramp || c.inWater) continue
      if (Math.abs(c.x - SPRINK.x) < 210 && c.gy < SPRINK.y + 120) {
        soak(c)
        if (c.kind !== 'cat' && (c.mud > 0 || c.soot > 0)) {
          c.mud = Math.max(0, c.mud - 0.6)
          c.soot = 0
          if (c.mud === 0) clean(c)
        }
      }
    }
  }

  const slideSparkle = (): void => {
    for (let i = 0; i < 6; i++) {
      stage.after(i * 0.07, () => {
        const [x, y] = slidePoint(i / 5)
        fx.burst(x, y, { count: 4, shape: 'star', color: STAR_COLS, speed: 150, life: 0.45, size: 12, gravity: 300 })
        sfx.note(6 - i, 0.12, 'triangle', 0.14)
      })
    }
  }

  const firework = (): void => {
    sfx.whoosh()
    fx.burst(CASTLE.x, CASTLE.y - 70, { count: 6, shape: 'spark', color: STAR_COLS, speed: 500, angle: -Math.PI / 2, spread: 0.3, life: 0.35, size: 10, gravity: 0 })
    stage.after(0.32, () => {
      const x = CASTLE.x + rnd(-70, 70)
      const y = 190 + rnd(-40, 30)
      fx.burst(x, y, { count: 30, shape: 'star', color: ['#ff7eb6', '#ffe14d', '#8fd0ff', '#c9a6ff', '#ffffff'], speed: 420, life: 1, size: 14, gravity: 260 })
      fx.ring(x, y, '#ffffff', 110, 0.4)
      sfx.pop(rnd(0, 5))
      sfx.crunch()
    })
  }

  const tapWorld = (x: number, y: number): void => {
    const t = stage.time
    lookAt(x, y, 1.6)
    // Bunting: each flag is a note.
    if (y < 96) {
      const i = clamp(Math.round(((x - 60) / (W - 120)) * (STICKERS.length - 1)), 0, STICKERS.length - 1)
      const s = stickers[i]!
      s.wob.kick(x < flagX(i) ? 5 : -5)
      if (s.shown) s.pop.value = 1.4
      sfx.note(i % 10, 0.25, 'triangle', 0.2)
      fx.ring(flagX(i), ropeY(flagX(i)) + 26, '#ffffff', 40, 0.25)
      return
    }
    if (cart.here && Math.abs(x - cart.x) < 96 && y > CART.gy - 200 && y < CART.gy + 10) {
      cart.ring.kick(7)
      voice.bell()
      for (const cone of cones) cone.pop = cone.state === 'cart' ? 1.3 : cone.pop
      fx.ring(x, y, '#ffffff', 60, 0.3)
      return
    }
    const [sx, sy] = swingSeat(swing.ang)
    const swinging = swing.occ !== null && swing.occ.state === 'swing'
    if (dist(x, y, sx, sy - 20) < 78 || (swinging && Math.abs(x - SWING.px) < 250 && y > 170 && y < 530)) {
      pushSwing()
      fx.ring(sx, sy, '#ffffff', 60, 0.3)
      return
    }
    if (Math.abs(x - SEESAW.x) < 196 && y > 598 && y < 736) {
      stampSeesaw(x < SEESAW.x ? 0 : 1)
      fx.ring(x, y, '#ffffff', 60, 0.3)
      return
    }
    if (Math.abs(x - TRAMP.x) < TRAMP.rx + 10 && y > TRAMP.gy - 80 && y < TRAMP.gy + 26) {
      trampKick(null)
      fx.ring(TRAMP.x, TRAMP.gy - TRAMP.top, '#ffffff', 90, 0.3)
      return
    }
    if (dist(x, y, SPRINK.x, SPRINK.y - 30) < 84) {
      gushSprinkler()
      return
    }
    if (inMud(x, y) || inMud(x, y + 16)) {
      mudSplash(x, y)
      return
    }
    if (x < 356 && y > 168 && y < 536) {
      slideSparkle()
      fx.ring(x, y, '#ffffff', 60, 0.3)
      return
    }
    if (dist(x, y, SUN.x, SUN.y) < SUN.r + 30) {
      sun.vel = 9
      sun.winkUntil = t + 0.9
      sun.pop.value = 1.25
      sfx.ding(rnd(0, 4))
      stars(SUN.x, SUN.y, 10)
      return
    }
    for (const c of clouds) {
      if (Math.abs(x - c.x) < 90 * c.s && Math.abs(y - c.y) < 46 * c.s) {
        c.squash.value = 0.7
        fx.burst(c.x, c.y + 20, { count: 16, color: '#8fd0ff', speed: 130, angle: Math.PI / 2, spread: 1.3, gravity: 900, life: 0.9, size: 8 })
        for (let i = 0; i < 3; i++) sfx.tone({ freq: sfx.scale(7 - i * 2), dur: 0.1, type: 'sine', vol: 0.16, delay: i * 0.09 })
        return
      }
    }
    if (dist(x, y, butterfly.x, butterfly.y) < 64) {
      butterfly.off += 1.7
      butterfly.dartUntil = t + 0.6
      sfx.note(rnd(4, 9), 0.2, 'sine', 0.18)
      fx.burst(butterfly.x, butterfly.y, { count: 8, shape: 'star', color: ['#c9a6ff', '#8fd0ff', '#ffffff'], speed: 200, life: 0.6, size: 10, gravity: 100 })
      return
    }
    if (Math.abs(x - CASTLE.x) < 76 && y > CASTLE.y - 80 && y < CASTLE.y + 90) {
      firework()
      return
    }
    if (y > GRASS_Y + 24) {
      plantFlower(x, Math.min(y, H - 30))
      return
    }
    // Sky: a twinkle.
    fx.ring(x, y, '#ffffff', 50, 0.3)
    fx.burst(x, y, { count: 6, shape: 'star', color: STAR_COLS, speed: 170, life: 0.5, size: 12, gravity: 200 })
    sfx.note(Math.round(rnd(3, 9)), 0.2, 'sine', 0.16)
  }

  // ---------------------------------------------------------- per-frame update

  const updateAir = (c: Char, dt: number): void => {
    const floaty = c.kind === 'dragon' && c.vh < 0 ? 0.45 : 1
    c.vh -= G * floaty * dt
    c.h += c.vh * dt
    c.x += c.vx * dt
    c.gy = clamp(c.gy + c.vgy * dt, BAND_TOP - 10, BAND_BOT)
    if (c.x < 45) {
      c.x = 45
      c.vx = Math.abs(c.vx) * 0.5
    } else if (c.x > W - 45) {
      c.x = W - 45
      c.vx = -Math.abs(c.vx) * 0.5
    }
    c.rot += c.spin * dt
    c.px = c.x
    c.py = c.gy - c.h
    if (c.h > 180 && Math.abs(c.vh) + Math.abs(c.vx) > 500) {
      // A sparkle trail on the big flights.
      c.tick += dt
      if (c.tick > 0.05) {
        c.tick = 0
        fx.burst(c.px, c.py - c.spec.cy, { count: 1, shape: 'star', color: STAR_COLS, speed: 60, life: 0.5, size: 13, gravity: 80 })
      }
    }
    if (c.vh >= 0) return
    if (onTramp(c.x, c.gy) && c.h <= TRAMP.top + 2) {
      trampLand(c, -c.vh)
      c.px = c.x
      c.py = c.gy - c.h
      return
    }
    if (Math.abs(c.gy - SEESAW.gy) < 46) {
      for (let i = 0; i < 2; i++) {
        if (seesaw.occ[i]) continue
        const [ex, ey] = seatPos(i, seesaw.tilt)
        if (Math.abs(c.x - ex) < 58 && c.py >= ey - 4 && c.py < ey + 60) {
          seatLand(c, i, -c.vh)
          return
        }
      }
    }
    if (c.h <= 0) land(c, -c.vh)
  }

  const updateHeld = (c: Char, dt: number): void => {
    const p = stage.pointers.get(c.heldBy)
    if (!p) {
      release(c, null)
      return
    }
    const t = stage.time
    c.grabDX = damp(c.grabDX, 0, 14, dt)
    c.grabDY = damp(c.grabDY, 0, 14, dt)
    c.hx = clamp(p.x + c.grabDX, 30, W - 30)
    c.hy = p.y + c.grabDY
    const v = (c.hx - c.prevHX) / Math.max(dt, 0.001)
    c.prevHX = c.hx
    c.holdV = lerp(c.holdV, v, 0.25)
    c.lean.target = clamp(c.holdV * 0.0011, -0.8, 0.8)
    const grab = grabOf(c.kind, c.dangle) * c.stretch.value
    c.px = c.hx - Math.sin(c.lean.value) * grab
    c.py = c.hy + Math.cos(c.lean.value) * grab
    c.x = c.px
    if (Math.abs(c.holdV) > 950 && t > c.giggleAt) {
      c.giggleAt = t + 1.4
      if (c.kind === 'cat') voice.meow()
      else voice.giggle(c.spec.pitch)
    }
  }

  const updateRide = (c: Char): void => {
    const o = c.host
    if (!o || !present(o)) {
      fling(c)
      return
    }
    if (o.state === 'air' && Math.abs(o.vh) > 560 && !o.onTramp) {
      fling(c)
      return
    }
    const head = headTop(o)
    if (o.state === 'held') {
      const off = grabOf(o.kind, o.dangle) * o.stretch.value - head
      c.px = o.hx - Math.sin(o.lean.value) * off
      c.py = o.hy + Math.cos(o.lean.value) * off
      c.rot = o.lean.value
    } else {
      const r = o.state === 'air' ? 0 : o.rot
      c.px = o.px + Math.sin(r) * head
      c.py = o.py - Math.cos(r) * head
      c.rot = r * 0.6
    }
    c.x = c.px
    c.gy = o.gy + 1
  }

  const updateChar = (c: Char, dt: number): void => {
    const t = stage.time
    switch (c.state) {
      case 'idle': {
        c.h = c.onTramp ? TRAMP.top - tramp.sag.value * 0.7 : 0
        c.px = c.x
        c.py = c.gy - c.h
        if (!c.onTramp && inSprinkler(c.x, c.gy)) wash(c, dt)
        else c.inWater = false
        if (c.state === 'idle' && !c.act && t > c.idleAt && holds.size === 0) fidget(c)
        break
      }
      case 'held':
        updateHeld(c, dt)
        break
      case 'air':
        updateAir(c, dt)
        break
      case 'walk': {
        const dx = c.tx - c.x
        const dy = c.tgy - c.gy
        const d = Math.hypot(dx, dy)
        const frog = c.kind === 'frog'
        if (d < 6) {
          const done = c.walkDone
          c.walkDone = null
          if (c.hover > 0) {
            c.h = c.hover
            c.hover = 0
            c.state = 'air'
            c.vh = 0
            c.vx = 0
            c.vgy = 0
            c.bounces = 2
          } else {
            c.state = 'idle'
            c.h = 0
            c.stretch.value = 0.85
          }
          c.idleAt = t + rnd(3, 6)
          done?.()
        } else {
          const step = Math.min(d, c.walkSpeed * dt)
          c.x += (dx / d) * step
          c.gy += (dy / d) * step
          c.gait += dt * (frog ? 5.5 : 10)
          c.h = c.hover + Math.abs(Math.sin(c.gait)) * (frog ? 52 : 13)
          if (Math.abs(dx) > 4) c.face = dx > 0 ? 1 : -1
        }
        c.px = c.x
        c.py = c.gy - c.h
        break
      }
      case 'hop': {
        c.hopT += dt / c.hopDur
        const k = Math.min(1, c.hopT)
        c.px = lerp(c.hopFX, c.hopTX, k)
        c.py = lerp(c.hopFY, c.hopTY, k * k) - Math.sin(Math.PI * k) * c.hopArc
        c.x = c.px
        if (k >= 1) {
          const done = c.hopDone
          c.hopDone = null
          done?.()
        }
        break
      }
      case 'slide': {
        const [x0, y0] = slidePoint(0)
        if (c.slideWait > 0) {
          c.slideWait -= dt
          c.px = lerp(x0, x0 - 26, clamp(c.slideWait / 0.32, 0, 1))
          c.py = y0 - 2
          c.rot = 0
          if (c.slideWait <= 0) {
            sfx.slideDown()
            if (c.kind === 'cat') voice.meow()
            else voice.wheee(c.spec.pitch)
          }
        } else {
          c.slideV += 3.2 * dt
          c.slideT += c.slideV * dt
          const [x, y, a] = slidePoint(Math.min(1, c.slideT))
          c.px = x
          c.py = y
          c.rot = a * 0.42
          c.tick += dt
          if (c.tick > 0.07) {
            c.tick = 0
            fx.burst(x - 10, y - 6, { count: 2, shape: 'spark', color: '#ffffff', speed: 160, angle: a + Math.PI, spread: 0.6, life: 0.25, size: 9, gravity: 0 })
          }
          if (c.slideT >= 1) exitSlide(c)
        }
        c.x = c.px
        break
      }
      case 'swing': {
        const [sx, sy] = swingSeat(swing.ang)
        c.px = sx
        c.py = sy
        c.x = sx
        c.rot = -swing.ang
        break
      }
      case 'seesaw': {
        const [ex, ey] = seatPos(c.seat, seesaw.tilt)
        c.px = ex
        c.py = ey
        c.x = ex
        c.rot = seesaw.tilt * 0.8
        break
      }
      default:
        break
    }
  }

  const updateBody = (c: Char, dt: number): void => {
    const t = stage.time
    c.stretch.update(dt)
    c.stretch.value = clamp(c.stretch.value, 0.42, 1.7)
    if (c.state !== 'held') c.lean.target = 0
    c.lean.update(dt)
    c.sway.target = clamp(((c.lastPX - c.px) / Math.max(dt, 0.001)) * 0.0016, -1, 1)
    c.sway.update(dt)
    c.lastPX = c.px
    const held = c.state === 'held'
    const air = c.state === 'air'
    c.dangle = damp(c.dangle, held ? 1 : 0, 14, dt)
    c.kickAmt = damp(c.kickAmt, held ? 1 : air ? 0.55 : 0, 10, dt)
    const seated = c.state === 'seesaw' || c.state === 'swing' || c.state === 'slide'
    const muddy = c.state === 'idle' && c.spec.kid && !c.onTramp && inMud(c.x, c.gy)
    const sit = seated || muddy || (t < c.sitUntil && (c.state === 'idle' || air))
    c.sitAmt = damp(c.sitAmt, sit ? 1 : 0, 16, dt)
    c.airAmt = damp(c.airAmt, air && !sit ? 1 : 0, 12, dt)
    // Arms.
    let arms = -0.78
    const mood = moodOf(c)
    if (held) arms = 0.85
    else if (air || c.state === 'slide') arms = 0.95
    else if (c.state === 'swing') arms = 0.5
    else if (c.state === 'seesaw') arms = 0.1
    else if (mood === 'joy') arms = 0.65
    else if (mood === 'wow') arms = 0.1
    if (c.act === 'silly' || c.act === 'twirl' || c.act === 'throw') arms = 1
    else if (c.act === 'rasp') arms = -0.25
    else if (c.act === 'pout' || c.act === 'toot') arms = -1
    else if (c.act === 'pat') arms = Math.sin(t * 12) * 0.5 - 0.2
    else if (c.act === 'trumpet') arms = 0.35
    else if (c.act === 'bonk') arms = c.actT < 0.7 ? 0.9 : -0.6
    c.armsAmt = damp(c.armsAmt, arms, 13, dt)
    c.puff = damp(c.puff, c.kind === 'cat' && ((air && Math.abs(c.vh) > 200) || c.act === 'shake') ? 1 : 0, 3.5, dt)
    if (c.soot > 0) c.soot = Math.max(0, c.soot - dt * 0.2)
    if (c.cone && t > c.coneUntil) {
      c.cone = false
      fx.burst(c.px, c.py - headTop(c), { count: 6, color: ['#ff9ec4', '#ffd0e4'], speed: 160, life: 0.5, size: 9, gravity: 900 })
    }
    if (t > c.flatUntil) c.flat = damp(c.flat, 0, 18, dt)
    // Acts.
    if (c.act) {
      c.actT += dt
      const k = c.actT / c.actDur
      if (c.act === 'ribbit') c.trick = Math.sin(Math.PI * clamp(k * 1.6, 0, 1))
      else if (c.act === 'trumpet') c.trick = k < 0.85 ? Math.min(1, k * 8) : (1 - k) / 0.15
      else if (c.act === 'bonk') c.trick = k < 0.45 ? Math.min(1, k * 14) : Math.max(0, 1 - (k - 0.45) * 12)
      else if (c.act === 'flame') c.trick = k > 0.12 && k < 0.8 ? 1 : 0
      else if (c.act === 'twirl' && t > c.twirlAt) {
        c.twirlAt = t + 0.14
        c.face = c.face === 1 ? -1 : 1
      } else if (c.act === 'shake') {
        c.tick += dt
        if (c.tick > 0.06) {
          c.tick = 0
          fx.burst(c.px, c.py - 50, { count: 4, color: MUD_COLS, speed: 520, life: 0.5, size: 9, gravity: 900 })
        }
      }
      if (c.actT >= c.actDur) {
        c.act = ''
        c.trick = 0
      }
    }
    // Eyes follow whatever is going on.
    let lx = 0
    let ly = 0
    let tx = c.px
    let ty = c.py - 100
    if (t < focus.until) {
      const w = focus.who
      if (w && w !== c) {
        tx = w.px
        ty = w.py - w.spec.cy
      } else if (!w) {
        tx = focus.x
        ty = focus.y
      }
    } else {
      tx = c.px + Math.sin(t * 0.7 + c.seed) * 200
      ty = c.py - 100 + Math.sin(t * 0.43 + c.seed * 2) * 80
    }
    lx = clamp((tx - c.px) / 240, -1, 1)
    ly = clamp((ty - (c.py - 100)) / 220, -1, 1)
    c.lookX = damp(c.lookX, lx, 10, dt)
    c.lookY = damp(c.lookY, ly, 10, dt)
  }

  const director = (dt: number): void => {
    const t = stage.time
    if (t - lastTouch < 8) played += dt
    const princess = chars[0]!
    const cat = chars[1]!
    // Before the first touch the princess is plainly up to something.
    if (!everTouched) {
      if (t > nextSneak && princess.state === 'idle') {
        nextSneak = t + 1.5
        princess.stretch.value = 0.84
        setMood(princess, 'smug', 0.7)
        watch(cat, 1.2)
      }
      if (!attractDone && t > 11 && princess.state === 'idle' && seesaw.occ[0] && !seesaw.occ[1]) {
        attractDone = true
        const [ex, ey] = seatPos(1, seesaw.tilt)
        princess.stretch.value = 0.7
        seesaw.occ[1] = princess
        princess.seat = 1
        hopTo(princess, ex, ey, 0.5, 110, () => {
          if (seesaw.occ[1] === princess) seesaw.occ[1] = null
          seatLand(princess, 1, 900)
        })
      }
    }
    // Idle life: someone does their thing now and then.
    if (t - lastTouch > 9 && t > nextAuto) {
      nextAuto = t + rnd(5, 8)
      const free = chars.filter((c) => (c.state === 'idle' || c.state === 'seesaw') && !c.act && !c.asleep && !c.onTramp)
      const c = free[Math.floor(Math.random() * free.length)]
      if (c) mischief(c)
    }
    // Friends wander in as play goes on.
    const want = found >= 12 || played > 150 ? 4 : found >= 9 || played > 110 ? 3 : found >= 6 || played > 70 ? 2 : found >= 3 || played > 32 ? 1 : 0
    if (arrived < want && t > nextArriveAt && holds.size === 0 && !chars.some((c) => c.state === 'walk')) {
      arrive(FRIENDS[arrived]!)
      arrived++
      nextArriveAt = t + 9
    }
    if (!cart.called && (found >= 5 || played > 55)) callCart()
  }

  // ------------------------------------------------------------------ setup

  const princess = makeChar('princess', 868, 664)
  princess.face = -1
  chars.push(princess)
  const cat = makeChar('cat', 470, SEESAW.gy)
  cat.asleep = true
  cat.state = 'seesaw'
  cat.seat = 0
  cat.face = 1
  seesaw.occ[0] = cat
  chars.push(cat)
  {
    const [ex, ey] = seatPos(0, seesaw.tilt)
    cat.px = ex
    cat.py = ey
    cat.lastPX = ex
    cat.x = ex
  }

  // Rasterise every emoji and floating word now, not on the frame it first shows.
  {
    const warm = document.createElement('canvas').getContext('2d')
    if (warm) {
      for (const [, emoji] of STICKERS) sprite(warm, emoji, 0, 0, 8)
      for (const emoji of ['🍦', '🔔', '🎺', '🦋', '👆', ...FLOWERS]) sprite(warm, emoji, 0, 0, 8)
      for (const size of [20, 26, 32]) label(warm, 'z', 0, 0, size, '#ffffff', 'rgba(60,60,110,0.8)')
      drawText(warm, '🎵', 0, 0, 36, '#ffffff', 'rgba(30,20,40,0.85)')
      drawText(warm, '💨', 0, 0, 50, '#ffffff', 'rgba(30,20,40,0.85)')
    }
  }

  // ------------------------------------------------------------------ drawing

  const pose: Pose = {
    kind: 'princess',
    t: 0,
    seed: 0,
    mood: 'grin',
    lookX: 0,
    lookY: 0,
    blink: 0,
    dangle: 0,
    kick: 0,
    air: 0,
    sit: 0,
    arms: 0,
    mud: 0,
    soot: 0,
    crown: false,
    cone: false,
    puff: 0,
    trick: 0,
    sway: 0,
  }

  const actWobble = (c: Char): number => {
    const t = stage.time
    if (c.act === 'silly') return Math.sin(t * 14) * 0.13
    if (c.act === 'shake') return Math.sin(t * 58) * 0.24
    if (c.act === 'crouch') return Math.sin(t * 34) * 0.07
    if (c.act === 'rasp') return 0.09 + Math.sin(t * 40) * 0.02
    if (c.act === 'pat') return Math.sin(t * 12) * 0.04
    if (t < c.dizzyUntil && c.state === 'idle') return Math.sin(t * 9) * 0.09
    return 0
  }

  const drawOne = (g: CanvasRenderingContext2D, c: Char): void => {
    const t = stage.time
    pose.kind = c.kind
    pose.t = t
    pose.seed = c.seed
    pose.mood = moodOf(c)
    pose.lookX = c.lookX * c.face
    pose.lookY = c.lookY
    pose.blink = blinkAt(t, c.seed)
    pose.dangle = c.dangle
    pose.kick = c.kickAmt
    pose.air = c.airAmt
    pose.sit = c.sitAmt
    pose.arms = c.armsAmt
    pose.mud = c.mud
    pose.soot = c.soot
    pose.crown = c.crown
    pose.cone = c.cone
    pose.puff = c.puff
    pose.trick = c.trick
    pose.sway = clamp(c.sway.value, -1.2, 1.2) * c.face
    // Breathing, so nobody is ever a statue.
    const s = c.stretch.value * (1 + Math.sin(t * 2.6 + c.seed) * 0.012)
    const sx = 1 / Math.sqrt(Math.max(0.2, s))
    g.save()
    if (c.state === 'held') {
      g.translate(c.hx, c.hy)
      g.rotate(c.lean.value)
      g.translate(0, grabOf(c.kind, c.dangle) * s)
    } else {
      g.translate(c.px, c.py)
      const rot = c.rot + actWobble(c)
      if (rot !== 0) {
        const cy = c.state === 'air' ? c.spec.cy : 0
        g.translate(0, -cy)
        g.rotate(rot)
        g.translate(0, cy)
      }
    }
    g.scale(c.face * sx * (1 + 0.45 * c.flat), s * (1 - 0.7 * c.flat))
    drawChar(g, pose)
    g.restore()
    if (c.asleep) {
      for (let i = 0; i < 3; i++) {
        const u = (t * 0.45 + i / 3) % 1
        g.globalAlpha = Math.sin(u * Math.PI)
        label(g, 'z', c.px + 34 + u * 46 + Math.sin(u * 9) * 6, c.py - 118 - u * 70, 20 + i * 6, '#ffffff', 'rgba(60,60,110,0.8)')
      }
      g.globalAlpha = 1
    }
  }

  const drawWithRiders = (g: CanvasRenderingContext2D, c: Char): void => {
    drawOne(g, c)
    for (const o of chars) if (o.state === 'ride' && o.host === c) drawWithRiders(g, o)
  }

  const drawBunting = (g: CanvasRenderingContext2D): void => {
    const t = stage.time
    g.beginPath()
    g.moveTo(-10, 16)
    for (let x = 0; x <= W; x += 59) g.lineTo(x, ropeY(x))
    g.lineTo(W + 10, 16)
    g.strokeStyle = '#ffffff'
    g.lineWidth = 4
    g.stroke()
    for (let i = 0; i < stickers.length; i++) {
      const s = stickers[i]!
      const x = flagX(i)
      const y = ropeY(x)
      g.save()
      g.translate(x, y)
      g.rotate(Math.sin(t * 1.8 + i * 0.9) * 0.07 + s.wob.value * 0.12)
      if (s.shown) {
        const k = s.pop.value
        g.beginPath()
        g.moveTo(0, 0)
        g.lineTo(0, 8)
        g.strokeStyle = '#ffffff'
        g.lineWidth = 3
        g.stroke()
        g.beginPath()
        g.arc(0, 31, 24 * k, 0, TAU)
        g.fillStyle = '#ffffff'
        g.fill()
        g.lineWidth = 4
        g.strokeStyle = FLAG_COLS[i % FLAG_COLS.length]!
        g.stroke()
        sprite(g, s.emoji, 0, 31, 31 * k)
      } else {
        g.beginPath()
        g.moveTo(-19, 1)
        g.lineTo(19, 1)
        g.lineTo(0, 40)
        g.closePath()
        g.fillStyle = FLAG_COLS[i % FLAG_COLS.length]!
        g.fill()
        g.lineWidth = 2.5
        g.strokeStyle = 'rgba(255,255,255,0.9)'
        g.stroke()
      }
      g.restore()
    }
  }

  const drawSky = (g: CanvasRenderingContext2D): void => {
    const t = stage.time
    // Sun with a face.
    const r = SUN.r * sun.pop.value
    g.save()
    g.translate(SUN.x, SUN.y)
    g.save()
    g.rotate(sun.spin)
    g.strokeStyle = '#ffd23f'
    g.lineWidth = 9
    g.beginPath()
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU
      g.moveTo(Math.cos(a) * (r + 12), Math.sin(a) * (r + 12))
      g.lineTo(Math.cos(a) * (r + 28), Math.sin(a) * (r + 28))
    }
    g.stroke()
    g.restore()
    g.beginPath()
    g.arc(0, 0, r, 0, TAU)
    g.fillStyle = '#ffe14d'
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = '#e8a800'
    g.stroke()
    g.strokeStyle = '#8a5a00'
    g.fillStyle = '#8a5a00'
    g.lineWidth = 4
    const wink = t < sun.winkUntil
    g.beginPath()
    g.arc(-15, -6, 5, 0, TAU)
    g.fill()
    g.beginPath()
    if (wink) g.arc(15, -4, 7, Math.PI * 1.1, Math.PI * 1.9)
    else g.arc(15, -6, 5, 0, TAU)
    if (wink) g.stroke()
    else g.fill()
    g.beginPath()
    g.arc(0, 4, 17, Math.PI * 0.15, Math.PI * 0.85)
    g.stroke()
    g.restore()
    // Clouds.
    for (const c of clouds) {
      const k = c.squash.value
      g.fillStyle = '#ffffff'
      g.beginPath()
      g.ellipse(c.x, c.y + 8 * c.s, 78 * c.s / k, 26 * c.s * k, 0, 0, TAU)
      g.ellipse(c.x - 34 * c.s, c.y - 6 * c.s, 34 * c.s, 28 * c.s * k, 0, 0, TAU)
      g.ellipse(c.x + 10 * c.s, c.y - 20 * c.s * k, 42 * c.s, 34 * c.s * k, 0, 0, TAU)
      g.ellipse(c.x + 46 * c.s, c.y - 2 * c.s, 30 * c.s, 24 * c.s * k, 0, 0, TAU)
      g.fill()
    }
  }

  const drawGlass = (g: CanvasRenderingContext2D): void => {
    const t = stage.time
    for (const s of glass) {
      const age = t - s.t0
      g.globalAlpha = clamp((3.2 - age) / 0.9, 0, 1)
      const y = s.y + age * 16
      g.fillStyle = '#6b4423'
      g.beginPath()
      g.arc(s.x, y, s.r, 0, TAU)
      g.arc(s.x - s.r * 0.7, y + s.r * 0.3, s.r * 0.6, 0, TAU)
      g.arc(s.x + s.r * 0.75, y - s.r * 0.2, s.r * 0.55, 0, TAU)
      g.arc(s.x + s.r * 0.2, y - s.r * 0.75, s.r * 0.5, 0, TAU)
      g.fill()
      for (let i = 0; i < 4; i++) {
        const dx = (i - 1.5) * s.r * 0.5
        const len = s.r * (0.9 + i * 0.25) + age * (30 + i * 12)
        g.beginPath()
        g.roundRect(s.x + dx - 9, y, 18, len, 9)
        g.fill()
      }
      g.fillStyle = '#8b5e34'
      g.beginPath()
      g.arc(s.x - s.r * 0.3, y - s.r * 0.3, s.r * 0.3, 0, TAU)
      g.fill()
    }
    g.globalAlpha = 1
  }

  // A soft ring and a bobbing arrow: "you can put them here".
  const beckon = (g: CanvasRenderingContext2D, x: number, y: number, i: number): void => {
    const t = stage.time
    const k = (t * 1.2 + i * 0.37) % 1
    g.lineWidth = 5
    g.strokeStyle = `rgba(255,255,255,${(0.75 * (1 - k)).toFixed(2)})`
    g.beginPath()
    g.ellipse(x, y + 26, 30 + k * 26, (30 + k * 26) * 0.42, 0, 0, TAU)
    g.stroke()
    const by = y - 46 + Math.sin(t * 7 + i) * 8
    g.beginPath()
    g.moveTo(x - 22, by - 15)
    g.lineTo(x + 22, by - 15)
    g.lineTo(x, by + 15)
    g.closePath()
    g.lineJoin = 'round'
    g.fillStyle = '#ffffff'
    g.fill()
    g.lineWidth = 4
    g.strokeStyle = 'rgba(75,42,74,0.55)'
    g.stroke()
  }

  const sorted: Char[] = []

  const draw = (g: CanvasRenderingContext2D): void => {
    const t = stage.time
    g.drawImage(back, 0, 0, back.width, back.height, 0, 0, W, H)
    drawSky(g)
    drawBunting(g)

    // Butterfly.
    sprite(g, '🦋', butterfly.x, butterfly.y, 38, Math.sin(t * 2) * 0.3, 0.35 + Math.abs(Math.sin(t * 13)) * 0.65, 1)

    // Mud bubbles and ripples.
    if (mudRipple > 0.02) {
      g.strokeStyle = `rgba(167,120,63,${(mudRipple * 0.9).toFixed(2)})`
      g.lineWidth = 5
      g.beginPath()
      g.ellipse(MUD.x, MUD.y, MUD.rx * (1.02 - mudRipple * 0.5), MUD.ry * (1.02 - mudRipple * 0.5), 0, 0, TAU)
      g.stroke()
    }
    const bub = (t * 0.5) % 1
    g.fillStyle = '#8b5e34'
    g.beginPath()
    g.arc(MUD.x + 70, MUD.y - 10, 3 + bub * 7, 0, TAU)
    g.arc(MUD.x - 80, MUD.y + 14, 3 + ((bub + 0.5) % 1) * 6, 0, TAU)
    g.fill()

    // Growing flowers.
    for (const sp of sprouts) sprite(g, sp.emoji, sp.x, sp.y - 15 * sp.k, 34 * sp.k)

    // The swing and whoever is on it; whoever is on the slide.
    drawSwing(g, swing.ang)
    for (const c of chars) if (c.state === 'swing' || c.state === 'slide') drawWithRiders(g, c)

    // Everyone and everything standing on the grass, back to front.
    sorted.length = 0
    for (const c of chars) {
      if (c.state === 'idle' || c.state === 'air' || c.state === 'walk' || c.state === 'hop') sorted.push(c)
    }
    sorted.sort((a, b) => a.gy - b.gy)
    let cartDone = !cart.called
    let seesawDone = false
    let trampDone = false
    let waterDone = false
    const fixed = (upTo: number): void => {
      // The spray falls in front of whoever stands in it.
      if (!waterDone && upTo >= SPRINK.y + 70) {
        waterDone = true
        drawWater(g, t, gush)
      }
      if (!cartDone && upTo >= CART.gy) {
        cartDone = true
        drawCart(g, cart.x, cart.ring.value)
        for (const cone of cones) {
          if (cone.state !== 'cart') continue
          const [cx, cy] = slotPos(cone.slot)
          sprite(g, '🍦', cx, cy + Math.sin(t * 3 + cone.slot) * 3, 66 * cone.pop)
        }
      }
      if (!seesawDone && upTo >= SEESAW.gy) {
        seesawDone = true
        drawSeesaw(g, seesaw.tilt)
        for (const c of chars) if (c.state === 'seesaw') drawWithRiders(g, c)
      }
      if (!trampDone && upTo >= TRAMP.gy) {
        trampDone = true
        drawTramp(g, tramp.sag.value)
      }
    }
    for (const c of sorted) {
      fixed(c.onTramp ? TRAMP.gy : c.gy)
      if (!c.onTramp && c.state !== 'hop') shadow(g, c.x, c.gy + 3, c.spec.small ? 40 : 50, clamp(1 - c.h / 520, 0.3, 1))
      drawWithRiders(g, c)
    }
    fixed(9999)

    // While someone is in a hand, every place they can be dropped beckons.
    let holding = false
    for (const c of chars) if (c.state === 'held') holding = true
    if (holding) {
      for (let i = 0; i < 2; i++) {
        if (seesaw.occ[i]) continue
        const [ex, ey] = seatPos(i, seesaw.tilt)
        beckon(g, ex, ey - 26, i)
      }
      if (!swing.occ) {
        const [sx, sy] = swingSeat(swing.ang)
        beckon(g, sx, sy - 26, 2)
      }
      const [tx, ty] = slidePoint(0)
      beckon(g, tx - 18, ty - 30, 3)
      beckon(g, TRAMP.x, TRAMP.gy - TRAMP.top - 30, 4)
      beckon(g, MUD.x, MUD.y - 24, 5)
      beckon(g, SPRINK.x, SPRINK.y - 70, 6)
    }

    // Whoever is in a hand is on top of everything.
    for (const c of chars) {
      if (c.state !== 'held') continue
      shadow(g, c.px, clamp(c.py + 34, BAND_TOP, BAND_BOT + 20), c.spec.small ? 36 : 46, 0.7, 0.16)
      drawWithRiders(g, c)
    }

    // The frog's tongue.
    if (t < tongue.until && tongue.from && tongue.to) {
      const a = tongue.from
      const b = tongue.to
      const k = Math.sin(((tongue.until - t) / 0.24) * Math.PI)
      const ax = a.px
      const ay = a.py - 58
      const bx = lerp(ax, b.px, k)
      const by = lerp(ay, b.py - b.spec.cy - 20, k)
      g.lineCap = 'round'
      g.beginPath()
      g.moveTo(ax, ay)
      g.lineTo(bx, by)
      g.strokeStyle = OUT
      g.lineWidth = 15
      g.stroke()
      g.strokeStyle = '#ff6f91'
      g.lineWidth = 9
      g.stroke()
      g.beginPath()
      g.arc(bx, by, 11, 0, TAU)
      g.fillStyle = '#ff6f91'
      g.fill()
      g.lineWidth = 3
      g.strokeStyle = OUT
      g.stroke()
    }

    // Things in the air: crowns, mud, stickers on their way up.
    for (const fl of flyers) {
      if (fl.kind === 'crown') drawCrown(g, fl.x, fl.y + 10, 48, 31, fl.rot)
      else if (fl.kind === 'mud') {
        g.fillStyle = '#6b4423'
        g.beginPath()
        g.arc(fl.x, fl.y, 15 * fl.s, 0, TAU)
        g.arc(fl.x + Math.cos(fl.rot) * 10 * fl.s, fl.y + Math.sin(fl.rot) * 10 * fl.s, 9 * fl.s, 0, TAU)
        g.fill()
        g.fillStyle = '#8b5e34'
        g.beginPath()
        g.arc(fl.x - 4 * fl.s, fl.y - 5 * fl.s, 5 * fl.s, 0, TAU)
        g.fill()
      } else if (fl.s > 0.02) sprite(g, fl.emoji, fl.x, fl.y, 34 * fl.s, fl.rot)
    }
    for (const cone of cones) if (cone.state === 'held') sprite(g, '🍦', cone.x, cone.y, 80, Math.sin(t * 9) * 0.1)

    drawGlass(g)

    // Idle hint: show the drag that starts it all, then just who to pick up.
    if (t - lastTouch > 5 && t > 5 && holds.size === 0) {
      const p = chars[0]!
      if (found === 0 && p.state === 'idle' && seesaw.occ[0] && !seesaw.occ[1]) {
        const u = (t % 2.4) / 2.4
        const k = ease.inOutQuad(clamp((u - 0.2) / 0.55, 0, 1))
        const [ex, ey] = seatPos(1, seesaw.tilt)
        hint(g, lerp(p.px, ex, k), lerp(p.py - 110, ey - 50, k), t, 46)
      } else if (t - lastTouch > 8 && p.state !== 'air' && p.state !== 'held') hint(g, p.px, p.py - 100, t, 50)
    }
  }

  return {
    update(dt) {
      const t = stage.time
      // A press that stays down becomes a pick-up even if the finger is still.
      for (const [id, hold] of holds) {
        if (hold.drag || t - hold.t0 < 0.38) continue
        const p = stage.pointers.get(id)
        if (p) startDrag(hold, p)
      }
      for (const [id, cone] of coneHolds) {
        const p = stage.pointers.get(id)
        if (!p) continue
        cone.x = p.x
        cone.y = p.y - 26
      }

      // Seesaw plank.
      seesaw.vel += (300 * (seesaw.target - seesaw.tilt) - 16 * seesaw.vel) * dt
      seesaw.tilt += seesaw.vel * dt
      if (Math.abs(seesaw.tilt) > SEESAW.max) {
        seesaw.tilt = Math.sign(seesaw.tilt) * SEESAW.max
        seesaw.vel *= -0.35
      }

      // Swing: a pendulum that an occupant keeps going.
      swing.vel += (-15.4 * Math.sin(swing.ang) - (swing.occ ? 0.1 : 0.45) * swing.vel) * dt
      const rider = swing.occ && swing.occ.state === 'swing' ? swing.occ : null
      if (rider) {
        const amp = Math.abs(swing.ang) + Math.abs(swing.vel) / 3.9
        if (amp < 0.32) swing.vel += (swing.vel >= 0 ? 1 : -1) * 0.9 * dt
        if (swing.armed && Math.abs(swing.ang) < 0.12 && swing.vel > 0) swing.vel = Math.max(swing.vel, 3.7)
        if (t > swing.autoAt) pushSwing()
      }
      swing.ang = clamp(swing.ang + swing.vel * dt, -1.12, 1.12)
      if (Math.abs(swing.ang) >= 1.12) swing.vel = 0
      if (rider && swing.armed && swing.ang > 0.5 && swing.vel > 0.3) leapOffSwing(rider)

      tramp.sag.update(dt)
      cart.ring.update(dt)
      gush = Math.max(0, gush - dt * 0.6)
      mudRipple = Math.max(0, mudRipple - dt * 1.6)
      if (t > bubbleAt && t - lastTouch < 10) {
        bubbleAt = t + rnd(3, 6)
        voice.blup()
      }
      sun.spin += sun.vel * dt
      sun.vel = damp(sun.vel, 0.2, 2, dt)
      sun.pop.update(dt)
      for (const c of clouds) {
        c.x += c.v * dt
        if (c.x > W + 120) c.x = -120
        c.squash.update(dt)
      }
      const bt = t * 0.55 + butterfly.off
      const dart = t < butterfly.dartUntil ? 3 : 1
      butterfly.x = damp(butterfly.x, 600 + Math.sin(bt * 0.6) * 430 + Math.sin(bt * 3.1) * 30, 2 * dart, dt)
      butterfly.y = damp(butterfly.y, 400 + Math.sin(bt * 0.9) * 90 + Math.sin(bt * 4.3) * 18, 2 * dart, dt)
      for (const s of stickers) {
        s.pop.update(dt)
        s.wob.update(dt)
      }
      for (let i = glass.length - 1; i >= 0; i--) if (t - glass[i]!.t0 > 3.2) glass.splice(i, 1)

      for (const c of chars) if (c.state !== 'ride') updateChar(c, dt)
      // Two standing on the same spot shuffle apart.
      for (let i = 0; i < chars.length; i++) {
        const a = chars[i]!
        if (a.state !== 'idle') continue
        for (let j = i + 1; j < chars.length; j++) {
          const b = chars[j]!
          if (b.state !== 'idle' || b.onTramp !== a.onTramp) continue
          const dx = b.x - a.x
          if (Math.abs(dx) > 78 || Math.abs(b.gy - a.gy) > 30) continue
          const push = (dx >= 0 ? 1 : -1) * 70 * dt
          const lo = a.onTramp ? TRAMP.x - 72 : 45
          const hi = a.onTramp ? TRAMP.x + 72 : W - 45
          a.x = clamp(a.x - push, lo, hi)
          b.x = clamp(b.x + push, lo, hi)
        }
      }
      for (let pass = 0; pass < 3; pass++) for (const c of chars) if (c.state === 'ride') updateRide(c)
      for (const c of chars) updateBody(c, dt)
      director(dt)
    },
    draw,
    down(p) {
      const t = stage.time
      lastTouch = t
      everTouched = true
      for (const cone of cones) {
        if (cone.state !== 'cart' || cone.pop < 0.6) continue
        const [cx, cy] = slotPos(cone.slot)
        if (dist(p.x, p.y, cx, cy) < 52) {
          cone.state = 'held'
          cone.heldBy = p.id
          cone.x = p.x
          cone.y = p.y - 26
          coneHolds.set(p.id, cone)
          sfx.pop(3)
          cart.ring.kick(3)
          return
        }
      }
      const c = pickChar(p.x, p.y)
      if (c) {
        // The touch lands at once: a squash, a squeak, a ring.
        holds.set(p.id, { c, t0: t, drag: false })
        c.stretch.value = Math.min(c.stretch.value, 0.82)
        voice.squeak(c.spec.pitch)
        fx.ring(p.x, p.y, '#ffffff', 46, 0.25)
        wake(c)
        watch(c, 1.5)
        return
      }
      tapWorld(p.x, p.y)
    },
    move(p) {
      lastTouch = stage.time
      const hold = holds.get(p.id)
      if (hold && !hold.drag && dist(p.x, p.y, p.startX, p.startY) > 22) startDrag(hold, p)
    },
    up(p) {
      lastTouch = stage.time
      const cone = coneHolds.get(p.id)
      if (cone) {
        coneHolds.delete(p.id)
        dropCone(cone, p.x, p.y)
        return
      }
      const hold = holds.get(p.id)
      if (!hold) return
      holds.delete(p.id)
      const c = hold.c
      if (!hold.drag) mischief(c)
      else if (c.state === 'held' && c.heldBy === p.id) release(c, p)
    },
  }
}

export const proto: Proto = {
  meta: {
    key: 'princess-playground',
    name: 'Princess Playground',
    emoji: '👸',
    ages: [3, 6],
    pitch: 'A cheeky princess, her cat and their friends at the playground: pick anyone up, drop them on anything, tap them for mischief.',
    howTo: 'Drag anyone onto the seesaw, slide, swing, trampoline, mud or sprinkler. Tap them for mischief.',
    basedOn: "the owner's four-year-old's own idea; dollhouse play like Toca Boca World, Bluey: Let's Play and Sago Mini",
    whyFun: 'Dollhouse play with mess and slapstick: every pick-up, drop and splat gets a face and a sound, and the cat is the bewildered, never hurt, victim.',
  },
  create,
}
