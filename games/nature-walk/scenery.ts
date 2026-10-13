import { STAIN, WOOD, blob, cut, engrave, inlay, oval, poly, ridge, rivet, stroke, type Box, type G } from './ply'
import type { Season } from './wood'

// What stands still: the wood as a stack of cut sheets, from the back board
// to the big trunk at the front. The stack is stamped in four layers. The
// back board with its sky is one sheet. The two sheets of hills in front of
// it and the meadow in front of them are stained with the season, and flip
// to the next season's side as the year turns. Everything that stands on
// the meadow and everything from the path to the great trunk is one whole
// sheet again, cut away where the sky, the hills and the meadow show through
// it. The strip of blades at the very front is stained and flips too, in two
// halves. The path and the house are stained once, and never flip.
// Each is painted once for a surface, past the stage's edges, so a surface of
// another shape shows more wood and never a bare margin.

const L = -420, R = 1600, T = -320, B = 1140

/** The back board: bare pale ply with its sky. The hung pieces are all that is in it. */
export function paintSky(g: G, box: Box, grain: boolean): void {
  const all: Box = [L, T, R, B]
  const wood = { grain }

  // The back board: bare pale ply, with a thin blue wash that thins out towards the hills.
  g.fillStyle = WOOD.board.fill
  g.fillRect(box[0] - 2, box[1] - 2, box[2] - box[0] + 4, box[3] - box[1] + 4)
  cut(g, poly([L, T, R, T, R, B, L, B]), WOOD.board, all, { ...wood, gap: 0, edge: 0.01, seed: 3 })
  const sky = g.createLinearGradient(0, T, 0, 420)
  sky.addColorStop(0, 'rgba(150, 205, 228, 0.5)')
  sky.addColorStop(0.75, 'rgba(150, 205, 228, 0.28)')
  sky.addColorStop(1, 'rgba(150, 205, 228, 0)')
  g.fillStyle = sky
  g.fillRect(L, T, R - L, 420 - T)
}

/** How far down the back board and the meadow reach: behind the ground of the path, so that a sheet that stands edge on as it flips shows the sheet or the board behind it and never a gap. */
export const BACK_FOOT = 626

/**
 * The sheets that are stained with the season and stand behind everything else, the furthest first: the two
 * sheets of hills and the meadow, where the long grass and the house stand. Each flips over about its `foot`, a
 * level that the sheet in front of it hides, and reaches down to `bottom`. `x` is where it stands in the wave of
 * the turning year.
 */
export const HILLS: readonly { key: string; x: number; top: number; foot: number; bottom: number; paint: (g: G, season: Season, grain: boolean) => void }[] = [
  {
    key: 'hill-far', x: 300, top: 222, foot: 476, bottom: 520,
    paint: (g, season, grain) => cut(g, ridge([L, 262, -160, 246, 60, 268, 250, 236, 470, 262, 660, 232, 880, 258, 1080, 238, 1300, 256, R, 244], 520), WOOD.board, [L, 222, R, 520], { grain, gap: 5, seed: 4, stain: STAIN[season].grass, wash: season === 'winter' ? 0.5 : 0.24, edge: 1.8 }),
  },
  {
    key: 'hill-near', x: 820, top: 270, foot: 476, bottom: 520,
    paint: (g, season, grain) => {
      cut(g, ridge([L, 318, -120, 300, 110, 334, 330, 288, 560, 328, 800, 284, 1010, 322, 1250, 290, R, 316], 520), WOOD.birch, [L, 270, R, 520], { grain, gap: 7, seed: 5, stain: STAIN[season].grass, wash: season === 'winter' ? 0.66 : 0.38 })
      engrave(g, (h) => { stroke([150, 372, 330, 330, 520, 368])(h); stroke([640, 352, 800, 322, 980, 360])(h); stroke([-80, 352, 40, 338, 150, 356])(h) }, 1.4, 0.5)
    },
  },
  {
    // The meadow rises at the right to carry the bank with the burrow.
    key: 'meadow', x: 560, top: 374, foot: 612, bottom: BACK_FOOT,
    paint: (g, season, grain) => cut(g, ridge([L, 452, -100, 444, 110, 438, 300, 452, 480, 432, 640, 446, 740, 430, 820, 398, 910, 388, 1010, 394, 1100, 436, R, 434], BACK_FOOT), WOOD.maple, [L, 374, R, BACK_FOOT], { grain, gap: 9, seed: 7, stain: STAIN[season].grass, wash: season === 'winter' ? 0.6 : season === 'autumn' ? 0.34 : 0.26 }),
  },
]

