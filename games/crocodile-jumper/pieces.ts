import { METAL, blob, foil, path, poly, twist, type Album, type Ctx, type Picture } from './foil'
import { LENGTH, type Kind } from './row'

// The measures, their trays and the rings of a jumper. A piece is drawn about
// its middle, exactly as long as it measures, with nothing on it.

function outline(k: Kind): Path2D {
  const h = LENGTH[k] / 2
  if (k === 'sausage') return blob([[-h + 1, -9], [-h + 12, -13], [-h + 26, -31], [0, -36], [h - 26, -31], [h - 12, -13], [h - 1, -9], [h - 1, 9], [h - 12, 13], [h - 26, 29], [0, 35], [h * -1 + 26, 29], [-h + 12, 13], [-h + 1, 9]], 0.9)
  if (k === 'shoe') return blob([[-h + 1, 40], [-h + 1, 22], [-h + 14, 4], [-h + 40, -6], [-2, -24], [6, -42], [h - 6, -42], [h - 3, -10], [h - 1, 24], [h - 1, 40], [0, 41]], 0.72)
  return blob([[-h + 1, -14], [-h + 12, -22], [-h + 12, -38], [-4, -46], [10, -36], [10, -18], [22, -12], [h - 1, -18], [h - 3, 8], [h - 16, 32], [0, 38], [-h + 14, 32], [-h + 5, 10], [-h + 12, -8]], 0.85)
}

export function paintPiece(ctx: Ctx, k: Kind, light: number): void {
  const h = LENGTH[k] / 2
  ctx.save()
  ctx.translate(3, 6)
  ctx.globalAlpha = 0.22
  ctx.fillStyle = '#2a1c38'
  ctx.fill(outline(k))
  ctx.restore()
  foil(ctx, outline(k), [-h, -48, LENGTH[k], 92], METAL[k], { seed: k === 'sausage' ? 11 : k === 'shoe' ? 23 : 37, light, size: k === 'duck' ? 15 : 18, round: 0.55 })
  if (k === 'shoe') {
    ctx.fillStyle = METAL.shoe[0]
    ctx.fill(path((p) => p.roundRect(-h + 1, 31, LENGTH.shoe - 2, 11, 5)))
    ctx.fill(path((p) => p.ellipse(h - 25, -40, 19, 7, 0, 0, 7)))
  }
  if (k === 'duck') {
    ctx.fillStyle = '#e2701a'
    ctx.strokeStyle = '#8a3c06'
    ctx.lineWidth = 2
    const beak = poly([[-h + 14, -32], [-h + 1, -25], [-h + 2, -20], [-h + 15, -20]])
    ctx.fill(beak)
    ctx.stroke(beak)
  }
}

export const piece = (album: Album, k: Kind, light: number): Picture => album.get(`piece-${k}-${light}`, [-LENGTH[k] / 2 - 4, -54, LENGTH[k] + 12, 112], (c) => paintPiece(c, k, light))

/** One ring of a jumper, a hundred tall about its middle and as long as its piece. The measure shows in how it is made. */
export function ring(album: Album, k: Kind, light: number): Picture {
  const L = LENGTH[k], h = L / 2
  return album.get(`ring-${k}-${light}`, [-h - 6, -60, L + 12, 120], (c) => {
    const edge: [number, number][] = []
    if (k === 'duck') {
      // Short and frilled like feathers.
      for (let i = 0; i <= 3; i++) edge.push([-h + (i / 3) * L, i % 2 ? -56 : -46])
      for (let i = 3; i >= 0; i--) edge.push([-h + (i / 3) * L, i % 2 ? 54 : 46])
    }
    const p = k === 'duck' ? blob(edge, 0.8)
      : k === 'shoe' ? blob([[-h, -34], [-h + 10, -50], [h - 10, -50], [h, -34], [h, 34], [h - 10, 50], [-h + 10, 50], [-h, 34]], 0.7)
        : blob([[-h, -30], [-h + 18, -50], [0, -55], [h - 18, -50], [h, -30], [h, 30], [h - 18, 50], [0, 54], [-h + 18, 50], [-h, 30]], 0.95)
    foil(c, p, [-h, -56, L, 112], METAL[k], { seed: 50 + L, light, size: k === 'duck' ? 14 : 20, round: 0.6 })
    c.save()
    c.clip(p)
    c.lineCap = 'round'
    if (k === 'sausage') {
      // Smooth, with a long shine.
      c.globalAlpha = 0.6
      c.strokeStyle = '#fff'
      c.lineWidth = 9
      c.stroke(path((q) => { q.moveTo(-h + 26, -26); q.quadraticCurveTo(0, -34, h - 30, -26) }))
    } else if (k === 'shoe') {
      // Laced.
      c.strokeStyle = '#fff6e0'
      c.lineWidth = 5
      c.stroke(path((q) => { for (let i = -1; i <= 1; i++) { q.moveTo(-18, i * 24 - 10); q.lineTo(18, i * 24 + 10); q.moveTo(18, i * 24 - 10); q.lineTo(-18, i * 24 + 10) } }))
    } else {
      // Feathered.
      c.strokeStyle = METAL.duck[0]
      c.globalAlpha = 0.75
      c.lineWidth = 3
      c.stroke(path((q) => { for (let r = -2; r <= 2; r++) for (let i = -1; i <= 1; i++) { const x = i * 22 + (r % 2) * 11; q.moveTo(x - 9, r * 20 - 6); q.quadraticCurveTo(x, r * 20 + 11, x + 9, r * 20 - 6) } }))
    }
    c.restore()
    // Where it is gathered at both ends.
    c.globalAlpha = 0.5
    c.strokeStyle = METAL[k][0]
    c.lineWidth = 4
    c.stroke(path((q) => { q.moveTo(-h + 4, -38); q.lineTo(-h + 4, 38); q.moveTo(h - 4, -38); q.lineTo(h - 4, 38) }))
    c.globalAlpha = 1
  })
}

/** The foil over a tray that has not been torn open. */
export function cover(album: Album, w: number, h: number, k: Kind): Picture {
  return album.get(`cover-${k}`, [-w / 2 - 40, -h / 2 - 24, w + 80, h + 50], (c) => {
    twist(c, -w / 2 + 12, 0, Math.PI, 50, METAL[k][1])
    twist(c, w / 2 - 12, 0, 0, 50, METAL[k][1])
    const p = blob([[-w / 2 + 8, -h / 2 + 34], [-w / 4, -h / 2 + 2], [w / 8, -h / 2 + 12], [w / 2 - 10, -h / 2 + 36], [w / 2 - 6, h / 2 - 20], [0, h / 2 - 4], [-w / 2 + 6, h / 2 - 18]], 0.9)
    foil(c, p, [-w / 2, -h / 2, w, h], METAL.silver, { seed: 71 + w, size: 30, round: 0.5 })
    // A corner that has already come up, with the dull lining and a glimpse of what is in there.
    c.fillStyle = '#efe6d2'
    const tear = poly([[w / 2 - 70, -h / 2 + 22], [w / 2 - 12, -h / 2 + 40], [w / 2 - 34, 0], [w / 2 - 62, -10]])
    c.fill(tear)
    c.fillStyle = METAL[k][1]
    c.fill(poly([[w / 2 - 60, -h / 2 + 32], [w / 2 - 26, -h / 2 + 42], [w / 2 - 40, -8]]))
    c.strokeStyle = METAL.silver[0]
    c.lineWidth = 2
    c.stroke(tear)
  })
}
