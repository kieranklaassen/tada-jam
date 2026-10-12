import { onFern } from './cast'
import { ACORN_REACH, BED_REACH, CAST, EARTH, FERN, GROUND, HEAPS, WAIT_AT, WAIT_REACH, castAt, freeSpot, heapAt, inEllipse, inGrownUpCorner, onEarth, ontoGround } from './clearing'
import { about, poke, pokeWaits, type Creature } from './creatures'
import { newHand, type Hand } from './hand'
import { countsAsDone } from './input'
import { MANNERS, PICK_REACH, SHAPES, STICK_SLACK, gap, reach, type Kind, type Placed } from './parts'
import { MAX_REACH } from './config'
import { LAY_TURN, landingOn, pressOn, reachWith } from './placing'
import { outside, partUnder } from './posed'
import { beddingBeats, begin, eyesOffBeats, freeBed } from './scenes'
import { caps, isFull, nearest, partAt, placed, toThing, type Thing } from './things'
import { LOOKS } from './pen'
import type { Grip, Toy } from './toy'

// What a finger does in the clearing. A press is answered in the call that
// brings it, on whatever is drawn topmost under it; a tap, a drop and a
// stroke are told apart as the touch goes on; and a touch that is taken away
// (a cancel) never acts for the child.

/** How far a finger strokes along a creature, in stage units, before the stroke counts. */
export const STROKE = 90
/** How near a creature's parts a stroking finger stays. */
export const STROKE_REACH = 46
/** How far clear of a creature's outline a finger has dragged an eye before it comes off: a cap's width. */
export const PULL_CLEAR = SHAPES.cap.wide
/** How far off a creature's outline a finger that landed on an eye may be and still be on the creature. */
export const ON_IT = 12
/** The furthest an eye is stretched out of its place after a finger. */
export const TUG_MOST = 24
/** How near its middle a dug acorn is itself what is touched, whatever lies beside it: 48 pixels across at the narrower of the two sizes kid-land is shown at. */
export const ACORN_HIT = 28

/** The creatures in the order they are drawn, the one drawn last first: those up and about by how low on the page they stand, then the sleepers, who lie under everyone. */
function topmost(toy: Toy): Creature[] {
  const up = toy.creatures.filter((creature) => !creature.thing.bedded && !creature.inScene).sort((a, b) => b.thing.y - a.thing.y)
  return [...up, ...toy.creatures.filter((creature) => creature.thing.bedded && !creature.inScene).reverse()]
}

/** What is drawn topmost under a point: a creature's part as it is posed now, a loose part, or a dug acorn. Exactly under it first, then within a small hand's reach. */
export function under(toy: Toy, x: number, y: number): { creature: Creature; index: number } | { thing: Thing; index: number } | { acorn: number } | null {
  for (const within of [0, PICK_REACH]) {
    for (const creature of topmost(toy)) {
      // A creature is touched where it is drawn: lifted in a hop, squashed, tumbling, leaning, or small and curled up asleep.
      const index = partUnder(creature, x, y, within)
      if (index >= 0) return { creature, index }
    }
    // A dug acorn lies on top of whatever lies loose: on the acorn itself the acorn is touched, whatever lies beside or under it.
    const acorn = (reach: number): number => {
      for (let i = toy.acorns.length - 1; i >= 0; i--) {
        const shown = toy.acornShown[i]
        if (toy.acorns[i].dug && Math.hypot(shown.x - x, shown.y - y) <= reach) return i
      }
      return -1
    }
    if (within === 0) { const i = acorn(ACORN_HIT); if (i >= 0) return { acorn: i } }
    for (let t = toy.things.length - 1; t >= 0; t--) {
      const thing = toy.things[t]
      if (thing.awake) continue
      const index = partAt(thing, x, y, within)
      if (index >= 0) return { thing, index }
    }
    if (within > 0) { const i = acorn(ACORN_REACH); if (i >= 0) return { acorn: i } }
  }
  return null
}

