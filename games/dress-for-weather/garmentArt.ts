import { GARMENTS, PAIRS, type Garment } from './kinds'
import { BUTTON_AT, ZIP } from './layout'
import { KEY_LINE, PAPER, PAPER_BACK, boundsOf, printed, ring, round, sprite, type Pen, type PieceArt, type Ring, type Sprite } from './paper'

// The seven garments as printed paper. They are the working pieces, so each
// is one flat colour with a few printed lines and nothing else: no pattern,
// no face, and no motion at rest (pack: game-design,
// working-objects-stay-plain.md). Each is drawn round its pin (layout.ts);
// of a pair, the piece on the viewer's right is drawn and the other mirrors it.

const line = (g: Pen, width = 1.6): void => {
  g.strokeStyle = KEY_LINE
  g.lineWidth = width
  g.lineCap = 'round'
  g.stroke()
}

const COAT: Ring = ring(-24, -8, 24, -8, 70, 10, 114, 126, 92, 140, 64, 78, 72, 232, -72, 232, -64, 78, -92, 140, -114, 126, -70, 10)
const DUFFEL: Ring = ring(-30, -12, 30, -12, 72, 10, 114, 124, 90, 140, 64, 80, 82, 232, -82, 232, -64, 80, -90, 140, -114, 124, -72, 10)
const BOOT: Ring = ring(-22, -4, 22, -4, 22, 44, 40, 52, 42, 70, -22, 70)
const HAT: Ring = ring(-74, 18, -76, -2, -66, -34, -44, -58, -16, -70, 16, -70, 44, -58, 66, -34, 76, -2, 74, 18)
const BOBBLE: Ring = round(0, -84, 20, 20, 10, 0.3)
const SCARF_LOOP: Ring = ring(-60, -16, 60, -16, 62, 16, -62, 16)
const SCARF_TAIL: Ring = ring(22, 6, 56, 6, 64, 150, 30, 154)
const MITTEN: Ring = ring(-22, -4, 22, -4, 24, 30, 18, 52, 0, 58, -16, 52, -22, 38, -34, 32, -34, 16, -22, 14)
const SHAFT: Ring = ring(-3, -172, 3, -172, 3, 2, -3, 2)
const CROOK: Ring = ring(-3, 0, 3, 0, 3, 20, -6, 32, -20, 24, -17, 14, -8, 20, -3, 14)
const FURLED: Ring = ring(0, -176, 15, -146, 13, -58, 0, -40, -13, -58, -15, -146)
const CANOPY: Ring = ring(-114, -118, -96, -156, -56, -182, 0, -190, 56, -182, 96, -156, 114, -118, 76, -132, 38, -118, 0, -132, -38, -118, -76, -132)

export const COLOURS: Record<Garment, { colour: string; shade: string }> = {
  raincoat: { colour: '#f3c63a', shade: '#b98a12' },
  duffel: { colour: '#cf4a40', shade: '#8f2a25' },
  boots: { colour: '#33549a', shade: '#1d3468' },
  hat: { colour: '#ef7f30', shade: '#b4520f' },
  scarf: { colour: '#7d5bbb', shade: '#523789' },
  mittens: { colour: '#e25c92', shade: '#a8336a' },
  umbrella: { colour: '#2aa39c', shade: '#167069' },
}

const WOOD = '#9a6a3c'

