import { BASKET } from './layout'
import { HUE, blob, creases, cut, ellipse, sheet, type Ctx, type Sprite } from './paper'
import { ARCH_RING } from './pieces'

// The plain things, each cut once: the three arches, the silk as it lies by the mat, spread, in a heap and
// draped over something, the basket upright and on its side, and what hangs in the window. They have no faces and no idle motion.

export type ArchId = keyof typeof ARCH_RING
const ARCH_HUE: Record<ArchId, string> = { 'arch-large': HUE.red, 'arch-middle': HUE.yellow, 'arch-small': HUE.blue }

/** An arch as a half ring of one hue, anchored at the middle of the line between its feet, which is also the middle it turns round. */
export function archSprite(density: number, seed: number, id: ArchId, thing: number): Sprite {
  const { outer, inner } = ARCH_RING[id]
  return cut(density, outer + 4, outer + 4, outer + 4, 6, (ctx) => {
    sheet(ctx, (c) => { c.arc(0, 0, outer, Math.PI, 0); c.lineTo(inner, 0); c.arc(0, 0, inner, 0, Math.PI, true); c.closePath() }, ARCH_HUE[id], 0.82, creases(seed, thing), 3, outer)
  })
}

/** The silk spread flat on the floor, seen at a slant: a wavy-edged pool, anchored at the middle of its near edge. */
export function silkSpread(density: number, seed: number): Sprite {
  return cut(density, 96, 96, 96, 14, (ctx) => {
    const edge: [number, number][] = []
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * Math.PI * 2, wave = 1 + 0.17 * Math.sin(i * 2.7)
      edge.push([Math.cos(a) * 88 * wave, -42 + Math.sin(a) * 44 * wave])
    }
    sheet(ctx, (c) => blob(c, edge), HUE.turquoise, 0.62, creases(seed, 40), 4, 90)
    sheet(ctx, (c) => blob(c, edge.map(([x, y]) => [x * 0.62 + 8, -42 + (y + 42) * 0.58 - 3] as const)), HUE.turquoise, 0.3, creases(seed, 41), 2, 60)
    sheet(ctx, (c) => blob(c, edge.map(([x, y]) => [x * 0.3 - 14, -42 + (y + 42) * 0.3 + 4] as const)), HUE.blue, 0.26)
    // One corner folded over, the way cloth lies.
    sheet(ctx, (c) => blob(c, [[52, -76], [84, -66], [70, -40], [44, -52]]), HUE.turquoise, 0.5)
  })
}

/** The silk as it lies by the mat, waiting to be taken: a large cloth in soft folds, one corner lifted into the air. Anchored at the middle of its near edge. */
export function silkLying(density: number, seed: number): Sprite {
  return cut(density, 112, 128, 112, 14, (ctx) => {
    sheet(ctx, (c) => blob(c, [[-104, -8], [-96, -50], [-52, -72], [10, -66], [70, -76], [102, -44], [96, -6], [0, 8]]), HUE.turquoise, 0.66, creases(seed, 45), 4, 100)
    // Folds: three sheets lying over each other, each a deeper band.
    sheet(ctx, (c) => blob(c, [[-88, -12], [-70, -52], [-18, -58], [-30, -8]]), HUE.turquoise, 0.34, creases(seed, 46), 2, 60)
    sheet(ctx, (c) => blob(c, [[-22, -6], [-4, -56], [44, -64], [36, -4]]), HUE.blue, 0.24, creases(seed, 47), 1, 60)
    sheet(ctx, (c) => blob(c, [[40, -8], [58, -60], [92, -44], [84, -6]]), HUE.turquoise, 0.3)
    // The corner that lifts: a flap standing up from the cloth, lighter, with its tip curled over.
    sheet(ctx, (c) => { c.moveTo(34, -62); c.quadraticCurveTo(50, -104, 88, -122); c.quadraticCurveTo(96, -92, 84, -58); c.closePath() }, HUE.turquoise, 0.5, creases(seed, 48), 2, 50)
    sheet(ctx, (c) => { c.moveTo(88, -122); c.quadraticCurveTo(104, -112, 100, -96); c.quadraticCurveTo(92, -104, 84, -106); c.closePath() }, HUE.blue, 0.34)
  })
}

