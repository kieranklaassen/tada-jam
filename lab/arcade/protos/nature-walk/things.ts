// The treasures: seventeen small found things, each painted once at twice its
// size and reused on the path, in the basket and on the nature table.

import { TAU, dot, fillBlob, fillLeaf, leafPath, makeSprite, oval, rgba, rng, strokeLine } from './paint.ts'
import type { G, Sprite } from './paint.ts'
import type { Kind } from './seasons.ts'

export const KINDS: Kind[] = ['acorn', 'conker', 'feather', 'stone', 'shell', 'cone', 'berries', 'holly', 'fir', 'blossom', 'eggshell', 'catkin', 'primrose', 'daisy', 'strawberry', 'fern', 'oakleaf']

// Soft things land with a whisper, hard things with a small knock.
export const SOFT: Record<Kind, boolean> = {
  acorn: false,
  conker: false,
  feather: true,
  stone: false,
  shell: false,
  cone: false,
  berries: true,
  holly: true,
  fir: true,
  blossom: true,
  eggshell: false,
  catkin: true,
  primrose: true,
  daisy: true,
  strawberry: true,
  fern: true,
  oakleaf: true,
}

// Each thing has its own quiet note; nothing climbs.
export const NOTE: Record<Kind, number> = {
  acorn: -3,
  conker: -5,
  feather: 4,
  stone: -6,
  shell: 2,
  cone: -4,
  berries: 0,
  holly: -1,
  fir: -2,
  blossom: 3,
  eggshell: 5,
  catkin: 1,
  primrose: 2,
  daisy: 4,
  strawberry: 0,
  fern: -1,
  oakleaf: -2,
}

type Painter = (g: G, r: () => number) => void

const acorn: Painter = (g, r) => {
  g.rotate(0.35)
  fillBlob(g, 0, 9, 20, 26, '#c99a4e', r, 0.04, 11)
  g.globalAlpha = 0.3
  fillBlob(g, 8, 12, 10, 21, '#8a5a2c', r, 0.08)
  g.globalAlpha = 0.55
  oval(g, -8, 4, 3.5, 13, '#f6e2b2', 0.12)
  g.globalAlpha = 1
  dot(g, 0, 33, 2.6, '#7b5230')
  // The cup, with its rough scales.
  g.beginPath()
  g.ellipse(0, -8, 23, 19, 0, Math.PI, 0)
  g.quadraticCurveTo(0, 0, -23, -8)
  g.fillStyle = '#7b5631'
  g.fill()
  g.strokeStyle = rgba('#553a1f', 0.55)
  g.lineWidth = 1.5
  for (let row = 0; row < 3; row++) {
    for (let i = -3; i <= 3; i++) {
      const x = i * 6.2 + (row % 2) * 3
      const y = -11 - row * 5
      if (Math.abs(x) > 20 - row * 4) continue
      g.beginPath()
      g.arc(x, y, 3.2, 0.1 * Math.PI, 0.9 * Math.PI)
      g.stroke()
    }
  }
  g.globalAlpha = 0.35
  oval(g, -9, -17, 7, 4, '#b98c5c', -0.5)
  g.globalAlpha = 1
  strokeLine(g, [0, -26, 1, -32, 4, -37], '#5e4124', 4.5)
}

const conker: Painter = (g, r) => {
  fillBlob(g, 0, 3, 31, 29, '#7c3519', r, 0.035, 11)
  g.globalAlpha = 0.4
  fillBlob(g, 7, 11, 22, 19, '#4a1c0c', r, 0.08)
  g.globalAlpha = 0.45
  g.strokeStyle = '#a45a30'
  g.lineWidth = 1.6
  for (let i = 0; i < 3; i++) {
    g.beginPath()
    g.arc(-5, -3, 15 + i * 6, 0.35, 2.1)
    g.stroke()
  }
  g.globalAlpha = 1
  fillBlob(g, -8, -13, 16, 10, '#dcb98e', r, 0.1, 9, -0.4)
  g.globalAlpha = 0.6
  fillBlob(g, -9, -14, 9, 5, '#f3dfbf', r, 0.1, 8, -0.4)
  g.globalAlpha = 0.5
  g.strokeStyle = '#ffffff'
  g.lineWidth = 3.4
  g.beginPath()
  g.arc(0, 3, 23, -0.75, -0.15)
  g.stroke()
  g.globalAlpha = 1
}

