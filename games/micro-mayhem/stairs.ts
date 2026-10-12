import { DOORS_OF, type RoomId } from './house'
import { BUTTONS, CORD, DOORS, GLASS, LAMP, STAIRS_X } from './layout'
import type { Pen, Picture } from './pen'
import { PEEKS } from './peeks'
import { fill, rr } from './print'

// What every room shares: the plastic case, and the stairwell at the right
// edge of the card with its three doorways, the lamp over them and the lamp's
// cord. The case and the stairwell's walls are printed; the door leaves, the
// lamp's shade, its light and its cord are segments, since they move.

const D = Math.PI / 180

export const CASE = { plastic: '#e2452f', shade: '#b9301f', light: '#f47c66', face: '#f3e8cf', faceShade: '#d9c9a4', rubber: '#3b3f46', rubberLight: '#5b616b' }

/** The case: red plastic, a cream face round the glass, two rubber buttons and a speaker. */
export function paintCase(p: Pen): void {
  fill(p, CASE.plastic, () => p.poly([-400, -400, 1580, -400, 1580, 1220, -400, 1220]))
  fill(p, CASE.shade, () => rr(p, 6, 752, 1168, 62, 30))
  fill(p, CASE.plastic, () => rr(p, 6, 748, 1168, 60, 30))
  fill(p, CASE.light, () => p.line([40, 756, 300, 755, 620, 757, 900, 755, 1140, 756], 3))
  fill(p, CASE.faceShade, () => rr(p, GLASS.x - 14, GLASS.y - 12, GLASS.w + 28, GLASS.h + 26, 30))
  fill(p, CASE.face, () => rr(p, GLASS.x - 12, GLASS.y - 12, GLASS.w + 24, GLASS.h + 22, 28))
  // The speaker: slots of three lengths that fan out from one point, so that they are no row of equal marks.
  fill(p, CASE.shade, () => {
    const slots: readonly (readonly [number, number])[] = [[-52, 15], [-33, 21], [-12, 26], [10, 26], [31, 21], [50, 15]]
    for (const [turn, length] of slots) p.at(590, 812, () => p.line([0, -22, 0, -22 - length], 5), { turn: turn * D })
  })
  // Four screws, with a dimple and no slot.
  for (const [x, y] of [[20, 14], [1160, 14], [20, 806], [1160, 806]]) {
    fill(p, CASE.shade, () => p.ell(x, y, 7, 7))
    fill(p, CASE.light, () => p.ell(x - 1.5, y - 1.5, 2.5, 2.5))
  }
  for (const b of BUTTONS) {
    fill(p, CASE.shade, () => p.ell(b.x, b.y + 4, b.r + 5, b.r + 4))
    fill(p, CASE.rubber, () => p.ell(b.x, b.y, b.r, b.r))
    fill(p, CASE.rubberLight, () => p.ell(b.x - 8, b.y - 10, b.r * 0.42, b.r * 0.26, -0.6))
  }
}

/** The colours a room is known by: its door frame in every stairwell, and the wall and floor seen through that door. */
export const TINT: Readonly<Record<RoomId, { frame: string; wall: string; floor: string }>> = {
  bedroom: { frame: '#9a7fe0', wall: '#ddd0f5', floor: '#ecca90' },
  kitchen: { frame: '#f6c443', wall: '#fdeaa8', floor: '#f2c36a' },
  bathroom: { frame: '#5fc4de', wall: '#cdf0f7', floor: '#8fd6e6' },
  garden: { frame: '#7ecb6a', wall: '#bfe4f7', floor: '#93d27c' },
  dining: { frame: '#e8705f', wall: '#fbd9c8', floor: '#d99a6a' },
  henhouse: { frame: '#c98a4a', wall: '#f3dcae', floor: '#e3bd6c' },
  fair: { frame: '#f58fb0', wall: '#fde0ea', floor: '#9fd98f' },
  bakery: { frame: '#b5855a', wall: '#f7e3c4', floor: '#d9b384' },
}

