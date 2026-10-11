import { describe, expect, it } from 'vitest'
import { JOINTS } from './art'
import { TIERS } from './config'
import { BALLOON_NOSED, SEAL_HOLDS, SEAL_KEEPS, SEAL_TOSS, onNose } from './flight'
import { standIn, type Stamp } from './recording'
import { bodyAt, newToy, play, playUntil, run, staged, type Played } from './testing'
import { WHALE_ROLLS, type Frame } from './toy'
import type { Fish } from './flight'
import type { Meal } from './toy'
import { View, WHALE_TURNS, mealAt, tongueOf, whaleGaze, type Lie } from './view'
import { BERG, CHICK, ICE_Y, PENGUIN, SEALS, SEAL_NOSES, SPOUT, WHALE_EYE, type Friend } from './world'

// What the sheet says is seen, held at the canvas: the umbrella on a seal's
// nose, the umbrella open in the whale's water, the balloon nosed by a seal,
// and the chick's plate turned over. The view draws on a stand-in canvas at
// one pixel to a unit, so a stamp's place is in stage units.

function drawn(logging = false) {
  const stand = standIn(logging)
  const view = new View(stand.make)
  view.setTier(TIERS[0])
  view.build(stand.ctx, 1180, 820, 1)
  const art = view.figures!
  const draw = (f: Frame): Stamp[] => {
    stand.reset()
    view.draw(stand.ctx, f, 1 / 60)
    return stand.tally.placed.map((stamp) => ({ ...stamp }))
  }
  return { art, draw, stand }
}

const turnOf = (stamp: Stamp): number => Math.atan2(stamp.b, stamp.a)
const of = (stamps: Stamp[], sprite: { image: unknown }): Stamp[] => stamps.filter((stamp) => stamp.image === sprite.image)

const OVER = (which: 0 | 1): { x: number; y: number } => ({ x: SEALS[which].x, y: SEALS[which].y - SEALS[which].r - PENGUIN.r - 12 })

