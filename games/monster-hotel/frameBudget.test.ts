import { describe, expect, it } from 'vitest'
import type { GuestId } from './guests'
import type { House } from './hotel'
import { InkPage } from './ink'
import type { Surface } from './inkHatch'
import { spotsOf } from './inkPlaces'
import type { InkGuest, InkScene, InkView } from './inkScene'
import { layoutPage } from './layout'

// The frame budget, counted and not timed: what one frame of the busiest
// scenes asks of a canvas. A machine without a graphics card cannot say how
// fast a frame is, but it can say how much is in one.

const W = 1180, H = 820

/** A 2D context that draws nothing and writes down every call. */
function recorder(log: string[], canvas?: object): CanvasRenderingContext2D {
  const round = (value: unknown): unknown => (typeof value === 'number' ? Math.round(value * 1000) / 1000 : typeof value === 'object' && value !== null ? '#' : value)
  return new Proxy({ canvas } as Record<string, unknown>, {
    get(target, name) {
      if (typeof name !== 'string') return undefined
      if (name in target) return target[name]
      return (...args: unknown[]) => {
        log.push(`${name}(${args.map(round).join(',')})`)
        return name === 'createPattern' ? {} : name === 'measureText' ? { width: 7 } : undefined
      }
    },
    set(target, name, value) {
      if (typeof name === 'string') target[name] = value
      return true
    },
  }) as unknown as CanvasRenderingContext2D
}

function stage() {
  const kept: string[][] = []
  const make = (width: number, height: number): Surface => {
    const log: string[] = []
    kept.push(log)
    const context = recorder(log)
    return { width, height, getContext: () => context }
  }
  const page = new InkPage(make)
  page.resize(W, H, 2, 0)
  return { page, kept }
}

function frame(page: InkPage, scene: InkScene, seconds: number) {
  const log: string[] = []
  const count = page.draw(recorder(log, {}), scene, seconds)
  return {
    count,
    whole: log.filter((call) => call === `drawImage(#,0,0,${W},${H})`).length,
    images: log.filter((call) => call.startsWith('drawImage')).length,
    strokes: log.filter((call) => call === 'stroke()' || call === 'fill()').length,
    text: log.filter((call) => /^(fillText|strokeText)/.test(call)).length,
  }
}

const LONG: House = { shape: 'long', fixtures: [{ kind: 'boiler', col: 0 }, { kind: 'snow', col: 2 }], twins: [] }

const guest = (id: GuestId, place: InkGuest['place'], awake: boolean, more: Partial<InkGuest> = {}): InkGuest =>
  ({ id, place, awake, mood: 'content', turnedTo: null, wrapped: false, staresAt: null, ...more })

/** A full house: five guests in the long house by night, three things placed, the other two in the cupboard, airs of every kind, the coach waiting. */
function fullHouse(): InkScene {
  return {
    house: LONG, phase: 'night', from: null, numerals: true,
    guests: [
      guest('lizard', { room: 0 }, false), guest('cook', { room: 1 }, false), guest('blob', { room: 3 }, false, { mood: 'cross', turnedTo: 'right' }),
      guest('troll', { room: 4 }, true), guest('yeti', { room: 5 }, false), guest('singer', 'bench', true),
    ],
    things: [
      { kind: 'quilt', at: { edge: '4-5' }, dial: 1 }, { kind: 'pipe', at: { edge: '1-4' }, dial: 1 }, { kind: 'stove', at: { room: 2 }, dial: 3 },
      { kind: 'ice', at: 'cupboard', dial: 2 }, { kind: 'clock', at: 'cupboard', dial: 1 },
    ],
    airs: [
      { kind: 'din', rooms: [4, 3], level: 1, taken: 'minded' }, { kind: 'din', rooms: [4, 1], level: 1, taken: 'faint' },
      { kind: 'pong', rooms: [1, 0], level: 1, taken: 'faint' }, { kind: 'pong', rooms: [1, 2], level: 1, taken: 'faint' }, { kind: 'pong', rooms: [1, 4], level: 1, taken: 'faint' },
      { kind: 'warm', rooms: [0, 3], level: 1, taken: 'minded' }, { kind: 'warm', rooms: [2, 5], level: 2, taken: 'faint' }, { kind: 'cold', rooms: [5, 2], level: 2, taken: 'faint' },
    ],
  }
}

const BLOB: InkView = { from: 'blob', room: 3 }

