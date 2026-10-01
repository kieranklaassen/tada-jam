// The patients: one parametric sitting animal that can slump and cry, giggle,
// wince, and throw its arms up. Everything is drawn from ellipses so it can
// squash, tilt and jump; the species only change colours, ears, tail and a
// few marks.

import { eyes, volume } from '../../kit/draw.ts'
import { TAU, clamp, lerp } from '../../kit/math.ts'

// Head centre in body space (body origin is the ground under the feet).
export const HEAD_Y = -300

export type FaceMood = 'sad' | 'meh' | 'joy' | 'giggle' | 'wince' | 'wow' | 'yum' | 'chatter' | 'sneeze'
export type EarKind = 'long' | 'round' | 'pointy' | 'floppy' | 'pig' | 'horse'
export type TailKind = 'puff' | 'stub' | 'long' | 'curl' | 'rainbow' | 'tuft'
export type Extra = 'whiskers' | 'none' | 'stripes' | 'snout' | 'patch' | 'horn' | 'panda' | 'mane'

export interface Species {
  key: string
  fur: string
  belly: string
  limb: string
  ear: EarKind
  earFill: string
  earInner: string
  nose: string
  tail: TailKind
  extra: Extra
  // Backdrop of its photo on the wall.
  photo: string
}

export const SPECIES: Record<string, Species> = {
  bunny: { key: 'bunny', fur: '#fff3e6', belly: '#ffffff', limb: '#fff3e6', ear: 'long', earFill: '#fff3e6', earInner: '#ffb3c7', nose: '#ff8fab', tail: 'puff', extra: 'whiskers', photo: '#bfe3ff' },
  bear: { key: 'bear', fur: '#c98a55', belly: '#f3d3a6', limb: '#b5763f', ear: 'round', earFill: '#c98a55', earInner: '#f3d3a6', nose: '#4a2c1a', tail: 'stub', extra: 'none', photo: '#c9f2c0' },
  cat: { key: 'cat', fur: '#ffb14a', belly: '#fff0d6', limb: '#ffb14a', ear: 'pointy', earFill: '#ffb14a', earInner: '#ff8fab', nose: '#ff6f91', tail: 'long', extra: 'stripes', photo: '#e2d4ff' },
  pig: { key: 'pig', fur: '#ffb0c4', belly: '#ffd3de', limb: '#ff9db5', ear: 'pig', earFill: '#ff9db5', earInner: '#ff8fab', nose: '#ff7f9f', tail: 'curl', extra: 'snout', photo: '#fff0a8' },
  dog: { key: 'dog', fur: '#f3dcb8', belly: '#fff6e6', limb: '#f3dcb8', ear: 'floppy', earFill: '#8d5a3a', earInner: '#8d5a3a', nose: '#3a2a2a', tail: 'stub', extra: 'patch', photo: '#ffd0c2' },
  unicorn: { key: 'unicorn', fur: '#ffffff', belly: '#fdf1ff', limb: '#f1e2ff', ear: 'horse', earFill: '#ffffff', earInner: '#ffc2e2', nose: '#ffb3d1', tail: 'rainbow', extra: 'horn', photo: '#ffd6f0' },
  panda: { key: 'panda', fur: '#ffffff', belly: '#ffffff', limb: '#453d4d', ear: 'round', earFill: '#453d4d', earInner: '#6a6174', nose: '#453d4d', tail: 'stub', extra: 'panda', photo: '#c4f0e2' },
  lion: { key: 'lion', fur: '#f9c962', belly: '#ffe9b5', limb: '#f9c962', ear: 'round', earFill: '#f9c962', earInner: '#d9822b', nose: '#8a4a2a', tail: 'tuft', extra: 'mane', photo: '#cfe0ff' },
}

export interface Pose {
  time: number
  // 0 slumped and sad, 1 upright and joyful.
  happy: number
  mood: FaceMood
  lookX: number
  lookY: number
  blink: number
  // The squash spring: 1 is rest.
  stretch: number
  tilt: number
  lift: number
  // Arms: 0 hanging, 1 thrown up.
  raise: number
  // Arms folded in over the chest.
  hug: number
  // 0 warm, 1 icy blue.
  cold: number
  // Head offset in pixels (sneeze, honk).
  jolt: number
  seed: number
}