/** The finger lands. A scene that is playing ends first; then whatever the finger landed on answers in this call. */
export function press(toy: Toy, x: number, y: number): void {
  if (inGrownUpCorner(x, y)) return
  toy.endScene()
  toy.touched = true
  toy.lastTouch = { x, y, age: 0 }
  toy.stirred = true
  // The heaps and the three who watch stand in front of everything on the ground, and are touched first.
  const heap = heapAt(x, y)
  if (heap) {
    toy.hand = newHand(heap, Math.floor(toy.rng.next() * LOOKS), null, HEAPS[heap].x, HEAPS[heap].y - 14, x, y)
    toy.heaps[heap].speed -= MANNERS[heap].slump * 9
    toy.ask(`lift-${heap}`)
    return
  }
  const who = castAt(x, y)
  if (who) {
    toy.cast.touch(who)
    toy.heed = { at: CAST[who], age: 0 }
    toy.ask(who === 'toad' ? 'croak' : 'puff', who === 'small' ? 1.3 : 1)
    if (who !== 'toad') toy.air.shake(CAST[who].x, CAST[who].y + 60, toy.airRng)
    return
  }
  // The eyes that wait between the trunks: that one comes back. They are drawn over whoever stands there and are
  // touched before it, so they are never out of reach.
  const away = toy.away
  if (away && !away.creature && Math.hypot(x - WAIT_AT[away.side].x, y - WAIT_AT[away.side].y) <= WAIT_REACH) { toy.comeBack(); return }
  const hit = under(toy, x, y)
  if (hit && 'creature' in hit && hit.creature.thing.bedded) { rouse(toy, hit.creature); return }
  if (hit && 'creature' in hit) {
    toy.heed = { at: hit.creature.thing, age: 0 }
    // A finger on a creature: it gives softly and looks. Whether this is a poke, a stroke or a pull is told as the touch goes on.
    const { creature, index } = hit
    creature.held = index
    if (!creature.leaving) creature.target = null
    toy.grip = { creature, index, x, y, stroked: 0, spent: false, onEye: creature.thing.parts[index].kind === 'cap', out: false }
    toy.ask('feel', creature.thing.parts[index].kind === 'cap' ? 1.3 : 1)
    return
  }
  if (hit && 'thing' in hit) {
    const part = hit.thing.parts[hit.index], where = placed(hit.thing, part)
    part.inHand = true
    toy.hand = newHand(part.kind, part.look, { thing: hit.thing, part }, where.x, where.y, x, y)
    toy.ask(`lift-${part.kind}`)
    return
  }
  if (hit) {
    // A dug acorn is pressed back under the earth where it lies.
    toy.acorns[hit.acorn].dug = false
    toy.heed = { at: toy.acornShown[hit.acorn], age: 0 }
    toy.ask('pat', 0.8)
    toy.changed = 2
    return
  }
  // A sleeper too small to find by its parts is still found by its bed.
  for (const creature of toy.creatures) {
    if (!creature.thing.bedded || creature.inScene || Math.hypot(creature.thing.x - x, creature.thing.y - y) > BED_REACH) continue
    rouse(toy, creature)
    return
  }
  if (onFern(x, y)) { toy.cast.touch('fern'); toy.heed = { at: FERN, age: 0 }; toy.ask('frond'); return }
  if (!inEllipse(x, y, GROUND, 60)) {
    // The tree tops, a trunk, the grass at the edge: a leaf comes loose where the finger is.
    toy.air.shake(x, y, toy.airRng)
    toy.ask('frond', 1.25, 0.7)
    return
  }
  // Bare ground: the finger leaves a mark and calls whoever is awake.
  toy.finger = ontoGround(x, y, 20)
  // The call is given in the touch itself, so the quickest tap, lifted before a frame has passed, still calls.
  let comes: Creature | null = null
  for (const creature of toy.creatures) {
    if (!about(creature) || creature.inScene || creature.thing.drowsy || creature.tumble || creature.leap || creature.entering) continue
    creature.target = { x: toy.finger.x, y: toy.finger.y }
    creature.rest = 0
    if (!comes || Math.hypot(creature.thing.x - x, creature.thing.y - y) < Math.hypot(comes.thing.x - x, comes.thing.y - y)) comes = creature
  }
  // The three look at whoever answers the call, not at the finger; with nobody to come, at nothing new.
  toy.heed = comes ? { at: comes.thing, age: 0 } : null
  toy.scuffs.push({ x, y, age: 0 })
  if (toy.scuffs.length > 1) toy.scuffs.shift()
  toy.ask('pat', 0.9 + (y - GROUND.y) / 900)
}

/** A sleeper wakes where it lies, with no scene. */
function rouse(toy: Toy, creature: Creature): void {
  creature.thing.bedded = false
  creature.blink = 1; creature.rest = 1.2
  toy.heed = { at: creature.thing, age: 0 }
  toy.ask('blink', 0.9)
  toy.changed = 2
}

