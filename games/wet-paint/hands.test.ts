import { describe, expect, it } from 'vitest'
import { DEMO_SECONDS, IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, IdleLadder } from './guidance'
import { Hands } from './hands'
import { ForgivingTouch, type Gesture } from './input'
import { CAT, CLOTHS, HELD, HOME, MAT, POOL, POT, TOOL, TRAY } from './layout'
import { CORNER } from './overlay'
import { MID, PAPER_MID, SEED, cellAt, coloured, heard, middle, play, reopened, savedAt, stored, tap } from './rehearsal'
import { PLAIN } from './save'
import { STAGE, fit } from './stage'
import { GRACE, Toy, showingsOver } from './toy'

/** The surfaces the stage is fitted to. */
const SURFACES = [{ width: 1180, height: 820 }, { width: 1024, height: 768 }] as const

/** A hand on a surface: gestures in the surface's pixels, as the Mount hands them over. */
function rig(width = 1180, height = 820, make: () => Toy = () => new Toy(savedAt('comb'), SEED)) {
  const toy = make(), hands = new Hands(), ladder = new IdleLadder(0), touch = new ForgivingTouch(), by = fit(width, height)
  const px = (x: number, y: number) => ({ x: by.x + x * by.scale, y: by.y + y * by.scale })
  const send = (gestures: Gesture[], seconds: number): void => hands.take(gestures, toy, ladder, by, width, seconds)
  return { toy, hands, ladder, touch, by, px, send, width }
}

