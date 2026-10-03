// The eight guests, each its own creature in silhouette with its one want in
// plain sight, drawn stiff and deadpan in its own units with the origin
// between its feet (or, for one sitting up in bed, on the floor under it).
// Each is drawn facing left where it has a side; the page mirrors it. The spot
// colour lies flat on the body or on the one thing the guest is known by.

import type { GuestId } from './guests'
import { cook, fly, lizard, singer } from './inkGuestsB'
import { PAPER, SPOT, type Pen } from './inkHatch'
import { bag, bedclothes, glance, legs, open, shut } from './inkParts'
import type { InkMood, InkSide } from './inkScene'

export type Pose = {
  awake: boolean
  mood: InkMood
  turnedTo: InkSide | null
  wrapped: boolean
  /** Standing in the lobby with its bag at its feet. */
  bag: boolean
  /** Up and out of any room: in the lobby, on the bench or in the child's hand. */
  out?: boolean
  /** Sitting on the bench. */
  seated?: boolean
  /** Staring up at the door of the room it wants. */
  stares?: boolean
  /** The side it looks toward for a moment, in the figure's own terms: `left` is the way it is drawn facing. */
  looks?: InkSide | null
  /** Which of the figure's two drawings this is: the line boils between them, and the troll's cheeks pump. */
  frame: number
}

/** The box every guest is drawn in, and where its origin lies in it. */
export const GUEST_BOX = { w: 210, h: 204, ox: 105, oy: 190 }

/**
 * Which way each figure is drawn facing, so the page can turn it to a wall or toward the middle of its room, and
 * how far its bulk lies off its feet (the cook's cauldron stands behind it).
 */
export const STANCE: Record<GuestId, { faces: 'left' | 'right' | 'front'; shift: number }> = {
  troll: { faces: 'right', shift: 0 },
  bat: { faces: 'left', shift: 0 },
  blob: { faces: 'left', shift: 0 },
  yeti: { faces: 'front', shift: 0 },
  lizard: { faces: 'left', shift: 0 },
  cook: { faces: 'left', shift: -22 },
  fly: { faces: 'left', shift: 0 },
  singer: { faces: 'front', shift: 0 },
}

/** How the page stands a guest in its room: on the floor, or sitting up in the bed. */
export function restsInBed(id: GuestId, pose: Pose): boolean {
  return !pose.awake && !pose.bag && !pose.out && (id === 'lizard' || id === 'blob')
}

/** How tall each figure stands, from its feet to the top of its head: where a finger holds it when it is carried. */
export const TOP: Record<GuestId, number> = { troll: 152, bat: 136, blob: 102, yeti: 146, lizard: 140, cook: 140, fly: 124, singer: 124 }

/** Where the troll's noise leaves the tuba, from its feet, for the marks the page draws. */
export const TUBA_BELL = { x: 60, y: -148 }

/** Where the string of the yeti's cloud is tied, from its feet. */
export const YETI_WRIST = { x: 44, y: -58 }

