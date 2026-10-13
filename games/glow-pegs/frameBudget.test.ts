import { describe, expect, it } from 'vitest'
import { BLUE, COLOURS, GREEN, HOLES, RED, WHITE, YELLOW, centreOf, holeAt, type Colour } from './board'
import { TIERS } from './config'
import type { Guidance } from './guidance'
import { GECKO, HANDLE, SPIDER, knobAt, wellMouth } from './layout'
import { freshSave, type Save } from './save'
import { STAGE } from './stage'
import { MOST_FALLERS, MOST_LIVE, PILE_RATTLE, Toy } from './toy'
import { ToyView } from './view'

// The jam's bar is under about 80 draw calls a frame and at most one full-surface pass. This is a canvas game,
// so a frame's draw count is what it draws on the live layer: the sprites it stamps and the paths it strokes
// and fills. The still layer is painted once and costs a frame nothing. A stand-in context counts the calls, so
// the count is the same on any machine; the frame rate itself is measured on the target device, not here.

const DT = 1 / 60
/** The surfaces the count is taken at: the stage's own size, a smaller tablet, and a tablet held upright. */
const SIZES: [number, number][] = [[1180, 820], [1024, 768], [820, 1180]]

type Counts = Record<string, number>

/** A canvas whose context does nothing and counts every call by its name. `surface` is the size a full pass covers. */
function standIn(surface: { pixels: number }, width = 0, height = 0): { canvas: HTMLCanvasElement; counts: Counts; fullFills: { n: number } } {
  const counts: Counts = {}
  const fullFills = { n: 0 }
  const gradient = { addColorStop: () => {} }
  const context = new Proxy({} as Record<string, unknown>, {
    get(target, name) {
      if (typeof name !== 'string') return undefined
      if (name in target) return target[name]
      if (name === 'createRadialGradient' || name === 'createLinearGradient') return () => gradient
      return (...args: number[]) => {
        counts[name] = (counts[name] ?? 0) + 1
        // A fill or a clear that covers the surface is a full-surface pass.
        if ((name === 'fillRect' || name === 'clearRect') && args[2] * args[3] >= surface.pixels * 0.9) fullFills.n += 1
      }
    },
    set(target, name, value) {
      if (typeof name === 'string') target[name] = value
      return true
    },
  })
  return { canvas: { width, height, getContext: () => context } as unknown as HTMLCanvasElement, counts, fullFills }
}

const drawn = (counts: Counts) => (counts.drawImage ?? 0) + (counts.stroke ?? 0) + (counts.fill ?? 0)

function rig(save: Save, tier = 0, size: [number, number] = [STAGE.width, STAGE.height]) {
  const surface = { pixels: size[0] * size[1] * TIERS[tier].dpr ** 2 }
  const still = standIn(surface), live = standIn(surface)
  const view = new ToyView(still.canvas, live.canvas, (w, h) => standIn(surface, w, h).canvas)
  view.setTier(TIERS[tier])
  view.resize(size[0], size[1], TIERS[tier].dpr)
  const toy = new Toy(save, 1)
  /** Plays a frame and hands back what it drew on each layer. */
  const frame = (guidance: Guidance | null = null) => {
    for (const layer of [still, live]) { for (const key of Object.keys(layer.counts)) delete layer.counts[key]; layer.fullFills.n = 0 }
    toy.step(DT)
    view.draw(toy, DT, guidance)
    return { draws: drawn(live.counts), tally: view.draws, passes: live.fullFills.n, stillDraws: drawn(still.counts), stillPasses: still.fullFills.n }
  }
  return { toy, view, frame, still, live, surface }
}

const guiding: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }
const tap = (toy: Toy, at: { x: number; y: number }) => { toy.press(at.x, at.y); toy.release() }
const pull = (toy: Toy) => { toy.press(HANDLE.x, HANDLE.y); toy.dragMove(HANDLE.x, HANDLE.y + HANDLE.stop + 4); toy.release() }

type Most = { most: number; passes: number; still: number; honest: boolean }
const none = (): Most => ({ most: 0, passes: 0, still: 0, honest: true })
function taking(frame: ReturnType<typeof rig>['frame'], into: Most): () => void {
  return () => {
    const f = frame(guiding)
    into.most = Math.max(into.most, f.draws)
    into.passes = Math.max(into.passes, f.passes)
    into.still = Math.max(into.still, f.stillDraws)
    into.honest &&= f.draws === f.tally
  }
}

/**
 * The busiest the board gets: the lever down on a full board of yellow, so the beam runs with its halves, and a
 * four-way scribble of red over it, every watcher in the middle of an act, a spark, a pile rattling, the gecko's
 * neck on its way round, and the idle hand still fading.
 */
function scribble(tier: number, size: [number, number], into: Most): void {
  const full: Save = { ...freshSave(null), board: new Array<number>(HOLES).fill(YELLOW), hand: RED, mirror: 2, moth: 40 }
  const { toy, frame } = rig(full, tier, size)
  const take = taking(frame, into)
  frame()
  tap(toy, knobAt(0))
  for (let i = 0; i < 50; i++) take()
  expect(toy.beams.some((beam) => beam.half)).toBe(true)
  expect(toy.beams.some((beam) => !beam.half)).toBe(true)
  tap(toy, { x: 600, y: 596 })
  tap(toy, SPIDER)
  tap(toy, GECKO)
  // The pile of the colour in hand rattles under it all, and the red pegs going in pull the gecko's neck round, so it is drawn live.
  tap(toy, wellMouth(RED))
  // Three rows scribbled end to end, four holes a frame.
  for (const row of [0, 1, 2]) {
    const from = centreOf(holeAt(0, row))
    toy.press(from.x, from.y)
    for (let col = 2; col <= 10; col += 2) {
      toy.dragMove(centreOf(holeAt(col, row)).x, from.y)
      take()
    }
    toy.release()
    take()
  }
  expect(toy.pileAge[RED]).toBeLessThan(PILE_RATTLE)
  expect(Math.hypot(toy.neck.x, toy.neck.y)).toBeGreaterThan(0)
  expect(toy.live.length).toBe(MOST_LIVE)
  expect(toy.fallers.filter((faller) => faller.kind === 'knocked').length).toBe(MOST_FALLERS)
  for (let i = 0; i < 120; i++) take()
}

