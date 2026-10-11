import { MUZZLE, PARTS, type PartId } from './bear'
import { cloud, darken, edge, form, lighten, rgba, rim, roundRect, rub, slab, soft, type G, type RGB, type Rng } from './pastel'

// Everyone and everything that moves, each painted once round its own origin. Teddy is the largest thing in the
// room; the duck and the cat are large toys who watch. The six things a hand works with are the plainest pieces
// here: one flat colour each, no face, and one crisp bright edge.

export const FUR: RGB = [226, 164, 100]
const PAD: RGB = [246, 214, 170], NOSE: RGB = [84, 50, 70]
export const INK: RGB = [58, 34, 66]

/** One piece of Teddy in his own units (bear.ts), dry and clean: the coat's marks are laid over it. */
export function paintBearPart(g: G, rng: Rng, part: PartId): void {
  const shapes = PARTS[part]
  if (part === 'body') {
    for (const e of [shapes[1], shapes[2]]) form(g, rng, e.x, e.y, e.rx, e.ry, FUR, e.rot, 0.84)
    form(g, rng, shapes[0].x, shapes[0].y, shapes[0].rx, shapes[0].ry, FUR, 0, 0.86)
    cloud(g, 6, -160, 84, 96, lighten(FUR, 0.42), 0.8, 0.5)
    // The soles of his feet, toward the child: one pad and one band of toes each, nothing to count.
    for (const side of [-1, 1]) {
      cloud(g, side * 116, -54, 42, 36, PAD, 0.95, 0.74)
      cloud(g, side * 116, -97, 36, 10, PAD, 0.95, 0.7)
      rim(g, shapes[side < 0 ? 1 : 2].x, shapes[side < 0 ? 1 : 2].y, shapes[1].rx, shapes[1].ry, FUR, side * 0.25, -1.5, 0.3)
    }
    rim(g, shapes[0].x, shapes[0].y, shapes[0].rx, shapes[0].ry, FUR, 0, -1.2, 0.5)
    return
  }
  if (part === 'head') {
    for (const e of [shapes[1], shapes[2]]) {
      form(g, rng, e.x, e.y, e.rx, e.ry, FUR, 0, 0.82)
      cloud(g, e.x, e.y + 4, e.rx * 0.56, e.ry * 0.56, [240, 170, 160], 0.9, 0.6)
      rim(g, e.x, e.y, e.rx, e.ry, FUR, 0, -2.4, 0.2)
    }
    form(g, rng, shapes[0].x, shapes[0].y, shapes[0].rx, shapes[0].ry, FUR, 0, 0.88)
    cloud(g, MUZZLE.x, MUZZLE.y, MUZZLE.rx, MUZZLE.ry, PAD, 0.96, 0.78)
    cloud(g, 0, MUZZLE.y - 20, 21, 15, NOSE, 1, 0.8)
    cloud(g, 6, MUZZLE.y - 25, 6, 4, [255, 240, 240], 0.7, 0.4)
    // Cheeks, where the lamp warms them.
    cloud(g, -84, -338, 26, 18, [246, 140, 130], 0.42, 0.3); cloud(g, 84, -338, 26, 18, [246, 140, 130], 0.42, 0.3)
    rim(g, shapes[0].x, shapes[0].y, shapes[0].rx, shapes[0].ry, FUR, 0, -1.25, 0.45)
    return
  }
  const e = shapes[0], side = part === 'armL' ? -1 : 1
  form(g, rng, e.x, e.y, e.rx, e.ry, darken(FUR, 0.08), e.rot, 0.84)
  cloud(g, e.x + side * 26, e.y + 62, 24, 22, PAD, 0.9, 0.7)
  rim(g, e.x, e.y, e.rx, e.ry, FUR, e.rot, side < 0 ? -2.6 : -1.4, side < 0 ? -1 : 0.3)
}

/** The four marks a coat can carry, each a small smudge stamped a cell at a time. Painted round the origin, 80 across. */
export function paintMark(g: G, rng: Rng, mark: 'mud' | 'foam' | 'wet' | 'fluff' | 'tuft'): void {
  if (mark === 'mud') {
    cloud(g, 0, 0, 38, 34, [74, 50, 44], 0.95, 0.45)
    for (let n = 0; n < 5; n++) cloud(g, (rng.next() - 0.5) * 44, (rng.next() - 0.5) * 40, 7 + rng.next() * 6, 6 + rng.next() * 5, [46, 30, 34], 0.8, 0.4)
    cloud(g, 8, -10, 12, 6, [130, 96, 80], 0.5, 0.3, -0.5)
  } else if (mark === 'foam') {
    // Foam is white and beaded: a cool shade under it and round bubbles, each with its own light.
    cloud(g, -3, 5, 34, 31, [150, 156, 232], 0.95, 0.5)
    cloud(g, 2, -2, 31, 28, [255, 255, 255], 1, 0.6)
    for (let n = 0; n < 6; n++) {
      const x = (rng.next() - 0.5) * 42, y = (rng.next() - 0.5) * 38, r = 5 + rng.next() * 8
      cloud(g, x, y, r, r, [196, 202, 250], 0.8, 0.8); cloud(g, x + r * 0.3, y - r * 0.3, r * 0.42, r * 0.42, [255, 255, 255], 1, 0.5)
    }
  } else if (mark === 'wet') {
    cloud(g, 0, 0, 38, 36, [104, 58, 62], 0.9, 0.4)
    cloud(g, 8, -10, 5, 3.4, [214, 228, 255], 0.26, 0.3)
  } else if (mark === 'fluff') {
    // Fluff is his own colour, paler, in short dry strokes: never the white of foam.
    cloud(g, 0, 0, 36, 34, lighten(FUR, 0.36), 0.95, 0.35)
    for (let n = 0; n < 7; n++) cloud(g, (rng.next() - 0.5) * 44, (rng.next() - 0.5) * 40, 9, 3, lighten(FUR, 0.62), 0.85, 0.3, rng.next() * 3)
    for (let n = 0; n < 3; n++) cloud(g, (rng.next() - 0.5) * 40, (rng.next() - 0.5) * 36, 7, 2.6, darken(FUR, 0.18), 0.5, 0.3, rng.next() * 3)
  } else {
    // A tuft that stands out past his edge when he is rubbed fluffy there.
    cloud(g, 0, 0, 20, 18, lighten(FUR, 0.4), 0.95, 0.4)
    for (let n = 0; n < 5; n++) cloud(g, (rng.next() - 0.5) * 22, (rng.next() - 0.5) * 20, 10, 2.8, lighten(FUR, 0.66), 0.9, 0.3, rng.next() * 3)
  }
}

