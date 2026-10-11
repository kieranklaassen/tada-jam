import { CELL, type Tool } from './layout'
import { CHARCOAL, CHARCOAL_PALE, CLAY, DARK, RED, RED_DEEP, RED_PALE, YELLOW, YELLOW_DEEP, blob, charcoal, fingerDots, oval, patch, trail, type Paint, type Pigments, type Pt, type Sprite } from './pigment'
import { makeRng } from './rng'
import { DWELLER_SIZE, GEM_R, TOOL_SIZE } from './shapes'
import { paintBeastHead, paintHandSpray } from './wall'
import type { Colour, DwellerKind, Kind } from './world'

// Every picture that is stamped: the blocks of the hill, the gems, the
// tools, and the parts of the mole, the mammoth, the lift and the dwellers,
// each drawn once in pigment at the surface's own density. The view moves
// the parts; nothing here moves.

/** How many different pictures there are of each kind of block. */
export const VARIANTS = 3
/** A block's picture is this much larger than its block on every side, so its rubbed edge has room. */
export const BLOCK_PAD = 5

/** The colours beyond the four pigments: a gem's three, the light they mix to, water, gas, green earth and azurite for what lives in the light. */
export const GEM: Record<Colour, { core: string; deep: string; pale: string }> = {
  red: { core: '#e8452c', deep: '#8f1d14', pale: '#ffb49c' },
  green: { core: '#57c44a', deep: '#1f6b25', pale: '#c6f5a8' },
  blue: { core: '#4a8df0', deep: '#1c3f96', pale: '#b9d8ff' },
}
/** The light on a dug block, by the colours that reach it: bit 1 red, bit 2 green, bit 4 blue. */
export const LIGHT: readonly (string | null)[] = [null, '216, 58, 40', '70, 190, 70', '236, 208, 62', '66, 118, 236', '214, 76, 208', '70, 206, 214', '240, 238, 226']
export const WATER = '#8fb6bd'
export const WATER_DEEP = '#4f7f8c'
export const GAS = '#c9c680'
export const GREEN = '#718c3c'
export const GREEN_DEEP = '#48632a'
export const AZURE = '#5d93b5'
const BAT = '#7d6a5b'
const BAT_WING = '#93806f'
const BAT_FACE = '#c4a57c'

