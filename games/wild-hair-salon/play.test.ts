import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { BLADES } from './hand'
import { alike } from './voices'
import { BESIDE_X, COLLAR_Y, HEAD, LOCK_X, PEG, STEP } from './layout'
import { PERSONALITIES } from './personality'
import { Play } from './play'
import { BUTTONS, floorX, floorY, placesOf } from './poses'
import { MEET, TAIL_LEN, TUFTS } from './rules'
import { deserializeGame, freshGame, serializeGame, type Game } from './save'
import { DOORWAY } from './staging'

type P = { x: number; y: number }
const DOOR: P = { x: BUTTONS.door.x + 84, y: BUTTONS.door.y + 290 }
const CHAIR: P = { x: BUTTONS.chair.x + 30, y: BUTTONS.chair.y + 200 }
const BENCH: P = { x: BUTTONS.bench.x + 100, y: BUTTONS.bench.y + 60 }
const STOOL: P = { x: BUTTONS.stool.x + 56, y: BUTTONS.stool.y + 80 }
const AIR: P = { x: 860, y: 90 }
const onLock = (steps: number): P => ({ x: LOCK_X, y: COLLAR_Y + steps * STEP })
const onModel = (steps: number): P => ({ x: BESIDE_X, y: COLLAR_Y + steps * STEP })

const opened = (raw: unknown = null, age: number | null = null, seed = 5): Play => { const play = new Play(seed); play.open(raw, age); return play }
const tap = (play: Play, at: P): void => { play.gesture({ type: 'press', at }); play.gesture({ type: 'tap', at }) }
const drag = (play: Play, points: P[]): void => {
  play.gesture({ type: 'press', at: points[0] })
  play.gesture({ type: 'dragStart', from: points[0] })
  for (const at of points.slice(1)) { play.gesture({ type: 'dragMove', from: points[0], at }); play.step(1 / 60, false) }
  play.gesture({ type: 'dragEnd', from: points[0], at: points[points.length - 1] })
}
const run = (play: Play, seconds: number, idle = true): void => { for (let i = 0; i < seconds * 60; i++) play.step(1 / 60, idle) }
/** Plays the scene that is running to its end. */
const through = (play: Play): void => { let n = 0; while (play.inScene && n++ < 60 * 30) play.step(1 / 60, true) }
const round = (play: Play): unknown => JSON.parse(JSON.stringify(play.saved()))
const knotOf = (play: Play): P => placesOf(play.game!).knot!
/** A salon with the first pair seated and every showing done, at rest. */
const seated = (over: Partial<Game> = {}, seed = 5): Play => {
  const first = opened(null, null, seed)
  tap(first, DOOR)
  through(first)
  return opened({ ...first.saved(), shown: { snip: true, pull: true, ribbon: false }, ...over }, null, seed)
}
const match = (play: Play): void => {
  const g = play.game!
  if (g.lock > g.model) drag(play, [AIR, { x: LOCK_X + 40, y: COLLAR_Y + g.model * STEP - BLADES.y }, { x: LOCK_X - 20, y: COLLAR_Y + g.model * STEP - BLADES.y }])
  else drag(play, [onLock(Math.min(g.lock, 10)), onLock(Math.min(g.lock, 10) + (g.model - g.lock))])
}

describe('before the slot has been read', () => {
  it('does nothing and saves nothing', () => {
    const play = new Play(1)
    tap(play, DOOR)
    play.step(1, true)
    expect(play.game).toBeNull()
    expect(play.saved()).toBeNull()
    expect(play.takeNotes()).toEqual([])
    expect(play.takeSave()).toBeNull()
  })
})

describe('an empty salon', () => {
  it('answers a touch anywhere but the door with the pair at the door, who look round at it', () => {
    const play = opened()
    play.gesture({ type: 'press', at: { x: 520, y: 440 } })
    for (const puppet of play.waiting!) expect(puppet.busy).toBe(true)
    play.gesture({ type: 'tap', at: { x: 520, y: 440 } })
    // Nothing else changed: nobody came in and nothing is saved.
    expect(play.game).toEqual(freshGame(null))
    expect(play.inScene).toBe(false)
  })
})