const DUCK_C: RGB = [255, 214, 92], BEAK: RGB = [255, 132, 84]

/** The rubber duck, facing Teddy. Its eye is drawn live. */
export function paintDuck(g: G, rng: Rng): void {
  form(g, rng, -4, 20, 66, 42, DUCK_C, 0, 0.86)
  form(g, rng, -62, 0, 22, 18, DUCK_C, 0.6, 0.8)
  form(g, rng, 30, -26, 37, 35, DUCK_C, 0, 0.88)
  cloud(g, -14, 22, 32, 20, lighten(DUCK_C, 0.5), 0.8, 0.55, -0.2)
  soft(g, BEAK, 1, 2.5, (p) => { p.moveTo(58, -32); p.quadraticCurveTo(92, -30, 94, -18); p.quadraticCurveTo(80, -8, 58, -12); p.closePath() })
  rim(g, 30, -26, 37, 35, DUCK_C, 0, -1.9, 0.3)
  rim(g, -4, 20, 66, 42, DUCK_C, 0, -0.7, 0.5)
}

const CAT_C: RGB = [220, 212, 246], CAT_DARK: RGB = [112, 96, 168]

/** The cat's body, sitting on the bed and facing Teddy. Placed by the middle of its seat. */
export function paintCatBody(g: G, rng: Rng): void {
  form(g, rng, 6, -62, 58, 66, CAT_C, 0, 0.86)
  cloud(g, -14, -52, 30, 40, [255, 250, 255], 0.8, 0.5)
  for (const x of [-34, 2]) { form(g, rng, x, -10, 20, 13, [250, 244, 255], 0, 0.8) }
  // Tabby marks of uneven length at uneven gaps.
  cloud(g, 40, -96, 22, 5, CAT_DARK, 0.5, 0.4, 0.5); cloud(g, 46, -66, 13, 6, CAT_DARK, 0.5, 0.4, 0.3); cloud(g, 34, -30, 17, 4.5, CAT_DARK, 0.5, 0.4, 0.7)
  rim(g, 6, -62, 58, 66, CAT_C, 0, -1.0, 0.7)
}

/** The cat's head, placed by its neck. Its eyes are drawn live. */
export function paintCatHead(g: G, rng: Rng): void {
  for (const side of [-1, 1]) {
    soft(g, side < 0 ? CAT_C : CAT_DARK, 1, 3, (p) => { p.moveTo(side * 16, -58); p.lineTo(side * 40, -100); p.lineTo(side * 46, -48); p.closePath() })
    cloud(g, side * 35, -68, 6, 12, [246, 160, 180], 0.9, 0.5)
  }
  form(g, rng, 0, -40, 48, 41, CAT_C, 0, 0.88)
  cloud(g, 26, -58, 22, 16, CAT_DARK, 0.75, 0.5)
  cloud(g, -8, -26, 20, 14, [255, 252, 255], 0.9, 0.6)
  cloud(g, -8, -32, 6, 4.5, [246, 140, 160], 1, 0.7)
  rim(g, 0, -40, 48, 41, CAT_C, 0, -1.3, 0.4)
}

/** The cat's tail, placed by its root and curling up. */
export function paintCatTail(g: G, rng: Rng): void {
  for (let n = 0; n < 7; n++) {
    const t = n / 6, a = -0.3 - t * 1.9
    form(g, rng, Math.cos(a) * 20 + t * 46, Math.sin(a) * 26 - t * 44 + 26, 15 - t * 3, 15 - t * 3, n > 4 ? CAT_DARK : CAT_C, 0, 0.8)
  }
}

/** The soap: a plain pink bar. */
export function paintSoap(g: G, rng: Rng): void {
  const c: RGB = [255, 150, 186]
  slab(g, -40, -24, 80, 48, 20, c, 1, 4)
  g.save(); g.globalCompositeOperation = 'source-atop'; cloud(g, -14, 14, 50, 22, darken(c, 0.4), 0.5, 0.1); g.restore()
  rub(g, rng, 0, 0, 38, 22, lighten(c, 0.6), 5, 0.3, 0.5)
  edge(g, c, 3.2, (p) => { p.moveTo(-22, -21); p.lineTo(22, -21); p.arcTo(37, -21, 37, -6, 15); p.lineTo(37, 4) })
}

