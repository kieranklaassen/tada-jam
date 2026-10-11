import { C, card, curve, line, poly, round, blob, type G, type SpriteDef } from './paint'
import { CUP, LINE_UP, RIPPLES, SEAT_DROP, TURNS, seatOf } from './shape'
import { PLACES, type Pt } from './tree'
import { OWN_FIT, type Kind } from './ways'

// The seven working pieces, drawn between two pegs. They are the plainest
// things on the page: pale wood and rope, one flat colour each, no face, no
// pattern, no life of their own. Each is drawn from its two ends, so the same
// piece fits a rise or a span and hangs with the page's own down. The parts
// that move by themselves are cards of their own: the bucket's cup, which
// runs along its rope, and the swing's seat, which swings from its pin.

/** A rope reads on bark, leaf and sky alike: a dark line with a pale one laid on it. */
function rope(g: G, points: readonly (readonly [number, number])[], width = 3): void {
  line(g, points, C.line, width + 2.4)
  line(g, points, C.rope, width)
}
function ropeCurve(g: G, ax: number, ay: number, cx: number, cy: number, bx: number, by: number, width = 3): void {
  curve(g, ax, ay, cx, cy, bx, by, C.line, width + 2.4)
  curve(g, ax, ay, cx, cy, bx, by, C.rope, width)
}

const along = (a: Pt, b: Pt, t: number): [number, number] => [a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t]

/** A lit lantern's light: a warm round glow about its glass. */
function halo(g: G, x: number, y: number, r: number): void {
  const light = g.createRadialGradient(x, y, 2, x, y, r)
  light.addColorStop(0, 'rgba(255, 232, 140, 0.75)')
  light.addColorStop(1, 'rgba(255, 232, 140, 0)')
  g.fillStyle = light
  g.fillRect(x - r, y - r, r * 2, r * 2)
}

/**
 * Draws a piece between `a` and `b`. `icon` is the piece as it lies in the
 * basket, where the two thinnest are drawn stouter and with a dark edge so
 * they read on the felt; `lit` is a string of lanterns burning; `turn` is how
 * far a bucket's two wheels have turned, in sixths of a turn; `ripple` is
 * where the bump of a tapped rope bridge is, in fifths of its length, or -1.
 */
