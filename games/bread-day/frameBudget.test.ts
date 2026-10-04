import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { freshBakery, type Bakery } from './bakery'
import { DoughBody, formOf, type Form } from './doughBody'
import { Game, type Point } from './game'
import { SPOTS } from './lookLayout'
import { createStuffPainter } from './lookStuff'
import { FIGURES_OF, LUMP_AT, RACK, middle } from './stage'
import { EMPTY, WORK_FULL, type Bread, type Load, type Stuff } from './stuff'
import { ANIMALS, IDEAS, judge, reachableBreads, type Group } from './tastes'

// The work of a frame, counted so that it holds on a busy CI runner
// (docs/solutions/test-failures/frame-budget-tests-that-hold-on-a-shared-ci-runner.md).
// A frame of Bread Day costs what it lays: cached sprites, one each, and the
// few things drawn live by their form, a handful of flat fills each. Both are
// counted here: the fills and path commands of the live painter on a context
// that records instead of drawing, and the pieces from what the controller
// hands the look. look.ts itself needs a real canvas to print its sprites, so
// it is not called. One timed check follows, as an average with a wide margin.

// --- The budgets -----------------------------------------------------------------
// Each is about 30% above what was measured; the measured numbers are printed by the tests.

/** Fills the live painter may make in one frame: the peel's load under a finger, four breads on the rack and one more thing at rest. Measured 37 (crumbly seeded loaves), 36 for long dark seeded loaves. */
const FILLS = 48
/** Path commands it may issue in that frame, those cut into a kept path counted each time they are cut again. Measured 3,500 (raw flour on the peel, toasted heaps and crumbly loaves by turns on the rack), 1,293 for the loaves. */
const PATH_COMMANDS = 4600
/** Fills and path commands one thing may take, live or at rest. Measured 7 and 472 (raw flour with furrows in it). */
const FILLS_EACH = 9, COMMANDS_EACH = 600
/** Pieces a frame may lay: every sprite and every thing drawn by its form, each as one. Measured 27. */
const PIECES = 60
/** Sprites and fills together, which is what the canvas is asked for in a frame. The jam's bar is about 80. Measured 59. */
const DRAW_CALLS = 77
/** The most figures of the cast the look is ever handed (three groups of three, with chicks), and the most specks. Measured 11 and 70. */
const FIGURES = 21, SPECKS = 70
/** Milliseconds of the controller's own work per frame, as the best of five replays' averages: ten times what was measured (0.04 to 0.05 on an idle machine, 0.13 with every core kept busy). */
const STEP_MS = 0.5

const LUMP = LUMP_AT.board, HATCH = middle(SPOTS.hatch), SACK = middle(SPOTS.sack)

// --- A context that counts ---------------------------------------------------------

type Counts = { fill: number; path: number; beginPath: number; save: number; restore: number; drawImage: number; other: number }
/** Path commands that went into a Path2D: cut once for a size and kept, then filled whole. */
let kept = 0
function recorder(): { g: CanvasRenderingContext2D; counts: Counts } {
  const counts: Counts = { fill: 0, path: 0, beginPath: 0, save: 0, restore: 0, drawImage: 0, other: 0 }
  const path = () => { counts.path++ }, other = () => { counts.other++ }, free = () => {}
  const g = {
    fillStyle: '', globalAlpha: 1,
    save: () => { counts.save++ }, restore: () => { counts.restore++ }, translate: free, scale: free, rotate: free,
    beginPath: () => { counts.beginPath++ }, moveTo: path, lineTo: path, quadraticCurveTo: path, bezierCurveTo: path, ellipse: path, arc: path, rect: path, closePath: path,
    fill: () => { counts.fill++ }, drawImage: () => { counts.drawImage++ },
    // Nothing a print does: any of these would show up in the count.
    stroke: other, clip: other, fillRect: other, strokeRect: other, fillText: other, createLinearGradient: other, createRadialGradient: other,
  }
  return { g: g as unknown as CanvasRenderingContext2D, counts }
}

// --- The heaviest states -----------------------------------------------------------