describe('the umbrella on a seal', () => {
  it('stands on the seal\'s nose as a bowl with the penguin sat in it, and the seal\'s flippers go up to steady it', () => {
    const { art, draw, stand } = drawn()
    for (const which of [0, 1] as const) {
      const played = staged(['umbrella'], { ...OVER(which), vy: 200, open: true })
      playUntil(played, (toy) => toy.body!.held > 0)
      // The model has it over the nose, clear of the belly.
      const sits = onNose(which), nose = SEAL_NOSES[which]
      expect(played.toy.body).toMatchObject({ x: sits.x, y: sits.y })
      expect(Math.hypot(sits.x - SEALS[which].x, sits.y - SEALS[which].y)).toBeGreaterThanOrEqual(SEALS[which].r + PENGUIN.r)
      expect(nose.y - sits.y).toBeGreaterThanOrEqual(PENGUIN.r)
      // A quarter of a second on, the penguin has settled there and the bowl is on the nose.
      play(played, 0.25)
      const f = played.toy.show()
      expect(f.pilot.nose).toEqual(nose)
      expect(Math.hypot(f.pilot.x - sits.x, f.pilot.y - sits.y)).toBeLessThan(4)
      expect((which === 0 ? f.nearSeal : f.farSeal).hold).toBeGreaterThan(0)
      const stamps = draw(f)
      // The open umbrella, turned right over: its cloth is the bowl and its stick stands up out of it.
      const bowl = of(stamps, art.parts.umbrellaOpen)
      expect(bowl).toHaveLength(1)
      expect(Math.abs(turnOf(bowl[0]))).toBeGreaterThan(Math.PI - 0.1)
      // The point of the cloth is on the nose, within a hair's sway of it, and nothing of the umbrella is below the nose.
      const pointOf = (stamp: Stamp): { x: number; y: number } => ({ x: stamp.e + stamp.c * -149, y: stamp.f + stamp.d * -149 })
      expect(Math.hypot(pointOf(bowl[0]).x - nose.x, pointOf(bowl[0]).y - nose.y)).toBeLessThan(1)
      expect(bowl[0].f).toBeLessThan(nose.y - 140)
      // The rim of the bowl is above the penguin's feet and below its middle: it sits in it.
      const rim = bowl[0].f + bowl[0].d * -84
      expect(rim).toBeGreaterThan(f.pilot.y)
      expect(rim).toBeLessThan(f.pilot.y + PENGUIN.height / 2)
      // It is drawn over the penguin, which sits in it, and no clip hides any of it: the frame clips nothing more than a frame without it.
      expect(stamps.indexOf(bowl[0])).toBeGreaterThan(stamps.findIndex((stamp) => stamp.image === art.pilot.image))
      const clips = stand.tally.clips
      draw({ ...f, pilot: { ...f.pilot, nose: null, umbrella: 'none' } })
      expect(clips).toBe(stand.tally.clips)
      // No other umbrella is drawn while it is on the nose.
      expect(of(stamps, art.parts.umbrellaFlipped)).toHaveLength(0)
      expect(of(stamps, art.parts.umbrellaShut)).toHaveLength(0)
      // Tipped on, the umbrella is in its flipper again and nothing stands on the nose.
      play(played, SEAL_HOLDS)
      const after = played.toy.show()
      expect(after.pilot.nose).toBeNull()
      for (const stamp of of(draw(after), art.parts.umbrellaOpen)) expect(Math.hypot(pointOf(stamp).x - nose.x, pointOf(stamp).y - nose.y)).toBeGreaterThan(20)
    }
  })

  it('agrees with the drawing about where each nose is', () => {
    expect(Math.hypot(SEALS[0].x + JOINTS.nearSeal.nose[0] - SEAL_NOSES[0].x, ICE_Y + JOINTS.nearSeal.nose[1] - SEAL_NOSES[0].y)).toBeLessThan(1.5)
    expect(Math.hypot(SEALS[1].x + JOINTS.farSeal.nose[0] - SEAL_NOSES[1].x, ICE_Y + JOINTS.farSeal.nose[1] - SEAL_NOSES[1].y)).toBeLessThan(1.5)
  })

  it('is balanced once by each seal in a flight, so a body always gets past it', () => {
    const body = bodyAt(OVER(0).x, OVER(0).y, 0, 200, ['umbrella'], { open: true })
    const first = run(body, 400, false, (_, out) => out.some((what) => what.kind === 'seal'))
    expect(first.filter((what) => what.kind === 'caught')).toHaveLength(1)
    // Put over the same seal again, falling open: it is bounced, not caught.
    Object.assign(body, { ...OVER(0), vx: 0, vy: 200, open: true })
    const second = run(body, 400, false, (_, out) => out.some((what) => what.kind === 'seal'))
    expect(second.filter((what) => what.kind === 'caught')).toHaveLength(0)
    expect(second.filter((what) => what.kind === 'seal')).toHaveLength(1)
  })
})

describe('the umbrella in the whale\'s water', () => {
  it('is open while the water drives it up, and is drawn open', () => {
    const { art, draw } = drawn()
    const played = staged(['umbrella'], { x: SPOUT.x, y: 560, vy: -60 })
    play(played, 0.1)
    let rising = 0
    for (let n = 0; n < 40; n++) {
      play(played, 1 / 60)
      const body = played.toy.body!
      if (!body.inSpout || body.vy >= 0) continue
      rising += 1
      expect(body.open).toBe(true)
      const f = played.toy.show()
      expect(f.pilot.umbrella).toBe('open')
      const stamps = draw(f)
      expect(of(stamps, art.parts.umbrellaOpen)).toHaveLength(1)
      expect(of(stamps, art.parts.umbrellaShut)).toHaveLength(0)
    }
    expect(rising).toBeGreaterThan(20)
    expect(played.heard.flat().map((sound) => sound.name)).toContain('fwip')
  })

  it('shuts again when it rises clear of the water, as the sheet says of a rising umbrella', () => {
    const body = bodyAt(SPOUT.x, SPOUT.top + 6, 0, -200, ['umbrella'], { open: true, inSpout: true })
    run(body, 12)
    expect(body.inSpout).toBe(false)
    expect(body.vy).toBeLessThan(0)
    expect(body.open).toBe(false)
  })

  it('takes no push from an open umbrella that rises: its drag is on the fall only', () => {
    const open = bodyAt(SPOUT.x, 500, 0, -100, ['umbrella'], { inSpout: true }), shut = bodyAt(SPOUT.x, 500, 0, -100, [], { inSpout: true })
    // The same water with the same hold on both: the umbrella's hold is the larger, so it only ever rises faster by that.
    run(open, 1)
    run(shut, 1)
    expect(open.open).toBe(true)
    expect(open.vy).toBeLessThan(0)
    expect(Math.abs(open.vy - shut.vy)).toBeLessThan(6)
  })
})

