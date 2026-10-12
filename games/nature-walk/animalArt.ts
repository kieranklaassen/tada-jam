import { BRANCH_OF, BURNT, SCORCH, STAIN, WOOD, blob, cut, disc, engrave, inlay, oval, poly, rivet, spiked, stroke, tick, twig, type Box, type G } from './ply'
import { SEASONS } from './wood'

// The three animals, the wheel, the toad's stone, the nest and the pieces that hang
// on threads, as cut parts. An animal is a jointed toy of ply: each part is
// drawn about the animal's own middle, and the view turns and slides the
// parts on their pins. The faces are what moves most, so the pupils, the
// brows and the mouths are drawn live by the view and are not in here.

export type Part = { box: Box; paint: (g: G, grain: boolean) => void }

const TAU = Math.PI * 2
const part = (box: Box, paint: (g: G, grain: boolean) => void): Part => ({ box, paint })

// --- The hedgehog, facing right, towards the wood -------------------------------

const SPINES = '#6a4326'

export const HEDGEHOG = {
  /** The spiny back: a dome of dark wood with a comb of spines cut along it. */
  back: part([-142, -104, 122, 96], (g, grain) => {
    const outline = [...spiked(-12, 28, 100, 122, 13, Math.PI * 1.02, Math.PI * 1.96), 84, 60, 60, 78, -96, 78, -112, 56]
    cut(g, poly(outline), WOOD.walnut, [-136, -100, 112, 80], { grain, gap: 7, seed: 3, stain: SPINES, wash: 0.5, edge: 2.8 })
    engrave(g, (h) => { for (let i = 0; i < 12; i++) { const a = Math.PI * (1.08 + i * 0.075); h.moveTo(-12 + Math.cos(a) * 52, 28 + Math.sin(a) * 52); h.lineTo(-12 + Math.cos(a) * 92, 28 + Math.sin(a) * 92) } }, 2, 0.7)
    engrave(g, (h) => { for (let i = 0; i < 9; i++) { const a = Math.PI * (1.14 + i * 0.09); h.moveTo(-12 + Math.cos(a) * 18, 34 + Math.sin(a) * 18); h.lineTo(-12 + Math.cos(a) * 42, 34 + Math.sin(a) * 42) } }, 2, 0.55)
  }),
  /** The face: a pale wedge with a dark nose at its tip, an ear, and the socket of the one eye that shows. */
  face: part([-2, -70, 150, 76], (g, grain) => {
    cut(g, disc(40, -44, 17), WOOD.alder, [22, -62, 58, -26], { grain, gap: 3, seed: 5, stain: '#c8855e', wash: 0.5 })
    cut(g, blob([8, 18, 22, -40, 70, -36, 124, 0, 132, 12, 88, 46, 30, 58]), WOOD.birch, [6, -44, 134, 60], { grain, gap: 5, seed: 7, stain: '#f6dfb9', wash: 0.6, edge: 2.8 })
    inlay(g, 128, 6, 11, '#2a170b', 0)
    inlay(g, 124, 2, 3, '#fbf7ea', 0)
    inlay(g, 68, -8, 15, '#fffaf0', 2)
    inlay(g, 84, 26, 9, 'rgba(240, 130, 130, 0.5)', 0)
    engrave(g, (h) => { stroke([104, 2, 112, -12])(h); stroke([108, 12, 122, 24])(h); stroke([102, 14, 114, 32])(h) }, 1.4, 0.6)
  }),
  feet: part([-90, 58, 86, 104], (g, grain) => {
    cut(g, oval(-56, 82, 24, 11), WOOD.birch, [-80, 70, -32, 94], { grain, gap: 3, seed: 9, stain: '#f6dfb9', wash: 0.6 })
    cut(g, oval(40, 84, 24, 11), WOOD.birch, [16, 72, 64, 96], { grain, gap: 3, seed: 11, stain: '#f6dfb9', wash: 0.6 })
    engrave(g, (h) => { for (const x of [-64, -56, -48, 32, 40, 48]) { h.moveTo(x, 80); h.lineTo(x, 90) } }, 1.3, 0.6)
  }),
  /** Rolled up: a ball of spines all round, with the tip of the nose showing. The eye that peeps out is drawn live. */
  ball: part([-112, -112, 118, 120], (g, grain) => {
    cut(g, poly(spiked(0, 0, 86, 104, 22)), WOOD.walnut, [-106, -106, 106, 106], { grain, gap: 7, seed: 13, stain: SPINES, wash: 0.5, edge: 2.8 })
    engrave(g, (h) => { for (let i = 0; i < 22; i++) { const a = (i / 22) * TAU + 0.14; h.moveTo(Math.cos(a) * 40, Math.sin(a) * 40); h.lineTo(Math.cos(a) * 78, Math.sin(a) * 78) } }, 2, 0.65)
    engrave(g, (h) => { for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; h.moveTo(Math.cos(a) * 12, Math.sin(a) * 12); h.lineTo(Math.cos(a) * 30, Math.sin(a) * 30) } }, 2, 0.5)
    cut(g, blob([44, 16, 70, 10, 84, 22, 70, 36, 46, 34]), WOOD.birch, [42, 8, 86, 38], { grain, gap: 2, seed: 15, stain: '#f6dfb9', wash: 0.6 })
    inlay(g, 82, 23, 8, '#2a170b', 0)
    cut(g, oval(46, -14, 17, 13), WOOD.birch, [28, -28, 64, 0], { grain: false, gap: 0, stain: '#fffaf0', wash: 1, edge: 2 })
  }),
} as const

