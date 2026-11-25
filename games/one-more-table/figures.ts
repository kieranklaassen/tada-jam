import { CAST, DISHES, GUESTS, type DishId, type GuestId } from './cast'
import { INK, TAU, bird, comma, cut, dab, dots, flower, stroke, tulip, type Make, type Pen, type Sprite } from './folk'

// Everyone and every dish, painted once from loaded strokes. A body hangs
// from the table's top (y 0 is the top, the head is above it), so the same
// picture sits behind the table and stands at the door. Faces are live: the
// view draws eyes, brows and mouth over the head.

export type Face = { r: number; eyes: number; eyeY: number; eyeR: number; mouthY: number; mouthW: number; brow: string | null; neck: string; neckW: number; arm: string; hand: string; beak: boolean }

const human = (r: number, arm: string, more: Partial<Face> = {}): Face => ({ r, eyes: r * 0.36, eyeY: -r * 0.12, eyeR: r * 0.2, mouthY: r * 0.48, mouthW: r * 0.34, brow: INK.bark, neck: INK.skin, neckW: 26, arm, hand: INK.skin, beak: false, ...more })

export const FACES: Readonly<Record<GuestId, Face>> = {
  granny: human(46, INK.sky, { brow: INK.cream }),
  grandpa: human(48, INK.ochre, { brow: INK.cream, mouthY: 20 }),
  baby: human(47, INK.cream, { eyeR: 12, neckW: 20, brow: null }),
  aunt: human(56, INK.rose),
  uncle: human(54, INK.teal, { mouthY: 34 }),
  dog: { r: 45, eyes: 17, eyeY: -14, eyeR: 10, mouthY: 27, mouthW: 18, brow: INK.bark, neck: INK.pumpkin, neckW: 46, arm: INK.pumpkin, hand: INK.cream, beak: false },
  tall: human(40, INK.cream, { neckW: 20, brow: INK.pumpkin }),
  goose: { r: 34, eyes: 13, eyeY: -8, eyeR: 9, mouthY: 14, mouthW: 22, brow: null, neck: INK.cream, neckW: 32, arm: INK.cream, hand: INK.sky, beak: true },
  little: human(43, INK.scarlet, { eyeR: 11 }),
  cow: { r: 58, eyes: 27, eyeY: -22, eyeR: 12, mouthY: 40, mouthW: 22, brow: INK.night, neck: INK.cream, neckW: 70, arm: INK.cream, hand: INK.night, beak: false },
  bear: { r: 60, eyes: 23, eyeY: -14, eyeR: 10, mouthY: 33, mouthW: 18, brow: INK.bark, neck: INK.brown, neckW: 80, arm: INK.brown, hand: INK.bark, beak: false },
  moose: { r: 54, eyes: 23, eyeY: -26, eyeR: 11, mouthY: 48, mouthW: 22, brow: INK.bark, neck: '#b98450', neckW: 66, arm: '#b98450', hand: INK.bark, beak: false },
}

/** The bell-shaped body everyone has: a flat ground and a fan of strokes over it. */
function torso(g: Pen, w: number, top: number, color: string, load: string, shade: string, skirt = 0.48): void {
  const s = w * 0.44, b = w * skirt
  g.fillStyle = color
  g.beginPath(); g.moveTo(-s * 0.7, top + 6); g.quadraticCurveTo(0, top - 12, s * 0.7, top + 6); g.quadraticCurveTo(b, top + 40, b, 92); g.lineTo(-b, 92); g.quadraticCurveTo(-b, top + 40, -s * 0.7, top + 6); g.fill()
  for (let i = 0; i < 5; i++) {
    const u = (i - 2) / 2
    g.globalAlpha = 0.55
    stroke(g, u * s * 0.62, top + 14, u * b * 0.8, top * 0.5 + 40, u * b * 0.8, 96, w * 0.17, w * 0.12, i % 2 ? shade : color, i % 2 ? undefined : load)
  }
  g.globalAlpha = 1
}

function cheeks(g: Pen, r: number, y = 0.24): void {
  for (const s of [-1, 1]) { g.globalAlpha = 0.75; dab(g, s * r * 0.6, r * y, r * 0.22, r * 0.18, INK.blush, INK.rose); g.globalAlpha = 1 }
}
const nose = (g: Pen, r: number, color: string = INK.blush) => dab(g, 0, r * 0.16, r * 0.17, r * 0.15, color, INK.rose)
const skin = (g: Pen, r: number) => dab(g, 0, 0, r, r * 1.06, INK.skin, '#f8dcbc')

