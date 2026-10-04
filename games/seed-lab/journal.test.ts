import { describe, expect, it } from 'vitest'
import type { Ctx } from './ink'
import { drawPage, type MakeSheet } from './journal'
import { REFERENCE, layoutOf } from './layout'
import { setOf } from './rig'
import { stillLive, type Live } from './live'
import { POSES, poseLive, poseView } from './livePoses'
import { spikePage, type PageView } from './spikePage'

type Call = [name: string, ...args: unknown[]]

/** A 2D context that draws nothing and writes down every call made on it. */
function recorder(ratio = 2): { ctx: Ctx; calls: Call[] } {
  const calls: Call[] = [], held: Record<string, unknown> = {}
  const gradient = { addColorStop: () => {} }
  const ctx = new Proxy(held, {
    get(target, name: string) {
      if (name in target) return target[name]
      if (name === 'getTransform') return () => ({ a: ratio })
      if (name === 'createLinearGradient' || name === 'createRadialGradient') return () => gradient
      // The symbols module measures a numeral before it draws it.
      if (name === 'measureText') return (text: string) => ({ width: text.length * 12 })
      return (...args: unknown[]) => { calls.push([name, ...args]) }
    },
    set(target, name: string, value) {
      target[name] = value
      return true
    },
  }) as unknown as Ctx
  return { ctx, calls }
}

/** A sheet factory that hands out recorders, and keeps them to be looked at. */
function sheets(): { make: MakeSheet; made: { canvas: { sheet: number; width: number; height: number }; calls: Call[] }[] } {
  const made: { canvas: { sheet: number; width: number; height: number }; calls: Call[] }[] = []
  const make: MakeSheet = (width, height) => {
    const { ctx, calls } = recorder()
    const canvas = { sheet: made.length, width, height }
    made.push({ canvas, calls })
    return { canvas: canvas as unknown as CanvasImageSource, ctx }
  }
  return { make, made }
}

const names = (calls: Call[]) => calls.map(([name]) => name)
const count = (calls: Call[], name: string) => calls.filter((call) => call[0] === name).length