type Rgb = [number, number, number]
const rgbCache = new Map<string, Rgb>()
const ICE: Rgb = [150, 205, 255]
const DARK: Rgb = [52, 32, 66]
const PANDA_PATCH = '#453d4d'
const DOG_PATCH = '#c48a5a'
const RAINBOW = ['#ff6b6b', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff']

function rgb(hex: string): Rgb {
  let c = rgbCache.get(hex)
  if (!c) {
    const n = parseInt(hex.slice(1), 16)
    c = [(n >> 16) & 255, (n >> 8) & 255, n & 255]
    rgbCache.set(hex, c)
  }
  return c
}

function mixRgb(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]
}

function css(c: Rgb): string {
  return `rgb(${c[0] | 0},${c[1] | 0},${c[2] | 0})`
}

export function mix(a: string, b: string, t: number): string {
  return css(mixRgb(rgb(a), rgb(b), t))
}

interface Ink {
  fill: string
  line: string
}

function ink(hex: string, cold: number): Ink {
  const base = cold > 0.01 ? mixRgb(rgb(hex), ICE, cold * 0.62) : rgb(hex)
  return { fill: css(base), line: css(mixRgb(base, DARK, 0.5)) }
}

function blob(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, c: Ink, rot = 0, width = 5): void {
  g.beginPath()
  g.ellipse(x, y, rx, ry, rot, 0, TAU)
  g.fillStyle = c.fill
  g.fill()
  if (width > 0) {
    g.lineWidth = width
    g.strokeStyle = c.line
    g.stroke()
  }
}

function plain(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  g.beginPath()
  g.ellipse(x, y, rx, ry, rot, 0, TAU)
  g.fillStyle = fill
  g.fill()
}

function tri(g: CanvasRenderingContext2D, ax: number, ay: number, bx: number, by: number, cx: number, cy: number, c: Ink, width = 5): void {
  g.beginPath()
  g.moveTo(ax, ay)
  g.lineTo(bx, by)
  g.lineTo(cx, cy)
  g.closePath()
  g.lineJoin = 'round'
  g.fillStyle = c.fill
  g.fill()
  if (width > 0) {
    g.lineWidth = width
    g.strokeStyle = c.line
    g.stroke()
  }
}

function drawTail(g: CanvasRenderingContext2D, sp: Species, pose: Pose, fur: Ink): void {
  const wag = Math.sin(pose.time * (3 + pose.happy * 13) + pose.seed) * (0.08 + pose.happy * 0.35)
  g.save()
  g.translate(95, -60)
  g.rotate(wag)
  if (sp.tail === 'puff') {
    blob(g, 28, -6, 30, 28, fur)
  } else if (sp.tail === 'stub') {
    blob(g, 26, -8, 24, 18, fur, -0.5)
  } else if (sp.tail === 'curl') {
    g.beginPath()
    g.arc(30, -18, 18, 0.6 * Math.PI, 2.4 * Math.PI)
    g.lineCap = 'round'
    g.lineWidth = 15
    g.strokeStyle = fur.line
    g.stroke()
    g.lineWidth = 8
    g.strokeStyle = fur.fill
    g.stroke()
  } else {
    // A long swishy tail: a thick curve, outlined by drawing it twice.
    const lift = lerp(10, -70, pose.happy)
    for (const pass of [0, 1]) {
      g.beginPath()
      g.moveTo(0, 0)
      g.bezierCurveTo(70, 10, 110, -20 + lift * 0.4, 96, -90 + lift)
      g.lineCap = 'round'
      g.lineWidth = pass === 0 ? 30 : 20
      g.strokeStyle = pass === 0 ? fur.line : sp.tail === 'rainbow' ? '#ff9ad5' : fur.fill
      g.stroke()
    }
    if (sp.tail === 'tuft') blob(g, 96, -94 + lift, 24, 28, ink('#d9822b', pose.cold))
    if (sp.tail === 'rainbow') {
      for (let i = 0; i < 3; i++) {
        g.beginPath()
        g.moveTo(8, -6 + i * 6)
        g.bezierCurveTo(70, 4 + i * 6, 104 + i * 4, -20 + lift * 0.4, 92 + i * 5, -88 + lift)
        g.lineWidth = 6
        g.strokeStyle = RAINBOW[(i * 2 + 1) % RAINBOW.length]!
        g.stroke()
      }
    }
  }
  g.restore()
}