const BREADS: readonly Bread[] = reachableBreads()
/** The loaf with the most on it: long, dark, risen and seeded. */
const LOAF: Bread = { raw: false, crumb: 'airy', shape: 'long', crust: 'dark', seeds: true }
/** The same loaf with no seeds on it and baked once: the trio hands it back. */
const PLAIN: Bread = { raw: false, crumb: 'airy', shape: 'long', crust: 'gold', seeds: false }
const DOUGH: Stuff = { ...EMPTY, flour: 3, water: 3, work: 4, bubbly: true, seeds: true }
const RAW: readonly Stuff[] = [
  { ...EMPTY, flour: 3 }, { ...EMPTY, water: 3 }, { ...EMPTY, seeds: true }, { ...EMPTY, flour: 2, water: 3, bubbly: true, rise: 100, seeds: true },
  { ...EMPTY, flour: 3, water: 3, seeds: true }, DOUGH, { ...EMPTY, flour: 3, water: 3, work: 12, bubbly: true, rise: 100, seeds: true },
]

/**
 * The fullest stage the rules allow. Each animal is one of eight and stands once, so two trios cannot wait behind a
 * third: with the sparrows, the crow and the hen with her chicks at the hatch (eight figures), the most that can wait
 * are a pair and one more. Four breads lie on the rack, both late tools are out, and `load` is on the peel.
 */
const TRIO: Group = ['sparrows', 'crow', 'hen']
function fullest(load: Load, rack: readonly Bread[] = [LOAF, LOAF, LOAF, LOAF]): Game {
  const base = freshBakery(null, 1).bakery
  const bakery: Bakery = {
    ...base, position: 'trios', finished: false, shown: IDEAS, tools: { jar: true, seeds: true },
    hatch: { group: TRIO, from: 'trios', handedBack: 0 }, lane: [{ group: ['goat', 'dachshund'], from: 'pairs', handedBack: 0 }, { group: ['bear'], from: 'rising', handedBack: 0 }],
    rack, peel: { at: 'board', load },
  }
  return new Game({ bakery, happened: [] }, 5)
}
/** A finger slides from one point to another over some frames of a sixtieth, and stays down. */
function slide(game: Game, from: Point, to: Point, frames: number): void {
  game.press(from)
  for (let i = 1; i <= frames; i++) { game.moveTo({ x: from.x + ((to.x - from.x) * i) / frames, y: from.y + ((to.y - from.y) * i) / frames }); game.step(1 / 60) }
}
/** What a frame lays, counted as look.ts lays it: each sprite one piece, each thing drawn by its form one piece, all the specks one. */
function pieces(game: Game): { sprites: number; forms: number } {
  const { jar, seeds } = game.bakery.tools
  // The room, the badger, the fire, the sack, the jug and the peel are always laid; the guide may add its marks and its hand.
  const sprites = 6 + game.figures().length + (jar ? 1 : 0) + (seeds ? 1 : 0) + (game.doorShut ? 1 : 0) + (game.specks.length > 0 ? 1 : 0) + 2
  return { sprites, forms: (game.form ? 1 : 0) + game.things().length }
}