const feather: Painter = (g) => {
  g.rotate(-0.55)
  // The vane: blue above the quill, pale below, barred like a jay's.
  g.beginPath()
  g.moveTo(-34, 5)
  g.quadraticCurveTo(-6, -27, 47, -7)
  g.quadraticCurveTo(8, 0, -34, 5)
  g.fillStyle = '#7fb0d6'
  g.fill()
  g.beginPath()
  g.moveTo(-34, 5)
  g.quadraticCurveTo(8, 0, 47, -7)
  g.quadraticCurveTo(10, 17, -34, 5)
  g.fillStyle = '#d7e4ee'
  g.fill()
  g.save()
  g.beginPath()
  g.moveTo(-34, 5)
  g.quadraticCurveTo(-6, -27, 47, -7)
  g.quadraticCurveTo(8, 0, -34, 5)
  g.clip()
  g.strokeStyle = '#25364d'
  g.lineWidth = 2.6
  for (let i = 0; i < 11; i++) {
    const x = -26 + i * 6.6
    g.beginPath()
    g.moveTo(x, 6)
    g.lineTo(x + 9, -24)
    g.stroke()
  }
  g.fillStyle = rgba('#25364d', 0.55)
  g.fillRect(30, -30, 30, 40)
  g.restore()
  g.strokeStyle = rgba('#8fa2b3', 0.6)
  g.lineWidth = 1
  for (let i = 0; i < 9; i++) {
    const x = -24 + i * 7.4
    g.beginPath()
    g.moveTo(x, 4 - i * 0.6)
    g.lineTo(x + 6, 9 - i * 0.9)
    g.stroke()
  }
  // Soft down at the base and the pale quill.
  g.strokeStyle = rgba('#f3f1ea', 0.9)
  g.lineWidth = 1.6
  for (let i = 0; i < 5; i++) {
    g.beginPath()
    g.moveTo(-33, 5)
    g.lineTo(-40 + i * 2, -3 + i * 4)
    g.stroke()
  }
  strokeLine(g, [-50, 8, -10, 3, 47, -7], '#f4efe4', 2.4)
}

const stone: Painter = (g, r) => {
  fillBlob(g, 0, 8, 35, 23, '#9ba3a6', r, 0.05, 11)
  g.globalAlpha = 0.38
  fillBlob(g, 6, 15, 27, 13, '#69727a', r, 0.08)
  g.globalAlpha = 0.45
  fillBlob(g, -9, -1, 19, 8, '#d3d8d8', r, 0.1)
  g.globalAlpha = 0.9
  strokeLine(g, [-27, 6, -6, -1, 14, 4, 29, 12], '#f0f1ec', 3)
  g.globalAlpha = 0.4
  for (let i = 0; i < 14; i++) dot(g, -24 + r() * 48, -4 + r() * 24, 0.8 + r() * 1.1, '#555d63')
  g.globalAlpha = 1
}

