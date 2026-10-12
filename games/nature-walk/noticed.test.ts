import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { DOOR, HEDGEHOG, NEST, NOSE, PUDDLE_SLOT, SPOTS, STONE_SPOT, TUCKS, WHEEL, near, within, type P } from './layout'
import { hedgehogPose, wormSpot } from './poses'
import { blankSheets, emptyRecording, recordingContext, tracingContext } from './recorder'
import { BOWL_SLOT, ROOM_DOOR } from './room'
import { freshWorld } from './save'
import { Finger } from './script'
import { invitation } from './step'
import { drawn, leafNow, snailSeat } from './things'
import { HANG, acting, type Toy, type ToySave } from './toy'
import { TOAD_IN_DOOR, View } from './view'
import { PLACES, SEASONS, THINGS, UNDER, placeOf, type ThingId } from './wood'

// What a second reader noticed and the lead ruled on, each held by a test
// that plays through `Play`, as a pointer event goes.

const WIDTH = 1180, HEIGHT = 820, DPR = 2
/** Open ground at the foot of the jay's tree. */
const FOOT: P = { x: 930, y: 500 }

const saved = (change: Partial<ToySave> = {}, things: Partial<ToySave['things']> = {}): ToySave => {
  const world = freshWorld(null)
  return { ...world, finished: false, ...change, things: { ...world.things, ...things } }
}

function stampsOf(view: View, toy: Toy, guidance: { glow: number; demo: number | null; demoIndex: number } | null = null) {
  const kept = emptyRecording()
  view.draw(recordingContext(kept), WIDTH, HEIGHT, DPR, { toy, guidance, tier: TIERS[0] })
  // Where a stamped piece's own origin stands on the stage, and how wide and high its sheet is there.
  return kept.stamps.map((stamp) => ({ key: view.sprites.keyOf(stamp.image) ?? '', x: stamp.x / DPR, y: stamp.y / DPR, wide: (stamp.w * Math.hypot(stamp.a, stamp.b)) / DPR, high: (stamp.h * Math.hypot(stamp.c, stamp.d)) / DPR }))
}

/** A finger in the room carries `thing` from the table onto the door, so the view sets off for the wood, and on to `to` in two reports. */
function carriedOut(thing: ThingId, to: P): Finger {
  const finger = new Finger(1, 30, undefined, saved({}, { [thing]: { at: 'table', x: 620, y: 628 } }))
  const from = finger.reach(thing)
  expect(finger.toy.room).toBe(true)
  finger.down(from, `${thing} carried to the door`); finger.wait(0.05)
  let last = from
  for (let i = 1; i <= 12 && finger.toy.room; i++) {
    const next = { x: from.x + ((ROOM_DOOR.x - from.x) * i) / 12, y: from.y + ((ROOM_DOOR.y - from.y) * i) / 12 }
    finger.slide(last, next, 1)
    last = next
  }
  expect(finger.toy.room).toBe(false)
  finger.slide(last, to, 2)
  return finger
}

describe('a thing carried out through the door and let go while the view still slides', () => {
  it('hangs where the finger let it go until the slide is at rest, and is set down there: it does not jump', () => {
    const finger = carriedOut('acorn', FOOT)
    finger.up()
    const toy = finger.toy, let_ = { ...toy.hand!.at }
    expect(near(let_, FOOT)).toBeLessThan(1)
    expect(acting(toy, 'view')).not.toBeNull()
    const heard = finger.ears.heard.length
    let hung = 0
    while (acting(toy, 'view')) {
      finger.wait(1 / 30)
      if (!acting(toy, 'view')) break
      // Longer than it hangs in a frame at rest, and still in the hand, where it was let go on the glass.
      expect(toy.hand, `at ${toy.time.toFixed(2)} s`).not.toBeNull()
      expect(drawn(toy, 'acorn')!.at).toEqual(let_)
      expect(toy.acts['thing:acorn']).toBeUndefined()
      expect(finger.ears.heard.slice(heard).map((one) => one.event.id)).not.toContain('setDown')
      hung += 1
      expect(hung).toBeLessThan(60)
    }
    expect(hung / 30).toBeGreaterThan(HANG)
    finger.wait(2 / 30)
    // The slide is over: now it is set down, from where it hung to where it lies, which is where it was let go.
    expect(toy.hand).toBeNull()
    expect(toy.acts['thing:acorn']?.from).toEqual(let_)
    finger.rest()
    expect(toy.things.acorn.at).toBe('path')
    expect(near(drawn(toy, 'acorn')!.at, let_)).toBeLessThan(40)
  })

  it('a new touch during the slide brings the view to rest at once, and the thing is set down where it hung in the frame at rest', () => {
    const finger = carriedOut('acorn', FOOT)
    finger.up()
    const toy = finger.toy, let_ = { ...toy.hand!.at }
    expect(acting(toy, 'view')).not.toBeNull()
    finger.down({ x: 590, y: 330 }, 'a knock during the slide')
    expect(acting(toy, 'view')).toBeNull()
    expect(toy.hand).toBeNull()
    expect(toy.acts['thing:acorn']?.from).toEqual(let_)
    finger.up(); finger.rest()
    expect(near(drawn(toy, 'acorn')!.at, let_)).toBeLessThan(40)
  })

  it('the jay takes a shiny thing only once the wood stands still: never while he is partly off the screen', () => {
    const finger = carriedOut('button', FOOT)
    finger.up()
    const toy = finger.toy
    while (acting(toy, 'view')) {
      expect(toy.acts.jay?.kind ?? '').not.toMatch(/^steal/)
      expect(toy.scene).toBeNull()
      finger.wait(1 / 30)
    }
    finger.wait(0.2)
    // At rest the button is set down on open ground, and the jay comes for it as he always does.
    expect(toy.acts.jay?.kind).toBe('steal:button')
    finger.rest()
    expect(toy.things.button.at).toBe('nest')
  })
})