describe('what a touch does', () => {
  it.each(SURFACES)('answers nothing in the grown-up corner at $width by $height, and that touch does not take the idle ladder back', ({ width, height }) => {
    const { toy, ladder, touch, send, hands } = rig(width, height)
    const before = stored(toy)
    const idle = IDLE_BEFORE_GLOW + 2
    for (const [x, y] of [[width - 1, 1], [width - CORNER + 2, CORNER - 2], [width - 30, 30]] as const) {
      send(touch.down(1, { x, y }, 0), idle)
      expect(heard(toy)).toEqual([])
      expect(toy.finger).toBeNull()
      // The rest of that touch is left alone too: a drag out of the corner onto the water drops nothing.
      send(touch.move(1, { x: width / 2, y: height / 2 }), idle)
      hands.idle(toy, ladder, touch.active, idle)
      send(touch.up(1, { x: width / 2, y: height / 2 }, 400), idle)
      send(touch.letGo(), idle)
      expect(heard(toy)).toEqual([])
      expect(stored(toy)).toEqual(before)
      expect(toy.takeChanged()).toBe(0)
      // The ladder still shows its glow: it was never taken back.
      expect(ladder.update(idle).glow).toBeGreaterThan(0)
    }
    // Just outside the corner the game answers, and the ladder goes back to the bottom.
    send(touch.down(2, { x: width - CORNER - 4, y: CORNER + 4 }, 1000), idle)
    expect(heard(toy).length).toBeGreaterThan(0)
    expect(ladder.update(idle).glow).toBe(0)
  })

  it.each(SURFACES)('puts the home control over nothing a child touches at $width by $height: a touch there is a knock on the wall', ({ width, height }) => {
    const { toy, touch, send } = rig(width, height, () => new Toy(savedAt('soap', { prints: [0, 1, 2].map((peg) => ({ cells: PLAIN.slice(0, 936), peg })).concat([{ cells: PLAIN.slice(0, 936), peg: null as unknown as number }]) }), SEED))
    const before = stored(toy)
    for (const dx of [-HOME.size / 2, 0, HOME.size / 2]) for (const dy of [0, HOME.size / 2, HOME.size]) {
      send(touch.down(1, { x: width / 2 + dx, y: HOME.top + dy }, 0), 0)
      send(touch.up(1, { x: width / 2 + dx, y: HOME.top + dy }, 80), 0)
      play(toy, 0.3)
    }
    expect(stored(toy)).toEqual(before)
    expect(toy.playing).toBe(false)
    expect(STAGE.width / STAGE.height).toBeGreaterThan(1)
  })

  it('takes a slow tap, held most of half a second, for a tap: the youngest child\'s tap takes a print', () => {
    const { toy, touch, send, px } = rig(1024, 768, () => {
      const made = new Toy(savedAt('comb'), SEED)
      coloured(made)
      return made
    })
    send(touch.down(1, px(PAPER_MID.x, PAPER_MID.y), 0), 0)
    for (let frame = 1; frame <= 27; frame++) {
      send(touch.advance(frame * 16.7), frame / 60)
      toy.step(1 / 60)
    }
    // A finger that rests wobbles a little: under the slop it is still a tap.
    send(touch.move(1, px(PAPER_MID.x + 6, PAPER_MID.y + 4)), 0.45)
    send(touch.up(1, px(PAPER_MID.x + 6, PAPER_MID.y + 4), 450), 0.45)
    send(touch.letGo(), 0.45)
    expect(toy.playing).toBe(true)
    expect(toy.prints).toHaveLength(1)
  })

  it('answers a whole hand as one finger: a second finger and a palm that land add nothing', () => {
    const { toy, touch, send, px } = rig()
    send(touch.down(1, px(MID.x, MID.y), 0), 0)
    const first = heard(toy).length
    expect(first).toBeGreaterThan(0)
    send(touch.down(2, px(MID.x + 90, MID.y + 10), 5), 0)
    send(touch.down(3, px(MID.x + 150, MID.y + 80), 9), 0)
    expect(heard(toy)).toEqual([])
    send(touch.up(2, px(MID.x + 90, MID.y + 10), 60), 0)
    send(touch.up(3, px(MID.x + 150, MID.y + 80), 60), 0)
    expect(toy.finger).not.toBeNull()
    send(touch.up(1, px(MID.x, MID.y), 90), 0)
    expect(toy.finger).toBeNull()
  })

  it('never leaves the water dead under a palm: five contacts, the first on the rim, and the first one on the water answers', () => {
    for (const first of [{ x: TRAY.x + 10, y: TRAY.y + 300 }, { x: 1100, y: 800 }, { x: 600, y: 120 }]) {
      const { toy, hands, touch, send, px } = rig()
      const down = (id: number, x: number, y: number, t: number): void => send(hands.down(touch, id, px(x, y), t, toy), 0)
      // The heel of the hand lands on the rim, the table or the wall: a knock, and no colour.
      down(1, first.x, first.y, 0)
      expect(heard(toy).length).toBeGreaterThan(0)
      expect(toy.inked).toBe(false)
      expect(toy.onNothing).toBe(true)
      // Four fingers follow, all on the water. The first of them is answered where it landed: colour and a sound.
      const fingers = [[MID.x - 120, MID.y], [MID.x - 40, MID.y - 50], [MID.x + 50, MID.y - 40], [MID.x + 130, MID.y + 20]] as const
      fingers.forEach(([x, y], index) => down(2 + index, x, y, 4 + 3 * index))
      expect(toy.inked).toBe(true)
      expect(toy.finger).toEqual({ x: fingers[0][0], y: fingers[0][1] })
      expect(cellAt(toy, fingers[0][0], fingers[0][1])).not.toBe(0)
      expect(heard(toy).length).toBeGreaterThan(0)
      // The other three add nothing, and the palm's own lift does nothing.
      for (const [x, y] of fingers.slice(1)) expect(cellAt(toy, x, y)).toBe(0)
      send(touch.up(1, px(first.x, first.y), 60), 0)
      expect(toy.finger).not.toBeNull()
      // It is that finger's touch from then on: it pulls, and its lift ends it.
      send(touch.move(2, px(fingers[0][0] + 60, fingers[0][1])), 0)
      expect(toy.finger).toEqual({ x: fingers[0][0] + 60, y: fingers[0][1] })
      for (const id of [3, 4, 5]) send(touch.up(id, px(MID.x, MID.y), 80), 0)
      send(touch.up(2, px(fingers[0][0] + 60, fingers[0][1]), 90), 0)
      send(touch.letGo(), 0)
      expect(toy.finger).toBeNull()
    }
    // A first contact that landed on a thing keeps the work: a second finger on the water adds nothing.
    const { toy, hands, touch, send, px } = rig()
    send(hands.down(touch, 1, px(POT.x, POT.ys[1]), 0, toy), 0)
    send(hands.down(touch, 2, px(MID.x, MID.y), 5, toy), 0)
    expect(toy.inked).toBe(false)
    expect(toy.pot).toBe(1)
  })

  it('never acts for the child when the touch is taken away: a pointer cancel on the paper takes no print, on the held print hangs nothing', () => {
    const { toy, touch, send, px } = rig(1180, 820, () => {
      const made = new Toy(savedAt('comb', { prints: [{ cells: PLAIN.slice(0, 936), peg: null }] }), SEED)
      coloured(made)
      return made
    })
    const before = stored(toy)
    send(touch.down(1, px(PAPER_MID.x, PAPER_MID.y), 0), 0)
    send(touch.cancel(1), 0)
    send(touch.down(2, px(PAPER_MID.x, PAPER_MID.y), 100), 0)
    send(touch.move(2, px(PAPER_MID.x + 70, PAPER_MID.y + 60)), 0)
    send(touch.cancel(2), 0)
    const held = middle(HELD)
    send(touch.down(3, px(held.x, held.y), 200), 0)
    send(touch.move(3, px(held.x + 300, 70)), 0)
    send(touch.cancel(3), 0)
    // Parked under a finger: the same.
    send(touch.down(4, px(held.x, held.y), 300), 0)
    send(touch.move(4, px(held.x + 300, 70)), 0)
    send(touch.clear(), 0)
    play(toy, 6)
    expect(toy.playing).toBe(false)
    expect(stored(toy)).toEqual(before)
    // The child's own lift does act.
    send(touch.down(5, px(held.x, held.y), 400), 0)
    send(touch.move(5, px(held.x + 300, 70)), 0)
    send(touch.up(5, px(held.x + 300, 70), 500), 0)
    send(touch.letGo(), 0)
    play(toy, GRACE + 0.05)
    expect(toy.prints[0].peg).not.toBeNull()
  })

  it('is never deadened by a contact that rests: whatever the first rests on, a later finger on any kind of thing is answered as itself', () => {
    const make = (): Toy => {
      const made = new Toy(savedAt('soap', { prints: [{ cells: PLAIN.slice(0, 936), peg: null }] }), SEED)
      coloured(made)
      tap(made, POT.x, POT.ys[0])
      play(made, 0.5)
      heard(made)
      return made
    }
    const comb = middle(TOOL.comb), straw = middle(TOOL.straw), held = middle(HELD)
    const RESTS: Record<string, { x: number; y: number; nothing: boolean }> = {
      'the rim': { x: TRAY.x + 10, y: TRAY.y + 300, nothing: true },
      'the table': { x: 1100, y: 800, nothing: true },
      'the wall': { x: 600, y: 120, nothing: true },
      'a tool': { x: comb.x, y: comb.y, nothing: false },
      'a pot': { x: POT.x, y: POT.ys[1], nothing: false },
      'the cat': { x: CAT.head.x, y: CAT.head.y - 40, nothing: false },
      'the tools\' cloth': { x: MAT.x + 5, y: MAT.y + 6, nothing: true },
      'the towel': { x: CLOTHS[0].x, y: 90, nothing: false },
      'the water': { x: POOL.x + 80, y: POOL.y + 440, nothing: false },
    }
    const THINGS: Record<string, { x: number; y: number; answered: (toy: Toy, lift: () => void) => void }> = {
      'a pot': { x: POT.x, y: POT.ys[2], answered: (toy) => expect(toy.pot).toBe(2) },
      'a tool': { x: straw.x, y: straw.y, answered: (toy) => expect(toy.tool).toBe('straw') },
      'the paper': { x: PAPER_MID.x, y: PAPER_MID.y, answered: (toy, lift) => {
        lift()
        expect(toy.prints).toHaveLength(2)
      } },
      'the held print': { x: held.x, y: held.y, answered: (toy, lift) => {
        lift()
        expect(toy.prints[0].peg).not.toBeNull()
      } },
      'the cat': { x: CAT.body.x - 150, y: CAT.body.y - 20, answered: (toy) => expect(toy.cat.pose.squash).not.toBe(0) },
      'the water': { x: POOL.x + 600, y: POOL.y + 420, answered: (toy) => expect(cellAt(toy, POOL.x + 600, POOL.y + 420)).not.toBe(0) },
    }
    for (const [resting, rest] of Object.entries(RESTS)) for (const [name, thing] of Object.entries(THINGS)) {
      const label = `resting on ${resting}, then ${name}`
      const { toy, hands, touch, send, px } = rig(1180, 820, make)
      send(hands.down(touch, 1, px(rest.x, rest.y), 0, toy), 0)
      expect(toy.onNothing, label).toBe(rest.nothing)
      play(toy, 1.2)
      heard(toy)
      // The second finger lands after the first has rested more than a second.
      send(hands.down(touch, 2, px(thing.x, thing.y), 1200, toy), 0)
      expect(toy.finger?.x, label).toBeCloseTo(thing.x, 6)
      expect(toy.finger?.y, label).toBeCloseTo(thing.y, 6)
      expect(heard(toy).length, label).toBeGreaterThan(0)
      toy.step(1 / 60)
      thing.answered(toy, () => {
        send(touch.up(2, px(thing.x, thing.y), 1300), 0)
        send(touch.letGo(), 0)
      })
      // A tool the resting contact took up went back: the second finger works with what the hand held before.
      if (resting === 'a tool' && name !== 'a tool') expect(toy.tool, label).toBe('finger')
      if (resting === 'a tool' && name === 'the water') expect([1, 2, 3]).toContain(cellAt(toy, thing.x, thing.y))
      // The resting contact's own lift, whenever it comes, does nothing.
      const before = JSON.stringify(stored(toy))
      send(touch.up(1, px(rest.x, rest.y), 5000), 0)
      send(touch.letGo(), 0)
      expect(JSON.stringify(stored(toy)), label).toBe(before)
    }
    // Before it has rested a second, a contact on a thing keeps the work: a whole hand that lands together is one finger.
    for (const [resting, rest] of Object.entries(RESTS)) {
      if (rest.nothing) continue
      const { toy, hands, touch, send, px } = rig(1180, 820, make)
      send(hands.down(touch, 1, px(rest.x, rest.y), 0, toy), 0)
      send(hands.down(touch, 2, px(POT.x, POT.ys[2]), 300, toy), 0)
      expect(toy.finger?.x, resting).toBeCloseTo(rest.x, 6)
      expect(toy.pot === 2, resting).toBe(false)
    }
    // And a finger that is pulling is never interrupted, however long it has been down.
    const { toy, hands, touch, send, px } = rig(1180, 820, make)
    send(hands.down(touch, 1, px(MID.x - 100, MID.y + 100), 0, toy), 0)
    send(touch.move(1, px(MID.x, MID.y + 100)), 0)
    play(toy, 2)
    send(hands.down(touch, 2, px(POT.x, POT.ys[2]), 2000, toy), 0)
    expect(toy.pot).not.toBe(2)
    expect(toy.finger?.x).toBeCloseTo(MID.x, 6)
  })

  it('lets a carry survive a lifted finger, through the gestures the surface sends: the corner of paper hangs for the grace, and is carried on or laid', () => {
    const make = (): Toy => {
      const made = new Toy(savedAt('comb'), SEED)
      coloured(made)
      return made
    }
    const drag = (r: ReturnType<typeof rig>, id: number, t: number): void => {
      r.send(r.hands.down(r.touch, id, r.px(PAPER_MID.x, PAPER_MID.y), t, r.toy), 0)
      r.send(r.touch.move(id, r.px(PAPER_MID.x + 50, PAPER_MID.y + 40)), 0)
      r.send(r.touch.up(id, r.px(PAPER_MID.x + 50, PAPER_MID.y + 40), t + 200), 0)
      r.send(r.touch.letGo(), 0)
    }
    // Let go and left alone: it hangs for the grace, lifted and pulled, and then the sheet is laid.
    const left = rig(1180, 820, make)
    drag(left, 1, 0)
    play(left.toy, GRACE - 0.05)
    expect(left.toy.playing).toBe(false)
    expect(left.toy.paper.dx).toBeCloseTo(50, 6)
    play(left.toy, 0.1)
    expect(left.toy.playing).toBe(true)
    expect(left.toy.prints).toHaveLength(1)
    // A finger that lands on it again within the grace carries on, and its own lift starts the grace again.
    const again = rig(1180, 820, make)
    drag(again, 1, 0)
    play(again.toy, GRACE * 0.5)
    again.send(again.hands.down(again.touch, 2, again.px(PAPER_MID.x + 50, PAPER_MID.y + 40), 400, again.toy), 0)
    play(again.toy, GRACE * 2)
    expect(again.toy.playing).toBe(false)
    expect(again.toy.prints).toHaveLength(0)
    expect(again.toy.finger).not.toBeNull()
    again.send(again.touch.move(2, again.px(PAPER_MID.x + 70, PAPER_MID.y + 60)), 0)
    again.send(again.touch.up(2, again.px(PAPER_MID.x + 70, PAPER_MID.y + 60), 1200), 0)
    again.send(again.touch.letGo(), 0)
    expect(again.toy.prints).toHaveLength(0)
    play(again.toy, GRACE + 0.05)
    expect(again.toy.prints).toHaveLength(1)
    // Put away in the grace is no drop.
    const parked = rig(1180, 820, make)
    drag(parked, 1, 0)
    play(parked.toy, GRACE * 0.5)
    parked.send(parked.touch.clear(), 0)
    parked.hands.putAway(parked.toy, parked.ladder, 0)
    play(parked.toy, 2)
    expect(parked.toy.prints).toHaveLength(0)
    expect(parked.toy.playing).toBe(false)
    expect(parked.toy.paper.dx).toBe(0)
    // A pull through the water is not a carry: it ends at the lift, and a finger that lands again drops a new bloom.
    const water = rig(1180, 820, make)
    water.send(water.hands.down(water.touch, 1, water.px(POOL.x + 560, POOL.y + 420), 0, water.toy), 0)
    water.send(water.touch.move(1, water.px(POOL.x + 620, POOL.y + 420)), 0)
    water.send(water.touch.up(1, water.px(POOL.x + 620, POOL.y + 420), 100), 0)
    water.send(water.touch.letGo(), 0)
    expect(water.toy.finger).toBeNull()
    heard(water.toy)
    water.send(water.hands.down(water.touch, 2, water.px(POOL.x + 620, POOL.y + 420), 200, water.toy), 0)
    expect(heard(water.toy).length).toBeGreaterThan(0)
    expect(water.toy.finger).not.toBeNull()
  })
})