const shell: Painter = (g, r) => {
  fillBlob(g, 0, 3, 30, 28, '#e7c88f', r, 0.035, 11)
  g.globalAlpha = 0.45
  fillBlob(g, 7, 10, 21, 18, '#c2935a', r, 0.08)
  g.globalAlpha = 1
  // The spiral, wound from the lip to the middle.
  const spiral = (color: string, width: number, shift: number) => {
    g.beginPath()
    for (let i = 0; i <= 90; i++) {
      const t = i / 90
      const a = t * TAU * 2.6 + 0.7 + shift
      const rad = 25.5 * (1 - t * 0.94)
      const x = -1 + Math.cos(a) * rad
      const y = 2 + Math.sin(a) * rad
      if (i === 0) g.moveTo(x, y)
      else g.lineTo(x, y)
    }
    g.strokeStyle = color
    g.lineWidth = width
    g.stroke()
  }
  spiral(rgba('#f8ebc8', 0.7), 5, 0.22)
  spiral('#8a5b2e', 2.6, 0)
  g.save()
  g.translate(20, 20)
  g.rotate(0.7)
  oval(g, 0, 0, 11, 7, '#f6e8cb')
  g.strokeStyle = '#8a5b2e'
  g.lineWidth = 2
  g.stroke()
  g.restore()
  g.globalAlpha = 0.5
  g.strokeStyle = '#ffffff'
  g.lineWidth = 3
  g.beginPath()
  g.arc(0, 3, 22, -2.4, -1.6)
  g.stroke()
  g.globalAlpha = 1
}

const cone: Painter = (g, r) => {
  g.rotate(0.3)
  fillBlob(g, 0, 3, 23, 33, '#6f4a2b', r, 0.04, 11)
  for (let row = 0; row < 9; row++) {
    const y = -23 + row * 6.6
    const half = 22 * Math.sqrt(Math.max(0.05, 1 - ((y - 3) / 33) ** 2))
    const n = Math.max(1, Math.round(half / 5.4))
    for (let i = 0; i < n; i++) {
      const x = n === 1 ? 0 : -half + 4 + ((half * 2 - 8) * i) / (n - 1) + (row % 2) * 1.5
      g.beginPath()
      g.arc(x, y, 6.6, 0.05 * Math.PI, 0.95 * Math.PI)
      g.closePath()
      g.fillStyle = row % 2 === 0 ? '#9a6e44' : '#8b6139'
      g.fill()
      g.beginPath()
      g.arc(x, y, 6.6, 0.12 * Math.PI, 0.88 * Math.PI)
      g.strokeStyle = '#4f331b'
      g.lineWidth = 1.5
      g.stroke()
      g.beginPath()
      g.moveTo(x - 3.5, y + 0.6)
      g.lineTo(x + 3.5, y + 0.6)
      g.strokeStyle = rgba('#cda676', 0.75)
      g.lineWidth = 1.3
      g.stroke()
    }
  }
  strokeLine(g, [0, -30, -1, -36], '#4f331b', 4)
}

const berries: Painter = (g) => {
  strokeLine(g, [-34, -34, -14, -18, 4, 2], '#6b4a30', 3)
  for (const [x, y] of [[14, 0], [-8, 14], [20, 14], [8, 20]]) strokeLine(g, [2, 0, (x + 2) / 2, y / 2 - 2, x, y], '#6b4a30', 1.8)
  for (let i = 0; i < 4; i++) {
    fillLeaf(g, -28 + i * 4.5, -29 + i * 4, 17, 7, -2.5 + (i % 2) * 2.2 + i * 0.1, i % 2 ? '#789a48' : '#638a3e')
  }
  const at: [number, number, number][] = [[2, 6, 8.5], [15, 0, 8.5], [-9, 15, 9], [8, 19, 9.5], [21, 13, 8.5], [-2, 28, 8.5], [14, 30, 9], [27, 25, 8]]
  for (const [x, y, rad] of at) {
    dot(g, x, y, rad, '#d5482b')
    g.globalAlpha = 0.4
    dot(g, x + 1.6, y + 2.2, rad * 0.72, '#9c2c1a')
    g.globalAlpha = 0.75
    dot(g, x - rad * 0.32, y - rad * 0.36, rad * 0.24, '#ffffff')
    g.globalAlpha = 1
    dot(g, x + rad * 0.3, y + rad * 0.42, 1.5, '#4a1c12')
  }
}

