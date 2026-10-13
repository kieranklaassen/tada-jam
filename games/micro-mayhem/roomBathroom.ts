import { hen as henShape } from './artHen'
import { FOG_PATCHES, rubFog, tapHotTap, type House } from './house'
import type { Point } from './input'
import { FLOOR_Y, GLASS, STAIRS_X, type Oval, type Rect } from './layout'
import type { Pen, Picture } from './pen'
import { box, fill, rr, scatter, spots, wavyBoards } from './print'
import { b, type Answer, type Cast, type Live, type Part, type RoomDef, type Target } from './room'
import { dogKit } from './roomDog'
import type { Cue } from './voices'

// The bathroom. A big pane of glass stands in front of the bath, fogged over
// in twelve patches, three across and four down. Its thing is the fog, and
// it is rubbed, not tapped: the patch under the finger clears and shows what
// is behind it. With the last patch gone the bather is caught, pulls the
// shower cap down and sinks to the eyes. The bather is the hen.

const D = Math.PI / 180

/** The pane, and its patches: three across, four down; patch 0 is the top left. */
export const PANE: Rect = { x: 200, y: 134, w: 570, h: 486 }
const COLS = 3, ROWS = 4
const CELL = { w: PANE.w / COLS, h: PANE.h / ROWS }
const TAP = { x: 880, y: 440 }
const DUCK = { x: 890, y: 232 }
/** The middle of the bather's body in the tub. */
const HEN = { x: 470, y: 392, scale: 1.7 }

/** The box of patch `i`. */
export function cell(i: number): Rect {
  return { x: PANE.x + (i % COLS) * CELL.w, y: PANE.y + Math.floor(i / COLS) * CELL.h, w: CELL.w, h: CELL.h }
}

/** The patch under a point of the stage, or null outside the pane. */
export function patchAt(at: Point): number | null {
  if (at.x < PANE.x || at.x >= PANE.x + PANE.w || at.y < PANE.y || at.y >= PANE.y + PANE.h) return null
  return Math.floor((at.y - PANE.y) / CELL.h) * COLS + Math.floor((at.x - PANE.x) / CELL.w)
}

// --- The print ---------------------------------------------------------------

