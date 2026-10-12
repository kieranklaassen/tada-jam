import { describe, expect, it } from 'vitest'
import { BUSH_TIPS, Carry, STRANDS } from './carry'
import { TIERS } from './config'
import type { Ctx } from './felted'
import { Game } from './game'
import type { Guidance } from './guidance'
import { Hands } from './hands'
import type { Hint } from './hint'
import { BOWLS, COMB, COMB_HAND, SHEEP } from './layout'
import { cell, dab, daub, fresh, hangUp, make, setDown, settle, standIn, tally } from './probe'
import { makeRng } from './rng'
import { RESTS_AFTER, TICK, type Toy } from './toy'
import { View } from './view'
import { BLUE, GREEN, RUSSET, WHITE, YELLOW, seedOf, topAt, type Shape } from './wool'

// The close of the third reading, second half: the rulings the hands, the
// idle ladder, the marks and the documents hold. Each test fails when its fix
// is taken out. The hands are driven as the Mount drives them: down, move, up,
// and `frame` after every step the game plays.

const docs = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const NO_GUIDANCE: Guidance = { glow: 0, demo: null, demoIndex: -1 }
const ROOM = { x: 1160, y: 250 }

type Call = { name: string; args: number[] }
/** A surface that keeps the calls named, in order. */
function watch(...names: string[]): { c: Ctx; calls: Call[] } {
  const c = standIn(tally()), calls: Call[] = []
  for (const name of names) (c as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => { calls.push({ name, args: args.filter((arg): arg is number => typeof arg === 'number') }) }
  return { c, calls }
}
const PATH = ['moveTo', 'lineTo', 'quadraticCurveTo', 'arc', 'ellipse']
/** What a shape carries at time `t`, as the calls that draw it. */
function marksOf(shape: Shape, t: number, graze: readonly number[] = []): Call[] {
  const { c, calls } = watch(...PATH)
  new Carry().marks(c, shape, t, 0, graze, 1)
  return calls
}

const mounted = (): { game: Game; hands: Hands; toy: () => Toy; play: (seconds: number) => void } => {
  const game = new Game(undefined, 4, makeRng(1))
  const hands = new Hands(() => game, (at) => at, () => false, () => undefined)
  // One frame of the Mount: the game plays its step, and then the hands are asked what the clock has changed.
  return { game, hands, toy: () => game.toy, play: (seconds) => { for (let i = 0; i < Math.round(seconds * 60); i++) { game.advance(TICK); hands.frame() } } }
}
const onBowl = (dye: number): { x: number; y: number } => ({ x: BOWLS[dye].x, y: BOWLS[dye].y - 16 })

describe('ruling 1: a treetop\'s two strands are no pair of even bars', () => {
  it('streams one long strand that lifts and one short one that falls, at every moment', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, GREEN, 20, 4, 32, 10)
    settle(toy)
    const top = toy.sheet.shapes[0]
    expect(top.kind).toBe('treetop')
    for (const t of [0, 0.4, 1.3, 2.9, 7.7]) {
      // The last two curves it carries are the strands: each a start and one curve.
      const [m1, q1, m2, q2] = marksOf(top, t).slice(-4)
      expect([m1.name, q1.name, m2.name, q2.name]).toEqual(['moveTo', 'quadraticCurveTo', 'moveTo', 'quadraticCurveTo'])
      const a = { x: q1.args[2] - m1.args[0], y: q1.args[3] - m1.args[1] }, b = { x: q2.args[2] - m2.args[0], y: q2.args[3] - m2.args[1] }
      const long = Math.hypot(a.x, a.y), short = Math.hypot(b.x, b.y)
      expect(long / short).toBeGreaterThan(1.6)
      // They part by more than a third of a right angle: one goes up as it goes out, the other down.
      expect(Math.abs(Math.atan2(a.y, a.x) - Math.atan2(b.y, b.x))).toBeGreaterThan(0.5)
      expect(a.y).toBeLessThan(0)
      expect(b.y).toBeGreaterThan(0)
    }
    expect(STRANDS).toHaveLength(2)
  })
})

