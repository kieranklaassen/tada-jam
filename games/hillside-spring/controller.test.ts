import { describe, expect, it } from 'vitest'
import { GardenController, GROW_SECONDS, RACK, REST_BEFORE_PACING, type Picker, type Scenery, type Target } from './controller'
import { IDLE_BEFORE_DEMO } from './guidance'
import { buildable, cellIndex, PLOTS } from './layout'
import type { Piece } from './pieces'
import { defaultGarden, deserialize, type GardenState } from './state'
import { NEVER } from './waterTiming'

// A stand-in for the view: cells are 100 px squares from the top left, the
// rack is a row of 100 px slots below y = 1000.
const picker: Picker = {
  pick(at): Target {
    if (at.y >= 1000) return { kind: 'rack', slot: Math.floor(at.x / 100) }
    return { kind: 'cell', c: Math.floor(at.x / 100), r: Math.floor(at.y / 100) }
  },
  dropCell(at) {
    const c = Math.floor(at.x / 100)
    const r = Math.floor(at.y / 100)
    return at.y < 1000 && buildable(c, r) ? { c, r } : null
  },
}

const centre = (c: number, r: number) => ({ x: c * 100 + 50, y: r * 100 + 50 })
const slot = (s: number) => ({ x: s * 100 + 50, y: 1050 })

function garden(state: GardenState = defaultGarden(8)) {
  const saves: GardenState[] = []
  const controller = new GardenController(state, { save: (s) => saves.push(JSON.parse(JSON.stringify(s))) })
  controller.setPicker(picker)
  controller.setRunning(true)
  return { controller, saves }
}

let clock = 0
function drag(controller: GardenController, from: { x: number; y: number }, to: { x: number; y: number }, id = 1) {
  controller.pointerDown(id, from, (clock += 10))
  controller.pointerMove(id, { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 })
  controller.pointerMove(id, to)
  controller.pointerUp(id, to, (clock += 300))
}

function tap(controller: GardenController, at: { x: number; y: number }, id = 1) {
  controller.pointerDown(id, at, (clock += 10))
  controller.pointerUp(id, at, (clock += 80))
}

function run(controller: GardenController, seconds: number) {
  for (let t = 0; t < seconds; t += 1 / 30) controller.step(1 / 30)
}

