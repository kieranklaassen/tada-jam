import { describe, expect, it } from 'vitest'
import { SPRITE_SIZE } from './art'
import { TIERS } from './config'
import type { Guidance } from './guidance'
import { BOX, CAT, OUT_PLACE, ROLLS, TOY_IDS } from './layout'
import { freshTown } from './save'
import { STAGE } from './stage'
import { storm, strip, townWith } from './bench'
import { rideOn } from './going'
import { Town } from './town'
import { View } from './view'

// The frame budget of a canvas game. Its draw count is every stamp of a layer
// or a sprite onto the surface plus every live fill or stroke, and the view
// counts them where it makes them. Here the view paints onto a surface that
// only counts, and the two numbers are held to each other and to the budget:
// under about 80 a frame, one full-surface stamp, and nothing baked again
// while nothing that is baked has changed.

type Counts = { stamps: number; fills: number; strokes: number; full: number }
type Fake = HTMLCanvasElement & { counts: Counts }

const DRAWS = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'drawImage', 'putImageData'])

/** A canvas whose context draws nothing and counts what would have reached it. */
function fakeCanvas(): Fake {
  const counts: Counts = { stamps: 0, fills: 0, strokes: 0, full: 0 }
  const canvas = { width: 0, height: 0, counts } as unknown as Fake
  const shade = { addColorStop: () => {} }
  const held: Record<string | symbol, unknown> = {}
  const context = new Proxy(held, {
    get(_, name) {
      if (name === 'canvas') return canvas
      if (name === 'drawImage') return (source: { width: number }) => { counts.stamps++; if (source.width === canvas.width) counts.full++ }
      if (name === 'fill' || name === 'fillRect' || name === 'fillText') return () => { counts.fills++ }
      if (name === 'stroke' || name === 'strokeRect' || name === 'strokeText') return () => { counts.strokes++ }
      if (name === 'createLinearGradient' || name === 'createRadialGradient' || name === 'createPattern') return () => shade
      if (name === 'measureText') return () => ({ width: 0 })
      if (name in held) return held[name]
      return () => {}
    },
    set(_, name, value) { held[name] = value; return true },
  })
  ;(canvas as unknown as { getContext: () => unknown }).getContext = () => context
  return canvas
}

const total = (counts: Counts): number => counts.stamps + counts.fills + counts.strokes

function rig(age: number | null = 3) {
  const made: Fake[] = []
  const view = new View(() => { const canvas = fakeCanvas(); made.push(canvas); return canvas })
  const surface = fakeCanvas()
  surface.width = STAGE.width * 2
  surface.height = STAGE.height * 2
  const g = surface.getContext('2d') as CanvasRenderingContext2D
  const town = new Town(freshTown(age), 1)
  const baked = (): number => made.reduce((sum, canvas) => sum + total(canvas.counts), 0)
  const paint = (guidance: Guidance | null = null, tier = TIERS[0], dpr = tier.dpr): { said: number; drew: number; full: number } => {
    const before = { ...surface.counts }
    const said = view.paint(g, STAGE.width, STAGE.height, dpr, town, guidance, tier)
    return { said, drew: total(surface.counts) - total(before), full: surface.counts.full - before.full }
  }
  return { view, town, made, surface, g, paint, baked }
}

const DT = 1 / 60
/** The draw number: no frame of the game is heavier than this, and this is under the 80 of the quality bar. */
const HEAVIEST = 78

