import { SCORCH, WOOD, blob, cut, disc, engrave, inlay, oval, poly, stroke, tube, type Box, type G } from './ply'

// What is under the covers, each a small cut piece or two drawn about its
// own middle. They are the plainest things in the frame: one shape, one
// stain, a few engraved lines, and eyes only on what is alive.

export type FindArt = { box: Box; paint: (g: G, grain: boolean) => void }

const BOX: Box = [-52, -52, 56, 58]
const TAU = Math.PI * 2

const eyes = (g: G, x: number, y: number, gap = 9, r = 2.6): void => { inlay(g, x - gap / 2, y, r, SCORCH, 0); inlay(g, x + gap / 2, y, r, SCORCH, 0) }

const small = (grain: boolean, seed: number, stain: string, wash = 0.84) => ({ grain, gap: 4, seed, stain, wash, edge: 2.4 })

export const FIND_ART = {
  worm: { box: BOX, paint: (g) => {
    tube(g, stroke([-36, 12, -20, -14, 0, 10, 20, -14, 34, 4]), 13, '#ee8f95')
    engrave(g, (h) => { h.moveTo(-8, -6); h.lineTo(-2, 8); h.moveTo(-14, -12); h.lineTo(-8, 2) }, 1.5, 0.6)
    eyes(g, 33, 0, 7, 2.2)
  } },
  // The worm tied in a knot: one loop pulled through itself, the head sticking out of it.
  wormKnot: { box: BOX, paint: (g) => {
    tube(g, stroke([-30, 16, -12, 2, 6, -16, 22, -6, 14, 12, -4, 10, -2, -8, 16, -20, 32, -12]), 13, '#ee8f95')
    engrave(g, (h) => { h.moveTo(2, -6); h.lineTo(10, 2); h.moveTo(-6, 0); h.lineTo(2, 8) }, 1.5, 0.6)
    eyes(g, 32, -15, 7, 2.2)
  } },
  snail: { box: BOX, paint: (g, grain) => {
    // Its two horns are not here: they come in and out one at a time, so the view draws them.
    tube(g, stroke([-34, 24, 0, 26, 30, 22, 38, 4]), 13, '#f0d2a4')
    cut(g, disc(-6, -4, 27), WOOD.birch, [-33, -31, 21, 23], small(grain, 3, '#dfa136'))
    engrave(g, (h) => { h.moveTo(-6, -4); for (let a = 0; a < TAU * 2.2; a += 0.3) h.lineTo(-6 + Math.cos(a) * a * 1.7, -4 + Math.sin(a) * a * 1.7) }, 1.8, 0.8)
    eyes(g, 40, 8, 6, 2)
  } },
  snailShell: { box: BOX, paint: (g, grain) => {
    cut(g, disc(-6, -2, 27), WOOD.birch, [-33, -29, 21, 25], small(grain, 3, '#dfa136'))
    engrave(g, (h) => { h.moveTo(-6, -2); for (let a = 0; a < TAU * 2.2; a += 0.3) h.lineTo(-6 + Math.cos(a) * a * 1.7, -2 + Math.sin(a) * a * 1.7) }, 1.8, 0.8)
  } },
  feather: { box: BOX, paint: (g, grain) => {
    g.save()
    g.rotate(-0.6)
    cut(g, blob([-44, 0, -20, -15, 14, -15, 44, -4, 44, 4, 14, 15, -20, 13]), WOOD.board, [-46, -17, 46, 17], small(grain, 5, '#3d86e6', 0.86))
    engrave(g, (h) => { h.moveTo(-50, 1); h.lineTo(44, 0); for (let x = -30; x <= 30; x += 12) { h.moveTo(x, 0); h.lineTo(x + 8, -12); h.moveTo(x, 0); h.lineTo(x + 8, 12) } }, 1.5, 0.75)
    g.restore()
  } },
  acorn: { box: BOX, paint: (g, grain) => {
    cut(g, blob([-22, -8, -20, 22, 0, 40, 20, 22, 22, -8]), WOOD.maple, [-24, -10, 24, 42], small(grain, 7, '#c58a2e'))
    engrave(g, stroke([-8, 0, -10, 18, -2, 32]), 1.5, 0.6)
  } },
  acornCap: { box: BOX, paint: (g, grain) => {
    cut(g, blob([-27, -6, -22, -24, 0, -32, 22, -24, 27, -6, 0, -2]), WOOD.walnut, [-29, -34, 29, 0], { grain, gap: 3, seed: 9, edge: 2.4 })
    tube(g, stroke([0, -30, 3, -42]), 4, WOOD.walnut.fill, 0)
    engrave(g, (h) => { for (let x = -18; x <= 18; x += 9) { h.moveTo(x, -8); h.lineTo(x + 5, -24) } }, 1.3, 0.7)
  } },
  button: { box: BOX, paint: (g, grain) => {
    cut(g, disc(0, 0, 30), WOOD.board, [-30, -30, 30, 30], small(grain, 11, '#dfe7ee', 0.9))
    engrave(g, (h) => { h.moveTo(22, 0); h.arc(0, 0, 22, 0, TAU) }, 1.8, 0.7)
    inlay(g, -8, 0, 4.5, SCORCH, 0)
    inlay(g, 8, 0, 4.5, SCORCH, 0)
    g.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    g.lineWidth = 5
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(-18, -14); g.lineTo(-8, -22)
    g.stroke()
  } },
  apple: { box: BOX, paint: (g, grain) => {
    tube(g, stroke([0, -24, 4, -40]), 4, WOOD.walnut.fill, 0)
    cut(g, blob([0, -24, -24, -32, -38, -8, -30, 26, -8, 38, 0, 34, 8, 38, 30, 26, 38, -8, 24, -32]), WOOD.birch, [-40, -34, 40, 40], small(grain, 15, '#dd3e2c', 0.88))
    g.strokeStyle = 'rgba(255, 255, 255, 0.8)'
    g.lineWidth = 5
    g.lineCap = 'round'
    g.beginPath()
    g.moveTo(-24, -8); g.quadraticCurveTo(-22, -20, -12, -22)
    g.stroke()
  } },
  ladybird: { box: BOX, paint: (g, grain) => {
    inlay(g, 26, 0, 12, SCORCH, 0)
    cut(g, oval(-2, 0, 30, 25), WOOD.birch, [-32, -25, 28, 25], small(grain, 17, '#de3a2b', 0.9))
    engrave(g, (h) => { h.moveTo(-32, 0); h.lineTo(26, 0) }, 1.8, 0.9)
    for (const [x, y] of [[-14, -12], [4, -12], [-14, 12], [4, 12], [-24, 0]] as const) inlay(g, x, y, 4.5, SCORCH, 0)
    inlay(g, 30, -5, 2.4, '#fbf7ea', 0)
    inlay(g, 30, 5, 2.4, '#fbf7ea', 0)
  } },
  ladybirdOpen: { box: BOX, paint: (g, grain) => {
    inlay(g, 26, 0, 12, SCORCH, 0)
    cut(g, oval(-6, -22, 26, 9, -0.5), WOOD.board, [-34, -44, 22, 0], { grain, gap: 2, seed: 19, edge: 1.6 })
    cut(g, oval(-6, 22, 26, 9, 0.5), WOOD.board, [-34, 0, 22, 44], { grain, gap: 2, seed: 21, edge: 1.6 })
    cut(g, oval(2, -19, 26, 11, -0.9), WOOD.birch, [-26, -46, 30, 6], small(grain, 17, '#de3a2b', 0.9))
    cut(g, oval(2, 19, 26, 11, 0.9), WOOD.birch, [-26, -6, 30, 46], small(grain, 17, '#de3a2b', 0.9))
    inlay(g, 30, -5, 2.4, '#fbf7ea', 0)
    inlay(g, 30, 5, 2.4, '#fbf7ea', 0)
  } },
  mushroom: { box: BOX, paint: (g, grain) => {
    cut(g, blob([-10, 0, -12, 38, 12, 38, 10, 0]), WOOD.board, [-13, -2, 13, 40], { grain, gap: 3, seed: 23, edge: 2.2 })
    cut(g, blob([-40, 2, -32, -26, 0, -40, 32, -26, 40, 2, 0, 8]), WOOD.birch, [-42, -42, 42, 10], small(grain, 25, '#d9402c', 0.88))
    for (const [x, y, r] of [[-18, -14, 5.5], [6, -24, 6.5], [22, -8, 4.5]] as const) inlay(g, x, y, r, '#fbf7ea', 1.2)
  } },
  // A beetle on its back, legs in the air. The second frame has the legs the other way, for the paddling.
  sleeper: { box: BOX, paint: (g, grain) => { beetle(g, grain, true, 0.35) } },
  sleeperB: { box: BOX, paint: (g, grain) => { beetle(g, grain, true, -0.35) } },
  tadpole: { box: BOX, paint: (g) => {
    tube(g, stroke([-40, 8, -26, -6, -12, 6, 4, 0]), 6, '#3f4d63', 2)
    inlay(g, 16, 0, 17, '#3f4d63', 2.2)
    eyes(g, 22, -3, 10, 2.6)
    inlay(g, 17, -4, 1.2, '#fbf7ea', 0)
    inlay(g, 27, -4, 1.2, '#fbf7ea', 0)
  } },
  skater: { box: BOX, paint: (g) => {
    // Four legs, each from its own place along the body, each with a knee, each ending in a dimple on the water. None crosses another, and no two are the same.
    engrave(g, (h) => { for (const [fx, fy, kx, ky, x, y] of SKATER_LEGS) { h.moveTo(fx, fy); h.lineTo(kx, ky); h.lineTo(x, y); h.moveTo(x + 9, y + 2); h.ellipse(x, y + 2, 9, 4, 0, 0, TAU) } }, 2, 0.9)
    tube(g, stroke([-16, 0, 16, 0]), 9, '#5b6b4a', 2)
    eyes(g, 15, 0, 6, 1.8)
  } },
  leafboat: { box: BOX, paint: (g, grain) => {
    cut(g, blob([-40, 0, -14, -20, 40, -4, 14, 20]), WOOD.birch, [-42, -22, 42, 22], small(grain, 27, '#d8432c', 0.88))
    engrave(g, (h) => { stroke([-38, 0, 0, -2, 38, -4])(h); stroke([-10, -2, -4, -14])(h); stroke([8, -2, 4, 12])(h) }, 1.6, 0.8)
    tube(g, stroke([-38, 0, -48, 6]), 3, WOOD.walnut.fill, 0)
  } },
  bubble: { box: BOX, paint: (g) => {
    g.beginPath()
    g.arc(0, 0, 24, 0, TAU)
    g.fillStyle = 'rgba(220, 240, 252, 0.9)'
    g.fill()
    g.strokeStyle = '#3f6f93'
    g.lineWidth = 2.6
    g.stroke()
    g.strokeStyle = 'rgba(255, 255, 255, 0.95)'
    g.lineWidth = 4
    g.lineCap = 'round'
    g.beginPath()
    g.arc(0, 0, 15, 3.6, 4.6)
    g.stroke()
  } },
  // The apple's leaf, a piece of its own drawn about where it joins the stalk, so that it can flap.
  appleLeaf: { box: [-6, -18, 36, 12], paint: (g, grain) => {
    cut(g, blob([0, 0, 18, -12, 30, 0, 14, 6]), WOOD.birch, [-2, -14, 32, 8], { grain, gap: 2, seed: 13, stain: '#4aa650', wash: 0.84, edge: 2 })
  } },
  caterpillar: { box: BOX, paint: (g) => {
    tube(g, stroke([-34, 14, -22, -4, -8, 14, 6, -4, 20, 14, 30, 6]), 15, '#86c540')
    engrave(g, (h) => { for (const x of [-22, -8, 6, 20]) { h.moveTo(x - 4, 0); h.lineTo(x + 4, 10) } }, 1.5, 0.6)
    inlay(g, 34, 2, 11, '#6fae32', 2)
    eyes(g, 37, 0, 8, 2.4)
  } },
  beetle: { box: BOX, paint: (g, grain) => { beetle(g, grain, false, 0.3) } },
  moth: { box: BOX, paint: (g, grain) => {
    cut(g, poly([0, -4, -40, -30, -44, 8, -14, 14]), WOOD.board, [-46, -32, 2, 16], small(grain, 31, '#e9dcc0', 0.5))
    cut(g, poly([0, -4, 40, -30, 44, 8, 14, 14]), WOOD.board, [-2, -32, 46, 16], small(grain, 33, '#e9dcc0', 0.5))
    inlay(g, -26, -8, 6, '#b9774a', 1.2)
    inlay(g, 26, -8, 6, '#b9774a', 1.2)
    tube(g, stroke([0, -14, 0, 22]), 9, '#b99a6c', 2)
    engrave(g, (h) => { stroke([-2, -16, -10, -30])(h); stroke([2, -16, 10, -30])(h) }, 1.6, 0.9)
    eyes(g, 0, -10, 6, 1.8)
  } },
  // The woodlouse that moves in where a thing was carried off: grey plates, feelers, a row of small legs.
  woodlouse: { box: BOX, paint: (g, grain) => {
    engrave(g, (h) => { for (const x of [-22, -12, -2, 8, 18]) { h.moveTo(x, 14); h.lineTo(x - 3, 26) } stroke([26, -2, 38, -12])(h); stroke([28, 4, 42, 2])(h) }, 2, 0.9)
    cut(g, blob([-34, 16, -30, -10, -6, -24, 20, -18, 34, 2, 30, 16]), WOOD.maple, [-36, -26, 36, 18], small(grain, 37, '#7d8792', 0.86))
    engrave(g, (h) => { for (const x of [-20, -8, 4, 16]) stroke([x - 4, 14, x, -8 - (x < 10 ? 8 : 0), x + 2, -16])(h) }, 1.5, 0.8)
    eyes(g, 27, 2, 5, 1.8)
  } },
  woodlouseBall: { box: BOX, paint: (g, grain) => {
    cut(g, disc(0, 0, 24), WOOD.maple, [-24, -24, 24, 24], small(grain, 37, '#7d8792', 0.86))
    engrave(g, (h) => { for (let i = 0; i < 6; i++) { const a = i * 1.05; h.moveTo(Math.cos(a) * 6, Math.sin(a) * 6); h.lineTo(Math.cos(a + 0.4) * 22, Math.sin(a + 0.4) * 22) } }, 1.5, 0.8)
  } },
  // The hole the snail has eaten in the apple, drawn over it.
  bite: { box: [-20, -20, 20, 20], paint: (g) => {
    g.beginPath()
    blob([-12, -4, -4, -12, 8, -8, 12, 4, 2, 12, -10, 8])(g)
    g.fillStyle = '#f6e7b8'
    g.fill()
    g.strokeStyle = SCORCH
    g.lineWidth = 1.8
    g.stroke()
    inlay(g, 1, 1, 3.4, '#5a3418', 0)
  } },
} satisfies Record<string, FindArt>

