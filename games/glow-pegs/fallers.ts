import { BLUE, BOARD, GREEN, RED, WHITE, YELLOW, type Colour } from './board'
import { GECKO, RIM_Y, WELL, wellMouth } from './layout'
import type { Beat } from './motion'

// A peg on its way back to its well, in one of four ways, and in each way
// every colour moves as itself (the design sheet's grid).
// - Pulled by the finger: red pops out and drops fast, blue sinks slowly,
//   yellow drops once its rings have closed, green springs out with one small
//   hop, white goes dark for a breath first.
// - Knocked out by another peg: red is shot at the bezel's lower edge, blue
//   floats, yellow breaks in two, green hops along the tray's rim, white
//   hangs for a beat.
// - Dropped by the tray handle: red falls straight and heavy, blue drifts and
//   lands last, yellow falls as two halves, green bounces once on the rim,
//   white waits a beat and then falls.
// - Caught: the one peg of a clatter that lands on the gecko's nose and is
//   flicked from there into its well.
// Each path is a pure
// function of the time since the peg let go, and the beats say when
// something on that path is heard. A faller is a view of a board whose hole
// is already empty: it is never saved.

export type FallKind = 'pulled' | 'knocked' | 'dropped' | 'caught'

export type Faller = {
  colour: Colour
  /** How it left its hole. */
  kind: FallKind
  /** Seconds since it let go. */
  t: number
  /** The hole it left. */
  x: number
  y: number
}

export type FallerPlace = {
  x: number
  y: number
  /** A yellow peg knocked out is two halves: the second one's place, and whether each is still in the air. */
  x2: number
  y2: number
  halves: boolean
  first: boolean
  second: boolean
  /** 0 to 1: how brightly it shines. A hanging white peg shines fully; others dim a little as they fall. */
  shine: number
}

/** The bezel's lower edge, which a red peg strikes. */
export const BEZEL_BOTTOM = BOARD.y + BOARD.height + 14
/** Where the gecko's nose is: the top of its head, where a peg can sit. */
export const NOSE = { x: GECKO.x, y: 127 } as const
/** A caught peg flies to the nose, sits there, and is flicked to its well. */
export const CATCH = { fly: 0.45, sit: 0.75, flick: 0.5 } as const
/** A pulled white peg is dark for this long before it drops; a dropped one waits a beat in its hole. */
export const WHITE_DARK = 0.18
export const WHITE_WAIT = 0.32
const HOP = 0.24
const GREEN_OUT = 0.3
const WHITE_HANG = 0.5

const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const span = (t: number, a: number, b: number) => clamp01((t - a) / (b - a))
const smooth = (t: number) => t * t * (3 - 2 * t)
const mix = (a: number, b: number, t: number) => a + (b - a) * t

const PULLED: Record<Colour, number> = { [RED]: 0.3, [BLUE]: 0.75, [YELLOW]: 0.44, [GREEN]: 0.56, [WHITE]: WHITE_DARK + 0.4 }
const KNOCKED: Record<Colour, number> = { [RED]: 0.5, [BLUE]: 1.5, [YELLOW]: 0.75, [GREEN]: GREEN_OUT + HOP * 3 + 0.18, [WHITE]: WHITE_HANG + 0.35 }
const DROPPED: Record<Colour, number> = { [RED]: 0.36, [BLUE]: 1.05, [YELLOW]: 0.62, [GREEN]: 0.66, [WHITE]: WHITE_WAIT + 0.42 }
/** A dropped green peg touches the rim at this share of its fall, and a dropped yellow peg's first half lands at this one. */
const GREEN_RIM = 0.55
const FIRST_HALF = 0.72

/** How long the peg is in the air. */
export function fallLength(faller: Faller): number {
  switch (faller.kind) {
    case 'pulled': return PULLED[faller.colour]
    case 'knocked': return KNOCKED[faller.colour]
    case 'dropped': return DROPPED[faller.colour]
    case 'caught': return CATCH.fly + CATCH.sit + CATCH.flick
  }
}

