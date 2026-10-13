import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { DOOR, SPOTS, WHEEL, near, within, type P } from './layout'
import { slideOf } from './poses'
import { blankSheets, emptyRecording, recordingContext } from './recorder'
import { ROOM_DOOR } from './room'
import { Finger } from './script'
import { invitation } from './step'
import { MINI, drawn, miniSpot } from './things'
import { moving, type Mover, type Toy } from './toy'
import { View } from './view'

// The door of the house, through `Play` as a pointer event goes: what is
// carried through it, what is let go on it, what is left behind it, and when
// the idle ladder shows it.

const WIDTH = 1180, HEIGHT = 820, DPR = 2
/** Open ground at the foot of the jay's tree, where a dull thing lies where it is let go. */
const FOOT: P = { x: 930, y: 500 }

function frameOf(view: View, toy: Toy, guidance: { glow: number; demo: number | null; demoIndex: number } | null = null) {
  const kept = emptyRecording()
  view.draw(recordingContext(kept), WIDTH, HEIGHT, DPR, { toy, guidance, tier: TIERS[0] })
  return kept.stamps.map((stamp) => ({ ...stamp, key: view.sprites.keyOf(stamp.image) ?? '' }))
}

/** A game with the stone open and the worm in the open under it. */
function withWorm(fps = 30): Finger {
  const finger = new Finger(1, fps)
  finger.tap(SPOTS.stone.shut, 'open stone'); finger.rest()
  return finger
}

describe('a thing carried out through the door of the room', () => {
  it('stays under the finger while the view slides from the room to the wood', () => {
    const finger = withWorm()
    finger.put('worm', DOOR, 'worm through the door')
    finger.tap(DOOR, 'door in'); finger.rest()
    expect(finger.toy.room).toBe(true)
    const at = finger.reach('worm')
    finger.down(at, 'worm carried to the door'); finger.wait(0.05)
    finger.slide(at, ROOM_DOOR)
    // Carried onto the door, the view sets off for the wood with the worm still in the hand.
    expect(finger.toy.room).toBe(false)
    expect(finger.toy.hand?.carried).toBe(true)
    const view = new View(blankSheets(emptyRecording()))
    let sliding = 0
    for (let i = 0; i < 20; i++) {
      finger.wait(1 / 30)
      const slide = slideOf(finger.toy)
      if (slide < 0.05 || slide > 0.95) continue
      sliding += 1
      const stamps = frameOf(view, finger.toy), last = stamps[stamps.length - 1], hand = finger.toy.hand!.at
      // The last thing stamped is the worm, where the finger is on the glass: not a slide's width off with either frame.
      expect(last.key).toMatch(/^find:worm/)
      expect(near({ x: last.x / DPR, y: last.y / DPR }, hand), `slide ${slide.toFixed(2)}`).toBeLessThan(1)
    }
    expect(sliding).toBeGreaterThan(4)
    finger.up(); finger.rest()
  })
})

describe('no sound without sight: what is left behind the door', () => {
  it('going in while a cover is still on its way ends that motion silently, and the wood is found as it was left', () => {
    const finger = new Finger(1, 30)
    finger.tap(SPOTS.stone.shut, 'open stone')
    finger.wait(0.1)
    // The stone is rolling, and its landing has still to be heard.
    expect(moving(finger.toy, 'cover:stone')).toBe(true)
    const closes = finger.ears.closes.length, heard = finger.ears.heard.length
    finger.tap(DOOR, 'door in')
    expect(finger.ears.closes.length).toBe(closes + 1)
    const left = (Object.keys(finger.toy.acts) as Mover[]).filter((mover) => mover !== 'view' && !finger.toy.acts[mover]!.room)
    expect(left).toEqual([])
    finger.wait(3)
    expect(finger.ears.heard.slice(heard).map((one) => one.event.id)).not.toContain('stoneLand')
    // Whatever was heard since the door belongs to the room or to the way in.
    for (const one of finger.ears.heard.slice(heard)) expect(['view', 'knock'].includes(one.event.mover) || one.event.mover.startsWith('thing:'), one.event.id).toBe(true)
    // Back out: the stone lies open, as it was left, and does not roll again.
    finger.tap(ROOM_DOOR, 'door out'); finger.rest()
    expect(finger.toy.covers.stone.open).toBe(true)
    expect(finger.toy.acts['cover:stone']).toBeUndefined()
    expect(finger.ears.heard.slice(heard).map((one) => one.event.id)).not.toContain('stoneLand')
  })

  it('coming out while a pair on the table is at its act ends that act silently', () => {
    const things = { worm: { at: 'home' }, snail: { at: 'table', x: 470, y: 628 }, feather: { at: 'home' }, acorn: { at: 'home' }, button: { at: 'home' }, apple: { at: 'table', x: 700, y: 628 } } as const
    const finger = new Finger(1, 30, undefined, { season: 'spring', open: [], rolled: false, things: { ...things }, wet: [], bitten: false, toad: { at: 'stone' }, finished: true })
    finger.drag({ x: 470, y: 628 }, { x: 650, y: 628 }, 'snail beside the apple')
    finger.wait(0.5)
    expect(finger.toy.acts['thing:snail']?.kind).toBe('pair:snail+apple')
    const closes = finger.ears.closes.length
    finger.tap(ROOM_DOOR, 'door out')
    expect(finger.ears.closes.length).toBe(closes + 1)
    expect(finger.toy.acts['thing:snail']).toBeUndefined()
    expect(finger.toy.acts['thing:apple']).toBeUndefined()
  })
})