describe('the draw count', () => {
  it('names what the surface cannot count by itself', () => {
    expect([...DRAWS]).toContain('drawImage')
  })

  it('is what really reached the surface, frame by frame, through a busy stretch of play', () => {
    const { town, paint } = rig()
    const glow: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
    let most = 0, frames = 0
    const frame = (guidance: Guidance | null = null): void => {
      town.step(DT)
      town.takeSounds()
      const { said, drew, full } = paint(guidance)
      expect(said, `frame ${frames}`).toBe(drew)
      expect(full).toBe(1)
      most = Math.max(most, said)
      frames++
    }
    for (let f = 0; f < 30; f++) frame(glow)
    // Three strips laid one straight after another, so that their presses overlap, with a strip in the hand.
    for (const y of [470, 520, 600]) {
      town.press({ x: 620, y: y - 40 })
      for (let x = 620; x <= 960; x += 34) { town.move({ x, y }); frame() }
      town.lift()
    }
    town.press({ x: 660, y: 120 })
    town.move({ x: 940, y: 150 })
    // Every toy tapped at once, the cat, the basket and the plant too, and knocks on the boards, while the car drives.
    for (const id of TOY_IDS) { town.bodies[id].tappedAt = town.time; town.bodies[id].landedAt = town.time }
    town.catAt = town.basketAt = town.plantAt = town.honkAt = town.ripAt = town.time
    for (let k = 0; k < 4; k++) town.puff('knock', 1100, 700 + k)
    for (let f = 0; f < 90; f++) frame()
    town.lift()
    for (let f = 0; f < 600; f++) frame(f > 300 ? glow : null)
    // The box stood up and tipped out again.
    for (let k = 0; k < 2; k++) {
      town.press({ x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 })
      town.lift()
      for (let f = 0; f < 300; f++) frame()
    }
    // And a child at play for two minutes: every tape, toys carried, peels, taps and the box, from three seeds.
    for (const seed of [2, 9, 31]) storm(town, seed, 40, () => {
      town.takeSounds()
      const { said, drew, full } = paint(frames % 600 > 400 ? glow : null)
      expect(said, `frame ${frames}`).toBe(drew)
      expect(full).toBe(1)
      most = Math.max(most, said)
      frames++
    })
    expect(frames).toBeGreaterThan(8000)
    // The budget of the quality bar: under about 80 a frame at the heaviest.
    expect(most).toBeLessThanOrEqual(HEAVIEST)
    expect(most).toBeGreaterThan(30)
  })

  /**
   * The heaviest floor there is: a river under three roads with the duck, the car and the bus afloat and hidden
   * under the three bridges, a rail across the same three roads with the arms of all three level crossings part
   * way down, every toy tapped and landing, the cat, the basket and the plant moving, knocks on the boards.
   * `hand` then puts tape in the hand, and the heaviest frame of the next fifty is the answer.
   */
  function heaviest(hand: (town: Town) => void): number {
    const strips = [strip(1, 300, 250, 950, 250), strip(0, 400, 112, 400, 640), strip(0, 620, 112, 620, 640), strip(0, 840, 112, 840, 640), strip(3, 300, 520, 950, 520)]
    const town = townWith(strips, { duck: { x: 400, y: 250, a: 0 }, car: { x: 620, y: 250, a: 0 }, bus: { x: 840, y: 250, a: 0 }, train: { x: 500, y: 520, a: 0 }, dog: { x: 520, y: 380, a: 0 }, pegA: { x: 300, y: 400, a: 0 }, pegB: { x: 720, y: 400, a: 0 }, pegC: { x: 930, y: 400, a: 0 } })
    const afloat = [['duck', 100, 'swim'], ['car', 320, 'float'], ['bus', 540, 'sail']] as const
    for (const [id, d, gait] of afloat) { town.bodies[id].doing = rideOn(1, { s: 0, d, dir: 1, skip: -1 }, gait); town.bodies[id].hidden = true }
    const levels = town.crossings.filter((crossing) => crossing.kind === 'level')
    expect(levels).toHaveLength(3)
    const view = new View(() => fakeCanvas())
    const surface = fakeCanvas()
    surface.width = STAGE.width * 2
    surface.height = STAGE.height * 2
    const g = surface.getContext('2d') as CanvasRenderingContext2D
    hand(town)
    for (const id of TOY_IDS) { town.bodies[id].tappedAt = town.time; town.bodies[id].landedAt = town.time }
    town.catAt = town.basketAt = town.plantAt = town.honkAt = town.ripAt = town.time
    for (let k = 0; k < 4; k++) town.puff('knock', 1100, 700 + k)
    let most = 0, under = 0
    for (let f = 0; f < 50; f++) {
      town.step(DT)
      town.takeSounds()
      // The arms of all three crossings are part way down, further each frame.
      town.gates = levels.map((crossing) => ({ low: crossing.low, high: crossing.high, shutAt: town.time, openAt: -Infinity, down: [((f % 18) + 1) / 19, ((f % 18) + 1) / 19] }))
      const before = total(surface.counts)
      const said = view.paint(g, STAGE.width, STAGE.height, TIERS[0].dpr, town, null, TIERS[0])
      expect(said).toBe(total(surface.counts) - before)
      if (said > most) under = afloat.filter(([id]) => town.bodies[id].hidden).length
      most = Math.max(most, said)
    }
    expect(under).toBe(3)
    return most
  }

  /** A strip pulled off the roll along the bottom of the floor and held. */
  const pull = (town: Town): void => { town.press({ x: 300, y: 660 }); town.move({ x: 560, y: 660 }) }
  /** As many strips laid one straight after another, so that the press is still running along each of them. */
  const lay = (count: number) => (town: Town): void => {
    for (let k = 0; k < count; k++) { town.press({ x: 320 + k * 210, y: 600 + k * 20 }); town.move({ x: 500 + k * 210, y: 610 + k * 20 }); town.lift() }
    expect(town.pressings).toHaveLength(count)
  }

  it('is under the budget at its heaviest: three toys afloat under three bridges, the gates of three crossings moving, every toy tapped, and tape in the hand in every way there is', () => {
    const numbers = {
      // A strip in the hand, coming off the roll.
      pull: heaviest(pull),
      // An end of a strip in the hand, being peeled: the river, so that the three bridges go with it.
      peel: heaviest((town) => { town.press({ x: 304, y: 250 }); town.move({ x: 360, y: 250 }) }),
      // An end of a road that is a bridge and a level crossing, lifted and held.
      lifted: heaviest((town) => { town.press({ x: 400, y: 636 }); town.move({ x: 400, y: 560 }) }),
      // One, two and three strips still being pressed flat, and one more in the hand.
      pressed: heaviest((town) => { lay(1)(town); pull(town) }),
      pressedTwice: heaviest((town) => { lay(2)(town); pull(town) }),
      pressedThrice: heaviest((town) => { lay(3)(town); pull(town) }),
    }
    // The draw number of the game: the heaviest frame there is.
    expect(numbers).toEqual({ pull: 59, peel: 64, lifted: 64, pressed: 66, pressedTwice: 72, pressedThrice: 78 })
    expect(Math.max(...Object.values(numbers))).toBe(HEAVIEST)
    expect(HEAVIEST).toBeLessThan(80)
  })

  it('is no heavier at a lower tier, and the lowest tier drops the drifting leaf shadows', () => {
    const { town, paint } = rig()
    town.step(DT)
    const counts = TIERS.map((tier) => paint(null, tier).said)
    for (let k = 1; k < counts.length; k++) expect(counts[k]).toBeLessThanOrEqual(counts[k - 1])
    // The leaf shadows are one fill together, and the lowest tier has none.
    expect(counts[counts.length - 1]).toBe(counts[0] - 1)
  })

  it('is one stamp of the room while the saved town is still being read', () => {
    const { view, g } = rig()
    expect(view.paint(g, STAGE.width, STAGE.height, 2, null, null, TIERS[0])).toBe(1)
  })

  it('paints nothing on a surface with no size', () => {
    const { view, g, town } = rig()
    expect(view.paint(g, 0, 0, 2, town, null, TIERS[0])).toBe(0)
  })
})