/** What is heard on the way, after the moment it let go: each at the time its motion is seen. The last is always the landing. */
export function fallBeats(faller: Faller): Beat[] {
  const length = fallLength(faller), colour = faller.colour
  switch (faller.kind) {
    case 'pulled': return [{ at: length, cue: { name: 'land', colour } }]
    case 'knocked': {
      const land: Beat = { at: length, cue: { name: 'land', colour } }
      // Red's drum bonk sounds when it strikes the bezel; yellow's halves land apart; green boings at each hop.
      if (colour === RED) return [{ at: 0.12, cue: { name: 'knock', colour: RED } }, land]
      if (colour === YELLOW) return [{ at: 0.55, cue: { name: 'land', colour: YELLOW } }, land]
      if (colour === GREEN) return [0, 1, 2].map((n): Beat => ({ at: GREEN_OUT + HOP * n, cue: { name: 'hop', n } })).concat(land)
      return [land]
    }
    case 'dropped': {
      const land: Beat = { at: length, cue: { name: 'drop', colour, scene: true } }
      if (colour === YELLOW) return [{ at: length * FIRST_HALF, cue: { name: 'drop', colour: YELLOW, scene: true } }, land]
      if (colour === GREEN) return [{ at: length * GREEN_RIM, cue: { name: 'hop', n: 1, scene: true } }, land]
      return [land]
    }
    case 'caught': return [
      { at: CATCH.fly, cue: { name: 'catch', scene: true } },
      { at: CATCH.fly + CATCH.sit, cue: { name: 'flick', scene: true } },
      { at: length, cue: { name: 'drop', colour, scene: true } },
    ]
  }
}

/** What is heard at the moment a knocked peg lets go. Red is silent until it strikes. */
export function knockCue(colour: Colour): Beat['cue'] | null {
  return colour === RED ? null : { name: 'knock', colour }
}

/** Where along the tray's rim a hopping peg touches down: from under its hole towards its well. */
function rimX(faller: Faller, n: number): number {
  const start = Math.min(WELL.x + WELL.width * 5 - 20, Math.max(WELL.x + 20, faller.x))
  return mix(start, wellMouth(faller.colour).x, n / 3)
}

/** A short arc from the hole to the well's mouth, `lift` high, over the share `v` of its way. */
function arc(faller: Faller, v: number, lift: number, out: FallerPlace): void {
  const mouth = wellMouth(faller.colour)
  out.x = mix(faller.x, mouth.x, smooth(v))
  out.y = mix(faller.y, mouth.y, v * v) - lift * Math.sin(v * Math.PI)
}

function pulledAt(faller: Faller, u: number, out: FallerPlace): FallerPlace {
  const t = faller.t
  switch (faller.colour) {
    // Pops out, a quick jump up, and then drops fast.
    case RED:
      arc(faller, u * u, 20, out)
      out.y -= 16 * Math.sin(clamp01(t / 0.08) * Math.PI)
      break
    // Sinks slowly in a low arc.
    case BLUE:
      arc(faller, smooth(u), 14, out)
      out.shine = 0.85 - 0.3 * u
      break
    // Waits while its two rings close into one, then drops.
    case YELLOW:
      arc(faller, span(t, 0.1, PULLED[YELLOW]), 40, out)
      break
    // One small hop on the spot, then the arc.
    case GREEN:
      arc(faller, span(t, 0.2, PULLED[GREEN]), 44, out)
      if (t < 0.2) out.y = faller.y - 26 * Math.sin((t / 0.2) * Math.PI)
      break
    // Dark for a breath in its hole, then the arc.
    case WHITE:
      arc(faller, span(t, WHITE_DARK, PULLED[WHITE]), 40, out)
      out.shine = t < WHITE_DARK ? 0.25 : 0.85
      break
  }
  return out
}

function droppedAt(faller: Faller, u: number, out: FallerPlace): FallerPlace {
  const t = faller.t, mouth = wellMouth(faller.colour)
  /** Straight down from the hole at first, and over to the well's mouth late in the fall. */
  const down = (v: number, heavy: number) => {
    out.x = mix(faller.x, mouth.x, smooth(span(v, 0.35, 1)))
    out.y = mix(faller.y, mouth.y, v ** heavy)
  }
  switch (faller.colour) {
    case RED:
      down(u, 2.6)
      break
    // Drifts from side to side like a leaf.
    case BLUE:
      down(smooth(u), 1)
      out.x += 30 * Math.sin(u * Math.PI * 3) * (1 - u)
      break
    case YELLOW: {
      const a = clamp01(u / FIRST_HALF)
      out.halves = true
      out.first = a < 1
      out.second = u < 1
      out.x = mix(faller.x, mouth.x - 22, smooth(span(a, 0.3, 1))) - 16 * Math.sin(a * Math.PI)
      out.y = mix(faller.y, mouth.y, a * a)
      out.x2 = mix(faller.x, mouth.x + 22, smooth(span(u, 0.3, 1))) + 22 * Math.sin(u * Math.PI)
      out.y2 = mix(faller.y, mouth.y, u * u)
      break
    }
    // Down to the tray's rim, one bounce off it, and into the well.
    case GREEN:
      if (u < GREEN_RIM) {
        const v = u / GREEN_RIM
        out.x = mix(faller.x, rimX(faller, 1.5), v)
        out.y = mix(faller.y, RIM_Y, v * v)
      } else {
        const v = span(u, GREEN_RIM, 1)
        out.x = mix(rimX(faller, 1.5), mouth.x, v)
        out.y = mix(RIM_Y, mouth.y, v * v) - 40 * Math.sin(v * Math.PI)
      }
      break
    // Stays in its hole, shining, for a beat after its column has gone.
    case WHITE:
      down(span(t, WHITE_WAIT, DROPPED[WHITE]), 2)
      out.shine = t < WHITE_WAIT ? 1 : 0.85
      break
  }
  return out
}

