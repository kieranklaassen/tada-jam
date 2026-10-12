import { describe, expect, it } from 'vitest'
import { HULLS, HULL_KINDS, KINDS, MAKINGS, MAX_DECK, aboard, bareBuild, canTake, deckSpot, draftOf, heightOf, isBlanket, placeFor, put, sailArea, weightOf, type Build, type HullKind, type Kind } from './build'
import { carry, run, worldWith } from './drive'
import { BRANCH, LAID_OUT, LINE, SEAT } from './layout'
import { hasBroadSail, moodOf, opinionOf, paceOf, traitsOf, twistsOf } from './traits'
import { buildNow } from './world'

// The boat as built: where each making goes, what comes off, what the build
// means for how it floats, which traits a place answers, and what the gnome
// thinks of it. His tastes are fixed: the same thing, the same face.

/** A boat with these things put on it in this order, each let go over the middle of the hull. */
function built(hull: HullKind, ...kinds: Kind[]): Build {
  const build = bareBuild(hull)
  for (const kind of kinds) {
    const slot = placeFor(build, kind, 0)
    if (slot) put(build, kind, slot)
  }
  return build
}

describe('where a making goes', () => {
  it('presses a mast into the nearer free hole of any hull, and has no place for a third', () => {
    for (const hull of HULL_KINDS) {
      const holes = HULLS[hull].holes
      expect(placeFor(bareBuild(hull), 'twig', holes[0] - 5), hull).toEqual({ on: 'mast', index: 0 })
      expect(placeFor(bareBuild(hull), 'stalk', holes[1] + 5), hull).toEqual({ on: 'mast', index: 1 })
      const two = built(hull, 'twig', 'stalk')
      expect(two.masts.filter(Boolean).length, hull).toBe(2)
      expect(placeFor(two, 'stem', 0), hull).toBeNull()
    }
  })

  it('threads a leaf or the feather on a mast with no sail, and lays it on the deck as a blanket when there is none', () => {
    expect(placeFor(bareBuild('bark'), 'birch', 0)).toEqual({ on: 'deck', index: 0 })
    expect(placeFor(built('bark', 'twig'), 'maple', 0)?.on).toBe('sail')
    expect(placeFor(built('bark', 'twig', 'maple'), 'feather', 0)).toEqual({ on: 'deck', index: 0 })
    expect(isBlanket(built('bark', 'birch'), 0)).toBe(true)
    expect(isBlanket(built('bark', 'berry'), 0)).toBe(false)
  })

  it('holds four things on the deck and no fifth, and nothing at all with no hull', () => {
    const full = built('bark', 'berry', 'cap', 'pebble', 'birch')
    expect(full.deck.length).toBe(MAX_DECK)
    expect(placeFor(full, 'maple', 0)).toBeNull()
    for (const kind of KINDS) expect(placeFor(bareBuild(null), kind, 0), kind).toBeNull()
  })

  it('lets a sail come off before the mast it is on', () => {
    const build = built('bark', 'twig', 'maple')
    const index = build.masts[0] ? 0 : 1
    expect(build.sails[index]).toBe('maple')
    expect(canTake(build, { on: 'mast', index })).toBe(false)
    expect(canTake(build, { on: 'sail', index })).toBe(true)
    build.sails[index] = null
    expect(canTake(build, { on: 'mast', index })).toBe(true)
  })

  it('gives everything aboard a seat of its own inside the hull', () => {
    for (const hull of HULL_KINDS) {
      const build = built(hull, 'berry', 'cap', 'pebble', 'birch')
      const seats = build.deck.map((_kind, index) => deckSpot(build, index))
      expect(new Set(seats.map((seat) => `${seat.x},${seat.y}`)).size, hull).toBe(seats.length)
      for (const seat of seats) expect(Math.abs(seat.x), hull).toBeLessThan(HULLS[hull].halfWidth)
      expect(aboard(build).length).toBe(4)
    }
  })

  it('is built by the child\'s hand the same way: a making let go over the hull lands in its place', () => {
    const w = worldWith({})
    run(w, 0.2)
    carry(w, LAID_OUT.twig, { x: SEAT.x + HULLS.bark.holes[0], y: SEAT.y - 100 })
    run(w, 0.5)
    carry(w, LAID_OUT.maple, { x: SEAT.x + HULLS.bark.holes[0], y: SEAT.y - 130 })
    run(w, 0.5)
    carry(w, LAID_OUT.pebble, { x: SEAT.x, y: SEAT.y - 50 })
    run(w, 0.5)
    expect(buildNow(w)).toMatchObject({ hull: 'bark', masts: ['twig', null], sails: ['maple', null], deck: ['pebble'] })
  })
})

