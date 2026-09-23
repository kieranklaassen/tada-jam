import { describe, expect, it } from 'vitest'
import { ROOMS } from './rooms'
import { canMoveUnder, LayoutCache, nextHint, solve } from './solver'
import {
  arrangementCount,
  arrangementFromKey,
  connected,
  isPerspectiveStep,
  isWalkable,
  overlaps,
  pivotIsValid,
  resolveRoom,
  stepArrangement,
  type Layout,
} from './world'

function perspectiveJoins(layout: Layout): string[] {
  const joins: string[] = []
  layout.tiles.forEach((tile, index) => {
    for (const edge of layout.edges[index]) {
      if (!edge.perspective || edge.to < index) continue
      const other = layout.tiles[edge.to]
      joins.push(`${tile.x},${tile.y},${tile.z}~${other.x},${other.y},${other.z}`)
    }
  })
  return joins.sort()
}

/** Walk the solver's plan through the arrangements and report whether any walked step crosses a perspective join. */
function planUsesPerspective(cache: LayoutCache, moves: NonNullable<ReturnType<typeof solve>>): boolean {
  const room = cache.room
  let arrangement = room.startArrangement
  let walker = room.startTile
  const stops: { arrangement: typeof arrangement; from: number; to: number }[] = []
  for (const move of moves) {
    stops.push({ arrangement, from: walker, to: move.stand })
    walker = move.stand
    arrangement = stepArrangement(room, arrangement, move.group, move.dir)!
  }
  stops.push({ arrangement, from: walker, to: room.doorTile })
  return stops.some(({ arrangement: arr, from, to }) => {
    const layout = cache.get(arr)
    const start = layout.byId.get(from)!
    const goal = layout.byId.get(to)!
    const previous = new Map<number, number>([[start, start]])
    const queue = [start]
    for (let i = 0; i < queue.length; i++) {
      for (const edge of layout.edges[queue[i]]) {
        if (previous.has(edge.to)) continue
        previous.set(edge.to, queue[i])
        queue.push(edge.to)
      }
    }
    for (let at = goal; at !== start; at = previous.get(at)!) {
      if (isPerspectiveStep(layout, layout.tiles[previous.get(at)!].id, layout.tiles[at].id)) return true
    }
    return false
  })
}

const EXPECTED_JOINS: Record<string, Record<string, string[]>> = {
  'impossible-stair': { '0': ['2,1,3~6,4,6'], '2': ['2,1,3~6,4,6'] },
  crank: { '-1,3': ['-1,1,-3~3,4,0'], '0,3': ['-1,1,-3~3,4,0'] },
}

describe('dioramas', () => {
  it('have unique keys', () => {
    expect(new Set(ROOMS.map((room) => room.key)).size).toBe(ROOMS.length)
  })

  for (const spec of ROOMS) {
    describe(spec.key, () => {
      const room = resolveRoom(spec)
      const cache = new LayoutCache(room)

      it('turns only about lattice-safe pivots', () => {
        for (const group of spec.groups) if (group.kind === 'turn') expect(pivotIsValid(group)).toBe(true)
      })

      it('never puts two cells in one place in any reachable arrangement', () => {
        const start = cache.get(room.startArrangement)
        expect(overlaps(start)).toBe(false)
      })

      it('starts with the wanderer and the door on walkable tops, apart', () => {
        const layout = cache.get(room.startArrangement)
        expect(isWalkable(layout, room.startTile)).toBe(true)
        expect(isWalkable(layout, room.doorTile)).toBe(true)
        expect(connected(layout, room.startTile, room.doorTile)).toBe(false)
      })

      it('can always be solved from the start', () => {
        const moves = solve(cache, room.startArrangement, room.startTile)
        expect(moves).not.toBeNull()
        expect(moves!.length).toBeGreaterThan(0)
        expect(moves!.length).toBeLessThanOrEqual(10)
        expect(nextHint(cache, room.startArrangement, room.startTile)?.kind).not.toBe('door')
      })

      it('has only the perspective joins it was drawn with', () => {
        const expected = EXPECTED_JOINS[spec.key] ?? {}
        for (let key = 0; key < arrangementCount(room); key++) {
          const arrangement = arrangementFromKey(room, key)
          const layout = cache.get(arrangement)
          if (overlaps(layout)) continue
          expect(perspectiveJoins(layout), `${spec.key} at ${arrangement.join(',')}`).toEqual(expected[arrangement.join(',')] ?? [])
        }
      })

      it('never stacks two walkable tops on one screen spot', () => {
        for (let key = 0; key < arrangementCount(room); key++) {
          const layout = cache.get(arrangementFromKey(room, key))
          const spots = new Set(layout.tiles.map((tile) => `${tile.kx},${tile.kz}`))
          expect(spots.size).toBe(layout.tiles.length)
        }
      })
    })
  }

  it('needs an impossible join in the stair and the crank', () => {
    for (const key of ['impossible-stair', 'crank']) {
      const room = resolveRoom(ROOMS.find((spec) => spec.key === key)!)
      const cache = new LayoutCache(room)
      expect(planUsesPerspective(cache, solve(cache, room.startArrangement, room.startTile)!)).toBe(true)
    }
  })

  it('needs the bird in the bird bridge and a ride on the ferry and the lift', () => {
    const bird = resolveRoom(ROOMS.find((spec) => spec.key === 'bird-bridge')!)
    const birdMoves = solve(new LayoutCache(bird), bird.startArrangement, bird.startTile)!
    expect(birdMoves.some((move) => move.group === 0)).toBe(true)
    expect(birdMoves.every((move) => canMoveUnder(bird, move.group, move.stand))).toBe(true)
    for (const key of ['ferry', 'crank']) {
      const room = resolveRoom(ROOMS.find((spec) => spec.key === key)!)
      const moves = solve(new LayoutCache(room), room.startArrangement, room.startTile)!
      expect(moves.some((move) => room.cells[move.stand / 6 | 0].group >= 0)).toBe(true)
    }
  })
})
