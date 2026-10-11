import { describe, expect, it } from 'vitest'
import { ALL_KINDS, BREAD, CHEESE, CHILLI, EGG, ICE, JELLY, THINGS, radiusOf, type Kind } from './kinds'
import { BAG, HANDLE, HANG_Y, JAR, JAR_MID, LAMP, MOUSE, PLACES, SEAT, SHELF, WINDOW } from './layout'
import { FLAME_EVERY, JIGGLE, Play, SHIVER_EVERY, THROWS, airOf, burpOutcome, flightAt, shivering, throwOf, touchesOf, zoneAt, type Cue, type Flight } from './play'
import { deserialize, freshSave, type Save } from './save'
import { FLAME } from './voices'

const FRAME = 1 / 60
const OVER = { x: JAR_MID, y: 300 }

function run(play: Play, seconds: number): Cue[] {
  const cues: Cue[] = []
  for (let t = 0; t < seconds; t += FRAME) {
    play.step(FRAME)
    cues.push(...play.drain())
  }
  return cues
}

/** A tap over the jar at `x`: the claw goes there and lets go. Returns everything it set off in `seconds`. */
function letGo(play: Play, x: number, seconds = 1.6): Cue[] {
  play.press({ x, y: 300 })
  const cues = play.drain()
  play.release()
  return [...cues, ...run(play, seconds)]
}

const sounds = (cues: readonly Cue[]): number => cues.filter((cue) => cue.type === 'sound').length
const casts = (cues: readonly Cue[]): string[] => cues.flatMap((cue) => (cue.type === 'cast' ? [cue.cue.what] : []))
const stored = (save: Save): Save => deserialize(JSON.parse(JSON.stringify(save)))
/** A snack of kind `k` as a burp throws it from the rim to the second place on the counter. */
const thrown = (k: Kind): Flight => ({ k, from: { x: JAR_MID, y: JAR.rim }, to: PLACES[1], t: 0, ...throwOf(k), goal: 'place', place: 1, scene: true, thrown: true })
const kindsIn = (play: Play): Kind[] => play.jar.snacks.map((s) => s.k).sort((a, b) => a - b)

/** A jar of bread, filled until the next let-go would burp. */
function nearlyFull(): Play {
  const play = new Play(freshSave(8), 1)
  for (let i = 0; i < 60; i++) {
    letGo(play, JAR.left + 50 + ((i * 97) % 280), 1.3)
    if (play.counter.some((k) => k)) break
  }
  return play
}