function print(p: Pen): void {
  const top = GLASS.y, bottom = GLASS.y + GLASS.h
  fill(p, '#cfeaf2', () => box(p, GLASS.x, top, STAIRS_X - GLASS.x, FLOOR_Y - top))
  // Tiles as pale blots of uneven size, never a grid.
  spots(p, '#b9dde8', GLASS.x, top + 6, STAIRS_X, FLOOR_Y - 16, 60, 20, 91)
  fill(p, '#8fc4d6', () => box(p, GLASS.x, FLOOR_Y, STAIRS_X - GLASS.x, bottom - FLOOR_Y))
  wavyBoards(p, '#7ab3c6', GLASS.x, STAIRS_X, FLOOR_Y + 6, bottom, 52, 93)
  fill(p, '#6fa3b6', () => box(p, GLASS.x, FLOOR_Y - 10, STAIRS_X - GLASS.x, 14))
  // The door the dog hides behind, swung open against the wall.
  fill(p, '#c9803a', () => p.poly([GLASS.x, 170, 128, 196, 128, 730, GLASS.x, 742]))
  fill(p, '#b5855a', () => { p.line([60, 250, 100, 262, 100, 420, 60, 420], 5); p.line([60, 480, 100, 480, 100, 690, 60, 700], 5) })
  fill(p, '#ffd75e', () => p.ell(112, 470, 8, 10))
  // The pane: a frame, and the pale room behind it.
  fill(p, '#7b828d', () => rr(p, PANE.x - 16, PANE.y - 16, PANE.w + 32, PANE.h + 32, 20))
  fill(p, '#eef8fb', () => box(p, PANE.x, PANE.y, PANE.w, PANE.h))
  fill(p, '#dcf0f5', () => { const next = scatter(97); for (let i = 0; i < 14; i++) p.ell(PANE.x + 30 + next() * (PANE.w - 60), PANE.y + 30 + next() * (PANE.h - 60), 30 + next() * 30, 16 + next() * 14, next()) })
  // A bath mat, the pipe and the hot tap, and a shelf with a towel and the duck's place.
  fill(p, '#f58fb0', () => p.ell(480, 690, 190, 26))
  fill(p, '#f9b4c9', () => p.ell(480, 690, 150, 16))
  fill(p, '#9aa3ad', () => { p.line([TAP.x, 742, TAP.x, TAP.y + 30], 14); p.line([TAP.x, TAP.y + 30, TAP.x - 40, TAP.y + 30, TAP.x - 44, TAP.y + 56], 12) })
  fill(p, '#e8705f', () => { p.ell(TAP.x, TAP.y, 32, 32); p.ell(TAP.x - 38, TAP.y, 9, 9); p.ell(TAP.x + 38, TAP.y, 9, 9); p.ell(TAP.x, TAP.y - 38, 9, 9) })
  fill(p, '#fffaf0', () => p.ell(TAP.x, TAP.y, 12, 12))
  fill(p, '#c9803a', () => { rr(p, 810, 270, 170, 14, 8); p.poly([826, 282, 846, 282, 826, 308]); p.poly([944, 282, 964, 282, 964, 308]) })
  fill(p, '#fffaf0', () => rr(p, 930, 224, 44, 46, 10))
  // The towel: one broad stripe across it, and the shadow of its fold. Never two equal strokes, which read as a sign.
  fill(p, '#6fcdbb', () => p.poly([930, 246, 974, 240, 974, 256, 930, 262]))
  fill(p, '#ece4d0', () => p.poly([930, 264, 974, 258, 974, 270, 964, 270, 930, 270]))
  // A hook with a bathrobe.
  fill(p, '#7b828d', () => p.ell(900, 110, 8, 8))
  fill(p, '#f7c66a', () => p.blob([876, 116, 924, 116, 950, 180, 940, 210, 860, 210, 850, 180]))
  fill(p, '#e2a94a', () => p.line([900, 122, 896, 170, 902, 208], 5))
}

// --- What is behind the glass --------------------------------------------------

const TUB_Y = 446

/** The bath, the foam on it, the shower and its drops: what does not move. */
function bath(p: Pen): void {
  // The tub on two clawed feet, with a rolled rim.
  p.blob([224, TUB_Y, 746, TUB_Y, 720, 584, 250, 584])
  p.line([216, TUB_Y, 754, TUB_Y], 16)
  p.blob([262, 580, 300, 580, 296, 606, 250, 612])
  p.blob([670, 580, 708, 580, 720, 612, 674, 606])
  p.cut(() => { p.line([270, 500, 480, 520, 700, 500], 6); p.line([330, 546, 360, 552], 5); p.line([600, 552, 640, 546], 5) })
  // Foam: lumps along the rim, and bubbles let go into the air.
  for (const [x, r] of [[250, 22], [296, 28], [350, 20], [600, 26], [650, 20], [700, 24]]) p.ell(x, TUB_Y - 16, r, r * 0.8)
  for (const [x, y, r] of [[246, 380, 12], [300, 330, 9], [330, 396, 8], [640, 330, 11], [716, 290, 9], [700, 380, 8], [470, 126, 9], [540, 132, 6]]) {
    p.ell(x, y, r, r)
    p.cut(() => p.ell(x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.22, 0.6))
  }
  // The shower: a pipe down the wall, a rose, and its drops.
  p.line([224, 420, 228, 150, 262, 124, 300, 138], 9)
  p.blob([284, 132, 322, 126, 340, 160, 300, 170])
  for (const [x, y] of [[306, 196], [330, 220], [300, 250], [342, 262], [318, 290], [346, 316]]) p.ell(x, y, 4, 9, -0.2)
  // A back brush hung on the wall, and a sponge on the rim.
  p.line([650, 130, 654, 210], 8)
  p.blob([630, 206, 678, 206, 682, 250, 626, 250])
  p.cut(() => { p.ell(642, 228, 4, 4); p.ell(660, 222, 4, 4); p.ell(664, 238, 4, 4) })
  p.blob([560, TUB_Y - 8, 566, TUB_Y - 34, 606, TUB_Y - 36, 612, TUB_Y - 8])
  // Water over the edge at the far end, and a drop on the floor.
  p.ell(736, 500, 5, 12)
  p.ell(742, 560, 5, 9)
  p.ell(236, 520, 5, 11)
}

