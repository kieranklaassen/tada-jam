import { describe, expect, it } from 'vitest'
import { HANG } from './toy'
import { CORNER, DOOR, HANGERS, HEDGEHOG, SPOTS, homeControl, type P } from './layout'
import { hangerAngle } from './poses'
import { ENDS, RESTS_AFTER } from './play'
import { targetAt } from './rules'
import { Finger } from './script'
import { fit } from './stage'
import { drawn } from './things'
import { savedOf } from './toy'

// The path from the glass to the model, which is the Mount's: every test
// here plays through `Play`, as a pointer event does.

const SURFACES = [{ width: 1180, height: 820 }, { width: 1024, height: 768 }] as const
const BARE: P = { x: 590, y: 330 }
/** Open ground at the foot of the jay's tree, where a dull thing lies where it is let go. */
const FOOT: P = { x: 930, y: 500 }
const frame = (finger: Finger) => finger.wait(1 / 30)

/** A game with the stone open and the worm lying under it, at rest. */
function withWorm(): { finger: Finger; worm: P } {
  const finger = new Finger(1, 30)
  finger.tap(SPOTS.stone.shut, 'open stone'); finger.rest()
  return { finger, worm: finger.reach('worm') }
}
const slide = (finger: Finger, id: number, from: P, to: P, steps = 6) => {
  for (let i = 1; i <= steps; i++) { finger.play.move(id, { x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }, 1180, 820); frame(finger) }
}

