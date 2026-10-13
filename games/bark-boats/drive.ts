import { bareBuild, type Build } from './build'
import { dragEnd, dragMove, dragStart, press, tap } from './finger'
import { EDDY, LINE, SEAT, SUN } from './layout'
import { openWorld } from './open'
import { deserialize, freshSave, serialize, type Save } from './save'
import { step } from './tick'
import { STEP, boatShown, toSave, type Heard, type World } from './world'

// Hands for the tests: a finger that presses, carries and lets go, and a
// clock that is stepped. Nothing here is part of the game, and nothing here
// reads a real clock, writes a file or looks at the machine it runs on.

/** A saved game with `build` standing on the stone and everything else laid out on the bank. */
type More = Partial<Omit<Save, 'journey'>> & { journey?: { reach: number | null; stuck: boolean; done?: boolean } }

export function saveWith(build: Partial<Build>, more: More = {}): Save {
  const boat = { ...bareBuild(build.hull === undefined ? 'bark' : build.hull), ...build }
  const fresh = freshSave(9)
  const journey = { ...fresh.journey, ...(more.journey ?? {}) }
  return deserialize(serialize({ ...fresh, ...more, journey, boat: { ...fresh.boat, ...boat, ...(more.boat ?? {}) }, loose: [] }))
}

export function worldWith(build: Partial<Build>, more: More = {}, seed = 1): World {
  return openWorld(saveWith(build, more), seed)
}

/** Plays `seconds` in whole steps and hands back everything heard, each sound with the time of the step it was queued on. */
export function run(w: World, seconds: number): (Heard & { at: number })[] {
  const heard: (Heard & { at: number })[] = drain(w)
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    step(w, STEP)
    heard.push(...drain(w))
  }
  return heard
}

/** Takes what was queued since the last look. */
export function drain(w: World): (Heard & { at: number })[] {
  const heard = w.sounds.map((sound) => ({ ...sound, at: w.time }))
  w.sounds.length = 0
  return heard
}

/** A tap: down and up at one spot. */
export function poke(w: World, x: number, y: number): void {
  press(w, x, y)
  tap(w)
}

/** A carry: down at `from`, across to `to` over a few steps, and let go there. */
export function carry(w: World, from: { x: number; y: number }, to: { x: number; y: number }, seconds = 0.3): void {
  press(w, from.x, from.y)
  dragStart(w)
  const steps = Math.max(2, Math.round(seconds / STEP))
  for (let i = 1; i <= steps; i++) {
    dragMove(w, from.x + ((to.x - from.x) * i) / steps, from.y + ((to.y - from.y) * i) / steps)
    step(w, STEP)
  }
  dragEnd(w)
}

/** Lifts the boat off the stone and lets it go over the eddy, and waits until it floats. */
export function launch(w: World, x = (EDDY.left + EDDY.right) / 2): void {
  // By the hull, at its stern end, clear of everything that stands on it.
  carry(w, { x: SEAT.x + 84, y: SEAT.y - 12 }, { x: x + 84, y: LINE - 60 })
  run(w, 1)
}

/** A finger laid in the water behind the boat, which is upstream of it. */
export function ringBehind(w: World): void {
  poke(w, Math.min(1120, boatShown(w).x + 215), LINE + 42 + (w.journey.low ? 46 : 0))
}

/**
 * Sends the boat down the brook as a patient child would: a ring behind it whenever it is still. Stops when
 * `until` says so or `limit` seconds have gone, and says whether `until` was met.
 */
export function sail(w: World, until: (w: World) => boolean, limit = 240): boolean {
  let since = 0
  for (let t = 0; t < limit; t += STEP) {
    if (until(w)) return true
    since += STEP
    const still = w.boat.mode === 'afloat' || (w.boat.mode === 'brook' && (w.journey.phase === 'held' || w.journey.phase === 'wait'))
    if (still && since > 1.2) { ringBehind(w); since = 0 }
    step(w, STEP)
  }
  return until(w)
}

export const saved = (w: World): string => JSON.stringify(toSave(w))

/** Everything about the world that a child could see or that is kept, as one string: two worlds that match here are the same picture. */
export function picture(w: World): string {
  const boat = w.boat, j = w.journey
  return JSON.stringify({
    save: toSave(w),
    where: w.where, finished: w.finished, frame: w.frame, cam: Math.round(w.cam), gnomeAt: w.gnomeAt,
    // Afloat, the boat rides the water up and down a little: that is its idle motion, and no part of where it is.
    boat: { mode: boat.mode, x: Math.round(boat.x), y: boat.mode === 'stone' || boat.mode === 'none' ? Math.round(boat.y) : 0, face: boat.face, at: boat.at },
    journey: { reach: j.reach, stuck: j.stuck, phase: j.phase, low: j.low, holder: j.holder?.id ?? null, queue: j.queue.map((act) => act.id) },
    show: { ...w.show, lamps: [...w.show.lamps] },
    scene: w.scene?.name ?? null,
    acts: w.acts.map((each) => each.act.id),
    pieces: w.pieces.map((piece) => `${piece.kind}:${piece.mode}:${piece.place.on}`).sort(),
    hand: w.hand?.on ?? null,
    rings: w.rings.length, puffs: w.puffs.length,
  })
}

/** Lifts the sun at the finished pond far enough to start the morning. */
export function liftSun(w: World): void {
  press(w, SUN.x, SUN.pond)
  dragStart(w)
  for (let i = 1; i <= 10; i++) {
    dragMove(w, SUN.x, SUN.pond - (i * (SUN.lift + 20)) / 10)
    step(w, STEP)
  }
  dragEnd(w)
}
