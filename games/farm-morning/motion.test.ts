import { describe, expect, it } from 'vitest'
import { BROUGHT, CELLS, SOAKED, cellOf, type AnswerId } from './cells'
import { PERSONALITY, blankHen, blankRig, catTail, cloudDrift, crowLift, goatRig, hatchLift, henExtras, henRig, henTurned, leftRig, perkRig, pigRig, ponyRig, sunTurn, turnedRig, yawnRig, type HenRig, type Rig } from './motion'
import { CROW, PECK_BEAT, USES, brushAt, pecksIn } from './timeline'

// Every character moves like itself, and every cell of the grid moves the
// animal its own way. A track here is a rig sampled through time, as a list of
// numbers; two tracks are alike when they stay close all the way.

type Rigger = typeof ponyRig
const RIGS: Record<'pony' | 'goat' | 'pig', Rigger> = { pony: ponyRig, goat: goatRig, pig: pigRig }
const BIG = ['pony', 'goat', 'pig'] as const
const KEYS = Object.keys(blankRig()) as (keyof Rig)[]
const HEN_KEYS = Object.keys(blankHen()) as (keyof HenRig)[]

/** A rig as plain numbers, scales as their distance from rest. */
const flat = (rig: Rig): number[] => KEYS.map((key) => (key === 'sx' || key === 'sy' ? rig[key] - 1 : rig[key]))
const flatHen = (rig: HenRig): number[] => HEN_KEYS.map((key) => rig[key])

function track(sample: (t: number) => number[], seconds: number): number[][] {
  const out: number[][] = []
  for (let t = 0; t < seconds; t += 1 / 30) out.push(sample(t))
  return out
}

/** How far apart two tracks are: the largest difference of any one channel at any one moment. */
function apart(a: number[][], b: number[][]): number {
  let most = 0
  for (let i = 0; i < Math.min(a.length, b.length); i++) for (let j = 0; j < a[i].length; j++) most = Math.max(most, Math.abs(a[i][j] - b[i][j]))
  return most
}

/** How much a track moves at all. */
const moves = (a: number[][]): number => apart(a, a.map(() => a[0]))

const idle = (animal: (typeof BIG)[number], filled = 0): number[][] => track((t) => flat(RIGS[animal](t, filled, null, 0, 1, false)), 24)
const answer = (animal: (typeof BIG)[number], id: AnswerId): number[][] => track((t) => flat(RIGS[animal](10 + t, 0, id, t, CELLS[id].lasts, false)), CELLS[id].lasts)
const henIdle = (i: number, filled = 0): number[][] => track((t) => flatHen(henRig(i, t, 'stand', 0, filled, null, 0, 1, false)), 24)
const henAnswer = (i: number, id: AnswerId, lead: boolean): number[][] => track((t) => flatHen(henRig(i, 10 + t, 'stand', 0, 0, id, t, CELLS[id].lasts, lead)), CELLS[id].lasts)

describe('at idle', () => {
  it('has every character alive: each one moves with nothing touched', () => {
    for (const animal of BIG) expect(moves(idle(animal)), animal).toBeGreaterThan(0.02)
    for (let i = 0; i < 3; i++) expect(moves(henIdle(i)), `hen ${i}`).toBeGreaterThan(0.02)
    expect(Math.abs(catTail(0.4) - catTail(1.3))).toBeGreaterThan(0.01)
    expect(Math.abs(cloudDrift(0, 0) - cloudDrift(0, 4))).toBeGreaterThan(0.5)
  })

  it('gives every character a tempo of its own: no two breathe, blink or fidget alike', () => {
    const all = [PERSONALITY.pony, PERSONALITY.goat, PERSONALITY.pig, ...PERSONALITY.hens]
    for (const key of ['breath', 'blink', 'fidget', 'settle'] as const) {
      for (let a = 0; a < all.length; a++) for (let b = a + 1; b < all.length; b++) expect(Math.abs(all[a][key] / all[b][key] - 1), `${key} ${a} ${b}`).toBeGreaterThan(0.08)
    }
    expect(new Set(all.map((one) => one.funniest)).size).toBe(all.length)
  })

  it('moves no two characters as copies of each other', () => {
    for (let a = 0; a < BIG.length; a++) for (let b = a + 1; b < BIG.length; b++) expect(apart(idle(BIG[a]), idle(BIG[b])), `${BIG[a]} ${BIG[b]}`).toBeGreaterThan(0.05)
    for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) expect(apart(henIdle(a), henIdle(b)), `hens ${a} ${b}`).toBeGreaterThan(0.05)
  })

  it('shows contentment: an animal with its right thing idles another way', () => {
    for (const animal of BIG) expect(apart(idle(animal, 0), idle(animal, 1)), animal).toBeGreaterThan(0.04)
    for (let i = 0; i < 3; i++) expect(apart(henIdle(i, 0), henIdle(i, 1)), `hen ${i}`).toBeGreaterThan(0.04)
  })

  it('leans an animal to a thing carried over it', () => {
    for (const animal of BIG) {
      const calm = track((t) => flat(RIGS[animal](t, 0, null, 0, 1, false)), 2)
      const eager = track((t) => flat(RIGS[animal](t, 0, null, 0, 1, true)), 2)
      expect(apart(calm, eager), animal).toBeGreaterThan(0.03)
    }
  })
})

