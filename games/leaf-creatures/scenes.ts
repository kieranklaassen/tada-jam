import { BREATH, tasteOf } from './cast'
import { BEDS, ontoGround } from './clearing'
import type { Creature } from './creatures'
import { wrap } from './parts'
import { Scene, sceneLength, type Beat } from './scene'
import { keepIn } from './reach'
import { caps, count, front, placed, radius } from './things'
import type { Toy } from './toy'
import type { VoiceKey } from './voices'

// The four short scenes, each the consequence of one act, as lists of timed
// beats (scene.ts). The toy puts a scene's outcome into the state and saves
// it before the first beat plays; the beats only show the way there. A beat
// that makes a sound stays quiet when a touch is landing it unwatched, and
// at its end every beat leaves what it moved where it was taking it.

export type SceneKind = 'waking' | 'bedding' | 'eyes' | 'acorn'

/** A beat that happens once, at a moment. */
function cue(at: number, play: (finishing: boolean) => void): Beat {
  return { at, lasts: 0, play: (_progress, finishing) => play(finishing) }
}

/** A beat over a stretch of time. `first` runs once when it begins, watched; `play` on every frame and once with 1. */
function over(at: number, lasts: number, play: (p: number) => void, first?: () => void): Beat {
  let begun = false
  return { at, lasts, play: (p, finishing) => { if (!begun) { begun = true; if (!finishing) first?.() } play(p) } }
}

const ease = (p: number): number => p * p * (3 - 2 * p)

/** When each cap of a waking thing turns over, and when the rest of the waking follows. */
export const WAKING = { blow: 0.45, firstEye: 1.0, nextEye: 0.45, shake: 0.45, move: 1.5 } as const

/** The waking: the wind children blow as their taste says, the caps turn over one after the other, it shakes, and it makes the first move of its own way. */
export function wakingBeats(toy: Toy, creature: Creature): Beat[] {
  const { thing, body } = creature, { cast } = toy, taste = tasteOf(thing), eyes = caps(thing)
  const say = (key: VoiceKey, pitch = 1, level = 1): void => toy.ask(key, pitch, level, true)
  const shakeAt = WAKING.firstEye + WAKING.nextEye * (eyes - 1) + 0.4, moveAt = shakeAt + WAKING.shake + 0.15
  const beats: Beat[] = [
    // It lifts at its edges while they breathe in.
    over(0, WAKING.blow, (p) => { body.squash = p >= 1 ? 0 : 0.12 * p }),
    over(shakeAt, WAKING.shake, (p) => { body.squash = p >= 1 ? 0 : 0.14 * Math.cos(p * 15) * (1 - p) }, () => say('shake')),
    over(moveAt, WAKING.move, (p) => { creature.acting = p >= 1 ? 'none' : 'forward' }),
  ]
  for (let i = 0; i < eyes; i++) beats.push(cue(WAKING.firstEye + WAKING.nextEye * i, (finishing) => { creature.eyes = Math.max(creature.eyes, i + 1); if (!finishing) { creature.blink = 0; say('blink', 1 + 0.18 * i) } }))
  if (taste.big === 'light') {
    // Mostly feathers and wings: it sails up on the breath, and the big one puffs once more.
    beats.push(over(moveAt + 0.2, 1.3, (p) => { body.lift = p >= 1 ? 0 : 46 * Math.sin(p * Math.PI) }, () => { cast.puffOnce('big'); say('puff', 0.9) }))
  } else if (taste.big === 'heavy') {
    // Mostly twigs and seeds: it strains until it is red, and its cheeks pop.
    beats.push(over(WAKING.blow, 1.5, (p) => { cast.big.strain = Math.max(cast.big.strain, p) }, () => say('strain')))
    beats.push(over(WAKING.blow + 1.5, 1.1, (p) => { cast.big.strain = 1 - p }, () => { cast.big.puff = BREATH.big.empty - 0.12; cast.big.blowLeft = 0; say('pfft') }))
  }
  if (taste.small === 'spin') {
    // A roller: the small one spins itself round at the sight of it.
    beats.push(over(moveAt, 1.1, (p) => { cast.small.whirl = p >= 1 ? 0 : Math.PI * 2 * ease(p) }, () => say('whirl')))
  } else if (taste.small === 'afraid') {
    // Five legs or more: it hides behind its hands, and peeks over them.
    beats.push(over(0.9, 2.6, (p) => { cast.small.hide = p >= 1 ? 0 : Math.min(1, p * 8, (1 - p) * 8); cast.small.peek = p > 0.45 && p < 0.9 ? 1 : 0 }))
    beats.push(cue(0.9 + 2.6 * 0.45, (finishing) => { if (!finishing) say('peek') }))
  }
  if (taste.toad === 'like') beats.push(cue(moveAt + 0.5, (finishing) => { if (!finishing) { cast.toadCroaks(); toy.toadAt = { at: thing, age: 0 }; say('croak', 0.72) } }))
  else if (taste.toad === 'dislike') beats.push(cue(moveAt + 0.25, (finishing) => { if (!finishing) { cast.toadStarts(); toy.toadAt = { at: thing, age: 0 }; say('croak', 1.5, 0.7) } }))
  beats.push(cue(Math.max(sceneLength(beats), 4), () => { creature.inScene = false; creature.acting = 'none'; creature.rest = 0.5 }))
  return beats
}

