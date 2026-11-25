import { BULB_COLOURS } from './kinds'
import { circle, half, ink, piece, poly, rect, strip, type Colour, type Tone } from './paper'
import { makeRng } from './rng'

// Every picture, painted once at the surface's scale in a dark and a lit
// version, and stamped. Host parts are in stage units where they stand; things
// hang from their own origin.

type Pen = CanvasRenderingContext2D
export type Picture = { box: readonly [number, number, number, number]; paint: (g: Pen, tone: Tone) => void }

const eye = (g: Pen, x: number, y: number, r: number) => { g.fillStyle = '#fffaf0'; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); g.fillStyle = '#17161c'; g.beginPath(); g.arc(x, y + r * 0.1, r * 0.5, 0, 7); g.fill() }
const shut = (g: Pen, x: number, y: number, r: number) => { g.strokeStyle = '#17161c'; g.lineWidth = 3; g.beginPath(); g.arc(x, y - r * 0.4, r, 0.5, Math.PI - 0.5); g.stroke() }

const bulb = (colour: Colour): Picture => ({ box: [-36, -12, 72, 104], paint: (g, tone) => {
  circle(g, tone, colour, 0, 48, 31)
  rect(g, tone, 'white', -11, -2, 22, 22)
  strip(g, tone, 'orange', -13, 8, 13, 6, 6)
} })

