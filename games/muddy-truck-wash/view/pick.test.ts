import { describe, expect, it } from 'vitest'
import { ROSTER } from '../cycle'
import { LAYOUT, TOOL_HOME, TOOL_MIDDLE } from '../props'
import { queueOf, queueSpot } from '../queue'
import type { VehicleDef } from '../roster'
import { patchCentre, proudAt, silhouette } from '../silhouette'
import { floorSpot, wallSpot } from '../spots'
import { GRID_H, GRID_W, cellAt } from '../surface'
import { Picker, type Standing, type Waiting } from './pick'
import { bayCamera, frame } from './stage'

// What a finger is on, at the tablet shapes the jam is made for. The picker
// needs no renderer: a camera placed as the stage places it is enough.

const SHAPES = [[1180, 820], [1024, 768]] as const

function scene(bay: VehicleDef, next: VehicleDef): { bay: Standing; next: Standing; queue: Waiting[] } {
  const queue = queueOf(bay.id, next.id).map((id, place) => ({ def: ROSTER.find((def) => def.id === id)!, ...queueSpot(place) }))
  return { bay: { def: bay, x: LAYOUT.bay.x, z: LAYOUT.bay.z, surface: silhouette(bay) }, next: { def: next, x: LAYOUT.door.x, z: LAYOUT.door.z, surface: silhouette(next) }, queue }
}

const pairs = ROSTER.flatMap((bay) => ROSTER.filter((next) => next !== bay).map((next) => [bay, next] as const))

