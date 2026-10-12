import { describe, expect, it } from 'vitest'
import { HORNS, PAIRED } from './cells'
import { TIERS } from './config'
import { FOOT_SPOTS, HANGERS, JAY, PUDDLE_SLOT, SPOTS, STONE_SPOT, TUCKS, near, type P } from './layout'
import { RUFFLE, gaze, jayPose } from './poses'
import { blankSheets, emptyRecording, recordingContext, tracingContext } from './recorder'
import { ROOM_DOOR } from './room'
import { DRAG, FIRST_RASP, SAME_TAP, SLIP_REACH, SLIP_TIME, targetAt } from './rules'
import { freshWorld } from './save'
import { Finger } from './script'
import { biteShows, drawn } from './things'
import { tuckFor, type Toy, type ToySave } from './toy'
import { View } from './view'

// What a touch does, through `Play` as a pointer event goes: the rulings
// that closed the first fresh reading, each held where it would break.

const WIDTH = 1180, HEIGHT = 820, DPR = 2
const BARE: P = { x: 590, y: 330 }
/** The open path at the front. */
const PATH: P = { x: 416, y: 690 }
const world = (more: Partial<ToySave> = {}): ToySave => ({ ...freshWorld(null), finished: false, ...more })
const things = (more: Partial<ToySave['things']>): ToySave['things'] => ({ ...freshWorld(null).things, ...more })
const ids = (finger: Finger, from = 0): string[] => finger.ears.heard.slice(from).map((one) => one.event.id)

function stampsOf(view: View, toy: Toy, tier = TIERS[0]) {
  const kept = emptyRecording()
  view.draw(recordingContext(kept), WIDTH, HEIGHT, DPR, { toy, guidance: null, tier })
  return kept.stamps.map((stamp) => ({ ...stamp, key: view.sprites.keyOf(stamp.image) ?? '' }))
}

describe('the snail\'s horns come in and go out one at a time', () => {
  it('touched where it lies: one horn in and then the other, all of it in, and out again one after the other', () => {
    const finger = new Finger(1, 120)
    const at = finger.reach('snail')
    finger.down(at, 'touch the snail'); finger.up()
    const seen: { a: number; b: number; own: number }[] = []
    for (let i = 0; i < 130; i++) { const pose = drawn(finger.toy, 'snail')!.pose; seen.push({ a: pose.hornA, b: pose.hornB, own: pose.own }); finger.wait(1 / 120) }
    // In: the first is nearly in while the second is still out.
    expect(seen.some((pose) => pose.a < 0.35 && pose.b > 0.65)).toBe(true)
    expect(seen.some((pose) => pose.a === 0 && pose.b === 0 && pose.own > 0.5)).toBe(true)
    // Out: the first is out while the second is still in, and then both are out.
    expect(seen.some((pose) => pose.a > 0.9 && pose.b < 0.1)).toBe(true)
    expect(seen[seen.length - 1]).toEqual({ a: 1, b: 1, own: 0 })
    // The two never move together through the middle of their way.
    expect(seen.filter((pose) => pose.a > 0.3 && pose.a < 0.7 && pose.b > 0.3 && pose.b < 0.7)).toEqual([])
    expect(HORNS.second - HORNS.first).toBeGreaterThanOrEqual(HORNS.takes)
  })

  it('beside the button: one horn goes in and comes out, and then the other', () => {
    const pose = (s: number) => PAIRED['snail+button'].pose(s, 1)[0]
    const seen = Array.from({ length: 200 }, (_, i) => pose(i / 100))
    expect(seen.some((one) => one.hornA < 0.2 && one.hornB > 0.95)).toBe(true)
    expect(seen.some((one) => one.hornB < 0.2 && one.hornA > 0.95)).toBe(true)
    expect(seen.filter((one) => one.hornA < 0.9 && one.hornB < 0.9)).toEqual([])
  })

  it('the view draws each horn as far out as it is: two, one, none, one, two', () => {
    const finger = new Finger(1, 120)
    const at = finger.reach('snail')
    const view = new View(blankSheets(emptyRecording()))
    const knobs = (): number => {
      const { g, trace } = tracingContext()
      view.draw(g, WIDTH, HEIGHT, DPR, { toy: finger.toy, guidance: null, tier: TIERS[0] })
      return trace.filter((line) => /^arc\(.*,3\.2,0,6\.28\)$/.test(line)).length
    }
    const counts = [knobs()]
    finger.down(at, 'touch the snail'); finger.up()
    for (let i = 0; i < 130; i++) { const now = knobs(); if (now !== counts[counts.length - 1]) counts.push(now); finger.wait(1 / 120) }
    expect(counts).toEqual([2, 1, 0, 1, 2])
  })
})