function hollyLeaf(g: G, x: number, y: number, rot: number, len: number, wid: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(rot)
  g.beginPath()
  g.moveTo(0, 0)
  const n = 4
  for (const side of [-1, 1]) {
    for (let k = 1; k <= n; k++) {
      const i = side === -1 ? k : n + 1 - k
      const t = i / (n + 1)
      const tPrev = side === -1 ? (i - 0.5) / (n + 1) : (i + 0.5) / (n + 1)
      const bulge = Math.sin(Math.PI * t) * wid
      const dip = Math.sin(Math.PI * tPrev) * wid * 0.45
      g.quadraticCurveTo(tPrev * len, side * dip, t * len, side * bulge)
    }
    if (side === -1) g.quadraticCurveTo(len * 0.93, -wid * 0.2, len, 0)
    else g.quadraticCurveTo(len * 0.07, wid * 0.2, 0, 0)
  }
  g.closePath()
  g.fillStyle = '#2f6b45'
  g.fill()
  g.globalAlpha = 0.35
  leafPath(g, len * 0.9, wid * 0.5)
  g.fillStyle = '#5c9a68'
  g.fill()
  g.globalAlpha = 1
  strokeLine(g, [2, 0, len * 0.5, -1, len - 3, 0], '#a8cc92', 1.6)
  g.restore()
}

const holly: Painter = (g) => {
  hollyLeaf(g, -2, 6, -2.55, 42, 15)
  hollyLeaf(g, 2, 4, -0.55, 44, 16)
  hollyLeaf(g, 0, 8, 1.35, 36, 14)
  for (const [x, y] of [[-3, 5], [7, 9], [1, 15]]) {
    dot(g, x, y, 7.5, '#c9302a')
    g.globalAlpha = 0.4
    dot(g, x + 1.5, y + 2, 5.2, '#8f1f1c')
    g.globalAlpha = 0.8
    dot(g, x - 2.4, y - 2.6, 1.9, '#ffffff')
    g.globalAlpha = 1
  }
}

function needles(g: G, x0: number, y0: number, x1: number, y1: number, n: number, len: number): void {
  const ang = Math.atan2(y1 - y0, x1 - x0)
  g.lineWidth = 2.1
  for (let i = 0; i < n; i++) {
    const t = (i + 0.5) / n
    const x = x0 + (x1 - x0) * t
    const y = y0 + (y1 - y0) * t
    for (const side of [-1, 1]) {
      const a = ang + side * 0.95
      g.strokeStyle = (i + (side > 0 ? 1 : 0)) % 2 ? '#3f7355' : '#5b9068'
      g.beginPath()
      g.moveTo(x, y)
      g.lineTo(x + Math.cos(a) * len * (1 - t * 0.35), y + Math.sin(a) * len * (1 - t * 0.35))
      g.stroke()
    }
  }
}

const fir: Painter = (g) => {
  needles(g, -40, 22, 40, -20, 15, 12)
  needles(g, -12, 7, 10, 30, 7, 9)
  needles(g, 4, -1, -6, -30, 7, 9)
  needles(g, 20, -10, 38, 6, 5, 8)
  strokeLine(g, [-40, 22, 0, 2, 40, -20], '#6d4b30', 3)
  strokeLine(g, [-12, 7, 10, 30], '#6d4b30', 2.2)
  strokeLine(g, [4, -1, -6, -30], '#6d4b30', 2.2)
  strokeLine(g, [20, -10, 38, 6], '#6d4b30', 2)
  dot(g, -41, 23, 3, '#5a3d27')
}

