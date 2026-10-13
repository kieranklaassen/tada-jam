import { CELL_PART, freshFur } from './fur'
import { Game } from './game'
import type { Point } from './input'
import { CAT, CURTAIN, DOORWAY, DUCK, HOMES, LAMP, SLEEPER, TEDDY, THING_IDS, isCloth, type ThingId } from './room'
import { WEARERS, freshSave, type Save, type Wearer } from './save'

// A scripted finger, for the tests: it presses, drags, rubs and lets go as the Mount would hand those to the game,
// and steps the game between its moves. `watch` is called after every one of them, so a test can look at the game
// at each moment a frame would be drawn. Nothing in the game imports this.

const FRAME = 1 / 60

/** Where a finger rubs a thing on each of the five, and lets a cloth go over them. */
export function spotOf(target: Wearer, game: Game): Point {
  if (target === 'teddy') return { x: TEDDY.x + 8, y: TEDDY.y - 170 }
  if (target === 'duck') return { x: DUCK.x, y: DUCK.y - (game.worn('pyjamas', 'tub') ? 24 : game.worn('blanket', 'duck') ? 14 : 0) }
  if (target === 'cat') return { x: game.cat.x, y: CAT.y }
  if (target === 'lamp') return { x: LAMP.x, y: LAMP.y }
  return { x: 292, y: 640 }
}

/** Where the finger holds the jug so that its spout is over each of the five. */
export function pourOver(target: Wearer, game: Game): Point {
  const over = target === 'tub' ? { x: 300, y: 430 } : target === 'teddy' ? { x: TEDDY.x, y: TEDDY.y - 600 } : { x: spotOf(target, game).x, y: spotOf(target, game).y - 190 }
  // The spout is 62 to the side the jug faces: to the right while the jug is left of Teddy, to the left otherwise.
  const side = over.x - 62 < TEDDY.x ? 1 : -1
  return { x: over.x - side * 62, y: over.y + 34 }
}

export class Finger {
  at: Point = { x: 0, y: 0 }
  down = false

  constructor(readonly game: Game, private readonly watch: (game: Game) => void = () => {}) {}

  /** Plays time with the finger as it is. */
  wait(seconds: number): this {
    for (let t = 0; t < seconds - 1e-9; t += FRAME) { this.game.step(FRAME); this.watch(this.game) }
    return this
  }

  press(at: Point): this {
    this.at = { ...at }
    this.down = true
    this.game.press(at)
    this.watch(this.game)
    return this
  }

  /** Lifts where it went down. */
  tap(at: Point): this {
    this.press(at)
    this.wait(0.05)
    this.down = false
    this.game.tap()
    this.watch(this.game)
    return this
  }

  /** Drags to a point in short moves, a frame of play after each. */
  move(to: Point, pace = 16): this {
    const from = { ...this.at }, steps = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / pace))
    for (let n = 1; n <= steps; n++) {
      const next = { x: from.x + ((to.x - from.x) * n) / steps, y: from.y + ((to.y - from.y) * n) / steps }
      this.game.dragMove(this.at, next)
      this.at = next
      this.watch(this.game)
      this.game.step(FRAME)
      this.watch(this.game)
    }
    return this
  }

  /** Rubs back and forth round where it is, for some seconds. */
  rub(seconds: number, reach = 30): this {
    const middle = { ...this.at }
    for (let t = 0, n = 0; t < seconds; t += FRAME * 4, n++) this.move({ x: middle.x + (n % 2 ? reach : -reach), y: middle.y + (n % 3) * 6 - 6 }, 16)
    return this.move(middle)
  }

  /** Lets go: the drag is over where the finger is. */
  drop(): this {
    this.down = false
    this.game.drop()
    this.watch(this.game)
    return this
  }

  /** The drag was taken away, which is not the child letting go. */
  cancel(): this {
    this.down = false
    this.game.back()
    this.watch(this.game)
    return this
  }

  /** Picks a thing up from where it rests. */
  take(id: ThingId): this {
    return this.press(this.game.rests()[id])
  }

  /** One whole use of a carried thing on one of the five: fetched, carried there, rubbed, poured or let go, and left to finish. */
  use(id: ThingId, target: Wearer, seconds = 1.2, after = 0.6): this {
    this.take(id)
    if (isCloth(id)) { this.move(spotOf(target, this.game)).wait(0.3).drop(); return this.wait(after) }
    if (id === 'jug') { this.move(pourOver(target, this.game)).wait(seconds).drop(); return this.wait(after) }
    this.move(spotOf(target, this.game)).rub(seconds).drop()
    return this.wait(after)
  }
}

/** Where the idle hand shows a tap on the curtain and on the door, clear of everyone. */
export const AT_CURTAIN: Point = { x: CURTAIN.x + 30, y: CURTAIN.y + 20 }
export const AT_DOOR: Point = { x: DOORWAY.x + 24, y: DOORWAY.y + 60 }
const BELLY: Point = { x: TEDDY.x + 8, y: TEDDY.y - 170 }, WALL: Point = { x: TEDDY.x, y: 60 }, OVER_HIM: Point = { x: TEDDY.x - 62, y: TEDDY.y - 566 }

/**
 * Every state a child can reach, walked once: each carried thing on each of the five, twice; a tap of each thing;
 * the bare hand on everyone; a lifted and a cancelled drag; what keeps him from sleep; every scene, whole and cut
 * short at every half second; the night and the morning. `watch` sees the game at each moment a frame is drawn.
 */