describe('the toy', () => {
  it('opens as it was saved: the pile in the jar, the snack under the claw, the counter', () => {
    const young = new Play(freshSave(5), 1)
    expect(kindsIn(young)).toEqual([BREAD])
    expect(young.claw).toMatchObject({ k: CHEESE, in: true })
    expect(young.jar.quiet).toBe(true)
    const older = new Play(freshSave(8), 1)
    expect(kindsIn(older)).toEqual([])
    expect(older.claw.k).toBe(BREAD)
    expect(young.flights).toEqual([])
    expect(run(young, 2).filter((cue) => cue.type !== 'puff')).toEqual([])
  })

  it('hangs an ice stiff: it does not swing at all, on arrival or when carried', () => {
    const play = new Play(freshSave(8), 1)
    play.press(SHELF[5])
    play.release()
    let widest = 0
    const watch = (seconds: number) => {
      for (let t = 0; t < seconds; t += FRAME) {
        play.step(FRAME)
        if (play.claw.k === ICE && play.claw.in) widest = Math.max(widest, Math.abs(play.claw.ang))
      }
    }
    watch(1)
    expect(play.claw).toMatchObject({ k: ICE, in: true })
    // Carried from side to side, let go, and the next one arriving.
    play.press({ x: JAR.left + 60, y: 300 })
    watch(0.4)
    play.move({ x: JAR.right - 60, y: 300 })
    watch(0.4)
    play.release()
    watch(2)
    expect(play.claw).toMatchObject({ k: ICE, in: true })
    expect(widest).toBe(0)
    // A cheese does swing.
    const other = new Play(freshSave(8), 1)
    other.press(SHELF[1])
    other.release()
    let swung = 0
    for (let t = 0; t < 1; t += FRAME) {
      other.step(FRAME)
      swung = Math.max(swung, Math.abs(other.claw.ang))
    }
    expect(swung).toBeGreaterThan(0.05)
  })

  it('answers a tap on a counter snack that is still flying back to its place: it turns round in the air and comes to the claw', () => {
    const play = new Play({ ...freshSave(8), counter: [BREAD | CHEESE, 0, 0, 0] }, 1)
    play.press(PLACES[0])
    play.release()
    run(play, 1)
    expect(play.claw).toMatchObject({ k: BREAD | CHEESE, in: true })
    // A tap on the shelf sends it back to a place; a tap on that place while it is still in the air.
    play.press(SHELF[2])
    play.release()
    run(play, 0.15)
    const place = play.counter.findIndex((k) => k === (BREAD | CHEESE))
    expect(place).toBeGreaterThanOrEqual(0)
    const flying = play.flights.find((flight) => flight.goal === 'place')!
    const where = flightAt(flying)
    expect(where.y).toBeLessThan(PLACES[place].y - 10)
    play.drain()
    play.press(PLACES[place])
    const cues = play.drain()
    expect(sounds(cues)).toBeGreaterThan(0)
    expect(play.claw.k).toBe(BREAD | CHEESE)
    expect(play.counter[place]).toBe(0)
    const back = play.flights.find((flight) => flight.goal === 'claw' && flight.k === (BREAD | CHEESE))!
    expect(back.from.x).toBeCloseTo(where.x, 5)
    expect(back.from.y).toBeCloseTo(where.y, 5)
    play.release()
    run(play, 1.5)
    expect(play.claw).toMatchObject({ k: BREAD | CHEESE, in: true })
    expect(play.flights).toEqual([])
    expect(play.counter).toEqual([0, 0, 0, 0])
  })

  it('answers when the finger lands, before it lifts: the claw sets off and the snack speaks', () => {
    const play = new Play(freshSave(8), 1)
    play.press({ x: 700, y: 300 })
    expect(sounds(play.drain())).toBe(1)
    expect(play.held).toBe(true)
    expect(play.claw.to).toBe(700)
    play.step(FRAME)
    expect(play.claw.x).toBeGreaterThan(JAR_MID)
    run(play, 0.5)
    expect(play.claw.x).toBeCloseTo(700, 0)
    expect(kindsIn(play)).toEqual([])
  })

  it('carries the claw with the finger and keeps it over the jar', () => {
    const play = new Play(freshSave(8), 1)
    play.press(OVER)
    play.move({ x: 99999, y: 300 })
    run(play, 0.6)
    expect(play.claw.x).toBeCloseTo(JAR.right - radiusOf(BREAD) - 2, 0)
    play.move({ x: -99999, y: 300 })
    run(play, 0.6)
    expect(play.claw.x).toBeCloseTo(JAR.left + radiusOf(BREAD) + 2, 0)
    expect(Math.abs(play.claw.ang)).toBeLessThan(1)
  })

  it('lets the snack go at the lift, from where the claw is, and takes the same thing again', () => {
    const play = new Play(freshSave(8), 1)
    const cues = letGo(play, 480)
    expect(casts(cues)).toContain('drop')
    expect(kindsIn(play)).toEqual([BREAD])
    expect(Math.abs(play.jar.snacks[0].x - 480)).toBeLessThan(16)
    expect(play.claw).toMatchObject({ k: BREAD, in: true })
    expect(play.jar.quiet).toBe(true)
  })

  it('whips over to a tap and lets go there, never on the way', () => {
    const play = new Play(freshSave(8), 1)
    const target = JAR.right - 60
    play.press({ x: target, y: 300 })
    play.release()
    // The finger has lifted and the claw is still on its way: nothing falls yet.
    let fellAt = -1
    for (let frame = 0; frame < 60 && fellAt < 0; frame++) {
      play.step(FRAME)
      if (play.jar.snacks.length > 0) fellAt = play.claw.x
    }
    expect(fellAt).toBeGreaterThan(target - 7)
    expect(fellAt).toBeLessThan(target + 7)
    run(play, 1.5)
    expect(Math.abs(play.jar.snacks[0].x - target)).toBeLessThan(24)
  })

  it('lets go for a lift however long the claw takes to get there', () => {
    const play = new Play(freshSave(8), 1)
    play.press({ x: JAR.left + 50, y: 300 })
    run(play, 0.5)
    play.move({ x: JAR.right - 50, y: 300 })
    play.release()
    play.step(FRAME)
    expect(kindsIn(play)).toEqual([])
    run(play, 1.5)
    expect(kindsIn(play)).toEqual([BREAD])
    expect(play.jar.snacks[0].x).toBeGreaterThan(JAR_MID + 80)
  })

  it('makes no let-go of a touch that was taken away', () => {
    const play = new Play(freshSave(8), 1)
    play.press(OVER)
    play.cancel()
    run(play, 1.5)
    expect(kindsIn(play)).toEqual([])
    expect(play.claw).toMatchObject({ k: BREAD, in: true })
    expect(play.held).toBe(false)
  })

  it('joins what is let go onto a different thing, with a call and something for the shop to answer', () => {
    const play = new Play(freshSave(5), 1)
    const cues = letGo(play, JAR_MID)
    expect(kindsIn(play)).toEqual([BREAD | CHEESE])
    expect(casts(cues)).toEqual(expect.arrayContaining(['drop', 'join']))
    // The claw holds cheese again: what was picked stays picked.
    expect(play.claw.k).toBe(CHEESE)
  })

  it('sends the shelf thing a child taps to the claw, and the one that hung there back to the shelf', () => {
    const play = new Play(freshSave(8), 1)
    play.press(SHELF[4])
    expect(sounds(play.drain())).toBe(1)
    expect(play.pick).toBe(4)
    expect(play.claw).toMatchObject({ k: JELLY, in: false })
    expect(play.flights.map((f) => f.goal).sort()).toEqual(['claw', 'shelf'])
    play.release()
    run(play, 0.6)
    expect(play.claw).toMatchObject({ k: JELLY, in: true })
    expect(play.flights).toEqual([])
    letGo(play, JAR_MID)
    expect(kindsIn(play)).toEqual([JELLY])
    expect(play.claw.k).toBe(JELLY)
  })

  it('does not let go of a snack that is still on its way to the claw until it is there', () => {
    const play = new Play(freshSave(8), 1)
    play.press(SHELF[2])
    play.release()
    play.press(OVER)
    play.release()
    run(play, 2)
    expect(kindsIn(play)).toEqual([EGG])
  })

  it('answers every place a finger can land with a sound', () => {
    const places = [OVER, SHELF[0], { x: HANDLE.left + 20, y: HANDLE.top + 60 }, { x: SEAT.x, y: SEAT.y }, { x: WINDOW.left + 50, y: WINDOW.top + 80 }, { x: MOUSE.x, y: MOUSE.y }, { x: LAMP.x, y: LAMP.y }, { x: BAG.x, y: BAG.top + 60 }, { x: 900, y: 60 }, { x: 600, y: 800 }, { x: 20, y: 600 }]
    for (const at of places) {
      const play = new Play(freshSave(5), 1)
      play.press(at)
      expect(sounds(play.drain())).toBeGreaterThanOrEqual(1)
      play.release()
    }
  })

  it('tells the monster, the one at the window, the mouse, the lamp and the bag when they are poked', () => {
    const poke = (at: { x: number; y: number }) => {
      const play = new Play(freshSave(8), 1)
      play.press(at)
      return casts(play.drain())
    }
    expect(poke({ x: SEAT.x, y: SEAT.y })).toEqual(['poke-seat'])
    expect(poke({ x: 1100, y: 760 })).toEqual(['poke-seat'])
    expect(poke({ x: WINDOW.left + 50, y: WINDOW.top + 80 })).toEqual(['poke-window'])
    expect(poke({ x: MOUSE.x, y: MOUSE.y })).toEqual(['poke-mouse'])
    expect(poke({ x: LAMP.x, y: LAMP.y })).toEqual(['poke-lamp'])
    expect(poke({ x: BAG.x, y: BAG.top + 60 })).toEqual(['rustle'])
  })

  it('rocks the jar at a tap on its handle, and loses nothing', () => {
    const play = new Play(freshSave(5), 1)
    play.press({ x: HANDLE.left + 20, y: HANDLE.top + 60 })
    play.release()
    run(play, 0.1)
    expect(Math.abs(play.tilt)).toBeGreaterThan(0)
    run(play, 4)
    expect(kindsIn(play)).toEqual([BREAD])
    expect(play.claw.k).toBe(CHEESE)
    expect(Math.abs(play.tilt)).toBeLessThan(0.01)
  })

  it('stays on the rail through a long frame', () => {
    const play = new Play(freshSave(8), 1)
    play.press({ x: 700, y: 300 })
    for (let i = 0; i < 30; i++) play.step(0.1)
    expect(play.claw.x).toBeCloseTo(700, 0)
    expect(Number.isFinite(play.claw.ang)).toBe(true)
    expect(Number.isFinite(play.hang.x + play.hang.y + play.focus.x)).toBe(true)
  })
})