describe('ruling 2: the hand shows a bowl before it ever shows a figure', () => {
  /** Plays an idle stretch and returns the move shown at each showing. */
  const idle = (game: Game, seconds: number): Hint[] => {
    const shown: Hint[] = []
    for (let i = 0; i < seconds * 60; i++) {
      game.advance(TICK)
      if (game.guidance.demo !== null && shown.length === game.guidance.demoIndex) shown.push(game.hint)
    }
    return shown
  }

  it('lays wool from the bowl, or taps it, before the first figure is carried, where a thing lives and nobody stands in it', () => {
    const game = new Game(undefined, 4, makeRng(1))
    daub(game.toy, GREEN, 6, 38, 30, 44)
    settle(game.toy)
    game.press(ROOM, false); game.end('tap')
    const kinds = idle(game, 100).map((hint) => hint.kind)
    expect(kinds).toHaveLength(4)
    const bowl = kinds.findIndex((kind) => kind === 'wool' || kind === 'bowl'), figure = kinds.indexOf('figure')
    expect(bowl).toBeGreaterThanOrEqual(0)
    expect(figure).toBeGreaterThan(bowl)
    // The hand that lays wool starts on the bowl, and the glow before it sits there.
    const fresh = new Game(undefined, 4, makeRng(1))
    const first = idle(fresh, 8)[0]
    expect(first.kind).toBe('wool')
    expect([first.glow.x, first.path[0].x]).toEqual([BOWLS[GREEN].x, BOWLS[GREEN].x])
  })

  it('taps the bowl last chosen while the comb is chosen, whatever lives on the felt: the way back to wool', () => {
    const game = new Game(undefined, 4, makeRng(1)), toy = game.toy
    daub(toy, GREEN, 6, 38, 30, 44)
    settle(toy)
    toy.press(onBowl(YELLOW)); toy.end('tap')
    toy.press({ x: COMB.x, y: COMB.y }); toy.end('tap')
    expect(toy.hand).toBe(COMB_HAND)
    game.press(ROOM, false); game.end('tap')
    const shown = idle(game, 45)
    expect(shown.map((hint) => hint.kind)).toEqual(['bowl', 'bowl', 'bowl'])
    expect(shown[0].glow.x).toBe(BOWLS[YELLOW].x)
    expect(shown[0].drag).toBe(false)
  })
})

describe('ruling 3: a finger that lands while a palm rests on a bowl is not dropped', () => {
  it('waits where it is, and takes over the work there in the frame the palm has been down a second', () => {
    const { hands, toy, play } = mounted()
    hands.down(1, onBowl(BLUE))
    play(0.5)
    hands.down(2, cell(30, 30))
    expect(toy().sheet.shapes).toHaveLength(0)
    expect(hands.holds(1)).toBe(true)
    // It moves while it waits: the work begins where it is, not where it landed.
    hands.move(2, cell(40, 34))
    let took = -1
    for (let i = 0; i < 60 && took < 0; i++) { play(TICK); if (hands.holds(2)) took = toy().t }
    expect(Math.abs(took - RESTS_AFTER)).toBeLessThan(2 * TICK)
    expect(toy().held?.kind).toBe('stroke')
    expect(toy().sheet.shapes.map((shape) => shape.dye)).toEqual([BLUE])
    expect(topAt(toy().sheet, 40, 34)).toBeDefined()
    expect(topAt(toy().sheet, 30, 30)).toBeUndefined()
    // From there it is an ordinary stroke, and the palm's lifting changes nothing.
    const before = toy().sheet.shapes[0].count
    for (let i = 1; i <= 20; i++) { hands.move(2, cell(40 + i * 0.5, 34)); play(TICK) }
    hands.up(1, onBowl(BLUE))
    expect(hands.holds(2)).toBe(true)
    hands.up(2, cell(50, 34))
    expect(toy().sheet.shapes[0].count).toBeGreaterThan(before)
    expect(toy().held).toBeNull()
  })

  it('forgets a finger that lifted before the palm came to rest, and gives the work to one that waits when the working finger lifts', () => {
    const gone = mounted()
    gone.hands.down(1, onBowl(BLUE))
    gone.play(0.4)
    gone.hands.down(2, cell(30, 30))
    gone.hands.up(2, cell(30, 30))
    gone.play(1)
    expect(gone.toy().sheet.shapes).toHaveLength(0)
    expect(gone.hands.holds(1)).toBe(true)
    // A finger that works by moving is not interrupted; the one that waited begins when it lifts.
    const next = mounted()
    next.hands.down(1, cell(10, 40))
    for (let i = 1; i <= 30; i++) { next.hands.move(1, cell(10 + i * 0.4, 40)); next.play(TICK) }
    next.hands.down(2, cell(50, 10))
    for (let i = 31; i <= 90; i++) { next.hands.move(1, cell(10 + i * 0.4, 40)); next.play(TICK) }
    expect(topAt(next.toy().sheet, 50, 10)).toBeUndefined()
    next.hands.up(1, cell(46, 40))
    expect(next.hands.holds(2)).toBe(true)
    expect(topAt(next.toy().sheet, 50, 10)).toBeDefined()
  })
})