function flower5(g: G, x: number, y: number, rad: number, petal: string, heart: string, rot: number): void {
  for (let i = 0; i < 5; i++) {
    const a = rot + (i / 5) * TAU
    oval(g, x + Math.cos(a) * rad * 0.62, y + Math.sin(a) * rad * 0.62, rad * 0.56, rad * 0.46, petal, a)
  }
  g.globalAlpha = 0.6
  dot(g, x, y, rad * 0.42, heart)
  g.globalAlpha = 1
  for (let i = 0; i < 5; i++) {
    const a = rot + 0.3 + (i / 5) * TAU
    dot(g, x + Math.cos(a) * rad * 0.24, y + Math.sin(a) * rad * 0.24, 1.2, '#d9a62c')
  }
}

const blossom: Painter = (g) => {
  strokeLine(g, [-42, 26, -12, 12, 16, -6, 40, -26], '#5b4033', 4)
  strokeLine(g, [-4, 7, 4, -16, 2, -30], '#5b4033', 2.6)
  fillLeaf(g, 20, -8, 15, 6, -1.7, '#9cc76a')
  fillLeaf(g, -20, 16, 14, 6, 1.2, '#8cba5e')
  flower5(g, -18, 4, 12, '#fbe0e7', '#f0a3b9', 0.2)
  flower5(g, 8, -6, 13, '#fde8ee', '#f0a3b9', 1.1)
  flower5(g, 2, -32, 11, '#fbdbe4', '#ee9db4', 0.6)
  flower5(g, 30, -22, 12, '#fde6ec', '#f0a3b9', 2)
  oval(g, 42, -30, 4.5, 6, '#ee9fb4', 0.6)
  oval(g, -32, 22, 4, 5.5, '#ee9fb4', -0.8)
}

const eggshell: Painter = (g, r) => {
  g.rotate(-0.28)
  oval(g, 0, -3, 25, 8, '#eef6f1')
  g.globalAlpha = 0.35
  oval(g, 3, -1, 19, 5, '#9fc8c6')
  g.globalAlpha = 1
  g.beginPath()
  const jag = [-25, -3, -19, 3, -13, -4, -7, 4, -1, -3, 5, 5, 11, -2, 17, 4, 25, -3]
  g.moveTo(jag[0], jag[1])
  for (let i = 2; i < jag.length; i += 2) g.lineTo(jag[i], jag[i + 1])
  g.bezierCurveTo(27, 22, 12, 31, 0, 31)
  g.bezierCurveTo(-12, 31, -27, 22, -25, -3)
  g.closePath()
  g.fillStyle = '#a4d6d4'
  g.fill()
  g.save()
  g.clip()
  g.globalAlpha = 0.45
  fillBlob(g, 9, 20, 22, 14, '#73b3b3', r, 0.1)
  g.globalAlpha = 0.5
  fillBlob(g, -11, 8, 9, 13, '#d3efeb', r, 0.1)
  g.globalAlpha = 0.6
  for (let i = 0; i < 14; i++) dot(g, -20 + r() * 40, 2 + r() * 26, 0.8 + r() * 1.2, '#8a6a4a')
  g.restore()
  g.globalAlpha = 1
}

const catkin: Painter = (g, r) => {
  strokeLine(g, [-34, 34, -8, 6, 12, -14, 30, -38], '#8a4b32', 3.6)
  const along: [number, number, number][] = [[-24, 23, -1], [-13, 12, 1], [-3, 1, -1], [8, -10, 1], [16, -20, -1], [25, -31, 1]]
  for (const [x, y, side] of along) {
    const a = -0.85 + side * 0.75
    const cx = x + Math.cos(a) * 9
    const cy = y + Math.sin(a) * 9
    oval(g, cx, cy, 10.5, 6.6, '#bdb7ab', a)
    oval(g, cx - 0.8, cy - 1, 9, 5.4, '#ece9e2', a)
    g.strokeStyle = rgba('#ffffff', 0.85)
    g.lineWidth = 1
    for (let i = 0; i < 9; i++) {
      const b = r() * TAU
      g.beginPath()
      g.moveTo(cx + Math.cos(b) * 5, cy + Math.sin(b) * 3.4)
      g.lineTo(cx + Math.cos(b) * 12, cy + Math.sin(b) * 8)
      g.stroke()
    }
    oval(g, x + Math.cos(a) * 1.5, y + Math.sin(a) * 1.5, 3.4, 2.6, '#55301f', a)
  }
}