describe('a resting contact never deadens the game', () => {
  it('a contact that landed where nothing is hands the work to the next contact that lands, at once', () => {
    const finger = new Finger(1, 30)
    expect(finger.play.down(1, BARE, 1180, 820)).toBe(true)
    frame(finger)
    // A palm is still down on bare wood. A finger lands on a cover: it opens.
    expect(finger.play.down(2, SPOTS.log.shut, 1180, 820)).toBe(true)
    expect(finger.toy.covers.log.open).toBe(true)
    // The palm lifting later does nothing; the finger's own lift is its own.
    finger.play.up(1)
    expect(finger.toy.covers.log.open).toBe(true)
    finger.play.up(2)
    expect(finger.play.down(3, SPOTS.branch.shut, 1180, 820)).toBe(true)
    expect(finger.toy.covers.branch.open).toBe(true)
  })

  it('a contact on something keeps the work for a second; once it has been down a second without moving, the next contact takes it', () => {
    const finger = new Finger(1, 30)
    expect(finger.play.down(1, SPOTS.log.shut, 1180, 820)).toBe(true)
    finger.wait(RESTS_AFTER - 0.2)
    // Within the second, one finger works at a time: a second one gets no answer.
    expect(finger.play.down(2, SPOTS.branch.shut, 1180, 820)).toBe(false)
    expect(finger.toy.covers.branch.open).toBe(false)
    finger.play.up(2)
    finger.wait(0.3)
    // The first has now rested a second. The next contact works.
    expect(finger.play.down(3, SPOTS.branch.shut, 1180, 820)).toBe(true)
    expect(finger.toy.covers.branch.open).toBe(true)
    // A contact that keeps moving has not rested, however long it is down.
    const other = new Finger(1, 30)
    other.play.down(1, SPOTS.log.shut, 1180, 820)
    for (let i = 0; i < 60; i++) { other.play.move(1, { x: SPOTS.log.shut.x + (i % 2) * 6, y: SPOTS.log.shut.y }, 1180, 820); frame(other) }
    expect(other.toy.time).toBeGreaterThan(RESTS_AFTER * 1.5)
    expect(other.play.down(2, SPOTS.branch.shut, 1180, 820)).toBe(false)
  })

  it('a finger that is carrying is never interrupted while it moves', () => {
    const { finger, worm } = withWorm()
    finger.play.down(1, worm, 1180, 820); frame(finger)
    slide(finger, 1, worm, { x: 700, y: 560 })
    expect(finger.toy.hand?.carried).toBe(true)
    // Three seconds of carrying to and fro, never a second still: another contact gets nothing, and the worm stays in the hand.
    for (let i = 0; i < 6; i++) {
      slide(finger, 1, { x: 700 + (i % 2) * 40, y: 560 }, { x: 740 - (i % 2) * 40, y: 560 }, 15)
      expect(finger.play.down(2, SPOTS.log.shut, 1180, 820)).toBe(false)
      finger.play.up(2)
    }
    expect(finger.toy.covers.log.open).toBe(false)
    expect(finger.toy.hand?.thing).toBe('worm')
    expect(finger.toy.hand?.down).toBe(true)
    slide(finger, 1, { x: 700, y: 560 }, FOOT)
    finger.play.up(1)
    finger.rest()
    expect(finger.toy.things.worm).toEqual({ at: 'path', x: FOOT.x, y: FOOT.y })
  })

  it('a carry whose lift never arrives does not deaden the game: after a second without a move the next finger takes the work, and the thing goes back', () => {
    const { finger, worm } = withWorm()
    const before = savedOf(finger.toy)
    finger.play.down(1, worm, 1180, 820); frame(finger)
    slide(finger, 1, worm, { x: 700, y: 560 })
    expect(finger.toy.hand?.carried).toBe(true)
    // The finger has lifted, but its lift was never reported: no move comes, and no up.
    finger.wait(RESTS_AFTER - 0.2)
    expect(finger.play.down(2, SPOTS.log.shut, 1180, 820)).toBe(false)
    finger.play.up(2)
    expect(finger.toy.hand?.thing).toBe('worm')
    finger.wait(0.3)
    // A second has passed with no move. The next finger that lands is answered, and the worm is back under its stone.
    expect(finger.play.down(3, SPOTS.log.shut, 1180, 820)).toBe(true)
    expect(finger.toy.covers.log.open).toBe(true)
    expect(finger.toy.hand).toBeNull()
    expect(savedOf(finger.toy).things).toEqual(before.things)
    expect(drawn(finger.toy, 'worm')?.at).toEqual(worm)
    finger.play.up(3)
    // The lost contact's lift, should it come after all, does nothing.
    finger.play.up(1)
    finger.rest()
    expect(savedOf(finger.toy).things).toEqual(before.things)
    expect(finger.ears.heard.map((one) => one.event.id).filter((id) => id === 'setDown' || id.startsWith('path'))).toEqual([])
  })

  it('a lost pointer capture is handed on as a contact taken away, like a pointer cancel: the thing in the hand goes back', () => {
    expect(ENDS).toEqual({ pointerup: 'up', pointercancel: 'cancel', lostpointercapture: 'cancel' })
    const { finger, worm } = withWorm()
    const before = savedOf(finger.toy)
    finger.play.down(1, worm, 1180, 820); frame(finger)
    slide(finger, 1, worm, { x: 700, y: 560 })
    // What the Mount does with a lost capture: the same call as for a cancel. It says the contact was the working one.
    expect(finger.play.cancel(1)).toBe(true)
    expect(finger.toy.hand).toBeNull()
    expect(savedOf(finger.toy)).toEqual(before)
    // After an ordinary lift the capture is lost too: then there is no working contact and nothing is done.
    finger.play.down(2, SPOTS.log.shut, 1180, 820); finger.play.up(2)
    const after = savedOf(finger.toy)
    expect(finger.play.cancel(2)).toBe(false)
    expect(savedOf(finger.toy)).toEqual(after)
    // The glass is free at once.
    expect(finger.play.down(3, SPOTS.branch.shut, 1180, 820)).toBe(true)
  })
})