/** Everything that stands on the meadow and everything from the path forward, on one sheet that is bare where the sky, the hills and the meadow show. `box` is the part of the stage's units the sheet must hold. */
export function paintScenery(g: G, box: Box, grain: boolean): void {
  const all: Box = [L, T, R, B]
  const wood = { grain }
  void box
  // The stems of the two far trees, which stand at the top of the meadow; their crowns are stained pieces.
  for (const [x, top] of [[176, 330], [466, 340]] as const) {
    cut(g, poly([x - 9, 452, x - 6, top, x + 6, top, x + 9, 452]), WOOD.alder, [x - 10, top, x + 10, 454], { ...wood, gap: 3, seed: x, slant: 1.57 })
  }

  // A picket fence along the rise at the left, behind the bush: two rails and a row of pointed pales.
  for (const y of [420, 444]) cut(g, poly([92, y, 236, y + 1, 236, y + 8, 92, y + 7]), WOOD.birch, [90, y, 238, y + 10], { ...wood, gap: 3, seed: y })
  for (let x = 110; x <= 222; x += 28) cut(g, poly([x - 9, 466, x - 9, 410 + (x % 3), x, 396 + (x % 3), x + 9, 410 + (x % 3), x + 9, 466]), WOOD.birch, [x - 10, 394, x + 10, 468], { ...wood, gap: 4, seed: x, slant: 1.57 })

  // The stem of the jay's tree, with the fork his nest sits in. It stands up on the rise, clear of the long grass
  // when that lies open. Its crown is a stained piece, stamped over it.
  cut(g, poly([696, 442, 706, 350, 676, 268, 664, 222, 684, 216, 700, 262, 728, 318, 752, 300, 790, 228, 810, 236, 782, 322, 770, 356, 780, 442]), WOOD.alder, [660, 212, 814, 446], { ...wood, gap: 6, seed: 13, slant: 1.52 })
  engrave(g, (h) => { stroke([718, 430, 722, 400, 714, 364])(h); stroke([752, 434, 748, 398])(h) }, 1.5, 0.6)

  // The stump behind the long grass, where the toad sits when he has leapt there.
  cut(g, poly([546, 474, 550, 414, 566, 406, 610, 406, 626, 414, 630, 474]), WOOD.walnut, [544, 404, 632, 476], { ...wood, gap: 5, seed: 15, slant: 1.57 })
  engrave(g, (h) => { oval(588, 414, 30, 5)(h); h.moveTo(604, 414); h.ellipse(588, 414, 16, 2.6, 0, 0, Math.PI * 2); stroke([562, 430, 566, 466])(h); stroke([606, 428, 610, 468])(h) }, 1.5, 0.7)

  // The bank with the burrow in it: a mound of darker wood on the rise, and the hole cut right through to the dark.
  cut(g, blob([816, 396, 822, 322, 852, 268, 912, 250, 970, 272, 992, 326, 996, 396]), WOOD.alder, [812, 246, 1000, 400], { ...wood, gap: 6, seed: 19, stain: '#b98d5a', wash: 0.3 })
  g.beginPath()
  oval(895, 340, 62, 50)(g)
  g.fillStyle = '#5c3b22'
  g.fill()
  g.strokeStyle = '#1f1107'
  g.lineWidth = 3
  g.stroke()
  engrave(g, (h) => { stroke([826, 388, 832, 340, 846, 300])(h); stroke([984, 386, 978, 338, 964, 298])(h); stroke([866, 270, 896, 262, 932, 268])(h) }, 1.6, 0.7)

  // The house at the edge of the wood: plank wall, thatch, and the door standing open on the room.
  cut(g, poly([1036, 300, R, 300, R, 566, 1036, 566]), WOOD.birch, [1032, 296, R, 570], { ...wood, gap: 7, seed: 23, slant: 1.57, stain: '#e9c9a2', wash: 0.3 })
  engrave(g, (h) => { for (let x = 1062; x < R; x += 34) { h.moveTo(x, 304); h.lineTo(x, 562) } }, 1.3, 0.45)
  // Inside the door: the dark room, a lit window at the back, and the corner of the table with its bowl.
  g.beginPath()
  g.moveTo(1074, 552); g.lineTo(1074, 356); g.quadraticCurveTo(1074, 326, 1104, 326); g.lineTo(1140, 326); g.quadraticCurveTo(1170, 326, 1170, 356); g.lineTo(1170, 552); g.closePath()
  g.fillStyle = '#4b2d18'
  g.fill()
  g.strokeStyle = '#39220f'
  g.lineWidth = 4
  g.stroke()
  // The window at the back of the room: an arched pane of light with one upright bar, off its middle.
  g.beginPath()
  g.moveTo(1102, 394); g.lineTo(1102, 366); g.quadraticCurveTo(1124, 340, 1146, 366); g.lineTo(1146, 394); g.closePath()
  g.fillStyle = '#f5d98a'
  g.fill()
  engrave(g, (h) => { h.moveTo(1102, 394); h.lineTo(1102, 366); h.quadraticCurveTo(1124, 340, 1146, 366); h.lineTo(1146, 394); h.closePath(); h.moveTo(1118, 352); h.lineTo(1118, 394) }, 1.6, 0.9)
  cut(g, poly([1086, 470, 1170, 462, 1170, 480, 1086, 488]), WOOD.birch, [1084, 460, 1172, 490], { ...wood, gap: 3, seed: 29 })
  cut(g, poly([1096, 488, 1106, 488, 1106, 552, 1096, 552]), WOOD.birch, [1094, 486, 1108, 554], { ...wood, gap: 2, seed: 31, slant: 1.57 })
  g.beginPath()
  g.moveTo(1120, 452); g.quadraticCurveTo(1138, 478, 1158, 450); g.closePath()
  g.fillStyle = '#9cc7de'
  g.fill()
  g.strokeStyle = '#39220f'
  g.lineWidth = 2
  g.stroke()
  // The door frame, the step, and the thatch.
  engrave(g, (h) => { h.moveTo(1066, 560); h.lineTo(1066, 352); h.quadraticCurveTo(1066, 318, 1100, 318); h.lineTo(1144, 318); h.quadraticCurveTo(1178, 318, 1178, 352); h.lineTo(1178, 560) }, 2.4, 0.9)
  cut(g, poly([1052, 552, 1196, 552, 1204, 572, 1044, 572]), WOOD.maple, [1040, 550, 1208, 576], { ...wood, gap: 4, seed: 37, stain: '#a9adaa', wash: 0.5 })
  cut(g, poly([1028, 312, 1080, 206, R, 190, R, 312]), WOOD.alder, [1024, 186, R, 316], { ...wood, gap: 9, seed: 41, stain: '#d9b25c', wash: 0.4 })
  engrave(g, (h) => { for (let x = 1058; x < R; x += 22) { h.moveTo(x + 30, 214); h.lineTo(x - 6, 306) } }, 1.3, 0.5)

  // The front ground: the path, the log, the dent under the stone and the puddle.
  cut(g, ridge([L, 604, -80, 596, 60, 586, 240, 600, 430, 606, 650, 598, 860, 582, 1060, 598, 1300, 586, R, 590], B), WOOD.alder, all, { ...wood, gap: 11, seed: 47, stain: '#d9b074', wash: 0.25 })
  engrave(g, (h) => {
    stroke([1086, 574, 1040, 600, 990, 640, 760, 632, 560, 624, 380, 780, 250, 900])(h)
    stroke([1160, 574, 1130, 640, 1010, 664, 720, 668, 620, 664, 520, 800, 470, 900])(h)
  }, 2, 0.6)
  // Pebbles on the path, each a different size, and the dip the path runs through.
  engrave(g, (h) => { oval(1034, 628, 9, 5)(h); oval(742, 648, 7, 4)(h); oval(536, 654, 6, 3)(h); oval(288, 770, 8, 4)(h) }, 1.4, 0.6)
  g.beginPath()
  oval(432, 762, 44, 11)(g)
  g.fillStyle = 'rgba(88, 50, 22, 0.3)'
  g.fill()

  // The log, lying hollow side up on the middle ground: its lid is the cover. Bark all round, the sawn end at the right, dark inside.
  cut(g, blob([234, 508, 248, 488, 348, 482, 444, 488, 466, 516, 468, 564, 452, 588, 348, 594, 248, 590, 232, 568]), WOOD.walnut, [228, 480, 472, 598], { ...wood, gap: 7, seed: 53 })
  g.beginPath()
  oval(352, 512, 100, 24)(g)
  g.fillStyle = '#2f1b0d'
  g.fill()
  g.strokeStyle = '#1f1107'
  g.lineWidth = 2.5
  g.stroke()
  engrave(g, (h) => { stroke([246, 570, 328, 578, 428, 570])(h); stroke([258, 582, 348, 586, 398, 582])(h); h.moveTo(461, 558); h.ellipse(454, 558, 7, 22, 0, 0, Math.PI * 2); h.moveTo(458.5, 560); h.ellipse(454, 560, 4.5, 14, 0, 0, Math.PI * 2); h.moveTo(456, 562); h.ellipse(454, 562, 2, 6, 0, 0, Math.PI * 2) }, 1.6, 0.8)
  // The dent the stone lies in.
  g.beginPath()
  oval(590, 730, 58, 17)(g)
  g.fillStyle = 'rgba(88, 50, 22, 0.55)'
  g.fill()
  // The puddle: a blue-stained sheet let into the ground, with its ripples engraved.
  cut(g, blob([728, 712, 752, 676, 836, 664, 920, 676, 946, 712, 918, 748, 836, 758, 754, 746]), WOOD.birch, [724, 660, 950, 762], { ...wood, gap: 0, seed: 59, stain: '#56a9d6', wash: 0.72 })
  engrave(g, (h) => { stroke([768, 700, 800, 692, 832, 700])(h); stroke([850, 730, 882, 722, 912, 730])(h); stroke([790, 736, 812, 730, 834, 736])(h) }, 1.5, 0.55)
  // The bed the toad's stone rocks on.
  g.beginPath()
  oval(1056, 738, 104, 12)(g)
  g.fillStyle = 'rgba(88, 50, 22, 0.4)'
  g.fill()

  // The great trunk at the left of the frame, with the low branch and the twig the finds hang on.
  cut(g, poly([L, T, 62, T, 58, 60, 70, 180, 96, 226, 250, 232, 380, 248, 444, 262, 446, 272, 380, 276, 336, 274, 344, 318, 350, 372, 340, 374, 330, 322, 318, 274, 250, 272, 110, 286, 86, 330, 70, 480, 60, 640, 70, 730, 98, 800, 92, B, L, B]), WOOD.walnut, [L, T, 450, B], { ...wood, gap: 12, seed: 67, slant: 1.56 })
  engrave(g, (h) => { stroke([30, -200, 26, 80, 40, 300, 34, 620, 60, 860])(h); stroke([-30, -200, -20, 200, -8, 500, 6, 900])(h); stroke([120, 250, 230, 250, 360, 262])(h) }, 1.8, 0.7)
  // The bracket the wheel hangs from, which is also the pawl that clacks against its teeth.
  cut(g, poly([116, T, 140, T, 136, 56, 128, 66, 120, 56]), WOOD.maple, [112, T, 144, 70], { ...wood, gap: 4, seed: 71, slant: 1.57 })
  rivet(g, 128, 40, 4)

  // A toadstool that is only wood, behind the blades at the front.
  cut(g, blob([262, 772, 286, 748, 312, 772]), WOOD.birch, [258, 744, 316, 776], { ...wood, gap: 3, seed: 79, stain: '#c9432b', wash: 0.6 })
  cut(g, poly([282, 772, 292, 772, 292, 792, 282, 792]), WOOD.birch, [280, 770, 294, 794], { ...wood, gap: 2, seed: 83 })
  inlay(g, 280, 764, 3, '#f7f1e1', 0)
  inlay(g, 294, 760, 3, '#f7f1e1', 0)
}

