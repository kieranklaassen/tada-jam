// Who the lantern finds in the wood. Each is drawn from a few soft shapes with
// a calm face: two eyes, a small nose. Nothing here is frightening, and
// nothing reacts to being left.

import { TAU } from '../../kit/math.ts'
import type { G } from './art.ts'

// An owl perched at (x, y). `wake` 0 is asleep, 1 has its eyes open.
export function drawOwl(g: G, x: number, y: number, wake: number, look: number, breathe: number, blink: number, bob: number): void {
  g.save()
  g.translate(x, y)
  // Tail below the branch, toes over it.
  g.fillStyle = '#5f3d26'
  g.beginPath()
  g.moveTo(-12, -6)
  g.lineTo(0, 30)
  g.lineTo(13, -6)
  g.closePath()
  g.fill()
  g.scale(1 + breathe * 0.018, 1 - breathe * 0.012 + bob * 0.05)
  // Body and folded wings.
  g.fillStyle = '#8c5e3c'
  g.beginPath()
  g.ellipse(0, -50, 41, 54, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#e4c99e'
  g.beginPath()
  g.ellipse(0, -40, 27, 38, 0, 0, TAU)
  g.fill()
  g.strokeStyle = '#b28558'
  g.lineWidth = 2.2
  for (let row = 0; row < 4; row++) {
    for (let i = -1; i <= 1; i++) {
      const sx = i * 14 + (row % 2) * 7 - 3.5
      const sy = -52 + row * 13
      if (Math.abs(sx) > 22 - row * 2) continue
      g.beginPath()
      g.arc(sx, sy, 5.5, 0.15 * Math.PI, 0.85 * Math.PI)
      g.stroke()
    }
  }
  g.fillStyle = '#6f4629'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.ellipse(side * 33, -46, 13, 40, side * 0.12, 0, TAU)
    g.fill()
  }
  // Head, turning a little toward the light.
  g.translate(0, -96)
  g.rotate(look * 0.16)
  g.fillStyle = '#8c5e3c'
  g.beginPath()
  g.ellipse(0, 0, 44, 35, 0, 0, TAU)
  g.fill()
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(side * 20, -27)
    g.quadraticCurveTo(side * 36, -52, side * 40, -22)
    g.closePath()
    g.fill()
  }
  g.fillStyle = '#ecd9b4'
  for (const side of [-1, 1]) {
    g.beginPath()
    g.arc(side * 18, 1, 20, 0, TAU)
    g.fill()
  }
  // Never wide-eyed: the lids stay a little lowered, calm rather than startled.
  const open = Math.max(0, wake * 0.8 * (1 - blink))
  for (const side of [-1, 1]) {
    const ex = side * 18
    if (open > 0.08) {
      g.save()
      g.beginPath()
      g.ellipse(ex, 2, 12, 12 * open, 0, 0, TAU)
      g.clip()
      g.fillStyle = '#e2a02e'
      g.fillRect(ex - 13, -12, 26, 28)
      g.fillStyle = '#2a1c14'
      g.beginPath()
      g.arc(ex + look * 3, 2, 7, 0, TAU)
      g.fill()
      g.fillStyle = 'rgba(255,255,255,0.85)'
      g.beginPath()
      g.arc(ex + look * 3 - 2.4, -0.6, 2.2, 0, TAU)
      g.fill()
      g.restore()
    }
    // The lid: a soft curve whether the eye is open a crack or shut.
    g.strokeStyle = '#7a5234'
    g.lineWidth = 2.6
    g.beginPath()
    if (open > 0.08) g.ellipse(ex, 2, 12, 12 * open, 0, Math.PI, TAU)
    else g.arc(ex, -2, 11, 0.12 * Math.PI, 0.88 * Math.PI)
    g.stroke()
  }
  g.fillStyle = '#d9962e'
  g.beginPath()
  g.moveTo(-5, 8)
  g.quadraticCurveTo(0, 5, 5, 8)
  g.quadraticCurveTo(1, 20, 0, 21)
  g.quadraticCurveTo(-1, 20, -5, 8)
  g.fill()
  g.restore()
  g.strokeStyle = '#d9962e'
  g.lineWidth = 4
  for (const side of [-1, 1]) {
    for (let k = -1; k <= 1; k++) {
      g.beginPath()
      g.moveTo(x + side * 13 + k * 4.5, y - 3)
      g.lineTo(x + side * 13 + k * 5.5, y + 5)
      g.stroke()
    }
  }
}