// --- The jay, on the rim of his nest, facing left ---------------------------------

/** The feathers of the jay's breast: where each short curve is, how wide and how deep, and how it is tilted. No two are the same size or tilt. */
export const BREAST: readonly (readonly [number, number, number, number, number])[] = [[-24, 18, 20, 8, -0.3], [-4, 32, 13, 5, 0.35], [-30, 46, 16, 9, 0.1], [-8, 60, 24, 6, -0.15]]

export const JAY = {
  // The tail: a wedge of dark feathers that widens to its tip, hung from under him and drawn about where it joins.
  tail: part([-30, -8, 34, 104], (g, grain) => {
    cut(g, poly([-10, 0, 12, 0, 26, 78, 6, 96, -22, 82]), WOOD.walnut, [-24, -2, 28, 98], { grain, gap: 4, seed: 21, stain: '#27344f', wash: 0.8, slant: 1.5 })
    engrave(g, (h) => { stroke([-2, 8, -10, 84])(h); stroke([5, 8, 10, 86])(h) }, 1.4, 0.7)
    cut(g, poly([-18, 70, 22, 66, 26, 78, 6, 96, -22, 82]), WOOD.birch, [-24, 64, 28, 98], { grain: false, gap: 0, stain: '#3f7fd0', wash: 0.85, edge: 1.6 })
  }),
  body: part([-66, -70, 68, 100], (g, grain) => {
    engrave(g, (h) => { for (const x of [-14, 14]) { h.moveTo(x, 70); h.lineTo(x - 8, 92); h.moveTo(x, 70); h.lineTo(x + 8, 92); h.moveTo(x, 70); h.lineTo(x, 94) } }, 3, 1)
    cut(g, blob([-30, -44, 10, -64, 46, -30, 52, 26, 24, 72, -24, 76, -54, 36, -52, -10]), WOOD.birch, [-58, -66, 54, 78], { grain, gap: 6, seed: 23, stain: '#e7a98f', wash: 0.7, edge: 2.8 })
    // The feathers of his breast: short curves, no two the same size or tilt.
    engrave(g, (h) => { for (const [x, y, wide, deep, turn] of BREAST) tick(x, y, wide, deep, turn)(h) }, 1.5, 0.55)
  }),
  /** The wing, with the blue panel that is the brightest thing on him. It turns on a pin at its shoulder. */
  wing: part([-22, -26, 66, 76], (g, grain) => {
    cut(g, blob([-12, -14, 20, -18, 52, 6, 56, 44, 26, 68, -6, 30]), WOOD.birch, [-14, -20, 58, 70], { grain, gap: 4, seed: 25, stain: '#b98568', wash: 0.6 })
    cut(g, poly([2, -6, 30, -8, 46, 12, 12, 16]), WOOD.board, [0, -10, 48, 18], { grain, gap: 0, seed: 27, stain: '#2f8df0', wash: 0.92, edge: 1.8 })
    engrave(g, (h) => { for (const x of [10, 18, 26, 34]) { h.moveTo(x, -6); h.lineTo(x + 4, 14) } }, 1.5, 0.9)
    engrave(g, (h) => { stroke([18, 24, 34, 50])(h); stroke([30, 20, 46, 44])(h) }, 1.4, 0.6)
    rivet(g, -2, -6, 4.5)
  }),
  /** The head, drawn about its own middle: a white throat, a dark moustache and a stout beak to the left. */
  head: part([-66, -44, 44, 46], (g, grain) => {
    cut(g, poly([-30, -10, -62, 2, -30, 12]), WOOD.walnut, [-64, -12, -28, 14], { grain, gap: 3, seed: 29, stain: '#2b2118', wash: 0.7 })
    cut(g, disc(0, 0, 36), WOOD.birch, [-36, -36, 36, 36], { grain, gap: 5, seed: 31, stain: '#e7a98f', wash: 0.7, edge: 2.8 })
    cut(g, blob([-30, 10, -8, 8, 4, 30, -18, 34]), WOOD.board, [-32, 6, 6, 36], { grain: false, gap: 0, stain: '#fffaf0', wash: 0.9, edge: 1.4 })
    cut(g, blob([-30, 10, -12, 10, -6, 24, -16, 22]), WOOD.walnut, [-32, 8, -4, 26], { grain: false, gap: 0, stain: '#1d140d', wash: 0.9, edge: 1.2 })
    inlay(g, -12, -8, 13, '#fffaf0', 2)
  }),
  /** The crest: streaked feathers that lie flat and stand up. It turns on the back of the crown. */
  crest: part([-34, -40, 30, 14], (g, grain) => {
    cut(g, poly([-26, 6, -30, -14, -16, -4, -12, -30, -2, -6, 8, -34, 12, -4, 24, -18, 22, 8]), WOOD.board, [-32, -36, 26, 10], { grain, gap: 3, seed: 33, stain: '#e7a98f', wash: 0.6, edge: 2.2 })
    engrave(g, (h) => { for (const [x, y] of [[-20, -8], [-10, -20], [6, -24], [18, -10]] as const) { h.moveTo(x, y); h.lineTo(x + 2, y + 12) } }, 1.6, 0.85)
  }),
} as const

