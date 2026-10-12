import { HUE, blob, creases, cut, ellipse, sheet, type Ctx, type Sprite } from './paper'

// The characters, cut from the same paper: three peg dolls who are each a different shape under a different
// hat, a carved horse with legs too short for it, and the cat on the sill. A body is one sprite and the part
// that swings (a hat, a tail) is another. Faces are drawn fresh each frame, since they are what moves most:
// eyes that follow, lids, brows, and a mouth that goes from a smile to a round hole.

export type DollId = 'doll-tall' | 'doll-round' | 'doll-small'

/** The dolls are cut a quarter larger than the numbers below: they are the largest faces in the frame. The view draws them at this scale. */
export const DOLL_SCALE = 1.25

/** Each doll's shape: half its base, half its neck, how tall its body is, its head's radius, and its two hues. */
export const DOLL: Record<DollId, { base: number; neck: number; tall: number; head: number; hue: string; hat: string }> = {
  'doll-tall': { base: 38, neck: 15, tall: 100, head: 27, hue: HUE.red, hat: HUE.violet },
  'doll-round': { base: 58, neck: 24, tall: 78, head: 30, hue: HUE.orange, hat: HUE.green },
  'doll-small': { base: 36, neck: 15, tall: 54, head: 25, hue: HUE.blue, hat: HUE.yellow },
}

/** The middle of a doll's head, above its foot. */
export function headY(id: DollId): number {
  return -(DOLL[id].tall + DOLL[id].head * 0.7)
}
/** Where a doll's hat sits on its head, above its foot. */
export function hatY(id: DollId): number {
  return headY(id) - DOLL[id].head * (id === 'doll-small' ? 0.42 : 0.62)
}

export function dollBody(density: number, seed: number, id: DollId, thing: number): Sprite {
  const d = DOLL[id], hy = headY(id)
  return cut(density * DOLL_SCALE, d.base + 8, d.tall + d.head * 1.8 + 6, d.base + 8, 10, (ctx) => {
    sheet(ctx, (c) => {
      c.moveTo(-d.base, -3)
      c.bezierCurveTo(-d.base * 1.06, -d.tall * 0.6, -d.neck * 1.5, -d.tall * 0.82, -d.neck, -d.tall)
      c.lineTo(d.neck, -d.tall)
      c.bezierCurveTo(d.neck * 1.5, -d.tall * 0.82, d.base * 1.06, -d.tall * 0.6, d.base, -3)
      c.quadraticCurveTo(0, 8, -d.base, -3)
    }, d.hue, 0.8, creases(seed, thing), 3, d.tall)
    // A scarf in the hat's hue, where the two papers make a third.
    sheet(ctx, (c) => c.rect(-d.neck * 1.5, -d.tall * 0.98, d.neck * 3, d.tall * 0.16), d.hat, 0.6)
    sheet(ctx, (c) => ellipse(c, 0, hy, d.head, d.head), HUE.skin, 0.92, creases(seed, thing + 1), 1, d.head)
    sheet(ctx, (c) => ellipse(c, -d.head * 0.58, hy + d.head * 0.3, d.head * 0.2, d.head * 0.15), HUE.pink, 0.4)
    sheet(ctx, (c) => ellipse(c, d.head * 0.58, hy + d.head * 0.3, d.head * 0.2, d.head * 0.15), HUE.pink, 0.4)
  })
}

/** A doll's hat, anchored where it sits on the head: a tall point that leans, a flat cap with a peak, a dome with a bobble too big for it. */
export function dollHat(density: number, seed: number, id: DollId, thing: number): Sprite {
  const hue = DOLL[id].hat
  return cut(density * DOLL_SCALE, 46, 66, 52, 12, (ctx) => {
    if (id === 'doll-tall') {
      sheet(ctx, (c) => { c.moveTo(-29, 2); c.quadraticCurveTo(-8, -30, 12, -60); c.quadraticCurveTo(22, -24, 29, 2); c.closePath() }, hue, 0.8, creases(seed, thing), 2, 50)
      sheet(ctx, (c) => c.rect(-33, -3, 66, 9), HUE.pink, 0.55)
    } else if (id === 'doll-round') {
      sheet(ctx, (c) => blob(c, [[-36, 4], [-32, -16], [0, -24], [32, -16], [36, 4]]), hue, 0.8, creases(seed, thing), 2, 40)
      sheet(ctx, (c) => ellipse(c, 30, 2, 20, 6), hue, 0.7)
      sheet(ctx, (c) => ellipse(c, 0, -22, 6, 5), HUE.yellow, 0.8)
    } else {
      sheet(ctx, (c) => blob(c, [[-31, 4], [-30, -22], [0, -40], [30, -22], [31, 4]]), hue, 0.82, creases(seed, thing), 2, 40)
      sheet(ctx, (c) => c.rect(-33, -4, 66, 11), HUE.pink, 0.6)
      sheet(ctx, (c) => ellipse(c, 9, -46, 17, 17), HUE.red, 0.7, creases(seed, thing + 1), 1, 18)
    }
  })
}