describe('GardenController', () => {
  it('places a piece dragged from the rack and saves at once', () => {
    const { controller, saves } = garden()
    drag(controller, slot(RACK.indexOf('bend')), centre(3, 1))
    expect(controller.state.pieces).toEqual([{ kind: 'bend', c: 3, r: 1, turn: 0, open: true }])
    expect(saves.at(-1)?.pieces).toHaveLength(1)
  })

  it('turns a bamboo piece a quarter on tap and springs the display toward it', () => {
    const { controller } = garden()
    drag(controller, slot(RACK.indexOf('bend')), centre(3, 1))
    tap(controller, centre(3, 1))
    expect(controller.state.pieces[0].turn).toBe(1)
    const m = controller.motion[cellIndex(3, 1)]
    expect(m.target).toBe(1)
    run(controller, 1.5)
    expect(m.turn).toBeCloseTo(1, 2)
  })

  it('opens and shuts a sluice on tap instead of turning it', () => {
    const { controller } = garden()
    drag(controller, slot(RACK.indexOf('sluice')), centre(3, 1))
    tap(controller, centre(3, 1))
    expect(controller.state.pieces[0]).toMatchObject({ kind: 'sluice', turn: 0, open: false })
    tap(controller, centre(3, 1))
    expect(controller.state.pieces[0].open).toBe(true)
  })

  it('drops a shut sluice board under its weight with one small bounce, and lifts an opened one', () => {
    const { controller } = garden()
    drag(controller, slot(RACK.indexOf('sluice')), centre(3, 1))
    const m = controller.motion[cellIndex(3, 1)]
    expect(m.gate).toBe(1)
    tap(controller, centre(3, 1))
    let landedAt = -1
    let bounce = 0
    for (let t = 0; t < 1; t += 1 / 60) {
      controller.step(1 / 60)
      if (landedAt < 0 && m.gate === 0) landedAt = t
      if (landedAt >= 0) bounce = Math.max(bounce, m.gate)
    }
    expect(landedAt).toBeGreaterThan(0)
    expect(landedAt).toBeLessThan(0.3)
    expect(bounce).toBeGreaterThan(0)
    expect(bounce).toBeLessThan(0.15)
    expect(m.gate).toBe(0)
    tap(controller, centre(3, 1))
    run(controller, 1)
    expect(m.gate).toBeCloseTo(1, 2)
  })

  it('puts a piece back when it is dragged off the hillside', () => {
    const { controller } = garden()
    drag(controller, slot(0), centre(3, 1))
    drag(controller, centre(3, 1), slot(2))
    expect(controller.state.pieces).toEqual([])
    expect(controller.effects.some((e) => e.type === 'putBack')).toBe(true)
  })

  it('sends a carried hillside piece home when the carry is cancelled', () => {
    const { controller, saves } = garden()
    drag(controller, slot(0), centre(3, 1))
    controller.pointerDown(7, centre(3, 1), (clock += 10))
    controller.pointerMove(7, centre(5, 2))
    expect(controller.state.pieces).toEqual([])
    expect(saves.at(-1)?.pieces).toEqual([{ kind: 'bend', c: 3, r: 1, turn: 0, open: true }])
    controller.setRunning(false)
    expect(controller.state.pieces).toEqual([{ kind: 'bend', c: 3, r: 1, turn: 0, open: true }])
  })

  it('never drops a piece onto a plot', () => {
    const { controller } = garden()
    const plot = PLOTS[0]
    drag(controller, slot(0), centre(plot.c, plot.r))
    expect(controller.state.pieces).toEqual([])
  })

  it('lets water reach a plot, grows it to bloom, and keeps the bloom when the water is cut', () => {
    const { controller } = garden()
    // A bend at the spring's foot pours east; a second bend turned twice catches it and pours down column 4 to the sunflower.
    drag(controller, slot(RACK.indexOf('bend')), centre(3, 0))
    expect(controller.state.pieces[0].turn).toBe(0)
    drag(controller, slot(RACK.indexOf('bend')), centre(4, 0))
    tap(controller, centre(4, 0))
    tap(controller, centre(4, 0))
    const sunflower = PLOTS.find((p) => p.kind === 'sunflower')!
    expect(controller.flow.plotFlow[sunflower.id]).toBeGreaterThan(0)
    expect(controller.wetAt[sunflower.id]).toBeLessThan(NEVER)
    run(controller, GROW_SECONDS + 3)
    expect(controller.state.growth[sunflower.id]).toBe(1)
    expect(controller.effects.some((e) => e.type === 'bloom' && e.plot === sunflower.id)).toBe(true)
    drag(controller, centre(3, 0), slot(0))
    run(controller, 3)
    expect(controller.state.growth[sunflower.id]).toBe(1)
  })

  it('harvests a bloomed plot back to a sprout on tap', () => {
    const state = defaultGarden(8)
    state.growth[0] = 1
    const { controller } = garden(state)
    tap(controller, centre(PLOTS[0].c, PLOTS[0].r))
    expect(controller.state.growth[0]).toBe(0)
  })

  it('starts the youngest with a bend turned away from the plots', () => {
    const { controller } = garden(defaultGarden(5))
    expect(controller.state.pieces).toHaveLength(1)
    expect(controller.hint?.kind).toBe('turn')
  })

  it('answers each poke with a fresh move and a voice to match, and lets a bloom cue only the visitors who are there', () => {
    const state = defaultGarden(8)
    const sunflower = PLOTS.find((p) => p.kind === 'sunflower')!
    state.pieces = [
      { kind: 'bend', c: 3, r: 0, turn: 0, open: true },
      { kind: 'bend', c: 4, r: 0, turn: 2, open: true },
    ]
    state.growth[sunflower.id] = 0.9
    const moves: string[] = []
    const quiet = () => {}
    const controller = new GardenController(state, {
      save: quiet,
      sound: { unlock: quiet, setActive: quiet, tok: quiet, clunk: quiet, lift: quiet, putBack: quiet, chime: quiet, pop: quiet, rustle: quiet, splash: quiet, scenery: quiet, arrive: quiet, poke: (move) => moves.push(move), flow: quiet, dispose: quiet },
    })
    controller.setPicker({ ...picker, pick: (at) => (at.y < 0 ? { kind: 'creature', which: 'sparrow' } : picker.pick(at)) })
    controller.setRunning(true)
    expect(controller.creatures.find((c) => c.kind === 'sparrow')?.phase).toBe('here')

    for (let i = 0; i < 6; i++) {
      tap(controller, { x: 50, y: -50 })
      run(controller, 0.2)
    }
    expect(moves).toHaveLength(6)
    for (let i = 1; i < moves.length; i++) expect(moves[i]).not.toBe(moves[i - 1])
    expect(moves.every((move) => controller.creatureMotion.sparrow.personality.poke.some((a) => a.name === move))).toBe(true)

    run(controller, 1)
    expect(controller.effects.some((e) => e.type === 'bloom' && e.plot === sunflower.id)).toBe(true)
    expect(controller.creatureMotion.sparrow.pendingCue).not.toBeNull()
    expect(controller.creatureMotion.frog.pendingCue).toBeNull()
  })

  it('gives each piece its weight: a wheel lifts and lands lower and heavier than a straight', () => {
    const toks: { pitch: number; weight: number }[] = []
    const lifts: number[] = []
    const quiet = () => {}
    const controller = new GardenController(defaultGarden(8), {
      save: quiet,
      sound: { unlock: quiet, setActive: quiet, tok: (pitch, weight = 1) => toks.push({ pitch, weight }), clunk: quiet, lift: (weight) => lifts.push(weight), putBack: quiet, chime: quiet, pop: quiet, rustle: quiet, splash: quiet, scenery: quiet, arrive: quiet, poke: quiet, flow: quiet, dispose: quiet },
    })
    controller.setPicker(picker)
    controller.setRunning(true)
    drag(controller, slot(RACK.indexOf('straight')), centre(1, 1))
    drag(controller, slot(RACK.indexOf('wheel')), centre(5, 1))
    expect(lifts).toHaveLength(2)
    expect(lifts[1]).toBeGreaterThan(lifts[0])
    expect(toks).toHaveLength(2)
    expect(toks[1].pitch).toBeLessThan(toks[0].pitch)
    expect(toks[1].weight).toBeGreaterThan(1)
    expect(toks[0].weight).toBeLessThanOrEqual(1)
    expect(controller.effects.filter((e) => e.type === 'place').map((e) => e.type === 'place' && e.kind)).toEqual(['straight', 'wheel'])
  })

  it('plays an arrival once a visitor reaches its spot', () => {
    const { controller } = garden()
    drag(controller, slot(RACK.indexOf('bend')), centre(3, 0))
    drag(controller, slot(RACK.indexOf('bend')), centre(4, 0))
    tap(controller, centre(4, 0))
    tap(controller, centre(4, 0))
    const sparrow = controller.creatures.find((c) => c.kind === 'sparrow')!
    let arrived = -1
    for (let t = 0; t < 20 && arrived < 0; t += 1 / 30) {
      controller.step(1 / 30)
      if (sparrow.phase === 'here') arrived = controller.now
    }
    expect(arrived).toBeGreaterThan(0)
    expect(controller.creatureMotion.sparrow.current('arrive', arrived)).toBe('flare-and-fluff')
  })

  it('has a dry plot reach eagerly when water is routed closer, timed to the water arriving', () => {
    const { controller } = garden(defaultGarden(9))
    drag(controller, slot(RACK.indexOf('bend')), centre(3, 0))
    let reached = 0
    for (let turn = 0; turn < 4; turn++) {
      run(controller, 3)
      const before = controller.reach.map((r) => r.cells)
      const was = [...controller.reachAt]
      const at = controller.now
      tap(controller, centre(3, 0))
      for (const plot of PLOTS) {
        const closer = controller.state.growth[plot.id] < 1 && controller.wetAt[plot.id] >= NEVER && controller.reach[plot.id].cells < before[plot.id]
        if (closer) {
          reached++
          expect(controller.reachAt[plot.id]).toBeGreaterThanOrEqual(at)
          expect(controller.reachAt[plot.id]).toBeLessThan(at + 3)
        } else expect(controller.reachAt[plot.id]).toBe(was[plot.id])
      }
    }
    expect(reached).toBeGreaterThan(0)
  })

  it('rests once nothing new has happened for a while, and wakes for a demonstration or a touch', () => {
    const { controller } = garden()
    expect(controller.resting).toBe(false)
    // Untouched, demonstrations play at 5, 18.2, 41.4 and 84.6 s, 3.2 s each.
    run(controller, 60)
    expect(controller.resting).toBe(false)
    run(controller, 10)
    expect(controller.resting).toBe(true)
    run(controller, 16)
    expect(controller.guide.demo).not.toBeNull()
    expect(controller.resting).toBe(false)
    run(controller, 3 + REST_BEFORE_PACING)
    expect(controller.resting).toBe(true)
    tap(controller, centre(3, 1))
    expect(controller.resting).toBe(false)
  })

  it('lets a bloom be watched: the harvest it makes possible waits a fresh idle stretch before being shown', () => {
    const state = defaultGarden(8)
    state.pieces = [
      { kind: 'split', c: 3, r: 0, turn: 0, open: true },
      { kind: 'split', c: 4, r: 0, turn: 2, open: true },
      { kind: 'wheel', c: 4, r: 1, turn: 0, open: true },
      { kind: 'split', c: 2, r: 2, turn: 3, open: true },
    ]
    // The cosmos blooms just after the first demonstration would have begun.
    state.growth = [1, 1, 1, 0.1]
    const { controller } = garden(state)
    let bloomedAt = -1
    for (let t = 0; t < 10 && bloomedAt < 0; t += 1 / 30) {
      controller.step(1 / 30)
      if (controller.effects.some((e) => e.type === 'bloom')) bloomedAt = controller.now
    }
    expect(bloomedAt).toBeGreaterThan(IDLE_BEFORE_DEMO)
    expect(controller.hint?.kind).toBe('harvest')
    expect(controller.guide.demo).toBeNull()
    run(controller, IDLE_BEFORE_DEMO - 0.2)
    expect(controller.guide.demo).toBeNull()
    run(controller, 0.4)
    expect(controller.guide.demo).not.toBeNull()
  })

  it('has a tapped thirsty plot shake and then reach toward its water, but not a plot that is already drinking', () => {
    const { controller } = garden()
    const cosmos = PLOTS.find((p) => p.kind === 'cosmos')!
    const rice = PLOTS.find((p) => p.kind === 'rice')!
    drag(controller, slot(RACK.indexOf('bend')), centre(3, 1))
    for (let i = 0; i < 3; i++) tap(controller, centre(3, 1))
    run(controller, 4)
    expect(controller.wetness[cosmos.id]).toBeGreaterThan(0.5)
    expect(controller.wetness[rice.id]).toBeLessThan(0.5)

    const drinking = controller.reachAt[cosmos.id]
    tap(controller, centre(cosmos.c, cosmos.r))
    expect(controller.plotTappedAt[cosmos.id]).toBe(controller.now)
    expect(controller.reachAt[cosmos.id]).toBe(drinking)

    tap(controller, centre(rice.c, rice.r))
    expect(controller.reachAt[rice.id]).toBeGreaterThan(controller.now)
    expect(controller.reachAt[rice.id]).toBeLessThan(controller.now + 1)
    expect(controller.effects.at(-1)).toEqual({ type: 'wiggle', plot: rice.id })
  })

  it('answers a touch on the scenery with motion and a sound of its own, and changes nothing in the garden', () => {
    const heard: Scenery[] = []
    const saves: GardenState[] = []
    const quiet = () => {}
    const controller = new GardenController(defaultGarden(8), {
      save: (s) => saves.push(s),
      sound: { unlock: quiet, setActive: quiet, tok: quiet, clunk: quiet, lift: quiet, putBack: quiet, chime: quiet, pop: quiet, rustle: quiet, splash: quiet, scenery: (where) => heard.push(where), arrive: quiet, poke: quiet, flow: quiet, dispose: quiet },
    })
    const regions: Scenery[] = ['sky', 'meadow', 'creek']
    controller.setPicker({ ...picker, pick: (at) => (at.y < 0 ? { kind: 'scenery', where: regions[Math.floor(at.x / 100)], at } : picker.pick(at)) })
    controller.setRunning(true)
    run(controller, 0.5)
    const before = saves.length
    for (let i = 0; i < regions.length; i++) tap(controller, { x: i * 100 + 50, y: -40 })
    expect(heard).toEqual(regions)
    const touches = controller.effects.filter((e) => e.type === 'touch')
    expect(touches.map((e) => e.type === 'touch' && e.where)).toEqual(regions)
    expect(touches.map((e) => e.type === 'touch' && e.at.x)).toEqual([50, 150, 250])
    expect(controller.state.pieces).toEqual([])
    expect(saves.length).toBe(before)
  })

  it('ignores a fourth finger and cancels every carry', () => {
    const { controller } = garden()
    controller.pointerDown(1, slot(0), 0)
    controller.pointerMove(1, centre(2, 2))
    controller.pointerDown(2, slot(1), 0)
    controller.pointerMove(2, centre(3, 2))
    controller.pointerDown(3, slot(2), 0)
    controller.pointerMove(3, centre(5, 1))
    expect(controller.held.size).toBe(3)
    controller.pointerDown(4, centre(1, 1), 0)
    expect(controller.held.size).toBe(0)
    expect(controller.state.pieces).toEqual([])
  })
})

