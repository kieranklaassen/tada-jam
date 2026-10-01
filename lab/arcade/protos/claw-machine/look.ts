// What a prize looks like: a plush toy with a face, a gacha capsule, or the
// surprise that was inside one. Everything draws around (0, 0) in its own
// frame, so the caller places, spins and squashes it.

import { face, sprite } from '../../kit/draw.ts'
import type { Mood } from '../../kit/draw.ts'
import { TAU } from '../../kit/math.ts'

export interface Look {
  kind: 'plush' | 'capsule' | 'item'
  // Plush species index.
  sp: number
  // Capsule lid colour.
  color: string
  gold: boolean
  rainbow: boolean
  // The surprise, for items.
  emoji: string
  // 0 common, 1 rare, 2 super rare.
  rare: 0 | 1 | 2
}

type Ears = 'round' | 'long' | 'point' | 'bump' | 'horn' | 'antenna' | 'tuft'

interface Species {
  body: string
  dark: string
  belly: string
  ears: Ears
  patch?: boolean
}

export const SPECIES: readonly Species[] = [
  { body: '#d29558', dark: '#93602f', belly: '#f6dab0', ears: 'round' }, // bear
  { body: '#ffc4dd', dark: '#e57fb0', belly: '#fff2f8', ears: 'long' }, // bunny
  { body: '#ffb24a', dark: '#d97f22', belly: '#fff0d2', ears: 'point' }, // cat
  { body: '#86dc5c', dark: '#4a9f30', belly: '#defabf', ears: 'bump' }, // frog
  { body: '#ffffff', dark: '#34343f', belly: '#eeeef4', ears: 'round', patch: true }, // panda
  { body: '#ffe457', dark: '#dfae00', belly: '#fff8c2', ears: 'tuft' }, // chick
  { body: '#b48aff', dark: '#7747d0', belly: '#e6d8ff', ears: 'horn' }, // monster
  { body: '#62e2c9', dark: '#22a589', belly: '#ccfff4', ears: 'antenna' }, // alien
  { body: '#ff8a7a', dark: '#d2503f', belly: '#ffd9d2', ears: 'point' }, // fox
]

export const CAPSULE_COLORS = ['#ff5d7a', '#4db8ff', '#5ed36a', '#b07cff', '#ff9f43', '#ff7ac8'] as const
const RAINBOW = ['#ff5d5d', '#ffb02e', '#ffe14d', '#5ed36a', '#4db8ff', '#b07cff']

export function plushLook(sp: number): Look {
  return { kind: 'plush', sp, color: '', gold: false, rainbow: false, emoji: '', rare: 0 }
}

export function capsuleLook(color: string, gold = false, rainbow = false): Look {
  return { kind: 'capsule', sp: 0, color, gold, rainbow, emoji: '', rare: gold ? 2 : rainbow ? 1 : 0 }
}

export function itemLook(emoji: string, rare: 0 | 1 | 2): Look {
  return { kind: 'item', sp: 0, color: '', gold: false, rainbow: false, emoji, rare }
}

function blob(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, rot = 0): void {
  g.beginPath()
  g.ellipse(x, y, rx, ry, rot, 0, TAU)
  g.fillStyle = fill
  g.fill()
}