type Paint = (g: Pen, w: number, t: number) => void
/** `t` is the top of the shoulders, below 0. */
const BODY: Readonly<Record<GuestId, Paint>> = {
  granny(g, w, t) {
    torso(g, w, t, INK.sky, INK.cream, '#7fadc6')
    for (const s of [-1, 1]) stroke(g, s * 4, t + 14, s * 34, t + 34, s * 50, t + 74, 30, 4, INK.cream, INK.rose)
    tulip(g, 0, 40, 0.8, INK.scarlet, INK.rose, INK.leaf)
    dab(g, 0, t + 20, 8, 8, INK.scarlet, INK.rose)
  },
  grandpa(g, w, t) {
    torso(g, w, t, INK.ochre, INK.gold, '#c98a2c')
    stroke(g, -14, t + 6, -26, 0, -30, 92, 26, 22, INK.brown, INK.ochre)
    stroke(g, 14, t + 6, 26, 0, 30, 92, 26, 22, INK.brown, INK.ochre)
    dots(g, 0, t + 46, 0, 60, 5, 5, INK.cream)
  },
  baby(g, w, t) {
    torso(g, w, t, INK.cream, '#ffffff', INK.rose, 0.46)
    for (let i = 0; i < 7; i++) dab(g, -34 + (i % 3) * 34, t + 34 + ((i / 3) | 0) * 26, 5, 5, INK.scarlet)
    for (let i = -2; i <= 2; i++) comma(g, i * 15, t + 10, 24, 14, 1.57 + i * 0.22, INK.sky, INK.cream)
  },
  aunt(g, w, t) {
    torso(g, w, t, INK.rose, '#f9c4ba', '#dd7f74', 0.495)
    for (const [x, y] of [[-60, 10], [60, 10], [-34, -50], [34, -50], [0, 24], [-70, 60], [70, 60]]) flower(g, x, y, 18, INK.cream, INK.gold, INK.scarlet, 6)
    for (let i = -4; i <= 4; i++) dab(g, i * 11, t + 18 - Math.abs(i) * 2.4, 8, 8, INK.cream, INK.sky)
  },
  uncle(g, w, t) {
    torso(g, w, t, INK.teal, '#9fd0c6', '#3f877f', 0.49)
    for (const s of [-1, 1]) { stroke(g, s * 12, t + 8, s * 40, t + 30, s * 18, 60, 30, 4, INK.cream, INK.sky) }
    stroke(g, -14, t + 22, -26, t + 14, -36, t + 24, 18, 4, INK.scarlet, INK.rose)
    stroke(g, 14, t + 22, 26, t + 14, 36, t + 24, 18, 4, INK.scarlet, INK.rose)
    dab(g, 0, t + 20, 8, 9, INK.scarlet, INK.rose)
    dots(g, 0, t + 50, 0, 70, 5, 6, INK.gold)
  },
  dog(g, w, t) {
    torso(g, w, t, INK.pumpkin, INK.gold, '#c96c22', 0.47)
    stroke(g, 0, t + 8, 2, t + 60, 0, 80, 54, 8, INK.cream, '#ffffff')
    stroke(g, -30, t + 12, 0, t + 26, 30, t + 12, 13, 12, INK.scarlet, INK.rose)
    dab(g, 0, t + 30, 9, 9, INK.gold)
  },
  tall(g, w, t) {
    torso(g, w, t, INK.cream, '#ffffff', INK.sky, 0.46)
    for (let y = t + 30; y < 84; y += 30) for (const s of [-1, 0, 1]) comma(g, s * 24, y, 20, 9, 0.9 * (s || 1), INK.blue, INK.sky)
    stroke(g, 0, t + 8, 4, t + 40, 0, t + 96, 18, 8, INK.scarlet, INK.rose)
  },
  goose(g, w, t) {
    torso(g, w, t + 14, INK.cream, '#ffffff', INK.sky, 0.47)
    for (const s of [-1, 1]) for (let i = 0; i < 4; i++) stroke(g, s * 30, t + 40 + i * 14, s * 52, t + 60 + i * 14, s * 44, 90, 20, 2, i % 2 ? INK.sky : INK.cream, INK.sky)
    stroke(g, -22, t + 14, 0, t + 24, 22, t + 14, 16, 14, INK.blue, INK.sky)
    stroke(g, -4, t + 24, -16, t + 40, -18, t + 58, 14, 2, INK.blue, INK.sky)
    stroke(g, 4, t + 24, 16, t + 40, 18, t + 58, 14, 2, INK.blue, INK.sky)
  },
  little(g, w, t) {
    torso(g, w, t, INK.scarlet, INK.rose, '#b03426', 0.47)
    for (let y = t + 26; y < 90; y += 22) dots(g, -34, y, 34, y, 5, 3.6, INK.cream)
    for (let i = -2; i <= 2; i++) comma(g, i * 13, t + 8, 20, 13, 1.57 + i * 0.25, INK.cream, INK.sky)
  },
  cow(g, w, t) {
    torso(g, w, t, INK.cream, '#ffffff', '#dfd2b4', 0.49)
    dab(g, -52, 0, 34, 44, INK.night, '#5a4038', 0.2)
    dab(g, 56, 46, 28, 34, INK.night, '#5a4038', -0.3)
    stroke(g, -38, t + 10, 0, t + 30, 38, t + 10, 15, 14, INK.scarlet, INK.rose)
    dab(g, 0, t + 42, 19, 21, INK.ochre, INK.gold)
    dab(g, 0, t + 58, 6, 6, INK.bark)
  },
  bear(g, w, t) {
    torso(g, w, t, INK.brown, '#cf9a64', INK.bark, 0.49)
    dab(g, 0, 30, 54, 62, '#cf9a64', INK.gold)
    for (let i = 0; i < 16; i++) comma(g, -70 + (i % 8) * 20, t + 30 + ((i / 8) | 0) * 34, 22, 8, 1.57, INK.bark)
    stroke(g, -30, t + 14, 0, t + 30, 30, t + 14, 16, 14, INK.blue, INK.sky)
  },
  moose(g, w, t) {
    torso(g, w, t, '#b98450', '#d8ab78', '#92633a', 0.48)
    for (let i = 0; i < 5; i++) stroke(g, -26 + i * 13, t + 10, -24 + i * 12, t + 44, -10 + i * 5, t + 92, 16, 2, i % 2 ? INK.bark : '#d8ab78')
    stroke(g, -44, t + 14, 0, t + 34, 44, t + 14, 20, 18, INK.leaf, INK.mint)
    bird(g, 0, 56, 0.6, 1, INK.sky, INK.cream, INK.blue)
  },
}