describe('small things the sheet has', () => {
  it('has each of the pair look to the side the other one\'s lock is on, beside the chair and across the room', () => {
    const looks = (seat: 'beside' | 'across'): { customer: number; friend: number } => {
      const play = seated({ seat })
      const seen = { customer: 0, friend: 0 }
      for (let i = 0; i < 60 * 5; i++) {
        play.step(1 / 60, true)
        for (const who of ['customer', 'friend'] as const) { const x = play[who]()!.at('lookX'); if (Math.abs(x) > Math.abs(seen[who])) seen[who] = x }
      }
      return seen
    }
    // The friend on the stool is on the customer's right and its lock hangs between them: the customer looks right and the friend looks left.
    const beside = looks('beside')
    expect(beside.customer).toBeGreaterThan(0.4)
    expect(beside.friend).toBeLessThan(-0.4)
    // Across the room the friend is on the customer's left.
    const across = looks('across')
    expect(across.customer).toBeLessThan(-0.4)
    expect(across.friend).toBeGreaterThan(0.4)
  })

  it('sounds the friend\'s lock snapping back when it is let go, and a bow with a rustle and then a ting', () => {
    const play = seated()
    play.takeNotes()
    play.gesture({ type: 'press', at: onModel(10) })
    play.gesture({ type: 'dragStart', from: onModel(10) })
    play.gesture({ type: 'dragMove', from: onModel(10), at: onModel(40) })
    const stretched = play.takeNotes()
    play.gesture({ type: 'dragEnd', from: onModel(10), at: onModel(40) })
    const snapped = play.takeNotes()
    expect(snapped).toHaveLength(1)
    expect(stretched.some((note) => alike(note, snapped[0]))).toBe(false)
  })

  it('has the customer look up at a bow and be heard to like it or hate it, by its taste', () => {
    for (const [who, bit] of [['lion', 'lion-goes-cross-eyed-and-bats-at-it'], ['poodle', 'poodle-turns-her-head-at-the-mirror']] as const) {
      const play = seated({ chair: who, friend: who === 'lion' ? 'yak' : 'lion', ribbon: { len: 40, at: 'peg' }, shown: { snip: true, pull: true, ribbon: true } })
      const peg = { x: PEG.x, y: PEG.y - 12 }
      play.takeNotes()
      drag(play, [peg, { x: 700, y: 200 }, { x: HEAD.x, y: HEAD.y - HEAD.ry - 50 }])
      expect(play.game!.ribbon).toMatchObject({ at: 'mane' })
      expect(play.customer()!.started).toContain(bit)
      let looked = 0
      for (let i = 0; i < 20; i++) { play.step(1 / 60, false); looked = Math.min(looked, play.customer()!.at('lookY')) }
      expect(looked).toBeLessThan(-0.3)
      expect(play.takeNotes().length).toBeGreaterThan(1)
    }
  })

  it('lets a swipe that only began on a seat, the door or the chair go by, and a drag from the knot still pull the cape off', () => {
    const play = seated(), before = round(play)
    drag(play, [BENCH, { x: BENCH.x + 60, y: BENCH.y - 40 }, { x: BENCH.x + 200, y: BENCH.y - 120 }])
    expect(round(play)).toEqual(before)
    expect(play.pressed).toBeNull()
    // A short slip of the finger on the bench is still a touch on it.
    drag(play, [BENCH, { x: BENCH.x + 20, y: BENCH.y + 16 }])
    expect(play.game!.seat).toBe('across')
    through(play)
    const knot = knotOf(play)
    drag(play, [knot, { x: knot.x - 80, y: knot.y - 60 }, { x: knot.x - 160, y: knot.y - 120 }])
    expect(play.game!.cape).toBe('off')
  })

  it('turns the oldest piece on the floor to fluff, with a sigh, when a thirteenth is cut', () => {
    const full = Array.from({ length: 12 }, (_, i) => ({ len: 9, hue: 'lion' as const, on: 'floor' as const, x: 20 + i * 3 }))
    const play = seated({ lock: 90, clippings: full })
    play.takeNotes()
    drag(play, [AIR, { x: LOCK_X + 40, y: COLLAR_Y + 150 - BLADES.y }, { x: LOCK_X - 20, y: COLLAR_Y + 150 - BLADES.y }])
    expect(play.game!.clippings).toHaveLength(12)
    expect(play.game!.clippings.some((c) => c.on === 'floor' && c.x === 20 && c.len === 9)).toBe(false)
    expect(play.hair.puffs.length).toBeGreaterThanOrEqual(3)
  })

  it('shows the pull only as a customer comes in: a lock the child cut short is not shown it at a touch on a seat', () => {
    const play = seated({ shown: { snip: true, pull: false, ribbon: true }, ribbon: { len: 40, at: 'peg' }, lock: 60, model: 44 })
    drag(play, [AIR, { x: LOCK_X + 40, y: COLLAR_Y + 10 * STEP - BLADES.y }, { x: LOCK_X - 20, y: COLLAR_Y + 10 * STEP - BLADES.y }])
    expect(play.game!.lock).toBeLessThan(44 - MEET)
    tap(play, BENCH)
    through(play)
    expect(play.game!.shown.pull).toBe(false)
  })
})

