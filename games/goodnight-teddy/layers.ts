import type { Game } from './game'
import { THING_IDS, WASH_IDS, type ThingId } from './room'

// The order the frame is painted in, back to front, for the room as it stands. It is pure, so the tests that hold
// "nothing is drawn through anything" can ask it about every state a child can reach, and the view paints exactly
// this list and nothing else over the backdrop.

export type LayerId =
  // Outside, behind the glass and the doorway.
  | 'sky' | 'outside' | 'doorway' | 'through' | 'leaf'
  // The wall: the curtain, the light, a shadow, the night-light, the lamp and what it wears.
  | 'curtain' | 'light' | 'shadow' | 'nightLight' | 'lamp' | 'lampCloth'
  // The bath, back to front.
  | 'drip' | 'ripple' | 'raft' | 'dome' | 'duck' | 'duckCloth' | 'suds' | 'lip' | 'corner'
  // The things at their own places.
  | `rest:${ThingId}`
  // The bed and the rug.
  | 'catBehind' | 'teddy' | 'cat'
  // What flies, and what is in the hand: over everyone.
  | 'bits' | 'stream' | `air:${ThingId}`

export function layersOf(game: Game): LayerId[] {
  const out: LayerId[] = [], teddy = game.teddy, env = game.env
  const worn = game.worn.bind(game)
  out.push('sky')
  if (teddy.outside > 0) out.push('outside')
  if (env.doorAt > 0.02 || teddy.through > 0) {
    out.push('doorway')
    if (teddy.through > 0) out.push('through')
    out.push('leaf')
  }
  out.push('curtain', 'light')
  if (game.teddy.act?.id === 'shadow') out.push('shadow')
  if (env.night > 0.02) out.push('nightLight')
  out.push('lamp')
  if (worn('pyjamas', 'lamp') || worn('blanket', 'lamp')) out.push('lampCloth')

  out.push('drip', 'ripple')
  const dome = game.duck.act?.id === 'dome'
  if (worn('pyjamas', 'tub')) out.push('raft')
  if (dome) out.push('dome')
  out.push('duck')
  if (worn('pyjamas', 'duck') || worn('blanket', 'duck')) out.push('duckCloth')
  if (game.tub.sudsAt > 0.03) out.push('suds')
  out.push('lip')
  if (worn('blanket', 'tub') && !dome) out.push('corner')

  for (const id of ['pyjamas', 'blanket'] as const) if (game.things[id].mode === 'home' && (game.things[id].place === 'peg' || game.things[id].place === 'bed')) out.push(`rest:${id}`)
  for (const id of WASH_IDS) if (game.things[id].mode === 'home') out.push(`rest:${id}`)

  // The cat behind the bed is behind whoever lies on it; the cat on the bed sits in front.
  const behind = game.cat.sunk > 0
  if (behind) out.push('catBehind')
  if (teddy.outside === 0 && teddy.through === 0) out.push('teddy')
  if (!behind) out.push('cat')

  out.push('bits')
  if (game.stream) out.push('stream')
  for (const id of THING_IDS) if (game.things[id].mode !== 'home') out.push(`air:${id}`)
  return out
}