// A hedgehog with its feet on (x, y). `uncurl` 0 is a ball of spines.
export function drawHedgehog(g: G, x: number, y: number, uncurl: number, dir: number, step: number, sniff: number): void {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  const bobY = Math.abs(Math.sin(step)) * 1.6 * uncurl
  // Feet.
  if (uncurl > 0.3) {
    g.fillStyle = '#b98d62'
    for (const [fx, ph] of [[-26, 0], [-6, Math.PI], [18, 0.5], [32, Math.PI + 0.5]] as const) {
      g.beginPath()
      g.ellipse(fx + Math.sin(step + ph) * 5, 1 - Math.max(0, Math.cos(step + ph)) * 3, 7, 4, 0, 0, TAU)
      g.fill()
    }
  }
  g.translate(0, -bobY)
  // The face slides out from under the spines.
  const fx = 30 + 24 * uncurl
  if (uncurl > 0.02) {
    g.save()
    g.translate(fx, -15 - sniff * 4)
    g.rotate(-sniff * 0.22)
    g.fillStyle = '#b98d62'
    g.beginPath()
    g.arc(-9, -13, 7, 0, TAU)
    g.fill()
    g.fillStyle = '#dcbd90'
    g.beginPath()
    g.moveTo(-22, -15)
    g.quadraticCurveTo(4, -20, 30, 2)
    g.quadraticCurveTo(8, 16, -22, 13)
    g.closePath()
    g.fill()
    g.fillStyle = '#2a1c14'
    g.beginPath()
    g.arc(29, 2, 4.6, 0, TAU)
    g.fill()
    g.beginPath()
    g.arc(6, -5, 3, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.8)'
    g.beginPath()
    g.arc(5, -6, 1, 0, TAU)
    g.fill()
    g.restore()
  }
  // The dome of spines.
  g.fillStyle = '#5b4332'
  g.beginPath()
  g.ellipse(0, -4, 54, 40, 0, Math.PI, TAU)
  g.quadraticCurveTo(52, 6, 30, 5)
  g.lineTo(-34, 5)
  g.quadraticCurveTo(-56, 6, -54, -4)
  g.fill()
  for (let ring = 0; ring < 4; ring++) {
    const rx = 54 - ring * 11
    const ry = 40 - ring * 9
    const n = 19 - ring * 4
    for (let i = 0; i <= n; i++) {
      const a = Math.PI * 1.04 + (i / n) * Math.PI * 0.92 + (ring % 2) * 0.07
      const j = ((i * 37 + ring * 11) % 7) / 7 - 0.5
      const bx = Math.cos(a) * rx * 0.86
      const by = -4 + Math.sin(a) * ry * 0.86
      const tx = Math.cos(a + j * 0.2) * (rx + 9)
      const ty = -4 + Math.sin(a + j * 0.2) * (ry + 9)
      g.strokeStyle = '#3d2c20'
      g.lineWidth = 3
      g.beginPath()
      g.moveTo(bx, by)
      g.lineTo(tx, ty)
      g.stroke()
      g.strokeStyle = '#cdb084'
      g.lineWidth = 1.6
      g.beginPath()
      g.moveTo((bx + tx) / 2, (by + ty) / 2)
      g.lineTo(tx, ty)
      g.stroke()
    }
  }
  g.restore()
}