// The troll with the tuba: a slab of hair on two short legs, front on, lips to the mouthpiece.
function troll(pen: Pen, pose: Pose): void {
  const sulks = pose.mood === 'cross'
  const puff = pose.awake && !sulks ? (pose.frame % 2 ? 10 : 7) : 4
  // Turned up or down to where a trouble comes from, its eyes go there; a knock takes them for a moment.
  const [lookX, lookY] = glance(pose.looks ?? (pose.turnedTo === 'up' || pose.turnedTo === 'down' ? pose.turnedTo : null))
  for (const side of [-1, 1]) {
    pen.shape([side * 8, -2, side * 9, -38, side * 32, -38, side * 31, -2], { fill: PAPER, tone: 2, angle: 1.2, w: 1.6 })
    // Happier, it keeps time with one foot: the toes come up on the beat and two short strokes mark where they left.
    const tap = side === 1 && pose.mood === 'happier' && pose.frame % 2 === 1 ? 9 : 0
    pen.shape([side * 4, 0, side * 6, -8, side * 22, -11 - tap * 0.6, side * 38, -7 - tap, side * 40, -tap], { fill: PAPER, w: 1.6 })
    for (const toe of [14, 23, 31]) pen.line([side * toe, -8 - tap * (toe / 40), side * (toe + 1), -1 - tap * (toe / 40)], 0.8)
    if (side === 1 && pose.mood === 'happier') { pen.line([44, -3, 50, -5], 1.2); pen.line([44, 2, 51, 2], 1.2) }
  }
  // The body, hairy all over, so hatched; the hair hangs in a fringe at the hem.
  const body = [-38, -34, -50, -64, -46, -100, -30, -122, 0, -128, 30, -122, 46, -100, 50, -64, 38, -34, 20, -28, 0, -32, -20, -28]
  pen.shape(body, { fill: PAPER, tone: 2, angle: 1.35, w: 1.9 })
  pen.tone([-50, -64, -46, -100, -34, -118, -30, -70, -34, -36], 3, 1.2)
  for (let x = -34; x <= 34; x += 7) pen.line([x, -34 - (Math.abs(x) % 5), x + 1.5, -24 - (Math.abs(x) % 4)], 1)
  // The tuba, held upright against one side: the bottom bow under the arm, the valves at the chest, the wide
  // tube rising to a bell over the shoulder, and the leadpipe up to the lips.
  const brass = pose.wrapped ? PAPER : SPOT
  pen.tube([60, -74, 56, -48, 36, -36, 14, -44, 8, -64, 10, -86, 3, -99], 13, brass, 1.6)
  pen.tube([18, -62, 26, -52, 40, -54, 46, -66], 5, brass, 1.3)
  const horn = [36, -150, 84, -140, 70, -108, 67, -70, 51, -72, 50, -112]
  pen.shape(horn, { fill: brass, w: 1.9 })
  pen.line([58, -76, 59, -108, 66, -136], 0.8)
  pen.ellipse(TUBA_BELL.x, TUBA_BELL.y + 3, 27, 9.5, { fill: PAPER, tone: 4, angle: 0.3, w: 1.9 }, 0.2)
  for (const x of [20, 29, 38]) {
    pen.rect(x - 3, -90, 6, 20, { fill: PAPER, w: 1.2 })
    pen.ellipse(x, -92, 4.2, 2.2, { fill: PAPER, w: 1.2 })
  }
  // One arm across to the valves, one hand round the wide tube.
  pen.tube([-44, -98, -30, -78, 8, -76], 11, PAPER, 1.5)
  pen.ellipse(15, -77, 8, 7, { fill: PAPER, w: 1.5 })
  pen.ellipse(62, -92, 8.5, 6.5, { fill: PAPER, w: 1.5 })
  pen.line([57, -94, 57, -89], 0.8)
  pen.line([62, -95, 62, -90], 0.8)
  // The head: no neck, ears out, a tuft, two small eyes close over a great nose, cheeks full of air.
  for (const side of [-1, 1]) pen.shape([side * 24, -128, side * 40, -142, side * 44, -128, side * 34, -118], { fill: PAPER, tone: 1, w: 1.5 })
  pen.shape([-28, -112, -30, -130, -18, -146, 0, -150, 18, -146, 30, -130, 28, -112, 14, -100, -14, -100], { fill: PAPER, w: 1.8 })
  pen.tone([-28, -126, -18, -146, 0, -150, 18, -146, 28, -126, 16, -137, 0, -139, -16, -137], 3, 1.4, false)
  for (const [x, lean] of [[-8, -4], [-2, -1], [4, 3], [9, 6]] as const) pen.line([x, -148, x + lean, -160 - (x % 3)], 1.3)
  // The cheeks hang low, either side of the mouth, and swell past the jaw when they fill.
  for (const side of [-1, 1]) {
    pen.shape([side * 4, -100, side * 6, -110, side * (10 + puff), -113, side * (16 + puff * 1.5), -106, side * (12 + puff * 1.3), -96, side * 8, -94], { fill: PAPER, w: 1.6 })
    pen.line([side * (11 + puff), -109, side * (13 + puff * 1.2), -104], 0.7)
  }
  pen.shape([-8, -113, -9, -125, 0, -131, 9, -125, 8, -113, 0, -108], { fill: PAPER, tone: 1, angle: 1.2, w: 1.6 })
  if (pose.awake || pose.looks) { pen.dot(-9 + lookX * 3.2, -132 + lookY * 2.4, 1.9); pen.dot(9 + lookX * 3.2, -132 + lookY * 2.4, 1.9) } else { shut(pen, -10, -132, 4); shut(pen, 10, -132, 4) }
  // The brows: level and heavy, and one goes up when something makes it look round.
  pen.line([-18, -137 - (lookX < 0 || lookY < 0 ? 3 : 0) - (sulks ? 4 : 0), -5, -135 + (sulks ? 2 : 0)], sulks ? 3.4 : 2.4)
  pen.line([5, -135 + (sulks ? 2 : 0), 18, -137 - (lookX > 0 || lookY < 0 ? 3 : 0) - (sulks ? 4 : 0)], sulks ? 3.4 : 2.4)
  // Cross, it will not play: a small black scribble stands over its head.
  if (sulks) pen.line([-10, -170, 2, -176, 10, -168, -2, -164, -8, -172, 6, -174, 8, -166, -4, -168, 0, -172], 1.8)
  // Asleep, it sleeps like a log, on its feet, with the tuba for a pillow: a nightcap is all the difference.
  if (!pose.awake) {
    pen.shape([-22, -146, -12, -160, 6, -164, 26, -158, 38, -146, 44, -134, 38, -132, 22, -146, 0, -150], { fill: PAPER, w: 1.6 })
    for (const x of [-10, 2, 14]) pen.line([x, -150, x + 3, -160], 0.8)
    pen.ellipse(42, -130, 4, 4, { fill: PAPER, w: 1.4 })
  }
  if (sulks) pen.line([-6, -101, 6, -101], 1.8)
  else {
    pen.ellipse(1, -102, 5, 4, { fill: PAPER, w: 1.6 })
    pen.ellipse(2, -100, 3.2, 2.4, { fill: brass, w: 1.1 })
  }
}