/** The coach changing over: five guests filing out of the house past five more who have just got down, the porter trundling, the coach's door open. */
function changeover(seconds: number): InkScene {
  const ids: GuestId[] = ['troll', 'bat', 'blob', 'yeti', 'lizard']
  const page = layoutPage(W, H, 'long')
  const leaving = ids.map((id, room) => guest(id, { room }, true))
  const spots = spotsOf(leaving, page)
  return {
    house: LONG, phase: 'day', from: null, airs: [], coachOpen: true, coachAt: 0, porterAt: { dx: 30 + 20 * Math.sin(seconds), dy: 0 },
    // Guests on the move are given their bodies by the scene: each a step further along than the last.
    guests: [
      ...leaving.map((one, index) => ({ ...one, body: { sx: 1, sy: 1 + 0.03 * Math.sin(seconds * 9 + index), rot: 0.04, dx: 30 * index + 40 * seconds, dy: 0 } })),
      guest('cook', 'lobby', true, { staresAt: 1 }), guest('fly', 'lobby', true, { staresAt: 2 }), guest('singer', 'lobby', true, { staresAt: 4 }),
      // Two more are still in the hand of whoever is setting them down: carried, over the lobby.
      guest('bat', 'lobby', true, { carried: { x: spots[1]!.spot.x + 500, y: 380, swing: 0.1 } }),
      guest('blob', 'bench', true),
    ].slice(0, 10),
    things: [
      { kind: 'quilt', at: 'cupboard', dial: 1 }, { kind: 'pipe', at: 'cupboard', dial: 1 }, { kind: 'stove', at: 'cupboard', dial: 2, carried: { x: 900, y: 300, swing: -0.2 } },
      { kind: 'ice', at: 'cupboard', dial: 3 }, { kind: 'clock', at: 'cupboard', dial: 1 },
    ],
    numerals: true,
  }
}

describe('the frame budget of the ink page', () => {
  const scenes: { name: string; at: (seconds: number) => InkScene; whole: number; numerals: number }[] = [
    { name: 'a full house, the plain page', at: () => fullHouse(), whole: 1, numerals: 2 },
    { name: 'a full house, from a guest\'s place', at: () => ({ ...fullHouse(), from: 'blob', view: BLOB }), whole: 1, numerals: 2 },
    { name: 'a full house, during a sweep', at: () => ({ ...fullHouse(), from: 'blob', view: BLOB, under: null, sweep: { x: 300, y: 400, progress: 0.5 } }), whole: 2, numerals: 4 },
    { name: 'a full house, while the hour changes', at: () => ({ ...fullHouse(), hourUnder: 'day', hourSweep: { x: 360, y: 80, progress: 0.4 } }), whole: 2, numerals: 4 },
    { name: 'the coach changing over, ten figures on the page', at: changeover, whole: 1, numerals: 2 },
    // The idle glow lies on every guest, the wheel and every thing at once.
    { name: 'a full house, everything that can be touched glowing', at: () => ({ ...fullHouse(), glow: { strength: 1, guests: fullHouse().guests.map((guest) => guest.id), wheel: true, things: fullHouse().things.map((thing) => thing.kind) } }), whole: 1, numerals: 2 },
    // What a touch sets off for a moment is a few strokes each, drawn afresh: feathers, a sneeze, a puff, a patch.
    { name: 'a full house, with what a touch set off still in the air', at: (seconds) => ({ ...fullHouse(), moments: (['feathers', 'sneeze', 'breath', 'puff', 'scorch', 'frost'] as const).map((kind, index) => ({ kind, x: 120 + index * 90, y: 300, room: null, age: 0.1 + (seconds % 0.3), lasts: 1.5, side: 1 as const, of: 'din' as const })) }), whole: 1, numerals: 2 },
  ]

  for (const scene of scenes) {
    it(`${scene.name}: ${scene.whole} whole-surface stamp${scene.whole > 1 ? 's' : ''}, fewer than 80 sprites and figures`, () => {
      const { page, kept } = stage()
      for (const seconds of [0.3, 1.7, 4.2]) {
        const drawn = frame(page, scene.at(seconds), seconds)
        expect(drawn.whole).toBe(scene.whole)
        expect(drawn.count).toBeLessThan(80)
        expect(drawn.count).toBeGreaterThan(10)
        // What the page reports covers every figure it set down.
        expect(drawn.count).toBeGreaterThanOrEqual(drawn.images - 14)
        // The only text is the numeral of a dial, twice over (its paper edge, then its ink), drawn by symbols.ts.
        expect(drawn.text).toBe(scene.numerals * 2)
      }
      // No kept figure, tile or layer holds any text.
      for (const log of kept) expect(log.filter((call) => /^(fillText|strokeText|font=)/.test(call))).toEqual([])
    })

    it(`${scene.name}: a second identical frame builds no new surface`, () => {
      const { page } = stage()
      // The line boils between two drawings of each figure, so the first second is let run to draw them all.
      for (const seconds of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2]) frame(page, scene.at(0.3), seconds)
      const built = page.built
      const first = frame(page, scene.at(0.3), 0.3)
      expect(frame(page, scene.at(0.3), 0.3)).toEqual(first)
      for (const seconds of [0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1, 1.1, 1.2]) frame(page, scene.at(0.3), seconds)
      expect(page.built).toBe(built)
    })
  }

  it('keeps at most four layers the size of the surface, however the page is looked at', () => {
    const { page, kept } = stage()
    const base = fullHouse()
    for (const scene of [base, { ...base, view: BLOB }, { ...base, phase: 'day' as const }, { ...base, phase: 'day' as const, view: BLOB }, { ...base, view: { from: 'troll' as const, room: 4 } }, base]) frame(page, scene, 1)
    const whole = kept.filter((log) => log.some((call) => call === 'setTransform(2,0,0,2,0,0)')).length
    expect(whole).toBeGreaterThanOrEqual(4)
    // Going back to a look already seen builds at most the one layer that was let go.
    const built = page.built
    frame(page, { ...base, view: BLOB }, 1)
    frame(page, base, 1)
    expect(page.built - built).toBeLessThanOrEqual(2)
  })
})