describe('the balloon on a seal', () => {
  it('is never sent on slower than the seal\'s fixed toss, however gently it lands, and slower than any other load when it comes fast', () => {
    for (const which of [0, 1] as const) {
      for (const vy of [40, 120, 300, 380, 700]) {
        const body = bodyAt(OVER(which).x, OVER(which).y, 30, vy, ['balloon'])
        const out = run(body, 400, false, (_, happened) => happened.some((what) => what.kind === 'seal'))
        const met = out.find((what) => what.kind === 'seal')
        expect(met, `at ${vy}`).toBeDefined()
        const before = (met as { speed: number }).speed, after = Math.hypot(body.vx, body.vy)
        expect(after, `at ${vy}`).toBeGreaterThanOrEqual(SEAL_TOSS - 1e-6)
        expect(after, `at ${vy}`).toBeCloseTo(Math.max(before * SEAL_KEEPS * BALLOON_NOSED, SEAL_TOSS), 6)
      }
    }
  })

  it('is nosed where it can be seen: the seal\'s nose goes up, its ball with it, and the balloon squashes and leans back to the nose', () => {
    const { art, draw } = drawn()
    for (const which of [0, 1] as const) {
      const played = staged(['balloon'], { ...OVER(which), vx: 20, vy: 200 })
      playUntil(played, () => played.heard.flat().some((sound) => sound.name === 'hollow'))
      const f = played.toy.show()
      expect(f.pilot.nosed, String(which)).toMatchObject({ x: SEAL_NOSES[which].x, y: SEAL_NOSES[which].y })
      play(played, 0.2)
      const mid = played.toy.show()
      expect(mid.pilot.nosed!.p).toBeGreaterThan(0)
      if (which === 0) expect(mid.nearSeal.nosing).toBeGreaterThan(0.5)
      else expect(mid.farSeal.snort).toBeGreaterThan(0)
      // The balloon as it is drawn then, against the same balloon at the same place with no seal nosing it.
      const nosed = of(draw(mid), art.parts.balloon)[0]
      const free = of(draw({ ...mid, pilot: { ...mid.pilot, nosed: null } }), art.parts.balloon)[0]
      expect(Math.abs(turnOf(nosed) - turnOf(free))).toBeGreaterThan(0.3)
      expect(Math.hypot(nosed.c, nosed.d)).toBeLessThan(Math.hypot(free.c, free.d) * 0.9)
      // It leans towards the nose's side of it.
      expect(Math.sign(turnOf(nosed) - turnOf(free))).toBe(Math.sign(SEAL_NOSES[which].x - nosed.e))
      // And the moment passes.
      play(played, 0.4)
      expect(played.toy.show().pilot.nosed).toBeNull()
    }
  })
})

