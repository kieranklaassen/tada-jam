import { describe, expect, it } from 'vitest'
import { Cast, LIMITS, POKES, type Direction, type Held } from './cast'
import { LEDGE, ROLES, type Clip, type Key } from './castClips'
import { REACTIONS, type Occasion } from './consequence'
import type { Pose } from './motion'
import { FIGURE, FIGURES_OF, type Figure } from './stage'
import { ANIMALS, type Animal } from './tastes'

const FIGURES = Object.keys(FIGURE) as Figure[]
const DIRECTIONS: readonly Direction[] = ['walk', 'sniff', 'bite', 'carry']
const REST: Pose = { dx: 0, dy: 0, turn: 0, sx: 1, sy: 1, frame: 0 }
const FRAME = 1 / 60
/** What each occasion is voiced with. */
const SAYS: Record<Occasion, string> = { wanted: 'yes', secret: 'yes', hated: 'no', crumb: 'no', shape: 'no', crust: 'no', seeds: 'no', nothing: 'huh', dust: 'huh', wet: 'huh', 'loose-seeds': 'huh', raw: 'huh' }
/** Every name the cast may sound: three voices and a footfall for each animal, and the four sounds of idle life. */
const VOICES = [...ANIMALS.flatMap((animal) => ['yes', 'no', 'huh', 'step'].map((what) => `${animal}-${what}`)), 'goat-tock', 'sparrow-chirp', 'chick-peep', 'duck-step']
/** Every reaction that has a name: 68 of them. */
const NAMED = ANIMALS.flatMap((animal) => (Object.keys(REACTIONS[animal]) as Occasion[]).map((occasion) => ({ animal, occasion })))

/** A small stream of the test's own, so what is thrown at the cast is the same every run. */
function stream(seed: number): () => number {
  let state = seed >>> 0
  return () => (state = (Math.imul(state, 1664525) + 1013904223) >>> 0) / 4294967296
}

const staged = (seed: number, animals: readonly Animal[] = ANIMALS): Cast => { const cast = new Cast(seed); cast.setStage(animals); return cast }
const all = (cast: Cast): Pose[] => FIGURES.map((figure) => ({ ...cast.pose(figure) }))
/** One pose as numbers on a common scale, so a slide, a turn and a squash weigh about the same. */
const weighed = (p: Pose): number[] => [p.dx / 20, p.dy / 20, p.turn / 0.15, (p.sx - 1) / 0.15, (p.sy - 1) / 0.15, p.frame / 2]
/** The thing's place, measured from the ledge on the same kind of scale; nothing held counts as lying on the ledge. */
const carried = (held: Readonly<Held> | null): number[] => (held ? [(held.u - LEDGE.u) / 0.5, (held.v - LEDGE.v) / 0.5, held.turn / 1.5, (held.scale - 1) / 0.3] : [0, 0, 0, 0])
const apart = (a: Pose, b: Pose): number => Math.max(...weighed(a).map((v, i) => Math.abs(v - weighed(b)[i])))
/** How alike two curves are, whatever their size: 1 is the same curve or a scaled copy of it. */
function alike(a: number[], b: number[]): number {
  let ab = 0, aa = 0, bb = 0
  for (let i = 0; i < Math.max(a.length, b.length); i++) { const x = a[i] ?? 0, y = b[i] ?? 0; ab += x * y; aa += x * x; bb += y * y }
  return Math.abs(ab) / Math.sqrt(aa * bb)
}

/** One reaction played alone from a calm start: what was sampled of it, frame by frame, and what was heard. */
function played(animal: Animal, occasion: Occasion) {
  const cast = staged(5, [animal]), main = FIGURES_OF[animal][0]
  const length = cast.react(animal, occasion), curve: number[] = [], held: (Held | null)[] = [], sounds: string[] = [...cast.sounds()]
  let moved = 0, busy = true
  for (let i = 1; i * FRAME < length - 1e-6; i++) {
    cast.step(FRAME)
    const now = cast.holds(animal)
    held.push(now ? { ...now } : null)
    curve.push(...weighed(cast.pose(main)), ...carried(now))
    moved = Math.max(moved, apart(cast.pose(main), REST))
    busy &&= cast.busy(animal)
    sounds.push(...cast.sounds())
  }
  // The last instant of the clip: every figure is all but home.
  const home = Math.max(...FIGURES_OF[animal].map((figure) => apart(cast.pose(figure), REST)))
  return { cast, length, curve, held, sounds, moved, busy, home }
}