/** The printed details of each garment: a few lines, and nothing a child needs to read. */
const PRINTS: Record<Garment, (g: Pen) => void> = {
  raincoat: (g) => {
    g.beginPath()
    // The collar's two points, the pocket flaps and the cuffs.
    g.moveTo(-24, -6); g.lineTo(-6, 18); g.lineTo(-30, 14)
    g.moveTo(24, -6); g.lineTo(6, 18); g.lineTo(30, 14)
    g.moveTo(-58, 160); g.lineTo(-22, 160); g.moveTo(22, 160); g.lineTo(58, 160)
    g.moveTo(-108, 112); g.lineTo(-86, 126); g.moveTo(108, 112); g.lineTo(86, 126)
    line(g)
  },
  duffel: (g) => {
    g.beginPath()
    // The hood's edge, the front that laps over, the slits for the buttons, the pockets and the cuffs.
    g.moveTo(-30, -10); g.lineTo(0, 22); g.lineTo(30, -10)
    g.moveTo(14, 22); g.lineTo(14, 230)
    for (const b of BUTTON_AT) { g.moveTo(22, b.y - 9); g.lineTo(22, b.y + 9) }
    g.moveTo(-64, 150); g.lineTo(-30, 150); g.lineTo(-30, 188); g.lineTo(-64, 188)
    g.moveTo(40, 150); g.lineTo(66, 150); g.lineTo(66, 188); g.lineTo(40, 188); g.closePath()
    g.moveTo(-110, 108); g.lineTo(-86, 124); g.moveTo(110, 108); g.lineTo(86, 124)
    line(g)
  },
  boots: (g) => {
    g.beginPath()
    g.moveTo(-22, 6); g.lineTo(22, 6)
    g.moveTo(-22, 62); g.lineTo(42, 62)
    line(g)
  },
  hat: (g) => {
    g.beginPath()
    // The turned-up band and its ribs, and the bobble's wool: a few curls that all lie one way, a tuft and not spokes.
    g.moveTo(-76, -2); g.lineTo(76, -2)
    for (let x = -60; x <= 60; x += 20) { g.moveTo(x, 2); g.lineTo(x, 15) }
    g.moveTo(-13, -86); g.quadraticCurveTo(-9, -97, 1, -93)
    g.moveTo(-3, -78); g.quadraticCurveTo(3, -90, 12, -83)
    g.moveTo(-10, -74); g.quadraticCurveTo(-7, -80, -1, -77)
    line(g)
  },
  scarf: (g) => {
    g.beginPath()
    // Where the tail comes out of the loop, and the fringe.
    g.moveTo(20, -14); g.lineTo(26, 14)
    g.moveTo(31, 136); g.lineTo(63, 133)
    for (let i = 0; i < 5; i++) { g.moveTo(35 + i * 6.4, 138); g.lineTo(34 + i * 6.6, 151) }
    line(g)
  },
  mittens: (g) => {
    g.beginPath()
    g.moveTo(-22, 8); g.lineTo(22, 8)
    g.moveTo(-18, 30); g.lineTo(-22, 36)
    line(g)
  },
  umbrella: () => {},
}

export const GARMENT_ART: Record<Garment, PieceArt> = {
  raincoat: { rings: [COAT], ...COLOURS.raincoat, print: PRINTS.raincoat },
  duffel: { rings: [DUFFEL], ...COLOURS.duffel, print: PRINTS.duffel },
  boots: { rings: [BOOT], ...COLOURS.boots, print: PRINTS.boots, corner: 5 },
  hat: { rings: [HAT, BOBBLE], ...COLOURS.hat, print: PRINTS.hat },
  scarf: { rings: [SCARF_LOOP, SCARF_TAIL], ...COLOURS.scarf, print: PRINTS.scarf, corner: 5 },
  mittens: { rings: [MITTEN], ...COLOURS.mittens, print: PRINTS.mittens, corner: 6 },
  umbrella: { rings: [FURLED], ...COLOURS.umbrella, corner: 4 },
}

const HANDLE_ART: PieceArt = { rings: [SHAFT, CROOK], colour: WOOD, shade: '#6b4522', corner: 2, flat: true }
const CANOPY_ART: PieceArt = {
  rings: [CANOPY],
  ...COLOURS.umbrella,
  print: (g) => {
    g.beginPath()
    for (const [x, y] of [[-76, -132], [-38, -118], [0, -132], [38, -118], [76, -132]] as const) { g.moveTo(0, -190); g.lineTo(x, y) }
    line(g)
  },
}

/** The canopy blown inside out: the same paper, bowl upward. */
const CANOPY_UP: Ring = CANOPY.map((v, i) => (i % 2 ? -308 - v : v))
const CANOPY_UP_ART: PieceArt = { rings: [CANOPY_UP], ...COLOURS.umbrella }

/** The outlines of a garment's paper, for the dotted cut-line and the glow. */
export function outlinesOf(garment: Garment, open: boolean): readonly Ring[] {
  if (garment === 'umbrella') return open ? [CANOPY, SHAFT, CROOK] : [FURLED, SHAFT, CROOK]
  return GARMENT_ART[garment].rings
}

/** A tab: where it leaves the garment, which way it points, and how long and wide it is. For a pair, the tab of the right-hand piece. */
export type Tab = { x: number; y: number; angle: number; long: number; wide: number }

