import type { Act, Thing } from './rules'
import { GOLD, INK, blob, bump, cell, clamp, dye, line, soft, type G } from './silk'

// The six things, drawn about their middle, about 100 units across, facing
// outward (+x, toward the guest). `act` and `t` are what the hand that holds
// it is doing, and how long since.

export type Doing = { act: Act | null; t: number; over?: boolean }

const GROW: Record<Act, number> = { tip: 0.06, dab: 0.1, wave: 0.12, show: 0.2, self: 0.04 }

/** How far a thing is tipped by what its hand does. */
export function tipOf(thing: Thing, doing: Doing): number {
  if (doing.act === 'tip') return (thing === 'fan' ? 1.5 : thing === 'horn' ? 0.95 : 1.15) * clamp(doing.t < 0.9 || doing.over ? (doing.t + 0.12) * 6 : 1 - (doing.t - 0.9) * 4)
  if (doing.act === 'dab') return 0.5 * bump(doing.t / 0.7)
  if (doing.act === 'self') return -0.8 * bump(doing.t / 1.2)
  if (doing.act === 'wave') return 0.6 * Math.sin(doing.t * 22) * clamp(0.8 - doing.t)
  if (doing.act === 'show') return 0.2 * Math.sin(doing.t * 16) * clamp(1.2 - doing.t)
  return 0
}

export function paintThing(g: G, thing: Thing, doing: Doing, time: number): void {
  const k = doing.act && doing.t < 1.2 ? bump(clamp(doing.t / 1.1)) : 0
  const grow = doing.act ? 1 + GROW[doing.act] * k : 1
  g.save()
  g.scale(grow, grow)
  switch (thing) {
    case 'teapot':
      teapot(g, doing, k)
      break
    case 'glue':
      glue(g, k)
      break
    case 'fan':
      fan(g, doing, k)
      break
    case 'fish':
      fish(g, doing, k, time)
      break
    case 'duster':
      duster(g, doing, k, time)
      break
    case 'horn':
      horn(g, doing, k)
      break
  }
  g.restore()
}

function teapot(g: G, doing: Doing, k: number): void {
  g.beginPath()
  g.moveTo(22, 12)
  g.quadraticCurveTo(52, 8, 50, -26)
  g.lineTo(64, -32)
  g.quadraticCurveTo(70, 26, 24, 32)
  cell(g, '#3fb7c9', 4)
  g.beginPath()
  g.ellipse(-40, 2, 20, 24, 0, 0.6, Math.PI * 2 - 0.6)
  g.strokeStyle = GOLD
  g.lineWidth = 13
  g.stroke()
  g.strokeStyle = '#2d93ab'
  g.lineWidth = 6
  g.stroke()
  blob(g, 0, 8, 40, 34)
  cell(g, dye(g, '#3fb7c9', 44))
  g.save()
  g.translate(0, -26 - (doing.act === 'show' ? k * 18 + Math.abs(Math.sin(doing.t * 26)) * 8 * k : 0))
  g.rotate(doing.act === 'show' ? Math.sin(doing.t * 30) * 0.3 * k : 0)
  blob(g, 0, 2, 25, 10)
  cell(g, '#2d93ab', 4)
  blob(g, 0, -11, 8, 8)
  cell(g, '#f7b733', 3)
  g.restore()
  blob(g, -2, 12, 13, 11)
  cell(g, '#ff8f7a', 3)
  blob(g, -2, 12, 4, 4)
  cell(g, '#ffe08a', 2)
}

function glue(g: G, k: number): void {
  soft(g, [[-36, -18], [36, -18], [40, 34], [26, 44], [-26, 44], [-40, 34]])
  cell(g, dye(g, '#e2572f', 44))
  blob(g, 0, -20, 37, 12)
  cell(g, '#fff7ea', 4)
  soft(g, [[-34, -14], [-20, -14], [-18, 16 + k * 16], [-25, 24 + k * 20], [-33, 10]])
  cell(g, '#fff7ea', 3)
  soft(g, [[16, -12], [32, -14], [30, 8 + k * 8], [22, 14 + k * 8]])
  cell(g, '#fff7ea', 3)
  line(g, [[6, -24], [32, -64]], GOLD, 13)
  line(g, [[6, -24], [32, -64]], '#8a521c', 7)
  soft(g, [[-6, -16], [12, -16], [10, -38], [-2, -36]])
  cell(g, '#ffd873', 3)
}

function fan(g: G, doing: Doing, k: number): void {
  const open = doing.act === 'show' ? 0.9 + k * 0.75 : 0.9 + (doing.act === 'wave' ? 0.1 * Math.sin(doing.t * 30) : 0)
  const blades = 7
  g.save()
  g.translate(-10, 36)
  for (let i = 0; i < blades; i++) {
    const a = -Math.PI / 2 + 0.2 + ((i - (blades - 1) / 2) / (blades - 1)) * open * 2
    g.save()
    g.rotate(a)
    g.beginPath()
    g.moveTo(0, 0)
    g.lineTo(66, -15)
    g.quadraticCurveTo(90, 0, 66, 15)
    g.closePath()
    cell(g, ['#ff5d8f', '#ffd873', '#8f5bd6', '#ff8f4a', '#ff5d8f', '#ffd873', '#8f5bd6'][i], 3)
    g.restore()
  }
  blob(g, 0, 0, 9, 9)
  cell(g, '#f7b733', 3)
  line(g, [[0, 8], [-8, 30]], '#ff5d8f', 5)
  g.restore()
}

