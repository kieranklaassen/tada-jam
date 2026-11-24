import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest'
import { DRAW_BUDGET } from './config'
import type { Guidance } from './guidance'
import { BED, KNOB, MOON, bedX, pegOf } from './layout'
import { freshNight, type NightRecord } from './night'
import { below, makeRng } from './rng'
import { Show } from './show'
import { GARMENTS, SETS } from './things'
import { RoomView } from './view'

// Counted and not timed: the real view draws every frame onto a surface that only counts.

const count = { stamps: 0, pen: 0, full: 0 }

function fakeCanvas(counts: boolean): HTMLCanvasElement {
  const anything: unknown = new Proxy(function () {}, { get: (_t, key) => (key === Symbol.toPrimitive ? () => 0 : anything), set: () => true, apply: () => anything })
  const ctx = new Proxy({}, {
    get(_t, key) {
      if (key === 'drawImage') return (_i: unknown, _x: number, _y: number, w?: number) => { if (counts) { count.stamps += 1; if (w === undefined) count.full += 1 } }
      if (key === 'fill' || key === 'stroke' || key === 'fillRect') return () => { if (counts) count.pen += 1 }
      return anything
    },
    set: () => true,
  })
  return { width: 2360, height: 1640, getContext: () => ctx } as unknown as HTMLCanvasElement
}

beforeAll(() => { vi.stubGlobal('document', { createElement: () => fakeCanvas(false) }) })
afterAll(() => { vi.unstubAllGlobals() })

describe('the frame budget', () => {
  it('holds in every state a seeded child reaches, and counts what it draws', () => {
    const view = new RoomView(fakeCanvas(true))
    view.resize(1180, 820, 2)
    let most = 0, where = '', full = 0, frames = 0
    const guidance: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
    const frame = (show: Show) => {
      show.step(1 / 60)
      show.takeSounds()
      count.stamps = count.pen = count.full = 0
      view.draw(show, show.busy ? null : guidance)
      frames += 1
      if (view.drawn !== count.stamps + count.pen) throw new Error(`says ${view.drawn}, drew ${count.stamps + count.pen}`)
      full = Math.max(full, count.full)
      if (count.stamps + count.pen > most) { most = count.stamps + count.pen; where = `lit ${show.lit} scene ${show.scene !== null} walk ${show.walking !== null} at ${show.t.toFixed(1)}: ${count.stamps} + ${count.pen} worn ${JSON.stringify(show.night.worn)} prints ${show.prints.length} acts ${Object.values(show.people).map((p) => p.act).join()}` }
    }
    const starts: NightRecord[] = [
      freshNight(false), freshNight(true), { ...freshNight(true), lit: false },
      { ...freshNight(true), lit: false, worn: { goat: [...SETS.knight], hippo: [], hen: [...SETS.lady], croc: [], pig: [...SETS.rider] } },
      { ...freshNight(true), lit: false, worn: { goat: ['bell', 'feather'], hippo: ['pan', 'gown'], hen: ['armour', 'boots'], croc: ['tutu', 'skates'], pig: ['slippers'] } },
    ]
    const spots = [...GARMENTS.map(pegOf), ...[0, 1, 2, 3, 4].map((bed) => ({ x: bedX(bed), y: BED.top + 80 })), KNOB, MOON, { x: 60, y: 200 }, { x: 590, y: 810 }]
    starts.forEach((start, i) => {
      const show = new Show(start), rng = makeRng(i + 1)
      show.press(KNOB)
      for (let n = 0; n < 600; n++) frame(show)
      for (let act = 0; act < 60; act++) {
        const from = spots[below(rng, spots.length)], to = spots[below(rng, spots.length)]
        show.press(from)
        if (below(rng, 2) === 0) show.tap()
        else { for (let n = 1; n <= 6; n++) { show.dragMove(from, { x: from.x + (to.x - from.x) * n / 6, y: from.y + (to.y - from.y) * n / 6 }); frame(show) } show.drop() }
        for (let n = 0; n < 50; n++) frame(show)
      }
    })
    expect(frames).toBeGreaterThan(15000)
    expect(full).toBeLessThanOrEqual(2)
    expect(most, where).toBeLessThanOrEqual(DRAW_BUDGET)
  }, 60_000)
})