function drawEars(g: CanvasRenderingContext2D, s: Species, r: number, time: number, seed: number): void {
  const wiggle = Math.sin(time * 2.2 + seed) * 0.06
  for (const side of [-1, 1]) {
    if (s.ears === 'round') {
      blob(g, side * r * 0.68, -r * 0.72, r * 0.34, r * 0.34, s.dark)
      blob(g, side * r * 0.68, -r * 0.72, r * 0.26, r * 0.26, s.patch ? s.dark : s.body)
      if (!s.patch) blob(g, side * r * 0.68, -r * 0.7, r * 0.14, r * 0.14, s.belly)
    } else if (s.ears === 'long') {
      const rot = side * (0.22 + wiggle)
      blob(g, side * r * 0.42, -r * 1.18, r * 0.24, r * 0.62, s.dark, rot)
      blob(g, side * r * 0.42, -r * 1.18, r * 0.18, r * 0.56, s.body, rot)
      blob(g, side * r * 0.42, -r * 1.16, r * 0.09, r * 0.4, s.belly, rot)
    } else if (s.ears === 'point') {
      g.beginPath()
      g.moveTo(side * r * 0.95, -r * 0.35)
      g.lineTo(side * r * 0.82, -r * 1.22)
      g.lineTo(side * r * 0.22, -r * 0.85)
      g.closePath()
      g.fillStyle = s.body
      g.fill()
      g.lineWidth = r * 0.08
      g.lineJoin = 'round'
      g.strokeStyle = s.dark
      g.stroke()
      g.beginPath()
      g.moveTo(side * r * 0.78, -r * 0.62)
      g.lineTo(side * r * 0.74, -r * 1.02)
      g.lineTo(side * r * 0.46, -r * 0.84)
      g.closePath()
      g.fillStyle = s.belly
      g.fill()
    } else if (s.ears === 'bump') {
      blob(g, side * r * 0.48, -r * 0.82, r * 0.32, r * 0.32, s.dark)
      blob(g, side * r * 0.48, -r * 0.82, r * 0.25, r * 0.25, s.body)
    } else if (s.ears === 'horn') {
      g.beginPath()
      g.moveTo(side * r * 0.72, -r * 0.55)
      g.quadraticCurveTo(side * r * 1.0, -r * 1.0, side * r * 0.62, -r * 1.3)
      g.quadraticCurveTo(side * r * 0.6, -r * 0.95, side * r * 0.32, -r * 0.82)
      g.closePath()
      g.fillStyle = '#fff3c4'
      g.fill()
      g.lineWidth = r * 0.06
      g.strokeStyle = s.dark
      g.stroke()
    } else if (s.ears === 'antenna') {
      const tipX = side * r * (0.55 + wiggle * 2)
      g.beginPath()
      g.moveTo(side * r * 0.35, -r * 0.85)
      g.quadraticCurveTo(side * r * 0.38, -r * 1.2, tipX, -r * 1.32)
      g.lineWidth = r * 0.09
      g.lineCap = 'round'
      g.strokeStyle = s.dark
      g.stroke()
      blob(g, tipX, -r * 1.34, r * 0.15, r * 0.15, '#ffe14d')
    }
  }
  if (s.ears === 'tuft') {
    for (const lean of [-0.5, 0, 0.5]) {
      blob(g, lean * r * 0.3, -r * 1.05, r * 0.1, r * 0.28, s.dark, lean + wiggle)
    }
  }
}

// A round plush toy of radius r, sitting upright around (0, 0).
export function drawPlush(g: CanvasRenderingContext2D, sp: number, r: number, mood: Mood, lookX: number, lookY: number, blink: number, time: number, seed: number): void {
  const s = SPECIES[sp % SPECIES.length]!
  // Feet and paws behind the body.
  blob(g, -r * 0.46, r * 0.84, r * 0.32, r * 0.22, s.dark)
  blob(g, r * 0.46, r * 0.84, r * 0.32, r * 0.22, s.dark)
  blob(g, -r * 0.95, r * 0.18, r * 0.2, r * 0.3, s.dark, 0.4)
  blob(g, r * 0.95, r * 0.18, r * 0.2, r * 0.3, s.dark, -0.4)
  drawEars(g, s, r, time, seed)

  g.beginPath()
  g.arc(0, 0, r, 0, TAU)
  g.fillStyle = s.body
  g.fill()
  g.lineWidth = r * 0.08
  g.strokeStyle = s.dark
  g.stroke()

  blob(g, 0, r * 0.42, r * 0.58, r * 0.44, s.belly)
  if (s.patch) {
    blob(g, -r * 0.34, -r * 0.2, r * 0.26, r * 0.32, s.dark, 0.35)
    blob(g, r * 0.34, -r * 0.2, r * 0.26, r * 0.32, s.dark, -0.35)
  }
  blob(g, -r * 0.62, r * 0.12, r * 0.15, r * 0.11, 'rgba(255,110,140,0.45)')
  blob(g, r * 0.62, r * 0.12, r * 0.15, r * 0.11, 'rgba(255,110,140,0.45)')
  face(g, 0, -r * 0.2, r * 0.19, mood, lookX, lookY, blink)
  blob(g, -r * 0.42, -r * 0.62, r * 0.22, r * 0.11, 'rgba(255,255,255,0.4)', -0.6)
}

