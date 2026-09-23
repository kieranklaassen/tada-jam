import { describe, expect, it } from 'vitest'
import { SILENT, TowerController, type Sound } from './controller'
import { placePoint } from './projection'
import { ROOMS } from './rooms'
import { defaultState, deserialize, type SavedState } from './state'
import { resolveRoom, tileId, UP, type Vec3 } from './world'

const rooms = ROOMS.map(resolveRoom)

type Harness = { tower: TowerController; saves: SavedState[]; now: () => number; run: (seconds: number) => void; sounds: string[] }

function harness(state: SavedState = defaultState(rooms)): Harness {
  const saves: SavedState[] = []
  const sounds: string[] = []
  const sound = new Proxy(SILENT, {
    get(target, key: keyof Sound) {
      const fn = target[key]
      return (...args: unknown[]) => {
        if (key !== 'grind' && key !== 'scrape') sounds.push(String(key))
        return (fn as (...a: unknown[]) => unknown)(...args)
      }
    },
  }) as Sound
  const tower = new TowerController(state, { save: (s) => saves.push(s), sound, childAge: 7, now: 0 })
  tower.resize(1180, 820)
  let now = 0
  const run = (seconds: number) => {
    for (let t = 0; t < seconds; t += 1 / 60) {
      now += 1 / 60
      tower.update(1 / 60, now)
    }
  }
  return { tower, saves, now: () => now, run, sounds }
}

function screenOf(h: Harness, p: Vec3) {
  const out = { x: 0, y: 0 }
  return h.tower.projector.toScreen(p[0], p[1], p[2], out)
}

function tap(h: Harness, p: Vec3) {
  const at = screenOf(h, p)
  const ms = h.now() * 1000
  h.tower.pointerDown(1, at.x, at.y, ms)
  h.tower.pointerUp(1, at.x, at.y, ms + 60)
}

function tileAt(roomIndex: number, at: Vec3): number {
  const room = rooms[roomIndex]
  const cell = room.cells.findIndex((c) => c.def.at[0] === at[0] && c.def.at[1] === at[1] && c.def.at[2] === at[2])
  return tileId(cell, UP)
}

/** Drag a point that rides a group, following the group's own motion from `from` to `to`. */
function dragGroup(h: Harness, group: number, local: Vec3, from: number, to: number, release = true) {
  const def = h.tower.currentRoom.spec.groups[group]
  const out: [number, number, number] = [0, 0, 0]
  const steps = 24
  placePoint(def, from, local[0], local[1], local[2], out)
  let at = screenOf(h, out)
  h.tower.pointerDown(3, at.x, at.y, h.now() * 1000)
  for (let i = 1; i <= steps; i++) {
    placePoint(def, from + ((to - from) * i) / steps, local[0], local[1], local[2], out)
    at = screenOf(h, out)
    h.run(1 / 30)
    h.tower.pointerMove(3, at.x, at.y, h.now() * 1000)
  }
  h.run(0.1)
  if (release) h.tower.pointerUp(3, at.x, at.y, h.now() * 1000)
}

