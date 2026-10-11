import { describe, expect, it } from 'vitest'
import { BODY, CAT, LINE_SIZE, FEET_Y, FRIEND_KINDS, GATE, GATEWAY, HUNG, PLACE_X, PUDDLE, RAIL, SOAP, TUB_SIZE, TUB_SLOTS, WAIT_FEET, WAIT_X, YARD_SCALE, bodyOval, heldAt, hungLow, hungReach, hungStretch, lineSpot, pegHome, type Spot } from './layout'
import { below, makeRng } from './rng'
import { deserialize } from './save'
import { STAGE } from './stage'
import { BOARD_SPOT, flown, type Figure, type Garment, type Yard } from './yard'
import { JUMPER_STRETCH, linePose } from './motion'
import { FRAME, callIn, carry, open, play, reopened, stored, tapAt, waitingAt, watch } from './testHands'

// Nothing passes through anything. The game is drawn on a canvas, so the audit
// that reads a three.js scene has nothing to read: these tests play the real
// model at 60 frames a second with seeded hands, reach every state it has,
// and hold on every frame that no two things are in one place.
//
// Five overlaps are meant, and are held to what they are:
// - A friend holds its garment out in front of itself, and so in front of
//   whatever it wears.
// - The three stand shoulder to shoulder, so a friend also holds its garment
//   out in front of the neighbour on its left and of what that neighbour
//   wears. The held garment is drawn in front; a sock on the goat's tail is
//   hidden behind it until the neighbour hands its garment over.
// - What floats in the tub floats as a heap, as washing does: each thing has
//   a slot of its own, and a touch takes the one whose middle is nearest.
// - A friend that bathes stands in the tub behind what floats there, with its
//   legs under the water.
// - What a child drops on the grass may lie on something else the child
//   dropped there. Nothing the game places by itself lands on another thing.

const GATE_AT = { x: GATE.x + GATE.w / 2, y: GATE.y + GATE.h / 2 }
const WATER = { x: 372, y: 676 }
const bodyAt = (friend: number): Spot => ({ x: PLACE_X[friend], y: FEET_Y - (FRIEND_KINDS[friend] === 'heron' ? 232 : 180) * YARD_SCALE })
const apart = (a: Spot, b: Spot) => Math.hypot(a.x - b.x, a.y - b.y)

/** Where the view has a garment, and how large: at rest or on its way. */
const shown = (yard: Yard, garment: Garment) => flown(garment.fly, yard.spotOf(garment))

/** A check made tens of thousands of times a run: plain, so the run stays short. */
function hold(ok: boolean, what: () => string): void {
  if (!ok) throw new Error(what())
}