describe('the chick\'s plate', () => {
  /** A bare penguin come to rest at the chick's with no fish, played through the chick's answer. */
  function visit(): { played: Played; frames: Frame[] } {
    const played = staged([], { x: 540, y: ICE_Y - PENGUIN.r - 2, vx: 40, vy: 60 })
    playUntil(played, (toy) => toy.phase === 'scene')
    const frames: Frame[] = []
    for (let n = 0; n < 150; n++) {
      play(played, 1 / 60)
      frames.push(JSON.parse(JSON.stringify(played.toy.show())) as Frame)
    }
    return { played, frames }
  }

  it('is turned over by the chick, which stays on its feet: the plate goes edge on, shows its underside, and comes back', () => {
    const { art, draw } = drawn()
    const { played, frames } = visit()
    expect(played.heard.flat().map((sound) => sound.name)).toContain('plateflip')
    const turning = frames.filter((f) => f.chick.plate > 0 && f.chick.ride === null)
    expect(turning.length).toBeGreaterThan(20)
    let under = 0, upright = 0, thinnest = 1
    for (const f of turning) {
      const stamps = draw(f)
      const chick = of(stamps, art.chick)[0]
      // The chick itself only leans to look: a tenth of a turn of the plate's, and never tips over.
      expect(Math.abs(turnOf(chick))).toBeLessThan(0.2)
      const plates = [...of(stamps, art.plate), ...of(stamps, art.plateUnder)]
      expect(plates).toHaveLength(1)
      if (plates[0].image === art.plateUnder.image) under += 1
      else upright += 1
      thinnest = Math.min(thinnest, Math.hypot(plates[0].c, plates[0].d))
      // Lifted towards its face as it turns, and never out of its flippers.
      expect(plates[0].f).toBeLessThanOrEqual(ICE_Y + JOINTS.chick.plate[1] + 1)
      expect(Math.abs(plates[0].e - CHICK.x)).toBeLessThan(8)
    }
    expect(under).toBeGreaterThan(8)
    expect(upright).toBeGreaterThan(8)
    expect(thinnest).toBeLessThan(0.3)
    // Before and after, it holds the plate the right way up.
    const rest = draw(frames[0])
    expect(of(rest, art.plate)).toHaveLength(1)
    expect(of(rest, art.plateUnder)).toHaveLength(0)
  })
})