describe('a thing let go on the door of the house', () => {
  it('is seen going in, and stays in sight on the table that shows through the door: nothing swallows it', () => {
    const finger = withWorm()
    const at = finger.reach('worm')
    finger.drag(at, DOOR, 'worm through the door')
    finger.wait(0.35)
    // It sails in, in the wood's own frame, and is drawn all the way.
    expect(finger.toy.acts['thing:worm']?.kind).toBe('sent')
    expect(Object.keys(finger.toy.acts)).not.toContain('door')
    const spot = miniSpot(finger.toy, 'worm')!
    expect(within(spot, DOOR)).toBe(true)
    let last = Infinity
    for (let i = 0; i < 12; i++) {
      const seen = drawn(finger.toy, 'worm')!
      expect(seen.room).toBe(false)
      expect(seen.pose.show).toBeGreaterThan(0)
      // Nearer the table with each frame, and smaller.
      expect(near(seen.at, spot)).toBeLessThanOrEqual(last + 60)
      last = near(seen.at, spot)
      finger.wait(1 / 30)
    }
    // It lands there, small with the distance, while its act is still under way: it goes nowhere out of sight.
    const landedAt = drawn(finger.toy, 'worm')!
    expect(near(landedAt.at, spot)).toBeLessThan(6)
    expect(landedAt.scale).toBeCloseTo(MINI, 2)
    finger.rest()
    expect(finger.toy.things.worm.at).toBe('table')
    // At rest it is stamped small on the corner of the table inside the door.
    const view = new View(blankSheets(emptyRecording()))
    const mini = frameOf(view, finger.toy).filter((stamp) => stamp.key.startsWith('find:worm'))
    expect(mini).toHaveLength(1)
    expect(near({ x: mini[0].x / DPR, y: mini[0].y / DPR }, spot)).toBeLessThan(1)
    expect(mini[0].a / DPR).toBeCloseTo(MINI, 5)
    // A thing that is not in the room shows nowhere in the door.
    expect(miniSpot(finger.toy, 'snail')).toBeNull()
  })

  it('coming home is a scene only when something was sent in: with nothing sent, the door is only the way in', () => {
    const plain = new Finger(1, 30)
    plain.tap(DOOR, 'door in')
    expect(plain.toy.room).toBe(true)
    expect(plain.toy.scene).toBeNull()
    expect(plain.ears.heard.map((one) => one.event.id)).toContain('comeHome')
    plain.wait(4)
    expect(plain.ears.heard.map((one) => one.event.id)).not.toContain('rockHome')
    const sent = withWorm()
    sent.put('worm', DOOR, 'worm through the door')
    sent.tap(DOOR, 'door in')
    expect(sent.toy.sceneKind).toBe('home')
    sent.wait(4)
    expect(sent.ears.heard.map((one) => one.event.id)).toContain('rockHome')
  })
})

describe('the idle ladder shows the door of the house', () => {
  const ask = (toy: Toy, showing: number) => invitation(toy, { ...WHEEL }, { ...ROOM_DOOR }, showing, { ...DOOR })

  it('once, at its second showing, when a thing has been carried and the room has not been seen', () => {
    const finger = withWorm()
    // Nothing carried yet: no showing is the door.
    for (const showing of [0, 1, 2, 3]) expect(ask(finger.toy, showing).hand).not.toEqual({ tap: { ...DOOR } })
    finger.put('worm', FOOT, 'worm to the foot of the tree')
    expect(finger.toy.carried).toBe(true)
    expect(finger.toy.roomSeen).toBe(false)
    // Left alone, the ladder climbs: its second showing is the door, glowing, with one tap of the hand.
    let second: ReturnType<typeof invitation> | null = null
    const view = new View(blankSheets(emptyRecording()))
    for (let waited = 0; waited < 40 && !second; waited += 0.1) {
      finger.wait(0.1)
      const guidance = finger.play.guidance
      if (guidance && guidance.demoIndex === 1 && guidance.demo !== null && guidance.demo > 0.3 && guidance.demo < 0.6) {
        second = ask(finger.toy, guidance.demoIndex)
        // And the view draws the hand there.
        const hand = frameOf(view, finger.toy, guidance).filter((stamp) => stamp.key.startsWith('hand'))
        expect(hand).toHaveLength(1)
        expect(near({ x: hand[0].x / DPR, y: hand[0].y / DPR }, DOOR)).toBeLessThan(40)
      }
    }
    expect(second?.hand).toEqual({ tap: { ...DOOR } })
    expect(second?.spots).toEqual([{ ...DOOR }])
    expect(second?.covers).toEqual([])
    // Its other showings are the wood's own.
    for (const showing of [0, 2, 3]) expect(ask(finger.toy, showing).hand).not.toEqual({ tap: { ...DOOR } })
    // Once the room has been seen, the door is shown no more.
    finger.tap(DOOR, 'door in'); finger.rest()
    finger.tap(ROOM_DOOR, 'door out'); finger.rest()
    expect(finger.toy.roomSeen).toBe(true)
    expect(ask(finger.toy, 1).hand).not.toEqual({ tap: { ...DOOR } })
  })
})