/** Every track of a clip, with its name, for checking the data itself. */
function tracks(clip: Clip): [string, readonly Key[]][] {
  const out: [string, readonly Key[]][] = []
  clip.figures.forEach((part, i) => { for (const channel of ['dx', 'dy', 'turn', 'sx', 'sy'] as const) if (part?.[channel]) out.push([`figure ${i} ${channel}`, part[channel]]) })
  for (const channel of ['u', 'v', 'turn', 'scale'] as const) if (clip.held?.[channel]) out.push([`held ${channel}`, clip.held[channel]])
  return out
}
const clipsOf = (animal: Animal): Clip[] => { const role = ROLES[animal]; return [...role.habits.flatMap((habit) => habit.clips), ...role.pokes, ...Object.values(role.reactions), ...Object.values(role.directions)] }

describe('the clips, as data', () => {
  it('keeps every track in time order and inside its clip, and every voice inside it too', () => {
    const wrong: string[] = []
    for (const animal of ANIMALS) for (const clip of clipsOf(animal)) {
      const label = `${animal} ${clip.name}`
      for (const [name, keys] of tracks(clip)) {
        keys.forEach(([at, to], i) => { if (!Number.isFinite(to) || at < 0 || at > clip.length + 1e-9 || (i > 0 && at <= keys[i - 1][0])) wrong.push(`${label}: ${name} at ${at}`) })
      }
      clip.figures.forEach((part, i) => part?.open?.forEach(([from, to], n) => { if (!(from < to) || to > clip.length || (n > 0 && from < part.open![n - 1][1])) wrong.push(`${label}: figure ${i} open ${from}`) }))
      clip.voices.forEach(([at], i) => { if (at < 0 || at >= clip.length || (i > 0 && at < clip.voices[i - 1][0])) wrong.push(`${label}: voice at ${at}`) })
      if (clip.figures.length > FIGURES_OF[animal].length) wrong.push(`${label}: a part for a figure that is not there`)
    }
    expect(wrong).toEqual([])
  })

  it('has a clip for every reaction that has a name, under that name, and nothing else', () => {
    expect(NAMED.length).toBe(68)
    for (const animal of ANIMALS) expect(Object.keys(ROLES[animal].reactions).sort(), animal).toEqual(Object.keys(REACTIONS[animal]).sort())
    for (const { animal, occasion } of NAMED) expect(ROLES[animal].reactions[occasion]!.name).toBe(REACTIONS[animal][occasion])
  })
})