describe('a carry survives a lifted finger', () => {
  it('the thing hangs where it was let go for 0.3 s on the one clock, and a finger landing on it again carries on', () => {
    const { finger, worm } = withWorm()
    const mid: P = { x: 760, y: 560 }
    finger.play.down(1, worm, 1180, 820); frame(finger)
    slide(finger, 1, worm, mid)
    finger.play.up(1)
    // It hangs: still in the hand, drawn where it was let go, saved where it came from.
    finger.wait(HANG - 0.1)
    expect(finger.toy.hand).toMatchObject({ thing: 'worm', down: false, carried: true })
    expect(drawn(finger.toy, 'worm')).toMatchObject({ at: mid, inHand: true })
    expect(finger.toy.things.worm).toEqual({ at: 'home' })
    // A finger lands on it again, a little off its middle: the same carry goes on.
    expect(finger.play.down(2, { x: mid.x + 20, y: mid.y + 12 }, 1180, 820)).toBe(true)
    expect(finger.toy.hand).toMatchObject({ thing: 'worm', down: true, carried: true })
    finger.wait(HANG * 3)
    expect(finger.toy.hand?.thing).toBe('worm')
    slide(finger, 2, { x: mid.x + 20, y: mid.y + 12 }, { x: FOOT.x + 20, y: FOOT.y + 12 })
    finger.play.up(2)
    finger.rest()
    expect(finger.toy.things.worm).toEqual({ at: 'path', x: FOOT.x, y: FOOT.y })
  })

  it('left alone, it is set down where it was let go once 0.3 s of the clock have passed, and not a frame before', () => {
    const { finger, worm } = withWorm()
    finger.play.down(1, worm, 1180, 820); frame(finger)
    slide(finger, 1, worm, FOOT)
    finger.play.up(1)
    const letGoAt = finger.toy.time
    while (finger.toy.hand) { expect(finger.toy.things.worm).toEqual({ at: 'home' }); frame(finger) }
    expect(finger.toy.time - letGoAt).toBeGreaterThanOrEqual(HANG - 1e-6)
    expect(finger.toy.time - letGoAt).toBeLessThanOrEqual(HANG + 1 / 30 + 1e-6)
    expect(finger.toy.things.worm).toEqual({ at: 'path', x: FOOT.x, y: FOOT.y })
    // The same at another frame length: the wait is seconds, not frames.
    const slow = new Finger(1, 10)
    slow.tap(SPOTS.stone.shut, 'open stone'); slow.rest()
    const at = slow.reach('worm')
    slow.drag(at, FOOT, 'worm to the foot of the tree')
    const then = slow.toy.time
    while (slow.toy.hand) slow.wait(0.1)
    expect(slow.toy.time - then).toBeGreaterThanOrEqual(HANG - 1e-6)
    expect(slow.toy.time - then).toBeLessThanOrEqual(HANG + 0.1 + 1e-6)
  })

  it('put away while it hangs, it is set down where it was let go; put away under a finger still carrying, it goes back', () => {
    const hanging = withWorm()
    hanging.finger.play.down(1, hanging.worm, 1180, 820); frame(hanging.finger)
    slide(hanging.finger, 1, hanging.worm, FOOT)
    hanging.finger.play.up(1)
    hanging.finger.wait(0.1)
    hanging.finger.play.park()
    expect(hanging.finger.toy.hand).toBeNull()
    expect(hanging.finger.toy.things.worm).toEqual({ at: 'path', x: FOOT.x, y: FOOT.y })
    expect(hanging.finger.toy.dirty).toBe(true)

    const carrying = withWorm()
    const before = savedOf(carrying.finger.toy)
    carrying.finger.play.down(1, carrying.worm, 1180, 820); frame(carrying.finger)
    slide(carrying.finger, 1, carrying.worm, FOOT)
    carrying.finger.play.park()
    expect(carrying.finger.toy.hand).toBeNull()
    expect(savedOf(carrying.finger.toy)).toEqual(before)
    // The finger that is still down lifts after the put-away: it lets go of nothing.
    carrying.finger.play.up(1)
    carrying.finger.wait(1)
    expect(savedOf(carrying.finger.toy)).toEqual(before)
  })
})