describe('putting the garden away', () => {
  type Moment = { name: string; act: (garden: GardenController) => void; pieces: Piece[] }
  const bend = (c: number, r: number, turn = 0): Piece => ({ kind: 'bend', c, r, turn, open: true })
  const cosmos = PLOTS.find((plot) => plot.kind === 'cosmos')!
  // One session, moment by moment; `pieces` is the garden the child has left at that moment. A piece in the hand
  // counts where it came from: on the hillside if it was lifted from there, nowhere if it came from the rack.
  const session: Moment[] = [
    { name: 'picks a bend off the rack', act: (g) => g.pointerDown(1, slot(RACK.indexOf('bend')), (clock += 10)), pieces: [] },
    { name: 'carries it up the hill', act: (g) => g.pointerMove(1, centre(3, 2)), pieces: [] },
    { name: 'holds it over its cell', act: (g) => g.pointerMove(1, centre(3, 0)), pieces: [] },
    { name: 'lets go', act: (g) => g.pointerUp(1, centre(3, 0), (clock += 300)), pieces: [bend(3, 0)] },
    { name: 'watches the water', act: (g) => run(g, 1), pieces: [bend(3, 0)] },
    { name: 'touches the bend again', act: (g) => g.pointerDown(1, centre(3, 0), (clock += 10)), pieces: [bend(3, 0)] },
    { name: 'carries it a terrace down', act: (g) => g.pointerMove(1, centre(3, 1)), pieces: [bend(3, 0)] },
    { name: 'lets go there', act: (g) => g.pointerUp(1, centre(3, 1), (clock += 300)), pieces: [bend(3, 1)] },
    { name: 'turns it', act: (g) => tap(g, centre(3, 1)), pieces: [bend(3, 1, 1)] },
    { name: 'turns it toward the cosmos', act: (g) => (tap(g, centre(3, 1)), tap(g, centre(3, 1))), pieces: [bend(3, 1, 3)] },
    { name: 'watches the cosmos drink', act: (g) => run(g, 4), pieces: [bend(3, 1, 3)] },
    { name: 'watches it bloom', act: (g) => run(g, GROW_SECONDS + 1), pieces: [bend(3, 1, 3)] },
    { name: 'picks the bloom', act: (g) => tap(g, centre(cosmos.c, cosmos.r)), pieces: [bend(3, 1, 3)] },
    { name: 'picks the wheel off the rack', act: (g) => g.pointerDown(2, slot(RACK.indexOf('wheel')), (clock += 10)), pieces: [bend(3, 1, 3)] },
    { name: 'carries it over the hill', act: (g) => g.pointerMove(2, centre(5, 1)), pieces: [bend(3, 1, 3)] },
    { name: 'sets it down', act: (g) => g.pointerUp(2, centre(5, 1), (clock += 300)), pieces: [bend(3, 1, 3), { kind: 'wheel', c: 5, r: 1, turn: 0, open: true }] },
  ]
  const byCell = (pieces: readonly Piece[]) => [...pieces].sort((a, b) => cellIndex(a.c, a.r) - cellIndex(b.c, b.r))

  for (const how of ['put away at once', 'looked away first'] as const) {
    it(`loses nothing wherever the session stops (${how}): the last save reopens as the garden the child left`, () => {
      for (let stop = 0; stop < session.length; stop++) {
        const { controller, saves } = garden()
        for (let i = 0; i <= stop; i++) session[i].act(controller)
        const growth = [...controller.state.growth]
        if (how === 'looked away first') controller.setRunning(false)
        controller.dispose()
        const reopened = deserialize(saves.at(-1) ?? null, 8)
        const moment = `after "${session[stop].name}"`
        expect(byCell(reopened.pieces), moment).toEqual(byCell(session[stop].pieces))
        reopened.growth.forEach((g, id) => expect(g, `${moment}, plot ${id}`).toBeCloseTo(growth[id], 3))
      }
    })
  }

  it('plays the session it describes: real carries, growth, a bloom and a harvest', () => {
    const { controller } = garden()
    const seen = session.map((moment) => {
      moment.act(controller)
      return { held: controller.held.size, cosmos: controller.state.growth[cosmos.id] }
    })
    const at = (name: string) => seen[session.findIndex((moment) => moment.name === name)]
    for (const name of ['carries it up the hill', 'carries it a terrace down', 'carries it over the hill']) expect(at(name).held, name).toBe(1)
    expect(at('watches the cosmos drink').cosmos).toBeGreaterThan(0.2)
    expect(at('watches the cosmos drink').cosmos).toBeLessThan(1)
    expect(at('watches it bloom').cosmos).toBe(1)
    expect(at('picks the bloom').cosmos).toBe(0)
  })
})