describe('a touch that is cut off', () => {
  // The game is put away under a finger, or the browser takes the finger: the Mount gives the touch up.
  it('does not open the door, pull the cape off or move the friend when the finger was on one of them', () => {
    const empty = opened()
    empty.gesture({ type: 'press', at: DOOR })
    empty.abandon()
    expect(empty.game).toEqual(freshGame(null))
    expect(empty.inScene).toBe(false)
    expect(empty.pressed).toBeNull()
    const play = seated(), before = round(play)
    for (const at of [knotOf(play), BENCH]) { play.gesture({ type: 'press', at }); play.abandon() }
    expect(round(play)).toEqual(before)
    expect(play.inScene).toBe(false)
    // The browser's own way of saying so does the same.
    play.gesture({ type: 'press', at: knotOf(play) })
    play.gesture({ type: 'pressEnd', at: knotOf(play) })
    expect(round(play)).toEqual(before)
  })

  it('leaves a carried ribbon and a carried piece where they were picked up, and a lock that was drawn out as long as it was drawn', () => {
    const play = seated({ ribbon: { len: 40, at: 'peg' }, shown: { snip: true, pull: true, ribbon: true }, clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 40 }] })
    const peg = { x: PEG.x, y: PEG.y - 12 }
    play.gesture({ type: 'press', at: peg })
    play.gesture({ type: 'dragStart', from: peg })
    play.gesture({ type: 'dragMove', from: peg, at: onLock(10) })
    play.abandon()
    expect(play.game!.ribbon).toEqual({ len: 40, at: 'peg' })
    expect(play.hair.carried).toBeNull()
    const piece = { x: floorX(40), y: floorY(40) }
    play.gesture({ type: 'press', at: piece })
    play.gesture({ type: 'dragStart', from: piece })
    play.gesture({ type: 'dragMove', from: piece, at: { x: HEAD.x, y: HEAD.y + 40 } })
    play.abandon()
    expect(play.game!.clippings).toEqual([{ len: 20, hue: 'lion', on: 'floor', x: 40 }])
    const lock = play.game!.lock, from = onLock(Math.min(lock, 10))
    play.gesture({ type: 'press', at: from })
    play.gesture({ type: 'dragStart', from })
    play.gesture({ type: 'dragMove', from, at: { x: from.x, y: from.y + 40 } })
    const drawn = play.game!.lock
    play.abandon()
    expect(drawn).toBeGreaterThan(lock)
    expect(play.game!.lock).toBe(drawn)
    expect(play.hand.held).toBeNull()
    expect(play.hair.holds).toBeNull()
  })
})

describe('left alone', () => {
  it('has the pair at the door look about and rock on their heels, turn about, while the salon is empty, and changes nothing', () => {
    const play = opened()
    let lively = [0, 0]
    for (let i = 0; i < 60 * 14; i++) { play.step(1 / 60, true); play.waiting!.forEach((puppet, n) => { if (puppet.started.some((id) => PERSONALITIES[play.game!.waiting[n]].reactions.looksAbout.some((bit) => bit.id === id))) lively[n] = 1 }) }
    expect(lively).toEqual([1, 1])
    expect(play.game).toEqual(freshGame(null))
    expect(play.takeSave()).toBeNull()
  })

  it('has the mane stir by itself under the cape now and then, and never while a finger is at work', () => {
    const play = seated()
    let stirred = false
    for (let i = 0; i < 60 * 14; i++) { play.step(1 / 60, true); if (!play.hair.settled) stirred = true }
    expect(stirred).toBe(true)
    // And the one want is there to see without a touch, after a reload too: the customer looks from lock to lock and pats its own, and the friend looks back.
    expect(play.customer()!.started).toEqual(expect.arrayContaining(['lion-looks-from-his-lock-to-the-other', 'lion-pats-his-lock-twice-slowly']))
    expect(play.friend()!.started).toContain('poodle-points-her-nose-at-each-in-turn')
    const busy = seated()
    let moved = false
    for (let i = 0; i < 60 * 8; i++) { busy.step(1 / 60, false); if (busy.hair.tufts.some((tuft) => tuft.stretch.x > 1.05)) moved = true }
    expect(moved).toBe(false)
  })
})

describe('the mane and the scissors', () => {
  it('stands on end while the scissors are out over a customer under the cape, and not in an empty salon or with the cape off', () => {
    const play = seated()
    play.gesture({ type: 'press', at: AIR })
    expect(play.hair.scared).toBe(true)
    play.gesture({ type: 'tap', at: AIR })
    expect(play.hair.scared).toBe(false)
    const empty = opened()
    empty.gesture({ type: 'press', at: AIR })
    expect(empty.hair.scared).toBe(false)
    const off = seated()
    tap(off, knotOf(off))
    through(off)
    off.gesture({ type: 'press', at: AIR })
    expect(off.hair.scared).toBe(false)
  })

  it('bumps the head of whoever is poked, and a pressed nose sneezes fluff', () => {
    const play = seated()
    tap(play, { x: HEAD.x, y: HEAD.y + 22 })
    expect(play.customer()!.squash.v + play.customer()!.squash.x).toBeGreaterThan(0)
    expect(play.hair.puffs.length).toBeGreaterThan(0)
    const before = play.friend()!.squash.v
    tap(play, onModel(10))
    expect(play.friend()!.squash.v).toBeGreaterThan(before)
  })
})

describe('a poke', () => {
  it('holds nothing afterwards: the hair it touched wobbles free and comes to rest', () => {
    for (const at of [onLock(10), onModel(10), { x: HEAD.x, y: HEAD.y - HEAD.ry - 40 }]) {
      const play = seated()
      tap(play, at)
      expect(play.hair.holds).toBeNull()
      expect(play.hand.held).toBeNull()
      run(play, 0.1, true)
      expect(play.hair.settled).toBe(false)
      run(play, 6, true)
      expect(play.hair.settled).toBe(true)
    }
  })
})

