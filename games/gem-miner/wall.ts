import { BEASTS, HILL, LIFT, MOLEHILL } from './layout'
import { CHARCOAL, CLAY, DARK, RED, RED_DEEP, RED_PALE, ROCK, ROCK_DARK, ROCK_LIGHT, YELLOW, YELLOW_DEEP, blob, charcoal, fingerDots, oval, trail, type Paint, type Pigments, type Pt } from './pigment'
import { makeRng, type Rng } from './rng'
import { STAGE } from './stage'

// What stands still: the cave wall from edge to edge, the paintings on it
// above the hill, the grass line, the frame of the lift, and the shading
// that goes over the pigment afterwards. Painted once per resize.

/** What of the stage a surface shows: the stage itself and the wall past its edges. */
export type Bounds = { x: number; y: number; w: number; h: number }

/** The bare rock. */
export function paintRock(g: Paint, b: Bounds): void {
  const rng = makeRng(0x0c4e)
  const fill = g.createLinearGradient(0, b.y, 0, b.y + b.h)
  fill.addColorStop(0, '#cdb48d')
  fill.addColorStop(0.5, ROCK)
  fill.addColorStop(1, '#b89b76')
  g.fillStyle = fill
  g.fillRect(b.x, b.y, b.w, b.h)
  // Mottling: broad warm and cool patches, as limestone has.
  for (let i = 0; i < 90; i++) {
    const x = b.x + rng.next() * b.w, y = b.y + rng.next() * b.h, r = 50 + rng.next() * 170
    const tone = g.createRadialGradient(x, y, 0, x, y, r)
    const color = i % 3 === 0 ? '214, 190, 150' : i % 3 === 1 ? '150, 118, 84' : '196, 160, 112'
    tone.addColorStop(0, `rgba(${color}, ${0.1 + rng.next() * 0.1})`)
    tone.addColorStop(1, `rgba(${color}, 0)`)
    g.fillStyle = tone
    g.fillRect(x - r, y - r, r * 2, r * 2)
  }
  // Pits and grains.
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = i % 2 ? ROCK_DARK : ROCK_LIGHT
    g.globalAlpha = 0.1 + rng.next() * 0.22
    const s = 0.8 + rng.next() * 2.2
    g.fillRect(b.x + rng.next() * b.w, b.y + rng.next() * b.h, s, s)
  }
  g.globalAlpha = 1
  // Cracks, each with a lit lip beside it.
  for (let i = 0; i < 9; i++) {
    let x = b.x + rng.next() * b.w, y = b.y + rng.next() * b.h
    const points: Pt[] = [[x, y]]
    const lean = rng.next() * Math.PI * 2
    for (let n = 0; n < 7; n++) {
      x += Math.cos(lean + (rng.next() - 0.5) * 1.6) * (24 + rng.next() * 30)
      y += Math.sin(lean + (rng.next() - 0.5) * 1.6) * (24 + rng.next() * 30)
      points.push([x, y])
    }
    g.lineCap = 'round'
    g.strokeStyle = 'rgba(70, 48, 30, 0.34)'
    g.lineWidth = 1.6
    trail(g, points)
    g.stroke()
    g.strokeStyle = 'rgba(240, 225, 195, 0.3)'
    g.lineWidth = 1.2
    trail(g, points.map(([px, py]) => [px + 1.6, py + 1.8] as Pt))
    g.stroke()
  }
}

export type Horns = 'lyre' | 'antlers' | 'curled' | 'mane'
type BeastLook = { fill: string | null; line: string; horns: Horns }
/** How each of the three animals with a live head is painted, from left to right. */
const LIVE: readonly BeastLook[] = [{ fill: RED, line: CHARCOAL, horns: 'lyre' }, { fill: YELLOW, line: CHARCOAL, horns: 'mane' }, { fill: null, line: RED_DEEP, horns: 'antlers' }]
/** Where the neck of an animal is, from the ground under the middle of it. The head turns about it. */
export const NECK = { x: -46, y: -52 } as const

