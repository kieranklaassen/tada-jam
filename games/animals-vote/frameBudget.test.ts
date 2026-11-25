import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import type { Guidance } from './guidance'
import { BELL } from './layout'
import { surface, type Ctx } from './mosaic'
import { Play } from './play'
import { deserialize } from './save'
import { ANIMALS, SNACKS, THINGS, TASTES, type Animal, type Thing } from './things'
import { tapAnimal } from './town'
import { DRAW_LIMIT, View } from './view'

// Counted and not timed, so it holds on a busy runner. Every result, single,
// double and triple, with everybody in town and the guidance showing.

let draws = 0
const DRAWS = new Set(['drawImage', 'fill', 'stroke', 'fillRect', 'strokeRect'])
const pen = (counting: boolean): Ctx => new Proxy({} as Record<string, unknown>, {
  get: (o, k: string) => k in o ? o[k] : (...args: unknown[]) => {
    if (args.some((a) => typeof a === 'number' && !Number.isFinite(a))) throw new Error(`${k} was given a number that is not one`)
    if (counting && DRAWS.has(k)) draws++
  },
  set: (o, k: string, v) => {
    if (counting && (k === 'shadowBlur' || k === 'filter' || k === 'globalCompositeOperation')) throw new Error(`${k} in a frame`)
    o[k] = v
    return true
  },
}) as unknown as Ctx
const real = surface.make
beforeAll(() => { surface.make = () => ({ canvas: {} as CanvasImageSource, ctx: pen(false) }) })
afterAll(() => { surface.make = real })
const GUIDED: Guidance = { glow: 1, demo: 0.5, demoIndex: 1 }
const hated = (who: Animal): Thing => TASTES[who][4]

/** A town in which exactly these are level and tallest. */
function townFor(won: readonly Thing[]) {
  const ballot = [...won, ...THINGS.filter((t) => !won.includes(t))].slice(0, Math.max(2, won.length)) as Thing[]
  const columns: Animal[][] = [[], [], []]
  const each = won.length === 1 ? 6 : 6 / won.length
  for (const who of ANIMALS) {
    const col = won.length === 1 ? (hated(who) === ballot[0] ? 1 : 0) : [0, 1, 2].slice(0, won.length).filter((c) => hated(who) !== ballot[c] && columns[c].length < each).sort((a, b) => columns[a].length - columns[b].length)[0] ?? 0
    columns[col].push(who)
  }
  return deserialize({ v: 1, position: 'both-at-once', count: 6, ballot: [ballot[0], ballot[1], ballot[2] ?? null], columns }, null)
}

describe('frame budget', () => {
  it('says what it draws and stays within the limit, whatever happens', () => {
    const view = new View(), ctx = pen(true)
    view.sized(1, 0, 0, 1180, 820)
    let most = 0, at = ''
    const sets: Thing[][] = THINGS.flatMap((a, i) => [[a], ...THINGS.slice(i + 1).map((b) => [a, b])])
    sets.push(['mud', 'fly', 'sleep'], ['bath', 'mud', 'dance'], ['bath', 'fly', 'sleep'])
    for (const won of sets) {
      const v = new View(), play = new Play(townFor(won))
      Object.assign(v, { still: (view as unknown as { still: unknown }).still })
      for (const snack of SNACKS) play.town.snacks[snack] = null
      const frame = () => {
        for (const p of play.pokes.splice(0)) v.poke(p)
        for (const c of play.cues.splice(0)) v.cue(c)
        for (const e of play.events.splice(0)) v.notice(e)
        draws = 0
        v.draw(ctx, play, GUIDED)
        if (draws !== v.stamps.count) throw new Error(`${won.join()}: the view says ${v.stamps.count} and drew ${draws}`)
        if (draws > most) { most = draws; at = `${won.join()} at ${play.show?.t.toFixed(1)}` }
      }
      const run = (seconds: number) => { for (let t = 0; t < seconds; t += 1 / 20) { play.advance(1 / 20, 0); v.advance(play, 1 / 20); frame() } }
      run(0.3)
      play.down(1, BELL, 0); play.up(1, BELL, 1)
      expect(play.show!.result.won.length, won.join()).toBeGreaterThanOrEqual(1)
      run(play.show!.end + 1)
      for (const who of ANIMALS) { play.events.push(...tapAnimal(play.town, who)); play.events.push({ type: 'bait', snack: 'bun', col: 0 }); run(0.2) }
    }
    console.info(`animals-vote frame budget: most draws ${most} (${at})`)
    expect(most, at).toBeLessThanOrEqual(DRAW_LIMIT)
  })
})
