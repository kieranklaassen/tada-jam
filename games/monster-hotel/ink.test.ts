import { describe, expect, it } from 'vitest'
import { arrange } from './arrangement'
import { TIERS } from './config'
import { InkPage } from './ink'
import { DEMO_NAMES, demoScene } from './inkDemo'
import { GUEST_BOX } from './inkGuests'
import { INK, PAPER, SPOT, mulberry32, type Surface } from './inkHatch'
import { standOf } from './inkLens'
import { spotsOf, thingBox } from './inkPlaces'
import { layoutPage } from './layout'
import { pageOfArrangement } from './page'
import { upright } from './inkMoving'
import { SPIKE_SCENE, type InkScene, type InkThing } from './inkScene'

/** A 2D context that draws nothing and writes down every call and every property set. */
function fakeContext(log: string[]): CanvasRenderingContext2D {
  const round = (value: unknown): unknown => (typeof value === 'number' ? Math.round(value * 1000) / 1000 : typeof value === 'object' && value !== null ? '#' : value)
  return new Proxy({} as Record<string, unknown>, {
    get(target, name) {
      if (typeof name !== 'string') return undefined
      if (name in target) return target[name]
      return (...args: unknown[]) => {
        log.push(`${name}(${args.map(round).join(',')})`)
        return name === 'createPattern' ? { pattern: true } : name === 'measureText' ? { width: 7 } : undefined
      }
    },
    set(target, name, value) {
      if (typeof name === 'string') { target[name] = value; log.push(`${name}=${String(round(value))}`) }
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

function fakeSurfaces() {
  const logs: string[][] = []
  const make = (width: number, height: number): Surface => {
    const log: string[] = []
    logs.push(log)
    const context = fakeContext(log)
    return { width, height, getContext: () => context }
  }
  return { make, logs }
}

const TEXT = /^(fillText|strokeText|measureText|font=)/

/** A stamp of a layer the size of the whole surface, on a surface of 1180 by 820. */
const WHOLE = 'drawImage(#,0,0,1180,820)'

function frame(page: InkPage, scene: InkScene, seconds: number): { log: string[]; count: number } {
  const log: string[] = []
  const count = page.draw(fakeContext(log), scene, seconds)
  return { log, count }
}

describe('the ink page', () => {
  it('draws the spike scene with no text call anywhere, on the page or in a cached figure', () => {
    const { make, logs } = fakeSurfaces()
    const page = new InkPage(make)
    page.resize(1180, 820, 2, 0)
    const all = [0, 0.1, 0.4, 2, 7.3].flatMap((seconds) => frame(page, SPIKE_SCENE, seconds).log)
    expect(all.length).toBeGreaterThan(100)
    expect(all.filter((call) => TEXT.test(call))).toEqual([])
    expect(logs.length).toBeGreaterThan(10)
    for (const log of logs) expect(log.filter((call) => TEXT.test(call))).toEqual([])
  })

  it('draws a frame in well under 80 sprites and figures', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    for (const seconds of [0, 1, 2, 3.7, 12]) {
      const { count, log } = frame(page, SPIKE_SCENE, seconds)
      expect(count).toBeGreaterThan(8)
      expect(count).toBeLessThan(80)
      // What it reports is at least every sprite it set on the page.
      expect(count).toBeGreaterThanOrEqual(log.filter((call) => call.startsWith('drawImage')).length)
      // At most one composite the size of the whole surface: the still layer.
      expect(log.filter((call) => call === WHOLE)).toHaveLength(1)
    }
  })

  it('issues the same calls for the same seconds, and other calls for other seconds', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    const first = frame(page, SPIKE_SCENE, 2.25)
    const moved = frame(page, SPIKE_SCENE, 2.6)
    const again = frame(page, SPIKE_SCENE, 2.25)
    expect(again.log).toEqual(first.log)
    expect(again.count).toBe(first.count)
    expect(moved.log).not.toEqual(first.log)
    // A second page, built from nothing, draws the very same frame: nothing depends on when it was built.
    const other = new InkPage(fakeSurfaces().make)
    other.resize(1180, 820, 2, 0)
    expect(frame(other, SPIKE_SCENE, 2.25).log).toEqual(first.log)
  })

  it('paints the same building twice over: the still layer is seeded', () => {
    const a = fakeSurfaces(), b = fakeSurfaces()
    for (const { make } of [a, b]) {
      const page = new InkPage(make)
      page.resize(760, 560, 1.5, 0)
      frame(page, SPIKE_SCENE, 1)
    }
    expect(a.logs.length).toBe(b.logs.length)
    a.logs.forEach((log, i) => expect(log).toEqual(b.logs[i]))
  })

  it('rebuilds nothing on a second resize with the same arguments, and rebuilds on a new size', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    for (const seconds of [0, 0.2, 0.4, 0.6, 0.8]) frame(page, SPIKE_SCENE, seconds)
    const built = page.built
    expect(built).toBeGreaterThan(10)
    page.resize(1180, 820, 2, 0)
    for (const seconds of [0, 0.2, 0.4, 0.6, 0.8]) frame(page, SPIKE_SCENE, seconds)
    expect(page.built).toBe(built)
    page.resize(1000, 700, 2, 0)
    frame(page, SPIKE_SCENE, 0)
    expect(page.built).toBeGreaterThan(built)
  })

  it('draws the other houses too, by day, with the boiler and the snow hole over any column', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(900, 700, 1.5, 1)
    const scenes: InkScene[] = [
      { ...SPIKE_SCENE, house: { shape: 'square', fixtures: [{ kind: 'boiler', col: 1 }, { kind: 'snow', col: 0 }], twins: [1] }, phase: 'day', guests: SPIKE_SCENE.guests.filter((guest) => typeof guest.place !== 'object' || guest.place.room < 4), airs: [{ kind: 'din', rooms: [3, 2], level: 1 }, { kind: 'warm', rooms: [1, 3], level: 1 }] },
      { ...SPIKE_SCENE, house: { shape: 'tower', fixtures: [{ kind: 'snow', col: 1 }], twins: [] }, airs: [{ kind: 'cold', rooms: [5, 3], level: 2 }, { kind: 'cold', rooms: [5, 3, 1], level: 1 }, { kind: 'pong', rooms: [0, 1], level: 1 }] },
    ]
    for (const scene of scenes) {
      const { count, log } = frame(page, scene, 1.5)
      expect(count).toBeGreaterThan(8)
      expect(count).toBeLessThan(80)
      expect(log.filter((call) => TEXT.test(call))).toEqual([])
    }
  })

  it('draws nothing before it has a size', () => {
    const page = new InkPage(fakeSurfaces().make)
    expect(frame(page, SPIKE_SCENE, 1)).toEqual({ log: [], count: 0 })
  })

  it('draws every demo scene with no text call, under 80 sprites and figures, the same for the same seconds', () => {
    for (const name of DEMO_NAMES) {
      const { make, logs } = fakeSurfaces()
      const page = new InkPage(make)
      page.resize(1180, 820, 2, 0)
      // Moments at rest, and moments in the middle of the demo's sweep (which is half way at two seconds in).
      for (const seconds of [0.5, 1.9, 2, 2.1, 3.3]) {
        const first = frame(page, demoScene(name, seconds), seconds)
        const again = frame(page, demoScene(name, seconds), seconds)
        expect(again.log, name).toEqual(first.log)
        expect(first.count, name).toBeGreaterThan(5)
        expect(first.count, name).toBeLessThan(80)
        // The only text on the page is the numeral of a dial, drawn by symbols.ts, and only where the scene asks for numerals.
        const scene = demoScene(name, seconds)
        const dials = scene.numerals ? scene.things.filter((thing) => thing.kind === 'stove' || thing.kind === 'ice') : []
        expect(first.log.filter((call) => /^(fillText|strokeText)/.test(call)).sort(), name).toEqual(dials.flatMap((thing) => [`fillText(${thing.dial},`, `strokeText(${thing.dial},`]).sort().map((start) => expect.stringContaining(start)))
      }
      // No kept figure or layer has any text in it at all.
      for (const log of logs) expect(log.filter((call) => TEXT.test(call)), name).toEqual([])
    }
    expect(demoScene('nobody knows this one', 1)).toBe(demoScene('spike', 1))
  })

  it('stamps one whole layer a frame at rest, in a view too, and two during a sweep', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    for (const name of ['toy-start', 'toy-rooms', 'view-troll', 'view-bat', 'view-blob', 'carry', 'glow']) {
      const { log } = frame(page, demoScene(name, 1.2), 1.2)
      expect(log.filter((call) => call === WHOLE), name).toHaveLength(1)
    }
    // The large room is a part of the ink layer, enlarged: never a second whole stamp.
    const lensed = frame(page, demoScene('view-bat', 1.2), 1.2).log.filter((call) => /^drawImage\(#(,[-\d.]+){8}\)$/.test(call))
    expect(lensed).toHaveLength(1)
    for (const name of ['sweep', 'hour']) {
      expect(frame(page, demoScene(name, 2), 2).log.filter((call) => call === WHOLE), name).toHaveLength(2)
      expect(frame(page, demoScene(name, 1), 1).log.filter((call) => call === WHOLE), name).toHaveLength(1)
    }
  })

  it('draws a carried guest once, in the hand, and not also where it stood', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    const held = demoScene('carry', 1.2)
    const stood = { ...held, guests: held.guests.map((guest) => ({ ...guest, carried: null })) }
    const images = (log: string[]) => log.filter((call) => call.startsWith('drawImage')).length
    // In the hand it is one figure and its bag; set down it is one figure. Drawn in both places it would be one more.
    expect(images(frame(page, held, 1.2).log)).toBe(images(frame(page, stood, 1.2).log) + 1)
  })

  it('draws every thing in the box its place gives it, and a carried thing only in the hand', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    const scene = demoScene('things', 1)
    const layout = page.layout(scene), standing = spotsOf(scene.guests, layout)
    const r = (value: number) => Math.round(value * 1000) / 1000
    /** Whether a figure is set down with its origin at the middle of the foot of that thing's box. */
    const setDown = (log: string[], thing: InkThing) => {
      const box = thingBox(thing, layout, standing)!
      const at = `,${r(2 * (box.x + box.w / 2))},${r(2 * (box.y + box.h))})`
      return log.some((call, i) => call.startsWith('setTransform') && call.endsWith(at) && (log[i + 1] ?? '').startsWith('drawImage'))
    }
    const plain = frame(page, scene, 1).log
    for (const thing of scene.things) expect(setDown(plain, thing), thing.kind).toBe(true)
    // In the hand it leaves its place, whatever kind of place that was.
    for (const kind of ['quilt', 'pipe', 'stove', 'clock'] as const) {
      const held = { ...scene, things: scene.things.map((thing) => (thing.kind === kind ? { ...thing, carried: { x: 900, y: 300, swing: 0.2 } } : thing)) }
      const log = frame(page, held, 1).log
      for (const thing of held.things) expect(setDown(log, thing), `${kind} carried, ${thing.kind}`).toBe(thing.kind !== kind)
      expect(log.filter((call) => call.startsWith('drawImage')).length).toBe(plain.filter((call) => call.startsWith('drawImage')).length)
    }
  })

  it('draws a numeral only where the scene asks for numerals, and only the two dials', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    const scene = demoScene('things', 1)
    const text = (drawn: InkScene) => frame(page, drawn, 1).log.filter((call) => /^(fillText|strokeText)/.test(call)).map((call) => call.slice(0, call.indexOf(',')))
    expect(text(scene).sort()).toEqual(['fillText(2', 'fillText(3', 'strokeText(2', 'strokeText(3'])
    expect(text({ ...scene, numerals: false })).toEqual([])
    expect(text({ ...scene, things: scene.things.filter((thing) => thing.kind !== 'stove' && thing.kind !== 'ice') })).toEqual([])
  })

  it('moves the coach by where the scene puts it, and leaves it out when it has gone', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    const scene = { ...demoScene('toy-start', 1), coach: true }
    const images = (drawn: InkScene) => frame(page, drawn, 1).log.filter((call) => call.startsWith('drawImage')).length
    const none = images({ ...scene, coach: false })
    // At the kerb it is one figure; on the move its wheels and its door are their own; gone, it is nothing.
    expect(images(scene)).toBe(none + 1)
    expect(images({ ...scene, coachAt: 0.4 })).toBe(none + 4)
    expect(images({ ...scene, coachAt: -0.4 })).toBe(none + 5)
    expect(images({ ...scene, coachAt: 1 })).toBe(none)
    expect(images({ ...scene, coachAt: -1 })).toBe(none)
    expect(frame(page, { ...scene, coachAt: 0.4 }, 1).log).not.toEqual(frame(page, { ...scene, coachAt: 0.5 }, 1).log)
  })

  it('seats every guest on the bench inside the bench\'s own place', () => {
    // A seated figure is sunk under a rug: nothing of its drawing is left above the bench's box but the thin things on its head.
    const { make, logs } = fakeSurfaces()
    const page = new InkPage(make)
    page.resize(1180, 820, 2, 0)
    for (let i = 0; i < 8; i++) {
      const scene = demoScene('bench', i * 2 + 0.5)
      const seated = scene.guests.find((guest) => guest.place === 'bench')!
      const before = logs.length
      frame(page, scene, i * 2 + 0.5)
      // Its figure is one of the surfaces just built, and the one that is clipped at the ground and sunk.
      const sunk = logs.slice(before).filter((log) => log.some((call) => call.startsWith('clip')) && log.some((call) => /^translate\(0,\d/.test(call)))
      expect(sunk.length, seated.id).toBeGreaterThanOrEqual(1)
    }
  })

  it('moves a guest by the body it is given and by nothing of its own', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    const scene = demoScene('toy-start', 0)
    const still = { ...scene, guests: scene.guests.map((guest) => ({ ...guest, body: { sx: 1, sy: 1, rot: 0, dx: 0, dy: 0 } })) }
    // The figures' drawings boil and the wheel sways, so only the transforms a figure is set down with are compared.
    const u = page.layout(scene).scale, r = (value: number) => Math.round(value * 1000) / 1000
    const figure = `drawImage(#,${r(-GUEST_BOX.ox * u)},${r(-GUEST_BOX.oy * u)},${r(GUEST_BOX.w * u)},${r(GUEST_BOX.h * u)})`
    const figures = (drawn: InkScene, seconds: number) => {
      const { log } = frame(page, drawn, seconds)
      return log.filter((call, i) => call.startsWith('setTransform') && log[i + 1] === figure)
    }
    expect(figures(still, 0.2)).toHaveLength(3)
    expect(figures(still, 1.3)).toEqual(figures(still, 0.2))
    expect(figures(scene, 1.3)).not.toEqual(figures(scene, 0.2))
  })

  it('every guest keeps a hand of its own at the lowest tier: the blob\'s room is still seen again by its other eyes, and the fly still has facets, only fewer', () => {
    const full = new InkPage(fakeSurfaces().make), low = new InkPage(fakeSurfaces().make)
    full.resize(1180, 820, 2, 0)
    low.resize(1180, 820, 1, TIERS.length - 1)
    expect(TIERS[0]!.doubled && !TIERS[TIERS.length - 1]!.doubled).toBe(true)
    // On a surface that can be copied from (the fly's facets are copies of what is already drawn), as the real one can.
    const images = (page: InkPage, scene: InkScene) => {
      const log: string[] = [], ctx = fakeContext(log)
      ;(ctx as unknown as { canvas: unknown }).canvas = {}
      page.draw(ctx, scene, 1)
      return log.filter((call) => call.startsWith('drawImage')).length
    }
    // The same page drawn from the cook's place stamps its room once and has no facets: what the blob's and the fly's stamp beyond it is their hand.
    for (const name of ['view-blob', 'view-fly'] as const) {
      const scene = demoScene(name, 1), plainHand = { ...scene, from: 'cook' as const, view: { ...scene.view!, from: 'cook' as const } }
      expect(images(low, scene), name).toBeLessThan(images(full, scene))
      expect(images(low, scene), name).toBeGreaterThan(images(low, plainHand))
    }
  })

  it('sheds the boil at the lower tiers and still draws every guest', () => {
    const full = new InkPage(fakeSurfaces().make), low = new InkPage(fakeSurfaces().make)
    full.resize(1180, 820, 2, 0)
    low.resize(1180, 820, 1, 3)
    for (const seconds of [0, 0.1, 0.2, 0.3, 0.4, 0.5]) {
      const a = frame(full, SPIKE_SCENE, seconds), b = frame(low, SPIKE_SCENE, seconds)
      expect(b.count).toBe(a.count)
    }
    expect(low.built).toBeLessThan(full.built)
  })

  it('uses one ink, one paper and one spot colour, and nothing else, on the frame', () => {
    const page = new InkPage(fakeSurfaces().make)
    page.resize(1180, 820, 2, 0)
    const colours = new Set(frame(page, SPIKE_SCENE, 3).log.filter((call) => /^(fillStyle|strokeStyle)=/.test(call)).map((call) => call.split('=')[1]))
    for (const colour of colours) expect([INK, PAPER, SPOT]).toContain(colour)
  })

  it('has a generator that repeats for a seed and differs between seeds', () => {
    const a = mulberry32(5), b = mulberry32(5), c = mulberry32(6)
    const run = (next: () => number) => [next(), next(), next()]
    const first = run(a)
    expect(run(b)).toEqual(first)
    expect(run(c)).not.toEqual(first)
    for (const value of first) { expect(value).toBeGreaterThanOrEqual(0); expect(value).toBeLessThan(1) }
  })
})

