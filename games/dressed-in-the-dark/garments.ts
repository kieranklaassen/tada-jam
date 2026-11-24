import { C, type Pen } from './lacquer'
import { SLOT, type Garment } from './things'

// The nine garments. Each is drawn once as it is worn, fitted to a head, a body or a foot, and the same drawing
// hangs on the line. `pop` is how far its own small show has got, 0 to 1, and `time` turns what never stands still.

/** How much higher, in its own width, the next hat sits on it. */
export const HAT_RISE: Partial<Record<Garment, number>> = { pan: 0.46, bell: 0.5, feather: 0.4 }

/** A hat whose brim is `w` wide and sits on y = 0. */
export function drawHat(pen: Pen, garment: Garment, w: number, pop: number, time: number): void {
  const ctx = pen.ctx, h = w / 2, wag = Math.sin(pop * Math.PI * 6) * (1 - pop)
  if (garment === 'pan') {
    ctx.save()
    ctx.translate(0, -w * 0.18)
    ctx.scale(pop > 0 ? Math.cos(pop * Math.PI * 4) || 0.1 : 1, 1)
    pen.box(h * 0.72, -w * 0.2, w * 0.62, w * 0.11, 5, C.brown)
    pen.ell(h * 0.72 + w * 0.55, -w * 0.145, 3, 3, C.gold, 1)
    ctx.beginPath()
    ctx.moveTo(-h * 0.92, w * 0.18); ctx.lineTo(-h * 0.8, -w * 0.34)
    ctx.quadraticCurveTo(0, -w * 0.46, h * 0.8, -w * 0.34)
    ctx.lineTo(h * 0.92, w * 0.18)
    ctx.quadraticCurveTo(0, w * 0.3, -h * 0.92, w * 0.18)
    pen.paint(C.silver)
    pen.wire([-h * 0.6, w * 0.12, -h * 0.55, -w * 0.1, -h * 0.5, -w * 0.27], 4, pen.tone(C.white))
    pen.wire([-h * 0.92, w * 0.16, 0, w * 0.3, h * 0.92, w * 0.16], 4, pen.tone(C.steel))
    ctx.restore()
    return
  }
  if (garment === 'bell') {
    const tip = h * (0.9 + wag * 0.4), drop = w * (0.02 + wag * 0.2)
    pen.blob([-h, 2, -h * 0.86, -w * 0.4, -h * 0.1, -w * 0.82, h * 0.6, -w * 0.72, tip + 6, -w * 0.4 + drop, tip - 10, -w * 0.36 + drop, h * 0.62, -w * 0.3, h * 0.96, 2, 0, w * 0.06], C.scarlet)
    pen.wire([-h * 0.78, -w * 0.26, 0, -w * 0.18, h * 0.62, -w * 0.24], 6, pen.tone(C.saffron))
    pen.wire([-h * 0.5, -w * 0.5, 0, -w * 0.44, h * 0.44, -w * 0.46], 6, pen.tone(C.saffron))
    pen.box(-h, -w * 0.08, w, w * 0.16, w * 0.08, C.ivory)
    const bx = tip - 2, by = -w * 0.28 + drop
    pen.ell(bx, by, w * 0.13, w * 0.13, C.gold)
    pen.wire([bx - w * 0.1, by + 1, bx, by + 4, bx + w * 0.1, by + 1], 2, pen.tone(C.brown))
    pen.ell(bx, by + w * 0.09, 2.4, 2.4, C.brown, 0)
    return
  }
  // The feather hat.
  pen.ell(0, -2, h * 1.24, w * 0.13, C.violet)
  pen.blob([-h * 0.66, -2, -h * 0.7, -w * 0.42, 0, -w * 0.5, h * 0.7, -w * 0.42, h * 0.66, -2, 0, w * 0.04], C.violet)
  pen.box(-h * 0.64, -w * 0.15, w * 0.64, w * 0.1, 3, C.saffron)
  for (let i = 0; i < 3; i++) {
    const lean = (i - 1) * w * 0.17 + Math.sin(time * 1.7 + i) * 3 + wag * 18, up = w * (0.78 - Math.abs(i - 1) * 0.1)
    const colour = [C.turquoise, C.rose, C.emerald][i]
    pen.blob([-h * 0.3, -w * 0.24, -h * 0.52 + lean, -up * 0.7, -h * 0.3 + lean * 1.4, -up - 8, lean * 1.5 - h * 0.02, -up * 0.75, -h * 0.16, -w * 0.28], colour, 1.8)
    pen.wire([-h * 0.28, -w * 0.28, -h * 0.28 + lean * 0.7, -up * 0.6, -h * 0.28 + lean * 1.2, -up * 0.9], 1.6)
  }
}