/** The head of an animal of the herd, with its horns, drawn with the neck at the origin. Faces left. */
function head(g: Paint, look: BeastLook): void {
  const shape: Pt[] = [[0, 0], [-12, -8], [-26, -2], [-34, 8], [-24, 14], [-10, 12]]
  if (look.fill) {
    g.fillStyle = look.fill
    g.globalAlpha = 0.86
    blob(g, shape)
    g.fill()
    g.globalAlpha = 1
  }
  charcoal(g, () => blob(g, shape), 2.4, look.line)
  if (look.horns === 'lyre') {
    charcoal(g, () => trail(g, [[-12, -8], [-20, -24], [-10, -36]]), 2.6, look.line)
    charcoal(g, () => trail(g, [[-6, -6], [-6, -22], [6, -32]]), 2.6, look.line)
  } else if (look.horns === 'curled') {
    charcoal(g, () => trail(g, [[-10, -8], [-2, -28], [16, -26], [18, -12]]), 2.6, look.line)
  } else if (look.horns === 'antlers') {
    charcoal(g, () => trail(g, [[-10, -8], [-12, -28], [-4, -46]]), 2.2, look.line)
    charcoal(g, () => trail(g, [[-12, -24], [-24, -32], [-26, -42]]), 2, look.line)
    charcoal(g, () => trail(g, [[-9, -34], [4, -40], [8, -50]]), 2, look.line)
    charcoal(g, () => trail(g, [[-4, -6], [2, -22], [16, -32]]), 2.2, look.line)
    charcoal(g, () => trail(g, [[4, -24], [14, -18], [22, -22]]), 2, look.line)
  } else {
    // No horns: two short ears.
    charcoal(g, () => trail(g, [[-8, -7], [-9, -17], [-3, -10]]), 2.2, look.line)
    charcoal(g, () => trail(g, [[-2, -5], [0, -15], [5, -7]]), 2.2, look.line)
  }
  g.fillStyle = look.line
  g.beginPath()
  g.arc(-20, 2, 1.8, 0, Math.PI * 2)
  g.fill()
}

/** The head of the `i`-th animal whose head is alive, as a picture of its own. */
export function paintBeastHead(g: Paint, i: number): void {
  head(g, LIVE[i])
}

/** One animal of the herd, as a cave painter draws it: a full body, a small head, legs thrown out at a run. Faces left. `withHead` is false for one whose head the view draws. */
function beast(g: Paint, rng: Rng, x: number, y: number, s: number, look: BeastLook, withHead: boolean): void {
  g.save()
  g.translate(x, y)
  g.scale(s, s)
  const body: Pt[] = [[48, -34], [30, -52], [0, -50], [-26, -58], [-44, -50], [-52, -34], [-44, -18], [-22, -14], [4, -12], [30, -14], [50, -20]]
  if (look.fill) {
    g.fillStyle = look.fill
    g.globalAlpha = 0.86
    blob(g, body)
    g.fill()
    g.globalAlpha = 1
  }
  charcoal(g, () => blob(g, body), 2.6, look.line)
  // Legs at a run: the front pair thrown forward, the hind pair back.
  const legs: Pt[][] = [[[-36, -18], [-46, -4], [-58, 6]], [[-24, -15], [-28, 0], [-38, 10]], [[30, -15], [38, -2], [52, 8]], [[40, -18], [52, -8], [64, 0]]]
  for (const leg of legs) charcoal(g, () => trail(g, leg), 3, look.line)
  charcoal(g, () => trail(g, [[50, -32], [62, -30], [66, -18]]), 2, look.line)
  if (look.horns === 'mane') {
    // A mane: bristles along the neck, each a different length.
    g.strokeStyle = look.line
    g.lineWidth = 2.2
    // Uneven in length, in lean and in the gaps between them, so they are hair and not a row of strokes.
    let x = -41
    for (let i = 0; i < 7 && x < -2; i++) {
      const long = 3 + rng.next() * 13, lean = -5 + rng.next() * 7
      g.beginPath()
      g.moveTo(x, -56 + Math.abs(x + 26) * 0.17)
      g.lineTo(x + lean, -58 - long)
      g.stroke()
      x += 2.6 + rng.next() * 8.5
    }
  }
  if (withHead) {
    g.translate(NECK.x, NECK.y)
    head(g, look)
  }
  g.restore()
}