describe('a numeral is always the right way up', () => {
  it('on a page turned half round its transform is turned back about its own middle, and elsewhere left alone', () => {
    const plain = [2, 0, 0, 2, 100, 50] as const
    expect(upright(plain, 7, 9)).toBe(plain)
    // Turned half round: the point (7, 9) stays where it was on the screen, and the axes point the usual way again.
    const turned = [-2, 0, 0, -2, 900, 700] as const
    const back = upright(turned, 7, 9)
    expect([back[0], back[1], back[2], back[3]]).toEqual([2, -0, -0, 2])
    expect([back[0] * 7 + back[2] * 9 + back[4], back[1] * 7 + back[3] * 9 + back[5]]).toEqual([turned[0] * 7 + turned[4], turned[3] * 9 + turned[5]])
  })

  it('a guest in the lobby is drawn with one more stroke, its stare; one still in the coach or on its way to its place has none', () => {
    const { make } = fakeSurfaces()
    const page = new InkPage(make)
    page.resize(1180, 820, 2, 0)
    const bat = SPIKE_SCENE.guests.find((guest) => guest.id === 'bat')!
    const withBat = (body: InkScene['guests'][number]['body'] | null, staresAt: number | null) => ({ ...SPIKE_SCENE, guests: SPIKE_SCENE.guests.map((guest) => (guest === bat ? { ...bat, staresAt, ...(body ? { body } : {}) } : guest)) })
    const none = frame(page, withBat(null, null), 1).count
    expect(frame(page, withBat(null, 5), 1).count).toBe(none + 1)
    // Still in the coach (not seen), and walking in from the door: no stare hangs in the lobby.
    expect(frame(page, withBat({ sx: 0.001, sy: 0.001, rot: 0, dx: 200, dy: 60 }, 5), 1).count).toBe(none)
    expect(frame(page, withBat({ sx: 1, sy: 1, rot: 0, dx: 120, dy: 0 }, 5), 1).count).toBe(none)
    // Arrived and only breathing, it stares.
    expect(frame(page, withBat({ sx: 1.01, sy: 0.99, rot: 0, dx: 0.5, dy: 0 }, 5), 1).count).toBe(none + 1)
  })
})