/** The bather sitting up in the tub with a wing in the air, washing, and one foot on the rim. */
function batherUp(p: Pen): void {
  p.within(PANE.x, PANE.y, PANE.w, TUB_Y - PANE.y - 6, () => {
    p.at(HEN.x, HEN.y, () => henShape(p, { head: [-40, -52], eye: 'shut', beak: 'open', wing: 'up', cap: 'on' }), { scale: HEN.scale })
  })
  // The foot, toes up, on the rim at the far end.
  p.line([664, TUB_Y - 6, 668, 394], 10)
  for (const turn of [-34, 0, 34]) p.at(668, 394, () => p.line([0, 0, 0, -26], 8), { turn: turn * D })
}

/** Caught: sunk to the eyes, with the cap pulled down over them. */
function batherSunk(p: Pen, squirt: boolean): void {
  p.within(PANE.x, PANE.y, PANE.w, TUB_Y - PANE.y - 6, () => {
    p.at(HEN.x, HEN.y + 108, () => henShape(p, { head: [-40, -52], eye: 'wide', beak: 'shut', cap: 'down' }), { scale: HEN.scale })
  })
  // Rings where she went under.
  p.ell(HEN.x - 150, TUB_Y - 40, 9, 5, -0.5)
  p.ell(HEN.x + 96, TUB_Y - 44, 9, 5, 0.5)
  // Bubbles come up from where she was.
  for (const [x, y, r] of [[452, 300, 10], [486, 262, 7], [436, 340, 6]]) { p.ell(x, y, r, r); p.cut(() => p.ell(x - r * 0.3, y - r * 0.3, r * 0.3, r * 0.22, 0.6)) }
  if (squirt) {
    // She squirts a jet of water up through the foam.
    for (const [x, y, r] of [[380, 330, 8], [372, 286, 9], [384, 246, 10], [416, 226, 9], [452, 232, 8]]) p.ell(x, y, r * 0.7, r, 0.3)
  }
}

/** A patch of fog: lumps of cloud that all but fill it, different in every patch. */
function fog(p: Pen, i: number): void {
  const c = cell(i), next = scatter(300 + i * 17)
  p.within(c.x + 3, c.y + 3, c.w - 6, c.h - 6, () => {
    for (let n = 0; n < 9; n++) p.ell(c.x + 24 + next() * (c.w - 48), c.y + 22 + next() * (c.h - 44), 34 + next() * 26, 24 + next() * 16, next() - 0.5)
    p.cut(() => { for (let n = 0; n < 3; n++) p.ell(c.x + 30 + next() * (c.w - 60), c.y + 26 + next() * (c.h - 52), 12 + next() * 9, 5 + next() * 3, next() - 0.5) })
  })
}

/** What shows through patch `i` when it is clear. */
const through = (i: number, picture: (p: Pen) => void): Picture => (p) => {
  const c = cell(i)
  p.within(c.x, c.y, c.w, c.h, () => picture(p))
}

const DOG = dogKit('bd', 132, 716, 0.5, false, { x: 130, y: 380, w: 64, h: 350 })

function duck(p: Pen, squeezed: boolean): void {
  const s = squeezed ? 0.7 : 1
  p.at(DUCK.x, DUCK.y + 36, () => {
    p.ell(0, -22 * s, squeezed ? 46 : 38, 24 * s)
    p.ell(-22, -56 * s, 20, 19 * s)
    p.poly([-38, -60 * s, -64, -54 * s, -38, -46 * s])
    p.poly([26, -34 * s, 50, -52 * s, 36, -20 * s])
    p.cut(() => { p.ell(-26, -60 * s, 4, 4); p.line([-6, -22 * s, 10, -14 * s, 24, -24 * s], 4) })
    if (squeezed) { p.ell(-70, -84, 4, 9, -0.6); p.ell(-84, -56, 9, 4); p.ell(-66, -24, 4, 9, 0.6) }
  })
}

