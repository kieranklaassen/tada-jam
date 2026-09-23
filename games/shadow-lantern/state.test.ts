import { describe, expect, it } from 'vitest'
import { CREATURE_ORDER } from './creatures'
import { STAGE } from './projection'
import { SHAPE_KINDS } from './shapes'
import { defaultTheatre, deserialize, firstCreature, homeOf, nextCreature, normalizeAngle, serialize, SKY_SLOTS, STATE_VERSION, wakeCreature } from './state'

describe('state', () => {
  it('a first open puts every shape in its rack and a creature to sleep', () => {
    const state = defaultTheatre(6)
    expect(state.shapes.map((s) => s.kind)).toEqual([...SHAPE_KINDS])
    for (const shape of state.shapes) {
      expect(shape.x).toBeGreaterThanOrEqual(STAGE.xMin)
      expect(shape.x).toBeLessThanOrEqual(STAGE.xMax)
      expect(shape.z).toBeGreaterThanOrEqual(STAGE.zNear)
      expect(shape.z).toBeLessThanOrEqual(STAGE.zFar)
    }
    expect(state.sky).toEqual([])
    expect(state.sleeping).toBe('bird')
  })

  it('older children meet a trickier creature first; unknown age is treated as young', () => {
    expect(firstCreature(9)).not.toBe(firstCreature(6))
    expect(firstCreature(null)).toBe(firstCreature(6))
  })

  it('the creatures take turns and come round again', () => {
    let kind = CREATURE_ORDER[0]
    const seen = new Set([kind])
    for (let i = 0; i < CREATURE_ORDER.length - 1; i++) seen.add((kind = nextCreature(kind)))
    expect(seen.size).toBe(CREATURE_ORDER.length)
    expect(nextCreature(kind)).toBe(CREATURE_ORDER[0])
  })

  it('anything unreadable becomes a fresh theatre', () => {
    for (const raw of [null, undefined, 'hello', 42, [], { v: 99 }, { v: STATE_VERSION - 1, shapes: [] }]) {
      expect(deserialize(raw, 6)).toEqual(defaultTheatre(6))
    }
  })

  it('a damaged save is repaired shape by shape rather than refused', () => {
    const repaired = deserialize(
      {
        v: STATE_VERSION,
        shapes: [
          { kind: 'square', x: 5, z: 20, angle: -Math.PI / 2 },
          { kind: 'square', x: -5, z: 30, angle: 0 },
          { kind: 'strip', x: 999, z: -999, angle: 'up' },
          { kind: 'kite', x: 0, z: 20 },
          { kind: 'crescent', x: Number.NaN, z: 25, angle: 0.5 },
          null,
        ],
        sleeping: 'unicorn',
        sky: [{ kind: 'fish', slot: 3, paper: 1 }, { kind: 'bird', slot: 3, paper: 'blue' }, { kind: 'moth', slot: 1 }, 'x'],
      },
      6,
    )
    expect(repaired.shapes.map((s) => s.kind)).toEqual([...SHAPE_KINDS])
    const byKind = Object.fromEntries(repaired.shapes.map((s) => [s.kind, s]))
    // The first copy wins; angles are normalized.
    expect(byKind.square).toEqual({ kind: 'square', x: 5, z: 20, angle: (3 * Math.PI) / 2 })
    expect(byKind.strip).toEqual({ kind: 'strip', x: STAGE.xMax, z: STAGE.zNear, angle: 0 })
    expect(byKind.crescent.x).toBe(homeOf('crescent').x)
    expect(byKind.bigTri).toEqual({ kind: 'bigTri', ...homeOf('bigTri'), angle: 0 })
    expect(repaired.sleeping).toBe(firstCreature(6))
    // A clashing sky slot moves to a free one; unknown creatures are dropped; an unknown paper is the first.
    expect(repaired.sky).toEqual([
      { kind: 'fish', slot: 3, paper: 1 },
      { kind: 'bird', slot: 0, paper: 0 },
    ])
  })

  it('a save round-trips through JSON, rounded', () => {
    const state = defaultTheatre(6)
    state.shapes[2].x = 3.14159
    state.shapes[2].angle = -0.25
    wakeCreature(state)
    const saved = JSON.parse(JSON.stringify(serialize(state)))
    const back = deserialize(saved, 6)
    expect(back.shapes[2].x).toBe(3.14)
    expect(back.shapes[2].angle).toBeCloseTo(normalizeAngle(-0.25), 2)
    expect(back.sky).toEqual(state.sky)
    expect(back.sleeping).toBe(state.sleeping)
  })

  it('a woken creature takes a free home; the ninth sends the oldest behind the moon', () => {
    const state = defaultTheatre(6)
    const slots = new Set<number>()
    for (let i = 0; i < SKY_SLOTS; i++) {
      const { arrived, departed } = wakeCreature(state)
      expect(departed).toBeNull()
      slots.add(arrived.slot)
    }
    expect(slots.size).toBe(SKY_SLOTS)
    const oldest = state.sky[0]
    const { arrived, departed } = wakeCreature(state)
    expect(departed).toEqual(oldest)
    expect(arrived.slot).toBe(oldest.slot)
    expect(state.sky).toHaveLength(SKY_SLOTS)
  })

  it('two of a kind in the sky are never cut from the same paper', () => {
    const state = defaultTheatre(6)
    const papers = new Set<number>()
    for (let i = 0; i < 40; i++) {
      papers.add(wakeCreature(state).arrived.paper)
      for (const kind of CREATURE_ORDER) {
        const twins = state.sky.filter((creature) => creature.kind === kind)
        expect(new Set(twins.map((creature) => creature.paper)).size, `${kind} after ${i + 1} wakes`).toBe(twins.length)
      }
    }
    expect([...papers].sort()).toEqual([0, 1])
  })
})
