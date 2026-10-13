import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { actVoice, loopBack, loopTwang } from './calls'
import { poseOf, rest } from './cast'
import { TIERS } from './config'
import type { Ctx } from './felted'
import { boxOf, wear } from './folk'
import { makeFolkArt } from './folkArt'
import { EARS_FROM, FEELER_TIP, drawFigure, type Stance } from './folkDraw'
import { Game } from './game'
import type { Guidance } from './guidance'
import { Hands } from './hands'
import { LOOP_DEMO, type Hint } from './hint'
import { CELL, COMB_HAND, FELT, FOLK, GOOSE, LOOP, MOTH_UP, PEGS, PIG, SHEEP, SHEPHERD, perchOn, pictureBox } from './layout'
import { cell, dab, daub, fresh, make, setDown, settle, standIn, tally } from './probe'
import { makeRng } from './rng'
import { FLIGHT, HANG, TICK, type Toy } from './toy'
import { View } from './view'
import { folkVoice } from './voices'
import { GREEN, WHITE, YELLOW } from './wool'

// The close of the first reading, second half: the rulings the figures in the
// dish, the idle hand, the loop, the mist, the drying, the cheapest tier, the
// hands and the moth hold. Each test fails when its fix is taken out.

const sources = import.meta.glob('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
/** A point of the bare wall: under the pictures, over the dish. */
const ROOM = { x: 1160, y: 250 }
const notes = (toy: Toy): Note[] => [...(toy.takeSounds() ?? []), ...(toy.takeSceneSounds() ?? [])]
const hears = (heard: readonly Note[], first: Note): boolean => heard.some((note) => note.kind === first.kind && note.frequency === first.frequency && note.peak === first.peak && note.decay === first.decay)

describe('ruling 6: a figure answers the thing, not the child', () => {
  it('has every figure in the dish look at a thing that wakes, with no hop and no glad sound, and stay where it is', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, GREEN, 6, 38, 30, 44)
    expect(toy.sheet.shapes[0].kind).toBe('hill')
    const heard: Note[] = notes(toy)
    for (let who = 0; who < 4; who++) {
      const figure = toy.folk[who]
      expect(figure.mood).toBe('look')
      expect(figure.lookAt).not.toBeNull()
      expect(figure.at).toBeNull()
    }
    for (let i = 0; i < 120; i++) {
      toy.advance(TICK)
      heard.push(...notes(toy))
      for (let who = 0; who < 4; who++) {
        const figure = toy.folk[who], age = toy.t - figure.moodSince
        // Looking lifts no figure off its feet: its body is where it would be with no mood on it.
        const looking = poseOf(who, toy.t, figure.mood, age, 0, 0, 0, rest()), plain = poseOf(who, toy.t, 'idle', 0, 0, 0, 0, rest())
        expect(Math.abs(looking.dy - plain.dy)).toBeLessThan(0.5)
        expect(figure.hop).toBeNull()
        expect(figure.at).toBeNull()
      }
    }
    // The sheep, which is drawn to a hill, is heard in its plain voice as it looks. Nobody is heard glad.
    expect(hears(heard, folkVoice(SHEEP, 'look', 0)[0].notes[0])).toBe(true)
    for (const name of ['voices', 'calls', 'toy', 'folk']) expect(sources[`./${name}.ts`], name).not.toMatch(/'love'/)
  })
})