/** The jug: plain blue enamel with a white rim, its spout to the right. */
export function paintJug(g: G, rng: Rng): void {
  const c: RGB = [96, 190, 236]
  g.save()
  g.strokeStyle = rgba(c); g.lineWidth = 11
  g.shadowColor = rgba(c); g.shadowBlur = 3 * g.getTransform().a
  g.beginPath(); g.moveTo(-30, -20); g.quadraticCurveTo(-64, -8, -32, 30); g.stroke()
  g.restore()
  soft(g, c, 1, 4, (p) => { p.moveTo(-32, -46); p.lineTo(30, -46); p.quadraticCurveTo(52, -50, 56, -40); p.quadraticCurveTo(40, -30, 36, -18); p.quadraticCurveTo(46, 30, 26, 54); p.lineTo(-26, 54); p.quadraticCurveTo(-46, 30, -34, -18); p.closePath() })
  g.save(); g.globalCompositeOperation = 'source-atop'; cloud(g, -22, 30, 40, 44, darken(c, 0.5), 0.5, 0.1); cloud(g, 14, -10, 16, 40, lighten(c, 0.7), 0.5, 0.1); g.restore()
  rub(g, rng, 0, 6, 34, 46, lighten(c, 0.6), 5, 0.22, 0.4)
  edge(g, [255, 255, 255], 4.5, (p) => { p.moveTo(-30, -46); p.lineTo(30, -46); p.quadraticCurveTo(50, -50, 55, -41) })
}

/** The towel: plain mint cloth, as it hangs. */
export function paintTowel(g: G, rng: Rng): void {
  const c: RGB = [136, 226, 190]
  soft(g, c, 1, 4, (p) => { p.moveTo(-54, -84); p.lineTo(54, -84); p.quadraticCurveTo(60, 0, 54, 80); p.quadraticCurveTo(26, 90, 0, 82); p.quadraticCurveTo(-28, 74, -54, 84); p.quadraticCurveTo(-60, 0, -54, -84); p.closePath() })
  g.save()
  g.globalCompositeOperation = 'source-atop'
  cloud(g, -30, 0, 14, 90, darken(c, 0.5), 0.4, 0.1); cloud(g, 26, 0, 12, 90, lighten(c, 0.6), 0.5, 0.1)
  g.restore()
  rub(g, rng, 0, 0, 50, 80, lighten(c, 0.6), 9, 0.2, 0.3)
  edge(g, c, 3.2, (p) => { p.moveTo(-40, -82); p.lineTo(53, -82); p.quadraticCurveTo(58, -30, 57, 10) })
}

/** The pyjamas on their pegs: a coral shirt with cream stripes, the one pattern among the carried things. */
/**
 * The pyjamas' stripes, drawn by an unsteady hand: each is [how far down, how thick, how far to one side], and no
 * two gaps or thicknesses in a row are the same. Folded on the peg, on his trunk, and down one sleeve.
 */
export const PYJAMA_STRIPES: Record<'folded' | 'trunk' | 'sleeve', readonly (readonly [number, number, number])[]> = {
  folded: [[-37, 4.2, -3], [-10, 6.1, 2], [10, 4.6, -1], [41, 5.8, 3], [59, 4, -2]],
  trunk: [[-259, 5.4, -4], [-219, 7.8, 3], [-191, 5.9, -2], [-149, 7.3, 4], [-123, 5.6, -3], [-82, 8, 2], [-55, 6, -1]],
  sleeve: [[-75, 5.1, -2], [-35, 7.1, 2], [-9, 5.3, -1], [33, 6.9, 3]],
}

export function paintPyjamas(g: G, rng: Rng): void {
  const c: RGB = [246, 128, 118]
  soft(g, c, 1, 4, (p) => { p.moveTo(-22, -62); p.quadraticCurveTo(0, -48, 22, -62); p.lineTo(56, -40); p.lineTo(46, -6); p.lineTo(32, -14); p.lineTo(36, 66); p.lineTo(-36, 66); p.lineTo(-32, -14); p.lineTo(-46, -6); p.lineTo(-56, -40); p.closePath() })
  g.save()
  g.globalCompositeOperation = 'source-atop'
  for (const [y, wide, lean] of PYJAMA_STRIPES.folded) cloud(g, lean, y, 70, wide, [255, 240, 220], 0.85, 0.8)
  cloud(g, -20, 20, 20, 70, darken(c, 0.5), 0.35, 0.1)
  g.restore()
  rub(g, rng, 0, 4, 40, 60, lighten(c, 0.6), 7, 0.2, 0.3)
  edge(g, c, 3.2, (p) => { p.moveTo(8, -55); p.quadraticCurveTo(16, -57, 22, -61); p.lineTo(55, -40); p.lineTo(47, -10) })
}