describe('the toad on the table at home', () => {
  it('is seen from the wood through the door of the house, all of him and large', () => {
    const finger = new Finger(1, 30, undefined, saved({}, { acorn: { at: 'table', x: 620, y: 628 } }))
    const view = new View(blankSheets(emptyRecording()))
    expect(stampsOf(view, finger.toy).filter((stamp) => stamp.key.startsWith('toad:mini'))).toHaveLength(0)
    // The acorn is carried out of the door and set on his stone: he goes to sit where it came from.
    const carrying = carriedOut('acorn', STONE_SPOT)
    carrying.up(); carrying.rest()
    expect(carrying.toy.toadAt.at).toBe('table')
    expect(carrying.toy.room).toBe(false)
    const seen = stampsOf(view, carrying.toy).filter((stamp) => stamp.key.startsWith('toad:mini'))
    expect(seen).toHaveLength(1)
    // His sheet stands inside the doorway and fills most of it: as wide as a thing lying in the wood is, and more.
    expect(seen[0].wide).toBeGreaterThan(80)
    expect(seen[0].high).toBeGreaterThan(70)
    // He stands on his feet at one place in the doorway, and the middle of him is well inside it.
    expect(near(seen[0], TOAD_IN_DOOR)).toBeLessThan(1)
    expect(within({ x: seen[0].x, y: seen[0].y - seen[0].high / 2 }, DOOR)).toBe(true)
    // One tap sends him home, and he is no longer in the doorway.
    carrying.toadHome()
    expect(stampsOf(view, carrying.toy).filter((stamp) => stamp.key.startsWith('toad:mini'))).toHaveLength(0)
  })
})

describe('the hedgehog unrolls for a worm that comes into the open anywhere', () => {
  it('when the cover its head is tucked under is opened over it', () => {
    for (const place of ['stone', 'grass'] as const) {
      const season = SEASONS.find((one) => placeOf('worm', one) !== place)!
      const finger = new Finger(1, 30, undefined, saved({ season, rolled: true }, { worm: { at: 'path', x: TUCKS[place].x, y: TUCKS[place].y } }))
      expect(finger.toy.rolled).toBe(true)
      finger.tap(SPOTS[place].shut, `open ${place}`)
      finger.wait(1.2)
      expect(finger.toy.rolled, place).toBe(false)
      expect(finger.seen.has('hedgehog>unroll'), place).toBe(true)
      expect(finger.ears.heard.map((one) => one.event.id)).toContain('hogUnroll')
    }
  })

  it('when it is tipped out of the jay\'s nest', () => {
    const finger = new Finger(1, 30, undefined, saved({ rolled: true }, { worm: { at: 'nest' } }))
    finger.tap(NEST, 'tip the nest')
    finger.wait(1.2)
    expect(finger.toy.things.worm.at).toBe('path')
    expect(finger.toy.rolled).toBe(false)
    expect(finger.seen.has('hedgehog>unroll')).toBe(true)
  })

  it('when it rolls out of the door of the house while the child is in the room: unseen and unheard, and he is found unrolled', () => {
    const finger = new Finger(1, 30, undefined, saved({ rolled: true, finished: true }, { acorn: { at: 'bowl' }, worm: { at: 'table', x: 420, y: 628 } }))
    expect(finger.toy.room).toBe(true)
    // The bowl is full: the worm rolls off the table and out of the door, into the open in the wood.
    finger.put('worm', BOWL_SLOT, 'worm onto the full bowl')
    expect(finger.toy.things.worm.at).toBe('path')
    expect(finger.toy.rolled).toBe(false)
    expect(finger.ears.heard.filter((one) => one.event.mover === 'hedgehog')).toEqual([])
    expect([...finger.seen].filter((one) => one.startsWith('hedgehog>') && one !== 'hedgehog>idle')).toEqual([])
    finger.tap(ROOM_DOOR, 'door out'); finger.rest()
    expect(hedgehogPose(finger.toy).roll).toBe(0)
  })
})