describe('where a touch lands', () => {
  it('knows the shelf, the counter, the handle, the jar and those in the shop', () => {
    const empty = [0, 0, 0, 0]
    THINGS.forEach((_, i) => expect(zoneAt(SHELF[i], empty)).toEqual({ type: 'shelf', thing: i }))
    expect(zoneAt(PLACES[2], empty).type).toBe('bare')
    expect(zoneAt(PLACES[2], [0, 0, BREAD, 0])).toEqual({ type: 'place', place: 2 })
    expect(zoneAt({ x: JAR_MID, y: HANG_Y }, empty).type).toBe('jar')
    expect(zoneAt({ x: JAR_MID, y: JAR.floor - 20 }, empty).type).toBe('jar')
    expect(zoneAt({ x: HANDLE.left + 10, y: HANDLE.top + 10 }, empty).type).toBe('handle')
    expect(zoneAt({ x: SEAT.x, y: SEAT.y }, empty).type).toBe('seat')
    expect(zoneAt({ x: 900, y: 60 }, empty).type).toBe('back-shelf')
  })
})

describe('the burp', () => {
  it('lands what is thrown out on the free places, the far end first', () => {
    expect(burpOutcome([BREAD, CHEESE], [0, 0, 0, 0])).toEqual({ counter: [0, 0, CHEESE, BREAD], landed: [{ k: BREAD, place: 3 }, { k: CHEESE, place: 2 }], bagged: [] })
  })

  it('bags the snacks nearest the paper bag when the places run short, and only as many as it must', () => {
    const outcome = burpOutcome([BREAD, CHEESE, EGG], [ICE, JELLY, 0, CHILLI])
    expect(outcome.bagged).toEqual([{ k: ICE, place: 0 }, { k: JELLY, place: 1 }])
    expect(outcome.counter).toEqual([EGG, CHEESE, BREAD, CHILLI])
    expect(burpOutcome([BREAD], [ICE, JELLY, 0, CHILLI]).bagged).toEqual([])
    const full = burpOutcome([BREAD, BREAD, BREAD, BREAD], [ICE, ICE, ICE, ICE])
    expect(full.bagged).toHaveLength(4)
    expect(full.counter).toEqual([BREAD, BREAD, BREAD, BREAD])
  })

  it('throws the top layer of a full jar onto the counter, and nothing is lost', () => {
    const play = new Play(freshSave(8), 1)
    let dropped = 0
    const cues: Cue[] = []
    while (!play.counter.some((k) => k) && dropped < 60) {
      cues.push(...letGo(play, JAR.left + 50 + ((dropped * 97) % 280), 1.3))
      dropped += 1
    }
    expect(casts(cues)).toContain('burp')
    cues.push(...run(play, 5))
    expect(play.burping).toBe(false)
    const out = play.counter.filter((k) => k).length
    expect(out).toBeGreaterThan(0)
    expect(out).toBeLessThanOrEqual(4)
    expect(play.jar.snacks.length + out).toBe(dropped)
    expect(play.placeIn.every(Boolean)).toBe(true)
    expect(play.flights).toEqual([])
    expect(play.leaving).toEqual([])
    expect(play.swell).toBe(0)
    for (const s of play.jar.snacks) expect(s.y - s.r).toBeGreaterThanOrEqual(JAR.rim - 1)
  })

  it('has the outcome in the state as the burp starts, so a put-away in the middle of it loses nothing and replays nothing', () => {
    const play = nearlyFull()
    expect(play.burping).toBe(true)
    expect(play.takeChange()).toBe(2)
    const during = stored(play.toSave())
    run(play, 6)
    const after = stored(play.toSave())
    expect(during.counter).toEqual(after.counter)
    expect(during.jar.length).toBe(after.jar.length)
    // Opened again in the middle: the snacks lie on the counter and no burp plays.
    const again = new Play(during, 1)
    expect(again.burping).toBe(false)
    expect(casts(run(again, 3))).not.toContain('burp')
    expect(again.counter).toEqual(after.counter)
  })

  it('is ended by a touch, which lands everything at once', () => {
    const play = nearlyFull()
    run(play, 1.2)
    expect(play.flights.length).toBeGreaterThan(0)
    play.press({ x: 20, y: 600 })
    expect(play.burping).toBe(false)
    expect(play.flights.filter((f) => f.scene)).toEqual([])
    expect(play.placeIn.every(Boolean)).toBe(true)
    expect(play.swell).toBe(0)
    expect(play.leaving).toEqual([])
  })

  it('hangs a snack from the counter under the claw again at a tap', () => {
    const play = nearlyFull()
    run(play, 6)
    const place = play.counter.findIndex((k) => k)
    const k = play.counter[place]
    play.press(PLACES[place])
    play.release()
    expect(play.counter[place]).toBe(0)
    run(play, 0.6)
    expect(play.claw).toMatchObject({ k, in: true })
  })

  it('gives each thing its own way out of the jar, and every flight ends on its place', () => {
    expect(new Set(THROWS.map((t) => JSON.stringify(t))).size).toBe(THINGS.length)
    THINGS.forEach((_, thing) => expect(throwOf(1 << thing)).toEqual(THROWS[thing]))
    for (const k of ALL_KINDS) {
      const flight = thrown(k)
      expect(flightAt({ ...flight, t: -1 })).toMatchObject({ x: JAR_MID, y: JAR.rim })
      const end = flightAt({ ...flight, t: flight.lasts })
      expect(end.x).toBeCloseTo(PLACES[1].x)
      expect(end.y).toBeCloseTo(PLACES[1].y)
      const high = Math.min(...Array.from({ length: 40 }, (_, i) => flightAt({ ...flight, t: (flight.lasts * i) / 40 }).y))
      expect(high).toBeLessThan(JAR.rim)
    }
  })

  it('throws a snack of two or three things out as its things fly, together', () => {
    // A toastie: as long and as high as bread and cheese on average, a turn and a quarter, and two bounces where it comes down.
    const toastie = thrown(BREAD | CHEESE)
    expect(toastie.lasts).toBeCloseTo((THROWS[0].lasts + THROWS[1].lasts) / 2)
    expect(toastie.lift).toBeCloseTo((THROWS[0].lift + THROWS[1].lift) / 2)
    expect(toastie.turns).toBeCloseTo(THROWS[0].turns + THROWS[1].turns)
    const after = (flight: Flight, from: number, to: number) => Array.from({ length: 30 }, (_, i) => flightAt({ ...flight, t: flight.lasts * (from + ((to - from) * (i + 0.5)) / 30) }))
    const bounces = after(toastie, airOf(BREAD | CHEESE), 1)
    expect(bounces.every((at) => Math.abs(at.x - PLACES[1].x) < 0.001)).toBe(true)
    const up = bounces.map((at) => PLACES[1].y - at.y > 8)
    expect(up.filter((high, i) => high && !up[i - 1]).length).toBe(2)
    // Frozen bread: down beside the jar's foot, then a slide along the counter to its place.
    const frozen = thrown(BREAD | ICE)
    const slide = after(frozen, airOf(BREAD | ICE), 1)
    expect(slide.every((at) => Math.abs(at.y - PLACES[1].y) < 0.001)).toBe(true)
    expect(Math.abs(slide[0].x - PLACES[1].x)).toBeGreaterThan(60)
    // Frozen cheese does both: two bounces beside the jar's foot, then the slide.
    const both = thrown(CHEESE | ICE)
    expect(airOf(CHEESE | ICE)).toBeCloseTo(0.4)
    expect(after(both, 0.4, 0.7).some((at) => PLACES[1].y - at.y > 8)).toBe(true)
    expect(after(both, 0.7, 1).every((at) => Math.abs(at.y - PLACES[1].y) < 0.001)).toBe(true)
    // Egg on toast turns over as both do, and lands flat.
    expect(thrown(BREAD | EGG).turns).toBeCloseTo(2.25)
    expect(flightAt({ ...thrown(BREAD | EGG), t: thrown(BREAD | EGG).lasts * 0.97 }).squash).toBeGreaterThan(0)
    // With chilli in it the snack rockets off: slow at first, then faster.
    const rocket = thrown(CHILLI | JELLY)
    const early = flightAt({ ...rocket, t: rocket.lasts * 0.25 }), late = flightAt({ ...rocket, t: rocket.lasts * 0.5 })
    expect(Math.abs(late.x - early.x)).toBeGreaterThan(Math.abs(early.x - JAR_MID))
  })

  it('sounds a burped-out snack where it is drawn to touch the counter: a cheese at each of its two bounces, an ice where its slide ends', () => {
    const heard = (k: Kind): number[] => {
      const play = new Play(freshSave(8), 1)
      run(play, 0.5)
      const flight = thrown(k)
      play.flights.push(flight)
      const at: number[] = []
      for (let n = 0; n < 60 * 2.5; n++) {
        play.step(FRAME)
        if (sounds(play.drain()) > 0) at.push((n + 1) * FRAME)
      }
      expect(play.flights).toEqual([])
      return at
    }
    const near = (times: number[], expected: number[]) => {
      expect(times).toHaveLength(expected.length)
      times.forEach((t, i) => expect(Math.abs(t - expected[i])).toBeLessThanOrEqual(FRAME + 1e-9))
    }
    const cheese = thrown(CHEESE), [touch, second] = touchesOf(cheese)
    // Drawn: it is on the counter at both moments, and in the air between them and after the second.
    expect(flightAt({ ...cheese, t: touch }).y).toBeCloseTo(PLACES[1].y, 5)
    expect(flightAt({ ...cheese, t: second }).y).toBeCloseTo(PLACES[1].y, 5)
    expect(flightAt({ ...cheese, t: (touch + second) / 2 }).y).toBeLessThan(PLACES[1].y - 40)
    expect(second).toBeLessThan(cheese.lasts - 0.1)
    near(heard(CHEESE), [touch, second])
    // Bread comes down once, at the end of its flight; ice touches without a sound and clinks where its slide ends.
    near(heard(BREAD), [thrown(BREAD).lasts])
    near(heard(ICE), [thrown(ICE).lasts])
    // A frozen cheese on toast: the toast and the first bounce together, the second bounce, the clink.
    const all = thrown((BREAD | CHEESE | ICE) as Kind), [first, next] = touchesOf(all)
    near(heard((BREAD | CHEESE | ICE) as Kind), [first, next, all.lasts])
  })

  it('leaves an arc of smoke behind a snack with chilli in it, and jiggles one with jelly in it for a long time where it lands', () => {
    // Three rows of snacks that join nothing, with chilli and jelly in the top ones: one more, let go by the glass, burps.
    const lying = [7, 11, 13, 19, 21, 35, BREAD | CHILLI | JELLY, CHEESE | CHILLI | JELLY, EGG | CHILLI | JELLY].map((k, i) => ({ k, x: JAR.left + 60 + (i % 3) * 125, y: JAR.floor - 60 - Math.floor(i / 3) * 125 }))
    const play = new Play({ ...freshSave(8), jar: lying, claw: CHILLI | JELLY | ICE }, 1)
    const cues = letGo(play, JAR.left + 60, 2.2)
    expect(casts(cues)).toContain('burp')
    const out = play.counter.filter((k) => k)
    expect(out.length).toBeGreaterThan(0)
    expect(out.every((k) => k & CHILLI && k & JELLY)).toBe(true)
    const smoke = [...cues, ...run(play, 2)].filter((cue) => cue.type === 'puff' && cue.what === 'smoke' && cue.y < JAR.rim)
    expect(smoke.length).toBeGreaterThanOrEqual(4)
    run(play, 1.5)
    expect(play.flights).toEqual([])
    play.counter.forEach((k, i) => expect(play.jiggle[i] > 0).toBe(k !== 0))
    expect(Math.max(...play.jiggle)).toBeGreaterThan(JIGGLE / 2)
    run(play, JIGGLE)
    expect(play.jiggle.every((left) => left === 0)).toBe(true)
  })
})