function caughtAt(faller: Faller, out: FallerPlace): FallerPlace {
  const t = faller.t, mouth = wellMouth(faller.colour)
  if (t < CATCH.fly) {
    const v = t / CATCH.fly
    out.x = mix(faller.x, NOSE.x, v)
    out.y = mix(faller.y, NOSE.y, v) - 70 * Math.sin(v * Math.PI)
  } else if (t < CATCH.fly + CATCH.sit) {
    // It wobbles on the nose.
    out.x = NOSE.x + 4 * Math.sin((t - CATCH.fly) * 14) * (1 - span(t, CATCH.fly, CATCH.fly + CATCH.sit))
    out.y = NOSE.y
  } else {
    const v = span(t, CATCH.fly + CATCH.sit, CATCH.fly + CATCH.sit + CATCH.flick)
    out.x = mix(NOSE.x, mouth.x, v)
    out.y = mix(NOSE.y, mouth.y, v * v) - 150 * Math.sin(v * Math.PI)
  }
  return out
}

export function fallerAt(faller: Faller, out: FallerPlace): FallerPlace {
  const t = faller.t
  const mouth = wellMouth(faller.colour)
  const u = clamp01(t / fallLength(faller))
  out.halves = false; out.first = u < 1; out.second = false; out.x2 = 0; out.y2 = 0; out.shine = 0.85
  if (faller.kind === 'pulled') return pulledAt(faller, u, out)
  if (faller.kind === 'dropped') return droppedAt(faller, u, out)
  if (faller.kind === 'caught') return caughtAt(faller, out)
  switch (faller.colour) {
    case RED: {
      const strikeX = mix(faller.x, mouth.x, 0.35)
      if (t < 0.12) {
        out.x = mix(faller.x, strikeX, t / 0.12)
        out.y = mix(faller.y, BEZEL_BOTTOM, t / 0.12)
      } else {
        const v = span(t, 0.12, 0.5)
        out.x = mix(strikeX, mouth.x, v)
        out.y = mix(BEZEL_BOTTOM, mouth.y, v * v) - 26 * Math.sin(v * Math.PI)
      }
      break
    }
    case BLUE:
      out.x = mix(faller.x, mouth.x, smooth(u)) + 54 * Math.sin(u * Math.PI * 2) * (1 - u)
      out.y = mix(faller.y, mouth.y, smooth(u))
      break
    case YELLOW: {
      const a = clamp01(t / 0.55), b = clamp01(t / 0.75)
      out.halves = true
      out.first = a < 1
      out.second = b < 1
      out.x = mix(faller.x, mouth.x - 20, smooth(a)) - 30 * Math.sin(a * Math.PI)
      out.y = mix(faller.y, mouth.y, a * a) - 70 * Math.sin(a * Math.PI)
      out.x2 = mix(faller.x, mouth.x + 20, smooth(b)) + 46 * Math.sin(b * Math.PI)
      out.y2 = mix(faller.y, mouth.y, b * b) - 110 * Math.sin(b * Math.PI)
      break
    }
    case GREEN: {
      if (t < GREEN_OUT) {
        const v = t / GREEN_OUT
        out.x = mix(faller.x, rimX(faller, 0), v)
        out.y = mix(faller.y, RIM_Y, v * v) - 30 * Math.sin(v * Math.PI)
      } else if (t < GREEN_OUT + HOP * 3) {
        const n = Math.min(2, Math.floor((t - GREEN_OUT) / HOP))
        const v = (t - GREEN_OUT - n * HOP) / HOP
        out.x = mix(rimX(faller, n), rimX(faller, n + 1), v)
        out.y = RIM_Y - [46, 30, 18][n] * Math.sin(v * Math.PI)
      } else {
        const v = span(t, GREEN_OUT + HOP * 3, fallLength(faller))
        out.x = mouth.x
        out.y = mix(RIM_Y, mouth.y, v * v)
      }
      break
    }
    case WHITE: {
      // Up a little, shining, for a beat; then straight down.
      const rise = 18 * smooth(span(t, 0, 0.2))
      const v = span(t, WHITE_HANG, fallLength(faller))
      out.x = mix(faller.x, mouth.x, v * v)
      out.y = mix(faller.y - rise, mouth.y, v * v)
      out.shine = t < WHITE_HANG ? 1 : 0.85
      break
    }
  }
  return out
}
