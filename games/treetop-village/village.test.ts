import { describe, expect, it } from 'vitest'
import { makeRng } from './rng'
import { deserialize, freshSaved, serialize, type Saved } from './save'
import { FOLK, HOME, LANDINGS, OUTLINE, PLACES, PLACE_COUNT, SUN, TRUNK_X, basketSlot, mid, onTrunk, standAt, toPlace, type Folk, type Pt } from './tree'
import { RUN_SECONDS } from './scripts'
import { FLUTTER_SECONDS, cancel, feet, glowOn, hint, inBucket, makeVillage, move, occupied, pieceAt, press, release, savedOf, stayAt, step, type Village } from './village'
import { KINDS, meet, type Kind } from './ways'
import { CUP, lanternsOf, seatOf } from './shape'
import { JUMP_SECONDS, bucketAt, cupAt, errandOnTap } from './village'
import { flourish } from './scripts'

const bare = (): Saved => freshSaved(8)
const withPieces = (pieces: Record<number, Kind>, newest: number | null = null): Saved => {
  const saved = bare()
  for (const [place, kind] of Object.entries(pieces)) saved.places[Number(place)] = kind
  saved.newest = newest
  return saved
}
const run = (v: Village, seconds: number): void => { for (let i = 0; i < Math.round(seconds * 60); i++) step(v, 1 / 60) }
const walker = (v: Village, folk: Folk) => v.walkers.find((one) => one.folk === folk)!
const ids = (v: Village): string[] => v.cues.map((cue) => cue.id)
/** Where a finger holds a piece so that it hangs over the middle of a place. */
const over = (place: number): Pt => { const at = mid(PLACES[place]); return { x: at.x, y: at.y + 34 } }
/** Carries a kind from the basket and lets it go over a place. */
const carry = (v: Village, kind: Kind, place: number): void => {
  press(v, basketSlot(KINDS.indexOf(kind)))
  move(v, over(place))
  release(v, over(place))
}
const body = (v: Village, folk: Folk): Pt => { const here = feet(v, walker(v, folk)); return { x: here.x, y: here.y - 40 } }
const tap = (v: Village, at: Pt): void => { press(v, at); release(v, at) }
const SKY: Pt = { x: 40, y: 330 }

describe('carrying a piece', () => {
  it('answers a finger on the basket in the frame it lands: the piece is in the hand and is heard', () => {
    const v = makeVillage(bare())
    press(v, basketSlot(1))
    expect(v.held).toMatchObject({ kind: 'ladder', from: -1 })
    expect(ids(v)).toEqual(['lift:ladder'])
  })

  it('snaps a piece let go near a free place onto it, and sends the nearest walker to try it', () => {
    const v = makeVillage(bare())
    carry(v, 'ladder', 4)
    expect(v.places[4]).toBe('ladder')
    expect(v.newest).toBe(4)
    expect(v.held).toBeNull()
    expect(ids(v)).toContain('snap:ladder')
    expect(v.dirty).toBe(2)
    // Place 4 rises from the squirrel's own limb: he sets off at once.
    expect(walker(v, 'squirrel').walk).not.toBeNull()
    run(v, 6)
    expect(walker(v, 'squirrel')).toMatchObject({ at: 7, errand: 'none', walk: null })
    expect(walker(v, 'squirrel').x).toBeCloseTo(standAt('squirrel', 7).x)
    expect(ids(v)).toContain('meet:squirrel:ladder:rise:across')
  })

  it('flutters a piece let go away from every place back to the basket, and changes nothing', () => {
    const v = makeVillage(bare())
    for (const place of PLACES) expect(toPlace(SKY, place)).toBeGreaterThan(130)
    press(v, basketSlot(0))
    move(v, SKY)
    release(v, SKY)
    expect(v.places.every((kind) => kind === null)).toBe(true)
    expect(v.flutters).toHaveLength(1)
    expect(ids(v)).toEqual(['lift:plank', 'flutter'])
    run(v, FLUTTER_SECONDS + 0.1)
    expect(v.flutters).toHaveLength(0)
    expect(ids(v)).toContain('pat')
  })

  it('takes a piece that was only tapped in the basket nowhere, however near a place the basket lies', () => {
    const v = makeVillage(bare())
    press(v, basketSlot(0))
    release(v, basketSlot(0))
    expect(v.places.every((kind) => kind === null)).toBe(true)
    expect(v.flutters).toHaveLength(1)
  })

  it('snaps onto a taken place only if the piece came from it', () => {
    const v = makeVillage(withPieces({ 8: 'plank' }))
    carry(v, 'ladder', 8)
    // Place 8 is taken, so the ladder went to the nearest free place or home, and the plank is where it was.
    expect(v.places[8]).toBe('plank')
  })

  it('lifts a piece off the tree on a drag and puts it down in another place', () => {
    const v = makeVillage(withPieces({ 8: 'plank' }))
    press(v, mid(PLACES[8]))
    expect(ids(v)).toEqual(['touch:plank'])
    move(v, over(9))
    expect(ids(v)).toEqual(['touch:plank', 'pop'])
    expect(v.held).toMatchObject({ kind: 'plank', from: 8 })
    release(v, over(9))
    expect(v.places[8]).toBeNull()
    expect(v.places[9]).toBe('plank')
    expect(v.newest).toBe(9)
  })

  it('puts a piece back where it came from when the touch is taken away, with no drop made', () => {
    const v = makeVillage(withPieces({ 8: 'plank' }))
    press(v, mid(PLACES[8]))
    move(v, over(9))
    v.cues.length = 0
    cancel(v)
    expect(v.held).toBeNull()
    expect(v.places[8]).toBe('plank')
    expect(v.places[9]).toBeNull()
    expect(v.cues).toEqual([])
    // A piece from the basket that is taken away is simply gone from the hand.
    press(v, basketSlot(2))
    move(v, over(9))
    cancel(v)
    expect(v.places.filter((kind) => kind !== null)).toEqual(['plank'])
  })

  it('does not let go of a piece that someone is on: it shakes and they hold on', () => {
    const v = makeVillage(bare())
    carry(v, 'ladder', 4)
    while (!walker(v, 'squirrel').on) step(v, 1 / 60)
    expect(occupied(v, 4)).toBe(true)
    v.cues.length = 0
    // A finger on the walker is the walker's, so the finger takes the end of the ladder he is not at.
    const one = walker(v, 'squirrel')
    const far = [PLACES[4].pa, PLACES[4].pb].sort((a, b) => Math.hypot(b.x - one.x, b.y - one.y) - Math.hypot(a.x - one.x, a.y - one.y))[0]
    press(v, far)
    move(v, SKY)
    expect(v.held).toBeNull()
    expect(v.places[4]).toBe('ladder')
    expect(ids(v)).toContain('held')
    expect(walker(v, 'squirrel').show?.what).toBe('grip')
    expect(ids(v)).toContain('grip:squirrel')
  })

  it('carries one walker at a time on a piece: the second waits on its own spot and comes when the piece is free', () => {
    // The squirrel is on the meadow, two ladders from his door; the beetle is at his door on the meadow, and the newest piece is the first ladder.
    const saved = withPieces({ 0: 'ladder', 2: 'ladder' }, 0)
    saved.folk.squirrel = { at: 0, errand: 'none' }
    const v = makeVillage(saved)
    tap(v, body(v, 'beetle'))
    while (!walker(v, 'beetle').on) step(v, 1 / 60)
    tap(v, body(v, 'squirrel'))
    let most = 0, waited = false
    for (let i = 0; i < 60 * 40; i++) {
      step(v, 1 / 60)
      most = Math.max(most, v.walkers.filter((one) => one.on?.place === 0).length)
      waited = waited || v.walkers.some((one) => one.queued === 0)
    }
    expect(most).toBe(1)
    expect(waited).toBe(true)
    expect(walker(v, 'squirrel')).toMatchObject({ at: 3, errand: 'none', queued: -1 })
    expect(walker(v, 'beetle')).toMatchObject({ at: 1, errand: 'none', queued: -1 })
  })
})

