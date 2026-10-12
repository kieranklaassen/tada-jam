import { BRANCH_OF, STAIN, WOOD, blob, cut, engrave, inlay, oval, poly, ridge, stroke, twig, type Box, type G } from './ply'
import type { Season } from './wood'

// The room at the table, where a walk ends, in the same cut plywood: a plank
// wall, a floor, the table under the window with the bowl of water on it, a
// shelf of jars, and the door standing open on the path. It is painted once
// for a surface and stamped whole. The window and the doorway show the wood
// in its season: each is one stained piece with four sides, like the wood's.

const L = -420, R = 1600, T = -320, B = 1140

export function paintRoom(g: G, box: Box, grain: boolean): void {
  const wood = { grain }
  // The wall: upright planks, washed warm.
  g.fillStyle = WOOD.birch.fill
  g.fillRect(box[0] - 2, box[1] - 2, box[2] - box[0] + 4, box[3] - box[1] + 4)
  cut(g, poly([L, T, R, T, R, B, L, B]), WOOD.birch, [L, T, R, B], { ...wood, gap: 0, edge: 0.01, seed: 3, slant: 1.57, stain: '#f0cf9a', wash: 0.35 })
  engrave(g, (h) => { for (let x = L + 20; x < R; x += 86) { h.moveTo(x, T); h.lineTo(x, 700) } }, 1.4, 0.4)
  // A shelf with two jars and a tin, no two the same, and a rail with a coat and a hat hung on it.
  cut(g, poly([70, 318, 372, 318, 372, 334, 70, 334]), WOOD.walnut, [68, 316, 374, 336], { ...wood, gap: 6, seed: 5 })
  cut(g, blob([96, 318, 92, 262, 110, 240, 132, 240, 150, 262, 146, 318]), WOOD.board, [90, 238, 152, 320], { ...wood, gap: 4, seed: 7, stain: '#bfe3f5', wash: 0.5 })
  cut(g, poly([186, 318, 186, 276, 234, 276, 234, 318]), WOOD.maple, [184, 274, 236, 320], { ...wood, gap: 4, seed: 9, stain: '#d9742c', wash: 0.6 })
  cut(g, blob([270, 318, 262, 228, 290, 206, 320, 228, 312, 318]), WOOD.board, [260, 204, 322, 320], { ...wood, gap: 4, seed: 11, stain: '#9fd668', wash: 0.5 })
  // The shine on each jar: one bent line, on a different side of each and of a different length.
  engrave(g, (h) => { stroke([102, 300, 100, 272, 108, 254])(h); stroke([304, 296, 308, 262, 300, 238, 294, 228])(h) }, 1.4, 0.6)
  cut(g, poly([920, 182, 1150, 182, 1150, 196, 920, 196]), WOOD.walnut, [918, 180, 1152, 198], { ...wood, gap: 5, seed: 13 })
  cut(g, blob([930, 204, 962, 204, 978, 286, 946, 300, 916, 286]), WOOD.alder, [914, 202, 980, 302], { ...wood, gap: 5, seed: 15, stain: '#5f8f6e', wash: 0.6 })
  cut(g, blob([984, 240, 1010, 204, 1036, 240, 1050, 246, 1010, 256, 970, 246]), WOOD.maple, [968, 202, 1052, 258], { ...wood, gap: 5, seed: 17, stain: '#b96a4a', wash: 0.6 })
  // A garland of cut leaves strung along the top of the wall, no two the same size, tilt or stain.
  const leaves: readonly (readonly [number, number, number, number, string])[] = [
    [70, 104, 26, 0.3, '#9fd668'], [164, 96, 19, -0.5, '#ea862a'], [262, 82, 30, 0.1, '#3d9b56'], [372, 82, 22, 0.6, '#f4d24a'], [470, 100, 28, -0.3, '#cc4129'],
    [570, 116, 20, 0.4, '#9fd668'], [668, 110, 31, -0.1, '#ea862a'], [770, 92, 23, 0.5, '#3d9b56'], [868, 82, 27, -0.6, '#f5a3bf'], [968, 98, 20, 0.2, '#cfa63a'], [1060, 112, 29, -0.2, '#46a44e'], [1150, 104, 22, 0.5, '#dd6a2c'],
  ]
  // The string runs through the top of every leaf, so each hangs from it by its stalk.
  engrave(g, (h) => { h.moveTo(L, 40); for (const [x, y, size] of leaves) h.lineTo(x, y - size * 0.4); h.lineTo(R, 44) }, 2, 0.8)
  for (const [x, y, size, turn, stain] of leaves) {
    g.save()
    g.translate(x, y - size * 0.4)
    g.rotate(turn)
    g.translate(0, size * 0.4)
    cut(g, blob([0, -size * 0.4, size * 0.6, 0, 0, size, -size * 0.6, 0]), WOOD.birch, [-size, -size, size, size + 2], { ...wood, gap: 3, seed: x, stain, wash: 0.8, edge: 2 })
    engrave(g, (h) => { h.moveTo(0, -size * 0.3); h.lineTo(0, size * 0.8) }, 1.2, 0.6)
    g.restore()
  }
  // A picture of a leaf in a frame by the door.
  cut(g, poly([808, 236, 898, 232, 902, 352, 806, 350]), WOOD.walnut, [804, 230, 904, 354], { ...wood, gap: 6, seed: 45 })
  cut(g, poly([820, 248, 886, 246, 888, 338, 820, 338]), WOOD.board, [818, 244, 890, 340], { ...wood, gap: 0, seed: 47, stain: '#f6ecd2', wash: 0.8, edge: 1.4 })
  cut(g, blob([854, 262, 878, 296, 854, 326, 832, 296]), WOOD.birch, [830, 260, 880, 328], { ...wood, gap: 2, seed: 49, stain: '#3d9b56', wash: 0.8, edge: 1.8 })
  engrave(g, (h) => { h.moveTo(854, 270); h.lineTo(854, 330) }, 1.3, 0.7)
  // The floor: boards running away from the child, and a rug under the table.
  cut(g, ridge([L, 676, R, 676], B), WOOD.alder, [L, 674, R, B], { ...wood, gap: 0, seed: 19, stain: '#c08f58', wash: 0.3 })
  engrave(g, (h) => { for (let x = L; x < R; x += 120) { h.moveTo(x + 60, 678); h.lineTo(x, B) } }, 1.6, 0.5)
  cut(g, blob([40, 766, 110, 738, 480, 730, 850, 738, 930, 766, 850, 800, 480, 808, 110, 800]), WOOD.maple, [36, 728, 934, 810], { ...wood, gap: 3, seed: 21, stain: '#b5533c', wash: 0.7 })
  engrave(g, (h) => { stroke([120, 768, 480, 756, 850, 768])(h); stroke([150, 786, 480, 792, 820, 786])(h) }, 1.6, 0.5)
  // The table: two legs, an apron, and the top, a broad board with the grain along it.
  for (const x of [78, 876]) cut(g, poly([x - 16, 650, x + 16, 650, x + 12, 778, x - 12, 778]), WOOD.walnut, [x - 18, 648, x + 18, 780], { ...wood, gap: 5, seed: x, slant: 1.57 })
  cut(g, poly([44, 652, 916, 652, 916, 682, 44, 682]), WOOD.walnut, [42, 650, 918, 684], { ...wood, gap: 5, seed: 23 })
  cut(g, poly([36, 548, 60, 528, 904, 528, 928, 548, 932, 656, 30, 656]), WOOD.maple, [28, 526, 934, 658], { ...wood, gap: 9, seed: 25, stain: '#e6c48e', wash: 0.3, edge: 2.8 })
  engrave(g, (h) => { stroke([60, 640, 480, 644, 900, 640])(h) }, 1.4, 0.4)
  // The bowl of water: its far rim, the water, and its near side.
  cut(g, blob([66, 590, 80, 636, 150, 650, 220, 636, 234, 590, 150, 606]), WOOD.board, [64, 588, 236, 652], { ...wood, gap: 5, seed: 27, stain: '#e9eef0', wash: 0.7, edge: 2.6 })
  g.beginPath()
  oval(150, 588, 82, 30)(g)
  g.fillStyle = '#5fb0da'
  g.fill()
  g.strokeStyle = '#39220f'
  g.lineWidth = 2.6
  g.stroke()
  // Ripples on the water: one long, one short, at different heights. The side of the bowl is bare.
  engrave(g, (h) => { stroke([92, 584, 124, 577, 160, 585])(h); stroke([182, 599, 196, 595, 208, 599])(h) }, 1.4, 0.55)
}

