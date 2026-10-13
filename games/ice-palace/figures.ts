import type { KingPose, SunPose } from './cast'
import { SUN, type Point } from './ground'
import { all, bar, dot, lens, oval, placed, poly, type Print, type Shape, type Sprite } from './print'

// King Winter and the sun in the print's tones. The parts of each that never
// change shape are painted once as sprites (`paint…`, used by sprites.ts);
// what moves inside them, eyes, brows, a mouth, mittens, a cloud of breath,
// is drawn live over the stamps (`draw…`). Every value a pose holds moves
// something here.

const TAU = Math.PI * 2

/** How far a pupil sits from the middle of its eye, towards what the character is looking at. */
export function gaze(fromX: number, fromY: number, look: Point | null, most: number): Point {
  if (!look) return { x: 0, y: most * 0.3 }
  const dx = look.x - fromX, dy = look.y - fromY, away = Math.hypot(dx, dy) || 1
  const reach = Math.min(1, away / 160) * most
  return { x: (dx / away) * reach, y: (dy / away) * reach }
}

// --- King Winter -------------------------------------------------------------

export const KING_BODY = { x: -170, y: -280, w: 330, h: 296 }
/** His cloak, a bell of both inks with a trim of fur at the hem, both sleeves, and the cushion tucked under one arm. About his feet. */
export function paintKingBody(p: Print): void {
  p.fill('both', (g) => {
    g.moveTo(-116, 0)
    g.bezierCurveTo(-126, -120, -92, -236, -40, -266)
    g.lineTo(40, -266)
    g.bezierCurveTo(92, -236, 126, -120, 116, 0)
    g.closePath()
  })
  // The trim: one lumpy band of fur, not a row of spots.
  p.fill('paper', all(bar(0, -6, 226, 12, 6), ...[-100, -71, -38, -9, 26, 58, 92].map((sx, i) => oval(sx, -13, 19 + (i % 3) * 3, 8 + (i % 2) * 3))))
  p.fill('both', all(oval(-96, -182, 28, 54, 0.42), oval(100, -176, 26, 56, -0.3)))
  p.at(-118, -146, -0.22, 1, 1, () => p.solid('red', bar(0, 0, 78, 48, 17)))
}

export const KING_BEARD = { x: -104, y: -4, w: 208, h: 262 }
/** His beard: bare paper to the snow, with a few locks in blue. About where it leaves his chin. */
export function paintKingBeard(p: Print): void {
  p.fill('paper', (g) => {
    g.moveTo(-58, 0)
    g.bezierCurveTo(-96, 62, -88, 172, -62, 236)
    g.quadraticCurveTo(-46, 208, -30, 242)
    g.quadraticCurveTo(-14, 210, 0, 250)
    g.quadraticCurveTo(14, 210, 30, 242)
    g.quadraticCurveTo(46, 208, 62, 236)
    g.bezierCurveTo(88, 172, 96, 62, 58, 0)
    g.closePath()
  })
  // Shade down one side, the fold under his chin, and three locks, no two the same length, lean or thickness.
  p.fill('blue', all(lens(-70, 70, -58, 214, 7, 1), lens(-30, 92, -6, 204, 5, 1), lens(8, 80, 13, 128, 3), lens(22, 156, 40, 230, 3.5, -1), lens(-30, 34, 30, 34, 9, 3)))
}

export const KING_HEAD = { x: -76, y: -116, w: 152, h: 158 }
/** His head: paper, a red ball of a nose, and a crown far too small, perched to one side. About the middle of his face. */
export function paintKingHead(p: Print): void {
  p.fill('paper', all(dot(0, -22, 56), oval(-50, 6, 22, 30, 0.3), oval(50, 6, 22, 30, -0.3)))
  p.fill('red', dot(0, -8, 21))
  p.fill('paper', oval(-7, -15, 5, 3.5, -0.5))
  p.at(14, -72, 0.2, 1, 1, () => p.solid('red', poly(-28, 2, -33, -27, -16, -11, 0, -34, 16, -11, 33, -27, 28, 2)))
}

/**
 * The drops that run down his wet beard: where each is across it, where in its fall it starts, and how large it
 * is. No two are the same size, they are at no even step, and no two are ever level.
 */
export const WET_DROPS: readonly { x: number; from: number; rx: number; ry: number }[] = [
  { x: -47, from: 0, rx: 2.7, ry: 4.7 },
  { x: -25, from: 23, rx: 4.2, ry: 7 },
  { x: 12, from: 9, rx: 3.3, ry: 5.6 },
  { x: 53, from: 31, rx: 2.2, ry: 3.8 },
]
/** How far a drop falls before it starts again at the top. */
export const WET_FALL = 40