describe('every touch is answered', () => {
  it('answers a walker, a bare pair of pegs, the sun, the oak and the bare page, each as itself', () => {
    const v = makeVillage(bare())
    const answers: [Pt, string, string[]][] = [
      [body(v, 'owl'), 'flourish:owl', []],
      [mid(PLACES[10]), 'knock', []],
      [SUN, 'sun', []],
      // The oak quivers under the finger, and springs back with a rustle and an acorn when it lifts.
      [{ x: 590, y: 500 }, 'grab', ['rustle']],
      [SKY, 'page', []],
    ]
    for (const [at, landing, lifting] of answers) {
      v.cues.length = 0
      press(v, at)
      // The answer is there when the finger lands, with its sound.
      expect(ids(v), landing).toEqual([landing])
      release(v, at)
      expect(ids(v), landing).toEqual([landing, ...lifting])
    }
    expect(v.bits.some((bit) => bit.kind === 'acorn')).toBe(true)
    run(v, 3)
    expect(v.bits).toHaveLength(0)
    expect(ids(v)).toContain('acorn')
  })

  it('answers a tap on each kind of piece in the tree with that piece\'s own sound', () => {
    for (const kind of KINDS) {
      const v = makeVillage(withPieces({ 9: kind }))
      press(v, mid(PLACES[9]))
      // When the finger lands the piece jogs with a knock of its own wood; when it lifts as a tap the piece answers as itself.
      expect(ids(v)).toEqual([`touch:${kind}`])
      expect(v.wiggle[9]).toBeGreaterThan(0)
      release(v, mid(PLACES[9]))
      expect(ids(v)).toEqual([`touch:${kind}`, kind === 'bucket' ? 'send' : `tap:${kind}`])
      expect(v.tap[9]).toBe(0)
      if (kind === 'slide') expect(v.bits.some((bit) => bit.chute === 9)).toBe(true)
      if (kind === 'bucket') expect(v.lifts[9]).toBe(1)
    }
  })

  it('stops a tapped piece answering the moment it is lifted off its pegs', () => {
    const v = makeVillage(withPieces({ 9: 'slide' }))
    tap(v, mid(PLACES[9]))
    run(v, 0.1)
    press(v, mid(PLACES[9]))
    move(v, SKY)
    expect(v.held).toMatchObject({ kind: 'slide', from: 9 })
    expect(v.tap[9]).toBeGreaterThan(10)
    expect(v.bits.some((bit) => bit.chute === 9)).toBe(false)
  })

  it('leans the nearest walker out towards a piece no way leads to, and gives nobody an errand', () => {
    const v = makeVillage(bare())
    carry(v, 'plank', 11)
    expect(v.places[11]).toBe('plank')
    expect(v.walkers.every((one) => one.errand === 'none' && one.walk === null)).toBe(true)
    const asking = v.walkers.filter((one) => one.show?.what === 'ask')
    expect(asking).toHaveLength(1)
    expect(ids(v)).toContain(`ask:${asking[0].folk}`)
  })
})

describe('walkers and their errands', () => {
  it('sends a tapped walker from its door to the newest piece, and from anywhere else home', () => {
    const v = makeVillage(withPieces({ 0: 'ladder' }, 0))
    press(v, body(v, 'beetle'))
    expect(walker(v, 'beetle').show?.what).toBe('flourish')
    run(v, 12)
    expect(walker(v, 'beetle')).toMatchObject({ at: 1, errand: 'none', walk: null })
    press(v, body(v, 'beetle'))
    run(v, 12)
    expect(walker(v, 'beetle')).toMatchObject({ at: HOME.beetle.landing, errand: 'none', walk: null })
  })

  it('strands the beetle on the landing in front of a piece he cannot use, keeps his errand, and sends him on when a ladder is put there', () => {
    const v = makeVillage(withPieces({ 0: 'ladder', 2: 'plank', 4: 'ladder' }, 4))
    press(v, body(v, 'beetle'))
    run(v, 20)
    expect(walker(v, 'beetle')).toMatchObject({ at: 1, errand: 4, blocked: 2, walk: null })
    expect(ids(v)).toContain('meet:beetle:plank:rise:stay')
    // Left alone he tries nothing again, however long.
    v.cues.length = 0
    run(v, 30)
    expect(v.cues).toEqual([])
    // The plank comes off and a ladder goes on.
    press(v, mid(PLACES[2]))
    move(v, SKY)
    release(v, SKY)
    carry(v, 'ladder', 2)
    run(v, 30)
    expect(walker(v, 'beetle')).toMatchObject({ at: 7, errand: 'none', walk: null })
  })

  it('makes the owl wait for a bucket and carries her only when the child sends it', () => {
    // A bucket on the rise under the owl's own limb. It rests at its lower end; she is at the upper one.
    const v = makeVillage(withPieces({ 5: 'bucket' }, 5))
    press(v, body(v, 'owl'))
    run(v, 12)
    const owl = walker(v, 'owl')
    expect(owl).toMatchObject({ at: 8, errand: 5, waiting: 5 })
    expect(inBucket(v, owl)).toBe(false)
    expect(ids(v)).toContain('wait:owl')
    // While she waits for it the idle glow lies on the bucket and the ghost hand taps it.
    expect(glowOn(v)).toEqual({ bucket: 5 })
    expect('tap' in hint(v, 0)).toBe(true)
    run(v, 30)
    expect(owl.at).toBe(8)
    // A tap on the bucket sends it up to her, and she gets in.
    tap(v, mid(PLACES[5]))
    expect(v.lifts[5]).toBe(1)
    run(v, RUN_SECONDS + 10)
    expect(ids(v)).toContain('board:owl')
    expect(inBucket(v, owl)).toBe(true)
    expect(occupied(v, 5)).toBe(true)
    expect(glowOn(v)).toEqual({ bucket: 5 })
    // A tap on her in her bucket gets her flourish and carries her down.
    v.cues.length = 0
    tap(v, body(v, 'owl'))
    expect(ids(v)).toEqual(['flourish:owl', 'send'])
    expect(owl).toMatchObject({ at: 4, errand: 'none', riding: 5 })
    run(v, RUN_SECONDS + 6)
    expect(owl).toMatchObject({ at: 4, riding: -1, waiting: -1, walk: null })
    expect(owl.x).toBeCloseTo(standAt('owl', 4).x)
  })

  it('throws the squirrel back from a swing on a span, and leaves him on the side he came from', () => {
    const v = makeVillage(bare())
    carry(v, 'swing', 8)
    run(v, 8)
    expect(walker(v, 'squirrel')).toMatchObject({ at: 3, errand: 8, blocked: 8, walk: null })
    expect(ids(v)).toContain('meet:squirrel:swing:span:stay')
  })

  it('keeps every walker on a landing through a long stretch of anything a hand might do', () => {
    const v = makeVillage(freshSaved(null))
    const rng = makeRng(7)
    const anywhere = (): Pt => ({ x: rng.next() * 1180, y: rng.next() * 820 })
    for (let i = 0; i < 1500; i++) {
      const what = rng.next()
      if (what < 0.35) { press(v, basketSlot(Math.floor(rng.next() * 7))); move(v, over(Math.floor(rng.next() * PLACE_COUNT))); release(v, over(Math.floor(rng.next() * PLACE_COUNT))) }
      else if (what < 0.6) { const at = mid(PLACES[Math.floor(rng.next() * PLACE_COUNT)]); press(v, at); if (rng.next() < 0.5) move(v, anywhere()); release(v, anywhere()) }
      else if (what < 0.8) { const at = body(v, FOLK[Math.floor(rng.next() * 4)]); press(v, at); release(v, at) }
      else if (what < 0.86) { press(v, anywhere()); move(v, anywhere()); cancel(v) }
      // The sun or the moon drawn along its tab, and the trunk pulled from side to side.
      else if (what < 0.9) { press(v, { x: SUN.x, y: v.tabY }); move(v, { x: SUN.x, y: rng.next() * 500 }); release(v, { x: SUN.x, y: rng.next() * 500 }) }
      else if (what < 0.93) { press(v, { x: 590, y: 480 }); for (const dx of [80, -80, 80]) move(v, { x: 590 + dx, y: 480 }); release(v, { x: 590, y: 480 }) }
      else { const at = anywhere(); press(v, at); release(v, at) }
      run(v, rng.next() * 1.5)
      v.cues.length = 0
    }
    run(v, 60)
    for (const one of v.walkers) {
      expect(one.walk, one.folk).toBeNull()
      expect(one.on, one.folk).toBeNull()
      expect(one.show, one.folk).toBeNull()
      expect(one.flat).toBe(0)
      expect(one.riding).toBe(-1)
      expect(one.at).toBeGreaterThanOrEqual(0)
      expect(one.at).toBeLessThan(LANDINGS.length)
      expect(one.y).toBe(LANDINGS[one.at].y)
      expect(Number.isFinite(one.x)).toBe(true)
      // At rest a walker stands on its own spot or at the foot of the piece it has to stay at, sits in the bucket it waits for, or is in at its door.
      if (!one.seated && !one.indoors) expect(one.x).toBeCloseTo(one.blocked >= 0 ? stayAt(one.folk, one.at, one.blocked).x : standAt(one.folk, one.at).x)
    }
    expect(v.held).toBeNull()
    expect(v.scene).toBeNull()
    expect(v.rides.every((ride) => ride === null)).toBe(true)
  }, 120_000)
})