/** The stairwell of `room`: a cream column with three doorways, each in the colours of the room behind it. */
export function paintStairs(p: Pen, room: RoomId): void {
  fill(p, '#f7ecd0', () => p.poly([STAIRS_X, GLASS.y, GLASS.x + GLASS.w, GLASS.y, GLASS.x + GLASS.w, GLASS.y + GLASS.h, STAIRS_X, GLASS.y + GLASS.h]))
  fill(p, '#e6d6ae', () => p.line([STAIRS_X + 1, GLASS.y, STAIRS_X + 1, GLASS.y + GLASS.h], 5))
  DOORS.forEach((d, i) => {
    const tint = TINT[DOORS_OF[room][i]]
    fill(p, '#b98f52', () => rr(p, d.x - 12, d.y + d.h + 2, d.w + 24, 16, 10))
    fill(p, tint.frame, () => rr(p, d.x - 9, d.y - 10, d.w + 18, d.h + 14, 18))
    fill(p, tint.wall, () => p.poly([d.x, d.y, d.x + d.w, d.y, d.x + d.w, d.y + d.h, d.x, d.y + d.h]))
    fill(p, tint.floor, () => p.poly([d.x, d.y + d.h - 26, d.x + d.w, d.y + d.h - 26, d.x + d.w, d.y + d.h, d.x, d.y + d.h]))
  })
  // The plate the lamp hangs from, and the hook the cord runs over.
  fill(p, '#c9a46a', () => { p.ell(LAMP.x, GLASS.y + 4, 22, 9); p.ell(CORD.x, GLASS.y + 4, 9, 6) })
}

/** The lamp: a wire, a shade and a bulb, hanging from the ceiling. `swing` turns it about its hook, in degrees. */
function lamp(p: Pen, swing: number): void {
  p.about(LAMP.x, GLASS.y, () => {
    p.line([LAMP.x, GLASS.y, LAMP.x, LAMP.y - 30], 5)
    p.blob([LAMP.x - 48, LAMP.y + 22, LAMP.x - 30, LAMP.y - 22, LAMP.x, LAMP.y - 36, LAMP.x + 30, LAMP.y - 22, LAMP.x + 48, LAMP.y + 22])
    p.ell(LAMP.x, LAMP.y + 26, 13, 11)
    p.cut(() => p.line([LAMP.x - 30, LAMP.y - 4, LAMP.x, LAMP.y - 14, LAMP.x + 30, LAMP.y - 4], 5))
  }, { turn: swing * D })
}

/** The lamp's light: drops of ink below the shade. Half pulled, only the three in the middle are left. */
function rays(p: Pen, low: boolean): void {
  for (const a of low ? [-35, 0, 35] : [-72, -36, 0, 36, 72]) {
    const sin = Math.sin(a * D), cos = Math.cos(a * D)
    p.ell(LAMP.x + sin * 60, LAMP.y + 34 + cos * 22, 6, low ? 9 : 12, -a * D)
  }
}

/** The cord with its bobble at one of its three heights, and a tassel under the bobble. */
function cord(p: Pen, level: number): void {
  const y = CORD.y[level]
  p.line([CORD.x, GLASS.y + 2, CORD.x, y - 10], 4)
  p.ell(CORD.x, y, 8, 11)
  p.poly([CORD.x - 6, y + 9, CORD.x + 6, y + 9, CORD.x + 8, y + 22, CORD.x, y + 17, CORD.x - 8, y + 22])
}

/** A door leaf, hinged on the left: ajar it covers a third of the doorway, half open a little, and open it stands edge on. */
function leaf(p: Pen, i: number, pose: 'Ajar' | 'Half' | 'Open'): void {
  const d = DOORS[i], x = d.x + 3, top = d.y + 5, bottom = d.y + d.h - 5
  if (pose === 'Open') {
    p.poly([x, top, x + 10, top + 12, x + 10, bottom - 12, x, bottom])
    return
  }
  const right = x + (pose === 'Ajar' ? 40 : 24), slant = pose === 'Ajar' ? 6 : 12
  p.poly([x, top, right, top + slant, right, bottom - slant, x, bottom])
  p.cut(() => {
    // The grain of the wood: one line that wanders down the leaf.
    if (pose === 'Ajar') p.line([x + 18, top + 14, x + 25, top + 52, x + 16, top + 96, x + 23, bottom - 14], 4)
    p.ell(right - 8, top + 80, 5, 6)
  })
}