describe('the worm on the path tucks its head under a cover', () => {
  it('under the stone while it is shut, then under the long grass, then among the blades at the front: never tilted over the stone', () => {
    const finger = new Finger(1, 30), view = new View(blankSheets(emptyRecording()))
    const before = (cover: string): void => {
      const keys = stampsOf(view, finger.toy).map((stamp) => stamp.key)
      const worm = keys.findIndex((key) => key.startsWith('find:worm')), over = keys.findIndex((key) => key.startsWith(cover))
      expect(worm, 'the worm is drawn').toBeGreaterThanOrEqual(0)
      expect(over, cover).toBeGreaterThan(worm)
    }
    // The stone stands open, since the worm came from under it, and the long grass is shut.
    finger.tap(SPOTS.stone.shut, 'open stone'); finger.rest()
    finger.put('worm', PATH, 'worm on the path')
    expect(tuckFor(finger.toy)).toBe('grass')
    expect(finger.toy.things.worm).toEqual({ at: 'path', x: TUCKS.grass.x, y: TUCKS.grass.y })
    expect(drawn(finger.toy, 'worm')!.pose.turn).toBe(TUCKS.grass.turn)
    before('cover:grass')
    // The stone shut: the worm goes to it, and lies level with its head under the stone's edge.
    finger.tap(SPOTS.stone.away[0], 'shut stone'); finger.rest()
    expect(finger.toy.covers.stone.open).toBe(false)
    finger.put('worm', PATH, 'worm on the path again')
    expect(finger.toy.things.worm).toEqual({ at: 'path', x: TUCKS.stone.x, y: TUCKS.stone.y })
    expect(drawn(finger.toy, 'worm')!.pose.turn).toBe(0)
    before('cover:stone')
    // The stone rolled off it: it comes out onto the path, clear of what lies under the stone.
    finger.tap(SPOTS.stone.shut, 'open stone'); finger.rest()
    expect(finger.toy.things.worm).toEqual({ at: 'path', x: 470, y: 706 })
    expect(drawn(finger.toy, 'worm')!.pose.turn).toBe(0)
    // Both open: down among the blades at the front, which are stamped over it.
    finger.tap(SPOTS.grass.shut, 'open grass'); finger.rest()
    finger.put('worm', PATH, 'worm on the path a third time')
    expect(tuckFor(finger.toy)).toBe('front')
    expect(finger.toy.things.worm).toEqual({ at: 'path', x: TUCKS.front.x, y: TUCKS.front.y })
    before('strip:')
  })
})