describe('found as left', () => {
  const reopened = (v: Village, base: Saved): Village => makeVillage(deserialize(JSON.parse(JSON.stringify(serialize(savedOf(v, base))))))

  it('is the same left open as loaded, after anything a hand might do: the save made at any moment is where everything comes to rest', () => {
    const standing = (v: Village) => v.walkers.map((one) => {
      // Where two wait at one end of a bucket the save does not say which of them sits: a load seats the first in the order of the folk.
      const shared = one.waiting >= 0 && v.walkers.some((other) => other !== one && other.waiting === one.waiting && other.at === one.at)
      return {
        folk: one.folk, at: one.at, errand: one.errand, next: one.next, back: one.back, blocked: one.blocked, waiting: one.waiting, queued: one.queued, riding: one.riding,
        seated: shared ? null : one.seated, x: shared ? 0 : Math.round(one.x), y: shared ? 0 : Math.round(one.y),
        // A walker that is in at its door is not seen, so which way it is turned there is nothing.
        face: one.indoors || shared ? 0 : one.face, indoors: one.indoors, walk: one.walk, on: one.on, show: one.show,
      }
    })
    // Four hundred hands, and six more that once found something: a bucket sent while somebody got in, two who wait at one bucket, a walker behind one who sits.
    const seeds = [...Array.from({ length: 400 }, (_unused, index) => index + 1), 572, 1261, 1824, 2223, 3545, 3865]
    for (const seed of seeds) {
      const base = freshSaved(seed % 2 === 0 ? null : 8)
      const v = makeVillage(base)
      const rng = makeRng(seed)
      const anywhere = (): Pt => ({ x: rng.next() * 1180, y: rng.next() * 820 })
      const moves = 4 + Math.floor(rng.next() * 30)
      for (let i = 0; i < moves; i++) {
        const what = rng.next()
        if (what < 0.4) { press(v, basketSlot(Math.floor(rng.next() * 7))); move(v, over(Math.floor(rng.next() * PLACE_COUNT))); release(v, over(Math.floor(rng.next() * PLACE_COUNT))) }
        else if (what < 0.6) { const at = mid(PLACES[Math.floor(rng.next() * PLACE_COUNT)]); press(v, at); if (rng.next() < 0.5) move(v, anywhere()); release(v, anywhere()) }
        else if (what < 0.8) { const at = body(v, FOLK[Math.floor(rng.next() * 4)]); press(v, at); release(v, at) }
        else if (what < 0.86) { press(v, mid(PLACES[Math.floor(rng.next() * PLACE_COUNT)])); move(v, anywhere()); cancel(v) }
        else if (what < 0.92) { press(v, { x: SUN.x, y: v.tabY }); move(v, { x: SUN.x, y: rng.next() * 500 }); release(v, { x: SUN.x, y: rng.next() * 500 }) }
        else if (what < 0.94) { press(v, { x: 590, y: 480 }); for (const dx of [80, -80, 80]) move(v, { x: 590 + dx, y: 480 }); release(v, { x: 590, y: 480 }) }
        else { const at = anywhere(); press(v, at); release(v, at) }
        run(v, rng.next() * 1.5)
      }
      // Put away here, in the middle of whatever is going on.
      const saved = savedOf(v, base)
      run(v, 90)
      expect(savedOf(v, base), `seed ${seed}`).toEqual(saved)
      for (const one of v.walkers) expect(one, `seed ${seed}`).toMatchObject({ next: 'none', back: 'none', walk: null, on: null, show: null })
      const loaded = makeVillage(deserialize(JSON.parse(JSON.stringify(serialize(saved)))))
      // Nobody walks, tries or shows anything on a load.
      for (let frame = 0; frame < 600; frame++) { step(loaded, 1 / 60); if (loaded.walkers.some((one) => one.walk || one.on || one.show)) throw new Error(`seed ${seed}: a walker set off on load`) }
      run(loaded, 80)
      expect(standing(v), `seed ${seed}`).toEqual(standing(loaded))
      expect(loaded.places).toEqual(v.places)
      expect(loaded.lifts).toEqual(v.lifts)
    }
  }, 120_000)

  it('leaves a walker on the landing when the bucket is sent off while it is getting in', () => {
    const v = makeVillage(withPieces({ 1: 'bucket' }, 1))
    const comer = walker(v, 'beetle')
    tap(v, body(v, 'beetle'))
    for (let frame = 0; frame < 1200 && comer.on?.what !== 'board'; frame++) step(v, 1 / 60)
    expect(comer.on?.what).toBe('board')
    // The child taps the cup at its resting end before the walker is in.
    tap(v, cupAt(v, 1))
    run(v, 20)
    expect(v.lifts[1]).toBe(1)
    expect(comer).toMatchObject({ at: 0, seated: false, waiting: 1, walk: null, on: null })
    expect(comer.x).toBeCloseTo(standAt(comer.folk, 0).x)
  })

  it('saves a walker on its way where its walk will end, and walks nothing again on load', () => {
    const base = bare()
    const v = makeVillage(base)
    carry(v, 'ladder', 4)
    // The squirrel has hardly set off; the save already has him on the high limb with no errand.
    const saved = savedOf(v, base)
    expect(saved.folk.squirrel).toEqual({ at: 7, errand: 'none' })
    expect(saved.places[4]).toBe('ladder')
    expect(saved.newest).toBe(4)
    const again = reopened(v, base)
    expect(walker(again, 'squirrel')).toMatchObject({ at: 7, walk: null, on: null, show: null })
    expect(walker(again, 'squirrel').x).toBeCloseTo(standAt('squirrel', 7).x)
    run(again, 10)
    expect(again.cues).toEqual([])
    // Nothing unfolds again either.
    expect(again.born[4]).toBeGreaterThan(10)
  })

  it('saves a tapped walker where its errand will take it, from the moment it is tapped', () => {
    const base = withPieces({ 0: 'ladder', 2: 'plank', 4: 'ladder' }, 4)
    const v = makeVillage(base)
    press(v, body(v, 'beetle'))
    expect(v.dirty).toBe(2)
    expect(savedOf(v, base).folk.beetle).toEqual({ at: 1, errand: 4 })
    const again = reopened(v, base)
    expect(walker(again, 'beetle')).toMatchObject({ at: 1, errand: 4, blocked: 2, walk: null })
    run(again, 10)
    expect(again.cues).toEqual([])
  })

  it('saves a piece in the hand where it came from, and a piece from the basket not at all', () => {
    const base = withPieces({ 8: 'plank' })
    const v = makeVillage(base)
    press(v, mid(PLACES[8]))
    move(v, SKY)
    expect(savedOf(v, base).places[8]).toBe('plank')
    cancel(v)
    press(v, basketSlot(3))
    move(v, over(2))
    expect(savedOf(v, base).places.filter((kind) => kind !== null)).toEqual(['plank'])
  })

  it('finds a walker that was waiting for a bucket still waiting, and one in a bucket still in it', () => {
    const base = withPieces({ 5: 'bucket' }, 5)
    const v = makeVillage(base)
    press(v, body(v, 'owl'))
    run(v, 12)
    tap(v, mid(PLACES[5]))
    run(v, RUN_SECONDS + 10)
    const again = reopened(v, base)
    const owl = walker(again, 'owl')
    expect(owl).toMatchObject({ at: 8, errand: 5, waiting: 5 })
    expect(again.lifts[5]).toBe(1)
    expect(inBucket(again, owl)).toBe(true)
  })

  it('saves a bucket ride when it starts: put away in the middle, the rider is found at the far end', () => {
    const base = withPieces({ 5: 'bucket' }, 5)
    const v = makeVillage(base)
    press(v, body(v, 'owl'))
    run(v, 12)
    tap(v, mid(PLACES[5]))
    run(v, RUN_SECONDS + 10)
    tap(v, mid(PLACES[5]))
    run(v, 0.5)
    const saved = savedOf(v, base)
    expect(saved.folk.owl).toEqual({ at: 4, errand: 'none' })
    expect(saved.lifts[5]).toBe(0)
  })
})

