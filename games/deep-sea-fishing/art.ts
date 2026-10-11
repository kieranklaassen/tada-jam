import { makeRng, type Rng } from './rng'
import { PARTS, SPARKS, SPRITES, STILL_KELP, WAVE_PERIOD, type SpriteId } from './rig'
import { CREATURES, GULL, PEGS, SEABED, SHARK_TEETH, WATERLINE } from './sea'

// The batik look, painted once. Every figure is a light fill left in the
// indigo cloth, as wax leaves it: cream and ochre, no outline, its edge crept
// a little by the dye, its details cut back to the cloth as lines and rows of
// dots, and a web of fine dye crackle through it. Nothing here runs per frame:
// view.ts calls a painter once for each sprite and stamps the result.
// The art guide is in ART.md under "The look".

export const CREAM = '#f3e6c2'
export const OCHRE = '#dca548'
/** The dark dye, for pupils, mouths and brows drawn live. */
export const DARK = '#131a3c'
/** The water in the tub: the sunlit sea's own blue. */
const TUB_WATER = '#3d5ea6'
const VEIN = 'rgba(26, 42, 96, 0.5)'
/** The cloth from the top of the sky to the bottom of the sea: dipped deeper toward the bottom. */
export const SKY = ['#7193c5', '#5c81ba'] as const
export const SEA: readonly [number, string][] = [[0, '#37599c'], [0.3, '#294784'], [0.62, '#182c60'], [1, '#0a1230']]

type G = CanvasRenderingContext2D
/** A context scaled so that one unit is one stage unit, and how many canvas pixels that is. */
export type Brush = { g: G; d: number }
type Pt = readonly [number, number]

const TAU = Math.PI * 2

// --- Strokes of the wax pen ---------------------------------------------------

/** A filled figure whose edge the dye has crept into a little. */
function fill(b: Brush, color: string, path: (g: G) => void, creep = 1.6): void {
  const g = b.g
  g.save()
  g.fillStyle = color
  g.shadowColor = color
  g.shadowBlur = creep * b.d
  g.beginPath()
  path(g)
  g.fill()
  g.restore()
}

/** A line left light: a whisker, a rod, a stalk. */
function line(b: Brush, color: string, width: number, path: (g: G) => void): void {
  const g = b.g
  g.save()
  g.strokeStyle = color
  g.shadowColor = color
  g.shadowBlur = 1.2 * b.d
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  path(g)
  g.stroke()
  g.restore()
}

/** A line cut back to the cloth: the dark detail inside a light figure. */
function cut(b: Brush, width: number, path: (g: G) => void): void {
  const g = b.g
  g.save()
  g.globalCompositeOperation = 'destination-out'
  g.lineWidth = width
  g.lineCap = 'round'
  g.lineJoin = 'round'
  g.beginPath()
  path(g)
  g.stroke()
  g.restore()
}

/** A shape cut back to the cloth. */
function hole(b: Brush, path: (g: G) => void): void {
  const g = b.g
  g.save()
  g.globalCompositeOperation = 'destination-out'
  g.beginPath()
  path(g)
  g.fill()
  g.restore()
}

const oval = (x: number, y: number, rx: number, ry: number, rot = 0) => (g: G): void => { g.ellipse(x, y, rx, ry, rot, 0, TAU) }
const poly = (...pts: Pt[]) => (g: G): void => {
  pts.forEach(([x, y], index) => (index === 0 ? g.moveTo(x, y) : g.lineTo(x, y)))
  g.closePath()
}
/** A closed, rounded outline through the points. */
const loop = (...pts: Pt[]) => (g: G): void => {
  const n = pts.length
  const mid = (i: number): Pt => [(pts[i % n][0] + pts[(i + 1) % n][0]) / 2, (pts[i % n][1] + pts[(i + 1) % n][1]) / 2]
  g.moveTo(...mid(0))
  for (let i = 1; i <= n; i++) g.quadraticCurveTo(pts[i % n][0], pts[i % n][1], ...mid(i))
  g.closePath()
}
/** An open, rounded line through the points. */
const curve = (...pts: Pt[]) => (g: G): void => {
  g.moveTo(pts[0][0], pts[0][1])
  for (let i = 1; i < pts.length - 1; i++) g.quadraticCurveTo(pts[i][0], pts[i][1], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2)
  g.lineTo(pts[pts.length - 1][0], pts[pts.length - 1][1])
}

/** One dot cut back to the cloth. */
function dot(b: Brush, x: number, y: number, r: number): void {
  hole(b, oval(x, y, r, r))
}
/** How far dot `i` of a row is pushed along it and how large it is: never even, so that a row of them is a texture and nothing to count. */
const uneven = (i: number): [number, number] => [0.34 * Math.sin(i * 2.4 + 0.7), 0.72 + 0.5 * Math.abs(Math.sin(i * 1.7 + 0.4))]
/** A row of cut dots from one point to another, unevenly spaced and of uneven size: the filling pattern of the cloth. */
function dots(b: Brush, x0: number, y0: number, x1: number, y1: number, count: number, r: number): void {
  for (let i = 0; i < count; i++) {
    const [push, size] = uneven(i), u = count === 1 ? 0.5 : Math.min(1, Math.max(0, (i + push) / (count - 1)))
    dot(b, x0 + (x1 - x0) * u, y0 + (y1 - y0) * u, r * size)
  }
}
/** Cut dots along part of a circle, as uneven as a row of them. */
function dotArc(b: Brush, x: number, y: number, rx: number, ry: number, from: number, to: number, count: number, r: number): void {
  for (let i = 0; i < count; i++) {
    const [push, size] = uneven(i + 3), angle = from + ((to - from) * Math.min(count - 1, Math.max(0, i + push))) / (count - 1)
    dot(b, x + rx * Math.cos(angle), y + ry * Math.sin(angle), r * size)
  }
}
/** The ring round an eye: the pupil is drawn live inside it. */
function eye(b: Brush, x: number, y: number, r: number): void {
  cut(b, 2.2, oval(x, y, r, r))
}
/** A spot of ochre, a little out of round: a marking on a skin. */
function spot(b: Brush, x: number, y: number, r: number): void {
  fill(b, OCHRE, oval(x, y, r, r * 0.82, x * 0.05), 0.8)
}

// --- The cloth's own marks ----------------------------------------------------

/** Fine veins of dye where the wax cracked, laid over whatever is already painted and nowhere else. */
function crackle(b: Brush, x0: number, y0: number, x1: number, y1: number, rng: Rng, veins: number): void {
  const g = b.g
  g.save()
  g.globalCompositeOperation = 'source-atop'
  g.strokeStyle = VEIN
  g.lineCap = 'round'
  for (let v = 0; v < veins; v++) {
    let x = x0 + rng.next() * (x1 - x0), y = y0 + rng.next() * (y1 - y0), heading = rng.next() * TAU
    g.lineWidth = 0.45 + rng.next() * 0.5
    g.beginPath()
    g.moveTo(x, y)
    const steps = 5 + Math.floor(rng.next() * 6)
    for (let s = 0; s < steps; s++) {
      heading += (rng.next() - 0.5) * 1.5
      const far = 5 + rng.next() * 12
      x += Math.cos(heading) * far
      y += Math.sin(heading) * far
      g.lineTo(x, y)
      // A vein forks now and then.
      if (rng.next() < 0.3) {
        const fork = heading + (rng.next() < 0.5 ? 1 : -1) * (0.7 + rng.next() * 0.6), long = 4 + rng.next() * 9
        g.lineTo(x + Math.cos(fork) * long, y + Math.sin(fork) * long)
        g.moveTo(x, y)
      }
    }
    g.stroke()
  }
  g.restore()
}