function drawPiece(g: G, kind: Kind, a: Pt, b: Pt, icon = false, lit = false, turn = 0, ripple = -1): void {
  const dx = b.x - a.x, dy = b.y - a.y
  const length = Math.hypot(dx, dy)
  // The unit across the piece, pointing up the page on a span.
  const nx = dy / length, ny = -dx / length
  const span = Math.abs(dy) < 1
  const strip = (half: number, lift = 0) => poly([
    [a.x + nx * (lift + half), a.y + ny * (lift + half)], [b.x + nx * (lift + half), b.y + ny * (lift + half)],
    [b.x + nx * (lift - half), b.y + ny * (lift - half)], [a.x + nx * (lift - half), a.y + ny * (lift - half)],
  ])
  switch (kind) {
    case 'plank':
      if (icon) { strip(13)(g); g.fillStyle = C.line; g.fill() }
      card(g, strip(icon ? 10 : 7), C.wood)
      line(g, [along(a, b, 0.08), along(a, b, 0.92)], C.woodDark, 2)
      break
    case 'ladder': {
      card(g, strip(4, 11), C.wood)
      card(g, strip(4, -11), C.wood)
      const rungs = Math.max(3, Math.round(length / 26))
      for (let i = 0; i < rungs; i++) {
        const [x, y] = along(a, b, (i + 0.5) / rungs)
        line(g, [[x + nx * 11, y + ny * 11], [x - nx * 11, y - ny * 11]], C.wood, 6)
        line(g, [[x + nx * 8, y + ny * 8], [x - nx * 8, y - ny * 8]], C.woodDark, 1.5)
      }
      break
    }
    case 'bridge': {
      // Slats on two ropes: sagging between the limbs on a span, hanging as a net on a rise.
      const sag = span ? 24 : 0, side = span ? 0 : 16
      // A tapped bridge carries one bump along it: the slats and ropes there are lifted.
      const lifted = (t: number): number => (ripple < 0 ? 0 : 10 * Math.max(0, 1 - Math.abs(t - (ripple + 0.5) / RIPPLES) * 3.2))
      const point = (t: number): [number, number] => { const [x, y] = along(a, b, t); return [x + side * Math.sin(t * Math.PI) + (span ? 0 : lifted(t)), y + sag * Math.sin(t * Math.PI) - (span ? lifted(t) : 0)] }
      const slats = Math.max(5, Math.round(length / 20))
      for (const rail of [15, -15]) {
        // On a span one rope carries the slats and one is a handrail above them; on a rise the two hang side by side.
        const points: [number, number][] = []
        for (let i = 0; i <= 16; i++) {
          const [x, y] = point(i / 16)
          points.push(span ? [x, y - (rail > 0 ? 18 : 0)] : [x + nx * rail, y + ny * rail])
        }
        rope(g, points)
      }
      for (let i = 0; i < slats; i++) {
        const [x, y] = point((i + 0.5) / slats)
        card(g, span ? round(x - 7, y - 4, 14, 8, 2) : round(x - 15, y - 4, 30, 8, 2), C.wood, 2)
        if (span && i % 2 === 0) rope(g, [[x, y - 4], [x, y - 18]], 1.4)
      }
      break
    }
    case 'bucket': {
      // A rope on two posts with a wheel on each. The cup is a card of its own, since it runs.
      if (span) ropeCurve(g, a.x, a.y - LINE_UP, (a.x + b.x) / 2, a.y - LINE_UP + 20, b.x, b.y - LINE_UP)
      else rope(g, [[a.x, a.y - LINE_UP], [b.x, b.y - LINE_UP]])
      for (const end of [a, b]) {
        line(g, [[end.x, end.y], [end.x, end.y - LINE_UP]], C.line, 6.4)
        line(g, [[end.x, end.y], [end.x, end.y - LINE_UP]], C.wood, 4)
        card(g, blob(end.x, end.y - LINE_UP, 10), C.wood, 2)
        g.fillStyle = C.line; g.beginPath(); g.arc(end.x, end.y - LINE_UP, 2.8, 0, 7); g.fill()
        // One peg hole near the rim, which goes round as the wheel turns.
        const angle = (turn / TURNS) * Math.PI * 2
        g.beginPath(); g.arc(end.x + 6 * Math.cos(angle), end.y - LINE_UP + 6 * Math.sin(angle), 1.7, 0, 7); g.fill()
      }
      break
    }
    case 'swing':
      // The line a seat hangs from on a span; on a rise it hangs from the upper peg, on a small wooden cleat. The seat is a card of its own, since it swings.
      if (span) ropeCurve(g, a.x, a.y - 6, (a.x + b.x) / 2, a.y + 6, b.x, b.y - 6)
      else card(g, round(b.x - 9, b.y - 8, 18, 12, 4), C.wood, 2)
      break
    case 'lanterns': {
      // A string with acorn lanterns on it.
      const sag = span ? 30 : 0, side = span ? 0 : -22
      const cx = (a.x + b.x) / 2 + side * 2, cy = (a.y + b.y) / 2 + sag * 2 - 8
      const count = Math.max(3, Math.round(length / 48))
      const lamp = (i: number): [number, number] => { const t = (i + 0.5) / count, u = 1 - t; return [u * u * a.x + 2 * u * t * cx + t * t * b.x, u * u * (a.y - 8) + 2 * u * t * cy + t * t * (b.y - 8)] }
      if (lit) for (let i = 0; i < count; i++) { const [x, y] = lamp(i); halo(g, x, y + 20, 40) }
      ropeCurve(g, a.x, a.y - 8, cx, cy, b.x, b.y - 8, 2.4)
      for (let i = 0; i < count; i++) {
        const [x, y] = lamp(i)
        line(g, [[x, y], [x, y + 8]], C.line, 2)
        card(g, blob(x, y + 20, 10, 12), lit ? '#fff3b0' : C.lamp, 2)
        if (lit) { blob(x, y + 21, 5, 7)(g); g.fillStyle = '#ffffff'; g.fill() }
        card(g, poly([[x - 11, y + 12], [x + 11, y + 12], [x + 6, y + 5], [x - 6, y + 5]]), C.wood, 1)
      }
      break
    }
    case 'slide': {
      // A long curl of bark: a chute on a rise, a level trough on a span.
      const bow = span ? 10 : 34
      const cx = (a.x + b.x) / 2 - nx * bow + (span ? 0 : (a.x - b.x) * 0.3), cy = (a.y + b.y) / 2 + (span ? bow : 26)
      const deep = icon ? 4 : 0
      const shape = (g2: G): void => {
        g2.beginPath()
        g2.moveTo(a.x - nx * 2, a.y - ny * 2 - 8 - deep)
        g2.quadraticCurveTo(cx, cy - 8 - deep, b.x, b.y - 10 - deep)
        g2.lineTo(b.x + nx * 6, b.y + ny * 6 + 8 + deep)
        g2.quadraticCurveTo(cx + nx * 6, cy + 12 + deep, a.x, a.y + 8 + deep)
        g2.closePath()
      }
      if (icon) { shape(g); g.strokeStyle = C.line; g.lineWidth = 5; g.lineJoin = 'round'; g.stroke() }
      card(g, shape, C.bark)
      curve(g, a.x, a.y - 5, cx, cy - 5, b.x, b.y - 7, C.wood, 4)
      break
    }
  }
}

