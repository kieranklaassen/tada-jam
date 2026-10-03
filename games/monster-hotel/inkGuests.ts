// The eight guests, each its own creature in silhouette with its one want in
// plain sight, drawn stiff and deadpan in its own units with the origin
// between its feet (or, for one sitting up in bed, on the floor under it).
// Each is drawn facing left where it has a side; the page mirrors it. The spot
// colour lies flat on the body or on the one thing the guest is known by.

import type { GuestId } from './guests'
import { PAPER, SPOT, type Pen } from './inkHatch'
import type { InkMood, InkSide } from './inkScene'

export type Pose = {
  awake: boolean
  mood: InkMood
  turnedTo: InkSide | null
  wrapped: boolean
  /** Standing in the lobby or on the bench with its bag beside it. */
  bag: boolean
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
  return !pose.awake && !pose.bag && (id === 'lizard' || id === 'blob')
}

/** Where the troll's noise leaves the tuba, from its feet, for the marks the page draws. */
export const TUBA_BELL = { x: 60, y: -148 }

/** Where the string of the yeti's cloud is tied, from its feet. */
export const YETI_WRIST = { x: 44, y: -58 }

const shut = (pen: Pen, x: number, y: number, r: number) => pen.line([x - r, y - r * 0.2, x, y + r * 0.5, x + r, y - r * 0.2], 1.4)
const open = (pen: Pen, x: number, y: number, r: number, lookX = 0, lookY = 0) => {
  pen.ellipse(x, y, r, r, { fill: PAPER, w: 1.2 })
  pen.dot(x + lookX * r * 0.45, y + lookY * r * 0.45, r * 0.42)
}

/** The bedclothes a guest sits up out of: drawn over its lap, from its middle toward the foot of the bed on its left. */
function bedclothes(pen: Pen): void {
  pen.shape([-74, -44, -52, -52, -30, -55, -8, -50, 16, -52, 22, -44, 20, -32, 8, -27, -2, -32, -14, -26, -26, -32, -38, -26, -50, -32, -62, -26, -74, -30], { fill: PAPER, tone: 1, angle: -0.7, w: 1.4 })
  pen.line([-60, -42, -40, -47, -22, -47], 0.7)
  pen.line([-6, -44, 8, -46], 0.7)
}

/** A quilt wound round a guest's middle, for one that has been wrapped. */
function wrap(pen: Pen, top: number, bottom: number, half: number): void {
  const band = [-half, top + 4, 0, top, half, top + 4, half + 3, bottom - 4, 0, bottom, -half - 3, bottom - 4]
  pen.shape(band, { fill: SPOT, w: 0 })
  pen.inside(band, false, () => {
    for (let x = -half - 40; x < half + 40; x += 11) {
      pen.line([x, top - 4, x + (bottom - top), bottom + 4], 0.9, true)
      pen.line([x + (bottom - top), top - 4, x, bottom + 4], 0.9, true)
    }
  })
  pen.shape(band, { w: 1.7 })
}

/** A guest's bag, stood by its feet in the lobby. */
function bag(pen: Pen, x: number): void {
  pen.line([x - 7, -22, x - 5, -30, x + 5, -30, x + 7, -22], 1.5)
  pen.shape([x - 15, 0, x - 16, -18, x - 10, -24, x + 10, -24, x + 16, -18, x + 15, 0], { fill: SPOT, w: 1.7 })
  pen.line([x - 15, -15, x + 15, -15], 1, true)
  pen.rect(x - 3, -18, 6, 6, { fill: PAPER, w: 1 })
  pen.line([x - 9, -24, x - 9, 0], 0.8, true)
  pen.line([x + 9, -24, x + 9, 0], 0.8, true)
}