describe('how it floats', () => {
  it('rides lower the heavier it is, and the pebble is the heaviest load', () => {
    expect(draftOf(built('bark', 'pebble'), true)).toBeGreaterThan(draftOf(built('bark', 'berry'), true))
    expect(weightOf(built('bark'), true)).toBeGreaterThan(weightOf(built('bark'), false))
    expect(MAKINGS.pebble.weight).toBeGreaterThan(Math.max(MAKINGS.berry.weight, MAKINGS.cap.weight))
  })

  it('takes the wind by its sails: a broad leaf more than a small one, a bendy stem spilling half, a blanket none', () => {
    expect(sailArea(built('bark', 'twig', 'maple'))).toBeGreaterThan(sailArea(built('bark', 'twig', 'birch')))
    expect(sailArea(built('bark', 'stem', 'maple'))).toBeLessThan(sailArea(built('bark', 'twig', 'maple')) * 0.6)
    expect(sailArea(built('bark', 'maple'))).toBe(0)
    expect(sailArea(built('bark', 'twig', 'feather'))).toBeLessThan(sailArea(built('bark', 'twig', 'maple')))
  })

  it('stands taller than the low branch is high on the tall stalk only, as the child can see', () => {
    const top = (build: Build): number => LINE - heightOf(build)
    expect(top(built('bark', 'stalk'))).toBeLessThan(BRANCH.y)
    expect(top(built('bark', 'twig'))).toBeGreaterThan(BRANCH.y)
    expect(top(built('bark', 'stem'))).toBeGreaterThan(BRANCH.y)
    expect(MAKINGS.stalk.length).toBeGreaterThan(MAKINGS.twig.length)
  })

  it('runs before a broad sail, sails under a small one and crawls with none, and never stands still or runs away', () => {
    expect(paceOf(built('bark', 'twig', 'maple'))).toBeGreaterThan(paceOf(built('bark', 'twig', 'birch')))
    expect(paceOf(built('bark', 'twig', 'birch'))).toBeGreaterThan(paceOf(built('bark')))
    expect(paceOf(built('bark', 'stem', 'maple'))).toBe(paceOf(built('bark', 'twig', 'birch')))
    for (const hull of HULL_KINDS) for (const build of [built(hull), built(hull, 'pebble', 'cap', 'berry'), built(hull, 'twig', 'maple', 'stalk', 'feather')]) {
      expect(paceOf(build)).toBeGreaterThan(20)
      expect(paceOf(build)).toBeLessThan(260)
    }
  })
})

describe('the traits a place answers', () => {
  it('reads each trait from the build, several at once', () => {
    expect(traitsOf(built('bark'))).toEqual(['nosail'])
    expect(traitsOf(built('bark', 'twig', 'maple'))).toEqual(['broad'])
    expect(traitsOf(built('walnut', 'twig', 'birch', 'stem', 'feather', 'pebble', 'berry')).sort()).toEqual(['berry', 'pebble', 'twomasts', 'walnut'])
    expect(traitsOf(built('bark', 'twig', 'birch'))).toEqual([])
    // A leaf that lies on the deck is a blanket, not a sail.
    expect(traitsOf(built('bark', 'maple'))).toContain('nosail')
  })

  it('reads the five makings that change a row', () => {
    expect(twistsOf(built('pod'))).toContain('pod')
    expect(twistsOf(built('bark', 'stalk'))).toContain('stalk')
    expect(twistsOf(built('bark', 'stem', 'maple'))).toContain('stem')
    expect(twistsOf(built('bark', 'twig', 'feather'))).toContain('feather')
    expect(twistsOf(built('bark', 'cap'))).toContain('cap')
    expect(twistsOf(built('bark', 'twig', 'birch'))).toEqual([])
    expect(hasBroadSail(built('bark', 'stem', 'maple'))).toBe(false)
  })
})

describe('the gnome\'s tastes are fixed', () => {
  it('has one face for each build, and the same face every time', () => {
    expect(moodOf(built('bark', 'twig', 'maple'))).toBe('glee')
    expect(moodOf(built('bark', 'pebble'))).toBe('glum')
    expect(moodOf(built('bark', 'twig', 'feather'))).toBe('itchy')
    expect(moodOf(built('bark', 'berry'))).toBe('yum')
    expect(moodOf(built('bark', 'birch'))).toBe('under')
    expect(moodOf(built('bark', 'twig', 'birch'))).toBe('plain')
    for (let i = 0; i < 3; i++) expect(moodOf(built('pod', 'twig', 'maple'))).toBe('glee')
  })

  it('has one opinion of each thing where it is put', () => {
    expect(opinionOf('maple', 'sail')).toBe('whoop')
    expect(opinionOf('feather', 'sail')).toBe('sneeze')
    expect(opinionOf('berry', 'deck')).toBe('mmm')
    expect(opinionOf('pebble', 'deck')).toBe('grumble')
    expect(opinionOf('birch', 'deck')).toBe('tuck')
    for (const kind of KINDS) for (const on of ['mast', 'sail', 'deck'] as const) expect(opinionOf(kind, on)).toBe(opinionOf(kind, on))
  })
})
