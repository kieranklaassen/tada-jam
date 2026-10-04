import { describe, expect, it, vi } from 'vitest'
import { boardFor, type Board } from './board'
import { restGameFrame, type GameFrame } from './frame'
import { Look, kitSlide } from './look'
import { ACTS } from './tastes'
import { CAMPERS, PLACES, ROD_LENGTH, SITES, type CamperId } from './world'
import { LADDER } from './config'
import { camper, towerRise } from './lookFigures'

// The kit and the shows are other files' work, and the kit draws numerals. Here they are stand-ins that leave a mark
// on the surface and say how many figures they drew, so this file holds the view of the map, the figures and the
// night to its own rules and nothing else.
vi.mock('./lookKit', () => ({
  paintKit: (ctx: { mark(name: string): void }, _board: unknown, _frame: unknown, opts: { night: boolean }) => { ctx.mark(opts.night ? 'kit-night' : 'kit'); return 3 },
  paintTop: (ctx: { mark(name: string): void }) => { ctx.mark('top'); return 1 },
}))
vi.mock('./lookShows', () => ({ paintShows: (ctx: { mark(name: string): void }) => { ctx.mark('shows'); return 2 } }))
const OTHERS = 6

// A recording stand-in for a 2D context: every method call is counted by name and written to a log, every property
// can be set, and the few calls whose result the painter uses give back something of the right shape.
type Recorder = { calls: Map<string, number>; log: string[]; images: unknown[]; composites: string[]; alphas: number[]; bad: number }
const recorder = (): Recorder => ({ calls: new Map(), log: [], images: [], composites: [], alphas: [], bad: 0 })