// The troll with the tuba: a slab of hair on two short legs, front on, lips to the mouthpiece.
function troll(pen: Pen, pose: Pose): void {
  const puff = pose.awake ? (pose.frame % 2 ? 10 : 7) : 4
  for (const side of [-1, 1]) {
    pen.shape([side * 8, -2, side * 9, -38, side * 32, -38, side * 31, -2], { fill: PAPER, tone: 2, angle: 1.2, w: 1.6 })
    pen.shape([side * 4, 0, side * 6, -8, side * 22, -11, side * 38, -7, side * 40, 0], { fill: PAPER, w: 1.6 })
    for (const toe of [14, 23, 31]) pen.line([side * toe, -8, side * (toe + 1), -1], 0.8)
  }
  // The body, hairy all over, so hatched; the hair hangs in a fringe at the hem.
  const body = [-38, -34, -50, -64, -46, -100, -30, -122, 0, -128, 30, -122, 46, -100, 50, -64, 38, -34, 20, -28, 0, -32, -20, -28]
  pen.shape(body, { fill: PAPER, tone: 2, angle: 1.35, w: 1.9 })
  pen.tone([-50, -64, -46, -100, -34, -118, -30, -70, -34, -36], 3, 1.2)
  for (let x = -34; x <= 34; x += 7) pen.line([x, -34 - (Math.abs(x) % 5), x + 1.5, -24 - (Math.abs(x) % 4)], 1)
  if (pose.wrapped) wrap(pen, -92, -44, 50)
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
  if (pose.awake) { pen.dot(-9, -132, 1.9); pen.dot(9, -132, 1.9) } else { shut(pen, -10, -132, 4); shut(pen, 10, -132, 4) }
  pen.line([-18, -137, -5, -135], 2.4)
  pen.line([5, -135, 18, -137], 2.4)
  pen.ellipse(1, -102, 5, 4, { fill: PAPER, w: 1.6 })
  pen.ellipse(2, -100, 3.2, 2.4, { fill: brass, w: 1.1 })
}

// The bat: a dark cloak of wing, ears as long as its head, the eye mask pushed up on its forehead.
function bat(pen: Pen, pose: Pose): void {
  if (pose.bag) bag(pen, 40)
  for (const side of [-1, 1]) {
    for (const toe of [-4, 0, 4]) pen.line([side * 8, -6, side * 8 + toe, 0], 1.4, true)
    pen.shape([side * 14, -78, side * 23, -88, side * 30, -88, side * 30, -74, side * 25, -62], { fill: PAPER, tone: 4, angle: 1.2, w: 1.7 })
    pen.line([side * 30, -88, side * 34, -93, side * 31, -96], 1.5)
  }
  const cloak = [-19, -80, -27, -44, -24, -6, -16, -14, -8, -5, 0, -13, 8, -5, 16, -14, 24, -6, 27, -44, 19, -80, 0, -86]
  pen.shape(cloak, { fill: PAPER, tone: 4, angle: 1.2, w: 1.9 })
  pen.tone(cloak, 2, 0.2, false)
  for (const x of [-13, 0, 13]) pen.line([x * 0.4, -78, x * 1.1, -12], 2.2, false, PAPER)
  if (pose.wrapped) wrap(pen, -70, -30, 27)
  // The head, tipped back to stare up at a door when it stands in the lobby.
  const g = pen.ctx
  g.save()
  g.translate(0, -82)
  g.rotate(pose.bag || pose.turnedTo === 'up' ? -0.42 : 0)
  for (const side of [-1, 1]) {
    pen.shape([side * 5, -20, side * 9, -44, side * 17, -58, side * 22, -40, side * 17, -18], { fill: PAPER, tone: 3, angle: 1.3, w: 1.7 })
    pen.shape([side * 9, -22, side * 12, -40, side * 16, -49, side * 18, -38, side * 15, -22], { fill: PAPER, w: 0.9 })
  }
  pen.ellipse(0, -13, 17, 14, { fill: PAPER, tone: 2, angle: 1.3, w: 1.8 })
  // The mask on its forehead, strap and all.
  pen.line([-17, -18, -11, -24], 1.4)
  pen.line([17, -18, 11, -24], 1.4)
  pen.shape([-15, -22, -14, -29, -8, -32, 0, -31, 8, -32, 14, -29, 15, -22, 9, -18, 3, -19, 0, -21, -3, -19, -9, -18], { fill: SPOT, w: 1.6 })
  pen.line([-10, -26, -7, -24, -4, -26], 1)
  pen.line([4, -26, 7, -24, 10, -26], 1)
  pen.ellipse(-2, -7, 6.5, 5, { fill: PAPER, w: 1.3 })
  pen.dot(-4, -9.5, 1.5)
  pen.shape([-5, -3, -4, 1, -3, -3], { fill: PAPER, w: 0.8, sharp: true })
  pen.shape([0, -3, 1, 1, 2, -3], { fill: PAPER, w: 0.8, sharp: true })
  if (pose.awake) { open(pen, -9, -13.5, 4.2, -0.5, -0.8); open(pen, 6.5, -14, 4.2, -0.5, -0.8) } else { shut(pen, -9, -14, 3.6); shut(pen, 6.5, -14.5, 3.6) }
  g.restore()
}

