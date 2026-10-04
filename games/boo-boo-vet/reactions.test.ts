import { describe, expect, it } from 'vitest'
import { CAST, SPECIES, taste, type Species } from './cast'
import { REST, beatSeconds } from './motion'
import { CARES } from './needs'
import { allReactions, cuesBetween, lasts, reactionFor, sample, wornAt, type Reaction } from './reactions'

const all = allReactions()

/** The animal's track sampled at 30 a second for `seconds`, as plain numbers. */
function track(reaction: Reaction, species: Species, seconds = 3): number[][] {
  const rows: number[][] = []
  for (let frame = 0; frame < seconds * 30; frame++) {
    const { animal, hidden } = sample(reaction, species, frame / 30)
    rows.push([animal.x, animal.y, animal.rot * 100, (animal.sx - 1) * 100, (animal.sy - 1) * 100, hidden ? 30 : 0])
  }
  return rows
}

function apart(one: number[][], other: number[][]): number {
  let sum = 0
  for (let frame = 0; frame < one.length; frame++) for (let part = 0; part < one[frame].length; part++) sum += Math.abs(one[frame][part] - other[frame][part])
  return sum / one.length
}

describe('the reactions', () => {
  it('has two for every thing, and one of its own for each animal\'s love and each animal\'s wariness', () => {
    expect(all).toHaveLength(CARES.length * 2 + SPECIES.length * 2)
    expect(new Set(all.map((reaction) => reaction.id)).size).toBe(all.length)
  })

  it('writes every reaction in order, inside its own length, starting and ending at rest', () => {
    for (const reaction of all) {
      const first = reaction.animal[0], last = reaction.animal[reaction.animal.length - 1]
      expect({ ...first, t: 0, face: 'calm' }, reaction.id).toEqual({ ...REST, t: 0 })
      expect({ ...last, t: 0 }, reaction.id).toEqual({ ...REST, t: 0 })
      expect(last.t).toBe(reaction.beats)
      for (const keys of [reaction.animal, reaction.thing]) {
        for (let index = 1; index < keys.length; index++) expect(keys[index].t, reaction.id).toBeGreaterThanOrEqual(keys[index - 1].t)
        for (const key of keys) expect(key.t).toBeLessThanOrEqual(reaction.beats)
      }
      expect(reaction.thing[0].t, reaction.id).toBe(0)
      for (const [from, to] of reaction.hidden) {
        expect(from).toBeLessThan(to)
        expect(to).toBeLessThan(reaction.beats)
      }
      for (const cue of reaction.cues) expect(cue.t).toBeLessThan(reaction.beats)
    }
  })

  it('answers within the first beat, and gives every reaction a voice', () => {
    for (const reaction of all) {
      expect(reaction.animal[1].t, reaction.id).toBeLessThanOrEqual(1)
      expect(reaction.cues.some((cue) => cue.call), reaction.id).toBe(true)
      expect(Math.min(...reaction.cues.map((cue) => cue.t)), reaction.id).toBeLessThanOrEqual(1.3)
    }
  })

  it('keeps the animal on the table and in one piece', () => {
    for (const reaction of all) {
      for (const species of SPECIES) {
        for (let frame = 0; frame < 30 * 9; frame++) {
          const { animal } = sample(reaction, species, frame / 30)
          expect(Math.abs(animal.x), reaction.id).toBeLessThanOrEqual(150)
          // A dunk or a heavy landing dips a little below the seat, never through the table.
          expect(animal.y).toBeLessThanOrEqual(22)
          expect(animal.y).toBeGreaterThanOrEqual(-150)
          for (const squash of [animal.sx, animal.sy]) {
            expect(squash).toBeGreaterThan(0.72)
            expect(squash).toBeLessThan(1.25)
          }
          for (const value of Object.values(animal)) if (typeof value === 'number') expect(Number.isFinite(value)).toBe(true)
        }
      }
    }
  })

  it('ends with the animal at rest and the thing lying where its last key left it', () => {
    for (const reaction of all) {
      for (const species of SPECIES) {
        const end = sample(reaction, species, lasts(reaction, species) + 1)
        expect(end.done).toBe(true)
        expect(end.hidden).toBe(false)
        expect({ ...end.animal }).toEqual({ ...REST })
        expect(end.thing.to).toBe(reaction.thing[reaction.thing.length - 1])
        expect(end.thing.by).toBeCloseTo(1)
        // A thing is never left covering the face, upside down or behind the animal's head when it is over.
        expect(Math.abs(end.thing.rot) % (Math.PI * 2) < 2.7).toBe(true)
      }
    }
  })

  it('lasts a few seconds: long enough to watch, short enough to do again', () => {
    for (const reaction of all) {
      for (const species of SPECIES) {
        expect(lasts(reaction, species), `${reaction.id} for the ${species}`).toBeGreaterThan(2.4)
        expect(lasts(reaction, species)).toBeLessThan(7)
      }
    }
  })

  it('plays an animal\'s own scene with the thing it loves for four to six seconds', () => {
    for (const species of SPECIES) {
      const { reaction, taste: manner } = reactionFor(species, CAST[species].loves, null, 0)
      expect(manner).toBe('loves')
      expect(lasts(reaction, species), species).toBeGreaterThanOrEqual(4)
      expect(lasts(reaction, species), species).toBeLessThanOrEqual(6)
    }
  })

  it('shares no reaction between two: every pair of them moves the animal clearly differently', () => {
    for (let a = 0; a < all.length; a++) {
      for (let b = a + 1; b < all.length; b++) {
        expect(apart(track(all[a], 'cat', 4), track(all[b], 'cat', 4)), `${all[a].id} and ${all[b].id}`).toBeGreaterThan(1.2)
      }
    }
  })

  it('plays the same reaction in each animal\'s own timing, so no two animals move through it alike', () => {
    for (const care of CARES) {
      for (const flip of [0, 0.9]) {
        const plain = SPECIES.filter((species) => taste(species, care) === 'plain')
        const { reaction } = reactionFor(plain[0], care, null, flip)
        for (let a = 0; a < plain.length; a++) {
          for (let b = a + 1; b < plain.length; b++) {
            expect(apart(track(reaction, plain[a]), track(reaction, plain[b])), `${reaction.id}: ${plain[a]} and ${plain[b]}`).toBeGreaterThan(0.5)
          }
        }
      }
    }
  })

  it('never looks like a sign: an animal under the blanket is going somewhere, and nothing shakes for long', () => {
    for (const reaction of all) {
      // Out of sight is never a hide: the lump travels or the spell is short.
      for (const [from, to] of reaction.hidden) {
        const inside = reaction.animal.filter((key) => key.t >= from && key.t <= to)
        const travels = Math.max(...inside.map((key) => key.x)) - Math.min(...inside.map((key) => key.x))
        expect(travels, reaction.id).toBeGreaterThanOrEqual(60)
      }
      // A run of quick turns to and fro (a shake) lasts under a beat and a half, and never comes with a low, still body.
      let run = 0, longest = 0
      for (let index = 2; index < reaction.animal.length; index++) {
        const [before, at, after] = [reaction.animal[index - 2], reaction.animal[index - 1], reaction.animal[index]]
        const quick = after.t - before.t <= 0.45 && Math.sign(at.rot - before.rot) === -Math.sign(after.rot - at.rot) && at.rot !== before.rot
        run = quick ? run + (after.t - at.t) : 0
        longest = Math.max(longest, run)
      }
      expect(longest, reaction.id).toBeLessThan(1.5)
    }
  })
})