describe('the singer nobody hears, on her own page', () => {
  const house = { shape: 'long' as const, fixtures: [], twins: [] }
  /** How many dots and how many strokes of line a frame lays down. */
  const marksOf = (scene: InkScene) => {
    const { make } = fakeSurfaces()
    const page = new InkPage(make)
    page.resize(1180, 820, 2, 0)
    const { log } = frame(page, scene, 1.3)
    return { dots: log.filter((call) => call.startsWith('ellipse(')).length, lines: log.filter((call) => call.startsWith('lineTo(')).length }
  }

  it('has the answer she wants coming into her room in dots, through the walls and floors with rooms behind them, and her own song kept out of the room', () => {
    // Alone in a middle room upstairs at night, everyone else still in the lobby: nobody hears her.
    const unheard = pageOfArrangement(arrange(house, { singer: 4, blob: 'lobby' }, {}, { phase: 'night' }), 'singer', true)
    expect(unheard.wants).toEqual({ room: 4, kind: 'heard' })
    const drawn = marksOf(unheard)
    // The same page with the want left out: her song fills her own room in curls, and there are no dots of an answer.
    const { wants: _wants, ...rest } = unheard
    const without = marksOf(rest)
    expect(drawn.dots).toBeGreaterThan(without.dots + 30)
    expect(drawn.lines).toBeLessThan(without.lines)
    // A room with a neighbour on either side and one below has three ways in; a corner room downstairs has two, and fewer dots.
    const corner = pageOfArrangement(arrange(house, { singer: 0, blob: 'lobby' }, {}, { phase: 'night' }), 'singer', true)
    expect(corner.wants).toEqual({ room: 0, kind: 'heard' })
    const { wants: _corner, ...cornerRest } = corner
    expect(marksOf(corner).dots - marksOf(cornerRest).dots).toBeLessThan(drawn.dots - without.dots)
    expect(marksOf(corner).dots - marksOf(cornerRest).dots).toBeGreaterThan(20)
  })
})