function fish(g: G, doing: Doing, k: number, time: number): void {
  const bend = doing.act === 'show' ? Math.sin(doing.t * 30) * 22 * k : doing.act === 'wave' ? Math.sin(doing.t * 26) * 16 * clamp(0.9 - doing.t) : Math.sin(time * 2.6) * 2
  g.beginPath()
  g.moveTo(-34, 0)
  g.lineTo(-62, -22 + bend)
  g.quadraticCurveTo(-52, 0 + bend, -62, 24 + bend)
  g.closePath()
  cell(g, '#f58a2b', 4)
  g.beginPath()
  g.moveTo(-40, 0)
  g.bezierCurveTo(-18, -44, 44, -38, 60, -4)
  g.bezierCurveTo(48, 36, -18, 40, -40, 0)
  cell(g, dye(g, '#4f9be8', 60))
  g.beginPath()
  g.moveTo(-4, -28)
  g.quadraticCurveTo(10, -52, 30, -28)
  cell(g, '#f58a2b', 3)
  for (const [x, y] of [[-14, -6], [2, 6], [-12, 12], [6, -14]]) {
    g.beginPath()
    g.arc(x, y, 9, -0.9, 0.9)
    g.strokeStyle = GOLD
    g.lineWidth = 2.4
    g.stroke()
  }
  blob(g, 36, -10, 9, 10)
  cell(g, '#ffffff', 3)
  blob(g, 38, -9, 4, 5)
  g.fillStyle = INK
  g.fill()
  const pout = doing.act === 'dab' || doing.act === 'self' ? 5 * Math.abs(Math.sin(doing.t * 14)) : 0
  blob(g, 60 + pout, 2, 8 + pout, 7)
  cell(g, '#ff7d8f', 3)
}

function duster(g: G, doing: Doing, k: number, time: number): void {
  line(g, [[-58, 34], [-8, 6]], GOLD, 17)
  line(g, [[-58, 34], [-8, 6]], '#8a521c', 10)
  const spread = 1 + (doing.act === 'show' ? 0.5 * k : 0)
  const tints = ['#f25c9a', '#ffb3cf', '#f7b733', '#f25c9a', '#ffb3cf', '#f7b733', '#f25c9a']
  g.save()
  g.translate(-6, 4)
  for (let i = 0; i < 7; i++) {
    const a = -0.5 + (i - 3) * 0.42 * spread + Math.sin(time * 4 + i * 1.7) * 0.05 + (doing.act === 'wave' ? Math.sin(doing.t * 28 + i) * 0.2 * clamp(1 - doing.t) : 0)
    g.save()
    g.rotate(a)
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(22, -20, 62, -6)
    g.quadraticCurveTo(74, 4, 58, 10)
    g.quadraticCurveTo(24, 20, 0, 0)
    cell(g, tints[i], 3)
    g.restore()
  }
  if (doing.act === 'show' && k > 0.1) {
    g.save()
    g.translate(34 * k, -22 * k)
    blob(g, 0, 0, 17, 16)
    cell(g, '#ffe36b', 3)
    blob(g, 4, -4, 3, 4)
    g.fillStyle = INK
    g.fill()
    g.beginPath()
    g.moveTo(14, 0)
    g.lineTo(27, 3 - 4 * Math.abs(Math.sin(doing.t * 18)))
    g.lineTo(14, 8)
    cell(g, '#f58a2b', 2)
    g.restore()
  }
  g.restore()
}

function horn(g: G, doing: Doing, k: number): void {
  const swell = doing.act === 'wave' || doing.act === 'dab' || doing.act === 'show' ? k : 0
  g.beginPath()
  g.ellipse(-12, 4, 25, 25, 0, 0, Math.PI * 2)
  g.strokeStyle = GOLD
  g.lineWidth = 17
  g.stroke()
  g.strokeStyle = '#f2b23a'
  g.lineWidth = 9
  g.stroke()
  line(g, [[-12, -21], [-58, -17]], GOLD, 14)
  line(g, [[-12, -21], [-58, -17]], '#f2b23a', 7)
  blob(g, -58, -17, 6, 9)
  cell(g, '#c8781c', 3)
  g.beginPath()
  g.moveTo(-10, 22)
  g.quadraticCurveTo(26, 24, 44, -14 - swell * 12)
  g.quadraticCurveTo(64 + swell * 20, 12, 58, 48 + swell * 14)
  g.quadraticCurveTo(24, 34, -10, 36)
  g.closePath()
  cell(g, '#f2b23a', 4)
  blob(g, 51 + swell * 5, 17 + swell, 11 + swell * 6, 34 + swell * 14, -0.2)
  cell(g, '#7c2f3d', 4)
}
