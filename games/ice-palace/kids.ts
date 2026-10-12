import { DUCK_LEAN, KID_SCALE, lampArm, lampTurn, type BirdPose, type FishPose, type HarePose, type LampPose, type PeeperPose } from './cast'
import { gaze, lampFrame, lampGlass } from './figures'
import { POND, type Point } from './ground'
import { all, bar, dot, lens, oval, placed, poly, type Print, type Sprite } from './print'

// The two frost children, the bird, the fish, the hare and the ghost hand.
// As in figures.ts: what keeps its shape is painted once as a sprite, and
// eyes, a mouth, an arm, a wing and ears are drawn live over the stamps.

// --- A leg, which both frost children have two of ------------------------------

export const LEG = { x: -12, y: -4, w: 34, h: 62 }
/** One leg and its red boot, hanging from the hip. */
export function paintLeg(p: Print): void {
  p.fill('blue', bar(0, 20, 15, 44, 7))
  p.solid('red', oval(4, 44, 14, 9))
}

// --- The lamp child ----------------------------------------------------------

export const KID_BODY = { x: -56, y: -100, w: 112, h: 106 }
/** Its body and scarf, and the mitten that holds nothing. About where it sits. */
export function paintKidBody(p: Print): void {
  p.fill('blue', oval(0, -46, 36, 48))
  p.solid('red', all(bar(0, -84, 66, 17, 8), poly(20, -80, 34, -78, 40, -44, 26, -46)))
  p.solid('red', dot(-40, -40, 12))
}

export const KID_HEAD = { x: -50, y: -80, w: 100, h: 98 }
/** Its head: spikes of frost for hair, a paper face, a red nose and cheeks. About its neck. */
export function paintKidHead(p: Print): void {
  p.fill('blue', poly(-34, -26, -46, -58, -20, -44, -12, -74, 0, -48, 14, -76, 22, -44, 46, -56, 34, -24))
  p.fill('paper', dot(0, -22, 37))
  p.fill('red', all(dot(0, -12, 6.5), oval(-25, -8, 6, 4), oval(25, -8, 6, 4)))
}

export type KidSprites = { body: Sprite; head: Sprite; leg: Sprite }

/**
 * The lamp child at `at`, a third larger than its own measures. `up` runs from 0, sitting on the lip of the
 * bank, to 1, on its feet. `aim` is the hollow it holds its lamp up to, when there is one; `lamp` says whether
 * it still has its lamp in its mitten, which it has not once the lamp is hung.
 */
export function drawLampChild(p: Print, s: KidSprites, pose: LampPose, at: { x: number; y: number; up: number }, look: Point | null, aim: Point | null, lamp: boolean): void {
  const k = KID_SCALE
  // Looking under its lamp it ducks forward.
  p.at(at.x, at.y, pose.duck * DUCK_LEAN, k, k, () => {
    const swing = pose.legs * 0.32 * (1 - at.up * 0.7)
    p.sprite(s.leg, -14, -8, -0.12 - swing)
    p.sprite(s.leg, 14, -8, 0.12 + swing)
    p.sprite(s.body, 0, 0)
    // The arm: held out over the bank while it seeks, up towards a hollow when there is one, and out to the snow block it raps on, where the mitten stops on the block.
    const { hand } = lampArm(pose, at, aim)
    p.line('blue', 13, (g) => {
      g.moveTo(26, -60)
      g.lineTo(hand.x, hand.y)
    })
    if (!lamp) p.solid('red', dot(hand.x, hand.y, 11))
    if (lamp) {
      const turn = lampTurn(pose)
      p.fill('ink', lampFrame(hand.x, hand.y, turn))
      // Not lit yet: its glass is the blue, and bare paper only once it hangs and burns.
      p.fill('blue', lampGlass(hand.x, hand.y, turn))
    }
    // The head tips to one side and stays there; seeking, it turns to look all round.
    p.at(pose.scan * 5, -92 + pose.duck * 8, pose.tilt * 0.16 + pose.scan * 0.2, 1, 1, () => {
      p.sprite(s.head, 0, 0)
      // Its nose pressed flat on the ice: broad, with a ring of squashed cheek round it.
      if (pose.nose > 0) {
        p.fill('paper', oval(0, -11, 17, 13))
        p.fill('red', oval(0, -11, 13, 9.5))
      }
      const eye = gaze(at.x, at.y - 150, look, 4)
      const wide = 6 + pose.nose * 2.5
      // A smile; a round mouth with its nose on lit ice; a mouth turned down, under brows, at snow that shuts a lamp in.
      const smile = 2 + pose.lift * 5 + (pose.twirl > 0 ? 5 : 0)
      p.fill('ink', all(
        dot(-14 + eye.x + pose.scan * 4, -24 + eye.y, wide), dot(14 + eye.x + pose.scan * 4, -24 + eye.y, wide),
        pose.nose > 0 ? oval(0, 8, 6, 6) : pose.frown > 0 ? lens(-9, 3, 9, 3, -4, 0) : lens(-9, 0, 9, 0, smile, 0),
        ...(pose.frown > 0 ? [lens(-24, -38, -6, -32, -2.5, 1), lens(6, -32, 24, -38, -2.5, 1)] : []),
      ))
    })
  })
}