// The blob in pyjamas: a striped mound sitting up in bed. Cross, it has the pillow dragged down over all of its eyes.
function blob(pen: Pen, pose: Pose): void {
  const cross = pose.mood === 'cross'
  const body = [-34, -40, -41, -64, -36, -90, -20, -106, 4, -110, 24, -102, 34, -84, 37, -60, 32, -40]
  pen.shape(body, { fill: PAPER, w: 0 })
  pen.inside(body, false, () => {
    for (let x = -38; x < 40; x += 17) pen.shape([x, -36, x - 3, -74, x + 2, -114, x + 10, -114, x + 6, -74, x + 9, -36], { fill: SPOT, w: 0.9 })
  })
  pen.shape(body, { w: 1.9 })
  for (const y of [-58, -70, -82]) pen.ellipse(-26, y, 2.2, 2.2, { fill: PAPER, w: 1.1 })
  pen.line([-34, -92, -24, -86, -16, -94], 1.2)
  if (pose.wrapped) wrap(pen, -84, -46, 38)
  if (!cross) {
    // Content: its eyes, of which there are many, and the pillow hugged to its front.
    const eyes = [[-20, -96], [-8, -100], [5, -99], [17, -93], [-14, -86], [0, -88], [12, -83]] as const
    for (const [x, y] of eyes) { if (pose.awake) open(pen, x, y, 3.4, -0.5, 0); else shut(pen, x, y, 3) }
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
  }
  bedclothes(pen)
}

// The yeti: all white shag with a face, hands and feet, bolt upright in a hard chair.
function yeti(pen: Pen, pose: Pose): void {
  // The chair behind it.
  for (const side of [-1, 1]) {
    pen.tube([side * 36, -132, side * 37, 0], 4, PAPER, 1.2, true)
    pen.ellipse(side * 36, -135, 3.6, 3.6, { fill: PAPER, w: 1.2 })
  }
  pen.rect(-36, -126, 72, 8, { fill: PAPER, tone: 2, angle: 0, w: 1.3 })
  pen.line([-37, -18, 37, -18], 1.3, true)
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
  // Shins and the great feet.
  for (const side of [-1, 1]) {
    pen.shape(shag([side * 8, -46, side * 30, -46, side * 30, -8, side * 8, -8], 3), { fill: PAPER, w: 1.5, sharp: true })
    pen.shape([side * 4, 0, side * 6, -9, side * 20, -12, side * 36, -8, side * 39, 0], { fill: SPOT, w: 1.7 })
    for (const toe of [15, 23, 30]) pen.line([side * toe, -9, side * (toe + 1), -2], 0.9)
  }
  const body = shag([-36, -42, -42, -80, -36, -116, -20, -138, 0, -144, 20, -138, 36, -116, 42, -80, 36, -42], 4.5)
  pen.shape(body, { fill: PAPER, w: 1.7, sharp: true })
  for (const [x, y] of [[-24, -70], [-12, -58], [6, -64], [22, -74], [-18, -92], [16, -94], [0, -78], [-28, -52], [26, -54]] as const) {
    pen.line([x - 3, y - 5, x, y + 3], 0.9)
    pen.line([x + 3, y - 4, x + 5, y + 4], 0.9)
  }
  if (pose.wrapped) wrap(pen, -96, -52, 42)
  // Arms down to the knees; the cloud's string is tied to one wrist.
  for (const side of [-1, 1]) {
    pen.shape(shag([side * 34, -108, side * 48, -100, side * 50, -62, side * 36, -62], 3), { fill: PAPER, w: 1.5, sharp: true })
    pen.ellipse(side * 43, -56, 8.5, 7.5, { fill: SPOT, w: 1.6 })
    pen.line([side * 39, -54, side * 39, -50], 0.8)
    pen.line([side * 44, -53, side * 44, -49], 0.8)
  }
  // The face.
  pen.shape([-15, -112, -13, -126, 0, -131, 13, -126, 15, -112, 8, -100, 0, -97, -8, -100], { fill: SPOT, w: 1.7 })
  if (pose.awake) { pen.dot(-6, -117, 1.8); pen.dot(6, -117, 1.8) } else { shut(pen, -6.5, -117, 3.6); shut(pen, 6.5, -117, 3.6) }
  pen.dot(-2, -110, 0.9)
  pen.dot(2, -110, 0.9)
  pen.line([-5, -104, 5, -104], 1.5)
  for (let x = -14; x <= 14; x += 5.5) pen.line([x, -134, x + 1.5, -127 + (Math.abs(x) > 8 ? 3 : 0)], 1)
}

