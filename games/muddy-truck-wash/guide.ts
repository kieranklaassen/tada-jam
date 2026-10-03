import type { Guidance } from './guidance'
import { handPose, type HandPose } from './guidance'
import type { Play } from './play'
import { TOOL_HOME, TOOL_MIDDLE } from './props'
import type { VehicleId } from './roster'
import { patchCentre } from './silhouette'
import { GRID_H, GRID_W, WORK, allShiny, cellAt, nextTool, type Tool } from './surface'

// What the idle ladder shows in this game: a glow on what can be touched now,
// then a ghost hand making one move. One move only, chosen from what is on
// the vehicle: how a tool is taken, where the tool in hand can work, or that
// the vehicle at the door can be touched. Never the whole order of a wash.
// Pure: the template's ladder gives the timing, the view draws the result.

export type Hint = {
  /** 0..1: how strongly the touchable things glow. */
  glow: number
  tools: Tool[]
  vehicles: VehicleId[]
  /** The ghost hand's fingertip in the world, or null when no move is being shown. */
  hand: { x: number; y: number; z: number; press: number; opacity: number } | null
}

const pose: HandPose = { travel: 0, press: 0, opacity: 0 }

/** A run of patches along a row that `tool` has work on: where a rub of it would do something. */
function workRow(play: Play, tool: Tool): { from: [number, number]; to: [number, number] } | null {
  let best: { row: number; start: number; length: number } | null = null
  for (let row = GRID_H - 1; row >= 0; row--) {
    let start = -1
    for (let col = 0; col <= GRID_W; col++) {
      const has = col < GRID_W && WORK[tool].includes(play.bay.surface[cellAt(col, row)])
      if (has && start < 0) start = col
      if (!has && start >= 0) {
        if (!best || col - start > best.length) best = { row, start, length: col - start }
        start = -1
      }
    }
  }
  if (!best) return null
  const end = Math.min(best.start + best.length - 1, best.start + 3)
  return { from: [best.start, best.row], to: [end, best.row] }
}

/** What to show an idle child. `out` is filled in and returned, so nothing is made each frame. */
export function hintFor(play: Play, guidance: Guidance, out: Hint): Hint {
  out.glow = guidance.glow
  out.tools.length = 0
  out.vehicles.length = 0
  out.hand = null
  if (guidance.glow <= 0 && guidance.demo === null) return out
  const shiny = allShiny(play.bay.surface)
  // Everything that answers a touch glows: the tools on the rack, the vehicle in the bay, the one at the door.
  for (const tool of ['sponge', 'hose', 'cloth'] as const) if (play.hand !== tool) out.tools.push(tool)
  out.vehicles.push(play.bay.def.id, play.next.def.id)
  if (guidance.demo === null) return out

  const bay = play.bay.motion
  const wanted = nextTool(play.bay.surface)
  const rub = play.hand !== 'finger' ? workRow(play, play.hand) : null
  if (shiny) {
    // The wash is done: the hand shows that the vehicle at the door can be touched.
    handPose(guidance.demo, false, pose)
    const next = play.next
    out.hand = { x: next.motion.homeX + next.def.side.x0 + 0.7, y: 1.3, z: next.motion.homeZ + 1.05, press: pose.press, opacity: pose.opacity }
  } else if (rub) {
    // A tool is in hand and has work: the hand shows one short rub where it would do something.
    handPose(guidance.demo, true, pose)
    const a = patchCentre(play.bay.def, rub.from[0], rub.from[1]), b = patchCentre(play.bay.def, rub.to[0], rub.to[1])
    out.hand = { x: bay.homeX + a.x + (b.x - a.x) * pose.travel, y: a.y + (b.y - a.y) * pose.travel, z: bay.homeZ + 1.05, press: pose.press, opacity: pose.opacity }
  } else {
    // The hand shows how a tool is taken: the one a wash would take up next.
    handPose(guidance.demo, false, pose)
    const tool = wanted && wanted !== play.hand ? wanted : (['sponge', 'hose', 'cloth'] as const).find((t) => t !== play.hand)!
    const home = TOOL_HOME[tool], mid = TOOL_MIDDLE[tool]
    out.hand = { x: home[0] + mid[0], y: home[1] + mid[1], z: home[2] + mid[2] + 0.3, press: pose.press, opacity: pose.opacity }
  }
  return out
}

export function emptyHint(): Hint {
  return { glow: 0, tools: [], vehicles: [], hand: null }
}