/** The wood through an opening, in a season: sky, the far rise, one tree and the ground, washed with the season's stain. */
function outside(g: G, season: Season, grain: boolean, w: number, h: number, ground: number, tree: number, branch: number): void {
  const stain = STAIN[season]
  g.fillStyle = season === 'winter' ? '#e7eef2' : '#cfe6f0'
  g.fillRect(0, 0, w, h)
  cut(g, ridge([0, ground - 46, w * 0.4, ground - 70, w, ground - 40], h), WOOD.board, [0, ground - 72, w, h], { grain, gap: 3, seed: 31, stain: stain.grass, wash: season === 'winter' ? 0.5 : 0.26, edge: 1.6 })
  cut(g, poly([tree - 8, ground, tree - 5, ground - 96, tree + 5, ground - 96, tree + 8, ground]), WOOD.alder, [tree - 9, ground - 98, tree + 9, ground + 2], { grain, gap: 3, seed: 33, slant: 1.57 })
  cut(g, blob([tree - 54, ground - 120, tree - 30, ground - 170, tree + 24, ground - 178, tree + 58, ground - 132, tree + 34, ground - 92, tree - 26, ground - 88]), WOOD.birch, [tree - 56, ground - 180, tree + 60, ground - 86], { grain, gap: 5, seed: 35, stain: stain.leaf, wash: season === 'winter' ? 0.8 : 0.72 })
  if (season === 'spring') for (const [x, y] of [[-24, -130], [14, -150], [30, -112]] as const) inlay(g, tree + x, ground + y, 6, stain.other, 1.2)
  if (season === 'autumn') for (const [x, y] of [[-20, -128], [18, -146], [28, -110]] as const) inlay(g, tree + x, ground + y, 6, stain.other, 1.2)
  if (season === 'winter') engrave(g, twig(tree, ground - 92, 74, branch === BRANCH_OF.window ? -0.1 : 0.12, branch), 2, 0.7)
  cut(g, ridge([0, ground, w * 0.5, ground - 10, w, ground + 4], h), WOOD.maple, [0, ground - 12, w, h], { grain, gap: 5, seed: 37, stain: stain.grass, wash: 0.6 })
}