describe.each(SHAPES)('what a finger is on, at %i by %i', (width, height) => {
  const camera = bayCamera()
  frame(camera, width, height)
  const picker = new Picker(camera)
  const at = (x: number, y: number, z: number, s: ReturnType<typeof scene>, dx = 0, dy = 0) => {
    const p = picker.project(x, y, z, width, height)
    return picker.pick(p.x + dx, p.y + dy, width, height, s.bay, s.next, s.queue)
  }

  it('the face of the vehicle that waits is that vehicle, whichever stands in the bay: its eyes, its mouth and its nose', () => {
    for (const [bay, next] of pairs) {
      const s = scene(bay, next)
      // Its near eye and the near half of its mouth are in the open whoever is in the bay; the far eye can be behind a tall tail, and then the tail answers.
      const eye = next.eyes[0]
      expect(at(s.next.x + eye.at[0] - eye.r, eye.at[1], s.next.z + eye.at[2], s).kind, `${next.id}'s eye behind ${bay.id}`).toBe('next')
      for (const z of [0, 0.5]) expect(at(s.next.x + next.mouth.at[0], next.mouth.at[1], s.next.z + z, s).kind, `${next.id}'s mouth behind ${bay.id}`).toBe('next')
      const far = at(s.next.x + next.eyes[1].at[0] - next.eyes[1].r, next.eyes[1].at[1], s.next.z + next.eyes[1].at[2], s).kind
      expect(far === 'next' || far === 'truck', far).toBe(true)
      expect(at(s.next.x + next.side.x0 + 0.4, 1.2, s.next.z + 0.9, s).kind).toBe('next')
    }
  })

  it('every patch of the side of the vehicle in the bay is that patch', () => {
    for (const [bay, next] of pairs.filter(([, next], i) => i % 3 === 0 || next === ROSTER[0])) {
      const s = scene(bay, next)
      for (let row = 0; row < GRID_H; row++) for (let col = 0; col < GRID_W; col++) {
        if (s.bay.surface[cellAt(col, row)] === '.') continue
        const c = patchCentre(bay, col, row)
        // Low on the left the rack's tools stand in front of the vehicle, and there they answer first.
        const hit = at(c.x, c.y, proudAt(bay, col, row), s)
        if (hit.kind === 'tool') continue
        // That patch, or the one beside it where a prouder part (a wheel, a mudguard) stands in front of it from where the child looks.
        expect(hit.kind, `${bay.id} ${col},${row}`).toBe('truck')
        if (hit.kind === 'truck') expect(Math.max(Math.abs(hit.col - col), Math.abs(hit.row - row)), `${bay.id} ${col},${row} answered as ${hit.col},${hit.row}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('the two that wait on the hill are themselves, each in its own place', () => {
    for (const [bay, next] of pairs) {
      const s = scene(bay, next)
      s.queue.forEach((who, place) => {
        const c = Math.cos(who.turn), sn = Math.sin(who.turn)
        // The middle of its nose, where its face is.
        const x = who.def.side.x0 + 0.3, y = 1.3
        expect(at(who.x + x * c, who.ground + y, who.z - x * sn, s), `${who.def.id} waiting`).toEqual({ kind: 'queue', place })
      })
    }
  })

  it('the pinwheel, the roller, the lamp, the shelf, the tap, the tools and the puddle are themselves, whoever stands where', () => {
    for (const [bay, next] of pairs) {
      const s = scene(bay, next)
      const who = `${bay.id} in the bay, ${next.id} at the door`
      const pin = LAYOUT.pinwheel
      for (const [dx, dy] of [[0, 0], [10, 0], [-14, 6], [0, -18], [16, 12]]) {
        const hit = at(pin.x, pin.y, pin.z, s, dx, dy)
        // Behind the low tail of the tipper or the fire engine the pinwheel is in the open. The mixer's drum and the tractor's roof stand in front of part of it, and there they answer.
        if (bay.id === 'tipper' || bay.id === 'fire-engine') expect(hit, who).toEqual({ kind: 'bit', bit: 'pinwheel' })
        else expect(hit.kind === 'bit' || hit.kind === 'truck', `${who}: ${hit.kind}`).toBe(true)
        // It is never the vehicle that waits: nothing of that one is drawn there.
        expect(hit.kind).not.toBe('next')
      }
      expect(at(LAYOUT.roller.x, LAYOUT.roller.y1 - 0.3, LAYOUT.roller.z, s), who).toEqual({ kind: 'bit', bit: 'roller' })
      expect(at(LAYOUT.lamp.x, LAYOUT.lamp.y + 0.15, LAYOUT.lamp.z, s), who).toEqual({ kind: 'bit', bit: 'lamp' })
      expect(at(LAYOUT.shelf.x, LAYOUT.shelf.y + 0.3, LAYOUT.wall.z + 0.24, s), who).toEqual({ kind: 'bit', bit: 'shelf' })
      expect(at(LAYOUT.tap.x, LAYOUT.tap.hang - 0.24, LAYOUT.tap.z, s).kind, who).toBe('tap')
      for (const tool of ['sponge', 'hose', 'cloth'] as const) expect(at(TOOL_HOME[tool][0] + TOOL_MIDDLE[tool][0], TOOL_HOME[tool][1] + TOOL_MIDDLE[tool][1], TOOL_HOME[tool][2] + TOOL_MIDDLE[tool][2], s), who).toEqual({ kind: 'tool', tool })
      const puddle = LAYOUT.puddle
      for (const [x, z] of [[0, 0], [puddle.rx * 0.8, 0], [-puddle.rx * 0.8, 0], [0, puddle.rz * 0.8], [0, -puddle.rz * 0.8]]) expect(at(puddle.x + x, 0, puddle.z + z, s).kind, who).toBe('puddle')
    }
  })

  it('a roof seen from above is the vehicle under it: the tractor\'s roof, the far half of the fire engine\'s cab roof, the top of the mixer\'s drum', () => {
    const by = (id: string) => ROSTER.find((def) => def.id === id)!
    const tractor = scene(by('tractor'), by('mixer'))
    for (const [x, z] of [[0.2, 0.5], [0.8, 0], [1.3, -0.5], [0.4, -0.6]]) expect(at(x, 2.97, z, tractor).kind, `tractor roof ${x},${z}`).toBe('truck')
    const fire = scene(by('fire-engine'), by('tractor'))
    for (const z of [0.4, 0, -0.4, -0.7]) expect(at(-1.5, 2.17, z, fire).kind, `cab roof ${z}`).toBe('truck')
    const mixer = scene(by('mixer'), by('tipper'))
    // On the drum's own round top: its middle stands 1.97 high where these points are, and it is 0.92 round.
    for (const z of [0.3, 0, -0.3]) expect(at(0.8, 1.97 + Math.sqrt(0.92 * 0.92 - z * z) - 0.03, z, mixer).kind, `drum top ${z}`).toBe('truck')
  })

  it('the rear edge of the bed of the one in the bay is that one, never the one at the door behind it', () => {
    for (const [bay, next] of pairs) {
      const s = scene(bay, next)
      // Points just inside the drawn tail, down its near edge and across its top.
      for (const y of [1.2, 1.5, 1.8]) for (const z of [0.85, 0.4, 0, -0.4]) {
        const hit = at(bay.side.x1 - 0.12, y, z, s)
        expect(hit.kind, `${bay.id}'s tail at ${y},${z} with ${next.id} behind`).not.toBe('next')
      }
    }
  })

  it('the tool in hand, where it waits above the vehicle, is that tool; with none waiting there the same touch is on what is behind', () => {
    const [bay, next] = pairs[0]
    const s = scene(bay, next)
    const waits = { x: -1.6, y: 2.95, z: 1.21 }
    const p = picker.project(waits.x, waits.y, waits.z, width, height)
    expect(picker.pick(p.x, p.y, width, height, s.bay, s.next, s.queue, { tool: 'sponge', ...waits })).toEqual({ kind: 'tool', tool: 'sponge' })
    expect(picker.pick(p.x + 30, p.y - 20, width, height, s.bay, s.next, s.queue, { tool: 'sponge', ...waits })).toEqual({ kind: 'tool', tool: 'sponge' })
    expect(picker.pick(p.x, p.y, width, height, s.bay, s.next, s.queue).kind).not.toBe('tool')
  })

  it('the suds bucket under the sponge is the bucket, and the sponge on top of it is still the sponge', () => {
    const [bay, next] = pairs[0]
    const s = scene(bay, next)
    const side = picker.project(LAYOUT.rack.x + LAYOUT.bucket.dx, 0.35, LAYOUT.rack.z + 0.3, width, height)
    expect(picker.pick(side.x, side.y, width, height, s.bay, s.next, s.queue)).toEqual({ kind: 'bucket' })
    const low = picker.project(LAYOUT.rack.x + LAYOUT.bucket.dx + 0.3, 0.3, LAYOUT.rack.z + 0.2, width, height)
    expect(picker.pick(low.x, low.y, width, height, s.bay, s.next, s.queue)).toEqual({ kind: 'bucket' })
    const sponge = picker.project(TOOL_HOME.sponge[0] + TOOL_MIDDLE.sponge[0], TOOL_HOME.sponge[1] + TOOL_MIDDLE.sponge[1], TOOL_HOME.sponge[2] + TOOL_MIDDLE.sponge[2], width, height)
    expect(picker.pick(sponge.x, sponge.y, width, height, s.bay, s.next, s.queue)).toEqual({ kind: 'tool', tool: 'sponge' })
  })

  it('a touch on a pool, on the drain, on the window or on the pipe reaches the game as the floor or the wall there, at the point under the finger', () => {
    const [bay, next] = pairs[0]
    const s = scene(bay, next)
    for (const pool of LAYOUT.pools) {
      const p = picker.project(pool.x, 0, pool.z, width, height)
      if (p.y > height - 4) continue
      const target = picker.pick(p.x, p.y, width, height, s.bay, s.next, s.queue)
      expect(target.kind).toBe('floor')
      if (target.kind === 'floor') expect(floorSpot(target.x, target.z)).toBe('pool')
    }
    const w = LAYOUT.window
    const glass = picker.project((w.x0 + w.x1) / 2, (w.y0 + w.y1) / 2, LAYOUT.wall.z, width, height)
    const onGlass = picker.pick(glass.x, glass.y, width, height, s.bay, s.next, s.queue)
    expect(onGlass.kind).toBe('none')
    if (onGlass.kind === 'none' && onGlass.at) expect(wallSpot(onGlass.at[0], onGlass.at[1])).toBe('window')
    // The pipe stands off the wall: a finger on it where it is drawn is on the pipe by the point on the wall behind it.
    for (const x of [-3.6, -1.0]) {
      const pipe = picker.project(x, LAYOUT.pipe.y, LAYOUT.wall.z + 0.2 + LAYOUT.pipe.r, width, height)
      const onPipe = picker.pick(pipe.x, pipe.y, width, height, s.bay, s.next, s.queue)
      if (onPipe.kind !== 'none') continue
      expect(onPipe.at && wallSpot(onPipe.at[0], onPipe.at[1]), `the pipe at ${x}`).toBe('pipe')
    }
  })

  it('a touch on the bare wall or on the sky is on nothing, and says where on the wall or over the yard it was', () => {
    const [bay, next] = pairs[0]
    const s = scene(bay, next)
    const wall = at(-0.5, 2.6, LAYOUT.wall.z, s)
    expect(wall.kind).toBe('none')
    if (wall.kind === 'none') {
      expect(wall.at![0]).toBeCloseTo(-0.5, 0)
      expect(wall.at![1]).toBeCloseTo(2.6, 0)
    }
    const sky = picker.pick(width - 30, 8, width, height, s.bay, s.next, s.queue)
    expect(sky.kind).toBe('none')
    if (sky.kind === 'none') expect(sky.at![0]).toBeGreaterThan(LAYOUT.yardFrom)
  })

  it('the three tools are each at least a hundred pixels across and apart: between any two there is ground that is neither', () => {
    const [bay, next] = pairs[0]
    const s = scene(bay, next)
    const middle = (tool: 'sponge' | 'hose' | 'cloth') => picker.project(TOOL_HOME[tool][0] + TOOL_MIDDLE[tool][0], TOOL_HOME[tool][1] + TOOL_MIDDLE[tool][1], TOOL_HOME[tool][2] + TOOL_MIDDLE[tool][2], width, height)
    const toolAt = (x: number, y: number) => { const hit = picker.pick(x, y, width, height, s.bay, s.next, s.queue); return hit.kind === 'tool' ? hit.tool : null }
    for (const [a, b] of [['sponge', 'hose'], ['hose', 'cloth']] as const) {
      const p = middle(a), q = middle(b)
      // Half way between them neither answers.
      expect(toolAt((p.x + q.x) / 2, (p.y + q.y) / 2), `${a} and ${b}`).toBeNull()
    }
    for (const tool of ['sponge', 'hose', 'cloth'] as const) {
      const p = middle(tool)
      // Fifty pixels to either side of its middle it still answers: a hundred across.
      for (const dx of [-50, 50]) expect(toolAt(p.x + dx, p.y), tool).toBe(tool)
    }
  })

  it('the things a wash needs are well apart: between the vehicle in the bay and the one that waits, and between that one and the puddle, there is ground that is neither', () => {
    for (const [bay, next] of pairs) {
      const s = scene(bay, next)
      // The dirt between the puddle's far edge and the wheels of the vehicle that waits.
      const between = at(LAYOUT.puddle.x, 0, (LAYOUT.puddle.z - LAYOUT.puddle.rz + s.next.z + 0.95) / 2, s)
      expect(between.kind === 'puddle' || between.kind === 'floor', `${bay.id}, ${next.id}: ${between.kind}`).toBe(true)
      // Along the floor line from the tail of the one to the nose of the other, at the height of their bumpers, the answers go
      // from the one in the bay to something that is neither, to the one that waits, and never straight from one to the other.
      const from = picker.project(s.bay.x + bay.side.x1, 0.7, s.bay.z + 0.92, width, height), to = picker.project(s.next.x + next.side.x0, 0.7, s.next.z + 0.92, width, height)
      const kinds: string[] = []
      for (let i = -10; i <= 30; i++) {
        const t = i / 20, kind = picker.pick(from.x + (to.x - from.x) * t, from.y + (to.y - from.y) * t, width, height, s.bay, s.next, s.queue).kind
        if (kinds[kinds.length - 1] !== kind) kinds.push(kind)
      }
      const order = kinds.join(' ')
      expect(order.startsWith('truck'), order).toBe(true)
      expect(order.endsWith('next'), order).toBe(true)
      expect(order.includes('truck next'), order).toBe(false)
      expect(to.x - from.x, `${bay.id}, ${next.id}`).toBeGreaterThan(48)
    }
  })
})