/** The horse, facing right, anchored on the floor between its legs. */
export function horseBody(density: number, seed: number): Sprite {
  return cut(density, 84, 194, 108, 8, (ctx) => {
    const leg = (x: number): void => {
      sheet(ctx, (c) => { c.moveTo(x - 11, -58); c.lineTo(x + 11, -58); c.lineTo(x + 12, -3); c.quadraticCurveTo(x, 3, x - 12, -3); c.closePath() }, HUE.violet, 0.7)
      sheet(ctx, (c) => c.rect(x - 13, -13, 26, 12), HUE.blue, 0.6)
    }
    leg(-52); leg(-28); leg(20); leg(42)
    sheet(ctx, (c) => blob(c, [[-76, -52], [-74, -104], [-22, -114], [38, -106], [58, -74], [44, -46], [-58, -42]]), HUE.violet, 0.8, creases(seed, 20), 3, 90)
    sheet(ctx, (c) => blob(c, [[14, -96], [30, -146], [62, -156], [70, -116], [48, -84]]), HUE.violet, 0.74, creases(seed, 21), 1, 50)
    sheet(ctx, (c) => blob(c, [[40, -150], [56, -174], [90, -158], [104, -128], [88, -110], [54, -116]]), HUE.violet, 0.8, creases(seed, 22), 2, 40)
    sheet(ctx, (c) => { c.moveTo(50, -164); c.lineTo(56, -190); c.lineTo(70, -166); c.closePath() }, HUE.pink, 0.75)
    sheet(ctx, (c) => blob(c, [[16, -100], [22, -150], [46, -172], [46, -134], [34, -98]]), HUE.pink, 0.6, creases(seed, 23), 2, 50)
    // A blanket on its back, where a rider would sit.
    sheet(ctx, (c) => blob(c, [[-40, -116], [10, -116], [8, -80], [-38, -80]]), HUE.yellow, 0.7, creases(seed, 24), 1, 40)
    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = HUE.ink
    ctx.globalAlpha = 0.7
    ctx.beginPath()
    ellipse(ctx, 95, -128, 2.6, 3.4)
    ctx.fill()
  })
}

/** The horse's tail, anchored at its root. */
export function horseTail(density: number, seed: number): Sprite {
  return cut(density, 44, 6, 8, 72, (ctx) => {
    sheet(ctx, (c) => blob(c, [[2, 0], [-20, 4], [-38, 38], [-24, 66], [-8, 36]]), HUE.pink, 0.7, creases(seed, 25), 2, 50)
  })
}

/** The cat lying on the sill, facing right, anchored at the middle of where it lies. */
export function catBody(density: number, seed: number): Sprite {
  return cut(density, 126, 110, 126, 8, (ctx) => {
    sheet(ctx, (c) => blob(c, [[-120, 2], [-114, -50], [-52, -70], [28, -62], [74, -40], [96, 2]]), HUE.orange, 0.74, creases(seed, 30), 3, 100)
    // Its markings are patches of no two sizes, not a row of like stripes.
    sheet(ctx, (c) => blob(c, [[-104, -52], [-74, -66], [-66, -30], [-98, -26]]), HUE.red, 0.34)
    sheet(ctx, (c) => blob(c, [[-40, -70], [-22, -68], [-26, -50], [-44, -54]]), HUE.red, 0.3)
    sheet(ctx, (c) => blob(c, [[2, -64], [30, -58], [22, -22], [-4, -34]]), HUE.red, 0.26)
    sheet(ctx, (c) => { c.moveTo(52, -74); c.lineTo(58, -106); c.lineTo(80, -84); c.closePath() }, HUE.pink, 0.7)
    sheet(ctx, (c) => { c.moveTo(84, -84); c.lineTo(108, -104); c.lineTo(110, -72); c.closePath() }, HUE.pink, 0.7)
    sheet(ctx, (c) => ellipse(c, 80, -50, 35, 32), HUE.orange, 0.8, creases(seed, 31), 2, 36)
    sheet(ctx, (c) => ellipse(c, 58, -3, 20, 8), HUE.yellow, 0.6)
    sheet(ctx, (c) => ellipse(c, 98, -3, 20, 8), HUE.yellow, 0.6)
    ctx.globalCompositeOperation = 'source-over'
    ctx.globalAlpha = 0.6
    ctx.fillStyle = HUE.ink
    ctx.beginPath()
    ctx.moveTo(77, -42); ctx.lineTo(85, -42); ctx.lineTo(81, -37)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 0.3
    ctx.strokeStyle = HUE.ink
    ctx.lineWidth = 1.2
    ctx.beginPath()
    // Whiskers that fan out, each its own length: never two level strokes.
    for (const side of [-1, 1]) for (const [tilt, long] of [[-11, 30], [1, 38], [13, 26]] as const) { ctx.moveTo(81 + side * 12, -38); ctx.lineTo(81 + side * (12 + long), -38 + tilt) }
    ctx.stroke()
  })
}

