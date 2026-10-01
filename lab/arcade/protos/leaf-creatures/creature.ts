// A creature is exactly the things the child laid together, kept in the
// places and turns they were given. Nothing is added but life: this file reads
// what the parts suggest (legs, wings, a long body, something round), and
// draws each part moving the way that kind of part would.

import { spring } from '../../kit/math.ts'
import type { Spring } from '../../kit/math.ts'
import { KINDS, drawSprite } from './art.ts'
import type { Art, Kind } from './art.ts'

type G = CanvasRenderingContext2D

export type Role = 'body' | 'leaf' | 'leg' | 'antler' | 'wing' | 'plume' | 'tail' | 'eye' | 'bit'
export type Gait = 'fly' | 'scuttle' | 'walk' | 'slither' | 'roll' | 'hop'
export type State = 'waking' | 'wander' | 'pause' | 'follow' | 'orbit' | 'toSleep' | 'sleep' | 'rousing' | 'leaving'

export interface Source {
  kind: Kind
  variant: number
  x: number
  y: number
  rot: number
}

export interface Part {
  kind: Kind
  variant: number
  lx: number
  ly: number
  rot: number
  role: Role
  // Where it joins the rest, along its own x axis; it swings about this.
  px: number
  // Which way its free end points, for wings that must rise together.
  sign: number
  ph: number
  n: number
}

export interface Creature {
  id: number
  parts: Part[]
  gait: Gait
  // Which side of it the eyes are on: it leads with that side.
  head: number
  hw: number
  hh: number
  R: number
  x: number
  y: number
  s: number
  sTo: number
  state: State
  t: number
  tx: number
  ty: number
  moving: boolean
  // Shows its gait on the spot, while it stretches after waking.
  stretch: boolean
  move: number
  phase: number
  flap: number
  flapAmp: number
  alt: number
  roll: number
  tilt: number
  flip: number
  flipTo: number
  eyesOpen: boolean
  lid: number
  lidRate: number
  blinkT: number
  blinkIn: number
  lookX: number
  lookY: number
  wiggle: Spring
  squash: Spring
  errands: number
  tire: number
  pause: number
  spot: number
  voice: number
  alpha: number
  friend: Creature | null
  orbit: number
  cue: number
  // What it is on its way to nose, as an index into the loose pieces' ids.
  nose: number
  calm: number
}