/** The nest in the fork of his tree: a bowl of crossed twigs. */
export const NEST_ART = part([-70, -30, 72, 44], (g, grain) => {
  engrave(g, (h) => { stroke([-64, -18, -30, 4])(h); stroke([60, -22, 28, 2])(h); stroke([-54, 30, -20, 12])(h); stroke([62, 26, 30, 10])(h); stroke([-10, -20, 4, 0])(h) }, 3.2, 1)
  cut(g, blob([-56, -8, 0, -2, 56, -8, 44, 30, 0, 36, -44, 30]), WOOD.walnut, [-58, -10, 58, 38], { grain, gap: 5, seed: 41, stain: '#9a6f3f', wash: 0.4 })
  engrave(g, (h) => { stroke([-44, 2, 0, 22, 40, 4])(h); stroke([-40, 22, -4, 4, 44, 20])(h); stroke([-20, 30, 10, 8])(h) }, 1.8, 0.8)
})

// --- The toad, on his stone, facing the child ----------------------------------

const TOAD_GREEN = '#8fa63c'

export const TOAD = {
  body: part([-112, -52, 116, 84], (g, grain) => {
    cut(g, blob([-104, 44, -96, 6, -70, 2, -64, 50]), WOOD.birch, [-106, 0, -62, 54], { grain, gap: 4, seed: 51, stain: '#7b9130', wash: 0.8 })
    cut(g, blob([104, 44, 96, 6, 70, 2, 64, 50]), WOOD.birch, [62, 0, 106, 54], { grain, gap: 4, seed: 53, stain: '#7b9130', wash: 0.8 })
    cut(g, blob([-86, 34, -70, -22, -30, -46, 30, -46, 70, -22, 86, 34, 58, 62, -58, 62]), WOOD.birch, [-88, -48, 88, 64], { grain, gap: 6, seed: 55, stain: TOAD_GREEN, wash: 0.8, edge: 2.8 })
    // Warts: darker spots of different sizes, scattered.
    for (const [x, y, r] of [[-56, 6, 5], [-40, 36, 3.4], [50, 2, 6], [62, 32, 3.6], [-68, 28, 2.6]] as const) inlay(g, x, y, r, '#74892d', 0)
    cut(g, poly([-62, 56, -72, 74, -56, 68, -48, 78, -40, 66, -26, 72, -30, 56]), WOOD.birch, [-74, 54, -24, 80], { grain, gap: 2, seed: 57, stain: '#b7c46a', wash: 0.8, edge: 2 })
    cut(g, poly([62, 56, 72, 74, 56, 68, 48, 78, 40, 66, 26, 72, 30, 56]), WOOD.birch, [24, 54, 74, 80], { grain, gap: 2, seed: 59, stain: '#b7c46a', wash: 0.8, edge: 2 })
  }),
  /** The throat: a pale disc under his chin, which the view blows up to a great ball. */
  throat: part([-32, -32, 34, 36], (g, grain) => {
    cut(g, disc(0, 0, 28), WOOD.board, [-28, -28, 28, 28], { grain, gap: 3, seed: 61, stain: '#f3e6a8', wash: 0.85, edge: 2.4 })
    engrave(g, (h) => { stroke([-14, 8, 0, 14, 14, 8])(h) }, 1.4, 0.5)
  }),
  /** The head: a wide dome with the two bumps his eyes sit in. */
  head: part([-92, -92, 96, 26], (g, grain) => {
    cut(g, blob([-80, 8, -78, -30, -60, -66, -40, -74, -24, -52, 24, -52, 40, -74, 60, -66, 78, -30, 80, 8, 0, 16]), WOOD.birch, [-82, -76, 82, 18], { grain, gap: 6, seed: 63, stain: TOAD_GREEN, wash: 0.8, edge: 2.8 })
    inlay(g, -44, -50, 18, '#f7e48f', 2.2)
    inlay(g, 44, -50, 18, '#f7e48f', 2.2)
    inlay(g, -12, -22, 2, '#5d6f22', 0)
    inlay(g, 12, -23, 1.6, '#5d6f22', 0)
  }),
  /** The back of his head, for when he has landed facing away: the same dome, warts and no eyes. */
  backHead: part([-92, -92, 96, 26], (g, grain) => {
    cut(g, blob([-80, 8, -78, -30, -60, -66, -40, -74, -24, -52, 24, -52, 40, -74, 60, -66, 78, -30, 80, 8, 0, 16]), WOOD.birch, [-82, -76, 82, 18], { grain, gap: 6, seed: 65, stain: '#7b9130', wash: 0.85, edge: 2.8 })
    for (const [x, y, r] of [[-44, -50, 8], [44, -50, 8], [-22, -24, 4.4], [18, -30, 5.6], [2, -6, 3.6], [-50, -14, 3], [52, -10, 4.6]] as const) inlay(g, x, y, r, '#62761f', 0)
    engrave(g, stroke([0, -48, 3, -20, -1, 10]), 1.6, 0.7)
  }),
} as const

