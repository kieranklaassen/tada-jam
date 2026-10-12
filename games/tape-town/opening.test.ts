import { describe, expect, it } from 'vitest'
import { DT, drag, leastRoom, run } from './bench'
import { stripUnder } from './floor'
import type { Mover } from './habits'
import { ROLLS, TOY_SIZE, type Kind } from './layout'
import { freshTown } from './save'
import { lengthOf, nearestOn, type Strip } from './tape'
import { END_REACH, isWhole, toyAt } from './touch'
import { Town } from './town'

// The first thirty seconds: a child lays a first strip in the town as it opens, touching no toy, and the toy
// that belongs to that tape is on it within ten seconds. Then a second strip, of another tape, and the same.
// Held over many seeded strips: every tape, every region of the floor, level, upright and slanted, short and long.

/** Whose tape each is. Nobody wants the hedge: it is laid here as a first strip for the second to follow. */
const THEIRS: Record<Kind, Mover[]> = { 0: ['car', 'bus'], 1: ['duck'], 2: [], 3: ['train'] }
const NAMES = ['road', 'river', 'hedge', 'rail']
const WITHIN = 10

/** Whether a toy is on a strip: travelling it, turning at its end, or sitting on it where it is a stub. */
function onIt(town: Town, id: Mover, strip: Strip): boolean {
  const body = town.bodies[id], doing = body.doing
  if (body.flight || doing.is === 'walk' || doing.is === 'held' || doing.is === 'stuck') return false
  const ride = doing.is === 'ride' ? doing : doing.is === 'act' && doing.after?.is === 'ride' ? doing.after : null
  if (ride) return ride.kind === strip.kind && town.nets[ride.kind].strips[ride.rider.s] === strip
  return stripUnder([strip], body.at) === 0
}

/** Whether a finger landing here lays tape: on the bare floor, on no toy and on no torn end. */
function bare(town: Town, at: { x: number; y: number }): boolean {
  if (toyAt(town, at)) return false
  return town.flat.every((strip) => (isWhole(strip) ? nearestOn(strip, at).off : Math.min(Math.hypot(at.x - strip.ax, at.y - strip.ay), Math.hypot(at.x - strip.bx, at.y - strip.by))) > END_REACH)
}

type Laid = { kind: Kind; from: { x: number; y: number }; to: { x: number; y: number } }

/** The k-th strip of a seed: its tape, its region of the floor (three by three), its slant and its length. */
function stripOf(k: number, kind: Kind, seed: number): Laid {
  let s = (seed * 2654435761 + k * 40503) >>> 0
  const next = (): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
  const col = k % 3, row = Math.floor(k / 3) % 3
  const cx = 250 + (col + 0.5) * 250 + (next() - 0.5) * 120, cy = 64 + (row + 0.5) * 212 + (next() - 0.5) * 100
  const slant = [0, Math.PI / 2, 0.6, -0.9, 0.25][Math.floor(k / 9) % 5] + (next() - 0.5) * 0.2
  const length = Math.floor(k / 2) % 3 === 0 ? 4 : Math.floor(k / 2) % 3 === 1 ? 150 + next() * 80 : 320 + next() * 300
  const hx = (Math.cos(slant) * length) / 2, hy = (Math.sin(slant) * length) / 2
  // Within the floor a strip can lie on: tape stops short of the edge of the boards.
  const clamp = (x: number, y: number): { x: number; y: number } => ({ x: Math.min(952, Math.max(298, x)), y: Math.min(652, Math.max(112, y)) })
  return { kind, from: clamp(cx - hx, cy - hy), to: clamp(cx + hx, cy + hy) }
}

/** The roll is taken up, as a child does it: a tap, and a moment before the finger is on the floor. */
function pick(town: Town, kind: Kind): void {
  town.press(ROLLS[kind]); town.lift()
  run(town, 0.2)
}

/** Lays a strip with one finger and says how long its toy took to be on it; Infinity for a miss. For the hedge, 0. */
function layAndWait(town: Town, laid: Laid, least: { room: number; pair: string }): number {
  const before = town.state.strips.length
  drag(town, laid.from, laid.to)
  const strip = town.state.strips[town.state.strips.length - 1]
  if (town.state.strips.length !== before + 1 || strip.kind !== laid.kind || lengthOf(strip) < 1) return Infinity
  if (!THEIRS[laid.kind].length) { run(town, 1.5); return 0 }
  for (let k = 0; k <= WITHIN / DT; k++) {
    if (town.flat.includes(strip) && THEIRS[laid.kind].some((id) => onIt(town, id, strip))) return k * DT
    run(town, DT)
    const now = leastRoom(town)
    if (now.room < least.room) { least.room = now.room; least.pair = now.pair }
  }
  return Infinity
}