/** A hand held to the wall and sprayed round: the hand stays bare rock. Drawn with its palm at the origin. */
export function paintHandSpray(g: Paint, rng: Rng, color: string, radius: number): void {
  for (let i = 0; i < 420; i++) {
    const a = rng.next() * Math.PI * 2, d = Math.sqrt(rng.next()) * radius
    g.globalAlpha = (0.1 + rng.next() * 0.3) * (1 - (d / radius) ** 2)
    g.fillStyle = color
    const s = 1 + rng.next() * 3.2
    g.beginPath()
    g.arc(Math.cos(a) * d, Math.sin(a) * d * 1.05 - 6, s, 0, Math.PI * 2)
    g.fill()
  }
  g.globalAlpha = 1
  g.globalCompositeOperation = 'destination-out'
  g.fillStyle = '#000'
  g.strokeStyle = '#000'
  g.lineCap = 'round'
  g.beginPath()
  g.ellipse(0, 4, 13, 15, 0, 0, Math.PI * 2)
  g.fill()
  g.lineWidth = 6.4
  for (const [dx, dy, lean] of [[-13, -4, -0.9], [-7, -12, -0.3], [0, -15, 0], [7, -13, 0.28], [13, -6, 0.62]] as const) {
    const length = lean === -0.9 ? 15 : 21
    g.beginPath()
    g.moveTo(dx, dy)
    g.lineTo(dx + Math.sin(lean) * length, dy - Math.cos(lean) * length)
    g.stroke()
  }
  g.globalCompositeOperation = 'source-over'
}

/** How large the three animals with live heads are painted, and the line they stand on. */
export const HERD = { scale: 0.86, y: 128 } as const

/**
 * The sprayed hands on the wall: where each is, its pigment and its turn. None lies in the top right corner, which
 * answers no finger of the child's: a finger on bare wall leaves a hand, and no finger there could have left one.
 */
export const SPRAYED: readonly (readonly [number, number, string, number])[] = [[505, 130, RED, -0.25], [612, 30, CLAY, 0.3], [806, 34, RED_DEEP, 0.1], [1150, 134, RED, -0.5]]
/** How far a sprayed hand reaches from its middle, the spray round it included. */
export const SPRAY_REACH = 55

/** The paintings on the wall above the hill, the grass line, the molehill and the frame of the lift. */
export function paintAbove(g: Paint, pigments: Pigments, b: Bounds): void {
  const rng = makeRng(0x5ca1)
  // The herd runs along the wall toward the lift. Three of them have heads the view draws, which turn.
  BEASTS.forEach((place, i) => beast(g, rng, place.x, HERD.y, HERD.scale, LIVE[i], false))
  beast(g, rng, 706, 58, 0.46, { fill: null, line: CHARCOAL, horns: 'curled' }, true)
  beast(g, rng, 908, 60, 0.5, { fill: RED_PALE, line: RED_DEEP, horns: 'mane' }, true)
  beast(g, rng, 1112, 66, 0.56, { fill: CHARCOAL, line: CHARCOAL, horns: 'curled' }, true)
  // Finger dots between them, as scattered as fingers leave them: no two the same size, and in no row.
  for (const [cx, cy, color] of [[520, 62, RED], [1090, 150, YELLOW_DEEP], [860, 150, RED_DEEP]] as const) {
    g.globalAlpha = 0.7
    fingerDots(g, rng, color, 5, cx - 24, cy - 18, 48, 36, 3.4)
  }
  g.globalAlpha = 1
  // Sprayed hands, each on a layer of its own so that the hand is cut out of the spray and not out of the wall.
  for (const [x, y, color, turn] of SPRAYED) {
    const hand = pigments.sprite(110, 110, 55, 55, (h) => paintHandSpray(h, rng, color, 50), 0)
    g.save()
    g.translate(x, y)
    g.rotate(turn)
    g.drawImage(hand.image, -hand.ax, -hand.ay, hand.w, hand.h)
    g.restore()
  }

  // The grass line: the top of the hill from edge to edge, in strokes of charcoal and yellow ochre.
  const top = HILL.y
  g.lineCap = 'round'
  for (let x = b.x; x < b.x + b.w; x += 5 + rng.next() * 5) {
    const h = 7 + rng.next() * 13
    g.strokeStyle = rng.next() < 0.6 ? YELLOW_DEEP : CHARCOAL
    g.globalAlpha = 0.55 + rng.next() * 0.4
    g.lineWidth = 1.6 + rng.next() * 1.4
    g.beginPath()
    g.moveTo(x, top + 2)
    g.quadraticCurveTo(x + (rng.next() - 0.5) * 6, top - h * 0.6, x + (rng.next() - 0.5) * 12, top - h)
    g.stroke()
  }
  g.globalAlpha = 1

  // The molehill at the mouth of the burrow.
  const mouth = MOLEHILL.x + MOLEHILL.w / 2, crest = MOLEHILL.y, foot = MOLEHILL.y + MOLEHILL.h
  g.fillStyle = RED
  blob(g, [[MOLEHILL.x, foot], [mouth - 34, top - 16], [mouth - 12, crest], [mouth + 14, crest + 1], [mouth + 36, top - 14], [MOLEHILL.x + MOLEHILL.w, foot]])
  g.fill()
  fingerDots(g, rng, RED_DEEP, 9, mouth - 34, top - 20, 68, 18, 2.6)
  g.fillStyle = DARK
  blob(g, oval(rng, mouth, top - 3, 24, 13, 0.12))
  g.fill()

  // The frame of the lift: two posts, a beam, a wheel, and the axle of the crank on the post nearer the mammoth.
  const left = LIFT.x + 16, right = LIFT.x + LIFT.w - 6, beam = LIFT.y + 22
  charcoal(g, () => trail(g, [[left - 2, top + 2], [left, 130], [left + 2, beam]]), 7)
  charcoal(g, () => trail(g, [[right + 2, top + 2], [right, 130], [right - 2, beam]]), 7)
  charcoal(g, () => trail(g, [[LIFT.x + 6, beam + 2], [(left + right) / 2, beam - 4], [LIFT.x + LIFT.w - 1, beam + 2]]), 7)
  charcoal(g, () => trail(g, [[left + 2, beam + 30], [left + 14, beam + 14], [left + 26, beam + 2]]), 4)
  charcoal(g, () => trail(g, [[right - 2, beam + 30], [right - 14, beam + 14], [right - 26, beam + 2]]), 4)
  const wheel = { x: (left + right) / 2, y: beam - 6 }
  g.fillStyle = YELLOW
  blob(g, oval(rng, wheel.x, wheel.y, 11, 11, 0.06))
  g.fill()
  charcoal(g, () => blob(g, oval(null, wheel.x, wheel.y, 11, 11)), 3)
  g.fillStyle = CHARCOAL
  g.beginPath()
  g.arc(wheel.x, wheel.y, 3.4, 0, Math.PI * 2)
  g.fill()
}

