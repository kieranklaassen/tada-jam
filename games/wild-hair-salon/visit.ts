import { BLADES } from './hand'
import { Play } from './play'
import { BUTTONS, clippingBox, onHead, placesOf, ribbonShape, stripOf, tuftPose, tuftTip, type Point } from './poses'
import { makeRng } from './rng'
import { CUSTOMERS } from './tastes'

// A whole visit played by a scripted finger, one sixtieth of a second at a
// time, for the tests that count a frame's work and measure what crosses
// what. The finger finds its things by the same geometry the game uses, so
// the script follows the salon wherever a seed takes it. Every move the game
// has is in it: each of the five things done to the lock, the model, the mane
// and the ribbon, a piece carried to a face, the friend sent across and back,
// the cape off and on, the next customer let in, and a touch that cuts a
// scene short. Not used by the game itself.

const DOOR: Point = { x: BUTTONS.door.x + 84, y: BUTTONS.door.y + 290 }
const CHAIR: Point = { x: BUTTONS.chair.x + 30, y: BUTTONS.chair.y + 200 }
const BENCH: Point = { x: BUTTONS.bench.x + 100, y: BUTTONS.bench.y + 60 }
const STOOL: Point = { x: BUTTONS.stool.x + 56, y: BUTTONS.stool.y + 80 }
/** Bare wall: a finger that lands here has the scissors. */
const AIR: Point = { x: 790, y: 80 }
const FPS = 60

/** What the script did, in the order it did it, for a test to prove the heavy moments happened. */
export type Visit = { play: Play; did: string[]; frames: number }

/**
 * Plays the visit. `each` is called after every frame with what the finger
 * is doing and whether it is off the glass; `customers` is how many customers
 * are seen through.
 */