const UP = -Math.PI / 2, DOWN = Math.PI / 2, RIGHT = 0, LEFT = Math.PI

export const TAB_AT: Record<Garment, readonly Tab[]> = {
  raincoat: [{ x: -46, y: 2, angle: UP, long: 20, wide: 24 }, { x: 46, y: 2, angle: UP, long: 20, wide: 24 }, { x: -67, y: 150, angle: LEFT, long: 20, wide: 26 }, { x: 67, y: 150, angle: RIGHT, long: 20, wide: 26 }],
  duffel: [{ x: -48, y: 2, angle: UP, long: 20, wide: 24 }, { x: 48, y: 2, angle: UP, long: 20, wide: 24 }, { x: -70, y: 150, angle: LEFT, long: 20, wide: 26 }, { x: 70, y: 150, angle: RIGHT, long: 20, wide: 26 }],
  boots: [{ x: 21, y: 18, angle: RIGHT, long: 16, wide: 20 }],
  hat: [{ x: -62, y: 16, angle: DOWN, long: 18, wide: 22 }, { x: 62, y: 16, angle: DOWN, long: 18, wide: 22 }],
  scarf: [{ x: -60, y: 0, angle: LEFT, long: 18, wide: 20 }, { x: 60, y: -4, angle: RIGHT, long: 18, wide: 18 }],
  mittens: [{ x: 22, y: 12, angle: RIGHT, long: 15, wide: 18 }],
  umbrella: [{ x: 3, y: -22, angle: RIGHT, long: 18, wide: 20 }],
}

/** Adds one tab to the pen's path, `fold` of the way over: the further it has turned over the edge, the less of it shows. */
export function traceTab(g: Pen, tab: Tab, fold: number): void {
  const long = tab.long * (1 - 0.74 * fold)
  g.save()
  g.translate(tab.x, tab.y)
  g.rotate(tab.angle)
  g.moveTo(-2, -tab.wide / 2)
  g.lineTo(long - 3, -tab.wide / 2)
  g.lineTo(long, -tab.wide / 2 + 3)
  g.lineTo(long, tab.wide / 2 - 4)
  g.lineTo(long - 4, tab.wide / 2)
  g.lineTo(-2, tab.wide / 2)
  g.closePath()
  g.restore()
}

/**
 * Tabs as one fill and one stroke: flat, a tab is a white flap; past half way over it shows its darker back.
 * `folds` gives how far over each one is, and the tabs of one piece turn one after the other, so they are
 * painted in the colour of the furthest.
 */
export function drawTabs(g: Pen, tabs: readonly Tab[], folds: readonly number[]): void {
  g.beginPath()
  tabs.forEach((tab, index) => traceTab(g, tab, folds[index] ?? 0))
  g.fillStyle = folds.some((fold) => fold > 0.5) ? PAPER_BACK : PAPER
  g.fill()
  g.strokeStyle = 'rgba(74, 63, 58, 0.55)'
  g.lineWidth = 1
  g.stroke()
}

/** How a garment's tabs are drawn into a sprite: flat out as on the rack, folded over as worn, or left out, for the frames in which they turn. */
export type TabState = 'flat' | 'folded' | 'none'

export type GarmentSprites = {
  /** Each garment with its tabs in each state. For a pair, the right-hand piece. */
  piece: Record<Garment, Record<TabState, Sprite>>
  /** The umbrella open, in each state. */
  openUmbrella: Record<TabState, Sprite>
  /** The umbrella as the wind leaves it: inside out. */
  blownUmbrella: Sprite
  /** A warm halo of each garment's shape, for the idle glow. */
  glow: Record<Garment, Sprite>
  /** The zip's slider, the lining its open front shows, and one duffel button. */
  slider: Sprite
  toggle: Sprite
  /** A small round halo, for the slider. */
  spot: Sprite
}

export const LINING = '#a8780e'
export const TEETH = '#6a6a74'
export const GLOW = '#ff9d00'