function foxHead(g: G, blink: number, ear: number): void {
  // Ears.
  for (const [ex, tilt] of [[-13, -0.18 - ear * 0.2], [9, 0.12 + ear * 0.12]] as const) {
    g.save()
    g.translate(ex, -15)
    g.rotate(tilt)
    g.fillStyle = '#cf6a2c'
    g.beginPath()
    g.moveTo(-10, 2)
    g.quadraticCurveTo(-5, -22, 1, -30)
    g.quadraticCurveTo(8, -18, 11, 2)
    g.closePath()
    g.fill()
    g.fillStyle = '#3a2a22'
    g.beginPath()
    g.moveTo(-4, -17)
    g.quadraticCurveTo(-1, -26, 1, -30)
    g.quadraticCurveTo(4, -24, 6, -16)
    g.closePath()
    g.fill()
    g.fillStyle = '#f1d9c0'
    g.beginPath()
    g.moveTo(-4, 0)
    g.quadraticCurveTo(0, -13, 1, -15)
    g.quadraticCurveTo(4, -9, 5, 0)
    g.closePath()
    g.fill()
    g.restore()
  }
  // Skull and muzzle, pointing right.
  g.fillStyle = '#cf6a2c'
  g.beginPath()
  g.moveTo(-26, 0)
  g.quadraticCurveTo(-24, -24, 0, -22)
  g.quadraticCurveTo(22, -20, 44, 6)
  g.quadraticCurveTo(22, 20, 0, 21)
  g.quadraticCurveTo(-26, 20, -26, 0)
  g.fill()
  g.fillStyle = '#f6ecd9'
  g.beginPath()
  g.moveTo(44, 6)
  g.quadraticCurveTo(22, 20, 0, 21)
  g.quadraticCurveTo(-22, 20, -25, 6)
  g.quadraticCurveTo(-6, 14, 12, 6)
  g.quadraticCurveTo(28, 2, 44, 6)
  g.fill()
  g.fillStyle = '#2a1c14'
  g.beginPath()
  g.ellipse(43, 5.5, 4.6, 3.8, 0, 0, TAU)
  g.fill()
  if (blink > 0.5) {
    g.strokeStyle = '#2a1c14'
    g.lineWidth = 2
    g.beginPath()
    g.arc(9, -6, 4, 0.1 * Math.PI, 0.9 * Math.PI)
    g.stroke()
  } else {
    g.beginPath()
    g.ellipse(9, -4, 3.4, 4, 0.2, 0, TAU)
    g.fill()
    g.fillStyle = 'rgba(255,255,255,0.85)'
    g.beginPath()
    g.arc(8, -5.4, 1.2, 0, TAU)
    g.fill()
  }
}