function drawEars(g: CanvasRenderingContext2D, sp: Species, pose: Pose): void {
  const droop = 1 - pose.happy
  const outer = ink(sp.earFill, pose.cold)
  const inner = ink(sp.earInner, pose.cold)
  const flick = Math.sin(pose.time * 1.7 + pose.seed * 3) > 0.96 ? 0.12 : 0
  for (const side of [-1, 1]) {
    g.save()
    if (sp.ear === 'long') {
      g.translate(side * 58, -88)
      g.rotate(side * (lerp(0.1, 1.2, droop) + flick) + Math.sin(pose.time * 2.1 + side) * 0.03)
      blob(g, 0, -84, 31, 90, outer)
      plain(g, 0, -80, 15, 64, inner.fill)
    } else if (sp.ear === 'round') {
      g.translate(side * 100, -84 + droop * 12)
      blob(g, 0, 0, 43, 43, outer)
      plain(g, 0, 2, 24, 24, inner.fill)
    } else if (sp.ear === 'pointy') {
      g.translate(side * 84, -76)
      g.rotate(side * (lerp(0.08, 0.8, droop) + flick))
      tri(g, -44, 12, 44, 12, side * 8, -92, outer)
      tri(g, -22, 6, 24, 6, side * 6, -58, inner, 0)
    } else if (sp.ear === 'floppy') {
      g.translate(side * 116, -58)
      g.rotate(-side * (lerp(0.75, 0.1, droop) + Math.sin(pose.time * 9) * 0.12 * pose.happy))
      blob(g, 0, 66, 37, 78, outer)
    } else if (sp.ear === 'pig') {
      g.translate(side * 88, -84)
      g.rotate(side * lerp(0.35, 1.0, droop))
      tri(g, -34, 10, 34, 10, side * 10, -58, outer)
      tri(g, -16, 6, 18, 6, side * 8, -32, inner, 0)
    } else {
      g.translate(side * 76, -92)
      g.rotate(side * lerp(0.2, 0.9, droop))
      blob(g, 0, -36, 21, 46, outer)
      plain(g, 0, -34, 10, 30, inner.fill)
    }
    g.restore()
  }
}

