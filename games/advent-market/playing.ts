import type { Fair, From, Point } from './fair'
import { DOOR, ENDING } from './fair'
import { FOLK, WHO, type Who } from './hall'
import { HOLDS, handAt } from './holds'
import { TAKE_SECONDS, meetingSeconds, reactionOf } from './meetings'
import { fly, freshen, sendBack } from './moving'
import { DOORWAY, SNOW, STALLS, isStall, neighbour } from './places'
import { Scene, type Beat } from './scene'
import { leftWith, tasteOf } from './tastes'
import { copyThing, isMade, type Thing } from './things'

// The scenes: a meeting, the walk, the ending, and the touch that starts the
// next fair. Each puts its outcome into what a save keeps before its first
// beat, and asks for a save at once, so a put-away at any moment of it loses
// nothing and nothing replays on load. A touch ends a scene with every beat
// landed and unheard (scene.ts).

function play(fair: Fair, beats: Beat[]): void {
  fair.scene = new Scene(beats)
  // The outcome is already in the fair: the caller put it there and asked for the save.
  fair.scene.start(fair.time, () => {})
}

/** A cue that just happens, heard and seen only while the scene is being watched. */
const cue = (at: number, watched: () => void, lands: (finishing: boolean) => void = () => {}): Beat => ({ at, lasts: 0, play: (_p, finishing) => { lands(finishing); if (!finishing) watched() } })

/**
 * A thing is let go on a fair-goer. Saved as the meeting starts: the fair-goer holds the thing with the mark
 * its reaction will leave (or nothing, where it eats it), the thing has left its place, and what the fair-goer
 * held before lies where the thing came from.
 */
export function give(fair: Fair, who: Who, thing: Thing, from: From, at: Point): void {
  if (!isMade(thing) || (from.kind === 'who' && from.who === who)) return sendBack(fair, thing, from, at, true)
  // A scene still playing lands first: this one is a new scene.
  fair.endScene()
  const old = fair.held[who]
  if (old && from.kind === 'bench' && !fair.room()) {
    // The basket stands out in the snow, and there is no place for what the hand holds already. The fair-goer
    // shows why: it starts with its own sound and lifts the thing it has, and the offered thing goes back.
    if (fair.finished) {
      fair.folk.poke(who)
      fair.folk.kick(who, { use: 9, part: 8 })
      fair.say({ name: 'poke', who, holds: old.craft })
      return sendBack(fair, thing, from, at, true)
    }
    // No place for what it holds already: the basket rocks with its creak, and the thing flies back to its bench
    // in sight, with its own sound. Nothing returns unseen.
    fair.basketShake.v += 8
    fair.say({ name: 'basketFull' })
    fair.folk.react('full')
    return sendBack(fair, thing, from, at, true)
  }
  if (from.kind === 'slot') {
    if (old) fair.basket[from.index] = old
    else fair.basket.splice(from.index, 1)
  } else if (from.kind === 'bench') {
    if (isStall(fair.at)) freshen(fair, fair.at)
    if (old) fair.basket.push(old)
  } else {
    fair.held[from.who] = old
    fair.show(from.who, old ? copyThing(old) : null)
  }
  const left = leftWith(who, thing)
  fair.held[who] = left
  fair.changed(2)

  // What is seen: the thing arrives as it was given, and the reaction leaves its mark beat by beat.
  const given = copyThing(thing), hand = handAt(who, thing.craft)
  fair.show(who, null)
  fly(fair, given, at, hand, { kind: 'who', who })
  fair.flight!.lasts = TAKE_SECONDS
  const beats: Beat[] = [cue(TAKE_SECONDS, () => { fair.say({ name: 'take', who, scene: true }); fair.folk.kick(who, { squash: -1.2 }) }, () => fair.show(who, given))]
  const reaction = reactionOf(who, thing)
  // Which of its three sneezes: drawn from the fair's chance as the thing is given, so it is saved and not replayed.
  const sneeze = reaction.some((c) => c.sound?.name === 'sneeze') ? Math.floor(fair.rng.next() * 3) : 0
  for (const c of reaction) {
    beats.push(cue(TAKE_SECONDS + c.at, () => {
      if (c.sound) fair.say(c.sound.name === 'sneeze' ? { name: 'sneeze', variant: sneeze, scene: true } : { ...c.sound, scene: true })
      if (c.kick) fair.folk.kick(who, c.kick)
      if (c.eye) fair.folk.widen(who, 1)
      if (c.swell) fair.swell = { kind: c.swell, age: 0 }
      if (c.also) fair.folk.kick(c.also.who, c.also.kick)
      if (c.puff) {
        const onto = c.puff.onto ? { x: FOLK[c.puff.onto].eyes.x, y: FOLK[c.puff.onto].eyes.y - 30 } : null
        fair.puff(c.puff.kind, hand.x, hand.y, c.puff.count, onto)
      }
    }, () => {
      const shown = fair.shown[who]
      if (!shown) return
      if (c.mark && c.top && shown.on && left?.on) shown.on.mark = left.on.mark
      if (c.mark && !c.top && left) shown.mark = left.mark
      if (c.gone && c.top) shown.on = null
      if (c.gone && !c.top) fair.show(who, null)
    }))
  }
  // The settled pose, holding the thing as a save has it.
  beats.push(cue(meetingSeconds(who, thing), () => {}, () => { fair.show(who, left ? copyThing(left) : null); fair.flight = null }))
  play(fair, beats)
}