describe('the answers', () => {
  it('moves each animal its own way in every cell of its column', () => {
    for (const animal of BIG) {
      const tracks = BROUGHT.map((brought) => answer(animal, cellOf(brought, animal)))
      const still = idle(animal)
      tracks.forEach((one, a) => {
        expect(apart(one, still), `${BROUGHT[a]}-${animal} against idle`).toBeGreaterThan(0.12)
        for (let b = a + 1; b < tracks.length; b++) expect(apart(one, tracks[b]), `${BROUGHT[a]} and ${BROUGHT[b]} on the ${animal}`).toBeGreaterThan(0.12)
      })
    }
    const hens = BROUGHT.map((brought) => henAnswer(0, cellOf(brought, 'hens'), true))
    hens.forEach((one, a) => { for (let b = a + 1; b < hens.length; b++) expect(apart(one, hens[b]), `${BROUGHT[a]} and ${BROUGHT[b]} on the hens`).toBeGreaterThan(0.12) })
  })

  it('moves the three hens differently inside one answer', () => {
    for (const brought of BROUGHT) {
      const id = cellOf(brought, 'hens')
      const three = [0, 1, 2].map((i) => henAnswer(i, id, i === 0))
      expect(apart(three[0], three[1]), id).toBeGreaterThan(0.05)
      expect(apart(three[1], three[2]), id).toBeGreaterThan(0.05)
    }
  })

  it('soaks the goat its own way when the pony shakes', () => {
    const soaked = answer('goat', SOAKED)
    expect(apart(soaked, idle('goat'))).toBeGreaterThan(0.12)
    for (const brought of BROUGHT) expect(apart(soaked, answer('goat', cellOf(brought, 'goat'))), brought).toBeGreaterThan(0.12)
  })

  it('keeps every pose in bounds: nothing flips, shrinks away or leaves its place', () => {
    for (const animal of BIG) {
      for (const brought of BROUGHT) {
        const id = cellOf(brought, animal)
        for (const pose of answer(animal, id)) {
          const rig = Object.fromEntries(KEYS.map((key, i) => [key, pose[i]])) as Rig
          for (const key of KEYS) expect(Number.isFinite(rig[key]), `${id} ${key}`).toBe(true)
          expect(Math.abs(rig.dx), id).toBeLessThan(90)
          expect(Math.abs(rig.dy), id).toBeLessThan(140)
          expect(Math.abs(rig.sx), id).toBeLessThan(0.5)
          expect(Math.abs(rig.sy), id).toBeLessThan(0.5)
          expect(Math.abs(rig.rot), id).toBeLessThan(0.8)
          expect(rig.mouth, id).toBeGreaterThanOrEqual(0)
          expect(rig.mouth, id).toBeLessThanOrEqual(1)
          expect(rig.lid, id).toBeLessThanOrEqual(1)
        }
      }
    }
  })

  it('starts and ends on the idle pose, so an answer never jumps in or out, and never jumps when it is cut short', () => {
    for (const animal of BIG) {
      for (const brought of BROUGHT) {
        const id = cellOf(brought, animal)
        const lasts = CELLS[id].lasts
        for (const [time, t] of [[10, 0], [10 + lasts, lasts]] as const) {
          const here = flat(RIGS[animal](time, 0, id, t, lasts, false))
          const rest = flat(RIGS[animal](time, 0, null, 0, 1, false))
          expect(apart([here], [rest]), `${id} at ${t}`).toBeLessThan(0.02)
        }
        // From one frame to the next no channel leaps: a thirtieth of a second moves a pose only so far.
        const frames = answer(animal, id)
        for (let i = 1; i < frames.length; i++) {
          const dx = Math.abs(frames[i][KEYS.indexOf('dx')] - frames[i - 1][KEYS.indexOf('dx')])
          const dy = Math.abs(frames[i][KEYS.indexOf('dy')] - frames[i - 1][KEYS.indexOf('dy')])
          expect(dx, `${id} dx at frame ${i}`).toBeLessThan(40)
          expect(dy, `${id} dy at frame ${i}`).toBeLessThan(60)
        }
      }
    }
  })

  it('brings the ears up when a thing is lifted, and lets them down again', () => {
    const at = (since: number): Rig => perkRig(blankRig(), since)
    expect(at(0).earL).toBe(0)
    expect(at(0.4).earL).toBeLessThan(-0.4)
    expect(at(0.4).earR).toBeLessThan(-0.4)
    expect(at(2).earL).toBe(0)
  })

  it('brings a head round to a knock, up or down, and back', () => {
    expect(turnedRig(blankRig(), 0.4, true).head).toBeLessThan(-0.3)
    expect(turnedRig(blankRig(), 0.4, false).head).toBeGreaterThan(0.25)
    expect(turnedRig(blankRig(), 0.4, true).earL).toBeLessThan(-0.3)
    expect(turnedRig(blankRig(), 2, true).head).toBe(0)
    expect(henTurned(blankHen(), 0.4).neck).toBeGreaterThan(0.4)
    expect(henTurned(blankHen(), 2).neck).toBe(0)
  })

  it('has each hen scratch the ground beside the empty trough, at her own times, and not by a full one', () => {
    const rakes = [0, 1, 2].map((i) => track((t) => [henRig(i, t, 'stand', 0, 0, null, 0, 1, false).scratch], 30).map((row) => row[0]))
    for (const rake of rakes) {
      // The foot goes back and comes forward.
      expect(Math.max(...rake)).toBeGreaterThan(0.5)
      expect(Math.min(...rake)).toBeLessThan(-0.5)
      // Most of the time she is not scratching.
      expect(rake.filter((v) => v === 0).length).toBeGreaterThan(rake.length * 0.6)
    }
    expect(rakes[0]).not.toEqual(rakes[1])
    expect(rakes[1]).not.toEqual(rakes[2])
    const fed = track((t) => [henRig(1, t, 'stand', 0, 1, null, 0, 1, false).scratch], 30)
    expect(fed.every((row) => row[0] === 0)).toBe(true)
    const walking = track((t) => [henRig(1, t, 'go', 150, 0, null, 0, 1, false).scratch], 30)
    expect(walking.every((row) => row[0] === 0)).toBe(true)
  })

  it('lifts the hatch and lets it down again', () => {
    expect(hatchLift(-1)).toBe(0)
    expect(hatchLift(0.6)).toBeGreaterThan(0.8)
    expect(hatchLift(2.4)).toBeLessThan(0.05)
  })

  it('sits a hen down by a full trough, and stands her up to walk, to peck and to answer', () => {
    expect(henRig(0, 3, 'stand', 0, 1, null, 0, 1, false).sit).toBe(1)
    expect(henRig(0, 3, 'stand', 0, 0, null, 0, 1, false).sit).toBe(0)
    expect(henRig(0, 3, 'go', 150, 1, null, 0, 1, false).sit).toBe(0)
    expect(henRig(0, 3, 'peck', 0, 1, null, 0, 1, false).sit).toBe(0)
    expect(henRig(0, 3, 'stand', 0, 1, 'finger-hens', 0.2, 1.3, true).sit).toBe(0)
  })

  it('brings a hen\'s head down half way through each beat of her own pecking, so many times in a stretch', () => {
    for (const i of [0, 1, 2] as const) {
      const beat = PECK_BEAT[i]
      for (let n = 0; n < pecksIn(2.4, i); n++) {
        expect(henRig(i, 7, 'peck', 0, 0, 'scoop-hens', 1, 3.6, false, beat * (n + 0.5)).head, `hen ${i} peck ${n}`).toBeGreaterThan(1)
        expect(henRig(i, 7, 'peck', 0, 0, 'scoop-hens', 1, 3.6, false, beat * n).head).toBeLessThan(0.05)
      }
      expect(PECK_BEAT[i] * (pecksIn(2.4, i) - 0.5)).toBeLessThanOrEqual(2.4)
    }
    // Never two at one speed.
    expect(new Set(PECK_BEAT).size).toBe(3)
  })

  it('kicks the pig\'s trotters from the first giggle until it lies still on its back', () => {
    const kick = (t: number): number => pigRig(5, 0, 'brush-pig', t, CELLS['brush-pig'].lasts, false).extra2
    expect(kick(0.1)).toBeLessThan(0.05)
    for (const t of [0.6, 1.0, 1.4, 1.8, 2.2]) expect(kick(t), `at ${t}`).toBeGreaterThan(0.9)
    expect(kick(2.8)).toBeLessThan(0.05)
    // The brush is on it for as long as it giggles.
    expect(USES['brush-pig'].leaves).toBeGreaterThan(0.3 + 8 * 0.13)
  })

  it('strokes a brush one way along its reach at each stroke, and back between them', () => {
    const use = USES['brush-pony']
    expect(brushAt(use, 0)).toBe(-1)
    for (const at of use.strokes!.at) {
      expect(brushAt(use, at)).toBeCloseTo(-1, 5)
      expect(brushAt(use, at + use.strokes!.lasts)).toBeCloseTo(1, 5)
    }
    expect(brushAt(use, 9)).toBe(1)
    // A scrubbing brush never stops.
    const scrub = [0, 0.03, 0.06, 0.09].map((t) => brushAt(USES['brush-pig'], 0.5 + t))
    expect(new Set(scrub.map((v) => v.toFixed(2))).size).toBe(4)
  })

  it('opens a mouth wide in a yawn, and throws the white hen\'s beak up at each note of her crow', () => {
    expect(yawnRig(blankRig(), -1).mouth).toBe(0)
    expect(yawnRig(blankRig(), 0.37).mouth).toBeGreaterThan(0.95)
    expect(yawnRig(blankRig(), 0.9).mouth).toBe(0)
    expect(crowLift(-1)).toBe(0)
    CROW.notes.forEach((note, n) => expect(crowLift(note + (n === 3 ? 0.28 : 0.08)), `note ${n}`).toBeGreaterThan(0.95))
    expect(crowLift(CROW.lasts + 0.1)).toBe(0)
  })

  it('grins when it is content: the pig\'s mouth is shut and turned up, and its last grunt in the wallow ends in the grin', () => {
    // Short of water, no grin; content, a full grin with the mouth shut, so the grin is what is drawn.
    for (const t of [0.5, 3, 7.7, 12]) {
      expect(pigRig(t, 0, null, 0, 1, false).grin).toBe(0)
      expect(pigRig(t, 1, null, 0, 1, false).grin).toBe(1)
      expect(pigRig(t, 1, null, 0, 1, false).mouth).toBeLessThan(0.06)
    }
    // Water in the wallow: the mouth is open for the grunts, and shut into a grin once the last one is out.
    const lasts = CELLS['bucket-pig'].lasts
    const grunt = pigRig(5, 1, 'bucket-pig', 2.1, lasts, false)
    expect(grunt.mouth).toBeGreaterThan(0.6)
    expect(grunt.grin).toBeLessThan(0.06)
    for (const t of [3.5, 3.55, lasts - 0.01]) {
      const still = pigRig(5, 1, 'bucket-pig', t, lasts, false)
      expect(still.grin, `at ${t}`).toBeGreaterThan(0.9)
      expect(still.mouth, `at ${t}`).toBeLessThan(0.06)
    }
  })

  it('spins the sun one whole turn on a touch', () => {
    expect(sunTurn(1)).toBeCloseTo(Math.PI * 2, 9)
    expect(sunTurn(0)).toBe(0)
    // It unwinds all the way, never turning back.
    let last = sunTurn(1)
    for (let spin = 0.99; spin >= 0; spin -= 0.01) { const now = sunTurn(spin); expect(now).toBeLessThanOrEqual(last); last = now }
  })

  it('looks after a thing that was taken away: the head goes to it with the mouth open, and the ears sink flat', () => {
    for (const up of [true, false]) {
      const early = leftRig(blankRig(), 0.2, up), late = leftRig(blankRig(), 0.7, up), over = leftRig(blankRig(), 1.4, up)
      expect(Math.sign(early.head)).toBe(up ? -1 : 1)
      expect(Math.abs(late.head)).toBeGreaterThan(0.3)
      expect(late.mouth).toBeGreaterThan(0.35)
      // Up at first, then flat.
      expect(early.earL).toBeLessThan(-0.3)
      expect(late.earL).toBeGreaterThan(0.3)
      expect(late.earR).toBeGreaterThan(0.3)
      expect(over).toEqual(blankRig())
    }
    // It is not the look round at a knock, which keeps the ears up.
    expect(turnedRig(blankRig(), 0.7, true).earL).toBeLessThan(0)
  })

  it('jumps a hen the haystack has walked into, from the moment she is touched', () => {
    expect(henExtras(blankHen(), -1, -1, -1, -1)).toEqual(blankHen())
    expect(henExtras(blankHen(), -1, -1, -1, 0).dy).toBe(0)
    expect(henExtras(blankHen(), -1, -1, -1, 0.22).dy).toBeLessThan(-30)
    expect(henExtras(blankHen(), -1, -1, -1, 0.22).wing).toBeGreaterThan(0.9)
    expect(henExtras(blankHen(), -1, -1, -1, 0.5).dy).toBe(0)
    // Nothing in the hens' own answer lifts the other two: only the touch does.
    for (const i of [0, 1, 2]) for (let t = 0; t < CELLS['fork-hens'].lasts; t += 0.05) expect(henRig(i, 4 + t, 'stand', 0, 0, 'fork-hens', t, CELLS['fork-hens'].lasts, false).dy).toBe(0)
  })
})
