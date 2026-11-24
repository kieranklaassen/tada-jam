import { describe, expect, it } from 'vitest'
import { PLACES, SITTERS, headSpot, type Spot, type Who } from './layout'
import { BLANKETS, STEP, cover, drape, drop, faults, freshWorld, giveSausage, inBasket, peek, pickBlanket, pickSausage, putBack, putSausage, quiet, ringBell, sausageSpot, settled, step, tapHook, uncover, undrape, type World } from './model'
import { deserialize, isSpot, serialize } from './state'
import { below, makeRng, pick } from './rng'

const run = (w: World, seconds: number) => { for (let i = 0; i < seconds / STEP; i++) step(w) }
const rest = (w: World) => { for (let i = 0; i < 60 * 30 && !quiet(w); i++) step(w) }
const has = (w: World, type: string, who?: Who, spot?: Spot) => w.events.some((e) => e.type === type && (!who || ('who' in e && e.who === who)) && (!spot || ('spot' in e && e.spot === spot)))

describe('who sees what', () => {
  it('AE1: a covered dog dives at the empty dish while the cat goes on looking at the teapot', () => {
    const w = freshWorld()
    cover(w, 'dog')
    putSausage(w, 'teapot')
    expect(w.sitters.dog.belief).toBe('dish')
    expect(w.sitters.cat.belief).toBe('teapot')
    uncover(w, 'dog')
    expect(w.sitters.dog.target).toBe('dish')
    run(w, 4)
    expect(has(w, 'empty', 'dog', 'dish')).toBe(true)
    expect(w.sitters.cat.belief).toBe('teapot')
    rest(w)
    expect(w.sitters.dog.belief).toBe(null)
  })

  it('AE2: four beliefs in four places, and one bell sends four dashes', () => {
    const w = freshWorld()
    const order: [Who, Spot][] = [['dog', 'teapot'], ['cat', 'boot'], ['aunt', 'pot'], ['grandpa', 'gramophone']]
    for (const [who, spot] of order) { cover(w, who); putSausage(w, spot) }
    expect(SITTERS.map((who) => w.sitters[who].belief)).toEqual(['dish', 'teapot', 'boot', 'pot'])
    ringBell(w)
    expect(SITTERS.map((who) => w.sitters[who].target)).toEqual(['dish', 'teapot', 'boot', 'pot'])
    rest(w)
    expect(sausageSpot(w)).toBe('gramophone')
  })

  it('AE3: the aunt hunts for the sausage on her own head', () => {
    const w = freshWorld()
    cover(w, 'aunt')
    expect(giveSausage(w, 'aunt')).toBe(true)
    expect(w.sitters.dog.belief).toBe('head:aunt')
    uncover(w, 'aunt')
    expect(w.sitters.aunt.target).toBe('dish')
    rest(w)
    expect(sausageSpot(w)).toBe('head:aunt')
    expect(w.sitters.aunt.belief).not.toBe('head:aunt')
  })

  it('AE4: one who does not know copies a neighbour, and a lie is passed along', () => {
    const w = freshWorld()
    cover(w, 'dog')
    putSausage(w, 'teapot')
    cover(w, 'cat'); w.sitters.cat.belief = null
    for (const who of ['aunt', 'grandpa'] as const) cover(w, who)
    w.sitters.dog.covered = false
    uncover(w, 'cat')
    expect(has(w, 'copy', 'dog')).toBe(true)
    expect(w.sitters.cat.target).toBe('dish')
  })

  it('somebody out of its seat sees nothing: mischief behind a busy back works', () => {
    const w = freshWorld()
    cover(w, 'dog')
    putSausage(w, 'gramophone')
    uncover(w, 'dog')
    run(w, 1)
    putSausage(w, 'boot')
    expect(w.sitters.dog.belief).toBe('dish')
    rest(w)
    expect(w.sitters.dog.belief).toBe(null)
  })

  it('one who sees a place found empty stops believing in it', () => {
    const w = freshWorld()
    putSausage(w, 'teapot')
    for (const who of ['dog', 'cat'] as const) cover(w, who)
    putSausage(w, 'boot')
    w.sitters.cat.covered = false
    uncover(w, 'dog')
    rest(w)
    expect(has(w, 'empty', 'dog', 'teapot')).toBe(true)
    expect(w.sitters.cat.belief).toBe(null)
  })

  it('a covered sitter still believes in a sausage that has been eaten', () => {
    const w = freshWorld()
    cover(w, 'cat'); cover(w, 'dog')
    uncover(w, 'dog')
    rest(w)
    expect(sausageSpot(w)).toBe('hook')
    expect(w.sitters.cat.belief).toBe('dish')
    expect(w.sitters.aunt.belief).toBe('hook')
    uncover(w, 'cat'); rest(w)
    expect(has(w, 'empty', 'cat', 'dish')).toBe(true)
    expect(w.sitters.cat.belief).toBe('hook')
  })

  it('a peek tells everyone who sees, and never the one who wears it', () => {
    const w = freshWorld()
    cover(w, 'dog'); giveSausage(w, 'dog'); uncover(w, 'dog'); rest(w)
    peek(w)
    expect(w.sitters.cat.belief).toBe('head:dog')
    expect(w.sitters.dog.belief).toBe(null)
  })

  it('a sitter told by a neighbour’s eyes finds what is on its own head', () => {
    const w = freshWorld()
    cover(w, 'cat'); giveSausage(w, 'cat'); uncover(w, 'cat'); rest(w)
    expect(sausageSpot(w)).toBe('head:cat')
    cover(w, 'cat'); uncover(w, 'cat')
    expect(w.sitters.cat.target).toBe('head:cat')
    rest(w)
    expect(has(w, 'found', 'cat', 'head:cat')).toBe(true)
  })
})