const segments: Record<string, Picture> = {
  ...DOG.segments,
  duck: (p) => duck(p, false),
  duckSqueeze: (p) => duck(p, true),
  /** Steam from the hot tap. */
  steamA: (p) => { for (const [x, y, r] of [[46, 60, 12], [66, 30, 17], [50, -6, 22]]) p.ell(TAP.x + x, TAP.y + y, r, r * 0.8) },
  steamB: (p) => { for (const [x, y, r] of [[60, 44, 14], [44, 6, 20], [70, -40, 26], [36, -78, 18]]) p.ell(TAP.x + x, TAP.y + y, r, r * 0.8) },
  /** The start she gives as she is caught. */
  yelp: (p) => { for (const [x, y, turn] of [[366, 192, -0.6], [414, 166, -1.1], [500, 166, 1.1], [560, 196, 0.6]]) p.ell(x, y, 13, 5, turn) },
  /** A wet foot beyond the edge of the glass, toes spread, and toes curled. */
  footA: (p) => { p.line([776, 400, 820, 388, 842, 360], 11); for (const turn of [-30, 6, 42]) p.at(842, 360, () => p.line([0, 0, 0, -26], 8), { turn: turn * D }); p.ell(818, 430, 4, 9) },
  footB: (p) => { p.line([776, 400, 820, 388, 842, 360], 11); for (const turn of [10, 40, 70]) p.at(842, 360, () => p.line([0, 0, 0, -22], 8), { turn: turn * D }); p.ell(822, 462, 4, 9) },
}
for (let i = 0; i < FOG_PATCHES; i++) {
  segments[`fog${i}`] = (p) => fog(p, i)
  segments[`bath${i}`] = through(i, (p) => { bath(p); batherUp(p) })
  segments[`sunk${i}`] = through(i, (p) => { bath(p); batherSunk(p, false) })
  segments[`squirt${i}`] = through(i, (p) => { bath(p); batherSunk(p, true) })
}

// --- The rules ---------------------------------------------------------------

const PATCHES = Array.from({ length: FOG_PATCHES }, (_, i) => i)
const who = (i: number): string => `p${i}`

/** What patch `i` shows: its fog, or what is behind it; with every patch clear, the bather as she was caught. */
function patch(h: House, i: number): string {
  return h.fog === 0 ? `sunk${i}` : (h.fog & (1 << i)) !== 0 ? `fog${i}` : `bath${i}`
}

function rest(h: House): Cast {
  const cast: Record<string, readonly string[]> = { duck: ['duck'], steam: [], marks: [], foot: [], dog: DOG.rest(h) }
  for (const i of PATCHES) cast[who(i)] = [patch(h, i)]
  return cast
}

const TAP_AREA: Oval = { x: TAP.x, y: TAP.y, rx: 60, ry: 60 }
const DUCK_AREA: Oval = { x: DUCK.x - 6, y: DUCK.y, rx: 66, ry: 52 }

function targets(h: House): Target[] {
  const out: Target[] = [{ id: 'glass', shape: PANE, grip: 'rub' }, { id: 'tap', shape: TAP_AREA }, { id: 'duck', shape: DUCK_AREA }]
  if (DOG.rest(h).length > 0) out.push({ id: 'dog', shape: DOG.area })
  return out
}

/** The squeak of a wipe follows the finger: higher toward the top of the glass. */
const WIPES: readonly Cue[] = ['wipeA', 'wipeB', 'wipeC', 'wipeD']