// The bat: a dark cloak of wing, ears as long as its head, the eye mask pushed up on its forehead.
function bat(pen: Pen, pose: Pose): void {
  if (pose.bag) bag(pen, 40)
  for (const side of [-1, 1]) {
    for (const toe of [-4, 0, 4]) pen.line([side * 8, -6, side * 8 + toe, 0], 1.4, true)
    pen.shape([side * 14, -78, side * 23, -88, side * 30, -88, side * 30, -74, side * 25, -62], { fill: PAPER, tone: 4, angle: 1.2, w: 1.7 })
    pen.line([side * 30, -88, side * 34, -93, side * 31, -96], 1.5)
  }
  // Cross, it wraps itself tighter: the cloak pulled narrow and crossed over in front.
  const tight = pose.mood === 'cross' ? 0.72 : 1
  const cloak = [-19, -80, -27 * tight, -44, -24 * tight, -6, -16 * tight, -14, -8 * tight, -5, 0, -13, 8 * tight, -5, 16 * tight, -14, 24 * tight, -6, 27 * tight, -44, 19, -80, 0, -86]
  pen.shape(cloak, { fill: PAPER, tone: 4, angle: 1.2, w: 1.9 })
  pen.tone(cloak, 2, 0.2, false)
  if (tight < 1) { pen.line([-17, -74, 6, -40, 10, -12], 2.4, false, PAPER); pen.line([17, -74, -6, -46, -10, -14], 2.4, false, PAPER) }
  else for (const x of [-13, 0, 13]) pen.line([x * 0.4, -78, x * 1.1, -12], 2.2, false, PAPER)
  // The head, tipped back to stare up at a door when it stands in the lobby.
  const g = pen.ctx
  g.save()
  g.translate(0, -82)
  const [batX, batY] = glance(pose.looks)
  const up = pose.mood === 'happier', flat = pose.mood === 'cross'
  g.rotate(pose.looks ? batX * 0.2 : pose.stares || pose.turnedTo === 'up' ? -0.42 : pose.turnedTo === 'down' ? 0.36 : 0)
  for (const side of [-1, 1]) {
    // Happier, its ears go straight up, and longer than you would think.
    if (up) {
      pen.shape([side * 4, -20, side * 5, -48, side * 9, -70, side * 16, -46, side * 16, -18], { fill: PAPER, tone: 3, angle: 1.3, w: 1.7 })
      pen.shape([side * 8, -22, side * 8, -44, side * 10, -58, side * 13, -42, side * 13, -22], { fill: PAPER, w: 0.9 })
    } else if (flat) {
      // Cross, its ears lie flat back, to hear less.
      pen.shape([side * 8, -22, side * 20, -30, side * 38, -28, side * 30, -18, side * 16, -14], { fill: PAPER, tone: 3, angle: 1.3, w: 1.7 })
    } else {
      pen.shape([side * 5, -20, side * 9, -44, side * 17, -58, side * 22, -40, side * 17, -18], { fill: PAPER, tone: 3, angle: 1.3, w: 1.7 })
      pen.shape([side * 9, -22, side * 12, -40, side * 16, -49, side * 18, -38, side * 15, -22], { fill: PAPER, w: 0.9 })
    }
  }
  pen.ellipse(0, -13, 17, 14, { fill: PAPER, tone: 2, angle: 1.3, w: 1.8 })
  // The mask: up on its forehead while it is awake, down over its eyes to sleep.
  const down = pose.awake ? 0 : 9
  pen.line([-17, -18 + down, -11, -24 + down], 1.4)
  pen.line([17, -18 + down, 11, -24 + down], 1.4)
  pen.ellipse(-2, -7, 6.5, 5, { fill: PAPER, w: 1.3 })
  pen.dot(-4, -9.5, 1.5)
  pen.shape([-5, -3, -4, 1, -3, -3], { fill: PAPER, w: 0.8, sharp: true })
  pen.shape([0, -3, 1, 1, 2, -3], { fill: PAPER, w: 0.8, sharp: true })
  if (pose.awake) { const ex = pose.looks ? batX * 0.9 : pose.stares ? -0.5 : -0.3, ey = pose.looks ? batY * 0.9 : pose.stares ? -0.8 : 0; open(pen, -9, -13.5, 4.2, ex, ey); open(pen, 6.5, -14, 4.2, ex, ey) }
  pen.shape([-15, -22 + down, -14, -29 + down, -8, -32 + down, 0, -31 + down, 8, -32 + down, 14, -29 + down, 15, -22 + down, 9, -18 + down, 3, -19 + down, 0, -21 + down, -3, -19 + down, -9, -18 + down], { fill: SPOT, w: 1.6 })
  pen.line([-10, -26 + down, -7, -24 + down, -4, -26 + down], 1)
  pen.line([4, -26 + down, 7, -24 + down, 10, -26 + down], 1)
  // Asleep and disturbed, or knocked at: one corner of the mask is lifted and one eye looks out from under it.
  if (!pose.awake && (flat || pose.looks)) {
    const side = batX > 0 ? 1 : -1
    pen.shape([side * 2, -20, side * 4, -11, side * 15, -9, side * 16, -17, side * 12, -22], { fill: PAPER, w: 1.2 })
    open(pen, side * 9, -14, 3.8, pose.looks ? batX * 0.9 : -0.6, pose.looks ? batY * 0.9 : 0)
    pen.line([side * 3, -22, side * 15, -19], 2.2)
  }
  g.restore()
}

