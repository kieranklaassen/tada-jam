import { describe, expect, it } from 'vitest'
import { AT_EASE, BUILD, CrewDirector, IDLES, REACTS, crewPose, type CrewAct, type CrewId, type CrewPose } from './crew'
import { stream } from './look'

const flat = (pose: CrewPose) => [pose.lookX, pose.lookY, pose.lids, pose.brow, pose.mouth, pose.gape, pose.lean * 4, pose.sag * 4, pose.hop * 2, pose.raise, pose.cover, pose.own]
const actsOf = (who: CrewId) => [...Object.keys(IDLES[who]), ...Object.keys(REACTS[who])] as CrewAct[]
const trace = (who: CrewId, act: CrewAct) => Array.from({ length: 61 }, (_, i) => flat(crewPose(who, act, i / 60)))
const apart = (a: number[][], b: number[][]) => { let most = 0; a.forEach((row, t) => row.forEach((v, c) => { most = Math.max(most, Math.abs(v - b[t][c])) })); return most }
/** How many separate times a channel rises past a level over an act. */
const rises = (who: CrewId, act: CrewAct, read: (pose: CrewPose) => number, level: number) => {
  const at: number[] = []
  let was = false
  for (let i = 0; i <= 400; i++) { const now = read(crewPose(who, act, i / 400)) > level; if (now && !was) at.push(i / 400); was = now }
  return at
}

