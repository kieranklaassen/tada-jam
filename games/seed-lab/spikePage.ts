// What a page shows, as plain data, and the one fixed page the look was
// spiked on. No DOM and no drawing.
//
// `PageView` is what journal.ts draws. The game fills it from its saved state;
// the spike fills it here from the model itself, with a fixed seed, so the
// brood on the page is one the game's own rule gives.

import { seedsOfPod } from './breed'
import { PACKETS, lookFromCode, pack, type Look, type PacketId, type Pairs } from './plant'

export type Row = 'shelf' | 'tray' | 'border'

/** Where a plant came from: a packet, a seed of two plants (the one the pod sat on, the one the dust came from), or a runner of one. */
export type Origin =
  | { kind: 'packet'; packet: PacketId }
  | { kind: 'seed'; onto: number; dust: number }
  | { kind: 'runner'; from: number }

export type PlantView = {
  id: number
  pairs: Pairs
  /** It came up in dry soil, and stands half as high. */
  dry: boolean
  row: Row
  /** 0 to 5 on the shelf and in the tray, 0 to 17 in the border. */
  slot: number
  origin: Origin
}

export type VisitorKind = 'snail' | 'bee' | 'moth' | 'ladybird' | 'ant'

export type VisitorView = {
  kind: VisitorKind
  /** The traits its sketch asks for; a trait left out is not asked. */
  wish: Partial<Look>
  /** How many plants alike it asks for: one to three. */
  count: number
}

export type PageView = {
  seed: number
  plants: PlantView[]
  /** Twelve flags, the shelf's six pots and then the tray's: the soil is dry now. */
  dry: boolean[]
  packets: PacketId[]
  /** The runner bud has arrived: every shelf and tray plant carries one. */
  buds: boolean
  /** Pods set and not yet burst, each by the id of the plant it sits on. */
  pods: number[]
  visitor: VisitorView | null
  waiting: VisitorView | null
  /** Visitors that left with a plant, newest first, for the top margin. */
  kept: { kind: VisitorKind; look: Look }[]
  /** Where the beetle is: in its corner, or beside a pot (0 to 11, as `dry`). */
  beetle: { at: 'corner' } | { at: 'pot'; pot: number }
  /** The empty pot the worm looks out of (0 to 11), or none. */
  worm: number | null
}

export const SPIKE_SEED = 20261003
/** The pod of the page's stream that the tray's brood is. */
export const SPIKE_POD = 4

/** A pink, tall, round-leaved plant that carries short and jagged unseen, as a young of the short packet and the jagged packet can. */
const CARRIER = pack({ colour: [1, 0], height: [1, 0], leaf: [1, 0], petals: [1, 1] })
/** A white, short, spotted plant that carries jagged unseen. Its young by a plain plant are all plain. */
const WHITE_SHORT = pack({ colour: [0, 0], height: [0, 0], leaf: [1, 0], petals: [0, 0] })
/** Red, tall, jagged and spotted: it breeds true for all four. */
const RED_JAGGED = pack({ colour: [1, 1], height: [1, 1], leaf: [0, 0], petals: [0, 0] })

/** The slot of the tray whose soil was dry when the brood came up. */
const DRY_TRAY_SLOT = 3

const BORDER: readonly [slot: number, look: number][] = [[1, 5], [3, 30], [4, 6], [7, 17], [8, 1], [11, 26], [14, 22]]

/** Pairs that show a given look and hide nothing, for the border's plants, whose families have left the page. */
function pairsOfLook(code: number): Pairs {
  const look = lookFromCode(code)
  const colour = look.colour === 'red' ? [1, 1] as const : look.colour === 'pink' ? [1, 0] as const : [0, 0] as const
  const flag = (on: boolean) => (on ? [1, 1] as const : [0, 0] as const)
  return pack({ colour, height: flag(look.joints === 4), leaf: flag(look.leaf === 'round'), petals: flag(look.petals === 'plain') })
}

/** The fixed page of the look spike. */
export function spikePage(): PageView {
  const plants: PlantView[] = [
    { id: 1, pairs: PACKETS.pink, dry: false, row: 'shelf', slot: 0, origin: { kind: 'packet', packet: 'pink' } },
    { id: 2, pairs: CARRIER, dry: false, row: 'shelf', slot: 1, origin: { kind: 'seed', onto: 90, dust: 91 } },
    { id: 3, pairs: WHITE_SHORT, dry: false, row: 'shelf', slot: 2, origin: { kind: 'seed', onto: 92, dust: 93 } },
    { id: 4, pairs: RED_JAGGED, dry: false, row: 'shelf', slot: 3, origin: { kind: 'seed', onto: 94, dust: 95 } },
    { id: 5, pairs: RED_JAGGED, dry: false, row: 'shelf', slot: 4, origin: { kind: 'runner', from: 4 } },
  ]
  seedsOfPod(SPIKE_SEED, SPIKE_POD, CARRIER, WHITE_SHORT).forEach((pairs, slot) => {
    plants.push({ id: 10 + slot, pairs, dry: slot === DRY_TRAY_SLOT, row: 'tray', slot, origin: { kind: 'seed', onto: 2, dust: 3 } })
  })
  BORDER.forEach(([slot, look], at) => {
    plants.push({ id: 30 + at, pairs: pairsOfLook(look), dry: look % 9 < 3, row: 'border', slot, origin: { kind: 'seed', onto: 96, dust: 97 } })
  })
  const dry = new Array<boolean>(12).fill(false)
  dry[6 + DRY_TRAY_SLOT] = true
  return {
    seed: SPIKE_SEED,
    plants,
    dry,
    packets: ['pink', 'short', 'jagged'],
    buds: true,
    pods: [1],
    visitor: { kind: 'snail', wish: { colour: 'red', joints: 2 }, count: 1 },
    waiting: { kind: 'bee', wish: { colour: 'white', joints: 4 }, count: 1 },
    kept: [
      { kind: 'moth', look: { colour: 'white', joints: 4, leaf: 'round', petals: 'plain' } },
      { kind: 'ladybird', look: { colour: 'red', joints: 2, leaf: 'round', petals: 'plain' } },
      { kind: 'ant', look: { colour: 'pink', joints: 4, leaf: 'round', petals: 'plain' } },
    ],
    beetle: { at: 'corner' },
    worm: 5,
  }
}
