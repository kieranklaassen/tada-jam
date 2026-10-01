// The tree folk as paper puppets: flat cut shapes with pinned joints. Three elf
// children in leaf caps, a squirrel and an owl. Faces are two dots.

import { TAU } from '../../kit/math.ts'
import { tone } from './paper.ts'

type G = CanvasRenderingContext2D

export interface ElfLook {
  tunic: string
  cap: string
  vein: string
  skin: string
}

export const ELVES: ElfLook[] = [
  { tunic: '#c65a40', cap: '#7aa84e', vein: '#b9d98a', skin: '#f2cda8' },
  { tunic: '#4f77a8', cap: '#e0913c', vein: '#f3c98a', skin: '#e9bd94' },
  { tunic: '#dba63c', cap: '#8f4f74', vein: '#cf9bb6', skin: '#f4d3b4' },
]

export type Pose = 'stand' | 'walk' | 'climb' | 'balance' | 'sit' | 'look' | 'swing' | 'haul'

const SHADE = 'rgba(36,26,18,0.2)'
const LEGS = '#5d4a3a'
// The elves are drawn a little larger than they were cut.
const ELF = 1.15

function strip(g: G, x1: number, y1: number, x2: number, y2: number, w: number, col: string): void {
  g.beginPath()
  g.moveTo(x1, y1)
  g.lineTo(x2, y2)
  g.strokeStyle = col
  g.lineWidth = w
  g.stroke()
}

function dot(g: G, x: number, y: number, r: number, col: string): void {
  g.beginPath()
  g.arc(x, y, r, 0, TAU)
  g.fillStyle = col
  g.fill()
}