/** The weave of the cloth, faint, over whatever is already painted. */
function weave(b: Brush, x0: number, y0: number, x1: number, y1: number, onlyPainted: boolean): void {
  const g = b.g
  g.save()
  if (onlyPainted) g.globalCompositeOperation = 'source-atop'
  g.lineWidth = 0.5
  g.strokeStyle = 'rgba(12, 20, 52, 0.09)'
  g.beginPath()
  for (let y = y0; y <= y1; y += 3) { g.moveTo(x0, y); g.lineTo(x1, y) }
  g.stroke()
  g.strokeStyle = 'rgba(240, 236, 220, 0.05)'
  g.beginPath()
  for (let x = x0; x <= x1; x += 3) { g.moveTo(x, y0); g.lineTo(x, y1) }
  g.stroke()
  g.restore()
}

// --- The sprites ----------------------------------------------------------------

const PAINTERS: Record<Exclude<SpriteId, 'cloth' | 'halo' | 'ink' | keyof typeof MORE>, (b: Brush) => void> = {
  fish(b) {
    fill(b, OCHRE, poly([-11, 0], [-24, -10], [-19, 0], [-24, 10]))
    fill(b, CREAM, oval(3, 0, 17, 8.5))
    cut(b, 1.2, (g) => g.arc(4, 0, 7, -1, 1))
    dot(b, 12, -2.2, 2)
  },
  puffer(b) {
    fill(b, CREAM, oval(0, 0, 32, 32))
    fill(b, OCHRE, oval(-3, 17, 22, 10), 1)
    fill(b, OCHRE, oval(-9, 4, 10, 5.5, 0.5), 1)
    cut(b, 1.2, curve([-16, 0], [-9, 4], [-2, 8]))
    dotArc(b, 0, 0, 25, 25, -2.75, -0.95, 8, 2)
    dotArc(b, 0, 0, 17, 17, -2.6, -1.3, 5, 1.7)
    fill(b, OCHRE, oval(PARTS.pufferMouth.x - 2, PARTS.pufferMouth.y, 7, 8), 1)
    dot(b, PARTS.pufferMouth.x, PARTS.pufferMouth.y, 2.6)
    eye(b, 15, -9, 11)
  },
  pufferSpikes(b) {
    for (let i = 0; i < 18; i++) {
      const angle = (i / 18) * TAU + 0.17, c = Math.cos(angle), s = Math.sin(angle)
      // No spike over its face.
      if (c > 0.72 && Math.abs(s) < 0.6) continue
      fill(b, CREAM, poly([28 * c - 4 * s, 28 * s + 4 * c], [28 * c + 4 * s, 28 * s - 4 * c], [45 * c, 45 * s]), 0.8)
    }
  },
  pufferTail(b) {
    fill(b, OCHRE, poly([2, -4], [-22, -16], [-17, 0], [-22, 16], [2, 4]))
    for (const [y, long] of [[-9, 18], [1, 13], [7, 19]] as const) cut(b, 1.1, curve([-4, y * 0.3], [-long * 0.66, y * 0.7], [-long, y]))
  },
  turtle(b) {
    fill(b, CREAM, poly([-82, 6], [-109, 15], [-82, 18]))
    fill(b, CREAM, loop([58, -10], [78, -14], [100, -22], [121, -8], [118, 10], [96, 16], [70, 14], [56, 16]))
    // The shell: an ochre rim, a cream dome inside it, and plates cut into the dome.
    fill(b, OCHRE, (g) => { g.ellipse(-9, 18, 82, 76, 0, Math.PI, TAU); g.closePath() })
    fill(b, CREAM, (g) => { g.ellipse(-9, 13, 71, 63, 0, Math.PI, TAU); g.closePath() }, 0.8)
    fill(b, CREAM, loop([-88, 18], [-9, 15], [70, 18], [66, 34], [-9, 40], [-84, 34]))
    cut(b, 1.8, (g) => g.ellipse(-9, 13, 42, 36, 0, Math.PI, TAU))
    for (const angle of [-2.75, -2.2, -1.57, -0.94, -0.39]) cut(b, 1.8, (g) => { g.moveTo(-9 + 42 * Math.cos(angle), 13 + 36 * Math.sin(angle)); g.lineTo(-9 + 70 * Math.cos(angle), 13 + 62 * Math.sin(angle)) })
    cut(b, 1.8, (g) => { g.moveTo(-9, 13); g.lineTo(-9, -23) })
    dotArc(b, -9, 13, 24, 20, -2.5, -0.64, 5, 2.2)
    dots(b, -74, 27, 56, 27, 10, 1.8)
    cut(b, 1.4, curve([62, -6], [66, 2], [62, 10]))
    cut(b, 1.6, curve([101, 8], [110, 9], [118, 4]))
    dot(b, 115, -8, 1.5)
    eye(b, 93, -5, 8)
  },
  turtleFlipper(b) {
    fill(b, OCHRE, loop([0, -8], [30, -14], [62, -9], [76, 2], [60, 13], [26, 13], [0, 8]))
    dots(b, 14, 0, 62, 1, 5, 1.9)
    cut(b, 1.2, curve([8, -5], [36, -9], [66, -3]))
  },
  squid(b) {
    fill(b, OCHRE, poly([-8, -98], [-54, -70], [-16, -46]))
    fill(b, OCHRE, poly([8, -98], [54, -70], [16, -46]))
    fill(b, CREAM, loop([0, -110], [19, -84], [30, -30], [28, 6], [0, 13], [-28, 6], [-30, -30], [-19, -84]))
    fill(b, CREAM, oval(0, 25, 31, 20))
    for (const [y, half, sag] of [[-74, 11, 5], [-51, 19, 8], [-27, 23, 6], [-7, 22, 9]] as const) cut(b, 1.8, curve([-half, y - 4], [-half * 0.3, y + sag], [half * 0.5, y + sag * 0.6], [half, y - 5]))
    dot(b, 0, -88, 2.1)
    eye(b, -17, 24, 10)
    eye(b, 17, 24, 10)
  },
  squidArms(b) {
    for (let i = 0; i < 6; i++) {
      const x = -22 + i * 8.8, out = x * 1.5, long = 58 + (i % 2) * 12
      line(b, CREAM, 6.5, curve([x, 0], [x + 5 * (i % 2 ? 1 : -1), long * 0.4], [out - 4 * (i % 2 ? 1 : -1), long * 0.75], [out, long]))
    }
    for (const side of [-1, 1]) {
      line(b, OCHRE, 3.2, curve([side * 9, 0], [side * 20, 30], [side * 30, 54], [side * 36, 70]))
      fill(b, OCHRE, oval(side * 37, 73, 5, 8, side * -0.3), 0.8)
    }
  },
  jelly(b) {
    fill(b, CREAM, (g) => {
      g.moveTo(-64, 8)
      g.bezierCurveTo(-66, -84, 66, -84, 64, 8)
      // A scalloped rim.
      for (let i = 0; i < 6; i++) { const x = 64 - (i + 1) * (128 / 6); g.quadraticCurveTo(x + 128 / 12, 26, x, 8) }
      g.closePath()
    })
    for (const [x, y, r] of [[-30, -18, 7], [-10, -31, 9.5], [12, -27, 6], [29, -17, 8]] as const) spot(b, x, y, r)
    cut(b, 1.6, (g) => { g.moveTo(-50, 0); g.bezierCurveTo(-50, -62, 50, -62, 50, 0) })
    dotArc(b, 0, 2, 54, 5, Math.PI * 0.92, Math.PI * 0.08, 11, 1.7)
    dot(b, -13, -6, 3.2)
    dot(b, 13, -6, 3.2)
  },
  jellyArms(b) {
    for (let i = 0; i < 7; i++) {
      const x = -48 + i * 16, long = 112 + ((i * 37) % 40), sway = i % 2 ? 7 : -7
      line(b, CREAM, 2.4, curve([x, 0], [x + sway, long * 0.25], [x - sway, long * 0.5], [x + sway, long * 0.75], [x * 0.9, long]))
    }
    for (const x of [-22, 0, 22]) {
      line(b, OCHRE, 6, curve([x, 0], [x + 8, 18], [x - 8, 36], [x + 8, 54], [x - 6, 72], [x, 88]))
      dots(b, x, 10, x, 80, 5, 1.4)
    }
  },
  shark(b) {
    fill(b, CREAM, poly([-18, -34], [0, -80], [38, -36]))
    fill(b, OCHRE, loop([28, 26], [64, 28], [40, 44], [14, 60]))
    fill(b, CREAM, (g) => {
      g.moveTo(168, -6)
      g.bezierCurveTo(140, -34, 60, -46, -20, -38)
      g.bezierCurveTo(-70, -32, -104, -16, -126, -8)
      g.lineTo(-126, 6)
      g.bezierCurveTo(-96, 20, -50, 40, 20, 44)
      g.bezierCurveTo(56, 44, 84, 34, 92, 14)
      g.bezierCurveTo(120, 14, 150, 10, 168, 2)
      g.closePath()
    })
    fill(b, OCHRE, loop([-104, 10], [-50, 32], [22, 40], [76, 30], [52, 24], [-30, 22]), 1)
    for (const x of SHARK_TEETH) fill(b, CREAM, poly([x - 4.4, 10], [x + 4.4, 10], [x, 21]), 0.6)
    for (const [x, top, low] of [[57, -17, 13], [67, -13, 9], [79, -15, 5]] as const) cut(b, 1.8, curve([x, top], [x - 5, -2], [x, low]))
    dots(b, -100, -17, 40, -34, 11, 2)
    cut(b, 1.4, curve([-110, 0], [-30, 4], [50, 0]))
    cut(b, 2.4, curve([98, -31], [112, -32], [126, -27]))
    dot(b, 151, -9, 1.8)
    eye(b, 112, -14, 10)
  },
  sharkTail(b) {
    fill(b, CREAM, loop([6, -8], [-28, -28], [-72, -66], [-50, -12], [-42, 0], [-50, 14], [-68, 64], [-26, 28], [6, 8]))
    for (const [x, y] of [[-56, -44], [-30, 3], [-48, 36]] as const) cut(b, 1.3, curve([-6, y * 0.12], [x * 0.5, y * 0.55], [x, y]))
  },
  sharkJaw(b) {
    for (const x of SHARK_TEETH) fill(b, CREAM, poly([x - 92, -3], [x - 83.4, -3], [x - 87.7, -13]), 0.6)
    fill(b, CREAM, loop([-12, -3], [30, -3], [70, -3], [72, 4], [56, 15], [24, 27], [-8, 27], [-15, 10]))
    fill(b, OCHRE, loop([-6, 14], [26, 12], [50, 12], [26, 24], [-6, 24]), 0.8)
    dots(b, 6, 4, 60, 3, 6, 1.5)
  },
  angler(b) {
    fill(b, OCHRE, loop([-70, -14], [-96, -30], [-120, -40], [-108, 0], [-120, 40], [-96, 30], [-70, 14]))
    for (const [y, long] of [[-24, 112], [-2, 104], [19, 114]] as const) cut(b, 1.3, curve([-84, y * 0.4], [-long * 0.87, y * 0.8], [-long, y * 1.3]))
    fill(b, CREAM, loop([88, -10], [62, -50], [0, -68], [-62, -50], [-90, 0], [-62, 52], [0, 72], [52, 62], [88, 36]))
    fill(b, OCHRE, oval(-12, 44, 44, 15), 1)
    fill(b, OCHRE, oval(-28, 12, 17, 8, 0.6), 1)
    cut(b, 1.2, curve([-40, 4], [-28, 12], [-16, 20]))
    // The mouth is cut wide open to the cloth, and the needle teeth are left standing in it.
    hole(b, loop([96, -6], [58, -6], [24, 12], [34, 40], [66, 48], [96, 34]))
    for (const [x, y] of [[36, 4], [48, -2], [60, -5], [72, -6], [84, -6]] as const) fill(b, CREAM, poly([x - 3.4, y], [x + 3.4, y], [x + 1, y + 19]), 0.5)
    for (const [x, y] of [[40, 42], [52, 46], [64, 47], [76, 44]] as const) fill(b, CREAM, poly([x - 3.4, y], [x + 3.4, y], [x - 1, y - 20]), 0.5)
    for (const [x, y] of [[-10, -50], [-34, -40], [-56, -22], [-64, 6], [-30, -16], [-4, -24], [16, -44], [-44, 30]] as const) dot(b, x, y, 2.3)
    cut(b, 1.6, curve([14, -10], [20, 6], [14, 22]))
    eye(b, 40, -22, 12)
  },
  anglerLamp(b) {
    line(b, CREAM, 4, curve([0, 0], [6, -30], [26, -40], [PARTS.anglerBulb.x, PARTS.anglerBulb.y]))
    fill(b, OCHRE, oval(PARTS.anglerBulb.x, PARTS.anglerBulb.y, 9, 9))
    fill(b, CREAM, oval(PARTS.anglerBulb.x, PARTS.anglerBulb.y, 4.5, 4.5), 0.6)
  },
  octopus(b) {
    fill(b, CREAM, loop([0, -92], [34, -80], [49, -46], [41, -10], [52, 26], [-52, 26], [-41, -10], [-49, -46], [-34, -80]))
    spot(b, 2, -69, 8.5)
    spot(b, -23, -57, 5)
    spot(b, 21, -60, 6.5)
    for (const side of [-1, 1]) cut(b, 1.3, curve([side * 8, -13], [side * 17, -10], [side * 26, -13]))
    dots(b, -34, 6, 34, 6, 7, 2)
    dots(b, -26, 16, 26, 16, 5, 1.6)
    eye(b, -17, -26, 10)
    eye(b, 17, -26, 10)
  },
  octopusArm(b) {
    fill(b, CREAM, loop([0, -11], [40, -12], [78, -5], [100, -13], [110, -6], [104, 6], [86, 10], [40, 11], [0, 13]))
    for (let x = 10; x <= 90; x += 13) { fill(b, OCHRE, oval(x, 5.5 - x * 0.02, 3.8, 3.8), 0.5); dot(b, x, 5.5 - x * 0.02, 1.5) }
  },
  pot(b) {
    for (const side of [-1, 1]) line(b, CREAM, 5, curve([side * 46, -30], [side * 76, -22], [side * 78, 6], [side * 56, 16]))
    fill(b, OCHRE, loop([-44, -34], [-60, 0], [-52, 42], [-30, 60], [30, 60], [52, 42], [60, 0], [44, -34]))
    fill(b, CREAM, loop([-52, -44], [52, -44], [54, -34], [52, -27], [-52, -27], [-54, -34]))
    fill(b, CREAM, loop([-58, -6], [58, -6], [59, 0], [58, 8], [-58, 8], [-59, 0]), 0.8)
    // A band of scallops round its belly.
    for (const [x, r] of [[-44, 7], [-29, 8], [-12, 9], [7, 10], [26, 8.5], [43, 8]] as const) cut(b, 1.5, (g) => g.arc(x, 5, r, Math.PI * 1.08, Math.PI * 1.92))
    dots(b, -44, 24, 44, 24, 9, 2)
    dots(b, -32, 40, 32, 40, 7, 1.6)
    cut(b, 1.2, curve([18, -22], [24, -12], [20, 0]))
  },
  blobfish(b) {
    fill(b, OCHRE, loop([-76, -4], [-100, -16], [-114, -20], [-106, 10], [-114, 38], [-98, 32], [-76, 22]))
    fill(b, CREAM, loop([106, 4], [90, -26], [50, -48], [0, -46], [-50, -26], [-88, 4], [-60, 30], [0, 42], [60, 40], [98, 26]))
    fill(b, OCHRE, oval(98, 4, 13, 12), 1)
    fill(b, OCHRE, oval(6, 24, 21, 9, 0.35), 1)
    cut(b, 1.2, curve([-8, 18], [8, 24], [24, 32]))
    // Its brows are painted on: it is cross at rest, and stays so.
    cut(b, 2.8, curve([12, -41], [24, -39], [35, -34]))
    cut(b, 2.8, curve([47, -31], [58, -35], [70, -38]))
    cut(b, 1.4, curve([38, 4], [46, 16], [40, 30]))
    dots(b, -70, 12, -10, 34, 6, 1.9)
    dots(b, -56, -12, -6, -34, 5, 1.9)
    eye(b, 58, -20, 10)
    eye(b, 24, -25, 10)
  },
  catBody(b) {
    // Its two arms reach out to the rim of the tub.
    line(b, CREAM, 12, curve([-12, -46], [-40, -50], [-62, -47]))
    fill(b, CREAM, oval(-65, -47, 8.5, 7))
    fill(b, CREAM, loop([0, -68], [22, -52], [35, -14], [30, 1], [-30, 1], [-35, -14], [-28, -46], [-14, -64]))
    fill(b, OCHRE, oval(-8, -24, 11, 17), 1)
    for (const [y, long] of [[-46, 18], [-31, 11], [-13, 15]] as const) cut(b, 2.2, curve([32, y - 4], [32 - long * 0.55, y], [32 - long, y + 7]))
    cut(b, 1.3, curve([-58, -50], [-56, -46], [-58, -42]))
    dots(b, -18, -4, 18, -4, 4, 1.7)
  },
  catHead(b) {
    for (const side of [-1, 1]) {
      fill(b, CREAM, poly([side * 31, -34], [side * 27, -61], [side * 7, -45]))
      fill(b, CREAM, poly([side * 30, -18], [side * 42, -11], [side * 29, -7]))
    }
    fill(b, CREAM, oval(0, -24, 32, 26))
    for (const side of [-1, 1]) fill(b, OCHRE, poly([side * 27, -40], [side * 25, -54], [side * 14, -45]), 0.6)
    cut(b, 2, curve([-6, -48], [-3, -43], [-7, -38]))
    cut(b, 2, curve([5, -49], [8, -45], [6, -42]))
    fill(b, OCHRE, loop([-4.5, -15], [4.5, -15], [0, -9]), 0.5)
    // Three whiskers a side, fanned, each from its own root: no two meet in a point.
    for (const side of [-1, 1]) for (const lift of [-1, 0, 1]) line(b, CREAM, 1.3, (g) => { g.moveTo(side * 22, -11 + 2.5 * lift); g.lineTo(side * 41, -11 + 8 * lift) })
    for (const eyeAt of PARTS.catEyes) eye(b, eyeAt.x, eyeAt.y, eyeAt.r)
  },
  catTail(b) {
    line(b, OCHRE, 9, curve([0, 0], [20, -12], [14, -34], [30, -50]))
    fill(b, CREAM, oval(31, -52, 6, 6), 0.8)
    for (const [x, y, long] of [[13, -8, 6], [17, -25, 4.5], [23, -39, 5.5]] as const) cut(b, 1.8, curve([x - long, y - 2], [x, y - 1], [x + long, y + 3]))
  },
  gull(b) {
    for (const x of [1, 8]) line(b, CREAM, 1.8, (g) => { g.moveTo(x, 10); g.lineTo(x, 25) })
    fill(b, CREAM, poly([-20, 2], [-34, -3], [-30, 9]))
    fill(b, CREAM, loop([-22, 2], [-6, -12], [14, -10], [20, -2], [10, 12], [-10, 12]))
    fill(b, CREAM, oval(16, -15, 9.5, 9.5))
    fill(b, OCHRE, poly([24, -18], [34, -13], [24, -10]), 0.5)
    fill(b, OCHRE, loop([-20, -2], [2, -7], [4, 5], [-22, 7]), 0.8)
    cut(b, 1.1, (g) => g.arc(-13, 0, 5.5, 0.3, 1.9))
    cut(b, 1.1, (g) => g.arc(-4, 1, 4, 0.2, 1.7))
    dot(b, 18, -17, 1.9)
  },
  kelp(b) {
    const stem: Pt[] = []
    for (let y = 0; y >= -322; y -= 23) stem.push([12 * Math.sin(y / 46), y])
    for (let y = -24; y >= -310; y -= 34) {
      const side = Math.round(y / 34) % 2 ? 1 : -1, x = 12 * Math.sin(y / 46)
      fill(b, OCHRE, oval(x + side * 17, y - 6, 17, 6.5, side * -0.6), 1)
      cut(b, 1, (g) => { g.moveTo(x + side * 5, y - 2); g.lineTo(x + side * 28, y - 11) })
    }
    line(b, CREAM, 6.5, curve(...stem))
  },
  waves(b) {
    for (let x = -WAVE_PERIOD; x < SPRITES.waves.x1 + WAVE_PERIOD; x += WAVE_PERIOD) {
      // One wave: it rises, curls over, and the curl winds in on itself.
      line(b, CREAM, 4.6, (g) => {
        g.moveTo(x, 8)
        g.bezierCurveTo(x + 34, 8, x + 48, -13, x + 78, -13)
        g.bezierCurveTo(x + 96, -13, x + 100, 6, x + 86, 6)
        g.bezierCurveTo(x + 76, 6, x + 75, -4, x + 83, -4)
      })
    }
    line(b, CREAM, 3, (g) => { g.moveTo(SPRITES.waves.x0, 8); g.lineTo(SPRITES.waves.x1, 8) })
  },
  boat(b) {
    // The stern post with its lantern, unlit until a trip is over.
    line(b, CREAM, 6, (g) => { g.moveTo(-196, -20); g.lineTo(-196, -98) })
    fill(b, OCHRE, loop([-207, -98], [-185, -98], [-183, -110], [-187, -121], [-205, -121], [-209, -110]))
    cut(b, 1.4, curve([-207, -113], [-196, -111], [-185, -113]))
    cut(b, 1.4, curve([-206, -104], [-196, -102], [-186, -104]))
    fill(b, CREAM, oval(-196, -125, 4, 3), 0.5)
    // The rod, with its reel.
    line(b, CREAM, 4.2, curve([150, -22], [196, -56], [236, -68], [265, -74]))
    // The reel is a plain drum here; its bar is drawn live across it, so that it turns with the clicks (frame.ts).
    fill(b, OCHRE, oval(170, -36, 8.5, 8), 0.8)
    // The hull.
    fill(b, CREAM, loop([-208, -22], [0, -22], [208, -22], [240, -46], [226, -8], [186, 16], [0, 28], [-172, 18], [-214, -2]))
    fill(b, OCHRE, loop([-206, -22], [0, -22], [210, -22], [236, -40], [222, -12], [0, -11], [-208, -11]), 0.8)
    dots(b, -190, -16.5, 204, -16.5, 22, 1.7)
    // A row of small scroll waves along its side.
    // (Uneven in place and in size, as wax drawn by hand is, so that they are not a row to count.)
    for (const [x, s] of [[-170, 1], [-121, 0.72], [-84, 1.12], [-30, 0.8], [8, 1.18], [61, 0.7], [96, 1.05], [150, 0.86]]) cut(b, 1.7, (g) => { g.moveTo(x - 18 * s, 8); g.bezierCurveTo(x - 4 * s, 8, x - 2 * s, 8 - 12 * s, x + 8 * s, 8 - 12 * s); g.bezierCurveTo(x + 16 * s, 8 - 12 * s, x + 16 * s, 8 - 3 * s, x + 9 * s, 8 - 4 * s) })
    dots(b, -150, 17, 160, 15, 12, 1.5)
  },
  tub(b) {
    // A wooden wash tub seen from the side: staves, two hoops with their rivets, a handle at each end, and its near rim.
    for (const side of [-1, 1]) line(b, CREAM, 4, (g) => g.arc(side * 99, -7, 9, -Math.PI / 2, Math.PI / 2, side === -1))
    fill(b, OCHRE, loop([-100, -25], [0, -19], [100, -25], [103, -18], [92, 31], [0, 34], [-92, 31], [-103, -18]))
    for (const x of [-83, -61, -42, -17, 5, 31, 49, 72, 88]) cut(b, 1.6, curve([x, -21 + Math.abs(x) * 0.03], [x * 0.96, 4], [x * 0.92, 32]))
    for (const [y, inset, sag] of [[-9, 3, 7], [18, 8, 6]] as const) {
      line(b, CREAM, 5.5, curve([-99 + inset, y - sag * 0.4], [-50, y + sag * 0.5], [0, y + sag], [50, y + sag * 0.5], [99 - inset, y - sag * 0.4]))
      fill(b, OCHRE, oval(-36 + inset * 3, y + sag * 0.72, 2, 2), 0.3)
    }
    line(b, CREAM, 3.4, curve([-101, -24], [-50, -19], [0, -17], [50, -19], [101, -24]))
  },
  tubWater(b) {
    // The water in it, seen over the near rim: indigo like the sea, with a waxed line along its top and two small waves.
    const top = (g: G): void => {
      g.moveTo(-90, 2)
      for (let i = 0; i < 4; i++) g.quadraticCurveTo(-68 + i * 45, i % 2 ? 4 : -8, -45 + i * 45, i === 3 ? 2 : -1)
    }
    fill(b, TUB_WATER, (g) => {
      top(g)
      g.quadraticCurveTo(60, 9, 0, 9)
      g.quadraticCurveTo(-60, 9, -90, 2)
      g.closePath()
    })
    line(b, CREAM, 2.6, top)
    line(b, CREAM, 1.6, curve([-52, 4], [-30, 1], [-12, 5]))
    line(b, CREAM, 1.6, curve([18, 5], [36, 2], [60, 5]))
  },
  hook(b) {
    // The plainest thing in the sea, and the clearest: a sinker and a hook, a third larger than life.
    b.g.scale(1.35, 1.35)
    fill(b, OCHRE, oval(0, 8, 5.5, 8.5))
    line(b, CREAM, 5, (g) => { g.moveTo(0, 15); g.lineTo(0, 32); g.bezierCurveTo(0, 46, 18, 46, 18, 31) })
    line(b, CREAM, 3.4, (g) => { g.moveTo(18, 31); g.lineTo(12.5, 36) })
    dot(b, 0, 6, 1.7)
    b.g.scale(1 / 1.35, 1 / 1.35)
  },
  hand(b) {
    fill(b, OCHRE, loop([-15, 72], [31, 72], [32, 78], [31, 85], [-15, 85], [-16, 78]))
    // A soft mitt with a thumb: no finger is held up by itself.
    fill(b, CREAM, loop([-12, 30], [-9, 10], [2, 0], [17, 1], [27, 11], [31, 34], [32, 60], [30, 76], [-14, 76], [-16, 58]))
    fill(b, CREAM, oval(-19, 52, 7.5, 14, -0.45))
    cut(b, 1.3, curve([-5, 31], [8, 36], [24, 30]))
  },
}

