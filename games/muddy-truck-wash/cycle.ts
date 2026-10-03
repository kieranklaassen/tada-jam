import { fireEngine } from './fireEngine'
import { mixer } from './mixer'
import { next as draw } from './mud'
import type { VehicleDef, VehicleId } from './roster'
import type { CycleOutcome } from './state'
import { tally, type Surface } from './surface'
import { tipper } from './tipper'
import { tractor } from './tractor'

// The roster, how a wash is judged when the vehicle is sent off, and who
// waits next. Pure.

export const ROSTER: readonly VehicleDef[] = [tipper, fireEngine, tractor, mixer]

export function isVehicle(id: unknown): id is VehicleId {
  return ROSTER.some((def) => def.id === id)
}

export function vehicle(id: VehicleId): VehicleDef {
  return ROSTER.find((def) => def.id === id) ?? ROSTER[0]
}

/**
 * How a wash went, judged once from what is on the vehicle as it leaves
 * (the design sheet, "The designed order"):
 * - well: no more than a tenth of its patches still hold mud or foam;
 * - badly: more than half of the mud it rolled in with is still on it as mud;
 * - mixed: anything else.
 */
export function judge(surface: Surface, came: number): CycleOutcome {
  const t = tally(surface)
  if (t.mud + t.foam <= t.body * 0.1) return 'well'
  if (came > 0 && t.mud > came * 0.5) return 'badly'
  return 'mixed'
}

/** Who waits next: one of the roster that is neither in the bay nor just gone, picked from the seeded stream. */
export function whoNext(seed: number, not: readonly VehicleId[]): [VehicleId, number] {
  const free = ROSTER.filter((def) => !not.includes(def.id))
  const [roll, s] = draw(seed)
  const from = free.length ? free : ROSTER
  return [from[Math.floor(roll * from.length)].id, s]
}