function paintGarment(g: Pen, garment: Garment, open: boolean, tabs: TabState, seed: number): void {
  if (tabs !== 'none') drawTabs(g, TAB_AT[garment], TAB_AT[garment].map(() => (tabs === 'folded' ? 1 : 0)))
  if (garment === 'umbrella') {
    printed(g, HANDLE_ART, seed + 1)
    printed(g, open ? CANOPY_ART : GARMENT_ART.umbrella, seed)
    return
  }
  printed(g, GARMENT_ART[garment], seed)
  if (garment === 'raincoat') {
    // The zip's tape, printed down the front: the teeth themselves are drawn as they close.
    g.beginPath()
    g.moveTo(ZIP.x - 5, ZIP.top - 6); g.lineTo(ZIP.x - 5, ZIP.bottom + 6)
    g.moveTo(ZIP.x + 5, ZIP.top - 6); g.lineTo(ZIP.x + 5, ZIP.bottom + 6)
    g.strokeStyle = 'rgba(74, 63, 58, 0.5)'
    g.lineWidth = 1
    g.stroke()
  }
}

/** Every garment sprite, made once at a density. */
export function makeGarmentSprites(density: number): GarmentSprites {
  const states: TabState[] = ['flat', 'folded', 'none']
  const boxOf = (garment: Garment, open: boolean) => {
    const box = boundsOf(outlinesOf(garment, open))
    // Room for the tabs, which stick out past the paper.
    return { x0: box.x0 - 22, y0: box.y0 - 22, x1: box.x1 + 22, y1: box.y1 + 22 }
  }
  const piece = {} as GarmentSprites['piece']
  GARMENTS.forEach((garment, index) => {
    piece[garment] = Object.fromEntries(states.map((state) => [state, sprite(boxOf(garment, false), density, (g) => paintGarment(g, garment, false, state, 11 + index * 7))])) as Record<TabState, Sprite>
  })
  const openUmbrella = Object.fromEntries(states.map((state) => [state, sprite(boxOf('umbrella', true), density, (g) => paintGarment(g, 'umbrella', true, state, 53))])) as Record<TabState, Sprite>
  const blownUmbrella = sprite(boxOf('umbrella', true), density, (g) => {
    printed(g, HANDLE_ART, 54)
    printed(g, CANOPY_UP_ART, 55)
  })
  const glow = {} as GarmentSprites['glow']
  for (const garment of GARMENTS) {
    const box = boxOf(garment, false)
    glow[garment] = sprite(box, density, (g) => {
      g.shadowColor = GLOW
      g.shadowBlur = 16 * density
      g.fillStyle = GLOW
      for (let pass = 0; pass < 2; pass++) {
        g.beginPath()
        for (const r of outlinesOf(garment, false)) {
          g.moveTo(r[0], r[1])
          for (let i = 2; i < r.length; i += 2) g.lineTo(r[i], r[i + 1])
          g.closePath()
        }
        g.fill()
      }
    }, 30)
  }
  const slider = sprite({ x0: -13, y0: -10, x1: 13, y1: 30 }, density, (g) => {
    printed(g, { rings: [ring(-11, -8, 11, -8, 11, 8, -11, 8)], colour: '#b9bcc6', shade: '#7c7f8a', corner: 3, flat: true }, 71)
    printed(g, { rings: [ring(-7, 6, 7, 6, 9, 28, -9, 28)], colour: '#d4d7df', shade: '#7c7f8a', corner: 3, flat: true }, 72)
    g.beginPath()
    g.moveTo(-3, 16); g.lineTo(3, 16); g.lineTo(3, 23); g.lineTo(-3, 23); g.closePath()
    line(g, 1.2)
  }, 8)
  const toggle = sprite({ x0: -17, y0: -7, x1: 17, y1: 7 }, density, (g) => {
    printed(g, { rings: [ring(-16, -3, -8, -6, 8, -6, 16, -3, 16, 3, 8, 6, -8, 6, -16, 3)], colour: '#e9d9b0', shade: '#a89464', corner: 2, flat: true }, 73)
  }, 8)
  const spot = sprite({ x0: -30, y0: -30, x1: 30, y1: 30 }, density, (g) => {
    g.shadowColor = GLOW
    g.shadowBlur = 14 * density
    g.fillStyle = GLOW
    g.beginPath()
    g.arc(0, 8, 16, 0, Math.PI * 2)
    g.fill()
  }, 26)
  return { piece, openUmbrella, blownUmbrella, glow, slider, toggle, spot }
}

/** Whether a garment is drawn as two pieces. */
export function isPair(garment: Garment): boolean {
  return PAIRS.includes(garment)
}