/** The finger is on the glass at `at`: the patch under it clears. */
function rub(h: House, at: Point): Answer | null {
  const i = patchAt(at)
  if (i === null) return null
  const out = rubFog(h, i)
  if (!out) return null
  // A clear glass: she squirts a jet of water up at it.
  if (out.came === 'again') {
    return { plan: PATCHES.map((n) => ({ who: who(n), beats: [b(`squirt${n}`, 0.4, n === 0 ? 'batherSquirt' : undefined), b(`sunk${n}`, 0.1)] })) }
  }
  const wipe = WIPES[Math.floor(i / COLS)]
  if (out.came === 'punch') {
    // The last patch: she is caught, yelps, pulls the cap down and sinks to the eyes.
    const plan: Part[] = PATCHES.map((n) => ({ who: who(n), beats: [b(`bath${n}`, 0.5, n === i ? wipe : undefined)] }))
    plan.push({ who: 'marks', after: 0.14, beats: [b('yelp', 0.36, 'batherYelp'), b([], 0.5, 'batherGlug')] }, ...DOG.startle(h, 0.3))
    return { house: out.house, save: 'now', scene: true, plan }
  }
  return { house: out.house, save: 'soon', plan: [{ who: who(i), beats: [b(`bath${i}`, 0.12, wipe)] }] }
}

function touch(id: string, h: House, at: Point): Answer | null {
  switch (id) {
    case 'glass':
      return rub(h, at)
    case 'tap': {
      // Steam puffs and the top three patches fog over again.
      const out = tapHotTap(h)
      return { house: out.house, save: 'now', plan: [{ who: 'steam', beats: [b('steamA', 0.2, 'tapHiss'), b('steamB', 0.3), b([], 0.05)] }] }
    }
    case 'duck':
      return { plan: [{ who: 'duck', beats: [b('duckSqueeze', 0.25, 'duckSqueak'), b('duck', 0.2)] }] }
    case 'dog':
      return { plan: [DOG.tap(h)] }
    default:
      return null
  }
}

/** Two fogged patches side by side or one over the other, for the idle ladder's drag. */
function fogged(h: House): [number, number] | null {
  for (const i of PATCHES) {
    if ((h.fog & (1 << i)) === 0) continue
    const right = i % COLS < COLS - 1 && (h.fog & (1 << (i + 1))) !== 0 ? i + 1 : null
    const below = i + COLS < FOG_PATCHES && (h.fog & (1 << (i + COLS))) !== 0 ? i + COLS : null
    return [i, right ?? below ?? i]
  }
  return null
}

const middle = (i: number): Point => ({ x: cell(i).x + CELL.w / 2, y: cell(i).y + CELL.h / 2 })

export const bathroom: RoomDef = {
  id: 'bathroom',
  print,
  segments,
  ghosts: ['bath4', 'bath8', 'bath10', 'duck', ...DOG.ghosts],
  enter: () => ({}),
  rest,
  idle(name, h, _live: Live, rng) {
    if (name === 'duck') return [b('duck', 3 + rng.next() * 3), b('duckSqueeze', 0.12)]
    if (name === 'dog') return DOG.idle(h, rng)
    return null
  },
  targets,
  touch: (id, h, _live, _rng, at) => touch(id, h, at),
  rub: (h, _live, at) => (h.fog === 0 ? null : rub(h, at)),
  // A wet foot comes out of the fog and wiggles its toes.
  leave: () => [{ who: 'foot', beats: [b('footA', 0.14, 'dripA'), b('footB', 0.14, 'dripB'), b('footA', 0.14, 'dripC')] }],
  arrive: (h) => [...DOG.arrive(h)],
  squint: (h) => [{ who: 'duck', after: 0.1, beats: [b('duckSqueeze', 0.6, 'duckSqueak')] }, ...DOG.squint(h)],
  hint(h) {
    const pair = fogged(h)
    if (!pair) return null
    const [from, to] = pair
    return from === to ? { at: middle(from), glow: cell(from) } : { at: middle(from), to: middle(to), glow: { x: Math.min(cell(from).x, cell(to).x), y: Math.min(cell(from).y, cell(to).y), w: from + 1 === to ? CELL.w * 2 : CELL.w, h: from + 1 === to ? CELL.h : CELL.h * 2 } }
  },
}