/** Round the middle of the head. */
const HEAD: Readonly<Record<GuestId, Paint>> = {
  granny(g, r) {
    dab(g, 0, -r * 1.3, r * 0.52, r * 0.46, INK.cream, '#ffffff')
    for (let i = 0; i < 7; i++) { const a = Math.PI * (1 + (i + 0.5) / 7); comma(g, Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7, r * 0.7, r * 0.5, a, INK.cream, '#ffffff') }
    skin(g, r)
    for (const s of [-1, 1]) stroke(g, s * 3, -r * 0.98, s * r * 0.7, -r * 0.95, s * r * 1.02, -r * 0.1, r * 0.5, 4, INK.cream, INK.sky)
    cheeks(g, r); nose(g, r)
  },
  grandpa(g, r) {
    skin(g, r)
    for (const s of [-1, 1]) dab(g, s * r * 1.0, 0, r * 0.2, r * 0.28, INK.skin, INK.rose)
    for (let i = 0; i < 9; i++) { const a = 0.15 + (i / 8) * 2.84; stroke(g, Math.cos(a) * r * 0.86, Math.sin(a) * r * 0.7 + 8, Math.cos(a) * r * 1.0, Math.sin(a) * r + 14, Math.cos(a) * r * 0.7, Math.sin(a) * r * 1.3 + 12, r * 0.42, 2, INK.cream, INK.sky) }
    for (const s of [-1, 1]) stroke(g, s * 2, r * 0.3, s * r * 0.4, r * 0.18, s * r * 0.66, r * 0.42, r * 0.28, 2, INK.cream, '#ffffff')
    cheeks(g, r, 0.16); nose(g, r * 1.2)
    g.strokeStyle = INK.gold; g.lineWidth = 4
    for (const s of [-1, 1]) { g.beginPath(); g.arc(s * r * 0.37, -r * 0.12, r * 0.3, 0, TAU); g.stroke() }
    comma(g, -r * 0.2, -r, 24, 9, -0.9, INK.cream); comma(g, r * 0.1, -r, 20, 8, -1.7, INK.cream)
  },
  baby(g, r) {
    skin(g, r); cheeks(g, r, 0.3)
    stroke(g, 2, -r * 0.92, 26, -r * 1.5, -8, -r * 1.36, 13, 2, INK.ochre, INK.gold)
    comma(g, -8, -r * 0.96, 22, 10, -2.2, INK.ochre, INK.gold)
    dab(g, 0, r * 0.2, r * 0.12, r * 0.1, INK.blush)
  },
  aunt(g, r) {
    dab(g, 0, -r * 1.24, r * 0.8, r * 0.82, INK.ochre, INK.gold)
    for (let i = 0; i < 4; i++) stroke(g, -r * 0.7, -r * 0.8 - i * 18, 0, -r * 0.6 - i * 20, r * 0.7, -r * 0.84 - i * 18, 14, 6, i % 2 ? INK.gold : '#c98a2c')
    skin(g, r)
    for (const s of [-1, 1]) { stroke(g, s * 4, -r * 0.94, s * r * 0.9, -r * 0.92, s * r * 1.0, r * 0.2, r * 0.46, 5, INK.ochre, INK.gold); dab(g, s * r * 1.02, r * 0.42, 8, 11, INK.sky, '#ffffff') }
    cheeks(g, r, 0.26); nose(g, r * 0.86)
    flower(g, r * 0.5, -r * 1.6, 22, INK.scarlet, INK.rose, INK.gold, 6)
  },
  uncle(g, r) {
    skin(g, r); cheeks(g, r, 0.14)
    for (const s of [-1, 1]) dab(g, s * r, 0, r * 0.18, r * 0.26, INK.skin, INK.rose)
    stroke(g, -r * 0.96, -r * 0.66, 0, -r * 1.0, r * 0.96, -r * 0.66, 20, 18, INK.night, '#5a4a52')
    dab(g, 0, -r * 1.04, r * 0.72, r * 0.5, INK.night, '#5a4a52')
    stroke(g, -r * 0.66, -r * 0.84, 0, -r * 1.02, r * 0.66, -r * 0.84, 11, 10, INK.scarlet, INK.rose)
    nose(g, r * 1.16)
  },
  dog(g, r) {
    dab(g, 0, 0, r, r * 0.98, INK.pumpkin, INK.gold)
    stroke(g, 0, -r * 0.94, 2, -r * 0.2, 0, r * 0.5, 22, 40, INK.cream, '#ffffff')
    dab(g, 0, r * 0.42, r * 0.56, r * 0.44, INK.cream, '#ffffff')
    dab(g, 0, r * 0.16, 12, 9, INK.night, '#6a5a58')
    dab(g, 18, -13, 17, 18, INK.bark)
  },
  tall(g, r) {
    skin(g, r); g.save(); g.scale(0.9, 1.12); skin(g, r); g.restore()
    for (let i = 0; i < 9; i++) { const a = Math.PI * (1.04 + (i + 0.5) / 9 * 0.92); comma(g, Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.82, r * 0.85, r * 0.34, a, INK.pumpkin, INK.gold) }
    cheeks(g, r, 0.3); stroke(g, 0, -4, 4, 8, 0, 18, 9, 13, INK.blush, INK.rose)
    dots(g, -18, 8, -10, 14, 2, 2, INK.brown); dots(g, 10, 14, 18, 8, 2, 2, INK.brown)
  },
  goose(g, r) {
    dab(g, 0, 0, r, r * 1.02, INK.cream, '#ffffff')
    for (const s of [-1, 1]) { g.globalAlpha = 0.6; dab(g, s * r * 0.66, r * 0.2, 7, 6, INK.blush); g.globalAlpha = 1 }
    comma(g, 0, -r * 0.9, 24, 10, -1.2, INK.cream, INK.sky); comma(g, 0, -r * 0.9, 22, 9, -2.1, INK.cream, INK.sky)
  },
  little(g, r) {
    for (const s of [-1, 1]) { stroke(g, s * r * 0.8, 0, s * r * 1.15, r * 0.5, s * r * 0.98, r * 1.2, 22, 12, INK.bark, INK.brown); dab(g, s * r * 0.98, r * 1.22, 9, 8, INK.sky, INK.cream) }
    skin(g, r)
    for (const s of [-1, 1]) stroke(g, s * 2, -r * 0.98, s * r * 0.8, -r * 1.0, s * r * 1.02, r * 0.06, r * 0.5, 5, INK.cream, INK.sky)
    for (let i = 0; i < 5; i++) dab(g, -r * 0.66 + i * r * 0.33, -r * 0.8 + Math.abs(i - 2) * 5, 4, 4, INK.scarlet)
    cheeks(g, r, 0.28); nose(g, r * 0.7)
  },
  cow(g, r) {
    for (const s of [-1, 1]) { stroke(g, s * r * 0.5, -r * 0.8, s * r * 0.9, -r * 1.2, s * r * 0.62, -r * 1.56, 20, 4, INK.ochre, INK.gold); stroke(g, s * r * 0.74, -r * 0.5, s * r * 1.2, -r * 0.72, s * r * 1.4, -r * 0.3, 34, 8, INK.cream, INK.rose) }
    dab(g, 0, -r * 0.1, r * 0.86, r * 1.0, INK.cream, '#ffffff')
    dab(g, -r * 0.42, -r * 0.4, r * 0.4, r * 0.5, INK.night, '#5a4038', 0.2)
    dab(g, 0, r * 0.56, r * 0.72, r * 0.46, INK.rose, '#f9c4ba')
    for (const s of [-1, 1]) dab(g, s * r * 0.3, r * 0.4, 6, 8, INK.blush)
    for (let i = -2; i <= 2; i++) comma(g, i * 8, -r * 1.06, 22, 12, 1.57 + i * 0.3, INK.night, INK.bark)
  },
  bear(g, r) {
    for (const s of [-1, 1]) { dab(g, s * r * 0.72, -r * 0.74, r * 0.34, r * 0.34, INK.brown, '#cf9a64'); dab(g, s * r * 0.72, -r * 0.72, r * 0.17, r * 0.17, INK.rose) }
    dab(g, 0, 0, r, r * 0.94, INK.brown, '#cf9a64')
    dab(g, 0, r * 0.38, r * 0.5, r * 0.4, '#e2bd88', INK.cream)
    dab(g, 0, r * 0.16, 15, 11, INK.night, '#6a5a58')
    for (let i = -3; i <= 3; i++) comma(g, i * 12, -r * 0.8, 18, 8, 1.57 + i * 0.16, INK.bark)
  },
  moose(g, r) {
    for (const s of [-1, 1]) {
      stroke(g, s * r * 0.3, -r * 0.7, s * r * 0.8, -r * 0.9, s * r * 1.2, -r * 1.4, 22, 40, INK.ochre, INK.gold)
      for (let i = 0; i < 4; i++) stroke(g, s * (r * 0.62 + i * 13), -r * 1.1 - i * 5, s * (r * 0.66 + i * 15), -r * 1.5 - i * 4, s * (r * 0.56 + i * 18), -r * 1.82 + i * 5, 24, 6, INK.ochre, INK.gold)
      stroke(g, s * r * 0.6, -r * 0.5, s * r * 1.1, -r * 0.5, s * r * 1.2, -r * 0.12, 24, 5, '#b98450', INK.rose)
    }
    dab(g, 0, -r * 0.18, r * 0.76, r * 0.9, '#b98450', '#d8ab78')
    dab(g, 0, r * 0.64, r * 0.82, r * 0.6, '#d8ab78', '#edcda0')
    for (const s of [-1, 1]) dab(g, s * r * 0.36, r * 0.42, 8, 10, INK.bark)
  },
}

