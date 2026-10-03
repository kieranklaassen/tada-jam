import { describe, expect, it } from 'vitest'
import { LOOKS, PACKETS, PACKET_IDS, TRAITS, breedsTrue, carriesHidden, colourOf, isLookCode, isPacketId, isPairs, jointsOf, lookCode, lookFromCode, lookOf, pack, pairOf, withPair, type Pair, type Trait } from './plant'

const ALL = Array.from({ length: 256 }, (_, pairs) => pairs)

describe('pairs', () => {
  it('packs four pairs into one number and reads each back', () => {
    const packed = pack({ colour: [1, 0], height: [0, 0], leaf: [0, 1], petals: [1, 1] })
    expect(isPairs(packed)).toBe(true)
    expect(pairOf(packed, 'colour')).toEqual([1, 0])
    expect(pairOf(packed, 'height')).toEqual([0, 0])
    expect(pairOf(packed, 'leaf')).toEqual([0, 1])
    expect(pairOf(packed, 'petals')).toEqual([1, 1])
  })

  it('replaces one pair and leaves the other three alone', () => {
    for (const pairs of ALL) {
      for (const trait of TRAITS) {
        const changed = withPair(pairs, trait, [1, 0])
        expect(pairOf(changed, trait)).toEqual([1, 0])
        for (const other of TRAITS) if (other !== trait) expect(pairOf(changed, other)).toEqual(pairOf(pairs, other))
      }
    }
  })

  it('takes only whole numbers from 0 to 255 as pairs', () => {
    for (const bad of [-1, 256, 1.5, NaN, '3', null, undefined, {}]) expect(isPairs(bad)).toBe(false)
    expect(ALL.every(isPairs)).toBe(true)
  })
})

describe('what a plant shows', () => {
  const colour = (pair: Pair) => colourOf(withPair(0, 'colour', pair))

  it('shows both colour factors: red with white is pink, whichever parent gave which', () => {
    expect(colour([1, 1])).toBe('red')
    expect(colour([1, 0])).toBe('pink')
    expect(colour([0, 1])).toBe('pink')
    expect(colour([0, 0])).toBe('white')
  })

  it('lets tall hide short, round hide jagged and plain hide spotted', () => {
    const one = (trait: Trait, pair: Pair) => lookOf(withPair(0, trait, pair), false)
    for (const mixed of [[1, 0], [0, 1], [1, 1]] as Pair[]) {
      expect(one('height', mixed).joints).toBe(4)
      expect(one('leaf', mixed).leaf).toBe('round')
      expect(one('petals', mixed).petals).toBe('plain')
    }
    expect(one('height', [0, 0]).joints).toBe(2)
    expect(one('leaf', [0, 0]).leaf).toBe('jagged')
    expect(one('petals', [0, 0]).petals).toBe('spotted')
  })

  it('halves the height in dry soil and changes nothing else the plant shows', () => {
    for (const pairs of ALL) {
      const wet = lookOf(pairs, false), dry = lookOf(pairs, true)
      expect(dry.joints).toBe(wet.joints / 2)
      expect({ ...dry, joints: wet.joints }).toEqual(wet)
    }
  })

  it('makes a tall plant from dry soil and a short one from wet soil stand the same height on different pairs', () => {
    const tall = withPair(0, 'height', [1, 1]), short = withPair(0, 'height', [0, 0])
    expect(jointsOf(tall, true)).toBe(jointsOf(short, false))
    expect(pairOf(tall, 'height')).not.toEqual(pairOf(short, 'height'))
    // Lower than any pair gives in wet soil: only a short plant from dry soil.
    expect(ALL.filter((pairs) => jointsOf(pairs, false) === 1)).toEqual([])
    expect(jointsOf(short, true)).toBe(1)
  })

  it('knows what is carried without showing and what breeds true', () => {
    const carrier = withPair(withPair(0, 'height', [1, 0]), 'colour', [1, 0])
    expect(carriesHidden(carrier, 'height')).toBe(true)
    expect(breedsTrue(carrier, 'height')).toBe(false)
    // A mixed colour pair shows, so nothing is hidden in it.
    expect(carriesHidden(carrier, 'colour')).toBe(false)
    expect(breedsTrue(carrier, 'leaf')).toBe(true)
  })
})

describe('looks', () => {
  it('gives every look its own code and reads every code back', () => {
    const seen = new Set<number>()
    for (const pairs of ALL) {
      for (const dry of [false, true]) {
        const look = lookOf(pairs, dry), code = lookCode(look)
        expect(isLookCode(code)).toBe(true)
        expect(lookFromCode(code)).toEqual(look)
        seen.add(code)
      }
    }
    expect(seen.size).toBe(LOOKS)
    for (const bad of [-1, LOOKS, 2.5, '4', null]) expect(isLookCode(bad)).toBe(false)
  })
})

describe('the packets', () => {
  it('all look the same: pink, tall, round-leaved, plain', () => {
    for (const id of PACKET_IDS) expect(lookOf(PACKETS[id], false)).toEqual({ colour: 'pink', joints: 4, leaf: 'round', petals: 'plain' })
  })

  it('each carry, hidden, the one factor they are named for', () => {
    const hidden = (id: keyof typeof PACKETS) => TRAITS.filter((trait) => carriesHidden(PACKETS[id], trait))
    expect(hidden('pink')).toEqual([])
    expect(hidden('short')).toEqual(['height'])
    expect(hidden('jagged')).toEqual(['leaf'])
    expect(hidden('spots')).toEqual(['petals'])
  })

  it('between them hold both factors of every trait, so no factor can be lost from the page', () => {
    for (const trait of TRAITS) {
      const factors = new Set(PACKET_IDS.flatMap((id) => [...pairOf(PACKETS[id], trait)]))
      expect([...factors].sort()).toEqual([0, 1])
    }
  })

  it('knows its own ids and no others', () => {
    expect(PACKET_IDS.every(isPacketId)).toBe(true)
    for (const bad of ['red', 'toString', '', 3, null]) expect(isPacketId(bad)).toBe(false)
  })
})