describe('ruling 4: a palm on the felt gives way after a second, and its wool stays', () => {
  it('hands the work to a finger that is down already, or to the next that lands, once it has lain still a second', () => {
    const waited = mounted()
    waited.hands.down(1, cell(20, 40))
    expect(waited.toy().sheet.shapes).toHaveLength(1)
    waited.play(0.5)
    waited.hands.down(2, onBowl(YELLOW))
    expect(waited.toy().hand).toBe(GREEN)
    waited.play(0.4)
    expect(waited.toy().resting).toBe(false)
    expect(waited.toy().hand).toBe(GREEN)
    const laid = waited.toy().sheet.shapes[0].mass
    waited.play(0.2)
    expect(waited.hands.holds(2)).toBe(true)
    expect(waited.toy().hand).toBe(YELLOW)
    // The wool the palm laid is all there, and has clung.
    expect(waited.toy().stroke).toBeNull()
    expect(waited.toy().sheet.shapes[0].mass).toBeGreaterThanOrEqual(laid)
    const landed = mounted()
    landed.hands.down(1, cell(20, 40))
    landed.play(1.2)
    expect(landed.toy().resting).toBe(true)
    landed.hands.down(2, onBowl(YELLOW))
    expect(landed.hands.holds(2)).toBe(true)
    expect(landed.toy().hand).toBe(YELLOW)
    expect(landed.toy().sheet.shapes).toHaveLength(1)
  })

  it('never takes the work from a finger that lays wool or combs by moving', () => {
    for (const comb of [false, true]) {
      const { hands, toy, play } = mounted()
      if (comb) { daub(toy(), GREEN, 10, 38, 60, 44); settle(toy()); toy().hand = COMB_HAND }
      hands.down(1, cell(12, 41))
      for (let i = 1; i <= 150; i++) {
        hands.move(1, cell(12 + i * 0.3, 41))
        play(TICK)
        expect(toy().resting).toBe(false)
        if (i === 100) hands.down(2, onBowl(BLUE))
      }
      expect(hands.holds(1)).toBe(true)
      expect(toy().hand).toBe(comb ? COMB_HAND : GREEN)
    }
  })
})

describe('ruling 5: a bush carries grass tips, and a grazing sheep crops them', () => {
  /** The single blades: a start at the top of the wool and one straight line up from it. */
  const tips = (calls: Call[]): { x: number; tall: number }[] => {
    const found: { x: number; tall: number }[] = []
    for (let i = 0; i + 1 < calls.length; i++) if (calls[i].name === 'moveTo' && calls[i + 1].name === 'lineTo' && (i + 2 === calls.length || calls[i + 2].name === 'moveTo')) found.push({ x: calls[i].args[0], tall: calls[i].args[1] - 2 - calls[i + 1].args[1] })
    return found
  }

  it('stitches a few single tips along the bush\'s top, which shorten where the sheep grazes and grow back', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, GREEN, 20, 20, 34, 26)
    settle(toy)
    const bush = toy.sheet.shapes[0]
    expect(bush.kind).toBe('bush')
    const plain = tips(marksOf(bush, 1))
    expect(plain.length).toBeGreaterThanOrEqual(3)
    expect(plain.length).toBeLessThanOrEqual(BUSH_TIPS + 3)
    for (const tip of plain) expect(tip.tall).toBeGreaterThanOrEqual(8)
    // Its leaves are still there: curves, which a hill has none of.
    expect(marksOf(bush, 1).some((call) => call.name === 'quadraticCurveTo')).toBe(true)
    const at = plain[1].x
    const high = tips(marksOf(bush, Math.PI / 1.6, [at]))[1].tall, low = tips(marksOf(bush, (3 * Math.PI) / 1.6, [at]))[1].tall
    expect(high).toBeLessThan(0.7 * plain[1].tall)
    expect(low).toBeLessThan(0.6 * high)
    // The sheep does graze there, and the view hands its place to the marks.
    setDown(toy, SHEEP, 27, 26)
    toy.advance(2)
    expect(toy.folk[SHEEP].shown).toBe('graze')
  })
})