/** The silk draped over something: a dome that hangs in folds to a wavy hem. Cut a hundred units wide each way and high, anchored at the middle of its foot, and stretched to fit what is under it. */
export function silkDrape(density: number, seed: number): Sprite {
  return cut(density, 112, 108, 112, 12, (ctx) => {
    const hem: [number, number][] = [[-104, 2], [-100, -52], [-62, -96], [0, -104], [62, -96], [100, -52], [104, 2], [72, 8], [38, -2], [0, 8], [-38, -2], [-72, 8]]
    sheet(ctx, (c) => blob(c, hem), HUE.turquoise, 0.5, creases(seed, 49), 3, 100)
    sheet(ctx, (c) => blob(c, [[-70, 4], [-78, -50], [-46, -88], [-30, -40], [-40, 2]]), HUE.turquoise, 0.24)
    sheet(ctx, (c) => blob(c, [[26, 0], [34, -50], [60, -84], [82, -44], [66, 6]]), HUE.blue, 0.2)
  })
}

/** The silk gathered into a heap: three soft folds on top of each other. */
export function silkHeap(density: number, seed: number): Sprite {
  return cut(density, 70, 100, 70, 8, (ctx) => {
    sheet(ctx, (c) => blob(c, [[-62, 0], [-56, -44], [-10, -78], [44, -52], [62, 0], [0, 6]]), HUE.turquoise, 0.6, creases(seed, 42), 3, 80)
    sheet(ctx, (c) => blob(c, [[-40, -2], [-34, -60], [4, -94], [34, -62], [30, -4]]), HUE.turquoise, 0.5, creases(seed, 43), 2, 70)
    sheet(ctx, (c) => blob(c, [[6, -2], [14, -50], [44, -70], [60, -30], [52, 0]]), HUE.blue, 0.3, creases(seed, 44), 1, 50)
  })
}

/** The pale ground under the wicker: the basket is the one thing in the frame that the light does not come through. */
const WICKER_GROUND = '#f6dcae'

function ground(ctx: Ctx, path: (c: Ctx) => void): void {
  ctx.save()
  ctx.globalCompositeOperation = 'source-over'
  ctx.fillStyle = WICKER_GROUND
  ctx.beginPath()
  path(ctx)
  ctx.fill()
  ctx.restore()
}

/** The upright basket's front: strips of paper woven so close across each other that nothing shows through, and the near half of its rim. Whatever is in the basket is drawn before it. */
export function basketFront(density: number, seed: number): Sprite {
  const w = BASKET.halfWidth, h = BASKET.height, rim = -h * 0.72
  return cut(density, w + 8, h * 0.72 + 4, w + 8, 8, (ctx) => {
    const body = (c: typeof ctx): void => { c.moveTo(-w, rim); c.lineTo(w, rim); c.quadraticCurveTo(w * 0.96, -h * 0.1, w * 0.74, 0); c.lineTo(-w * 0.74, 0); c.quadraticCurveTo(-w * 0.96, -h * 0.1, -w, rim); c.closePath() }
    const lip = (c: typeof ctx): void => { c.moveTo(w + 4, rim); c.ellipse(0, rim, w + 4, 13, 0, 0, Math.PI); c.closePath() }
    ground(ctx, body)
    ground(ctx, lip)
    sheet(ctx, body, HUE.wicker, 0.6, creases(seed, 50), 0)
    ctx.save()
    ctx.beginPath()
    body(ctx)
    ctx.clip()
    // The weave is uneven, as a hand makes it: strips of no two widths, none level and none evenly spaced, and close together.
    const rng = creases(seed, 52)
    for (let y = -0.7; y < -0.02;) {
      const thick = 0.045 + rng.next() * 0.04, tilt = (rng.next() - 0.5) * 0.08, at = y
      sheet(ctx, (c) => { c.moveTo(-w, h * (at - tilt)); c.lineTo(w, h * (at + tilt)); c.lineTo(w, h * (at + tilt + thick)); c.lineTo(-w, h * (at - tilt + thick)); c.closePath() }, HUE.orange, 0.36)
      y += thick + 0.035 + rng.next() * 0.03
    }
    for (let x = -w + 4; x < w - 6;) {
      const wide = 7 + rng.next() * 9, lean = (rng.next() - 0.5) * 16, at = x
      sheet(ctx, (c) => { c.moveTo(at, rim); c.lineTo(at + wide, rim); c.lineTo(at + wide + lean, 0); c.lineTo(at + lean, 0); c.closePath() }, HUE.yellow, 0.4)
      x += wide + 5 + rng.next() * 7
    }
    ctx.restore()
    sheet(ctx, lip, HUE.orange, 0.7, creases(seed, 51), 2, w)
  })
}