/** Where the front strip turns over as the year turns: its two halves meet here, and each flips about this level. */
export const STRIP = { seam: 590, level: 800, top: 726, bottom: B } as const

/**
 * The front strip: a dark sheet cut into blades along its top, stained with its season. The blades stand taller in
 * one tuft at the front of the path, which is where the worm tucks its head in when the stone and the long grass
 * both stand open. It is painted whole into each of its two halves, so there is no cut where they meet.
 */
export function paintStrip(g: G, season: Season, grain: boolean): void {
  const blades: number[] = [L, B]
  let tufted = false
  for (let x = L, i = 0; x <= R; i++) {
    // The tuft: three taller blades close together, each a different height and width.
    if (!tufted && x >= TUFT - 30) {
      tufted = true
      blades.push(TUFT - 8, 802, TUFT - 2, 758, TUFT + 5, 786, TUFT + 10, 738, TUFT + 17, 782, TUFT + 22, 766, TUFT + 27, 802)
      x = TUFT + 27
      continue
    }
    // A blade: no two next to each other the same width, height or lean, so the row is grass and not a zigzag.
    const wide = 17 + ((i * 37) % 19), lean = 0.22 + ((i * 11) % 6) * 0.11, tall = 16 + ((i * 29) % 37)
    const next = Math.min(x + wide, tufted ? R + 40 : TUFT - 8)
    blades.push(x, 800 + ((i * 7) % 9), x + (next - x) * lean, 800 - tall)
    x = next
  }
  blades.push(R + 40, 804, R + 40, B)
  cut(g, poly(blades), WOOD.walnut, [L, 730, R, B], { grain, gap: 5, seed: 73, stain: STAIN[season].grass, wash: season === 'winter' ? 0.62 : 0.4 })
}
/** Where the tuft of taller blades starts: the worm's head goes in at its middle (TUCKS.front in layout.ts). */
const TUFT = 490