describe('the bat sleeps hanging', () => {
  it('asleep in a room it is turned half round in its own box and hung by a cord from its ceiling, on the plain page and on another guest\'s; awake, wrapped or in the lobby it stands', () => {
    const page = layoutPage(1180, 820, 'long')
    const bat = (over: Partial<InkScene['guests'][number]>): InkScene['guests'][number] => ({ id: 'bat', place: { room: 4 }, awake: false, mood: 'content', turnedTo: null, wrapped: false, staresAt: null, ...over })
    const spot = { x: page.rooms[4].stand.x, y: page.rooms[4].stand.y, flip: false }
    for (const view of [null, { from: 'troll' as const, room: 1 }]) {
      const hung = standOf(page, view, bat({}), spot)
      expect(hung.turn).toBe(Math.PI)
      expect(hung.cord).toEqual({ x: spot.x, y: page.rooms[4].rect.y })
      // Its feet are up where its head would be: the top of the box a finger finds it in.
      expect(hung.y).toBeLessThan(spot.y - 100 * page.scale)
      expect(hung.y).toBeGreaterThan(page.rooms[4].rect.y)
    }
    for (const up of [bat({ awake: true }), bat({ wrapped: true }), bat({ place: 'lobby', awake: true })]) expect(standOf(page, null, up, spot)).toEqual({ x: spot.x, y: spot.y, turn: 0, cord: null })
  })
})
