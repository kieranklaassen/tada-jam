import { describe, expect, it } from 'vitest'
import { BALL, ICICLE, ON_BANK_Y, restOf, type Rest } from './blocks'
import { TIERS } from './config'
import { BERRY, firstWorld } from './first'
import { BLOCK_H, SCOOPS, type Hole } from './ground'
import { faults, frame, letGo, moveTo, press, pullSun, toNight } from './testing'
import { STEP, Toy, type World } from './toy'
import { LAYERS_PER_SIZE, View } from './view'

// The frame budget, counted and never timed, so that it holds on a busy
// machine: the cost of a canvas frame is set by how much it draws, and a
// count is the same everywhere. The real toy is played and every frame is
// painted by the real view onto a surface that only counts.
//
// The count is the game's draw count as the bar has it for a canvas game:
// stamps of a layer, plus live fills, plus live strokes. One frame stays
// under 80 of them in every state the tests reach: the first visit with the
// idle ladder showing, the fullest clearing a save can hold with a cut being
// made and everyone reacting, the night with every lamp lit, and both scenes
// from their first frame to their last.

const BAR = 80

type Count = { fills: number; strokes: number; stamps: number; text: number }
function surface(count: Count): CanvasRenderingContext2D {
  const state: Record<string, unknown> = {}
  return new Proxy(state, {
    get(target, name) {
      if (typeof name !== 'string') return undefined
      if (name in target) return target[name]
      return () => {
        if (name === 'fill' || name === 'fillRect') count.fills++
        if (name === 'stroke' || name === 'strokeRect') count.strokes++
        if (name === 'fillText' || name === 'strokeText') count.text++
        if (name === 'drawImage') count.stamps++
        if (name === 'createPattern') return {}
        return undefined
      }
    },
    set(target, name, value) { if (typeof name === 'string') target[name] = value; return true },
  }) as unknown as CanvasRenderingContext2D
}

function stage() {
  const layer: Count = { fills: 0, strokes: 0, stamps: 0, text: 0 }, frame: Count = { fills: 0, strokes: 0, stamps: 0, text: 0 }
  const view = new View(() => ({ width: 0, height: 0, getContext: () => surface(layer) }) as unknown as HTMLCanvasElement)
  return { view, layer, frame, g: surface(frame) }
}

/**
 * The fullest clearing: a palace of every kind of thing with two hollows for lamps, things lying on the ice
 * and the snow, icicles frozen into the pond, holes all over it, the drift dug out and the bough plucked bare.
 */
function fullest(night = false): World {
  const row = (n: number): number => ON_BANK_Y - n * BLOCK_H
  const blocks: Rest[] = [{ ...BERRY }]
  for (const x of [260, 420, 580, 740]) blocks.push(restOf('clear', 76, x, row(0), 'built'))
  for (const x of [340, 660]) blocks.push(restOf('cloudy', 236, x, row(1), 'built'))
  const kinds = ['clear', 'cloudy', 'snow'] as const
  for (let n = 2; n < 5; n++) [262, 340, 418, 582, 660, 738].forEach((x, i) => blocks.push(restOf(kinds[(n + i) % 3], 76, x, row(n), 'built')))
  blocks.push(restOf('icicle', ICICLE, 262, row(5), 'built'), restOf('ball', BALL, 660, row(5), 'built'))
  const holes: Hole[] = []
  for (let i = 0; i < 12; i++) holes.push({ x: 300 + (i % 6) * 100, y: 640 + Math.floor(i / 6) * 80, angle: 0, len: 80 })
  for (let i = 0; i < 6; i++) blocks.push(restOf(kinds[i % 3], 70, 300 + i * 100, 580, 'lying'))
  blocks.push(restOf('icicle', ICICLE, holes[0].x, holes[0].y, 'frozen'), restOf('icicle', ICICLE, holes[7].x, holes[7].y, 'frozen'))
  return { night, blocks, holes, drift: SCOOPS, icicles: [0, 1, 2, 3, 4] }
}

const SHOWING = (i: number) => ({ glow: 1, demo: (i % 180) / 180, demoIndex: Math.floor(i / 180) })

