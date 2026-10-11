import { describe, expect, it } from 'vitest'
import { CELL, COLS, PANE, ROWS, STEAM, isFluid } from './cells'
import { LADDER, TIERS } from './config'
import { PULL_MOST, RAIN, type Game } from './game'
import type { Guidance } from './guidance'
import { VARIANTS } from './hills'
import { STAGE } from './stage'
import { ANSWER_NAMES, ANSWERS, type AnswerName } from './timeline'
import { Recorder, blankCanvas, finishedOn, gameOn, play, soak, spot, type Drawn } from './testing'
import { HillView } from './view'

// A canvas game has no intersection audit, so these model tests hold the two
// lines it would: nothing is drawn through anything, and a frame stays inside
// the draw budget. The view draws on a canvas that records every stamp, fill
// and stroke with the box it covers, in every state a child can reach.

/** The jam's bar is under about 80 draw calls a frame; this game keeps every frame to 72 or fewer. */
const BUDGET = 72
/** These tests play many seconds of the hill's rules; on a busy machine they need longer than the default. */
const LONG = 120_000
const IDLE: Guidance = { glow: 0, demo: null, demoIndex: -1 }
const HAND: Guidance = { glow: 1, demo: 0.5, demoIndex: 0 }

/** The sprites that are somebody or somebody's thing: each must stand in open space or water, never in the ground. The two pictures of a room's back wall are left out: they are wider than what is painted on them. */
const FIGURE = /^(duck|brush|armchair|mole(?!Den)|lampShade|teacup|slipper|worm(?!Shelf)|boots|badger|garments|umbrella|dryingLine|chain)/

function setUp(): { view: HillView; recorder: Recorder } {
  const recorder = new Recorder()
  const view = new HillView(recorder.canvas, blankCanvas)
  view.resize(STAGE.width, STAGE.height, 1)
  // The cheapest tier's grain: a tier changes how fine the sand's picture is, never what is drawn or how often.
  view.setTier(TIERS[TIERS.length - 1])
  return { view, recorder }
}

/** The middle of a drawn box: a fifth in from each side, since a sprite's corners are empty. */
const core = (d: Drawn): { x0: number; y0: number; x1: number; y1: number } => ({ x0: d.x0 + (d.x1 - d.x0) * 0.2, y0: d.y0 + (d.y1 - d.y0) * 0.2, x1: d.x1 - (d.x1 - d.x0) * 0.2, y1: d.y1 - (d.y1 - d.y0) * 0.2 })

/** The figures of a frame whose middle lies over ground or outside the pane, as "name at col,row". */
function buried(game: Game, drawn: readonly Drawn[]): string[] {
  const cells = game.on.ground.cells, found: string[] = []
  for (const d of drawn) {
    if (d.how !== 'stamp' || !FIGURE.test(d.name)) continue
    const box = core(d)
    if (box.x0 < PANE.x || box.y0 < PANE.y || box.x1 > PANE.x + PANE.width || box.y1 > PANE.y + PANE.height) { found.push(`${d.name} outside the pane`); continue }
    const col0 = Math.floor((box.x0 - PANE.x) / CELL), col1 = Math.min(COLS - 1, Math.floor((box.x1 - PANE.x) / CELL)), row0 = Math.floor((box.y0 - PANE.y) / CELL), row1 = Math.min(ROWS - 1, Math.floor((box.y1 - PANE.y) / CELL))
    search: for (let row = row0; row <= row1; row++) for (let col = col0; col <= col1; col++) if (!isFluid(cells[row * COLS + col])) { found.push(`${d.name} at ${col},${row}`); break search }
  }
  return found
}

/** How many times each thing was drawn, for a failure's message. */
const tally = (drawn: readonly Drawn[]): string => { const counts: Record<string, number> = {}; for (const d of drawn) { const key = d.name === 'pen' ? `${d.how} ${d.style}` : d.name; counts[key] = (counts[key] ?? 0) + 1 } return JSON.stringify(counts) }