const primrose: Painter = (g, r) => {
  fillBlob(g, -17, 22, 20, 9, '#7aa957', r, 0.14, 9, -0.5)
  fillBlob(g, 18, 24, 18, 8, '#88b662', r, 0.14, 9, 0.45)
  strokeLine(g, [-30, 28, -12, 20], '#5d8a43', 1.6)
  strokeLine(g, [30, 30, 14, 22], '#5d8a43', 1.6)
  strokeLine(g, [0, 30, 1, 14, 0, 0], '#8fb86a', 3.2)
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * TAU
    const px = Math.cos(a) * 13
    const py = -8 + Math.sin(a) * 13
    for (const side of [-1, 1]) {
      dot(g, px + Math.cos(a + side * 1.1) * 4.6, py + Math.sin(a + side * 1.1) * 4.6, 8.4, '#f7e78e')
    }
  }
  g.globalAlpha = 0.9
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i / 5) * TAU
    oval(g, Math.cos(a) * 6.5, -8 + Math.sin(a) * 6.5, 5.5, 3.2, '#ecb93a', a)
  }
  g.globalAlpha = 1
  dot(g, 0, -8, 3, '#b9c35a')
}

const daisy: Painter = (g) => {
  strokeLine(g, [8, 40, 5, 22, 0, 0], '#7fae5a', 3.2)
  fillLeaf(g, 6, 30, 22, 8, 0.5, '#7aa957')
  fillLeaf(g, 6, 34, 18, 7, 2.5, '#88b662')
  for (let i = 0; i < 15; i++) {
    const a = (i / 15) * TAU + 0.1
    oval(g, Math.cos(a) * 15, -10 + Math.sin(a) * 15, 10, 3.9, '#fdfbf4', a)
    g.strokeStyle = rgba('#b9b0c4', 0.45)
    g.lineWidth = 0.8
    g.stroke()
  }
  g.globalAlpha = 0.5
  for (let i = 0; i < 15; i += 3) {
    const a = (i / 15) * TAU + 0.1
    dot(g, Math.cos(a) * 23, -10 + Math.sin(a) * 23, 2.2, '#f2b9c9')
  }
  g.globalAlpha = 1
  dot(g, 0, -10, 8.6, '#f0c23b')
  g.globalAlpha = 0.5
  dot(g, 1.6, -8.4, 5.4, '#dc9a2a')
  g.globalAlpha = 1
}

const strawberry: Painter = (g, r) => {
  strokeLine(g, [-32, -30, -12, -18, 4, -2, 10, 6], '#6f9a50', 2.6)
  strokeLine(g, [-6, -12, 12, -16, 26, -10], '#6f9a50', 2)
  strokeLine(g, [-18, -22, -22, -6], '#6f9a50', 2)
  for (const a of [1.2, 2.1, 3.0]) {
    g.save()
    g.translate(-22, -4)
    g.rotate(a)
    fillBlob(g, 12, 0, 12, 8.5, a === 2.1 ? '#5f9a4c' : '#538c44', r, 0.16, 10)
    strokeLine(g, [2, 0, 21, 0], rgba('#bfe0a0', 0.6), 1.1)
    g.restore()
  }
  const berry = (x: number, y: number, s: number, color: string) => {
    g.beginPath()
    g.moveTo(x, y - 12 * s)
    g.bezierCurveTo(x + 16 * s, y - 14 * s, x + 14 * s, y + 6 * s, x, y + 17 * s)
    g.bezierCurveTo(x - 14 * s, y + 6 * s, x - 16 * s, y - 14 * s, x, y - 12 * s)
    g.fillStyle = color
    g.fill()
    g.globalAlpha = 0.5
    oval(g, x - 4 * s, y - 4 * s, 3.5 * s, 6 * s, '#ffffff', 0.3)
    g.globalAlpha = 1
    for (let i = 0; i < 9; i++) dot(g, x - 7 * s + r() * 14 * s, y - 6 * s + r() * 16 * s, 1.1, '#f6dd7a')
    for (let i = 0; i < 5; i++) fillLeaf(g, x, y - 11 * s, 9 * s, 4 * s, -Math.PI + (i / 4) * Math.PI, '#4f8a42')
  }
  berry(12, 20, 1, '#d63c2e')
  berry(30, -2, 0.7, '#e2674a')
  flower5(g, -34, -32, 8, '#ffffff', '#f6dd7a', 0.4)
}