describe('ruling 7: the hand at the loop is shown once, late, and the hand points at the comb once', () => {
  /** Plays an idle stretch and returns which moves the hand showed, by showing. */
  const idle = (game: Game, seconds: number): Set<Hint['kind']>[] => {
    const shown: Set<Hint['kind']>[] = [new Set(), new Set(), new Set(), new Set()]
    for (let i = 0; i < seconds * 60; i++) {
      game.advance(TICK)
      if (game.guidance.demo !== null) shown[game.guidance.demoIndex].add(game.hint.kind)
    }
    return shown
  }
  const pictured = (): Game => {
    const game = new Game(undefined, 4, makeRng(1))
    daub(game.toy, GREEN, 6, 38, 30, 44)
    settle(game.toy)
    setDown(game.toy, SHEEP, 16, 40)
    return game
  }

  it('goes to the loop only as the last showing, once in a visit, and never again after a touch', () => {
    const game = pictured()
    const first = idle(game, 110)
    expect(LOOP_DEMO).toBe(3)
    expect(first.map((kinds) => [...kinds])).toEqual([['comb'], ['wool'], ['wool'], ['loop']])
    game.press(ROOM, false); game.end('tap')
    const second = idle(game, 110)
    expect(second.map((kinds) => [...kinds])).toEqual([['wool'], ['wool'], ['wool'], ['wool']])
  })

  it('counts a showing at the loop that a touch cut short as shown', () => {
    const game = pictured()
    for (let i = 0; i < 110 * 60 && game.guidance.demoIndex !== LOOP_DEMO; i++) game.advance(TICK)
    expect(game.hint.kind).toBe('loop')
    game.advance(0.5)
    game.press(ROOM, false); game.end('tap')
    expect(idle(game, 110).some((kinds) => kinds.has('loop'))).toBe(false)
  })

  it('points at the comb only when wool lies on the felt, and not once the comb has been used', () => {
    const bare = new Game(undefined, 4, makeRng(1))
    expect(idle(bare, 40).some((kinds) => kinds.has('comb'))).toBe(false)
    const used = pictured()
    used.toy.hand = COMB_HAND
    used.advance(TICK)
    used.toy.hand = GREEN
    expect(idle(used, 110).some((kinds) => kinds.has('comb'))).toBe(false)
    // The view draws the move the game has chosen.
    expect(sources['./wool-picture.tsx']).toMatch(/view\.draw\(surface, game \? game\.toy : null, playing\.guidance, playing\.hint\)/)
  })
})

describe('ruling 8: a bare sheet is not hung', () => {
  it('swings the loop back with its sound at a tap or a drag, and hangs a picture only once wool lies on the felt', () => {
    const toy = fresh(GREEN, 1, 3)
    toy.press(LOOP)
    expect(toy.takeSounds()).toEqual(loopTwang)
    toy.end('tap')
    expect(toy.finished).toBe(false)
    expect(toy.wall).toHaveLength(0)
    expect(toy.scene).toBeNull()
    expect(toy.takeSounds()).toEqual(loopBack)
    expect(toy.loopBackAt).toBe(toy.t)
    toy.advance(1)
    toy.press(LOOP); toy.move(PEGS[1]); toy.advance(TICK); toy.end('dragEnd')
    expect(toy.finished).toBe(false)
    expect(toy.wall).toHaveLength(0)
    dab(toy, GREEN, 30, 30)
    toy.advance(1)
    toy.press(LOOP); toy.move(PEGS[1]); toy.advance(TICK); toy.end('dragEnd')
    expect(toy.finished).toBe(true)
    expect(toy.wall.map((picture) => picture.peg)).toEqual([1])
  })
})

describe('ruling 9: a figure in mist shows only its ears', () => {
  const art = makeFolkArt(make, 1)
  /** A surface that counts, and keeps where the figure's feet were put. */
  const drawn = (who: number, stance: Stance, y = 500) => {
    const into = tally(), c = standIn(into)
    const feet: number[] = []
    ;(c as unknown as { translate: (x: number, y: number) => void }).translate = (_x, at) => { feet.push(at) }
    const draws = drawFigure(c as Ctx, art, who, 300, y, rest(), stance)
    return { draws, fills: into.calls.fill ?? 0, strokes: into.calls.stroke ?? 0, feet: feet[0] }
  }

  // The goose is the one that shows a face: its head down to under the eye, with both halves of its bill (reading2View.test.ts).
  it.each([[SHEEP, 2, 0, EARS_FROM.sheep], [GOOSE, 4, 1, 0], [SHEPHERD, 1, 0, EARS_FROM.shepherd], [PIG, 2, 0, EARS_FROM.pig]] as const)('figure %i: %i draws, %i of them a face, on the line where the mist ends', (who, pieces, fills, earsFrom) => {
    const out = drawn(who, { scale: 0.5, flip: false, sunk: 0, blind: false, mist: null })
    expect(out.draws).toBeGreaterThan(pieces + 1)
    expect(out.fills).toBeGreaterThan(0)
    // Low mist: the figure is drawn sunk, with the line its ears begin on at the top of the mist.
    const low = drawn(who, { scale: 0.5, flip: false, sunk: 0, blind: false, mist: 480 })
    expect(low.draws).toBe(pieces)
    expect(low.fills).toBe(fills)
    expect(low.strokes).toBe(0)
    expect(low.feet).toBeGreaterThan(500)
    if (earsFrom > 0) expect(low.feet).toBe(480 + earsFrom * 0.5)
    // Mist that stands higher than its ears: it stays on its feet, and still only its ears are drawn.
    const high = drawn(who, { scale: 0.5, flip: false, sunk: 0, blind: false, mist: 100 })
    expect(high.draws).toBe(pieces)
    expect(high.feet).toBe(500)
  })

  it('reads the top of the mist over each figure from the wool, inside the box the figure answers a touch on', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, WHITE, 16, 40, 56, 47)
    settle(toy)
    expect(toy.sheet.shapes[0].kind).toBe('mist')
    const cols = [22, 32, 42, 52]
    for (let who = 0; who < 4; who++) setDown(toy, who, cols[who], 42)
    toy.advance(1)
    for (let who = 0; who < 4; who++) {
      const figure = toy.folk[who], box = boxOf(toy, who), line = FELT.y + figure.mistTop * CELL
      expect(figure.mist, `figure ${who}`).toBe(true)
      expect(figure.mistTop).toBe(40)
      expect(line).toBeGreaterThanOrEqual(box.y)
      expect(line).toBeLessThanOrEqual(box.y + box.h)
    }
    expect(sources['./view.ts']).toMatch(/stance\.mist = stands && figure\.mist && figure\.mistTop >= 0 \? FELT\.y \+ figure\.mistTop \* CELL : null/)
  })
})

