import { describe, expect, it } from 'vitest'
import { Carry, FROST, WISPS } from './carry'
import { rest } from './cast'
import { TIERS } from './config'
import type { Ctx } from './felted'
import { makeFolkArt } from './folkArt'
import { EARS_FROM, GOOSE_SHOWS, drawFigure, type Stance } from './folkDraw'
import { Game } from './game'
import { IDLE_BEFORE_DEMO, IdleLadder, MAX_DEMOS, type Guidance } from './guidance'
import { Hands } from './hands'
import { LOOP_DEMO, type Hint } from './hint'
import { BOWLS, CELL, COMB, COMB_HAND, FELT, GOOSE, PIG, SHEEP, SHEPHERD } from './layout'
import { cell, daub, fresh, make, setDown, settle, standIn, tally } from './probe'
import { makeRng } from './rng'
import { RESTS_AFTER, TICK, WAG, type Toy } from './toy'
import { View } from './view'
import { BLUE, GREEN, WHITE, YELLOW, lay, makeSheet, shapeFor, type Join, type Laid, type Shape } from './wool'

// The close of the second reading, second half: the rulings the hands, the
// idle ladder and the view hold. Each test fails when its fix is taken out.
// What a tier may leave out is in reading2Tiers.test.ts.

const docs = import.meta.glob('./*.md', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const NO_GUIDANCE: Guidance = { glow: 0, demo: null, demoIndex: -1 }
/** A point of the bare wall: under the pictures, over the dish. */
const ROOM = { x: 1160, y: 250 }

function viewOf(toy: Toy, tier = TIERS[0]): View {
  const view = new View(make)
  view.setTier(tier, toy)
  view.resize(1180, 820, tier.dpr, { scale: 1, x: 0, y: 0 })
  view.load(toy)
  return view
}

type Call = { name: string; args: number[]; alpha: unknown }
/** A surface that keeps the calls named, in order, each with the strength it was drawn at. */
function watch(...names: string[]): { c: Ctx; calls: Call[] } {
  const c = standIn(tally()), calls: Call[] = []
  for (const name of names) (c as unknown as Record<string, unknown>)[name] = (...args: unknown[]) => { calls.push({ name, args: args.filter((arg): arg is number => typeof arg === 'number'), alpha: (c as unknown as { globalAlpha: unknown }).globalAlpha }) }
  return { c, calls }
}

describe('ruling 3: a palm on a bowl never deadens the game, and a carried tuft is under the finger', () => {
  const mounted = (): { game: Game; hands: Hands; toy: () => Toy } => {
    const game = new Game(undefined, 4, makeRng(1))
    return { game, hands: new Hands(() => game, (at) => at, () => false, () => undefined), toy: () => game.toy }
  }
  const bowl = { x: BOWLS[2].x, y: BOWLS[2].y - 16 }
  /** A contact that slides a little all the time it is down, as a palm does. */
  const drift = (game: Game, hands: Hands, from: number, to: number): void => {
    for (let i = from; i < to; i++) { hands.move(1, { x: bowl.x + i, y: bowl.y }); game.advance(TICK) }
  }

  it('hands the work on from a contact that drifts on a bowl once it has been down a second, and not sooner', () => {
    const { game, hands, toy } = mounted()
    hands.down(1, bowl)
    drift(game, hands, 1, 31)
    expect(toy().held).toEqual({ kind: 'tuft', carried: true })
    expect(toy().resting).toBe(false)
    hands.down(2, cell(30, 30))
    expect(toy().sheet.shapes).toHaveLength(0)
    hands.up(2, cell(30, 30))
    drift(game, hands, 31, 31 + Math.round(RESTS_AFTER * 60) - 20)
    // Still moving, and down more than a second with no wool laid: it rests.
    expect(toy().resting).toBe(true)
    hands.down(3, cell(30, 30))
    expect(toy().held?.kind).toBe('stroke')
    expect(toy().sheet.shapes).toHaveLength(1)
    expect(toy().sheet.shapes[0].dye).toBe(BLUE)
    expect(hands.holds(3)).toBe(true)
  })

  it('does the same for the comb taken from the table, and never interrupts a finger that has reached the felt', () => {
    const { game, hands, toy } = mounted()
    hands.down(1, { x: COMB.x, y: COMB.y })
    for (let i = 1; i < 80; i++) { hands.move(1, { x: COMB.x + i * 0.5, y: COMB.y - i * 0.2 }); game.advance(TICK) }
    expect(toy().hand).toBe(COMB_HAND)
    expect(toy().resting).toBe(true)
    hands.down(2, bowl)
    expect(toy().hand).toBe(BLUE)
    // A tuft carried to the felt lays wool, and from then on it is the finger at work for as long as it moves.
    for (let i = 0; i < 120; i++) { hands.move(2, cell(30 + i * 0.15, 44)); game.advance(TICK) }
    expect(toy().held?.kind).toBe('stroke')
    expect(toy().resting).toBe(false)
    hands.down(3, cell(50, 20))
    expect(hands.holds(2)).toBe(true)
    expect(toy().sheet.shapes).toHaveLength(1)
  })

  it('draws the tuft on its bowl until the finger takes it, then under the finger to the felt and on it, and grows a new one on the bowl after', () => {
    const toy = fresh(GREEN, 1, 3), view = viewOf(toy)
    /** Where tufts and heaps are stamped in a frame. */
    const mounds = (): { atBowl: boolean; atFinger: boolean } => {
      const { c, calls } = watch('translate')
      view.draw(c, toy, NO_GUIDANCE)
      return {
        atBowl: calls.some((call) => call.args[0] === bowl.x && call.args[1] < BOWLS[2].y + 4),
        atFinger: calls.some((call) => call.args[0] === toy.finger.x && call.args[1] === toy.finger.y + 10),
      }
    }
    toy.press(bowl)
    toy.advance(0.4)
    expect(mounds()).toEqual({ atBowl: true, atFinger: false })
    // Off the bowl and not yet on the felt.
    toy.move({ x: bowl.x + 40, y: bowl.y - 90 })
    toy.advance(TICK)
    expect(toy.tuftInHand).toBe(true)
    expect(mounds()).toEqual({ atBowl: false, atFinger: true })
    toy.move(cell(34, 44))
    toy.advance(TICK)
    expect(toy.held?.kind).toBe('stroke')
    expect(mounds()).toEqual({ atBowl: false, atFinger: true })
    toy.end('dragEnd')
    expect(toy.rise[BLUE]).toBe(0)
    toy.advance(0.6)
    expect(mounds()).toEqual({ atBowl: true, atFinger: false })
    // A touch that lands on the felt leaves the tuft on its bowl, as the sheet has it.
    toy.press(cell(10, 10))
    toy.advance(TICK)
    expect(mounds()).toEqual({ atBowl: true, atFinger: false })
  })
})

describe('rulings 5 and 11: when the hand goes to the loop and to the comb', () => {
  /** Plays an idle stretch and returns which move was shown at each showing, and where the glow sat before the first. */
  const idle = (game: Game, seconds: number): { shown: Hint['kind'][][]; glow: Set<Hint['kind']>; at: number[] } => {
    const shown: Hint['kind'][][] = [[], [], [], []], glow = new Set<Hint['kind']>(), at: number[] = []
    const from = game.toy.t
    for (let i = 0; i < seconds * 60; i++) {
      game.advance(TICK)
      const index = game.guidance.demoIndex
      if (game.guidance.demo === null) { if (at.length === 0 && game.guidance.glow > 0.5) glow.add(game.hint.kind); continue }
      if (!shown[index].includes(game.hint.kind)) shown[index].push(game.hint.kind)
      if (at.length === index) at.push(game.toy.t - from)
    }
    return { shown, glow, at }
  }
  const touch = (game: Game): void => { game.press(ROOM, false); game.end('tap') }

  it('goes to the loop as the fourth showing, 84 idle seconds in, and only with a thing alive and a figure in the picture', () => {
    const game = new Game(undefined, 4, makeRng(1))
    daub(game.toy, GREEN, 6, 38, 30, 44)
    settle(game.toy)
    setDown(game.toy, SHEEP, 16, 40)
    touch(game)
    const first = idle(game, 100)
    expect([LOOP_DEMO, MAX_DEMOS]).toEqual([3, 4])
    expect(first.shown[LOOP_DEMO]).toEqual(['loop'])
    expect(first.shown.slice(0, 3).flat()).not.toContain('loop')
    expect(first.at.map((seconds) => Math.round(seconds))).toEqual([5, 18, 41, 84])
    expect(first.at[0]).toBeGreaterThanOrEqual(IDLE_BEFORE_DEMO)
    // The ladder's own numbers, with nothing of the game in them.
    const ladder = new IdleLadder(0), starts: number[] = []
    for (let i = 0; i <= 100 * 60; i++) { const index = ladder.update(i / 60).demoIndex; if (index === starts.length) starts.push(Math.round(i / 60)) }
    expect(starts).toEqual([5, 18, 41, 84])
    // With no figure in the picture the hand never goes to the loop: it carries a figure in.
    const alone = new Game(undefined, 4, makeRng(1))
    daub(alone.toy, GREEN, 6, 38, 30, 44)
    settle(alone.toy)
    touch(alone)
    expect(idle(alone, 100).shown.flat()).not.toContain('loop')
  })

  it('says so in the pass log: the fourth showing, 84 idle seconds, a figure in the picture', () => {
    const log = docs['./REFINEMENT.md']
    expect(log).toMatch(/fourth and last showing[^.]*84 idle seconds[^.]*figure/)
    expect(log).not.toMatch(/about 41 idle seconds/)
  })

  it('points at the comb at the first showing after wool lies on the felt, with the glow on the comb before it, once', () => {
    const game = new Game(undefined, 4, makeRng(1))
    expect(idle(game, 30).shown.flat()).not.toContain('comb')
    game.press(cell(30, 40), false); game.end('tap')
    expect(game.toy.sheet.shapes).toHaveLength(1)
    const first = idle(game, 30)
    expect([...first.glow]).toEqual(['comb'])
    expect(first.shown.slice(0, 2)).toEqual([['comb'], ['figure']])
    // A touch never brings it back in the same visit.
    touch(game)
    const second = idle(game, 30)
    expect(second.glow.has('comb')).toBe(false)
    expect(second.shown.flat()).not.toContain('comb')
  })

  it('keeps the comb for the first showing when a touch comes while only the glow is on it', () => {
    const game = new Game(undefined, 4, makeRng(1))
    game.press(cell(30, 40), false); game.end('tap')
    game.advance(4.5)
    expect([game.guidance.demo, game.hint.kind]).toEqual([null, 'comb'])
    touch(game)
    expect(idle(game, 9).shown[0]).toEqual(['comb'])
  })
})

describe('ruling 8: a cloud a sun dries thins from the sun\'s side', () => {
  /** The cloud's draws in a frame: whole, or in two parts. */
  const cloudDraws = (toy: Toy, view: View): Call[] => {
    const { c, calls } = watch('drawImage')
    view.draw(c, toy, NO_GUIDANCE)
    return calls.filter((call) => call.args.length === 8)
  }

  it.each([['right', 30, 1], ['left', 2, -1]] as const)('draws the cloud in two parts with the thinner one on the sun\'s side: sun to the %s', (_side, sunCol, side) => {
    const toy = fresh(WHITE, 1, 3)
    daub(toy, WHITE, 12, 3, 24, 8)
    toy.advance(2)
    const view = viewOf(toy)
    // It rains, and no sun dries it: one draw, a little thin.
    expect(cloudDraws(toy, view)).toHaveLength(0)
    daub(toy, YELLOW, sunCol, 4, sunCol + 5, 9)
    expect(toy.show.kind).toBe('sun')
    toy.advance(TICK)
    // The thinning has not begun: the cloud is still drawn whole.
    expect(cloudDraws(toy, view)).toHaveLength(0)
    // In the scene it comes across the cloud from the sun's edge.
    while (toy.show.kind === 'sun' && toy.show.thin < 0.5) toy.advance(TICK)
    const rain = toy.weather.rains[0], dry = rain.dry.filter(Boolean).length
    expect(dry).toBeGreaterThan(1)
    expect(dry).toBeLessThan(rain.dry.length)
    const midway = cloudDraws(toy, view)
    settle(toy)
    const parts = cloudDraws(toy, view)
    for (const pair of [midway, parts]) {
      expect(pair).toHaveLength(2)
      const [left, right] = pair
      // Left then right, meeting at the cut; the part toward the sun is the thinner.
      expect(left.args[4] + left.args[6]).toBeCloseTo(right.args[4], 6)
      const [thin, full] = side > 0 ? [right, left] : [left, right]
      expect(thin.alpha as number).toBeLessThan((full.alpha as number) - 0.15)
    }
    // At rest the cut lies where the sun's reach ends; midway it has come half of that way from the sun's edge.
    const edge = FELT.x + (side > 0 ? rain.x0 + rain.dry.indexOf(true) : rain.x0 + rain.dry.lastIndexOf(true) + 1) * CELL
    expect(parts[1].args[4]).toBeCloseTo(edge, 6)
    const from = FELT.x + (side > 0 ? rain.x1 + 1 : rain.x0) * CELL
    expect(Math.abs(midway[1].args[4] - from)).toBeGreaterThan(0.3 * Math.abs(edge - from))
    expect(Math.abs(midway[1].args[4] - from)).toBeLessThan(0.9 * Math.abs(edge - from))
  })
})

describe('ruling 10: mist has three wisps of three lengths, no two strokes of frost cross, and a goose in mist is read as a goose', () => {
  it('stitches mist with three wisps, no two of a length', () => {
    const toy = fresh(WHITE, 1, 3)
    daub(toy, WHITE, 10, 40, 40, 46)
    const mist = toy.sheet.shapes[0]
    expect(mist.kind).toBe('mist')
    for (const t of [0, 1.3, 7.7]) {
      const { c, calls } = watch('moveTo', 'quadraticCurveTo')
      new Carry().marks(c, mist, t, 0, [], 1)
      expect(calls.map((call) => call.name)).toEqual(['moveTo', 'quadraticCurveTo', 'moveTo', 'quadraticCurveTo', 'moveTo', 'quadraticCurveTo'])
      const longs = [0, 2, 4].map((i) => calls[i + 1].args[2] - calls[i].args[0])
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) expect(Math.abs(longs[a] - longs[b])).toBeGreaterThan(0.1 * Math.max(...longs))
    }
    expect(new Set(WISPS).size).toBe(3)
  })

  it('lays the strokes of frost so that no two cross, on a thing of any size', () => {
    type Segment = [number, number, number, number]
    const turn = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number): number => Math.sign((bx - ax) * (cy - ay) - (by - ay) * (cx - ax))
    const cross = (p: Segment, q: Segment): boolean => turn(p[0], p[1], p[2], p[3], q[0], q[1]) !== turn(p[0], p[1], p[2], p[3], q[2], q[3]) && turn(q[0], q[1], q[2], q[3], p[0], p[1]) !== turn(q[0], q[1], q[2], q[3], p[2], p[3])
    // Two hundred small things, each with its own id, and a few large ones: wide, tall, and square.
    const sheet = makeSheet(), carry = new Carry(), joins: Join[] = [], laid: Laid[] = []
    const sizes: [number, number][] = [[1, 1], [3, 1], [1, 3], [2, 2], [3, 2], [2, 3], [4, 3], [3, 3]]
    const things: Shape[] = []
    for (let i = 0; i < 200; i++) {
      const [w, h] = sizes[i % sizes.length], col = (i % 14) * 5, row = Math.floor(i / 14) * 3
      const thing = shapeFor(sheet, i % 5, col, row, 0.5, joins, 1000)
      for (let y = row; y < row + h; y++) for (let x = col; x < col + w; x++) lay(sheet, thing, x, y, 0, 2, laid, joins)
      things.push(thing)
    }
    for (const [w, h, col] of [[20, 2, 0], [3, 12, 22], [14, 9, 28], [12, 12, 44], [10, 1, 58]]) {
      const thing = shapeFor(sheet, 0, col, 47 - h, 0.5, joins, 1000)
      for (let y = 47 - h; y < 47; y++) for (let x = col; x < col + w; x++) lay(sheet, thing, x, y, 0, 2, laid, joins)
      things.push(thing)
    }
    expect(new Set(things.map((thing) => thing.id)).size).toBe(205)
    let seen = 0
    things.forEach((thing, i) => {
      const { c, calls } = watch('moveTo', 'lineTo')
      carry.veil(c, thing, WHITE, 2, 1)
      expect(calls).toHaveLength(FROST * 2)
      const strokes: Segment[] = []
      for (let k = 0; k < calls.length; k += 2) strokes.push([calls[k].args[0], calls[k].args[1], calls[k + 1].args[0], calls[k + 1].args[1]])
      // Each is long enough to be seen as a stroke, on the smallest thing too.
      for (const stroke of strokes) expect(Math.hypot(stroke[2] - stroke[0], stroke[3] - stroke[1])).toBeGreaterThan(1.5)
      for (let a = 0; a < strokes.length; a++) for (let b = a + 1; b < strokes.length; b++) { seen++; expect(cross(strokes[a], strokes[b]), `thing ${i}, strokes ${a} and ${b}`).toBe(false) }
    })
    expect(seen).toBe(things.length * 21)
  })

  it('shows the goose in mist as its head down to under the eye, with its bill and its eye, on the line where the mist ends', () => {
    const art = makeFolkArt(make, 1), mist: Stance = { scale: 0.5, flip: false, sunk: 0, blind: false, mist: 480 }
    const into = tally(), c = standIn(into), feet: number[] = [], boxes: number[][] = []
    ;(c as unknown as { translate: (x: number, y: number) => void }).translate = (_x, y) => { feet.push(y) }
    ;(c as unknown as { rect: (...box: number[]) => void }).rect = (...box) => { boxes.push(box) }
    // Both halves of the bill, the head, and the eye: four draws, one of them the fill of the face.
    expect(drawFigure(c, art, GOOSE, 300, 500, rest(), mist)).toBe(4)
    expect([into.calls.fill, into.calls.stroke ?? 0]).toEqual([1, 0])
    // The window it shows through, against its head: over the crown, down past the eye (which ends 3 below the
    // head's middle) and the upper half of the bill (10 below), and out past the tip of the bill (61 to the left).
    const [x, y, w, h] = boxes[0]
    expect(y).toBeLessThanOrEqual(-30)
    expect(y + h).toBe(GOOSE_SHOWS)
    expect(GOOSE_SHOWS).toBeGreaterThanOrEqual(10)
    expect(x).toBeLessThanOrEqual(-61)
    expect(x + w).toBeGreaterThanOrEqual(25)
    // Its head's middle stands 230 over its feet: the foot of that window is on the line where the mist ends.
    expect(feet[0]).toBe(480 + (230 - GOOSE_SHOWS) * 0.5)
    // The other three still show their ears alone.
    for (const [who, pieces] of [[SHEEP, 2], [SHEPHERD, 1], [PIG, 2]] as const) expect(drawFigure(standIn(tally()), art, who, 300, 500, rest(), mist)).toBe(pieces)
    expect(Object.keys(EARS_FROM)).toEqual(['sheep', 'shepherd', 'pig'])
  })
})

