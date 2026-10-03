import { layOut } from './card'
import { CARD, CUSTOMER, PIZZA } from './layout'
import { restPose } from './pose'
import { makeTable } from './table'
import type { Show } from './view'

// The look spike: the game's real scene in the felt-tip look, laid out from a
// fixed seed, so a still of it is the same on every machine. The game takes
// its place in the Mount; `?spike=1` still shows it, as the scene a still of
// the look is taken from.

export function spikeShow(): Show {
  const table = makeTable(['cheese', 'pepper'], 20261003)
  table.pieces.push(
    { id: 1, kind: 'cheese', x: -0.3, y: -0.22, turn: 0.4, settle: { x: 0, v: 0 } },
    { id: 2, kind: 'cheese', x: 0.34, y: 0.26, turn: -0.9, settle: { x: 0, v: 0 } },
  )
  table.nextId = 3
  const grum = restPose()
  grum.lookX = 0.5
  grum.lookY = 0.7
  grum.mouth = 0.34
  grum.tongue = 0.25
  grum.handR = { x: CARD.x + 6 - CUSTOMER.x, y: CARD.y + CARD.h * 0.62 - CUSTOMER.y }
  const bim = restPose()
  bim.lookX = 0.6
  bim.part = 0.5
  const fizz = restPose()
  fizz.lookX = 0.5
  fizz.lookY = 0.3
  fizz.mouth = 0.2
  return {
    table,
    baked: false,
    pizza: { x: PIZZA.x, y: PIZZA.y, size: 1, hidden: false, bites: 0, puffed: 0 },
    customer: { who: 'grum', pose: grum, x: CUSTOMER.x, y: CUSTOMER.y, size: 1 },
    leaving: null,
    card: { pictured: layOut([{ kind: 'cheese', count: 3 }], 'rows'), count: 99, open: 1, patted: -1, pat: 0, shake: 0 },
    waiting: [
      { who: 'bim', big: false, pose: bim, up: 1 },
      { who: 'fizz', big: true, pose: fizz, up: 1 },
    ],
    tubsIn: 1,
    glow: 0,
    glows: [],
    time: 0,
    ghost: null,
    ovenShake: 0,
    ovenGlow: 0,
    effect: null,
    lick: 0,
    sizzling: -1,
    sizzle: 0,
    soot: 0,
    wearing: false,
    baking: 0,
    crumbs: false,
  }
}
