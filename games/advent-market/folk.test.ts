import { describe, expect, it } from 'vitest'
import { Folk, NATURE, type Happening, type Hold, type Pose, type Sight } from './folk'
import { answerOf } from './natures'
import { WHO, type Who } from './hall'

const DT = 1 / 60
const REST: Sight = { x: 590, y: 424, size: 0, bare: true, bubbling: 0, dipping: false, walking: 0 }

/** Each fair-goer's pose over `seconds`, sampled every frame, as one row of numbers per channel. */
function watch(folk: Folk, seconds: number, sight: Sight = REST): Record<Who, Pose[]> {
  const seen = Object.fromEntries(WHO.map((who) => [who, [] as Pose[]])) as Record<Who, Pose[]>
  for (let t = 0; t < seconds; t += DT) {
    folk.step(DT, sight)
    for (const who of WHO) seen[who].push({ ...folk.pose(who) })
  }
  return seen
}

const BODY = ['dy', 'lean', 'squash', 'part', 'part2'] as const

/** How far apart two fair-goers' movements are: the largest gap, over time, between any channel of the body, each scaled to its own swing. */
function apart(a: Pose[], b: Pose[]): number {
  let most = 0
  for (const key of BODY) {
    const span = Math.max(1e-6, ...a.map((p) => Math.abs(p[key] - a[0][key])), ...b.map((p) => Math.abs(p[key] - b[0][key])))
    for (let i = 0; i < a.length; i++) most = Math.max(most, Math.abs(a[i][key] - a[0][key] - (b[i][key] - b[0][key])) / span)
  }
  return most
}

function moved(poses: Pose[]): number {
  let most = 0
  for (const key of BODY) for (const p of poses) most = Math.max(most, Math.abs(p[key] - poses[0][key]) * (key === 'dy' ? 0.05 : 1))
  return most
}

