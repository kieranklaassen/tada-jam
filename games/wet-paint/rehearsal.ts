import type { Note } from './audio'
import { PAPER, POOL, POT, TOOL, toCells, type Rect, type ToolId } from './layout'
import { deserialize, serialize, toolsAt, type Save } from './save'
import { STEP, Toy, type Lift } from './toy'

// Helpers for the tests: a game in a given state, and a hand that plays it
// the way the Mount does, a step of the clock at a time. Nothing here is
// part of the game; no file of the game imports it.

export const SEED = 7

/** A save, as a first visit with no age would find it, with some fields set. */
export const saved = (over: Partial<Save> = {}): Save => ({ ...deserialize(undefined, null), ...over })

/** A save at a place of the designed order, with every tool on the table already shown. */
export const savedAt = (position: string, over: Partial<Save> = {}): Save => saved({ position, shown: toolsAt(position), ...over })

/** What ctx.storage hands back on the next visit. */
export const stored = (toy: Toy): Save => deserialize(JSON.parse(JSON.stringify(serialize(toy.toSave()))), null)

/** The game as the next visit opens it. */
export const reopened = (toy: Toy, seed = SEED): Toy => new Toy(stored(toy), seed)

export const middle = (rect: Rect): { x: number; y: number } => ({ x: rect.x + rect.w / 2, y: rect.y + rect.h / 2 })
export const MID = { x: POOL.x + POOL.w * 0.5, y: POOL.y + POOL.h * 0.6 }
export const PAPER_MID = middle(PAPER)

/** Everything that sounded since it was last asked, as one list of notes. */
export function heard(toy: Toy): Note[] {
  const sounds = toy.takeSounds()
  return [...sounds.plain, ...sounds.scene]
}

/** Plays `seconds` in whole steps. `each` is called after every step. */
export function play(toy: Toy, seconds: number, each?: (toy: Toy) => void): void {
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    toy.step(STEP)
    each?.(toy)
  }
}

export function tap(toy: Toy, x: number, y: number): void {
  toy.press(x, y)
  toy.release('tap')
}

export const dip = (toy: Toy, pot: number): void => tap(toy, POT.x, POT.ys[pot])
export const take = (toy: Toy, tool: ToolId): void => tap(toy, middle(TOOL[tool]).x, middle(TOOL[tool]).y)

/** A pull from one place to another, a step of the clock between each piece of it. With `lift` null the finger stays down. */
export function pull(toy: Toy, fromX: number, fromY: number, toX: number, toY: number, pieces = 24, lift: Lift | null = 'drop'): void {
  toy.press(fromX, fromY)
  for (let i = 1; i <= pieces; i++) {
    toy.move(fromX + ((toX - fromX) * i) / pieces, fromY + ((toY - fromY) * i) / pieces)
    toy.step(STEP)
  }
  if (lift) toy.release(lift)
}

export const cellAt = (toy: Toy, x: number, y: number): number => {
  const cell = toCells(x, y)
  return toy.tray.at(cell.x, cell.y)
}

/** A drop of each pot's colour, side by side, grown and at rest. */
export function coloured(toy: Toy): void {
  for (let pot = 0; pot < POT.ys.length; pot++) {
    dip(toy, pot)
    tap(toy, POOL.x + 160 + pot * 170, POOL.y + 300)
    play(toy, 0.8)
  }
  heard(toy)
  toy.takeChanged()
}

/** Takes a print and plays its scenes out. */
export function printed(toy: Toy): void {
  tap(toy, PAPER_MID.x, PAPER_MID.y)
  play(toy, 12)
  heard(toy)
  toy.takeChanged()
}