function paintBlock(g: Paint, kind: Kind, variant: number, hits: number): void {
  const rng = makeRng(0x7001 + variant * 97 + (kind === 'earth' ? 1 : kind === 'sandstone' ? 2 : kind === 'open' ? 4 : kind === 'water' || kind === 'spout' ? 5 : kind === 'gas' ? 6 : 3) * 13)
  const S = CELL
  if (kind === 'open') {
    g.fillStyle = DARK
    blob(g, patch(rng, -4, -4, S + 8, S + 8, 3))
    g.fill()
    // The marks the pick left in the back wall: short strokes, all leaning one way.
    for (let i = 0; i < 9; i++) {
      const x = 8 + rng.next() * (S - 22), y = 8 + rng.next() * (S - 30), long = 7 + rng.next() * 9
      g.globalAlpha = 0.35 + rng.next() * 0.35
      charcoal(g, () => trail(g, [[x, y + long], [x + long * 0.35, y + long * 0.45], [x + long * 0.6, y]]), 2.2, '#4b3829')
    }
    g.globalAlpha = 1
    // The floor of a dug block: a little rubble left lying.
    g.fillStyle = '#35271d'
    for (let i = 0; i < 5; i++) {
      g.globalAlpha = 0.5 + rng.next() * 0.4
      g.beginPath()
      g.ellipse(8 + rng.next() * (S - 16), S - 5 - rng.next() * 5, 3 + rng.next() * 5, 2 + rng.next() * 2, 0, 0, Math.PI * 2)
      g.fill()
    }
    g.globalAlpha = 1
    return
  }
  const edge = patch(rng, 3, 3, S - 6, S - 6, 4.5)
  if (kind === 'earth') {
    const fill = g.createRadialGradient(S * 0.45, S * 0.42, 6, S * 0.5, S * 0.5, S * 0.75)
    fill.addColorStop(0, RED_PALE)
    fill.addColorStop(0.55, RED)
    fill.addColorStop(1, RED_DEEP)
    g.fillStyle = fill
    blob(g, edge)
    g.fill()
    g.globalAlpha = 0.6
    fingerDots(g, rng, RED_DEEP, 7, 12, 12, S - 24, S - 24, 3.8)
    g.globalAlpha = 0.5
    charcoal(g, () => trail(g, [[14 + rng.next() * 20, 20 + rng.next() * 40], [34 + rng.next() * 14, 30 + rng.next() * 30], [56 + rng.next() * 14, 22 + rng.next() * 44]]), 1.6, RED_DEEP)
    g.globalAlpha = 1
    return
  }
  if (kind === 'sandstone') {
    const fill = g.createLinearGradient(0, 0, 0, S)
    fill.addColorStop(0, '#e2ad49')
    fill.addColorStop(1, YELLOW)
    g.fillStyle = fill
    blob(g, edge)
    g.fill()
    // The layers it was laid down in.
    g.save()
    blob(g, edge)
    g.clip()
    for (let i = 0; i < 4; i++) {
      const y = 14 + i * 19 + rng.next() * 6
      g.globalAlpha = 0.5 + rng.next() * 0.3
      charcoal(g, () => trail(g, [[0, y], [S * 0.3, y + (rng.next() - 0.5) * 7], [S * 0.65, y + (rng.next() - 0.5) * 7], [S, y + (rng.next() - 0.5) * 5]]), 2.4, YELLOW_DEEP)
    }
    g.restore()
    g.globalAlpha = 1
    // What the pick has done to it so far.
    if (hits >= 1) charcoal(g, () => trail(g, [[S * 0.5, 6], [S * 0.42, S * 0.22], [S * 0.56, S * 0.36], [S * 0.46, S * 0.52]]), 3)
    if (hits >= 2) {
      charcoal(g, () => trail(g, [[S * 0.46, S * 0.52], [S * 0.58, S * 0.68], [S * 0.48, S * 0.82], [S * 0.54, S - 6]]), 3)
      charcoal(g, () => trail(g, [[S * 0.56, S * 0.36], [S * 0.74, S * 0.44], [S - 7, S * 0.38]]), 2.4)
      charcoal(g, () => trail(g, [[S * 0.42, S * 0.22], [S * 0.24, S * 0.3], [8, S * 0.24]]), 2.4)
    }
    return
  }
  if (kind === 'water' || kind === 'spout') {
    // A water pocket: earth gone dark and damp, with a seam the water sweats out of.
    g.fillStyle = '#6a3423'
    blob(g, edge)
    g.fill()
    g.globalAlpha = 0.55
    fingerDots(g, rng, RED_DEEP, 6, 12, 12, S - 24, S - 24, 4.2)
    // The damp it sweats: a stain that spreads down from one corner.
    g.globalAlpha = 0.5
    g.fillStyle = WATER_DEEP
    blob(g, [[10, S * 0.2], [S * 0.5, S * 0.14], [S - 12, S * 0.3], [S * 0.8, S * 0.5], [S * 0.5, S * 0.42], [S * 0.3, S * 0.62], [12, S * 0.5]])
    g.fill()
    g.globalAlpha = 1
    // Two beads of water hanging from it, a big one and a small one.
    for (const [x, y, r] of [[S * 0.3, S * 0.7, 7.5], [S * 0.68, S * 0.56, 4.5]] as const) {
      g.fillStyle = WATER
      blob(g, [[x, y - r * 1.5], [x + r, y + r * 0.2], [x, y + r], [x - r, y + r * 0.2]])
      g.fill()
      g.fillStyle = CLAY
      g.beginPath()
      g.arc(x - r * 0.3, y, r * 0.28, 0, Math.PI * 2)
      g.fill()
    }
    if (kind === 'spout') {
      // The hole the wedge made, low in its face, and the wet it has left under it.
      g.fillStyle = DARK
      blob(g, oval(rng, S * 0.5, S - 16, 8, 6, 0.1))
      g.fill()
      g.fillStyle = WATER
      blob(g, [[S * 0.5 - 4, S - 14], [S * 0.5 + 4, S - 14], [S * 0.5 + 2, S - 2], [S * 0.5 - 2, S - 2]])
      g.fill()
    }
    return
  }
  if (kind === 'gas') {
    // A gas pocket: pale and stained, with a crack that breathes.
    g.fillStyle = '#a79a62'
    blob(g, edge)
    g.fill()
    g.fillStyle = GAS
    for (const [x, y, r] of [[S * 0.3, S * 0.3, 9], [S * 0.62, S * 0.26, 6], [S * 0.72, S * 0.6, 11], [S * 0.36, S * 0.7, 7], [S * 0.5, S * 0.5, 4.5]] as const) {
      g.globalAlpha = 0.85
      blob(g, oval(rng, x, y, r, r * 0.9, 0.16))
      g.fill()
    }
    g.globalAlpha = 1
    // The split it breathes through: a dark slit, wide at one end.
    const slit: Pt[] = [[S * 0.2, S * 0.56], [S * 0.36, S * 0.47], [S * 0.6, S * 0.42], [S * 0.82, S * 0.4], [S * 0.64, S * 0.52], [S * 0.4, S * 0.6]]
    g.fillStyle = DARK
    blob(g, slit)
    g.fill()
    charcoal(g, () => blob(g, slit), 1.8)
    return
  }
  // Granite: charcoal rubbed on thick, with white clay blown over it in specks. A loose boulder is the same
  // rock, round and a little smaller, with the dark showing round it.
  const loose = kind === 'boulder'
  if (loose) {
    g.fillStyle = DARK
    blob(g, patch(rng, -3, -3, S + 6, S + 6, 3))
    g.fill()
  }
  const lump = loose ? oval(rng, S / 2, S / 2 + 3, S / 2 - 6, S / 2 - 8, 0.12, 14) : edge
  g.fillStyle = '#392e27'
  blob(g, lump)
  g.fill()
  g.save()
  blob(g, lump)
  g.clip()
  g.fillStyle = CHARCOAL_PALE
  for (let i = 0; i < 6; i++) {
    g.globalAlpha = 0.5
    g.beginPath()
    g.ellipse(14 + rng.next() * (S - 28), 14 + rng.next() * (S - 28), 6 + rng.next() * 9, 4 + rng.next() * 6, rng.next() * 3, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 0.85
  fingerDots(g, rng, CLAY, 34, 8, 8, S - 16, S - 16, 1.25)
  g.restore()
  g.globalAlpha = 0.5
  if (!loose) charcoal(g, () => trail(g, [[9, S * 0.5], [10, 12], [S * 0.55, 8]]), 2, CLAY)
  g.globalAlpha = 0.9
  // What the mallet has done to it so far: cracks in clay, round its edge.
  if (hits >= 1 || loose) charcoal(g, () => trail(g, [[S * 0.5, 5], [S * 0.44, S * 0.2], [S * 0.56, S * 0.3]]), 2.6, CLAY)
  if (hits >= 2 || loose) {
    charcoal(g, () => trail(g, [[6, S * 0.6], [S * 0.2, S * 0.56], [S * 0.28, S * 0.68]]), 2.6, CLAY)
    charcoal(g, () => trail(g, [[S - 6, S * 0.4], [S * 0.8, S * 0.5], [S * 0.72, S * 0.44]]), 2.4, CLAY)
  }
  g.globalAlpha = 1
  if (loose) charcoal(g, () => blob(g, lump), 2.4, CLAY)
}

/** A gem, with its middle at the origin: cut with one flat table and a ring of facets. */
function paintGem(g: Paint, colour: Colour): void {
  const look = GEM[colour], R = GEM_R
  const rim: Pt[] = [[0, -R], [R * 0.86, -R * 0.42], [R * 0.86, R * 0.42], [0, R], [-R * 0.86, R * 0.42], [-R * 0.86, -R * 0.42]]
  g.fillStyle = look.core
  g.beginPath()
  rim.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.closePath()
  g.fill()
  // The lower facets are deeper, the table paler.
  g.fillStyle = look.deep
  g.beginPath()
  g.moveTo(-R * 0.86, R * 0.42)
  g.lineTo(0, R)
  g.lineTo(R * 0.86, R * 0.42)
  g.lineTo(R * 0.42, R * 0.2)
  g.lineTo(-R * 0.42, R * 0.2)
  g.closePath()
  g.fill()
  g.fillStyle = look.pale
  g.beginPath()
  g.moveTo(-R * 0.42, -R * 0.5)
  g.lineTo(R * 0.3, -R * 0.5)
  g.lineTo(R * 0.42, R * 0.2)
  g.lineTo(-R * 0.42, R * 0.2)
  g.closePath()
  g.globalAlpha = 0.7
  g.fill()
  g.globalAlpha = 1
  g.strokeStyle = CHARCOAL
  g.lineWidth = 1.6
  g.lineJoin = 'round'
  g.beginPath()
  rim.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
  g.closePath()
  g.stroke()
}

export type Figures = {
  block(kind: Kind, variant: number, hits: number): Sprite
  gem: Record<Colour, Sprite>
  /** A gem's own shine round it, added over what is behind. */
  shine: Record<Colour, Sprite>
  /** The flash of a gem that is knocked or struck free: one soft round bloom of its colour, added over what is behind. */
  bloom: Record<Colour, Sprite>
  tool: Record<Tool, Sprite>
  mole: { body: Sprite; sooty: Sprite; hat: Sprite; ear: Sprite; paw: Sprite; foot: Sprite; pick: Sprite }
  mammoth: { body: Sprite; leg: Sprite; head: Sprite; ear: Sprite; trunk: Sprite; bristle: Sprite }
  lift: { back: Sprite; front: Sprite; door: Sprite; crank: Sprite }
  dweller: Record<DwellerKind, Sprite[]>
  beast: Sprite[]
  worm: Sprite
  puff: Sprite
  wisp: Sprite
  print: Sprite
  halo: Sprite
  hand: Sprite
  glow: Sprite
}

/** The mole, facing right, with his feet at the origin. He stands as tall as a block allows. */
function moleParts(p: Pigments): Figures['mole'] {
  const rng = makeRng(0x3013)
  const shape: Pt[] = [[-29, -10], [-32, -28], [-27, -46], [-15, -58], [1, -62], [15, -58], [25, -51], [37, -48], [43, -42], [37, -36], [27, -33], [31, -20], [27, -8], [12, -2], [-13, -2]]
  const body = (sooty: boolean) => (g: Paint): void => {
    // A round body that runs straight into a snout: a mole has no neck.
    const fill = g.createRadialGradient(-2, -40, 6, -2, -30, 46)
    if (sooty) { fill.addColorStop(0, '#5a4c41'); fill.addColorStop(0.7, '#3a2f28'); fill.addColorStop(1, '#231a15') }
    else { fill.addColorStop(0, '#fbf5e6'); fill.addColorStop(0.7, CLAY); fill.addColorStop(1, '#cdbf9f') }
    g.fillStyle = fill
    blob(g, shape)
    g.fill()
    if (sooty) {
      // Soot: smudges of charcoal, and the clay showing where his paws have rubbed.
      g.save()
      blob(g, shape)
      g.clip()
      g.globalAlpha = 0.5
      fingerDots(g, rng, CHARCOAL, 12, -30, -58, 60, 56, 5)
      g.globalAlpha = 0.5
      fingerDots(g, rng, CLAY, 5, -20, -34, 40, 28, 2.6)
      g.restore()
      g.globalAlpha = 1
    } else {
      // A paler belly.
      g.globalAlpha = 0.6
      g.fillStyle = '#fffaf0'
      blob(g, oval(rng, 2, -22, 17, 16, 0.08))
      g.fill()
      g.globalAlpha = 1
    }
    charcoal(g, () => blob(g, shape), 2.6, sooty ? CLAY : CHARCOAL)
    // A stub of a tail.
    charcoal(g, () => trail(g, [[-29, -12], [-36, -9], [-39, -14]]), 3, sooty ? CLAY : CHARCOAL)
    // The nose: the one red thing on him.
    g.fillStyle = RED_PALE
    blob(g, oval(rng, 42, -42, 7.5, 6.5, 0.1))
    g.fill()
    charcoal(g, () => blob(g, oval(null, 42, -42, 7.5, 6.5)), 2)
    g.fillStyle = CLAY
    g.beginPath()
    g.arc(40, -45, 1.9, 0, Math.PI * 2)
    g.fill()
    // Whiskers.
    g.globalAlpha = 0.7
    charcoal(g, () => trail(g, [[32, -38], [27, -32], [23, -30]]), 1.2, sooty ? CLAY : CHARCOAL)
    charcoal(g, () => trail(g, [[33, -36], [31, -29], [28, -25]]), 1.2, sooty ? CLAY : CHARCOAL)
    g.globalAlpha = 1
  }
  const hat = p.sprite(46, 40, 23, 30, (g) => {
    // A hard hat with a brim, and a candle stub stuck on the front of it.
    g.fillStyle = CLAY
    g.fillRect(6, -22, 6, 9)
    charcoal(g, () => { g.beginPath(); g.rect(6, -22, 6, 9) }, 1.6)
    g.fillStyle = YELLOW
    const dome: Pt[] = [[-18, 0], [-17, -9], [-9, -14], [3, -15], [13, -11], [17, -4], [21, 0], [17, 4], [-16, 4]]
    blob(g, dome)
    g.fill()
    charcoal(g, () => blob(g, dome), 2.4)
    charcoal(g, () => trail(g, [[-15, -2], [0, -4], [16, -2]]), 1.6, YELLOW_DEEP)
  }, 0.14)
  // An ear: small and round, turning about its root at the origin. It lies flat when he is cross.
  const ear = p.sprite(20, 22, 10, 18, (g) => {
    const lobe: Pt[] = [[-5, 0], [-7, -9], [-2, -15], [5, -12], [6, -3], [3, 1]]
    g.fillStyle = RED_PALE
    blob(g, lobe)
    g.fill()
    charcoal(g, () => blob(g, lobe), 1.8)
  }, 0.12)
  const paw = p.sprite(30, 26, 12, 13, (g) => {
    g.fillStyle = RED_PALE
    blob(g, oval(rng, 0, 0, 10, 8, 0.1))
    g.fill()
    charcoal(g, () => blob(g, oval(null, 0, 0, 10, 8)), 2)
    for (const a of [-0.5, 0, 0.5]) charcoal(g, () => { g.beginPath(); g.moveTo(Math.cos(a) * 9, Math.sin(a) * 7); g.lineTo(Math.cos(a) * 16, Math.sin(a) * 11) }, 2.4, CLAY)
  }, 0.14)
  const foot = p.sprite(28, 16, 14, 10, (g) => {
    g.fillStyle = RED_PALE
    blob(g, oval(rng, 0, 0, 11, 5.5, 0.1))
    g.fill()
    charcoal(g, () => blob(g, oval(null, 0, 0, 11, 5.5)), 2)
  }, 0.14)
  const pick = p.sprite(70, 50, 8, 25, (g) => {
    // Held at the origin, the handle lies along x and the head stands across its far end.
    charcoal(g, () => { g.beginPath(); g.moveTo(-4, 0); g.lineTo(50, 0) }, 5, '#4a3324')
    const head: Pt[] = [[44, -21], [53, -10], [57, 0], [53, 10], [44, 21], [49, 9], [50, 0], [49, -9]]
    g.fillStyle = CLAY
    blob(g, head)
    g.fill()
    charcoal(g, () => blob(g, head), 2)
  }, 0.12)
  return { body: p.sprite(92, 72, 44, 68, body(false), 0.16), sooty: p.sprite(92, 72, 44, 68, body(true), 0.1), hat, ear, paw, foot, pick }
}

/** The three tools. In a paw each is held at the origin; lying, the view stands each on the ground. */
function toolParts(p: Pigments): Figures['tool'] {
  // The wedge: a thick end at the origin and a point along x.
  const wedge = p.sprite(TOOL_SIZE.wedge.h + 4, 30, 4, 15, (g) => {
    const shape: Pt[] = [[5, -8], [5, 8], [38, 1], [38, -1]]
    g.fillStyle = CHARCOAL_PALE
    g.beginPath()
    shape.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.closePath()
    g.fill()
    g.fillStyle = CHARCOAL
    g.beginPath()
    g.moveTo(5, 8)
    g.lineTo(38, 1)
    g.lineTo(12, 2)
    g.closePath()
    g.globalAlpha = 0.6
    g.fill()
    g.globalAlpha = 1
    charcoal(g, () => { g.beginPath(); shape.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath() }, 2.2)
    // The butt, of wood, spread wide by the mallet.
    const butt: Pt[] = [[-2, -12], [6, -10], [7, 10], [-2, 12], [-3, 0]]
    g.fillStyle = YELLOW
    blob(g, butt)
    g.fill()
    charcoal(g, () => blob(g, butt), 2)
  }, 0.1)
  // The bucket: hung by the top of its handle at the origin.
  const bucket = p.sprite(TOOL_SIZE.bucket.w + 2, TOOL_SIZE.bucket.h + 2, (TOOL_SIZE.bucket.w + 2) / 2, 1, (g) => {
    charcoal(g, () => trail(g, [[-17, 16], [-12, 4], [0, 1], [12, 4], [17, 16]]), 2.6)
    const tub: Pt[] = [[-19, 14], [19, 14], [15, 44], [-15, 44]]
    g.fillStyle = YELLOW
    g.beginPath()
    tub.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.closePath()
    g.fill()
    // One hoop, low, and three staves of unequal length that stop above it: nothing crosses anything.
    g.globalAlpha = 0.7
    for (const [x, top, foot] of [[-10, 18, 31], [-1, 20, 27], [9, 17, 30]] as const) charcoal(g, () => { g.beginPath(); g.moveTo(x, top); g.lineTo(x * 0.92, foot) }, 1.4, YELLOW_DEEP)
    g.globalAlpha = 1
    charcoal(g, () => { g.beginPath(); g.moveTo(-17, 35); g.quadraticCurveTo(0, 38, 17, 35) }, 2.8, RED_DEEP)
    charcoal(g, () => { g.beginPath(); tub.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath() }, 2.4)
    g.fillStyle = DARK
    g.beginPath()
    g.ellipse(0, 14, 18, 4.5, 0, 0, Math.PI * 2)
    g.fill()
  }, 0.12)
  // The rope: a coil, with its middle on the ground at the origin and one end loose.
  const rope = p.sprite(TOOL_SIZE.rope.w + 2, TOOL_SIZE.rope.h + 2, (TOOL_SIZE.rope.w + 2) / 2, TOOL_SIZE.rope.h + 1, (g) => {
    // A heap: one thick strand that winds over itself, lopsided, and a frayed end that trails off it.
    const heap: Pt[] = [[-21, -4], [-22, -14], [-10, -22], [6, -18], [10, -27], [-2, -33], [-12, -28], [-4, -20], [14, -16], [22, -9], [14, -3], [-6, -2]]
    charcoal(g, () => trail(g, heap), 9.5)
    g.strokeStyle = YELLOW_DEEP
    g.lineCap = 'round'
    g.lineJoin = 'round'
    g.lineWidth = 6.5
    trail(g, heap)
    g.stroke()
    g.strokeStyle = '#e9c98a'
    g.lineWidth = 2
    trail(g, heap.slice(1, 6))
    g.stroke()
    charcoal(g, () => trail(g, [[14, -3], [23, -1], [24, -6]]), 4, YELLOW_DEEP)
  }, 0.1)
  return { wedge, bucket, rope }
}

/** The mammoth, facing left, with the grass under the middle of it at the origin. The view turns it to face the lift. */
function mammothParts(p: Pigments): Figures['mammoth'] {
  const rng = makeRng(0x4a44)
  const hair = (g: Paint, x0: number, x1: number, y: number, length: number, color: string): void => {
    g.strokeStyle = color
    g.lineCap = 'round'
    for (let x = x0; x < x1; x += 3.4 + rng.next() * 2.4) {
      g.globalAlpha = 0.55 + rng.next() * 0.4
      g.lineWidth = 1.6 + rng.next() * 1.6
      g.beginPath()
      g.moveTo(x, y - 6 + rng.next() * 6)
      g.quadraticCurveTo(x + (rng.next() - 0.5) * 6, y + length * 0.5, x + (rng.next() - 0.5) * 10 + 3, y + length * (0.6 + rng.next() * 0.5))
      g.stroke()
    }
    g.globalAlpha = 1
  }
  const legShape = (x: number): Pt[] => [[x - 17, -58], [x - 19, -20], [x - 20, -3], [x, 0], [x + 20, -3], [x + 18, -22], [x + 17, -58]]
  const toes = (g: Paint, x: number): void => {
    // Two nails, a wide one and a narrow one.
    for (const [dx, wide] of [[-9, 6.5], [6, 4]] as const) {
      g.fillStyle = CLAY
      g.beginPath()
      g.ellipse(x + dx, -4, wide, 5, 0, Math.PI, 0)
      g.fill()
    }
  }
  const back: Pt[] = [[-96, -74], [-92, -122], [-62, -156], [-22, -166], [18, -152], [62, -140], [104, -116], [124, -82], [120, -52], [96, -40], [40, -34], [-30, -34], [-78, -44]]
  const body = p.sprite(286, 190, 150, 178, (g) => {
    // The far legs first, darker.
    for (const x of [-36, 92]) {
      g.fillStyle = RED_DEEP
      blob(g, legShape(x))
      g.fill()
      toes(g, x)
    }
    // A high shoulder hump, a back that slopes to the tail, and a belly hung with hair.
    const fill = g.createRadialGradient(-10, -120, 10, 0, -90, 150)
    fill.addColorStop(0, RED_PALE)
    fill.addColorStop(0.5, RED)
    fill.addColorStop(1, RED_DEEP)
    g.fillStyle = fill
    blob(g, back)
    g.fill()
    charcoal(g, () => blob(g, back), 3.4)
    hair(g, -84, 122, -46, 26, RED_DEEP)
    hair(g, -70, 116, -44, 20, CHARCOAL)
    hair(g, -60, 100, -96, 22, RED_DEEP)
    hair(g, -40, 60, -134, 18, RED_DEEP)
  }, 0.3)
  // A near leg, apart, so that it can lift. Its top is at the origin. The fore leg and the hind leg are the same picture.
  const leg = p.sprite(50, 70, 25, 6, (g) => {
    g.translate(0, 58)
    g.fillStyle = RED
    blob(g, legShape(0))
    g.fill()
    charcoal(g, () => trail(g, [[-17, -50], [-19, -20], [-20, -3], [0, 0], [20, -3], [18, -22], [17, -50]]), 3)
    toes(g, 0)
    hair(g, -16, 16, -50, 16, RED_DEEP)
  }, 0.3)
  // The head, with the tusks, turning about the neck at the origin.
  const head = p.sprite(150, 170, 104, 96, (g) => {
    const shape: Pt[] = [[30, -14], [26, -52], [6, -84], [-22, -90], [-46, -72], [-56, -40], [-54, -8], [-40, 14], [-14, 26], [16, 18]]
    const fill = g.createRadialGradient(-14, -50, 6, -10, -30, 80)
    fill.addColorStop(0, RED_PALE)
    fill.addColorStop(0.6, RED)
    fill.addColorStop(1, RED_DEEP)
    g.fillStyle = fill
    blob(g, shape)
    g.fill()
    charcoal(g, () => blob(g, shape), 3.2)
    // A tuft on the crown and a fringe over the brow.
    hair(g, -26, 2, -80, -15, RED_DEEP)
    hair(g, -52, -10, -62, 14, RED_DEEP)
    hair(g, -44, 24, 12, 22, RED_DEEP)
    // Two tusks that sweep down, out and up again.
    for (const [dx, dy, wide] of [[6, 4, 8], [0, 0, 10]] as const) {
      const tusk: Pt[] = [[-30 + dx, 8 + dy], [-44 + dx, 38 + dy], [-66 + dx, 56 + dy], [-88 + dx, 48 + dy], [-96 + dx, 26 + dy]]
      charcoal(g, () => trail(g, tusk), wide + 3.4)
      g.strokeStyle = CLAY
      g.lineCap = 'round'
      g.lineWidth = wide
      trail(g, tusk)
      g.stroke()
    }
  }, 0.28)
  const ear = p.sprite(60, 76, 30, 14, (g) => {
    const shape: Pt[] = [[-12, -6], [10, -8], [22, 10], [20, 38], [6, 54], [-10, 46], [-18, 20]]
    g.fillStyle = RED_DEEP
    blob(g, shape)
    g.fill()
    charcoal(g, () => blob(g, shape), 2.8)
    hair(g, -12, 16, 44, 14, CHARCOAL)
  }, 0.3)
  // One ring of the trunk: the view strings a row of them along a curve.
  const trunk = p.sprite(34, 34, 17, 17, (g) => {
    g.fillStyle = RED
    blob(g, oval(rng, 0, 0, 13, 13, 0.08))
    g.fill()
    charcoal(g, () => blob(g, oval(null, 0, 0, 13, 13)), 2.4)
  }, 0.26)
  // Its fur on end: spikes all along the back, laid over the body for as long as the fright lasts.
  const bristle = p.sprite(286, 190, 150, 178, (g) => {
    g.strokeStyle = RED_DEEP
    g.lineCap = 'round'
    for (let i = 0; i < back.length - 5; i++) {
      const [ax, ay] = back[i], [bx, by] = back[i + 1]
      for (let k = 0; k < 5; k++) {
        const t = (k + rng.next() * 0.6) / 5
        const x = ax + (bx - ax) * t, y = ay + (by - ay) * t
        // Each spike points away from the middle of the body.
        const far = Math.hypot(x - 10, y + 90) || 1
        g.lineWidth = 2 + rng.next() * 1.6
        g.beginPath()
        g.moveTo(x, y)
        g.lineTo(x + ((x - 10) / far) * (14 + rng.next() * 10), y + ((y + 90) / far) * (14 + rng.next() * 10))
        g.stroke()
      }
    }
  }, 0.1)
  return { body, leg, head, ear, trunk, bristle }
}

/** The lift's cage and its crank. The cage's floor is at the origin; the crank turns about its axle at the origin. */
function liftParts(p: Pigments): Figures['lift'] {
  const W = 92, H = 96
  const weave = (g: Paint, x0: number, x1: number, y0: number, y1: number): void => {
    g.globalAlpha = 0.7
    for (let y = y0 + 4; y < y1; y += 8) charcoal(g, () => trail(g, [[x0, y], [x0 + (x1 - x0) * 0.33, y + 2], [x0 + (x1 - x0) * 0.66, y - 2], [x1, y]]), 1.6, YELLOW_DEEP)
    g.globalAlpha = 1
  }
  // Behind the mole: the back of the basket, dark inside, and its floor.
  const back = p.sprite(W + 8, H + 12, (W + 8) / 2, H + 4, (g) => {
    g.fillStyle = '#4a3324'
    g.fillRect(-W / 2 + 4, -H + 6, W - 8, H - 6)
    g.globalAlpha = 0.5
    // Wickerwork seen from inside: withies that wander across, none straight and no two alike.
    for (const [y, a, b] of [[-H + 16, 5, -4], [-H + 37, -6, 3], [-H + 52, 3, 7], [-H + 78, -3, -6]] as const) charcoal(g, () => trail(g, [[-W / 2 + 6, y], [-W / 6, y + a], [W / 6, y + b], [W / 2 - 6, y + a * 0.4]]), 1.6, YELLOW_DEEP)
    g.globalAlpha = 1
    g.fillStyle = YELLOW_DEEP
    g.fillRect(-W / 2, -2, W, 8)
    charcoal(g, () => { g.beginPath(); g.rect(-W / 2, -2, W, 8) }, 2.4)
  }, 0.18)
  // In front of him: the two side posts, the top bar and the hanger the rope is tied to.
  const front = p.sprite(W + 8, H + 26, (W + 8) / 2, H + 22, (g) => {
    g.fillStyle = YELLOW
    g.fillRect(-W / 2, -H, 9, H)
    g.fillRect(W / 2 - 9, -H, 9, H)
    g.fillRect(-W / 2, -H, W, 10)
    weave(g, -W / 2, -W / 2 + 9, -H, 0)
    weave(g, W / 2 - 9, W / 2, -H, 0)
    charcoal(g, () => { g.beginPath(); g.rect(-W / 2, -H, 9, H) }, 2.4)
    charcoal(g, () => { g.beginPath(); g.rect(W / 2 - 9, -H, 9, H) }, 2.4)
    charcoal(g, () => { g.beginPath(); g.rect(-W / 2, -H, W, 10) }, 2.4)
    charcoal(g, () => trail(g, [[-26, -H], [0, -H - 18], [26, -H]]), 3)
  }, 0.18)
  // The door: two woven bands, a wide one low and a narrow one high, so his face shows between them.
  const door = p.sprite(W, H, W / 2, H, (g) => {
    for (const [y0, y1] of [[-34, -3], [-H + 12, -H + 24]] as const) {
      g.fillStyle = YELLOW
      g.fillRect(-W / 2 + 9, y0, W - 18, y1 - y0)
      weave(g, -W / 2 + 9, W / 2 - 9, y0, y1)
      charcoal(g, () => { g.beginPath(); g.rect(-W / 2 + 9, y0, W - 18, y1 - y0) }, 2)
    }
  }, 0.18)
  // The crank: an arm from the axle to a knob of white clay.
  const crank = p.sprite(36, 36, 18, 18, (g) => {
    charcoal(g, () => { g.beginPath(); g.moveTo(0, 0); g.lineTo(-10, 0) }, 5)
    g.fillStyle = CLAY
    blob(g, oval(null, -10, 0, 6, 6))
    g.fill()
    charcoal(g, () => blob(g, oval(null, -10, 0, 6, 6)), 2)
    g.fillStyle = CHARCOAL
    g.beginPath()
    g.arc(0, 0, 3.4, 0, Math.PI * 2)
    g.fill()
  }, 0.1)
  return { back, front, door, crank }
}

/**
 * The dwellers, each kind in its own pictures. One that hangs has the roof at the origin, one that stands has the
 * floor there, and one that flies has its middle there. Each fits the size `shapes.ts` gives its kind.
 */
function dwellerParts(p: Pigments): Figures['dweller'] {
  const rng = makeRng(0xd3e1)
  const size = DWELLER_SIZE
  const roof = (kind: DwellerKind, paint: (g: Paint) => void, wear = 0.12, extra = 0): Sprite => p.sprite(size[kind].w + 6 + extra * 2, size[kind].h + 6, (size[kind].w + 6) / 2 + extra, 2, paint, wear)
  const floor = (kind: DwellerKind, paint: (g: Paint) => void, wear = 0.12): Sprite => p.sprite(size[kind].w + 6, size[kind].h + 6, (size[kind].w + 6) / 2, size[kind].h + 3, paint, wear)
  const air = (kind: DwellerKind, paint: (g: Paint) => void, wear = 0.1): Sprite => p.sprite(size[kind].w + 6, size[kind].h + 6, (size[kind].w + 6) / 2, (size[kind].h + 6) / 2, paint, wear)
  const eye = (g: Paint, x: number, y: number, r: number, look = 0.3): void => {
    g.fillStyle = CLAY
    g.beginPath()
    g.arc(x, y, r, 0, Math.PI * 2)
    g.fill()
    g.fillStyle = CHARCOAL
    g.beginPath()
    g.arc(x + look * r * 0.5, y + r * 0.2, r * 0.48, 0, Math.PI * 2)
    g.fill()
  }

  // A bat at rest: it hangs by its feet, wrapped in wings whose finger bones show, with its fox face at the
  // bottom and its two big ears pointing down past it.
  const hanging = (eyes: 'shut' | 'open', wing: boolean) => (g: Paint): void => {
    if (wing) {
      const span: Pt[] = [[8, 10], [32, 6], [44, 22], [37, 27], [31, 21], [26, 31], [19, 23], [11, 30]]
      g.fillStyle = BAT_WING
      blob(g, span)
      g.fill()
      g.globalAlpha = 0.75
      charcoal(g, () => blob(g, span), 1.6, CLAY)
      g.globalAlpha = 1
    }
    // Two feet hooked into the roof.
    charcoal(g, () => trail(g, [[-4, 0], [-4, 6], [-2, 8]]), 2.2, CLAY)
    charcoal(g, () => trail(g, [[4, 0], [4, 6], [2, 8]]), 2.2, CLAY)
    // The folded wings: a long shape with an elbow sticking out at each side and a point at the bottom of each.
    const wings: Pt[] = [[-4, 6], [4, 6], [12, 12], [20, 20], [15, 28], [16, 40], [9, 44], [0, 40], [-9, 44], [-16, 40], [-15, 28], [-20, 20], [-12, 12]]
    g.fillStyle = BAT_WING
    g.beginPath()
    wings.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
    g.closePath()
    g.fill()
    g.globalAlpha = 0.8
    charcoal(g, () => { g.beginPath(); wings.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y))); g.closePath() }, 1.6, CLAY)
    g.globalAlpha = 0.75
    // Finger bones, fanning from each elbow, and the fold down the front.
    for (const side of [-1, 1]) {
      charcoal(g, () => trail(g, [[side * 19, 20], [side * 10, 30], [side * 9, 43]]), 1.3, CHARCOAL)
      charcoal(g, () => trail(g, [[side * 19, 20], [side * 5, 26], [side * 2, 38]]), 1.3, CHARCOAL)
    }
    g.globalAlpha = 1
    // The ears, which point down since it hangs: big, with a pale inside.
    for (const side of [-1, 1]) {
      const ear: Pt[] = [[side * 3, 50], [side * 13, 46], [side * 17, 66], [side * 8, 58]]
      g.fillStyle = BAT
      g.beginPath()
      ear.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)))
      g.closePath()
      g.fill()
      g.fillStyle = RED_PALE
      g.beginPath()
      g.moveTo(side * 7, 51)
      g.lineTo(side * 12, 49)
      g.lineTo(side * 14, 61)
      g.closePath()
      g.fill()
    }
    // The face: a round head, paler than the wings, with a dark snout.
    g.fillStyle = BAT_FACE
    blob(g, oval(null, 0, 46, 11, 10))
    g.fill()
    g.globalAlpha = 0.8
    charcoal(g, () => blob(g, oval(null, 0, 46, 11, 10)), 1.5)
    g.globalAlpha = 1
    g.fillStyle = CHARCOAL
    blob(g, oval(null, 0, 52, 3.4, 2.6))
    g.fill()
    if (eyes === 'open') { eye(g, -5, 45, 4.4, -0.4); eye(g, 5, 45, 4.4, 0.4) }
    else {
      g.strokeStyle = CHARCOAL
      g.lineWidth = 1.8
      g.lineCap = 'round'
      for (const side of [-1, 1]) {
        g.beginPath()
        g.arc(side * 5, 44, 3.2, 0.25, Math.PI - 0.25)
        g.stroke()
      }
    }
    // Two fangs.
    g.fillStyle = CLAY
    for (const side of [-1, 1]) {
      g.beginPath()
      g.moveTo(side * 0.8, 53)
      g.lineTo(side * 3, 53)
      g.lineTo(side * 1.9, 49.5)
      g.fill()
    }
  }
  const flying = (lift: number) => (g: Paint): void => {
    g.translate(0, 30)
    for (const side of [-1, 1]) {
      const wing: Pt[] = [[side * 4, -2], [side * 20, -8 - lift * 16], [side * 38, -4 - lift * 20], [side * 34, 6 - lift * 6], [side * 26, 2 - lift * 4], [side * 20, 12 - lift * 2], [side * 12, 6], [side * 6, 12]]
      g.fillStyle = BAT_WING
      blob(g, wing)
      g.fill()
      g.globalAlpha = 0.75
      charcoal(g, () => blob(g, wing), 1.6, CLAY)
      g.globalAlpha = 1
    }
    for (const side of [-1, 1]) {
      g.fillStyle = BAT
      g.beginPath()
      g.moveTo(side * 3, -8)
      g.lineTo(side * 13, -10)
      g.lineTo(side * 12, -26)
      g.closePath()
      g.fill()
    }
    g.fillStyle = BAT_FACE
    blob(g, oval(null, 0, 0, 11, 12))
    g.fill()
    eye(g, -4.6, -3, 4.2, -0.3)
    eye(g, 4.6, -3, 4.2, 0.3)
    // A mouth open in a squeak.
    g.fillStyle = RED_DEEP
    g.beginPath()
    g.ellipse(0, 6, 3, 3.6, 0, 0, Math.PI * 2)
    g.fill()
  }
  const bat = [roof('bat', hanging('shut', false)), roof('bat', hanging('open', false)), roof('bat', hanging('open', true), 0.12, 24), roof('bat', flying(1), 0.12, 24), roof('bat', flying(-0.7), 0.12, 24)]

  // A long low animal seen from the side, for the newt and the lizard.
  const crawler = (fill: string, line: string, spots: string | null, crest: boolean) => (g: Paint): void => {
    const body: Pt[] = [[-28, -6], [-16, -11], [0, -13], [14, -12], [24, -15], [30, -10], [27, -4], [16, -3], [0, -3], [-14, -3]]
    charcoal(g, () => trail(g, [[-14, -4], [-18, 0], [-23, -1]]), 2.6, line)
    charcoal(g, () => trail(g, [[12, -4], [16, 0], [22, -1]]), 2.6, line)
    g.fillStyle = fill
    blob(g, body)
    g.fill()
    charcoal(g, () => blob(g, body), 1.8, line)
    if (spots) { g.globalAlpha = 0.8; fingerDots(g, rng, spots, 6, -18, -11, 34, 5, 1.5); g.globalAlpha = 1 }
    if (crest) charcoal(g, () => trail(g, [[-14, -12], [-8, -17], [-2, -14], [4, -18], [10, -14]]), 1.8, line)
    eye(g, 23, -11, 2.8, 0.5)
  }
  const newt = [floor('newt', crawler('#eadfc8', CHARCOAL_PALE, RED_PALE, false))]
  const lizard = [floor('lizard', crawler(RED, CHARCOAL, YELLOW, true))]

  const mushroom = [floor('mushroom', (g) => {
    // Two, a tall one and a small one, with caps of red ochre dotted in clay.
    for (const [x, tall, wide] of [[-6, 34, 17], [13, 18, 10]] as const) {
      g.fillStyle = CLAY
      blob(g, [[x - 4, 0], [x - 3, -tall + 6], [x + 3, -tall + 6], [x + 4, 0]])
      g.fill()
      charcoal(g, () => trail(g, [[x - 4, 0], [x - 3, -tall + 6]]), 1.4)
      charcoal(g, () => trail(g, [[x + 4, 0], [x + 3, -tall + 6]]), 1.4)
      const cap: Pt[] = [[x - wide, -tall + 8], [x - wide * 0.8, -tall - 2], [x, -tall - 8], [x + wide * 0.8, -tall - 2], [x + wide, -tall + 8]]
      g.fillStyle = RED
      blob(g, cap)
      g.fill()
      charcoal(g, () => blob(g, cap), 2)
      g.fillStyle = CLAY
      for (const [dx, dy, r] of [[-0.4, 0.1, 2.4], [0.3, -0.35, 1.8], [0.5, 0.3, 1.4]] as const) {
        g.beginPath()
        g.arc(x + dx * wide, -tall + dy * 10, r * (wide / 17), 0, Math.PI * 2)
        g.fill()
      }
    }
  })]

  const beetle = (open: boolean) => (g: Paint): void => {
    for (const x of [-10, 0, 10]) charcoal(g, () => trail(g, [[x, -8], [x - 3 + (x > 0 ? 6 : 0), -2], [x - 6 + (x > 0 ? 12 : 0), 0]]), 2)
    const shell: Pt[] = [[-16, -6], [-12, -19], [0, -24], [12, -19], [16, -6], [8, -3], [-8, -3]]
    g.fillStyle = GREEN_DEEP
    blob(g, shell)
    g.fill()
    g.fillStyle = GREEN
    blob(g, oval(null, -5, -15, 5, 4))
    g.fill()
    charcoal(g, () => blob(g, shell), 2)
    if (open) {
      // Its wing cases lifted, and the wings showing under them.
      g.fillStyle = CLAY
      g.globalAlpha = 0.7
      blob(g, [[-6, -20], [-20, -27], [-14, -14]])
      g.fill()
      blob(g, [[6, -20], [20, -27], [14, -14]])
      g.fill()
      g.globalAlpha = 1
    } else charcoal(g, () => { g.beginPath(); g.moveTo(0, -23); g.lineTo(0, -5) }, 1.4)
    g.fillStyle = CHARCOAL
    blob(g, oval(null, 17, -9, 5, 4.5))
    g.fill()
    charcoal(g, () => trail(g, [[19, -12], [22, -19]]), 1.2)
  }
  const beetles = [floor('beetle', beetle(false)), floor('beetle', beetle(true))]

  const fern = [floor('fern', (g) => {
    for (const [lean, tall] of [[-24, 34], [-10, 46], [6, 48], [22, 36]] as const) {
      const frond: Pt[] = [[0, 0], [lean * 0.4, -tall * 0.6], [lean, -tall]]
      charcoal(g, () => trail(g, frond), 2, GREEN_DEEP)
      for (let i = 1; i < 6; i++) {
        const t = i / 6, x = lean * t * t * 0.9 + lean * 0.1 * t, y = -tall * t
        g.fillStyle = GREEN
        g.beginPath()
        g.ellipse(x - 5 + (i % 2) * 10, y, 6 - t * 3, 2.6, (i % 2 ? 0.5 : -0.5) + lean * 0.01, 0, Math.PI * 2)
        g.fill()
      }
    }
  }), p.sprite(30, 24, 15, 21, (g) => {
    // The frog that sits under it.
    const frog: Pt[] = [[-11, -1], [-10, -10], [-2, -15], [8, -13], [12, -6], [10, -1]]
    g.fillStyle = GREEN
    blob(g, frog)
    g.fill()
    charcoal(g, () => blob(g, frog), 1.8)
    eye(g, 4, -15, 3.4, 0.2)
    charcoal(g, () => trail(g, [[2, -6], [8, -5], [11, -7]]), 1.3)
  }, 0.1)]

  const glowworm = [roof('glowworm', (g) => {
    // Threads let down from the roof, of three lengths, each with its worm at the top.
    for (const [x, long] of [[-12, 34], [1, 52], [13, 24]] as const) {
      g.strokeStyle = 'rgba(190, 220, 255, 0.75)'
      g.lineWidth = 1.2
      g.beginPath()
      g.moveTo(x, 4)
      // No thread hangs plumb: each bows its own way, so the three are not a row of strokes.
      g.quadraticCurveTo(x + (x < 0 ? -5 : x > 8 ? 6 : 3), long * 0.55, x + (x < 0 ? 2 : x > 8 ? 1 : -4), long)
      g.stroke()
      g.fillStyle = '#d9c9a6'
      blob(g, oval(null, x, 4, 4.4, 3))
      g.fill()
    }
  }, 0.04)]

  const snail = [floor('snail', (g) => {
    // The shell, which is lit from inside, turns about the origin of this picture.
    const glow = g.createRadialGradient(-4, -19, 2, -4, -19, 17)
    glow.addColorStop(0, '#fff3b8')
    glow.addColorStop(0.6, YELLOW)
    glow.addColorStop(1, YELLOW_DEEP)
    g.fillStyle = glow
    blob(g, oval(null, -4, -19, 15, 14))
    g.fill()
    charcoal(g, () => blob(g, oval(null, -4, -19, 15, 14)), 2)
    charcoal(g, () => trail(g, [[-4, -19], [1, -23], [-4, -28], [-11, -22], [-7, -12], [4, -13]]), 1.6, RED_DEEP)
  }), p.sprite(56, 30, 28, 27, (g) => {
    const foot: Pt[] = [[-22, -1], [-18, -7], [0, -8], [14, -9], [20, -20], [25, -18], [22, -6], [18, -1]]
    g.fillStyle = '#d9c9a6'
    blob(g, foot)
    g.fill()
    charcoal(g, () => blob(g, foot), 1.6)
    charcoal(g, () => trail(g, [[20, -19], [18, -26]]), 1.4)
    charcoal(g, () => trail(g, [[24, -18], [26, -25]]), 1.4)
  }, 0.1)]

  const flyer = (wings: string, body: string, lift: number, long: boolean) => (g: Paint): void => {
    for (const side of [-1, 1]) {
      const wing: Pt[] = long
        ? dragonflyWing(side, lift)
        : [[side * 2, -2], [side * 10, -9 - lift * 7], [side * 20, -7 - lift * 8], [side * 19, 3 - lift * 3], [side * 12, 11], [side * 3, 5]]
      g.fillStyle = wings
      g.globalAlpha = 0.9
      blob(g, wing)
      g.fill()
      g.globalAlpha = 1
      charcoal(g, () => blob(g, wing), 1.2)
    }
    g.fillStyle = body
    if (long) blob(g, [[-2.4, -8], [2.4, -8], [1.6, 14], [-1.6, 14]])
    else blob(g, oval(null, 0, 2, 3.4, 9))
    g.fill()
    eye(g, -2.4, -8, 2.2, 0)
    eye(g, 2.4, -8, 2.2, 0)
  }
  const moth = [air('moth', flyer('#e9dcc0', CHARCOAL_PALE, 1, false)), air('moth', flyer('#e9dcc0', CHARCOAL_PALE, -0.6, false))]
  const dragonfly = [air('dragonfly', flyer('rgba(200, 230, 240, 0.8)', AZURE, 1, true)), air('dragonfly', flyer('rgba(200, 230, 240, 0.8)', AZURE, -0.5, true))]

  const spider = [roof('spider', (g) => {
    // The web fills the corner: spokes from the corner and threads strung across them, each a different sag.
    g.translate(-28, 0)
    g.strokeStyle = 'rgba(241, 232, 211, 0.8)'
    g.lineWidth = 1.1
    for (const [x, y] of [[54, 2], [48, 26], [30, 44], [6, 52]] as const) {
      g.beginPath()
      g.moveTo(0, 0)
      g.lineTo(x, y)
      g.stroke()
    }
    for (const k of [0.34, 0.62, 0.95]) {
      g.beginPath()
      g.moveTo(54 * k, 2 * k)
      g.quadraticCurveTo(44 * k, 12 * k, 48 * k, 26 * k)
      g.quadraticCurveTo(36 * k, 30 * k, 30 * k, 44 * k)
      g.quadraticCurveTo(16 * k, 42 * k, 6 * k, 52 * k)
      g.stroke()
    }
  }, 0.04), p.sprite(30, 26, 15, 6, (g) => {
    // The spider itself, which hangs from the origin.
    for (const side of [-1, 1]) for (const [dx, dy] of [[11, 2], [12, 9], [9, 16]] as const) charcoal(g, () => trail(g, [[side * 3, 8], [side * dx * 0.7, dy - 4], [side * dx, dy]]), 1.4)
    g.fillStyle = CHARCOAL
    blob(g, oval(null, 0, 10, 6, 7))
    g.fill()
    g.fillStyle = RED
    blob(g, oval(null, 0, 12, 2.6, 3))
    g.fill()
    eye(g, -2, 5, 1.8, 0)
    eye(g, 2, 5, 1.8, 0)
  }, 0.08)]

  const flower = [floor('flower', (g) => {
    // The stem and its two leaves.
    charcoal(g, () => trail(g, [[0, 0], [-3, -22], [1, -44]]), 2.6, GREEN_DEEP)
    for (const [side, y] of [[-1, -14], [1, -24]] as const) {
      g.fillStyle = GREEN
      blob(g, [[0, y], [side * 12, y - 9], [side * 17, y - 3], [side * 8, y + 3]])
      g.fill()
    }
  }), p.sprite(40, 40, 20, 20, (g) => {
    // The bloom: five petals of white clay, each a different size, round a yellow middle.
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * Math.PI * 2 - 1.3, long = 12 + (i % 3) * 2
      g.save()
      g.rotate(a)
      g.fillStyle = CLAY
      blob(g, [[2, -4], [long, -6], [long + 3, 0], [long, 6], [2, 4]])
      g.fill()
      g.globalAlpha = 0.7
      charcoal(g, () => blob(g, [[2, -4], [long, -6], [long + 3, 0], [long, 6], [2, 4]]), 1.2, CHARCOAL_PALE)
      g.restore()
    }
    g.fillStyle = YELLOW
    blob(g, oval(null, 0, 0, 5, 5))
    g.fill()
  }, 0.06)]

  return { bat, newt, lizard, mushroom, beetle: beetles, fern, glowworm, snail, moth, dragonfly, spider, flower }
}

