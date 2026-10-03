import type { LabState } from './lab'
import { burst, dab, move, plantAt, plantById, runner, setSoil, sow, swapPots, type PageEvent, type PotRow } from './page'
import type { PacketId } from './plant'
import { offer, type VisitEvent } from './visit'

// The object-by-action grid of the design sheet, as a table and one step.
//
// Six objects by five actions. Every cell has an answer of its own, with its
// own motion (`shows`) and its own sound (the cell's key names its voice in
// voices.ts), and no cell refuses. `does` is what the cell changes on the
// page: most wrong uses change nothing there and are answered all the same.

export const OBJECTS = ['plant', 'pod', 'seed', 'bud', 'soil', 'beetle'] as const
export type ObjectId = (typeof OBJECTS)[number]
export const ACTIONS = ['poke', 'dust', 'wet', 'carry', 'offer'] as const
export type ActionId = (typeof ACTIONS)[number]
export type CellKey = `${ObjectId}-${ActionId}`

/** What a cell changes on the page. `nothing` is still an answer: the view and the voice play. */
export type Effect = 'nothing' | 'cross' | 'burst' | 'sow' | 'copy' | 'move' | 'swap' | 'soil' | 'offer'

export type Cell = {
  /** The right use of the object. Every other cell is a wrong use that works and is at least as funny. */
  right: boolean
  does: Effect
  /** What the view plays: one id a cell, none shared. */
  shows: string
}

const cell = (does: Effect, shows: string, right = false): Cell => ({ right, does, shows })

export const GRID: Record<ObjectId, Record<ActionId, Cell>> = {
  plant: {
    poke: cell('nothing', 'springs-and-plucks'),
    dust: cell('cross', 'pod-sets', true),
    wet: cell('nothing', 'shakes-dry-like-a-dog'),
    carry: cell('move', 'moves-and-shoulders', true),
    offer: cell('offer', 'visitor-answers-each-trait', true),
  },
  pod: {
    poke: cell('burst', 'bursts-six-fly', true),
    dust: cell('nothing', 'blows-dust-back-in-a-raspberry'),
    wet: cell('burst', 'swells-and-squirts-a-jet'),
    carry: cell('burst', 'clump-elbows-apart'),
    offer: cell('burst', 'visitor-rattles-it'),
  },
  seed: {
    poke: cell('sow', 'hops-and-sprouts'),
    dust: cell('nothing', 'spins-on-its-point-like-a-top'),
    wet: cell('sow', 'splits-and-walks-to-a-pot'),
    carry: cell('sow', 'grows-there', true),
    offer: cell('sow', 'visitor-balances-and-drops-it'),
  },
  bud: {
    poke: cell('nothing', 'boings-a-tone-higher'),
    dust: cell('nothing', 'curls-shut-and-whip-snaps'),
    wet: cell('copy', 'runner-creeps-by-itself'),
    carry: cell('copy', 'roots-a-copy', true),
    offer: cell('nothing', 'visitor-tugs-plant-hops-along'),
  },
  soil: {
    poke: cell('nothing', 'worm-looks-out'),
    dust: cell('nothing', 'worm-in-a-gold-cap'),
    wet: cell('soil', 'darkens-or-pales', true),
    carry: cell('swap', 'pots-trade-places'),
    offer: cell('nothing', 'visitor-peers-worm-waves'),
  },
  beetle: {
    poke: cell('nothing', 'flips-and-pedals'),
    dust: cell('nothing', 'turns-gold-and-sneezes'),
    wet: cell('nothing', 'wing-cases-as-umbrella'),
    carry: cell('nothing', 'digs-in-like-a-seed'),
    offer: cell('nothing', 'bows-and-straightens-the-sketch'),
  },
}

export function cellOf(object: ObjectId, action: ActionId): Cell {
  return GRID[object][action]
}

export function keyOf(object: ObjectId, action: ActionId): CellKey {
  return `${object}-${action}`
}

export const CELL_KEYS: CellKey[] = OBJECTS.flatMap((object) => ACTIONS.map((action) => keyOf(object, action)))

// --- One touch, one step --------------------------------------------------------

/** What a touch needs to name, by effect. A pot is a row and a slot; a plant is its id. */
export type Touch = {
  object: ObjectId
  action: ActionId
  /** The plant touched: the plant itself, the plant a pod or a bud is on, or the plant standing in a pot of soil. */
  plant?: number
  /** For dust: the plant the dust came from. */
  dustFrom?: number
  /** For a seed: its packet. */
  packet?: PacketId
  /** The pot acted on or carried to. */
  pot?: { row: PotRow; slot: number }
  /** For soil carried: the pot it was carried from. */
  fromPot?: { row: PotRow; slot: number }
  /** For soil wetted: the blotter was used instead of the can. */
  blot?: boolean
}

export type Answer = { state: LabState; cell: Cell; key: CellKey; events: (PageEvent | VisitEvent)[] }

/** The first free pot, the tray before the shelf, or the first pot of the tray when none is free: what is set down there shoulders its plant out. */
export function somePot(state: LabState): { row: PotRow; slot: number } {
  for (const row of ['tray', 'shelf'] as const) for (let slot = 0; slot < 6; slot++) if (!plantAt(state, row, slot)) return { row, slot }
  return { row: 'tray', slot: 0 }
}

/**
 * Answers one touch: looks the cell up and takes the page's step for what it
 * does. A touch that names too little to act on (a plant that has left, a
 * tool that has not arrived) changes nothing and is still answered with its
 * cell, so the view always has something to play.
 */
export function act(state: LabState, touch: Touch): Answer {
  const cellHere = cellOf(touch.object, touch.action)
  const key = keyOf(touch.object, touch.action)
  const done = (step: { state: LabState; events: (PageEvent | VisitEvent)[] }): Answer => ({ state: step.state, cell: cellHere, key, events: step.events })
  const nothing = done({ state, events: [] })
  const plant = touch.plant === undefined ? undefined : plantById(state, touch.plant)
  const pot = touch.pot ?? somePot(state)
  switch (cellHere.does) {
    case 'cross': return plant && touch.dustFrom !== undefined ? done(dab(state, touch.dustFrom, plant.id)) : nothing
    case 'burst': return plant ? done(burst(state, plant.id)) : nothing
    case 'sow': return touch.packet ? done(sow(state, touch.packet, pot.row, pot.slot)) : nothing
    case 'copy': return plant ? done(runner(state, plant.id, pot.row, pot.slot)) : nothing
    case 'move': return plant && touch.pot ? done(move(state, plant.id, touch.pot.row, touch.pot.slot)) : nothing
    case 'swap': return touch.pot && touch.fromPot ? done(swapPots(state, touch.fromPot, touch.pot)) : nothing
    case 'soil': return touch.pot ? done(setSoil(state, touch.pot.row, touch.pot.slot, touch.blot === true)) : nothing
    case 'offer': return plant ? done(offer(state, plant.id)) : nothing
    default: return nothing
  }
}