/** The upright basket's back: the far side of its rim, the dark inside under it, and the handle. Whatever is in the basket is drawn after it. */
export function basketBack(density: number, seed: number): Sprite {
  const w = BASKET.halfWidth, h = BASKET.height, rim = -h * 0.72
  return cut(density, w + 8, h + 30, w + 8, 8, (ctx) => {
    const mouth = (c: typeof ctx): void => ellipse(c, 0, rim, w + 4, 13)
    ground(ctx, mouth)
    sheet(ctx, mouth, HUE.wicker, 0.8, creases(seed, 53), 2, w)
    sheet(ctx, (c) => ellipse(c, 0, rim + 2, w - 8, 9), HUE.orange, 0.5)
    ctx.save()
    ctx.globalAlpha = 0.62
    ctx.strokeStyle = HUE.wicker
    ctx.lineWidth = 11
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(-w * 0.72, -h * 0.74)
    ctx.bezierCurveTo(-w * 0.7, -h - 30, w * 0.7, -h - 30, w * 0.72, -h * 0.74)
    ctx.stroke()
    ctx.restore()
  })
}

/** The basket on its side, seen into its mouth: a woven ring, and inside it the round dark hollow that the things in it look out of. Anchored at its middle. */
export function basketMouth(density: number, seed: number, r: number, opening: number): Sprite {
  return cut(density, r + 6, r + 6, r + 6, r + 6, (ctx) => {
    const disc = (c: typeof ctx): void => ellipse(c, 0, 0, r, r)
    ground(ctx, disc)
    sheet(ctx, disc, HUE.orange, 0.7, creases(seed, 54), 3, r)
    // The hollow: each ring of the weave is deeper than the one round it, down to the bottom.
    sheet(ctx, (c) => ellipse(c, 0, 0, opening, opening), HUE.wicker, 0.75, creases(seed, 55), 2, opening)
    sheet(ctx, (c) => ellipse(c, 0, 4, opening * 0.74, opening * 0.74), HUE.orange, 0.34)
    sheet(ctx, (c) => ellipse(c, 0, 8, opening * 0.44, opening * 0.44), HUE.orange, 0.34)
    // The stakes of the weave run in to the middle, none evenly spaced.
    const rng = creases(seed, 56)
    ctx.save()
    ctx.beginPath()
    ellipse(ctx, 0, 0, opening, opening)
    ctx.clip()
    for (let a = 0; a < Math.PI * 2;) {
      const wide = 0.07 + rng.next() * 0.06, at = a
      sheet(ctx, (c) => { c.moveTo(Math.cos(at) * 14, 8 + Math.sin(at) * 14); c.lineTo(Math.cos(at) * opening, Math.sin(at) * opening); c.lineTo(Math.cos(at + wide) * opening, Math.sin(at + wide) * opening); c.closePath() }, HUE.yellow, 0.3)
      a += wide + 0.16 + rng.next() * 0.14
    }
    ctx.restore()
  })
}