// The blob in pyjamas: a striped mound sitting up in bed. Cross, it has the pillow dragged down over all of its eyes.
function blob(pen: Pen, pose: Pose): void {
  const cross = pose.mood === 'cross'
  const inBed = restsInBed('blob', pose)
  const [lookX, lookY] = glance(pose.looks)
  const g = pen.ctx
  g.save()
  if (!inBed) {
    // Up and about: two pyjama legs and slippers, and the mound comes down onto them.
    legs(pen, 15, -34, SPOT)
    g.translate(0, 8)
  }
  const body = [-34, -40, -41, -64, -36, -90, -20, -106, 4, -110, 24, -102, 34, -84, 37, -60, 32, -40]
  pen.shape(body, { fill: PAPER, w: 0 })
  pen.inside(body, false, () => {
    for (let x = -38; x < 40; x += 17) pen.shape([x, -36, x - 3, -74, x + 2, -114, x + 10, -114, x + 6, -74, x + 9, -36], { fill: SPOT, w: 0.9 })
  })
  pen.shape(body, { w: 1.9 })
  for (const y of [-58, -70, -82]) pen.ellipse(-26, y, 2.2, 2.2, { fill: PAPER, w: 1.1 })
  pen.line([-34, -92, -24, -86, -16, -94], 1.2)
  if (!cross) {
    // Content: its eyes, of which there are many, and the pillow hugged to its front.
    const eyes = [[-20, -96], [-8, -100], [5, -99], [17, -93], [-14, -86], [0, -88], [12, -83]] as const
    // Happier, every one of its eyes is open, and wide. Asleep, a knock opens the two nearest it.
    const wide = pose.mood === 'happier'
    for (const [x, y] of eyes) {
      const roused = !!pose.looks && (lookX !== 0 ? x * lookX > 10 : y * lookY > -90 * lookY)
      if (pose.awake || wide || roused) open(pen, x, y, wide ? 4.3 : 3.4, pose.looks ? lookX * 0.9 : wide ? 0 : -0.5, pose.looks ? lookY * 0.9 : 0)
      else shut(pen, x, y, 3)
    }
    pen.line([-28, -76, -18, -75], 1.5)
    pen.shape([-48, -66, -46, -84, -24, -88, -4, -84, -4, -64, -26, -60], { fill: PAPER, tone: 1, angle: 0.2, w: 1.6 })
    pen.tube([24, -74, 4, -66, -8, -70], 9, SPOT, 1.4)
  } else {
    // Cross: both arms up, clamping the pillow down; a mouth like a pulled thread.
    pen.tube([-34, -74, -46, -92, -42, -112], 10, SPOT, 1.5)
    pen.tube([30, -78, 44, -94, 40, -114], 10, SPOT, 1.5)
    const pillow = [-50, -100, -44, -124, -24, -134, 6, -138, 34, -132, 46, -120, 46, -100, 32, -92, 2, -100, -30, -92]
    pen.shape(pillow, { fill: PAPER, w: 0 })
    pen.tone([-50, -100, -40, -108, 2, -112, 40, -106, 46, -100, 32, -92, 2, -100, -30, -92], 2, 0.2, false)
    pen.shape(pillow, { w: 1.9 })
    pen.line([-30, -124, -12, -118, -4, -126], 0.8)
    pen.line([14, -128, 26, -118], 0.8)
    for (const [x, y] of [[-42, -113], [40, -115]] as const) {
      pen.ellipse(x, y, 6.5, 5.5, { fill: PAPER, w: 1.4 })
      pen.line([x - 3, y - 1, x - 3, y + 4], 0.7)
      pen.line([x + 1, y - 1, x + 1, y + 4], 0.7)
    }
    pen.line([-33, -72, -29, -77, -24, -73, -19, -78, -14, -74], 1.7)
    pen.line([-36, -84, -26, -87], 2.2)
    // A knock: one eye comes out from under the pillow to see.
    if (pose.looks) open(pen, lookX > 0 ? 14 : -8, -88, 3.6, lookX * 0.9, lookY * 0.9)
  }
  g.restore()
  if (inBed) bedclothes(pen)
}

