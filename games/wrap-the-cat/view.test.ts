import { beforeAll, describe, expect, it } from 'vitest'
import { surface, type Ctx } from './crepe'
import { FIXED, FULL, SPECS } from './layout'
import { freshWorld, openDoor, specOf } from './model'
import { MOVES, poseOf, still, type Since } from './motion'
import { Play } from './play'
import { STAMP_LIMIT, View } from './view'
import { OWN, SHIVER, TWANG, voiceOfEvent, voiceOfPoke } from './voices'
import type { Event } from './model'
import type { Note } from './audio'

// A pen that takes every call and refuses a number that is not one.
let depth = 0
function pen(): Ctx {
  const known: Record<string, unknown> = {
    save: () => { depth++ },
    restore: () => { if (--depth < 0) throw new Error('restored more than saved') },
    createLinearGradient: () => ({ addColorStop() {} }),
    ellipse: (...a: number[]) => { if (a[2] < 0 || a[3] < 0) throw new Error('an oval turned inside out') },
    arc: (...a: number[]) => { if (a[2] < 0) throw new Error('a circle turned inside out') },
  }
  return new Proxy(known, {
    get: (o, k: string) => (k in o ? o[k] : (...a: unknown[]) => { if (a.some((n) => typeof n === 'number' && !Number.isFinite(n))) throw new Error(`${k} was given a number that is not one`) }),
    set: () => true,
  }) as unknown as Ctx
}
beforeAll(() => { surface.make = () => ({ canvas: {} as HTMLCanvasElement, ctx: pen() }) })

const guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
function frames(p: Play, v: View, seconds: number): number {
  let most = 0
  for (let i = 0; i < seconds * 60; i++) {
    p.advance(1 / 60)
    v.advance(p.world, p, 1 / 60)
    for (const k of p.pokes.splice(0)) v.poke(k)
    for (const e of p.world.events.splice(0)) v.notice(e, p.world)
    v.draw(pen(), p.world, p, guidance)
    expect(depth).toBe(0)
    most = Math.max(most, v.stamps.stamped)
  }
  return most
}
const view = () => { const v = new View(); v.sized(() => ({ canvas: {} as HTMLCanvasElement, ctx: pen() }), 1, 0, 0, 1180, 820); return v }

describe('the drawing', () => {
  it('draws the first visit, a wrap, a rip and the family in the fullest room, within the budget and painting nothing late', () => {
    const p = new Play(freshWorld()), v = view()
    let most = frames(p, v, 6)
    const painted = v.stamps.painted
    const w = p.world
    for (const id of FIXED) w.layers[id] = [0, 1, 2].map((paper) => ({ paper: paper as 0 | 1 | 2, cover: FULL, torn: false }))
    w.airs.air0 = { at: { x: 860, y: 160 }, r: 50 }; w.layers.air0 = [{ paper: 1, cover: FULL, torn: false }]
    w.ties = [['cat', 'bike']]
    w.scraps = Array.from({ length: 24 }, (_, i) => ({ x: 100 + i * 40, y: 700, paper: (i % 3) as 0 | 1 | 2, turn: i % 6 }))
    most = Math.max(most, frames(p, v, 1))
    for (const id of FIXED) for (let i = 0; i < 3; i++) { p.down(1, specOf(w, id)!.mid, i * 100); p.up(1, specOf(w, id)!.mid, i * 100 + 50) }
    most = Math.max(most, frames(p, v, 1))
    openDoor(w)
    most = Math.max(most, frames(p, v, 12))
    expect(w.visit).toBeNull()
    expect(most).toBeLessThanOrEqual(STAMP_LIMIT)
    expect(v.stamps.painted).toBe(painted)
  })
  it('half wrapped things of every kind are drawn under a moving finger', () => {
    for (const id of FIXED) {
      const p = new Play(freshWorld()), v = view(), s = SPECS[id]
      p.down(1, { x: s.mid.x, y: s.mid.y + s.ry * 0.6 }, 0)
      for (let i = 0; i < 30; i++) { p.move(1, { x: s.mid.x + Math.cos(1.5 + i * 0.12) * s.rx, y: s.mid.y + Math.sin(1.5 + i * 0.12) * s.ry }); frames(p, v, 1 / 60) }
      p.cancel(1); frames(p, v, 0.1)
    }
  })
})

describe('motion', () => {
  const at = (id: (typeof FIXED)[number], s: Partial<Since>) => { const full: Since = { lay: 99, bow: 99, tear: 99, burst: 99, poke: 99, ...s }; return JSON.stringify(poseOf(id, full, 1, still())) }
  it('nobody shares a curve', () => {
    for (const on of ['lay', 'bow', 'burst'] as const) {
      const all = FIXED.map((id) => [0.1, 0.3, 0.45, 0.7].map((t) => at(id, { [on]: t })).join())
      expect(new Set(all).size).toBe(FIXED.length)
    }
    expect(new Set(Object.values(MOVES).map((m) => m.burst.toString())).size).toBe(7)
  })
  it('settles', () => {
    for (const id of FIXED) expect(at(id, { lay: 5, bow: 5, tear: 5, burst: 5, poke: 5 })).toBe(at(id, {}))
  })
})

describe('the voices', () => {
  const good = (notes: Note[]) => { for (const x of notes) { expect(x.frequency).toBeGreaterThan(30); expect(x.frequency).toBeLessThan(9000); expect(x.peak).toBeGreaterThan(0); expect(x.peak).toBeLessThanOrEqual(0.32); expect((x.delay ?? 0) + x.attack + x.decay).toBeLessThan(3) } }
  it('are in range, and every own sound is another', () => {
    const events: Event[] = [
      ...([0, 1, 2] as const).flatMap((paper) => FIXED.flatMap((id): Event[] => [{ type: 'lay', id, paper, wedge: 1, laid: 4 }, { type: 'bow', id, paper, layers: 1 }, { type: 'tear', id, paper, at: { x: 0, y: 0 }, left: 12 }, { type: 'burst', id, paper, layers: 0, by: null, at: { x: 0, y: 0 }, scraps: [] }, { type: 'burst', id, paper, layers: 0, by: 'dog', at: { x: 0, y: 0 }, scraps: [] }])),
      { type: 'moth', at: { x: 0, y: 0 } }, { type: 'paper', paper: 1 }, { type: 'bump' }, { type: 'sit' }, { type: 'stir', at: { x: 0, y: 0 }, n: 1 }, { type: 'eat', scrap: { x: 0, y: 0, paper: 0, turn: 0 } }, { type: 'visit' }, { type: 'noses' }, { type: 'tug', who: 'aunt', id: 'bike' }, { type: 'tug', who: 'boy', id: 'bike' }, { type: 'tug', who: 'dog', id: 'bike' }, { type: 'out' },
    ]
    events.forEach((e, i) => { const x = voiceOfEvent(e, i, i % 2 ? 'tuba' : null); expect(x.length).toBeGreaterThan(0); good(x) })
    for (let beat = 0; beat < 5; beat++) good(voiceOfEvent({ type: 'squeak', beat }, 0, null))
    for (const kind of ['door', 'mouse', 'room'] as const) good(voiceOfPoke({ touched: { kind }, at: { x: 0, y: 0 } }, 1))
    good(SHIVER); good(TWANG)
    const own = Object.values(OWN).flatMap((o) => [o.bow(1), o.burst(1), o.kin()]).map((x) => JSON.stringify(x))
    expect(new Set(own).size).toBe(own.length)
  })
})