describe('the journal page', () => {
  const view = spikePage(), layout = layoutOf(REFERENCE.w, REFERENCE.h)

  it('never draws text, on the surface or on any sheet', () => {
    const { make, made } = sheets(), surface = recorder()
    drawPage(surface.ctx, view, layout, 1.5, 0, make)
    for (const calls of [surface.calls, ...made.map((sheet) => sheet.calls)]) {
      expect(names(calls)).not.toContain('fillText')
      expect(names(calls)).not.toContain('strokeText')
    }
    expect(made.length).toBeGreaterThan(10)
  })

  it('makes its sheets once: a second frame makes none and lays down fewer than 80 things', () => {
    const { make, made } = sheets()
    drawPage(recorder().ctx, view, layout, 0, 0, make)
    const after = made.length, surface = recorder()
    const work = { kept: -1 }
    const draws = drawPage(surface.ctx, view, layout, 0.5, 0, make, null, work)
    expect(made.length).toBe(after)
    expect(draws).toBeGreaterThan(20)
    expect(draws).toBeLessThan(80)
    const images = surface.calls.filter(([name]) => name === 'drawImage')
    expect(images.length).toBeGreaterThan(20)
    expect(images.length).toBeLessThanOrEqual(draws)
    // What stands still was laid into the kept set by the first frame, and the second lays nothing into it.
    expect(work.kept).toBe(0)
    // The packets, the kept drawings, the pressed leaf and the frond, and the twelve pots.
    expect(setOf(made, layout.w * 2)).toHaveLength(view.packets.length + view.kept.length + 2 + 12)
  })

  it('draws the same calls for the same view and time', () => {
    const { make } = sheets()
    drawPage(recorder().ctx, view, layout, 3.25, 0, make)
    const first = recorder(), second = recorder()
    expect(drawPage(first.ctx, view, layout, 3.25, 0, make)).toBe(drawPage(second.ctx, spikePage(), layoutOf(REFERENCE.w, REFERENCE.h), 3.25, 0, make))
    expect(JSON.stringify(second.calls)).toBe(JSON.stringify(first.calls))
    const cold = sheets(), again = recorder()
    drawPage(again.ctx, view, layout, 3.25, 0, cold.make)
    expect(JSON.stringify(names(again.calls))).toBe(JSON.stringify(names(first.calls)))
  })

  it('paints each sheet the same way every time', () => {
    const a = sheets(), b = sheets()
    drawPage(recorder().ctx, view, layout, 0, 0, a.make)
    drawPage(recorder().ctx, view, layout, 9, 0, b.make)
    expect(b.made.length).toBe(a.made.length)
    a.made.forEach((sheet, at) => {
      expect(b.made[at].canvas).toEqual(sheet.canvas)
      expect(JSON.stringify(b.made[at].calls)).toBe(JSON.stringify(sheet.calls))
    })
  })

  it('is alive at idle, and keeps every plant still', () => {
    const { make, made } = sheets()
    drawPage(recorder().ctx, view, layout, 0, 0, make)
    const early = recorder(), late = recorder()
    drawPage(early.ctx, view, layout, 1, 0, make)
    drawPage(late.ctx, view, layout, 2.3, 0, make)
    expect(JSON.stringify(late.calls)).not.toBe(JSON.stringify(early.calls))
    // The ground, which holds the packets, the kept drawings and the pots, then the visitor's wish, the plants and the
    // pods are laid down first: the same sheets at the same places both times.
    const count = 1 + 1 + view.plants.length + view.pods.length
    const still = (calls: Call[]) => calls.filter(([name]) => name === 'drawImage').slice(0, count)
    expect(still(early.calls)).toHaveLength(count)
    expect(JSON.stringify(still(late.calls))).toBe(JSON.stringify(still(early.calls)))
    // No transform is applied before the last of them, so those places are the places on the page: a plant at rest
    // does not sway, lean or breathe, at any time and on any tier.
    const lastPlant = early.calls.indexOf(still(early.calls)[count - 1])
    const moved = (calls: Call[]) => calls.slice(0, lastPlant).filter(([name]) => ['translate', 'rotate', 'scale', 'transform', 'setTransform'].includes(name))
    expect(moved(early.calls)).toEqual([])
    expect(moved(late.calls)).toEqual([])
    for (const time of [0.4, 3.1, 6.5, 7.4, 13.2, 60]) {
      const at = recorder()
      drawPage(at.ctx, view, layout, time, 0, make)
      expect(JSON.stringify(still(at.calls))).toBe(JSON.stringify(still(early.calls)))
      expect(moved(at.calls)).toEqual([])
    }
    expect(made.length).toBeGreaterThan(count - 20)
  })

  it('keeps one set of sheets per size and makes new ones when the surface changes', () => {
    const { make, made } = sheets()
    drawPage(recorder().ctx, view, layout, 0, 0, make)
    const before = made.length
    drawPage(recorder().ctx, view, layoutOf(1024, 768), 0, 0, make)
    expect(made.length).toBeGreaterThan(before)
    const ground = made[before]
    expect(Math.max(...made.slice(before).map((sheet) => sheet.canvas.width))).toBe(2048)
    expect(ground.canvas.width).toBeLessThanOrEqual(2048)
  })

  it('lays down as much on the lower tiers: the lifted tape end is drawn on every tier, and only stops moving by itself', () => {
    const { make } = sheets()
    drawPage(recorder().ctx, view, layout, 0, 0, make)
    const full = drawPage(recorder().ctx, view, layout, 1, 0, make), lean = drawPage(recorder().ctx, view, layout, 1, 3, make)
    expect(full - lean).toBe(0)
  })

  it('draws an empty page and a page with no time', () => {
    const { make } = sheets()
    const bare = { ...view, plants: [], packets: [], pods: [], visitor: null, waiting: null, kept: [], worm: null }
    const work = { kept: 0 }
    expect(drawPage(recorder().ctx, bare, layout, Number.NaN, 0, make, null, work)).toBeGreaterThan(2)
    // The twelve pots are in the kept set, with the pressed leaf and the frond.
    expect(work.kept).toBe(14)
  })
})