const LIGHT = '#fff3c0'
const MORE: Record<'net' | 'worm' | 'wormSpring' | 'spoon' | 'glow' | 'cheese' | 'boot' | 'tooth' | 'potGlow' | 'turtleShell' | 'squidBands' | 'sharkBones' | 'sand' | 'catFrizz', (b: Brush) => void> = {
  net(b) {
    // The landing net off the stern: a pole, a hoop on the water and a bag hanging under it, knotted in rows like scales.
    line(b, CREAM, 4, (g) => { g.moveTo(0, 0); g.lineTo(-35, 37) })
    const bag = (g: G): void => { g.moveTo(-126, 38); g.bezierCurveTo(-124, 86, -98, 114, -80, 114); g.bezierCurveTo(-62, 114, -36, 86, -34, 38); g.closePath() }
    b.g.save()
    b.g.beginPath()
    bag(b.g)
    b.g.clip()
    b.g.globalAlpha = 0.26
    fill(b, CREAM, bag, 0)
    b.g.globalAlpha = 0.9
    for (let row = 0; row < 7; row++) for (let x = -130 + (row % 2) * 8; x < -28; x += 16) line(b, CREAM, 1.1, (g) => g.arc(x, 46 + row * 11, 8.6, 0.15, Math.PI - 0.15))
    b.g.restore()
    line(b, CREAM, 4, oval(-80, 38, 46, 9))
  },
  worm(b) {
    line(b, OCHRE, 7, curve([0, 0], [-5, 9], [5, 19], [-5, 29], [3, 37], [0, 42]))
    fill(b, CREAM, oval(0, 42, 4.4, 4), 0.5)
    for (const [x, y] of [[-3, 8], [3, 17], [-3, 27], [2, 34]] as const) cut(b, 1.1, curve([x - 3.5, y - 1], [x, y + 1], [x + 3.5, y - 1]))
  },
  wormSpring(b) {
    // Frizzed into a tight spring.
    line(b, OCHRE, 4.5, (g) => { for (let i = 0; i <= 60; i++) { const turn = (i / 60) * TAU * 4.5, x = 8 * Math.sin(turn), y = 3 + i * 0.36 + 3 * Math.cos(turn); if (i === 0) g.moveTo(x, y); else g.lineTo(x, y) } })
  },
  spoon(b) {
    line(b, CREAM, 2.6, (g) => { g.moveTo(0, 0); g.lineTo(0, 14) })
    fill(b, CREAM, loop([0, 12], [9, 20], [11, 34], [0, 48], [-11, 34], [-9, 20]))
    fill(b, OCHRE, oval(-3.5, 27, 3, 8, 0.2), 0.6)
    dot(b, 0, 16.5, 1.7)
  },
  glow(b) {
    line(b, OCHRE, 3, (g) => { g.moveTo(0, 0); g.lineTo(0, 7) })
    line(b, CREAM, 10, (g) => { g.moveTo(0, 12); g.lineTo(0, 46) })
    fill(b, OCHRE, loop([-6, 6], [6, 6], [6.5, 13], [-6.5, 13]), 0.5)
    cut(b, 1.2, curve([-4, 22], [0, 24], [4, 22]))
  },
  cheese(b) {
    line(b, CREAM, 2.4, (g) => { g.moveTo(0, 0); g.lineTo(0, 9) })
    fill(b, OCHRE, loop([-19, 12], [18, 6], [20, 9], [20, 35], [-17, 37], [-20, 34]))
    fill(b, CREAM, poly([-19, 11], [18, 5], [20, 9], [-17, 16]), 0.6)
    for (const [x, y, r] of [[-8, 26, 4.6], [7, 21, 3], [11, 31, 2.2]] as const) dot(b, x, y, r)
  },
  boot(b) {
    // An old boot hung by its strap, with a hole in the toe.
    line(b, CREAM, 2.6, curve([-2, 0], [-8, 6], [-4, 12]))
    fill(b, OCHRE, loop([-15, 8], [13, 8], [14, 34], [34, 40], [47, 50], [46, 60], [-16, 60], [-18, 34]))
    fill(b, CREAM, loop([-17, 6], [15, 6], [15, 15], [-17, 15]), 0.7)
    fill(b, CREAM, loop([-18, 57], [48, 57], [48, 64], [-18, 64]), 0.7)
    hole(b, oval(38, 49, 5, 4, 0.3))
    for (const [x, y] of [[2, 23], [4, 31], [9, 38]] as const) cut(b, 1.2, curve([x - 5, y - 2], [x, y], [x + 5, y - 1]))
    fill(b, CREAM, loop([-12, 40], [-2, 39], [-1, 48], [-11, 49]), 0.5)
    cut(b, 1, curve([-10, 42], [-6, 45], [-3, 41]))
  },
  tooth(b) {
    fill(b, CREAM, poly([-4.4, -6], [4.4, -6], [0, 7]), 0.6)
  },
  potGlow(b) {
    // The stick inside the pot: light at its mouth and through its cracks.
    fill(b, LIGHT, oval(0, -36, 46, 8), 5)
    line(b, LIGHT, 2.6, curve([-34, -14], [-26, 4], [-36, 22], [-24, 44]))
    line(b, LIGHT, 2.2, curve([6, -8], [14, 12], [4, 26], [12, 50]))
    line(b, LIGHT, 2, curve([36, 0], [30, 18], [40, 34]))
    line(b, LIGHT, 1.6, curve([-26, 4], [-12, 10], [-6, 22]))
  },
  turtleShell(b) {
    // The turtle drawn into its shell: the dome, and dark holes where head, flippers and tail went in.
    fill(b, OCHRE, (g) => { g.ellipse(-9, 18, 82, 76, 0, Math.PI, TAU); g.closePath() })
    fill(b, CREAM, (g) => { g.ellipse(-9, 13, 71, 63, 0, Math.PI, TAU); g.closePath() }, 0.8)
    fill(b, CREAM, loop([-88, 18], [-9, 15], [70, 18], [66, 34], [-9, 40], [-84, 34]))
    cut(b, 1.8, (g) => g.ellipse(-9, 13, 42, 36, 0, Math.PI, TAU))
    for (const angle of [-2.75, -2.2, -1.57, -0.94, -0.39]) cut(b, 1.8, (g) => { g.moveTo(-9 + 42 * Math.cos(angle), 13 + 36 * Math.sin(angle)); g.lineTo(-9 + 70 * Math.cos(angle), 13 + 62 * Math.sin(angle)) })
    cut(b, 1.8, (g) => { g.moveTo(-9, 13); g.lineTo(-9, -23) })
    dotArc(b, -9, 13, 24, 20, -2.5, -0.64, 5, 2.2)
    hole(b, oval(62, 24, 9, 7))
    hole(b, oval(38, 33, 8, 4.5))
    hole(b, oval(-62, 32, 8, 4.5))
    hole(b, oval(-82, 25, 5, 4))
  },
  squidBands(b) {
    for (const [y, half, sag] of [[-84, 9, 4], [-62, 16, 7], [-39, 21, 7], [-17, 22, 8], [3, 18, 6]] as const) line(b, LIGHT, 5, curve([-half, y - 4], [-half * 0.3, y + sag], [half * 0.5, y + sag * 0.6], [half, y - 5]))
  },
  sharkBones(b) {
    // What the light inside it shows: a backbone, ribs, and an old boot it once swallowed.
    const bone = 'rgba(19, 26, 60, 0.82)'
    line(b, bone, 3.4, curve([-104, -2], [-40, -10], [30, -12], [86, -8]))
    for (const [x, long] of [[-60, 20], [-38, 26], [-14, 30], [10, 30], [34, 26], [56, 19]] as const) line(b, bone, 2.2, curve([x, -9], [x - 7, long * 0.5], [x + 2, long]))
    fill(b, bone, loop([-28, 6], [-16, 6], [-15, 20], [-4, 23], [0, 30], [-29, 30]), 0.4)
  },
  sand(b) {
    fill(b, OCHRE, loop([-112, 44], [-96, 2], [-48, -22], [10, -26], [64, -12], [104, 14], [114, 44]))
    for (const [x, y, r] of [[-70, 10, 2.2], [-38, -6, 1.6], [-6, 6, 2.6], [22, -10, 1.8], [52, 12, 2.3], [84, 26, 1.5], [-88, 30, 1.7], [10, 28, 1.4]] as const) dot(b, x, y, r)
    cut(b, 1.2, curve([-60, 26], [-30, 20], [0, 28]))
  },
  catFrizz(b) {
    for (let i = 0; i < 26; i++) {
      const angle = (i / 26) * TAU + 0.1, c = Math.cos(angle), s2 = Math.sin(angle), long = 50 + 9 * Math.abs(Math.sin(i * 2.3))
      // Nothing sticks out under its seat.
      if (s2 > 0.72) continue
      fill(b, CREAM, poly([-4 + 34 * c - 5 * s2, -40 + 38 * s2 + 5 * c], [-4 + 34 * c + 5 * s2, -40 + 38 * s2 - 5 * c], [-4 + long * c, -40 + (long + 2) * s2]), 0.6)
    }
  },
}