export function walkEverything(watch: (game: Game) => void): void {
  const start = (over: Partial<Save> = {}, muddy = true): Finger => new Finger(new Game({ ...freshSave(null), ...over, ...(muddy ? {} : { fur: freshFur([]), mudPlaces: [] }) }, 3), watch)
  for (const id of THING_IDS) for (const who of WEARERS) {
    // Each cell from a room where it has the most to do: foam and suds for the water, a wet cat and a wet bear for the towel.
    const finger = start({ duck: 'foam', shade: 'foam', suds: 2, cat: id === 'towel' ? 'wet' : 'plain' })
    if (id === 'towel') CELL_PART.forEach((part, i) => { if (part) finger.game.fur.wet[i] = 0.8 })
    finger.wait(0.2).use(id, who, 2.2, 6)
    // And once more, where a second use differs: the dry cat rolls, the duck shoots out, the suds stop.
    finger.use(id, who, 2.6, 4)
  }
  const taps = start()
  for (const id of THING_IDS) taps.tap(taps.game.rests()[id]).wait(3.4)
  for (const id of THING_IDS) taps.tap(taps.game.rests()[id]).wait(0.2).tap(BELLY).wait(3)
  const hand = start({ duck: 'shine', cat: 'fluff' }, false)
  for (const at of [BELLY, spotOf('duck', hand.game), { x: CAT.x - 20, y: CAT.y - 30 }, { x: CAT.x + 50, y: CAT.y + 50 }, LAMP, LAMP, spotOf('tub', hand.game), WALL, CURTAIN, CURTAIN, DOORWAY]) hand.tap(at).wait(1.6)
  // A rub of the bare hand over foam and over fluffy fur, and the soap at his nose until he sneezes.
  const rub = start()
  rub.use('soap', 'teddy', 2).press(BELLY).rub(2, 60).cancel().wait(1)
  rub.take('soap').move({ x: TEDDY.x, y: TEDDY.y - 330 }).rub(5, 40).drop().wait(2)
  for (const id of THING_IDS) { rub.take(id).move(spotOf('duck', rub.game), 40); rub.game.dragLift(); rub.wait(0.4).move(spotOf('cat', rub.game), 40).cancel().wait(1.5) }
  // Wet under the blanket and in the pyjamas; dry and tucked in with the lamp up; dry in the dark with no blanket.
  start({}, false).take('jug').move(OVER_HIM).wait(1.5).drop().wait(1.6).use('blanket', 'teddy', 0, 5).use('pyjamas', 'teddy', 0, 4)
  start({}, false).take('jug').move(OVER_HIM).wait(1.5).drop().wait(1.6).use('pyjamas', 'teddy', 0, 5)
  start({}, false).use('pyjamas', 'teddy', 0, 3).use('blanket', 'teddy', 0, 12).tap(LAMP).wait(9)
  start({}, false).tap(LAMP).wait(4).use('blanket', 'lamp', 0, 5).tap(HOMES.pyjamas).wait(3)
  // One small wet place, dried: his first yawn.
  const patch = start({}, false)
  patch.game.fur.wet[CELL_PART.findIndex((part, i) => part === 'head' && i > 60)] = 0.9
  patch.wait(0.3).take('towel').move({ x: TEDDY.x, y: TEDDY.y - 380 }).rub(3, 110).drop().wait(3)
  // His foot thumps under the blanket while the towel dries his head; a soap tapped while a tapped blanket is in the air waits for it.
  const under = start({ blanket: 'teddy' }, false)
  CELL_PART.forEach((part, i) => { if (part === 'head') under.game.fur.wet[i] = 0.9 })
  under.wait(0.3).take('towel').move({ x: TEDDY.x, y: TEDDY.y - 380 }).rub(4, 60).drop().wait(2)
  const queued = start({}, false)
  queued.tap(HOMES.blanket).tap(queued.game.rests().soap).wait(4)
  // The duck tucked in with the lamp down snores.
  start({ blanket: 'duck', lamp: 'down' }, false).wait(9)
  // A whole night and morning: the ending with mud still on him, a touch on the sleeper, the cat in pyjamas behind the bed, the garden, the door.
  const whole = start({ blanket: 'teddy', curtain: 'open', duck: 'foam', cat: 'wet', shade: 'foam', suds: 3, pyjamas: 'duck' })
  for (const layer of ['foam', 'wet'] as const) whole.game.fur[layer].fill(0)
  whole.tap(LAMP).wait(9)
  whole.tap(SLEEPER).wait(2).tap(HOMES.soap).wait(2).use('pyjamas', 'cat', 0, 6)
  whole.tap(AT_CURTAIN).wait(8)
  whole.tap(HOMES.towel).wait(2).tap(CURTAIN).wait(1).use('blanket', 'cat', 0, 5).use('pyjamas', 'tub', 0, 3)
  whole.tap(AT_DOOR).wait(6)
  for (let cut = 0; cut <= 8; cut += 0.5) {
    const finger = start({ blanket: 'teddy', curtain: 'open' }, false)
    finger.tap(LAMP).wait(cut).tap(WALL).wait(1)
    finger.tap(AT_CURTAIN).wait(cut).tap(WALL).wait(1)
    finger.tap(AT_DOOR).wait(cut).tap(WALL).wait(1)
    finger.use('pyjamas', 'cat', 0, Math.min(cut, 5)).tap(WALL).wait(1)
  }
}