describe('the ghost hand', () => {
  it('shows a piece carried from the basket to a free place, another each time, and a tap on a walker when the tree is full', () => {
    const v = makeVillage(withPieces({ 0: 'ladder' }))
    const shown = [0, 1, 2, 4].map((index) => hint(v, index))
    for (const one of shown) {
      expect('from' in one && one.carries !== null).toBe(true)
      if (!('from' in one)) continue
      const place = PLACES.findIndex((p) => Math.abs(mid(p).x - one.to.x) < 1 && Math.abs(mid(p).y + 34 - one.to.y) < 1)
      expect(v.places[place]).toBeNull()
    }
    expect(new Set(shown.map((one) => JSON.stringify(one))).size).toBe(4)
    const full = makeVillage(withPieces(Object.fromEntries(PLACES.map((_, index) => [index, 'plank' as Kind]))))
    expect('tap' in hint(full, 0)).toBe(true)
  })

  it('shows the tab now and then: the sun drawn down by day, and by night the moon lifted every other time, far enough to bring the morning', () => {
    const day = makeVillage(withPieces({ 0: 'ladder' }))
    const down = hint(day, 3)
    if (!('from' in down)) throw new Error('the fourth showing by day is the tab')
    expect(down.carries).toBeNull()
    press(day, down.from)
    move(day, down.to)
    release(day, down.to)
    expect(day.night).toBe(true)
    const saved = withPieces({ 0: 'ladder' })
    saved.night = true
    const night = makeVillage(saved)
    expect([0, 1, 2, 3].map((index) => { const one = hint(night, index); return 'from' in one && one.carries === null })).toEqual([false, true, false, true])
    const up = hint(night, 1)
    if (!('from' in up)) throw new Error('every other showing by night is the tab')
    press(night, up.from)
    move(night, up.to)
    release(night, up.to)
    expect(night.night).toBe(false)
  })

  it('shows a move that works when a finger makes it', () => {
    const v = makeVillage(bare())
    const shown = hint(v, 0)
    if (!('from' in shown)) throw new Error('a bare tree has free places')
    press(v, shown.from)
    move(v, shown.to)
    release(v, shown.to)
    expect(v.places.filter((kind) => kind !== null)).toHaveLength(1)
  })
})

describe('a piece is touched where it is drawn', () => {
  /** Points on what is drawn of a piece in a place, away from the straight line between its pegs where the piece hangs away from it. */
  const drawnAt = (v: Village, kind: Kind, place: number): Pt[] => {
    const { pa, pb, fit } = PLACES[place]
    const span = fit === 'span', middle = mid(PLACES[place])
    switch (kind) {
      case 'plank': case 'ladder': return [middle]
      // The slats at the bottom of the sag and the handrail above them; hung as a net, the middle of its bulge.
      case 'bridge': return span ? [{ x: middle.x, y: middle.y + 24 }, { x: middle.x, y: middle.y + 6 }] : [{ x: middle.x + 16, y: middle.y }]
      // The cup wherever it rests, a post, and the line the cup runs on.
      case 'bucket': { const cup = bucketAt(v, place); return [{ x: cup.x, y: cup.y + (CUP.rim + CUP.bottom) / 2 }, { x: pb.x, y: pb.y - 30 }, { x: middle.x, y: middle.y - 58 + (span ? 10 : 0) }] }
      // The seat, and half way up its ropes.
      case 'swing': { const { pin, seat } = seatOf(place); return [seat, { x: seat.x + 20, y: seat.y }, { x: (pin.x + seat.x) / 2, y: (pin.y + seat.y) / 2 }] }
      // Every glass on the string.
      case 'lanterns': {
        const cx = middle.x + (span ? 0 : -44), cy = middle.y + (span ? 60 : 0) - 8
        return lanternsOf(place).map((t) => { const u = 1 - t; return { x: u * u * pa.x + 2 * u * t * cx + t * t * pb.x, y: u * u * (pa.y - 8) + 2 * u * t * cy + t * t * (pb.y - 8) + 20 } })
      }
      case 'slide': return [middle, pa, pb]
    }
  }

  it('finds every kind of piece, on every rise and every span, at each thing that is drawn of it', () => {
    const missed: string[] = []
    for (const kind of KINDS) {
      for (let place = 0; place < PLACE_COUNT; place++) {
        for (const lift of (kind === 'bucket' ? [0, 1] : [0]) as (0 | 1)[]) {
          const saved = withPieces({ [place]: kind })
          saved.lifts[place] = lift
          const v = makeVillage(saved)
          drawnAt(v, kind, place).forEach((at, index) => { if (pieceAt(v, at) !== place) missed.push(`${kind} on ${PLACES[place].fit} ${place}, point ${index}`) })
        }
      }
    }
    expect(missed).toEqual([])
  })

  it('gives a finger on the seat of a swing across the trunk to the swing, not to the oak behind it, and a tap there swings it', () => {
    for (const place of [7, 8, 9]) {
      const v = makeVillage(withPieces({ [place]: 'swing' }))
      const { seat } = seatOf(place)
      tap(v, seat)
      expect(ids(v), `place ${place}`).toEqual(['touch:swing', 'tap:swing'])
      expect(v.grab).toBeNull()
    }
  })

  it('lifts a string of lanterns off by its middle glass', () => {
    const v = makeVillage(withPieces({ 8: 'lanterns' }))
    const glass = drawnAt(v, 'lanterns', 8)[1]
    press(v, glass)
    move(v, SKY)
    expect(v.held).toMatchObject({ kind: 'lanterns', from: 8 })
  })

  it('leaves the page beside a piece to the page', () => {
    const v = makeVillage(withPieces({ 8: 'plank', 4: 'ladder' }))
    expect(pieceAt(v, { x: mid(PLACES[8]).x, y: mid(PLACES[8]).y + 60 })).toBe(-1)
    expect(pieceAt(v, { x: mid(PLACES[4]).x + 70, y: mid(PLACES[4]).y })).toBe(-1)
  })
})