describe('turning tower controller', () => {
  it('walks to a tapped tile along the paths', () => {
    const h = harness()
    const target = tileAt(0, [1, 2, 2])
    tap(h, [1.5, 3, 2.5])
    expect(h.tower.isWalking).toBe(true)
    h.run(2)
    expect(h.tower.walkerTile).toBe(target)
    expect(h.saves.at(-1)!.rooms['first-turn'].walker).toBe(target)
  })

  it('walks as close as it can to an unreachable door and wonders at it', () => {
    const h = harness()
    tap(h, [6.5, 3, 2.5])
    h.run(3)
    expect(h.tower.walkerTile).toBe(tileAt(0, [1, 2, 2]))
    expect(h.tower.currentPhase).toBe('play')
    expect(h.sounds).toContain('wonder')
  })

  it('turns the bridge with a drag, settles on a quarter, saves, and opens the way', () => {
    const h = harness()
    dragGroup(h, 0, [3.5, 3, 3.5], 1, 2.05)
    h.run(1.5)
    expect(h.tower.arrangementNow).toEqual([2])
    expect(h.saves.at(-1)!.rooms['first-turn'].groups).toEqual([2])
    expect(h.sounds).toContain('settle')
    expect(h.sounds).toContain('notch')
    tap(h, [6.5, 3, 2.5])
    h.run(6)
    expect(h.tower.currentPhase).not.toBe('play')
  })

  it('goes through the door into the next diorama and rewinds the one it left', () => {
    const h = harness()
    dragGroup(h, 0, [3.5, 3, 3.5], 1, 2.05)
    h.run(1.5)
    tap(h, [6.5, 3, 2.5])
    h.run(10)
    expect(h.tower.currentRoom.spec.key).toBe('ferry')
    expect(h.tower.currentPhase).toBe('play')
    const saved = h.saves.at(-1)!
    expect(saved.current).toBe('ferry')
    expect(saved.rooms['first-turn']).toEqual({ groups: [1], walker: rooms[0].startTile })
  })

  it('refuses a move that would strand the wanderer, and the platform springs back', () => {
    const crank = rooms[4]
    const walkerOnBridge = tileAt(4, [3, 1, 3])
    const bridgeTile = tileId(crank.cells.findIndex((c) => c.group === 0 && c.def.at[1] === 1), 4)
    expect(walkerOnBridge).toBeGreaterThan(0)
    const state = deserialize({ v: 1, current: 'crank', rooms: { crank: { groups: [-1, 0], walker: bridgeTile } } }, rooms)
    expect(state.rooms.crank.walker).toBe(bridgeTile)
    const h = harness(state)
    dragGroup(h, 0, [4.04, 1.5, 3.5 + 0.6], -1, 0.1)
    h.run(1.5)
    expect(h.tower.arrangementNow).toEqual([-1, 0])
    expect(h.sounds).toContain('bump')
  })

  it('carries the wanderer on the ferry raft', () => {
    const ferry = rooms[1]
    const raftTile = tileId(ferry.cells.findIndex((c) => c.group === 0), UP)
    const h = harness(deserialize({ v: 1, current: 'ferry', rooms: { ferry: { groups: [0], walker: raftTile } } }, rooms))
    h.run(0.5)
    const before = h.tower.frame.walker.z
    dragGroup(h, 0, [4.02, 2.5, 0.5], 0, 4.1)
    h.run(2)
    expect(h.tower.arrangementNow).toEqual([4])
    expect(h.tower.frame.walker.z - before).toBeCloseTo(4, 1)
    expect(h.tower.walkerTile).toBe(raftTile)
  })

  it('hops the bird one stop at a time and will not hop with the wanderer on its back', () => {
    const h = harness(deserialize({ v: 1, current: 'bird-bridge', rooms: {} }, rooms))
    dragGroup(h, 0, [3.5, 2.5, 0.5], -2, 1.1)
    h.run(2)
    expect(h.tower.arrangementNow[0]).toBe(1)
    expect(h.sounds.filter((s) => s === 'chirp').length).toBeGreaterThanOrEqual(3)

    const birdRoom = rooms[3]
    const back = tileId(birdRoom.cells.findIndex((c) => c.group === 0), UP)
    const carried = harness(deserialize({ v: 1, current: 'bird-bridge', rooms: { 'bird-bridge': { groups: [1, 2], walker: back } } }, rooms))
    expect(carried.tower.walkerTile).toBe(back)
    dragGroup(carried, 0, [3.5, 2.5, 0.5], 1, -0.5)
    carried.run(2)
    expect(carried.tower.arrangementNow).toEqual([1, 2])
    expect(carried.sounds).toContain('bump')
  })

  it('travels around the ring and keeps each diorama as it was', () => {
    const h = harness()
    dragGroup(h, 0, [3.5, 3, 3.5], 1, 2.05)
    h.run(1.5)
    const slot = { x: 0, y: 0, scale: 0, depth: 0 }
    h.tower.ringSlot(3, slot)
    h.tower.pointerDown(9, slot.x, slot.y, h.now() * 1000)
    h.tower.pointerUp(9, slot.x, slot.y, h.now() * 1000 + 50)
    h.run(3)
    expect(h.tower.currentRoom.spec.key).toBe('bird-bridge')
    expect(h.saves.at(-1)!.rooms['first-turn'].groups).toEqual([2])
    expect(h.tower.savedGroups(0)).toEqual([2])
  })

  it('settles a drag to the nearest valid quarter when put away mid-drag', () => {
    const h = harness()
    dragGroup(h, 0, [3.5, 3, 3.5], 1, 1.8, false)
    h.tower.setRunning(false)
    expect(h.tower.arrangementNow).toEqual([2])
    expect(h.tower.isBusy).toBe(false)
    expect(h.saves.at(-1)!.rooms['first-turn'].groups).toEqual([2])
  })

  it('shows the next thing to touch after an idle stretch, and hides it on touch', () => {
    const h = harness()
    h.run(1)
    expect(h.tower.currentHint).toEqual({ kind: 'move', group: 0, dir: 1 })
    h.run(3)
    expect(h.tower.frame.glow.kind).toBe('group')
    expect(h.tower.frame.glow.strength).toBeGreaterThan(0)
    h.run(1.8)
    expect(h.tower.frame.hand.visible).toBe(true)
    tap(h, [0.5, 3, 2.5])
    h.run(0.05)
    expect(h.tower.frame.hand.visible).toBe(false)
    expect(h.tower.frame.glow.strength).toBe(0)
  })

  it('ignores a resting hand', () => {
    const h = harness()
    for (let id = 1; id <= 4; id++) h.tower.pointerDown(id, 200 + id * 30, 300, 0)
    for (let id = 1; id <= 4; id++) h.tower.pointerUp(id, 200 + id * 30, 300, 40)
    h.run(0.5)
    expect(h.tower.isWalking).toBe(false)
    expect(h.tower.arrangementNow).toEqual([1])
  })
})