function drawFace(g: CanvasRenderingContext2D, sp: Species, pose: Pose, fur: Ink): void {
  const mood = pose.mood
  const ey = -20
  const ex = 52
  const size = 25
  const lineColor = '#2b1b3a'
  g.lineCap = 'round'
  g.lineJoin = 'round'

  // Cheeks: barely there when sad, rosy when happy.
  g.globalAlpha = 0.2 + pose.happy * 0.5
  plain(g, -94, 30, 22, 16, '#ff7a9c')
  plain(g, 94, 30, 22, 16, '#ff7a9c')
  g.globalAlpha = 1

  if (mood === 'giggle' || mood === 'yum') {
    // Squeezed-shut happy arcs.
    g.strokeStyle = lineColor
    g.lineWidth = 7
    for (const side of [-1, 1]) {
      g.beginPath()
      g.arc(side * ex, ey + 10, 20, 1.15 * Math.PI, 1.85 * Math.PI)
      g.stroke()
    }
  } else if (mood === 'wince' || mood === 'sneeze') {
    g.strokeStyle = lineColor
    g.lineWidth = 7
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * (ex + 18), ey - 14)
      g.lineTo(side * (ex - 14), ey)
      g.lineTo(side * (ex + 18), ey + 14)
      g.stroke()
    }
  } else {
    const sad = mood === 'sad' || mood === 'chatter' ? 1 : mood === 'meh' ? 0.5 : 0
    const wide = mood === 'wow' ? 1.15 : mood === 'joy' ? 1.06 : 1
    eyes(g, 0, ey, size * wide, pose.lookX, clamp(pose.lookY + sad * 0.45, -1, 1), pose.blink, ex / (size * wide))
    if (mood === 'joy') {
      // A sparkle in each eye.
      for (const side of [-1, 1]) plain(g, side * ex + 9, ey - 9, 5, 5, '#ffffff')
    }
    if (sad > 0) {
      // Heavy upper lids and worried brows.
      for (const side of [-1, 1]) {
        g.save()
        g.translate(side * ex, ey)
        g.rotate(side * 0.3 * sad)
        g.beginPath()
        g.ellipse(0, -size * 0.2, size * 1.25, size * 1.05, 0, Math.PI, TAU)
        g.lineTo(size * 1.25, -size * (1.1 - 0.62 * sad))
        g.lineTo(-size * 1.25, -size * (1.1 - 0.62 * sad))
        g.closePath()
        g.fillStyle = sp.extra === 'panda' ? PANDA_PATCH : sp.extra === 'patch' && side === 1 ? DOG_PATCH : fur.fill
        g.fill()
        g.beginPath()
        g.moveTo(-size * 1.05, -size * (1.08 - 0.62 * sad))
        g.lineTo(size * 1.05, -size * (1.08 - 0.62 * sad))
        g.lineWidth = 5
        g.strokeStyle = lineColor
        g.stroke()
        g.restore()
        g.beginPath()
        g.moveTo(side * (ex + 30), ey - 38 + 6 * sad)
        g.lineTo(side * (ex - 22), ey - 40 - 16 * sad)
        g.lineWidth = 7
        g.strokeStyle = sp.extra === 'panda' ? '#efe9f5' : lineColor
        g.stroke()
      }
    }
    if (mood === 'sad') {
      // Tears welling and rolling, out of step with each other.
      for (const side of [-1, 1]) {
        const phase = (pose.time * 0.55 + (side + 1) * 0.27 + pose.seed) % 1
        const grow = clamp(phase / 0.35, 0, 1)
        const fall = clamp((phase - 0.35) / 0.65, 0, 1)
        const ty = ey + 26 + fall * fall * 78
        g.globalAlpha = 1 - fall * fall
        g.beginPath()
        g.moveTo(side * (ex + 6), ty - 15 * grow)
        g.quadraticCurveTo(side * (ex + 6) + 11 * grow, ty + 4, side * (ex + 6), ty + 9 * grow)
        g.quadraticCurveTo(side * (ex + 6) - 11 * grow, ty + 4, side * (ex + 6), ty - 15 * grow)
        g.fillStyle = '#6ecbff'
        g.fill()
        g.lineWidth = 2.5
        g.strokeStyle = '#2f8fd6'
        g.stroke()
        g.globalAlpha = 1
      }
    }
  }

  // Mouth, a little lower on a pig so it clears the snout.
  const my = sp.extra === 'snout' ? 70 : 56
  g.strokeStyle = lineColor
  g.lineWidth = 6
  if (mood === 'sad') {
    const wob = Math.sin(pose.time * 11) * 1.6
    g.beginPath()
    g.arc(wob, my + 22, 24, 1.18 * Math.PI, 1.82 * Math.PI)
    g.stroke()
  } else if (mood === 'meh') {
    g.beginPath()
    g.moveTo(-16, my + 4)
    g.quadraticCurveTo(0, my - 5, 16, my + 4)
    g.stroke()
  } else if (mood === 'joy' || mood === 'giggle') {
    const open = mood === 'giggle' ? 30 + Math.sin(pose.time * 32) * 5 : 28
    g.beginPath()
    g.arc(0, my - 12, 32, 0, Math.PI)
    g.quadraticCurveTo(0, my - 12 + (30 - open), 32, my - 12)
    g.closePath()
    g.fillStyle = '#7a2438'
    g.fill()
    g.stroke()
    plain(g, 0, my + 9, 15, 9, '#ff7a95')
  } else if (mood === 'wow' || mood === 'sneeze') {
    const r = mood === 'sneeze' ? 17 : 13
    g.beginPath()
    g.ellipse(0, my + 2, r, r * 1.25, 0, 0, TAU)
    g.fillStyle = '#7a2438'
    g.fill()
    g.stroke()
  } else if (mood === 'yum') {
    g.beginPath()
    g.arc(0, my - 14, 26, 0.12 * Math.PI, 0.88 * Math.PI)
    g.stroke()
    plain(g, 12, my + 14, 10, 12, '#ff6b8a', 0.3)
  } else {
    // wince and chatter: gritted teeth, rattling when cold.
    const rattle = mood === 'chatter' ? Math.sin(pose.time * 46) * 3 : 0
    g.beginPath()
    g.roundRect(-22, my - 8 + rattle, 44, 20, 7)
    g.fillStyle = '#ffffff'
    g.fill()
    g.lineWidth = 4.5
    g.stroke()
    g.beginPath()
    g.moveTo(-22, my + 2 + rattle)
    g.lineTo(22, my + 2 + rattle)
    g.moveTo(-8, my - 8 + rattle)
    g.lineTo(-8, my + 12 + rattle)
    g.moveTo(8, my - 8 + rattle)
    g.lineTo(8, my + 12 + rattle)
    g.lineWidth = 3
    g.stroke()
  }
}