/** The clatter on a full board of one colour, with the lever down: every peg in the air on its way to one well. */
function clatter(tier: number, size: [number, number], colour: Colour, into: Most): void {
  const { toy, frame } = rig({ ...freshSave(null), board: new Array<number>(HOLES).fill(colour), moth: 40 }, tier, size)
  const take = taking(frame, into)
  frame()
  tap(toy, knobAt(0))
  for (let i = 0; i < 20; i++) take()
  pull(toy)
  expect(toy.playing).toBe('clatter')
  let inAir = 0
  for (let i = 0; i < 60 * 7; i++) { take(); inAir = Math.max(inAir, toy.fallers.length) }
  expect(inAir).toBeGreaterThan(7)
  expect(toy.playing).toBeNull()
  expect(toy.fallers).toEqual([])
}

/** The trapped beam on a board full of everything: the bulbs chase, the spider conducts, the gecko's eyes roll, the moth rides. */
function trapped(tier: number, size: [number, number], into: Most): void {
  const board = Array.from({ length: HOLES }, (_, hole) => [YELLOW, WHITE, BLUE, RED][hole % 4] as number)
  for (let row = 0; row < 7; row++) board[holeAt(8, row)] = row === 3 ? GREEN : YELLOW
  const { toy, frame } = rig({ ...freshSave(null), board, hand: RED, moth: 40 }, tier, size)
  const take = taking(frame, into)
  frame()
  tap(toy, wellMouth(GREEN))
  tap(toy, knobAt(0))
  for (let i = 0; i < 60 * 60 && toy.playing !== 'trapped'; i++) {
    const beam = toy.beams.find((b) => !b.half)
    if (beam && beam.col === 4 && toy.shown[holeAt(1, 3)] !== GREEN) tap(toy, centreOf(holeAt(1, 3)))
    take()
  }
  expect(toy.playing).toBe('trapped')
  for (let i = 0; i < 60 * 7; i++) take()
  expect(toy.playing).toBeNull()
}

describe('the frame budget', () => {
  it('draws a resting frame in a little over a dozen calls, with the phosphor fade as its one full-surface pass', () => {
    const { frame } = rig(freshSave(null))
    frame()
    for (let i = 0; i < 600; i++) {
      const f = frame()
      expect(f.draws).toBeLessThanOrEqual(34)
      expect(f.draws).toBe(f.tally)
      expect(f.passes).toBe(1)
      // The still layer is not touched while nothing changes.
      expect(f.stillDraws).toBe(0)
      expect(f.stillPasses).toBe(0)
    }
  })

  it('stays under 80 draws at the three surface sizes and every tier: the beam, its halves and a scribble over a full board; the clatter of a full board of each colour; the trapped beam', () => {
    let worst = 0
    for (const size of SIZES) {
      const perTier: number[] = []
      for (let tier = 0; tier < TIERS.length; tier++) {
        const into = none()
        scribble(tier, size, into)
        for (const colour of COLOURS) clatter(tier, size, colour, into)
        trapped(tier, size, into)
        expect(into.most, `${size.join(' by ')}, tier ${tier}`).toBeLessThan(80)
        expect(into.passes, `tier ${tier}`).toBe(1)
        // The view's own count, which the grown-up's overlay shows, is the count of calls made.
        expect(into.honest).toBe(true)
        // A changed hole repaints its own cell and no more: a few sprite stamps on the still layer.
        expect(into.still).toBeLessThanOrEqual(HOLES)
        perTier.push(into.most)
      }
      // A cheaper tier never draws more.
      for (let tier = 1; tier < perTier.length; tier++) expect(perTier[tier]).toBeLessThanOrEqual(perTier[tier - 1])
      worst = Math.max(worst, ...perTier)
      // The count does not depend on the surface: the stage is drawn the same at every size.
      expect(perTier[0], size.join(' by ')).toBe(BUSIEST)
    }
    expect(worst).toBe(BUSIEST)
  })

  it('paints the still layer once for a size, and again only when the size changes', () => {
    const { view, frame, toy, still, surface } = rig(freshSave(null))
    const first = frame()
    expect(first.stillPasses).toBe(1)
    expect(first.stillDraws).toBeGreaterThan(HOLES)
    expect(frame().stillPasses).toBe(0)
    surface.pixels = 900 * 600 * 4
    view.resize(900, 600, 2)
    for (const key of Object.keys(still.counts)) delete still.counts[key]
    view.draw(toy, DT, null)
    expect(still.counts.fillRect).toBeGreaterThanOrEqual(1)
    expect(still.counts.drawImage).toBe(HOLES)
  })

  it('draws nothing at a surface of no size', () => {
    const { view, toy, live } = rig(freshSave(null))
    view.resize(0, 0, 2)
    for (const key of Object.keys(live.counts)) delete live.counts[key]
    view.draw(toy, DT, null)
    expect(drawn(live.counts)).toBe(0)
  })
})

/** The one number: the most draws any frame of the three busiest moments makes, at the top tier. */
const BUSIEST = 68