// --- The peeper --------------------------------------------------------------

export const PEEPER_BODY = { x: -80, y: -26, w: 170, h: 64 }
/** Its body, flat on its front, and its mittens under its chin. */
export function paintPeeperBody(p: Print): void {
  p.fill('blue', oval(-10, 4, 64, 25))
  p.solid('red', all(oval(40, 22, 13, 9), oval(70, 24, 13, 9)))
}

export const PEEPER_HEAD = { x: -80, y: -56, w: 118, h: 94 }
/** Its head: a pointed hat with a paper bobble, flopped backwards, a paper face, a red nose and one cheek. */
export function paintPeeperHead(p: Print): void {
  p.solid('red', poly(-28, -6, -66, -44, -2, -30))
  p.fill('paper', dot(-66, -44, 9))
  p.fill('blue', lens(-74, -40, -60, -36, 3))
  p.fill('paper', dot(0, 0, 32))
  p.fill('red', all(dot(26, 14, 7), oval(-8, 14, 7, 4.5)))
}

/** Where the drops are that fly off a soaked peeper, about its middle, and how large each is. */
export const SOAK: readonly (readonly [number, number, number, number])[] = [[-61, -64, 3, 5.6], [-33, -95, 4.6, 7.6], [2, -55, 2.4, 4.2], [24, -88, 3.8, 6.4], [69, -66, 3.2, 5.2], [47, -111, 2.2, 3.8]]

/** The peeper at `at`: flat on its front with its nose nearly on the ice, feet kicking out of step; with `up` at 1 it is on its feet. */
export function drawPeeper(p: Print, s: { body: Sprite; head: Sprite; leg: Sprite }, pose: PeeperPose, at: { x: number; y: number; up: number }, look: Point | null): void {
  const k = 1.25
  p.at(at.x + pose.soaked * 7, at.y - pose.roll * 30 - at.up * 110, -pose.roll * 2.5 - at.up * 1.45, k, k, () => {
    // Two legs up behind it, each at its own speed; on its feet they hang straight.
    p.sprite(s.leg, -58, -10, Math.PI - 0.5 + pose.left * 0.5 * (1 - at.up) - at.up * 1.1)
    p.sprite(s.leg, -40, -12, Math.PI + 0.1 + pose.right * 0.45 * (1 - at.up) - at.up * 1.5)
    p.sprite(s.body, 0, 0)
    // The head sinks slowly towards the ice, lifts to look, leans round a block laid over its view, and goes out on its neck and up and down with a berry that bobs.
    p.at(54 + pose.lean * 16 + pose.watch * 15, -14 + pose.head * 7 * (1 - pose.watch) - pose.look * 12 - pose.lean * 10 - pose.watch * (5 - pose.bob * 4), pose.look * -0.3 + pose.lean * 0.35 + at.up * 1.3 + pose.watch * 0.12, 1, 1, () => {
      p.sprite(s.head, 0, 0)
      const eye = gaze(at.x + 54, at.y - 14, look ?? { x: POND.cx - 200, y: POND.cy + 40 }, 4.5)
      const open = Math.abs(pose.soaked) * 6 + pose.roll * 5
      p.fill('ink', all(dot(2 + eye.x, -2 + eye.y, 7), dot(22 + eye.x, 2 + eye.y, 7), oval(12, 20, 5 + open, 3 + open)))
    })
  })
  // Soaked: drops fly off it, no two the same size, at no even step and in no row.
  if (pose.soaked !== 0) p.fill('blue', all(...SOAK.map(([dx, dy, rx, ry], i) => oval(at.x + dx + pose.soaked * (7 + i * 2), at.y + dy + Math.abs(pose.soaked) * (12 + ((i * 7) % 11)), rx, ry, dx / 200))))
}