/** The mitt's shapes, each `grow` units larger all round. */
function mitt(p: Pen, grow: number): void {
  p.line([0, 8, 6, 52], 22 + grow * 2)
  p.ell(18, 72, 30 + grow, 26 + grow)
  p.ell(-10, 66, 12 + grow, 18 + grow, 30 * D)
  p.line([34, 92, 52, 120], 30 + grow * 2)
}

const HAND_PALE = '#fff4d6'

/**
 * The ghost hand: a mitt with one finger out, its tip at 0, 0. Pressed, it throws three small drops. It is a
 * finger on the glass and no segment of the display, so it is pale with a dark edge and shows on a dark figure
 * as well as on the card.
 */
function hand(p: Pen, pressed: boolean): void {
  const ink = p.color
  p.at(0, pressed ? 0 : -26, () => {
    mitt(p, 5)
    p.color = HAND_PALE
    mitt(p, 0)
    p.color = ink
    p.line([8, 58, 22, 70, 40, 62], 4)
    p.line([24, 92, 44, 86], 4)
  }, { turn: -24 * D })
  if (pressed) {
    p.ell(-26, -8, 10, 4, 30 * D)
    p.ell(-4, -22, 10, 4, 84 * D)
    p.ell(22, -14, 10, 4, -40 * D)
  }
}

/** The hand's four sprites, each drawn with its fingertip at 0, 0: lifted and pressed, and both again mirrored for the right edge of the glass. */
export const HANDS: Readonly<Record<string, Picture>> = {
  handUp: (p) => hand(p, false),
  handDown: (p) => hand(p, true),
  handUpM: (p) => p.at(0, 0, () => hand(p, false), { mirror: true }),
  handDownM: (p) => p.at(0, 0, () => hand(p, true), { mirror: true }),
}

/** Which of the hand's sprites shows a finger at `x`: near the right edge the hand comes from the left, so that it stays on the glass. */
export const handFor = (x: number, pressed: boolean): string => `hand${pressed ? 'Down' : 'Up'}${x > 900 ? 'M' : ''}`

/** The segments of the stairwell that are the same in every room. */
const FIXED: Record<string, Picture> = {
  lampHang: (p) => lamp(p, 0),
  lampL: (p) => lamp(p, 13),
  lampR: (p) => lamp(p, -13),
  lampRays: (p) => p.within(GLASS.x, GLASS.y, GLASS.w - 4, GLASS.h, () => rays(p, false)),
  lampRaysLow: (p) => p.within(GLASS.x, GLASS.y, GLASS.w - 4, GLASS.h, () => rays(p, true)),
  cord0: (p) => cord(p, 0),
  cord1: (p) => cord(p, 1),
  cord2: (p) => cord(p, 2),
}
for (const i of [0, 1, 2]) for (const pose of ['Ajar', 'Half', 'Open'] as const) FIXED[`door${i}${pose}`] = (p) => leaf(p, i, pose)

/** Where a peek is drawn in its doorway: beside the leaf, on the doorway's floor. */
export const peekAt = (i: number): { x: number; y: number } => ({ x: DOORS[i].x + 46, y: DOORS[i].y + 4 })

/** The stairwell's segments in `room`: the fixed ones, and for each door every way the room behind it can be seen. */
export function stairSegments(room: RoomId): Record<string, Picture> {
  const out: Record<string, Picture> = { ...FIXED }
  DOORS_OF[room].forEach((behind, i) => {
    const at = peekAt(i)
    for (const [variant, picture] of Object.entries(PEEKS[behind].pictures)) out[`peek${i}_${variant}`] = (p) => p.at(at.x, at.y, () => picture(p))
  })
  return out
}

/** The stairwell's ghosts: the lamp's light, each door wide open, and the fullest peek behind each door. */
export function stairGhosts(room: RoomId): string[] {
  return ['lampRays', 'lampL', 'cord2', 'door0Open', 'door1Open', 'door2Open', ...DOORS_OF[room].map((behind, i) => `peek${i}_${PEEKS[behind].ghost}`)]
}

/** A case button pushed in: a darker disc over the printed one. Drawn live, since it follows the finger. */
export function buttonDown(p: Pen, i: number): void {
  const b = BUTTONS[i]
  p.ell(b.x, b.y + 3, b.r - 3, b.r - 3)
}
