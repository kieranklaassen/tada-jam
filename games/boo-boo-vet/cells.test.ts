import { describe, expect, it } from 'vitest'
import { cellVoice } from './voices'
import { SPECIES, type Species } from './cast'
import { allTracks, cellCuesBetween, cellLasts, cellTrack, isHelp, sampleCell, type CellAnchor, type CellThing, type CellTrack } from './cells'
import { GIVEN, GRID, allCells, helps } from './grid'
import { REST, beatSeconds } from './motion'
import { NEEDS, OPEN, PLAIN, QUIET, type Care, type Need, type Step } from './needs'
import { SIGN_FACE, sign, type Show, type Signed } from './signs'

const all = allTracks()
const SEED = 3
const FRAME = 1 / 30
/** The longest a test that samples every cell for every animal may take. */
const LONG = 30_000

const name = (cell: CellTrack): string => `${cell.given} to one that is ${cell.need}`
const misses = all.filter((cell) => !helps(cell.given, cell.need))
const helping = all.filter((cell) => helps(cell.given, cell.need))
const scared = all.filter((cell) => cell.need === 'scared')

/** The places on the animal itself, where nothing may land on one that hides. */
const ON_ANIMAL: readonly CellAnchor[] = ['head', 'mouth', 'lap', 'back', 'seat', 'paw']
/** Where a thing lies after a cell that did not help: the table's left end. */
const LEFT_END = { at: 'seat', dx: -150, dy: -6, rot: 0, size: 1, front: true, ride: 0 }
/** Where the thing that helped lies on the animal when its cell is over. */
const WORN: Readonly<Record<Care, Partial<CellThing>>> = {
  plaster: { at: 'paw', dx: 0, dy: 0 },
  blanket: { at: 'lap', dx: 0, dy: 30, size: 0.62 },
  brush: { at: 'lap', dx: 0, dy: 0 },
  bowl: { at: 'lap', dx: 0, dy: -10 },
  basket: { at: 'edge', dx: 0, dy: 0 },
}

const PARTS = ['paw', 'pawX', 'pawY', 'pawRot', 'arms', 'tongue', 'burrs', 'puff', 'shake', 'under', 'out'] as const satisfies readonly (keyof Show)[]

/** Every frame of a cell for one animal, with the sign it was played on top of, at thirty a second and once more just after its end. */
function frames(cell: CellTrack, species: Species, step: Step = PLAIN, need: Need = cell.need): { seconds: number; signed: Signed; sampled: ReturnType<typeof sampleCell> }[] {
  const out: { seconds: number; signed: Signed; sampled: ReturnType<typeof sampleCell> }[] = []
  const lasts = cellLasts(cell, species)
  for (let seconds = 0; seconds < lasts; seconds += FRAME) {
    const signed = sign(species, need, step, seconds, SEED)
    out.push({ seconds, signed, sampled: sampleCell(cell, species, seconds, signed) })
  }
  const after = lasts + 0.25, signed = sign(species, need, step, after, SEED)
  out.push({ seconds: after, signed, sampled: sampleCell(cell, species, after, signed) })
  return out
}

