import { describe, expect, it } from 'vitest'
import type { Ctx } from './ink'
import { drawPage, type MakeSheet } from './journal'
import { REFERENCE, layoutOf } from './layout'
import { stillLive, type BeadsLive, type Live, type Mote } from './live'
import { beadsOf } from './loupe'
import { PACKETS, pack } from './plant'
import { setOf } from './rig'
import { spikePage, type PageView } from './spikePage'
import { NOTE, drawBlotter, drawCan, drawDrops, drawFence, drawSplash, paintBeads, roseOf, toolScale } from './tools'

type Call = [name: string, ...args: unknown[]]

/** A 2D context that draws nothing and writes down every call made on it, and every alpha it was set to. It keeps its alpha over a save and a restore, as a canvas does. */
function recorder(): { ctx: Ctx; calls: Call[]; alphas: number[] } {
  const calls: Call[] = [], alphas: number[] = [], saved: unknown[] = [], held: Record<string, unknown> = { globalAlpha: 1 }
  const gradient = { addColorStop: () => {} }
  const ctx = new Proxy(held, {
    get(target, name: string) {
      if (name in target) return target[name]
      if (name === 'getTransform') return () => ({ a: 2 })
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient
      return (...args: unknown[]) => {
        if (name === 'save') saved.push(target.globalAlpha)
        if (name === 'restore' && saved.length) target.globalAlpha = saved.pop()
        calls.push([name, ...args])
      }
    },
    set(target, name: string, value) {
      if (name === 'globalAlpha') alphas.push(value as number)
      target[name] = value
      return true
    },
  }) as unknown as Ctx
  return { ctx, calls, alphas }
}

const count = (calls: Call[], name: string) => calls.filter((call) => call[0] === name).length
const images = (calls: Call[]) => calls.filter(([name]) => name === 'drawImage')
const text = (calls: Call[]) => calls.filter(([name]) => name === 'fillText' || name === 'strokeText' || name === 'measureText')

describe('the tools as drawings', () => {
  it.each([['can', drawCan], ['blotter', drawBlotter]] as const)('draws the %s in pen and wash, the same every time, with no text', (_name, draw) => {
    const once = recorder(), again = recorder()
    draw(once.ctx, 1)
    draw(again.ctx, 1)
    expect(once.calls.length).toBeGreaterThan(100)
    expect(JSON.stringify(again.calls)).toBe(JSON.stringify(once.calls))
    expect(text(once.calls)).toEqual([])
    expect(count(once.calls, 'save')).toBe(count(once.calls, 'restore'))
  })

  it('puts the rose of the can where its spout ends, and swings it down as the can tips', () => {
    const level = roseOf({ x: 100, y: 100, tip: 0 }, 1), tipped = roseOf({ x: 100, y: 100, tip: 0.9 }, 1)
    expect(level.x).toBeCloseTo(152, 6)
    expect(level.y).toBeCloseTo(75, 6)
    expect(tipped.y).toBeGreaterThan(level.y + 30)
    expect(Math.hypot(tipped.x - 100, tipped.y - 100)).toBeCloseTo(Math.hypot(52, 25), 6)
  })

  it('draws drops of water in a few passes however many there are, each with a wash and a pen outline', () => {
    const drops: Mote[] = []
    for (let i = 0; i < 40; i++) drops.push({ x: 100 + i * 3, y: 80 + (i % 5) * 4, r: 2 + (i % 3) * 0.5, alpha: (1 + (i % 10)) / 10, wet: true })
    const drawn = recorder()
    drawDrops(drawn.ctx, drops)
    expect(count(drawn.calls, 'fill')).toBe(3)
    expect(count(drawn.calls, 'stroke')).toBe(3)
    expect(count(drawn.calls, 'moveTo')).toBe(40)
    expect(text(drawn.calls)).toEqual([])
    // It leaves the alpha as it found it.
    expect(drawn.alphas[drawn.alphas.length - 1]).toBe(1)
    const none = recorder()
    drawDrops(none.ctx, [])
    expect(count(none.calls, 'fill')).toBe(0)
  })

  it('draws a splash as short pen arcs and drops, the same every time and thinner as it ages', () => {
    const once = recorder(), again = recorder(), late = recorder()
    drawSplash(once.ctx, { x: 300, y: 200, r: 14, age: 0.3, kind: 'splash' }, 1)
    drawSplash(again.ctx, { x: 300, y: 200, r: 14, age: 0.3, kind: 'splash' }, 1)
    drawSplash(late.ctx, { x: 300, y: 200, r: 14, age: 0.8, kind: 'splash' }, 1)
    expect(JSON.stringify(again.calls)).toBe(JSON.stringify(once.calls))
    expect(JSON.stringify(late.calls)).not.toBe(JSON.stringify(once.calls))
    // Six arcs of the pen, and the drops in one pass.
    expect(count(once.calls, 'fill')).toBe(6 + 1)
    expect(count(once.calls, 'stroke')).toBe(1)
    expect(late.alphas[0]).toBeLessThan(once.alphas[0])
    expect(count(once.calls, 'save')).toBe(count(once.calls, 'restore'))
  })

  it('puts the fence up strip by strip: four posts and then the rail', () => {
    const strips = (up: number) => { const drawn = recorder(); drawFence(drawn.ctx, { x: 200, y: 300, up }, 1); return count(drawn.calls, 'translate') }
    expect([0, 0.1, 0.3, 0.5, 0.7, 0.9, 1].map(strips)).toEqual([0, 1, 2, 3, 4, 5, 5])
  })
})