/** A soft round light, laid on as light: the jellyfish's glow, the anglerfish's lamp, the glow that marks the hook. */
function paintHalo(b: Brush): void {
  const g = b.g, glow = g.createRadialGradient(0, 0, 0, 0, 0, 84)
  glow.addColorStop(0, 'rgba(255, 246, 196, 0.8)')
  glow.addColorStop(0.35, 'rgba(250, 240, 180, 0.34)')
  glow.addColorStop(1, 'rgba(250, 240, 180, 0)')
  g.fillStyle = glow
  g.fillRect(-84, -84, 168, 168)
}

/** The squid's ink: a blot of the darkest dye. */
function paintInk(b: Brush, rng: Rng): void {
  for (let i = 0; i < 9; i++) {
    const angle = rng.next() * TAU, far = rng.next() * 38, r = 20 + rng.next() * 24
    fill(b, '#050818', oval(Math.cos(angle) * far, Math.sin(angle) * far, r, r), 5)
  }
}

/** A seed for each sprite's crackle, so the cloth looks the same on every visit. */
function seedOfName(name: string): number {
  let seed = 2166136261
  for (let i = 0; i < name.length; i++) seed = Math.imul(seed ^ name.charCodeAt(i), 16777619)
  return seed >>> 0
}

/** Paints one sprite. The context is already scaled and moved so that the sprite's pivot is at (0, 0). */
export function paintSprite(id: SpriteId, b: Brush): void {
  const box = SPRITES[id], rng = makeRng(seedOfName(id))
  if (id === 'cloth') return paintCloth(b, rng)
  if (id === 'halo') return paintHalo(b)
  if (id === 'ink') return paintInk(b, rng)
  if (id in MORE) MORE[id as keyof typeof MORE](b)
  else PAINTERS[id as keyof typeof PAINTERS](b)
  // Light is laid on as light, with no cloth of its own.
  if (id === 'potGlow' || id === 'squidBands') return
  const area = (box.x1 - box.x0) * (box.y1 - box.y0)
  crackle(b, box.x0, box.y0, box.x1, box.y1, rng, Math.max(3, Math.round(area / 900)))
  weave(b, box.x0, box.y0, box.x1, box.y1, true)
}