describe('the jay never gets a thing by a slipped tap', () => {
  const spot = FOOT_SPOTS[1], far: P = { x: 930, y: 540 }
  /** The button lying on open ground at the foot of his tree, where the nest was tipped out. */
  const lying = (): { finger: Finger; scenes: Set<string> } => {
    const scenes = new Set<string>()
    const finger = new Finger(1, 60, (toy) => { if (toy.scene) scenes.add(toy.sceneKind) }, world({ things: things({ button: { at: 'path', x: spot.x, y: spot.y } }) }))
    return { finger, scenes }
  }
  const stays = (finger: Finger, scenes: Set<string>, how: string): void => {
    finger.rest()
    expect(finger.toy.things.button, how).toEqual({ at: 'path', x: spot.x, y: spot.y })
    expect(near(drawn(finger.toy, 'button')!.at, spot), how).toBeLessThan(0.5)
    expect(ids(finger), how).not.toContain('stealButton')
    expect([...scenes], how).toEqual([])
  }

  it('touched and let go within the time of a tap, or moved less than a finger\'s width, it stays where it lay and nothing comes of it', () => {
    expect(SLIP_REACH).toBe(48)
    expect(SLIP_TIME).toBe(0.25)
    // A tap that slipped: 31 units in a twentieth of a second.
    let { finger, scenes } = lying()
    finger.down(spot, 'a slipped tap'); finger.slide(spot, { x: spot.x + 30, y: spot.y + 8 }, 3); finger.up()
    expect(finger.toy.hand?.carried).toBe(true)
    stays(finger, scenes, 'quick and short')
    // Held long, moved less than a finger's width.
    ;({ finger, scenes } = lying())
    finger.down(spot, 'a nudge'); finger.slide(spot, { x: spot.x + 34, y: spot.y + 20 }, 30); finger.up()
    stays(finger, scenes, 'slow and short')
    // Flicked far within the time of a tap.
    ;({ finger, scenes } = lying())
    finger.down(spot, 'a flick'); finger.slide(spot, far, 6); finger.up()
    stays(finger, scenes, 'quick and far')
  })

  it('a carry that sets it down somewhere new on open ground is the cause: he takes it', () => {
    const { finger, scenes } = lying()
    finger.drag(spot, far, 'button carried along the ground')
    finger.rest()
    expect([...scenes]).toEqual(['jay'])
    expect(finger.toy.things.button).toEqual({ at: 'nest' })
    expect(ids(finger)).toContain('stealButton')
  })
})