describe('a first visit', () => {
  it('opens on an empty chair with the first pair at the door, and nothing starts by itself', () => {
    const play = opened()
    expect(play.game).toMatchObject({ chair: null, friend: null, waiting: ['lion', 'poodle'], cape: 'off' })
    expect(play.staging.customer).toBeNull()
    expect(play.waiting).toHaveLength(2)
    run(play, 30)
    expect(play.game).toEqual(freshGame(null))
    expect(play.inScene).toBe(false)
    expect(play.takeSave()).toBeNull()
    expect(play.customer()).toBeNull()
  })

  it('answers a touch on the empty salon with a sound and no scissors: there is nothing to cut, so no tool comes', () => {
    const play = opened()
    play.gesture({ type: 'press', at: AIR })
    expect(play.hand.held).toBeNull()
    expect(play.hair.scissors.inHand).toBe(false)
    expect(play.takeNotes().length).toBeGreaterThanOrEqual(1)
    play.gesture({ type: 'tap', at: AIR })
    drag(play, [AIR, { x: 500, y: 300 }, { x: 600, y: 500 }])
    expect(play.hair.scissors.inHand).toBe(false)
    expect(play.game).toEqual(freshGame(null))
    // With a customer in the chair the scissors are in the hand at once.
    const seatedPlay = seated()
    seatedPlay.gesture({ type: 'press', at: AIR })
    expect(seatedPlay.hand.held).toBe('scissors')
  })

  it('lets the first pair in on a touch on the door: they are in the game at once, and the scene plays them in', () => {
    const play = opened()
    tap(play, DOOR)
    expect(play.game).toMatchObject({ chair: 'lion', friend: 'poodle', cape: 'on', finished: false })
    expect(play.takeSave()).toBe('now')
    expect(play.inScene).toBe(true)
    // They start in the doorway, under their rain hats, with the door opening.
    expect(play.staging.hats).toBe(1)
    expect(play.staging.customer!.x).toBeGreaterThan(DOORWAY.x - 60)
    run(play, 1.2)
    expect(play.staging.customer!.x).toBeLessThan(DOORWAY.x - 60)
    expect(play.staging.door).toBeGreaterThan(0.5)
    through(play)
    const places = placesOf(play.game!)
    expect(play.staging).toMatchObject({ customer: { x: places.customer!.x, y: places.customer!.y }, friend: { x: places.friend!.x }, door: 0, hats: 0, cape: 1, waiting: 1, leaving: [] })
    expect(play.leaving).toEqual([])
  })

  it('shows the snip once, right after the first pair has come in, and its outcome is saved before it plays', () => {
    const play = opened()
    const laid = (() => { const other = opened(); tap(other, DOOR); return other })()
    tap(play, DOOR)
    // Marked, and the tuft the customer will nip already at half its length in what is saved.
    expect(play.game!.shown).toEqual({ snip: true, pull: false, ribbon: false })
    const longest = Math.max(...laid.game!.mane.map((steps, i) => (steps === play.game!.mane[i] ? 0 : steps)), 0)
    expect(longest).toBe(0)
    const saved = round(play)
    through(play)
    expect(round(play)).toEqual(saved)
    // It is not shown again for the next customer.
    tap(play, knotOf(play)); through(play); tap(play, DOOR)
    expect(play.staging.paw).toBeNull()
    through(play)
    expect(play.game!.shown.snip).toBe(true)
  })

  it('starts where the age hint says, and at the youngest place for no age', () => {
    for (const [age, position, seat] of [[null, 'beside-long', 'beside'], [4, 'beside-long', 'beside'], [5, 'beside-close', 'beside'], [6, 'across', 'across'], [12, 'across', 'across']] as const) {
      const play = opened(null, age)
      tap(play, DOOR)
      expect(play.game).toMatchObject({ position, seat })
    }
  })
})

