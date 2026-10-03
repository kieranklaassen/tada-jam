import { describe, expect, it } from 'vitest'
import { Look, layout } from './look'

// A recording stand-in for a 2D context: every method call is counted by name, every property can be set, and the
// few calls whose result the painter uses give back something of the right shape.
type Recorder = { calls: Map<string, number>; images: unknown[]; composites: string[] }

function fakeContext(recorder: Recorder): CanvasRenderingContext2D {
  const state: Record<string, unknown> = {}
  return new Proxy(state, {
    get(target, name) {
      if (typeof name !== 'string') return undefined
      if (name in target) return target[name]
      return (...args: unknown[]) => {
        recorder.calls.set(name, (recorder.calls.get(name) ?? 0) + 1)
        if (name === 'drawImage') { recorder.images.push(args[0]); recorder.composites.push(String(target.globalCompositeOperation ?? 'source-over')) }
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
  const surface: Recorder = { calls: new Map(), images: [], composites: [] }
  const layers: Recorder[] = []
  const canvases: { width: number; height: number }[] = []
  const makeCanvas = () => {
    const recorder: Recorder = { calls: new Map(), images: [], composites: [] }
    layers.push(recorder)
    const context = fakeContext(recorder)
    const canvas = { width: 0, height: 0, getContext: () => context }
    canvases.push(canvas)
    return canvas as unknown as HTMLCanvasElement
  }
  const everyCall = (name: string) => [surface, ...layers].reduce((sum, r) => sum + (r.calls.get(name) ?? 0), 0)
  return { look: new Look(makeCanvas), ctx: fakeContext(surface), surface, layers, canvases, everyCall }
}

describe('the look', () => {
  it('imports and constructs where there is no document', () => {
    expect(typeof document).toBe('undefined')
    expect(() => new Look()).not.toThrow()
  })

  it('paints the dusk scene at two sizes without a text call', () => {
    const { look, ctx, surface, everyCall } = rig()
    const first = look.paint(ctx, 1180, 820, 2)
    const second = look.paint(ctx, 1024, 768, 1.5)
    for (const drawn of [first, second]) {
      expect(drawn).toBeGreaterThan(20)
      // The frame budget: a handful of layers and under about 80 small figures.
      expect(drawn).toBeLessThan(80)
    }
    expect(surface.calls.get('fill') ?? 0).toBeGreaterThan(100)
    expect(surface.calls.get('stroke') ?? 0).toBeGreaterThan(100)
    expect(everyCall('fillText')).toBe(0)
    expect(everyCall('strokeText')).toBe(0)
    expect(everyCall('measureText')).toBe(0)
    // Every save is matched by a restore, so nothing leaks into the next frame.
    expect(surface.calls.get('save')).toBe(surface.calls.get('restore'))
  })

  it('repaints the cached map only when the size or the pixel ratio changes', () => {
    const { look, ctx, surface, canvases } = rig()
    look.paint(ctx, 1180, 820, 2)
    expect(look.mapPaints).toBe(1)
    expect(canvases[0]).toMatchObject({ width: 2360, height: 1640 })
    look.paint(ctx, 1180, 820, 2)
    look.paint(ctx, 1180, 820, 2)
    expect(look.mapPaints).toBe(1)
    look.paint(ctx, 1024, 768, 2)
    expect(look.mapPaints).toBe(2)
    look.paint(ctx, 1024, 768, 1)
    expect(look.mapPaints).toBe(3)
    expect(canvases[0]).toMatchObject({ width: 1024, height: 768 })
    // One layer per frame at dusk: the map, drawn once each time.
    expect(surface.images.length).toBe(5)
    expect(new Set(surface.images).size).toBe(1)
  })

  it('lays the night film over the map by multiplying, and keeps it cached', () => {
    const { look, ctx, surface, everyCall } = rig()
    const dusk = look.paint(ctx, 1180, 820, 2)
    const night = look.paint(ctx, 1180, 820, 2, { night: true })
    look.paint(ctx, 1180, 820, 2, { night: true })
    expect(look.mapPaints).toBe(1)
    expect(night).not.toBe(dusk)
    expect(night).toBeLessThan(80)
    // Dusk draws the map; each night frame draws the map and then the film.
    expect(surface.composites).toEqual(['source-over', 'source-over', 'multiply', 'source-over', 'multiply'])
    expect(surface.images[2]).toBe(surface.images[4])
    expect(surface.images[2]).not.toBe(surface.images[0])
    expect(everyCall('fillText')).toBe(0)
    expect(everyCall('strokeText')).toBe(0)
  })

  it('draws nothing on a surface that has no size yet', () => {
    const { look, ctx, surface } = rig()
    expect(look.paint(ctx, 0, 0, 2)).toBe(0)
    expect(look.paint(ctx, 1180, 820, 0)).toBe(0)
    expect(look.mapPaints).toBe(0)
    expect(surface.calls.size).toBe(0)
  })

  it('lays the scene out in proportion, with every hit target at least about 48 pixels', () => {
    for (const [w, h] of [[1180, 820], [1024, 768], [2360, 1640]]) {
      const place = layout(w, h), scale = place.u
      // The kit is drawn in design pixels times `u`; at the design size these are the sizes on screen.
      const targets = { pile: 62, pileHigh: 50, dial: 102, lantern: 54, cursor: 48, lane: (place.lanes[1] - place.lanes[0]) / scale, fold: (w - place.flap.top) / scale }
      for (const size of Object.values(targets)) expect(size).toBeGreaterThanOrEqual(48)
      // Rods, ruler and flap stay on the sheet and in order, left to right and top to bottom.
      expect(place.card).toBeLessThan(place.pile)
      expect(place.pile).toBeLessThan(place.rodX)
      expect(place.rodX + place.rodLen).toBeLessThan(place.flap.top)
      expect(place.rodX + place.ruler.hour * place.ruler.hours).toBeLessThan(place.rodX + place.rodLen)
      expect(place.lanes[2]).toBeLessThan(place.ruler.y)
      expect(place.ruler.y).toBeLessThan(h)
      expect(place.fire.y + place.fireReach).toBeLessThan(place.lanes[0])
    }
  })
})