/**
 * The two knuckle creases of the ghost hand, from its fingertip. Each is bowed and neither is like the other in
 * length or lean, so the pair is never two upright strokes side by side.
 */
/** The three rings of a worm's body, from its tail: each bowed toward its head, and no two of one length. */
export const WORM_RINGS: readonly (readonly Pt[])[] = [
  [[6.4, -3.6], [8.6, -0.4], [7, 3.4]],
  [[12.6, -4], [14.6, -2.4], [14, -0.2]],
  [[17.6, -1.2], [20, 1.4], [18.6, 3.6]],
]

/**
 * A dragonfly's wing, seen from above with its head toward the top: swept back from the root toward the tail, so
 * the wings and the body never make a bar laid square across a bar. `lift` is the beat of the wing.
 */
export const dragonflyWing = (side: number, lift: number): Pt[] => [[side * 2, -2], [side * 12, -1 - lift * 4], [side * 24, 8 - lift * 5], [side * 21, 13 - lift * 3], [side * 9, 5]]

export const KNUCKLES: readonly (readonly Pt[])[] = [
  [[10, 43], [14, 49], [15, 56], [12, 62]],
  [[23, 49], [28, 51], [29, 57]],
]

export function makeFigures(p: Pigments): Figures {
  const rng = makeRng(0xf16)
  const blocks = new Map<string, Sprite>()
  const cracks = (kind: Kind, hits: number): number => (kind === 'sandstone' || kind === 'granite' ? hits : 0)
  const block = (kind: Kind, variant: number, hits: number): Sprite => {
    const key = `${kind}${variant}${cracks(kind, hits)}`
    let sprite = blocks.get(key)
    if (!sprite) {
      const size = CELL + BLOCK_PAD * 2
      sprite = p.sprite(size, size, BLOCK_PAD, BLOCK_PAD, (g) => paintBlock(g, kind, variant, cracks(kind, hits)), kind === 'open' ? 0.07 : kind === 'granite' || kind === 'boulder' ? 0.2 : 0.36)
      blocks.set(key, sprite)
    }
    return sprite
  }
  // Every block picture is made now, so that no blow of the pick waits for one.
  for (let v = 0; v < VARIANTS; v++) {
    for (const kind of ['earth', 'open', 'boulder', 'water', 'spout', 'gas'] as const) block(kind, v, 0)
    for (let hits = 0; hits < 3; hits++) { block('sandstone', v, hits); block('granite', v, hits) }
  }
  const each = <T,>(make: (colour: Colour) => T): Record<Colour, T> => ({ red: make('red'), green: make('green'), blue: make('blue') })
  const gem = each((colour) => p.sprite(GEM_R * 2 + 6, GEM_R * 2 + 6, GEM_R + 3, GEM_R + 3, (g) => paintGem(g, colour), 0))
  const shine = each((colour) => p.sprite(96, 96, 48, 48, (g) => {
    const look = GEM[colour]
    const pool = g.createRadialGradient(0, 0, 3, 0, 0, 46)
    pool.addColorStop(0, look.pale)
    pool.addColorStop(0.3, look.core)
    pool.addColorStop(1, 'rgba(0, 0, 0, 0)')
    g.globalAlpha = 0.5
    g.fillStyle = pool
    g.beginPath()
    g.arc(0, 0, 47, 0, Math.PI * 2)
    g.fill()
  }, 0))
  const beast = [0, 1, 2].map((i) => p.sprite(70, 80, 46, 56, (g) => paintBeastHead(g, i), 0.3))
  // A worm looking out of the earth: its tail in the block at the origin, its head along x.
  const worm = p.sprite(34, 16, 4, 8, (g) => {
    const shape: Pt[] = [[0, -3.4], [10, -4.4], [20, -3.6], [26, -1.5], [26, 2], [20, 3.8], [10, 4.4], [0, 3.4]]
    g.fillStyle = '#e3a48c'
    blob(g, shape)
    g.fill()
    charcoal(g, () => blob(g, shape), 1.4, RED_DEEP)
    for (const ring of WORM_RINGS) charcoal(g, () => trail(g, ring), 1, RED_DEEP)
    g.fillStyle = CHARCOAL
    g.beginPath()
    g.arc(23, -1, 1.2, 0, Math.PI * 2)
    g.fill()
  }, 0.08)
  const puff = p.sprite(60, 60, 30, 30, (g) => {
    const cloud = g.createRadialGradient(0, 0, 2, 0, 0, 28)
    cloud.addColorStop(0, 'rgba(226, 205, 168, 0.85)')
    cloud.addColorStop(0.6, 'rgba(206, 180, 140, 0.5)')
    cloud.addColorStop(1, 'rgba(206, 180, 140, 0)')
    g.fillStyle = cloud
    g.beginPath()
    g.arc(0, 0, 29, 0, Math.PI * 2)
    g.fill()
  }, 0.3)
  // A wisp of gas: a pale curl that the view turns and thins.
  const wisp = p.sprite(40, 70, 20, 66, (g) => {
    g.strokeStyle = GAS
    g.lineCap = 'round'
    g.lineWidth = 7
    g.globalAlpha = 0.7
    trail(g, [[0, 0], [-8, -14], [6, -28], [-6, -42], [4, -58]])
    g.stroke()
    g.lineWidth = 3
    g.strokeStyle = '#eeeab0'
    trail(g, [[0, 0], [-8, -14], [6, -28], [-6, -42], [4, -58]])
    g.stroke()
  }, 0.3)
  const print = p.sprite(120, 120, 60, 60, (g) => paintHandSpray(g, rng, CLAY, 56), 0)
  // The glow on the block an idle child is shown: white clay breathed round it.
  const halo = p.sprite(CELL + 60, CELL + 60, (CELL + 60) / 2, (CELL + 60) / 2, (g) => {
    for (let i = 0; i < 6; i++) {
      g.strokeStyle = `rgba(255, 246, 222, ${0.34 - i * 0.05})`
      g.lineWidth = 5 + i * 4
      blob(g, patch(rng, -CELL / 2 + 2, -CELL / 2 + 2, CELL - 4, CELL - 4, 3))
      g.stroke()
    }
  }, 0.1)
  // The ghost hand: a hand of white clay with one finger out, its fingertip at the origin.
  const hand = p.sprite(80, 104, 26, 6, (g) => {
    const shape: Pt[] = [[-7, 2], [7, 2], [9, 34], [22, 36], [38, 44], [44, 60], [40, 82], [22, 94], [0, 92], [-12, 78], [-20, 58], [-18, 46], [-9, 44]]
    g.fillStyle = 'rgba(250, 242, 222, 0.92)'
    blob(g, shape)
    g.fill()
    charcoal(g, () => blob(g, shape), 2.6)
    g.globalAlpha = 0.6
    charcoal(g, () => trail(g, KNUCKLES[0]), 1.6)
    charcoal(g, () => trail(g, KNUCKLES[1]), 1.4)
    g.globalAlpha = 1
  }, 0.1)
  // The candle's light: a warm pool that goes where the mole goes.
  const glow = p.sprite(380, 380, 190, 190, (g) => {
    const pool = g.createRadialGradient(0, 0, 8, 0, 0, 188)
    pool.addColorStop(0, 'rgba(255, 186, 96, 0.5)')
    pool.addColorStop(0.35, 'rgba(240, 150, 70, 0.22)')
    pool.addColorStop(1, 'rgba(230, 130, 60, 0)')
    g.fillStyle = pool
    g.beginPath()
    g.arc(0, 0, 189, 0, Math.PI * 2)
    g.fill()
  }, 0)
  const bloom = each((colour) => p.sprite(128, 128, 64, 64, (g) => {
    const look = GEM[colour]
    const pool = g.createRadialGradient(0, 0, 4, 0, 0, 62)
    pool.addColorStop(0, look.pale)
    pool.addColorStop(0.28, look.core)
    pool.addColorStop(1, 'rgba(0, 0, 0, 0)')
    g.fillStyle = pool
    g.beginPath()
    g.arc(0, 0, 63, 0, Math.PI * 2)
    g.fill()
  }, 0))
  return { block, gem, shine, bloom, tool: toolParts(p), mole: moleParts(p), mammoth: mammothParts(p), lift: liftParts(p), dweller: dwellerParts(p), beast, worm, puff, wisp, print, halo, hand, glow }
}
