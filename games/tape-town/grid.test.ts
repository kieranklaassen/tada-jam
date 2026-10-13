import { describe, expect, it } from 'vitest'
import { DT, carry, names, run, strip, townWith, type Heard } from './bench'
import { ACTS, GAITS, GRID, MOVERS, type Mover } from './habits'
import type { Kind } from './layout'

// The grid of the design sheet: five toys by four tapes and the bare floor.
// Every cell is its own thing, seen and heard, and the same every time.

const LINE = { ax: 330, ay: 300, bx: 900, by: 300 }
const tape = (kind: Kind) => strip(kind, LINE.ax, LINE.ay, LINE.bx, LINE.by)

/** The toy is set on the middle of a strip of that tape by the child, and the town runs. */
function cell(id: Mover, kind: Kind, seconds = 2.5): { log: Heard[]; town: ReturnType<typeof townWith> } {
  const town = townWith([tape(kind)])
  carry(town, id, { x: 600, y: 300 })
  return { log: run(town, seconds), town }
}

describe('the grid: every toy on every tape', () => {
  for (const id of MOVERS) for (const kind of [0, 1, 2, 3] as const) {
    const want = GRID[id][kind]
    it(`${id} on tape ${kind} does its own thing, and is heard doing it`, () => {
      const { log, town } = cell(id, kind)
      const heard = new Set(names(log))
      if ('ride' in want) {
        const gait = GAITS[want.ride]
        expect(heard.has(gait.beat(1).name), `${[...heard]}`).toBe(true)
        expect(Math.hypot(town.bodies[id].at.x - 600, town.bodies[id].at.y - 300)).toBeGreaterThan(40)
      } else {
        for (const cue of ACTS[want.act].cues) if ('sound' in cue && cue.sound) expect(heard.has(cue.sound.name), `${cue.sound.name} in ${[...heard]}`).toBe(true)
      }
    })
  }

  it('no two cells of the grid sound alike', () => {
    const seen = new Map<string, string>()
    for (const id of MOVERS) for (const kind of [0, 1, 2, 3] as const) {
      const want = GRID[id][kind]
      const key = 'ride' in want ? GAITS[want.ride].beat(1).name : ACTS[want.act].cues.map((cue) => ('sound' in cue && cue.sound ? cue.sound.name : '')).join('+')
      expect(seen.get(key), `${id} on ${kind} sounds like ${seen.get(key)}`).toBeUndefined()
      seen.set(key, `${id} on ${kind}`)
    }
  })

  it('the same toy on the same tape does the same thing every time', () => {
    for (const id of MOVERS) for (const kind of [0, 1, 2, 3] as const) expect(names(cell(id, kind, 3).log)).toEqual(names(cell(id, kind, 3).log))
  })
})

describe('one clock for sight and sound', () => {
  it('every sound of an act is queued in the frame its cue falls in', () => {
    for (const id of MOVERS) for (const kind of [0, 1, 2, 3] as const) {
      const want = GRID[id][kind]
      if (!('act' in want)) continue
      const town = townWith([tape(kind)])
      carry(town, id, { x: 600, y: 300 })
      const start = town.frames
      const log = run(town, ACTS[want.act].lasts + 0.2)
      for (const cue of ACTS[want.act].cues) {
        if (!('sound' in cue) || !cue.sound) continue
        const heard = log.find((entry) => entry.name === cue.sound!.name && entry.frame - start >= Math.floor(cue.at / DT))
        expect(heard, `${id} ${want.act} ${cue.sound.name}`).toBeDefined()
        expect(heard!.frame - start - cue.at / DT, `${id} ${want.act} ${cue.sound.name}`).toBeLessThanOrEqual(1.01)
      }
    }
  })
})