// (x, y) is the feet, or the seat when sitting. `sway` leans the cap's tip
// (it follows the body late); `kick` swings the legs of someone sitting.
export function drawElf(g: G, look: ElfLook, x: number, y: number, face: number, pose: Pose, ph: number, night: number, lit: number, sway = 0, alpha = 1, kick = 0): void {
  if (alpha <= 0.01) return
  const sitting = pose === 'sit' || pose === 'swing'
  const back = pose === 'climb'
  // Where the hem of the tunic is, from the origin.
  const hem = sitting ? 0 : -9
  let bob = 0
  let lean = 0
  // Feet (dx, dy) from under each hip, and hands from each shoulder.
  let lf: [number, number] = [0, 0]
  let rf: [number, number] = [0, 0]
  let lh: [number, number] = [-4, 12]
  let rh: [number, number] = [4, 12]
  if (pose === 'stand') {
    bob = Math.sin(ph * 1.6) * 0.5
  } else if (pose === 'walk') {
    const s = Math.sin(ph * 9)
    lf = [s * 4.5, -Math.max(0, s) * 2.5]
    rf = [-s * 4.5, -Math.max(0, -s) * 2.5]
    lh = [-3 - s * 4, 11]
    rh = [3 + s * 4, 11]
    bob = -Math.abs(Math.cos(ph * 9)) * 1.4
  } else if (pose === 'climb') {
    const s = Math.sin(ph * 7)
    lf = [-1, -3 - s * 3.5]
    rf = [1, -3 + s * 3.5]
    lh = [-3, -13 + s * 4]
    rh = [3, -13 - s * 4]
  } else if (pose === 'balance') {
    const s = Math.sin(ph * 8)
    const w = Math.sin(ph * 3.1)
    lean = w * 0.09
    lf = [s * 3, -Math.max(0, s) * 2]
    rf = [-s * 3, -Math.max(0, -s) * 2]
    lh = [-15, -1 + w * 5]
    rh = [15, -1 - w * 5]
  } else if (pose === 'sit') {
    const s = Math.sin(ph * 2.6)
    lf = [1 + s * 3.4 + kick, 11]
    rf = [1 - s * 3.4 + kick, 11]
    lh = [-6, 15]
    rh = [6, 15]
    bob = Math.sin(ph * 1.3) * 0.4
  } else if (pose === 'look') {
    lh = [-4, 12]
    rh = [1, -12]
    lean = 0.05
    bob = Math.sin(ph * 1.6) * 0.5
  } else if (pose === 'haul') {
    const s = Math.sin(ph * 5)
    lh = [13, 1 + s * 5]
    rh = [6, 5 - s * 5]
    lean = -0.1 + s * 0.03
    lf = [-2, 0]
    rf = [2, 0]
  } else if (pose === 'swing') {
    lf = [3 + kick * 9, 10 - Math.abs(kick) * 3]
    rf = [5 + kick * 9, 10 - Math.abs(kick) * 3]
    lh = [-9, -9]
    rh = [9, -9]
    lean = -kick * 0.2
  }

  const figure = (col: (c: string) => string, plain: boolean) => {
    const top = hem - 22 + bob
    // The far arm.
    strip(g, -5.5, top + 3, -5.5 + lh[0], top + 3 + lh[1], 4.2, col(look.tunic))
    // Legs.
    const hip = sitting ? 0 : hem
    const reach = sitting ? 0 : 9
    strip(g, -3.6, hip - 1, -3.6 + lf[0], hip + reach + lf[1], 4, col(LEGS))
    strip(g, 3.6, hip - 1, 3.6 + rf[0], hip + reach + rf[1], 4, col(LEGS))
    // The tunic: a little bell.
    g.beginPath()
    g.moveTo(-5.6, top)
    g.lineTo(5.6, top)
    g.quadraticCurveTo(9, hem - 8 + bob * 0.5, 11.5, hem)
    g.quadraticCurveTo(0, hem + 3, -11.5, hem)
    g.quadraticCurveTo(-9, hem - 8 + bob * 0.5, -5.6, top)
    g.fillStyle = col(look.tunic)
    g.fill()
    // Head and cap.
    const hy = top - 7.5
    dot(g, 0, hy, 9.4, col(look.skin))
    const tipX = -3 - sway
    const tipY = hy - 27
    g.beginPath()
    g.moveTo(-10.6, hy - 3.5)
    g.quadraticCurveTo(-7 - sway * 0.3, hy - 16, tipX, tipY)
    g.quadraticCurveTo(6 - sway * 0.3, hy - 15, 10.6, hy - 3.5)
    g.quadraticCurveTo(0, hy - 8.5, -10.6, hy - 3.5)
    g.fillStyle = col(look.cap)
    g.fill()
    if (!plain) {
      g.beginPath()
      g.moveTo(0, hy - 7.5)
      g.quadraticCurveTo(-1 - sway * 0.3, hy - 16, tipX + 0.6, tipY + 5)
      g.strokeStyle = col(look.vein)
      g.lineWidth = 1.3
      g.stroke()
      if (!back) {
        dot(g, 1.2, hy + 0.6, 1.25, col('#4a3628'))
        dot(g, 6.2, hy + 0.6, 1.25, col('#4a3628'))
      }
    }
    // The near arm and both hands.
    strip(g, 5.5, top + 3, 5.5 + rh[0], top + 3 + rh[1], 4.2, col(look.tunic))
    if (!plain) {
      dot(g, -5.5 + lh[0], top + 3 + lh[1], 2.3, col(look.skin))
      dot(g, 5.5 + rh[0], top + 3 + rh[1], 2.3, col(look.skin))
    }
  }

  g.save()
  if (alpha < 1) g.globalAlpha *= alpha
  g.translate(x + 2.5, y + 4)
  g.scale(face * ELF, ELF)
  if (lean) g.rotate(lean)
  figure(() => SHADE, true)
  g.restore()
  g.save()
  if (alpha < 1) g.globalAlpha *= alpha
  g.translate(x, y)
  g.scale(face * ELF, ELF)
  if (lean) g.rotate(lean)
  figure((c) => tone(c, night, lit), false)
  g.restore()
}

export type SquirrelPose = 'sit' | 'run' | 'curl'