const BOOTS: Readonly<Record<GuestId, [string, string]>> = {
  granny: [INK.night, INK.rose], grandpa: [INK.bark, INK.brown], baby: [INK.skin, '#f8dcbc'], aunt: [INK.scarlet, INK.rose], uncle: [INK.night, '#5a4a52'], dog: [INK.cream, '#ffffff'],
  tall: [INK.blue, INK.sky], goose: [INK.pumpkin, INK.gold], little: [INK.ochre, INK.gold], cow: [INK.night, '#5a4038'], bear: [INK.bark, INK.brown], moose: [INK.night, INK.bark],
}

const R = 56
type DishPaint = (g: Pen, full: boolean) => void
const plate = (g: Pen) => { dab(g, 0, -3, 50, 10, INK.cream, '#ffffff'); dab(g, 0, -5, 34, 5, INK.sky) }
const bowl = (g: Pen, c: string, l: string, s: string) => { g.fillStyle = c; g.beginPath(); g.moveTo(-42, -30); g.quadraticCurveTo(-36, 2, 0, 2); g.quadraticCurveTo(36, 2, 42, -30); g.fill(); for (let i = -2; i <= 2; i++) stroke(g, i * 15, -26, i * 14, -12, i * 7, 0, 13, 4, i % 2 ? s : c, i % 2 ? undefined : l) }