const fern: Painter = (g) => {
  const at = (t: number): [number, number] => {
    const u = 1 - t
    return [u * u * -42 + 2 * u * t * -4 + t * t * 44, u * u * 30 + 2 * u * t * 4 + t * t * -30]
  }
  for (let i = 0; i < 13; i++) {
    const t = 0.1 + (i / 13) * 0.9
    const [x, y] = at(t)
    const [x2, y2] = at(Math.min(1, t + 0.02))
    const ang = Math.atan2(y2 - y, x2 - x)
    const len = 24 * (1 - t) ** 0.7 + 4
    for (const side of [-1, 1]) {
      fillLeaf(g, x, y, len, len * 0.42, ang + side * 1.1, i % 2 ? '#6fa055' : '#84b566')
    }
  }
  strokeLine(g, [-42, 30, -4, 4, 44, -30], '#4f7a3c', 2.6)
}

const oakleaf: Painter = (g) => {
  g.rotate(-0.45)
  const half = [5, 16, 10, 20, 12, 21, 12, 17, 6]
  const xs = (i: number) => -34 + i * 9.2
  g.beginPath()
  g.moveTo(-40, 0)
  for (let i = 0; i < half.length; i++) g.quadraticCurveTo(xs(i) - 3, -half[i] * 1.15, xs(i) + 4.6, -(half[i] + (half[i + 1] ?? 0)) / 2)
  g.quadraticCurveTo(48, -4, 50, 0)
  for (let i = half.length - 1; i >= 0; i--) g.quadraticCurveTo(xs(i) + 6, half[i] * 1.15, xs(i) - 4.6, (half[i] + (half[i - 1] ?? 0)) / 2)
  g.closePath()
  g.fillStyle = '#5f9448'
  g.fill()
  g.save()
  g.clip()
  g.globalAlpha = 0.4
  g.fillStyle = '#8fc068'
  g.fillRect(-44, -30, 100, 30)
  g.restore()
  g.globalAlpha = 1
  strokeLine(g, [-48, 1, 0, 0, 46, 0], '#3f6e33', 2)
  g.strokeStyle = rgba('#3f6e33', 0.7)
  g.lineWidth = 1.3
  for (let i = 1; i < half.length - 1; i += 2) {
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(xs(i) - 6, 0)
      g.lineTo(xs(i) + 1, side * half[i] * 0.7)
      g.stroke()
    }
  }
}

const PAINT: Record<Kind, Painter> = { acorn, conker, feather, stone, shell, cone, berries, holly, fir, blossom, eggshell, catkin, primrose, daisy, strawberry, fern, oakleaf }

export const THING_SIZE = 124

export function makeThings(): Record<Kind, Sprite> {
  const out = {} as Record<Kind, Sprite>
  KINDS.forEach((kind, i) => {
    out[kind] = makeSprite(THING_SIZE, THING_SIZE, THING_SIZE / 2, THING_SIZE / 2, 2, (g) => PAINT[kind](g, rng(900 + i * 17)))
  })
  return out
}