/** The cat's tail, anchored at its root. */
export function catTail(density: number, seed: number): Sprite {
  return cut(density, 70, 72, 8, 10, (ctx) => {
    sheet(ctx, (c) => blob(c, [[2, 2], [-30, -4], [-60, -34], [-54, -64], [-40, -40], [-20, -16]]), HUE.orange, 0.74, creases(seed, 32), 2, 50)
    sheet(ctx, (c) => blob(c, [[-58, -40], [-56, -66], [-44, -54], [-46, -38]]), HUE.red, 0.4)
  })
}

export type Face = {
  /** Where the eyes look, each from -1 to 1. */
  lookX: number
  lookY: number
  /** 0 shut to 1 wide. */
  eye: number
  /** 0 a smile to 1 a round hole. */
  mouth: number
  /** -1 a frown to 1 raised. */
  brow: number
  /** 0 to 1: how wide a smile is, for someone who is pleased. */
  grin: number
  /** 0 to 1: straining under a load. The brows pinch up in the middle and the mouth is pressed into a wavy line: effort, and not a cross face. */
  strain: number
}

/** Draws two eyes round a point, each of radius `r`, `gap` apart. Returns how many fills and strokes it made. */
export function drawEyes(ctx: Ctx, x: number, y: number, r: number, gap: number, face: Face): number {
  const dx = face.lookX * r * 0.42, dy = face.lookY * r * 0.36
  if (face.eye < 0.16) {
    // Shut: two lids that curve down, like a sleeper's.
    ctx.strokeStyle = HUE.ink
    ctx.lineWidth = r * 0.34
    ctx.lineCap = 'round'
    ctx.beginPath()
    for (const side of [-1, 1]) { ctx.moveTo(x + side * gap - r, y); ctx.quadraticCurveTo(x + side * gap, y + r * 0.7, x + side * gap + r, y) }
    ctx.stroke()
    return 1
  }
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  for (const side of [-1, 1]) { ctx.moveTo(x + side * gap + r, y); ellipse(ctx, x + side * gap, y, r, r * 1.16 * face.eye) }
  ctx.fill()
  ctx.fillStyle = HUE.ink
  ctx.beginPath()
  for (const side of [-1, 1]) { ctx.moveTo(x + side * gap + dx + r * 0.56, y + dy * face.eye); ellipse(ctx, x + side * gap + dx, y + dy * face.eye, r * 0.56, r * 0.56 * Math.min(1, face.eye * 1.3)) }
  ctx.fill()
  return 2
}

/** Draws brows over two eyes, unless told not to, and a mouth at a point. Returns how many fills and strokes it made. */
export function drawBrowsAndMouth(ctx: Ctx, x: number, y: number, r: number, gap: number, mouthX: number, mouthY: number, face: Face, brows = true): number {
  ctx.strokeStyle = HUE.ink
  ctx.lineCap = 'round'
  ctx.lineWidth = r * 0.3
  ctx.beginPath()
  // The brows always slope a little, so the two are never level strokes.
  const strain = face.strain > 0.15
  const lift = r * (1.5 + 0.5 * face.brow), tilt = strain ? r * (0.5 + 0.5 * face.strain) : (face.brow * 0.4 + (face.brow < 0 ? -0.22 : 0.22)) * r
  // A face seen from the side has one eye and one brow: two would cross each other.
  if (brows) for (const side of gap === 0 ? [1] : [-1, 1]) { ctx.moveTo(x + side * (gap - r * 0.8), y - lift - side * tilt * 0.5); ctx.lineTo(x + side * (gap + r * 0.8), y - lift + side * tilt * 0.5) }
  const mx = mouthX + face.lookX * r * 0.3, wide = r * (1.1 + 0.5 * face.grin)
  if (strain) {
    // Lips pressed together: a short line with two waves in it.
    ctx.moveTo(mx - wide, mouthY + r * 0.3)
    ctx.bezierCurveTo(mx - wide * 0.5, mouthY - r * 0.5 * face.strain, mx - wide * 0.2, mouthY + r * (0.3 + 0.6 * face.strain), mx, mouthY + r * 0.3)
    ctx.bezierCurveTo(mx + wide * 0.2, mouthY - r * 0.5 * face.strain, mx + wide * 0.5, mouthY + r * (0.3 + 0.6 * face.strain), mx + wide, mouthY + r * 0.3)
    ctx.stroke()
    return 1
  }
  if (face.mouth < 0.15) {
    ctx.moveTo(mx - wide, mouthY)
    ctx.quadraticCurveTo(mx, mouthY + r * (0.9 + 0.8 * face.grin - 1.6 * Math.max(0, -face.brow)), mx + wide, mouthY)
    ctx.stroke()
    return 1
  }
  ctx.stroke()
  ctx.fillStyle = HUE.ink
  ctx.beginPath()
  ellipse(ctx, mx, mouthY + r * 0.2, r * (0.5 + 0.4 * face.mouth), r * 1.2 * face.mouth)
  ctx.fill()
  return 2
}