describe('the frame budget', () => {
  it('paints the place alone, with one stamp, before the save has been read', () => {
    const { view, frame, g } = stage()
    expect(view.paint(g, 1180, 820, 2, null, null, 0, TIERS[0])).toBe(1)
    expect(frame).toMatchObject({ stamps: 1, fills: 0, strokes: 0 })
  })

  it('makes its layers once for a size and never again: what does not move is one stamp, and each character’s still parts are its own sprites', () => {
    const { view, g } = stage()
    const toy = new Toy(fullest(), 1)
    view.paint(g, 1180, 820, 2, toy, null, 0, TIERS[0])
    expect(view.layers).toBe(LAYERS_PER_SIZE)
    for (let i = 0; i < 240; i++) {
      frame(toy)
      view.paint(g, 1180, 820, 2, toy, SHOWING(i), STEP, TIERS[0])
    }
    toNight(toy)
    for (let i = 0; i < 60; i++) view.paint(g, 1180, 820, 2, toy, null, STEP, TIERS[0])
    expect(view.layers).toBe(LAYERS_PER_SIZE)
    // A new size makes them again, once.
    view.paint(g, 1024, 768, 2, toy, null, STEP, TIERS[0])
    view.paint(g, 1024, 768, 2, toy, null, STEP, TIERS[0])
    expect(view.layers).toBe(LAYERS_PER_SIZE * 2)
  })

  it('counts what it draws: the number it reports is the stamps, fills and strokes that reached the surface, and none of it is writing', () => {
    for (const night of [false, true]) {
      const { view, frame, g } = stage()
      const toy = new Toy(fullest(night), 1)
      view.paint(g, 1180, 820, 2, toy, null, 0, TIERS[0])
      frame.fills = 0; frame.strokes = 0; frame.stamps = 0
      const reported = view.paint(g, 1180, 820, 2, toy, { glow: 1, demo: 0.5, demoIndex: 0 }, STEP, TIERS[0])
      expect(reported).toBe(frame.fills + frame.strokes + frame.stamps)
      expect(frame.text).toBe(0)
    }
  })

  it('stays under the bar at rest, on a first visit, with the idle ladder showing', () => {
    const { view, g } = stage()
    const toy = new Toy(firstWorld(null), 1)
    let worst = 0
    for (let i = 0; i < 60 * 12; i++) {
      frame(toy)
      worst = Math.max(worst, view.paint(g, 1180, 820, 2, toy, SHOWING(i), STEP, TIERS[0]))
    }
    expect(worst).toBeLessThan(BAR)
  })

  it('stays under the bar in the fullest clearing by day and by night, with a cut being made, a thing going under, a scoop in the hand and everyone reacting', () => {
    for (const night of [false, true]) {
      const world = fullest(night)
      expect(faults(world)).toEqual([])
      const { view, g } = stage()
      const toy = new Toy(world, 1)
      if (night) expect(toy.nightNow.lamps.length).toBeGreaterThanOrEqual(2)
      if (night) expect(toy.nightNow.patches.length).toBeGreaterThan(6)
      let worst = 0
      const paint = (frames: number) => {
        for (let i = 0; i < frames; i++) {
          frame(toy)
          worst = Math.max(worst, view.paint(g, 1180, 820, 2, toy, SHOWING(i), STEP, TIERS[0]))
        }
      }
      paint(30)
      for (const [x, y] of [[1034, 330], [90, 400], [80, 740], [toy.bird.x, toy.bird.y], [1100, 660]]) { press(toy, x, y); letGo(toy) }
      paint(20)
      // A block into the water, and a line across what ice is left while the splash is in the air.
      press(toy, 300, 580)
      moveTo(toy, 300, 640)
      letGo(toy)
      paint(8)
      press(toy, 250, 600)
      moveTo(toy, 330, 600)
      paint(40)
      letGo(toy)
      paint(120)
      // A thing let go high over the bank falls and lands with its puff of snow.
      press(toy, 400, 580)
      moveTo(toy, 500, 180)
      paint(10)
      letGo(toy)
      paint(120)
      expect(worst, night ? 'by night' : 'by day').toBeLessThan(BAR)
      expect(worst).toBeGreaterThan(20)
    }
  })

  it('stays under the bar through both scenes, from the frame the sun is let go to the frame the scene ends: the night coming down, the skating, each lamp, the king walking in; and the morning with its snowfall', () => {
    const { view, g } = stage()
    const toy = new Toy(fullest(), 1)
    let worst = 0, ran = 0
    const through = (): void => {
      let frames = 0
      while (toy.sceneRunning && frames++ < 60 * 30) {
        frame(toy)
        ran++
        worst = Math.max(worst, view.paint(g, 1180, 820, 2, toy, null, STEP, TIERS[0]))
      }
      expect(toy.sceneRunning).toBe(false)
    }
    pullSun(toy, true)
    expect(toy.sceneRunning).toBe(true)
    through()
    expect(toy.night).toBe(true)
    for (let i = 0; i < 120; i++) { frame(toy); worst = Math.max(worst, view.paint(g, 1180, 820, 2, toy, SHOWING(i), STEP, TIERS[0])) }
    pullSun(toy, false)
    expect(toy.sceneRunning).toBe(true)
    through()
    expect(toy.night).toBe(false)
    // The snow that the morning brings is still in the air after the scene.
    for (let i = 0; i < 240; i++) { frame(toy); worst = Math.max(worst, view.paint(g, 1180, 820, 2, toy, null, STEP, TIERS[0])) }
    expect(ran).toBeGreaterThan(240)
    expect(worst).toBeLessThan(BAR)
  })

  it('stays under the bar in what the characters do at night: King Winter in by a gap and behind the wall, his foot on a block, his fall, the lamp child round the bank with its nose on lit ice and rapping on snow; and by day with the hare out and a splash’s drops in the air', () => {
    const row = (n: number): number => ON_BANK_Y - n * BLOCK_H
    const gate = (kind: 'clear' | 'snow'): Rest[] => [restOf(kind, 64, 400, row(0), 'built'), restOf(kind, 64, 560, row(0), 'built'), restOf(kind, 224, 480, row(1), 'built')]
    const lying = [0, 1, 2, 3].map((i) => restOf(i % 2 ? 'cloudy' : 'clear', 80, 320 + i * 120, 590, 'lying'))
    const worlds: [string, World][] = [
      ['a gate', { night: false, blocks: [{ ...BERRY }, ...gate('clear'), restOf('clear', 150, 740, row(0), 'built'), ...lying], holes: [{ x: 600, y: 700, angle: 0, len: 120 }], drift: 0, icicles: [] }],
      ['a snow gate', { night: false, blocks: [{ ...BERRY }, ...gate('snow'), ...lying], holes: [], drift: 0, icicles: [] }],
      ['a tower', { night: false, blocks: [{ ...BERRY }, ...[0, 1, 2].map((n) => restOf(n === 2 ? 'cloudy' : 'clear', 90, 500, row(n), 'built')), ...lying], holes: [], drift: 0, icicles: [] }],
    ]
    for (const [name, world] of worlds) {
      const { view, g } = stage()
      const toy = new Toy(world, 1)
      let worst = 0, behind = 0
      const paint = (frames: number): void => {
        for (let i = 0; i < frames; i++) {
          frame(toy)
          worst = Math.max(worst, view.paint(g, 1180, 820, 2, toy, SHOWING(i), STEP, TIERS[0]))
          if (toy.king.behind || toy.kids.lamp.behind) behind++
        }
      }
      // The hare is out, and a block goes into the water.
      paint(Math.round((toy.hareAt + 1) / STEP))
      if (world.holes.length > 0) { press(toy, 560, 590); moveTo(toy, 600, 700); letGo(toy) }
      paint(60)
      pullSun(toy, true)
      paint(60 * 24)
      if (name === 'a gate') {
        // His seat is pulled from under him.
        press(toy, 384, row(1)); moveTo(toy, 300, 640); paint(20); letGo(toy)
        paint(60 * 8)
      }
      if (name !== 'a tower') expect(behind, name).toBeGreaterThan(name === 'a snow gate' ? 20 : 100)
      expect(worst, name).toBeLessThan(BAR)
    }
  })

  it('draws the same game at every tier: a lower tier changes the pixel ratio and the snowfall and nothing else', () => {
    const counts = TIERS.map((tier) => {
      const { view, g } = stage()
      const toy = new Toy(firstWorld(null), 1)
      return view.paint(g, 1180, 820, tier.dpr, toy, null, 0, tier)
    })
    expect(new Set(counts).size).toBe(1)
    for (let i = 1; i < TIERS.length; i++) expect(TIERS[i].flakes).toBeLessThan(TIERS[i - 1].flakes)
  })
})