// --- The bird, the fish and the hare -----------------------------------------

export const BIRD = { x: -30, y: -40, w: 70, h: 76 }
/** The bird: a red ball with a paper belly, a beak, a crest, an eye and two thin legs, facing right. */
export function paintBird(p: Print): void {
  p.line('blue', 3, (g) => {
    g.moveTo(-6, 16)
    g.lineTo(-7, 30)
    g.moveTo(6, 16)
    g.lineTo(7, 30)
  })
  p.fill('paper', dot(0, 0, 24))
  p.fill('red', dot(0, 0, 22))
  p.fill('paper', oval(4, 9, 11, 9))
  p.fill('blue', poly(18, -8, 34, -3, 18, 2))
  p.fill('ink', dot(9, -8, 3.5))
  p.fill('red', poly(-14, -16, -30, -34, -6, -20))
}

/** The bird where it is now: it hops, cocks its head by turning right round, and flurries up with its wing going. */
export function drawBird(p: Print, sprite: Sprite, pose: BirdPose, at: Point): void {
  p.at(at.x, at.y - pose.hop * 12 - pose.up * 84, pose.up * -0.2 * pose.cock, pose.cock, 1, () => {
    p.sprite(sprite, 0, 0)
    p.fill('blue', placed(-12, -2, -pose.flap * 1.1, 1, 1, lens(0, 0, -26, 10, 8, -2)))
  })
}

/** The fish: a shadow under the clear ice, printed over the pond in the red, which the blue under it turns to indigo. `stare` from 0 to 1 brings it to `red`, the place beside something red where it holds still and looks. */
export function drawFish(p: Print, pose: FishPose, stare: number, red: Point | null): void {
  const x = POND.cx + pose.x, y = POND.cy + pose.y
  const to = red && stare > 0 ? { x: x + (red.x - x) * stare, y: y + (red.y - y) * stare, turn: pose.heading * (1 - stare) - 0.4 * stare } : { x, y, turn: pose.heading }
  p.fill('red', placed(to.x, to.y, to.turn, 1 + stare * 0.15, 1 + stare * 0.15, all(oval(0, 0, 30, 11), poly(-24, 0, -46, -12 + pose.tail * 6, -46, 12 + pose.tail * 6))))
}

export const HARE = { x: -40, y: -50, w: 84, h: 58 }
/** The hare, facing left: paper with a rim of shade so that it shows on snow, an eye and a red nose. Its ears are drawn live. About its feet. */
export function paintHare(p: Print): void {
  p.fill('blue', all(oval(2, -17, 31, 18), dot(-23, -27, 15)))
  p.fill('paper', all(oval(0, -19, 30, 17), dot(-25, -29, 14), dot(28, -24, 8)))
  p.fill('ink', dot(-29, -32, 3))
  p.fill('red', dot(-38, -27, 3))
}

/** The hare in its bound: stretched while it is in the air, ears up when it stops to listen. */
export function drawHare(p: Print, sprite: Sprite, pose: HarePose): void {
  p.at(pose.x, pose.y - pose.hop * 26, -pose.hop * 0.12 * pose.face, (1 + pose.stretch * 0.18) * pose.face, 1 - pose.stretch * 0.1, () => {
    p.sprite(sprite, 0, 0)
    const lay = 1.1 - pose.ears * 1.0
    p.fill('blue', all(placed(-20, -38, lay, 1, 1, lens(0, 0, 0, -30, 5, -5)), placed(-14, -38, lay + 0.2, 1, 1, lens(0, 0, 0, -28, 5, -5))))
  })
}

// --- The ghost hand ----------------------------------------------------------

export const MITTEN = { x: -40, y: -10, w: 80, h: 96 }
/** A frost child's mitten, fingers up, with its thumb standing out to one side and a blue cuff: the hand that shows one move. About its fingertip. */
export function paintMitten(p: Print): void {
  const hand = all(oval(0, 28, 21, 30), oval(-23, 36, 9, 16, 0.6))
  p.fill('paper', all(oval(0, 28, 26, 35), oval(-25, 36, 14, 21, 0.6), bar(0, 68, 46, 26, 9)))
  p.fill('red', hand)
  p.fill('blue', bar(0, 66, 38, 18, 6))
}