describe('the thirty cells', () => {
  it('has every cell of the grid once, under the name the grid gives its motion', () => {
    expect(all).toHaveLength(GIVEN.length * NEEDS.length)
    expect(all).toHaveLength(30)
    for (const { given, need } of allCells()) {
      const found = all.filter((cell) => cell.given === given && cell.need === need)
      expect(found, `${given} to ${need}`).toHaveLength(1)
      expect(found[0].motion, `${given} to ${need}`).toBe(GRID[given][need].motion)
      expect(cellTrack(given, need), `${given} to ${need}`).toBe(found[0])
      expect(isHelp(found[0]), `${given} to ${need}`).toBe(helps(given, need))
    }
    expect(new Set(all.map((cell) => cell.motion)).size).toBe(30)
  })

  it('writes every track in order of time, inside its length, from rest to rest', () => {
    for (const cell of all) {
      const first = cell.animal[0], last = cell.animal[cell.animal.length - 1]
      expect(first, name(cell)).toEqual({ ...REST, t: 0 })
      expect(last, name(cell)).toEqual({ ...REST, t: cell.beats })
      expect(first.parts, name(cell)).toBeUndefined()
      expect(last.parts, name(cell)).toBeUndefined()
      expect(cell.animal.length, name(cell)).toBeGreaterThanOrEqual(3)
      for (const keys of [cell.animal, cell.thing]) {
        for (let index = 1; index < keys.length; index++) expect(keys[index].t, `${name(cell)}, key ${index}`).toBeGreaterThanOrEqual(keys[index - 1].t)
        for (const key of keys) {
          expect(key.t, name(cell)).toBeGreaterThanOrEqual(0)
          expect(key.t, name(cell)).toBeLessThanOrEqual(cell.beats)
        }
      }
      for (let index = 1; index < cell.cues.length; index++) expect(cell.cues[index].t, name(cell)).toBeGreaterThanOrEqual(cell.cues[index - 1].t)
      for (const cue of cell.cues) expect(cue.t, name(cell)).toBeLessThan(cell.beats)
      for (const [from, to] of cell.hidden) {
        expect(from, name(cell)).toBeLessThan(to)
        expect(to, name(cell)).toBeLessThan(cell.beats)
      }
      expect(cell.coversUntil, name(cell)).toBeLessThan(cell.beats)
      // The animal answers within the first beat.
      expect(cell.animal[1].t, name(cell)).toBeLessThanOrEqual(1)
    }
  })

  it('gives the hand no thing and every care thing a track that starts where it lands', () => {
    for (const cell of all) {
      if (cell.given === 'hand') expect(cell.thing, name(cell)).toHaveLength(0)
      else {
        expect(cell.thing.length, name(cell)).toBeGreaterThan(0)
        expect(cell.thing[0].t, name(cell)).toBe(0)
      }
      // Only the blanket is spread out.
      expect(cell.open, name(cell)).toBe(cell.given === 'blanket')
    }
  })

  it('lasts four to seven beats where it does not help, five to eight where it helps, three to five for a stroke', () => {
    for (const cell of all) {
      const [least, most] = cell.given === 'hand' ? [3, 5] : helps(cell.given, cell.need) ? [5, 8] : [4, 7]
      expect(cell.beats, name(cell)).toBeGreaterThanOrEqual(least)
      expect(cell.beats, name(cell)).toBeLessThanOrEqual(most)
    }
  })

  it('lets the sign end in exactly the five cells that help, after the first beat and a beat and a half before the end', () => {
    const ending = all.filter((cell) => cell.ends !== null)
    expect(ending).toHaveLength(5)
    expect(helping).toHaveLength(5)
    for (const cell of all) {
      if (!helps(cell.given, cell.need)) { expect(cell.ends, name(cell)).toBeNull(); continue }
      expect(cell.ends, name(cell)).not.toBeNull()
      expect(cell.ends!, name(cell)).toBeGreaterThan(1)
      expect(cell.ends!, name(cell)).toBeLessThanOrEqual(cell.beats - 1.5)
    }
  })

  it('gives every cell its voice once: whole within the first beat, or in pieces that play every note of it once, each where its thing is drawn', () => {
    for (const cell of all) {
      const voices = cell.cues.filter((cue) => cue.voice)
      const pieces = cell.cues.filter((cue) => cue.first !== undefined || cue.note !== undefined || cue.rest !== undefined)
      if (pieces.length === 0) {
        expect(voices, name(cell)).toHaveLength(1)
        expect(voices[0].t, name(cell)).toBeGreaterThanOrEqual(0.1)
        expect(voices[0].t, name(cell)).toBeLessThanOrEqual(0.6)
      } else {
        // In pieces: no whole voice as well, and the pieces cover the voice's notes in order, none twice.
        expect(voices, name(cell)).toHaveLength(0)
        for (const species of SPECIES) {
          const count = cellVoice(cell.given, cell.need, species).length
          const played: number[] = []
          for (const cue of pieces) {
            if (cue.first !== undefined) for (let index = 0; index < cue.first; index++) played.push(index)
            if (cue.note !== undefined) played.push(cue.note)
            if (cue.rest !== undefined) for (let index = cue.rest; index < count; index++) played.push(index)
          }
          expect(played, `${name(cell)} for ${species}`).toEqual(Array.from({ length: count }, (_, index) => index))
        }
        for (let index = 1; index < pieces.length; index++) expect(pieces[index].t, name(cell)).toBeGreaterThan(pieces[index - 1].t)
      }
      const calls = cell.cues.flatMap((cue) => (cue.call ? [cue.call] : []))
      expect(calls.length, name(cell)).toBeLessThanOrEqual(3)
      if (!helps(cell.given, cell.need)) for (const call of calls) expect(['wow', 'wary', 'hum'], `${name(cell)} calls ${call}`).toContain(call)
      // Only the basket to the one that hides dims the lamp, and only the bowl throws water.
      for (const cue of cell.cues) {
        if (cue.dim !== undefined) expect(`${cell.given} ${cell.need}`, name(cell)).toBe('basket scared')
        if (cue.drops !== undefined) expect(cell.given, name(cell)).toBe('bowl')
      }
    }
  })

  it('leaves an animal it did not help wearing the face of its need, with the thing at the table\'s left end', () => {
    expect(misses).toHaveLength(25)
    for (const cell of misses) {
      const lastOwn = cell.animal[cell.animal.length - 2]
      expect(lastOwn.face, name(cell)).toBe(SIGN_FACE[cell.need])
      if (cell.given === 'hand') continue
      const lies = cell.thing[cell.thing.length - 1]
      expect({ ...lies, t: 0 }, name(cell)).toEqual({ ...LEFT_END, t: 0 })
      // It gets there in the last beat and a half.
      expect(lies.t, name(cell)).toBeGreaterThanOrEqual(cell.beats - 1.5)
    }
  })

  it('leaves the thing that helped on the animal, where it is worn', () => {
    for (const cell of helping) {
      const lies = cell.thing[cell.thing.length - 1]
      expect(lies, name(cell)).toMatchObject(WORN[cell.given as Care])
      // The plaster is wrapped on the paw at the slant it keeps there; every other thing lies straight.
      expect(lies.rot, name(cell)).toBe(cell.given === 'plaster' ? 0.5 : 0)
      expect(lies.front, name(cell)).toBe(true)
      // The well animal is glad in its last key of its own.
      expect(['glad', 'bliss'], name(cell)).toContain(cell.animal[cell.animal.length - 2].face)
    }
  })

  it('keeps every key on the table and in one piece, and never moves the animal in or out of its hiding place', () => {
    for (const cell of all) {
      for (const key of cell.animal) {
        expect(Math.abs(key.x), name(cell)).toBeLessThanOrEqual(120)
        expect(key.y, name(cell)).toBeGreaterThanOrEqual(-90)
        expect(key.y, name(cell)).toBeLessThanOrEqual(18)
        expect(Math.abs(key.rot), name(cell)).toBeLessThanOrEqual(0.3)
        for (const squash of [key.sx, key.sy]) {
          expect(squash, name(cell)).toBeGreaterThanOrEqual(0.8)
          expect(squash, name(cell)).toBeLessThanOrEqual(1.2)
        }
        expect(key.parts?.under, name(cell)).toBeUndefined()
      }
    }
  })

  it('plays for every animal with finite numbers, on the table, and is done when its time is up', () => {
    const wrong: string[] = []
    for (const cell of all) {
      for (const species of SPECIES) {
        const who = `${name(cell)}, the ${species}`
        const played = frames(cell, species)
        for (const { seconds, sampled } of played) {
          const { pose, show, thing } = sampled
          const numbers = [pose.x, pose.y, pose.rot, pose.sx, pose.sy, sampled.signLeft, ...PARTS.map((part) => show[part]), ...(thing ? [thing.by, thing.rot, thing.size, thing.ride] : [])]
          if (!numbers.every((value) => Number.isFinite(value))) wrong.push(`${who}: a number that is not finite at ${seconds.toFixed(2)}`)
          // The ease of a bouncy animal passes its mark a little.
          if (Math.abs(pose.x) > 140) wrong.push(`${who}: x ${pose.x.toFixed(1)} at ${seconds.toFixed(2)}`)
          if (pose.y < -110 || pose.y > 24) wrong.push(`${who}: y ${pose.y.toFixed(1)} at ${seconds.toFixed(2)}`)
          if ((cell.thing.length === 0) !== (thing === null)) wrong.push(`${who}: thing at ${seconds.toFixed(2)}`)
          if (sampled.done !== (seconds >= cellLasts(cell, species))) wrong.push(`${who}: done at ${seconds.toFixed(2)}`)
        }
        const end = played[played.length - 1].sampled
        if (!end.done || end.hidden || end.covers) wrong.push(`${who}: not over at its end`)
        if (end.thing && (end.thing.to !== cell.thing[cell.thing.length - 1] || Math.abs(end.thing.by - 1) > 1e-9)) wrong.push(`${who}: the thing is not where its last key puts it`)
        if (sampleCell(cell, species, cellLasts(cell, species) * 0.5, sign(species, cell.need, PLAIN, 0, SEED)).done) wrong.push(`${who}: done halfway`)
      }
    }
    expect(wrong).toEqual([])
  }, LONG)

  it('leaves an animal it did not help exactly as its sign has it', () => {
    const wrong: string[] = []
    for (const cell of misses) {
      for (const species of SPECIES) {
        for (const step of [QUIET, PLAIN, OPEN]) {
          const played = frames(cell, species, step)
          const { signed, sampled } = played[played.length - 1]
          const who = `${name(cell)}, the ${species}, step ${step}`
          if (sampled.signLeft !== 1) wrong.push(`${who}: the sign faded`)
          for (const part of ['x', 'y', 'rot', 'sx', 'sy'] as const) if (Math.abs(sampled.pose[part] - signed.pose[part]) > 1e-6) wrong.push(`${who}: ${part}`)
          if (sampled.pose.face !== signed.pose.face) wrong.push(`${who}: face ${sampled.pose.face}`)
          for (const part of PARTS) if (Math.abs(sampled.show[part] - signed.show[part]) > 1e-6) wrong.push(`${who}: ${part}`)
        }
      }
    }
    expect(wrong).toEqual([])
  }, LONG)

  it('leaves an animal it helped at rest and well, with nothing of the sign but where it is', () => {
    const wrong: string[] = []
    for (const cell of helping) {
      for (const species of SPECIES) {
        for (const step of [QUIET, PLAIN, OPEN]) {
          const played = frames(cell, species, step)
          const who = `${name(cell)}, the ${species}, step ${step}`
          // Until the care has done its work the whole sign is there.
          for (const { seconds, sampled } of played) if (seconds / beatSeconds(species) < cell.ends! && sampled.signLeft !== 1) wrong.push(`${who}: the sign fades early at ${seconds.toFixed(2)}`)
          const { signed, sampled } = played[played.length - 1]
          if (sampled.signLeft !== 0) wrong.push(`${who}: sign left ${sampled.signLeft}`)
          for (const part of ['x', 'y', 'rot', 'sx', 'sy'] as const) if (Math.abs(sampled.pose[part] - REST[part]) > 1e-6) wrong.push(`${who}: ${part}`)
          if (sampled.pose.face !== 'calm') wrong.push(`${who}: face ${sampled.pose.face}`)
          for (const part of PARTS) {
            const want = part === 'under' ? signed.show.under : 0
            if (Math.abs(sampled.show[part] - want) > 1e-6) wrong.push(`${who}: ${part} ${sampled.show[part]}`)
          }
        }
      }
    }
    expect(wrong).toEqual([])
  }, LONG)
})