export function drawSquirrel(g: G, x: number, y: number, face: number, pose: SquirrelPose, ph: number, night: number, lit: number, flick = 0, rot = 0): void {
  const BODY = '#b8693c'
  const TAIL = '#cc7f44'
  const PALE = '#ecc898'
  const figure = (col: (c: string) => string, plain: boolean) => {
    g.lineCap = 'round'
    if (pose === 'sit') {
      // The tail first: a tall curl behind.
      g.beginPath()
      g.moveTo(-6, -3)
      g.bezierCurveTo(-24, -8, -24 - flick * 5, -34, -10 - flick * 7, -38)
      g.strokeStyle = col(TAIL)
      g.lineWidth = 11
      g.stroke()
      if (!plain) {
        g.strokeStyle = col(PALE)
        g.lineWidth = 3.4
        g.stroke()
      }
      g.beginPath()
      g.ellipse(0, -12, 8.5, 12.5, 0.12, 0, TAU)
      g.fillStyle = col(BODY)
      g.fill()
      dot(g, 5, -27, 7.2, col(BODY))
      g.beginPath()
      g.moveTo(0.5, -32)
      g.lineTo(2, -39)
      g.lineTo(5.5, -33)
      g.fill()
      if (!plain) {
        g.beginPath()
        g.ellipse(3.2, -11, 4, 8, 0.1, 0, TAU)
        g.fillStyle = col(PALE)
        g.fill()
        strip(g, 3, -19, 9.5, -17, 3, col(BODY))
        dot(g, 11, -17.5, 3, col('#8a5c3a'))
        dot(g, 8, -28, 1.3, col('#3a2a20'))
      }
    } else if (pose === 'run') {
      const s = Math.sin(ph * 16)
      g.beginPath()
      g.moveTo(-10, -8)
      g.bezierCurveTo(-22, -14 - s * 3, -28, -6 + s * 5, -38, -13 + s * 4)
      g.strokeStyle = col(TAIL)
      g.lineWidth = 10
      g.stroke()
      if (!plain) {
        g.strokeStyle = col(PALE)
        g.lineWidth = 3
        g.stroke()
      }
      g.beginPath()
      g.ellipse(0, -8 - Math.abs(s) * 1.5, 14, 7, s * 0.12, 0, TAU)
      g.fillStyle = col(BODY)
      g.fill()
      dot(g, 14, -12 - Math.abs(s) * 1.5, 6.4, col(BODY))
      strip(g, 7, -4, 10 + s * 5, 0, 3, col(BODY))
      strip(g, -8, -4, -11 - s * 5, 0, 3, col(BODY))
      if (!plain) {
        g.beginPath()
        g.moveTo(10.5, -17)
        g.lineTo(11.5, -23)
        g.lineTo(15, -18)
        g.fillStyle = col(BODY)
        g.fill()
        dot(g, 16.5, -13, 1.2, col('#3a2a20'))
      }
    } else {
      // Curled up, the tail over its nose.
      g.beginPath()
      g.ellipse(0, -7, 14, 8, 0, 0, TAU)
      g.fillStyle = col(BODY)
      g.fill()
      dot(g, 9, -7, 6, col(BODY))
      g.beginPath()
      g.moveTo(-12, -4)
      g.bezierCurveTo(-20, -18, 6, -22, 14, -8 + Math.sin(ph * 1.2) * 0.6)
      g.strokeStyle = col(TAIL)
      g.lineWidth = 9
      g.stroke()
      if (!plain) {
        g.strokeStyle = col(PALE)
        g.lineWidth = 2.8
        g.stroke()
        // An ear, and an eye shut.
        g.beginPath()
        g.moveTo(5, -11)
        g.lineTo(6.5, -17)
        g.lineTo(10, -12)
        g.fillStyle = col(BODY)
        g.fill()
        g.beginPath()
        g.arc(11, -7.5, 2, 0.1 * Math.PI, 0.9 * Math.PI)
        g.strokeStyle = col('#3a2a20')
        g.lineWidth = 1.2
        g.stroke()
      }
    }
  }
  g.save()
  g.translate(x + 2.5, y + 4)
  g.rotate(rot)
  g.scale(face, 1)
  figure(() => SHADE, true)
  g.restore()
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.scale(face, 1)
  figure((c) => tone(c, night, lit), false)
  g.restore()
}