/** The blanket, folded at the foot of the bed: plain butter yellow. */
export function paintBlanket(g: G, rng: Rng): void {
  const c: RGB = [255, 222, 128]
  for (const [y, w] of [[22, 70], [2, 66], [-18, 62]] as const) {
    slab(g, -w, y - 16, w * 2, 30, 13, c, 1, 4)
    cloud(g, 0, y + 13, w, 3.5, darken(c, 0.45), 0.5, 0.6)
  }
  g.save(); g.globalCompositeOperation = 'source-atop'; cloud(g, -30, 20, 50, 40, darken(c, 0.5), 0.35, 0.1); g.restore()
  rub(g, rng, 0, 0, 60, 34, lighten(c, 0.7), 8, 0.22, 0.4)
  edge(g, c, 3.2, (p) => { p.moveTo(-44, -33); p.lineTo(48, -33); p.arcTo(61, -33, 61, -22, 12) })
}

/** The lamp's shade, lit or not. No face: it is a lamp. */
export function paintShade(g: G, rng: Rng, lit: boolean): void {
  const c: RGB = lit ? [255, 208, 128] : [150, 122, 132]
  soft(g, c, 1, lit ? 9 : 4, (p) => { p.moveTo(-30, -46); p.lineTo(30, -46); p.quadraticCurveTo(54, -6, 58, 44); p.lineTo(-58, 44); p.quadraticCurveTo(-54, -6, -30, -46); p.closePath() })
  g.save()
  g.globalCompositeOperation = 'source-atop'
  if (lit) cloud(g, 0, 16, 44, 40, [255, 246, 214], 0.85, 0.2)
  cloud(g, -30, 20, 26, 60, darken(c, 0.4), 0.35, 0.1)
  g.restore()
  rub(g, rng, 0, 4, 44, 40, lighten(c, 0.6), 6, 0.2, 0.4)
  cloud(g, 0, 46, 60, 5, lit ? [255, 240, 200] : [120, 100, 120], 0.9, 0.7)
  edge(g, c, 3.2, (p) => { p.moveTo(-10, -44); p.lineTo(29, -44); p.quadraticCurveTo(50, -8, 55, 30) })
}

/** The lamp's light on the room: a rubbed halo, stamped additively. 100 units of radius, scaled by the view. */
export function paintHalo(g: G): void {
  cloud(g, 0, 0, 100, 100, [255, 176, 104], 0.62, 0.02)
  cloud(g, 0, 0, 62, 62, [255, 200, 130], 0.5, 0.05)
  cloud(g, 0, 0, 24, 24, [255, 236, 190], 0.7, 0.2)
}

/** Moonlight through the glass when the lamp is down: a cool rubbed halo, stamped additively. 100 units of radius. */
export function paintMoonlight(g: G): void {
  cloud(g, 0, 0, 100, 100, [96, 120, 230], 0.5, 0.05)
  cloud(g, 0, 0, 50, 50, [150, 170, 255], 0.4, 0.1)
}

/** A soft pool of light on a thing the idle glow points out: full in the middle, gone at its rim, with no ring to it. 100 units of radius. */
export function paintGlow(g: G): void {
  const ring = g.createRadialGradient(0, 0, 0, 0, 0, 100)
  ring.addColorStop(0, rgba([255, 246, 206], 0.62)); ring.addColorStop(0.55, rgba([255, 246, 206], 0.5)); ring.addColorStop(1, rgba([255, 250, 220], 0))
  g.fillStyle = ring
  g.fillRect(-100, -100, 200, 200)
}

/** The ghost hand of the idle guidance: a pale mitten, pointing up and to the left with one finger. */
export function paintHand(g: G): void {
  const c: RGB = [244, 240, 255]
  // A shade under it, so it shows on pale fur and on foam as well as on the dark wall.
  // A dark rim all round it, so it shows on pale fur and on foam as well as on the dark wall.
  const rimC: RGB = [34, 28, 84]
  cloud(g, 26, 46, 56, 54, rimC, 0.35, 0.3)
  cloud(g, 26, 40, 44, 46, rimC, 0.95, 0.86)
  slab(g, -13, -11, 36, 70, 17, rimC, 0.95, 2)
  cloud(g, 58, 26, 19, 29, rimC, 0.95, 0.8, 0.5)
  cloud(g, 26, 40, 38, 40, c, 0.96, 0.7)
  slab(g, -8, -6, 26, 62, 13, c, 0.97, 3)
  cloud(g, 58, 26, 14, 24, c, 0.9, 0.7, 0.5)
  edge(g, c, 3, (p) => { p.moveTo(-4, 20); p.lineTo(-4, 4); p.arcTo(-4, -4, 5, -4, 9) })
}

/** One flying bit: a bubble, a drop of water, a puff of fluff or a puff of pastel dust. About 40 across. */
export function paintBit(g: G, kind: 'bubble' | 'drop' | 'puff' | 'dust'): void {
  if (kind === 'bubble') {
    cloud(g, 0, 0, 20, 20, [226, 228, 255], 0.55, 0.8)
    cloud(g, 0, 0, 14, 14, [150, 160, 230], 0.35, 0.5)
    cloud(g, 6, -7, 5, 5, [255, 255, 255], 1, 0.5)
  } else if (kind === 'drop') {
    cloud(g, 0, 2, 13, 18, [150, 206, 255], 0.95, 0.6)
    cloud(g, 3, -3, 4, 6, [255, 255, 255], 0.9, 0.4)
  } else if (kind === 'puff') {
    cloud(g, 0, 0, 20, 19, [255, 240, 212], 0.9, 0.3)
    cloud(g, -7, 3, 10, 9, [255, 250, 236], 0.8, 0.3); cloud(g, 8, -4, 10, 9, [255, 250, 236], 0.8, 0.3)
  } else {
    cloud(g, 0, 0, 20, 18, [170, 170, 236], 0.6, 0.15)
  }
}

