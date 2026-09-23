import { describe, expect, it } from 'vitest'
import { PANEL, PIECES } from './layout'
import { defaultGarden, deserialize, serialize, STATE_VERSION } from './state'

describe('garden state', () => {
  it('falls back to the default garden for anything that is not a saved garden', () => {
    const fallback = defaultGarden(7)
    for (const raw of [null, undefined, 42, 'garden', [], { v: 99 }, { v: 0, pieces: [] }]) {
      expect(deserialize(raw, 7)).toEqual(fallback)
    }
  })

  it('round-trips a saved garden', () => {
    const garden = defaultGarden(8)
    garden.pieces[3] = { ...garden.pieces[3], x: 10.04, y: -5.06, angle: 0.7854, inTray: false }
    garden.beds[1] = { x: -30.3, y: 12.1 }
    const loaded = deserialize(JSON.parse(JSON.stringify(serialize(garden))), 8)
    expect(loaded.pieces[3]).toEqual({ id: garden.pieces[3].id, x: 10, y: -5.1, angle: 0.785, inTray: false })
    expect(loaded.beds[1]).toEqual({ x: -30.3, y: 12.1 })
  })

  it('repairs broken pieces: unknown ids dropped, duplicates ignored, missing ones restored, off-table ones clamped', () => {
    const loaded = deserialize(
      {
        v: STATE_VERSION,
        pieces: [
          { id: 'laser', x: 0, y: 0, angle: 0 },
          { id: 'prism', x: 999, y: -999, angle: 7 },
          { id: 'prism', x: 0, y: 0, angle: 0 },
          { id: 'mirror1', x: 'left', y: 3 },
          'nonsense',
        ],
        beds: [{ x: Infinity, y: 0 }, null, { x: -500, y: 500 }],
      },
      7,
    )
    expect(loaded.pieces.map((p) => p.id)).toEqual(PIECES.map((p) => p.id))
    const prism = loaded.pieces.find((p) => p.id === 'prism')!
    expect(prism.inTray).toBe(false)
    expect(prism.x).toBeLessThanOrEqual(PANEL.maxX)
    expect(prism.y).toBeGreaterThanOrEqual(PANEL.minY)
    expect(prism.angle).toBeGreaterThanOrEqual(-Math.PI)
    expect(prism.angle).toBeLessThanOrEqual(Math.PI)
    expect(loaded.pieces.find((p) => p.id === 'mirror1')!.inTray).toBe(true)
    const fallback = defaultGarden(7)
    expect(loaded.beds[0]).toEqual(fallback.beds[0])
    expect(loaded.beds[1]).toEqual(fallback.beds[1])
    expect(loaded.beds[2].x).toBeGreaterThanOrEqual(PANEL.minX)
    expect(loaded.beds[2].y).toBeLessThanOrEqual(PANEL.maxY)
    expect(loaded.beds).toHaveLength(4)
  })

  it('stays small', () => {
    expect(JSON.stringify(serialize(defaultGarden(7))).length).toBeLessThan(2048)
  })
})