describe('the fair-goers', () => {
  it('are alive while they wait: each one moves, with nothing happening', () => {
    const seen = watch(new Folk(1), 12)
    for (const who of WHO) expect(moved(seen[who]), who).toBeGreaterThan(0.05)
  })

  it('share no movement: waiting, poked, or watching a coat go on, every two differ', () => {
    const cases: [string, (folk: Folk) => void][] = [
      ['waiting', () => {}],
      ['poked', (folk) => { for (const who of WHO) folk.poke(who) }],
      ...(['coat', 'gloop', 'blob', 'thin'] as Happening[]).map((what): [string, (folk: Folk) => void] => [what, (folk) => folk.react(what)]),
    ]
    for (const [name, cause] of cases) {
      const folk = new Folk(2)
      watch(folk, 0.5)
      cause(folk)
      const seen = watch(folk, 2.5)
      for (let i = 0; i < WHO.length; i++) for (let j = i + 1; j < WHO.length; j++) {
        expect(apart(seen[WHO[i]], seen[WHO[j]]), `${WHO[i]} and ${WHO[j]}, ${name}`).toBeGreaterThan(0.3)
      }
    }
  }, 60_000)

  it('answer a poke at once, each in its own body, and settle again', () => {
    for (const who of WHO) {
      const still = new Folk(3), poked = new Folk(3)
      watch(still, 1); watch(poked, 1)
      poked.poke(who)
      const a = watch(still, 0.2)[who], b = watch(poked, 0.2)[who]
      expect(apart(a, b), who).toBeGreaterThan(0.5)
      // Only the one who was poked answers.
      for (const other of WHO) if (other !== who) expect(still.pose(other)).toEqual(poked.pose(other))
    }
  })

  it('have natures that differ in weight and tempo', () => {
    const stiff = new Set(WHO.map((who) => NATURE[who].stiff)), gaze = new Set(WHO.map((who) => NATURE[who].gaze))
    expect(stiff.size).toBe(WHO.length)
    expect(gaze.size).toBe(WHO.length)
  })

  it('show their fixed tastes on their faces: she is glad of a fat candle and only curious at a wick, and the bundle leans away from a fat one', () => {
    const face = (sight: Partial<Sight>) => {
      const folk = new Folk(4)
      watch(folk, 3, { ...REST, ...sight })
      return { maker: { ...folk.pose('maker') }, bundle: { ...folk.pose('bundle') } }
    }
    const fat = face({ size: 2, bare: false }), thin = face({ size: 0, bare: false }), bare = face({})
    expect(fat.maker.mouth).toBeGreaterThan(0.8)
    // A thin candle and a bare wick leave her waiting with her brows up: no mouth is turned down at them.
    expect(thin.maker.mouth).toBeGreaterThan(0)
    expect(thin.maker.mouth).toBeLessThan(0.4)
    expect(bare.maker.mouth).toBeGreaterThan(0)
    expect(bare.maker.brow).toBeGreaterThan(thin.maker.brow)
    expect(fat.bundle.lean).toBeGreaterThan(thin.bundle.lean + 0.05)
    expect(thin.bundle.part2).toBeGreaterThan(fat.bundle.part2)
  })

  it('follow the candle with their eyes, and blink', () => {
    const folk = new Folk(5)
    const left = watch(folk, 2, { ...REST, x: 0, y: 300 })
    const lookLeft = folk.pose('baker').lookX
    watch(folk, 2, { ...REST, x: 1180, y: 300 })
    expect(lookLeft).toBeLessThan(-0.5)
    expect(folk.pose('baker').lookX).toBeGreaterThan(0.2)
    const long = watch(folk, 9)
    for (const who of WHO) expect(Math.max(...long[who].map((p) => p.lid), ...left[who].map((p) => p.lid)), who).toBeGreaterThan(0.8)
  })

  it('never play the same habit twice running', () => {
    const folk = new Folk(6)
    const runs: Record<Who, number[]> = { tuba: [], maker: [], baker: [], bundle: [], goat: [] }
    const last: Record<Who, number> = { tuba: -1, maker: -1, baker: -1, bundle: -1, goat: -1 }
    for (let t = 0; t < 90; t += DT) {
      folk.step(DT, REST)
      for (const who of WHO) {
        const habit = folk.habitOf(who)
        if (habit !== last[who] && habit >= 0) runs[who].push(habit)
        last[who] = habit
      }
    }
    for (const who of WHO) {
      expect(runs[who].length, who).toBeGreaterThan(5)
      expect(new Set(runs[who]).size, who).toBe(3)
      for (let i = 1; i < runs[who].length; i++) expect(runs[who][i], who).not.toBe(runs[who][i - 1])
    }
  }, 60_000)

  it('do nothing while no time passes', () => {
    const folk = new Folk(7)
    watch(folk, 1)
    const before = WHO.map((who) => ({ ...folk.pose(who) }))
    folk.step(0, REST)
    expect(WHO.map((who) => ({ ...folk.pose(who) }))).toEqual(before)
  })

  it('stand each in its own way with a thing it likes, a thing it dislikes and a thing it has no taste for', () => {
    const stand = (who: Who, hold: Hold): string => {
      const folk = new Folk(8)
      folk.hold(who, hold)
      folk.settle(REST)
      return JSON.stringify(folk.pose(who))
    }
    for (const who of WHO) {
      const poses = new Set((['plain', 'like', 'dislike'] as const).map((taste) => stand(who, { craft: 'wreath', size: 1, taste })))
      expect(poses.size, who).toBe(3)
    }
    // The thing itself is drawn in the hand, on the hat or in the bell; those whose body carries it stand differently for it too.
    for (const who of ['maker', 'tuba', 'bundle'] as const) expect(stand(who, { craft: 'wreath', size: 1, taste: 'plain' }), who).not.toBe(stand(who, null))
  })

  it('walk each with a gait of its own', () => {
    const folk = new Folk(9), still = new Folk(9)
    const walking = watch(folk, 1.2, { ...REST, walking: 1 }), standing = watch(still, 1.2)
    for (const who of WHO) expect(apart(walking[who], standing[who]), who).toBeGreaterThan(0.3)
    for (let i = 0; i < WHO.length; i++) for (let j = i + 1; j < WHO.length; j++) expect(apart(walking[WHO[i]], walking[WHO[j]]), `${WHO[i]} and ${WHO[j]}`).toBeGreaterThan(0.3)
  })

  it('settle as a load finds them: still, at once, wherever they were', () => {
    const folk = new Folk(10), fresh = new Folk(11)
    folk.poke('bundle')
    folk.kick('baker', { lean: 4, squash: 3 })
    watch(folk, 0.4)
    folk.settle(REST)
    fresh.settle(REST)
    for (const who of WHO) expect(folk.pose(who), who).toEqual(fresh.pose(who))
  })

  it('answer what happens at the bench and never the child: no answer is a nod, a clap or a shake of the head', () => {
    // A nod is the head going down and up: a kick to the body alone, down. Her answer to a coat is her fist and her weight.
    const coat = answerOf('maker', 'coat')!
    expect(Object.keys(coat).sort()).toEqual(['lean', 'part'])
    // The tuba player is stern by his brows: his mouth is a straight line with nothing made, and a large thing only eases it.
    const face = (sight: Partial<Sight>) => { const folk = new Folk(12); folk.settle({ ...REST, ...sight }); return folk.pose('tuba') }
    expect(face({}).mouth).toBe(0)
    expect(face({}).brow).toBeLessThan(-0.3)
    expect(face({ size: 2, bare: false }).mouth).toBeGreaterThan(0)
  })

  it('turn no mouth down before the child has touched anything: at every size of what is in work, made or bare, and through every habit', () => {
    for (const sight of [REST, { ...REST, size: 0, bare: false }, { ...REST, size: 1, bare: false }, { ...REST, size: 2, bare: false }] as Sight[]) {
      for (const seed of [1, 7, 31]) {
        const seen = watch(new Folk(seed), 40, sight)
        for (const who of WHO) expect(Math.min(...seen[who].map((pose) => pose.mouth)), `${who}, size ${sight.size}, bare ${sight.bare}`).toBeGreaterThan(-1e-6)
      }
    }
  })

  it('has the tuba player tap his empty bell in one of his habits, and leave it be when the bell holds a thing', () => {
    const swing = (hold: Hold) => {
      const folk = new Folk(5)
      if (hold) folk.hold('tuba', hold)
      const poses = watch(folk, 60).tuba
      return { bell: Math.max(...poses.map((p) => p.part2)) - Math.min(...poses.map((p) => p.part2)) }
    }
    const empty = swing(null), full = swing({ craft: 'star', size: 1, taste: 'plain' })
    expect(empty.bell).toBeGreaterThan(0.3)
    expect(full.bell).toBeLessThan(empty.bell / 2)
  })
})