/** Falling water: a pale band one unit long, stretched by the view from the spout to where it lands. */
export function paintWater(g: G): void {
  const band = g.createLinearGradient(-16, 0, 16, 0)
  band.addColorStop(0, rgba([150, 206, 255], 0)); band.addColorStop(0.3, rgba([150, 206, 255], 0.85)); band.addColorStop(0.55, rgba([236, 246, 255], 0.95)); band.addColorStop(0.75, rgba([150, 206, 255], 0.85)); band.addColorStop(1, rgba([150, 206, 255], 0))
  g.fillStyle = band
  g.fillRect(-16, 0, 32, 64)
}

/** A ripple on the bath water round the duck. */
export function paintRipple(g: G): void {
  // Two soft arcs of unequal length, never a closed ring.
  g.strokeStyle = rgba([226, 242, 255], 0.9)
  g.lineWidth = 3
  g.lineCap = 'round'
  g.beginPath()
  g.ellipse(0, 0, 60, 12, 0, Math.PI * 0.08, Math.PI * 0.86)
  g.stroke()
  g.beginPath()
  g.ellipse(0, 0, 60, 12, 0, Math.PI * 1.18, Math.PI * 1.62)
  g.stroke()
}


/** A shade laid on his body under each arm, so the arm keeps its edge when his whole coat is one pale colour. */
export function paintArmShade(g: G): void {
  cloud(g, 0, 0, 58, 100, darken(FUR, 0.62), 0.6, 0.55)
}

const BLANKET: RGB = [255, 222, 128], PJ: RGB = [246, 128, 118], CREAM: RGB = [255, 240, 220]

/** The blanket wrapped round him to the chin, in his own units: it covers all of him but his head. */
export function paintWrap(g: G, rng: Rng): void {
  soft(g, BLANKET, 1, 5, (p) => { p.moveTo(-96, -284); p.quadraticCurveTo(0, -250, 96, -284); p.quadraticCurveTo(190, -230, 204, -80); p.quadraticCurveTo(210, -4, 150, 2); p.lineTo(-150, 2); p.quadraticCurveTo(-210, -4, -204, -80); p.quadraticCurveTo(-190, -230, -96, -284); p.closePath() })
  g.save()
  g.globalCompositeOperation = 'source-atop'
  cloud(g, -90, -60, 120, 160, darken(BLANKET, 0.5), 0.4, 0.1)
  cloud(g, 70, -190, 90, 80, lighten(BLANKET, 0.7), 0.5, 0.1)
  // Folds that run down from his chin.
  for (const x of [-120, -52, 30, 104]) cloud(g, x, -120, 9, 130, darken(BLANKET, 0.45), 0.4, 0.2, x * 0.0016)
  g.restore()
  rub(g, rng, 0, -130, 180, 130, lighten(BLANKET, 0.7), 16, 0.2, 0.3)
  edge(g, BLANKET, 3.6, (p) => { p.moveTo(20, -268); p.quadraticCurveTo(70, -272, 96, -282); p.quadraticCurveTo(184, -228, 200, -90) })
}

/** The pyjamas as he wears them, in his own units: the trunk, with stripes. */
export function paintPyjamaTrunk(g: G, rng: Rng): void {
  soft(g, PJ, 1, 4, (p) => { p.moveTo(-74, -284); p.quadraticCurveTo(0, -262, 74, -284); p.quadraticCurveTo(136, -240, 132, -150); p.quadraticCurveTo(128, -70, 96, -40); p.lineTo(-96, -40); p.quadraticCurveTo(-128, -70, -132, -150); p.quadraticCurveTo(-136, -240, -74, -284); p.closePath() })
  g.save()
  g.globalCompositeOperation = 'source-atop'
  for (const [y, wide, lean] of PYJAMA_STRIPES.trunk) cloud(g, lean, y, 150, wide, CREAM, 0.88, 0.8)
  cloud(g, -70, -120, 60, 130, darken(PJ, 0.5), 0.35, 0.1)
  g.restore()
  rub(g, rng, 0, -160, 110, 110, lighten(PJ, 0.6), 10, 0.2, 0.3)
  edge(g, PJ, 3.2, (p) => { p.moveTo(20, -270); p.quadraticCurveTo(52, -274, 74, -282); p.quadraticCurveTo(130, -240, 130, -160) })
}

/** One sleeve of the worn pyjamas, in his own units, over the arm on that side. */
export function paintPyjamaSleeve(g: G, rng: Rng, side: -1 | 1): void {
  const e = PARTS[side < 0 ? 'armL' : 'armR'][0]
  g.save()
  g.translate(e.x, e.y); g.rotate(e.rot)
  soft(g, PJ, 1, 4, (p) => p.ellipse(0, -18, e.rx + 5, e.ry - 14, 0, 0, Math.PI * 2))
  g.globalCompositeOperation = 'source-atop'
  for (const [y, wide, lean] of PYJAMA_STRIPES.sleeve) cloud(g, lean * side, y, 60, wide, CREAM, 0.88, 0.8)
  g.restore()
  rub(g, rng, e.x, e.y - 18, e.rx, e.ry - 20, lighten(PJ, 0.6), 4, 0.2, 0.3)
}