describe('the idle hand and the hedgehog\'s nose', () => {
  const ask = (toy: Toy) => invitation(toy, { ...WHEEL }, { ...ROOM_DOOR }, 0, { ...DOOR })

  it('show the same cover in every season, whichever other covers stand open', () => {
    for (const season of SEASONS) {
      const home = placeOf('worm', season)!
      // Shut, and with every other cover open that has no thing under it to carry.
      for (const open of [[], PLACES.filter((place) => place !== home && !(THINGS as readonly string[]).includes(UNDER[place][season]))]) {
        const toy = new Finger(1, 30, undefined, saved({ season, open })).toy
        const hand = ask(toy).hand
        expect('tap' in hand && hand.tap, season).toEqual(SPOTS[home].shut)
        expect(wormSpot(toy), season).toEqual(SPOTS[home].find)
      }
    }
  })

  it('show the nest when the worm is in the nest, and the door of the house when it is in the house', () => {
    const inNest = new Finger(1, 30, undefined, saved({}, { worm: { at: 'nest' } })).toy
    const nest = ask(inNest)
    expect('tap' in nest.hand && nest.hand.tap).toEqual(NEST)
    expect(nest.spots).toEqual([NEST])
    expect(within(wormSpot(inNest), NEST)).toBe(true)
    for (const where of [{ at: 'table', x: 620, y: 628 }, { at: 'bowl' }] as const) {
      const toy = new Finger(1, 30, undefined, saved({}, { worm: where })).toy
      const house = ask(toy)
      expect('tap' in house.hand && within(house.hand.tap, DOOR), where.at).toBe(true)
      expect(within(wormSpot(toy), DOOR), where.at).toBe(true)
    }
  })
})

describe('a slipped tap on a thing that lies by the hedgehog\'s nose', () => {
  it('replays nothing: he does not sniff it again, and it stays where it lay', () => {
    const finger = new Finger(1, 30)
    finger.put('acorn', NOSE, 'acorn before the hedgehog')
    expect(finger.toy.things.acorn.at).toBe('path')
    const lay = { ...drawn(finger.toy, 'acorn')!.at }
    expect(near(lay, NOSE)).toBeLessThan(70)
    finger.wait(3)
    const heard = finger.ears.heard.length, seen = new Set(finger.seen)
    finger.seen.clear()
    // The finger lands on it, slips a little way and is gone again in under a quarter of a second.
    finger.down(lay, 'a slipped tap by the nose')
    finger.slide(lay, { x: lay.x + 30, y: lay.y - 22 }, 4)
    expect(finger.toy.hand?.carried).toBe(true)
    finger.up()
    finger.wait(1.5)
    expect([...finger.seen].filter((one) => one.startsWith('hedgehog>') && !one.startsWith('hedgehog>idle'))).toEqual([])
    expect(finger.toy.scene).toBeNull()
    const since = finger.ears.heard.slice(heard).filter((one) => one.event.mover === 'hedgehog')
    expect(since.map((one) => one.event.id)).toEqual([])
    expect(near(drawn(finger.toy, 'acorn')!.at, lay)).toBeLessThan(1)
    // A carry to the same place does set him off: the rule is about the slip, not about the place.
    expect([...seen].some((one) => one.startsWith('hedgehog>'))).toBe(true)
  })
})