/** Everything that must hold on every frame. `seen` collects the states the play reached. */
function check(yard: Yard, seen: Set<string>): void {
  const settled = (garment: Garment) => garment.fly === null && !yard.isCarried({ what: 'garment', i: garment.index })
  const count = (at: string, n = -1) => yard.garments.filter((garment) => garment.at === at && (n < 0 || garment.n === n)).length

  // One thing lies on the board, one hangs on the rail and one at each place of the line: a garment or the cat.
  const cat = yard.cat
  hold(count('board') + (cat.at === 'board' ? 1 : 0) <= 1, () => 'two things lie on the board')
  hold(count('rail') + (cat.at === 'rail' ? 1 : 0) <= 1, () => 'two things hang on the rail')
  for (let place = 0; place < 3; place++) hold(count('line', place) + (cat.at === 'line' && cat.n === place ? 1 : 0) <= 1, () => `two things hang at place ${place} of the line`)
  // Each thing in the tub has a slot of its own, and the tub holds one friend.
  const slots = yard.garments.filter((garment) => garment.at === 'tub').map((garment) => garment.n)
  hold(new Set(slots).size === slots.length, () => 'two things float in one slot of the tub')
  hold(yard.friends.filter((friend) => friend.where === 'tub').length <= 1, () => 'two friends stand in the tub')

  // A friend wears one garment and a garment is worn by one friend, in the yard; a held garment is held by its own friend.
  for (const garment of yard.garments) {
    const wearers = yard.friends.filter((friend) => friend.wears === garment)
    hold(wearers.length === (garment.at === 'friend' ? 1 : 0), () => `the ${garment.kind} at ${garment.at} has ${wearers.length} wearers`)
    if (garment.at === 'friend') hold(wearers[0].index === garment.n && wearers[0].where === 'yard', () => `the ${garment.kind} is worn by the wrong friend, or by one who is not in the yard`)
    if (garment.at === 'held') hold(yard.friends[garment.owner].where !== 'tub', () => 'a friend holds its garment out in the tub')
    if (garment.at !== 'line') hold(!garment.pegs[0] && !garment.pegs[1], () => `the ${garment.kind} at ${garment.at} has a peg on`)
    hold(garment.wet >= 0 && garment.wet <= 10 && garment.suds >= 0 && garment.suds <= 10, () => `the ${garment.kind} is ${garment.wet} wet and ${garment.suds} soapy`)
    seen.add(`garment ${garment.at}`)
  }

  // No two things at rest are in one place: each rests clear of every other, the meant overlaps apart.
  const resting = yard.garments.filter((garment) => settled(garment) && garment.at !== 'grass' && garment.at !== 'puddle')
  for (const a of resting) for (const b of resting) {
    if (a.index >= b.index) continue
    const one = yard.spotOf(a), other = yard.spotOf(b)
    // A friend holds its own garment out in front of itself, and so in front of what it wears.
    const own = (held: Garment, worn: Garment) => held.at === 'held' && worn.at === 'friend' && worn.n === held.owner
    if (own(a, b) || own(b, a)) continue
    // And in front of the neighbour on its left: the three stand shoulder to shoulder.
    const beside = (held: Garment, worn: Garment) => held.at === 'held' && worn.at === 'friend' && worn.n === held.owner - 1
    if (beside(a, b) || beside(b, a)) continue
    if (a.at === 'tub' && b.at === 'tub') hold(apart(one, other) >= 28, () => 'two things float on one spot')
    else hold(apart(one, other) > (one.size + other.size) * 0.45, () => `the ${a.kind} at ${a.at} lies on the ${b.kind} at ${b.at}`)
  }
  const puss = yard.catSpot(), bar = yard.soapSpot()
  for (const garment of resting) {
    const at = yard.spotOf(garment)
    if (!cat.fly && !yard.isCarried({ what: 'cat' })) hold(apart(at, puss) > at.size * 0.45 + CAT.r * 0.8, () => `the cat at ${cat.at} sits on the ${garment.kind} at ${garment.at}/${garment.n}`)
    // The soap in the tub floats in the heap with what floats there.
    if (!yard.soap.fly && !yard.isCarried({ what: 'soap' }) && !(yard.soap.at === 'tub' && garment.at === 'tub')) hold(apart(at, bar) > at.size * 0.45 + SOAP.r * 0.5, () => `the soap at ${yard.soap.at} lies on the ${garment.kind} at ${garment.at}/${garment.n}`)
  }

  // Everything is somewhere: finite, and on or near the stage.
  for (const garment of yard.garments) {
    const at = shown(yard, garment)
    hold(Number.isFinite(at.x + at.y + at.size) && at.x > -40 && at.x < STAGE.width + 40 && at.y > -220 && at.y < STAGE.height + 40, () => `the ${garment.kind} is at ${at.x}, ${at.y}`)
  }

  // The friends: each stands where no other stands, and nobody is where the shut gate is.
  const everyone: Figure[] = [...yard.friends, ...yard.leaving]
  const carriedFriend = yard.carried && yard.carried.what === 'friend' ? yard.friends[yard.carried.i] : null
  for (const figure of everyone) {
    hold(Number.isFinite(figure.x + figure.y + figure.scale + figure.steps + figure.sunk), () => `the ${figure.kind} is nowhere`)
    if (figure.hidden || figure === carriedFriend) continue
    // Walking through the gateway needs the gate open: the gate is a thing, and nobody walks through its boards.
    const inGateway = !figure.clip && figure.x > GATE.x && figure.x < GATE.x + GATE.w && figure.y > 345 && figure.y < GATEWAY.y + 20 && figure.scale > 0.25
    if (inGateway) hold(yard.gate.open > 0.7, () => `the ${figure.kind} is in the gateway at ${figure.x}, ${figure.y} and the gate is ${yard.gate.open} open`)
    // Behind the gate a friend shows only above its top bar.
    if (figure.clip) hold(figure.y > GATE.y, () => `the ${figure.kind} behind the gate has its feet above the bar`)
  }
  const standing = yard.friends.filter((friend) => !friend.hidden && !friend.walking && !friend.move && friend !== carriedFriend && !yard.sceneRunning)
  for (const friend of standing) {
    const home = yard.homeOf(friend)
    hold(friend.x === home.x && friend.y === home.y && friend.scale === home.scale, () => `the ${friend.kind} stands at ${friend.x}, ${friend.y} and belongs at ${home.x}, ${home.y}`)
    seen.add(`friend ${friend.where}`)
  }
  for (const a of standing) for (const b of standing) {
    if (a.index >= b.index) continue
    const one = bodyOval(a.kind, a.x, a.y, a.scale), other = bodyOval(b.kind, b.x, b.y, b.scale)
    // The middle of each is in no other.
    hold(Math.abs(one.cx - other.cx) > Math.max(one.rx, other.rx), () => `the ${a.kind} stands in the ${b.kind}`)
  }
  // A friend at its place stands clear of what hangs above it.
  for (const friend of standing) {
    if (friend.where !== 'yard') continue
    hold(friend.y - BODY[friend.kind].ry * 2 * friend.scale > lineSpot(friend.index).y + 50, () => `the ${friend.kind} reaches into what hangs above it`)
  }
  // The cat pegged on the line reaches nobody who stands or walks under it or beside it: not with its legs, not with its tail.
  if (cat.at === 'line' && !cat.fly && !yard.isCarried({ what: 'cat' })) {
    const x = PLACE_X[cat.n], reach = hungReach(cat.fluff, cat.tuck), low = hungLow(cat.n, cat.fluff, cat.tuck)
    for (const figure of everyone) {
      if (figure.hidden || figure.clip || figure === carriedFriend || figure.scale <= 0.5 || ('move' in figure && figure.move)) continue
      const oval = bodyOval(figure.kind, figure.x, figure.y, figure.scale)
      // The highest the friend's oval comes anywhere under the cat, from the tip of its tail to its other flank.
      const under = Math.max(x - reach.left, Math.min(x + reach.right, oval.cx)), off = (under - oval.cx) / oval.rx
      if (Math.abs(off) >= 1) continue
      const head = oval.cy - oval.ry * Math.sqrt(1 - off * off)
      hold(low + HUNG.clear <= head, () => `the cat hung at place ${cat.n} reaches down to ${low}, and the ${figure.kind} at ${figure.x} comes up to ${head} under it`)
      seen.add('cat over a friend')
    }
  }

  // What a frame holds stays bounded.
  hold(yard.loose.length <= 60 && yard.bubbles.length <= 8 && yard.knots.length <= 46 && yard.rings.length <= 4 && yard.dollops.length <= 3, () => 'a list of loose things has grown past its bound')
  hold(yard.ghosts.length <= 3 && yard.leaving.length <= 3 && yard.hill.length <= 3, () => 'more than three leave or stand on the hill')

  seen.add(`cat ${cat.at}`)
  seen.add(`soap ${yard.soap.at}`)
  for (const peg of yard.pegs) seen.add(`peg ${peg.state}`)
  if (yard.sceneRunning) seen.add('a scene')
  if (yard.finished) seen.add('finished')
  if (yard.leaving.length > 0) seen.add('walking off')
  if (yard.carried) seen.add(`in the hand: ${yard.carried.what}`)
  if (yard.friends.some((friend) => friend.wears)) seen.add('dressed')
  if (yard.garments.some((garment) => garment.at === 'line' && !garment.pegs[0] && !garment.pegs[1])) seen.add('unpegged')
}