describe('the nine answers to a fish', () => {
  const friends: Friend[] = ['chick', 'walrus', 'puffin']
  const fishes: Fish[] = ['fresh', 'wet', 'frozen']
  const SAMPLES = 60

  /** The fish's lie through one answer, as what changes in it from its start: place in tens of units, turn in radians, size and length as shares. */
  function motion(who: Friend, fish: Fish): number[][] {
    const lie: Lie = { x: 0, y: 0, rot: 0, size: 1, tall: 1 }
    const at = (p: number): Lie => ({ ...mealAt(who, { fish, act: 'react', p }, 0, 1, 0, lie) })
    const start = at(0)
    const series: number[][] = []
    for (let n = 0; n <= SAMPLES; n++) {
      const now = at(n / SAMPLES)
      series.push([(now.x - start.x) / 10, (now.y - start.y) / 10, now.rot - start.rot, now.size / start.size - 1, now.tall - start.tall])
    }
    return series
  }

  it('gives each of the nine its own motion: no two move the fish alike, and none is still', () => {
    const answers = friends.flatMap((who) => fishes.map((fish) => ({ name: `${who} with ${fish}`, series: motion(who, fish) })))
    expect(answers).toHaveLength(9)
    for (const answer of answers) {
      // Something about the fish moves, by more than a hair.
      const most = Math.max(...answer.series.flat().map(Math.abs))
      expect(most, answer.name).toBeGreaterThan(0.25)
    }
    for (let i = 0; i < answers.length; i++) for (let j = i + 1; j < answers.length; j++) {
      // How unlike two answers are: the mean, over the answer, of the largest difference in any one thing that moves.
      let apart = 0
      for (let n = 0; n <= SAMPLES; n++) apart += Math.max(...answers[i].series[n].map((v, k) => Math.abs(v - answers[j].series[n][k])))
      expect(apart / (SAMPLES + 1), `${answers[i].name} and ${answers[j].name}`).toBeGreaterThan(0.12)
    }
  })

  it('shares no wobble between them: what turns the fish in one answer turns it in no other the same way', () => {
    const turning = friends.flatMap((who) => fishes.map((fish) => motion(who, fish).map((sample) => sample[2]))).filter((turn) => turn.some((v) => Math.abs(v) > 0.05))
    // Seven of the nine turn the fish; the chick's wet fish only jumps, and the walrus's fresh one is carried level.
    expect(turning).toHaveLength(7)
    expect(new Set(turning.map((turn) => turn.map((v) => v.toFixed(3)).join())).size).toBe(turning.length)
  })

  it('shows the chick\'s tongue stuck to a frozen fish, from its beak to the block, and lifts the block off the plate by it', () => {
    const lie: Lie = { x: 0, y: 0, rot: 0, size: 1, tall: 1 }
    const line = { x0: 0, y0: 0, x1: 0, y1: 0 }
    const meal = (act: Meal['act'], p: number, fish: Fish = 'frozen'): Meal => ({ fish, act, p })
    const tongue = (m: Meal) => { const out = tongueOf(m, mealAt('chick', m, 0, 1, 0, lie), 0, 0, line); return out ? { ...out } : null }
    // No tongue while it takes the fish, nor for a fish that is not frozen.
    expect(tongue(meal('take', 0.5))).toBeNull()
    expect(tongue(meal('react', 0.6, 'wet'))).toBeNull()
    expect(tongue(meal('react', 0.6, 'fresh'))).toBeNull()
    expect(tongue(meal('react', 0.05))).toBeNull()
    // Out by the lick, and on the block from then on, while it eats too.
    for (const m of [meal('react', 0.4), meal('react', 0.9), meal('eat', 1)]) {
      const out = tongue(m)!
      const block = mealAt('chick', m, 0, 1, 0, lie)
      expect(Math.hypot(out.x0 - CHICK.x, out.y0 - (ICE_Y + JOINTS.chick.beak[1]))).toBeLessThan(6)
      expect(Math.hypot(out.x1 - block.x, out.y1 - block.y)).toBeLessThan(8)
      expect(Math.hypot(out.x1 - out.x0, out.y1 - out.y0)).toBeGreaterThan(12)
    }
    // Stuck, the block is off the plate.
    expect(mealAt('chick', meal('react', 0.2), 0, 1, 0, lie).y - mealAt('chick', meal('react', 0.9), 0, 1, 0, { ...lie }).y).toBeGreaterThan(10)
    // And the strokes are drawn: the frame with the tongue has one more live stroke's worth of lines than the same frame without.
    const played = staged(['fish'], { x: 540, y: ICE_Y - PENGUIN.r - 2, vx: 40, vy: 60, fish: 'frozen' })
    playUntil(played, (toy) => toy.show().meal.chick?.act === 'react' && toy.show().meal.chick!.p > 0.6)
    expect(played.heard.flat().map((sound) => sound.name)).toEqual(expect.arrayContaining(['lick', 'stuck']))
    const logged = standIn(true)
    const view = new View(logged.make)
    view.setTier(TIERS[0])
    view.build(logged.ctx, 1180, 820, 1)
    const f = played.toy.show()
    logged.reset()
    view.draw(logged.ctx, f, 0)
    const withTongue = logged.tally.log.filter((entry) => entry.startsWith('lineTo(')).length
    logged.reset()
    view.draw(logged.ctx, { ...f, meal: { ...f.meal, chick: { ...f.meal.chick!, fish: 'wet' } } }, 0)
    expect(withTongue - logged.tally.log.filter((entry) => entry.startsWith('lineTo(')).length).toBe(2)
  })

  it('shuts the walrus\'s eyes while it crunches a frozen fish, and bites the fish shorter three times', () => {
    const played = staged(['fish'], { x: 1150, y: BERG.y0 - PENGUIN.r - 2, vy: 20, fish: 'frozen' })
    playUntil(played, (toy) => toy.show().meal.walrus?.act === 'react')
    const lie: Lie = { x: 0, y: 0, rot: 0, size: 1, tall: 1 }
    const lengths: number[] = []
    let shut = 0, open = 0
    while (played.toy.show().meal.walrus?.act === 'react') {
      const f = played.toy.show()
      if (f.walrus.blink === 1) shut += 1
      else open += 1
      const tall = mealAt('walrus', f.meal.walrus!, f.t, 1, 0, lie).tall
      if (lengths.length === 0 || Math.abs(lengths[lengths.length - 1] - tall) > 0.15) lengths.push(tall)
      play(played, 1 / 60)
    }
    expect(open).toBe(0)
    expect(shut).toBeGreaterThan(60)
    // The whole fish, and then three bites off it.
    expect(lengths).toHaveLength(4)
    expect(played.heard.flat().filter((sound) => sound.name === 'munch')).toHaveLength(3)
    // It goes on with its eyes shut while it eats; with any other fish its eyes are its own.
    expect(played.toy.show().walrus.blink).toBe(1)
    const wet = staged(['fish'], { x: 1150, y: BERG.y0 - PENGUIN.r - 2, vy: 20, fish: 'wet' })
    playUntil(wet, (toy) => toy.show().meal.walrus?.act === 'react')
    play(wet, 0.3)
    expect(wet.toy.show().walrus.blink).toBeLessThan(1)
  })

  it('slurps the puffin\'s wet fish up into its bill like a noodle: it hangs where it hung, and less and less of it hangs', () => {
    const lie: Lie = { x: 0, y: 0, rot: 0, size: 1, tall: 1 }
    const at = (p: number): Lie => ({ ...mealAt('puffin', { fish: 'wet', act: 'react', p }, 0, 1, 0, lie) })
    const start = at(0), end = at(1)
    expect(start.tall).toBe(1)
    expect(end.tall).toBeLessThan(0.2)
    let last = 1
    for (let n = 0; n <= 40; n++) {
      const now = at(n / 40)
      // It goes one way only, and the top of it stays in the bill.
      expect(now.tall).toBeLessThanOrEqual(last + 1e-9)
      expect([now.x, now.y]).toEqual([start.x, start.y])
      last = now.tall
    }
    // Eaten slowly, only the tail of it is left hanging.
    expect(mealAt('puffin', { fish: 'wet', act: 'eat', p: 1 }, 0, 1, 0, lie).tall).toBeLessThan(0.2)
  })
})