describe('a knock answers where the finger is', () => {
  it('on the open water of the puddle a touch is rings and a plip where the finger is, not a knock on wood', () => {
    const finger = new Finger(1, 30)
    expect(targetAt(finger.toy, PUDDLE_SLOT).kind).toBe('water')
    finger.tap(PUDDLE_SLOT, 'the open water')
    expect(ids(finger)).toContain('puddleTap')
    expect(ids(finger)).not.toContain('knock')
    expect(finger.toy.acts.knock).toBeUndefined()
    expect(finger.toy.acts.water?.kind).toBe('splash')
    expect(near(finger.toy.acts.water!.to, PUDDLE_SLOT)).toBeLessThan(10)
    // The leaf that lies on it is still its cover.
    expect(targetAt(finger.toy, SPOTS.puddle.shut).kind).toBe('cover')
  })

  it('the hanging piece that swings is the one nearest the finger, and with none near a chip of wood hops up under the finger at every tier', () => {
    const bySun: P = { x: 1040, y: 230 }, byCloud: P = { x: 330, y: 150 }
    for (const [at, hanger] of [[bySun, 3], [byCloud, 0], [BARE, -1]] as const) {
      const finger = new Finger(1, 30)
      expect(targetAt(finger.toy, at).kind).toBe('wood')
      finger.tap(at, 'knock')
      expect(finger.toy.knock.hanger, `${at.x},${at.y}`).toBe(hanger)
      if (hanger >= 0) for (const other of HANGERS) expect(near(HANGERS[hanger], at)).toBeLessThanOrEqual(near(other, at))
    }
    for (const tier of TIERS) {
      const finger = new Finger(1, 30), view = new View(blankSheets(emptyRecording()))
      finger.down(BARE, 'knock'); finger.up(); finger.wait(1 / 30)
      // The chip, under the finger, and the ring round it: a pale stroke with a dark one in it.
      const chip = stampsOf(view, finger.toy, tier).filter((stamp) => stamp.key.startsWith('chip'))
      expect(chip, `tier ${TIERS.indexOf(tier)}`).toHaveLength(1)
      expect(near({ x: chip[0].x / DPR, y: chip[0].y / DPR }, BARE)).toBeLessThan(40)
      const { g, trace } = tracingContext()
      view.draw(g, WIDTH, HEIGHT, DPR, { toy: finger.toy, guidance: null, tier })
      const rings = trace.filter((line) => line.startsWith(`arc(${BARE.x},${BARE.y},`))
      expect(rings.length, `tier ${TIERS.indexOf(tier)}`).toBeGreaterThanOrEqual(2)
      expect(trace).toContain('strokeStyle=#fff3d0')
    }
  })

  it('in the room the toad on the table glances at a knock, and an animal in the wood does not', () => {
    const finger = new Finger(1, 30, undefined, world({ finished: true, toad: { at: 'table', x: 560, y: 624 } }))
    const eye: P = { x: 560, y: 524 }
    finger.tap({ x: 900, y: 300 }, 'knock on the wall')
    expect(finger.toy.acts.knock).toBeDefined()
    const look = gaze(finger.toy, eye, null, true)
    expect(look.x).toBeGreaterThan(0.5)
    expect(look.y).toBeLessThan(-0.3)
    // An eye in the wood has not seen it: it wanders as it does at rest.
    expect(gaze(finger.toy, eye, null, false).y).toBe(0.15)
  })

  it('the window in which a second touch on a moving cover is a knock is one number, a third of a second', () => {
    expect(SAME_TAP).toBeCloseTo(1 / 3, 9)
    for (const [after, knocks] of [[0.3, true], [0.4, false]] as const) {
      const finger = new Finger(1, 60)
      finger.down(SPOTS.log.away[0], 'open log'); finger.up()
      expect(finger.toy.covers.log.open).toBe(true)
      finger.wait(after)
      finger.down(SPOTS.log.away[0], 'again'); finger.up()
      expect(finger.toy.covers.log.open, `${after} s`).toBe(knocks)
      expect(finger.toy.acts.knock !== undefined, `${after} s`).toBe(knocks)
    }
  })
})