/** A cloud of breath going from `fx`, `fy` towards a place: paper with a rim of shade, so that it shows on snow. `out` runs from 0 to 1. */
function breath(p: Print, fx: number, fy: number, to: Point, out: number): void {
  const away = Math.hypot(to.x - fx, to.y - fy) || 1, reach = Math.min(170, away * 0.6)
  const bx = fx + ((to.x - fx) / away) * reach * out, by = fy + ((to.y - fy) / away) * reach * out, size = 16 + out * 34
  const puff: Shape = all(dot(bx, by, size), dot(bx - size * 0.9, by + size * 0.2, size * 0.7), dot(bx + size * 0.7, by - size * 0.5, size * 0.6))
  p.fill('blue', placed(3, 3, 0, 1, 1, puff))
  p.fill('paper', puff)
}

export type KingSprites = { body: Sprite; beard: Sprite; head: Sprite }

/**
 * Old King Winter where he is now: `scale` is how far back he stands, `sat` how far he has sat down. `look` is
 * what his eyes follow, and `wanted` the place his grumble goes to.
 */
export function drawKing(p: Print, s: KingSprites, pose: KingPose, at: { x: number; y: number; scale: number; sat: number; narrow: number }, look: Point | null, wanted: Point | null, foot: Point | null = null): void {
  const x = at.x + pose.shiver * 5 * at.scale, y = at.y - pose.up * 80 * at.scale
  // Sat down he is a quarter shorter and a little wider. Squeezing through a gap he is as narrow as the gap, and taller for it.
  const wide = at.scale * (1 + at.sat * 0.07) * at.narrow, tall = at.scale * (1 - at.sat * 0.24) * (1 + (1 - at.narrow) * 0.3)
  p.at(x, y, 0, wide, tall, () => {
    p.sprite(s.body, 0, 0, 0, 1 + pose.breath * 0.012 + pose.belly * 0.05, 1 - pose.breath * 0.01 - pose.belly * 0.035)
    // The beard swings behind every move, and hangs longer and thinner when it is wet.
    p.sprite(s.beard, 0, -262, -pose.beard * 0.035, 1 - pose.wet * 0.1, 1 + pose.wet * 0.07)
    // The head nods forward as he falls asleep.
    p.at(0, -262 + pose.nod * 14 - pose.breath * 3, pose.nod * 0.2, 1, 1, () => {
      p.sprite(s.head, 0, 0)
      const lift = pose.brows * 11
      const eye = gaze(at.x, at.y - 290 * at.scale, look, 4.5)
      const lids = Math.min(1, pose.lids)
      // Brows, eyes and mouth: the brows are the first thing to move, the eyes close as he dozes, the mouth opens for a harrumph, a grumble and a squawk.
      const open = Math.max(pose.puff, pose.grumble > 0 && pose.grumble < 1 ? 0.7 : 0, pose.up)
      p.fill('ink', all(
        lens(-42, -52 - lift + pose.brows * 3, -8, -46 - lift, -6, 3), lens(8, -46 - lift, 42, -52 - lift + pose.brows * 3, -6, 3),
        oval(-24 + eye.x * (1 - lids), -30 + eye.y * (1 - lids) + lids * 3, 7.5, 7.5 * (1 - lids * 0.8)), oval(24 + eye.x * (1 - lids), -30 + eye.y * (1 - lids) + lids * 3, 7.5, 7.5 * (1 - lids * 0.8)),
        oval(0, 26, 9 + open * 5, 4 + open * 9),
      ))
    })
    // His mittens: one pats the cushion, the other hangs.
    p.fill('paper', all(dot(-112, -124 - pose.pat * 12, 17), dot(118, -122 - pose.brows * 6, 17)))
    if (pose.wet > 0) p.fill('blue', all(...WET_DROPS.map((drop) => oval(drop.x + pose.beard * 9, -12 + ((pose.wet * 90 + drop.from) % WET_FALL), drop.rx, drop.ry))))
  })
  if (foot && pose.foot > 0) {
    // One leg comes out from under his hem and goes up to the block, as long as it needs to be: a stocking and a boot, set down on the block's top. It is drawn over him, so that all of it is seen.
    const hip = { x: x - 58 * at.scale, y: y - 10 * at.scale }
    const toe = { x: hip.x + (foot.x - hip.x) * pose.foot, y: hip.y + (foot.y - 9 - hip.y) * pose.foot }
    const knee = { x: (hip.x + toe.x) / 2 + 26 * pose.foot, y: Math.min(hip.y, toe.y) - 22 * pose.foot }
    const leg = (g: CanvasRenderingContext2D): void => {
      g.moveTo(hip.x, hip.y)
      g.quadraticCurveTo(knee.x, knee.y, toe.x, toe.y)
    }
    p.line('paper', 17 * at.scale, leg)
    p.line('blue', 11 * at.scale, leg)
    p.solid('red', placed(toe.x, toe.y, 0, at.scale, at.scale, all(oval(-9, 0, 20, 11), bar(4, -4, 14, 14, 5))))
  }
  // A cloud of breath: a harrumph goes out in front of him, a grumble to the place he wanted.
  const mouthY = y - 236 * tall
  if (pose.puff > 0 && pose.puff < 1) breath(p, x - 30 * at.scale, mouthY, { x: x - 400, y: mouthY - 110 }, pose.puff)
  if (pose.grumble > 0 && pose.grumble < 1) breath(p, x - 30 * at.scale, mouthY, wanted ?? { x: x - 400, y: mouthY - 60 }, pose.grumble)
}