function play(age: number | null, cases: number[]): { misses: string[]; through: string[]; slowest: number; laid: number } {
  const misses: string[] = [], through: string[] = []
  let slowest = 0, laid = 0
  for (const k of cases) {
    const least = { room: Infinity, pair: '' }
    const town = new Town(freshTown(age), 1 + (k % 5))
    // Nothing is touched before the first strip but the roll: laid at once, after a look, or after a long look.
    run(town, [0.5, 3, 9][k % 3])
    const kind = (k % 4) as Kind, then = ((kind + 1 + (Math.floor(k / 4) % 3)) % 4) as Kind
    const said: string[] = []
    for (const [which, of, from] of [['first', kind, k], ['second', then, k + 5]] as const) {
      // The finger lands on the bare floor: where a toy or a torn end is under it, the next place of the seed.
      pick(town, of)
      let one = stripOf(from, of, 7)
      for (let other = 8; !bare(town, one.from); other++) one = stripOf(from, of, other)
      const took = layAndWait(town, one, least)
      laid++
      slowest = Math.max(slowest, took === Infinity ? 0 : took)
      const what = `the ${which} strip, a ${NAMES[one.kind]} from ${one.from.x.toFixed(0)},${one.from.y.toFixed(0)} to ${one.to.x.toFixed(0)},${one.to.y.toFixed(0)}`
      said.push(what)
      if (took === Infinity) misses.push(`${k} age ${age}, seed ${1 + (k % 5)}, after ${[0.5, 3, 9][k % 3]} s: ${said.join('; ')}`)
    }
    if (least.room < 0) through.push(`${k} age ${age}: ${least.pair} by ${least.room.toFixed(1)}`)
  }
  return { misses, through, slowest, laid }
}

const range = (from: number, to: number): number[] => Array.from({ length: to - from }, (_, k) => from + k)

describe('the first strip in the town as it opens, and the second', () => {
  for (const [age, from, to] of [[3, 0, 30], [null, 30, 60], [6, 60, 90]] as const) {
    it(`gets its toy on it within ten seconds, with no toy touched: thirty seeded pairs of strips for a child of ${age ?? 'no known age'}`, () => {
      const got = play(age, range(from, to))
      expect(got.misses).toEqual([])
      expect(got.through).toEqual([])
      expect(got.laid).toBe(60)
      expect(got.slowest).toBeLessThanOrEqual(WITHIN)
      expect(got.through).toEqual([])
    })
  }

  it('a river laid level under the road, beside where the train lands, has the duck in it; and a river laid second, after a road, has it too', () => {
    const least = { room: Infinity, pair: '' }
    const town = new Town(freshTown(3), 1)
    run(town, 5)
    pick(town, 1)
    expect(layAndWait(town, { kind: 1, from: { x: 560, y: 560 }, to: { x: 960, y: 560 } }, least)).toBeLessThanOrEqual(WITHIN)
    const other = new Town(freshTown(3), 1)
    run(other, 2)
    pick(other, 0)
    expect(layAndWait(other, { kind: 0, from: { x: 700, y: 440 }, to: { x: 940, y: 480 } }, least)).toBeLessThanOrEqual(WITHIN)
    pick(other, 1)
    expect(layAndWait(other, { kind: 1, from: { x: 560, y: 560 }, to: { x: 960, y: 560 } }, least)).toBeLessThanOrEqual(WITHIN)
    expect(least.room).toBeGreaterThanOrEqual(0)
  })
  it('a first river is swum, and not only sat in: of thirteen rivers, each in a fresh town, the duck swims more than half of each within a minute', () => {
    const rivers = [[560, 560, 960, 560], [300, 420, 700, 120], [600, 420, 900, 660], [700, 380, 960, 420], [300, 560, 500, 680], [650, 120, 960, 200], [280, 660, 700, 660], [590, 480, 900, 480], [500, 400, 500, 600], [650, 120, 650, 560], [760, 150, 700, 600], [420, 420, 940, 520], [900, 400, 600, 560]]
    const short: string[] = []
    let whole = 0
    for (const [ax, ay, bx, by] of rivers) {
      const town = new Town(freshTown(3), 1)
      pick(town, 1)
      drag(town, { x: ax, y: ay }, { x: bx, y: by })
      const strip = town.state.strips[town.state.strips.length - 1]
      let low = Infinity, high = -Infinity
      run(town, 60, [], () => {
        const doing = town.bodies.duck.doing
        if (doing.is === 'ride' && doing.kind === 1) { low = Math.min(low, doing.rider.d); high = Math.max(high, doing.rider.d) }
      })
      // What it can swim: the river less a duck, which turns half its length short of each end.
      const can = lengthOf(strip) - TOY_SIZE.duck.long + 16, swum = high - low
      if (!(swum > can / 2)) short.push(`${ax},${ay} to ${bx},${by}: ${swum.toFixed(0)} of ${can.toFixed(0)}`)
      if (swum > can - 2) whole++
    }
    expect(short).toEqual([])
    expect(whole).toBeGreaterThanOrEqual(11)
  })
})