// The head, drawn around its own origin. Used for the patient and, small, for
// the photos on the wall. `decor` draws problems in head space, on top.
export function drawHead(g: CanvasRenderingContext2D, sp: Species, pose: Pose, decor?: (g: CanvasRenderingContext2D) => void): void {
  const fur = ink(sp.fur, pose.cold)
  const belly = ink(sp.belly, pose.cold)

  if (sp.extra === 'mane') {
    const mane = ink('#d9822b', pose.cold)
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU + Math.sin(pose.time * 2 + i) * 0.03
      blob(g, Math.cos(a) * 128, Math.sin(a) * 104 - 4, 46, 46, mane)
    }
    plain(g, 0, -4, 140, 116, mane.fill)
  }
  if (sp.extra === 'horn') {
    // Rainbow mane behind the head, down one side.
    for (let i = 0; i < 6; i++) {
      const sway = Math.sin(pose.time * 2.4 + i * 0.7) * 5
      blob(g, -112 - (i % 2) * 14 + sway, -78 + i * 34, 34, 30, { fill: RAINBOW[i]!, line: mix(RAINBOW[i]!, '#342042', 0.4) })
    }
  }
  drawEars(g, sp, pose)
  blob(g, 0, 0, 140, 118, fur)
  // A soft highlight so the head reads round, not flat.
  plain(g, -58, -66, 44, 24, 'rgba(255,255,255,0.28)', -0.5)

  if (sp.extra === 'panda') {
    for (const side of [-1, 1]) plain(g, side * 54, -16, 38, 44, PANDA_PATCH, side * 0.45)
  } else if (sp.extra === 'patch') {
    plain(g, 56, -20, 46, 48, DOG_PATCH, 0.3)
  } else if (sp.extra === 'stripes') {
    g.strokeStyle = ink('#e0822a', pose.cold).fill
    g.lineWidth = 11
    g.lineCap = 'round'
    g.beginPath()
    for (const x of [-30, 0, 30]) {
      g.moveTo(x, -108 + Math.abs(x) * 0.2)
      g.lineTo(x * 0.8, -78)
    }
    for (const side of [-1, 1]) {
      g.moveTo(side * 128, 0)
      g.lineTo(side * 104, 4)
      g.moveTo(side * 124, 26)
      g.lineTo(side * 102, 26)
    }
    g.stroke()
  } else if (sp.extra === 'horn') {
    // A little forelock.
    for (let i = 0; i < 3; i++) plain(g, -34 + i * 26, -100 + Math.abs(i - 1) * 8, 24, 20, RAINBOW[(i * 2) % 6]!)
  }

  // Muzzle and nose.
  if (sp.extra === 'snout') {
    blob(g, 0, 34, 46, 32, ink(sp.nose, pose.cold), 0, 4)
    plain(g, -15, 34, 7, 11, '#c9476a')
    plain(g, 15, 34, 7, 11, '#c9476a')
  } else {
    plain(g, 0, 42, 60, 44, belly.fill)
    blob(g, 0, 20, 18, 13, ink(sp.nose, pose.cold), 0, 3)
    plain(g, -6, 16, 6, 3.5, 'rgba(255,255,255,0.55)')
  }
  if (sp.extra === 'whiskers' || sp.extra === 'stripes') {
    g.strokeStyle = 'rgba(60,40,70,0.45)'
    g.lineWidth = 3
    g.lineCap = 'round'
    g.beginPath()
    for (const side of [-1, 1]) {
      g.moveTo(side * 62, 36)
      g.lineTo(side * 122, 26)
      g.moveTo(side * 62, 48)
      g.lineTo(side * 120, 56)
    }
    g.stroke()
  }

  drawFace(g, sp, pose, fur)

  if (sp.extra === 'horn') {
    g.save()
    g.translate(0, -104)
    tri(g, -20, 4, 20, 4, 0, -96, { fill: '#ffd54d', line: '#c98a1e' })
    g.strokeStyle = '#c98a1e'
    g.lineWidth = 3.5
    g.beginPath()
    for (let i = 0; i < 4; i++) {
      const w = 17 - i * 4
      g.moveTo(-w, -8 - i * 20)
      g.lineTo(w, -18 - i * 20)
    }
    g.stroke()
    g.restore()
  }
  decor?.(g)
}