/** The finger moves: with a part in the hand, along a creature, pulling at an eye, or calling on the ground. */
export function move(toy: Toy, x: number, y: number): void {
  toy.lastTouch = { x, y, age: 0 }
  if (toy.hand) { toy.hand.fingerX = x; toy.hand.fingerY = y; toy.hand.waiting = false; toy.hand.waited = 0; return }
  const grip = toy.grip
  if (!grip) { if (toy.finger) toy.finger = ontoGround(x, y, 20); return }
  const went = Math.hypot(x - grip.x, y - grip.y)
  grip.x = x; grip.y = y
  // One that is walking off is poked and nothing more.
  if (grip.spent || grip.creature.leaving) return
  const { creature } = grip, { thing } = creature, far = outside(creature, x, y)
  if (grip.onEye) {
    // The finger landed on an eye. While it stays on the creature this is a stroke like any other. Off the outline,
    // the eye is stretched after it, and comes off once the finger is a cap's width clear.
    if (far >= PULL_CLEAR) { pullOff(toy, creature, grip.index, x, y); return }
    if (far > ON_IT) {
      grip.out = true
      const at = placed(thing, thing.parts[grip.index]), dx = x - at.x, dy = y - creature.body.lift - at.y, d = Math.hypot(dx, dy) || 1
      const pull = Math.min(TUG_MOST, far * 0.5), c = Math.cos(-thing.turn - creature.body.roll), s = Math.sin(-thing.turn - creature.body.roll)
      creature.tug = { index: grip.index, x: ((dx * c - dy * s) / d) * pull, y: ((dx * s + dy * c) / d) * pull }
      return
    }
    if (grip.out) snapBack(toy, grip, true)
  }
  if (far <= (grip.onEye ? ON_IT : STROKE_REACH)) {
    grip.stroked += went
    // It leans into the finger that strokes it.
    const dx = x - thing.x, dy = y - thing.y, d = Math.hypot(dx, dy)
    if (d > 1) { creature.leanX = dx / d; creature.leanY = dy / d }
    creature.lean = Math.min(1, creature.lean + went / 40)
  }
  if (grip.stroked >= STROKE) { grip.spent = true; stroke(toy, creature) }
}

/** An eye that was stretched out and not pulled clear snaps back into its place, with its own sound when the child let it go. */
function snapBack(toy: Toy, grip: Grip, heard: boolean): void {
  const { creature } = grip
  grip.out = false
  if (!creature.tug) return
  creature.tug = null
  if (!heard) return
  const part = creature.thing.parts[grip.index]
  if (part) part.settle = 1
  toy.ask('press-cap')
}

/** A cap is dragged clear of its creature: it is in the hand, and a creature left with one eye comes apart. */
function pullOff(toy: Toy, creature: Creature, index: number, x: number, y: number): void {
  const { thing } = creature, part = thing.parts[index], where = placed(thing, part)
  creature.held = -1; creature.poke = null; creature.tug = null
  toy.grip = null
  toy.ask('lift-cap')
  toy.changed = 2
  if (caps(thing) > 2) {
    // It has eyes to spare and stays awake. The cap is lifted like a part from the earth: until it is pressed on
    // somewhere it is still this creature's, and goes back on it if the touch is taken away or the game put away.
    part.inHand = true
    toy.hand = newHand('cap', part.look, { thing, part }, where.x, where.y, x, y)
    toy.hand.pulled = true; toy.hand.was = part
    creature.eyes = caps(thing) - 1
    return
  }
  // Fewer than two eyes: the scene "The eyes come off". It is out of the record from this call.
  thing.parts.splice(index, 1)
  toy.hand = newHand('cap', part.look, null, where.x, where.y, x, y)
  toy.hand.pulled = true; toy.hand.was = part
  creature.inScene = true; creature.habit = null; creature.tumble = null; creature.leap = null; creature.target = null
  toy.things.splice(toy.things.indexOf(thing), 1)
  toy.creatures.splice(toy.creatures.indexOf(creature), 1)
  toy.ghost = creature
  begin(toy, 'eyes', eyesOffBeats(toy, creature), () => {})
}