// `wake` 0 asleep .. 1 eyes open; `spread` 0 folded .. 1 wings out.
export function drawOwl(g: G, x: number, y: number, ph: number, wake: number, spread: number, night: number, lit: number): void {
  const BODY = '#a9825a'
  const WING = '#8a6644'
  const PALE = '#eedcb8'
  const flap = Math.sin(ph * 6) * 9 * spread
  const figure = (col: (c: string) => string, plain: boolean) => {
    // Wings behind when spread.
    if (spread > 0.05) {
      for (const s of [-1, 1]) {
        g.beginPath()
        g.moveTo(s * 10, -30)
        g.quadraticCurveTo(s * (20 + 20 * spread), -40 - flap, s * (16 + 34 * spread), -26 - flap * 1.6)
        g.quadraticCurveTo(s * (14 + 18 * spread), -18 - flap * 0.4, s * 12, -12)
        g.closePath()
        g.fillStyle = col(WING)
        g.fill()
      }
    }
    const breathe = 1 + Math.sin(ph * 1.1) * 0.012
    g.beginPath()
    g.ellipse(0, -22, 17 * breathe, 22, 0, 0, TAU)
    g.fillStyle = col(BODY)
    g.fill()
    // Ear tufts.
    g.beginPath()
    g.moveTo(-14, -36)
    g.lineTo(-12, -48)
    g.lineTo(-5, -41)
    g.moveTo(14, -36)
    g.lineTo(12, -48)
    g.lineTo(5, -41)
    g.fill()
    if (plain) return
    g.beginPath()
    g.ellipse(0, -15, 11, 13, 0, 0, TAU)
    g.fillStyle = col(PALE)
    g.fill()
    g.strokeStyle = col('#c4a274')
    g.lineWidth = 1.5
    for (const [vx, vy] of [
      [-4, -18],
      [4, -18],
      [0, -12],
      [-5, -7],
      [5, -7],
    ] as [number, number][]) {
      g.beginPath()
      g.moveTo(vx - 2.4, vy - 1.5)
      g.lineTo(vx, vy + 1.5)
      g.lineTo(vx + 2.4, vy - 1.5)
      g.stroke()
    }
    if (spread <= 0.05) {
      for (const s of [-1, 1]) {
        g.beginPath()
        g.ellipse(s * 15, -19, 5.5, 14, s * -0.12, 0, TAU)
        g.fillStyle = col(WING)
        g.fill()
      }
    }
    dot(g, -7, -33, 7.6, col(PALE))
    dot(g, 7, -33, 7.6, col(PALE))
    for (const s of [-1, 1]) {
      if (wake > 0.5) {
        // At dusk the eyes are little amber lamps.
        dot(g, s * 7, -33, 4.6, night > 0.5 ? '#f6c259' : col('#d79a3a'))
        dot(g, s * 7, -33, 2.6, col('#33261e'))
      } else {
        g.beginPath()
        g.arc(s * 7, -34.5, 3.6, 0.15 * Math.PI, 0.85 * Math.PI)
        g.strokeStyle = col('#6b4a30')
        g.lineWidth = 1.7
        g.stroke()
      }
    }
    g.beginPath()
    g.moveTo(-2.6, -30.5)
    g.lineTo(0, -25.5)
    g.lineTo(2.6, -30.5)
    g.closePath()
    g.fillStyle = col('#e0a53e')
    g.fill()
    strip(g, -5, -1, -5, 1, 3, col('#e0a53e'))
    strip(g, 5, -1, 5, 1, 3, col('#e0a53e'))
  }
  g.save()
  g.translate(x + 2.5, y + 4)
  figure(() => SHADE, true)
  g.restore()
  g.save()
  g.translate(x, y)
  figure((c) => tone(c, night, lit), false)
  g.restore()
}