describe('pointer cancel never acts for the child', () => {
  it('a carry taken away by the browser is no drop: the thing is back where it came from and nothing is heard', () => {
    for (const to of [FOOT, { x: 344, y: 702 }, { x: 982, y: 700 }, { x: 902, y: 718 }, { x: 1120, y: 440 }]) {
      const { finger, worm } = withWorm()
      const before = savedOf(finger.toy)
      finger.play.down(1, worm, 1180, 820); frame(finger)
      slide(finger, 1, worm, to)
      finger.play.cancel(1)
      const cancelled = finger.toy.time
      expect(finger.toy.hand).toBeNull()
      expect(finger.toy.scene).toBeNull()
      // Nothing begins after the cancel: whatever still moves or sounds is the answer to the child's own landing.
      for (let i = 0; i < 180; i++) {
        frame(finger)
        for (const act of Object.values(finger.toy.acts)) expect(act.since).toBeLessThanOrEqual(cancelled)
      }
      expect(savedOf(finger.toy)).toEqual(before)
      expect(finger.ears.heard.filter((one) => one.at > cancelled).map((one) => one.event.id).filter((id) => id === 'setDown' || id.startsWith('path') || id.startsWith('stone') || id.startsWith('water') || id === 'sentIn' || id === 'wormDive')).toEqual([])
      expect(drawn(finger.toy, 'worm')?.at).toEqual(worm)
    }
  })

  it('a press taken away adds nothing to what its landing did, and frees the glass for the next finger', () => {
    const finger = new Finger(1, 30)
    finger.play.down(1, SPOTS.log.shut, 1180, 820)
    const after = savedOf(finger.toy)
    finger.play.cancel(1)
    finger.wait(3)
    expect(savedOf(finger.toy)).toEqual(after)
    expect(finger.play.down(2, SPOTS.branch.shut, 1180, 820)).toBe(true)
    // A cancel for a contact that is not the working one is nothing at all.
    finger.play.cancel(7)
    expect(finger.toy.covers.branch.open).toBe(true)
  })
})

describe('the grown-up\'s corner and the home control', () => {
  it.each(SURFACES)('the top-right 72 px corner answers nothing and does not take the idle ladder back, at $width by $height', (surface) => {
    const finger = new Finger(1, 30)
    finger.wait(4.5)
    const glow = finger.play.guidance!.glow
    expect(glow).toBeGreaterThan(0.9)
    const before = savedOf(finger.toy), heard = finger.ears.heard.length
    for (const at of [{ x: surface.width - 1, y: 1 }, { x: surface.width - CORNER + 1, y: CORNER - 1 }, { x: surface.width - 36, y: 36 }]) {
      expect(finger.play.down(9, at, surface.width, surface.height)).toBe(false)
      finger.play.move(9, { x: at.x - 30, y: at.y + 30 }, surface.width, surface.height)
      finger.play.up(9)
      frame(finger)
      expect(finger.play.guidance!.glow).toBeGreaterThanOrEqual(glow)
    }
    expect(savedOf(finger.toy)).toEqual(before)
    expect(finger.toy.acts.knock).toBeUndefined()
    expect(finger.ears.heard.length).toBe(heard)
    // The ghost hand still comes at its time, as if the corner had never been touched.
    finger.wait(1)
    expect(finger.play.guidance!.demo).not.toBeNull()
    // Just outside the corner the wood answers, and the ladder goes back to the bottom.
    expect(finger.play.down(10, { x: surface.width - CORNER - 2, y: CORNER + 2 }, surface.width, surface.height)).toBe(true)
    finger.play.up(10)
    frame(finger)
    expect(finger.play.guidance!.glow).toBe(0)
  })

  it.each(SURFACES)('a thing that hangs is not set down by a touch in the corner, at $width by $height', (surface) => {
    const { finger, worm } = withWorm()
    finger.play.down(1, worm, 1180, 820); frame(finger)
    slide(finger, 1, worm, FOOT)
    finger.play.up(1)
    finger.play.down(9, { x: surface.width - 20, y: 20 }, surface.width, surface.height)
    expect(finger.toy.hand).toMatchObject({ thing: 'worm', down: false })
  })

  it.each(SURFACES)('under the home control only bare wood answers, at $width by $height', (surface) => {
    const home = homeControl(surface.width), by = fit(surface.width, surface.height)
    for (const open of [false, true]) {
      const finger = new Finger(1, 30)
      if (open) for (const place of ['grass', 'log', 'stone', 'puddle', 'branch', 'burrow'] as const) { finger.tap(SPOTS[place].shut, `open ${place}`); finger.rest() }
      for (let dx = -home.r; dx <= home.r; dx += 8) for (let dy = -home.r; dy <= home.r; dy += 8) {
        if (dx * dx + dy * dy > home.r * home.r) continue
        const at = { x: (home.x + dx - by.x) / by.scale, y: (home.y + dy - by.y) / by.scale }
        expect(targetAt(finger.toy, at).kind).toBe('wood')
      }
    }
  })
})