/** On the table's line: y 0 is where it stands. */
const DISH: Readonly<Record<DishId, DishPaint>> = {
  corn(g, full) { plate(g); if (full) for (const s of [-1, 1]) { stroke(g, s * 34, -10, s * 4, -22, -s * 30, -16 - (s + 1) * 6, 22, 14, INK.gold, INK.cream); dots(g, s * 26, -14, -s * 18, -18 - (s + 1) * 5, 6, 2.6, INK.ochre); comma(g, s * 34, -10, 22, 10, s > 0 ? -0.4 : 3.5, INK.leaf, INK.mint) } },
  mash(g, full) { bowl(g, INK.blue, INK.sky, INK.sky); if (full) { dab(g, 0, -42, 38, 22, INK.cream, '#ffffff'); dab(g, -2, -62, 22, 16, INK.cream, '#ffffff'); dab(g, 4, -72, 10, 6, INK.gold) } else dab(g, 0, -30, 41, 8, INK.sky) },
  milk(g, full) { stroke(g, 0, -52, 1, -30, 0, -2, 36, 36, full ? '#ffffff' : INK.sky, full ? INK.sky : INK.cream); stroke(g, 0, -62, 0, -56, 0, -50, 22, 24, INK.scarlet, INK.rose); dab(g, 0, -68, 8, 10, INK.ochre, INK.gold) },
  jelly(g, full) { plate(g); if (!full) return; for (let i = -2; i <= 2; i++) stroke(g, i * 11, -66 + Math.abs(i) * 5, i * 17, -40, i * 19, -8, 24, 26, i % 2 ? '#c02f3f' : '#dc4a52', '#f3a0a0'); dab(g, 0, -66, 24, 9, '#f3a0a0', '#ffffff'); dab(g, 0, -78, 9, 9, INK.scarlet, INK.rose) },
  sausages(g, full) { plate(g); if (full) for (let i = 0; i < 5; i++) stroke(g, -40 + i * 16, -12 - (i % 2) * 16, -28 + i * 16, -30 - (i % 2) * 16, -14 + i * 16, -12 - (i % 2) * 16, 18, 15, INK.brown, INK.rose) },
  gravy(g, full) { g.fillStyle = INK.cream; stroke(g, -38, -34, -20, -2, 34, -22, 30, 44, INK.cream, '#ffffff'); stroke(g, 34, -20, 54, -34, 40, -44, 10, 6, INK.cream); dab(g, 0, -36, 34, 8, full ? INK.bark : INK.sky); if (full) { stroke(g, -26, -40, 0, -60, 26, -40, 13, 13, '#ffffff', INK.sky); for (const s of [-1, 1]) dab(g, s * 28, -44, 9, 8, '#ffffff', INK.sky) } },
  pancakes(g, full) { plate(g); if (!full) return; for (let i = 0; i < 6; i++) stroke(g, -36 + (i % 2) * 5, -11 - i * 11, 0, -8 - i * 11, 38 - (i % 2) * 5, -11 - i * 11, 14, 13, INK.ochre, INK.gold); stroke(g, -8, -76, 4, -50, 14, -34, 16, 5, INK.bark, INK.brown); dab(g, 2, -76, 12, 6, INK.gold, INK.cream) },
  rolls(g, full) { if (full) for (const [x, y] of [[-22, -36], [22, -36], [0, -50]]) { dab(g, x, y, 22, 17, INK.brown, INK.gold); comma(g, x - 8, y - 6, 18, 4, 0.3, INK.cream) } for (let i = 0; i < 6; i++) stroke(g, -38 + i * 15, -30, -36 + i * 14, -14, -30 + i * 12, 0, 15, 12, i % 2 ? INK.brown : INK.ochre, INK.gold) },
  pumpkin(g, full) { if (full) { for (const i of [-2, 2, -1, 1, 0]) stroke(g, i * 12, -78 + Math.abs(i) * 4, i * 26, -40, i * 11, -2, 36, 34, i % 2 ? '#cf6a22' : INK.pumpkin, INK.gold); stroke(g, 2, -78, 4, -92, 14, -98, 12, 8, INK.leaf, INK.mint); comma(g, 6, -86, 30, 14, -0.1, INK.leaf, INK.mint) } else { for (const i of [-2, 2, -1, 1, 0]) stroke(g, i * 14, -36, i * 22, -20, i * 11, -2, 30, 28, i % 2 ? '#cf6a22' : INK.pumpkin, INK.gold); dab(g, 0, -36, 44, 9, '#7a3414') } },
  cheese(g, full) { plate(g); if (!full) return; g.fillStyle = INK.gold; g.beginPath(); g.moveTo(-44, -8); g.lineTo(44, -8); g.lineTo(44, -44); g.quadraticCurveTo(0, -74, -44, -34); g.fill(); stroke(g, -40, -36, 2, -66, 42, -44, 12, 10, INK.scarlet, INK.rose); for (const [x, y, r] of [[-20, -24, 8], [8, -34, 6], [28, -20, 9], [2, -16, 5]]) dab(g, x, y, r, r, INK.ochre) },
  honey(g, full) { stroke(g, 0, -56, 2, -30, 0, -2, 66, 60, INK.ochre, INK.gold); for (const y of [-40, -18]) stroke(g, -32, y, 0, y + 4, 32, y, 6, 5, INK.brown); dab(g, 0, -58, 30, 8, full ? '#f2b631' : INK.bark, full ? '#ffe39a' : undefined); if (full) { stroke(g, 14, -58, 20, -40, 18, -26, 16, 8, '#f2b631', '#ffe39a'); stroke(g, -4, -86, 0, -70, 4, -58, 8, 14, INK.brown) } },
  pie(g, full) { plate(g); stroke(g, -46, -16, 0, -8, 46, -16, 24, 22, INK.brown, INK.ochre); if (full) { dab(g, 0, -28, 46, 18, INK.ochre, INK.gold); for (let i = -2; i <= 2; i++) stroke(g, i * 16 - 10, -36 + Math.abs(i) * 3, i * 16, -30, i * 16 + 10, -20, 7, 5, INK.brown); dots(g, -42, -18, 42, -18, 9, 5, INK.gold) } else dab(g, 0, -24, 42, 10, INK.bark) },
}