describe('a scene', () => {
  it('ends at once on a touch, with everyone where it was taking them, and the touch is then an ordinary touch', () => {
    const play = opened()
    tap(play, DOOR)
    run(play, 0.6)
    expect(play.inScene).toBe(true)
    play.gesture({ type: 'press', at: onLock(20) })
    expect(play.inScene).toBe(false)
    const places = placesOf(play.game!)
    expect(play.staging).toMatchObject({ customer: { x: places.customer!.x, y: places.customer!.y, lift: 0, seen: 1 }, door: 0, hats: 0, cape: 1, paw: null })
    expect(play.hair.settled || play.hair.holds === 'lock').toBe(true)
    // The same press caught the lock.
    expect(play.hand.held).toEqual({ object: 'lock' })
    play.gesture({ type: 'pressEnd', at: onLock(20) })
  })

  it('starts no sound and no reaction when it is cut short', () => {
    const play = opened()
    tap(play, DOOR)
    play.takeNotes()
    play.gesture({ type: 'press', at: AIR })
    // Only the touch's own answer: the scissors.
    expect(play.takeNotes()).toHaveLength(1)
    expect(play.customer()!.busy).toBe(false)
    play.gesture({ type: 'pressEnd', at: AIR })
  })

  it.each([
    ['coming in', (play: Play) => { tap(play, knotOf(play)); through(play); tap(play, DOOR) }],
    ['the cape coming off', (play: Play) => tap(play, knotOf(play))],
    ['going back under the cape', (play: Play) => { tap(play, knotOf(play)); through(play); tap(play, CHAIR) }],
    ['the friend crossing the room, and the ribbon shown', (play: Play) => tap(play, BENCH)],
  ])('saves its whole outcome when it starts: %s', (_name, start) => {
    const play = seated()
    play.takeSave()
    start(play)
    expect(play.inScene).toBe(true)
    expect(play.takeSave()).toBe('now')
    const saved = round(play)
    // Put away in the middle and opened again: the salon is in the state the scene ends in, and nothing plays.
    run(play, 0.7)
    const again = opened(saved)
    expect(again.inScene).toBe(false)
    expect(again.takeNotes()).toEqual([])
    expect(again.customer()!.started).toEqual([])
    const places = placesOf(again.game!)
    expect(again.staging).toMatchObject({ customer: { x: places.customer!.x }, friend: { x: places.friend!.x }, door: 0, hats: 0 })
    // And played to its end, the scene changes nothing that is saved.
    through(play)
    expect(round(play)).toEqual(saved)
    expect(play.takeSave()).toBeNull()
  })

  it('stops the two in the salon doing things of their own while it plays', () => {
    const play = seated()
    tap(play, BENCH)
    const before = play.customer()!.started.length
    run(play, 1)
    expect(play.inScene).toBe(true)
    // Whatever started was started by the scene's own beats, not by idleness.
    for (const id of play.customer()!.started.slice(before)) expect(id).toMatch(/wants|watches|looks/)
  })
})

describe('the cycle', () => {
  it('keeps the door shut while a customer is under the cape: the pair behind it duck and peek, and nobody comes in', () => {
    const play = seated()
    const before = play.game
    tap(play, DOOR)
    expect(play.game).toBe(before)
    expect(play.inScene).toBe(false)
    expect(play.waiting!.map((puppet) => puppet.started[puppet.started.length - 1])).toEqual(play.game!.waiting.map((who) => PERSONALITIES[who].reactions.ducksAndPeeks[0].id))
    expect(play.takeNotes().length).toBeGreaterThanOrEqual(1)
  })

  it('ends when the child pulls the cape off by its knot, by a tap or a drag, and is judged once', () => {
    const play = seated()
    match(play)
    const knot = knotOf(play)
    drag(play, [knot, { x: knot.x - 90, y: knot.y + 60 }])
    expect(play.game).toMatchObject({ cape: 'off', finished: true, position: 'beside-short' })
    expect(play.inScene).toBe(true)
    through(play)
    expect(play.staging).toMatchObject({ cape: 0, fx: null })
    // A touch on the chair brings the customer back under the cape; pulling it off again judges nothing.
    tap(play, CHAIR)
    expect(play.game).toMatchObject({ cape: 'on', finished: true })
    through(play)
    drag(play, [onLock(10), onLock(40)])
    tap(play, knotOf(play))
    expect(play.game).toMatchObject({ cape: 'off', position: 'beside-short' })
  })

  it('acts out the comparison the child made: the two locks side by side, and the customer\'s own reaction to its lock', () => {
    const cases: [string, (play: Play) => void, string][] = [
      ['too long', () => {}, 'lion-treads-on-it-into-a-slow-bow'],
      ['as long', (play) => match(play), 'lion-slow-head-toss'],
      ['too short', (play) => drag(play, [AIR, { x: LOCK_X + 40, y: COLLAR_Y + 6 * STEP - BLADES.y }, { x: LOCK_X - 20, y: COLLAR_Y + 6 * STEP - BLADES.y }]), 'lion-pats-for-it-and-an-ear-flicks-out'],
    ]
    for (const [name, cut, bit] of cases) {
      const play = seated()
      cut(play)
      tap(play, knotOf(play))
      let acted = false
      for (let i = 0; i < 60 * 12 && play.inScene; i++) { play.step(1 / 60, true); if (play.staging.fx) acted = true }
      expect(acted, name).toBe(true)
      expect(play.customer()!.started, name).toContain(bit)
      // Cheek to cheek, with the two locks hanging from one line.
      const places = placesOf(play.game!)
      expect(places.lock!.y).toBe(places.model!.y)
      expect(play.staging.friend).toMatchObject({ x: places.friend!.x })
    }
  })

  it('keeps the hair as cut when the cape is off, and lets nothing be changed until the customer is back under it', () => {
    const play = seated()
    tap(play, knotOf(play))
    through(play)
    const before = [play.game!.lock, play.game!.model, play.game!.mane]
    drag(play, [onLock(10), onLock(40)])
    drag(play, [AIR, { x: LOCK_X + 40, y: COLLAR_Y + 8 * STEP - BLADES.y }, { x: LOCK_X - 20, y: COLLAR_Y + 8 * STEP - BLADES.y }])
    expect([play.game!.lock, play.game!.model, play.game!.mane]).toEqual(before)
  })

  it('lets the next pair in when the cape is off: the pair that was done go out with what they wear, and the next are laid out for the position as it stands', () => {
    const play = seated({ clippings: [{ len: 9, hue: 'lion', on: 'face', who: 'chair', spot: 'lip' }, { len: 12, hue: 'lion', on: 'floor', x: 40 }] })
    match(play)
    tap(play, knotOf(play))
    through(play)
    const waited = play.game!.waiting
    tap(play, DOOR)
    expect(play.game).toMatchObject({ chair: waited[0], friend: waited[1], cape: 'on', finished: false, position: 'beside-short' })
    expect(play.game!.model - play.game!.lock).toBeGreaterThan(MEET)
    expect(play.game!.clippings.filter((c) => c.on === 'face')).toEqual([])
    expect(play.game!.clippings.filter((c) => c.on === 'floor').length).toBeGreaterThanOrEqual(1)
    // Both pairs are on stage for a moment: two going out, two coming in.
    expect(play.staging.leaving.map((goer) => goer.who)).toEqual(['lion', 'poodle'])
    expect(play.leaving).toHaveLength(2)
    // The pull is shown now, the first time a lock starts shorter than its model.
    expect(play.game!.shown.pull).toBe(true)
    through(play)
    expect(play.leaving).toEqual([])
    expect(play.customer()!.personality).not.toBe(play.friend()!.personality)
  })

  it('climbs the whole order with a child who matches every lock, one step a customer', () => {
    const play = opened()
    tap(play, DOOR)
    through(play)
    const seen: string[] = []
    for (let i = 0; i < 7; i++) {
      seen.push(play.game!.position)
      if (play.game!.seat === 'across') { tap(play, STOOL); through(play) }
      match(play)
      tap(play, knotOf(play)); through(play)
      tap(play, DOOR); through(play)
    }
    expect(seen.slice(0, 6)).toEqual([...LADDER])
  })
})