describe('the one that hides', () => {
  it('is never pressed: nothing lands on it, and it stays in the dark for the whole cell', () => {
    expect(scared).toHaveLength(6)
    const wrong: string[] = []
    for (const cell of scared) {
      const upTo = helps(cell.given, cell.need) ? cell.thing.length : cell.thing.length - 1
      cell.thing.slice(0, upTo).forEach((key, index) => {
        if (ON_ANIMAL.includes(key.at)) wrong.push(`${name(cell)}: thing key ${index} is on the animal, at its ${key.at}`)
      })
      for (const key of cell.animal) if ((key.parts?.shake ?? 0) > 0.55) wrong.push(`${name(cell)}: a key sets the trembling to ${key.parts?.shake}`)
      // The blanket lies on the table above it and does not cover it.
      if (cell.given === 'blanket' && (cell.coversUntil !== 0 || cell.hidden.length > 0 || cell.thing[0].at !== 'over')) wrong.push(`${name(cell)}: the blanket covers it`)
      for (const species of SPECIES) {
        for (const { seconds, sampled } of frames(cell, species)) {
          if (sampled.show.under !== 1) wrong.push(`${name(cell)}, the ${species}: out of its hiding place at ${seconds.toFixed(2)}`)
          if (sampled.show.shake > 0.56) wrong.push(`${name(cell)}, the ${species}: trembling ${sampled.show.shake.toFixed(3)} at ${seconds.toFixed(2)}`)
        }
      }
    }
    expect(wrong).toEqual([])
  }, LONG)

  it('never trembles more than its sign does, at any step of the sign', () => {
    const wrong: string[] = []
    for (const cell of scared) {
      for (const species of SPECIES) {
        for (const step of [QUIET, PLAIN, OPEN]) {
          for (const { seconds, signed, sampled } of frames(cell, species, step)) {
            if (sampled.show.shake > signed.show.shake + 1e-9) wrong.push(`${name(cell)}, the ${species}, step ${step}: ${sampled.show.shake.toFixed(3)} over ${signed.show.shake.toFixed(3)} at ${seconds.toFixed(2)}`)
          }
        }
      }
    }
    expect(wrong).toEqual([])
  }, LONG)

  it('is given the basket at the edge of its hiding place, leans out into it, and the lamp dims once', () => {
    const cell = cellTrack('basket', 'scared')!
    expect(cell.thing.every((key) => key.at === 'edge')).toBe(true)
    expect(cell.cues.filter((cue) => cue.dim !== undefined)).toHaveLength(1)
    const atEnds = cell.animal.filter((key) => key.t <= cell.ends!).at(-1)!
    expect(atEnds.parts?.out).toBe(1)
    expect(atEnds.parts?.shake).toBe(0)
    // After the trembling has stopped it stretches up.
    expect(Math.max(...cell.animal.filter((key) => key.t > cell.ends!).map((key) => key.sy))).toBeGreaterThan(1.1)
  })
})