export const PICTURES: Record<string, Picture> = {
  boot: { box: [-46, -10, 100, 108], paint: (g, t) => {
    rect(g, t, 'green', -32, 0, 40, 68)
    half(g, t, 'green', 12, 84, 34); rect(g, t, 'green', -32, 60, 46, 24)
    rect(g, t, 'black', -34, 82, 80, 10); strip(g, t, 'yellow', -35, 8, 11, 8, 14)
    if (t === 'lit') { eye(g, 6, 66, 8); eye(g, 24, 68, 8) }
  } },
  pants: { box: [-54, -8, 108, 98], paint: (g, t) => {
    poly(g, t, 'white', [-46, 4, 46, 4, 48, 36, 40, 80, 8, 82, 0, 46, -8, 82, -40, 80, -48, 36])
    strip(g, t, 'red', -47, 8, 47, 8, 12)
    for (const [x, y] of [[-28, 34], [4, 30], [30, 42], [-26, 62], [26, 66]]) circle(g, t, 'red', x, y, 7)
  } },
  sausage: { box: [-62, -8, 124, 84], paint: (g, t) => {
    strip(g, t, 'white', -2, 0, 2, 26, 5)
    piece(g, t, 'red', (p) => { p.arc(-34, 44, 24, Math.PI * 0.5, Math.PI * 1.5); p.arc(34, 44, 24, Math.PI * 1.5, Math.PI * 0.5); p.closePath() }, [-58, 20, 116, 48])
    strip(g, t, 'orange', -20, 30, -28, 58, 6); strip(g, t, 'orange', 4, 30, -4, 58, 6); strip(g, t, 'orange', 28, 30, 20, 58, 6)
    if (t === 'lit') { eye(g, 34, 38, 8); eye(g, 48, 40, 8) }
  } },
  kettle: { box: [-58, -10, 122, 104], paint: (g, t) => {
    piece(g, t, 'black', (p) => { p.arc(0, 34, 34, Math.PI, 0); p.arc(0, 34, 26, 0, Math.PI, true); p.closePath() }, [-34, 0, 68, 36])
    poly(g, t, 'blue', [24, 56, 60, 26, 52, 22, 20, 42])
    circle(g, t, 'blue', 0, 58, 34); rect(g, t, 'white', -22, 24, 44, 9); circle(g, t, 'red', 0, 19, 8)
    if (t === 'lit') { eye(g, -11, 54, 9); eye(g, 12, 54, 9) } else { shut(g, -11, 58, 9); shut(g, 12, 58, 9) }
  } },
  uncle: { box: [-56, -26, 114, 142], paint: (g, t) => {
    strip(g, t, 'orange', -16, 82, -18, 108, 13); strip(g, t, 'orange', 16, 82, 18, 108, 13)
    poly(g, t, 'white', [-34, 22, 34, 22, 42, 88, -42, 88])
    for (const y of [42, 58, 74]) strip(g, t, 'blue', -36 - y * 0.06, y, 36 + y * 0.06, y, 6)
    strip(g, t, 'white', -34, 30, -50, 66, 16); strip(g, t, 'white', 34, 30, 50, 66, 16)
    circle(g, t, 'orange', 0, 20, 26)
    poly(g, t, 'red', [-26, 10, 26, 6, 44, -18]); circle(g, t, 'white', 44, -16, 8)
    half(g, t, 'white', -9, 34, 11); half(g, t, 'white', 9, 34, 11); circle(g, t, 'red', 0, 24, 6)
    if (t === 'lit') { eye(g, -10, 14, 8); eye(g, 10, 14, 8); g.fillStyle = '#17161c'; g.beginPath(); g.arc(0, 40, 6, 0, 7); g.fill() } else { shut(g, -10, 17, 7); shut(g, 10, 17, 7) }
    rect(g, t, 'yellow', -32, -8, 9, 34); rect(g, t, 'yellow', 25, -4, 9, 34)
  } },
  fish: { box: [-56, -8, 118, 92], paint: (g, t) => {
    strip(g, t, 'white', -2, 0, 2, 22, 5)
    poly(g, t, 'yellow', [-26, 46, -54, 22, -54, 72])
    circle(g, t, 'orange', 8, 46, 34); poly(g, t, 'yellow', [4, 44, -18, 60, 6, 64]); strip(g, t, 'white', 14, 16, 16, 76, 9)
    eye(g, 28, 38, t === 'lit' ? 10 : 7); g.fillStyle = ink('red', t); g.beginPath(); g.arc(42, 54, 6, 0, 7); g.fill()
  } },
  trumpet: { box: [-60, -8, 124, 84], paint: (g, t) => {
    strip(g, t, 'white', -2, 0, 2, 30, 5)
    poly(g, t, 'yellow', [16, 40, 60, 14, 60, 70]); strip(g, t, 'yellow', -54, 42, 24, 42, 15); rect(g, t, 'white', -58, 32, 9, 20)
    piece(g, t, 'yellow', (p) => { p.arc(-12, 56, 18, 0, Math.PI); p.arc(-12, 56, 9, Math.PI, 0, true); p.closePath() }, [-30, 56, 36, 18])
    for (const x of [-28, -12, 4]) rect(g, t, 'red', x - 4, 24, 8, 14)
  } },
  hen: { box: [-56, -12, 116, 110], paint: (g, t) => {
    strip(g, t, 'orange', -8, 78, -10, 94, 6); strip(g, t, 'orange', 12, 78, 12, 94, 6)
    poly(g, t, 'white', [-28, 60, -54, 24, -20, 34]); circle(g, t, 'white', 0, 50, 35)
    poly(g, t, 'red', [16, 4, 22, -8, 30, 4]); poly(g, t, 'red', [26, 2, 34, -8, 40, 6]); circle(g, t, 'white', 28, 20, 20)
    poly(g, t, 'yellow', [44, 14, 60, 22, 44, 28]); half(g, t, 'orange', -6, 48, 19, Math.PI)
    if (t === 'lit') eye(g, 32, 16, 8); else shut(g, 32, 18, 7)
  } },
  umbrella: { box: [-24, -10, 48, 116], paint: (g, t) => {
    strip(g, t, 'orange', 0, 0, 0, 22, 6); poly(g, t, 'red', [-13, 18, 13, 18, 0, 96]); poly(g, t, 'white', [-3, 18, 5, 18, 0, 90]); strip(g, t, 'yellow', -15, 20, 15, 22, 8)
  } },
  'umbrella-open': { box: [-68, -10, 136, 112], paint: (g, t) => {
    strip(g, t, 'orange', 0, 20, 0, 92, 7); half(g, t, 'orange', 8, 90, 11, Math.PI)
    half(g, t, 'red', 0, 66, 62); poly(g, t, 'white', [0, 4, -22, 66, 22, 66]); circle(g, t, 'yellow', 0, 4, 7)
  } },
  jelly: { box: [-50, -10, 100, 98], paint: (g, t) => {
    half(g, t, 'green', 0, 58, 38); rect(g, t, 'green', -40, 50, 80, 22); half(g, t, 'yellow', 0, 44, 24)
    circle(g, t, 'red', 0, 12, 12); rect(g, t, 'white', -48, 72, 96, 9)
    if (t === 'lit') { eye(g, -14, 56, 8); eye(g, 14, 56, 8) }
  } },
  'moose-body': { box: [410, 470, 290, 280], paint: (g, t) => {
    for (const x of [452, 520, 606, 660]) { strip(g, t, 'orange', x, 610, x - 2, 716, 34); rect(g, t, 'black', x - 20, 712, 38, 24) }
    piece(g, t, 'orange', (p) => { p.arc(520, 590, 92, Math.PI * 0.5, Math.PI * 1.5); p.arc(602, 590, 92, Math.PI * 1.5, Math.PI * 0.5); p.closePath() }, [428, 498, 266, 184])
    poly(g, t, 'white', [688, 560, 720 - 22, 530, 696, 590])
    for (const [x, y, r] of [[620, 560, 20], [655, 600, 13], [600, 640, 15]]) circle(g, t, 'yellow', x, y, r)
  } },
  'moose-head': { box: [330, 250, 290, 380], paint: (g, t) => {
    poly(g, t, 'orange', [402, 262, 574, 262, 560, 450, 408, 450], { x: 574, y: 262, ax: -20, ay: 0, bx: 0, by: 20 })
    circle(g, t, 'white', 470, 522, 92)
    g.fillStyle = '#17161c'
    for (const x of [428, 512]) { g.beginPath(); g.arc(x, 516, 11, 0, 7); g.fill() }
  } },
  ear: { box: [-10, -40, 80, 80], paint: (g, t) => poly(g, t, 'orange', [-4, 0, 56, -32, 46, 32]) },
  'antler-left': { box: [290, 130, 170, 160], paint: (g, t) => {
    strip(g, t, 'white', 440, 282, 372, 226, 24); half(g, t, 'white', 362, 212, 58, Math.PI)
    poly(g, t, 'white', [306, 196, 308, 226, 346, 216]); poly(g, t, 'white', [350, 152, 340, 220, 372, 218]); poly(g, t, 'white', [408, 152, 382, 220, 420, 214])
  } },
  'antler-right': { box: [520, 130, 190, 160], paint: (g, t) => {
    strip(g, t, 'white', 536, 280, 620, 226, 24); half(g, t, 'white', 628, 212, 58, Math.PI)
    poly(g, t, 'white', [690, 186, 682, 226, 648, 214]); poly(g, t, 'white', [634, 144, 616, 218, 648, 218]); poly(g, t, 'white', [572, 152, 572, 214, 612, 218])
  } },
  house: { box: [730, 150, 400, 580], paint: (g, t) => {
    rect(g, t, 'orange', 1010, 164, 58, 180); rect(g, t, 'white', 1002, 156, 76, 22)
    rect(g, t, 'blue', 768, 372, 312, 344, { x: 1080, y: 716, ax: -26, ay: 0, bx: 0, by: -26 })
    strip(g, t, 'white', 768, 566, 1080, 568, 10)
    circle(g, t, 'white', 845, 470, 54); circle(g, t, 'white', 1000, 470, 54)
    rect(g, t, 'green', 832, 590, 98, 126); circle(g, t, 'yellow', 912, 656, 8)
    for (const x of [1000, 1040]) rect(g, t, 'white', x, 610, 30, 50)
  } },
  roof: { box: [720, 160, 410, 240], paint: (g, t) => {
    poly(g, t, 'red', [732, 388, 1118, 388, 900, 172]); poly(g, t, 'white', [900, 172, 852, 220, 878, 236, 898, 218, 922, 240, 948, 220])
    for (const x of [790, 860, 930, 1000, 1070]) half(g, t, 'white', x, 386, 24, Math.PI)
  } },
  tree: { box: [20, 56, 290, 660], paint: (g, t) => {
    rect(g, t, 'orange', 136, 540, 50, 160)
    poly(g, t, 'green', [160, 330, 20, 580, 304, 576]); poly(g, t, 'green', [160, 210, 40, 458, 284, 450])
    poly(g, t, 'green', [160, 130, 62, 346, 256, 322]); poly(g, t, 'green', [160, 70, 96, 224, 224, 220])
    for (const [x, y, r] of [[66, 346, 13], [252, 322, 13], [98, 222, 10], [222, 218, 10], [44, 456, 14], [280, 448, 14], [160, 80, 12]]) circle(g, t, 'white', x, y, r)
  } },
  dog: { box: [930, 590, 190, 150], paint: (g, t) => {
    for (const x of [968, 1000, 1050, 1076]) rect(g, t, 'white', x - 11, 700, 22, 34)
    piece(g, t, 'white', (p) => { p.arc(986, 672, 46, Math.PI * 0.5, Math.PI * 1.5); p.arc(1052, 672, 46, Math.PI * 1.5, Math.PI * 0.5); p.closePath() }, [940, 626, 158, 92])
    circle(g, t, 'orange', 972, 668, 17); circle(g, t, 'orange', 1012, 690, 13)
  } },
  'dog-head': { box: [1000, 560, 150, 160], paint: (g, t) => {
    circle(g, t, 'white', 1074, 628, 62); circle(g, t, 'orange', 1098, 612, 27); circle(g, t, 'white', 1074, 656, 34)
    g.fillStyle = '#17161c'; g.beginPath(); g.arc(1074, 642, 13, 0, 7); g.fill()
  } },
  'dog-ear': { box: [-26, -8, 52, 84], paint: (g, t) => { poly(g, t, 'orange', [-14, 0, 14, 0, 20, 56, 0, 74, -20, 56]) } },
  'dog-tail': { box: [-14, -70, 28, 80], paint: (g, t) => { poly(g, t, 'white', [-11, 4, 11, 4, 5, -66, -5, -66]) } },
  post: { box: [640, 640, 204, 104], paint: (g, t) => { poly(g, t, 'blue', [702, 660, 782, 660, 808, 736, 676, 736]); rect(g, t, 'yellow', 650, 662, 184, 24) } },
  dome: { box: [664, 556, 156, 124], paint: (g, t) => { half(g, t, 'red', 742, 668, 76); circle(g, t, 'white', 716, 618, 10) } },
  'box-back': { box: [30, 470, 280, 200], paint: (g, t) => {
    poly(g, t, 'yellow', [60, 566, 22 + 18, 500, 100, 520]); poly(g, t, 'yellow', [280, 566, 304, 506, 240, 522])
    rect(g, t, 'black', 62, 548, 218, 60)
    for (const [x, y, r, c] of [[92, 552, 24, 'red'], [250, 552, 26, 'blue'], [128, 546, 20, 'green'], [222, 544, 18, 'orange']] as const) circle(g, t, c, x, y, r)
    strip(g, t, 'white', 80, 530, 130, 560, 8); strip(g, t, 'red', 246, 520, 268, 566, 14)
  } },
  'box-front': { box: [40, 556, 266, 200], paint: (g, t) => {
    poly(g, t, 'yellow', [50, 566, 292, 562, 284, 750, 58, 752], { x: 292, y: 562, ax: -26, ay: 1, bx: -1, by: 26 })
    poly(g, t, 'red', [148, 564, 196, 563, 194, 751, 150, 751]); strip(g, t, 'orange', 50, 640, 288, 636, 12)
  } },
  wheel: { box: [-54, -54, 108, 108], paint: (g, t) => { circle(g, t, 'white', 0, 0, 40); circle(g, t, 'blue', 0, 0, 12); strip(g, t, 'blue', 0, 0, 30, -30, 12); circle(g, t, 'red', 32, -32, 16) } },
  'egg': { box: [-14, -16, 28, 32], paint: (g, t) => circle(g, t, 'white', 0, 0, 11) },
}
for (const colour of BULB_COLOURS) PICTURES[`bulb-${colour}`] = bulb(colour)