describe('what joining gave a snack', () => {
  const flames = (cues: readonly Cue[]) => cues.flatMap((cue) => (cue.type === 'puff' && cue.what === 'flame' ? [cue] : []))

  it('breathes a small flame every few seconds wherever the snack is: in the jar, on the counter, under the claw', () => {
    const play = new Play({ ...freshSave(8), jar: [{ k: BREAD | CHILLI, x: JAR_MID, y: JAR.floor - 48 }], counter: [0, CHEESE | CHILLI, 0, 0], claw: EGG | CHILLI }, 3)
    for (let turn = 0; turn < 3; turn++) {
      const seen = flames(run(play, FLAME_EVERY))
      expect(seen.filter((cue) => cue.y > JAR.rim && cue.y < JAR.floor && cue.x < JAR.right)).toHaveLength(1)
      expect(seen.filter((cue) => cue.y > JAR.floor)).toHaveLength(1)
      expect(seen.filter((cue) => cue.y < JAR.rim)).toHaveLength(1)
    }
    // A plain chilli is not a made snack, and breathes none.
    const plain = new Play({ ...freshSave(8), jar: [{ k: CHILLI, x: JAR_MID, y: JAR.floor - 38 }], claw: CHILLI }, 3)
    expect(flames(run(plain, 2 * FLAME_EVERY))).toEqual([])
  })

  it('lets a drop fall from a cheese band, and steam off a chilli frozen in ice', () => {
    const play = new Play({ ...freshSave(8), jar: [{ k: BREAD | CHEESE, x: JAR_MID - 100, y: JAR.floor - 48 }, { k: CHILLI | ICE, x: JAR_MID + 100, y: JAR.floor - 48 }] }, 3)
    const cues = run(play, 4)
    expect(cues.some((cue) => cue.type === 'puff' && cue.what === 'drip' && cue.x < JAR_MID)).toBe(true)
    expect(cues.some((cue) => cue.type === 'puff' && cue.what === 'steam' && cue.x > JAR_MID)).toBe(true)
  })

  it('shivers a frosted snack for half a second every few, each on its own beat', () => {
    const on = (phase: number) => Array.from({ length: 420 }, (_, i) => shivering(i / 100, phase)).filter(Boolean).length
    expect(on(0)).toBeCloseTo((0.5 / SHIVER_EVERY) * 420, -1)
    expect(shivering(0.2, 0)).toBe(true)
    expect(shivering(0.2, 1)).toBe(false)
  })
})