describe('the frame budget, counted', () => {
  const scope = globalThis as { Path2D?: unknown }, real = scope.Path2D
  beforeAll(() => {
    // Node has no Path2D. The painter cuts its scatter of specks into one, once for a size, and fills it whole.
    const cut = () => { kept++ }
    scope.Path2D = class { moveTo = cut; lineTo = cut; closePath = cut }
  })
  afterAll(() => { scope.Path2D = real })

  const painter = createStuffPainter(31)
  /** A body with a finger on it that has just rubbed to and fro, so the painter draws its marks as well. */
  const rubbed = (form: Form): DoughBody => {
    const body = new DoughBody()
    body.reshape(form)
    body.press(0, 0)
    for (let frame = 1; frame <= 12; frame++) { body.moveTo(form.rx * 0.4 * Math.sin(frame * 0.7), form.ry * 0.2 * Math.sin(frame * 0.4)); body.step(1 / 60) }
    return body
  }

  it('draws any one thing, under a finger or at rest, in a few fills and a few hundred path commands', () => {
    let fills = 0, commands = 0, heaviest = ''
    for (const thing of [...RAW, ...BREADS]) {
      const form = formOf(thing)!, name = thing.raw ? `raw ${form.kind}, ${form.texture}` : `${thing.crumb} ${thing.shape} ${thing.crust}${thing.seeds ? ' seeded' : ''}`
      const live = recorder(), rest = recorder()
      expect(painter.paint(live.g, rubbed(form), form, 400, 300, 1.2), name).toBe(live.counts.fill)
      expect(painter.still(rest.g, form, 100, 80, 0.3, 0.2), name).toBe(rest.counts.fill)
      for (const { counts } of [live, rest]) {
        expect(counts.fill, name).toBeGreaterThan(0)
        expect(counts.fill, name).toBeLessThanOrEqual(FILLS_EACH)
        expect(counts.path, name).toBeLessThanOrEqual(COMMANDS_EACH)
        expect(counts.beginPath, name).toBeLessThanOrEqual(counts.fill)
        expect([counts.save, counts.restore, counts.drawImage, counts.other], name).toEqual([1, 1, 0, 0])
        fills = Math.max(fills, counts.fill)
        if (counts.path > commands) { commands = counts.path; heaviest = name }
      }
    }
    console.log(`bread-day painter, one thing: at most ${fills} fills (budget ${FILLS_EACH}) and ${commands} path commands (budget ${COMMANDS_EACH}, ${heaviest})`)
  })

  it('draws the heaviest frames inside the budget: a load under the finger, four breads on the rack, one more held', () => {
    const heap: Bread = { raw: false, crumb: 'dust', shape: 'heap', crust: 'dark', seeds: true }, crumbly: Bread = { raw: false, crumb: 'crumbly', shape: 'round', crust: 'dark', seeds: true }
    const frames: [string, Load, Bread[], Load][] = [
      ['long dark seeded loaves', LOAF, [LOAF, LOAF, LOAF, LOAF], LOAF],
      ['crumbly seeded loaves', crumbly, [crumbly, crumbly, crumbly, crumbly], crumbly],
      ['toasted heaps', heap, [heap, heap, heap, heap], heap],
      // Heaps of two sizes and crumbs by turns: the painter keeps one scatter of specks, so each of these cuts it anew.
      ['flour, with heaps and crumbly loaves by turns', RAW[0], [heap, crumbly, heap, crumbly], RAW[0]],
    ]
    for (const [name, load, rack, held] of frames) {
      const game = fullest(load, rack)
      game.press(LUMP)
      game.step(1 / 60)
      expect(game.body.finger, name).not.toBeNull()
      let counts: Counts = recorder().counts, recut = 0, drawn = 0
      // The third frame is a steady one: whatever is cut once and kept has been cut.
      for (let n = 0; n < 3; n++) {
        const frame = recorder(), before = kept
        drawn = (painter.paint(frame.g, game.body, game.form, 598, 650, 2) > 0 ? 1 : 0)
        for (const thing of game.things()) drawn += painter.still(frame.g, thing.form, thing.x, thing.y, thing.scale, thing.turn) > 0 ? 1 : 0
        drawn += painter.still(frame.g, formOf(held), 300, 300, 0.53, 0.2) > 0 ? 1 : 0
        counts = frame.counts; recut = kept - before
      }
      expect(drawn, `${name}: the peel's load, four on the rack and one held were all drawn`).toBe(6)
      expect(counts.fill, name).toBeLessThanOrEqual(FILLS)
      expect(counts.path + recut, name).toBeLessThanOrEqual(PATH_COMMANDS)
      expect([counts.save, counts.restore, counts.drawImage, counts.other], name).toEqual([6, 6, 0, 0])
      const laid = pieces(game)
      expect(laid.sprites + counts.fill, `${name}: sprites and fills`).toBeLessThanOrEqual(DRAW_CALLS)
      console.log(`bread-day painter, ${name}: ${counts.fill} fills (budget ${FILLS}), ${counts.path} path commands and ${recut} cut again (budget ${PATH_COMMANDS}), ${laid.sprites} sprites + ${counts.fill} fills = ${laid.sprites + counts.fill} draw calls (budget ${DRAW_CALLS})`)
    }
  })

  it('lays under 60 pieces in the heaviest state the rules allow', () => {
    // A trio with the hen at the hatch, a pair and one more waiting, four breads on the rack, a bread on the peel.
    const game = fullest(LOAF, [PLAIN, LOAF, LOAF, LOAF])
    expect(game.figures().length, 'the trio is eight figures, and three wait').toBe(11)
    // Flour in the air: on a bread it slides off towards the badger, a dozen specks a tap, and never more than seventy fly.
    for (let n = 0; n < 8; n++) { game.press(SACK); game.lift(); game.step(1 / 60) }
    expect(game.specks.length, 'flour in the air').toBe(SPECKS)
    // A reaction in play: the trio is handed the loaf from the rack that has no seeds, and whoever minds first holds it.
    slide(game, middle(RACK[0]), HATCH, 12)
    game.lift()
    expect(judge(TRIO, PLAIN).wanted).toBe(false)
    expect(game.wants(), 'a reaction is in play').toBeNull()
    // And a finger on the bread on the peel.
    game.press(LUMP)
    let most = 0, figures = 0, things = 0, together = 0
    for (let frame = 0; frame < 90; frame++) {
      game.step(1 / 60)
      const laid = pieces(game)
      most = Math.max(most, laid.sprites + laid.forms); figures = Math.max(figures, game.figures().length); things = Math.max(things, game.things().length)
      expect(game.specks.length).toBeLessThanOrEqual(SPECKS)
      if (game.specks.length > 0 && game.wants() === null && game.things().length === 4 && game.form && game.body.finger) together++
    }
    expect(things, 'three on the rack and one in a customer\'s hold').toBe(4)
    expect(together, 'frames with all of it at once: the reaction, the flour, the finger on the bread').toBeGreaterThan(5)
    expect(figures).toBeLessThanOrEqual(FIGURES)
    // Nobody stands twice, so the whole cast together is the most figures there can ever be.
    expect(ANIMALS.reduce((sum, animal) => sum + FIGURES_OF[animal].length, 0)).toBeLessThanOrEqual(FIGURES)
    expect(most).toBeLessThan(PIECES)
    console.log(`bread-day frame, heaviest state: ${most} pieces (budget under ${PIECES}): ${figures} figures, ${things} things at rest, the load, the specks as one path, 8 sprites of the room and its tools, the guide's two`)
  })

  it('steps the controller through 600 such frames, a finger rubbing, well inside a frame', () => {
    const replay = (): { ms: number; frames: number; pushes: number; reacting: number; specks: number } => {
      const game = fullest(DOUGH, [PLAIN, LOAF, LOAF, LOAF])
      let reacting = 0, specks = 0, frames = 0
      const began = performance.now()
      for (let frame = 0; frame < 600; frame++) {
        const beat = frame % 150
        // Every two and a half seconds the plain loaf is handed over from the rack and refused; between, the dough is rubbed hard.
        if (beat === 0) { game.lift(); game.press(middle(RACK[0])) }
        else if (beat <= 12) game.moveTo({ x: middle(RACK[0]).x + ((HATCH.x - middle(RACK[0]).x) * beat) / 12, y: middle(RACK[0]).y + ((HATCH.y - middle(RACK[0]).y) * beat) / 12 })
        else if (beat === 13) { game.lift(); game.press(LUMP) }
        else game.moveTo({ x: LUMP.x + 55 * Math.sin(frame * 0.55), y: LUMP.y + 14 * Math.sin(frame * 0.23) })
        game.step(1 / 60)
        game.voices()
        frames++
        if (game.wants() === null) reacting++
        specks = Math.max(specks, game.specks.length)
      }
      const ms = performance.now() - began, load = game.bakery.peel.load
      return { ms, frames, pushes: load && load.raw ? load.work : 0, reacting, specks }
    }
    // Once to warm up, then the best of five: a busy runner only ever adds time.
    replay()
    const runs = [replay(), replay(), replay(), replay(), replay()], best = Math.min(...runs.map((run) => run.ms)) / 600
    for (const run of runs) {
      // The heavy moment happened in every run: the dough was worked, flour flew, and a reaction played most of the time.
      expect(run.frames).toBe(600)
      expect(run.pushes).toBe(WORK_FULL)
      expect(run.specks).toBeGreaterThan(0)
      expect(run.reacting).toBeGreaterThan(300)
    }
    console.log(`bread-day controller: ${best.toFixed(4)} ms a frame, best of five replays of 600 frames (budget ${STEP_MS} ms)`)
    expect(best).toBeLessThan(STEP_MS)
  }, 20000)
})