export function makeCreature(id: number, src: readonly Source[], rand: () => number): Creature {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  let sw = 0
  let sx = 0
  let sy = 0
  for (const s of src) {
    const d = KINDS[s.kind]
    const c = Math.cos(s.rot)
    const sn = Math.sin(s.rot)
    const ex = Math.hypot(c * d.len, sn * d.wid)
    const ey = Math.hypot(sn * d.len, c * d.wid)
    minX = Math.min(minX, s.x - ex)
    maxX = Math.max(maxX, s.x + ex)
    minY = Math.min(minY, s.y - ey)
    maxY = Math.max(maxY, s.y + ey)
    const w = d.len * d.wid
    sw += w
    sx += s.x * w
    sy += s.y * w
  }
  const ox = (minX + maxX) / 2
  const oy = (minY + maxY) / 2
  const hw = (maxX - minX) / 2
  const hh = (maxY - minY) / 2
  // The heavy middle of it, which limbs hang from.
  const mx = sx / sw - ox
  const my = sy / sw - oy

  let ex = 0
  let ey = 0
  let eyes = 0
  for (const s of src) {
    if (s.kind !== 'cap') continue
    ex += s.x - ox
    ey += s.y - oy
    eyes++
  }
  if (eyes > 0) {
    ex /= eyes
    ey /= eyes
  }

  let bodyAt = -1
  let bodyArea = 0
  src.forEach((s, i) => {
    const d = KINDS[s.kind]
    if (d.cls === 'eye') return
    const area = d.len * d.wid * (d.cls === 'leaf' ? 1.6 : 1)
    if (area > bodyArea) {
      bodyArea = area
      bodyAt = i
    }
  })

  const wingy = src.filter((s) => KINDS[s.kind].cls === 'wingy').length
  const twigs = src.filter((s) => s.kind === 'twig').length

  const parts: Part[] = src.map((s, i) => {
    const d = KINDS[s.kind]
    const lx = s.x - ox
    const ly = s.y - oy
    const c = Math.cos(s.rot)
    const sn = Math.sin(s.rot)
    const ax = lx + c * d.len
    const ay = ly + sn * d.len
    const bx = lx - c * d.len
    const by = ly - sn * d.len
    const aIn = Math.hypot(ax - mx, ay - my) < Math.hypot(bx - mx, by - my)
    const outX = aIn ? bx : ax
    const outY = aIn ? by : ay
    const inX = aIn ? ax : bx
    const inY = aIn ? ay : by
    let role: Role = 'bit'
    if (d.cls === 'eye') role = 'eye'
    else if (i === bodyAt) role = 'body'
    else if (s.kind === 'twig') {
      const nearEyes = eyes > 0 && Math.hypot(inX - ex, inY - ey) < 80
      const down = outY > my + hh * 0.1
      role = down ? 'leg' : nearEyes && outY < inY ? 'antler' : twigs >= 4 ? 'leg' : 'antler'
    } else if (d.cls === 'wingy') role = wingy >= 2 ? 'wing' : 'plume'
    else if (d.cls === 'cone' || d.cls === 'fluff') role = 'tail'
    else if (d.cls === 'leaf') role = 'leaf'
    return {
      kind: s.kind,
      variant: s.variant,
      lx,
      ly,
      rot: s.rot,
      role,
      px: (aIn ? 1 : -1) * d.len * 0.86,
      sign: outX - inX >= 0 ? 1 : -1,
      ph: rand() * Math.PI * 2,
      n: 0,
    }
  })

  const legs = parts.filter((p) => p.role === 'leg').sort((a, b) => a.lx - b.lx)
  legs.forEach((p, i) => (p.n = i))
  const wings = parts.filter((p) => p.role === 'wing')
  wings.forEach((p, i) => (p.n = i))

  const aspect = hw / Math.max(1, hh)
  let gait: Gait = 'hop'
  if (wings.length >= 2) gait = 'fly'
  else if (legs.length >= 4) gait = 'scuttle'
  else if (legs.length >= 2) gait = 'walk'
  else if (legs.length === 1) gait = 'hop'
  else if (aspect >= 1.85) gait = 'slither'
  else if (aspect > 0.62 && aspect < 1.6) gait = 'roll'

  const head = eyes > 0 && Math.abs(ex) > hw * 0.16 ? Math.sign(ex) : 0
  const R = Math.max(hw, hh)

  return {
    id,
    parts,
    gait,
    head,
    hw,
    hh,
    R,
    x: ox,
    y: oy,
    s: 1,
    sTo: 1,
    state: 'waking',
    t: 0,
    tx: ox,
    ty: oy,
    moving: false,
    stretch: false,
    move: 0,
    phase: 0,
    flap: 0,
    flapAmp: 0,
    alt: 0,
    roll: 0,
    tilt: 0,
    flip: 1,
    flipTo: 1,
    eyesOpen: false,
    lid: 1,
    lidRate: 2,
    blinkT: 0,
    blinkIn: 3,
    lookX: 0,
    lookY: 0,
    wiggle: spring(0, 120, 7),
    squash: spring(1, 200, 11),
    errands: 0,
    tire: 7 + Math.floor(rand() * 3),
    pause: 0,
    spot: -1,
    voice: 0,
    alpha: 1,
    friend: null,
    orbit: 0,
    cue: 0,
    nose: -1,
    calm: 1,
  }
}

const STRIPS = 12