describe('the loupe’s note', () => {
  const all = (pairs: number): BeadsLive['pairs'] => beadsOf(pairs)

  it('draws eight beads, two for each trait, under a head that marks the pod parent’s column, and no text', () => {
    const drawn = recorder()
    paintBeads(drawn.ctx, all(PACKETS.short), 1)
    // The head comes first: a small pod over the left column, above every bead. Then each bead at a place of its own, and nothing else on the note is moved.
    const [head, ...places] = drawn.calls.filter(([name]) => name === 'translate')
    expect(Number(head[1])).toBeLessThan(0)
    for (const place of places) expect(Number(head[2])).toBeLessThan(Number(place[2]) - 7.5 * NOTE.bead)
    expect(places).toHaveLength(8)
    expect(new Set(places.map((call) => `${call[1]},${call[2]}`)).size).toBe(8)
    // Four rows from the top down, and in each the bead from the pod parent on the left.
    expect(places.map((call) => Math.sign(Number(call[1])))).toEqual([-1, 1, -1, 1, -1, 1, -1, 1])
    expect(places.map((call) => Number(call[2]))).toEqual([...places.map((call) => Number(call[2]))].sort((a, b) => a - b))
    expect(Math.max(...places.map((call) => Math.abs(Number(call[2])))) * 2 + 14).toBeLessThanOrEqual(NOTE.h)
    expect(text(drawn.calls)).toEqual([])
    expect(count(drawn.calls, 'save')).toBe(count(drawn.calls, 'restore'))
  })

  it('draws a bead that is carried and does not show fainter and broken, and only that one', () => {
    const shown = recorder(), hidden = recorder(), other = recorder()
    paintBeads(shown.ctx, all(pack({ colour: [1, 0], height: [1, 1], leaf: [1, 1], petals: [1, 1] })), 1)
    paintBeads(hidden.ctx, all(pack({ colour: [1, 0], height: [1, 0], leaf: [1, 1], petals: [1, 1] })), 1)
    paintBeads(other.ctx, all(pack({ colour: [1, 0], height: [0, 1], leaf: [1, 1], petals: [1, 1] })), 1)
    // Red with white shows as pink: neither bead of the colour pair is faint.
    // (The pod in the note's head is washed at that strength too, the same in every note.)
    const faint = (one: typeof shown) => one.alphas.filter((alpha) => alpha === 0.5).length
    expect(faint(hidden)).toBe(faint(shown) + 1)
    expect(faint(other)).toBe(faint(shown) + 1)
    // The faint bead is the short one, whichever parent it came from.
    expect(JSON.stringify(hidden.calls)).not.toBe(JSON.stringify(other.calls))
    expect(count(hidden.calls, 'stroke')).not.toBe(count(shown.calls, 'stroke'))
  })

  it('draws each factor its own way: a different drawing for every bead that differs', () => {
    const drawn = (pairs: number) => { const one = recorder(); paintBeads(one.ctx, all(pairs), 1); return JSON.stringify(one.calls) }
    const base = { colour: [1, 1], height: [1, 1], leaf: [1, 1], petals: [1, 1] } as const
    for (const trait of ['colour', 'height', 'leaf', 'petals'] as const) expect(drawn(pack({ ...base, [trait]: [0, 0] })), trait).not.toBe(drawn(pack(base)))
  })
})