/** Where the lift's rope leaves its wheel, and where the crank's axle sits on the post. */
export const LIFT_ROPE = { x: LIFT.x + 16 + (LIFT.w - 22) / 2, y: LIFT.y + 27 } as const
export const CRANK = { x: LIFT.x + 16, y: 112 } as const

/**
 * The shading that goes over rock and pigment alike: the rock bulges, so the figures on it bulge with it, and the
 * low warm light leaves the edges of the wall dark.
 */
export function paintShade(g: Paint, b: Bounds): void {
  const rng = makeRng(0xb019)
  for (let i = 0; i < 46; i++) {
    const x = b.x + rng.next() * b.w, y = b.y + rng.next() * b.h, r = 70 + rng.next() * 150
    const lit = g.createRadialGradient(x - r * 0.3, y - r * 0.35, 0, x - r * 0.3, y - r * 0.35, r)
    lit.addColorStop(0, 'rgba(255, 236, 200, 0.13)')
    lit.addColorStop(1, 'rgba(255, 236, 200, 0)')
    g.fillStyle = lit
    g.fillRect(x - r * 1.4, y - r * 1.4, r * 2.8, r * 2.8)
    const shadow = g.createRadialGradient(x + r * 0.45, y + r * 0.5, r * 0.2, x + r * 0.45, y + r * 0.5, r)
    shadow.addColorStop(0, 'rgba(40, 22, 10, 0.15)')
    shadow.addColorStop(1, 'rgba(40, 22, 10, 0)')
    g.fillStyle = shadow
    g.fillRect(x - r, y - r, r * 2.8, r * 2.8)
  }
  const cx = STAGE.width / 2, cy = STAGE.height * 0.46
  const dark = g.createRadialGradient(cx, cy, 330, cx, cy, 860)
  dark.addColorStop(0, 'rgba(24, 12, 6, 0)')
  dark.addColorStop(0.55, 'rgba(24, 12, 6, 0.3)')
  dark.addColorStop(1, 'rgba(24, 12, 6, 0.78)')
  g.fillStyle = dark
  g.fillRect(b.x, b.y, b.w, b.h)
}