// The lizard in a scarf: sitting up in bed, in profile, hugging its hot-water bottle.
function lizard(pen: Pen, pose: Pose): void {
  // Too cold, it goes grey and stiff: the colour leaves it.
  const skin = pose.mood === 'cross' ? PAPER : SPOT, grey = pose.mood === 'cross' ? 2 : 0
  // The tail's tip, out from under the bedclothes at the foot.
  pen.tube([-64, -44, -76, -50, -84, -62, -79, -70], 5.5, skin, 1.4)
  // The crest down the back of the head and neck.
  for (const [x, y] of [[4, -154], [14, -145], [18, -132]] as const) pen.shape([x - 4, y + 4, x + 11, y - 4, x + 2, y + 12], { fill: skin, w: 1.4, sharp: true })
  pen.shape([-17, -40, -20, -70, -14, -96, -2, -104, 12, -98, 18, -72, 16, -40], { fill: skin, tone: grey, w: 1.9 })
  // The head: a long flat snout held level, a shut eye, a mouth like a ruled line.
  pen.shape([12, -120, 17, -138, 8, -153, -10, -155, -32, -147, -52, -143, -59, -135, -51, -127, -16, -122], { fill: skin, tone: grey, w: 1.9 })
  pen.line([-58, -134, -36, -132, -14, -131], 1.4)
  pen.dot(-52, -140, 1.2)
  pen.ellipse(-9, -143, 6, 5.5, { fill: pose.awake ? PAPER : skin, w: 1.4 })
  if (pose.awake) pen.dot(-11, -143, 2.3); else shut(pen, -9, -143, 4.6)
  // The scarf, three times round and hanging down the back.
  pen.shape([13, -116, 24, -108, 26, -76, 31, -60, 17, -60, 16, -78, 10, -100], { fill: PAPER, w: 1.6 })
  for (let y = -104; y < -64; y += 10) pen.tone([11, y, 27, y + 2, 28, y + 7, 13, y + 5], 4, 0.2)
  for (const x of [19, 23, 27, 31]) pen.line([x, -60, x + 0.6, -51], 1.1)
  for (const [y, half] of [[-102, 20], [-111, 18.5], [-119, 16]] as const) {
    const coil = [-half, y, -half + 4, y - 6, half - 4, y - 6, half, y, half - 4, y + 6, -half + 4, y + 6]
    pen.shape(coil, { fill: PAPER, w: 0 })
    pen.inside(coil, false, () => { for (let x = -half + 2; x < half; x += 11) pen.tone([x, y - 7, x + 5.5, y - 7, x + 3, y + 7, x - 2.5, y + 7], 4, 0.2) })
    pen.shape(coil, { w: 1.6 })
  }
  if (pose.wrapped) wrap(pen, -92, -50, 22)
  // The hot-water bottle: stopper, shoulders, and ribs in a diamond; both arms round it.
  pen.rect(-27, -106, 10, 5, { fill: PAPER, w: 1.2 })
  pen.rect(-25, -101, 6, 7, { fill: PAPER, w: 1.2 })
  pen.shape([-37, -54, -38, -86, -31, -95, -13, -95, -6, -86, -6, -54, -12, -47, -31, -47], { fill: PAPER, w: 1.7 })
  pen.inside([-34, -52, -34, -88, -10, -88, -10, -52], true, () => {
    for (let k = -110; k < 20; k += 7) { pen.line([k, -92, k + 46, -46], 0.7, true); pen.line([k + 46, -92, k, -46], 0.7, true) }
  })
  for (const y of [-78, -61]) {
    pen.tube([10, y - 8, -8, y - 2, -36, y], 7.5, skin, 1.5)
    for (const k of [-3, 0, 3]) pen.line([-40, y + k, -45, y + k * 1.4], 1.2, true)
  }
  bedclothes(pen)
}