/** A tap on a walking lantern: that lantern lights, the hall slides by, the five shuffle along. Saved as it starts: where the child stands. */
export function walk(fair: Fair, dir: -1 | 1): void {
  fair.endScene()
  // What was still to sound of the place that is left is not heard at the next.
  fair.hushLater()
  const from = fair.at, to = neighbour(from, dir)
  fair.at = to
  fair.changed(2)
  // The bench that is left comes to rest as it stands.
  fair.dipping.settle()
  fair.bench.settle()
  fair.flight = null
  fair.clothFlown = 9
  fair.hop = { what: 'lantern', index: dir, age: 0 }
  fair.slide = { from, to, dir, p: 0 }
  let steps = 0
  play(fair, [
    cue(0, () => { fair.say({ name: 'walkLight', scene: true }); fair.flutter.v += 4 }),
    {
      at: 0.12, lasts: 1,
      play: (p, finishing) => {
        if (fair.slide) fair.slide.p = p * p * (3 - 2 * p)
        // Three shuffled steps, laid as the walk reaches each: a touch that ends the walk lays none.
        while (!finishing && steps < 3 && p >= 0.2 + steps * 0.25) { steps += 1; fair.say({ name: 'shuffle', scene: true }) }
        if (p >= 1) fair.slide = null
      },
    },
    cue(1.2, () => fair.say({ name: 'arrive', scene: true })),
  ])
}

/** How far past the sill the hand must be: the basket hangs under the hand, and all of it must be out on the snow. */
export const OUT_Y = { far: 380, near: DOORWAY.sill - 80 } as const

/** Whether the basket, let go at this point, is past the sill and on the snow. The mat and the sill itself are still the hall. */
export function overSill(at: Point): boolean {
  return at.x > DOORWAY.left && at.x < DOORWAY.right && at.y > OUT_Y.far && at.y < OUT_Y.near
}

/** How hard the two who say goodbye lean to the door: she from its left, the bundle from its right. */
const TO_DOOR = 3