/** A stroke along a creature: the first makes it drowsy, and the second, on a drowsy one, beds it down. */
function stroke(toy: Toy, creature: Creature): void {
  const { thing } = creature
  if (!thing.drowsy) {
    thing.drowsy = true
    creature.target = null; creature.habit = null
    toy.ask('purr')
    toy.changed = 2
    return
  }
  // The scene lets go of the finger that started it.
  toy.grip = null
  creature.held = -1; creature.poke = null; creature.habit = null; creature.target = null
  creature.inScene = true
  const beats = beddingBeats(toy, creature, freeBed(toy))
  begin(toy, 'bedding', beats, () => { thing.bedded = true; thing.drowsy = false })
}

function letGo(toy: Toy, poked: boolean): void {
  const grip = toy.grip
  toy.grip = null
  if (!grip) return
  const { creature } = grip
  creature.held = -1
  // An eye that was stretched out and let go short of coming off snaps back, heard; that is no poke.
  if (grip.out) { snapBack(toy, grip, poked); return }
  if (!poked || grip.spent || creature.inScene) return
  // The finger lifted without stroking it or dragging a part clear: a poke on the part it landed on.
  const index = Math.min(grip.index, creature.thing.parts.length - 1)
  poke(creature, index, grip.x, grip.y)
  // It answers in the lift; thrown along or in the air it cannot, and the sound waits for the motion.
  if (!pokeWaits(creature) && creature.poke) { creature.poke.said = true; toy.ask(`poke-${creature.thing.parts[index].kind}`) }
  toy.changed = 2
}

/** The press was a tap. A part fresh from its heap flies to the earth by itself; a part that lay there goes back down where it was; a creature is poked. */
export function tap(toy: Toy): void {
  const hand = toy.hand
  toy.finger = null
  letGo(toy, true)
  if (!hand) return
  toy.hand = null
  if (hand.from) { hand.from.part.inHand = false; hand.from.part.fall = 0.05; return }
  fly(toy, hand)
}

/** The finger let go at the end of a carry: the part is pressed on where it is. */
export function drop(toy: Toy): void {
  const hand = toy.hand
  toy.finger = null
  letGo(toy, true)
  if (!hand) return
  toy.hand = null
  const at: Placed = { kind: hand.kind, x: hand.x, y: hand.y, turn: hand.turn }
  if (castAt(hand.x, hand.y) === 'toad' || castAt(hand.fingerX, hand.fingerY) === 'toad') {
    // On the toad: it wears the part as a hat until its next gulp. A hat it had goes home first.
    if (hand.from) { toy.takeOut(hand.from.thing, hand.from.part); const was = toy.creatureOf(hand.from.thing); if (was) was.eyes = Math.min(was.eyes, caps(hand.from.thing)) }
    const toad = toy.cast.toad
    if (toad.hat) toy.air.sendHome(toad.hat.kind, toad.hat.look, CAST.toad.x, CAST.toad.y - 66, toad.hat.turn)
    toad.hat = { kind: hand.kind, look: hand.look, turn: 0, age: 0 }
    toad.squashSpeed = -3; toad.lids = 0
    toy.ask(`press-${hand.kind}`)
    return
  }
  if (hand.from) { toy.takeOut(hand.from.thing, hand.from.part); const was = toy.creatureOf(hand.from.thing); if (was) was.eyes = Math.min(was.eyes, caps(hand.from.thing)) }
  const pressed = pressOn(toy.things, hand.kind, hand.look, at, () => toy.nextId++)
  if (pressed.how === 'on') { pressed.part.fall = MANNERS[hand.kind].fall; toy.settled(pressed.thing); return }
  if (pressed.how === 'shaken') {
    // The thing carries all it can: it shakes, and the new part pops off and flutters back to its heap.
    const creature = toy.creatureOf(pressed.thing)
    if (creature) creature.body.squash = -0.3
    // A thing that was never woken shakes too: the parts nearest the one too many ring out as if they had just been pressed on.
    else shiver(pressed.thing, at)
    toy.air.sendHome(hand.kind, hand.look, at.x, at.y, at.turn)
    toy.ask('back', 1.2)
    return
  }
  // Off the earth. A part that had come half of the way from its heap flutters the rest; any other goes back to its heap.
  if (!hand.from && !hand.pulled && countsAsDone({ x: hand.startX, y: hand.startY }, at, EARTH)) { fly(toy, hand); return }
  toy.air.sendHome(hand.kind, hand.look, hand.x, hand.y, hand.turn)
  toy.ask('back')
  toy.changed = 2
}

/** How many parts of a thing never woken shake when it shakes one off. */
export const SHIVERS = 5