// part: 0 whole, 1 only the lid, 2 only the cup.
export function drawCapsule(g: CanvasRenderingContext2D, look: Look, r: number, time: number, part: 0 | 1 | 2 = 0): void {
  const lid = look.gold ? '#ffc629' : look.color
  const cup = look.gold ? '#fff0b3' : '#f6f7fb'
  const edge = look.gold ? '#b57b00' : 'rgba(40,30,70,0.55)'
  if (part !== 1) {
    g.beginPath()
    g.arc(0, 0, r, 0, Math.PI)
    g.closePath()
    g.fillStyle = cup
    g.fill()
    g.lineWidth = r * 0.08
    g.lineJoin = 'round'
    g.strokeStyle = edge
    g.stroke()
    blob(g, r * 0.3, r * 0.5, r * 0.3, r * 0.16, 'rgba(120,130,170,0.18)', -0.5)
  }
  if (part !== 2) {
    if (look.rainbow) {
      const n = RAINBOW.length
      for (let i = 0; i < n; i++) {
        g.beginPath()
        g.moveTo(0, 0)
        g.arc(0, 0, r, Math.PI + (i / n) * Math.PI, Math.PI + ((i + 1) / n) * Math.PI + 0.02)
        g.closePath()
        g.fillStyle = RAINBOW[(i + Math.floor(time * 3)) % n]!
        g.fill()
      }
      g.beginPath()
      g.arc(0, 0, r, Math.PI, TAU)
      g.closePath()
    } else {
      g.beginPath()
      g.arc(0, 0, r, Math.PI, TAU)
      g.closePath()
      g.fillStyle = lid
      g.fill()
    }
    g.lineWidth = r * 0.08
    g.lineJoin = 'round'
    g.strokeStyle = edge
    g.stroke()
    // Shine on the lid.
    g.beginPath()
    g.arc(0, 0, r * 0.74, Math.PI * 1.12, Math.PI * 1.42)
    g.lineWidth = r * 0.13
    g.lineCap = 'round'
    g.strokeStyle = 'rgba(255,255,255,0.75)'
    g.stroke()
  }
  if (part === 0) {
    g.beginPath()
    g.moveTo(-r, 0)
    g.lineTo(r, 0)
    g.lineWidth = r * 0.17
    g.lineCap = 'butt'
    g.strokeStyle = look.gold ? '#e89b00' : 'rgba(40,30,70,0.35)'
    g.stroke()
    if (look.gold || look.rainbow) {
      sprite(g, '⭐', 0, 0, r * 0.62)
    } else {
      blob(g, 0, 0, r * 0.15, r * 0.15, '#ffffff')
    }
  }
}

export function drawItem(g: CanvasRenderingContext2D, look: Look, r: number, time: number): void {
  if (look.rare > 0) {
    // A slowly turning gold badge so a rare prize reads as rare on the shelf.
    g.save()
    g.rotate(time * 0.8)
    g.beginPath()
    const points = 10
    for (let i = 0; i < points * 2; i++) {
      const a = (i / (points * 2)) * TAU
      const rr = i % 2 === 0 ? r * 1.12 : r * 0.9
      if (i === 0) g.moveTo(Math.cos(a) * rr, Math.sin(a) * rr)
      else g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr)
    }
    g.closePath()
    g.fillStyle = look.rare === 2 ? '#ffd23f' : '#ffe9a0'
    g.fill()
    g.lineWidth = r * 0.07
    g.lineJoin = 'round'
    g.strokeStyle = look.rare === 2 ? '#e08a00' : '#f0b429'
    g.stroke()
    g.restore()
  }
  sprite(g, look.emoji, 0, 0, r * 1.7)
}

export function drawLook(g: CanvasRenderingContext2D, look: Look, r: number, mood: Mood, lookX: number, lookY: number, blink: number, time: number, seed: number): void {
  if (look.kind === 'plush') drawPlush(g, look.sp, r, mood, lookX, lookY, blink, time, seed)
  else if (look.kind === 'capsule') drawCapsule(g, look, r, time)
  else drawItem(g, look, r, time)
}