/** A dark damp patch that spreads through a cloth on wet fur. 100 units of radius. */
export function paintDamp(g: G, rng: Rng): void {
  cloud(g, 0, 0, 100, 92, [60, 70, 150], 0.55, 0.5)
  for (let n = 0; n < 5; n++) cloud(g, (rng.next() - 0.5) * 120, (rng.next() - 0.5) * 110, 30, 26, [60, 70, 150], 0.4, 0.4)
}

/** The blanket as a dome: over the lamp, over the cat with two ears, or swollen on the bath water. Placed by the middle of its foot. */
export function paintDome(g: G, rng: Rng, ears: boolean): void {
  if (ears) for (const x of [-34, 24]) soft(g, BLANKET, 1, 4, (p) => { p.moveTo(x - 20, -128); p.lineTo(x + 2, -176); p.lineTo(x + 24, -128); p.closePath() })
  soft(g, BLANKET, 1, 5, (p) => { p.moveTo(-92, 0); p.quadraticCurveTo(-100, -150, 0, -156); p.quadraticCurveTo(100, -150, 92, 0); p.closePath() })
  g.save()
  g.globalCompositeOperation = 'source-atop'
  cloud(g, -50, -50, 60, 100, darken(BLANKET, 0.5), 0.4, 0.1)
  for (const x of [-48, 8, 56]) cloud(g, x, -60, 7, 70, darken(BLANKET, 0.45), 0.4, 0.2, x * 0.003)
  g.restore()
  rub(g, rng, 0, -80, 80, 70, lighten(BLANKET, 0.7), 9, 0.2, 0.3)
  edge(g, BLANKET, 3.2, (p) => { p.moveTo(10, -153); p.quadraticCurveTo(92, -146, 90, -40) })
}

/** The corner of the sunk blanket, hanging over the rim of the tub. Placed by its top middle. */
export function paintCorner(g: G, rng: Rng): void {
  // A sodden corner hung over the rim: wide at the rim, heavy folds, a hem that sags to one side.
  const shape = (p: CanvasRenderingContext2D | Path2D): void => { p.moveTo(-66, -8); p.lineTo(66, -8); p.quadraticCurveTo(70, 52, 50, 92); p.quadraticCurveTo(30, 112, 14, 100); p.quadraticCurveTo(-4, 132, -26, 108); p.quadraticCurveTo(-52, 96, -58, 60); p.quadraticCurveTo(-66, 30, -66, -8); p.closePath() }
  soft(g, BLANKET, 1, 4, shape)
  g.save()
  g.globalCompositeOperation = 'source-atop'
  cloud(g, -24, 58, 16, 60, darken(BLANKET, 0.5), 0.5, 0.1)
  cloud(g, 26, 52, 14, 54, darken(BLANKET, 0.5), 0.42, 0.1)
  cloud(g, 0, 104, 60, 16, darken(BLANKET, 0.4), 0.4, 0.1)
  g.restore()
  rub(g, rng, 0, 46, 54, 56, lighten(BLANKET, 0.7), 6, 0.2, 0.3)
  edge(g, BLANKET, 3.2, (p) => { p.moveTo(-30, -6); p.lineTo(64, -6); p.quadraticCurveTo(68, 50, 50, 90) })
}

/** The duck's wig of foam, placed by the top of its head. */
export function paintWig(g: G, rng: Rng): void {
  for (let n = 0; n < 7; n++) {
    const a = Math.PI * (1.05 + 0.9 * (n / 6)), r = 24 + rng.next() * 8
    cloud(g, Math.cos(a) * 30, Math.sin(a) * 22 + 6, r, r * 0.9, [255, 255, 255], 1, 0.62)
  }
  cloud(g, 0, -10, 34, 26, [255, 255, 255], 1, 0.7)
  cloud(g, -8, 6, 36, 14, [150, 156, 232], 0.5, 0.3)
  for (let n = 0; n < 5; n++) { const x = (rng.next() - 0.5) * 60, y = -24 + rng.next() * 30, r = 5 + rng.next() * 5; cloud(g, x, y, r, r, [196, 202, 250], 0.8, 0.8); cloud(g, x + r * 0.3, y - r * 0.3, r * 0.4, r * 0.4, [255, 255, 255], 1, 0.5) }
}

/** The suds in the bath at their highest: a hill of foam over the rim. Placed by the middle of the water; the view shows as much of it as there are suds. */
export function paintSuds(g: G, rng: Rng): void {
  for (let n = 0; n < 26; n++) {
    const u = rng.next() * 2 - 1, top = 120 * (1 - u * u * 0.8)
    const y = -rng.next() * top, r = 20 + rng.next() * 18
    cloud(g, u * 150, y, r, r * 0.9, [255, 255, 255], 0.98, 0.62)
  }
  for (let n = 0; n < 16; n++) {
    const u = rng.next() * 2 - 1, y = -rng.next() * 110 * (1 - u * u * 0.8), r = 5 + rng.next() * 7
    cloud(g, u * 140, y, r, r, [196, 202, 250], 0.85, 0.8); cloud(g, u * 140 + r * 0.3, y - r * 0.3, r * 0.4, r * 0.4, [255, 255, 255], 1, 0.5)
  }
  cloud(g, -40, -10, 150, 24, [150, 156, 232], 0.45, 0.2)
}

