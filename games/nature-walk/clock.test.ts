import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { SPOTS, TOAD_HOME, TOAD_RISE } from './layout'
import { COVERS } from './motion'
import { slideOf, toadPose } from './poses'
import { blankSheets, emptyRecording, tracingContext } from './recorder'
import { Finger, LAPS } from './script'
import { coverPose } from './motion'
import { drawn } from './things'
import { amount, landed, type Mover, type Toy } from './toy'
import { View } from './view'
import { THINGS } from './wood'

// One clock for sight and sound. The model has one clock; a motion is an act
// on it and a sound is a cue of an act, due at a moment of the same clock.
// So a sound is heard in the frame its moment falls in, while the motion it
// belongs to is under way, and a landing is heard in the frame it lands.
// "Seen" is what the view draws: the motion a sound belongs to is in the
// frame that is on screen when the sound is heard, and the picture drawn
// with that motion differs from the picture drawn without it.

const FPS = 30, FRAME = 1 / FPS

describe('one clock for sight and sound', () => {
  it('sync: every sound of the whole walk is heard in the frame it falls due, while the motion it belongs to is drawn on screen', () => {
    const view = new View(blankSheets(emptyRecording()))
    const picture = (toy: Toy): string => {
      const { g, trace } = tracingContext()
      view.draw(g, 1180, 820, 2, { toy, guidance: null, tier: TIERS[0] })
      return trace.join(';')
    }
    // Every motion that was under way, by who moved and when it began: how long it lasts, and whether the view
    // has drawn it yet, which is whether some frame's picture with it differed from that frame's picture without it.
    type Span = { since: number; until: number; drawn: boolean; kind: string }
    const spans = new Map<Mover, Span[]>()
    const finger: Finger = new Finger(1, FPS, (toy) => {
      let whole: string | null = null
      for (const mover of Object.keys(toy.acts) as Mover[]) {
        const act = toy.acts[mover]!, list = spans.get(mover) ?? []
        let span = list.find((one) => one.since === act.since)
        if (!span) { span = { since: act.since, until: act.since + act.length, drawn: false, kind: act.kind }; list.push(span); spans.set(mover, list) }
        if (span.drawn) continue
        // Is it in a frame that is on screen: its own, or either while the view slides between the two.
        const sliding = slideOf(toy) > 0 && slideOf(toy) < 1
        if (act.room !== toy.room && !sliding && mover !== 'view') continue
        whole = whole ?? picture(toy)
        delete toy.acts[mover]
        const without = picture(toy)
        toy.acts[mover] = act
        if (without !== whole) span.drawn = true
      }
    })
    const late: string[] = [], offScreen: string[] = [], heardOf: { id: string; mover: Mover; at: number }[] = []
    const play = finger.ears.play.bind(finger.ears)
    finger.ears.play = (events) => {
      for (const event of events) {
        // Due at a moment of the clock, and heard no later than the frame that moment falls in.
        if (finger.toy.time - event.at > FRAME + 1e-6 || event.at > finger.toy.time + 1e-6) late.push(`${event.id} due ${event.at.toFixed(3)} heard ${finger.toy.time.toFixed(3)}`)
        heardOf.push({ id: event.id, mover: event.mover, at: event.at })
        // Its motion is in the frame on screen now: no sound comes from the place that was left.
        const act = finger.toy.acts[event.mover]
        const sliding = slideOf(finger.toy) > 0 && slideOf(finger.toy) < 1
        if (act && act.room !== finger.toy.room && !sliding && event.mover !== 'view') offScreen.push(`${event.id} of ${event.mover} at ${event.at.toFixed(2)}`)
      }
      play(events)
    }
    for (const lap of Object.values(LAPS)) lap(finger)
    expect(finger.ears.heard.length).toBeGreaterThan(1000)
    expect(late).toEqual([])
    expect(offScreen).toEqual([])
    // Every sound belongs to a motion that was under way when it fell due, and that motion was drawn.
    const unseen = new Set<string>()
    for (const heard of heardOf) {
      const span = (spans.get(heard.mover) ?? []).filter((one) => heard.at >= one.since - 1e-6 && heard.at <= one.until + 1e-6).sort((a, b) => b.since - a.since)[0]
      if (!span) unseen.add(`${heard.id} of ${heard.mover}: no motion`)
      else if (!span.drawn) unseen.add(`${heard.id} of ${heard.mover} (${span.kind}): never drawn`)
    }
    expect([...unseen]).toEqual([])
  }, 30000)

  it('a landing is heard when it lands: the stone, the lid of the log, the toad, and a thing tipped from the nest', () => {
    const finger = new Finger(1, 60)
    const heardAt = (id: string, after: number): number => finger.ears.heard.find((one) => one.event.id === id && one.at >= after)?.event.at ?? NaN
    // The stone rolls aside and lands: heard when its travel is over, which is when it squashes.
    let from = finger.toy.time
    finger.tap(SPOTS.stone.shut, 'open stone'); finger.wait(2)
    expect(heardAt('stoneLand', from) - from).toBeCloseTo(COVERS.stone.open, 2)
    expect(amount(finger.toy, 'stone')).toBe(1)
    expect(landed(finger.toy, 'stone')).toBeCloseTo(finger.toy.time - heardAt('stoneLand', from), 1)
    expect(coverPose('stone', 1, 0, 0).sy).toBeLessThan(coverPose('stone', 1, 0, 9).sy)
    // The lid of the log claps down when it is down.
    finger.tap(SPOTS.log.shut, 'open log'); finger.wait(2)
    from = finger.toy.time
    finger.tap(SPOTS.log.away[0], 'shut log'); finger.wait(2)
    expect(heardAt('logClap', from) - from).toBeCloseTo(COVERS.log.shut, 2)
    // The toad croaks with a hop: his landing is heard in the frame his feet are down again.
    from = finger.toy.time
    finger.down({ x: TOAD_HOME.x, y: TOAD_HOME.y - TOAD_RISE }, 'toad'); finger.up()
    let wasUp = false, downAt = NaN
    for (let i = 0; i < 120; i++) {
      finger.wait(1 / 60)
      const y = toadPose(finger.toy).y
      if (y < -4) wasUp = true
      if (wasUp && y > -1 && Number.isNaN(downAt)) downAt = finger.toy.time
    }
    expect(wasUp).toBe(true)
    expect(Math.abs(heardAt('toadLand', from) - downAt)).toBeLessThanOrEqual(2 / 60)
    // The worm from under the stone goes into the puddle and climbs out wet; on the ground the jay takes it;
    // tipped from the nest it lands at the foot of the tree, and is heard as it comes to rest there.
    finger.put('worm', { x: 902, y: 718 }, 'worm in the puddle')
    finger.put('worm', { x: 930, y: 500 }, 'wet worm on the ground')
    expect(finger.toy.things.worm.at).toBe('nest')
    from = finger.toy.time
    finger.down({ x: 730, y: 304 }, 'tip the nest'); finger.up()
    let restAt = NaN
    for (let i = 0; i < 120; i++) {
      finger.wait(1 / 60)
      const where = finger.toy.things.worm, seen = drawn(finger.toy, 'worm')!
      if (where.at === 'path' && Number.isNaN(restAt) && Math.hypot(seen.at.x - where.x, seen.at.y - where.y) < 1.5) restAt = finger.toy.time
    }
    expect(Math.abs(heardAt('tipLand', from) - restAt)).toBeLessThanOrEqual(3 / 60)
    expect(THINGS).toContain('worm')
  })

  it('waits are seconds on the clock, not frames: at twenty frames a second and at sixty the same things are heard at the same moments', () => {
    // The finger lands and lifts at moments both frame rates have: tenths of a second.
    const run = (fps: number): Finger => {
      const finger = new Finger(1, fps)
      for (const place of ['stone', 'log', 'branch'] as const) {
        finger.down(SPOTS[place].shut, `open ${place}`); finger.wait(0.1); finger.up(); finger.wait(1.9)
        finger.down(SPOTS[place].find, `touch under ${place}`); finger.wait(0.1); finger.up(); finger.wait(1.9)
      }
      finger.down({ x: TOAD_HOME.x, y: TOAD_HOME.y - TOAD_RISE }, 'toad'); finger.wait(0.1); finger.up(); finger.wait(2.9)
      finger.down({ x: 128, y: 132 }, 'wheel'); finger.wait(0.1); finger.up(); finger.wait(5.9)
      return finger
    }
    const slow = run(20), fast = run(60)
    expect(slow.toy.time).toBeCloseTo(fast.toy.time, 6)
    const heard = (finger: Finger) => finger.ears.heard.map((one) => ({ id: one.event.id, part: one.event.part, at: one.event.at })).sort((a, b) => a.id.localeCompare(b.id) || a.part - b.part || a.at - b.at)
    const a = heard(slow), b = heard(fast)
    expect(a.map((one) => `${one.id}/${one.part}`)).toEqual(b.map((one) => `${one.id}/${one.part}`))
    expect(a.length).toBeGreaterThan(30)
    // What a touch sets off falls due at the same moment to the millisecond. What the clock sets off (a find
    // coming up once its cover is clear) begins in the frame that sees it, so within one slow frame.
    let worst = 0, exact = 0
    a.forEach((one, index) => { const apart = Math.abs(one.at - b[index].at); worst = Math.max(worst, apart); if (apart < 1e-6) exact += 1 })
    expect(worst).toBeLessThanOrEqual(1 / 20 + 1e-6)
    expect(exact).toBeGreaterThan(a.length * 0.7)
  })
})