describe('the journal page in motion', () => {
  const view = spikePage(), layout = layoutOf(REFERENCE.w, REFERENCE.h)
  const images = (calls: Call[]) => calls.filter(([name]) => name === 'drawImage')
  /** A frame of the page with that in motion, on sheets that have already drawn the page at rest once. */
  const frame = (live: Live | null, time = 2, shown: PageView = view, resting: PageView = view) => {
    const kept = sheets(), rest = recorder(), surface = recorder()
    drawPage(rest.ctx, resting, layout, time, 0, kept.make)
    const restSet = setOf(kept.made, layout.w * 2)
    const draws = drawPage(surface.ctx, shown, layout, time, 0, kept.make, live)
    return { draws, calls: surface.calls, rest: rest.calls, made: kept.made, set: setOf(kept.made, layout.w * 2), restSet }
  }
  /** A named moment on the page it is shown on, as the Mount draws it. */
  const pose = (name: string, time = 2) => frame(poseLive(name, poseView(name, view), layout, time), time, poseView(name, view))
  /** The still things of the page at rest, in the order they are laid on the surface: the ground, the visitor's wish, then the plants, each pod after its plant. In the kept set: the packets, the kept drawings, the pressed leaf and the frond, then the pots. */
  const first = { pot: view.packets.length + view.kept.length + 2, plant: 1 + 1 }

  it('draws the page at rest just the same with no motion given, with none, and with a motion in which nothing moves', () => {
    const none = frame(null), still = frame(stillLive())
    const { make } = sheets(), bare = recorder()
    drawPage(recorder().ctx, view, layout, 2, 0, make)
    expect(drawPage(bare.ctx, view, layout, 2, 0, make)).toBe(none.draws)
    expect(JSON.stringify(none.calls)).toBe(JSON.stringify(bare.calls))
    expect(JSON.stringify(none.calls)).toBe(JSON.stringify(none.rest))
    expect(still.draws).toBe(none.draws)
    expect(JSON.stringify(still.calls)).toBe(JSON.stringify(none.calls))
  })

  it('draws the same with every new thing of the view left out and with each of them at rest', () => {
    const plain = frame(null), atRest = frame(stillLive(), 2, { ...view, tools: false, sketched: [], visitor: { ...view.visitor!, big: null, given: [], settled: false } })
    expect(atRest.draws).toBe(plain.draws)
    expect(JSON.stringify(atRest.calls)).toBe(JSON.stringify(plain.calls))
    // A rolled second sketch and kept plants each add to the frame; the tools and a sketch stand still, and add to the kept set. None takes anything away.
    const more = frame(null, 2, { ...view, tools: true, sketched: [view.kept[0].look], visitor: { ...view.visitor!, big: { colour: 'red' }, given: [view.kept[0].look] } })
    expect(more.draws).toBe(plain.draws + 2 + 1)
    expect(more.set).toHaveLength(plain.set.length + 1 + 2)
  })

  it.each(POSES)('draws the pose %s with no text but a numeral of its wish, with one full-surface stamp and fewer than 130 things laid down', (name) => {
    const kept = sheets(), surface = recorder(), shown = poseView(name, view), wants = shown.visitor && !shown.visitor.settled && shown.visitor.count > 1 ? [String(shown.visitor.count)] : []
    const draws = drawPage(surface.ctx, shown, layout, 2, 0, kept.make, poseLive(name, shown, layout, 2))
    // The one text a pose may hold is the numeral of a wish for two or three, which symbols.ts draws once, on the wish's own sheet.
    expect(surface.calls.filter(([call]) => call === 'fillText' || call === 'strokeText')).toEqual([])
    expect(kept.made.flatMap((sheet) => sheet.calls).filter(([call]) => call === 'strokeText')).toEqual([])
    expect(kept.made.flatMap((sheet) => sheet.calls).filter(([call]) => call === 'fillText').map((call) => call[1])).toEqual(wants)
    // A stamp is as wide and as high as the surface whether it is laid whole (five numbers) or cut from its sheet (nine).
    const full = images(surface.calls).filter((call) => Number(call[call.length - 2]) >= layout.w && Number(call[call.length - 1]) >= layout.h)
    expect(full).toHaveLength(1)
    expect(draws).toBeGreaterThan(20)
    expect(draws).toBeLessThan(130)
    expect(images(surface.calls).length).toBeLessThanOrEqual(draws)
    expect(count(surface.calls, 'save')).toBe(count(surface.calls, 'restore'))
  })

  it.each(POSES)('draws the pose %s the same way twice, and differently from the page at rest', (name) => {
    const once = pose(name), fresh = poseView(name, spikePage()), again = frame(poseLive(name, fresh, layoutOf(REFERENCE.w, REFERENCE.h), 2), 2, fresh)
    expect(again.draws).toBe(once.draws)
    expect(JSON.stringify(again.calls)).toBe(JSON.stringify(once.calls))
    // On the frame, or in the kept set where what the pose shows stands still (the can and the blotter lying in their places).
    expect(JSON.stringify([once.calls, once.set])).not.toBe(JSON.stringify([once.rest, once.restSet]))
  })

  it('makes no sheet in a second frame of a pose', () => {
    for (const name of POSES) {
      const kept = sheets(), shown = poseView(name, view)
      drawPage(recorder().ctx, shown, layout, 2, 0, kept.make, poseLive(name, shown, layout, 2))
      const after = kept.made.length
      drawPage(recorder().ctx, shown, layout, 2.4, 0, kept.make, poseLive(name, shown, layout, 2.4))
      expect(kept.made.length).toBe(after)
    }
  })

  it.each([[1, []], [2, ['2']], [3, ['3']]] as const)('pencils the numeral beside the plants of a wish for %i, and nowhere else', (count, wants) => {
    const kept = sheets(), surface = recorder()
    drawPage(surface.ctx, { ...view, visitor: { ...view.visitor!, count } }, layout, 2, 0, kept.make)
    const texts = kept.made.flatMap((sheet) => sheet.calls.filter(([call]) => call === 'fillText' || call === 'strokeText'))
    expect(texts.map((call) => [call[0], call[1]])).toEqual(wants.map((numeral) => ['fillText', numeral]))
    expect(names(surface.calls)).not.toContain('fillText')
    // The numeral lies to the right of the last plant's leaves and above the ground line: beside the plants, never on one.
    if (texts.length) {
      const sheet = kept.made.find((one) => one.calls.includes(texts[0]))!, feet = sheet.calls.filter((call) => call[0] === 'translate' && Number(call[2]) < 0).map((call) => Number(call[1]))
      expect(Number(texts[0][2])).toBeGreaterThan(Math.max(...feet) + 30 * layout.k)
      expect(Number(texts[0][3])).toBeLessThan(0)
    }
  })

  it('carries a runner bud on every grown plant of the shelf and the tray, also one whose runner is out, and draws a bud that swings by itself', () => {
    const potted = view.plants.map((plant, at) => ({ plant, at })).filter(({ plant }) => plant.row !== 'border')
    const pods = (at: number) => view.plants.slice(0, at).filter((plant) => view.pods.includes(plant.id)).length
    const sheetOf = (calls: Call[], at: number) => images(calls)[first.plant + at + pods(at)][1] as { width: number; height: number }
    // The plant in the fourth pot of the shelf has a runner out to the fifth.
    expect(view.plants.some((plant) => plant.origin.kind === 'runner' && plant.origin.from === view.plants[3].id)).toBe(true)
    // The bud is part of the plant's own kept drawing: a wider and deeper sheet than the same plant's without one. A plant of the border has none.
    const withBuds = frame(null), without = frame(null, 2, { ...view, buds: false }, { ...view, buds: false })
    expect(without.draws).toBe(withBuds.draws)
    for (const { at } of potted) {
      expect(sheetOf(withBuds.calls, at).height).toBeGreaterThan(sheetOf(without.calls, at).height)
      expect(sheetOf(withBuds.calls, at).width).toBeGreaterThanOrEqual(sheetOf(without.calls, at).width)
    }
    view.plants.forEach((plant, at) => { if (plant.row === 'border') expect(sheetOf(withBuds.calls, at)).toEqual(sheetOf(without.calls, at)) })
    // Every pot is one drawing, by its soil alone: no pot's drawing holds a bud.
    expect(new Set(withBuds.set.slice(first.pot, first.pot + 12).map((call) => JSON.stringify(call[1]))).size).toBeLessThanOrEqual(2)
    expect(JSON.stringify(withBuds.set)).toBe(JSON.stringify(without.set))
    // A bud that swings is drawn by itself, and its plant from the drawing without one.
    const live = stillLive()
    live.buds.set(view.plants[0].id, { boing: 0.6, curl: 0 })
    const swung = frame(live)
    expect(sheetOf(swung.calls, 0).height).toBe(sheetOf(without.calls, 0).height)
    expect(swung.draws).toBe(frame(null).draws + 1)
    live.buds.set(view.plants[0].id, { boing: 0, curl: 1 })
    expect(JSON.stringify(frame(live).calls)).not.toBe(JSON.stringify(swung.calls))
  })

  it('gives a plant that has not grown yet no pod and no runner bud, and draws nothing of one that has not started', () => {
    const podded = view.plants.findIndex((plant) => view.pods.includes(plant.id)), id = view.plants[podded].id
    const live = stillLive()
    live.plants.set(id, { grow: 0.5, bend: 0, squash: 1, at: null, held: false })
    const half = frame(live), rest = images(half.rest)
    const plantSheet = rest[first.plant + podded][1] as { height: number }, podSheet = rest[first.plant + podded + 1][1]
    expect(images(half.calls).map((call) => call[1])).not.toContain(podSheet)
    // What has drawn itself so far is cut from a sheet of the plant without its bud, which is less deep than the one it stands as: nine numbers, not five.
    const cut = images(half.calls).filter((call) => call.length === 10 && (call[1] as { height: number }).height < plantSheet.height)
    expect(cut.length).toBeGreaterThan(0)
    live.plants.set(id, { grow: 0, bend: 0, squash: 1, at: null, held: false })
    expect(frame(live).draws).toBe(frame(null).draws - 2)
  })

  it('draws a pod that is not in the view when the motion says one is swelling there, and a pod of the view at its full size when it does not', () => {
    const bare = view.plants.find((plant) => plant.row === 'shelf' && !view.pods.includes(plant.id))!
    const live = stillLive()
    live.pods.push({ on: bare.id, swell: 0.4, shake: 0 })
    const swelling = frame(live)
    expect(swelling.draws).toBe(frame(null).draws + 1)
    expect(names(swelling.calls).filter((name) => name === 'scale').length).toBeGreaterThan(names(swelling.rest).filter((name) => name === 'scale').length)
  })

  it('lays what is in the hand last, over everything', () => {
    const held = view.plants.find((plant) => plant.row === 'tray' && plant.slot === 4)!, at = view.plants.indexOf(held)
    const pods = view.plants.slice(0, at).filter((plant) => view.pods.includes(plant.id)).length
    // In the hand a plant is its own drawing without its runner bud: the page is drawn with no buds, so the same sheet is the one it stood as.
    const plain = { ...poseView('hop', view), buds: false }
    const hop = frame(poseLive('hop', plain, layout, 2), 2, plain, { ...view, buds: false }), sheet = images(hop.rest)[first.plant + at + pods][1]
    const laid = images(hop.calls)
    expect(laid[laid.length - 1][1]).toBe(sheet)
  })

  it('draws up to 150 specks of dust as a handful of fills', () => {
    const live = stillLive()
    for (let i = 0; i < 150; i++) live.motes.push({ x: 300 + i, y: 200 + (i % 7), r: 0.8 + (i % 5) * 0.3, alpha: (1 + (i % 10)) / 10 })
    const dusty = frame(live), fills = (calls: Call[]) => names(calls).filter((name) => name === 'fill').length
    expect(dusty.draws).toBe(frame(null).draws + 1)
    expect(fills(dusty.calls) - fills(dusty.rest)).toBeLessThanOrEqual(10)
    expect(names(dusty.calls).filter((name) => name === 'save').length).toBe(names(dusty.rest).filter((name) => name === 'save').length)
  })
})
