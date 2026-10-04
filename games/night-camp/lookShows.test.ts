import { describe, expect, it } from 'vitest'
import { boardFor } from './board'
import { restGameFrame, type EffectFrame } from './frame'
import { GRID, OBJECTS } from './grid'
import { SHOW_KINDS, paintShows } from './lookShows'
import { CAMPERS, SITES, type CamperId } from './world'

// The shows are held to their rules on a recording stand-in for a 2D context: every call and every ink that is set
// is written to a log, so two paintings can be compared call for call, and a number that is not finite is counted.

type Recorder = { log: string[]; calls: Map<string, number>; bad: number }

function fakeContext(): { ctx: CanvasRenderingContext2D; into: Recorder } {
  const into: Recorder = { log: [], calls: new Map(), bad: 0 }, state: Record<string, unknown> = {}
  const say = (value: unknown) => (typeof value === 'number' ? value.toFixed(3) : typeof value === 'string' ? value : typeof value)
  const ctx = new Proxy(state, {
    get(target, name) {
      if (typeof name !== 'string') return undefined
      if (name in target) return target[name]
      return (...args: unknown[]) => {
        into.calls.set(name, (into.calls.get(name) ?? 0) + 1)
        for (const arg of args) if (typeof arg === 'number' && !Number.isFinite(arg)) into.bad++
        into.log.push(`${name}(${args.map(say).join(',')})`)
        return undefined
      }
    },
    set(target, name, value) {
      if (typeof name === 'string') { target[name] = value; into.log.push(`${name}=${say(value)}`); if (typeof value === 'number' && !Number.isFinite(value)) into.bad++ }
      return true
    },
  }) as unknown as CanvasRenderingContext2D
  return { ctx, into }
}

const board = boardFor(1180, 820, SITES.summit[0])
const MOMENTS = [0.1, 0.3, 0.5, 0.7, 0.9]
const INKED = ['fill', 'stroke']
const ON_CAMPER = OBJECTS.map((thing) => GRID[thing]['on-camper'].result)
const AT_A_CAMPER = [...ON_CAMPER, 'mug', 'cold-mug', 'empty-mug']
const AT_A_LANTERN = OBJECTS.map((thing) => GRID[thing]['on-lantern'].result)

/** One show, where the game would put it. */
function effect(kind: string, t: number, who: CamperId | null = null, seed = 7): EffectFrame {
  const frame = restGameFrame(board), camper = AT_A_CAMPER.includes(kind) ? who ?? 'cook' : null
  const at = camper ? frame.places[camper] : AT_A_LANTERN.includes(kind) ? frame.lanterns[0] : board.fire
  return { kind, x: at.x, y: at.y, t, who: camper, seed }
}

/** Paints a frame holding these shows and gives back the count and the record. */
function paint(effects: EffectFrame[]) {
  const frame = restGameFrame(board), { ctx, into } = fakeContext()
  frame.effects = effects
  const figures = paintShows(ctx, board, frame)
  const inked = INKED.reduce((sum, name) => sum + (into.calls.get(name) ?? 0), 0)
  return { figures, inked, into, log: into.log.join('\n') }
}