/** The lamp over the shelf hangs on its cord from above the frame and swings when the room is knocked: where its cord ends at rest, and the cord's length. */
export const LAMP = { x: 226, y: 122, thread: 162 } as const
/** The lamp, drawn from the end of its cord: a shade cut from thin ply, and the glass under it. */
export const LAMP_ART: { box: Box; paint: (g: G, grain: boolean) => void } = {
  box: [-72, -4, 72, 96],
  paint: (g, grain) => {
    cut(g, blob([-30, 0, 30, 0, 66, 68, -66, 68]), WOOD.maple, [-70, -2, 70, 72], { grain, gap: 6, seed: 41, stain: '#f4d24a', wash: 0.75, edge: 2.6 })
    cut(g, oval(0, 72, 20, 9), WOOD.board, [-22, 62, 22, 82], { grain, gap: 2, seed: 43, stain: '#fff3bf', wash: 0.9, edge: 1.8 })
  },
}

export type RoomPart = { box: Box; paint: (g: G, season: Season, grain: boolean) => void }

/** The window over the table: the wood in its season behind an arched frame with one upright bar, off its middle. */
export const WINDOW_ART: RoomPart = {
  box: [-196, -170, 200, 166],
  paint: (g, season, grain) => {
    g.save()
    g.beginPath()
    g.moveTo(-172, 140); g.lineTo(-172, -60); g.quadraticCurveTo(-172, -150, 0, -150); g.quadraticCurveTo(172, -150, 172, -60); g.lineTo(172, 140); g.closePath()
    g.clip()
    g.translate(-176, -154)
    outside(g, season, grain, 352, 300, 250, 236, BRANCH_OF.window)
    g.restore()
    // The frame, the sill, and the one bar.
    g.save()
    g.strokeStyle = WOOD.walnut.fill
    g.lineWidth = 16
    g.lineJoin = 'round'
    g.beginPath()
    g.moveTo(-172, 140); g.lineTo(-172, -60); g.quadraticCurveTo(-172, -150, 0, -150); g.quadraticCurveTo(172, -150, 172, -60); g.lineTo(172, 140)
    g.moveTo(-58, -146); g.lineTo(-58, 140)
    g.stroke()
    g.restore()
    engrave(g, (h) => { h.moveTo(-180, 140); h.lineTo(-180, -60); h.quadraticCurveTo(-180, -158, 0, -158); h.quadraticCurveTo(180, -158, 180, -60); h.lineTo(180, 140) }, 2, 0.9)
    cut(g, poly([-192, 138, 192, 138, 192, 156, -192, 156]), WOOD.walnut, [-194, 136, 194, 158], { grain, gap: 5, seed: 39 })
  },
}