describe('the snail on the puddle', () => {
  it('stays on the leaf after its circle, wherever the leaf goes; in the bowl it floats with no leaf', () => {
    const finger = new Finger(1, 30)
    const toy = finger.toy, view = new View(blankSheets(emptyRecording()))
    finger.drag(finger.reach('snail'), PUDDLE_SLOT, 'snail in the puddle')
    // The circle: the leaf is drawn where it sails, a good way round, and not where it lies when nothing moves it.
    const sailed: number[] = []
    for (let i = 0; i < 150 && (toy.hand || acting(toy, 'cover:puddle', 'ferry')); i++) {
      finger.wait(1 / 30)
      const leaf = stampsOf(view, toy).find((stamp) => stamp.key.startsWith('cover:puddle'))!
      expect(near(leaf, leafNow(toy))).toBeLessThan(1)
      sailed.push(leaf.x)
    }
    expect(Math.max(...sailed) - Math.min(...sailed)).toBeGreaterThan(30)
    finger.rest()
    expect(toy.things.snail.at).toBe('puddle')
    expect(finger.seen.has('cover>ferry')).toBe(true)
    const onLeaf = (when: string): P => {
      expect(acting(toy, 'cover:puddle')).toBeNull()
      const snail = drawn(toy, 'snail')!, leaf = leafNow(toy)
      expect(snail.at, when).toEqual(snailSeat(toy))
      expect(near(snail.at, leaf), when).toBeLessThan(45)
      // As drawn: the leaf's sheet stands under the snail's, and the snail is stamped after it.
      const stamps = stampsOf(view, toy)
      const under = stamps.findIndex((stamp) => stamp.key.startsWith('cover:puddle')), over = stamps.findIndex((stamp) => stamp.key.startsWith('find:snail'))
      expect(under, when).toBeGreaterThanOrEqual(0)
      expect(over, when).toBeGreaterThan(under)
      const sheet = stamps[under]
      expect(near(sheet, leaf), when).toBeLessThan(1)
      expect(Math.abs(snail.at.x - sheet.x), when).toBeLessThan(sheet.wide / 2)
      expect(near(stamps[over], snail.at), when).toBeLessThan(1)
      return snail.at
    }
    const first = onLeaf('after the circle')
    // The leaf is touched: it goes where it goes, and the snail with it.
    const leaf = leafNow(toy)
    finger.tap({ x: leaf.x - 34, y: leaf.y }, 'the leaf'); finger.rest()
    expect(toy.covers.puddle.open).toBe(true)
    const second = onLeaf('the leaf moved')
    expect(near(first, second)).toBeGreaterThan(10)
    finger.tap(WHEEL, 'wheel'); finger.rest()
    expect(toy.things.snail.at).toBe('puddle')
    onLeaf('after the turn of the year')
    // In the bowl there is no leaf: it floats in the water by itself.
    const indoors = new Finger(1, 30, undefined, saved({}, { snail: { at: 'table', x: 420, y: 628 } }))
    indoors.put('snail', BOWL_SLOT, 'snail in the bowl')
    expect(indoors.toy.things.snail.at).toBe('bowl')
    const afloat = drawn(indoors.toy, 'snail')!
    expect(afloat.room).toBe(true)
    expect(near(afloat.at, BOWL_SLOT)).toBeLessThan(12)
    expect(stampsOf(view, indoors.toy).some((stamp) => stamp.key.startsWith('cover:'))).toBe(false)
  })
})

describe('the hedgehog poked again as a ball', () => {
  it('huffs and turns his back: he does not shake, and nothing of it is fear', () => {
    const finger = new Finger(1, 30)
    finger.tap(HEDGEHOG, 'hedgehog rolls'); finger.rest()
    expect(finger.toy.rolled).toBe(true)
    const heard = finger.ears.heard.length
    finger.tap(HEDGEHOG, 'hedgehog again')
    expect(finger.toy.acts.hedgehog?.kind).toBe('huff')
    expect([...new Set(finger.ears.heard.slice(heard).map((one) => one.event.id))]).toEqual(['hogHuff'])
    let turned = 0, swelled = 1
    while (acting(finger.toy, 'hedgehog', 'huff')) {
      const pose = hedgehogPose(finger.toy)
      expect(pose.shake).toBe(0)
      expect(pose.roll).toBe(1)
      turned = Math.min(turned, pose.ballTurn)
      swelled = Math.max(swelled, pose.ballScale)
      finger.wait(1 / 30)
    }
    // The ball swells once and turns well away from the finger, then comes back as it was.
    expect(turned).toBeLessThan(-1.5)
    expect(swelled).toBeGreaterThan(1.05)
    finger.wait(0.2)
    expect(Math.abs(hedgehogPose(finger.toy).ballTurn)).toBeLessThan(0.1)
    expect(finger.toy.rolled).toBe(true)
  })
})

describe('the ghost hand', () => {
  it('taps with a ring that is closed all the way round: no gap that makes a letter of it', () => {
    const toy = new Finger(1, 30).toy
    const view = new View(blankSheets(emptyRecording()))
    let rings = 0
    for (let demo = 0; demo < 1; demo += 0.02) {
      const { g, trace } = tracingContext()
      view.draw(g, WIDTH, HEIGHT, DPR, { toy, guidance: { glow: 1, demo, demoIndex: 0 }, tier: TIERS[0] })
      for (const line of trace) {
        if (!line.startsWith('arc(')) continue
        const [, , r, from, to] = line.slice(4, -1).split(',').map(Number)
        if (r !== 26) continue
        rings += 1
        expect(to - from).toBeCloseTo(Math.PI * 2, 2)
      }
    }
    expect(rings).toBeGreaterThan(3)
  })
})