describe('a care that helps', () => {
  it('never adds to the sign before taking it away: no more burrs, no harder shiver, at any step', () => {
    const wrong: string[] = []
    const held: readonly (readonly [CellTrack, keyof Show])[] = [[cellTrack('brush', 'itchy')!, 'burrs'], [cellTrack('blanket', 'cold')!, 'shake'], [cellTrack('basket', 'scared')!, 'shake']]
    for (const [cell, part] of held) {
      for (const species of SPECIES) {
        for (const step of [QUIET, PLAIN, OPEN]) {
          for (const { seconds, signed, sampled } of frames(cell, species, step)) {
            if (sampled.show[part] > signed.show[part] + 1e-9) wrong.push(`${name(cell)}, the ${species}, step ${step}: ${part} ${sampled.show[part].toFixed(3)} over ${signed.show[part].toFixed(3)} at ${seconds.toFixed(2)}`)
          }
        }
      }
    }
    expect(wrong).toEqual([])
  }, LONG)
})

describe('thirty different motions', () => {
  /** How far apart two tracks must be: the mean over the frames of the summed differences of a row, in design units and their like. The nearest two cells are about 10 apart (two quiet ones of the one that hides). */
  const APART = 6

  /** One track for the cat over four seconds: the animal's pose, the parts that show, and the thing's own turn and size. */
  function rows(cell: CellTrack): number[][] {
    const out: number[][] = []
    for (let frame = 0; frame < 4 * 30; frame++) {
      const seconds = frame / 30
      // The same sign under all thirty, so that only the tracks differ.
      const { pose, show, thing } = sampleCell(cell, 'cat', seconds, sign('cat', 'thirsty', PLAIN, seconds, SEED))
      out.push([
        pose.x, pose.y, pose.rot * 100, (pose.sx - 1) * 100, (pose.sy - 1) * 100,
        show.paw * 20, show.pawX, show.pawY, show.pawRot * 20, show.arms * 20, show.tongue * 10, show.burrs * 10, show.puff * 20, show.shake * 30, show.out * 40,
        thing ? thing.rot * 20 : 0, thing ? thing.size * 20 : 0,
      ])
    }
    return out
  }

  function apart(one: number[][], other: number[][]): number {
    let sum = 0
    for (let frame = 0; frame < one.length; frame++) for (let part = 0; part < one[frame].length; part++) sum += Math.abs(one[frame][part] - other[frame][part])
    return sum / one.length
  }

  it('shares no motion between two cells', () => {
    const sampled = all.map(rows)
    const near: string[] = []
    for (let one = 0; one < all.length; one++) {
      for (let other = one + 1; other < all.length; other++) {
        const by = apart(sampled[one], sampled[other])
        if (!(by > APART)) near.push(`${name(all[one])} and ${name(all[other])}: ${by.toFixed(2)}`)
      }
    }
    expect(near).toEqual([])
  }, LONG)
})

describe('the cues of a cell', () => {
  it('are handed over once each, in order, as time passes', () => {
    for (const cell of all) {
      for (const species of ['duck', 'bear'] as const) {
        const heard: number[] = []
        let before = 0
        for (let frame = 1; frame <= 60 * 9; frame++) {
          const now = frame / 60
          for (const cue of cellCuesBetween(cell, species, before, now)) heard.push(cue.t)
          before = now
        }
        expect(heard, `${name(cell)}, the ${species}`).toEqual(cell.cues.map((cue) => cue.t))
      }
    }
  })

  it('are timed in the animal\'s own beat', () => {
    const cell = cellTrack('bowl', 'thirsty')!
    const first = cell.cues[0].t
    expect(cellCuesBetween(cell, 'bear', 0, first * beatSeconds('bear') + 0.01)).toHaveLength(1)
    expect(cellCuesBetween(cell, 'bear', 0, first * beatSeconds('hedgehog') + 0.01)).toHaveLength(0)
  })
})
