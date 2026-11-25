import { size } from './cells'
import type { Game, Target } from './game'
import { leftOf } from './houses'
import { BEARS, SILL, drawnAt } from './space'

// What a finger landed on, from where it is as drawn. Nearest the child first:
// the load, the cart, the bears, what is inside an open house, the openings,
// then the wall, the cloth and the kitchen. Each is a generous box.

const COS = Math.cos(0.2)

export function pick(game: Game, u: number, v: number, least = 0): Target {
  const inside = (x: number, y: number, w: number, h: number, pad: number): boolean => Math.abs(u - x) <= Math.max(least, w + pad) && Math.abs(v - y) <= Math.max(least, h + pad)
  const i = game.hands
  if (i >= 0 && game.act?.kind !== 'in') {
    const pose = game.loadPose(i)!, e = size(game.cells()), at = drawnAt(pose.x, pose.y, pose.z + 0.43)
    if (inside(at.u, at.v, e.w / 2, e.h / 2, 0.14)) return { type: 'load' }
  }
  const cart = drawnAt(game.cart.x, 1.6, 4.9)
  if (inside(cart.u, cart.v, 1.5, 1.75, 0.1)) return { type: 'cart' }
  let best: Target | null = null, near = Infinity
  for (const who of [0, 1] as const) {
    const b = game.bearPose(who), at = drawnAt(b.x, BEARS[who].height / 2, b.z + 0.6), d = Math.abs(u - at.u)
    if (inside(at.u, at.v, BEARS[who].radius, (BEARS[who].height * Math.max(0.5, b.squash)) / 2, 0.16) && d < near) { near = d; best = { type: 'bear', who } }
  }
  if (best) return best
  if (game.front > 0.5) {
    const cub = game.cubPose(), at = drawnAt(cub.x, cub.y + 0.5, cub.z)
    if (inside(at.u, at.v, 0.5, 0.55, 0.15)) return { type: 'cub' }
    for (const [n, load] of game.saved.loads.entries()) {
      if (load.at !== 'in') continue
      const pose = game.loadPose(n)
      if (!pose) continue
      const e = size(game.cells(load)), p = drawnAt(pose.x, pose.y, pose.z)
      if (inside(p.u, p.v, e.w / 2, e.h / 2, 0.15)) return { type: 'inside', i: n }
    }
    return v > SILL * COS ? { type: 'kitchen', u, v } : ground(u, v)
  }
  let opening = -1, off = Infinity
  game.saved.openings.forEach((o, n) => {
    const e = size(o.cells), x = leftOf(o) + (e.w - 1) / 2 + game.house, d = Math.abs(u - x)
    if (inside(x, (SILL + e.h / 2) * COS, e.w / 2, e.h / 2, 0.35) && d < off) { off = d; opening = n }
  })
  if (opening >= 0) return { type: 'opening', i: opening }
  return ground(u, v)
}

function ground(u: number, v: number): Target {
  if (v < 0) return { type: 'cloth', u, v }
  return Math.abs(u) <= 6.5 && v < 9 * COS ? { type: 'wall', u, v } : { type: 'kitchen', u, v }
}