/** The cat wet: thin, darker, with spikes of fur standing off it. Placed as the body is. */
export function paintCatWet(g: G, rng: Rng): void {
  const c: RGB = [150, 142, 204]
  for (let n = 0; n < 11; n++) {
    const a = -Math.PI * (0.08 + 0.84 * (n / 10)), x = 6 + Math.cos(a) * 34, y = -62 + Math.sin(a) * 62
    soft(g, c, 1, 2, (p) => { p.moveTo(x - 9 * Math.sin(a), y + 9 * Math.cos(a)); p.lineTo(x + Math.cos(a) * 26, y + Math.sin(a) * 24); p.lineTo(x + 9 * Math.sin(a), y - 9 * Math.cos(a)); p.closePath() })
  }
  form(g, rng, 6, -60, 38, 64, c, 0, 0.86)
  for (const x of [-22, 6]) form(g, rng, x, -10, 15, 12, lighten(c, 0.4), 0, 0.8)
  cloud(g, 26, -96, 15, 4.5, CAT_DARK, 0.6, 0.4, 0.5); cloud(g, 30, -66, 9, 5, CAT_DARK, 0.6, 0.4, 0.3); cloud(g, 22, -30, 12, 4, CAT_DARK, 0.6, 0.4, 0.7)
  cloud(g, 0, -40, 6, 30, [226, 236, 255], 0.5, 0.2)
  rim(g, 6, -60, 38, 64, c, 0, -1.0, 0.7)
}

/** The cat rubbed into a ball of fluff twice its width, with only its eyes showing. Placed as the body is. */
export function paintCatFluff(g: G, rng: Rng): void {
  for (let n = 0; n < 22; n++) {
    const a = (n / 22) * Math.PI * 2, r = 20 + rng.next() * 8
    cloud(g, Math.cos(a) * 98, -112 + Math.sin(a) * 92, r, r, lighten(CAT_C, 0.3), 1, 0.5)
  }
  form(g, rng, 0, -112, 106, 100, CAT_C, 0, 0.84)
  cloud(g, -20, -100, 60, 60, [255, 252, 255], 0.75, 0.3)
  for (let n = 0; n < 16; n++) cloud(g, (rng.next() - 0.5) * 170, -112 + (rng.next() - 0.5) * 160, 16, 4, [255, 255, 255], 0.7, 0.3, rng.next() * 3)
  rim(g, 0, -112, 106, 100, CAT_C, 0, -1.2, 0.5)
}

/** One of the two falls of the curtain, hung from its rail. Placed by the top of its outer edge; `side` is -1 for the left fall. */
export function paintCurtainFall(g: G, rng: Rng, side: -1 | 1, width: number, height: number): void {
  const cloth: RGB = [150, 62, 110], x0 = side < 0 ? 0 : -width
  soft(g, cloth, 1, 5, (p) => { p.moveTo(x0, 0); p.lineTo(x0 + width, 0); p.lineTo(x0 + width - side * 8, height); p.lineTo(x0 - side * 8, height); p.closePath() })
  g.save()
  g.globalCompositeOperation = 'source-atop'
  for (let n = 0; n < 4; n++) {
    const x = x0 + (n + 0.5) * (width / 4)
    cloud(g, x - 6, height / 2, 9, height * 0.62, darken(cloth, 0.55), 0.6, 0.2)
    cloud(g, x + 8, height / 2, 7, height * 0.6, lighten(cloth, 0.4), 0.5, 0.2)
  }
  g.restore()
  rub(g, rng, x0 + width / 2, height / 2, width / 2, height / 2, lighten(cloth, 0.6), 8, 0.14, 0.4)
}

/** The sky behind a pane of glass, at night or in the morning, with the garden's hill. `w` by `h`, from its top left. */
export function paintSky(g: G, rng: Rng, w: number, h: number, kind: 'night' | 'morning', hill: boolean): void {
  g.save()
  g.beginPath(); roundRect(g, 0, 0, w, h, 10); g.clip()
  const sky = g.createLinearGradient(0, 0, 0, h)
  if (kind === 'night') { sky.addColorStop(0, rgba([14, 18, 62])); sky.addColorStop(1, rgba([40, 46, 120])) } else { sky.addColorStop(0, rgba([150, 206, 250])); sky.addColorStop(0.7, rgba([255, 232, 190])); sky.addColorStop(1, rgba([255, 214, 160])) }
  g.fillStyle = sky
  g.fillRect(0, 0, w, h)
  if (kind === 'night') {
    // Stars of uneven sizes at uneven places, and a moon.
    for (let n = 0; n < 34; n++) { const r = 1.8 + rng.next() * rng.next() * 5; cloud(g, rng.next() * w, rng.next() * h, r, r, [255, 250, 226], 0.95, 0.5) }
    cloud(g, w * 0.68, h * 0.26, 30, 30, [255, 244, 214], 0.3, 0.2); cloud(g, w * 0.68, h * 0.26, 13, 13, [255, 246, 222], 1, 0.82)
  } else {
    for (let n = 0; n < 3; n++) cloud(g, rng.next() * w, h * (0.2 + rng.next() * 0.3), 40 + rng.next() * 30, 10 + rng.next() * 6, [255, 255, 255], 0.7, 0.3)
  }
  if (hill) paintHill(g, w, h, kind === 'morning')
  g.restore()
}