describe('ruling 11: the comb is seen to wriggle', () => {
  it('draws the comb turning on the table for as long as it wriggles, and at rest in the lit room before and after', () => {
    const toy = fresh(GREEN, 1, 3), view = viewOf(toy)
    /** The turn the comb is drawn at where the view draws it itself, or null where it rests in the lit room. */
    const turnOfComb = (): number | null => {
      const { c, calls } = watch('translate', 'rotate')
      view.draw(c, toy, NO_GUIDANCE)
      const at = calls.findIndex((call) => call.name === 'translate' && call.args[0] === COMB.x)
      return at < 0 ? null : calls[at + 1].name === 'rotate' ? calls[at + 1].args[0] : 0
    }
    daub(toy, GREEN, 6, 38, 30, 44)
    toy.advance(0.3)
    expect(turnOfComb()).toBeNull()
    while (toy.combWag < 0) toy.advance(TICK)
    const turns: number[] = []
    for (let i = 0; i < Math.round(WAG * 60) - 2; i++) { toy.advance(TICK); const turn = turnOfComb(); expect(turn).not.toBeNull(); turns.push(turn!) }
    // It goes both ways, and dies away.
    expect(Math.max(...turns)).toBeGreaterThan(0.05)
    expect(Math.min(...turns)).toBeLessThan(-0.05)
    expect(Math.abs(turns[turns.length - 1])).toBeLessThan(0.03)
    toy.advance(0.3)
    expect(turnOfComb()).toBeNull()
  })
})