describe('where a thing is worn', () => {
  it('is the same place whichever reaction was played, so a load finds it where it was left', () => {
    for (const species of SPECIES) {
      for (const care of CARES) {
        const worn = { ...wornAt(species, care), t: 0 }
        for (const flip of [0, 0.9]) {
          for (const last of [null, reactionFor(species, care, null, flip).reaction.id]) {
            const played = reactionFor(species, care, last, flip).reaction
            expect({ ...played.thing[played.thing.length - 1], t: 0 }, `${species} ${played.id}`).toEqual(worn)
          }
        }
        // It lies in front of the animal, right way up, and the blanket lies open.
        expect(worn.front).toBe(true)
        expect(Math.abs(worn.rot)).toBeLessThan(2.3)
      }
    }
  })
})

describe('choosing a reaction', () => {
  it('gives the thing an animal loves and the thing it is wary of the same reaction every time', () => {
    for (const species of SPECIES) {
      for (const care of [CAST[species].loves, CAST[species].wary]) {
        const first = reactionFor(species, care, null, 0.1).reaction
        expect(first.care).toBe(care)
        expect(reactionFor(species, care, first.id, 0.9).reaction).toBe(first)
        expect(first.id.startsWith(species)).toBe(true)
      }
    }
  })

  it('never plays the same plain reaction twice running, and always one for the thing given', () => {
    for (const species of SPECIES) {
      for (const care of CARES) {
        if (taste(species, care) !== 'plain') continue
        let last: string | null = null
        for (let turn = 0; turn < 12; turn++) {
          const { reaction } = reactionFor(species, care, last, (turn * 0.37) % 1)
          expect(reaction.care).toBe(care)
          expect(reaction.id).not.toBe(last)
          last = reaction.id
        }
      }
    }
  })
})

describe('cues', () => {
  it('hands over each cue exactly once as time passes, in order', () => {
    for (const reaction of all) {
      const heard: number[] = []
      let before = 0
      for (let frame = 1; frame <= 60 * 8; frame++) {
        const now = frame / 60
        for (const cue of cuesBetween(reaction, 'duck', before, now)) heard.push(cue.t)
        before = now
      }
      expect(heard).toEqual(reaction.cues.map((cue) => cue.t))
    }
  })

  it('times a cue in the animal\'s own beat', () => {
    const reaction = reactionFor('bear', 'bowl', null, 0).reaction
    const first = reaction.cues[0].t
    expect(cuesBetween(reaction, 'bear', 0, first * beatSeconds('bear') + 0.01)).toHaveLength(1)
    expect(cuesBetween(reaction, 'bear', 0, first * beatSeconds('hedgehog') + 0.01)).toHaveLength(0)
  })
})