/** A body garment on a body `w` wide whose shoulders are at y = 0 and whose hips are at y = `h`. */
export function drawBody(pen: Pen, garment: Garment, w: number, h: number, pop: number, time: number): void {
  const ctx = pen.ctx, s = w / 2, wag = Math.sin(pop * Math.PI * 7) * (1 - pop)
  if (garment === 'gown') {
    const hem = h * 1.2, out = s * 1.26 + wag * 8
    pen.blob([-s * 0.5, -6, -s * 1.0, h * 0.1, -out, hem, -out * 0.5, hem + 10, out * 0.5, hem + 10, out, hem, s * 1.0, h * 0.1, s * 0.5, -6], C.ivory)
    for (let i = -3; i <= 3; i++) pen.ell(i * out * 0.27, hem - 4 + Math.abs(i) * -2 + wag * (i % 2 === 0 ? 4 : -4), out * 0.16, 11, C.rose, 1.8)
    for (let i = -2; i <= 2; i++) pen.ell(i * s * 0.27, 4 + (2 - Math.abs(i)) * 3, s * 0.17, 9, C.rose, 1.8)
    for (const [x, y] of [[-0.5, 0.42], [0.46, 0.5], [-0.12, 0.7], [0.1, 0.34], [-0.62, 0.8], [0.66, 0.86]] as const) {
      pen.ell(s * x, h * y, 5, 5, C.violet, 0)
      pen.ell(s * x, h * y, 2, 2, C.saffron, 0)
    }
    return
  }
  if (garment === 'armour') {
    pen.ell(-s * 0.92, h * 0.12, s * 0.34, h * 0.17, C.steel)
    pen.ell(s * 0.92, h * 0.12, s * 0.34, h * 0.17, C.steel)
    pen.blob([-s * 0.8, 0, -s * 1.08, h * 0.4, -s * 0.86, h * 0.72, 0, h * 0.82, s * 0.86, h * 0.72, s * 1.08, h * 0.4, s * 0.8, 0, 0, h * 0.1], C.silver)
    for (let i = 0; i < 3; i++) pen.box(-s * (0.9 - i * 0.02), h * (0.7 + i * 0.13) + (i === 0 ? wag * 7 : 0), s * (1.8 - i * 0.04), h * 0.12, 5, i % 2 === 0 ? C.steel : C.silver)
    pen.wire([0, h * 0.12, 3, h * 0.4, 0, h * 0.7], 2)
    for (const x of [-0.66, 0.66]) for (const y of [0.22, 0.52]) pen.ell(s * x, h * y, 3.4, 3.4, C.gold, 0)
    pen.wire([-s * 0.52, h * 0.2, -s * 0.62, h * 0.4, -s * 0.5, h * 0.58], 5, pen.tone(C.white))
    return
  }
  // The tutu: a bodice, and a skirt that stands straight out.
  pen.blob([-s * 0.46, -2, -s * 0.92, h * 0.2, -s * 0.8, h * 0.72, s * 0.8, h * 0.72, s * 0.92, h * 0.2, s * 0.46, -2, 0, h * 0.16], C.turquoise)
  const flat = 1 + wag * 0.5
  ctx.save()
  ctx.translate(0, h * 0.74)
  for (let layer = 2; layer >= 0; layer--) {
    const r = Math.min(s * 1.62, 106) - layer * s * 0.12, n = 9
    ctx.beginPath()
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = -r + 2 * r * u, y = layer * 9 * flat - 6 + Math.sin(u * Math.PI) * 16 * flat + Math.sin(time * 3 + i + layer) * (wag === 0 ? 0.8 : 3)
      if (i === 0) ctx.moveTo(x, y); else ctx.quadraticCurveTo(x - r / n, y + 15, x, y)
    }
    ctx.quadraticCurveTo(0, -20, -r, layer * 9 * flat - 6)
    pen.paint([C.white, C.leaf, C.turquoise][layer], 1.8)
  }
  ctx.restore()
  pen.ell(0, h * 0.3, 6, 6, C.saffron, 1.6)
}