// The cook: a toad in a tall hat, asleep on the floor against its own cauldron, spoon upright in its fist.
function cook(pen: Pen, pose: Pose): void {
  // The cauldron: iron, so hatched as dark as anything on the page, with a rim and three feet.
  for (const x of [20, 40, 60]) pen.line([x, -8, x + (x - 40) * 0.2, 0], 3, true)
  const pot = [10, -52, 4, -34, 9, -16, 24, -6, 52, -6, 68, -16, 74, -34, 68, -52]
  pen.shape(pot, { fill: PAPER, tone: 4, angle: 1.2, w: 0 })
  pen.tone([44, -52, 68, -52, 74, -34, 68, -16, 52, -6, 44, -6], 2, 0.3)
  pen.shape(pot, { w: 1.9 })
  pen.ellipse(39, -54, 33, 7, { fill: PAPER, tone: 4, angle: 0, w: 1.7 })
  pen.line([12, -60, 22, -63], 0.9)
  pen.ellipse(74, -44, 4, 5, { w: 1.4 })
  // Legs straight out along the floor, feet up.
  for (const y of [-7, -13]) pen.tube([-22, y, -52, y + 1], 9, PAPER, 1.4)
  pen.ellipse(-58, -15, 6, 11, { fill: PAPER, tone: 1, w: 1.5 }, -0.15)
  pen.ellipse(-52, -19, 6, 11, { fill: PAPER, w: 1.5 }, 0.1)
  // The body, in its apron, slumped back on the pot.
  pen.shape([-30, -2, -36, -30, -30, -56, -12, -68, 8, -62, 16, -38, 12, -4], { fill: PAPER, tone: 1, angle: 1.2, w: 1.8 })
  pen.shape([-33, -6, -36, -32, -27, -54, -12, -60, -8, -34, -9, -6], { fill: SPOT, w: 1.6 })
  pen.line([-12, -60, 4, -58, 12, -50], 1.1)
  pen.rect(-27, -30, 11, 9, { w: 1 })
  if (pose.wrapped) wrap(pen, -56, -16, 30)
  // The head: wide, flat-mouthed, eyes on top like a toad's, and the tall hat gone soft behind them.
  const hat = [-22, -98, -28, -122, -17, -141, 6, -146, 25, -135, 27, -116, 15, -105, 6, -98]
  pen.shape(hat, { fill: PAPER, w: 1.8 })
  for (const [x, lean] of [[-15, -4], [-5, 0], [5, 4], [14, 8]] as const) pen.line([x, -104, x + lean, -134 + Math.abs(lean)], 0.8)
  pen.tone([9, -100, 27, -116, 25, -135, 16, -140, 16, -118], 1, 1.2)
  pen.rect(-22, -104, 30, 7, { fill: PAPER, w: 1.4 })
  pen.shape([-42, -72, -38, -89, -12, -97, 16, -90, 22, -72, 12, -58, -32, -58], { fill: PAPER, tone: 1, angle: 1.2, w: 1.9 })
  pen.line([-41, -70, -36, -73, -10, -72, 16, -73, 21, -70], 1.6)
  pen.dot(-14, -80, 0.9)
  pen.dot(-8, -80, 0.9)
  for (const [x, y] of [[10, -64], [0, -62], [14, -80], [-34, -64]] as const) pen.ellipse(x, y, 1.8, 1.8, { w: 0.8 })
  for (const x of [-27, 3]) {
    pen.ellipse(x, -94, 9, 8, { fill: PAPER, w: 1.6 })
    if (pose.awake) pen.dot(x - 1, -94, 2.4); else shut(pen, x, -94, 5.5)
  }
  // The spoon, bolt upright, and the fist round it.
  pen.line([-48, -24, -52, -116], 2.6, true)
  pen.ellipse(-53, -126, 7, 10, { fill: PAPER, tone: 1, w: 1.5 })
  pen.tube([-12, -52, -30, -42, -46, -44], 8, PAPER, 1.4)
  pen.ellipse(-49, -44, 7, 6.5, { fill: PAPER, w: 1.5 })
}