/** Which bed under the fern is free: the first that no sleeper lies in. */
export function freeBed(toy: Toy): { x: number; y: number } {
  for (const bed of BEDS) {
    if (!toy.things.some((thing) => thing.bedded && Math.hypot(thing.x - bed.x, thing.y - bed.y) < 30) && !toy.creatures.some((c) => c.sceneEnd && Math.hypot(c.sceneEnd.x - bed.x, c.sceneEnd.y - bed.y) < 30)) return bed
  }
  return BEDS[0]
}

/** The bedding down: it yawns, goes to the fern in its own way, turns round once, and settles as its parts say. */
export function beddingBeats(toy: Toy, creature: Creature, bed: { x: number; y: number }): Beat[] {
  const { thing, body } = creature
  const say = (key: VoiceKey, pitch = 1, level = 1): void => toy.ask(key, pitch, level, true)
  const fromX = thing.x, fromY = thing.y
  // It faces the way it goes: the eyes lead, here too.
  const heading = Math.atan2(bed.y - fromY, bed.x - fromX), turnTo = wrap(heading - front(thing)), turnFrom = thing.turn
  creature.sceneEnd = { x: bed.x, y: bed.y, turn: turnTo }
  return [
    over(0, 0.9, (p) => { body.squash = p >= 1 ? 0 : 0.18 * Math.sin(p * Math.PI); creature.lids = 0.5 + 0.3 * Math.sin(p * Math.PI) }, () => say('yawn')),
    over(0.9, 0.5, (p) => { thing.turn = wrap(turnFrom + wrap(turnTo - turnFrom) * ease(p)) }),
    over(1.4, 2.6, (p) => { thing.x = fromX + (bed.x - fromX) * ease(p); thing.y = fromY + (bed.y - fromY) * ease(p); creature.acting = p >= 1 ? 'none' : 'path' }),
    over(4.0, 0.9, (p) => { thing.turn = wrap(turnTo + Math.PI * 2 * ease(p)) }, () => say('spin', 0.8, 0.7)),
    over(4.9, 0.9, (p) => { body.curl = p; creature.lids = 0.6 + 0.4 * p }, () => say('hush')),
    // A seed nose whistles once as it settles; and the toad, who likes a sleeper, croaks low.
    cue(5.25, (finishing) => { if (!finishing && count(thing, 'seed') > 0) say('whistle') }),
    cue(5.6, (finishing) => { if (!finishing) { toy.cast.toadCroaks(); toy.toadAt = { at: thing, age: 0 }; say('croak', 0.72, 0.6) } }),
    cue(5.8, () => { creature.inScene = false; creature.sceneEnd = null; creature.acting = 'none'; creature.lids = 1; body.curl = 1; thing.x = bed.x; thing.y = bed.y; thing.turn = turnTo }),
  ]
}

/** How long one part takes to leave after the one before it, when the eyes have come off. */
export const LEAVES_EVERY = 0.2