/** One foot garment on a foot `w` wide whose sole is on y = 0; `side` is -1 for the left foot and 1 for the right. */
export function drawFoot(pen: Pen, garment: Garment, w: number, side: number, pop: number, time: number, turning: boolean): void {
  const ctx = pen.ctx, s = w / 2, wag = Math.sin(pop * Math.PI * 8) * (1 - pop)
  if (garment === 'boots') {
    ctx.save()
    ctx.rotate(side * wag * 0.14)
    pen.blob([-s * 0.62, -w * 0.86, -s * 0.7, -w * 0.3, -s * 0.96, 0, 0, 2, s * 0.96, 0, s * 0.7, -w * 0.3, s * 0.62, -w * 0.86, 0, -w * 0.98], C.saffron)
    pen.box(-s * 0.98, -7, w * 0.98, 10, 5, C.scarlet)
    pen.box(-s * 0.68, -w * 0.86, w * 0.68, w * 0.16, 6, C.scarlet)
    pen.wire([-s * 0.4, -w * 0.6, -s * 0.5, -w * 0.4, -s * 0.46, -w * 0.24], 4, pen.tone(C.white))
    ctx.restore()
    return
  }
  if (garment === 'slippers') {
    for (const ear of [-1, 1]) pen.ell(ear * s * 0.34 + wag * ear * 5, -w * 0.62, s * 0.2, w * 0.3, C.rose, 2, ear * (0.2 + wag * 0.6))
    pen.blob([-s, 0, -s * 1.05, -w * 0.44, -s * 0.3, -w * 0.6, s * 0.3, -w * 0.6, s * 1.05, -w * 0.44, s, 0, 0, 4], C.rose)
    pen.ell(-s * 0.36, -w * 0.28, 3.2, 3.2, C.ink, 0)
    pen.ell(s * 0.36, -w * 0.28, 3.2, 3.2, C.ink, 0)
    pen.ell(0, -w * 0.18, 4.6, 3.4, C.scarlet, 1)
    return
  }
  // Skates: a red boot on two wheels.
  pen.blob([-s * 0.64, -w * 0.82, -s * 0.8, -w * 0.4, -s * 0.94, -w * 0.18, 0, -w * 0.12, s * 0.94, -w * 0.18, s * 0.8, -w * 0.4, s * 0.64, -w * 0.82, 0, -w * 0.9], C.lapis)
  pen.box(-s * 0.9, -w * 0.24, w * 0.9, 6, 3, C.silver)
  pen.wire([-s * 0.3, -w * 0.62, s * 0.3, -w * 0.54], 3, pen.tone(C.white))
  pen.wire([-s * 0.3, -w * 0.44, s * 0.3, -w * 0.36], 3, pen.tone(C.white))
  const spin = turning ? time * 16 : pop * 22
  for (const x of [-0.55, 0.55]) {
    pen.ell(s * x, -w * 0.1, w * 0.13, w * 0.13, C.scarlet, 1.8)
    pen.wire([s * x - Math.cos(spin) * w * 0.1, -w * 0.1 - Math.sin(spin) * w * 0.1, s * x + Math.cos(spin) * w * 0.1, -w * 0.1 + Math.sin(spin) * w * 0.1], 1.6)
  }
}

/** A garment by itself, as it hangs or is carried, in a frame about 84 wide and 110 high round 0,0. */
export function drawPiece(pen: Pen, garment: Garment, time: number, pop = 0, hooked = false): void {
  const ctx = pen.ctx, slot = SLOT[garment]
  ctx.save()
  // The hook it hangs by.
  if (hooked && slot !== 'feet') pen.wire([0, -64, 0, slot === 'head' ? -16 : -34], 2.2)
  if (slot === 'head') {
    ctx.translate(garment === 'pan' ? -14 : 0, garment === 'feather' ? 32 : 24)
    drawHat(pen, garment, garment === 'feather' ? 66 : 70, pop, time)
  } else if (slot === 'body') {
    const tutu = garment === 'tutu'
    ctx.translate(0, tutu ? -36 : -46)
    drawBody(pen, garment, garment === 'gown' ? 62 : tutu ? 50 : 64, garment === 'gown' ? 78 : tutu ? 74 : 88, pop, time)
  } else {
    for (const side of [-1, 1]) {
      ctx.save()
      ctx.translate(side * 22, 34 + side * 3)
      ctx.rotate(side * 0.1)
      drawFoot(pen, garment, garment === 'slippers' ? 42 : 40, side, pop, time, false)
      ctx.restore()
    }
    const tie = hooked ? -62 : -26
    pen.wire([-22, 4, -8, tie + 18, 0, tie], 2)
    pen.wire([22, 6, 8, tie + 18, 0, tie], 2)
  }
  ctx.restore()
}