// The yeti: all white shag with a face, hands and feet, bolt upright in a hard chair.
function yeti(pen: Pen, pose: Pose): void {
  // The chair behind it, which it does not bring to the bench.
  if (!pose.seated) {
    for (const side of [-1, 1]) {
      pen.tube([side * 36, -132, side * 37, 0], 4, PAPER, 1.2, true)
      pen.ellipse(side * 36, -135, 3.6, 3.6, { fill: PAPER, w: 1.2 })
    }
    pen.rect(-36, -126, 72, 8, { fill: PAPER, tone: 2, angle: 0, w: 1.3 })
    pen.line([-37, -18, 37, -18], 1.3, true)
  }
  /** A shaggy outline: the points pushed out and in by turns. */
  const shag = (pts: number[], depth: number): number[] => {
    const out: number[] = [], n = pts.length / 2
    let cx = 0, cy = 0
    for (let i = 0; i < n; i++) { cx += pts[2 * i]! / n; cy += pts[2 * i + 1]! / n }
    for (let i = 0; i < n; i++) {
      const x1 = pts[2 * i]!, y1 = pts[2 * i + 1]!, x2 = pts[2 * ((i + 1) % n)]!, y2 = pts[2 * ((i + 1) % n) + 1]!
      const steps = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / 7))
      for (let k = 0; k < steps; k++) {
        const x = x1 + ((x2 - x1) * k) / steps, y = y1 + ((y2 - y1) * k) / steps
        const d = Math.hypot(x - cx, y - cy) || 1, push = k % 2 ? depth : -depth * 0.2
        out.push(x + ((x - cx) / d) * push + (y - cy) / d * 1.5, y + ((y - cy) / d) * push + 2)
      }
    }
    return out
  }
  const melts = pose.mood === 'cross', perky = pose.mood === 'happier'
  const [lookX, lookY] = glance(pose.looks ?? (pose.turnedTo === 'up' || pose.turnedTo === 'down' ? pose.turnedTo : null))
  const g = pen.ctx
  // Too warm, it sags toward a puddle: a pool spreads under the chair, and all of it is wider and lower than it was.
  if (melts) {
    pen.shape([-70, -1, -58, -7, -30, -4, 0, -8, 34, -4, 60, -8, 74, -1, 50, 3, 0, 4, -48, 3], { fill: PAPER, tone: 1, angle: 0, w: 1.5 })
    pen.line([-40, -1, -22, 0], 0.8)
    pen.line([18, 0, 44, -1], 0.8)
  }
  g.save()
  if (melts) g.transform(1.16, 0, 0, 0.8, 0, 0)
  // Shins and the great feet. Happier, the toes of both stand straight up.
  for (const side of [-1, 1]) {
    pen.shape(shag([side * 8, -46, side * 30, -46, side * 30, -8, side * 8, -8], 3), { fill: PAPER, w: 1.5, sharp: true })
    if (perky) {
      pen.shape([side * 6, 0, side * 7, -12, side * 14, -24, side * 26, -26, side * 32, -14, side * 31, 0], { fill: SPOT, w: 1.7 })
      for (const toe of [12, 19, 26]) pen.line([side * toe, -24, side * toe, -17], 0.9)
    } else {
      pen.shape([side * 4, 0, side * 6, -9, side * 20, -12, side * 36, -8, side * 39, 0], { fill: SPOT, w: 1.7 })
      for (const toe of [15, 23, 30]) pen.line([side * toe, -9, side * (toe + 1), -2], 0.9)
    }
  }
  const body = shag([-36, -42, -42, -80, -36, -116, -20, -138, 0, -144, 20, -138, 36, -116, 42, -80, 36, -42], 4.5)
  pen.shape(body, { fill: PAPER, w: 1.7, sharp: true })
  for (const [x, y] of [[-24, -70], [-12, -58], [6, -64], [22, -74], [-18, -92], [16, -94], [0, -78], [-28, -52], [26, -54]] as const) {
    pen.line([x - 3, y - 5, x, y + 3], 0.9)
    pen.line([x + 3, y - 4, x + 5, y + 4], 0.9)
  }
  // Arms down to the knees; the cloud's string is tied to one wrist.
  for (const side of [-1, 1]) {
    pen.shape(shag([side * 34, -108, side * 48, -100, side * 50, -62, side * 36, -62], 3), { fill: PAPER, w: 1.5, sharp: true })
    pen.ellipse(side * 43, -56, 8.5, 7.5, { fill: SPOT, w: 1.6 })
    pen.line([side * 39, -54, side * 39, -50], 0.8)
    pen.line([side * 44, -53, side * 44, -49], 0.8)
  }
  // The face, which goes where it is looking: the whole plate of it slides in the fur.
  g.save()
  g.translate(lookX * 5, lookY * 5)
  pen.shape([-15, -112, -13, -126, 0, -131, 13, -126, 15, -112, 8, -100, 0, -97, -8, -100], { fill: SPOT, w: 1.7 })
  if (pose.awake || pose.looks) { pen.dot(-6 + lookX * 2, -117 + lookY * 1.5, 1.8); pen.dot(6 + lookX * 2, -117 + lookY * 1.5, 1.8) } else { shut(pen, -6.5, -117, 3.6); shut(pen, 6.5, -117, 3.6) }
  pen.dot(-2, -110, 0.9)
  pen.dot(2, -110, 0.9)
  pen.line([-5, -104, 5, -104], 1.5)
  if (melts) { pen.line([-13, -122, -4, -120], 2); pen.line([4, -120, 13, -122], 2) }
  g.restore()
  for (let x = -14; x <= 14; x += 5.5) pen.line([x, -134, x + 1.5, -127 + (Math.abs(x) > 8 ? 3 : 0)], 1)
  g.restore()
  // Melting, it drips: beads run off its elbows and its chin.
  if (melts) for (const [x, y, len] of [[-58, -52, 16], [56, -56, 20], [-20, -34, 14], [24, -30, 18], [0, -76, 9]] as const) {
    pen.line([x, y, x + 0.6, y + len], 1.2, true)
    pen.ellipse(x + 0.6, y + len + 2.4, 2.2, 2.8, { fill: PAPER, w: 1.1 })
  }
}