describe('a walker that has to stay', () => {
  it('stands at the foot of the piece, turned towards where it was going: the owl at the rope bridge', () => {
    // A rope bridge from the owl's limb across to the high left limb. She will not set a foot on rope.
    const v = makeVillage(withPieces({ 9: 'bridge' }, 9))
    press(v, body(v, 'owl'))
    run(v, 20)
    const owl = walker(v, 'owl'), foot = PLACES[9].pb
    expect(owl).toMatchObject({ at: 8, errand: 9, blocked: 9, walk: null, on: null })
    // On her own landing, within a step of the bridge's foot, and turned to the bridge: it lies to her left.
    expect(owl.x).toBeGreaterThanOrEqual(foot.x)
    expect(owl.x - foot.x).toBeLessThan(30)
    expect(owl.x).toBeCloseTo(stayAt('owl', 8, 9).x)
    expect(owl.face).toBe(-1)
    // Found as left: opened again she stands there, turned the same way.
    const again = walker(makeVillage(deserialize(JSON.parse(JSON.stringify(serialize(savedOf(v, bare())))))), 'owl')
    expect(again).toMatchObject({ at: 8, blocked: 9, x: owl.x, face: -1 })
  })

  it('is turned towards where it was going on every landing, for every piece it can be stopped at', () => {
    for (const folk of FOLK) {
      for (let place = 0; place < PLACE_COUNT; place++) {
        const p = PLACES[place]
        for (const landing of [p.from, p.to]) {
          const near = landing === p.from ? p.pa : p.pb, far = landing === p.from ? p.pb : p.pa
          const stay = stayAt(folk, landing, place)
          const pad = LANDINGS[landing]
          expect(stay.x).toBeGreaterThanOrEqual(pad.x0)
          expect(stay.x).toBeLessThanOrEqual(pad.x1)
          // Its face is turned to the piece: to its far end across a span, and to its foot beside a rise.
          const toward = p.fit === 'span' ? far.x - stay.x : stay.x === near.x ? far.x - near.x : near.x - stay.x
          if (toward !== 0) expect(Math.sign(toward), `${folk} at ${place} on ${landing}`).toBe(stay.face)
          // The middle of a rise stays clear of its card, so the piece can be touched.
          if (p.fit === 'rise') expect(Math.abs(mid(p).x - stay.x)).toBeGreaterThan(30)
        }
      }
    }
  })

  it('turns a walker that cannot get home by night towards its own door', () => {
    // The squirrel is carried to the far left limb's side of the tree and the way is taken away: night falls with no way home.
    const saved = bare()
    saved.folk.squirrel = { at: 5, errand: 'home' }
    saved.night = true
    const squirrel = walker(makeVillage(saved), 'squirrel')
    expect(squirrel.at).toBe(5)
    expect(squirrel.indoors).toBe(false)
    expect(squirrel.face).toBe(HOME.squirrel.door.x > squirrel.x ? 1 : -1)
  })
})

describe('a walker tapped again in the middle of its flourish', () => {
  it('is answered at once, with a small jump and its own voice, every time', () => {
    for (const folk of FOLK) {
      const v = makeVillage(bare())
      press(v, body(v, folk))
      release(v, body(v, folk))
      run(v, 0.1)
      v.cues.length = 0
      press(v, body(v, folk))
      expect(ids(v), folk).toEqual([`again:${folk}`])
      expect(walker(v, folk).jump).toBe(JUMP_SECONDS)
      run(v, JUMP_SECONDS + 0.05)
      expect(walker(v, folk).jump).toBe(0)
    }
  })
})

describe('a tapped walker at its own door sets off', () => {
  /** Taps a walker and plays on until its flourish is over and it has gone where it was sent. */
  const sent = (v: Village, folk: Folk): void => { tap(v, body(v, folk)); run(v, flourish(folk).seconds + 0.1) }

  it('on a first visit at every age up to five, and with no age: the first tap sends each walker that has a piece within reach to that piece', () => {
    for (const age of [null, 2, 3, 4, 5]) {
      const saved = freshSaved(age)
      expect(saved.newest, `age ${age}`).toBeNull()
      // The ladder from the meadow is the beetle's, the plank across the low limbs the twins', the lanterns the squirrel's.
      for (const [folk, place, ends] of [['beetle', 0, 1], ['mice', 7, 1], ['squirrel', 10, 5]] as const) {
        const v = makeVillage(saved)
        const one = walker(v, folk)
        expect(errandOnTap(v, one), `${folk} at ${age}`).toBe(place)
        sent(v, folk)
        // It has set off: it walks to the piece, or is on it already.
        expect(one.walk !== null || one.on !== null, `${folk} at ${age} sets off`).toBe(true)
        // Put away at that moment, it is found where the walk ends.
        expect(savedOf(v, saved).folk[folk], `${folk} at ${age}`).toEqual({ at: ends, errand: 'none' })
        run(v, 20)
        expect(one, `${folk} at ${age}`).toMatchObject({ at: ends, errand: 'none', walk: null, on: null })
        // Tapped there, it goes home again.
        sent(v, folk)
        run(v, 20)
        expect(one.at, `${folk} at ${age} comes home`).toBe(HOME[folk].landing)
      }
      // No piece touches the owl's limb, or leads to one: she has nothing within reach, and only turns her head.
      const v = makeVillage(saved)
      expect(errandOnTap(v, walker(v, 'owl'))).toBe('none')
      sent(v, 'owl')
      expect(walker(v, 'owl')).toMatchObject({ at: 8, errand: 'none', walk: null })
    }
  })

  it('on a bare tree, at six and older, a tap gets the flourish and nobody has anywhere to go', () => {
    for (const age of [6, 8, 12]) {
      const v = makeVillage(freshSaved(age))
      for (const folk of FOLK) { sent(v, folk); expect(walker(v, folk), `${folk} at ${age}`).toMatchObject({ errand: 'none', walk: null }) }
    }
  })

  it('goes to the newest piece while it hangs, and to the nearest it can get to once the newest is taken off', () => {
    const v = makeVillage(withPieces({ 0: 'ladder', 1: 'slide' }, 1))
    expect(errandOnTap(v, walker(v, 'beetle'))).toBe(1)
    press(v, mid(PLACES[1]))
    move(v, SKY)
    release(v, SKY)
    run(v, 2)
    expect(v.newest).toBeNull()
    expect(errandOnTap(v, walker(v, 'beetle'))).toBe(0)
    sent(v, 'beetle')
    run(v, 20)
    expect(walker(v, 'beetle')).toMatchObject({ at: 1, errand: 'none' })
  })

  it('goes to the nearest piece it can get to when no way leads to the newest', () => {
    // The newest is a plank across the two high limbs, and nothing leads up to them.
    const v = makeVillage(withPieces({ 0: 'ladder', 9: 'plank' }, 9))
    expect(errandOnTap(v, walker(v, 'beetle'))).toBe(0)
    // The owl stands on one of those limbs: the newest is hers to try.
    expect(errandOnTap(v, walker(v, 'owl'))).toBe(9)
  })

  it('chooses by its own taste: only past pieces it crosses, the fewest first, and of two as near the one that does not stop it', () => {
    // From the meadow the beetle has a plank up on the left, which stops him, and a ladder up on the right.
    const two = makeVillage(withPieces({ 0: 'plank', 1: 'ladder' }))
    expect(errandOnTap(two, walker(two, 'beetle'))).toBe(1)
    // With only the plank he tries it, and stays.
    const one = makeVillage(withPieces({ 0: 'plank', 2: 'ladder' }))
    expect(errandOnTap(one, walker(one, 'beetle'))).toBe(0)
    sent(one, 'beetle')
    run(one, 20)
    expect(walker(one, 'beetle')).toMatchObject({ at: 0, blocked: 0 })
    // The squirrel gets up that plank, so for him the ladder beyond it is within reach; the nearer plank still comes first.
    const far = makeVillage(withPieces({ 2: 'ladder' }))
    expect(errandOnTap(far, walker(far, 'squirrel'))).toBe(2)
  })

  it('always has somewhere to go from its door when a piece hangs on its own landing', () => {
    for (const folk of FOLK) for (const kind of KINDS) {
      const place = PLACES.findIndex((p) => p.from === HOME[folk].landing || p.to === HOME[folk].landing)
      const v = makeVillage(withPieces({ [place]: kind }))
      expect(errandOnTap(v, walker(v, folk)), `${folk} with a ${kind}`).toBe(place)
      sent(v, folk)
      expect(walker(v, folk).walk !== null || walker(v, folk).on !== null, `${folk} with a ${kind}`).toBe(true)
    }
  })
})

