// Boo-Boo Vet: a sad animal sits in the middle with its problems drawn big.
// Drag a tool from the tray onto it. The right tool fixes the problem with a
// little show; any other tool does something silly and the animal giggles.
// When everything is fixed it leaps, dances, hugs a heart and trots off, its
// photo goes up on the wall, and the next patient hops in.

import { blinkAt, circle, ellipse, heart, rrect, shadow, sprite, star } from '../../kit/draw.ts'
import { TAU, clamp, damp, dist, ease, lerp, rnd, shuffle, spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { H, W } from '../../kit/types.ts'
import type { Game, Pointer, Proto, Stage } from '../../kit/types.ts'
import { HEAD_Y, SPECIES, drawAnimal, drawHead, mix } from './animal.ts'
import type { FaceMood, Pose, Species } from './animal.ts'
import { BLANKET, drawThorn, drawTool } from './tools.ts'
import type { ToolKind } from './tools.ts'

const CX = W / 2
const BASE_Y = 592
const S = 1.06
const TRAY_Y = 700
const TOOL_SIZE = 118
const APPROACH = 0.16
const PHOTO_X = [372, 458, 728, 814, 900, 986, 1072]

type ProbKind = 'thorn' | 'mud' | 'bump' | 'nose' | 'scrape' | 'cold' | 'hiccup' | 'spots'

const FIXER: Record<ProbKind, ToolKind> = {
  thorn: 'tweezers',
  mud: 'sponge',
  bump: 'ice',
  nose: 'tissue',
  scrape: 'plaster',
  cold: 'blanket',
  hiccup: 'spoon',
  spots: 'spoon',
}
const ALL_TOOLS: ToolKind[] = ['tweezers', 'plaster', 'ice', 'sponge', 'tissue', 'spoon', 'blanket']
const ALL_PROBS: ProbKind[] = ['thorn', 'mud', 'bump', 'nose', 'scrape', 'cold', 'hiccup', 'spots']
// The first patients introduce one new problem each; after that, random pairs.
const SCRIPT: ProbKind[][] = [['thorn'], ['mud'], ['bump', 'nose'], ['cold', 'scrape'], ['hiccup', 'thorn'], ['spots', 'bump']]
const CAST = ['bunny', 'bear', 'cat', 'pig', 'dog', 'unicorn', 'panda', 'lion']
const CLASH: [ProbKind, ProbKind][] = [['spots', 'mud'], ['hiccup', 'nose'], ['hiccup', 'spots'], ['spots', 'scrape']]

interface Mark {
  x: number
  y: number
  head: boolean
  // 1 full size, 0 gone.
  s: number
  seed: number
}

interface Problem {
  kind: ProbKind
  // Where it is, in head or body space.
  x: number
  y: number
  head: boolean
  side: number
  // How close a tool must come to snap on.
  reach: number
  // 1 untouched, 0 healed: drives the drawing while a tool works.
  hp: number
  fixed: boolean
  busy: boolean
  marks: Mark[]
  popping: boolean
  popT: number
}

interface Sticker {
  x: number
  y: number
  head: boolean
  rot: number
  born: number
}

interface Foam {
  x: number
  y: number
  head: boolean
  born: number
}

interface Patient {
  sp: Species
  x: number
  phase: 'enter' | 'sit' | 'cheer' | 'exit'
  t: number
  step: number
  problems: Problem[]
  stretch: Spring
  tilt: Spring
  jolt: Spring
  wrap: Spring
  cover: Spring
  happy: number
  moodOver: FaceMood
  moodUntil: number
  lookX: number
  lookY: number
  lift: number
  vy: number
  air: boolean
  raise: number
  raiseTo: number
  hug: number
  hugTo: number
  heart: number
  chill: number
  stickers: Sticker[]
  foam: Foam[]
  hicT: number
  seed: number
  pets: number
  lastPetAt: number
}

interface Tool {
  kind: ToolKind
  homeX: number
  x: number
  y: number
  state: 'tray' | 'held' | 'dropped' | 'job' | 'return'
  t: number
  // Appears with an overshoot; negative is a delay.
  pop: number
  leaving: boolean
  size: Spring
  hop: Spring
  rot: number
  grip: number
  hidden: boolean
  carry: boolean
  slot: number
}

interface Job {
  tool: Tool
  who: Patient
  prob: Problem | null
  t: number
  sx: number
  sy: number
  tx: number
  ty: number
  // Drop point in body space, for silly uses.
  lx: number
  ly: number
  step: number
  acc: number
  released: boolean
  done: boolean
}

interface Debris {
  x: number
  y: number
  vx: number
  vy: number
  rot: number
  spin: number
  floor: number
  rest: number
}

interface Photo {
  img: HTMLCanvasElement
  slot: number
  fromX: number
  fromY: number
  fly: number
}

interface Toy {
  char: string
  x: number
  y: number
  size: number
  s: Spring
}

function create(stage: Stage): Game {
  const { fx, sfx } = stage

  // ---------------------------------------------------------------- backdrop
  const bg = document.createElement('canvas')
  bg.width = W * 2
  bg.height = H * 2
  paintRoom(bg)

  const toys: Toy[] = [
    { char: '🧸', x: 925, y: 318, size: 92, s: spring(1, 260, 9) },
    { char: '🪴', x: 1015, y: 314, size: 96, s: spring(1, 260, 9) },
    { char: '🍭', x: 1095, y: 318, size: 84, s: spring(1, 260, 9) },
  ]
  const sun = spring(0, 60, 7)

  // ------------------------------------------------------------------- state
  let patient: Patient
  const leaving: Patient[] = []
  const tools: Tool[] = []
  const jobs: Job[] = []
  const debris: Debris[] = []
  const photos: Photo[] = []
  let cured = 0
  let count = 0
  let lastSpecies = ''
  let grab: { id: number; tool: Tool; moved: number; tx: number; ty: number; tickle: number; trail: number } | null = null
  let lastTouchAt = 0
  let lastPointAt = -10
  let pointX = CX
  let pointY = 300
  let fixStreak = 0
  let rub = 0
  let rubTotal = 0

  // --------------------------------------------------------------- geometry
  const bodyXY = (p: Patient, lx: number, ly: number): [number, number] => [p.x + lx * S, BASE_Y + ly * S]
  const spot = (p: Patient, x: number, y: number, head: boolean): [number, number] => bodyXY(p, x, head ? y + HEAD_Y : y)
  const anchor = (p: Patient, q: Problem): [number, number] => spot(p, q.x, q.y, q.head)
  const overAnimal = (p: Patient, x: number, y: number): boolean => {
    const lx = (x - p.x) / S
    const ly = (y - BASE_Y) / S
    if ((lx / 185) ** 2 + ((ly + 120) / 165) ** 2 < 1) return true
    if ((lx / 195) ** 2 + ((ly - HEAD_Y) / 170) ** 2 < 1) return true
    return Math.abs(lx) < 130 && ly < HEAD_Y && ly > HEAD_Y - 230
  }
  const open = (p: Patient): Problem[] => p.problems.filter((q) => !q.fixed)
  const has = (p: Patient, kind: ProbKind): Problem | undefined => p.problems.find((q) => q.kind === kind && !q.fixed)

  // ---------------------------------------------------------------- patients
  function makeProblem(kind: ProbKind): Problem {
    const q: Problem = { kind, x: 0, y: 0, head: false, side: stage.rand() < 0.5 ? -1 : 1, reach: 100, hp: 1, fixed: false, busy: false, marks: [], popping: false, popT: 0 }
    if (kind === 'thorn') {
      q.x = q.side * 106
      q.y = -76
    } else if (kind === 'mud') {
      q.x = 30
      q.y = -118
      q.reach = 160
      q.marks = [
        { x: 30, y: -118, head: false, s: 1, seed: 1.3 },
        { x: -84, y: 34, head: true, s: 1, seed: 2.9 },
        { x: 66, y: -70, head: true, s: 1, seed: 4.1 },
        { x: -62, y: -52, head: false, s: 1, seed: 5.6 },
      ]
    } else if (kind === 'bump') {
      q.head = true
      q.x = q.side * 58
      q.y = -104
    } else if (kind === 'nose') {
      q.head = true
      q.x = 0
      q.y = 30
    } else if (kind === 'scrape') {
      const at = Math.floor(stage.rand() * 3)
      if (at === 0) {
        q.head = true
        q.x = -q.side * 74
        q.y = -70
      } else {
        q.x = at === 1 ? -58 : 60
        q.y = at === 1 ? -170 : -150
      }
    } else if (kind === 'cold') {
      q.x = 0
      q.y = -150
      q.reach = 175
    } else if (kind === 'hiccup') {
      q.head = true
      q.x = 0
      q.y = 56
      q.reach = 110
    } else {
      q.x = 0
      q.y = -190
      q.reach = 175
      const at: [number, number, boolean][] = [[-88, -58, true], [-20, -84, true], [70, -66, true], [104, 50, true], [-104, 62, true], [-40, -150, false], [36, -176, false], [50, -96, false], [-22, -84, false], [4, -130, false]]
      q.marks = at.map(([x, y, head], i) => ({ x, y, head, s: 1, seed: i * 1.7 }))
    }
    return q
  }

  function pickProblems(n: number): ProbKind[] {
    if (n < SCRIPT.length) return SCRIPT[n]!
    const want = n >= 8 && stage.rand() < 0.3 ? 3 : 2
    for (let tries = 0; tries < 40; tries++) {
      const set = shuffle(ALL_PROBS, stage.rand).slice(0, want)
      const toolsUsed = new Set(set.map((k) => FIXER[k]))
      if (toolsUsed.size < set.length) continue
      if (CLASH.some(([a, b]) => set.includes(a) && set.includes(b))) continue
      return set
    }
    return ['thorn', 'bump']
  }

  function pickSpecies(n: number): Species {
    let key = CAST[n]
    if (!key) {
      const pool = CAST.filter((k) => k !== lastSpecies)
      key = pool[Math.floor(stage.rand() * pool.length)]!
    }
    lastSpecies = key
    return SPECIES[key]!
  }

  function newPatient(first: boolean): void {
    const n = count++
    const kinds = pickProblems(n)
    patient = {
      sp: pickSpecies(n),
      x: first ? CX : -240,
      phase: first ? 'sit' : 'enter',
      t: 0,
      step: 0,
      problems: kinds.map(makeProblem),
      stretch: spring(1, 230, 11),
      tilt: spring(0, 140, 9),
      jolt: spring(0, 300, 14),
      wrap: spring(0, 210, 17),
      cover: spring(0, 260, 18),
      happy: 0,
      moodOver: 'sad',
      moodUntil: -1,
      lookX: 0,
      lookY: 0,
      lift: 0,
      vy: 0,
      air: false,
      raise: 0,
      raiseTo: 0,
      hug: 0,
      hugTo: 0,
      heart: 0,
      chill: 0,
      stickers: [],
      foam: [],
      hicT: 1.2,
      seed: n * 2.3 + 0.4,
      pets: 0,
      lastPetAt: -10,
    }
    fixStreak = 0
    // The tray: what this patient needs, padded out with other tools.
    const need = [...new Set(kinds.map((k) => FIXER[k]))]
    const size = n < 2 ? 4 : 5
    const prefer: ToolKind[] = n === 0 ? ['plaster', 'sponge', 'ice'] : shuffle(ALL_TOOLS, stage.rand)
    for (const k of prefer) if (need.length < size && !need.includes(k)) need.push(k)
    setTray(shuffle(need, stage.rand))
  }

  function setTray(kinds: ToolKind[]): void {
    for (const tool of tools) if (!kinds.includes(tool.kind)) tool.leaving = true
    const span = 172
    kinds.forEach((kind, i) => {
      const homeX = CX + (i - (kinds.length - 1) / 2) * span
      const old = tools.find((tool) => tool.kind === kind && !tool.leaving)
      if (old) {
        old.homeX = homeX
        old.slot = i
        return
      }
      tools.push({ kind, homeX, x: homeX, y: TRAY_Y, state: 'tray', t: 0, pop: -0.12 - i * 0.07, leaving: false, size: spring(1, 260, 12), hop: spring(0, 240, 9), rot: 0, grip: 0, hidden: false, carry: false, slot: i })
    })
  }

  function setMood(p: Patient, mood: FaceMood, seconds: number): void {
    p.moodOver = mood
    p.moodUntil = stage.time + seconds
  }

  function moodOf(p: Patient): FaceMood {
    if (stage.time < p.moodUntil) return p.moodOver
    const left = open(p).length
    if (left === 0 || p.phase === 'cheer' || p.phase === 'exit') return 'joy'
    if (has(p, 'cold') || p.chill > 0.3) return 'chatter'
    return left < p.problems.length ? 'meh' : 'sad'
  }

  function giggle(p: Patient): void {
    setMood(p, 'giggle', 0.9)
    p.stretch.kick(-2.4)
    p.tilt.kick(rnd(-1, 1) > 0 ? 2.2 : -2.2)
    const base = rnd(620, 720)
    for (let i = 0; i < 5; i++) sfx.tone({ freq: base + (i % 2) * 190 + i * 35, dur: 0.075, type: 'triangle', vol: 0.17, delay: i * 0.085 })
    const [hx, hy] = bodyXY(p, 0, HEAD_Y)
    fx.burst(hx, hy - 60, { count: 6, color: ['#ffe14d', '#ff9ad5', '#ffffff'], shape: 'star', speed: 320, life: 0.6, size: 14, angle: -Math.PI / 2, spread: 2.4, gravity: 500 })
  }

  function whimper(): void {
    sfx.tone({ freq: rnd(500, 560), to: 360, dur: 0.28, type: 'sine', vol: 0.14 })
  }

  function jump(p: Patient, speed: number): void {
    p.vy = speed
    p.air = true
    p.lift = 1
  }

  // The tool that would help right now hops on the tray: the wordless nudge.
  function nudge(p: Patient, q?: Problem): void {
    const target = q ?? open(p).find((o) => !o.busy)
    if (!target) return
    const tool = tools.find((k) => k.kind === FIXER[target.kind] && !k.leaving && k.state === 'tray')
    if (!tool) return
    tool.hop.kick(-620)
    tool.size.kick(3)
    fx.ring(tool.x, TRAY_Y, '#fff3a0', 80, 0.45)
    sfx.tick()
  }

  function healed(p: Patient, q: Problem): void {
    if (q.fixed) return
    q.fixed = true
    q.busy = false
    q.hp = 0
    const [x, y] = anchor(p, q)
    fx.burst(x, y, { count: 16, color: ['#ffe14d', '#ffffff', '#ff9ad5'], shape: 'star', speed: 420, life: 0.8, size: 16 })
    fx.ring(x, y, '#ffffff', 120, 0.4)
    sfx.ding(fixStreak * 2)
    fixStreak++
    p.stretch.kick(3)
    if (open(p).length > 0) {
      setMood(p, 'joy', 0.9)
      sfx.note(4, 0.12)
    }
  }

  // ------------------------------------------------------------------- jobs
  function startJob(tool: Tool, p: Patient, q: Problem | null, dropX: number, dropY: number): void {
    tool.state = 'job'
    tool.t = 0
    tool.size.target = 1.15
    let tx = dropX
    let ty = dropY
    if (q) {
      q.busy = true
      const [ax, ay] = anchor(p, q)
      tx = ax
      ty = ay
      if (q.kind === 'thorn') {
        tx = ax + q.side * 0.48 * 62 * S
        ty = ay - 0.88 * 62 * S
      } else if (q.kind === 'nose') ty = ay + 26
      else if (q.kind === 'hiccup' || q.kind === 'spots') {
        const [mx, my] = spot(p, 0, 56, true)
        tx = mx + 30
        ty = my + 30
      } else if (q.kind === 'bump') ty = ay - 14
    } else if (tool.kind === 'spoon') {
      const [mx, my] = spot(p, 0, 56, true)
      tx = mx + 30
      ty = my + 30
    } else if (tool.kind === 'tissue') {
      const [nx, ny] = spot(p, 0, 30, true)
      tx = nx
      ty = ny + 26
    } else if (tool.kind === 'blanket') {
      const [hx, hy] = spot(p, 0, 0, true)
      tx = hx
      ty = hy
    }
    jobs.push({ tool, who: p, prob: q, t: 0, sx: tool.x, sy: tool.y, tx, ty, lx: (dropX - p.x) / S, ly: (dropY - BASE_Y) / S, step: 0, acc: 0, released: false, done: false })
  }

  function release(j: Job): void {
    if (j.released) return
    j.released = true
    const tool = j.tool
    tool.state = 'return'
    tool.size.target = 1
    tool.hidden = false
    tool.carry = false
    tool.grip = 0
  }

  // A used plaster stays on the animal; a fresh one grows back on the tray.
  function regrow(j: Job): void {
    const tool = j.tool
    j.released = true
    tool.state = 'tray'
    tool.x = tool.homeX
    tool.y = TRAY_Y
    tool.pop = -0.15
    tool.size.target = 1
    tool.rot = 0
  }

  function addSticker(p: Patient, lx: number, ly: number): void {
    const head = ly < -190
    p.stickers.push({ x: lx, y: head ? ly - HEAD_Y : ly, head, rot: rnd(-0.7, 0.7), born: stage.time })
    if (p.stickers.length > 7) p.stickers.shift()
    sfx.thud(0.35)
    sfx.pop(Math.round(rnd(0, 3)))
    p.stretch.value = 0.92
  }

  function stepJob(j: Job, dt: number): void {
    j.t += dt
    const tool = j.tool
    const p = j.who
    const q = j.prob
    const e = ease.outCubic(clamp(j.t / APPROACH, 0, 1))
    const act = j.t - APPROACH
    const hit = (n: number, at: number): boolean => {
      if (j.step === n && act >= at) {
        j.step++
        return true
      }
      return false
    }
    let ox = 0
    let oy = 0
    let px = lerp(j.sx, j.tx, e)
    let py = lerp(j.sy, j.ty, e)
    j.acc += dt

    // The patient left mid-job (it cannot, but be safe).
    if (p !== patient && !leaving.includes(p)) {
      release(j)
      j.done = true
      return
    }

    if (q) {
      const [ax, ay] = anchor(p, q)
      if (tool.kind === 'tweezers') {
        tool.rot = lerp(tool.rot, q.side * 0.5, e)
        tool.grip = clamp(act / 0.16, 0, 1)
        if (hit(0, 0)) {
          setMood(p, 'wince', 0.3)
          sfx.tick()
        }
        if (hit(1, 0.24)) {
          q.hp = 0
          tool.carry = true
          sfx.pop(5)
          sfx.tone({ freq: 300, to: 900, dur: 0.12, type: 'square', vol: 0.12 })
          fx.burst(ax, ay, { count: 10, color: ['#ffffff', '#ffe14d'], speed: 360, life: 0.5, size: 10 })
          fx.shake(4, 0.2)
          p.stretch.kick(4)
          setMood(p, 'wow', 0.4)
        }
        if (act > 0.24) {
          const k = ease.outBack(clamp((act - 0.24) / 0.3, 0, 1))
          ox = q.side * 0.48 * 130 * k
          oy = -0.88 * 130 * k
        }
        if (hit(2, 0.62)) {
          debris.push({ x: px + ox, y: py + oy + 30, vx: q.side * rnd(260, 380), vy: -rnd(380, 520), rot: 0, spin: q.side * rnd(9, 14), floor: rnd(606, 628), rest: 0 })
          sfx.whoosh()
          healed(p, q)
          release(j)
          j.done = true
        }
      } else if (tool.kind === 'plaster') {
        tool.rot = lerp(tool.rot, 0.3, e)
        if (hit(0, 0.04)) {
          const head = q.head
          p.stickers.push({ x: q.x, y: q.y, head, rot: rnd(-0.5, 0.5), born: stage.time })
          sfx.thud(0.4)
          sfx.pop(3)
          p.stretch.value = 0.9
          healed(p, q)
          regrow(j)
          j.done = true
        }
      } else if (tool.kind === 'ice') {
        ox = Math.sin(act * 34) * 4
        tool.rot = Math.sin(act * 21) * 0.1
        q.hp = 1 - clamp(act / 0.85, 0, 1)
        if (hit(0, 0)) {
          sfx.noise({ dur: 0.85, freq: 6000, to: 1800, filter: 'highpass', vol: 0.1 })
          sfx.slideDown()
          setMood(p, 'wince', 0.35)
        }
        if (j.acc > 0.09) {
          j.acc = 0
          fx.burst(ax + rnd(-20, 20), ay, { count: 2, color: ['#d8f3ff', '#ffffff', '#9fd8ff'], speed: 170, life: 0.55, size: 8, angle: -Math.PI / 2, spread: 2.2, gravity: -60 })
        }
        if (hit(1, 0.9)) {
          healed(p, q)
          release(j)
          j.done = true
        }
      } else if (tool.kind === 'sponge') {
        const seg = 0.27
        const n = q.marks.length
        const i = Math.min(n - 1, Math.max(0, Math.floor(act / seg)))
        const u = clamp((act - i * seg) / seg, 0, 1)
        const mark = q.marks[i]!
        const [mx, my] = spot(p, mark.x, mark.y, mark.head)
        const prev = i > 0 ? q.marks[i - 1]! : null
        const [fromX, fromY] = prev ? spot(p, prev.x, prev.y, prev.head) : [px, py]
        const glide = ease.outCubic(clamp(u / 0.35, 0, 1))
        px = act < 0 ? px : lerp(fromX, mx, glide)
        py = act < 0 ? py : lerp(fromY, my, glide)
        if (act >= 0) {
          ox = Math.sin(act * 44) * 26
          tool.rot = Math.sin(act * 44) * 0.2
          mark.s = Math.min(mark.s, 1 - u)
          for (let b = 0; b < i; b++) {
            const before = q.marks[b]!
            if (before.s > 0) {
              before.s = 0
              sfx.pop(b + 1)
            }
          }
          if (j.acc > 0.06) {
            j.acc = 0
            fx.burst(px + ox, py, { count: 2, color: ['#ffffff', '#d2f3ff'], shape: 'ring', speed: 190, life: 0.7, size: 12, gravity: -260 })
            if (Math.random() < 0.6) sfx.tone({ freq: rnd(900, 1100), to: rnd(1300, 1600), dur: 0.06, type: 'sine', vol: 0.09 })
          }
          q.hp = 1 - act / (seg * n)
        }
        if (act >= seg * n) {
          for (const m of q.marks) m.s = 0
          sfx.pop(n + 1)
          healed(p, q)
          release(j)
          j.done = true
        }
      } else if (tool.kind === 'tissue') {
        if (hit(0, 0)) setMood(p, 'sneeze', 0.5)
        if (act > 0.1 && act < 0.45) ox = Math.sin(act * 52) * 6
        if (hit(1, 0.1)) {
          sfx.tone({ freq: 210, to: 150, dur: 0.38, type: 'sawtooth', vol: 0.2 })
          sfx.noise({ dur: 0.3, freq: 900, filter: 'bandpass', vol: 0.12 })
          fx.shake(6, 0.3)
          fx.text(ax + 90, ay - 40, 'HONK!', { color: '#ffffff', size: 46 })
          p.jolt.kick(260)
          q.hp = 0
        }
        if (hit(2, 0.5)) {
          healed(p, q)
          release(j)
          j.done = true
        }
      } else if (tool.kind === 'spoon') {
        if (hit(0, 0)) setMood(p, 'wow', 0.3)
        if (hit(1, 0.16)) {
          sfx.chomp()
          setMood(p, 'yum', 0.75)
          p.stretch.kick(3)
        }
        if (hit(2, 0.42)) {
          release(j)
          if (q.kind === 'spots') {
            q.popping = true
            j.done = true
          }
        }
        if (hit(3, 0.8)) {
          // The hiccups leave as one big silly burp.
          sfx.tone({ freq: 150, to: 70, dur: 0.4, type: 'sawtooth', vol: 0.22 })
          fx.text(ax + 170, ay - 40, 'BURP!', { color: '#c8ff8f', size: 62 })
          fx.burst(ax, ay, { count: 8, color: ['#c8ff8f', '#ffffff'], shape: 'ring', speed: 260, life: 0.7, size: 14, angle: -0.6, spread: 1.2, gravity: -150 })
          p.jolt.kick(-220)
          fx.shake(5, 0.25)
          healed(p, q)
          j.done = true
        }
      } else {
        // blanket
        if (hit(0, 0)) {
          p.wrap.target = 1
          tool.hidden = true
          sfx.whoosh()
          sfx.boing(-2)
        }
        q.hp = 1 - clamp((act - 0.1) / 0.8, 0, 1)
        if (act > 0 && j.acc > 0.13) {
          j.acc = 0
          fx.burst(ax + rnd(-90, 90), ay - 60, { count: 1, color: ['#ff7a9c', '#ffb3c7'], shape: 'heart', speed: 120, life: 0.9, size: 16, angle: -Math.PI / 2, spread: 0.8, gravity: -120 })
        }
        if (hit(1, 0.95)) healed(p, q)
        if (hit(2, 1.25)) {
          p.wrap.target = 0
          tool.x = ax
          tool.y = ay
          j.sx = j.tx = ax
          j.sy = j.ty = ay
          release(j)
          j.done = true
        }
      }
    } else {
      // Not what the doctor ordered: every tool has a harmless joke.
      if (tool.kind === 'plaster') {
        if (hit(0, 0.02)) {
          addSticker(p, j.lx, j.ly)
          giggle(p)
          regrow(j)
          j.done = true
        }
      } else if (tool.kind === 'tissue') {
        ox = Math.sin(act * 46) * 8
        if (hit(0, 0)) {
          setMood(p, 'sneeze', 0.55)
          p.jolt.target = -16
          sfx.tone({ freq: 380, to: 760, dur: 0.42, type: 'sine', vol: 0.13 })
        }
        if (hit(1, 0.5)) {
          p.jolt.target = 0
          p.jolt.kick(520)
          setMood(p, 'wow', 0.5)
          sfx.noise({ dur: 0.28, freq: 2600, to: 500, filter: 'bandpass', vol: 0.3 })
          sfx.tone({ freq: 700, to: 200, dur: 0.22, type: 'square', vol: 0.12 })
          fx.shake(9, 0.3)
          fx.text(j.tx + 110, j.ty - 70, 'ACHOO!', { color: '#ffffff', size: 54 })
          fx.burst(j.tx, j.ty, { count: 22, color: ['#ffffff', '#c9f0ff'], speed: 620, life: 0.6, size: 9, angle: Math.PI / 2, spread: 2.0, gravity: 500 })
          release(j)
          tool.hop.kick(-500)
          stage.after(0.5, () => giggle(p))
          j.done = true
        }
      } else if (tool.kind === 'ice') {
        ox = Math.sin(act * 40) * 5
        if (hit(0, 0)) {
          p.chill = 1
          setMood(p, 'chatter', 0.85)
          fx.text(j.tx + 60, j.ty - 90, 'BRRR!', { color: '#bfe9ff', size: 50 })
          fx.burst(j.tx, j.ty, { count: 12, color: ['#ffffff', '#bfe9ff'], shape: 'star', speed: 320, life: 0.7, size: 12 })
          for (let i = 0; i < 6; i++) sfx.tone({ freq: 1500 + (i % 2) * 300, dur: 0.03, type: 'square', vol: 0.07, delay: i * 0.07 })
        }
        if (hit(1, 0.65)) {
          release(j)
          stage.after(0.3, () => giggle(p))
          j.done = true
        }
      } else if (tool.kind === 'sponge') {
        ox = Math.sin(act * 44) * 24
        tool.rot = Math.sin(act * 44) * 0.2
        if (hit(0, 0)) {
          const head = j.ly < -190
          p.foam.push({ x: j.lx, y: head ? j.ly - HEAD_Y : j.ly, head, born: stage.time })
          if (p.foam.length > 5) p.foam.shift()
          sfx.splat()
          fx.burst(j.tx, j.ty, { count: 14, color: ['#ffffff', '#d2f3ff'], shape: 'ring', speed: 300, life: 0.9, size: 14, gravity: -220 })
          giggle(p)
        }
        if (hit(1, 0.45)) {
          release(j)
          j.done = true
        }
      } else if (tool.kind === 'tweezers') {
        tool.grip = Math.abs(Math.sin(act * 17))
        oy = Math.sin(act * 17) * 8
        if (hit(0, 0)) {
          sfx.tick()
          giggle(p)
        }
        if (hit(1, 0.2)) sfx.tick()
        if (hit(2, 0.5)) {
          release(j)
          j.done = true
        }
      } else if (tool.kind === 'spoon') {
        if (hit(0, 0)) setMood(p, 'wow', 0.3)
        if (hit(1, 0.16)) {
          sfx.chomp()
          setMood(p, 'yum', 1.0)
          p.stretch.kick(3)
          fx.text(j.tx + 70, j.ty - 90, 'YUM!', { color: '#ffd1ea', size: 50 })
        }
        if (hit(2, 0.45)) {
          release(j)
          j.done = true
        }
      } else {
        // Peekaboo under the blanket.
        if (hit(0, 0)) {
          p.cover.target = 1
          tool.hidden = true
          sfx.whoosh()
        }
        if (hit(1, 0.7)) {
          p.cover.target = 0
          p.cover.value = 0
          tool.hidden = false
          setMood(p, 'wow', 0.35)
          p.stretch.kick(6)
          sfx.boing(3)
          fx.text(j.tx, j.ty - 170, 'BOO!', { color: '#fff3a0', size: 64 })
          fx.burst(j.tx, j.ty, { count: 14, color: ['#ffe14d', '#ff9ad5', '#ffffff'], shape: 'star', speed: 460, life: 0.6, size: 14 })
          release(j)
          tool.hop.kick(-500)
        }
        if (hit(2, 1.0)) {
          giggle(p)
          j.done = true
        }
      }
      if (j.done && p === patient && p.phase === 'sit') stage.after(0.7, () => nudge(p))
    }

    if (!j.released) {
      tool.x = px + ox
      tool.y = py + oy
    }
  }

  // ------------------------------------------------------------- celebration
  function addPhoto(p: Patient): void {
    const img = document.createElement('canvas')
    img.width = 168
    img.height = 168
    const c = img.getContext('2d')
    if (c) {
      c.fillStyle = p.sp.photo
      c.fillRect(0, 0, 168, 168)
      c.translate(84, 106)
      c.scale(0.42, 0.42)
      drawHead(c, p.sp, { time: 0, happy: 1, mood: 'joy', lookX: 0, lookY: 0, blink: 0, stretch: 1, tilt: 0, lift: 0, raise: 0, hug: 0, cold: 0, jolt: 0, seed: 0 })
    }
    const slot = cured % 7
    const at = photos.findIndex((ph) => ph.slot === slot)
    if (at >= 0) photos.splice(at, 1)
    photos.push({ img, slot, fromX: p.x, fromY: BASE_Y + HEAD_Y * S, fly: 0 })
  }

  function cheer(p: Patient): void {
    const at = (n: number, time: number): boolean => {
      if (p.step === n && p.t >= time) {
        p.step++
        return true
      }
      return false
    }
    const big = (cured + 1) % 3 === 0
    if (at(0, 0)) {
      p.stretch.value = 0.78
      sfx.slideUp()
    }
    if (at(1, 0.2)) {
      jump(p, 790)
      p.raiseTo = 1
      sfx.fanfare()
      fx.confetti(p.x, BASE_Y - 330, 70)
      fx.flash('#fff6c9', 0.3, 0.3)
      if (big) {
        fx.confetti(200, 120, 60)
        fx.confetti(W - 200, 120, 60)
        fx.shake(7, 0.35)
        for (let i = 0; i < 3; i++) fx.text(CX - 300 + i * 300, 210 - (i === 1 ? 110 : 0), '⭐', { size: 96, life: 1.5, rise: 90 })
      }
    }
    for (let i = 0; i < 3; i++) {
      if (at(2 + i, 1.0 + i * 0.34)) {
        jump(p, 500)
        p.tilt.target = i % 2 === 0 ? 0.17 : -0.17
        sfx.boing(i * 2)
        setMood(p, 'giggle', 0.3)
      }
    }
    if (at(5, 2.05)) {
      p.tilt.target = 0
      p.raiseTo = 0
      p.hugTo = 1
      sfx.note(7, 0.3, 'sine', 0.2)
      setMood(p, 'yum', 0.65)
    }
    if (p.step === 6) p.heart = ease.outBack(clamp((p.t - 2.05) / 0.45, 0, 1))
    if (at(6, 2.7)) {
      p.heart = 0
      p.hugTo = 0
      p.raiseTo = 1
      fx.burst(p.x, BASE_Y - 170, { count: 28, color: ['#ff5d8f', '#ff9ad5', '#ffd1ea'], shape: 'heart', speed: 620, life: 1.1, size: 22, gravity: 200 })
      fx.flash('#ffd1ea', 0.22, 0.25)
      sfx.win()
      addPhoto(p)
      cured++
    }
    if (at(7, 2.9)) {
      p.phase = 'exit'
      p.t = 0
      leaving.push(p)
      newPatient(false)
    }
  }

  function updatePatient(p: Patient, dt: number): void {
    p.t += dt
    p.stretch.update(dt)
    p.tilt.update(dt)
    p.jolt.update(dt)
    p.wrap.update(dt)
    p.cover.update(dt)
    p.chill = Math.max(0, p.chill - dt / 0.9)
    p.raise = damp(p.raise, p.raiseTo, 14, dt)
    p.hug = damp(p.hug, p.hugTo, 14, dt)

    // Airborne: gravity, stretch in flight, squash and dust on landing.
    if (p.air) {
      p.vy -= 2700 * dt
      p.lift += p.vy * dt
      p.stretch.target = 1 + clamp(Math.abs(p.vy) / 3000, 0, 0.22)
      if (p.lift <= 0) {
        p.lift = 0
        p.air = false
        p.stretch.target = 1
        p.stretch.value = p.phase === 'exit' ? 0.85 : 0.7
        if (p.phase !== 'exit') {
          sfx.thud(0.5)
          fx.burst(p.x, BASE_Y, { count: 10, color: '#ffffff', speed: 280, life: 0.4, size: 10, angle: -Math.PI / 2, spread: Math.PI })
        }
      }
    }

    if (p.phase === 'enter') {
      const k = clamp(p.t / 0.95, 0, 1)
      p.x = lerp(-240, CX, ease.outCubic(k))
      p.lift = Math.abs(Math.sin(k * Math.PI * 3)) * 30 * (1 - k * 0.5)
      if (k >= 1) {
        p.phase = 'sit'
        p.t = 0
        p.lift = 0
        p.stretch.value = 0.82
        sfx.thud(0.35)
        whimper()
      }
    } else if (p.phase === 'sit') {
      const left = open(p)
      if (left.length === 0 && !jobs.some((j) => j.who === p && j.tool.kind !== 'plaster' && !j.done && j.prob)) {
        p.phase = 'cheer'
        p.t = 0
        p.step = 0
      }
      // Hiccups: a hop and a squeak every couple of seconds.
      const hic = has(p, 'hiccup')
      if (hic && !hic.busy) {
        p.hicT -= dt
        if (p.hicT <= 0) {
          p.hicT = rnd(1.7, 2.4)
          p.stretch.kick(7)
          p.jolt.kick(-260)
          sfx.tone({ freq: 480, to: 1150, dur: 0.08, type: 'square', vol: 0.09 })
          const [mx, my] = anchor(p, hic)
          fx.text(mx + rnd(60, 110), my - 40, 'hic!', { color: '#ffffff', size: 38, life: 0.7 })
          fx.burst(mx, my, { count: 3, color: '#ffffff', shape: 'ring', speed: 150, life: 0.6, size: 10, angle: -Math.PI / 2, spread: 1, gravity: -200 })
        }
      }
      // Spots pop away one at a time once the medicine is down.
      const spots = p.problems.find((q) => q.kind === 'spots' && q.popping && !q.fixed)
      if (spots) {
        spots.popT += dt
        while (spots.popT > 0.085) {
          spots.popT -= 0.085
          const i = spots.marks.findIndex((m) => m.s > 0)
          if (i < 0) {
            healed(p, spots)
            break
          }
          const m = spots.marks[i]!
          m.s = 0
          const [mx, my] = spot(p, m.x, m.y, m.head)
          fx.burst(mx, my, { count: 6, color: ['#ff4d6d', '#ffb3c7'], speed: 240, life: 0.4, size: 8 })
          sfx.pop(i)
        }
      }
    } else if (p.phase === 'cheer') {
      cheer(p)
    } else {
      p.x += 620 * dt
      if (!p.air) jump(p, 430)
    }

    // Mood and posture.
    const left = open(p).length
    const mood = moodOf(p)
    const glad = left === 0 ? 1 : mood === 'giggle' || mood === 'yum' || mood === 'joy' ? 0.75 : left < p.problems.length ? 0.4 : 0
    p.happy = damp(p.happy, glad, 12, dt)

    // Eyes follow the tool in the hand, then the last touch, then the boo-boo.
    let lx = 0
    let ly = 0
    const headX = p.x
    const headY = BASE_Y + HEAD_Y * S
    if (grab) {
      lx = clamp((grab.tool.x - headX) / 260, -1, 1)
      ly = clamp((grab.tool.y - headY) / 260, -1, 1)
    } else if (stage.time - lastPointAt < 1.4) {
      lx = clamp((pointX - headX) / 320, -1, 1)
      ly = clamp((pointY - headY) / 320, -1, 1)
    } else if (left > 0 && Math.sin(stage.time * 0.9 + p.seed) > 0) {
      const q = open(p)[0]!
      const [ax, ay] = anchor(p, q)
      lx = clamp((ax - headX) / 160, -1, 1)
      ly = clamp((ay - headY) / 200, -0.4, 1)
    }
    p.lookX = damp(p.lookX, lx, 10, dt)
    p.lookY = damp(p.lookY, ly, 10, dt)
  }

  // ----------------------------------------------------------------- drawing
  function glow(g: CanvasRenderingContext2D, x: number, y: number, r: number): void {
    const pulse = 0.5 + 0.5 * Math.sin(stage.time * 4.2)
    const rr = r * (0.9 + pulse * 0.18)
    const grad = g.createRadialGradient(x, y, rr * 0.2, x, y, rr)
    grad.addColorStop(0, `rgba(255,246,150,${0.62 + pulse * 0.2})`)
    grad.addColorStop(1, 'rgba(255,246,150,0)')
    g.fillStyle = grad
    g.beginPath()
    g.arc(x, y, rr, 0, TAU)
    g.fill()
  }

  function mud(g: CanvasRenderingContext2D, m: Mark): void {
    const s = ease.outQuad(m.s)
    if (s <= 0.02) return
    for (const pass of [0, 1]) {
      g.fillStyle = pass === 0 ? '#4f2c14' : '#7b4a26'
      g.beginPath()
      const grow = pass === 0 ? 4 : 0
      g.arc(m.x, m.y, 24 * s + grow, 0, TAU)
      for (let i = 0; i < 6; i++) {
        const a = m.seed + i * 1.05
        const r = (11 + ((m.seed * 7 + i * 3) % 5) * 2.2) * s
        const d = (22 + ((i * 5 + m.seed * 3) % 3) * 6) * s
        g.moveTo(m.x + Math.cos(a) * d + r + grow, m.y + Math.sin(a) * d * 0.8)
        g.arc(m.x + Math.cos(a) * d, m.y + Math.sin(a) * d * 0.8, r + grow, 0, TAU)
      }
      g.fill()
    }
    ellipse(g, m.x - 8 * s, m.y - 9 * s, 9 * s, 5 * s, 'rgba(255,255,255,0.28)', -0.5)
  }

  function spotDot(g: CanvasRenderingContext2D, m: Mark): void {
    if (m.s <= 0) return
    const r = (11 + (m.seed % 3) * 1.6) * (1 + Math.sin(stage.time * 5 + m.seed) * 0.1)
    circle(g, m.x, m.y, r, '#ff4d6d', '#c4244a', 3)
    circle(g, m.x - r * 0.25, m.y - r * 0.3, r * 0.3, 'rgba(255,255,255,0.6)')
  }

  function plaid(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number): void {
    ellipse(g, x, y, rx, ry, BLANKET.fill)
    g.strokeStyle = BLANKET.stripe
    g.lineWidth = 12
    g.lineCap = 'round'
    g.beginPath()
    for (const k of [-0.45, 0.45]) {
      const hh = ry * Math.sqrt(1 - k * k) * 0.88
      g.moveTo(x + rx * k, y - hh)
      g.lineTo(x + rx * k, y + hh)
    }
    for (const k of [-0.4, 0.3]) {
      const ww = rx * Math.sqrt(1 - k * k) * 0.88
      g.moveTo(x - ww, y + ry * k)
      g.lineTo(x + ww, y + ry * k)
    }
    g.stroke()
    g.beginPath()
    g.ellipse(x, y, rx, ry, 0, 0, TAU)
    g.lineWidth = 6
    g.strokeStyle = BLANKET.line
    g.stroke()
  }

  function decor(g: CanvasRenderingContext2D, p: Patient, head: boolean): void {
    const calm = p.phase === 'sit' || p.phase === 'enter'
    for (const q of p.problems) {
      if (q.fixed && q.kind !== 'bump') continue
      const here = q.head === head
      if (here && !q.fixed && !q.busy && calm && q.kind !== 'cold') glow(g, q.x, q.y, q.kind === 'spots' || q.kind === 'mud' ? 96 : 78)
      if (q.kind === 'thorn' && here && q.hp > 0) {
        const bx = q.side * 92
        const by = -50
        circle(g, bx, by, 17 + Math.sin(stage.time * 6) * 2.5, '#ff6b7d', '#d6334a', 3)
        drawThorn(g, bx, by, -Math.PI / 2 + q.side * 0.5, 76)
      } else if (q.kind === 'mud') {
        for (const m of q.marks) if (m.head === head) mud(g, m)
        if (head && q.hp > 0.3) {
          // A fly doing laps.
          const a = stage.time * 3.1
          sprite(g, '🪰', Math.cos(a) * 170, -120 + Math.sin(a * 2) * 40, 44, Math.sin(a * 9) * 0.3)
        }
      } else if (q.kind === 'spots') {
        for (const m of q.marks) if (m.head === head) spotDot(g, m)
      } else if (q.kind === 'bump' && here && q.hp > 0.02) {
        const r = 46 * q.hp
        const throb = 1 + Math.sin(stage.time * 7) * 0.05 * q.hp
        circle(g, q.x, q.y + 14 * (1 - q.hp), r * throb, mix(p.sp.fur, '#ff4f6a', 0.62), '#c42c48', 4)
        ellipse(g, q.x - r * 0.3, q.y - r * 0.35 + 14 * (1 - q.hp), r * 0.3, r * 0.18, 'rgba(255,255,255,0.6)', -0.5)
        if (q.hp > 0.5) {
          for (let i = 0; i < 3; i++) {
            const a = stage.time * 3.4 + (i * TAU) / 3
            star(g, q.x + Math.cos(a) * 74, q.y - 52 + Math.sin(a) * 20, 13, '#ffe14d', a)
          }
        }
      } else if (q.kind === 'nose' && here && q.hp > 0) {
        circle(g, 0, 20, 24, 'rgba(255,90,110,0.45)')
        for (const side of [-1, 1]) {
          const len = 22 + Math.sin(stage.time * 2.2 + side) * 9 + (side > 0 ? 8 : 0)
          g.beginPath()
          g.moveTo(side * 9, 28)
          g.lineTo(side * 9, 28 + len)
          g.lineCap = 'round'
          g.lineWidth = 15
          g.strokeStyle = '#4fae8e'
          g.stroke()
          g.lineWidth = 10
          g.strokeStyle = '#a8f0d0'
          g.stroke()
          circle(g, side * 9, 30 + len, 9, '#a8f0d0', '#4fae8e', 2.5)
        }
      } else if (q.kind === 'scrape' && here) {
        ellipse(g, q.x, q.y, 34, 27, 'rgba(255,120,140,0.75)')
        g.strokeStyle = '#d6263f'
        g.lineWidth = 6
        g.lineCap = 'round'
        g.beginPath()
        for (let i = -1; i <= 1; i++) {
          g.moveTo(q.x - 14 + i * 13, q.y - 14)
          g.lineTo(q.x - 4 + i * 13, q.y + 14)
        }
        g.stroke()
      } else if (q.kind === 'cold' && head) {
        for (let i = 0; i < 3; i++) {
          const a = stage.time * 1.2 + i * 2.1
          sprite(g, '❄️', Math.cos(a) * 215, -40 + Math.sin(a * 1.3) * 120, 48 * q.hp + 1, a)
        }
      }
    }
    for (const st of p.stickers) {
      if (st.head !== head) continue
      const k = clamp((stage.time - st.born) / 0.28, 0, 1)
      sprite(g, '🩹', st.x, st.y, 84 * (1.7 - 0.7 * ease.outBack(k)), st.rot)
    }
    for (const f of p.foam) {
      if (f.head !== head) continue
      const age = stage.time - f.born
      if (age > 3) continue
      const pop = ease.outBack(clamp(age / 0.25, 0, 1))
      g.globalAlpha = clamp(3 - age, 0, 1)
      for (let i = 0; i < 6; i++) {
        const a = i * 1.1 + f.x
        circle(g, f.x + Math.cos(a) * 24 * pop, f.y + Math.sin(a) * 16 * pop - age * 4, (15 + (i % 3) * 5) * pop, '#ffffff', '#b7e4f7', 2.5)
      }
      g.globalAlpha = 1
    }
    if (!head && p.wrap.value > 0.02) {
      const w = p.wrap.value
      plaid(g, 0, -128, 148 * w, 128 * Math.min(1, w))
    }
    if (head && p.cover.value > 0.02) {
      const w = p.cover.value
      plaid(g, 0, -6, 172 * w, 148 * Math.min(1.05, w))
    }
  }

  function drawPatient(g: CanvasRenderingContext2D, p: Patient): void {
    const cold = has(p, 'cold')
    const chill = Math.max(cold ? cold.hp : 0, p.chill)
    const shiver = chill > 0.1 ? Math.sin(stage.time * 48) * 3.5 * chill : 0
    const pose: Pose = {
      time: stage.time,
      happy: p.happy,
      mood: moodOf(p),
      lookX: p.lookX,
      lookY: p.lookY,
      blink: blinkAt(stage.time, p.seed),
      stretch: p.stretch.value,
      tilt: p.tilt.value,
      lift: p.lift,
      raise: p.raise,
      hug: p.hug,
      cold: chill,
      jolt: p.jolt.value,
      seed: p.seed,
    }
    shadow(g, p.x, BASE_Y + 4, 150, clamp(1 - p.lift / 420, 0.4, 1), 0.2)
    drawAnimal(g, p.sp, p.x + shiver, BASE_Y, S, pose, (c) => decor(c, p, false), (c) => decor(c, p, true))
    if (p.heart > 0.01) {
      const beat = 1 + Math.sin(stage.time * 16) * 0.05
      heart(g, p.x, BASE_Y - 165 - p.lift, 104 * p.heart * beat, '#c4244a')
      heart(g, p.x, BASE_Y - 165 - p.lift, 92 * p.heart * beat, '#ff4d7d')
      ellipse(g, p.x - 40 * p.heart, BASE_Y - 205 - p.lift, 20 * p.heart, 12 * p.heart, 'rgba(255,255,255,0.6)', -0.6)
    }
  }

  function photoSpot(slot: number): [number, number] {
    return [PHOTO_X[slot % PHOTO_X.length]!, 92 + (slot % 2) * 12]
  }

  // -------------------------------------------------------------------- game
  newPatient(true)
  // The very first tray appears at once: the game is playing when it shows.
  for (const tool of tools) tool.pop = 0.4 - tool.slot * 0.08

  return {
    update(dt) {
      updatePatient(patient, dt)
      for (let i = leaving.length - 1; i >= 0; i--) {
        const p = leaving[i]!
        updatePatient(p, dt)
        if (p.x > W + 260) leaving.splice(i, 1)
      }
      for (let i = jobs.length - 1; i >= 0; i--) {
        const j = jobs[i]!
        if (!j.done) stepJob(j, dt)
        if (j.done) jobs.splice(i, 1)
      }

      // The hint: after five quiet seconds the right tool wiggles.
      const idle = stage.time - lastTouchAt > 5 && patient.phase === 'sit' && !grab
      const wanted = idle ? open(patient).find((q) => !q.busy) : undefined

      for (let i = tools.length - 1; i >= 0; i--) {
        const tool = tools[i]!
        tool.size.update(dt)
        tool.hop.update(dt)
        if (tool.leaving && tool.state !== 'held' && tool.state !== 'job') {
          tool.pop = Math.min(tool.pop, 1) - dt / 0.18
          if (tool.pop <= 0) tools.splice(i, 1)
          continue
        }
        tool.pop = Math.min(1, tool.pop + dt / 0.35)
        tool.t += dt
        if (tool.state === 'tray') {
          const bob = Math.sin(stage.time * 2.2 + tool.slot * 1.3) * 4
          tool.x = damp(tool.x, tool.homeX, 12, dt)
          tool.y = damp(tool.y, TRAY_Y + bob, 12, dt)
          const wiggle = wanted && FIXER[wanted.kind] === tool.kind ? Math.sin(stage.time * 17) * 0.2 : Math.sin(stage.time * 1.7 + tool.slot) * 0.04
          tool.rot = damp(tool.rot, wiggle, 14, dt)
        } else if (tool.state === 'held' && grab) {
          const before = tool.x
          tool.x = damp(tool.x, grab.tx, 32, dt)
          tool.y = damp(tool.y, grab.ty, 32, dt)
          const vx = (tool.x - before) / Math.max(dt, 0.001)
          tool.rot = damp(tool.rot, clamp(vx * 0.0007, -0.55, 0.55), 12, dt)
        } else if (tool.state === 'dropped') {
          tool.y += Math.sin(stage.time * 6) * 0.4
          tool.rot = damp(tool.rot, Math.sin(stage.time * 5) * 0.12, 10, dt)
          if (tool.t > 1.1) tool.state = 'return'
        } else if (tool.state === 'return') {
          tool.x = damp(tool.x, tool.homeX, 11, dt)
          tool.y = damp(tool.y, TRAY_Y, 11, dt)
          tool.rot = damp(tool.rot, 0, 10, dt)
          if (dist(tool.x, tool.y, tool.homeX, TRAY_Y) < 10) {
            tool.state = 'tray'
            tool.size.kick(2.5)
            sfx.tick()
          }
        }
      }

      for (let i = debris.length - 1; i >= 0; i--) {
        const d = debris[i]!
        if (d.rest > 0) {
          d.rest += dt
          if (d.rest > 5) debris.splice(i, 1)
          continue
        }
        d.vy += 1900 * dt
        d.x += d.vx * dt
        d.y += d.vy * dt
        d.rot += d.spin * dt
        if (d.y > d.floor && d.vy > 0) {
          if (d.vy > 300) {
            d.vy *= -0.4
            d.vx *= 0.5
            d.spin *= 0.5
            d.y = d.floor
            sfx.tick()
          } else {
            d.rest = 0.01
            d.y = d.floor
          }
        }
      }

      for (const ph of photos) ph.fly = Math.min(1, ph.fly + dt / 0.55)
      for (const toy of toys) toy.s.update(dt)
      sun.update(dt)
    },

    draw(g) {
      g.drawImage(bg, 0, 0, W, H)

      // The window: a turning sun and a drifting cloud.
      const rays = stage.time * 0.35 + sun.value
      g.save()
      g.translate(232, 176)
      g.rotate(rays)
      g.strokeStyle = '#ffd43b'
      g.lineWidth = 8
      g.lineCap = 'round'
      g.beginPath()
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * TAU
        g.moveTo(Math.cos(a) * 46, Math.sin(a) * 46)
        g.lineTo(Math.cos(a) * 60, Math.sin(a) * 60)
      }
      g.stroke()
      g.restore()
      circle(g, 232, 176, 36, '#ffe14d', '#f5a623', 4)
      sprite(g, '☁️', 150 + Math.sin(stage.time * 0.25) * 36, 236, 80)

      // Toys on the shelf.
      for (const toy of toys) {
        const s = toy.s.value
        sprite(g, toy.char, toy.x, toy.y + toy.size * 0.5 * (1 - 1 / s) - (s - 1) * toy.size * 0.5, toy.size, (s - 1) * 0.6, 2 - s, s)
      }

      // Photos of everyone who went home happy.
      for (const ph of photos) {
        const [sx, sy] = photoSpot(ph.slot)
        const k = ease.outBack(ph.fly)
        const x = lerp(ph.fromX, sx, ease.outCubic(ph.fly))
        const y = lerp(ph.fromY, sy, ease.outCubic(ph.fly)) - Math.sin(ph.fly * Math.PI) * 80
        const size = lerp(160, 74, k)
        g.save()
        g.translate(x, y)
        g.rotate(Math.sin(stage.time * 1.4 + ph.slot * 2) * 0.05 + (ph.slot % 2 ? 0.06 : -0.05) + (1 - ph.fly) * 1.5)
        rrect(g, -size / 2 - 6, -size / 2 - 6, size + 12, size + 24, 6, '#ffffff', 'rgba(60,40,70,0.35)', 2.5)
        g.drawImage(ph.img, -size / 2, -size / 2, size, size)
        circle(g, 0, -size / 2 - 6, 6, '#ff6b8a', '#c4244a', 2)
        g.restore()
      }

      for (const p of leaving) drawPatient(g, p)
      drawPatient(g, patient)

      // Thorns that were pulled lie on the floor for a while.
      for (const d of debris) {
        g.globalAlpha = clamp(5 - d.rest, 0, 1)
        drawThorn(g, d.x, d.y, d.rot, 76)
        g.globalAlpha = 1
      }

      // Tools: the tray first, anything in the air on top.
      for (const pass of [0, 1]) {
        for (const tool of tools) {
          const flying = tool.state !== 'tray'
          if ((pass === 1) !== flying || tool.hidden) continue
          const pop = tool.pop <= 0 ? 0 : tool.leaving ? tool.pop : ease.outBack(clamp(tool.pop, 0, 1))
          if (pop <= 0) continue
          const size = TOOL_SIZE * tool.size.value * pop
          const y = tool.y + Math.min(0, tool.hop.value)
          if (flying) shadow(g, tool.x + 10, tool.y + 70, 46, 1, 0.16)
          else shadow(g, tool.x, TRAY_Y + 50, 46, pop, 0.16)
          if (tool.carry) {
            const side = Math.sign(tool.rot) || 1
            drawThorn(g, tool.x - side * 0.48 * 100, y + 0.88 * 100, -Math.PI / 2 + side * 0.5, 76)
          }
          drawTool(g, tool.kind, tool.x, y, size, tool.rot, tool.grip)
        }
      }

      // Idle hint: a hand carries the right tool's ghost to the sore spot.
      if (stage.time - lastTouchAt > 5 && patient.phase === 'sit' && !grab) {
        const q = open(patient).find((o) => !o.busy)
        const tool = q && tools.find((k) => k.kind === FIXER[q.kind] && k.state === 'tray' && !k.leaving)
        if (q && tool) {
          const [ax, ay] = anchor(patient, q)
          const k = ease.inOutQuad(clamp(((stage.time - lastTouchAt - 5) % 2.2) / 1.5, 0, 1))
          const hx = lerp(tool.homeX, ax, k)
          const hy = lerp(TRAY_Y, ay, k) - Math.sin(k * Math.PI) * 60
          g.globalAlpha = 0.55
          drawTool(g, tool.kind, hx, hy, TOOL_SIZE * 0.85, 0, 0)
          g.globalAlpha = 1
          sprite(g, '👆', hx + 26, hy + 52, 72)
          const t = (stage.time % 1.1) / 1.1
          g.globalAlpha = 1 - t
          g.strokeStyle = '#ffffff'
          g.lineWidth = 6
          g.beginPath()
          g.arc(ax, ay, 40 + t * 50, 0, TAU)
          g.stroke()
          g.globalAlpha = 1
        }
      }
    },

    down(p: Pointer) {
      lastTouchAt = stage.time
      lastPointAt = stage.time
      pointX = p.x
      pointY = p.y

      // A tool first: the nearest one on the tray or hovering where it was left.
      if (!grab) {
        let best: Tool | null = null
        let bestD = 105
        for (const tool of tools) {
          if (tool.leaving || tool.pop < 0.5 || tool.state === 'job' || tool.state === 'held') continue
          const d = dist(p.x, p.y, tool.x, tool.y)
          if (d < bestD) {
            bestD = d
            best = tool
          }
        }
        if (best) {
          grab = { id: p.id, tool: best, moved: 0, tx: p.x, ty: p.y - 34, tickle: 0, trail: 0 }
          best.state = 'held'
          best.size.target = 1.28
          best.size.kick(4)
          sfx.pop(best.slot)
          fx.ring(best.x, best.y, '#ffffff', 80, 0.3)
          fx.burst(best.x, best.y, { count: 6, color: ['#ffffff', '#fff3a0'], shape: 'star', speed: 260, life: 0.4, size: 10 })
          return
        }
      }

      const who = patient
      if ((who.phase === 'sit' || who.phase === 'cheer') && overAnimal(who, p.x, p.y)) {
        // On a sore spot: ouch, and the tool that would help hops.
        const sore = open(who).find((q) => !q.busy && q.kind !== 'cold' && q.kind !== 'spots' && q.kind !== 'mud' && dist(p.x, p.y, ...anchor(who, q)) < 78)
        if (sore && who.phase === 'sit') {
          setMood(who, 'wince', 0.5)
          who.stretch.kick(-3)
          whimper()
          const [ax, ay] = anchor(who, sore)
          fx.ring(ax, ay, '#ff6b7d', 90, 0.4)
          stage.after(0.25, () => nudge(who, sore))
          return
        }
        // Anywhere else: a pat. A few quick pats and it giggles.
        who.pets = stage.time - who.lastPetAt < 1.2 ? who.pets + 1 : 1
        who.lastPetAt = stage.time
        who.stretch.kick(-3.5)
        fx.burst(p.x, p.y - 20, { count: 3, color: ['#ff7a9c', '#ffb3c7'], shape: 'heart', speed: 220, life: 0.8, size: 20, angle: -Math.PI / 2, spread: 1.2, gravity: -80 })
        fx.ring(p.x, p.y, '#ffd1ea', 60, 0.3)
        if (who.pets >= 3) {
          who.pets = 0
          giggle(who)
        } else {
          setMood(who, 'yum', 0.45)
          sfx.tone({ freq: 560 + who.pets * 90, to: 760 + who.pets * 90, dur: 0.12, type: 'sine', vol: 0.16 })
        }
        return
      }

      // The room answers too.
      if (dist(p.x, p.y, 232, 176) < 80) {
        sun.kick(14)
        sfx.ding(Math.round(rnd(2, 6)))
        fx.burst(232, 176, { count: 12, color: ['#ffe14d', '#fff3a0'], shape: 'star', speed: 320, life: 0.6, size: 14 })
        return
      }
      for (let i = 0; i < toys.length; i++) {
        const toy = toys[i]!
        if (dist(p.x, p.y, toy.x, toy.y) < 62) {
          toy.s.kick(i === 1 ? 5 : -5)
          if (i === 0) sfx.boing(Math.round(rnd(0, 4)))
          else if (i === 1) sfx.whoosh()
          else sfx.coin(Math.round(rnd(0, 4)))
          fx.burst(toy.x, toy.y, { count: 8, color: ['#ffffff', '#ffe14d', '#ff9ad5'], shape: 'star', speed: 280, life: 0.5, size: 12 })
          return
        }
      }
      fx.ring(p.x, p.y, '#ffffff', 56, 0.3)
      fx.burst(p.x, p.y, { count: 5, color: ['#ffffff', '#fff3a0', '#ffd1ea'], shape: 'star', speed: 220, life: 0.45, size: 11 })
      sfx.pop(Math.round(rnd(-2, 3)))
    },

    move(p: Pointer) {
      lastTouchAt = stage.time
      lastPointAt = stage.time
      pointX = p.x
      pointY = p.y
      const step = Math.hypot(p.dx, p.dy)
      if (!grab) {
        // A bare finger rubbing the animal is a tickle.
        const pet = patient
        if (p.down && (pet.phase === 'sit' || pet.phase === 'cheer') && overAnimal(pet, p.x, p.y)) {
          rub += step
          rubTotal += step
          if (rub > 70) {
            rub = 0
            fx.burst(p.x, p.y - 10, { count: 1, color: ['#ff7a9c', '#ffb3c7', '#ffe14d'], shape: 'heart', speed: 140, life: 0.7, size: 18, angle: -Math.PI / 2, spread: 1.4, gravity: -60 })
            pet.stretch.kick(rnd(-1.5, 1.5))
          }
          if (rubTotal > 480 && stage.time > pet.moodUntil) {
            rubTotal = 0
            giggle(pet)
          }
        }
        return
      }
      if (grab.id !== p.id) return
      grab.moved += step
      grab.tx = p.x
      grab.ty = p.y - 34
      const tool = grab.tool
      // A few sparkles trail behind a tool on the move.
      grab.trail += step
      if (grab.trail > 80) {
        grab.trail = 0
        fx.burst(tool.x, tool.y + 20, { count: 1, color: ['#ffffff', '#fff3a0', '#ffd1ea'], shape: 'star', speed: 60, life: 0.5, size: 12, gravity: 200 })
      }
      const who = patient
      if (who.phase !== 'sit') return
      // Close enough to the thing it fixes: it snaps on and gets to work.
      for (const q of open(who)) {
        if (q.busy || FIXER[q.kind] !== tool.kind) continue
        const [ax, ay] = anchor(who, q)
        if (dist(grab.tx, grab.ty, ax, ay) < q.reach || dist(p.x, p.y, ax, ay) < q.reach) {
          grab = null
          startJob(tool, who, q, ax, ay)
          return
        }
      }
      // Rubbing any tool over the animal tickles.
      if (overAnimal(who, grab.tx, grab.ty)) {
        grab.tickle += step
        if (grab.tickle > 520 && stage.time > who.moodUntil) {
          grab.tickle = 0
          giggle(who)
        }
        if (tool.kind === 'sponge' && Math.random() < 0.35) fx.burst(grab.tx, grab.ty, { count: 1, color: ['#ffffff', '#d2f3ff'], shape: 'ring', speed: 120, life: 0.6, size: 11, gravity: -220 })
      }
    },

    up(p: Pointer) {
      if (!grab || grab.id !== p.id) return
      const tool = grab.tool
      const moved = grab.moved
      const dropX = grab.tx
      const dropY = grab.ty
      grab = null
      tool.size.target = 1
      tool.t = 0
      // A tap on a tool: it hops and says hello.
      if (moved < 26) {
        tool.state = 'return'
        tool.hop.kick(-560)
        sfx.boing(tool.slot)
        return
      }
      const who = patient
      if ((who.phase === 'sit' || (who.phase === 'cheer' && who.t < 1.6)) && (overAnimal(who, dropX, dropY) || overAnimal(who, p.x, p.y))) {
        const q = who.phase === 'sit' ? open(who).find((o) => !o.busy && FIXER[o.kind] === tool.kind) : undefined
        startJob(tool, who, q ?? null, dropX, dropY)
        return
      }
      if (dropY > 610) {
        tool.state = 'return'
        return
      }
      // Let go in mid-air: it hovers a moment so a lifted finger can catch it again.
      tool.state = 'dropped'
      sfx.tick()
    },
  }
}