describe('ruling 6: the comb is seen to hop when it plucks in the fresh felt\'s scene', () => {
  it('draws the chosen comb at rest until the pluck, and moving after it', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, GREEN, 6, 38, 30, 44)
    settle(toy)
    toy.press({ x: COMB.x, y: COMB.y }); toy.end('tap')
    hangUp(toy)
    settle(toy)
    toy.advance(2)
    toy.press(cell(30, 20)); toy.end('tap')
    const view = new View(make)
    view.setTier(TIERS[0], toy)
    view.resize(1180, 820, 2, { scale: 1, x: 0, y: 0 })
    view.load(toy)
    const combAt = (): number => {
      const { c, calls } = watch('translate')
      view.draw(c, toy, NO_GUIDANCE)
      return calls.filter((call) => call.args[0] === COMB.x)[0].args[1]
    }
    toy.advance(1.1)
    const rest = combAt()
    toy.advance(0.05)
    expect(combAt()).toBe(rest)
    const seen: number[] = []
    for (let i = 0; i < 18; i++) { toy.advance(TICK); seen.push(combAt()) }
    expect(Math.max(...seen.map((y) => Math.abs(y - rest)))).toBeGreaterThan(1)
  })
})

describe('ruling 8: a picture put away is found with the same marks', () => {
  it('seeds what each thing carries from its saved place, so a load stitches every mark where it was', () => {
    const game = new Game(undefined, 4, makeRng(5)), toy = game.toy
    // A scrap that is combed away first, so that the shapes left do not have the ids a load will give them.
    dab(toy, RUSSET, 60, 12)
    toy.hand = COMB_HAND
    toy.press(cell(60, 12))
    for (let i = 0; i < 240; i++) { toy.move(cell(60.5 + 2.2 * Math.cos(i / 8), 12.5 + 2.2 * Math.sin(i / 8))); toy.advance(TICK) }
    toy.end('dragEnd')
    expect(toy.sheet.shapes).toHaveLength(0)
    daub(toy, GREEN, 4, 20, 14, 26)
    daub(toy, GREEN, 36, 38, 60, 44)
    daub(toy, WHITE, 42, 39, 54, 43)
    daub(toy, RUSSET, 20, 3, 30, 9)
    daub(toy, YELLOW, 50, 20, 58, 26)
    daub(toy, BLUE, 18, 38, 30, 44)
    settle(toy)
    toy.advance(1)
    expect(toy.sheet.shapes.map((shape) => shape.kind)).toEqual(['bush', 'hill', 'mist', 'leaves', 'fire', 'pond'])
    expect(toy.sheet.shapes[1].veil).toBe(WHITE)
    const loaded = new Game(JSON.parse(JSON.stringify(game.record())) as unknown, 4, makeRng(5)).toy
    expect(loaded.sheet.shapes.map((shape) => shape.kind)).toEqual(toy.sheet.shapes.map((shape) => shape.kind))
    expect(loaded.sheet.shapes.map((shape) => shape.id)).not.toEqual(toy.sheet.shapes.map((shape) => shape.id))
    toy.sheet.shapes.forEach((shape, i) => {
      const again = loaded.sheet.shapes[i]
      expect([again.seed, shape.seed]).toEqual([seedOf(shape), seedOf(shape)])
      expect(marksOf(again, 1.7), shape.kind).toEqual(marksOf(shape, 1.7))
      if (shape.veil < 0) return
      const was = watch(...PATH), now = watch(...PATH)
      new Carry().veil(was.c, shape, shape.veil, 1.7, 1)
      new Carry().veil(now.c, again, again.veil, 1.7, 1)
      expect(now.calls.length).toBeGreaterThan(0)
      expect(now.calls).toEqual(was.calls)
    })
    // No two of these shapes have one seed, so no two carry the same chance.
    expect(new Set(toy.sheet.shapes.map((shape) => shape.seed)).size).toBe(toy.sheet.shapes.length)
  })
})

describe('ruling 11: the documents say what was read and what waits', () => {
  it('says the folder was read three times by a fresh reader, and that no pasted pair waits', () => {
    const log = docs['./REFINEMENT.md']
    expect(log).toMatch(/read this folder three times/)
    expect(log).toMatch(/three readings/)
    expect(log).not.toMatch(/Pairs 26 to 37 wait/)
    expect(log).not.toMatch(/has read this folder once/)
  })
})