/** How wide a guest rolled in the quilt is, from its middle to its side. */
const ROLL: Record<GuestId, number> = { troll: 40, bat: 24, blob: 36, yeti: 38, lizard: 23, cook: 34, fly: 27, singer: 24 }

/**
 * A guest wrapped in the quilt: rolled head to foot like a bolster and tied
 * with cord, with only its eyes showing, its feet, and the one thing it is
 * known by poking out. It makes no sound in there.
 */
function wrapped(pen: Pen, id: GuestId, pose: Pose): void {
  const inBed = restsInBed(id, pose)
  // However short the guest, the roll is tall enough to be a roll.
  const half = ROLL[id], foot = inBed ? -40 : -7, top = Math.min(foot - 84, -(TOP[id] - (id === 'bat' ? 34 : id === 'troll' ? 22 : 12)))
  const tall = foot - top, eyesAt = top + tall * 0.24
  const [lookX, lookY] = glance(pose.looks)
  const seeing = pose.awake || !!pose.looks
  // What pokes out behind or above the roll goes down first.
  if (id === 'troll') {
    pen.shape([4, top + 10, 12, top - 16, 40, top - 26, 46, top - 8, 30, top + 14], { fill: PAPER, tone: 2, angle: 0.4, w: 1.8 })
    pen.ellipse(27, top - 20, 20, 7.5, { fill: PAPER, tone: 4, angle: 0.3, w: 1.7 }, 0.2)
  } else if (id === 'bat') {
    for (const side of [-1, 1]) pen.shape([side * 4, top + 8, side * 8, top - 18, side * 15, top - 32, side * 19, top - 14, side * 15, top + 8], { fill: PAPER, tone: 3, angle: 1.3, w: 1.7 })
  } else if (id === 'blob') {
    pen.shape([-half - 4, top + 6, -half + 2, top - 14, 0, top - 20, half - 2, top - 14, half + 4, top + 6, 0, top + 12], { fill: PAPER, tone: 1, angle: 0.2, w: 1.8 })
  } else if (id === 'yeti') {
    for (let x = -half + 6; x <= half - 6; x += 9) pen.line([x, top + 6, x + (x % 2 ? 3 : -3), top - 9 - (Math.abs(x) % 5)], 1.3)
  } else if (id === 'lizard') {
    pen.tube([half - 6, foot - 6, half + 12, foot - 2, half + 20, foot - 14, half + 14, foot - 22], 5.5, PAPER, 1.4)
    for (const [x, y] of [[4, top - 4], [12, top + 4]] as const) pen.shape([x - 4, y + 4, x + 10, y - 4, x + 2, y + 12], { fill: PAPER, tone: 2, w: 1.3, sharp: true })
  } else if (id === 'cook') {
    pen.line([half + 6, foot - 10, half + 10, top - 12], 2.6, true)
    pen.ellipse(half + 11, top - 21, 6.5, 9, { fill: PAPER, tone: 1, w: 1.5 })
    pen.shape([-18, top + 8, -22, top - 14, -12, top - 30, 8, top - 34, 22, top - 24, 22, top - 8, 14, top + 8], { fill: PAPER, w: 1.8 })
    for (const x of [-10, 0, 10]) pen.line([x, top + 2, x + x * 0.3, top - 24], 0.8)
  } else if (id === 'fly') {
    for (const side of [-1, 1]) {
      pen.shape([side * (half - 6), top + 34, side * (half + 10), top + 10, side * (half + 26), top - 6, side * (half + 32), top + 12, side * (half + 20), top + 34, side * (half - 2), top + 50], { fill: PAPER, w: 1.5 })
      pen.line([side * (half + 2), top + 32, side * (half + 22), top + 6], 0.7)
    }
    pen.line([-5, top + 6, -9, top - 10, -15, top - 12], 1.2)
    pen.line([5, top + 6, 7, top - 11, 13, top - 14], 1.2)
  } else {
    pen.line([-6, top + 4, -14, top - 14, -26, top - 24, -34, top - 22], 1.3)
    for (let i = 0; i < 5; i++) pen.line([-10 - i * 4, top - 6 - i * 3.4, -15 - i * 4, top - 2 - i * 3.6], 0.8)
    pen.rect(-12, top - 3, 17, 8, { fill: PAPER, tone: 2, w: 1.5 })
  }
  // The feet, which is all there is to see of the rest of it.
  if (!inBed) for (const side of [-1, 1]) pen.shape([side * 3, 0, side * 4, -8, side * (half * 0.5), -10, side * (half * 0.9), -6, side * (half * 0.95), 0], { fill: PAPER, w: 1.5 })
  // The roll itself: quilted in diamonds, a turn of the edge showing down one side, a cord at the neck and at the ankles.
  const roll = [-half, foot - 4, -half - 2, foot - tall * 0.5, -half + 2, top + 8, -half * 0.5, top, half * 0.5, top, half - 2, top + 8, half + 2, foot - tall * 0.5, half, foot - 4, 0, foot]
  pen.shape(roll, { fill: SPOT, w: 0 })
  pen.inside(roll, false, () => {
    for (let k = -tall - half; k < half + tall; k += 12) {
      pen.line([k, top - 4, k + tall + 8, foot + 4], 0.9, true)
      pen.line([k + tall + 8, top - 4, k, foot + 4], 0.9, true)
    }
  })
  pen.shape(roll, { w: 1.9 })
  pen.line([half - 9, top + 6, half - 6, foot - tall * 0.5, half - 8, foot - 5], 1.3)
  for (const y of [top + tall * 0.4, foot - tall * 0.16]) {
    pen.line([-half - 2, y, 0, y + 3, half + 2, y], 3.4, false, PAPER)
    pen.line([-half - 2, y - 1.5, 0, y + 1.5, half + 2, y - 1.5], 0.9)
    pen.line([-half - 2, y + 1.5, 0, y + 4.5, half + 2, y + 1.5], 0.9)
    pen.line([half - 4, y + 2, half + 6, y + 9, half + 3, y + 15], 1.2)
  }
  // The gap it looks out of, and the eyes in it: as many and of such a kind as it has.
  const gap = id === 'blob' || id === 'fly' || id === 'troll' || id === 'yeti' || id === 'cook' ? half - 6 : half - 3
  pen.shape([-gap, eyesAt, -gap + 4, eyesAt - 9, gap - 4, eyesAt - 9, gap, eyesAt, gap - 4, eyesAt + 9, -gap + 4, eyesAt + 9], { fill: PAPER, w: 1.6 })
  const eye = (x: number, r: number) => { if (seeing) open(pen, x, eyesAt, r, lookX * 0.9, lookY * 0.9); else shut(pen, x, eyesAt, r) }
  if (id === 'blob') for (const x of [-20, -10, 0, 10, 20]) eye(x, 3.4)
  else if (id === 'fly') for (const x of [-10, 10]) pen.ellipse(x, eyesAt, 8, 7, { fill: PAPER, tone: 4, angle: 0.4, w: 1.5 })
  else if (id === 'lizard') { eye(-8, 4.2); pen.dot(-17, eyesAt + 3, 1) }
  else if (id === 'singer') for (const x of [-7, 7]) pen.ellipse(x + lookX * 1.5, eyesAt + lookY, 2.6, 3.2, { fill: PAPER, w: 1.4 })
  else { const apart = Math.min(11, half * 0.36); eye(-apart, 3.6); eye(apart, 3.6) }
  // It minds: the brows say so, and nothing else can.
  if (pose.mood === 'cross' && id !== 'fly') { pen.line([-gap + 3, eyesAt - 8, -3, eyesAt - 4], 2.2); pen.line([3, eyesAt - 4, gap - 3, eyesAt - 8], 2.2) }
  if (inBed) bedclothes(pen)
}