describe('bare pegs and the oak', () => {
  it('gives the trunk to the oak: between two bare pegs across it a finger rustles the leaves, and the shake can start there', () => {
    for (const place of [7, 8, 9]) {
      const at = mid(PLACES[place])
      expect(onTrunk(at)).toBe(true)
      const v = makeVillage(bare())
      press(v, at)
      expect(ids(v), `place ${place}`).toEqual(['grab'])
      move(v, { x: at.x + 80, y: at.y })
      move(v, { x: at.x - 80, y: at.y })
      move(v, { x: at.x + 80, y: at.y })
      expect(v.scene?.what, `place ${place}`).toBe('shake')
    }
    // Anywhere on the trunk, from the fork to the roots.
    for (let y = 160; y < 640; y += 12) {
      const v = makeVillage(bare())
      press(v, { x: TRUNK_X, y })
      expect(ids(v), `at ${y}`).toEqual(['grab'])
    }
  })

  it('still knocks every bare pair of pegs at each peg, and along the line between them wherever it is not on the trunk', () => {
    // With nobody standing in front of a peg: a walker there is touched first.
    const empty = (): Village => { const v = makeVillage(bare()); for (const one of v.walkers) one.flat = 1; return v }
    PLACES.forEach((place, index) => {
      for (const peg of [place.pa, place.pb]) {
        const v = empty()
        press(v, peg)
        expect(v.cues, `peg of place ${index}`).toEqual([{ id: 'knock', n: index }])
      }
      for (let i = 1; i < 10; i++) {
        const at = { x: place.pa.x + ((place.pb.x - place.pa.x) * i) / 10, y: place.pa.y + ((place.pb.y - place.pa.y) * i) / 10 }
        const v = empty()
        press(v, at)
        // On the trunk the oak answers, but for a finger on a peg itself.
        if (onTrunk(at) && Math.min(Math.hypot(at.x - place.pa.x, at.y - place.pa.y), Math.hypot(at.x - place.pb.x, at.y - place.pb.y)) >= 26) expect(ids(v), `place ${index} at ${i}`).toEqual(['grab'])
        else expect(v.cues, `place ${index} at ${i}`).toEqual([{ id: 'knock', n: index }])
      }
    })
  })

  it('leaves a piece that hangs across the trunk to the piece', () => {
    const v = makeVillage(withPieces({ 8: 'plank' }))
    press(v, mid(PLACES[8]))
    expect(ids(v)).toEqual(['touch:plank'])
  })
})

describe('a walker is touched where it is drawn', () => {
  // What is drawn of each outside its card, from its feet and facing right, read off the figures: the squirrel's
  // tail and the letter held out in his paw, the owl's ear tuft and wing, the tail of the twin behind and the
  // nose of the twin in front, the beetle's hat, his feeler and the foot of his stick.
  const DRAWN: Record<Folk, Pt[]> = {
    squirrel: [{ x: 52, y: -57 }, { x: 64, y: -60 }, { x: -62, y: -118 }, { x: -80, y: -56 }, { x: -50, y: -30 }, { x: 10, y: -76 }],
    owl: [{ x: -30, y: -104 }, { x: 30, y: -104 }, { x: -42, y: -40 }, { x: 0, y: -60 }],
    mice: [{ x: -54, y: -18 }, { x: 40, y: -36 }, { x: 35, y: -58 }, { x: -20, y: -20 }],
    beetle: [{ x: 5, y: -98 }, { x: 30, y: -86 }, { x: 36, y: -2 }, { x: 0, y: -38 }],
  }
  /** Well clear of everything that is drawn of it. */
  const CLEAR: Record<Folk, Pt[]> = {
    squirrel: [{ x: -112, y: -60 }, { x: 92, y: -57 }, { x: -62, y: -152 }],
    owl: [{ x: -66, y: -60 }, { x: 0, y: -124 }],
    mice: [{ x: -76, y: -20 }, { x: 70, y: -40 }, { x: 0, y: -84 }],
    beetle: [{ x: 66, y: -30 }, { x: 5, y: -124 }],
  }
  const from = (v: Village, folk: Folk, local: Pt): Pt => { const one = walker(v, folk), here = feet(v, one); return { x: here.x + local.x * one.face, y: here.y + local.y } }

  it('answers a finger on anything that is drawn of each of them, whichever way it faces, and leaves the page beside it alone', () => {
    for (const folk of FOLK) for (const face of [1, -1] as const) {
      for (const local of DRAWN[folk]) {
        const v = makeVillage(bare())
        walker(v, folk).face = face
        press(v, from(v, folk, local))
        expect(ids(v), `${folk} facing ${face} at ${local.x}, ${local.y}`).toEqual([`flourish:${folk}`])
      }
      for (const local of CLEAR[folk]) {
        const v = makeVillage(bare())
        walker(v, folk).face = face
        press(v, from(v, folk, local))
        expect(ids(v).some((id) => id.startsWith('flourish:')), `${folk} facing ${face} beside it at ${local.x}, ${local.y}`).toBe(false)
      }
    }
  })

  it('keeps each outline to what is drawn: no part reaches further than the card it belongs to', () => {
    // The widest card of each, from figures.ts: the tail and the letter of the squirrel, the head of the owl, a twin's card a gap behind, the beetle's hat lifted.
    const reach: Record<Folk, { x0: number; x1: number; y0: number }> = {
      squirrel: { x0: -98, x1: 76, y0: -146 }, owl: { x0: -54, x1: 56, y0: -114 }, mice: { x0: -72, x1: 72, y0: -72 }, beetle: { x0: -52, x1: 64, y0: -122 },
    }
    for (const folk of FOLK) for (const part of OUTLINE[folk]) for (const point of part.line) {
      expect(point.x - part.r, folk).toBeGreaterThanOrEqual(reach[folk].x0)
      expect(point.x + part.r, folk).toBeLessThanOrEqual(reach[folk].x1)
      expect(point.y - part.r, folk).toBeGreaterThanOrEqual(reach[folk].y0)
    }
  })

  it('still gives the middle of a piece beside a walker that has to stay to the piece', () => {
    // The squirrel thrown back from a swing on a span stands at its foot with his tail behind him.
    const v = makeVillage(withPieces({ 8: 'swing' }, 8))
    tap(v, body(v, 'squirrel'))
    run(v, 20)
    expect(walker(v, 'squirrel').blocked).toBe(8)
    v.cues.length = 0
    press(v, mid(PLACES[8]))
    expect(ids(v)).toEqual(['touch:swing'])
  })
})