/**
 * The toad as he shows through the door of the house when he sits on the table at home: all of him in one piece,
 * drawn about his feet, with his eyes and his mouth engraved in. He is stamped small with the distance, and
 * still large enough to be told for a toad.
 */
export const TOAD_MINI = part([-114, -186, 118, 26], (g, grain) => {
  g.save()
  g.translate(0, -62)
  TOAD.body.paint(g, grain)
  g.translate(0, 14)
  TOAD.throat.paint(g, grain)
  g.translate(0, -44)
  TOAD.head.paint(g, grain)
  for (const x of [-44, 44]) { g.beginPath(); g.ellipse(x, -50, 10.5, 7, 0, 0, TAU); g.fillStyle = '#1d120a'; g.fill() }
  engrave(g, (h) => { h.moveTo(-58, -4); h.quadraticCurveTo(0, 14, 58, -4) }, 2.6, 1)
  g.restore()
})

// --- The wheel of the year -----------------------------------------------------

/** How the edge of a quarter of the wheel is bent: its control point is turned `by` from the edge and stands `out` from the pin, so the edge is `deep` off straight at its middle. */
export const WHEEL_BEND = { by: 0.9, out: 40, deep: (40 * Math.sin(0.9)) / 2 } as const

export const WHEEL_ART = part([-92, -92, 98, 100], (g, grain) => {
  cut(g, poly(spiked(0, 0, 72, 84, 12)), WOOD.maple, [-86, -86, 86, 86], { grain, gap: 7, seed: 71, edge: 2.8 })
  // Four quarters, each washed with its season's stain. Spring is the quarter at the top when nothing has turned.
  SEASONS.forEach((season, index) => {
    const from = -Math.PI * 0.75 + index * (Math.PI / 2), to = from + Math.PI / 2
    // Each quarter is cut along two bent edges, so the four of them meet as a pinwheel does, under the hub.
    // The bend is deep enough to be seen with the wheel at rest: the edge stands `WHEEL_BEND.deep` off the straight line at its middle.
    const bend = (angle: number): [number, number] => [Math.cos(angle + WHEEL_BEND.by) * WHEEL_BEND.out, Math.sin(angle + WHEEL_BEND.by) * WHEEL_BEND.out]
    g.beginPath()
    g.moveTo(0, 0)
    g.quadraticCurveTo(...bend(from), Math.cos(from) * 64, Math.sin(from) * 64)
    g.arc(0, 0, 64, from, to)
    g.quadraticCurveTo(...bend(to), 0, 0)
    g.closePath()
    g.fillStyle = STAIN[season].leaf
    g.globalAlpha = 0.9
    g.fill()
    g.globalAlpha = 1
    g.strokeStyle = BURNT
    g.lineWidth = 1.6
    g.stroke()
    // One picture to a quarter, cut and engraved: a blossom, a leaf, a falling leaf, a bare twig under snow.
    g.save()
    // The picture sits in the middle of its quarter, which the bent edges carry round a little.
    g.rotate(from + Math.PI / 4 + Math.PI / 2 + 0.3)
    g.translate(0, -41)
    if (season === 'spring') { for (let i = 0; i < 5; i++) inlay(g, Math.cos((i / 5) * TAU) * 9, Math.sin((i / 5) * TAU) * 9, 6, STAIN.spring.other, 1.2); inlay(g, 0, 0, 4, '#f4d24a', 0) }
    if (season === 'summer') { inlay(g, 0, 0, 10, STAIN.summer.other, 1.4); engrave(g, (h) => { for (let i = 0; i < 8; i++) { const a = (i / 8) * TAU; h.moveTo(Math.cos(a) * 13, Math.sin(a) * 13); h.lineTo(Math.cos(a) * 19, Math.sin(a) * 19) } }, 2, 0.95) }
    if (season === 'autumn') { g.beginPath(); oval(0, 0, 15, 8, 0.7)(g); g.fillStyle = STAIN.autumn.other; g.fill(); g.strokeStyle = SCORCH; g.lineWidth = 1.4; g.stroke(); engrave(g, stroke([-10, -8, 10, 8]), 1.4, 0.9) }
    if (season === 'winter') { engrave(g, twig(-3, 15, 30, 0.1, BRANCH_OF.wheel), 2.2, 0.95); inlay(g, 13, -1, 3, STAIN.winter.other, 0); inlay(g, -6, -12, 2.2, STAIN.winter.other, 0) }
    g.restore()
  })
  // The hub: a round of wood over where the quarters meet, on its brass pin.
  cut(g, disc(0, 0, 17), WOOD.maple, [-17, -17, 17, 17], { grain, gap: 3, seed: 73, edge: 2 })
  rivet(g, 0, 0, 7)
})

