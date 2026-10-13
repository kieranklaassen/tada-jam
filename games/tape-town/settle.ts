import type { Crossing } from './crossings'
import { stripUnder } from './floor'
import { decide } from './going'
import { GRID, MOVERS, WANT as GRID_WANT, type ActName, type Mover } from './habits'
import { TAPE_WIDTH, TOY_IDS, type Kind } from './layout'
import { goesUnder } from './riding'
import type { Network } from './roads'
import { lengthOf, nearestOn } from './tape'
import type { Ride, Town } from './town'
import { clearOf } from './way'

// When the strips change (one is pressed flat, peeled, or lifts to make
// room), every toy is settled at once as a load would settle it. A rider
// keeps its strip by the strip itself and never by its place in a list; one
// whose tape is gone, from under it, from beside it or from over it, takes
// up whatever it now stands on in silence, and stands on nobody.

/** The tape an act belongs to for a toy: the cell of the grid it is the habit of. Null for an act that belongs to no one tape. */
function tapeOf(id: Mover, name: ActName): Kind | null {
  for (const kind of [0, 1, 2, 3] as const) { const cell = GRID[id][kind]; if ('act' in cell && cell.act === name) return kind }
  return null
}

export function resettle(town: Town, old: Record<Kind, Network> | undefined): void {
  if (!town.state.out) return
  const flat = town.flat
  const again = (crossing: Crossing | null): Crossing | null => (crossing && town.crossings.find((one) => one.low === crossing.low && one.high === crossing.high)) || null
  const on = (id: Mover, kind: Kind): boolean => flat.some((strip) => strip.kind === kind && stripUnder([strip], town.bodies[id].at) === 0)
  const at = (id: Mover, what: Crossing['kind'], within: number): boolean => town.crossings.some((one) => one.kind === what && Math.hypot(one.at.x - town.bodies[id].at.x, one.at.y - town.bodies[id].at.y) <= within)
  /** A rider is on the strip it was on, if that strip still lies under it; else on whatever strip of its tape does. */
  const reseat = (id: Mover, ride: Ride): boolean => {
    const body = town.bodies[id], strips = town.nets[ride.kind].strips, was = old?.[ride.kind].strips[ride.rider.s]
    const fits = (s: number): boolean => s >= 0 && nearestOn(strips[s], body.at).off <= TAPE_WIDTH * 0.6 && lengthOf(strips[s]) >= TAPE_WIDTH * 1.3
    let s = was ? strips.indexOf(was) : -1
    if (!fits(s)) s = strips.findIndex((_, k) => fits(k))
    if (s < 0) return false
    const same = strips[s] === was
    ride.rider = { s, d: nearestOn(strips[s], body.at).d, dir: ride.rider.dir, skip: -1 }
    ride.inside = same ? again(ride.inside) : null
    ride.done = same ? again(ride.done) : null
    ride.hooted = same ? again(ride.hooted) : null
    // Under a bridge or in a tunnel only while that crossing is still there.
    if (!ride.inside) body.hidden = false
    if (ride.kind === 1) goesUnder(town, id, ride)
    return true
  }
  const wasOnItsOwn = (id: Mover): boolean => { const kind = GRID_WANT[id]; return !!old && kind !== null && stripUnder(old[kind].strips, town.bodies[id].at) >= 0 }
  // The tape has changed: whoever was sent hopping may be again.
  for (const id of TOY_IDS) town.bodies[id].hopped = {}
  const lost: Mover[] = []
  for (const id of MOVERS) {
    const body = town.bodies[id], doing = body.doing
    // Something near it has changed: whoever it tooted or honked at, it may again.
    body.met = {}
    body.jamAt = null
    // The road has changed: the dog that lay down beside it may follow again.
    if (id === 'dog') body.asides = 0
    if (body.flight || doing.is === 'held' || doing.is === 'walk') continue
    let stays = true
    if (doing.is === 'ride') stays = reseat(id, doing)
    else if (doing.is === 'stuck') stays = town.state.strips.includes(doing.strip)
    else if (doing.is === 'act') {
      const tape = tapeOf(id, doing.name)
      if (doing.after?.is === 'ride') stays = reseat(id, doing.after)
      if (stays && tape !== null) stays = on(id, tape) || doing.to !== null
      if (stays && (doing.name === 'hide' || doing.name === 'popOut' || doing.name === 'snag')) stays = at(id, 'reeds', 70)
    } else if (doing.as === 'nested') stays = on(id, 2)
    else if (doing.as === 'bath') stays = id !== 'duck' || on(id, 1)
    else if (doing.as === 'reeds') stays = at(id, 'reeds', 70) && (!doing.resume || reseat(id, doing.resume))
    // Parked on a stub of its own tape that is gone from under it: it is on the bare floor, and takes up its habit from there.
    else if (doing.as === 'parked' || doing.as === 'plain') stays = !wasOnItsOwn(id) || on(id, GRID_WANT[id]!)
    else if (doing.as === 'dormant') stays = flat.some((strip) => 'act' in GRID[id][strip.kind] && stripUnder([strip], body.at) === 0)
    if (stays) continue
    // What it was on, in or under is gone: it is whole again and takes up what it stands on now, as a load would find it.
    body.hidden = false
    body.hatAt = -Infinity
    body.doing = { is: 'stand', as: 'plain', since: town.time }
    decide(town, id, false)
    lost.push(id)
  }
  // Whatever it took up, it is on top of nobody: under a bridge that is gone, it hops out from under whoever was on it.
  for (const id of lost) clearOf(town, id)
}
