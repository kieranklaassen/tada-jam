import { describe, expect, it } from 'vitest'
import { clampToPanel, CREATURES, defaultLayout, onPanel, overTray, PANEL, PIECES, slotPoint, TURN_STEP } from './layout'
import { BeamBuffer, OpticsScene, trace } from './optics'
import { buildScene, makeSources } from './scene'

function creatureLightFor(childAge: number | null, lampTurns: number): number[] {
  const { pieces, beds } = defaultLayout(childAge)
  const optic = pieces.map((piece) => ({ ...piece, angle: piece.id === 'lampA' ? piece.angle + lampTurns * TURN_STEP : piece.angle, active: !piece.inTray }))
  const creatures = beds.map((bed, index) => ({ ...bed, r: CREATURES[index].radius, absorbs: true }))
  const scene = new OpticsScene()
  const sources = makeSources(2)
  const out = new BeamBuffer()
  trace(scene, sources, out, buildScene(optic, creatures, scene, sources))
  return Array.from(out.creatureLight.slice(0, 4))
}

describe('layout', () => {
  it('starts with one lamp on the panel and every other piece in its own tray slot', () => {
    const { pieces } = defaultLayout(7)
    expect(pieces.filter((piece) => !piece.inTray).map((piece) => piece.id)).toEqual(['lampA'])
    const slots = new Set(PIECES.map((piece) => piece.slot))
    expect(slots.size).toBe(PIECES.length)
    for (const piece of pieces.filter((p) => p.inTray)) expect(overTray(piece)).toBe(true)
  })

  it('at seven the first beam touches nobody, and one tap of the lamp wakes the moth', () => {
    expect(creatureLightFor(7, 0)).toEqual([0, 0, 0, 0])
    const [moth, fish, snail, jelly] = creatureLightFor(7, 1)
    expect(moth).toBe(CREATURES[0].wants)
    expect([fish, snail, jelly]).toEqual([0, 0, 0])
  })

  it('an unknown age gets the gentle start too', () => {
    expect(creatureLightFor(null, 1)[0]).toBe(CREATURES[0].wants)
  })

  it('from nine the moth needs more than one tap', () => {
    expect(creatureLightFor(9, 0)).toEqual([0, 0, 0, 0])
    expect(creatureLightFor(9, 1)[0]).toBe(0)
  })

  it('every creature starts on the panel, clear of the others', () => {
    for (const age of [7, 10]) {
      const { beds } = defaultLayout(age)
      beds.forEach((bed, i) => {
        expect(onPanel(bed, CREATURES[i].radius)).toBe(true)
        beds.forEach((other, j) => {
          if (i !== j) expect(Math.hypot(bed.x - other.x, bed.y - other.y)).toBeGreaterThan(15)
        })
      })
    }
  })

  it('clamps points onto the panel and knows the tray from the panel', () => {
    expect(clampToPanel({ x: 500, y: -500 }, 5)).toEqual({ x: PANEL.maxX - 5, y: PANEL.minY + 5 })
    expect(overTray(slotPoint(3))).toBe(true)
    expect(overTray({ x: 0, y: 0 })).toBe(false)
  })
})