function shiver(thing: Thing, at: Placed): void {
  const near = thing.parts.filter((part) => !part.inHand && part.fall === 0).sort((a, b) => gap(placed(thing, a), at) - gap(placed(thing, b), at))
  for (const part of near.slice(0, SHIVERS)) part.settle = 1
}

/** The carry or the press was taken away, which is no act of the child's: nothing is pressed on, poked or laid. */
export function cancel(toy: Toy): void {
  const hand = toy.hand
  toy.hand = null
  toy.finger = null
  letGo(toy, false)
  if (!hand) return
  if (hand.from) {
    // Whatever was lifted from where it lay is there again: a part on the earth, and an eye on a creature that had eyes to spare.
    hand.from.part.inHand = false
    const was = toy.creatureOf(hand.from.thing)
    if (was) was.eyes = caps(hand.from.thing)
    // The same check a lift makes: a thing that has two caps lying on it now, because one landed while the other
    // was in the hand, wakes. What is saved and what is there never disagree.
    else toy.wakeIfEyed(hand.from.thing)
  }
  // The cap whose lifting took a creature's eyes off is nobody's now: it goes home.
  else if (hand.pulled) toy.air.sendHome(hand.kind, hand.look, hand.x, hand.y, hand.turn)
}

/** Whether a part could come to lie at `at` without lying on another thing, a dug acorn, or off the earth. */
function clearFor(toy: Toy, target: Thing | null, at: Placed): boolean {
  if (!onEarth(at.x, at.y)) return false
  for (const other of toy.things) if (other !== target && !other.bedded && nearest(other, at).gap <= STICK_SLACK + 8) return false
  for (const acorn of toy.acorns) if (acorn.dug && reach(at, acorn.x, acorn.y) < ACORN_REACH) return false
  return true
}

/** The things a tapped part may go to, the likeliest first: the one the child began. A lone part that was only set down somewhere does not draw the rest to it while a larger thing is being made. */
function wanted(toy: Toy, kind: Kind): Thing[] {
  const open = toy.things.filter((thing) => !thing.awake && !isFull(thing, kind))
  const rank = (thing: Thing): number => (thing.parts.length >= 2 ? 0 : 2) + (thing === toy.focus ? 0 : 1)
  // Things are kept in the order they were begun, and a sort keeps that order among equals.
  return open.sort((a, b) => rank(a) - rank(b))
}

/** The thing a tapped part goes to, or null when it will begin one. */
export function making(toy: Toy, kind: Kind): Thing | null {
  return wanted(toy, kind)[0] ?? null
}

/** A part goes to the earth by itself: on to the thing being made, or to a free spot to begin one. */
function fly(toy: Toy, hand: Hand): void {
  let target: Thing | null = null
  let at: Placed | null = null
  // On to the thing being made; if that has no place left on the earth for it, on to the next; and then a thing of its own.
  for (const onto of wanted(toy, hand.kind)) {
    const spot = landingOn(onto, hand.kind, (where) => clearFor(toy, onto, where))
    if (!spot || !onEarth(spot.x, spot.y) || reachWith(onto, [{ kind: hand.kind, x: spot.x - onto.x, y: spot.y - onto.y }]) > MAX_REACH) continue
    target = onto; at = spot
    break
  }
  if (!at) {
    const taken: { x: number; y: number }[] = [...toy.things.filter((thing) => !thing.bedded), ...toy.acorns.filter((acorn) => acorn.dug)]
    const spot = freeSpot(taken)
    at = { kind: hand.kind, x: spot.x, y: spot.y, turn: LAY_TURN[hand.kind] }
    // And where no free earth is left at all, it flutters back to its heap.
    if (!clearFor(toy, null, at)) { toy.air.sendHome(hand.kind, hand.look, hand.x, hand.y, hand.turn); toy.ask('back'); return }
  }
  const pressed = pressOn(toy.things, hand.kind, hand.look, at, () => toy.nextId++, target)
  if (pressed.how !== 'on') { toy.air.sendHome(hand.kind, hand.look, hand.x, hand.y, hand.turn); toy.ask('back'); return }
  target = pressed.thing
  const part = pressed.part, from = toThing(target, hand.x, hand.y)
  part.fromX = from.x; part.fromY = from.y
  part.flight = 0.34 + Math.hypot(from.x - part.x, from.y - part.y) / 1500
  part.fall = part.flight
  toy.settled(target)
}