export function drawCreature(g: G, art: Art, c: Creature, time: number): void {
  const s = c.s
  const asleep = c.state === 'sleep'
  if (c.state !== 'waking' || c.t > 0.3) {
    // A soft smudge under it, so it stands off the leaves it walks over.
    g.globalAlpha = Math.max(0.1, 0.36 - c.alt * 0.002) * c.alpha * (asleep ? 0.6 : 1)
    const k = (c.hw * s * 2.1 * (1 - c.alt * 0.002)) / art.shade.w
    drawSprite(g, art.shade, c.x + 4, c.y + c.hh * s * 0.5 + 6, 0, k, Math.max(0.55, k * 0.9))
    g.globalAlpha = 1
  }
  let bob = 0
  let tilt = c.tilt
  if (c.gait === 'walk') {
    bob = Math.abs(Math.sin(c.phase)) * 6 * c.move
    tilt += Math.sin(c.phase) * 0.035 * c.move
  } else if (c.gait === 'scuttle') {
    bob = Math.sin(c.phase * 2) * 1.5 * c.move
  } else if (c.gait === 'fly') {
    bob = Math.sin(time * 2.3 + c.id) * 6 * Math.min(1, c.alt / 40)
    tilt += Math.sin(time * 1.6 + c.id) * 0.03 * Math.min(1, c.alt / 40)
  }
  const breath = asleep ? Math.sin(time * 1.4 + c.id * 2) * 0.022 : 0
  const q = c.squash.value
  const fl = c.flip >= 0 ? Math.max(0.12, c.flip) : Math.min(-0.12, c.flip)
  const calm = c.calm

  g.save()
  if (c.alpha < 1) g.globalAlpha = c.alpha
  g.translate(c.x, c.y - c.alt - bob)
  g.rotate(tilt + c.roll + c.wiggle.value)
  g.scale(fl * s * (2 - q), s * q * (1 + breath))

  const wave = (x: number) => (c.gait === 'slither' ? Math.sin(x * 0.036 * (c.head || 1) + c.phase) * 10 * c.move : 0)
  // The eyes' gaze in the creature's own frame.
  const lookX = c.lookX * (fl < 0 ? -1 : 1)
  const lookY = c.lookY

  for (const p of c.parts) {
    const spr = art.pieces[p.kind][p.variant]!
    let da = 0
    let sxl = 1
    let syl = 1
    switch (p.role) {
      case 'leg':
        da = (c.gait === 'scuttle' ? 0.3 : 0.44) * c.move * Math.sin(c.phase + p.n * Math.PI + p.n * 0.3)
        break
      case 'antler':
        da = (0.04 * Math.sin(time * 1.4 + p.ph) + 0.05 * Math.sin(c.phase) * c.move) * calm
        break
      case 'wing': {
        const up = c.flapAmp * (0.18 + 0.52 * Math.sin(c.flap + p.n * 0.25)) + (1 - c.flapAmp) * 0.05 * Math.sin(time * 1.3 + p.ph) * calm
        da = -p.sign * up
        sxl = 1 - c.flapAmp * 0.1 * (1 + Math.sin(c.flap + 1.2))
        break
      }
      case 'tail':
        da = 0.24 * Math.sin(time * 6 + p.ph) * c.move + 0.05 * Math.sin(time * 1.1 + p.ph) * calm
        break
      case 'plume':
        da = 0.13 * Math.sin(time * 3.2 + p.ph) * c.move + 0.05 * Math.sin(time * 0.9 + p.ph) * calm
        break
      case 'leaf':
        da = 0.1 * Math.sin(time * 3.6 + p.ph) * c.move + 0.03 * Math.sin(time * 0.8 + p.ph) * calm
        break
      case 'body':
        syl = 1 + 0.025 * Math.sin(time * 4.2) * c.move
        break
      default:
        break
    }
    g.save()
    g.translate(p.lx, p.ly + (p.role === 'body' ? 0 : wave(p.lx)))
    g.rotate(p.rot)
    if (da !== 0 || sxl !== 1) {
      g.translate(p.px, 0)
      g.rotate(da)
      if (sxl !== 1) g.scale(sxl, 1)
      g.translate(-p.px, 0)
    }
    if (p.role === 'body' && c.gait === 'slither' && c.move > 0.02) {
      // A long body ripples: the sprite is drawn in slices that ride a wave.
      const cs = Math.cos(p.rot)
      const dir = cs >= 0 ? 1 : -1
      const k = spr.img.width / spr.w
      const sw = spr.w / STRIPS
      for (let i = 0; i < STRIPS; i++) {
        const x0 = -spr.w / 2 + i * sw
        const off = wave(p.lx + (x0 + sw / 2) * cs) * dir
        g.drawImage(spr.img, i * sw * k, 0, sw * k, spr.img.height, x0, -spr.h / 2 + off, sw + 0.6, spr.h)
      }
    } else if (syl !== 1) {
      g.scale(1, syl)
      g.drawImage(spr.img, -spr.w / 2, -spr.h / 2, spr.w, spr.h)
    } else {
      g.drawImage(spr.img, -spr.w / 2, -spr.h / 2, spr.w, spr.h)
    }
    if (p.role === 'eye') {
      g.rotate(-p.rot)
      if (c.lid < 0.97) g.drawImage(art.pupil.img, lookX * 5.4 - art.pupil.w / 2, 1 + lookY * 4.8 - art.pupil.h / 2, art.pupil.w, art.pupil.h)
      if (c.lid > 0.03) {
        if (c.lid < 0.97) {
          g.beginPath()
          g.rect(-24, -24, 48, 7 + 41 * c.lid)
          g.clip()
        }
        g.drawImage(art.lid.img, -art.lid.w / 2, -art.lid.h / 2, art.lid.w, art.lid.h)
      }
    }
    g.restore()
  }
  g.restore()
}