// The clinic, painted once at double size.
function paintRoom(canvas: HTMLCanvasElement): void {
  const g = canvas.getContext('2d')
  if (!g) return
  g.scale(2, 2)
  const FLOOR = 500

  // Wall with a quiet pattern of hearts and plus signs.
  const wall = g.createLinearGradient(0, 0, 0, FLOOR)
  wall.addColorStop(0, '#bdeee4')
  wall.addColorStop(1, '#a5e3d6')
  g.fillStyle = wall
  g.fillRect(0, 0, W, FLOOR)
  for (let row = 0; row < 6; row++) {
    for (let col = 0; col < 14; col++) {
      const x = 40 + col * 88 + (row % 2) * 44
      const y = 36 + row * 84
      if ((row + col) % 2 === 0) heart(g, x, y, 9, 'rgba(255,255,255,0.4)')
      else {
        g.fillStyle = 'rgba(255,255,255,0.4)'
        g.fillRect(x - 3.5, y - 11, 7, 22)
        g.fillRect(x - 11, y - 3.5, 22, 7)
      }
    }
  }

  // Floor: warm boards running toward us.
  const floor = g.createLinearGradient(0, FLOOR, 0, H)
  floor.addColorStop(0, '#f6cf94')
  floor.addColorStop(1, '#eeb873')
  g.fillStyle = floor
  g.fillRect(0, FLOOR, W, H - FLOOR)
  g.strokeStyle = 'rgba(180,120,60,0.28)'
  g.lineWidth = 3
  g.beginPath()
  for (let i = -6; i <= 6; i++) {
    g.moveTo(CX + i * 96, FLOOR)
    g.lineTo(CX + i * 250, H)
  }
  g.stroke()
  g.fillStyle = '#ffffff'
  g.fillRect(0, FLOOR - 16, W, 20)
  g.fillStyle = 'rgba(80,60,90,0.12)'
  g.fillRect(0, FLOOR + 4, W, 6)

  // Window.
  rrect(g, 66, 96, 252, 236, 26, '#ffffff', '#7fb8ad', 5)
  const skyGrad = g.createLinearGradient(0, 112, 0, 316)
  skyGrad.addColorStop(0, '#6cc8ff')
  skyGrad.addColorStop(1, '#d5f3ff')
  g.save()
  g.beginPath()
  g.roundRect(82, 112, 220, 204, 16)
  g.clip()
  g.fillStyle = skyGrad
  g.fillRect(82, 112, 220, 204)
  ellipse(g, 130, 340, 130, 62, '#6fcf6f')
  ellipse(g, 270, 346, 110, 58, '#58bb62')
  g.restore()
  g.strokeStyle = '#ffffff'
  g.lineWidth = 10
  g.beginPath()
  g.moveTo(192, 112)
  g.lineTo(192, 316)
  g.moveTo(82, 214)
  g.lineTo(302, 214)
  g.stroke()
  rrect(g, 52, 322, 280, 22, 10, '#ffffff', '#7fb8ad', 4)

  // The string the photos hang from.
  g.strokeStyle = 'rgba(90,70,100,0.45)'
  g.lineWidth = 3
  g.beginPath()
  g.moveTo(340, 40)
  g.quadraticCurveTo(CX, 66, 1120, 40)
  g.stroke()

  // Shelf for the toys, and a paw poster under it.
  rrect(g, 868, 356, 270, 20, 8, '#e9a66b', '#b97840', 4)
  rrect(g, 890, 376, 14, 30, 4, '#b97840')
  rrect(g, 1102, 376, 14, 30, 4, '#b97840')
  rrect(g, 84, 372, 118, 108, 12, '#fff7e8', '#e0b98a', 4)
  heart(g, 143, 428, 30, '#ff7a9c')
  g.fillStyle = '#ffffff'
  g.fillRect(137, 410, 12, 34)
  g.fillRect(126, 421, 34, 12)

  // The cushion the patient sits on.
  ellipse(g, CX, BASE_Y + 22, 268, 60, 'rgba(120,70,40,0.18)')
  ellipse(g, CX, BASE_Y + 8, 262, 58, '#ff8fb0')
  ellipse(g, CX, BASE_Y, 262, 54, '#ffb3c9')
  ellipse(g, CX, BASE_Y - 4, 200, 36, '#ffc9d8')

  // The tool tray.
  rrect(g, 138, 642, 904, 140, 44, 'rgba(90,60,40,0.22)')
  rrect(g, 138, 632, 904, 140, 44, '#dfe8f2', '#8fa3ba', 5)
  rrect(g, 158, 648, 864, 108, 32, '#f6fafd')
  rrect(g, 158, 648, 864, 22, 11, 'rgba(143,163,186,0.22)')
}

export const proto: Proto = {
  meta: {
    key: 'boo-boo-vet',
    name: 'Boo-Boo Vet',
    emoji: '🩹',
    ages: [3, 6],
    pitch: 'Drag the right tool onto a sad animal’s boo-boo and watch it cheer up, dance and hug.',
    howTo: 'Drag a tool from the tray onto the animal. The glowing spot is what hurts. Any tool does something.',
    basedOn: 'hospital and doctor games on the under-5 chart, Sago Mini, Toca Pet Doctor',
    whyFun: 'Caring play where sad turns happy at once; wrong tools are jokes, not mistakes; a new patient and a new problem every few seconds.',
  },
  create,
}
