import { describe, expect, it } from 'vitest'
import { TIERS } from './config'
import { InkPage } from './ink'
import { DEMO_NAMES, demoScene } from './inkDemo'
import { GUEST_BOX } from './inkGuests'
import { INK, PAPER, SPOT, mulberry32, type Surface } from './inkHatch'
import { spotsOf, thingBox } from './inkPlaces'
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

  it('draws the page only once over where the tier does not afford the blob its many eyes', () => {
    const full = new InkPage(fakeSurfaces().make), low = new InkPage(fakeSurfaces().make)
    full.resize(1180, 820, 2, 0)
    low.resize(1180, 820, 1, TIERS.length - 1)
    const scene = demoScene('view-blob', 1)
    const images = (page: InkPage) => frame(page, scene, 1).log.filter((call) => call.startsWith('drawImage')).length
    expect(TIERS[0]!.doubled && !TIERS[TIERS.length - 1]!.doubled).toBe(true)
    expect(images(low)).toBeLessThan(images(full))
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