/** The one last thing each fair-goer does in the ending: his tune, his breath, its chew, her fist raised, the mittens waved. */
function lastThing(fair: Fair, who: Who, at: number): Beat[] {
  const thing = fair.shown[who], hand = FOLK[who]
  switch (who) {
    case 'tuba':
      return [0, 1].map((step) => cue(at + step * 0.45, () => {
        fair.say({ name: 'tune', holds: thing ? thing.craft : null, taste: thing ? tasteOf(who, thing) : 'plain', step, scene: true })
        fair.folk.kick(who, { part: 16, dy: -40, use: thing ? 14 : 0 })
      }))
    case 'baker':
      return [cue(at, () => { fair.say({ name: 'whoosh', scene: true }); fair.folk.kick(who, { lean: -2, part: 14, squash: -1.6 }); fair.puff('flour', hand.x + HOLDS.baker.candle.x, hand.foot + HOLDS.baker.candle.y, 6) })]
    case 'goat':
      return [0, 1].map((n) => cue(at + n * 0.35, () => { fair.say({ name: 'munch', scene: true }); fair.folk.kick(who, { open: 12, part2: 10 }) }))
    // The fist raised and the mittens waved are a goodbye to the things going out into the snow: each leans to the
    // door as it does it, and every eye is on the basket out there, not on the child.
    case 'maker':
      return [cue(at, () => { fair.say({ name: 'heft', scene: true }); fair.folk.kick(who, { dy: -260, part: 14, brow: 4, lean: TO_DOOR }) })]
    case 'bundle':
      return [0, 1].map((n) => cue(at + n * 0.3, () => { fair.say({ name: 'wave', scene: true }); fair.folk.kick(who, { part2: 16, dy: -200, lean: -TO_DOOR }) }))
  }
}

/**
 * The ending: at the door, the basket is carried over the sill and let go in the snow. Saved as it starts: the
 * fair is finished. The basket and every hand keep what they hold.
 */
export function carryOut(fair: Fair, at: Point): void {
  fair.endScene()
  fair.finished = true
  fair.out = 0
  fair.changed(2)
  fair.basketFrom = at
  fair.basketAge = 0
  fair.doorTo = DOOR.wide
  const beats: Beat[] = [
    cue(0, () => fair.say({ name: 'door', scene: true })),
    cue(0.25, () => { fair.say({ name: 'gust', scene: true }); fair.flutter.v += 9; fair.puff('flour', SNOW.x, 420, 12) }),
    cue(0.45, () => { fair.say({ name: 'snowSet', scene: true }); fair.basketShake.v += 4 }),
  ]
  WHO.forEach((who, n) => beats.push(...lastThing(fair, who, 1.6 + n * 1.4)))
  beats.push({ at: ENDING.halo, lasts: ENDING.seconds - ENDING.halo - 0.2, play: (p, finishing) => { if (!finishing) fair.glow = p } })
  beats.push(cue(ENDING.halo, () => fair.say({ name: 'glow', scene: true })))
  // The door stays ajar and the basket glows in the snow: the finished fair, as a load finds it.
  beats.push(cue(ENDING.seconds, () => {}, (finishing) => {
    fair.doorTo = DOOR.ajar
    if (!finishing) fair.glow = 1
    if (finishing) { fair.doorOpen = DOOR.ajar; fair.basketAge = 9 }
  }))
  play(fair, beats)
}

/**
 * A touch on the basket in the snow takes it back to its hook and begins the next fair: the basket and every
 * hand are emptied, every piece in work is fresh, the cloths stay as they were, and the child stands at the
 * candle stall. All of it is saved at once, and the walk there is the scene.
 */
export function again(fair: Fair): void {
  fair.endScene()
  fair.finished = false
  fair.basket.length = 0
  for (const who of WHO) { fair.held[who] = null; fair.show(who, null) }
  for (const stall of STALLS) freshen(fair, stall)
  fair.glow = 0
  fair.doorTo = DOOR.rest
  fair.basketFrom = { x: SNOW.x, y: SNOW.y }
  fair.basketAge = 0
  fair.say({ name: 'hookOn' })
  // Past the door the hall comes round to the candle stall again.
  walk(fair, 1)
}
