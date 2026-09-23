import { describe, expect, it } from 'vitest'
import { SILENT, TowerController } from './controller'
import { placePoint } from './projection'
import { ROOMS } from './rooms'
import { deserialize } from './state'
import { resolveRoom, type Vec3 } from './world'

// Frame-time budget for the CPU side of a frame. An iPad frame has about
// 12 ms and the GPU needs most of it, so the controller (guidance, solver,
// pathfinding, springs, both characters) must stay a small slice even on a
// CI runner. The heaviest moments are a segment landing (the layout and the
// next hint are recomputed) and a tap on a far tile (a path is found), so the
// test plays every diorama to its door by following the game's own hints
// through touches alone, timing every frame. Each run builds a fresh
// controller, so cold solver caches are included. The controller costs
// microseconds (even a solve and a full layout every frame stay far inside
// these budgets), so this is a coarse guard; the frame's real cost is the
// view's draw submission, which the browser probe measures.

const FRAME = 1 / 60
const rooms = ROOMS.map(resolveRoom)

type Run = { times: number[]; reachedDoor: boolean }

function play(key: string): Run {
  const tower = new TowerController(deserialize({ v: 1, current: key, rooms: {} }, rooms), { save: () => {}, sound: SILENT, childAge: 7, now: 0 })
  tower.resize(1180, 820)
  const times: number[] = []
  let now = 0
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += FRAME) {
      now += FRAME
      const start = performance.now()
      tower.update(FRAME, now)
      times.push(performance.now() - start)
    }
  }
  const screen = (p: readonly number[]) => {
    const out = { x: 0, y: 0 }
    return tower.projector.toScreen(p[0], p[1], p[2], out)
  }
  const tapTile = (id: number) => {
    const layout = tower.currentRoom.cache.get(tower.arrangementNow)
    const tile = layout.tiles[layout.byId.get(id)!]
    const at = screen([tile.x + 0.5, tile.top, tile.z + 0.5])
    tower.pointerDown(1, at.x, at.y, now * 1000)
    tower.pointerUp(1, at.x, at.y, now * 1000 + 60)
    for (let t = 0; t < 12 && (t === 0 || tower.isWalking); t += 0.1) run(0.1)
    run(0.8)
  }
  const dragToward = (group: number, dir: number) => {
    const def = tower.currentRoom.spec.groups[group]
    let local: readonly number[] = def.kind === 'turn' ? def.handle : def.grip
    if (def.kind === 'turn') {
      // The handle sits on the axis; grab the cell farthest from it so the drag has leverage.
      const a = def.axis === 'x' ? 0 : def.axis === 'y' ? 1 : 2
      let best = -1
      for (const cell of def.cells) {
        const c: Vec3 = [cell.at[0] + 0.5, cell.at[1] + 0.5, cell.at[2] + 0.5]
        let d = 0
        for (let k = 0; k < 3; k++) if (k !== a) d += (c[k] - def.pivot[k]) ** 2
        if (d > best) {
          best = d
          local = c
        }
      }
    }
    const from = tower.arrangementNow[group]
    const to = from + dir * 1.08
    const out: [number, number, number] = [0, 0, 0]
    const steps = 16
    const at = (i: number) => screen(placePoint(def, from + ((to - from) * i) / steps, local[0], local[1], local[2], out))
    let point = at(0)
    tower.pointerDown(3, point.x, point.y, now * 1000)
    for (let i = 1; i <= steps; i++) {
      run(0.9 / steps)
      point = at(i)
      tower.pointerMove(3, point.x, point.y, now * 1000)
    }
    run(0.1)
    tower.pointerUp(3, point.x, point.y, now * 1000)
    run(1.6)
  }
  run(1.4)
  for (let step = 0; step < 30 && tower.currentPhase === 'play'; step++) {
    run(0.2)
    const hint = tower.currentHint
    if (!hint) continue
    if (hint.kind === 'door') tapTile(tower.currentRoom.room.doorTile)
    else if (hint.kind === 'walk') tapTile(hint.tile)
    else dragToward(hint.group, hint.dir)
  }
  const reachedDoor = tower.currentPhase !== 'play'
  run(3)
  tower.dispose()
  return { times, reachedDoor }
}

function average(times: readonly number[]): number {
  return times.reduce((a, b) => a + b, 0) / times.length
}

describe('frame budget', () => {
  it('sets up all five dioramas at mount in a few milliseconds (their solver caches fill a little each frame)', () => {
    const state = () => deserialize({ v: 1, current: ROOMS[0].key, rooms: {} }, rooms)
    new TowerController(state(), { save: () => {}, sound: SILENT, childAge: 7, now: 0 }).dispose()
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now()
      new TowerController(state(), { save: () => {}, sound: SILENT, childAge: 7, now: 0 }).dispose()
      return performance.now() - start
    })
    process.stdout.write(`mount: best ${Math.min(...times).toFixed(2)} ms\n`)
    expect(Math.min(...times)).toBeLessThan(20)
  })

  it('every diorama is walked to its door by following its own hints, within the frame budget', () => {
    for (const spec of ROOMS) play(spec.key)
    for (const spec of ROOMS) {
      const runs = Array.from({ length: 5 }, () => play(spec.key))
      for (const run of runs) expect(run.reachedDoor, spec.key).toBe(true)
      const best = Math.min(...runs.map((run) => average(run.times)))
      const worst = Math.min(...runs.map((run) => Math.max(...run.times)))
      process.stdout.write(`${spec.key}: ${runs[0].times.length} frames, best average ${best.toFixed(3)} ms, best worst frame ${worst.toFixed(2)} ms\n`)
      expect(best, spec.key).toBeLessThan(0.1)
      expect(worst, spec.key).toBeLessThan(3)
    }
  })
})