describe('the crew at the foot of the sheet', () => {
  it('every act of each begins and ends at ease, and is plainly a move in between', () => {
    for (const who of ['beaver', 'mole'] as const) for (const act of actsOf(who)) {
      expect(flat(crewPose(who, act, 0)).every((v) => Math.abs(v) < 1e-9), `${who} ${act} begins`).toBe(true)
      expect(flat(crewPose(who, act, 1)).every((v) => Math.abs(v) < 1e-9), `${who} ${act} ends`).toBe(true)
      expect(apart(trace(who, act), trace(who, 'rest')), `${who} ${act}`).toBeGreaterThan(0.25)
    }
    expect(crewPose('beaver', 'rest', 0.5)).toEqual(AT_EASE)
  })

  it('no two acts are the same move, in one of them or between the two, and no two take the same time', () => {
    const all = (['beaver', 'mole'] as const).flatMap((who) => actsOf(who).map((act) => ({ who, act, shape: trace(who, act) })))
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) expect(apart(all[i].shape, all[j].shape), `${all[i].who} ${all[i].act} and ${all[j].who} ${all[j].act}`).toBeGreaterThan(0.3)
    const spans = [...Object.values(IDLES.beaver), ...Object.values(IDLES.mole), ...Object.values(REACTS.beaver), ...Object.values(REACTS.mole)]
    expect(new Set(spans).size).toBe(spans.length)
    // The beaver is the quick one: every one of its idle acts is shorter than every one of the mole's.
    expect(Math.max(...Object.values(IDLES.beaver))).toBeLessThan(Math.min(...Object.values(IDLES.mole)))
  })

  it('the beaver cannot look for as long as a vehicle is on the road: hand over its eyes, teeth clenched, one eye not quite shut', () => {
    const beaver = new CrewDirector('beaver', [3, -2], stream(1))
    beaver.brace(true)
    for (let i = 0; i < 60; i++) beaver.step(1 / 60, [12, 6])
    for (let i = 0; i < 60 * 12; i++) {
      const pose = beaver.step(1 / 60, [12, 6])
      expect(beaver.act).toBe('brace')
      expect(pose.cover).toBeGreaterThan(0.95)
      expect(pose.mouth).toBeLessThan(-0.9)
      expect(pose.brow).toBeLessThan(-0.9)
      expect(pose.lids).toBeGreaterThan(0.4)
    }
    expect(beaver.busy).toBe(true)
    beaver.brace(false)
    expect(beaver.act).toBe('rest')
    expect(beaver.step(1 / 60, null).cover).toBe(0)
    // The mole does not mind a vehicle on the road.
    const mole = new CrewDirector('mole', [5, -2], stream(1))
    mole.brace(true)
    expect(mole.act).toBe('rest')
  })

  it('the mole measures everything twice, the second time with the rule the other way up', () => {
    for (const act of ['measure-twice', 'laid', 'crossed', 'splashed'] as const) {
      const up = rises('mole', act, (pose) => pose.raise, 0.7)
      expect(up, act).toHaveLength(2)
      expect(crewPose('mole', act, up[0] + 0.03).own, `${act} first`).toBeLessThan(0.3)
      expect(crewPose('mole', act, up[1] + 0.03).own, `${act} second`).toBeGreaterThan(0.7)
    }
    // Poked, it measures the rule against itself, and that twice too.
    expect(rises('mole', 'poked', (pose) => pose.raise, 0.4)).toHaveLength(2)
    // The beaver's tail comes down twice when it taps, and once when it starts.
    expect(rises('beaver', 'tail-tap', (pose) => pose.own, 0.6)).toHaveLength(2)
    expect(rises('beaver', 'flinch', (pose) => pose.own, 0.6)).toHaveLength(1)
  })

  it('their eyes go to where the work is and come back, and never past the edge of the eye', () => {
    for (const who of ['beaver', 'mole'] as const) {
      const one = new CrewDirector(who, [3, -2], stream(4))
      // Kept at rest by reacting to nothing: a rest lasts at least a second and a half.
      const pose = one.step(0.01, null)
      for (let i = 0; i < 40; i++) one.step(1 / 60, [9, 6])
      if (one.act === 'rest') { expect(pose.lookX).toBeGreaterThan(0.5); expect(pose.lookY).toBeGreaterThan(0.5) }
      for (let i = 0; i < 60 * 40; i++) {
        const now = one.step(1 / 60, i % 600 < 300 ? [90, -40] : null)
        expect(Math.abs(now.lookX)).toBeLessThanOrEqual(1); expect(Math.abs(now.lookY)).toBeLessThanOrEqual(1)
        expect(now.lids).toBeGreaterThanOrEqual(0); expect(now.lids).toBeLessThanOrEqual(2)
      }
    }
  })

  it('passes the time with an act of its own, then rests, never the same act twice running; what happens on the sheet takes over at once', () => {
    for (const who of ['beaver', 'mole'] as const) {
      const one = new CrewDirector(who, [3, -2], stream(9))
      const seen: string[] = []
      let blinked = false
      for (let i = 0; i < 60 * 120; i++) {
        const pose = one.step(1 / 60, null)
        if (one.act !== 'rest' && seen[seen.length - 1] !== one.act) seen.push(one.act)
        if (one.act === 'rest' && pose.lids > 0.9) blinked = true
      }
      expect(new Set(seen).size, who).toBe(Object.keys(IDLES[who]).length)
      for (let i = 1; i < seen.length; i++) expect(seen[i]).not.toBe(seen[i - 1])
      expect(blinked).toBe(true)
      expect(one.busy).toBe(false)
      one.react('poked')
      expect(one.act).toBe('poked')
      expect(one.busy).toBe(true)
      for (let i = 0; i < 60 * 3; i++) one.step(1 / 60, null)
      expect(one.busy).toBe(false)
    }
    // A move that is the other one's is not taken up.
    const beaver = new CrewDirector('beaver', [3, -2], stream(9))
    beaver.react('laid')
    expect(beaver.act).toBe('rest')
  })

  it('is large enough for a face: the beaver stands well over two cells tall, the mole lower and as wide', () => {
    expect(BUILD.beaver.tall).toBeGreaterThan(2.2)
    expect(BUILD.mole.tall).toBeLessThan(BUILD.beaver.tall - 0.5)
    expect(BUILD.beaver.eyes).toBeLessThan(BUILD.beaver.tall)
  })
})
