import { describe, expect, it } from 'vitest'
import { BASE, BASKET, BELL, BELL_R, BOARD, CELL, COLX, MOLE, MOLE_R, PLAQUE, ROWS, SNACK_HOME, SPOTS, THOUGHTS, WALL, cellAt, plaqueAt, targetAt, type Standing } from './layout'
import { STAGE } from './stage'
import { ANIMALS, SNACKS } from './things'

const all: Standing = { ground: ANIMALS, columns: [[], [], []], hidden: null, snacks: { carrot: null, cheese: null, bun: null }, tools: true }

describe('layout', () => {
  it('has a place for everybody on one base line, in equal squares with no gap', () => {
    expect(ROWS).toBe(ANIMALS.length)
    for (let col = 0; col < 3; col++) for (let row = 0; row < ROWS; row++) {
      const c = cellAt(col, row)
      expect(c.y + CELL / 2).toBe(BASE - row * CELL)
      expect(c.y - CELL / 2).toBeGreaterThanOrEqual(WALL.y)
    }
    expect(COLX[1] - COLX[0]).toBe(COLX[2] - COLX[1])
  })
  it('stands nobody in front of the graph', () => {
    for (const who of ANIMALS) {
      const s = SPOTS[who]
      expect(s.x + s.w / 2 <= WALL.x - 12 || s.x - s.w / 2 >= WALL.x + WALL.w || s.y - s.h > BASE).toBe(true)
      expect(s.x - s.w / 2).toBeGreaterThanOrEqual(0)
      expect(s.x + s.w / 2).toBeLessThanOrEqual(STAGE.width)
    }
  })
  it('gives every thing a finger of room at its middle', () => {
    for (const who of ANIMALS) expect(targetAt({ x: SPOTS[who].x, y: SPOTS[who].y - SPOTS[who].h * 0.45 }, all)).toEqual({ kind: 'animal', who })
    for (const snack of SNACKS) expect(targetAt(SNACK_HOME[snack], all)).toEqual({ kind: 'snack', snack })
    for (let slot = 0; slot < 3; slot++) expect(targetAt(plaqueAt(slot), all)).toEqual({ kind: 'plaque', slot })
    expect(targetAt(BELL, all).kind).toBe('bell')
    expect(targetAt(MOLE, all).kind).toBe('mole')
    expect(targetAt({ x: BASKET.x, y: BASKET.y - 30 }, all).kind).toBe('basket')
    for (const r of [BELL_R, MOLE_R, PLAQUE.r]) expect(r * 2).toBeGreaterThanOrEqual(100)
    for (const who of ANIMALS) expect(Math.min(SPOTS[who].w, SPOTS[who].h)).toBeGreaterThanOrEqual(100)
    expect(BELL.y + BELL_R).toBeLessThan(MOLE.y - MOLE_R)
    expect(MOLE.y + MOLE_R).toBeLessThanOrEqual(BOARD.y - BOARD.h / 2 + 20)
  })
  it('hangs a thought on no face, no picture and no graph', () => {
    for (const who of ANIMALS) {
      const t = THOUGHTS[who]
      for (const other of ANIMALS) if (other !== who) {
        const s = SPOTS[other]
        const face = { x: s.x, y: s.y - s.h * 0.72 }
        expect(Math.hypot(t.x - face.x, t.y - face.y), `${who} over ${other}`).toBeGreaterThan(32 + 24)
      }
      for (let slot = 0; slot < 3; slot++) expect(Math.abs(t.x - plaqueAt(slot).x) > 54 + 34 || Math.abs(t.y - PLAQUE.y) > 54 + 34).toBe(true)
      expect(t.x + 32 < WALL.x || t.x - 32 > WALL.x + WALL.w || t.y - 32 > BASE).toBe(true)
    }
  })
})
