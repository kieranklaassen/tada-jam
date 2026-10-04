import { describe, expect, it } from 'vitest'
import { REFERENCE, layoutOf } from './layout'
import type { Live } from './live'
import { POSES, poseLive, poseView } from './livePoses'
import { spikePage } from './spikePage'

/** A Live as plain data, maps and all, so two can be compared. */
const plain = (live: Live | null) => JSON.stringify(live, (_key, value) => (value instanceof Map ? [...value.entries()] : value))

describe('the named moments of the page in motion', () => {
  const view = spikePage(), layout = layoutOf(REFERENCE.w, REFERENCE.h)
  const all = POSES.map((name) => poseLive(name, poseView(name, view), layout, 2)!)

  it('names the moments the stills are taken of', () => {
    for (const name of ['dust', 'pod', 'burst', 'grow', 'hop', 'beetle-flip', 'beetle-gold', 'worm', 'glow', 'hand', 'carry-pot', 'packet']) expect(POSES).toContain(name)
    for (const name of ['visitor-in', 'like', 'miss-snail-up', 'miss-snail-back', 'bee', 'moth', 'ladybird', 'ant', 'bee-land', 'wish-roll', 'wish-open', 'wish-three', 'given', 'settled', 'tools', 'pour', 'blot', 'beads', 'buds', 'sketches', 'beetle-umbrella', 'beetle-dig', 'fence', 'beetle-lug', 'beetle-towed']) expect(POSES).toContain(name)
    expect(new Set(POSES).size).toBe(POSES.length)
  })

  it('gives each moment the page it is shown on, and the page as it is for any other name', () => {
    for (const name of [null, '', 'dust', 'nothing', 'toString', '__proto__']) expect(poseView(name, view)).toBe(view)
    for (const kind of ['bee', 'moth', 'ladybird', 'ant'] as const) {
      const shown = poseView(kind, view)
      expect(shown.visitor?.kind).toBe(kind)
      expect(Object.keys(shown.visitor!.wish)).toHaveLength(4)
      expect(poseLive(kind, shown, layout, 2)!.visitor).toMatchObject({ kind, part: 1, part2: 0.6 })
    }
    expect(poseView('wish-roll', view).visitor?.big).toBeTruthy()
    expect(poseView('wish-three', view).visitor?.count).toBe(3)
    expect(poseView('given', view).visitor).toMatchObject({ count: 3, given: [{}, {}] })
    expect(poseView('settled', view).visitor?.settled).toBe(true)
    expect(poseView('tools', view).tools).toBe(true)
    expect(poseView('sketches', view).sketched).toHaveLength(5)
    // Nothing of the page it was given is changed.
    expect(JSON.stringify(view)).toBe(JSON.stringify(spikePage()))
  })

  it('shows every new field of Live between them', () => {
    const visitors = all.flatMap((live) => (live.visitor ? [live.visitor] : []))
    for (const kind of ['snail', 'bee', 'moth', 'ladybird', 'ant']) expect(visitors.some((visitor) => visitor.kind === kind)).toBe(true)
    expect(visitors.some((visitor) => visitor.turn > 2)).toBe(true)
    expect(visitors.some((visitor) => visitor.lift > 0 && visitor.part2 === 1)).toBe(true)
    expect(all.some((live) => live.waiting !== null && live.waiting.lift > 0)).toBe(true)
    expect(all.some((live) => live.wish.big === 1 && live.wish.shake !== 0)).toBe(true)
    expect(all.some((live) => live.can !== null && live.can.tip > 0.5 && live.motes.some((mote) => mote.wet) && live.puffs.some((puff) => puff.kind === 'splash'))).toBe(true)
    expect(all.some((live) => live.blotter !== null)).toBe(true)
    const noted = all.find((live) => live.loupe !== null && live.beads !== null)!
    expect(noted.beads!.pairs.map((pair) => pair.trait)).toEqual(['colour', 'height', 'leaf', 'petals'])
    expect(noted.beads!.pairs.filter((pair) => pair.hidden)).toHaveLength(2)
    expect(all.some((live) => [...live.buds.values()].some((bud) => bud.boing !== 0) && [...live.buds.values()].some((bud) => bud.curl === 1))).toBe(true)
    expect(all.some((live) => live.sketching > 0 && live.sketching < 1)).toBe(true)
    expect(all.some((live) => live.beetle.cases === 1)).toBe(true)
    expect(all.some((live) => live.beetle.sink > 0.5 && live.beetle.at !== null)).toBe(true)
    expect(all.some((live) => live.fence !== null && live.fence.up === 1)).toBe(true)
    expect(all.some((live) => live.beetle.turned && live.beetle.at !== null && [...live.plants.values()].filter((plant) => plant.at !== null && plant.at.y < live.beetle.at!.y).length >= 3)).toBe(true)
    expect(all.some((live) => live.tow !== null && live.beetle.flip > 0 && live.beetle.flip < 0.5)).toBe(true)
  })

  it('gives a Live for every name, and none for a name it does not know', () => {
    for (const name of POSES) expect(poseLive(name, view, layout, 2)).not.toBeNull()
    for (const name of [null, '', 'nothing', 'toString', 'constructor', '__proto__']) expect(poseLive(name, view, layout, 2)).toBeNull()
  })

  it('gives the same Live for the same inputs, at any size and with no time', () => {
    for (const name of POSES) {
      expect(plain(poseLive(name, spikePage(), layoutOf(REFERENCE.w, REFERENCE.h), 2))).toBe(plain(poseLive(name, view, layout, 2)))
      expect(plain(poseLive(name, view, layoutOf(820, 1180), 2))).toBe(plain(poseLive(name, view, layoutOf(820, 1180), 2)))
      expect(plain(poseLive(name, view, layout, Number.NaN))).toBe(plain(poseLive(name, view, layout, 0)))
    }
  })

  it('holds only numbers that can be drawn', () => {
    const numbers = (value: unknown): number[] => (typeof value === 'number' ? [value] : value instanceof Map ? numbers([...value.values()]) : value && typeof value === 'object' ? Object.values(value).flatMap(numbers) : [])
    for (const live of all) {
      expect(numbers(live).length).toBeGreaterThan(8)
      for (const value of numbers(live)) expect(Number.isFinite(value)).toBe(true)
    }
  })

  it('draws on a bare page too: a pose places things only by plants and places that are there', () => {
    const bare = { ...view, plants: [], packets: [], pods: [], worm: null }
    for (const name of POSES) expect(poseLive(name, poseView(name, bare), layout, 2)).not.toBeNull()
  })

  it('shows every field of Live between them', () => {
    const plants = all.flatMap((live) => [...live.plants.values()]), pots = all.flatMap((live) => [...live.pots.values()]), puffs = all.flatMap((live) => live.puffs)
    expect(plants.some((plant) => plant.grow > 0 && plant.grow < 0.2)).toBe(true)
    expect(plants.some((plant) => plant.grow > 0.9 && plant.grow < 1)).toBe(true)
    expect(plants.some((plant) => plant.bend !== 0)).toBe(true)
    expect(plants.some((plant) => plant.squash < 1)).toBe(true)
    expect(plants.some((plant) => plant.at !== null && !plant.held && plant.at.k < layout.k)).toBe(true)
    expect(plants.some((plant) => plant.held)).toBe(true)
    const pods = all.flatMap((live) => live.pods)
    expect(pods.some((pod) => pod.swell < 1)).toBe(true)
    expect(pods.some((pod) => pod.swell > 1 && pod.shake !== 0)).toBe(true)
    expect(Math.max(...all.map((live) => live.seeds.length))).toBeGreaterThanOrEqual(4)
    expect(Math.max(...all.map((live) => live.motes.length))).toBeGreaterThan(60)
    for (const kind of ['soil', 'pop', 'sneeze']) expect(puffs.some((puff) => puff.kind === kind)).toBe(true)
    expect(pots.some((pot) => pot.at !== null)).toBe(true)
    expect(pots.some((pot) => pot.at === null && pot.squash < 1)).toBe(true)
    expect(all.some((live) => [...live.packets.values()].some((packet) => packet.shake !== 0 && packet.spin !== 0))).toBe(true)
    const beetles = all.map((live) => live.beetle)
    expect(beetles.some((beetle) => beetle.flip === 1 && beetle.pedal > 0)).toBe(true)
    expect(beetles.some((beetle) => beetle.at !== null && beetle.gold > 0 && beetle.sneeze > 0 && beetle.loupe !== 0)).toBe(true)
    expect(all.some((live) => live.prints.length > 3)).toBe(true)
    expect(all.some((live) => live.worm !== null && live.worm.cap && live.worm.rise > 0.5)).toBe(true)
    expect(all.some((live) => live.glow.strength === 1 && live.glow.rings.length >= 11)).toBe(true)
    expect(all.some((live) => live.hand !== null && live.hand.opacity > 0 && live.glow.strength > 0)).toBe(true)
  })

  it('throws the six seeds of a burst towards six different pots, two of them already down', () => {
    const burst = poseLive('burst', view, layout, 2)!
    expect(burst.seeds).toHaveLength(4)
    expect(burst.puffs.filter((puff) => puff.kind === 'soil')).toHaveLength(2)
    expect(new Set(burst.seeds.map((seed) => Math.round(seed.x))).size).toBe(4)
    expect(burst.puffs.filter((puff) => puff.kind === 'pop')).toHaveLength(1)
  })
})