describe('the harder option', () => {
  it('sends the friend across the room on a touch on the bench, and back on a touch on the stool, as often as the child likes', () => {
    const play = seated({ shown: { snip: true, pull: true, ribbon: true }, ribbon: { len: 30, at: 'peg' } })
    for (let i = 0; i < 3; i++) {
      tap(play, BENCH)
      expect(play.game!.seat).toBe('across')
      through(play)
      expect(play.staging.friend!.x).toBeLessThan(250)
      tap(play, STOOL)
      expect(play.game!.seat).toBe('beside')
      through(play)
      expect(play.staging.friend!.x).toBeGreaterThan(600)
    }
    expect(play.game!.position).toBe('beside-long')
  })

  it('shows the ribbon the first time the friend sits across the room, and from then on it is in the salon on its peg', () => {
    const play = seated()
    expect(play.game!.ribbon).toBeNull()
    tap(play, BENCH)
    expect(play.game).toMatchObject({ seat: 'across', ribbon: { len: TAIL_LEN, at: 'peg' }, shown: { ribbon: true } })
    let carriedAbout = false
    for (let i = 0; i < 60 * 12 && play.inScene; i++) { play.step(1 / 60, true); if (play.staging.ribbon && play.staging.tails > 0.5) carriedAbout = true }
    expect(carriedAbout).toBe(true)
    expect(play.staging.ribbon).toBeNull()
    expect(play.friend()!.started).toContain('poodle-shows-it-off-with-a-flourish')
    // Not shown again.
    tap(play, STOOL); through(play); tap(play, BENCH)
    run(play, 1.2)
    expect(play.staging.ribbon).toBeNull()
  })

  it('carries a length across the room on the ribbon, with the friend on the bench', () => {
    const play = seated({ seat: 'across', lock: 70, model: 44, shown: { snip: true, pull: true, ribbon: true }, ribbon: { len: 80, at: 'peg' } })
    const model = placesOf(play.game!).model!
    drag(play, [{ x: PEG.x, y: PEG.y - 14 }, { x: 500, y: 200 }, { x: model.x, y: model.y + 20 * STEP }])
    expect(play.game!.ribbon).toEqual({ len: 80, at: 'model' })
    expect(play.friend()!.started).toContain('poodle-on-tiptoe-not-breathing')
    const hung = { x: model.x + 36, y: model.y }
    drag(play, [{ x: hung.x + 70, y: 440 }, { x: hung.x + 30, y: hung.y + 44 * STEP - BLADES.y }, { x: hung.x - 16, y: hung.y + 44 * STEP - BLADES.y }])
    drag(play, [{ x: hung.x, y: hung.y - 14 }, { x: 400, y: 300 }, onLock(30)])
    expect(play.game!.ribbon).toEqual({ len: 44, at: 'lock' })
    drag(play, [AIR, { x: LOCK_X + 30, y: COLLAR_Y + 44 * STEP - BLADES.y }, { x: LOCK_X - 14, y: COLLAR_Y + 44 * STEP - BLADES.y }])
    expect(play.game!.lock).toBe(44)
    tap(play, knotOf(play))
    expect(play.game!.position).toBe('beside-short')
  })
})

