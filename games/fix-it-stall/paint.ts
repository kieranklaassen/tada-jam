// The Electronics bench look: its colours and the few drawing helpers every
// painter here shares. Seen from straight above in daylight: green solder
// mask, copper traces, solder blobs, parts in their real colours, crocodile
// clips, and a grey bench mat. No brass, no walnut, no dim room.

export type Ctx = CanvasRenderingContext2D

export const INK = {
  mat: '#b7bdc3',
  matSpeck: '#a9b0b7',
  matEdge: '#98a0a8',
  lane: '#e9dcc0',
  laneStone: '#dccdab',
  counter: '#d7dbdf',
  counterEdge: '#aab1b8',
  mask: '#1d7a4c',
  maskEdge: '#145a37',
  maskLight: '#27905b',
  copper: '#c4712a',
  copperLight: '#f2b56b',
  solder: '#cdd4d9',
  solderDark: '#7b858c',
  white: '#ffffff',
  shadow: 'rgba(28, 36, 44, 0.28)',
  cellBody: '#2a323d',
  cellBand: '#e8782a',
  steel: '#c3c9cf',
  steelDark: '#868f97',
  black: '#1e2329',
  plastic: '#30363d',
  glass: '#f6f1da',
  glassBlown: '#6f6a64',
  filament: '#8a6a3a',
  glow: '#ffd27a',
  motorCap: '#e6b422',
  blade: 'rgba(52, 152, 170, 0.72)',
  red: '#d6453c',
  yellow: '#efc02f',
  green: '#3da35a',
  blue: '#3c7fd0',
  case: '#b4443b',
  caseDark: '#8c312b',
  tray: '#dfeaf0',
  trayEdge: '#a9bcc7',
  bead: '#ffe2a8',
  beadEdge: '#b9651f',
  hot: '#ff8a2a',
  pencil: '#e9b93a',
  graphite: '#4a4d52',
  rubber: '#e58f9b',
  wood: '#d9bb8a',
  string: '#ece4d2',
} as const

export const LEAD_COLOURS = [INK.yellow, INK.red, INK.green, INK.blue] as const

/** A rounded rectangle path. */
export function roundRect(c: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const k = Math.min(r, w / 2, h / 2)
  c.beginPath()
  c.moveTo(x + k, y)
  c.arcTo(x + w, y, x + w, y + h, k)
  c.arcTo(x + w, y + h, x, y + h, k)
  c.arcTo(x, y + h, x, y, k)
  c.arcTo(x, y, x + w, y, k)
  c.closePath()
}

export function disc(c: Ctx, x: number, y: number, r: number, fill: string): void {
  c.beginPath()
  c.arc(x, y, r, 0, Math.PI * 2)
  c.fillStyle = fill
  c.fill()
}

/**
 * Draw something with the daylight's small soft shadow under it. Only for the
 * layer that is painted once: a blurred shadow is too dear to draw each frame.
 */
export function lifted(c: Ctx, height: number, paint: () => void): void {
  // A shadow's blur and offset are in canvas pixels whatever the transform, so they are scaled by hand.
  const k = c.getTransform().a
  c.save()
  c.shadowColor = INK.shadow
  c.shadowBlur = height * 1.6 * k
  c.shadowOffsetX = height * 0.5 * k
  c.shadowOffsetY = height * 0.9 * k
  paint()
  c.restore()
}

/** A seeded stream for the specks and the scatter, so the same scene is painted on every load. */
export function stream(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
