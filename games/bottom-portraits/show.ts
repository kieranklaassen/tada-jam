import { CAST, type Id } from './cast'
import { glowAt, handAt } from './guide'
import type { Guidance } from './guidance'
import type { Play } from './play'
import type { Shown } from './view/stage'

/** What the stage is handed for one frame. */
export function shownOf(play: Play, guidance: Guidance | null): Shown {
  const { game } = play, glow: Shown['glow'][number][] = []
  if (play.over) {
    const p = game.where(play.aim.placeUnder(game, play.over.x, play.over.y))
    glow.push({ x: p.x, y: p.y + 0.05, z: p.z, r: 1.6, k: 0.95, flat: true })
  } else if (guidance && guidance.glow > 0.01) glow.push({ ...glowAt(game), k: guidance.glow * (0.75 + 0.25 * Math.sin(game.time * 3)) })
  const hand = guidance?.demo != null && play.demo ? handAt(game, play.demo, guidance.demo) : null
  const keys = Object.fromEntries(CAST.map((id) => [id, game.bodies[id].yaw * 3])) as Record<Id, number>
  return {
    poses: game.poses, keys, maestro: game.maestro, tableYaw: game.tableYaw,
    tableKey: { up: game.keyUp, spin: game.keySpin, squash: game.keySquash },
    easel: game.easel, wall: game.nails, flecks: game.paintDots, glow, hand,
  }
}