// --- The toad's stone, the pieces on threads, the hand --------------------------

/** The toad's stone: a flat grey slab, drawn about its middle, which it rocks on like a seesaw. */
export const SLAB_ART = part([-118, -34, 122, 40], (g, grain) => {
  cut(g, blob([-110, 0, -94, -20, 0, -28, 94, -20, 110, 0, 94, 20, 0, 28, -94, 20]), WOOD.maple, [-112, -30, 112, 30], { grain, gap: 6, seed: 61, stain: '#98a3ab', wash: 0.72 })
  engrave(g, (h) => { stroke([-84, 8, -46, 14, -6, 10])(h); stroke([44, -8, 70, -4, 88, -8])(h) }, 1.4, 0.6)
})

/** A bird on a thread: a plump cut body with a wing, a tail and a beak, so that it is a bird from any distance. */
export const BIRD_ART = part([-34, -24, 40, 30], (g, grain) => {
  cut(g, poly([14, -2, 34, -12, 30, 8]), WOOD.walnut, [12, -14, 36, 10], { grain, gap: 3, seed: 95, stain: '#27344f', wash: 0.7, edge: 1.8 })
  cut(g, blob([-22, -4, -8, -16, 12, -12, 20, 2, 6, 16, -14, 14]), WOOD.birch, [-24, -18, 22, 18], { grain, gap: 5, seed: 97, stain: '#d2694a', wash: 0.75, edge: 2.2 })
  cut(g, poly([-20, -2, -32, 2, -20, 6]), WOOD.walnut, [-34, -4, -18, 8], { grain: false, gap: 0, stain: '#2b2118', wash: 0.8, edge: 1.4 })
  cut(g, blob([-6, -4, 10, -8, 16, 4, 0, 8]), WOOD.board, [-8, -10, 18, 10], { grain, gap: 2, seed: 99, stain: '#8a5a44', wash: 0.6, edge: 1.6 })
  inlay(g, -12, -4, 2.6, SCORCH, 0)
})