describe('the animals answer as the sheet has them', () => {
  it('the jay poked swells by a third, and no further: the flap of the burrow stands open beside him', () => {
    const finger = new Finger(1, 60)
    finger.down(JAY, 'jay'); finger.up()
    let most = 0
    for (let i = 0; i < 90; i++) { most = Math.max(most, jayPose(finger.toy).scale); finger.wait(1 / 60) }
    expect(RUFFLE).toBeCloseTo(0.32, 2)
    expect(most).toBeGreaterThan(1.3)
    expect(most).toBeLessThan(1.36)
  })

  it('the hedgehog unrolls for a worm that comes into the open on the toad\'s stone, and for one that climbs out of the puddle', () => {
    for (const [to, where] of [[STONE_SPOT, 'on the stone'], [PUDDLE_SLOT, 'in the puddle']] as const) {
      // The worm is on the table, the hedgehog is a ball: carried out of the door in the hand, the worm is not touched in the wood.
      const finger = new Finger(1, 30, undefined, world({ finished: true, rolled: true, things: things({ worm: { at: 'table', x: 800, y: 628 } }) }))
      const at = finger.reach('worm')
      finger.down(at, 'worm carried out of the door'); finger.wait(0.05)
      finger.slide(at, ROOM_DOOR); finger.wait(0.4)
      expect(finger.toy.rolled, where).toBe(true)
      finger.slide(ROOM_DOOR, to, 14)
      finger.up(); finger.wait(0.5)
      expect(finger.toy.rolled, where).toBe(false)
      expect(ids(finger), where).toContain('hogUnroll')
    }
  })

  it('a thing lifted from its own hollow and set straight back sends out no woodlouse: none moved in', () => {
    const kinds = new Set<string>()
    const finger = new Finger(1, 30, (toy) => { const act = toy.acts['find:stone']; if (act) kinds.add(act.kind) })
    finger.tap(SPOTS.stone.shut, 'open stone'); finger.rest()
    const at = finger.reach('worm'), up: P = { x: at.x + 10, y: at.y - 90 }
    kinds.clear()
    finger.down(at, 'worm lifted'); finger.wait(0.05)
    finger.slide(at, up); finger.slide(up, at)
    finger.up(); finger.rest()
    expect(finger.toy.things.worm).toEqual({ at: 'home' })
    expect([...kinds]).toEqual([])
    expect(ids(finger)).not.toContain('louseOut')
    // Carried right away, a woodlouse moves in; brought back, it trundles out.
    finger.put('worm', { x: 930, y: 500 }, 'worm to the foot of the tree')
    expect([...kinds]).toContain('hello')
    finger.put('worm', SPOTS.stone.find, 'worm back home')
    expect(finger.toy.things.worm).toEqual({ at: 'home' })
    expect(ids(finger)).toContain('louseOut')
  })

  it('the wet apple is dragged a hand\'s width at the edge of the ground too: along it, where the way to his tree is off it', () => {
    let from: P | null = null, to: P | null = null
    const corner = FOOT_SPOTS[2], edge: P = { x: 826, y: 460 }
    const finger = new Finger(1, 30, (toy) => { const act = toy.acts['thing:apple']; if (act?.kind === 'steal:apple') { from = { ...act.from }; to = { ...act.to } } }, world({ wet: ['apple'], things: things({ apple: { at: 'path', x: corner.x, y: corner.y } }) }))
    finger.put('apple', edge, 'wet apple at the edge of the ground')
    expect(from).not.toBeNull()
    expect(near(from!, edge)).toBeLessThan(12)
    expect(near(from!, to!)).toBeGreaterThan(DRAG - 1)
    expect(near(from!, to!)).toBeLessThan(DRAG + 1)
    expect(finger.toy.things.apple).toEqual({ at: 'path', x: to!.x, y: to!.y })
  })
})

describe('the hole the snail eats in the apple', () => {
  const start = (): Finger => {
    const finger = new Finger(1, 60, undefined, world({ finished: true, things: things({ snail: { at: 'table', x: 470, y: 628 }, apple: { at: 'table', x: 700, y: 628 } }) }))
    finger.drag({ x: 470, y: 628 }, { x: 650, y: 628 }, 'snail beside the apple')
    for (let i = 0; i < 60 && finger.toy.acts['thing:snail']?.kind !== 'pair:snail+apple'; i++) finger.wait(1 / 60)
    return finger
  }

  it('shows with the first rasp, not before', () => {
    const finger = start(), view = new View(blankSheets(emptyRecording()))
    const since = finger.toy.acts['thing:snail']!.since
    const bites = (): number => stampsOf(view, finger.toy).filter((stamp) => stamp.key.startsWith('find:bite')).length
    // It is the snail's from the moment the two are together, which is what a save holds.
    expect(finger.toy.bitten).toBe(true)
    let before = 0, after = 0
    for (let i = 0; i < 60; i++) {
      const into = finger.toy.time - since
      if (into < FIRST_RASP - 1e-6) { before += 1; expect(biteShows(finger.toy), `${into.toFixed(2)} s`).toBe(false); expect(bites()).toBe(0) }
      else { after += 1; expect(biteShows(finger.toy), `${into.toFixed(2)} s`).toBe(true); expect(bites()).toBe(1) }
      finger.wait(1 / 60)
    }
    expect(before).toBeGreaterThan(20)
    expect(after).toBeGreaterThan(20)
  })

  it('put away before the first rasp, it is found bitten: the save had it', () => {
    const finger = start()
    finger.wait(0.2)
    expect(biteShows(finger.toy)).toBe(false)
    finger.play.park()
    expect(finger.toy.bitten).toBe(true)
    expect(biteShows(finger.toy)).toBe(true)
  })
})