describe('dashes', () => {
  it('everyone finds and misses in every spot', () => {
    for (const who of SITTERS) for (const spot of [...PLACES, ...SITTERS.filter((o) => o !== who).map(headSpot)]) for (const full of [true, false]) {
      const w = freshWorld()
      w.sausage = { kind: 'spot', spot: full ? spot : spot === 'boot' ? 'pot' : 'boot' }
      for (const o of SITTERS) w.sitters[o].covered = true
      w.sitters[who].belief = spot
      uncover(w, who)
      rest(w)
      expect(has(w, full ? 'found' : 'empty', who, spot), `${who} ${spot} ${full}`).toBe(true)
      expect(sausageSpot(w) === 'hook').toBe(full)
      expect(faults(w)).toEqual([])
    }
  })

  it('two at one place stand apart, the first takes it and the other knows it is eaten', () => {
    const w = freshWorld()
    ringBell(w)
    expect(new Set(SITTERS.map((who) => w.sitters[who].slot)).size).toBe(4)
    rest(w)
    expect(w.events.filter((e) => e.type === 'found')).toHaveLength(1)
    for (const who of SITTERS) expect(w.sitters[who].belief).toBe('hook')
  })

  it('a jump at the string always misses', () => {
    const w = freshWorld()
    w.sausage = { kind: 'spot', spot: 'hook' }
    cover(w, 'grandpa'); w.sitters.grandpa.belief = 'hook'
    uncover(w, 'grandpa'); rest(w)
    expect(has(w, 'miss', 'grandpa', 'hook')).toBe(true)
    expect(sausageSpot(w)).toBe('hook')
  })

  it('a blanket dropped on a runner sends it home, believing as before', () => {
    const w = freshWorld()
    cover(w, 'dog'); putSausage(w, 'boot'); uncover(w, 'dog'); run(w, 0.8)
    cover(w, 'dog'); rest(w)
    expect(w.sitters.dog).toMatchObject({ covered: true, belief: 'dish' })
  })

  it('a dive into a blanketed place comes home as a ghost, hungry or fed', () => {
    for (const full of [true, false]) {
      const w = freshWorld()
      cover(w, 'dog')
      if (!full) putSausage(w, 'boot')
      drape(w, 'dish')
      uncover(w, 'dog'); rest(w)
      expect(has(w, 'ghost', 'dog')).toBe(true)
      expect(w.sitters.dog.covered).toBe(true)
      expect(w.draped).toEqual([])
      expect(sausageSpot(w)).toBe(full ? 'hook' : 'boot')
    }
  })

  it('the sausage snatched away under the nose is not found', () => {
    const w = freshWorld()
    cover(w, 'dog'); uncover(w, 'dog'); run(w, 1.2)
    pickSausage(w); rest(w)
    expect(has(w, 'empty', 'dog', 'dish')).toBe(true)
    drop(w, { place: 'boot' })
    expect(sausageSpot(w)).toBe('boot')
  })

  it('with nothing to go on it shrugs', () => {
    const w = freshWorld()
    for (const who of SITTERS) { cover(w, who); w.sitters[who].belief = null }
    w.sausage = { kind: 'spot', spot: 'pot' }
    uncover(w, 'aunt')
    expect(w.sitters.aunt.phase).toBe('lost')
    rest(w)
    expect(w.sitters.aunt.belief).toBe(null)
  })
})