describe('the idle ladder', () => {
  it('stays at the bottom while a finger works or a scene the child set off plays, and is not taken back by the cat\'s own act', () => {
    const { toy, hands, ladder } = rig(1180, 820, () => {
      const made = new Toy(savedAt('comb'), SEED)
      coloured(made)
      return made
    })
    // A finger down, not in the corner.
    hands.idle(toy, ladder, true, 50)
    expect(ladder.update(50 + IDLE_BEFORE_GLOW - 0.1).glow).toBe(0)
    // No finger and no scene: the ladder climbs.
    hands.idle(toy, ladder, false, 60)
    expect(ladder.update(50 + IDLE_BEFORE_DEMO + 0.5).demo).not.toBeNull()
    // The cat dips a paw by itself, long after: the ladder is not touched by it.
    ladder.touch(0)
    play(toy, showingsOver() + 1)
    expect(toy.playing).toBe(true)
    expect(toy.busy).toBe(false)
    const far = showingsOver() + 1
    const before = { ...ladder.update(far) }
    hands.idle(toy, ladder, false, far)
    expect(ladder.update(far)).toEqual(before)
    // A scene the child set off keeps it at the bottom for as long as it plays.
    hands.take([{ type: 'press', at: { x: PAPER_MID.x, y: PAPER_MID.y } }, { type: 'tap', at: { x: PAPER_MID.x, y: PAPER_MID.y } }], toy, ladder, fit(1180, 820), 1180, 200)
    expect(toy.busy).toBe(true)
    hands.idle(toy, ladder, false, 204)
    expect(ladder.update(204 + IDLE_BEFORE_GLOW - 0.1).glow).toBe(0)
    expect(DEMO_SECONDS).toBeGreaterThan(0)
  })

  it('is taken back at put-away, and the game is then what a load would find', () => {
    const { toy, hands, ladder } = rig(1180, 820, () => {
      const made = new Toy(savedAt('comb'), SEED)
      coloured(made)
      return made
    })
    hands.take([{ type: 'press', at: { x: MID.x, y: MID.y } }, { type: 'dragMove', from: { x: MID.x, y: MID.y }, at: { x: MID.x + 80, y: MID.y } }], toy, ladder, fit(1180, 820), 1180, 0)
    // Idle long enough for the hand to be showing, then put away.
    expect(ladder.update(IDLE_BEFORE_DEMO + 1).demo).not.toBeNull()
    const loaded = reopened(toy)
    hands.take([{ type: 'dragCancel', from: { x: MID.x, y: MID.y }, at: { x: MID.x + 80, y: MID.y } }], toy, ladder, fit(1180, 820), 1180, IDLE_BEFORE_DEMO + 1)
    hands.putAway(toy, ladder, IDLE_BEFORE_DEMO + 1)
    const guidance = ladder.update(IDLE_BEFORE_DEMO + 1)
    expect(guidance.glow).toBe(0)
    expect(guidance.demo).toBeNull()
    expect(stored(toy)).toEqual(stored(loaded))
    expect(toy.takeSounds()).toEqual({ plain: [], scene: [], hush: true })
    // A touch that began in the corner before the put-away is forgotten with it.
    hands.take([{ type: 'press', at: { x: 1179, y: 1 } }], toy, ladder, fit(1180, 820), 1180, 0)
    hands.putAway(toy, ladder, 0)
    hands.take([{ type: 'press', at: { x: MID.x, y: MID.y } }], toy, ladder, fit(1180, 820), 1180, 0)
    expect(toy.finger).not.toBeNull()
  })
})