export function visit(seed: number, each: (play: Play, doing: string, idle: boolean) => void, customers = 2): Visit {
  const rng = makeRng(seed), play = new Play(seed), did: string[] = []
  let frames = 0
  // A first visit, with the pair at the door and everything dealt after them taken from the seed.
  const fresh = new Play(seed)
  fresh.open(null, null)
  const first = rng.pick(CUSTOMERS), second = rng.pick(CUSTOMERS.filter((who) => who !== first))
  play.open({ ...fresh.saved(), seed, waiting: [first, second] }, null)
  const frame = (doing: string, idle: boolean): void => { play.step(1 / FPS, idle); frames++; each(play, doing, idle) }
  const rest = (seconds: number, doing: string): void => { for (let i = 0; i < seconds * FPS; i++) frame(doing, true) }
  const scene = (doing: string): void => { let n = 0; while (play.inScene && n++ < FPS * 30) frame(doing, true) }
  const game = () => play.game!
  const tap = (at: Point, doing: string): void => {
    play.gesture({ type: 'press', at })
    frame(doing, false); frame(doing, false)
    play.gesture({ type: 'tap', at })
    frame(doing, false)
    did.push(doing)
  }
  /** A finger drawn through the points, a little way each frame. */
  const drag = (points: Point[], doing: string, speed = 16): void => {
    const from = points[0]
    play.gesture({ type: 'press', at: from })
    frame(doing, false)
    play.gesture({ type: 'dragStart', from })
    for (let i = 1; i < points.length; i++) {
      const a = points[i - 1], b = points[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / speed))
      for (let k = 1; k <= steps; k++) {
        play.gesture({ type: 'dragMove', from, at: { x: a.x + ((b.x - a.x) * k) / steps, y: a.y + ((b.y - a.y) * k) / steps } })
        frame(doing, false)
      }
    }
    play.gesture({ type: 'dragEnd', from, at: points[points.length - 1] })
    frame(doing, false)
    did.push(doing)
  }
  const on = (what: 'lock' | 'model' | 'ribbon', along: number): Point | null => {
    const strip = stripOf(game(), what)
    if (!strip) return null
    const lying = what === 'ribbon' && ribbonShape(game())?.kind === 'lie'
    const far = Math.max(4, strip.length * along) * strip.unit
    return lying ? { x: strip.root.x + far, y: strip.root.y } : { x: strip.root.x, y: strip.root.y + far }
  }
  /** The scissors drawn across a point from the side. */
  const across = (at: Point): Point[] => [AIR, { x: at.x + 60, y: at.y - BLADES.y }, { x: at.x - 60, y: at.y - BLADES.y }]
  const rub = (at: Point): Point[] => [at, ...Array.from({ length: 8 }, (_, i) => ({ x: at.x + (i % 2 ? -34 : 34), y: at.y + (i % 3) * 2 }))]
  const tuft = (index: number, along: number): Point | null => {
    const g = game(), customer = placesOf(g).customer
    if (!customer || !g.chair) return null
    const pose = tuftPose(g.chair, index, g.mane[index], g.mane.length), tip = tuftTip(pose)
    return onHead(customer, { x: pose.base.x + (tip.x - pose.base.x) * along, y: pose.base.y + (tip.y - pose.base.y) * along })
  }
  const face = (who: 'customer' | 'friend', local: Point): Point | null => { const actor = placesOf(game())[who]; return actor ? onHead(actor, local) : null }
  const clip = (): Point | null => { const shape = ribbonShape(game()); return !shape ? null : shape.kind === 'hang' ? { x: shape.root.x, y: shape.root.y - 12 } : shape.kind === 'lie' ? shape.from : shape.at }
  const strip = (what: 'lock' | 'model' | 'ribbon'): void => {
    const down = 60 + rng.next() * 110
    let at = on(what, 0.8)
    if (at) drag([at, { x: at.x, y: at.y + down }], `${what} pulled`)
    rest(0.5, `${what} let go`)
    if ((at = on(what, 0.4 + rng.next() * 0.4))) drag(across(at), `${what} snipped`, 22)
    rest(0.7, `${what} piece falls`)
    if ((at = on(what, 0.5))) drag(rub(at), `${what} ruffled`, 24)
    rest(0.4, `${what} settles`)
    if ((at = on(what, 0.35))) tap(at, `${what} poked`)
    rest(0.4, `${what} wobbles`)
  }

  rest(1, 'the empty salon')
  for (let n = 0; n < customers; n++) {
    tap(DOOR, 'door')
    scene('coming in')
    rest(0.5, 'seated')
    strip('lock')
    strip('model')

    const which = rng.int(0, game().mane.length - 1)
    let at = tuft(which, 0.7), root = tuft(which, 0)
    if (at && root) drag([at, { x: at.x + (at.x - root.x) * 0.8, y: at.y + (at.y - root.y) * 0.8 }], 'tuft pulled')
    rest(0.4, 'tuft let go')
    const other = (which + 3) % game().mane.length
    if ((at = tuft(other, 0.6))) drag(across(at), 'tuft snipped', 22)
    rest(0.6, 'tuft piece falls')
    if ((at = tuft(4, 0.6))) drag(rub(at), 'mane ruffled', 24)
    rest(0.5, 'mane settles')
    if ((at = tuft(which, 0.5))) tap(at, 'tuft poked')
    rest(0.3, 'tuft wobbles')

    // The ribbon: beside the lock, pulled and cut there, on a tuft, round a face, on the floor, and home.
    let hold = clip(), to = on('lock', 0.3)
    if (hold && to) drag([hold, to], 'ribbon to the lock')
    rest(0.4, 'ribbon hangs')
    strip('ribbon')
    hold = clip(); to = tuft(which, 0.8)
    if (hold && to) drag([hold, to], 'ribbon to a tuft')
    rest(0.4, 'bow worn')
    hold = clip(); to = face('friend', { x: 0, y: -10 })
    if (hold && to) drag([hold, to], 'ribbon to a face')
    rest(0.4, 'blindfold worn')
    hold = clip()
    if (hold) drag([hold, { x: 330, y: 700 }], 'ribbon to the floor')
    rest(0.4, 'ribbon lies')
    hold = clip(); to = on('model', 0.3)
    if (hold && to) drag([hold, to], 'ribbon to the model')
    rest(0.4, 'ribbon hangs')

    // The faces: a nose pressed, a cheek pulled, a rub, and a piece from the floor stuck on.
    if ((at = face('customer', { x: 0, y: 16 }))) tap(at, 'nose poked')
    rest(0.3, 'nose springs back')
    if ((at = face('customer', { x: -60, y: 20 }))) drag([at, { x: at.x - 70, y: at.y + 10 }], 'cheek pulled')
    rest(0.4, 'cheek springs back')
    if ((at = face('friend', { x: 0, y: -30 }))) drag(rub(at), 'friend rubbed', 24)
    rest(0.4, 'friend settles')
    const piece = game().clippings.findIndex((c) => c.on === 'floor'), box = piece >= 0 ? clippingBox(game(), game().clippings[piece]) : null
    if (box && (to = face('customer', { x: 0, y: 42 }))) drag([{ x: box.x, y: box.y }, to], 'piece to a face')
    rest(0.4, 'piece worn')

    tap(BENCH, 'friend sent across')
    scene('friend walks over')
    rest(0.4, 'friend across')
    if ((at = on('model', 0.8))) drag([at, { x: at.x, y: at.y + 90 }], 'model pulled across')
    rest(0.5, 'model springs back')
    if (n % 2 === 1) { tap(STOOL, 'friend sent back'); scene('friend walks back'); rest(0.3, 'friend beside') }

    const knot = placesOf(game()).knot
    if (knot) tap(knot, 'cape off')
    if (n % 2 === 1) {
      // A touch on the lock a moment into the scene: the scene ends there and the touch is an ordinary touch.
      for (let i = 0; i < 24; i++) frame('cape coming off', true)
      if ((at = on('lock', 0.5))) tap(at, 'scene cut by a touch')
    }
    scene('cape coming off')
    rest(0.8, 'side by side')
    if ((at = on('lock', 0.8))) drag([at, { x: at.x, y: at.y + 80 }], 'lock pulled with the cape off')
    rest(0.5, 'lock springs back')
    tap(CHAIR, 'cape on')
    scene('cape going on')
    rest(0.4, 'under the cape again')
    const again = placesOf(game()).knot
    if (again) tap(again, 'cape off again')
    scene('cape coming off again')
    rest(0.4, 'done')
  }
  tap(DOOR, 'door')
  scene('the next pair comes in')
  rest(1, 'seated')
  return { play, did, frames }
}