describe('touching the two in the salon', () => {
  it('makes each do something of its own about everything that is done to it', () => {
    const cases: [string, 'customer' | 'friend', (play: Play) => void][] = [
      ['lion-purrs-and-melts', 'customer', (play) => drag(play, [{ x: 470, y: 250 }, ...Array.from({ length: 12 }, (_, i) => ({ x: 470 + (i % 2 ? -22 : 22), y: 250 }))])],
      ['lion-cross-eyed-ducks-and-peeks', 'customer', (play) => drag(play, [{ x: 330, y: 560 }, { x: 420, y: 330 - BLADES.y }, { x: 520, y: 300 - BLADES.y }])],
      ['lion-snort-and-nose-wiggle', 'customer', (play) => tap(play, { x: HEAD.x, y: HEAD.y + 24 })],
      ['lion-cheek-wobbles-back', 'customer', (play) => drag(play, [{ x: 450, y: 290 }, { x: 400, y: 290 }, { x: 340, y: 300 }])],
      ['lion-ear-follows-the-note', 'customer', (play) => tap(play, onLock(10))],
      ['poodle-eyes-cross-pom-quivers', 'friend', (play) => drag(play, [onModel(10), onModel(30)])],
      ['poodle-quick-shake-poms-bounce', 'friend', (play) => drag(play, [AIR, { x: BESIDE_X + 40, y: COLLAR_Y + 20 * STEP - BLADES.y }, { x: BESIDE_X - 16, y: COLLAR_Y + 20 * STEP - BLADES.y }])],
      ['poodle-bright-hum-ear-flick', 'friend', (play) => tap(play, onModel(10))],
      ['poodle-huffs-and-puts-each-curl-back', 'friend', (play) => { const f = placesOf(play.game!).friend!; drag(play, [{ x: f.x, y: f.y - 10 }, ...Array.from({ length: 12 }, (_, i) => ({ x: f.x + (i % 2 ? -22 : 22), y: f.y - 10 }))]) }],
      ['poodle-three-tiny-sneezes', 'friend', (play) => { const f = placesOf(play.game!).friend!; tap(play, { x: f.x, y: f.y + 15 }) }],
    ]
    for (const [bit, who, touch] of cases) {
      const play = seated()
      touch(play)
      expect((who === 'customer' ? play.customer() : play.friend())!.started, bit).toContain(bit)
    }
  })

  it('answers a head rub by the customer\'s taste: the one who loves it and the one who hates it do different things', () => {
    const rub = (play: Play) => drag(play, [{ x: 470, y: 250 }, ...Array.from({ length: 12 }, (_, i) => ({ x: 470 + (i % 2 ? -22 : 22), y: 250 }))])
    const lion = seated()
    rub(lion)
    expect(lion.customer()!.started).toContain('lion-purrs-and-melts')
    const yak = seated({ chair: 'yak', friend: 'rabbit' })
    rub(yak)
    expect(yak.customer()!.started).toContain('yak-sinks-down-with-a-long-low-groan')
  })

  it('never moves the model: pulled it is drawn out and springs back, snipped it grows back and a piece falls', () => {
    const play = seated()
    const model = play.game!.model
    play.gesture({ type: 'press', at: onModel(10) })
    play.gesture({ type: 'dragStart', from: onModel(10) })
    play.gesture({ type: 'dragMove', from: onModel(10), at: onModel(30) })
    expect(play.hand.drawnOut).toBeGreaterThan(10)
    play.gesture({ type: 'dragEnd', from: onModel(10), at: onModel(30) })
    expect(play.game!.model).toBe(model)
    expect(play.hair.strands.model.stretch.x).toBeGreaterThan(1.1)
    drag(play, [AIR, { x: BESIDE_X + 40, y: COLLAR_Y + 10 * STEP - BLADES.y }, { x: BESIDE_X - 16, y: COLLAR_Y + 10 * STEP - BLADES.y }])
    expect(play.game!.model).toBe(model)
    expect(play.game!.clippings).toMatchObject([{ len: model - 10, hue: 'poodle', on: 'floor' }])
  })

  it('sticks a carried piece on either face, and its wearer tries to look at it', () => {
    const play = seated({ clippings: [{ len: 20, hue: 'lion', on: 'floor', x: 30 }] })
    const friend = placesOf(play.game!).friend!
    drag(play, [{ x: floorX(30), y: floorY(30) }, { x: 600, y: 500 }, { x: friend.x, y: friend.y + 26 }])
    expect(play.game!.clippings).toEqual([{ len: 20, hue: 'lion', on: 'face', who: 'friend', spot: 'lip' }])
    expect(play.friend()!.started).toContain('poodle-admires-it-sideways')
  })
})