describe('the idle ladder', () => {
  it('a character\'s own act never takes it back: left alone, the animals fidget and the ladder climbs to its end', () => {
    const finger = new Finger(1, 30)
    const fidgets = new Set<string>()
    let demos = 0, last = -1, glowed = 0
    for (let i = 0; i < 30 * 120; i++) {
      frame(finger)
      for (const who of ['hedgehog', 'jay', 'toad'] as const) if (finger.toy.idle[who].variant >= 0) fidgets.add(`${who}:${finger.toy.idle[who].variant}`)
      const guidance = finger.play.guidance!
      if (guidance.demoIndex !== last && guidance.demoIndex >= 0) demos += 1
      last = guidance.demoIndex
      glowed = Math.max(glowed, guidance.glow)
    }
    expect(fidgets.size).toBeGreaterThanOrEqual(6)
    expect(glowed).toBe(1)
    // The hand shows its move four times, further and further apart, and then no more: nothing repeats without fading.
    expect(demos).toBe(4)
    expect(finger.play.guidance!.glow).toBe(0)
    expect(finger.play.guidance!.demo).toBeNull()
    // And an idle wood is silent: nothing was heard in two minutes.
    expect(finger.ears.heard).toEqual([])
  })

  it('a tap for the youngest may last half a second: everything answers when the finger lands, and a long tap is no carry', () => {
    const quick = new Finger(1, 30), slow = new Finger(1, 30)
    quick.tap(SPOTS.stone.shut, 'open stone', 0.05)
    slow.tap(SPOTS.stone.shut, 'open stone', 0.45)
    expect(quick.ears.heard[0].at).toBe(0)
    expect(slow.ears.heard[0].at).toBe(0)
    quick.wait(2.45); slow.wait(2.05)
    expect(savedOf(slow.toy)).toEqual(savedOf(quick.toy))
    expect(slow.toy.covers.stone.open).toBe(true)
    // Half a second on a thing, with the wobble of a small finger: it does its own act and stays where it lies.
    const at = slow.reach('worm')
    slow.play.down(50, at, 1180, 820)
    for (let i = 0; i < 14; i++) { slow.play.move(50, { x: at.x + (i % 3) * 3, y: at.y + (i % 2) * 4 }, 1180, 820); frame(slow) }
    slow.play.up(50)
    expect(slow.toy.hand).toBeNull()
    expect(slow.seen.has('thing>touched:worm')).toBe(true)
    slow.rest()
    expect(slow.toy.things.worm).toEqual({ at: 'home' })
    // The hedgehog too: the roll is on the landing, not on the lift.
    slow.play.down(51, HEDGEHOG, 1180, 820)
    expect(slow.toy.rolled).toBe(true)
  })
})

describe('no touch goes unanswered', () => {
  it('a second touch on a cover that has just set off moves it no further, and is a knock on it: seen and heard', () => {
    const finger = new Finger(1, 30)
    finger.play.down(1, SPOTS.stone.shut, 1180, 820); finger.play.up(1)
    frame(finger); frame(finger)
    const heard = finger.ears.heard.length
    finger.play.down(2, SPOTS.stone.shut, 1180, 820); finger.play.up(2)
    expect(finger.toy.covers.stone.open).toBe(true)
    expect(finger.toy.acts.knock?.since).toBe(finger.toy.time)
    expect(finger.ears.heard.slice(heard).map((one) => one.event.id)).toContain('knock')
  })

  it('a knock in the room swings the one piece that hangs there, the lamp on its cord', () => {
    const finger = new Finger(1, 30)
    finger.tap(DOOR, 'go in'); finger.rest()
    expect(finger.toy.room).toBe(true)
    const still = Math.abs(hangerAngle(finger.toy, HANGERS.length))
    finger.tap({ x: 600, y: 300 }, 'knock on the wall')
    finger.wait(0.3)
    expect(Math.abs(hangerAngle(finger.toy, HANGERS.length))).toBeGreaterThan(still + 0.08)
  })
})