describe('a way round', () => {
  // For every walker and every piece that stops it, fitted either way and met from either end: the piece hangs
  // on the short way to a plank the walker is going to try, and a longer way round is built of pieces the walker
  // gets over, with a bucket where it has to be carried. One piece of the way round is left out at first.
  type Case = { folk: Folk; kind: Kind; stop: number; from: number; target: number; round: { place: number; kind: Kind }[] }
  const far = (place: number, from: number): number => (PLACES[place].from === from ? PLACES[place].to : PLACES[place].from)
  /** A piece this walker gets along a place in this direction: one it crosses, or a bucket. */
  const crossed = (folk: Folk, place: number, from: number): Kind => {
    const fit = PLACES[place].fit, forward = PLACES[place].from === from
    return (['plank', 'ladder', 'slide'] as const).find((kind) => meet(folk, kind, fit, forward) === 'across') ?? 'bucket'
  }
  const cases = (): Case[] => {
    const all: Case[] = []
    for (const folk of FOLK) for (const kind of KINDS) for (const fit of ['rise', 'span'] as const) for (const forward of [true, false]) {
      if (meet(folk, kind, fit, forward) !== 'stay' || (fit === 'span' && !forward)) continue
      let found: Case | null = null
      for (let stop = 0; stop < PLACE_COUNT && !found; stop++) {
        if (PLACES[stop].fit !== fit) continue
        const from = forward ? PLACES[stop].from : PLACES[stop].to, to = far(stop, from)
        for (let target = 0; target < PLACE_COUNT && !found; target++) {
          if (target === stop || (PLACES[target].from !== to && PLACES[target].to !== to) || far(target, to) === from) continue
          // The shortest way round, landing by landing, that uses neither the stopping piece nor the plank beyond it.
          const came = new Map<number, { back: number; place: number } | null>([[from, null]])
          const queue = [from]
          while (queue.length > 0 && !came.has(to)) {
            const here = queue.shift()!
            PLACES.forEach((place, index) => {
              if (index === stop || index === target || (place.from !== here && place.to !== here)) return
              const next = far(index, here)
              if (!came.has(next)) { came.set(next, { back: here, place: index }); queue.push(next) }
            })
          }
          if (!came.has(to)) continue
          const round: { place: number; kind: Kind }[] = []
          for (let link = came.get(to); link; link = came.get(link.back)) round.unshift({ place: link.place, kind: crossed(folk, link.place, link.back) })
          found = { folk, kind, stop, from, target, round }
        }
      }
      if (!found) throw new Error(`no layout for ${folk} at a ${kind} on a ${fit}`)
      all.push(found)
    }
    return all
  }
  const build = (one: Case, pieces: { place: number; kind: Kind }[]): Village => {
    const saved = withPieces({ [one.stop]: one.kind, [one.target]: 'plank', ...Object.fromEntries(pieces.map((piece) => [piece.place, piece.kind])) })
    saved.folk[one.folk] = { at: one.from, errand: one.target }
    const v = makeVillage(saved)
    // Nobody else is about, so nobody else comes to a new piece or sits on one.
    for (const other of v.walkers) if (other.folk !== one.folk) other.flat = 1
    return v
  }
  /** Plays on, sending every bucket the walker waits for, as a child would. */
  const playOn = (v: Village, folk: Folk, seconds: number): void => {
    for (let i = 0; i < seconds; i++) {
      const one = walker(v, folk)
      if (one.waiting >= 0 && one.riding < 0 && !one.on && !one.walk && !v.rides[one.waiting]) tap(v, cupAt(v, one.waiting))
      run(v, 1)
    }
  }
  const tried = (v: Village, folk: Folk, place: number): number => v.cues.filter((cue) => cue.id.startsWith(`meet:${folk}:`) && cue.n === place && cue.notes !== undefined).length

  it('has a layout for every cell of the grid that stops a walker', () => {
    const all = cases()
    expect(all.length).toBeGreaterThan(30)
    for (const folk of FOLK) expect(all.some((one) => one.folk === folk), folk).toBe(true)
  })

  it('is not taken while a piece of it is missing: the walker stays at the piece that stops it', () => {
    for (const one of cases()) {
      const name = `${one.folk} at a ${one.kind} in place ${one.stop}`
      for (let missing = 0; missing < one.round.length; missing++) {
        const v = build(one, one.round.filter((_, index) => index !== missing))
        expect(walker(v, one.folk), name).toMatchObject({ at: one.from, blocked: one.stop, errand: one.target })
        playOn(v, one.folk, 6)
        expect(walker(v, one.folk), name).toMatchObject({ at: one.from, blocked: one.stop, errand: one.target, walk: null, on: null })
      }
    }
  })

  it('is taken, however long, when it is all there: the walker goes round and tries the plank beyond, and does not try the stopping piece again', () => {
    for (const one of cases()) {
      const name = `${one.folk} at a ${one.kind} in place ${one.stop}, round by ${one.round.map((piece) => `${piece.kind} ${piece.place}`).join(', ')}`
      const v = build(one, one.round)
      // Found as it was left, it stands at the first piece of the way round: it has not been set going.
      v.cues.length = 0
      tap(v, SKY)
      expect(walker(v, one.folk).walk, name).toBeNull()
      // Any change in the tree sets it off: here a piece taken off a place that is on no way of its.
      const spare = PLACES.findIndex((_, index) => v.places[index] === null)
      carry(v, 'lanterns', spare)
      press(v, mid(PLACES[spare]))
      move(v, SKY)
      release(v, SKY)
      v.cues.length = 0
      playOn(v, one.folk, 60)
      expect(tried(v, one.folk, one.target), name).toBeGreaterThan(0)
      expect(tried(v, one.folk, one.stop), name).toBe(0)
    }
  })

  it('sets the walker off when the child adds the piece that completes it', () => {
    for (const one of cases()) {
      const name = `${one.folk} at a ${one.kind} in place ${one.stop}`
      const last = one.round[one.round.length - 1]
      const v = build(one, one.round.slice(0, -1))
      playOn(v, one.folk, 3)
      expect(walker(v, one.folk), name).toMatchObject({ at: one.from, blocked: one.stop })
      v.cues.length = 0
      carry(v, last.kind, last.place)
      expect(v.places[last.place], name).toBe(last.kind)
      const saved = savedOf(v, bare())
      playOn(v, one.folk, 60)
      expect(tried(v, one.folk, one.target), name).toBeGreaterThan(0)
      expect(tried(v, one.folk, one.stop), name).toBe(0)
      // Where the walk would end was saved the moment the piece went on, as far as the first bucket on the way.
      if (!one.round.some((piece) => piece.kind === 'bucket')) expect(saved.folk[one.folk].at, name).toBe(walker(v, one.folk).at)
    }
  })

  it('gives the twins a plank round the lanterns across the only way to their door', () => {
    // The twins on the low left limb by evening, a string of lanterns across to their door.
    const saved = withPieces({ 7: 'lanterns' })
    saved.folk.mice = { at: 1, errand: 'home' }
    const v = makeVillage(saved)
    expect(walker(v, 'mice').blocked).toBe(7)
    // A way round by the limbs above: a ladder up, a plank across, and a slide down to their own limb.
    carry(v, 'ladder', 2)
    carry(v, 'plank', 8)
    run(v, 30)
    expect(walker(v, 'mice').errand).toBe('home')
    carry(v, 'slide', 3)
    run(v, 40)
    expect(walker(v, 'mice')).toMatchObject({ at: 2, errand: 'none' })
  })
})