describe('the shows of Night Camp', () => {
  it('has a show for every wrong use on the fire, a lantern or a camper, and for what the night adds', () => {
    const wanted = new Set<string>(['gutters', 'mug', 'cold-mug', 'empty-mug', GRID.log['on-fire'].result, GRID.flask['on-lantern'].result])
    for (const thing of OBJECTS) for (const action of ['on-fire', 'on-lantern', 'on-camper'] as const) {
      const cell = GRID[thing][action]
      if (!cell.right) wanted.add(cell.result)
      if (cell.atNight) wanted.add(cell.atNight)
    }
    for (const kind of wanted) expect(SHOW_KINDS, kind).toContain(kind)
    expect(SHOW_KINDS.length).toBe(24)
  })

  it('paints every show at five moments, without a throw, a text call or a number that is not finite', () => {
    for (const kind of SHOW_KINDS) {
      let drawn = 0
      for (const t of MOMENTS) {
        const shot = paint([effect(kind, t)])
        for (const name of ['fillText', 'strokeText', 'measureText']) expect(shot.into.calls.get(name) ?? 0, `${kind} ${name}`).toBe(0)
        expect(shot.into.bad, `${kind} at ${t}`).toBe(0)
        expect(shot.figures, `${kind} at ${t}`).toBeLessThanOrEqual(12)
        // What is saved is restored: a show leaves the context as it found it.
        expect(shot.into.calls.get('save') ?? 0, `${kind} at ${t}`).toBe(shot.into.calls.get('restore') ?? 0)
        drawn += shot.inked
      }
      expect(drawn, kind).toBeGreaterThan(4)
    }
  })

  it('draws something for every show through most of its length', () => {
    for (const kind of SHOW_KINDS) {
      const live = MOMENTS.filter((t) => paint([effect(kind, t)]).inked > 0).length
      expect(live, kind).toBeGreaterThanOrEqual(3)
    }
  })

  it('holds at the very ends of a show, and past them', () => {
    for (const kind of SHOW_KINDS) for (const t of [0, 1, -0.5, 1.5, 0.001, 0.999]) {
      const shot = paint([effect(kind, t)])
      expect(shot.into.bad, `${kind} at ${t}`).toBe(0)
    }
  })

  it('draws nothing for a kind it does not know, a place that is not a number, or no shows at all', () => {
    expect(paint([]).into.log.length).toBe(0)
    for (const kind of ['', 'toString', 'constructor', 'log-rolls-half-a-turn', 'a-show-nobody-wrote']) {
      const shot = paint([effect(kind, 0.5)])
      expect(shot.figures, kind).toBe(0)
      expect(shot.inked, kind).toBe(0)
    }
    const lost = paint([{ ...effect('gutters', 0.3), x: Number.NaN }, { ...effect('mug', 0.3), t: Number.NaN }])
    expect(lost.figures).toBe(0)
    expect(lost.inked).toBe(0)
  })

  it('paints the same frame twice as the same picture', () => {
    for (const kind of SHOW_KINDS) for (const t of [0.2, 0.55, 0.8]) expect(paint([effect(kind, t)]).log, kind).toBe(paint([effect(kind, t)]).log)
    for (const who of CAMPERS) expect(paint([effect('camper-uses-it-their-own-way', 0.4, who)]).log).toBe(paint([effect('camper-uses-it-their-own-way', 0.4, who)]).log)
  })

  it('gives no two shows the same animation', () => {
    for (const t of MOMENTS) {
      const seen = new Map<string, string>()
      for (const kind of SHOW_KINDS) {
        const shot = paint([effect(kind, t)])
        if (shot.inked === 0) continue
        expect(seen.get(shot.log), `${kind} at ${t}`).toBeUndefined()
        seen.set(shot.log, kind)
      }
    }
    // Nor do two shows move alike under their different inks: over its five moments each has a count of calls of its own.
    const shapes = new Map<string, string>()
    for (const kind of SHOW_KINDS) {
      const shape = MOMENTS.map((t) => paint([effect(kind, t)]).into.log.length).join(' ')
      expect(shapes.get(shape), kind).toBeUndefined()
      shapes.set(shape, kind)
    }
  })

  it('plays a show on a camper in that camper’s own way', () => {
    for (const kind of ON_CAMPER) {
      const ways = new Set(CAMPERS.map((who) => MOMENTS.map((t) => paint([effect(kind, t, who)]).log).join('\n--\n')))
      expect(ways.size, kind).toBe(CAMPERS.length)
    }
    // A log is used five ways that share no moment at all.
    for (const t of [0.3, 0.5, 0.7]) expect(new Set(CAMPERS.map((who) => paint([effect('camper-uses-it-their-own-way', t, who)]).log)).size).toBe(CAMPERS.length)
  })

  it('changes a little with the seed, and not at all with a seed that is the same', () => {
    expect(paint([effect('fire-flares-and-the-eyes-jump-back', 0.4, null, 3)]).log).not.toBe(paint([effect('fire-flares-and-the-eyes-jump-back', 0.4, null, 4)]).log)
    expect(paint([effect('fire-flares-and-the-eyes-jump-back', 0.4, null, 3)]).log).toBe(paint([effect('fire-flares-and-the-eyes-jump-back', 0.4, null, 3)]).log)
  })

  it('keeps a frame with eight shows at once light', () => {
    const busiest = [...SHOW_KINDS].sort((a, b) => Math.max(...MOMENTS.map((t) => paint([effect(b, t)]).figures)) - Math.max(...MOMENTS.map((t) => paint([effect(a, t)]).figures))).slice(0, 8)
    for (const t of MOMENTS) {
      const shot = paint(busiest.map((kind, i) => effect(kind, t, CAMPERS[i % CAMPERS.length])))
      expect(shot.figures, `at ${t}`).toBeLessThan(60)
      expect(shot.inked, `at ${t}`).toBeLessThan(160)
    }
  })

  it('draws on a small surface and a large one without a number going wrong', () => {
    for (const [w, h] of [[590, 410], [1640, 1140]]) {
      const small = boardFor(w, h, SITES.meadow[0]), frame = restGameFrame(small), { ctx, into } = fakeContext()
      frame.effects = SHOW_KINDS.map((kind, i) => ({ kind, x: small.fire.x, y: small.fire.y, t: 0.1 + (i % 9) * 0.1, who: CAMPERS[i % CAMPERS.length], seed: i }))
      expect(paintShows(ctx, small, frame)).toBeGreaterThan(20)
      expect(into.bad).toBe(0)
    }
  })
})