/** The black sheet with the night stuck on it. `w` and `h` are past the stage on every side. */
export function paintNight(g: Pen, tone: Tone, left: number, top: number, w: number, h: number): void {
  g.fillStyle = tone === 'lit' ? '#1d1b26' : '#15141a'
  g.fillRect(left, top, w, h)
  const rng = makeRng(77)
  for (let i = 0; i < 1500; i++) { g.fillStyle = `rgba(255,255,255,${0.012 + 0.03 * rng.next()})`; g.fillRect(left + rng.next() * w, top + rng.next() * h, 1 + rng.next() * 3, 1) }
  // Stars are punched dots and slips, clear of where the string hangs thickest.
  for (let i = 0; i < 70; i++) {
    const x = left + rng.next() * w, y = top + rng.next() * Math.min(h, 520 - top), r = 2.5 + rng.next() * 5
    if (i % 5 === 0) rect(g, tone, 'yellow', x, y, r * 1.6, r * 1.6)
    else circle(g, tone, i % 3 ? 'white' : 'yellow', x, y, r)
  }
  piece(g, tone, 'yellow', (p) => { p.arc(800, 92, 58, 0.45, 5.0); p.arc(826, 74, 50, 4.3, 1.1, true); p.closePath() }, [742, 34, 116, 116])
  for (const [x, y, r] of [[-60, 760, 240], [330, 800, 250], [700, 790, 230], [1200, 770, 260], [-360, 780, 260], [1560, 800, 280]]) circle(g, tone, 'blue', x, y, r)
  // The far village.
  for (const [x, y, s] of [[318, 560, 1], [388, 548, 0.8], [716, 556, 0.9], [352, 586, 0.7]]) {
    rect(g, tone, 'black', x, y, 44 * s, 40 * s); poly(g, tone, 'red', [x - 6, y, x + 50 * s, y, x + 22 * s, y - 34 * s]); rect(g, tone, 'yellow', x + 8 * s, y + 10 * s, 10 * s, 12 * s); rect(g, tone, 'yellow', x + 26 * s, y + 10 * s, 10 * s, 12 * s)
  }
  piece(g, tone, 'white', (p) => { p.moveTo(left - 10, 706); for (let x = left - 10; x < left + w + 40; x += 80) p.quadraticCurveTo(x + 40, 682, x + 80, 706); p.lineTo(left + w + 40, top + h + 20); p.lineTo(left - 10, top + h + 20); p.closePath() }, [left, 690, w, 160])
  for (let i = 0; i < 30; i++) { const x = left + rng.next() * w, y = 770 + rng.next() * 44; g.fillStyle = tone === 'lit' ? '#dcdff0' : '#727a9b'; g.beginPath(); g.arc(x, y, 4 + rng.next() * 9, 0, 7); g.fill() }
}