// The fly: nose in the air, napkin tucked in. Cold and cross, it pulls the napkin round its shoulders and hunches.
function fly(pen: Pen, pose: Pose): void {
  const cold = pose.mood === 'cross'
  // Wings, held up and apart behind it, veined.
  for (const side of [-1, 1]) {
    const wing = [side * 8, -62, side * 22, -92, side * 40, -112, side * 54, -110, side * 56, -92, side * 44, -72, side * 24, -56]
    pen.shape(wing, { fill: PAPER, w: 1.5 })
    pen.line([side * 14, -66, side * 34, -90, side * 50, -104], 0.7)
    pen.line([side * 22, -64, side * 42, -80, side * 52, -94], 0.7)
    pen.line([side * 30, -78, side * 44, -100], 0.6)
  }
  // Two thin legs, bent, and the banded abdomen it sits on.
  for (const side of [-1, 1]) pen.line([side * 14, -14, side * 30, -22, side * 34, -2, side * 42, 0], 1.8, true)
  const tail = [-6, -1, -20, -10, -22, -32, -12, -48, 12, -48, 22, -32, 20, -10, 6, -1]
  pen.shape(tail, { fill: PAPER, w: 0 })
  pen.inside(tail, false, () => { for (let y = -44; y < 0; y += 12) pen.tone([-26, y, 26, y - 2, 26, y + 4, -26, y + 6], 4, 0.9) })
  pen.shape(tail, { w: 1.8 })
  // The thorax, bristled.
  pen.shape([-20, -44, -24, -64, -14, -78, 14, -78, 24, -64, 20, -44, 0, -38], { fill: PAPER, tone: 3, angle: 1.2, w: 1.8 })
  // The head: two great eyes and the nose held up. Asleep, the lids are down to a sliver; cross, they slant.
  const g = pen.ctx
  g.save()
  g.translate(0, -76)
  g.rotate(pose.turnedTo === 'up' ? 0.3 : pose.turnedTo === 'down' ? -0.3 : 0)
  pen.line([-5, -34, -9, -46, -15, -48], 1.2)
  pen.line([5, -34, 7, -47, 13, -50], 1.2)
  pen.tube([-10, -10, -22, -18, -30, -32], 6.5, PAPER, 1.4)
  pen.ellipse(-31, -34, 5.5, 3, { fill: PAPER, tone: 3, w: 1.3 }, 0.6)
  pen.ellipse(0, -18, 19, 16, { fill: PAPER, tone: 1, angle: 1.3, w: 1.8 })
  for (const [x, y] of [[-13, -23], [12, -24]] as const) {
    pen.ellipse(x, y, 12, 13, { fill: PAPER, tone: 4, angle: 0.4, w: 1.8 })
    if (!pose.awake || cold) {
      const tilt = cold ? (x < 0 ? 5 : -5) : 0
      const lid = [x - 12.5, y + 6 - tilt, x - 12, y - 6, x - 6, y - 13, x + 6, y - 13, x + 12, y - 6, x + 12.5, y + 6 + tilt]
      pen.shape(lid, { fill: PAPER, w: 1.4, sharp: false })
      pen.line([x - 12.5, y + 6 - tilt, x + 12.5, y + 6 + tilt], 2.6, true)
    }
  }
  pen.line([-5, -6, 3, -7], 1.5)
  g.restore()
  if (cold || pose.wrapped) {
    // The napkin as a shawl: over both shoulders, its corners hanging, held shut by two hands.
    const shawl = [-4, -78, -22, -76, -34, -58, -40, -34, -30, -30, -24, -40, -8, -46, 0, -52, 8, -46, 24, -40, 30, -30, 40, -34, 34, -58, 22, -76, 4, -78]
    pen.shape(shawl, { fill: SPOT, w: 1.9 })
    pen.line([-24, -70, -22, -54, -30, -36], 0.9)
    pen.line([24, -70, 22, -54, 30, -36], 0.9)
    pen.line([-10, -74, -6, -58], 0.8)
    pen.line([10, -74, 6, -58], 0.8)
    pen.line([0, -76, 0, -52], 1.2)
    for (const side of [-1, 1]) {
      pen.line([side * 22, -56, side * 12, -52], 1.8, true)
      pen.ellipse(side * 6, -52, 5, 4, { fill: PAPER, w: 1.3 })
    }
    // It shivers: short strokes either side.
    for (const side of [-1, 1]) for (const y of [-52, -34, -16]) pen.line([side * 46, y - 5, side * 49, y, side * 46, y + 5], 1.1)
  } else {
    // The napkin as a bib, tucked in under the chin, and two hands folded on it.
    pen.shape([-15, -76, 15, -76, 13, -48, 0, -38, -13, -48], { fill: SPOT, w: 1.8, sharp: true })
    pen.line([-9, -70, -8, -52], 0.8)
    pen.line([9, -70, 8, -52], 0.8)
    for (const side of [-1, 1]) {
      pen.line([side * 22, -66, side * 30, -52, side * 12, -46], 1.8, true)
      pen.ellipse(side * 7, -45, 5, 4, { fill: PAPER, w: 1.3 })
    }
  }
}