export type Cast = {
  bodies: Record<GuestId, Sprite>
  heads: Record<GuestId, Sprite>
  feet: Record<GuestId, Sprite>
  full: Record<DishId, Sprite>
  empty: Record<DishId, Sprite>
  stool: Sprite; knob: Sprite; bell: Sprite; tuba: Sprite; moustache: Sprite; ear: Sprite; hand: Sprite
  flowers: Sprite[]
  glow: Sprite
  things: Record<'catBody' | 'catTail' | 'pot' | 'hen' | 'sun' | 'sunRays' | 'cuckoo' | 'curtain' | 'mouse' | 'steam' | 'leaf', Sprite>
}

/** Where the shoulders are for someone this tall, below 0. */
export function shoulders(id: GuestId): number {
  const f = FACES[id]
  return -(CAST[id].tall - f.r * 0.92) + (id === 'goose' ? 74 : id === 'tall' ? 72 : 0)
}

export function cutCast(make: Make, share: number): Cast {
  const fine = 2.4 * share, own = <K extends string, V>(keys: readonly K[], f: (k: K) => V) => Object.fromEntries(keys.map((k) => [k, f(k)])) as Record<K, V>
  return {
    bodies: own(GUESTS, (id) => { const w = CAST[id].width, t = shoulders(id); return cut(make, -w / 2 - 6, t - 24, w + 12, 120 - t, fine, (g) => BODY[id](g, w, t)) }),
    heads: own(GUESTS, (id) => { const r = FACES[id].r; return cut(make, -r * 1.62, -r * 2.15, r * 3.24, r * 3.7, fine, (g) => HEAD[id](g, r, 0)) }),
    feet: own(GUESTS, (id) => { const [c, l] = BOOTS[id], s = Math.min(26, CAST[id].width * 0.2); return cut(make, -60, -90, 120, 96, fine * 0.8, (g) => { for (const k of [-1, 1]) { stroke(g, k * s, -84, k * s * 1.05, -50, k * s, -12, 22, 20, id === 'dog' || id === 'cow' || id === 'bear' || id === 'moose' || id === 'goose' ? FACES[id].arm : c, l); stroke(g, k * s - 8, -12, k * s + 6, -10, k * s + k * 12 + 8, -6, 24, 14, c, l) } }) }),
    full: own(DISHES, (d) => cut(make, -62, -104, 124, 112, fine, (g) => DISH[d](g, true))),
    empty: own(DISHES, (d) => cut(make, -62, -104, 124, 112, fine, (g) => DISH[d](g, false))),
    stool: cut(make, -40, -66, 80, 70, fine * 0.8, (g) => { for (const s of [-1, 1]) stroke(g, s * 16, -54, s * 22, -28, s * 28, 0, 13, 10, INK.ochre, INK.gold); stroke(g, -34, -56, 0, -60, 34, -56, 18, 16, INK.scarlet, INK.rose); comma(g, -8, -56, 16, 7, 0, INK.cream) }),
    knob: cut(make, -R - 8, -R - 8, R * 2 + 16, R * 2 + 16, 3.4 * share, (g) => { dab(g, 0, 0, R, R, INK.scarlet, INK.rose); for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; stroke(g, Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9, Math.cos(a + 0.5) * R * 0.66, Math.sin(a + 0.5) * R * 0.66, Math.cos(a + 0.5) * R * 0.28, Math.sin(a + 0.5) * R * 0.28, 17, 2, i % 2 ? INK.cream : INK.gold, undefined) } dab(g, 0, 0, R * 0.3, R * 0.3, INK.gold, INK.cream); g.strokeStyle = INK.gold; g.lineWidth = 6; g.beginPath(); g.arc(0, 0, R - 2, 0, TAU); g.stroke() }),
    bell: cut(make, -R - 10, -14, R * 2 + 20, R * 2 + 30, 3.4 * share, (g) => { dab(g, 4, R * 1.72, 15, 15, INK.bark, INK.brown); for (let i = -2; i <= 2; i++) stroke(g, i * 8, 14, i * 14, R * 0.7, i * R * 0.42, R * 1.6, 28, 34, i % 2 ? '#c98a2c' : INK.ochre, INK.gold); stroke(g, -R * 0.98, R * 1.56, 0, R * 1.72, R * 0.98, R * 1.56, 22, 20, INK.gold, INK.cream); dots(g, -R * 0.6, R * 1.16, R * 0.6, R * 1.16, 7, 5, INK.scarlet); stroke(g, -12, 4, 0, -14, 12, 4, 11, 10, INK.gold, INK.cream) }),
    tuba: cut(make, -60, -90, 120, 130, fine, (g) => { stroke(g, 6, 36, -40, 40, -26, -20, 20, 20, INK.ochre, INK.gold); stroke(g, -28, -14, -24, -30, -14, -44, 22, 46, INK.ochre, INK.gold); dab(g, -10, -56, 46, 26, INK.ochre, INK.gold, -0.25); dab(g, -10, -56, 34, 16, INK.bark, undefined, -0.25) }),
    moustache: cut(make, -36, -16, 72, 32, fine, (g) => { for (const s of [-1, 1]) { stroke(g, 0, -2, s * 16, -10, s * 26, 2, 17, 8, INK.night, '#6a5a58'); stroke(g, s * 24, 4, s * 34, 4, s * 31, -8, 9, 2, INK.night) } }),
    ear: cut(make, -18, -6, 36, 78, fine, (g) => stroke(g, 0, 2, 16, 34, 0, 68, 18, 24, INK.bark, INK.brown)),
    hand: cut(make, -50, -12, 100, 120, fine, (g) => { g.globalAlpha = 0.94; stroke(g, 0, 4, 0, 26, 0, 52, 22, 24, '#fff6e6'); for (let i = 0; i < 3; i++) stroke(g, 18 + i * 12, 36 + i * 5, 18 + i * 10, 48, 14 + i * 7, 62, 20, 20, i % 2 ? '#f3e2c4' : '#fff6e6'); stroke(g, -26, 58, -14, 60, 4, 78, 18, 22, '#fff6e6'); dab(g, 14, 72, 32, 30, '#fff6e6', '#ffffff'); stroke(g, 14, 92, 16, 100, 14, 106, 46, 44, INK.scarlet, INK.rose) }),
    flowers: ([[INK.scarlet, INK.rose], [INK.ochre, INK.gold], [INK.sky, INK.cream]] as const).map(([c, l]) => cut(make, -34, -34, 68, 68, 2 * share, (g) => flower(g, 0, 0, 30, c, l, INK.cream, 6))),
    glow: cut(make, -100, -100, 200, 200, 1, (g) => { for (let i = 0; i < 18; i++) { const a = (i / 18) * TAU; stroke(g, Math.cos(a) * 68, Math.sin(a) * 68, Math.cos(a + 0.06) * 80, Math.sin(a + 0.06) * 80, Math.cos(a) * 97, Math.sin(a) * 97, 13, 1, i % 2 ? '#fff3c4' : INK.gold) } }),
    things: {
      catBody: cut(make, -60, -100, 120, 110, fine, (g) => { stroke(g, 0, -60, 30, -20, 0, 4, 50, 78, INK.ochre, INK.gold); for (const s of [-1, 1]) stroke(g, s * 12, -82, s * 24, -90, s * 24, -98, 20, 3, INK.ochre, INK.gold); dab(g, 0, -68, 29, 26, INK.ochre, INK.gold); for (let i = 0; i < 3; i++) comma(g, -10 + i * 10, -90, 14, 6, 1.57, INK.bark); for (const s of [-1, 1]) { dab(g, s * 11, -70, 5, 6, INK.night); for (let k = 0; k < 2; k++) comma(g, s * 14, -60 + k * 5, 22, 3, s > 0 ? 0.1 + k * 0.2 : 3.04 - k * 0.2, INK.cream) } dab(g, 0, -61, 5, 4, INK.blush) }),
      catTail: cut(make, -10, -10, 60, 70, fine, (g) => stroke(g, 2, 0, 40, 20, 14, 54, 14, 10, INK.ochre, INK.gold)),
      pot: cut(make, -80, -70, 160, 84, fine, (g) => { stroke(g, -66, -40, -80, -30, -70, -18, 10, 8, INK.bark); stroke(g, 66, -40, 80, -30, 70, -18, 10, 8, INK.bark); for (let i = -2; i <= 2; i++) stroke(g, i * 28, -50, i * 29, -24, i * 22, 4, 36, 30, i % 2 ? INK.blue : '#2f5590', INK.sky); flower(g, 0, -24, 20, INK.cream, INK.gold, INK.scarlet, 6) }),
      hen: cut(make, -80, -100, 160, 108, fine, (g) => { for (let i = 0; i < 4; i++) comma(g, -30, -34, 52, 22, 3.5 + i * 0.28, i % 2 ? INK.scarlet : INK.cream, INK.rose); stroke(g, 30, -50, -10, 10, -44, -40, 46, 40, INK.cream, '#ffffff'); dab(g, 36, -66, 19, 18, INK.cream, '#ffffff'); for (let i = 0; i < 3; i++) dab(g, 28 + i * 9, -86 + i * 3, 7, 8, INK.scarlet); stroke(g, 52, -66, 62, -64, 68, -60, 12, 0, INK.ochre, INK.gold); dab(g, 40, -69, 4, 4, INK.night); for (const x of [-6, 12]) stroke(g, x, -14, x, -6, x + 2, 4, 5, 4, INK.ochre); for (let i = 0; i < 3; i++) stroke(g, 12 - i * 6, -42 + i * 8, -8, -28 + i * 6, -24, -44 + i * 8, 13, 0, INK.sky, INK.cream) }),
      sun: cut(make, -80, -80, 160, 160, 1.6 * share, (g) => { dab(g, 0, 0, 74, 74, INK.gold, '#fff3c4'); for (const s of [-1, 1]) { dab(g, s * 26, -12, 8, 10, INK.bark); dab(g, s * 44, 18, 13, 10, INK.pumpkin) } stroke(g, -24, 26, 0, 46, 24, 26, 8, 6, INK.scarlet) }),
      sunRays: cut(make, -150, -150, 300, 300, 1.4 * share, (g) => { for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; stroke(g, Math.cos(a) * 88, Math.sin(a) * 88, Math.cos(a + 0.18) * 116, Math.sin(a + 0.18) * 116, Math.cos(a) * 146, Math.sin(a) * 146, 30, 0, i % 2 ? INK.gold : INK.ochre, INK.cream) } }),
      cuckoo: cut(make, -40, -34, 90, 68, fine, (g) => bird(g, 0, 4, 0.5, 1, INK.sky, INK.cream, INK.blue)),
      curtain: cut(make, -40, 0, 80, 130, fine, (g) => { for (let i = 0; i < 4; i++) stroke(g, -24 + i * 17, 2, -20 + i * 18, 60, -28 + i * 20, 124, 18, 16, i % 2 ? INK.rose : INK.cream, INK.scarlet) }),
      mouse: cut(make, -26, -44, 52, 48, fine, (g) => { for (const s of [-1, 1]) { dab(g, s * 12, -34, 9, 9, '#a79a94', INK.rose) } stroke(g, 0, -26, 6, -10, 0, 2, 26, 32, '#a79a94', '#d8cfc8'); for (const s of [-1, 1]) dab(g, s * 6, -22, 3, 3.6, INK.night); dab(g, 0, -15, 3, 3, INK.blush) }),
      steam: cut(make, -20, -40, 40, 60, 1.6 * share, (g) => stroke(g, 0, 16, -18, 0, 6, -34, 20, 2, INK.cream, '#ffffff')),
      leaf: cut(make, -20, -10, 40, 20, 1.6 * share, (g) => comma(g, -16, 0, 32, 13, 0, INK.pumpkin, INK.gold)),
    },
  }
}