/** Every place a hand might go, from the yard as it stands. */
function places(yard: Yard): Spot[] {
  const out: Spot[] = [GATE_AT, GATE_AT, BOARD_SPOT, RAIL.hang, WATER, { x: PUDDLE.x, y: PUDDLE.y }, { x: 700, y: 620 }, { x: 700, y: 96 }, { x: 330, y: 560 }, yard.catSpot(), yard.soapSpot()]
  for (let i = 0; i < 3; i++) {
    out.push(lineSpot(i), bodyAt(i), bodyAt(i))
    if (yard.friends[i].where === 'gate') out.push(waitingAt(i))
    else out.push(heldAt(i))
  }
  for (const garment of yard.garments) { const at = yard.spotOf(garment); out.push(at, at) }
  for (let i = 0; i < 6; i++) out.push(yard.pegSpot(i))
  out.push({ x: pegHome(2).x, y: pegHome(2).y + 8 })
  return out
}

describe('nothing passes through anything', () => {
  it('seeded hands play the yard hard through every state it has, and on every frame no two things are in one place', () => {
    const seen = new Set<string>()
    let frames = 0
    const each = (yard: Yard) => () => { frames += 1; check(yard, seen) }
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const yard = open(seed, seed % 3 === 0 ? 5 : seed % 3 === 1 ? null : 4)
      const hand = makeRng(seed * 977)
      const tick = each(yard)
      check(yard, seen)
      // What chance alone seldom finds is played once on purpose: the cat hung over the rail.
      if (seed === 1) { carry(yard, CAT.x, CAT.y, RAIL.hang.x, RAIL.hang.y, tick); play(yard, 0.6, tick) }
      // And the cat laid on the board.
      if (seed === 2) { carry(yard, CAT.x, CAT.y, BOARD_SPOT.x, BOARD_SPOT.y, tick); play(yard, 0.6, tick) }
      for (let move = 0; move < 200; move++) {
        const spots = places(yard)
        const a = spots[below(hand, spots.length)], b = spots[below(hand, spots.length)]
        const jitter = () => (hand.next() - 0.5) * 24
        const r = hand.next()
        if (r < 0.42) { tapAt(yard, a.x + jitter(), a.y + jitter()); tick() }
        else if (r < 0.9) carry(yard, a.x + jitter(), a.y + jitter(), b.x + jitter(), b.y + jitter(), tick)
        else if (r < 0.93) {
          // Every friend that came in is dressed in whatever is nearest to hand, and the gate is touched.
          for (const friend of yard.friends) {
            if (friend.where !== 'yard' || friend.wears) continue
            const free = yard.garments.find((garment) => garment.at !== 'friend' && (garment.at !== 'held' || yard.friends[garment.owner].where === 'yard'))
            if (!free) continue
            const from = yard.spotOf(free)
            carry(yard, from.x, from.y, bodyAt(friend.index).x, bodyAt(friend.index).y, tick)
            play(yard, 0.6, tick)
          }
          tapAt(yard, GATE_AT.x, GATE_AT.y); tick()
        } else if (r < 0.96) {
          // A touch that is taken away in the middle of a drag.
          yard.press(a.x, a.y); yard.drag(b.x, b.y); tick(); yard.cancel(); tick()
        } else {
          // A rub across the board.
          yard.press(BOARD_SPOT.x - 60, BOARD_SPOT.y)
          for (let n = 0; n < 24; n++) { yard.drag(BOARD_SPOT.x + (n % 2 ? 70 : -70), BOARD_SPOT.y + n * 3 - 30); yard.step(FRAME); tick() }
          yard.tap()
        }
        play(yard, hand.next() < 0.2 ? 1.5 + hand.next() * 9 : 0.1 + hand.next() * 0.7, tick)
        yard.heard = []
        // Put away and opened again at this instant, the yard holds as well.
        if (move % 20 === 0) expect(deserialize(stored(yard), null, 5)).toEqual(JSON.parse(JSON.stringify(yard.toSave())))
      }
    }
    expect(frames).toBeGreaterThan(30000)
    const all = [
      'cat over a friend', 'garment held', 'garment tub', 'garment board', 'garment rail', 'garment line', 'garment friend', 'garment grass', 'garment puddle',
      'cat fence', 'cat board', 'cat rail', 'cat line', 'soap dish', 'soap tub', 'soap grass',
      'peg home', 'peg board', 'peg rail', 'peg friend', 'peg chain',
      'friend gate', 'friend yard', 'friend tub', 'a scene', 'finished', 'walking off', 'dressed', 'unpegged',
      'in the hand: garment', 'in the hand: cat', 'in the hand: soap', 'in the hand: peg', 'in the hand: friend',
    ]
    expect(all.filter((state) => !seen.has(state))).toEqual([])
  })

  it('the three who wait stand behind the gate, the one who comes in walks through it open, and each stops at a place of its own', () => {
    const yard = open(1, 5)
    const seen = new Set<string>()
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    let through = 0
    watch(yard, () => {
      check(yard, seen)
      for (const friend of yard.friends) if (!friend.clip && friend.y < GATEWAY.y + 20) through += 1
    })
    expect(through).toBeGreaterThan(10)
    expect(yard.friends.map((friend) => friend.x)).toEqual([...PLACE_X])
  })

  it('those who walk off go out through the open gate and stand apart on the hill; the next three come up behind the shut gate', () => {
    const yard = open(2, 5)
    const seen = new Set<string>()
    callIn(yard, 0)
    for (let friend = 0; friend < 3; friend++) { carry(yard, heldAt(friend).x, heldAt(friend).y, bodyAt(friend).x, bodyAt(friend).y); watch(yard) }
    const leavers = [...yard.friends]
    tapAt(yard, GATE_AT.x, GATE_AT.y)
    let rising = 0
    watch(yard, () => {
      check(yard, seen)
      // The next three rise behind a gate that is shut or shutting, and never in front of it.
      for (const friend of yard.friends) if (!friend.hidden) { rising += 1; expect(friend.clip).toBe(true); expect(friend.y).toBeGreaterThanOrEqual(WAIT_FEET[friend.kind]) }
    })
    expect(rising).toBeGreaterThan(30)
    const ends = leavers.map((figure) => ({ x: figure.x, y: figure.y }))
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) expect(apart(ends[a], ends[b])).toBeGreaterThan(100)
    expect(yard.friends.map((friend) => friend.x)).toEqual([...WAIT_X])
  })

  it('what the game places by itself never lands on another thing: a garment that falls from the line lies clear of the friend below and of the next place', () => {
    for (let place = 0; place < 3; place++) {
      const yard = open(3, 5)
      callIn(yard, 0)
      // The friend below is dressed in its own garment, and another garment hangs above it with no peg.
      carry(yard, heldAt(place).x, heldAt(place).y, bodyAt(place).x, bodyAt(place).y); watch(yard)
      const other = (place + 1) % 3
      carry(yard, heldAt(other).x, heldAt(other).y, lineSpot(place).x, lineSpot(place).y); play(yard, 0.7)
      const hangs = yard.garmentAt('line', place)!
      for (const peg of [place * 2, place * 2 + 1]) if (hangs.pegs[peg % 2]) tapAt(yard, yard.pegSpot(peg).x, yard.pegSpot(peg).y)
      expect(hangs.pegs).toEqual([false, false])
      play(yard, 11)
      expect(hangs.at).toBe('grass')
      const oval = bodyOval(FRIEND_KINDS[place], PLACE_X[place], FEET_Y, YARD_SCALE)
      // It lies at the friend's feet, beside it and in front, not across its body.
      expect(hangs.y).toBeGreaterThan(FEET_Y)
      expect(hangs.x).toBeGreaterThan(oval.cx + oval.rx * 0.6)
      if (place < 2) expect(hangs.x + TUB_SIZE / 2).toBeLessThan(PLACE_X[place + 1])
      expect(apart(hangs, PUDDLE)).toBeGreaterThan(PUDDLE.rx)
    }
  })

  it('the cat pegged on the line hangs long over an empty yard, and tucks up clear of whoever stands under it: the middle place over each of the three, fluffed or not', () => {
    // By the numbers: tucked up, at any place and at any fluff, it ends above the head of each kind of friend.
    for (let place = 0; place < 3; place++) for (const kind of FRIEND_KINDS) for (const fluff of [0, 5, 10]) {
      const head = FEET_Y - BODY[kind].ry * 2 * YARD_SCALE
      expect(hungLow(place, fluff, 1) + HUNG.clear).toBeLessThanOrEqual(head)
    }
    // Hanging free it would not: that is why it tucks.
    expect(hungLow(1, 0, 0)).toBeGreaterThan(FEET_Y - BODY.heron.ry * 2 * YARD_SCALE)
    expect(hungStretch(0)).toBeGreaterThan(hungStretch(1))
    // Played: over an empty yard it hangs free; with the three in, it is tucked on every frame, at each place.
    for (let place = 0; place < 3; place++) for (const fluff of [0, 10]) {
      const seen = new Set<string>()
      const yard = open(5, 5)
      yard.cat.fluff = fluff
      carry(yard, CAT.x, CAT.y, lineSpot(place).x, lineSpot(place).y); play(yard, 1.2, () => check(yard, seen))
      expect(yard.cat.at).toBe('line')
      expect(yard.cat.tuck).toBe(0)
      expect(seen.has('cat over a friend')).toBe(false)
      // They walk in under it: by the time anyone is beside it, it has pulled up.
      tapAt(yard, GATE_AT.x, GATE_AT.y)
      watch(yard, () => check(yard, seen))
      play(yard, 3, () => check(yard, seen))
      expect(yard.friends.every((friend) => friend.where === 'yard')).toBe(true)
      expect(yard.cat.tuck).toBe(1)
      expect(seen.has('cat over a friend')).toBe(true)
      // Put away and opened again, it is tucked from the first frame.
      const again = reopened(yard)
      expect(again.cat.tuck).toBe(1)
      check(again, seen)
    }
  })

  it('the wet jumper on the line stretches down nearly to whoever stands below, and never onto a head: full of water, at every place, over each kind of friend', () => {
    for (let place = 0; place < 3; place++) for (const kind of FRIEND_KINDS) {
      const head = FEET_Y - BODY[kind].ry * 2 * YARD_SCALE
      for (let wet = 0; wet <= 10; wet++) for (const wind of [-1, 0, 1]) {
        const pose = linePose('jumper', 0, wind, 5, wet, true, true)
        // It hangs from its top edge: stretched from there, and lowered by its weight.
        const hem = lineSpot(place).y - LINE_SIZE / 2 + pose.dy + LINE_SIZE * pose.sy
        expect(hem + HUNG.clear).toBeLessThanOrEqual(head)
      }
    }
    // And it does come near: full, its hem is within a hand of the heron's head.
    const full = lineSpot(1).y - LINE_SIZE / 2 + JUMPER_STRETCH.dy * 10 + LINE_SIZE * (1 + JUMPER_STRETCH.sy * 10)
    expect(FEET_Y - BODY.heron.ry * 2 * YARD_SCALE - full).toBeLessThan(40)
  })

  it('what floats in the tub can each be taken: the touch takes the one whose middle is nearest', () => {
    const yard = open(4, 5)
    callIn(yard, 0)
    for (let friend = 0; friend < 3; friend++) { carry(yard, heldAt(friend).x, heldAt(friend).y, WATER.x, WATER.y); play(yard, 3) }
    expect(yard.garments.map((garment) => garment.at)).toEqual(['tub', 'tub', 'tub'])
    for (const garment of yard.garments) {
      const slot = TUB_SLOTS[garment.n]
      yard.press(slot.x, slot.y)
      expect(yard.lit).toEqual({ what: 'garment', i: garment.index })
      yard.cancel()
    }
  })
})