// The singer: a ghost in a small hat, mouth open, her music held out. She sits where a bench seat would be.
function singer(pen: Pen, pose: Pose): void {
  // The feather and the hat.
  pen.line([-8, -124, -16, -140, -28, -150, -36, -148], 1.3)
  for (let i = 0; i < 6; i++) pen.line([-12 - i * 4, -132 - i * 3.2, -17 - i * 4, -128 - i * 3.6], 0.8)
  for (let i = 0; i < 6; i++) pen.line([-12 - i * 4, -132 - i * 3.2, -10 - i * 4.4, -139 - i * 2.6], 0.8)
  // The sheet: narrow shoulders, a long fall, a hem cut in points that does not reach the ground.
  const sheet = [0, -120, 13, -115, 19, -100, 20, -74, 25, -44, 28, -14, 21, -7, 14, -15, 7, -6, 0, -14, -7, -6, -14, -15, -21, -7, -28, -14, -25, -44, -20, -74, -19, -100, -13, -115]
  pen.shape(sheet, { fill: PAPER, w: 0 })
  pen.tone([8, -116, 19, -100, 20, -74, 25, -44, 28, -14, 21, -7, 16, -14, 14, -60], 2, 1.2, false)
  pen.shape(sheet, { w: 1.9 })
  pen.line([-12, -60, -15, -36, -14, -18], 0.7)
  pen.line([2, -56, 0, -30], 0.7)
  pen.rect(-13, -127, 17, 8, { fill: SPOT, w: 1.5 })
  pen.line([-16, -119, 7, -119], 1.6, true)
  // Two small blank eyes and the mouth, wide open.
  pen.ellipse(-7, -103, 2.6, 3.2, { fill: PAPER, w: 1.4 })
  pen.ellipse(7, -103, 2.6, 3.2, { fill: PAPER, w: 1.4 })
  pen.line([-11, -109, -4, -110], 1)
  pen.line([4, -110, 11, -109], 1)
  if (pose.awake) pen.ellipse(0, -88, 6.5, 9.5, { fill: SPOT, w: 1.8 })
  else pen.line([-5, -90, 5, -90], 1.5)
  for (let x = -12; x <= 12; x += 4.8) pen.ellipse(x, -72 + Math.abs(x) * -0.25, 1.9, 1.9, { fill: PAPER, w: 0.9 })
  if (pose.wrapped) wrap(pen, -66, -30, 26)
  // Her music, held out at arm's length: the pages are scribble, not notes.
  pen.shape([34, -92, 70, -100, 74, -58, 38, -52], { fill: SPOT, w: 1.6, sharp: true })
  pen.shape([37, -89, 53, -93, 55, -58, 40, -55], { fill: PAPER, w: 1.1, sharp: true })
  pen.shape([53, -93, 68, -96, 71, -61, 55, -58], { fill: PAPER, w: 1.1, sharp: true })
  for (let i = 0; i < 4; i++) {
    const y = -84 + i * 7.5
    pen.line([40, y, 43, y - 2.5, 46, y + 0.5, 49, y - 2.5, 52, y - 1], 0.8)
    pen.line([56, y - 2.5, 59, y - 5, 62, y - 2, 65, y - 5, 68, y - 4], 0.8)
  }
  pen.tube([17, -80, 30, -70, 40, -70], 7, PAPER, 1.4)
  pen.tube([-17, -80, -4, -62, 30, -60, 44, -62], 7, PAPER, 1.4)
}

const FIGURES: Record<GuestId, (pen: Pen, pose: Pose) => void> = { troll, bat, blob, yeti, lizard, cook, fly, singer }

/** Draws one guest in the pose given. */
export function drawGuest(pen: Pen, id: GuestId, pose: Pose): void {
  FIGURES[id](pen, pose)
}