/** The eyes come off: it stops and breathes out, its parts let go, the small wind child puffs, and the parts tumble back to their heaps. */
export function eyesOffBeats(toy: Toy, creature: Creature): Beat[] {
  const { thing, body } = creature, parts = thing.parts.length
  const say = (key: VoiceKey, pitch = 1, level = 1): void => toy.ask(key, pitch, level, true)
  const flying = LEAVES_EVERY * parts
  return [
    over(0, 0.8, (p) => { body.squash = -0.2 * Math.sin((p * Math.PI) / 2); creature.lids = 0.7 * p }, () => say('sigh')),
    over(0.8, 0.6, (p) => { body.loose = p }, () => say('drop')),
    cue(1.4, (finishing) => { if (!finishing) { toy.cast.puffOnce('small'); say('puff', 1.3) } }),
    // It lays its parts into the air as it goes: the one pressed on last leaves first.
    { at: 1.5, lasts: flying, play: (p, finishing) => {
      const left = Math.max(0, parts - Math.ceil(p * parts - 1e-9))
      while (thing.parts.length > left) {
        const part = thing.parts.pop()!, where = placed(thing, part)
        // Unwatched, a part is simply back in its heap.
        if (!finishing) toy.air.sendHome(part.kind, part.look, where.x, where.y, where.turn, true, part)
      }
    } },
    // The last part is home, and nothing of it is left on the earth.
    cue(Math.max(4.2, 1.5 + flying + 0.9), () => { toy.ghost = null }),
  ]
}

/** How far a creature pushes an acorn it has dug up. */
export const PUSH = 84

/** An acorn comes up: it sniffs faster, digs, the acorn pops out, and it pushes the acorn a little way. `to` is where the push leaves the acorn. */
export function acornBeats(toy: Toy, creature: Creature, index: number, to: { x: number; y: number }): Beat[] {
  const { thing, body } = creature, shown = toy.acornShown[index]
  const say = (key: VoiceKey, pitch = 1, level = 1): void => toy.ask(key, pitch, level, true)
  const fromX = thing.x, fromY = thing.y, atX = shown.x, atY = shown.y
  const dx = to.x - atX, dy = to.y - atY, far = Math.hypot(dx, dy) || 1
  // It ends behind the acorn, having pushed it.
  const back = ontoGround(to.x - (dx / far) * 58, to.y - (dy / far) * 58, 18), end = keepIn(back.x, back.y, radius(thing))
  const turnTo = wrap(Math.atan2(dy, dx) - front(thing)), turnFrom = thing.turn
  creature.sceneEnd = { x: end.x, y: end.y, turn: turnTo }
  const beats: Beat[] = []
  for (let i = 0; i < 4; i++) beats.push(cue(i * 0.22, (finishing) => { if (!finishing) { body.squash = -0.12; say('sniff', 1.15 + 0.08 * i) } }))
  for (let i = 0; i < 3; i++) beats.push(cue(0.95 + i * 0.4, (finishing) => { if (!finishing) say('dig', 1 - 0.06 * i) }))
  beats.push(
    over(0.9, 1.3, (p) => { body.squash = p >= 1 ? 0 : -0.22 * Math.abs(Math.sin(p * Math.PI * 3)); shown.dust = p >= 1 ? 0 : 1 }),
    over(2.2, 0.45, (p) => { shown.out = p; shown.hop = p >= 1 ? 0 : Math.sin(p * Math.PI) }, () => say('pop')),
    over(2.7, 0.4, (p) => { thing.turn = wrap(turnFrom + wrap(turnTo - turnFrom) * ease(p)) }),
    over(3.1, 1.4, (p) => {
      const e = ease(p)
      thing.x = fromX + (end.x - fromX) * e; thing.y = fromY + (end.y - fromY) * e
      shown.x = atX + (to.x - atX) * e; shown.y = atY + (to.y - atY) * e; shown.spin = e * far / 20
      creature.acting = p >= 1 ? 'none' : 'path'
    }, () => say('roll')),
    cue(3.8, (finishing) => { if (!finishing) say('roll', 1.1, 0.8) }),
    cue(4.5, () => { creature.inScene = false; creature.sceneEnd = null; creature.acting = 'none'; creature.again = 9; thing.x = end.x; thing.y = end.y; thing.turn = turnTo; shown.x = to.x; shown.y = to.y; shown.out = 1; shown.hop = 0; shown.dust = 0 }),
  )
  return beats
}

/** Makes a scene of its beats and starts it on the toy's own time, with its outcome saved first. */
export function begin(toy: Toy, kind: SceneKind, beats: Beat[], saveOutcome: () => void): void {
  toy.scene = new Scene(beats)
  toy.sceneKind = kind
  toy.scene.start(toy.time, () => { saveOutcome(); toy.changed = 2 })
}