export const CLOUD_ART = part([-66, -32, 72, 40], (g, grain) => {
  cut(g, blob([-58, 16, -50, -8, -22, -22, 8, -28, 34, -16, 56, -2, 58, 18, 0, 26]), WOOD.board, [-60, -30, 60, 28], { grain, gap: 8, seed: 91, stain: '#ffffff', wash: 0.55 })
  engrave(g, (h) => { stroke([-30, 6, -14, -4, 4, 6])(h); stroke([12, 8, 28, 0, 42, 8])(h) }, 1.5, 0.45)
})

export const SUN_ART = part([-62, -62, 68, 70], (g, grain) => {
  cut(g, poly(spiked(0, 0, 38, 56, 10)), WOOD.birch, [-58, -58, 58, 58], { grain, gap: 8, seed: 93, stain: '#f6c436', wash: 0.85 })
  engrave(g, (h) => { h.moveTo(26, 0); h.arc(0, 0, 26, 0, TAU) }, 1.8, 0.6)
})

/** The ghost hand: a pale cut-out of a pointing hand, drawn about the tip of its finger. */
export const HAND_ART = part([-40, -8, 60, 110], (g) => {
  g.save()
  g.rotate(-0.3)
  cut(g, blob([-9, 4, 0, -4, 9, 4, 11, 46, 38, 50, 44, 70, 36, 98, -4, 100, -22, 74, -20, 52, -10, 46]), WOOD.board, [-24, -6, 46, 102], { grain: false, gap: 5, stain: '#fffdf4', wash: 0.9, edge: 2.6 })
  engrave(g, (h) => { stroke([11, 58, 11, 70])(h); stroke([24, 58, 24, 70])(h) }, 1.5, 0.6)
  g.restore()
})