/** Draws a frame and checks it: the count the view reports is what was drawn, it is inside the budget, and no figure is in the ground. */
function frame(view: HillView, recorder: Recorder, game: Game, name: string, guidance: Guidance = IDLE, placed = true): number {
  recorder.clear()
  view.draw(game, guidance)
  expect(recorder.drawn.length, `${name}: the view counts what it draws`).toBe(view.draws)
  expect(view.draws, `${name}: draw calls ${view.draws > BUDGET ? tally(recorder.drawn) : ''}`).toBeLessThanOrEqual(BUDGET)
  // Two hills on their way past each other share a row of cells where they meet.
  expect(view.covered, `${name}: the sand's picture is drawn once over`).toBeLessThanOrEqual(1 + 1.5 / ROWS)
  if (placed) expect(buried(game, recorder.drawn), name).toEqual([])
  return view.draws
}

describe('nothing is drawn through anything, and a frame stays in its budget', () => {
  it('on every layout of every hill as it is found, with the ghost hand up', () => {
    const { view, recorder } = setUp()
    let most = 0
    for (const id of LADDER) for (let variant = 0; variant < VARIANTS; variant++) {
      const game = gameOn(id, variant)
      for (const seconds of [0.05, 0.4, 0.4]) { play(game, seconds); most = Math.max(most, frame(view, recorder, game, `${id} ${variant}`, HAND)) }
    }
    expect(most).toBeGreaterThan(30)
  }, LONG)

  it('through every scene of the residents on every layout: the mole afloat and set down, the boots, the rain, the duck afloat, and all of them hopping', () => {
    const { view, recorder } = setUp()
    for (let variant = 0; variant < VARIANTS; variant++) {
      const game = gameOn('dune', variant)
      soak(game)
      // The first layout is walked closely; the other two at longer steps, since the scenes are the same and only the places differ.
      const stride = variant === 0 ? 0.6 : 1.5
      for (let moment = 0; moment * stride < 9.5; moment++) {
        play(game, stride)
        frame(view, recorder, game, `soaked ${variant} at ${moment}`)
        // A stone lands somewhere: everyone is at the top of a hop, the mole's book in the air.
        game.since.hop = ANSWERS.hop.lasts / 2
        game.since.moleJump = ANSWERS.moleJump.lasts / 2
        frame(view, recorder, game, `soaked ${variant} at ${moment}, hopping`)
        game.since.hop = Infinity
        game.since.moleJump = Infinity
      }
      expect([game.on.mole, game.on.worm, game.on.badger, game.finished]).toEqual(['afloat', 'squelching', 'rained', true])
      // The water goes out of the mole's room and he is set down.
      const room = game.on.ground.layout.moleRoom
      for (let row = room.row0; row <= room.row1; row++) for (let col = room.col0; col <= room.col1; col++) if (game.on.ground.cells[row * COLS + col] === 1) game.on.ground.put(row * COLS + col, 0)
      for (let moment = 0; moment * stride < 4.5; moment++) { play(game, stride); frame(view, recorder, game, `set down ${variant} at ${moment}`) }
    }
  }, LONG)

  it('through every short answer of every resident, dry and soaked', () => {
    const { view, recorder } = setUp()
    for (const soaked of [false, true]) {
      const game = soaked ? finishedOn('massif', 1, true) : gameOn('massif', 0)
      play(game, 0.2)
      game.on.shrunken = true
      for (const name of ANSWER_NAMES) {
        for (const share of [0.15, 0.4, 0.7, 0.95]) {
          game.since[name as AnswerName] = ANSWERS[name].lasts * share
          frame(view, recorder, game, `${name} at ${share}${soaked ? ', soaked' : ''}`)
        }
        game.since[name as AnswerName] = Infinity
      }
    }
  }, LONG)

  it('through each first showing of a ground', () => {
    const { view, recorder } = setUp()
    for (let variant = 0; variant < VARIANTS; variant++) {
      const game = gameOn('massif', variant, { shown: [] })
      for (let n = 0; n < 5; n++) {
        game.press({ x: PANE.x + 500, y: PANE.y + 30 })
        game.release()
        expect(game.anyScene).toBe(true)
        // The sock on its way to the hot stone is in the air over the ground, and lands on the stone.
        const stride = variant === 0 ? 0.7 : 1.3
        for (let moment = 0; moment * stride < (variant === 0 ? 4.1 : 2.5); moment++) { play(game, stride); frame(view, recorder, game, `massif ${variant}, showing ${game.shown[n]} at ${moment}`) }
      }
    }
  }, LONG)

  it('while the finger digs, with grains in the air and marks on every ground', () => {
    const { view, recorder } = setUp()
    const game = finishedOn('massif', 2, true)
    play(game, 0.2)
    let most = 0
    for (let n = 0; n < 40; n++) {
      const col = 20 + ((n * 37) % 140), row = 40 + ((n * 23) % 45)
      game.press(spot(col, row))
      game.rubTo(spot(col + 5, row + 2))
      game.step(1 / 60)
      // With everything else that can be in a frame at once: steam rising in the tunnel, a cloud in the sky, rain on its way down, and the badger's peg.
      const ground = game.on.ground
      ground.put((row + 1) * COLS + col + 2, STEAM)
      ground.put(5 * COLS + 70, STEAM)
      game.crumbs.push({ x: 300, y: 200, vx: 0, vy: 100, kind: RAIN, life: 1 })
      game.since.badgerSnap = 0.1
      most = Math.max(most, frame(view, recorder, game, `rub ${n}`, IDLE, false))
      game.release()
    }
    expect(game.crumbs.length + game.marks.length).toBeGreaterThan(0)
    expect(most).toBeGreaterThan(50)
  }, LONG)

  it('all the way through the plug\'s scene, while two hills are on their way past each other', () => {
    const { view, recorder } = setUp()
    for (let variant = 0; variant < VARIANTS; variant++) {
      const game = finishedOn('dune', variant, true)
      play(game, 0.2)
      const chain = game.on.places.chain
      game.press({ x: chain.x, y: chain.top + 14 })
      game.rubTo({ x: chain.x, y: chain.top + 14 - PULL_MOST })
      expect(game.running('plug')).toBe(true)
      for (let moment = 0; moment < 30 && game.running('plug'); moment++) { play(game, 0.2); frame(view, recorder, game, `plug ${variant} at ${moment}`, IDLE, false) }
      play(game, 0.5)
      frame(view, recorder, game, `after the plug ${variant}`)
    }
  }, LONG)

  it('the duck and the chain never touch, however high the water lifts the duck', () => {
    const { view, recorder } = setUp()
    for (let variant = 0; variant < VARIANTS; variant++) {
      const game = finishedOn('dune', variant)
      play(game, 0.5)
      game.since.hop = ANSWERS.hop.lasts / 2
      recorder.clear()
      view.draw(game, IDLE)
      const duck = recorder.drawn.filter((d) => /^duck|^brush/.test(d.name)).map(core), chain = recorder.drawn.filter((d) => d.name === 'chain')
      expect(duck.length).toBeGreaterThanOrEqual(3)
      expect(chain.length).toBe(1)
      for (const a of duck) for (const b of chain) expect(a.x0 > b.x1 || a.x1 < b.x0 || a.y0 > b.y1 || a.y1 < b.y0, `layout ${variant}`).toBe(true)
    }
  })

  it('under the home control at the top centre there is sky and the frame and nothing else, on every layout', () => {
    const { view, recorder } = setUp()
    // At 1180 by 820 a stage unit is a pixel: the home control is 48 wide and 10 from the top.
    const home = { x0: STAGE.width / 2 - 24, y0: 10, x1: STAGE.width / 2 + 24, y1: 58 }
    for (const id of LADDER) for (let variant = 0; variant < VARIANTS; variant++) {
      const game = gameOn(id, variant)
      play(game, 0.05)
      recorder.clear()
      view.draw(game, IDLE)
      const there = recorder.drawn.filter((d) => d.x0 < home.x1 && d.x1 > home.x0 && d.y0 < home.y1 && d.y1 > home.y0).map((d) => d.name)
      expect(there.filter((name) => !/^(backdrop|frame|glare|sand|cloud)/.test(name)), `${id} ${variant}`).toEqual([])
      const { surface } = game.on.ground.layout
      for (let col = Math.floor((home.x0 - PANE.x) / CELL); col <= Math.ceil((home.x1 - PANE.x) / CELL); col++) expect(PANE.y + surface[col] * CELL, `${id} ${variant}`).toBeGreaterThan(home.y1 + 48)
    }
  }, LONG)

  it('the oak frame is drawn once and stays on the surface: it is drawn again after a resize, a knock on it, or the idle hint', () => {
    const { view, recorder } = setUp()
    const game = gameOn('dune')
    play(game, 0.05)
    const strips = (guidance: Guidance = IDLE): number => { recorder.clear(); view.draw(game, guidance); return recorder.drawn.filter((d) => /^frame/.test(d.name)).length }
    expect([strips(), strips(), strips()]).toEqual([4, 0, 0])
    // The hint may lie over the frame's lip: the frame is drawn with it, and once more after it to wipe it off.
    expect([strips(HAND), strips(), strips()]).toEqual([4, 4, 0])
    game.press({ x: 12, y: STAGE.height / 2 })
    game.release()
    expect(game.marks.some((mark) => mark.kind === 'wood')).toBe(true)
    expect(strips()).toBe(4)
    play(game, 2)
    strips()
    expect(strips()).toBe(0)
    view.resize(STAGE.width, STAGE.height, 1)
    expect(strips()).toBe(4)
  })

  it('the badger holds a peg in her paw, in two halves, for as long as its snap lasts', () => {
    const { view, recorder } = setUp()
    const game = gameOn('dune')
    play(game, 0.05)
    const pegs = (): Drawn[] => { recorder.clear(); view.draw(game, IDLE); return recorder.drawn.filter((d) => d.how === 'fill' && d.style === '#c98a3c') }
    expect(pegs()).toEqual([])
    game.since.badgerSnap = ANSWERS.badgerSnap.lasts / 3
    const [peg] = pegs(), badger = recorder.drawn.find((d) => d.name === 'badgerArm')!
    // Two halves sprung apart are wider than one, and they are at the end of her arm.
    expect(Math.max(peg.x1 - peg.x0, peg.y1 - peg.y0)).toBeGreaterThan(12)
    expect(peg.x0 < badger.x1 + 24 && peg.x1 > badger.x0 - 24 && peg.y0 < badger.y1 + 24 && peg.y1 > badger.y0 - 24).toBe(true)
    game.since.badgerSnap = ANSWERS.badgerSnap.lasts + 0.1
    expect(pegs()).toEqual([])
  })

  it('the duck sits clear of the bath\'s wall on every layout, tail and all', () => {
    const { view, recorder } = setUp()
    for (const id of LADDER) for (let variant = 0; variant < VARIANTS; variant++) {
      const game = gameOn(id, variant), { bath } = game.on.ground.layout
      play(game, 0.05)
      recorder.clear()
      view.draw(game, IDLE)
      const left = PANE.x + bath.col0 * CELL, right = PANE.x + (bath.col1 + 1) * CELL
      for (const d of recorder.drawn) if (/^duck/.test(d.name)) expect([d.name, d.x0 >= left, d.x1 <= right], `${id} ${variant}`).toEqual([d.name, true, true])
    }
  }, LONG)

  it('with no state yet, the empty case is drawn and nothing else', () => {
    const { view, recorder } = setUp()
    view.draw(null, null)
    expect(recorder.drawn.map((d) => d.name).sort()).toEqual(['backdrop', 'frameBottom', 'frameLeft', 'frameRight', 'frameTop', 'glare'])
  })
})
