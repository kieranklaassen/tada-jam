import { describe, expect, it } from 'vitest'
import { GRID, GRID_SIZE, THINGS, answer, landsOn, type Scene } from './grid'
import { KINDS, readMark, tidy, type Mark } from './marks'
import { DANDELION, PUDDLE, type Pt } from './yard'

const cells = THINGS.flatMap((thing) => KINDS.map((kind) => ({ thing, kind, ...GRID[thing][kind] })))
const line = (from: Pt, to: Pt, steps = 30): Pt[] => Array.from({ length: steps + 1 }, (_, i) => ({ x: from.x + ((to.x - from.x) * i) / steps, y: from.y + ((to.y - from.y) * i) / steps }))
const ringAt = (c: Pt, r: number): Pt[] => Array.from({ length: 61 }, (_, i) => ({ x: c.x + Math.cos((i / 60) * Math.PI * 1.97) * r, y: c.y + Math.sin((i / 60) * Math.PI * 1.97) * r }))
const zigzagAt = (c: Pt, across = 40): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < 4; i++) out.push(...line({ x: c.x - 90 + i * 45, y: c.y + (i % 2 ? -across : across) }, { x: c.x - 45 + i * 45, y: c.y + (i % 2 ? across : -across) }, 8))
  return out
}
const scribbleAt = (c: Pt): Pt[] => {
  const out: Pt[] = []
  for (let i = 0; i < 10; i++) out.push(...line({ x: c.x - 40 + i * 8, y: c.y + (i % 2 ? 35 : -35) }, { x: c.x - 32 + i * 8, y: c.y + (i % 2 ? -35 : 35) }, 6))
  return out
}
const old: Mark = { c: 0, p: tidy(line({ x: 200, y: 300 }, { x: 500, y: 300 })) }
const scene: Scene = { engine: { x: 150, y: 340 }, riders: [{ x: 1050, y: 170 }, { x: 750, y: 400 }], marks: [old] }
const lands = (raw: Pt[]) => {
  const p = tidy(raw)
  return landsOn(p, readMark(p), scene)
}
const bare: Pt = { x: 900, y: 300 }

describe('the grid of things by kinds of mark', () => {
  it('has a cell for every thing and every kind', () => {
    expect(cells.length).toBe(GRID_SIZE)
    expect(GRID_SIZE).toBe(30)
    for (const c of cells) {
      expect(c.sight.length).toBeGreaterThan(0)
      expect(c.sound.length).toBeGreaterThan(0)
    }
  })

  it('gives no two cells the same sight, and no two the same sound', () => {
    expect(new Set(cells.map((c) => c.sight)).size).toBe(GRID_SIZE)
    expect(new Set(cells.map((c) => c.sound)).size).toBe(GRID_SIZE)
  })

  it('answers every wrong use: chalk on the engine, a rider, the water or the weed always does something', () => {
    for (const thing of ['engine', 'rider', 'puddle', 'dandelion'] as const) for (const kind of KINDS) {
      const c = answer(thing, kind)
      // Either the chalk stays on the tar, or it went onto the thing: there is no cell that does nothing.
      expect(c.sight && c.sound).toBeTruthy()
    }
  })

  it('always brings the train for a mark on bare tar, so no mark there is a dead end', () => {
    for (const kind of KINDS) expect(answer('tar', kind).rides).toBe(true)
    expect(answer('line', 'tap').rides).toBe(true)
  })

  it('keeps every line as a rail, whatever it lands on', () => {
    for (const thing of THINGS) {
      expect(answer(thing, 'line').stays).toBe(true)
      expect(answer(thing, 'line').rides).toBe(true)
    }
  })
})

describe('what a mark lands on', () => {
  it('reads taps by what lies under them', () => {
    expect(lands([bare]).thing).toBe('tar')
    expect(lands([{ x: 160, y: 330 }]).thing).toBe('engine')
    expect(lands([{ x: 1040, y: 180 }])).toEqual({ thing: 'rider', rider: 0 })
    expect(lands([{ x: 760, y: 410 }])).toEqual({ thing: 'rider', rider: 1 })
    expect(lands([{ x: PUDDLE.x + 40, y: PUDDLE.y }]).thing).toBe('puddle')
    expect(lands([{ x: DANDELION.x, y: DANDELION.y - 30 }]).thing).toBe('dandelion')
    expect(lands([{ x: 350, y: 310 }]).thing).toBe('line')
  })

  it('reads a line by where it starts and what it runs to or through', () => {
    expect(lands(line({ x: 700, y: 250 }, { x: 950, y: 290 })).thing).toBe('tar')
    expect(lands(line({ x: 170, y: 350 }, { x: 400, y: 520 })).thing).toBe('engine')
    expect(lands(line({ x: 700, y: 250 }, { x: 1020, y: 190 }))).toEqual({ thing: 'rider', rider: 0 })
    expect(lands(line({ x: 380, y: 620 }, { x: 820, y: 590 })).thing).toBe('puddle')
    expect(lands(line({ x: 520, y: 60 }, { x: 700, y: 110 })).thing).toBe('dandelion')
    expect(lands(line({ x: 350, y: 200 }, { x: 360, y: 380 })).thing).toBe('line')
  })

  it('reads a loop by what it goes round', () => {
    expect(lands(ringAt(bare, 70)).thing).toBe('tar')
    expect(lands(ringAt(scene.engine, 110)).thing).toBe('engine')
    expect(lands(ringAt({ x: 1050, y: 170 }, 90))).toEqual({ thing: 'rider', rider: 0 })
    expect(lands(ringAt({ x: PUDDLE.x, y: PUDDLE.y }, 180)).thing).toBe('puddle')
    expect(lands(ringAt({ x: DANDELION.x, y: DANDELION.y - 20 }, 60)).thing).toBe('dandelion')
    expect(lands(ringAt({ x: 350, y: 300 }, 60)).thing).toBe('line')
  })

  it('reads a zigzag and a scribble by what lies under their middle', () => {
    expect(lands(zigzagAt(bare)).thing).toBe('tar')
    expect(lands(zigzagAt(scene.engine)).thing).toBe('engine')
    expect(lands(zigzagAt({ x: 750, y: 400 }))).toEqual({ thing: 'rider', rider: 1 })
    expect(lands(zigzagAt({ x: PUDDLE.x, y: PUDDLE.y })).thing).toBe('puddle')
    expect(lands(zigzagAt({ x: 350, y: 300 })).thing).toBe('line')
    expect(lands(scribbleAt(bare)).thing).toBe('tar')
    expect(lands(scribbleAt(scene.engine)).thing).toBe('engine')
    expect(lands(scribbleAt({ x: PUDDLE.x, y: PUDDLE.y })).thing).toBe('puddle')
    expect(lands(scribbleAt({ x: DANDELION.x, y: DANDELION.y - 28 })).thing).toBe('dandelion')
    expect(lands(scribbleAt({ x: 350, y: 300 })).thing).toBe('line')
  })

  it('gives every mark made of every shape somewhere to land', () => {
    for (const make of [(c: Pt) => [c], (c: Pt) => line(c, { x: c.x + 200, y: c.y + 30 }), zigzagAt, (c: Pt) => ringAt(c, 70), scribbleAt]) {
      for (let x = 60; x < 1200; x += 190) for (let y = 60; y < 800; y += 170) expect(THINGS).toContain(lands(make({ x, y })).thing)
    }
  })
})