// --- The sun -----------------------------------------------------------------

export const SUN_RAYS = { x: -106, y: -106, w: 212, h: 212 }
/** The ring of bare paper round the sun and its rays, no two the same length or width. About its middle. */
export function paintSunRays(p: Print): void {
  p.fill('paper', dot(0, 0, 100))
  p.fill('red', all(...Array.from({ length: 11 }, (_, i) => {
    const a = (i / 11) * TAU + ((i * 7) % 5) * 0.035, long = 86 + ((i * 5) % 4) * 5, wide = 0.09 + ((i * 3) % 4) * 0.022
    return poly(Math.cos(a) * long, Math.sin(a) * long, Math.cos(a - wide) * 72, Math.sin(a - wide) * 72, Math.cos(a + wide) * 72, Math.sin(a + wide) * 72)
  })))
}

/** The sun at height `y`: a red disc with a drowsy face inside its rays. `asleep` shuts its eyes, as it is by night; `pulled` is how far a finger has drawn it from where it hangs, which stretches it. */
export function drawSun(p: Print, rays: Sprite, pose: SunPose, y: number, look: Point | null, asleep: boolean, pulled: number): void {
  const r = 62 + pose.breath * 2.5
  p.at(SUN.x + pose.wobble * 7, y + pose.droop * 9, pose.wobble * 0.12, 1 + pose.squint * 0.07 - Math.abs(pulled) * 0.05, 1 - pose.squint * 0.07 + Math.abs(pulled) * 0.08, () => {
    p.sprite(rays, 0, 0, pose.rays)
    p.fill('red', dot(0, 0, r))
    const eye = gaze(SUN.x, y, look, 4)
    const lids = asleep ? 1 : Math.max(pose.yawn, pose.squint)
    const mouth: Shape = pose.yawn > 0.15 && !asleep ? oval(0, 26, 10 + pose.yawn * 6, 5 + pose.yawn * 15) : lens(-16, 22, 16, 22, 5 + pose.squint * 4, 1)
    p.fill('ink', all(
      oval(-22 + eye.x, -12 + eye.y, 8, 8 * (1 - lids * 0.82)), oval(22 + eye.x, -12 + eye.y, 8, 8 * (1 - lids * 0.82)),
      lens(-34, -30 + lids * 4, -10, -28 + lids * 8, -3, 1), lens(10, -28 + lids * 8, 34, -30 + lids * 4, -3, 1),
      mouth,
    ))
    p.fill('paper', all(oval(-40, 10, 9 + pose.squint * 5, 6 + pose.squint * 5), oval(40, 10, 9 + pose.squint * 5, 6 + pose.squint * 5)))
  })
}

// --- Lamps -------------------------------------------------------------------

/** A lamp's roof, hook and foot, hanging from `x`, `y`: one shape for every lamp there is. */
export function lampFrame(x: number, y: number, turn: number): Shape {
  return placed(x, y, turn, 1, 1, all(bar(0, 9, 3, 18, 1), poly(-19, 30, 0, 14, 19, 30), bar(0, 62, 32, 7, 3)))
}
/** A lamp's glass, which is bare paper when it is lit. */
export function lampGlass(x: number, y: number, turn: number): Shape {
  return placed(x, y, turn, 1, 1, bar(0, 44, 28, 30, 5))
}
