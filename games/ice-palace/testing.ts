import { covers, borne, overWater, widthOf, type Rest } from './blocks'
import { BERRY } from './first'
import { DRIFT, SUN, inHole } from './ground'
import { Play } from './play'
import { STAGE } from './stage'
import { STEP, Toy, type World } from './toy'
import { hareOut } from './toyDay'
import { HOP_S } from './toyPieces'

// What the tests share: a bare clearing, and a finger. The finger goes through
// `Play`, which is the path the Mount takes: a tap is a press and a lift with
// no move between, a drag ends on its lift where the lift is the act, and a
// line waits out a skip of the finger. No test calls the toy's own press,
// drag, lift, drop or release, so a test of a touch holds what a child's touch
// does. Nothing here writes a file or reads the environment, and nothing in
// the game imports it.

export const bare = (night = false): World => ({ night, blocks: [{ ...BERRY }], holes: [], drift: 0, icicles: [] })
export const names = (toy: Toy): string[] => toy.takeSounds().map((sound) => sound.name)
export const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T

/** The Mount's play with nothing listening: what the toy asked for stays on the toy, where a test reads it. */
class Finger extends Play {
  ms = 0
  seconds = 0
  at = { x: 0, y: 0 }
  constructor(toy: Toy) {
    super({ speak: () => {}, hush: () => {}, save: () => {}, settle: () => {} })
    this.toy = toy
    this.width = STAGE.width
    this.height = STAGE.height
  }
  override flush(): void {}
}
const fingers = new WeakMap<Toy, Finger>()
export function fingerOf(toy: Toy): Finger {
  let finger = fingers.get(toy)
  if (!finger) fingers.set(toy, (finger = new Finger(toy)))
  return finger
}

/** One frame of attended play, as the Mount's loop makes it: the tracker is asked first, then the toy plays one step. */
export function frame(toy: Toy): void {
  const finger = fingerOf(toy)
  finger.ms += 1000 * STEP
  finger.seconds += STEP
  finger.frame(finger.ms, STEP, finger.seconds)
}
export const run = (toy: Toy, seconds: number): void => {
  for (let i = 0; i < Math.round(seconds / STEP); i++) frame(toy)
}

/** The finger lands. */
export function press(toy: Toy, x: number, y: number): void {
  const finger = fingerOf(toy)
  finger.at = { x, y }
  finger.down(1, finger.at, finger.ms, finger.seconds)
}
/** The finger moves, still down. */
export function moveTo(toy: Toy, x: number, y: number): void {
  const finger = fingerOf(toy)
  finger.at = { x, y }
  finger.move(1, finger.at)
}
/** The finger lifts where it is: a tap if it never moved, and otherwise the end of its drag as the Mount takes it. */
export function letGo(toy: Toy): void {
  const finger = fingerOf(toy)
  finger.up(1, finger.at, finger.ms)
}
/** The browser takes the finger away, which is not the child letting go. */
export function takeAway(toy: Toy): void {
  fingerOf(toy).cancel(1)
}
/** A press and a lift with no move between, the finger resting `held` seconds. */
export function tap(toy: Toy, x: number, y: number, held = 0): void {
  press(toy, x, y)
  if (held > 0) run(toy, held)
  letGo(toy)
}

/** A finger goes from one place to another in `steps` moves and stays down. */
export function drag(toy: Toy, x0: number, y0: number, x1: number, y1: number, steps = 10): void {
  press(toy, x0, y0)
  for (let i = 1; i <= steps; i++) moveTo(toy, x0 + ((x1 - x0) * i) / steps, y0 + ((y1 - y0) * i) / steps)
}
/** A finger draws a straight line and lets go; the block has come out and landed. */
export function cut(toy: Toy, x0: number, y0: number, x1: number, y1: number): void {
  drag(toy, x0, y0, x1, y1)
  letGo(toy)
  run(toy, HOP_S + 0.1)
}
/** A finger carries the thing under it to another place and lets go; it has come to rest. */
export function carry(toy: Toy, x0: number, y0: number, x1: number, y1: number, settle = 1.6): void {
  drag(toy, x0, y0, x1, y1, 8)
  letGo(toy)
  run(toy, settle)
}
/** A hand goes through the drift for `far` units and lets go where it has got to. */
export function scoop(toy: Toy, far: number, toX = DRIFT.cx - 200, toY = DRIFT.cy + 20): void {
  press(toy, DRIFT.cx, DRIFT.cy)
  const steps = Math.max(2, Math.ceil(far / 20))
  for (let i = 1; i <= steps; i++) moveTo(toy, DRIFT.cx + ((toX - DRIFT.cx) * i) / steps, DRIFT.cy + ((toY - DRIFT.cy) * i) / steps + (i % 2 ? far / steps / 2 : -far / steps / 2))
  letGo(toy)
  run(toy, 1.6)
}
/** The sun is pulled down past the ridge, or lifted back over it, and let go. A scene starts. */
export function pullSun(toy: Toy, down: boolean): void {
  drag(toy, SUN.x, toy.sunY - 10, SUN.x, down ? SUN.night + 10 : SUN.day - 10, 8)
  letGo(toy)
}
/** Night has come and its scene is over: the lamps are lit and the king has sat down. */
export function toNight(toy: Toy): void {
  pullSun(toy, true)
  run(toy, 12)
}
export function toMorning(toy: Toy): void {
  pullSun(toy, false)
  run(toy, 7)
}