// A fox sitting on (x, y), facing `dir`, its head turned by `look`.
export function drawFoxSit(g: G, x: number, y: number, dir: number, look: number, blink: number, ear: number, breathe: number): void {
  g.save()
  g.translate(x, y)
  g.scale(dir, 1)
  // Tail curled forward along the ground.
  g.strokeStyle = '#cf6a2c'
  g.lineWidth = 24
  g.beginPath()
  g.moveTo(-34, -14)
  g.quadraticCurveTo(-64, -4, -40, -9)
  g.quadraticCurveTo(-10, 2, 30, -8)
  g.stroke()
  g.strokeStyle = '#f6ecd9'
  g.lineWidth = 19
  g.beginPath()
  g.moveTo(30, -8)
  g.lineTo(38, -9)
  g.stroke()
  // Body: haunches wide, shoulders narrow.
  g.fillStyle = '#cf6a2c'
  g.beginPath()
  g.moveTo(-40, -2)
  g.quadraticCurveTo(-50, -44, -18, -70 - breathe * 1.5)
  g.quadraticCurveTo(0, -100, 20, -96)
  g.quadraticCurveTo(30, -60, 26, -2)
  g.closePath()
  g.fill()
  g.fillStyle = '#bf5e25'
  g.beginPath()
  g.ellipse(-20, -22, 22, 22, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#f6ecd9'
  g.beginPath()
  g.ellipse(17, -56 - breathe, 11, 26, 0.08, 0, TAU)
  g.fill()
  // Front legs with dark socks.
  for (const lx of [8, 21]) {
    g.strokeStyle = '#cf6a2c'
    g.lineWidth = 10
    g.beginPath()
    g.moveTo(lx, -40)
    g.lineTo(lx + 1, -16)
    g.stroke()
    g.strokeStyle = '#3a2a22'
    g.beginPath()
    g.moveTo(lx + 1, -16)
    g.lineTo(lx + 2, -4)
    g.stroke()
  }
  g.translate(16, -112 - breathe)
  g.rotate(look * 0.3)
  foxHead(g, blink, ear)
  g.restore()
}

// The same fox walking; `phase` drives its legs.
export function drawFoxWalk(g: G, x: number, y: number, dir: number, phase: number, blink: number): void {
  g.save()
  g.translate(x, y - Math.abs(Math.sin(phase)) * 3)
  g.scale(dir, 1)
  const leg = (hx: number, ph: number, far: boolean) => {
    const sw = Math.sin(phase + ph)
    const lift = Math.max(0, Math.cos(phase + ph)) * 7
    const fx = hx + sw * 15
    g.strokeStyle = far ? '#a9531f' : '#cf6a2c'
    g.lineWidth = 9
    g.beginPath()
    g.moveTo(hx, -44)
    g.quadraticCurveTo(hx + sw * 5 - 2, -26, hx + sw * 10, -18 - lift * 0.5)
    g.stroke()
    g.strokeStyle = far ? '#2c201a' : '#3a2a22'
    g.lineWidth = 8
    g.beginPath()
    g.moveTo(hx + sw * 10, -18 - lift * 0.5)
    g.lineTo(fx, -4 - lift)
    g.stroke()
  }
  leg(-30, Math.PI, true)
  leg(30, 0, true)
  // Tail, streaming behind with a white tip.
  const sway = Math.sin(phase * 0.5) * 5
  g.strokeStyle = '#cf6a2c'
  g.lineWidth = 22
  g.beginPath()
  g.moveTo(-44, -54)
  g.quadraticCurveTo(-76, -58 + sway, -100, -42 + sway)
  g.stroke()
  g.strokeStyle = '#f6ecd9'
  g.lineWidth = 17
  g.beginPath()
  g.moveTo(-100, -42 + sway)
  g.lineTo(-110, -38 + sway)
  g.stroke()
  g.fillStyle = '#cf6a2c'
  g.beginPath()
  g.ellipse(0, -54, 54, 21, 0, 0, TAU)
  g.fill()
  g.beginPath()
  g.ellipse(40, -62, 21, 19, -0.4, 0, TAU)
  g.fill()
  g.fillStyle = '#f6ecd9'
  g.beginPath()
  g.ellipse(4, -42, 40, 8, 0, 0, Math.PI)
  g.fill()
  leg(-34, 0, false)
  leg(26, Math.PI, false)
  g.translate(58, -80)
  g.rotate(0.08 + Math.sin(phase) * 0.03)
  foxHead(g, blink, 0)
  g.restore()
}

// A red-capped mushroom standing on (x, y). `wob` leans it.
export function drawMushroom(g: G, x: number, y: number, size: number, wob: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(wob)
  g.scale(size, size * (1 - Math.abs(wob) * 0.3))
  g.fillStyle = '#f1e4c8'
  g.beginPath()
  g.moveTo(-9, 2)
  g.quadraticCurveTo(-13, -22, -7, -46)
  g.lineTo(7, -46)
  g.quadraticCurveTo(13, -22, 10, 2)
  g.closePath()
  g.fill()
  g.fillStyle = 'rgba(150,120,90,0.35)'
  g.beginPath()
  g.ellipse(0, -43, 24, 5, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#c8402c'
  g.beginPath()
  g.moveTo(-36, -44)
  g.quadraticCurveTo(-34, -82, 0, -84)
  g.quadraticCurveTo(34, -82, 36, -44)
  g.quadraticCurveTo(0, -52, -36, -44)
  g.fill()
  g.fillStyle = '#f6ecd4'
  for (const [sx, sy, r] of [[-18, -60, 5], [2, -70, 6], [19, -58, 4.5], [-6, -52, 3.4], [10, -78, 3]] as const) {
    g.beginPath()
    g.ellipse(sx, sy, r, r * 0.8, 0, 0, TAU)
    g.fill()
  }
  g.restore()
}

export function drawMoth(g: G, x: number, y: number, flap: number, heading: number): void {
  g.save()
  g.translate(x, y)
  g.rotate(heading)
  g.fillStyle = '#f3e9d2'
  const w = Math.abs(Math.sin(flap))
  for (const side of [-1, 1]) {
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(side * 9 * w + side * 1.5, -9, side * 11 * w + side * 1, 3)
    g.quadraticCurveTo(side * 5 * w, 7, 0, 2)
    g.fill()
  }
  g.fillStyle = '#8f7a62'
  g.beginPath()
  g.ellipse(0, 1, 1.6, 4.6, 0, 0, TAU)
  g.fill()
  g.restore()
}

// A cat asleep, curled with its tail round its nose, resting on (x, y).
export function drawCat(g: G, x: number, y: number, breathe: number): void {
  g.save()
  g.translate(x, y)
  g.fillStyle = 'rgba(30,20,20,0.22)'
  g.beginPath()
  g.ellipse(0, 2, 46, 7, 0, 0, TAU)
  g.fill()
  g.fillStyle = '#4b4340'
  g.beginPath()
  g.ellipse(-2, -18 - breathe * 1.2, 40, 20 + breathe * 1.2, 0, 0, TAU)
  g.fill()
  // Head tucked to the right, ears up.
  g.beginPath()
  g.ellipse(27, -16, 18, 15, 0.2, 0, TAU)
  g.fill()
  for (const ex of [17, 33]) {
    g.beginPath()
    g.moveTo(ex - 6, -26)
    g.lineTo(ex, -40)
    g.lineTo(ex + 7, -25)
    g.closePath()
    g.fill()
  }
  // A white bib and muzzle.
  g.fillStyle = '#f2ece2'
  g.beginPath()
  g.ellipse(28, -10, 9, 7, 0, 0, TAU)
  g.fill()
  g.beginPath()
  g.ellipse(12, -5, 13, 6, 0.1, 0, TAU)
  g.fill()
  g.strokeStyle = '#211c1b'
  g.lineWidth = 1.8
  g.beginPath()
  g.arc(21, -17, 3.6, 0.1 * Math.PI, 0.9 * Math.PI)
  g.stroke()
  g.beginPath()
  g.arc(34, -16, 3.6, 0.1 * Math.PI, 0.9 * Math.PI)
  g.stroke()
  g.fillStyle = '#d99a94'
  g.beginPath()
  g.ellipse(28, -11.5, 2, 1.5, 0, 0, TAU)
  g.fill()
  // Tail wrapped round the front, with a white tip.
  g.strokeStyle = '#3d3634'
  g.lineWidth = 10
  g.beginPath()
  g.moveTo(-38, -10)
  g.quadraticCurveTo(-32, 4, 0, -1)
  g.stroke()
  g.strokeStyle = '#f2ece2'
  g.beginPath()
  g.moveTo(0, -1)
  g.lineTo(7, -1.6)
  g.stroke()
  g.restore()
}

// Far lanterns on the hill: a warm point, a faint halo and the small dark
// shape of whoever carries it.
export function drawFarLantern(g: G, x: number, y: number, size: number): void {
  // Drawn front to back: the caller is painting behind what is already there.
  g.fillStyle = '#ffd98a'
  g.beginPath()
  g.arc(x, y, 2.3 * size, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(255,186,90,0.22)'
  g.beginPath()
  g.arc(x, y, 7.5 * size, 0, TAU)
  g.fill()
  g.fillStyle = 'rgba(30,26,60,0.8)'
  g.fillRect(x - 3.4 * size, y + 1.5, 2.2 * size, 6 * size)
}
