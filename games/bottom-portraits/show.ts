import { CAST, type Id } from './cast'
import { glowAt, handAt } from './guide'
import type { Guidance } from './guidance'
import { onPlane } from './layout'
import type { Play } from './play'
import type { RoundHand } from './round'
import type { Shown } from './view/stage'

const HAND_Z = 2

/** What the stage is handed for one frame. */
export function shownOf(play: Play, guidance: Guidance | null, round: RoundHand | null = null): Shown {
  const { game } = play, glow: Shown['glow'][number][] = []
  if (play.over) {
    const p = game.where(play.aim.placeUnder(game, play.over.x, play.over.y))
    glow.push({ x: p.x, y: p.y + 0.05, z: p.z, r: 1.6, k: 0.95, flat: true })
  } else if (guidance && guidance.glow > 0.01) glow.push({ ...glowAt(game, play.demo ?? undefined), k: guidance.glow * (0.75 + 0.25 * Math.sin(game.time * 3)) })
  const { aim } = play
  // The opening round's hand, on the screen's own pixels, hangs in one plane before the table.
  const opening = round && { ...onPlane(aim.seeing, round.x, round.y, aim.width, aim.height, HAND_Z), z: HAND_Z, press: round.press, opacity: round.opacity }
  const hand = opening ? opening : guidance?.demo != null && play.demo ? handAt(game, play.demo, guidance.demo) : null
  const keys = Object.fromEntries(CAST.map((id) => [id, game.poses[id].yaw * 3])) as Record<Id, number>
  return {
    poses: game.poses, keys, maestro: game.maestro, tableYaw: game.tableYaw,
    tableKey: { up: game.keyUp, spin: game.keySpin, squash: game.keySquash },
    easel: game.easel, wall: game.nails, flecks: game.paintDots, glow, hand,
  }
}