describe('found as left', () => {
  it('saves nothing in the air: a put-away while a snack falls finds it lying in the jar', () => {
    const play = new Play(freshSave(8), 1)
    play.press(OVER)
    play.release()
    run(play, 0.25)
    expect(play.jar.snacks[0].fresh).toBe(true)
    const save = stored(play.toSave())
    expect(save.jar).toHaveLength(1)
    expect(save.jar[0].y).toBeCloseTo(JAR.floor - radiusOf(BREAD), 0)
    expect(save.claw).toBe(BREAD)
    run(play, 2)
    expect(stored(play.toSave()).jar).toEqual(save.jar)
  })

  it('ends a pull that is under way silently and at once when the game is put away: nothing moves or sounds on the way back', () => {
    const play = new Play({ ...freshSave(8), jar: [{ k: BREAD | CHEESE, x: JAR_MID, y: JAR.floor - radiusOf(BREAD | CHEESE) }] }, 1)
    run(play, 0.5)
    play.press({ x: HANDLE.left + 20, y: HANDLE.top + 60 })
    play.move({ x: HANDLE.left + 20 + 60, y: HANDLE.top + 60 })
    run(play, 0.3)
    expect(play.tip).toBeGreaterThan(0.05)
    play.putAway()
    play.cancel()
    expect(play.tip).toBe(0)
    expect(play.tilt).toBe(0)
    const back = run(play, 2)
    expect(sounds(back)).toBe(0)
    expect(play.tip).toBe(0)
    expect(play.tilt).toBe(0)
    expect(play.finished).toBe(false)
    expect(kindsIn(play)).toEqual([BREAD | CHEESE])
  })

  it('saves a let-go as done from the lift on, before the claw has carried it out: none is lost on a put-away', () => {
    const play = new Play(freshSave(8), 1)
    play.takeChange()
    play.press({ x: JAR.left + 80, y: 300 })
    play.release()
    // The lift itself asks for a save at once, and that save holds the bread as dropped where the finger lifted.
    expect(play.takeChange()).toBe(2)
    expect(play.claw.k).toBe(BREAD)
    expect(play.jar.snacks).toHaveLength(0)
    const save = stored(play.toSave())
    expect(save.jar.map((s) => s.k)).toEqual([BREAD])
    expect(Math.abs(save.jar[0].x - (JAR.left + 80))).toBeLessThan(2)
    expect(save.jar[0].y).toBeCloseTo(JAR.floor - radiusOf(BREAD), 0)
    expect(save.claw).toBe(BREAD)
    // Found again from that save: the bread lies in the jar, the next one hangs, and nothing falls.
    const found = new Play(save, 1)
    expect(kindsIn(found)).toEqual([BREAD])
    expect(found.jar.quiet).toBe(true)
    // Played on instead, the claw drops it there, give or take the swing it still had: under half a bread.
    run(play, 2)
    expect(kindsIn(play)).toEqual([BREAD])
    expect(Math.abs(play.jar.snacks[0].x - save.jar[0].x)).toBeLessThan(radiusOf(BREAD) / 2)
  })

  it('drops the thing the child let go, not the one tapped just after: a tap on the shelf or the counter first carries the let-go out', () => {
    for (const frames of [0, 1, 3, 6]) {
      const play = new Play(freshSave(8), 1)
      play.press({ x: JAR.left + 80, y: 300 })
      play.release()
      for (let i = 0; i < frames; i++) play.step(FRAME)
      play.press(SHELF[4])
      play.release()
      run(play, 2)
      expect(kindsIn(play)).toEqual([BREAD])
      expect(play.claw.k).toBe(JELLY)
      expect(play.flights).toEqual([])
    }
    // The same with a made snack waiting on the counter.
    const play = new Play({ ...freshSave(8), counter: [BREAD | CHEESE, 0, 0, 0] }, 1)
    play.press({ x: JAR.left + 80, y: 300 })
    play.release()
    play.press(PLACES[0])
    play.release()
    run(play, 2)
    expect(kindsIn(play)).toEqual([BREAD])
    expect(play.claw.k).toBe(BREAD | CHEESE)
  })

  it('saves a join that is about to happen as the snack it makes', () => {
    const play = new Play(freshSave(5), 1)
    play.press(OVER)
    play.release()
    run(play, 0.2)
    expect(kindsIn(play)).toEqual([BREAD, CHEESE])
    expect(stored(play.toSave()).jar.map((s) => s.k)).toEqual([BREAD | CHEESE])
  })

  it('ends every fall in the pile the save made at the let-go already held, joins and burps included', () => {
    const play = new Play(freshSave(8), 5)
    let burps = 0
    for (let i = 0; i < 46; i++) {
      play.press(SHELF[(i * 5 + (i >> 3)) % 6])
      play.release()
      run(play, 0.5)
      play.press({ x: JAR.left + 50 + ((i * 97) % 280), y: 300 })
      play.release()
      while (!casts(play.drain()).includes('drop')) play.step(FRAME)
      // Put away now, while the snack is in the air.
      const ahead = stored(play.toSave())
      const cues: Cue[] = []
      for (let n = 0; n < 3000 && (n < 30 || play.busy); n++) cues.push(...run(play, FRAME))
      expect(play.busy).toBe(false)
      if (casts(cues).includes('burp')) burps += 1
      const ended = stored(play.toSave())
      expect(ended.jar).toEqual(ahead.jar)
      expect(ended.counter).toEqual(ahead.counter)
      expect(ended).toEqual(ahead)
    }
    expect(burps).toBeGreaterThanOrEqual(2)
  }, 60000)

  it('is found after the burp when it was put away before the snack that caused it had landed, and no burp plays', () => {
    const play = new Play(freshSave(8), 1)
    let ahead: Save | null = null
    for (let i = 0; i < 60 && !ahead; i++) {
      play.press({ x: JAR.left + 50 + ((i * 97) % 280), y: 300 })
      play.release()
      while (!casts(play.drain()).includes('drop')) play.step(FRAME)
      const save = stored(play.toSave())
      if (save.counter.some((k) => k)) {
        // The jar on screen has not burped yet: the snack is still falling.
        expect(play.counter.some((k) => k)).toBe(false)
        expect(play.burping).toBe(false)
        ahead = save
      } else run(play, 1.3)
    }
    expect(ahead).not.toBeNull()
    const again = new Play(ahead!, 1)
    expect(casts(run(again, 5))).toEqual([])
    expect(again.playing).toBeNull()
    expect(stored(again.toSave())).toEqual(ahead)
    for (const s of again.jar.snacks) expect(s.y - s.r).toBeGreaterThanOrEqual(JAR.rim - 1)
  })

  it('keeps one place on the counter free for a made snack that hangs under the claw', () => {
    const play = nearlyFull()
    run(play, 6)
    // Make a toastie, burp it out with more bread, and hang it under the claw.
    const filled = new Play({ ...freshSave(8), jar: play.toSave().jar, counter: [BREAD | CHEESE, BREAD, BREAD, 0] }, 1)
    filled.press(PLACES[0])
    filled.release()
    run(filled, 0.6)
    expect(filled.claw).toMatchObject({ k: BREAD | CHEESE, in: true })
    expect(filled.counter).toEqual([0, BREAD, BREAD, 0])
    // Fill the jar from the counter's bread until it burps: the burp throws at most three, and leaves a place.
    const cues: Cue[] = []
    for (let i = 0; i < 12 && !casts(cues).includes('burp'); i++) {
      filled.jar.drop(BREAD, JAR.left + 50 + ((i * 97) % 280), 150)
      cues.push(...run(filled, 1.3))
    }
    expect(casts(cues)).toContain('burp')
    run(filled, 6)
    expect(filled.counter.filter((k) => !k)).toHaveLength(1)
    // The thing on the shelf takes the claw, and the toastie goes back to the place that was kept.
    filled.press(SHELF[5])
    filled.release()
    run(filled, 1)
    expect(filled.counter).toContain(BREAD | CHEESE)
    expect(filled.counter.every((k) => k)).toBe(true)
    expect(filled.flights).toEqual([])
  })

  it('comes back exactly as it was put away, with no scene and no sound', () => {
    const play = new Play(freshSave(5), 7)
    for (const [thing, x] of [[2, 520], [3, 640], [4, 450], [5, 700], [0, 560]] as const) {
      play.press(SHELF[thing])
      play.release()
      run(play, 0.6)
      letGo(play, x)
    }
    run(play, 3)
    const save = stored(play.toSave())
    const again = new Play(save, 99)
    expect(stored(again.toSave())).toEqual(save)
    expect(again.jar.quiet).toBe(true)
    expect(again.claw.in).toBe(true)
    // Nothing but the small flame a hot snack breathes now and then.
    const heard = run(again, 3).filter((cue) => cue.type !== 'puff')
    for (const cue of heard) expect(cue.type === 'sound' && cue.notes.map((note) => note.frequency)).toEqual(FLAME.map((note) => note.frequency))
    expect(stored(again.toSave())).toEqual(save)
  })

  it('marks what a save should hold: a let-go at once, before the snack lands, and a pick at the throttle', () => {
    const play = new Play(freshSave(8), 1)
    expect(play.takeChange()).toBe(0)
    play.press(OVER)
    expect(play.takeChange()).toBe(0)
    play.release()
    while (play.jar.snacks.length === 0) play.step(FRAME)
    expect(play.jar.snacks[0].fresh).toBe(true)
    expect(play.takeChange()).toBe(2)
    expect(play.takeChange()).toBe(0)
    play.press(SHELF[3])
    expect(play.takeChange()).toBe(1)
  })

  it('keeps the save small and whole after a long visit', () => {
    const play = new Play(freshSave(8), 3)
    for (let i = 0; i < 70; i++) {
      play.press(SHELF[(i * 5) % 6])
      play.release()
      run(play, 0.5)
      letGo(play, JAR.left + 50 + ((i * 97) % 280), 0.9)
    }
    run(play, 8)
    const save = play.toSave()
    expect(JSON.stringify(save).length).toBeLessThan(4096)
    expect(stored(save)).toEqual(save)
    for (const s of play.jar.snacks) expect(Number.isFinite(s.x + s.y)).toBe(true)
  })
})