describe('found as left', () => {
  it('opens as the same salon after any touch, at rest, and replays nothing', () => {
    const play = seated()
    const touches: (() => void)[] = [
      () => drag(play, [onLock(10), onLock(30)]),
      () => drag(play, [AIR, { x: LOCK_X + 40, y: COLLAR_Y + 30 * STEP - BLADES.y }, { x: LOCK_X - 20, y: COLLAR_Y + 30 * STEP - BLADES.y }]),
      () => tap(play, { x: HEAD.x, y: HEAD.y + 24 }),
      () => drag(play, [{ x: 330, y: 40 }, { x: 520, y: 90 }, { x: 640, y: 130 }]),
      () => { tap(play, BENCH); through(play) },
      () => { drag(play, [{ x: PEG.x, y: PEG.y - 14 }, { x: 600, y: 300 }, { x: HEAD.x, y: HEAD.y }]); },
      () => { tap(play, knotOf(play)); run(play, 1) },
      () => { play.gesture({ type: 'press', at: AIR }); play.gesture({ type: 'pressEnd', at: AIR }); tap(play, DOOR); run(play, 2) },
    ]
    for (const touch of touches) {
      touch()
      const again = opened(round(play))
      expect(again.saved()).toEqual(play.saved())
      expect(again.inScene).toBe(false)
      expect(again.takeNotes()).toEqual([])
      expect(again.takeSave()).toBeNull()
    }
    expect(play.game!.chair).not.toBe('lion')
  })

  it('saves a held lock at the length it has, and a carried ribbon where it was picked up', () => {
    const play = seated({ shown: { snip: true, pull: true, ribbon: true }, ribbon: { len: 30, at: 'peg' } })
    play.takeSave()
    play.gesture({ type: 'press', at: onLock(10) })
    play.gesture({ type: 'dragStart', from: onLock(10) })
    play.gesture({ type: 'dragMove', from: onLock(10), at: onLock(40) })
    expect(play.takeSave()).toBe('soon')
    const held = play.game!.lock
    expect(deserializeGame(round(play)).lock).toBe(held)
    play.gesture({ type: 'dragEnd', from: onLock(10), at: onLock(40) })
    expect(play.game!.lock).toBe(held)
    const clip = { x: PEG.x, y: PEG.y - 14 }
    play.gesture({ type: 'press', at: clip })
    play.gesture({ type: 'dragStart', from: clip })
    play.gesture({ type: 'dragMove', from: clip, at: { x: 600, y: 300 } })
    expect(play.hair.carried).toMatchObject({ what: 'ribbon', at: { x: 600, y: 300 } })
    expect(deserializeGame(round(play)).ribbon).toEqual({ len: 30, at: 'peg' })
    play.gesture({ type: 'dragLift', from: clip, at: { x: 600, y: 300 } })
    expect(play.hair.carried).not.toBeNull()
    play.gesture({ type: 'dragEnd', from: clip, at: { x: 880, y: 600 } })
    expect(play.hair.carried).toBeNull()
    expect(play.game!.ribbon).toEqual({ len: 30, at: 'peg' })
  })
})

describe('any touch at all', () => {
  it('answers every random touch with a sound and never breaks the salon, through scenes and all', () => {
    const play = opened(null, 6, 3)
    let seed = 11
    const next = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff }
    const spots: P[] = [DOOR, CHAIR, BENCH, STOOL, { x: PEG.x, y: PEG.y - 14 }, onLock(10), onModel(10), { x: HEAD.x, y: HEAD.y }]
    const chairs = new Set<string>()
    for (let i = 0; i < 500; i++) {
      const points = Array.from({ length: 2 + Math.floor(next() * 5) }, () => (next() < 0.35 ? spots[Math.floor(next() * spots.length)] : { x: next() * 1180, y: next() * 820 }))
      if (next() < 0.1 && play.game!.chair && play.game!.cape === 'on') tap(play, knotOf(play))
      else if (next() < 0.4) tap(play, points[0])
      else drag(play, points)
      expect(play.takeNotes().length, `touch ${i}`).toBeGreaterThanOrEqual(1)
      play.step(next() * 0.5, false)
      const g = play.game!
      for (const steps of [g.lock, g.model, ...g.mane]) expect(Number.isInteger(steps) && steps >= 4 && steps <= 100).toBe(true)
      expect(g.clippings.length).toBeLessThanOrEqual(12)
      expect(LADDER).toContain(g.position)
      expect(play.hand.held).toBeNull()
      chairs.add(String(g.chair))
      if (i % 25 === 0) expect(deserializeGame(round(play))).toEqual(serializeGame(g))
      expect(g.mane).toHaveLength(TUFTS)
    }
    // Random touching gets through whole cycles: more than one customer has sat in the chair.
    expect(chairs.size).toBeGreaterThanOrEqual(3)
  })

  it('never starts more than a few notes at once, however much one stroke cuts', () => {
    const play = seated({ mane: Array(TUFTS).fill(100), seat: 'across' })
    play.gesture({ type: 'press', at: { x: 330, y: 150 } })
    play.gesture({ type: 'dragStart', from: { x: 330, y: 150 } })
    play.gesture({ type: 'dragMove', from: { x: 330, y: 150 }, at: { x: 900, y: 150 } })
    expect(play.takeNotes().length).toBeLessThanOrEqual(4)
    expect(play.takeNotes()).toEqual([])
  })
})