describe('the cast', () => {
  it('is the same for the same seed and the same calls, and a different idle life for another seed', () => {
    const life = (seed: number) => { const cast = staged(seed), poses: Pose[][] = [], sounds: string[] = []; for (let i = 0; i < 1200; i++) { cast.step(FRAME); poses.push(all(cast)); sounds.push(...cast.sounds()) } return { poses, sounds } }
    expect(life(11)).toEqual(life(11))
    expect(life(11).poses).not.toEqual(life(12).poses)
  })

  it('has every figure exactly at rest at time 0, and nothing held or heard', () => {
    const cast = staged(3)
    for (const figure of FIGURES) expect(cast.pose(figure), figure).toEqual(REST)
    for (const animal of ANIMALS) { expect(cast.holds(animal), animal).toBeNull(); expect(cast.busy(animal), animal).toBe(false) }
    expect(cast.calm).toBe(true)
    expect(cast.sounds()).toEqual([])
  })

  it('does not care how long a frame is: one step, a hundred and twenty, or uneven ones', () => {
    const run = (cut: (seconds: number) => number[]) => {
      const cast = staged(5), sounds: string[] = [], poses: Pose[][] = [], held: (Held | null)[][] = []
      const go = (seconds: number) => {
        for (const part of cut(seconds)) cast.step(part)
        poses.push(all(cast)); sounds.push(...cast.sounds()); held.push(ANIMALS.map((animal) => { const now = cast.holds(animal); return now && { ...now } }))
      }
      cast.react('goat', 'hated'); cast.poke('bear'); cast.direct('duck', 'walk'); go(1)
      cast.react('hen', 'secret'); cast.direct('crow', 'sniff'); cast.react('mole', 'wanted'); go(1)
      cast.direct('duck', 'carry'); cast.poke('sparrows'); cast.react('dachshund', 'raw'); go(1)
      cast.rest('duck'); cast.direct('mole', 'carry'); go(2); go(2)
      return { poses, sounds, held }
    }
    const next = stream(9)
    const uneven = (seconds: number) => {
      const parts: number[] = []
      let left = seconds
      while (left > 0.1) { const part = 0.001 + 0.09 * next(); parts.push(part); left -= part }
      return [...parts, left]
    }
    const whole = run((seconds) => [seconds]), even = run((seconds) => Array<number>(120).fill(seconds / 120)), ragged = run(uneven)
    expect(whole.sounds.length).toBeGreaterThan(8)
    for (const other of [even, ragged]) {
      expect(other.sounds).toEqual(whole.sounds)
      other.poses.forEach((poses, i) => poses.forEach((pose, j) => expect(apart(pose, whole.poses[i][j]), `${FIGURES[j]} at beat ${i}`).toBeLessThan(1e-6)))
      other.held.forEach((row, i) => row.forEach((held, j) => {
        expect(held === null, `${ANIMALS[j]} at beat ${i}`).toBe(whole.held[i][j] === null)
        carried(held).forEach((v, k) => expect(Math.abs(v - carried(whole.held[i][j])[k])).toBeLessThan(1e-6))
      }))
    }
  })

  it('keeps every pose finite, modest and on a printed state through two minutes of everything, and sounds only its own names', () => {
    const cast = staged(21), next = stream(22), wrong: string[] = [], sounds: string[] = []
    const one = <T,>(of: readonly T[]): T => of[Math.floor(next() * of.length)]
    for (let i = 0; i < 120 * 60; i++) {
      if (next() < 0.03) cast.poke(one(ANIMALS))
      if (next() < 0.02) { const animal = one(ANIMALS); cast.react(animal, one(Object.keys(REACTIONS[animal]) as Occasion[])) }
      if (next() < 0.01) cast.direct(one(ANIMALS), one(DIRECTIONS))
      if (next() < 0.02) cast.rest(one(ANIMALS))
      cast.step(FRAME)
      for (const figure of FIGURES) {
        const pose = cast.pose(figure)
        const fine = Object.values(pose).every(Number.isFinite) && Math.abs(pose.dx) <= 60 && Math.abs(pose.dy) <= 60 && Math.abs(pose.turn) <= 0.35
          && Math.min(pose.sx, pose.sy) >= 0.75 && Math.max(pose.sx, pose.sy) <= 1.3 && (pose.frame === 0 || pose.frame === 1)
        if (!fine && wrong.length < 5) wrong.push(`${figure} ${JSON.stringify(pose)}`)
      }
      for (const animal of ANIMALS) {
        const held = cast.holds(animal)
        if (held && !(Object.values(held).every(Number.isFinite) && held.u > -1 && held.u < 2 && held.v > -1 && held.v < 1.5 && held.scale >= 0.2 && held.scale <= 1.3) && wrong.length < 5) wrong.push(`${animal} holds ${JSON.stringify(held)}`)
      }
      sounds.push(...cast.sounds())
    }
    expect(wrong).toEqual([])
    expect(LIMITS).toEqual({ slide: 60, turn: 0.35, small: 0.75, big: 1.3 })
    expect([...new Set(sounds)].filter((name) => !VOICES.includes(name))).toEqual([])
    expect(new Set(sounds).size).toBeGreaterThan(28)
  })

  it('plays every named reaction at its stated length, voiced once, with the thing held as the occasion says, and brings everyone home', () => {
    const wrong: string[] = []
    const check = (fine: boolean, what: string) => { if (!fine) wrong.push(what) }
    for (const { animal, occasion } of NAMED) {
      const label = `${animal} ${occasion}`, { cast, length, held, sounds, moved, busy, home } = played(animal, occasion), last = held[held.length - 1]
      const [least, most] = occasion === 'wanted' ? [2.2, 3.4] : occasion === 'secret' ? [4, 5.5] : [1.2, 1.9]
      check(length >= least && length <= most, `${label}: ${length} s long`)
      check(busy && moved > 0.3, `${label}: busy ${busy}, moved ${moved}`)
      check(home < 0.12, `${label}: ${home} from rest as it ends`)
      // Its voice once, at the thing; and no idle sound in the middle of it.
      check(sounds.join() === `${animal}-${SAYS[occasion]}`, `${label}: heard ${sounds.join()}`)
      if (occasion === 'secret') check(held.every((now) => now === null), `${label}: holds something`)
      else check(held.every((now) => now !== null), `${label}: lets go in the middle`)
      cast.step(0.1)
      check(!cast.busy(animal) && cast.calm, `${label}: still busy after its end`)
      if (occasion === 'wanted') {
        // The thing stays with the animal, away from the ledge and in one place, for as long as the game leaves it there.
        const kept = cast.holds(animal)
        cast.step(5)
        check(kept !== null && Math.hypot(kept.u - LEDGE.u, kept.v - LEDGE.v) > 0.1 && JSON.stringify(cast.holds(animal)) === JSON.stringify(kept), `${label}: kept at ${JSON.stringify(kept)}`)
        check(cast.sounds().length === 0, `${label}: idle sounds with the thing in its arms`)
        cast.rest(animal)
        check(cast.holds(animal) === null, `${label}: still held after rest`)
      } else {
        check(cast.holds(animal) === null, `${label}: still held after its end`)
        if (occasion !== 'secret') check(last !== null && Math.abs(last.u - 0.7) < 0.08 && Math.abs(last.v - 1.02) < 0.08, `${label}: ends at ${JSON.stringify(last)}`)
      }
      cast.step(1)
      check(FIGURES_OF[animal].every((figure) => apart(cast.pose(figure), REST) < 3), `${label}: not back to idle life`)
    }
    expect(wrong).toEqual([])
  })

  it('gives no two animals one curve for the same occasion, and no animal one curve for two occasions', () => {
    const curves = NAMED.map((each) => ({ ...each, curve: played(each.animal, each.occasion).curve }))
    const close: string[] = []
    let closest = 0, pairs = 0
    for (let i = 0; i < curves.length; i++) for (let j = i + 1; j < curves.length; j++) {
      const a = curves[i], b = curves[j]
      if (a.animal !== b.animal && a.occasion !== b.occasion) continue
      const likeness = alike(a.curve, b.curve)
      pairs++
      closest = Math.max(closest, likeness)
      if (likeness >= 0.98) close.push(`${a.animal} ${a.occasion} and ${b.animal} ${b.occasion}: ${likeness.toFixed(3)}`)
    }
    expect(close).toEqual([])
    // Eight or nine animals to an occasion and eight to ten occasions to an animal: some 470 pairs.
    expect(pairs).toBeGreaterThan(450)
    expect(closest).toBeGreaterThan(0)
    expect(closest).toBeLessThan(0.98)
  })

  it('gives each of the eight its own idle life, and each bird and chick its own beat', () => {
    const cast = staged(41), lives = new Map<Figure, number[]>(FIGURES.map((figure) => [figure, []])), sounds = new Set<string>()
    for (let i = 0; i < 60 * 60; i++) {
      cast.step(FRAME)
      for (const figure of FIGURES) lives.get(figure)!.push(...weighed(cast.pose(figure)))
      for (const name of cast.sounds()) sounds.add(name)
      if (i % 600 === 0) expect(cast.calm).toBe(true)
    }
    for (const figure of FIGURES) expect(Math.max(...lives.get(figure)!.map(Math.abs)), figure).toBeGreaterThan(0.3)
    for (let i = 0; i < FIGURES.length; i++) for (let j = i + 1; j < FIGURES.length; j++) expect(alike(lives.get(FIGURES[i])!, lives.get(FIGURES[j])!), `${FIGURES[i]} and ${FIGURES[j]}`).toBeLessThan(0.6)
    expect([...sounds].sort()).toEqual(['chick-peep', 'duck-step', 'goat-tock', 'sparrow-chirp'])
  })

  it('keeps the goat knocking: two tocks in any twelve seconds on stage, whatever the others are up to', () => {
    const tocks = (seed: number, animals: readonly Animal[], meddle?: (cast: Cast) => void): number[] => {
      const cast = staged(seed, animals), heard: number[] = []
      for (let i = 0; i < 120 * 60; i++) { meddle?.(cast); cast.step(FRAME); for (const name of cast.sounds()) if (name === 'goat-tock') heard.push(i) }
      return heard
    }
    for (const seed of [1, 2, 61]) {
      const alone = tocks(seed, ['goat'])
      for (let from = 0; from <= 108 * 60; from += 20) expect(alone.filter((at) => at >= from && at < from + 12 * 60).length, `seed ${seed}, from ${from / 60} s`).toBeGreaterThanOrEqual(2)
      const next = stream(seed), others = ANIMALS.filter((animal) => animal !== 'goat')
      const bothered = tocks(seed, ANIMALS, (cast) => {
        if (next() < 0.05) cast.poke(others[Math.floor(next() * others.length)])
        if (next() < 0.02) cast.react(others[Math.floor(next() * others.length)], 'nothing')
      })
      expect(bothered).toEqual(alone)
    }
  })

  it('leaves those who are not on stage silent and at rest, whatever they are told', () => {
    const cast = staged(51, ['goat'])
    expect(cast.react('bear', 'wanted')).toBe(0)
    expect(cast.direct('hen', 'walk')).toBe(0)
    cast.poke('duck')
    const heard: string[] = []
    for (let i = 0; i < 30 * 60; i++) { cast.step(FRAME); heard.push(...cast.sounds()) }
    for (const figure of FIGURES) if (figure !== 'goat') expect(cast.pose(figure), figure).toEqual(REST)
    for (const animal of ANIMALS) if (animal !== 'goat') { expect(cast.busy(animal)).toBe(false); expect(cast.holds(animal)).toBeNull() }
    expect(new Set(heard)).toEqual(new Set(['goat-tock']))
    // The same set again changes nothing; a new one starts the newcomer from rest and stops the one who left.
    const before = all(cast)
    cast.setStage(['goat'])
    expect(all(cast)).toEqual(before)
    cast.react('goat', 'wanted'); cast.step(1)
    cast.setStage(['mole'])
    expect(cast.pose('goat')).toEqual(REST)
    expect(cast.pose('mole')).toEqual(REST)
    expect(cast.holds('goat')).toBeNull()
    expect(cast.calm).toBe(true)
  })

  it('never answers a poke the same way twice running, uses every answer, and says huh each time', () => {
    for (const animal of ANIMALS) {
      const cast = staged(61, [animal]), names: string[] = [], twin = staged(61, [animal])
      expect(POKES[animal].length, animal).toBeGreaterThanOrEqual(2)
      for (let i = 0; i < 30; i++) {
        names.push(cast.poke(animal))
        expect(cast.calm).toBe(false)
        expect(cast.busy(animal)).toBe(false)
        let moved = 0, said: string[] = [...cast.sounds()]
        for (let n = 0; n < 90; n++) { cast.step(FRAME); twin.step(FRAME); twin.sounds(); said = [...said, ...cast.sounds()]; for (const figure of FIGURES_OF[animal]) moved = Math.max(moved, apart(cast.pose(figure), twin.pose(figure))) }
        expect(said.filter((name) => name === `${animal}-huh`).length, `${animal} poke ${i}`).toBe(1)
        expect(moved, `${animal} ${names[i]}`).toBeGreaterThan(0.2)
        // It was a small answer: after it, only the same idle life as if no one had touched it.
        expect(cast.calm).toBe(true)
        for (const figure of FIGURES_OF[animal]) expect(apart(cast.pose(figure), twin.pose(figure)), `${animal} ${names[i]}`).toBeLessThan(1e-9)
      }
      for (let i = 1; i < names.length; i++) expect(names[i], `${animal} poke ${i}`).not.toBe(names[i - 1])
      expect([...new Set(names)].sort(), animal).toEqual([...POKES[animal]].sort())
    }
  })

  it('plays the plain beats of an ending: a sniff, a bite, and gaits that go on until told to rest', () => {
    const gaits: number[][] = []
    for (const animal of ANIMALS) {
      const cast = staged(71, [animal]), main = FIGURES_OF[animal][0], [mu, mv] = FIGURE[main].mouth
      // A sniff: the nose comes down toward the ledge, where the thing lies.
      expect(cast.direct(animal, 'sniff')).toBe(0.7)
      let down = 0
      for (let i = 0; i < 41; i++) { cast.step(FRAME); down = Math.max(down, cast.pose(main).turn); expect(cast.holds(animal)).toEqual(LEDGE) }
      expect(down, animal).toBeGreaterThan(0.05)
      cast.step(0.05)
      expect(cast.busy(animal)).toBe(false)
      // A bite: mouth open, the thing at the mouth, a chomp, mouth shut.
      expect(cast.direct(animal, 'bite')).toBe(0.9)
      const frames: number[] = []
      let nearest = 9, squash = 1
      for (let i = 0; i < 53; i++) {
        cast.step(FRAME)
        const held = cast.holds(animal)!, pose = cast.pose(main)
        frames.push(pose.frame); nearest = Math.min(nearest, Math.hypot(held.u - mu, held.v - mv)); squash = Math.min(squash, pose.sy)
      }
      expect(frames.join('').replace(/0+/g, '0').replace(/1+/g, '1'), animal).toBe('010')
      expect(nearest, animal).toBeLessThan(0.02)
      expect(squash, animal).toBeLessThan(0.97)
      cast.step(0.05); cast.sounds()
      // The gaits: they loop, with footfalls and no more than four a second; only the carry holds the thing.
      for (const gait of ['walk', 'carry'] as const) {
        expect(cast.direct(animal, gait)).toBe(Infinity)
        const curve: number[] = []
        let steps = 0, moved = 0
        for (let i = 0; i < 10 * 60; i++) {
          cast.step(FRAME)
          if (i < 120) curve.push(...weighed(cast.pose(main)))
          moved = Math.max(moved, apart(cast.pose(main), REST))
          for (const name of cast.sounds()) { expect(name).toBe(`${animal}-step`); steps++ }
          if (i % 60 === 0) { expect(cast.busy(animal)).toBe(true); expect(cast.holds(animal) === null, `${animal} ${gait}`).toBe(gait === 'walk') }
        }
        expect(steps, `${animal} ${gait}`).toBeGreaterThanOrEqual(8)
        expect(steps, `${animal} ${gait}`).toBeLessThanOrEqual(40)
        expect(moved, `${animal} ${gait}`).toBeGreaterThan(0.25)
        if (gait === 'walk') gaits.push(curve)
        cast.rest(animal); cast.step(0.3)
        expect(cast.busy(animal)).toBe(false)
        expect(cast.calm).toBe(true)
        expect(cast.holds(animal)).toBeNull()
        expect(cast.sounds()).toEqual([])
      }
    }
    // No two animals walk alike.
    for (let i = 0; i < gaits.length; i++) for (let j = i + 1; j < gaits.length; j++) expect(alike(gaits[i], gaits[j]), `${ANIMALS[i]} and ${ANIMALS[j]}`).toBeLessThan(0.9)
  })

  it('hands the thing from one clip to the next without a jump', () => {
    const cast = staged(81, ['duck'])
    cast.react('duck', 'wanted'); cast.step(3)
    const worn = { ...cast.holds('duck')! }
    cast.direct('duck', 'carry')
    let last = worn, furthest = 0
    for (let i = 0; i < 60; i++) { cast.step(FRAME); const now = { ...cast.holds('duck')! }; furthest = Math.max(furthest, Math.hypot(now.u - last.u, now.v - last.v)); last = now }
    // The pancake is a hat, and it leaves as a hat.
    expect(furthest).toBeLessThan(0.05)
    expect(Math.hypot(last.u - worn.u, last.v - worn.v)).toBeLessThan(0.05)
  })
})