/** The doorway of the room, open on the path: the wood in its season, the frame, and the sill. */
export const DOORWAY_ART: RoomPart = {
  box: [-110, -214, 116, 262],
  paint: (g, season, grain) => {
    g.save()
    g.beginPath()
    g.moveTo(-90, 246); g.lineTo(-90, -120); g.quadraticCurveTo(-90, -196, 0, -196); g.quadraticCurveTo(90, -196, 90, -120); g.lineTo(90, 246); g.closePath()
    g.clip()
    g.translate(-94, -200)
    outside(g, season, grain, 188, 450, 330, 120, BRANCH_OF.doorway)
    // The path, running away from the step.
    engrave(g, (h) => { stroke([60, 448, 80, 380, 120, 336])(h); stroke([150, 448, 150, 384, 138, 338])(h) }, 2, 0.6)
    g.restore()
    g.save()
    g.strokeStyle = WOOD.walnut.fill
    g.lineWidth = 18
    g.lineJoin = 'round'
    g.beginPath()
    g.moveTo(-90, 246); g.lineTo(-90, -120); g.quadraticCurveTo(-90, -196, 0, -196); g.quadraticCurveTo(90, -196, 90, -120); g.lineTo(90, 246)
    g.stroke()
    g.restore()
    engrave(g, (h) => { h.moveTo(-100, 246); h.lineTo(-100, -120); h.quadraticCurveTo(-100, -206, 0, -206); h.quadraticCurveTo(100, -206, 100, -120); h.lineTo(100, 246) }, 2, 0.9)
    cut(g, poly([-108, 240, 108, 240, 112, 258, -108, 258]), WOOD.maple, [-110, 238, 114, 260], { grain, gap: 4, seed: 41, stain: '#a9adaa', wash: 0.5 })
  },
}

/** Where the window and the doorway stand in the room. */
export const WINDOW_AT = { x: 580, y: 306 } as const
export const DOORWAY_AT = { x: 1066, y: 440 } as const