describe('what is baked', () => {
  it('is baked once: a frame in which no strip was pressed flat draws into no layer and makes none', () => {
    const { town, paint, made, baked } = rig()
    town.step(DT)
    paint()
    const layers = made.length, drawn = baked()
    for (let f = 0; f < 240; f++) { town.step(DT); paint() }
    expect(made.length).toBe(layers)
    expect(baked()).toBe(drawn)
  })

  it('is the floor again when a strip is pressed flat, and only then', () => {
    const { town, paint, made, baked } = rig(7)
    town.step(DT)
    paint()
    town.press({ x: 640, y: 300 })
    town.move({ x: 900, y: 320 })
    paint()
    const layers = made.length, inHand = baked()
    town.lift()
    paint()
    // Torn: the strip leaves the hand and is drawn live while the press runs along it.
    const torn = baked()
    for (let f = 0; f < 8; f++) { town.step(DT); paint() }
    expect(town.pressings).toHaveLength(1)
    expect(baked()).toBe(torn)
    for (let f = 0; f < 40; f++) { town.step(DT); paint() }
    expect(town.pressings).toHaveLength(0)
    expect(baked()).toBeGreaterThan(torn)
    expect(torn).toBeGreaterThanOrEqual(inHand)
    expect(made.length).toBe(layers)
    const flat = baked()
    for (let f = 0; f < 120; f++) { town.step(DT); paint() }
    expect(baked()).toBe(flat)
  })

  it('never makes more than two layers and one sprite of each kind, however long the play', () => {
    const { town, paint, made } = rig()
    const glow: Guidance = { glow: 1, demo: 0.4, demoIndex: 0 }
    for (let k = 0; k < 3; k++) {
      town.press({ x: BOX.x + BOX.w / 2, y: BOX.y + BOX.h / 2 })
      town.lift()
      for (let f = 0; f < 320; f++) { town.step(DT); paint(f % 2 ? glow : null) }
      town.press(ROLLS[k])
      town.lift()
      town.press({ x: CAT.x, y: CAT.y })
      town.lift()
      town.press(OUT_PLACE.duck)
      town.lift()
    }
    expect(made.length).toBeLessThanOrEqual(2 + Object.keys(SPRITE_SIZE).length)
    const full = made.filter((canvas) => canvas.width === STAGE.width * 2)
    expect(full).toHaveLength(2)
  })

  it('is baked again at a new size, and the count stays the surface\'s own', () => {
    const { town, view, g, surface, made } = rig()
    town.step(DT)
    view.paint(g, STAGE.width, STAGE.height, 2, town, null, TIERS[0])
    const first = made.length
    surface.width = 800
    surface.height = 1200
    const before = total(surface.counts)
    const said = view.paint(g, 400, 600, 2, town, null, TIERS[0])
    expect(said).toBe(total(surface.counts) - before)
    expect(made.length).toBeGreaterThan(first)
  })
})