export type FindArtKey = keyof typeof FIND_ART

/** The pond skater's four legs: where each leaves the body, its knee, and its foot. */
export const SKATER_LEGS: readonly (readonly [number, number, number, number, number, number])[] = [
  [10, -4, 18, -24, 40, -18], [12, 4, 22, 22, 40, 26], [-8, -4, -14, -22, -34, -30], [-12, 4, -20, 20, -42, 14],
]

function beetle(g: G, grain: boolean, onItsBack: boolean, legs: number): void {
  engrave(g, (h) => {
    for (const x of [-16, 0, 16]) for (const side of [-1, 1]) {
      const reach = onItsBack ? 30 : 34, lean = onItsBack ? legs * side * 14 : legs * 12
      h.moveTo(x, side * 14)
      h.lineTo(x + lean, side * reach)
    }
    h.moveTo(26, -6); h.lineTo(40, -16); h.moveTo(26, 6); h.lineTo(40, 16)
  }, 2.4, 0.95)
  cut(g, oval(-2, 0, 30, 21), WOOD.walnut, [-32, -21, 28, 21], { grain, gap: 4, seed: 35, stain: onItsBack ? '#6b5a48' : '#4f86d8', wash: 0.8, edge: 2.4 })
  inlay(g, 28, 0, 10, SCORCH, 0)
  if (onItsBack) engrave(g, (h) => { for (const x of [-18, -6, 6, 18]) { h.moveTo(x, -16); h.lineTo(x, 16) } }, 1.4, 0.7)
  else engrave(g, (h) => { h.moveTo(-32, 0); h.lineTo(24, 0) }, 1.8, 0.9)
  inlay(g, 32, -4, 2, '#fbf7ea', 0)
  inlay(g, 32, 4, 2, '#fbf7ea', 0)
}