const boxOf = (a: Pt, b: Pt): { x: number; y: number; w: number; h: number } => {
  const x = Math.min(a.x, b.x) - 60, y = Math.min(a.y, b.y) - LINE_UP - 22
  return { x, y, w: Math.abs(b.x - a.x) + 120, h: Math.abs(b.y - a.y) + LINE_UP + 22 + 130 }
}

/** A piece in a place of the tree, drawn where it stands on the stage. `lit` is a string of lanterns burning. */
export function pieceSprite(kind: Kind, place: number, lit = false, turn = 0, ripple = -1): SpriteDef {
  const { pa, pb } = PLACES[place]
  return { ...boxOf(pa, pb), draw: (g) => drawPiece(g, kind, pa, pb, false, lit, turn, ripple) }
}

/** The seat of a swing on its two ropes, from the pin it hangs from. */
function drawSeat(g: G, pin: Pt, seat: Pt, spread: number): void {
  rope(g, [[pin.x - spread, pin.y], [seat.x - 16, seat.y]], 2.4)
  rope(g, [[pin.x + spread, pin.y], [seat.x + 16, seat.y]], 2.4)
  card(g, round(seat.x - 24, seat.y - 4, 48, 9, 3), C.wood)
}

/** The seat of the swing in a place, drawn where it hangs at rest on the stage. The frame turns it about its pin. */
export function seatSprite(place: number): SpriteDef {
  const { pin, seat } = seatOf(place)
  const span = PLACES[place].fit === 'span'
  const x = Math.min(pin.x, seat.x) - 34, y = Math.min(pin.y, seat.y) - 8
  return { x, y, w: Math.abs(pin.x - seat.x) + 68, h: Math.abs(pin.y - seat.y) + 26, draw: (g) => drawSeat(g, pin, seat, span ? 12 : 0) }
}

/** The bucket's cup, drawn from the point where its rope meets the line it runs on. */
function drawCup(g: G, ropes: boolean, tub: boolean): void {
  const rim = LINE_UP + CUP.rim, bottom = LINE_UP + CUP.bottom
  if (ropes) rope(g, [[-CUP.top / 2 + 3, rim + 2], [0, 0], [CUP.top / 2 - 3, rim + 2]], 2.2)
  if (!tub) return
  card(g, poly([[-CUP.top / 2, rim], [CUP.top / 2, rim], [CUP.foot / 2, bottom], [-CUP.foot / 2, bottom]]), C.wood)
  line(g, [[-CUP.top / 2 + 1, rim + 8], [CUP.top / 2 - 1, rim + 8]], C.woodDark, 2.4)
  line(g, [[-CUP.foot / 2 - 1, bottom - 9], [CUP.foot / 2 + 1, bottom - 9]], C.woodDark, 2.4)
}

const CUP_BOX = { x: -CUP.top / 2 - 8, y: -6, w: CUP.top + 18, h: LINE_UP + CUP.bottom + 16 }
/** An empty cup is one card. With someone in it, its ropes go up behind the rider and its tub is in front. */
export const cupSprite: SpriteDef = { ...CUP_BOX, draw: (g) => drawCup(g, true, true) }
export const cupRopeSprite: SpriteDef = { ...CUP_BOX, draw: (g) => drawCup(g, true, false) }
export const cupTubSprite: SpriteDef = { ...CUP_BOX, draw: (g) => drawCup(g, false, true) }

/** A piece as it lies in the basket and hangs from the finger: fitted its own way, between two ends a hand apart. */
export function iconSprite(kind: Kind): SpriteDef {
  const [a, b]: [Pt, Pt] = OWN_FIT[kind] === 'rise' ? [{ x: -22, y: 46 }, { x: 22, y: -46 }] : [{ x: -52, y: kind === 'plank' ? 0 : -16 }, { x: 52, y: kind === 'plank' ? 0 : -16 }]
  return {
    x: -72, y: -72, w: 144, h: 144,
    draw: (g) => {
      if (kind === 'bucket') {
        // In the basket the bucket is its cup on its rope, with the wheel it runs on.
        line(g, [[0, -52], [0, -40]], C.line, 5)
        card(g, blob(0, -52, 10), C.wood, 2)
        g.fillStyle = C.line; g.beginPath(); g.arc(0, -52, 2.8, 0, 7); g.fill()
        g.save(); g.translate(0, -40); drawCup(g, true, true); g.restore()
        return
      }
      drawPiece(g, kind, a, b, true)
      if (kind === 'swing') drawSeat(g, { x: 0, y: -12 }, { x: 0, y: -12 + SEAT_DROP * 0.8 }, 12)
    },
  }
}