describe('the tools on the page', () => {
  const spike = spikePage(), layout = layoutOf(REFERENCE.w, REFERENCE.h), u = toolScale(layout)
  const frame = (view: PageView, change: (live: Live) => void = () => {}) => {
    const made: { calls: Call[]; canvas: { width: number } }[] = [], rest = recorder(), surface = recorder(), live = stillLive()
    const make: MakeSheet = (width, height) => {
      const sheet = recorder(), canvas = { sheet: made.length + 1, width, height }
      made.push({ calls: sheet.calls, canvas })
      return { canvas: canvas as unknown as CanvasImageSource, ctx: sheet.ctx }
    }
    const still = drawPage(rest.ctx, view, layout, 2, 0, make)
    change(live)
    const draws = drawPage(surface.ctx, view, layout, 2, 0, make, live)
    // `set` is what stands still in its place, which is laid into the kept set and not on the frame.
    return { draws, calls: surface.calls, still, rest: rest.calls, made, set: setOf(made, layout.w * 2) as Call[] }
  }
  /** A drawing's sheet is laid within a place, give or take the margin of bare sheet round the drawing. */
  const inside = (call: Call, box: { x: number; y: number; w: number; h: number }, m = 8 * u) => Number(call[2]) >= box.x - m && Number(call[3]) >= box.y - m && Number(call[2]) + Number(call[4]) <= box.x + box.w + m && Number(call[3]) + Number(call[5]) <= box.y + box.h + m
  const tooled = { ...spike, tools: true }

  it('lays the can and the blotter in their places once they have arrived, each inside its place', () => {
    // Lying in their places they stand still: they are in the kept set, and the frame lays down no more for them.
    const without = frame(spike), lying = frame(tooled)
    expect(lying.draws).toBe(without.draws)
    expect(lying.set).toHaveLength(without.set.length + 2)
    const added = lying.set.filter((call) => inside(call, layout.tools.can) || inside(call, layout.tools.blotter))
    expect(added.filter((call) => inside(call, layout.tools.can))).toHaveLength(1)
    expect(added.filter((call) => inside(call, layout.tools.blotter))).toHaveLength(1)
    expect(JSON.stringify(frame({ ...spike, tools: false }).calls)).toBe(JSON.stringify(without.calls))
  })

  it('draws a tool in the hand over the plants and not in its place, and pours from a can tipped past half a radian', () => {
    const lying = frame(tooled), held = (tip: number) => frame(tooled, (live) => { live.can = { x: 500, y: 300, tip } })
    const level = held(0.3), pouring = held(0.9)
    // Out of its place; in the hand over its own shape in bare paper, with the pencil stroke under it.
    expect(level.set.filter((call) => inside(call, layout.tools.can))).toHaveLength(0)
    expect(level.set).toHaveLength(lying.set.length - 1)
    expect(level.draws).toBe(lying.draws + 2 + 1)
    expect(level.calls.some((call) => call[0] === 'rotate' && call[1] === 0.3)).toBe(true)
    // The water is five strokes of the pen, which start at the rose.
    expect(count(pouring.calls, 'fill') - count(level.calls, 'fill')).toBe(5)
    const rose = roseOf({ x: 500, y: 300, tip: 0.9 }, u)
    expect(pouring.calls.some((call) => call[0] === 'moveTo' && Math.hypot(Number(call[1]) - rose.x, Number(call[2]) - rose.y) < 12 * u)).toBe(true)
    const blot = frame(tooled, (live) => { live.blotter = { x: 500, y: 300, tip: -0.2 } })
    expect(blot.set.filter((call) => inside(call, layout.tools.blotter))).toHaveLength(0)
    expect(blot.draws).toBe(lying.draws + 2)
  })

  it('draws wet specks as drops and the others as dust, and a splash in its own way', () => {
    const dust: Mote[] = [{ x: 300, y: 200, r: 1, alpha: 1 }, { x: 304, y: 203, r: 1.2, alpha: 0.5 }], wet: Mote[] = [{ x: 400, y: 200, r: 2.5, alpha: 1, wet: true }]
    const dry = frame(spike, (live) => { live.motes.push(...dust) }), both = frame(spike, (live) => { live.motes.push(...dust, ...wet) }), only = frame(spike, (live) => { live.motes.push(...wet) })
    expect(both.draws).toBe(dry.draws + 1)
    expect(only.draws).toBe(dry.draws)
    expect(count(both.calls, 'bezierCurveTo') - count(dry.calls, 'bezierCurveTo')).toBe(2)
    expect(count(only.calls, 'fill')).toBeLessThan(count(both.calls, 'fill'))
    const splash = frame(spike, (live) => { live.puffs.push({ x: 300, y: 200, r: 14, age: 0.3, kind: 'splash' }) }), sneeze = frame(spike, (live) => { live.puffs.push({ x: 300, y: 200, r: 14, age: 0.3, kind: 'sneeze' }) })
    expect(splash.draws).toBe(sneeze.draws)
    expect(JSON.stringify(splash.calls)).not.toBe(JSON.stringify(sneeze.calls))
  })

  it('lays the loupe’s note beside the flower on the side with more room, and never off the surface', () => {
    const pairs = beadsOf(PACKETS.short), w = NOTE.w * layout.k + 8, h = NOTE.h * layout.k + 8
    for (const [x, y] of [[20, 20], [layout.w - 10, 30], [15, layout.h - 5], [layout.w - 5, layout.h - 5], [400, 300], [800, 300]]) {
      const noted = frame(spike, (live) => { live.beads = { x, y, k: layout.k, pairs } })
      expect(noted.draws).toBe(noted.still + 2)
      const note = images(noted.calls)[images(noted.calls).length - 1], at = noted.calls.slice(0, noted.calls.indexOf(note)).filter((call) => call[0] === 'translate').pop()!
      expect(Number(note[4])).toBeCloseTo(w, 6)
      expect(Number(at[1]) - w / 2).toBeGreaterThanOrEqual(0)
      expect(Number(at[1]) + w / 2).toBeLessThanOrEqual(layout.w)
      expect(Number(at[2]) - h / 2).toBeGreaterThanOrEqual(0)
      expect(Number(at[2]) + h / 2).toBeLessThanOrEqual(layout.h)
      expect(Math.sign(Number(at[1]) - x)).toBe(x <= layout.w / 2 ? 1 : -1)
      // The sheet of the note holds its head and the eight beads.
      expect(count(noted.made[(note[1] as unknown as { sheet: number }).sheet - 1].calls, 'translate')).toBe(1 + 1 + 8)
    }
  })

  it('draws a pencil sketch for each plant that left, oldest first from the left, and the last one from the soil up', () => {
    const looks = spike.kept.map((entry) => entry.look), none = frame(spike), all = frame({ ...spike, sketched: looks })
    // Finished sketches stand still, in the kept set, after the packets, the kept drawings, the pressed leaf and the frond.
    expect(all.draws).toBe(none.draws)
    expect(all.set).toHaveLength(none.set.length + looks.length)
    const added = all.set.slice(spike.packets.length + spike.kept.length + 2, spike.packets.length + spike.kept.length + 2 + looks.length)
    expect(added).toHaveLength(looks.length)
    added.forEach((call, at) => {
      const box = layout.sketches[at]
      expect(Number(call[2])).toBeCloseTo(box.x, 6)
      expect(Number(call[3]) + Number(call[5])).toBeLessThanOrEqual(box.y + box.h + 1)
    })
    const half = frame({ ...spike, sketched: looks }, (live) => { live.sketching = 0.5 }), start = frame({ ...spike, sketched: looks }, (live) => { live.sketching = 0 })
    // What has drawn itself is cut from the sketch's own sheet: nine numbers, not five. Before it starts there is nothing of it.
    // The one being drawn is laid on the frame, and is not in the set.
    expect(images(half.calls).filter((call) => call.length === 10)).toHaveLength(1)
    expect(half.draws).toBe(all.draws + 1)
    expect(half.set).toHaveLength(all.set.length - 1)
    expect(start.draws).toBe(all.draws)
    expect(start.set).toHaveLength(all.set.length - 1)
    // More than there are places: the newest ones are shown.
    const many = Array.from({ length: layout.sketches.length + 3 }, (_unused, at) => looks[at % looks.length])
    expect(frame({ ...spike, sketched: many }).set).toHaveLength(none.set.length + layout.sketches.length)
    expect(text(all.made.flatMap((sheet) => sheet.calls))).toEqual([])
  })

  it('puts the beetle’s fence up round the plant it is given', () => {
    const fenced = frame(spike, (live) => { live.fence = { x: layout.beetle.x + 30, y: layout.beetle.y + layout.beetle.h * 0.8, up: 1 } })
    expect(fenced.draws).toBe(fenced.still + 1)
    expect(JSON.stringify(fenced.calls)).not.toBe(JSON.stringify(fenced.rest))
  })
})