function fakeContext(into: Recorder): CanvasRenderingContext2D {
  const state: Record<string, unknown> = {}
  return new Proxy(state, {
    get(target, name) {
      if (typeof name !== 'string') return undefined
      if (name in target) return target[name]
      return (...args: unknown[]) => {
        into.calls.set(name, (into.calls.get(name) ?? 0) + 1)
        // A number that is not finite would draw nothing, or throw, in a real context.
        for (const arg of args) if (typeof arg === 'number' && !Number.isFinite(arg)) into.bad++
        if (name === 'drawImage') { into.images.push(args[0]); into.composites.push(String(target.globalCompositeOperation ?? 'source-over')); into.alphas.push(Number(target.globalAlpha ?? 1)); into.log.push('drawImage') }
        else into.log.push(`${name}(${args.map((arg) => (typeof arg === 'number' ? arg.toFixed(3) : typeof arg === 'string' ? arg : typeof arg)).join(',')})`)
        if (name === 'createImageData') {
          const [w, h] = args as [number, number]
          return { width: w, height: h, data: new Uint8ClampedArray(w * h * 4) }
        }
        return undefined
      }
    },
    set(target, name, value) { if (typeof name === 'string') target[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
}

function rig() {
  const surface = recorder(), layers: Recorder[] = [], canvases: { width: number; height: number }[] = []
  const makeCanvas = () => {
    const into = recorder()
    layers.push(into)
    const context = fakeContext(into)
    const canvas = { width: 0, height: 0, getContext: () => context }
    canvases.push(canvas)
    return canvas as unknown as HTMLCanvasElement
  }
  const everyCall = (name: string) => [surface, ...layers].reduce((sum, r) => sum + (r.calls.get(name) ?? 0), 0)
  const noText = () => { for (const name of ['fillText', 'strokeText', 'measureText']) expect(everyCall(name)).toBe(0) }
  const look = new Look(makeCanvas), ctx = fakeContext(surface)
  /** Paints a frame and gives back the count and what was drawn for it. */
  const shot = (board: Board | null, frame: GameFrame | null, night = false) => {
    surface.log.length = 0
    const count = look.paint(ctx, W, H, 2, board, frame, { night })
    return { count, log: surface.log.slice() }
  }
  return { look, ctx, surface, layers, canvases, noText, shot }
}

const W = 1180, H = 820
const summit = boardFor(W, H, SITES.summit[0]), meadow = boardFor(W, H, SITES.meadow[0])
/** What a board at rest draws of its own: the map, the glints, a tent and a camper each, the fire, the kettle if any, the dog, the frog and the mule. */
const ownAtRest = (board: Board) => 2 + board.campers.length * 2 + 1 + (board.kettle ? 1 : 0) + 3

/** A full night: the film down, the fire and a lantern lit, eyes, raccoons, moths, the owl, a tower on a sitting mule. */
function night(board: Board): GameFrame {
  const frame = restGameFrame(board)
  frame.night = { hour: 3, film: 1, held: false, hoot: 0.8, morning: false }
  frame.blaze = { ...frame.blaze, lit: true, setting: 1, reach: board.reach[board.reach.length - 1], flare: 0.5 }
  if (frame.lanterns[0]) frame.lanterns[0] = { ...frame.lanterns[0], lit: true, wick: 1, reach: board.lampHigh }
  frame.moths = frame.lanterns.map(() => 7)
  frame.eyes = Array.from({ length: 6 }, (_, i) => ({ x: 80 + i * 150, y: 60 + (i % 2) * 380 }))
  frame.raccoons = [
    { x: 200, y: 430, turn: 0.4, walk: 0.3, has: 'tin', hop: 0 }, { x: 640, y: 120, turn: 2.2, walk: 0.7, has: 'marshmallow', hop: 0.4 }, { x: 700, y: 440, turn: -1, walk: 0, has: 'pan', hop: 0 },
  ]
  frame.mule = { ear: 0.5, tail: -0.6, look: 1.3, sit: 1, poke: 0.4 }
  frame.tower = 25
  frame.fold = { pull: 0.5, packing: 0 }
  frame.stream = 0.37
  frame.frog = { throat: 0.6, hop: 0.45 }
  return frame
}

describe('the look', () => {
  it('imports and constructs where there is no document', () => {
    expect(typeof document).toBe('undefined')
    expect(() => new Look()).not.toThrow()
  })

  it('paints the bare map, and nothing else, with no board or no frame', () => {
    const { shot, surface, noText } = rig()
    expect(shot(null, null).count).toBe(1)
    expect(shot(summit, null).count).toBe(1)
    expect(shot(null, restGameFrame(summit)).count).toBe(1)
    expect(surface.images.length).toBe(3)
    expect(surface.calls.get('mark')).toBeUndefined()
    expect(surface.bad).toBe(0)
    noText()
  })

  it('draws a site at rest with only that site\'s campers, then the kit, the shows and what lies on top, in that order', () => {
    const { shot, surface, noText } = rig()
    expect(meadow.campers.map((one) => one.who)).toEqual(['scout', 'small'])
    expect(summit.campers.length).toBe(5)
    const two = shot(meadow, restGameFrame(meadow)), five = shot(summit, restGameFrame(summit))
    expect(two.count).toBe(ownAtRest(meadow) + OTHERS)
    expect(five.count).toBe(ownAtRest(summit) + OTHERS)
    expect(five.count - two.count).toBeGreaterThanOrEqual(6)
    const marks = five.log.filter((entry) => entry.startsWith('mark('))
    expect(marks).toEqual(['mark(kit)', 'mark(shows)', 'mark(top)'])
    // Everything of the view's own is down before the kit: nothing is filled or stroked after the last mark.
    const after = five.log.slice(five.log.indexOf('mark(top)') + 1)
    expect(after.filter((entry) => entry.startsWith('fill') || entry.startsWith('stroke'))).toEqual([])
    expect(surface.bad).toBe(0)
    expect(surface.calls.get('save')).toBe(surface.calls.get('restore'))
    noText()
  })

  it('paints every act of every camper, each unlike the camper at rest and unlike its other acts', () => {
    const { shot, surface, noText } = rig()
    const rest = shot(summit, restGameFrame(summit)).log.join('|')
    for (const who of CAMPERS) {
      const seen = new Map<string, string>([['rest', rest]])
      const acts: [string, number][] = [...ACTS[who], 'at-dusk', 'wakes-rested', 'wakes-frazzled'].map((act): [string, number] => [act, act.startsWith('walks') || act.startsWith('drags') || act === 'moves-in-with' ? 0.3 : 0])
      if (who === 'small') acts.push(['moves-in-with', 0])
      // Splashed with a can of water, the sleeper sits up and shakes.
      if (who === 'sleeper') acts.push(['sits-up-and-shakes', 0])
      for (const [act, walk] of acts) {
        const frame = restGameFrame(summit)
        frame.places[who] = { ...frame.places[who], act, actAge: act === 'sits-up-and-shakes' ? 0.7 : 1.3, walk, withCamper: who === 'small' ? 'cook' : null }
        frame.campers[who] = { breath: 0.5, head: 0.2, idle: 0, poke: 0 }
        let drawn = ''
        expect(() => { drawn = shot(summit, frame).log.join('|') }, `${who} ${act}`).not.toThrow()
        for (const [other, picture] of seen) expect(drawn === picture, `${who}: ${act} looks like ${other}`).toBe(false)
        seen.set(`${act} ${walk}`, drawn)
      }
    }
    // The reader in the stream stands in rings of water; on dry ground the same act has none.
    const dry = restGameFrame(summit), wet = restGameFrame(summit)
    dry.places.reader = { ...dry.places.reader, act: 'walks-into-the-stream', actAge: 1, walk: 0 }
    wet.places.reader = { ...dry.places.reader, x: summit.pool.x, y: summit.pool.y }
    expect(shot(summit, wet).log.length).toBeGreaterThan(shot(summit, dry).log.length)
    expect(surface.bad).toBe(0)
    expect(surface.calls.get('save')).toBe(surface.calls.get('restore'))
    noText()
  })

  it('shows every camper answer a poke and do its idle act in every pose the night can put it in, and the mule bray', () => {
    const { shot, surface } = rig()
    for (const who of CAMPERS) {
      const acts: [string | null, number][] = [...ACTS[who], 'at-dusk', 'wakes-rested', 'wakes-frazzled', null].map((act): [string | null, number] => [act, act !== null && (act.startsWith('walks') || act.startsWith('drags')) ? 0.3 : 0])
      for (const [act, walk] of acts) {
        const picture = (idle: number, poke: number) => {
          const frame = restGameFrame(summit)
          frame.places[who] = { ...frame.places[who], act, actAge: 1.3, walk, withCamper: who === 'small' ? 'cook' : null }
          frame.campers[who] = { breath: 0.5, head: 0.2, idle, poke }
          return shot(summit, frame).log.join('|')
        }
        const still = picture(0, 0)
        // Fully out is the most a poke shows, not the least: the model sends how far out the answer is.
        expect(picture(0, 1) === still, `${who} poked while ${act}`).toBe(false)
        expect(picture(0, 0.5) === still, `${who} half poked while ${act}`).toBe(false)
        expect(picture(0.4, 0) === still, `${who} at its idle act while ${act}`).toBe(false)
      }
    }
    const calm = restGameFrame(summit), braying = restGameFrame(summit)
    braying.mule = { ...braying.mule, poke: 1 }
    expect(shot(summit, braying).log.join('|') === shot(summit, calm).log.join('|')).toBe(false)
    expect(surface.bad).toBe(0)
  })

  it('draws the kettle that was poured dry with its lid off, and the cook without the pan a raccoon is wearing', () => {
    const { shot, ctx, surface } = rig()
    const full = restGameFrame(summit), dry = restGameFrame(summit)
    dry.kettleDry = true
    expect(shot(summit, dry).log.join('|') === shot(summit, full).log.join('|')).toBe(false)
    const drawn = (act: string, panGone: boolean) => { surface.log.length = 0; camper(ctx, 'cook', { breath: 0.5, head: 0, idle: 0, poke: 0 }, { x: 0, y: 0, turn: 0, act, actAge: 1, withCamper: null, walk: 0 }, { wet: false, panGone }); return surface.log.join('|') }
    for (const act of ['fans-the-fire', 'tends-the-fire', 'beams-at-the-fire']) expect(drawn(act, true) === drawn(act, false), act).toBe(false)
    // Fanning with the pan gone, there is no pan in the picture at all: fewer strokes than with it.
    expect(drawn('fans-the-fire', true).length).toBeLessThan(drawn('fans-the-fire', false).length)
  })

  it('blows every hat back while a fireball lasts, on every camper of the site', () => {
    const { shot, ctx, surface } = rig()
    const at = (t: number) => { const frame = restGameFrame(summit); for (const who of CAMPERS) frame.places[who] = { ...frame.places[who], act: who === 'cook' ? 'tends-the-fire' : who === 'scout' ? 'keeps-watch' : 'at-dusk' }; frame.effects = [{ kind: 'fireball-ring-blows-the-hats-back', x: summit.fire.x, y: summit.fire.y, t, who: null, seed: 1 }]; return shot(summit, frame).log.join('|') }
    expect(at(0.4) === at(0)).toBe(false)
    expect(at(1) === at(0)).toBe(true)
    // Each head on its own: whatever it wears is out of place in the gust.
    for (const who of CAMPERS) {
      const drawn = (gust: number) => { surface.log.length = 0; camper(ctx, who, { breath: 0.5, head: 0, idle: 0, poke: 0 }, { x: 0, y: 0, turn: 0, act: who === 'cook' ? 'tends-the-fire' : who === 'scout' ? 'keeps-watch' : 'at-dusk', actAge: 1, withCamper: null, walk: 0 }, { wet: false, gust }); return surface.log.join('|') }
      expect(drawn(1) === drawn(0), who).toBe(false)
      // The sleeper hiding in the bag has only the bobble outside it, and that is blown back too.
      if (who === 'sleeper') { const hidden = (gust: number) => { surface.log.length = 0; camper(ctx, who, { breath: 0.5, head: 0, idle: 0, poke: 0 }, { x: 0, y: 0, turn: 0, act: 'hides-in-the-bag', actAge: 1, withCamper: null, walk: 0 }, { wet: false, gust }); return surface.log.join('|') }; expect(hidden(1) === hidden(0)).toBe(false) }
      // And nothing of the gust is left on the next camper drawn.
      expect(drawn(0) === drawn(0)).toBe(true)
    }
  })

  it('draws a camper where the frame puts it, and not where it rests', () => {
    const { shot } = rig()
    const frame = restGameFrame(summit), moved = restGameFrame(summit)
    moved.places.cook = { ...moved.places.cook, x: 611.5, y: 333.25, turn: 1.1 }
    const before = shot(summit, frame).log, after = shot(summit, moved).log
    expect(before.includes('translate(611.500,333.250)')).toBe(false)
    expect(after.includes('translate(611.500,333.250)')).toBe(true)
    expect(after.includes('rotate(1.100)')).toBe(true)
  })

  it('holds no state between frames: the same frame is the same picture', () => {
    const { shot } = rig()
    const first = shot(summit, night(summit)).log
    shot(meadow, restGameFrame(meadow))
    expect(shot(summit, night(summit)).log).toEqual(first)
  })

  it('repaints the cached map only when the size or the pixel ratio changes', () => {
    const { look, ctx, surface, canvases } = rig()
    look.paint(ctx, W, H, 2, null, null)
    expect(look.mapPaints).toBe(1)
    expect(canvases[0]).toMatchObject({ width: 2360, height: 1640 })
    look.paint(ctx, W, H, 2, summit, restGameFrame(summit))
    look.paint(ctx, W, H, 2, meadow, night(meadow))
    expect(look.mapPaints).toBe(1)
    const smaller = boardFor(1024, 768, SITES.summit[0])
    look.paint(ctx, 1024, 768, 2, smaller, restGameFrame(smaller))
    expect(look.mapPaints).toBe(2)
    look.paint(ctx, 1024, 768, 1, smaller, restGameFrame(smaller))
    expect(look.mapPaints).toBe(3)
    expect(canvases[0]).toMatchObject({ width: 1024, height: 768 })
    expect(surface.bad).toBe(0)
  })

  it('lays the night film by multiplying, at the night\'s strength, and rebuilds it only when a hole of light changes', () => {
    const { look, shot, surface } = rig()
    const frame = night(summit)
    shot(summit, restGameFrame(summit))
    expect(look.filmPaints).toBe(0)
    expect(shot(summit, frame).log.filter((entry) => entry.startsWith('mark('))[0]).toBe('mark(kit-night)')
    shot(summit, frame)
    expect(look.filmPaints).toBe(1)
    // The map each frame, and in the night one more full-surface layer, multiplied: the film, and never a third.
    expect(surface.composites).toEqual(['source-over', 'source-over', 'multiply', 'source-over', 'multiply'])
    expect(surface.images[2]).toBe(surface.images[4])
    expect(surface.images[2]).not.toBe(surface.images[0])
    // Less than a pixel is no change; a weaker film is the same film laid more lightly.
    frame.blaze.reach += 0.3
    frame.night.film = 0.4
    shot(summit, frame)
    expect(look.filmPaints).toBe(1)
    expect(surface.alphas[surface.alphas.length - 1]).toBeCloseTo(0.4)
    frame.blaze.reach += 3
    shot(summit, frame)
    expect(look.filmPaints).toBe(2)
    frame.lanterns[0] = { ...frame.lanterns[0], x: frame.lanterns[0].x + 5 }
    shot(summit, frame)
    expect(look.filmPaints).toBe(3)
    frame.lanterns[0] = { ...frame.lanterns[0], lit: false }
    frame.blaze.lit = false
    shot(summit, frame)
    shot(summit, frame)
    expect(look.filmPaints).toBe(4)
    // With no film in the frame, the option lays it at full strength.
    const dusk = restGameFrame(summit)
    expect(shot(summit, dusk, true).log.filter((entry) => entry === 'drawImage').length).toBe(2)
    expect(surface.alphas[surface.alphas.length - 1]).toBe(1)
    expect(surface.bad).toBe(0)
  })

  it('stays inside its budget on the busiest night, and turns the sheet over everything', () => {
    const { shot, surface, noText } = rig()
    const busy = night(summit)
    for (const who of CAMPERS) busy.places[who] = { ...busy.places[who], act: ACTS[who][ACTS[who].length - 1], actAge: 2.2, walk: 0.6 }
    const full = shot(summit, busy)
    // The map, one film, and under about ninety small figures of the view's own.
    expect(full.count - OTHERS).toBeGreaterThan(ownAtRest(summit) + 10)
    expect(full.count - OTHERS).toBeLessThan(90)
    for (const packing of [0.3, 0.7]) {
      const turning = night(summit)
      turning.fold = { pull: 1, packing }
      const { log } = shot(summit, turning)
      const after = log.slice(log.indexOf('mark(top)') + 1)
      expect(after.filter((entry) => entry.startsWith('fill')).length).toBeGreaterThan(0)
    }
    expect(surface.bad).toBe(0)
    expect(surface.calls.get('save')).toBe(surface.calls.get('restore'))
    noText()
  })

  it('slides the kit to the folded edge as the site is packed up, and lays the next site\'s kit in its place', () => {
    expect(kitSlide(summit, 0)).toBe(0)
    let last = 0
    for (const packing of [0.05, 0.15, 0.25, 0.35, 0.45]) { const now = kitSlide(summit, packing); expect(now).toBeGreaterThan(last); last = now }
    // By the time the sheet has turned over the map, the card that lay furthest from the edge is past it.
    expect(summit.card + kitSlide(summit, 0.45)).toBeGreaterThan(summit.flap.top)
    for (const packing of [0.5, 0.7, 1]) expect(kitSlide(summit, packing)).toBe(0)
    const { shot } = rig()
    const sliding = restGameFrame(summit)
    sliding.fold = { pull: 1, packing: 0.25 }
    const { log } = shot(summit, sliding)
    expect(log).toContain(`translate(${kitSlide(summit, 0.25).toFixed(3)},0.000)`)
    const lying = restGameFrame(summit)
    lying.fold = { pull: 0, packing: 0.7 }
    expect(shot(summit, lying).log).toContain('translate(0.000,0.000)')
  })

  it('builds the tower exactly as tall as the leftover, tier on tier of five places, and keeps the tallest on the sheet', () => {
    const { shot } = rig()
    const tiers = (places: number) => { const frame = restGameFrame(summit); const none = shot(summit, frame).log.filter((entry) => entry.startsWith('rotate(')).length; frame.tower = places; return shot(summit, frame).log.filter((entry) => entry.startsWith('rotate(')).length - none }
    // One tier for one to five places, two for six, and so on: no cap, however much is left.
    expect([1, 5, 6, 12, 40, 41, 75].map(tiers)).toEqual([1, 1, 2, 3, 8, 9, 15])
    expect(towerRise(12) - towerRise(2)).toBeCloseTo(8, 5)
    // It is made of what was left: logs alone are all tan, and oil and water show only where some of each was left.
    const inks = (of: GameFrame['towerOf']) => { const frame = restGameFrame(summit); frame.tower = of.logs + of.oil + of.water; frame.towerOf = of; return shot(summit, frame).log.join('|') }
    const logsOnly = inks({ logs: 12, oil: 0, water: 0 }), mixed = inks({ logs: 6, oil: 4, water: 2 })
    expect(logsOnly === mixed).toBe(false)
    const tiersOf = (of: GameFrame['towerOf']) => { const frame = restGameFrame(summit); const none = shot(summit, frame).log.filter((entry) => entry.startsWith('rotate(')).length; frame.tower = of.logs + of.oil + of.water; frame.towerOf = of; return shot(summit, frame).log.filter((entry) => entry.startsWith('rotate(')).length - none }
    // Six logs, four places of oil and two of water: two tiers of logs, and one each of oil and water.
    expect(tiersOf({ logs: 6, oil: 4, water: 2 })).toBe(4)
    // Everything the rods of a site could hold, or its sled, left over at any size of surface: the top of the tower is on the sheet.
    for (const [w, h] of [[1180, 820], [1024, 768], [1366, 700], [820, 1180], [640, 480]] as const) for (const position of LADDER) for (const site of SITES[position]) {
      const at = boardFor(w, h, site), rods = at.rods.reduce((sum, supply) => sum + ROD_LENGTH[supply] * PLACES[supply], 0), most = site.given !== null ? at.rods.reduce((sum, supply) => sum + (site.given?.[supply] ?? 0) * PLACES[supply], 0) : site.sled !== null ? Math.min(rods, site.sled) : rods
      expect(at.mule.y - towerRise(most) * 1.24 * at.u, `${position} at ${w} by ${h}`).toBeGreaterThanOrEqual(at.inset)
    }
  })

  it('draws nothing on a surface that has no size yet', () => {
    const { look, ctx, surface } = rig()
    expect(look.paint(ctx, 0, 0, 2, summit, restGameFrame(summit))).toBe(0)
    expect(look.paint(ctx, W, H, 0, null, null)).toBe(0)
    expect(look.mapPaints).toBe(0)
    expect(surface.calls.size).toBe(0)
  })
})

/** Every camper is one of the five, so a test that walks them all misses none. */
const _all: readonly CamperId[] = CAMPERS
void _all