describe('who comes to a new piece', () => {
  it('still tries a piece hung while the walker that will come is in the flourish of a tap', () => {
    // The squirrel is up on the high limb with a ladder home. Tapped there, he is sent home; the bridge is hung by his door before the flourish is over.
    const saved = withPieces({ 4: 'ladder' })
    saved.folk.squirrel = { at: 7, errand: 'none' }
    const v = makeVillage(saved)
    const squirrel = walker(v, 'squirrel')
    tap(v, body(v, 'squirrel'))
    expect(squirrel.show?.what).toBe('flourish')
    carry(v, 'bridge', 10)
    expect(squirrel.show?.what).toBe('flourish')
    expect(squirrel.next).toBe(10)
    expect(savedOf(v, saved).folk.squirrel).toEqual({ at: 5, errand: 'none' })
    run(v, 40)
    // He went home down the ladder and then over the new bridge.
    expect(squirrel).toMatchObject({ at: 5, errand: 'none', next: 'none', walk: null, on: null })
  })

  it('does not pick a walker that sits in a bucket for a piece beyond that bucket: somebody asks, and she keeps her errand', () => {
    const saved = withPieces({ 5: 'bucket' })
    saved.lifts[5] = 1
    saved.folk.owl = { at: 8, errand: 5 }
    const v = makeVillage(saved)
    const owl = walker(v, 'owl')
    expect(owl.seated).toBe(true)
    // A plank beyond the foot of her bucket: only she has a way to it, and only when the child sends her down.
    carry(v, 'plank', 11)
    expect(owl).toMatchObject({ seated: true, errand: 5, next: 'none', back: 'none' })
    expect(v.walkers.filter((one) => one.show?.what === 'ask')).toHaveLength(1)
    run(v, 10)
    expect(owl).toMatchObject({ seated: true, errand: 5, at: 8 })
  })

  it('has the nearest walker ask about a piece no way leads to when its flourish is over, if it is in the middle of one', () => {
    const v = makeVillage(bare())
    const mice = walker(v, 'mice')
    tap(v, body(v, 'mice'))
    carry(v, 'plank', 11)
    // The twins are nearest and still showing off: nobody else asks for them.
    expect(mice.show?.what).toBe('flourish')
    expect(v.walkers.some((one) => one.show?.what === 'ask')).toBe(false)
    let asked = false
    for (let frame = 0; frame < 60 * 6 && !asked; frame++) { step(v, 1 / 60); asked = mice.show?.what === 'ask' }
    expect(asked).toBe(true)
    run(v, 10)
    expect(v.walkers.every((one) => one.show === null && one.asks === -1)).toBe(true)
  })

  const tried = (v: Village, folk: Folk, place: number): boolean => v.cues.some((cue) => cue.id.startsWith(`meet:${folk}:`) && cue.n === place)

  it('gives two pieces hung quickly by the squirrel to the squirrel, one after the other, and he tries both', () => {
    const base = bare()
    const v = makeVillage(base)
    carry(v, 'plank', 8)
    run(v, 0.4)
    expect(walker(v, 'squirrel').walk !== null || walker(v, 'squirrel').on !== null).toBe(true)
    carry(v, 'ladder', 2)
    // Nobody else has a way to the ladder, and nobody asks: the squirrel takes it up when he is over the plank.
    expect(walker(v, 'squirrel').next).toBe(2)
    expect(ids(v).some((id) => id.startsWith('ask:'))).toBe(false)
    const saved = savedOf(v, base)
    expect(saved.folk.squirrel).toEqual({ at: 1, errand: 'none' })
    run(v, 40)
    expect(tried(v, 'squirrel', 8)).toBe(true)
    expect(tried(v, 'squirrel', 2)).toBe(true)
    expect(walker(v, 'squirrel')).toMatchObject({ at: 1, errand: 'none', next: 'none', back: 'none', walk: null })
    expect(savedOf(v, base)).toEqual(saved)
  })

  it('keeps one piece waiting for a busy walker, the newest', () => {
    const v = makeVillage(bare())
    carry(v, 'plank', 8)
    run(v, 0.3)
    carry(v, 'ladder', 2)
    carry(v, 'ladder', 4)
    expect(walker(v, 'squirrel').next).toBe(4)
    run(v, 40)
    expect(tried(v, 'squirrel', 4)).toBe(true)
    expect(tried(v, 'squirrel', 2)).toBe(false)
  })

  it('does not go back to a newer piece it has crossed on its way', () => {
    // The squirrel is on his way home from the low left limb, and a ladder is hung on that very way.
    const saved = withPieces({ 0: 'ladder' })
    saved.folk.squirrel = { at: 0, errand: 'none' }
    const v = makeVillage(saved)
    tap(v, body(v, 'squirrel'))
    carry(v, 'plank', 2)
    run(v, 40)
    expect(walker(v, 'squirrel')).toMatchObject({ at: 3, errand: 'none', next: 'none' })
    expect(v.cues.filter((cue) => cue.id.startsWith('meet:squirrel:plank') && cue.notes !== undefined && cue.n === 2 && cue.id.endsWith(':across')).length).toBeGreaterThan(0)
  })

  it('leaves a walker that stands with an errand it could not finish where it stands, while another can come', () => {
    // The owl is stopped at a rope bridge on her way home; a plank is hung by the squirrel's door, on her limb.
    const saved = withPieces({ 8: 'bridge', 5: 'bucket' })
    saved.folk.owl = { at: 3, errand: 'home' }
    const v = makeVillage(saved)
    expect(walker(v, 'owl')).toMatchObject({ blocked: 8, errand: 'home' })
    carry(v, 'plank', 10)
    expect(walker(v, 'squirrel').errand).toBe(10)
    run(v, 30)
    expect(walker(v, 'owl')).toMatchObject({ at: 3, blocked: 8, errand: 'home', back: 'none' })
    expect(tried(v, 'owl', 10)).toBe(false)
    expect(tried(v, 'squirrel', 10)).toBe(true)
  })

  it('sends her when no other can come, and she takes her way home up again afterwards', () => {
    const base = withPieces({ 8: 'bridge', 5: 'bucket' })
    base.folk.owl = { at: 3, errand: 'home' }
    base.folk.squirrel = { at: 0, errand: 'none' }
    const v = makeVillage(base)
    carry(v, 'plank', 10)
    expect(walker(v, 'owl')).toMatchObject({ errand: 10, back: 'home' })
    // Put away now, she is found back at the bridge, still on her way home.
    const saved = savedOf(v, base)
    expect(saved.folk.owl).toEqual({ at: 3, errand: 'home' })
    run(v, 60)
    expect(tried(v, 'owl', 10)).toBe(true)
    expect(walker(v, 'owl')).toMatchObject({ at: 3, blocked: 8, errand: 'home', next: 'none', back: 'none' })
    expect(savedOf(v, base)).toEqual(saved)
    // A plank in place of the bridge, and she gets home by the bucket above it.
    press(v, mid(PLACES[8]))
    move(v, SKY)
    release(v, SKY)
    carry(v, 'plank', 8)
    for (let i = 0; i < 40; i++) { const owl = walker(v, 'owl'); if (owl.waiting >= 0 && !owl.on && !owl.walk && owl.riding < 0 && !v.rides[owl.waiting]) tap(v, cupAt(v, owl.waiting)); run(v, 1) }
    expect(walker(v, 'owl')).toMatchObject({ at: 8, errand: 'none' })
  })

  it('does not send a walker that stands with an errand to a piece it cannot get to itself', () => {
    // The beetle stands at the foot of a ramp he cannot get up; a plank is hung beyond it. He has a way to it, but not one he can use.
    const saved = withPieces({ 0: 'plank' })
    saved.folk.beetle = { at: 0, errand: 0 }
    const v = makeVillage(saved)
    for (const other of v.walkers) if (other.folk !== 'beetle') other.flat = 1
    carry(v, 'plank', 7)
    // He keeps his errand and stays where he is: nobody can get to the plank, so he leans out towards it and asks.
    expect(walker(v, 'beetle')).toMatchObject({ errand: 0, blocked: 0, walk: null, back: 'none' })
    expect(ids(v)).toContain('ask:beetle')
  })

  it('by night brings the nearest walker out of its door to ask for a piece no way leads to, and it goes in again', () => {
    const saved = bare()
    saved.night = true
    const v = makeVillage(saved)
    expect(v.walkers.every((one) => one.indoors)).toBe(true)
    carry(v, 'plank', 11)
    const asked = FOLK.filter((folk) => ids(v).includes(`ask:${folk}`))
    expect(asked).toHaveLength(1)
    expect(walker(v, asked[0])).toMatchObject({ indoors: false })
    run(v, 8)
    expect(v.walkers.every((one) => one.indoors)).toBe(true)
    expect(v.walkers.every((one) => one.errand === 'none')).toBe(true)
  })
})
