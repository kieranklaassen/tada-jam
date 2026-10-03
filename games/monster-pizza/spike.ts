import { layOut } from './card'
import { CARD, CUSTOMER } from './layout'
import { restPose } from './monsterArt'
import { makeTable } from './table'
import type { Show } from './view'

// The look spike: the game's real scene in the felt-tip look, laid out from a
// fixed seed, so a still of it is the same on every machine. The toy replaces
// it in the Mount; it stays as the scene a still is taken from.

export function spikeShow(): Show {
  const table = makeTable(['cheese', 'pepper'], 20261003)
  table.pieces.push(
    { id: 1, kind: 'cheese', x: -0.3, y: -0.22, turn: 0.4, settle: { x: 0, v: 0 } },
    { id: 2, kind: 'cheese', x: 0.34, y: 0.26, turn: -0.9, settle: { x: 0, v: 0 } },
  )
  table.nextId = 3
  const grum = restPose()
  grum.lookX = 0.7
  grum.lookY = 0.6
  grum.mouth = 0.34
  grum.tongue = 0.25
  grum.handR = { x: CARD.x - CUSTOMER.x + 6, y: CARD.y + CARD.h * 0.62 - CUSTOMER.y }
  const bim = restPose()
  bim.lookX = -0.6
  bim.part = 0.5
  const fizz = restPose()
  fizz.lookX = -0.5
  fizz.lookY = 0.3
  fizz.mouth = 0.2
  return {
    table,
    baked: false,
    customer: { who: 'grum', pose: grum },
    card: layOut([{ kind: 'cheese', count: 3 }], 'rows'),
    waiting: [
      { who: 'bim', big: false, pose: bim },
      { who: 'fizz', big: true, pose: fizz },
    ],
    glow: 0,
    time: 0,
    ghost: null,
  }
}