/** What must hold of any clearing at rest: nothing covers anything, nothing lies over open water, what stands is borne, and there is one berry block. Returns what is wrong, in words. */
export function faults(world: World): string[] {
  const found: string[] = []
  const wall = world.blocks.filter((b) => b.place === 'built' || b.place === 'hung')
  const say = (b: Rest): string => `${b.kind} at ${b.x},${b.y} (${b.place})`
  world.blocks.forEach((a, i) => {
    for (const b of world.blocks.slice(i + 1)) if (covers(a.x, a.y, widthOf(a), b.x, b.y, widthOf(b))) found.push(`${say(a)} covers ${say(b)}`)
    if (a.place === 'lying') for (const hole of world.holes) if (overWater(widthOf(a), a.x, a.y, hole)) found.push(`${say(a)} lies over water`)
    if (a.place === 'afloat' && !world.holes.some((hole) => inHole(hole, a.x, a.y))) found.push(`${say(a)} floats on ice`)
    if (a.place === 'built' && !borne(a, wall)) found.push(`${say(a)} stands on nothing`)
  })
  if (world.blocks.filter((b) => b.kind === 'berry').length !== 1) found.push('not one berry block')
  return found
}

/**
 * Everything of a toy that reaches the surface or the next touch, other than the clock of play and what is a
 * curve of it (the idles and the fish). The hare is held by how long it is until it next comes out. A toy that was put away and a toy loaded from its save must
 * give the same.
 */
export function surface(toy: Toy): unknown {
  // A thing's id is the order it was made in, which a load starts afresh: what names a thing by its id is compared by the thing's place in the list.
  const nth = (id: number): number => toy.pieces.findIndex((piece) => piece.id === id)
  const tasted = (taste: { x: number; y: number; id: number } | null): unknown => (taste ? { ...taste, id: nth(taste.id) } : null)
  return copy({
    pieces: toy.pieces.map(({ kind, len, x, y, turn, mode, rest, dent, cap, capAge, heat, squash, wobble, path, fizz }) => ({ kind, len, x, y, turn, mode, rest, dent, cap, capAge, heat, squash, wobble, path, fizz })),
    holes: toy.holes,
    cast: toy.cast,
    hand: toy.hand, cut: toy.cut, lastCut: toy.lastCut, scoop: toy.scoop, sunHand: toy.sunHand, finger: toy.finger,
    night: toy.night, drift: toy.drift, icicles: toy.icicles, driftShown: toy.driftShown, iciclesShown: toy.iciclesShown,
    sunY: toy.sunY, sunV: toy.sunV, flood: toy.flood, lampsLit: toy.lampsLit, nightNow: toy.nightNow, lit: [...toy.lit.values()],
    taste: { ...toy.taste, shut: tasted(toy.taste.shut), clear: tasted(toy.taste.clear) },
    rapped: toy.knocked !== 0, shutLamps: toy.shutLamps, lampWalk: toy.lampWalk, rap: toy.rap ? { ...toy.rap, id: nth(toy.rap.id) } : null,
    king: { ...toy.king, seat: nth(toy.king.seat), tried: nth(toy.king.tried), tested: nth(toy.king.tested) },
    kids: toy.kids, bird: toy.bird, fishStare: toy.fishStare, hareBolt: toy.hareBolt, hare: hareOut(toy), hareIn: Math.round((toy.hareAt - toy.time) * 1000) / 1000,
    snowing: toy.snowing, scene: toy.sceneRunning,
  })
}