// --- The cloth itself -------------------------------------------------------

/** A cloud of the old cloud pattern: lobes left light, with bands cut inside each. */
function cloud(b: Brush, x: number, y: number, size: number): void {
  const lobes: readonly [number, number, number][] = [[-34, 4, 20], [-10, -10, 26], [22, -4, 22], [44, 8, 15]]
  for (const [lx, ly, r] of lobes) fill(b, CREAM, oval(x + lx * size, y + ly * size, r * size, r * size * 0.82))
  fill(b, CREAM, loop([x - 52 * size, y + 8 * size], [x + 56 * size, y + 10 * size], [x + 54 * size, y + 22 * size], [x - 50 * size, y + 21 * size]))
  for (const [lx, ly, r] of lobes) {
    cut(b, 1.6 * size, (g) => g.ellipse(x + lx * size, y + ly * size, r * size * 0.66, r * size * 0.54, 0, Math.PI * 0.95, Math.PI * 2.05))
    cut(b, 1.4 * size, (g) => g.ellipse(x + lx * size, y + ly * size, r * size * 0.34, r * size * 0.26, 0, Math.PI * 0.95, Math.PI * 2.05))
  }
}

/** A fan of coral: a stem that forks, with a bead at each tip. */
function coral(b: Brush, x: number, y: number, angle: number, long: number, depth: number): void {
  const tx = x + Math.cos(angle) * long, ty = y + Math.sin(angle) * long
  line(b, CREAM, 1.2 + depth * 0.9, (g) => { g.moveTo(x, y); g.lineTo(tx, ty) })
  if (depth === 0) return fill(b, OCHRE, oval(tx, ty, 2.6, 2.6), 0.4)
  coral(b, tx, ty, angle - 0.42, long * 0.74, depth - 1)
  coral(b, tx, ty, angle + 0.38, long * 0.7, depth - 1)
}