// The whole sitting animal with its feet at (x, y). `bodyDecor` draws in body
// space (origin at the feet) over the body and arms and under the head;
// `headDecor` draws in head space on top of the face.
export function drawAnimal(
  g: CanvasRenderingContext2D,
  sp: Species,
  x: number,
  y: number,
  scale: number,
  pose: Pose,
  bodyDecor?: (g: CanvasRenderingContext2D) => void,
  headDecor?: (g: CanvasRenderingContext2D) => void,
): void {
  const fur = ink(sp.fur, pose.cold)
  const belly = ink(sp.belly, pose.cold)
  const limb = ink(sp.limb, pose.cold)
  const breath = 1 + Math.sin(pose.time * 2.4 + pose.seed) * 0.013
  const slump = lerp(0.95, 1.02, pose.happy)
  const [sx, sy] = volume(pose.stretch * breath * slump)

  g.save()
  g.translate(x, y - pose.lift)
  g.rotate(pose.tilt)
  g.scale(sx * scale, sy * scale)

  drawTail(g, sp, pose, fur)
  blob(g, 0, -120, 120, 126, fur)
  plain(g, 0, -104, 80, 88, belly.fill)

  // Feet, soles toward us, with pads.
  for (const side of [-1, 1]) {
    const kick = pose.lift > 4 ? side * 0.25 : 0
    blob(g, side * 82, -26, 56, 40, limb, side * -0.12 + kick)
    plain(g, side * 84, -20, 28, 18, 'rgba(255,170,190,0.85)')
    for (let i = -1; i <= 1; i++) plain(g, side * 84 + i * 24, -46 + Math.abs(i) * 5, 9, 8, 'rgba(255,170,190,0.85)')
  }

  // Arms swing from the shoulder: hanging, thrown up, or folded in for a hug.
  for (const side of [-1, 1]) {
    const wave = pose.raise > 0.5 ? Math.sin(pose.time * 15 + side) * 0.16 : 0
    const theta = lerp(lerp(0.32, 2.45 + wave, pose.raise), -0.95, pose.hug)
    g.save()
    g.translate(side * 100, -196)
    g.rotate(-side * theta)
    blob(g, 0, 54, 28, 62, limb)
    g.restore()
  }

  bodyDecor?.(g)

  g.save()
  g.translate(0, HEAD_Y + lerp(14, 0, pose.happy) + pose.jolt)
  g.rotate(lerp(0.1, 0, pose.happy) + Math.sin(pose.time * lerp(1.3, 3.2, pose.happy) + pose.seed) * 0.035)
  drawHead(g, sp, pose, headDecor)
  g.restore()

  g.restore()
}
