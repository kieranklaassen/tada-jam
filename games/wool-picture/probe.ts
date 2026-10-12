import type { Ctx, Maker } from './felted'
import type { Point } from './input'
import { CELL, FELT, FOLK, LOOP, PEGS } from './layout'
import { makeRng } from './rng'
import { TICK, Toy } from './toy'
import { freePeg } from './wall'
import { lay, makeSheet, shapeFor } from './wool'

// What the tests share, and nothing the game runs: a stand-in for the drawing
// surface that counts what is put on it, and short ways to bring the toy to a
// state by the same touches a child would make.

export type Tally = { draws: number; calls: Record<string, number> }
export const tally = (): Tally => ({ draws: 0, calls: {} })

const COUNTED = new Set(['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect'])

/** A 2D context that takes any call, counts the ones that put something on its canvas, and keeps how often each call was made. */
export function standIn(into: Tally): Ctx {
  const gradient = { addColorStop: () => undefined }
  const target: Record<string, unknown> = {}
  return new Proxy(target, {
    get(held, name: string) {
      if (name in held) return held[name]
      if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => gradient
      return () => { into.calls[name] = (into.calls[name] ?? 0) + 1; if (COUNTED.has(name)) into.draws++ }
    },
    set(held, name: string, value) { held[name] = value; return true },
  }) as unknown as Ctx
}

/** What is drawn into a canvas of its own is baked, and counted apart from a frame. */
export const baked = tally()
export const make: Maker = (width, height) => ({ width, height, getContext: () => standIn(baked) }) as unknown as HTMLCanvasElement

/** The middle of a cell of the felt, in stage units. */
export const cell = (col: number, row: number): Point => ({ x: FELT.x + col * CELL + 5, y: FELT.y + row * CELL + 5 })

export const fresh = (hand = 0, size = 1, seed = 7): Toy => new Toy(makeSheet(), hand, size, makeRng(seed))

/** One tap on the felt with wool of a dye: the finger lands and lifts. */
export function dab(toy: Toy, dye: number, col: number, row: number): void {
  toy.hand = dye
  toy.press(cell(col, row))
  toy.end('tap')
}

/**
 * A block of wool of one dye, then one tap in its middle with the same wool, so that the toy reads the sheet
 * as it does after any touch: the block wakes as what it is, the weather follows, and a scene is caused.
 */
export function daub(toy: Toy, dye: number, col0: number, row0: number, col1: number, row1: number, thick = 3): void {
  const shape = shapeFor(toy.sheet, dye, col0, row0, 1.5, toy.joins)
  for (let row = row0; row <= row1; row++) for (let col = col0; col <= col1; col++) lay(toy.sheet, shape, col, row, 0, thick, toy.laid, toy.joins)
  dab(toy, dye, Math.floor((col0 + col1) / 2), Math.floor((row0 + row1) / 2))
}

/** Picks a figure up from where it is drawn and sets it down on a cell of the felt, as a drag does. */
export function setDown(toy: Toy, who: number, col: number, row: number): void {
  const figure = toy.folk[who]
  toy.press(figure.at ? { x: figure.x, y: figure.y - 20 } : { x: FOLK[who].x, y: FOLK[who].y - FOLK[who].h / 2 })
  toy.move(cell(col, row - 3))
  toy.advance(TICK * 30)
  toy.move(cell(col, row - 3))
  toy.advance(TICK)
  toy.end('dragEnd')
}

/** Hangs the picture as a child does: the loop is dragged to a peg (the free one a hand would take, unless one is named) and let go on it. */
export function hangUp(toy: Toy, peg = freePeg(toy.wall)): void {
  toy.press(LOOP)
  toy.move(PEGS[peg])
  toy.end('dragEnd')
}

/** Plays until no scene runs. */
export function settle(toy: Toy): void {
  for (let i = 0; i < 20 && toy.scene; i++) toy.advance(1)
}