/** Paints a group of figures on a layer of their own, cracks it, and lays it on the cloth at a strength: how much light reaches it. */
function layer(b: Brush, strength: number, veins: number, rng: Rng, top: number, bottom: number, paint: (b: Brush) => void): void {
  const under = b.g, canvas = under.canvas.ownerDocument.createElement('canvas')
  canvas.width = under.canvas.width
  canvas.height = under.canvas.height
  const over = canvas.getContext('2d')!
  over.setTransform(under.getTransform())
  const brush = { g: over, d: b.d }
  paint(brush)
  crackle(brush, 0, top, 1180, bottom, rng, veins)
  under.save()
  under.setTransform(1, 0, 0, 1, 0, 0)
  under.globalAlpha = strength
  under.drawImage(canvas, 0, 0)
  under.restore()
}

function paintCloth(b: Brush, rng: Rng): void {
  const g = b.g
  const sky = g.createLinearGradient(0, 0, 0, WATERLINE)
  sky.addColorStop(0, SKY[0])
  sky.addColorStop(1, SKY[1])
  g.fillStyle = sky
  g.fillRect(0, 0, 1180, WATERLINE)
  const sea = g.createLinearGradient(0, WATERLINE, 0, 820)
  for (const [stop, color] of SEA) sea.addColorStop(stop, color)
  g.fillStyle = sea
  g.fillRect(0, WATERLINE, 1180, 820 - WATERLINE)

  // Hand-dyed cloth is never even: soft patches a little lighter and a little darker.
  for (let i = 0; i < 70; i++) {
    const x = rng.next() * 1180, y = rng.next() * 820, r = 50 + rng.next() * 130
    const patch = g.createRadialGradient(x, y, 0, x, y, r), tint = rng.next() < 0.5 ? '255, 255, 255' : '4, 8, 30'
    patch.addColorStop(0, `rgba(${tint}, 0.07)`)
    patch.addColorStop(1, `rgba(${tint}, 0)`)
    g.fillStyle = patch
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }

  // The sky: a sun, clouds, a low island, and the two posts with the bait rope between them.
  layer(b, 0.62, 60, rng, 0, WATERLINE, (sky) => {
    fill(sky, CREAM, oval(66, 60, 25, 25))
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * TAU, c = Math.cos(angle), s = Math.sin(angle)
      fill(sky, OCHRE, poly([66 + 33 * c - 6 * s, 60 + 33 * s + 6 * c], [66 + 33 * c + 6 * s, 60 + 33 * s - 6 * c], [66 + 50 * c, 60 + 50 * s]), 0.8)
    }
    // A curl inside the sun, as the old cloths have it.
    cut(sky, 1.6, (g2) => { g2.arc(66, 60, 15, 0.7, 4.9); g2.arc(63, 57, 8, 4.9, 8.2) })
    cloud(sky, 206, 52, 1)
    cloud(sky, 596, 44, 0.5)
    cloud(sky, 80, 138, 0.6)
    cloud(sky, 1012, 34, 0.56)
    // The island on the horizon, low enough to leave the baits on the rope clear against the sky.
    fill(sky, CREAM, (g2) => { g2.moveTo(948, WATERLINE + 4); g2.bezierCurveTo(980, 168, 1040, 160, 1090, 166); g2.bezierCurveTo(1130, 170, 1160, 174, 1180, WATERLINE + 4); g2.closePath() })
    for (let x = 972; x < 1170; x += 18) cut(sky, 1.3, (g2) => g2.arc(x, 178 - 6 * Math.sin(((x - 950) / 230) * Math.PI), 6, Math.PI, TAU))
  })
  layer(b, 0.9, 12, rng, 0, WATERLINE + 30, (posts) => {
    line(posts, CREAM, 2.4, curve([GULL.x, 74], [800, 84], [1010, 82], [1128, 70]))
    line(posts, CREAM, 7, (g2) => { g2.moveTo(GULL.x, 68); g2.lineTo(GULL.x, WATERLINE + 16) })
    line(posts, CREAM, 7, (g2) => { g2.moveTo(1128, 64); g2.lineTo(1128, WATERLINE + 16) })
    // A peg for each bait along the rope: a bait that is out leaves its peg bare.
    for (const peg of Object.values(PEGS)) fill(posts, OCHRE, loop([peg.x - 3.5, peg.y - 9], [peg.x + 3.5, peg.y - 9], [peg.x + 2.5, peg.y + 3], [peg.x - 2.5, peg.y + 3]), 0.5)
    for (const x of [GULL.x, 1128]) { fill(posts, OCHRE, poly([x - 6, 96], [x + 6, 96], [x + 6, 106], [x - 6, 106]), 0.5); fill(posts, OCHRE, poly([x - 6, 150], [x + 6, 150], [x + 6, 160], [x - 6, 160]), 0.5) }
  })

  // The sea's own filling pattern: rows of small arcs, hardly there, so that open water is still cloth.
  layer(b, 0.075, 0, rng, WATERLINE, 820, (fine) => {
    for (let row = 0, y = WATERLINE + 36; y < SEABED - 10; y += 30, row++) {
      for (let x = (row % 2) * 24 + 10; x < 1180; x += 48) line(fine, CREAM, 1.6, (g2) => g2.arc(x, y, 10, Math.PI * 1.1, Math.PI * 1.9))
    }
  })

  // The seabed, dim because little light gets there: sand, rock walls, a wreck's ribs, coral, shells by the pot.
  layer(b, 0.34, 90, rng, 520, 820, (bed) => {
    fill(bed, CREAM, loop([0, 548], [34, 566], [60, 628], [44, 694], [74, 752], [62, 830], [-20, 830], [-20, 560]))
    fill(bed, CREAM, loop([1180, 512], [1150, 540], [1124, 606], [1146, 676], [1114, 748], [1122, 830], [1200, 830], [1200, 520]))
    for (let y = 590; y < 800; y += 26) {
      cut(bed, 1.4, (g2) => { g2.arc(22, y, 13, Math.PI, TAU); g2.moveTo(52, y + 13); g2.arc(40, y + 13, 12, 0, Math.PI, true) })
      cut(bed, 1.4, (g2) => { g2.arc(1160, y, 13, Math.PI, TAU); g2.moveTo(1152, y + 13); g2.arc(1140, y + 13, 12, 0, Math.PI, true) })
    }
    // The wreck: a keel and five ribs.
    line(bed, CREAM, 5, curve([404, SEABED + 2], [470, SEABED - 8], [560, SEABED + 4]))
    for (let i = 0; i < 5; i++) { const x = 420 + i * 30; line(bed, CREAM, 4, curve([x, SEABED - 2], [x - 16, SEABED - 40 - i * 4], [x + 4, SEABED - 70 - i * 5])) }
    coral(bed, 118, SEABED + 4, -1.4, 36, 3)
    coral(bed, 654, SEABED + 6, -1.7, 30, 3)
    coral(bed, 842, SEABED + 6, -1.5, 40, 3)
    coral(bed, 1076, SEABED + 2, -1.75, 34, 3)
    // The blobfish's bank of sand.
    fill(bed, OCHRE, (g2) => { g2.ellipse(CREATURES.blobfish.home.x, SEABED + 8, 150, 26, 0, Math.PI, TAU); g2.closePath() })
    // Shells at the mouth of the pot.
    for (const [x, y, r] of [[286, SEABED - 2, 9], [306, SEABED + 2, 6], [118, SEABED, 7]] as const) { fill(bed, CREAM, oval(x, y, r, r * 0.8)); cut(bed, 1.2, (g2) => g2.arc(x, y, r * 0.5, 0.4, 5)) }
  })
  layer(b, 0.42, 40, rng, SEABED - 20, 820, (sand) => {
    fill(sand, OCHRE, (g2) => {
      g2.moveTo(-10, 830)
      g2.lineTo(-10, SEABED + 4)
      for (let x = 0; x <= 1180; x += 59) g2.quadraticCurveTo(x + 29, SEABED - 5 + ((x / 59) % 2) * 10, x + 59, SEABED + 4)
      g2.lineTo(1190, 830)
      g2.closePath()
    })
    for (let i = 0; i < 70; i++) dot(sand, rng.next() * 1180, SEABED + 10 + rng.next() * 20, 1 + rng.next() * 1.3)
    // The cloth's border: scallops along its bottom edge.
    for (let x = 0; x < 1180; x += 26) hole(sand, (g2) => g2.arc(x + 13, 824, 11, Math.PI, TAU))
  })
  // The kelp that does not move, and points of light in the deep water.
  layer(b, 0.36, 14, rng, 420, 820, (weed) => {
    for (const frond of STILL_KELP) {
      weed.g.save()
      weed.g.translate(frond.x, frond.y)
      weed.g.scale(1, frond.tall)
      PAINTERS.kelp(weed)
      weed.g.restore()
    }
    SPARKS.forEach((spark, index) => fill(weed, CREAM, oval(spark.x, spark.y, 2 + (index % 3), 2 + (index % 3)), 3))
  })
  weave(b, 0, 0, 1180, 820, false)
}