/** The garden's hill and its tree, across the foot of a pane. */
export function paintHill(g: G, w: number, h: number, day: boolean): void {
  const c: RGB = day ? [110, 190, 120] : [34, 62, 100]
  cloud(g, w * 0.3, h * 1.12, w * 0.8, h * 0.36, c, 1, 0.8)
  cloud(g, w * 0.95, h * 1.1, w * 0.6, h * 0.3, darken(c, 0.2), 1, 0.8)
  cloud(g, w * 0.2, h * 0.7, 22, 30, darken(c, 0.3), 1, 0.6)
}

/** The morning sun, low over the hill. */
export function paintSun(g: G): void {
  cloud(g, 0, 0, 44, 44, [255, 236, 170], 0.5, 0.2)
  cloud(g, 0, 0, 22, 22, [255, 244, 200], 1, 0.82)
}

/** What the open door shows: the morning garden, a path and a puddle. `w` by `h`, from its top left. */
export function paintDoorway(g: G, rng: Rng, w: number, h: number): void {
  paintSky(g, rng, w, h, 'morning', false)
  g.save()
  g.beginPath(); roundRect(g, 0, 0, w, h, 8); g.clip()
  cloud(g, w * 0.5, h * 0.98, w * 1.1, h * 0.5, [110, 190, 120], 1, 0.86)
  cloud(g, w * 0.2, h * 0.52, 34, 48, [70, 150, 100], 1, 0.7)
  cloud(g, w * 0.5, h * 0.96, w * 0.26, h * 0.3, [226, 204, 160], 0.9, 0.7)
  cloud(g, w * 0.72, h * 0.78, 30, 10, [130, 110, 100], 0.9, 0.7)
  g.restore()
}

/** The door's leaf, with a hole where its glass is. `w` by `h`, from its top left; the glass is given from the same corner. */
export function paintLeaf(g: G, rng: Rng, w: number, h: number, glass: { x: number; y: number; w: number; h: number }): void {
  const c: RGB = [50, 96, 132]
  slab(g, 0, 0, w, h, 8, c, 1, 2)
  slab(g, 20, glass.y + glass.h + 34, w - 40, 150, 10, darken(c, 0.3), 0.8, 4)
  rub(g, rng, w / 2, h / 2, w / 2, h / 2, lighten(c, 0.5), 14, 0.14, 0.5)
  cloud(g, w - 20, glass.y + glass.h + 22, 10, 10, [214, 168, 96], 1, 0.75)
  g.save()
  g.globalCompositeOperation = 'destination-out'
  g.beginPath(); roundRect(g, glass.x, glass.y, glass.w, glass.h, 10); g.fill()
  g.restore()
}

/** The pyjamas' stripes thrown across the wall by the lamp: wide soft bands of warm light, stamped additively. 200 by 200. */
export function paintStripes(g: G): void {
  for (let n = 0; n < 4; n++) cloud(g, 0, -70 + n * 46 + (n % 2) * 5, 100, 11 + (n % 2) * 3, [255, 190, 150], 0.34, 0.55)
}

/** The shadow his paws throw on the wall: a bear's head with two round ears. Placed by its middle. */
export function paintEarShadow(g: G): void {
  const c: RGB = [22, 20, 66]
  cloud(g, 0, 20, 96, 84, c, 0.5, 0.7)
  cloud(g, -78, -62, 44, 42, c, 0.5, 0.7); cloud(g, 78, -62, 44, 42, c, 0.5, 0.7)
}

/** Morning light through the window, falling across the bed: one wide warm slant, stamped additively. 200 by 200. */
export function paintMorningLight(g: G): void {
  g.save()
  g.transform(1, 0, 0.5, 1, 0, 0)
  cloud(g, -20, 0, 70, 100, [255, 226, 160], 0.34, 0.3)
  g.restore()
}

/** The streaks a thing leaves on the paper where there is nobody: foam, a paler wipe, a darker damp. About 40 across. */
export function paintStreak(g: G, kind: 'smear' | 'wipe' | 'damp' | 'steam' | 'gleam'): void {
  if (kind === 'smear') { cloud(g, 0, 0, 20, 12, [255, 255, 255], 0.8, 0.3); cloud(g, 5, -3, 6, 6, [200, 206, 250], 0.7, 0.7) }
  else if (kind === 'wipe') cloud(g, 0, 0, 20, 9, [176, 180, 240], 0.5, 0.2, -0.3)
  else if (kind === 'damp') cloud(g, 0, 0, 16, 20, [20, 22, 70], 0.5, 0.25)
  else if (kind === 'steam') { cloud(g, 0, 0, 20, 18, [226, 230, 255], 0.5, 0.15); cloud(g, 6, -6, 11, 10, [255, 255, 255], 0.4, 0.2) }
  // A gleam is a soft oval of light that winks, never a cross.
  else { cloud(g, 0, 0, 12, 20, [255, 255, 255], 0.95, 0.3, 0.5); cloud(g, 0, 0, 6, 9, [255, 255, 255], 1, 0.7, 0.5) }
}

/** A wash of coloured light round the lamp, stamped additively: mint while the towel rubs the shade, amber under the blanket. 100 units of radius. */
export function paintTint(g: G, kind: 'mint' | 'amber'): void {
  const c: RGB = kind === 'mint' ? [90, 200, 160] : [255, 150, 60]
  cloud(g, 0, 0, 100, 100, c, 0.42, 0.05)
  cloud(g, 0, 0, 50, 50, c, 0.3, 0.1)
}