describe('ruling 10: a dried figure stands up when the drying comes, not at the touch', () => {
  const wet = (): Toy => {
    const toy = fresh(GREEN, 1, 9)
    daub(toy, WHITE, 6, 3, 20, 8)
    settle(toy)
    setDown(toy, SHEEP, 17, 40)
    settle(toy)
    toy.advance(8)
    expect(toy.folk[SHEEP].shown).toBe('soaked')
    notes(toy)
    return toy
  }

  it('goes on as it was in the rain until the rain over it has stopped, then stands and is heard standing', () => {
    const toy = wet()
    daub(toy, YELLOW, 26, 4, 31, 9)
    expect(toy.show.kind).toBe('sun')
    const sheep = toy.folk[SHEEP], standing = actVoice(SHEEP, 'stand')[0].notes[0]
    expect(sheep.dried).toBe(true)
    expect(sheep.act).toBe('stand')
    let stoodAt = -1, heardAt = -1
    for (let i = 0; i < 6 * 60 && toy.scene; i++) {
      toy.advance(TICK)
      const heard = notes(toy)
      if (toy.show.dry <= 0) expect(sheep.shown).toBe('soaked')
      else { expect(sheep.shown).toBe('stand'); if (stoodAt < 0) stoodAt = toy.t }
      if (heardAt < 0 && hears(heard, standing)) heardAt = toy.t
    }
    // The drops over it stop when the steam is whole, which is before the drying begins.
    expect(stoodAt).toBeGreaterThan(3)
    expect(heardAt).toBe(stoodAt)
  })

  it('finds it standing, without a sound, when a touch ends the scene first', () => {
    const toy = wet()
    daub(toy, YELLOW, 26, 4, 31, 9)
    toy.advance(1)
    expect(toy.folk[SHEEP].shown).toBe('soaked')
    notes(toy)
    toy.press(ROOM); toy.end('tap')
    expect(toy.folk[SHEEP].shown).toBe('stand')
    const standing = actVoice(SHEEP, 'stand')[0].notes[0]
    let heard = false
    for (let i = 0; i < 60; i++) { toy.advance(TICK); heard ||= hears(notes(toy), standing) }
    expect(heard).toBe(false)
  })
})

describe('ruling 11: the answer to a touch is never something a tier leaves out', () => {
  const NO_GUIDANCE: Guidance = { glow: 0, demo: null, demoIndex: -1 }

  it('draws the lint a touch on the bare room raises at every tier', () => {
    for (const tier of TIERS) {
      const toy = fresh(GREEN, 1, 3), view = new View(make)
      view.setTier(tier, toy)
      view.resize(1180, 820, tier.dpr, { scale: 1, x: 0, y: 0 })
      view.load(toy)
      toy.advance(1)
      const surface = tally(), c = standIn(surface)
      view.draw(c, toy, NO_GUIDANCE)
      const before = surface.draws
      toy.press(ROOM); toy.end('tap')
      expect(toy.floaters).toHaveLength(3)
      toy.advance(TICK)
      surface.draws = 0
      view.draw(c, toy, NO_GUIDANCE)
      expect(surface.draws, `tier with ${tier.floaters} floaters`).toBe(before + 3)
    }
    expect(TIERS[TIERS.length - 1].floaters).toBe(0)
  })
})