describe('the whale\'s eye', () => {
  it('rolls once right round at a press, with its moan in that call, comes to rest on the penguin, and then watches the sky again', () => {
    const { draw, stand } = drawn(true)
    const played = newToy()
    play(played, 0.5)
    const gaze = { x: 0, y: 0 }
    // At rest it watches the sky above its blowhole.
    whaleGaze(played.toy.show(), gaze)
    expect(gaze.y).toBe(SPOUT.top)
    played.toy.press(WHALE_EYE.x, WHALE_EYE.y)
    expect(played.toy.takeSounds().map((sound) => sound.name)).toEqual(['moan'])
    played.toy.tap()
    /** The way the pupil is drawn from the middle of the eye: the whale's is the first eye the view draws. */
    const pupil = (frame: Frame): number => {
      draw(frame)
      const first = stand.tally.log.find((line) => line.startsWith('arc('))!
      const [x, y] = first.slice(4).split(',').map(Number)
      return Math.atan2(y - WHALE_EYE.y, x - WHALE_EYE.x)
    }
    let turned = 0, was: number | null = null, rested = 0, frames = 0
    for (;;) {
      play(played, 1 / 60)
      const frame = played.toy.show()
      if (frame.whale.roll <= 0) break
      frames += 1
      const to = Math.atan2(frame.pilot.y - WHALE_EYE.y, frame.pilot.x - WHALE_EYE.x)
      const at = pupil(frame)
      // What is drawn is what the gaze says.
      whaleGaze(frame, gaze)
      expect(Math.cos(at - Math.atan2(gaze.y - WHALE_EYE.y, gaze.x - WHALE_EYE.x))).toBeGreaterThan(0.999)
      if (was !== null) {
        let step = at - was
        while (step > Math.PI) step -= 2 * Math.PI
        while (step < -Math.PI) step += 2 * Math.PI
        // It rolls one way, and no frame turns it far.
        expect(step).toBeGreaterThan(-0.01)
        expect(step).toBeLessThan(0.5)
        turned += step
      }
      was = at
      // Once it has been right round it is on the penguin, and stays on it.
      if (1 - frame.whale.roll >= WHALE_TURNS) {
        rested += 1
        expect(Math.cos(at - to)).toBeGreaterThan(0.999)
      }
    }
    expect(frames).toBeGreaterThan(WHALE_ROLLS * 60 - 3)
    expect(turned).toBeGreaterThan(2 * Math.PI - 0.6)
    expect(turned).toBeLessThan(2 * Math.PI + 0.01)
    expect(rested).toBeGreaterThan(30)
    // The roll is over: the sky again.
    whaleGaze(played.toy.show(), gaze)
    expect(gaze.y).toBe(SPOUT.top)
  })
})