const FIGURES: Record<GuestId, (pen: Pen, pose: Pose) => void> = {
  troll, bat, blob, yeti, cook, fly, singer,
  lizard: (pen, pose) => lizard(pen, pose, restsInBed('lizard', pose)),
}

/** How high each figure reaches with everything on its head, and how much higher when it is happier (ears up, hat up). */
const REACH: Record<GuestId, readonly [number, number]> = { troll: [162, 0], bat: [142, 16], blob: [136, 0], yeti: [148, 0], lizard: [158, 6], cook: [148, 12], fly: [128, 8], singer: [130, 0] }

/** How wide each one's knees are under the rug, from its middle. */
const LAP: Record<GuestId, number> = { troll: 52, bat: 32, blob: 44, yeti: 46, lizard: 34, cook: 46, fly: 36, singer: 32 }

/** How tall a guest sitting on the bench may be: the bench stands in the street under the lobby, and nobody's head goes up through its floor. */
const SEATED = 120

/**
 * The travelling rug over the knees of a guest sitting on the bench: tucked
 * in at the seat, two knees under it, a fringe short of the ground. It is
 * what makes a stiff figure that cannot bend read as sitting down.
 */
function lapRug(pen: Pen, half: number): void {
  const rug = [-half - 4, -40, -half * 0.5, -47, -4, -42, half * 0.5, -47, half + 4, -40, half + 7, -22, half + 4, -6, -half - 4, -6, -half - 7, -22]
  pen.shape(rug, { fill: PAPER, tone: 2, angle: 0.5, w: 0 })
  pen.inside(rug, false, () => {
    // A plaid: a few broad bands each way.
    for (let x = -half; x <= half; x += half * 0.5) pen.tone([x - 3, -50, x + 3, -50, x + 3, 0, x - 3, 0], 4, 1.2)
    for (const y of [-34, -18]) pen.tone([-half - 8, y - 2.5, half + 8, y - 2.5, half + 8, y + 2.5, -half - 8, y + 2.5], 4, 0.2)
  })
  pen.shape(rug, { w: 1.8 })
  for (let x = -half - 2; x <= half + 2; x += 5) pen.line([x, -6, x + 0.6, -1], 1)
  // The toes of its two feet, out from under.
  for (const side of [-1, 1]) pen.shape([side * half * 0.2, 0, side * half * 0.24, -7, side * half * 0.6, -9, side * half * 0.86, -5, side * half * 0.9, 0], { fill: PAPER, w: 1.5 })
}

/** Draws one guest in the pose given. */
export function drawGuest(pen: Pen, id: GuestId, pose: Pose): void {
  const g = pen.ctx
  // On the bench it sits: as much lower as keeps it inside the bench's own place, with a rug over its knees.
  const sink = pose.seated ? Math.max(12, REACH[id][0] + (pose.mood === 'happier' ? REACH[id][1] : 0) - SEATED) : 0
  if (sink) {
    g.save()
    g.beginPath()
    g.rect(-GUEST_BOX.ox, -GUEST_BOX.oy, GUEST_BOX.w, GUEST_BOX.oy - 4)
    g.clip()
    g.translate(0, sink)
  }
  if (pose.wrapped) wrapped(pen, id, pose)
  else FIGURES[id](pen, pose)
  if (sink) {
    g.restore()
    lapRug(pen, LAP[id])
  }
}