describe('ruling 13: the moth', () => {
  it('goes to circle a figure that was lit while it was in the air, when it lands', () => {
    const toy = fresh(GREEN, 1, 3)
    toy.press(toy.mothAt()!); toy.end('tap')
    expect(toy.moth.flying).not.toBeNull()
    wear(toy, SHEEP, YELLOW)
    expect(toy.moth.orbit).toBeNull()
    toy.advance(FLIGHT + 0.1)
    expect(toy.moth.orbit?.who).toBe(SHEEP)
    // One whose coat came off again before the moth landed is left alone.
    const other = fresh(GREEN, 1, 3)
    other.press(other.mothAt()!); other.end('tap')
    wear(other, PIG, YELLOW)
    wear(other, PIG, GREEN)
    other.advance(FLIGHT + 0.1)
    expect(other.moth.orbit).toBeNull()
  })

  it('sits under a hung picture with nothing of it over the picture, not even its feelers', () => {
    expect(MOTH_UP).toBeGreaterThanOrEqual(-FEELER_TIP + 2)
    for (let peg = 0; peg < PEGS.length; peg++) {
      const box = pictureBox(peg)
      expect(perchOn(peg).y - MOTH_UP).toBeGreaterThanOrEqual(box.y + box.h)
    }
    expect(sources['./folkDraw.ts']).toMatch(/quadraticCurveTo\(-12, -32, -17, FEELER_TIP\)/)
  })
})