/** A paper sun that hangs in the window: a disc and eight folded rays, anchored at its middle. */
export function sunSprite(density: number, seed: number): Sprite {
  return cut(density, 78, 78, 78, 78, (ctx) => {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2, b = a + Math.PI / 8
      sheet(ctx, (c) => { c.moveTo(Math.cos(a - 0.24) * 34, Math.sin(a - 0.24) * 34); c.lineTo(Math.cos(a) * 72, Math.sin(a) * 72); c.lineTo(Math.cos(a + 0.24) * 34, Math.sin(a + 0.24) * 34); c.closePath() }, HUE.orange, 0.6)
      sheet(ctx, (c) => { c.moveTo(Math.cos(b - 0.2) * 34, Math.sin(b - 0.2) * 34); c.lineTo(Math.cos(b) * 56, Math.sin(b) * 56); c.lineTo(Math.cos(b + 0.2) * 34, Math.sin(b + 0.2) * 34); c.closePath() }, HUE.yellow, 0.7)
    }
    sheet(ctx, (c) => ellipse(c, 0, 0, 42, 42), HUE.yellow, 0.85, creases(seed, 60), 3, 44)
  })
}

/** A paper cloud that hangs in the window, anchored at the middle of its top, where the thread is tied. */
export function cloudSprite(density: number, seed: number, thing: number, hue: string): Sprite {
  return cut(density, 74, 6, 74, 78, (ctx) => {
    sheet(ctx, (c) => ellipse(c, -30, 46, 36, 24), hue, 0.42, creases(seed, thing), 1, 50)
    sheet(ctx, (c) => ellipse(c, 6, 34, 40, 30), hue, 0.42, creases(seed, thing + 1), 2, 50)
    sheet(ctx, (c) => ellipse(c, 38, 48, 30, 21), hue, 0.42)
  })
}

/** The light round a thing that can be touched now: a soft pale ring, cut once and stretched to fit. */
export function haloSprite(density: number): Sprite {
  return cut(density, 64, 64, 64, 64, (ctx) => {
    ctx.globalCompositeOperation = 'source-over'
    const g = ctx.createRadialGradient(0, 0, 18, 0, 0, 62)
    g.addColorStop(0, 'rgba(255,255,255,0)')
    g.addColorStop(0.55, 'rgba(255,253,225,0.95)')
    g.addColorStop(1, 'rgba(255,246,180,0)')
    ctx.fillStyle = g
    ctx.fillRect(-64, -64, 128, 128)
  })
}

/** A mote of light on the pane. */
export function moteSprite(density: number): Sprite {
  return cut(density, 12, 12, 12, 12, (ctx) => {
    ctx.globalCompositeOperation = 'source-over'
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 11)
    g.addColorStop(0, 'rgba(255,255,240,0.95)')
    g.addColorStop(1, 'rgba(255,255,240,0)')
    ctx.fillStyle = g
    ctx.fillRect(-12, -12, 24, 24)
  })
}

/** The ghost hand: a pale mitten with one finger out, anchored at the fingertip. */
export function handSprite(density: number): Sprite {
  return cut(density, 40, 6, 52, 96, (ctx) => {
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = 'rgba(255,255,255,0.92)'
    ctx.strokeStyle = 'rgba(44,36,82,0.55)'
    ctx.lineWidth = 3
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(-9, 10)
    ctx.quadraticCurveTo(0, -4, 9, 10)
    ctx.lineTo(11, 40)
    ctx.quadraticCurveTo(44, 36, 44, 62)
    ctx.quadraticCurveTo(44, 90, 14, 90)
    ctx.quadraticCurveTo(-22, 90, -26, 62)
    ctx.quadraticCurveTo(-34, 44, -22, 40)
    ctx.quadraticCurveTo(-12, 40, -9, 50)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  })
}