describe('hands', () => {
  it('there are four blankets, and a fifth wish takes one off a thing', () => {
    const w = freshWorld()
    drape(w, 'fish')
    for (const who of SITTERS) expect(cover(w, who)).toBe(true)
    expect(w.draped).toEqual([])
    expect(inBasket(w)).toBe(0)
    expect(BLANKETS).toBe(4)
  })

  it('whatever is put back is where it was', () => {
    const w = freshWorld()
    cover(w, 'dog'); drape(w, 'boot')
    for (const origin of ['basket', { who: 'dog' as Who }, { on: 'boot' as const }] as const) {
      pickBlanket(w, origin); putBack(w); rest(w)
      expect(w.sitters.dog.covered).toBe(true)
      expect(w.draped).toEqual(['boot'])
      expect(inBasket(w)).toBe(2)
    }
    pickSausage(w); putBack(w)
    expect(sausageSpot(w)).toBe('dish')
  })

  it('a sausage let go on the fish or the floor springs back', () => {
    for (const on of ['fish', 'elsewhere'] as const) {
      const w = freshWorld()
      pickSausage(w); drop(w, on)
      expect(has(w, 'back')).toBe(true)
      expect(sausageSpot(w)).toBe('dish')
    }
  })

  it('bares the dish for those who did not know', () => {
    const w = freshWorld()
    drape(w, 'dish')
    w.sitters.dog.belief = null
    undrape(w, 'dish')
    expect(w.sitters.dog.belief).toBe('dish')
  })

  it('a sausage comes down only when there is none', () => {
    const w = freshWorld()
    expect(tapHook(w)).toBe(false)
    giveSausage(w, 'cat'); rest(w)
    expect(tapHook(w)).toBe(true)
    expect(w.sitters.cat.belief).toBe('dish')
  })
})

function child(w: World, rng: ReturnType<typeof makeRng>): void {
  const who = pick(rng, SITTERS), place = pick(rng, PLACES)
  switch (below(rng, 10)) {
    case 0: case 1: w.sitters[who].covered ? uncover(w, who) : cover(w, who); break
    case 2: case 3: if (!w.held) putSausage(w, place); break
    case 4: pickSausage(w); break
    case 5: pickBlanket(w, pick(rng, ['basket', { who }, { on: place }] as const)); break
    case 6: case 7: drop(w, pick(rng, [{ who }, { place }, 'fish', 'elsewhere'] as const)); break
    case 8: tapHook(w); if (below(rng, 4) === 0) ringBell(w); break
    default: peek(w); if (below(rng, 3) === 0) putBack(w)
  }
}

describe('any play at all', () => {
  it('holds every rule, always comes to rest, and is found as left', () => {
    const rng = makeRng(7)
    for (let game = 0; game < 60; game++) {
      const w = freshWorld()
      for (let i = 0; i < 80; i++) {
        child(w, rng)
        run(w, below(rng, 60) * STEP)
        expect(faults(w)).toEqual([])
        w.events.length = 0
      }
      const rested = settled(w)
      expect(quiet(rested)).toBe(true)
      const saved = serialize(w)
      const again = deserialize(JSON.parse(JSON.stringify(saved)))
      expect(serialize(again)).toEqual(saved)
      expect(again.events).toEqual([])
      expect(quiet(again)).toBe(true)
    }
  }, 30000)

  it('saving does not disturb the room', () => {
    const w = freshWorld()
    cover(w, 'dog'); putSausage(w, 'pot'); uncover(w, 'dog'); run(w, 1)
    const before = JSON.stringify(w)
    serialize(w)
    expect(JSON.stringify(w)).toBe(before)
  })
})

describe('the save', () => {
  it('reads anything', () => {
    for (const raw of [null, 3, 'x', [], {}, { v: 2 }, { v: 1, covered: 'dog', belief: [], sausage: 'moon', draped: [1] }, { v: 1, covered: [...SITTERS], draped: ['fish', 'dish'], belief: { dog: 'head:dog', cat: 'toString' } }]) {
      const w = deserialize(raw)
      expect(faults(w)).toEqual([])
      expect(serialize(w)).toEqual(serialize(deserialize(serialize(w))))
    }
    expect(isSpot('constructor')).toBe(false)
  })

  it('is small', () => {
    const w = freshWorld()
    expect(JSON.stringify(serialize(w)).length).toBeLessThan(1000)
  })
})