describe('ruling 12: a resting contact never deadens the game, and a carry survives a lifted finger', () => {
  /** The game with the hands the Mount gives it: the surface is the stage, and nothing is in the grown-up's corner. */
  const mounted = (): { game: Game; hands: Hands; toy: () => Toy } => {
    const game = new Game(undefined, 4, makeRng(1))
    return { game, hands: new Hands(() => game, (at) => at, () => false, () => undefined), toy: () => game.toy }
  }
  const dish = (who: number) => ({ x: FOLK[who].x, y: FOLK[who].y - FOLK[who].h / 2 })

  it('hands the work from a contact that landed where nothing is to the next contact that lands', () => {
    const { hands, toy } = mounted()
    hands.down(1, ROOM)
    expect(toy().held?.kind).toBe('press')
    hands.down(2, cell(30, 30))
    expect(toy().held?.kind).toBe('stroke')
    expect(toy().sheet.shapes).toHaveLength(1)
    expect(hands.holds(2)).toBe(true)
    // The first contact lifting later does nothing.
    hands.up(1, ROOM)
    expect(toy().held?.kind).toBe('stroke')
    hands.up(2, cell(30, 30))
    expect(toy().held).toBeNull()
  })

  it('hands it on from a finger that has lain still on a figure for a second, and not sooner', () => {
    const { game, hands, toy } = mounted()
    hands.down(1, dish(PIG))
    game.advance(0.5)
    hands.down(2, cell(30, 30))
    expect(toy().sheet.shapes).toHaveLength(0)
    game.advance(0.6)
    hands.down(3, cell(30, 30))
    expect(toy().held?.kind).toBe('stroke')
    expect(toy().sheet.shapes).toHaveLength(1)
  })

  it('never interrupts a finger that lays wool or combs by moving, or one that carries, however still that one is', () => {
    const wool = mounted()
    wool.hands.down(1, cell(30, 30))
    for (let i = 0; i < 120; i++) { wool.hands.move(1, cell(30 + i * 0.2, 30)); wool.game.advance(TICK) }
    wool.hands.down(2, dish(PIG))
    expect(wool.hands.holds(1)).toBe(true)
    expect(wool.toy().held?.kind).toBe('stroke')
    expect(wool.toy().folk[PIG].mood).toBe('idle')
    const carry = mounted()
    carry.hands.down(1, dish(GOOSE))
    carry.hands.move(1, cell(40, 30))
    carry.game.advance(2)
    carry.hands.down(2, cell(10, 10))
    expect(carry.hands.holds(1)).toBe(true)
    expect(carry.toy().held).toMatchObject({ kind: 'figure', who: GOOSE, lifted: true })
    expect(carry.toy().sheet.shapes).toHaveLength(0)
    const comb = mounted()
    dab(comb.toy(), GREEN, 20, 30)
    comb.toy().hand = COMB_HAND
    comb.hands.down(1, cell(20, 30))
    for (let i = 0; i < 120; i++) { comb.hands.move(1, cell(20 + i * 0.2, 30)); comb.game.advance(TICK) }
    comb.hands.down(2, dish(PIG))
    expect(comb.hands.holds(1)).toBe(true)
    expect(comb.toy().stroke?.comb).toBe(true)
  })

  it('hangs a carried figure where it was let go for 0.3 s: a finger back on it carries on, and after that it is set down', () => {
    const { game, hands, toy } = mounted()
    expect(HANG).toBe(0.3)
    hands.down(1, dish(GOOSE))
    hands.move(1, cell(40, 30))
    game.advance(0.1)
    hands.up(1, cell(40, 30))
    // Let go, and not yet set down: it hangs where the finger left it.
    expect(toy().hanging).toBe(true)
    expect(toy().held).toMatchObject({ kind: 'figure', who: GOOSE, lifted: true })
    expect(toy().folk[GOOSE].at).toBeNull()
    game.advance(0.2); hands.frame()
    expect(toy().hanging).toBe(true)
    expect(Math.abs(toy().folk[GOOSE].x - cell(40, 30).x)).toBeLessThan(1)
    // A finger lands on it again inside the time: the same carry goes on, with no new press.
    hands.down(2, cell(41, 31))
    expect(toy().hanging).toBe(false)
    expect(toy().held).toMatchObject({ kind: 'figure', who: GOOSE, lifted: true })
    hands.move(2, cell(52, 34))
    game.advance(TICK)
    expect(Math.abs(toy().folk[GOOSE].x - cell(52, 34).x)).toBeLessThan(1)
    hands.up(2, cell(52, 34))
    game.advance(0.2); hands.frame()
    expect(toy().folk[GOOSE].at).toBeNull()
    game.advance(0.15); hands.frame()
    expect(toy().held).toBeNull()
    expect(toy().folk[GOOSE].at).not.toBeNull()
    expect(Math.abs(toy().folk[GOOSE].at!.col - 52)).toBeLessThanOrEqual(1)
  })

  it('hangs the comb the same way, and it does no work while it hangs', () => {
    const { game, hands, toy } = mounted()
    daub(toy(), GREEN, 6, 28, 40, 34)
    toy().hand = COMB_HAND
    hands.down(1, cell(10, 31))
    hands.move(1, cell(14, 31))
    game.advance(0.1)
    hands.up(1, cell(14, 31))
    expect(toy().hanging).toBe(true)
    expect(toy().stroke?.comb).toBe(true)
    const mass = toy().sheet.shapes[0].mass
    game.advance(0.25); hands.frame()
    expect(toy().sheet.shapes[0].mass).toBe(mass)
    hands.down(2, cell(15, 31))
    hands.move(2, cell(30, 31))
    game.advance(0.2)
    expect(toy().sheet.shapes[0].mass).toBeLessThan(mass)
    hands.up(2, cell(30, 31))
    game.advance(0.35); hands.frame()
    expect(toy().stroke).toBeNull()
    expect(toy().held).toBeNull()
  })

  it('ends a stroke of wool at the lift, and sets down what hangs when the game is put away: nothing is lost', () => {
    const wool = mounted()
    wool.hands.down(1, cell(20, 30))
    wool.hands.move(1, cell(30, 30))
    wool.game.advance(0.1)
    wool.hands.up(1, cell(30, 30))
    expect(wool.toy().held).toBeNull()
    expect(wool.toy().stroke).toBeNull()
    const { game, hands, toy } = mounted()
    hands.down(1, dish(GOOSE))
    hands.move(1, cell(40, 30))
    game.advance(0.1)
    hands.up(1, cell(40, 30))
    expect(toy().hanging).toBe(true)
    hands.clear()
    expect(toy().held).toBeNull()
    expect(toy().folk[GOOSE].at).not.toBeNull()
    game.park()
    expect(game.toy.folk[GOOSE].at).not.toBeNull()
    expect(game.toy.held).toBeNull()
  })

  it('is the path the Mount takes: every pointer goes through the hands, timed on the toy\'s clock', () => {
    const mount = sources['./wool-picture.tsx']
    for (const call of ['hands.down(event.pointerId, where)', 'hands.move(event.pointerId, where)', 'hands.up(event.pointerId, where)', 'hands.cancel(event.pointerId)', 'hands.frame()', 'hands.clear()']) expect(mount).toContain(call)
    expect(mount).not.toMatch(/ForgivingTouch|letGo\(/)
    expect(sources['./hands.ts']).toMatch(/game\.toy\.t \* 1000/)
  })
})
