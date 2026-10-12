import { describe, expect, it } from 'vitest'
import type { Note } from './audio'
import { bareRasp, combPluck, dryCracks, loopBack, loopTwang, rasp } from './calls'
import type { Ctx } from './felted'
import { Game } from './game'
import { BOWLS, COMB, COMB_HAND, LOOP, PEGS, SHEPHERD } from './layout'
import { cell, daub, fresh, hangUp, setDown, settle, standIn, tally } from './probe'
import { makeRng } from './rng'
import { wetUnder } from './scenes'
import { rainPath } from './sky'
import { HANG_REACH, TICK, Toy, atPeg } from './toy'
import { pluck, puff, type Cue } from './voices'
import { canRain } from './weather'
import { BLUE, GREEN, WHITE, YELLOW, heightOf, topAt } from './wool'

// The close of the third reading, first half: the rulings the game's model
// holds, each with a test that fails when its fix is taken out. The hands,
// the ladder, the marks and the documents are in reading3View.test.ts.

type Heard = { at: number; note: Note }
const same = (a: Note, b: Note): boolean => a.kind === b.kind && a.frequency === b.frequency && a.peak === b.peak && a.attack === b.attack && a.decay === b.decay && a.glideTo === b.glideTo
const take = (toy: Toy): Note[] => [...(toy.takeSounds() ?? []), ...(toy.takeSceneSounds() ?? [])]
function listen(toy: Toy, seconds: number, each?: () => void): Heard[] {
  const heard: Heard[] = []
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    toy.advance(TICK)
    for (const note of take(toy)) heard.push({ at: toy.t, note })
    each?.()
  }
  return heard
}
const firstOf = (cue: Cue): Note => cue[0].notes[0]
const onBowl = (dye: number): { x: number; y: number } => ({ x: BOWLS[dye].x, y: BOWLS[dye].y - 16 })
const tap = (toy: Toy, at: { x: number; y: number }): void => { toy.press(at); toy.end('tap') }
const mass = (toy: Toy): number => toy.sheet.shapes.reduce((sum, shape) => sum + shape.mass, 0)

describe('ruling 2: with the comb chosen, a touch where no wool lies lays wool from the bowl last chosen', () => {
  it('lays wool from that bowl in the tick the finger lands, and the comb is back in its place', () => {
    const toy = fresh(GREEN, 1, 3)
    tap(toy, onBowl(BLUE))
    tap(toy, { x: COMB.x, y: COMB.y })
    expect([toy.hand, toy.lastBowl]).toEqual([COMB_HAND, BLUE])
    toy.advance(1)
    take(toy)
    toy.press(cell(30, 30))
    expect(toy.hand).toBe(BLUE)
    expect(toy.stroke?.comb).toBe(false)
    expect(toy.sheet.shapes.map((shape) => shape.dye)).toEqual([BLUE])
    expect(topAt(toy.sheet, 30, 30)).toBeDefined()
    const heard = take(toy)
    expect(heard.some((note) => same(note, puff(BLUE, toy.size)[0]))).toBe(true)
    for (const height of [0, 1, 2]) expect(heard.some((note) => same(note, bareRasp(height)[0]))).toBe(false)
    expect(toy.naps).toHaveLength(0)
    // The comb is seen to land back where it lies, and the blue tuft stands up again.
    expect(toy.comb.vel).toBe(9)
    toy.end('tap')
    toy.advance(1)
    expect(toy.rise[BLUE]).toBeGreaterThan(0.9)
    expect(toy.combInHand).toBe(false)
  })

  it('takes the green bowl where the game was opened with the comb chosen', () => {
    const toy = fresh(COMB_HAND, 1, 3)
    toy.press(cell(30, 30))
    expect(toy.hand).toBe(GREEN)
    expect(toy.sheet.shapes.map((shape) => shape.dye)).toEqual([GREEN])
  })

  it('still combs where the touch lands on wool, or within the comb\'s reach of it', () => {
    for (const col of [20, 31.4]) {
      const toy = fresh(GREEN, 1, 3)
      daub(toy, GREEN, 10, 38, 30, 44)
      settle(toy)
      tap(toy, { x: COMB.x, y: COMB.y })
      const before = mass(toy)
      take(toy)
      toy.press(cell(col, 41))
      expect(toy.hand).toBe(COMB_HAND)
      expect(toy.stroke?.comb).toBe(true)
      // On the wool it rasps as it lands; at its edge it may raise the nap first, and it is the comb all the same.
      if (col === 20) expect(take(toy).some((note) => same(note, rasp(heightOf(41))[0]))).toBe(true)
      toy.advance(0.3)
      toy.end('tap')
      expect(mass(toy)).toBeLessThan(before)
      expect(toy.sheet.shapes).toHaveLength(1)
    }
  })

  it('goes on combing when the comb is drawn on from wool onto bare felt, or carried there from the table: the nap stands up', () => {
    const drawn = fresh(GREEN, 1, 3)
    daub(drawn, GREEN, 10, 38, 30, 44)
    settle(drawn)
    tap(drawn, { x: COMB.x, y: COMB.y })
    drawn.press(cell(28, 41))
    for (let i = 1; i <= 40; i++) { drawn.move(cell(28 + i * 0.5, 41)); drawn.advance(TICK) }
    expect(drawn.hand).toBe(COMB_HAND)
    expect(drawn.naps.length).toBeGreaterThan(0)
    expect(drawn.sheet.shapes).toHaveLength(1)
    const carried = fresh(GREEN, 1, 3)
    carried.press({ x: COMB.x, y: COMB.y })
    carried.move(cell(40, 20))
    carried.advance(0.3)
    expect(carried.hand).toBe(COMB_HAND)
    expect(carried.stroke?.comb).toBe(true)
    expect(carried.sheet.shapes).toHaveLength(0)
    expect(carried.naps.length).toBeGreaterThan(0)
  })
})

describe('ruling 6: no sound without something seen', () => {
  const dries = (wet: (toy: Toy) => void): { toy: Toy; heard: Heard[]; from: number } => {
    const toy = fresh(WHITE, 1, 3)
    wet(toy)
    daub(toy, WHITE, 12, 3, 18, 7)
    settle(toy)
    daub(toy, YELLOW, 22, 4, 27, 9)
    expect(toy.show.kind).toBe('sun')
    const from = toy.t
    return { toy, heard: listen(toy, 6), from }
  }

  it('cracks in the sun\'s scene only where something was wet: a thing the rain fell on, or a figure', () => {
    const bare = dries(() => undefined)
    expect(bare.heard.some((one) => same(one.note, firstOf(dryCracks)))).toBe(false)
    const hill = dries((toy) => { daub(toy, GREEN, 10, 39, 20, 45); settle(toy) })
    const cracks = hill.heard.filter((one) => same(one.note, firstOf(dryCracks)))
    expect(cracks.length).toBeGreaterThan(0)
    // In the tick the drying begins to show.
    expect(cracks[0].at - hill.from).toBeGreaterThan(3.2 - 2 * TICK)
    expect(cracks[0].at - hill.from).toBeLessThan(3.2 + 2 * TICK)
    const man = fresh(WHITE, 1, 3)
    daub(man, WHITE, 12, 3, 18, 7)
    settle(man)
    setDown(man, SHEPHERD, 15, 40)
    man.advance(3)
    take(man)
    daub(man, YELLOW, 22, 4, 27, 9)
    expect(man.show.kind).toBe('sun')
    expect(wetUnder(man)).toBe(true)
    expect(listen(man, 6).some((one) => same(one.note, firstOf(dryCracks)))).toBe(true)
  })

  it('plucks the comb in the fresh felt\'s scene in the tick the comb hops where it lies', () => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, GREEN, 6, 38, 30, 44)
    settle(toy)
    tap(toy, { x: COMB.x, y: COMB.y })
    hangUp(toy)
    settle(toy)
    toy.advance(2)
    take(toy)
    expect(toy.hand).toBe(COMB_HAND)
    toy.press(cell(30, 20)); toy.end('tap')
    expect(toy.show.kind).toBe('fresh')
    let still = 0, hopped = -1
    const heard = listen(toy, 3, () => { if (hopped < 0 && Math.abs(toy.comb.dip) > 1e-4) hopped = toy.t; if (hopped < 0) still = toy.t })
    const plucks = heard.filter((one) => same(one.note, firstOf(combPluck)))
    expect(plucks).toHaveLength(1)
    // The comb lay still until then, and moves from the tick after its pluck.
    expect(plucks[0].at).toBeGreaterThanOrEqual(still)
    expect(hopped - plucks[0].at).toBeLessThan(2 * TICK)
    expect(hopped).toBeGreaterThan(0)
  })
})

describe('ruling 7: a bowl or the comb tapped in the evening changes nothing saved and nothing unseen', () => {
  it('dips and sounds, and chooses nothing, draws up no size and asks for no save', () => {
    const game = new Game(undefined, 4, makeRng(5)), toy = game.toy
    daub(toy, GREEN, 6, 38, 30, 44)
    settle(toy)
    hangUp(toy)
    settle(toy)
    toy.advance(2)
    const before = JSON.stringify(game.record()), size = toy.size
    toy.changed = false; toy.urgent = false
    for (const [at, dye] of [[onBowl(GREEN), GREEN], [onBowl(GREEN), GREEN], [onBowl(BLUE), BLUE]] as const) {
      take(toy)
      toy.press(at)
      // It answers when the finger lands: the heap dips and the bowl sounds.
      expect(toy.bowls[dye].vel).toBe(9)
      expect(take(toy)).toEqual(pluck(dye, size))
      toy.end('tap')
      expect(take(toy)).toEqual([])
      toy.advance(0.5)
    }
    toy.press({ x: COMB.x, y: COMB.y })
    expect(toy.comb.vel).toBe(9)
    expect(take(toy).some((note) => same(note, firstOf(combPluck)))).toBe(true)
    toy.end('tap')
    toy.advance(1)
    expect([toy.hand, toy.size, toy.lastBowl]).toEqual([GREEN, size, GREEN])
    expect([toy.changed, toy.urgent]).toEqual([false, false])
    expect(JSON.stringify(game.record())).toBe(before)
    // No tuft stood up where none can be seen to.
    expect(toy.rise.every((rise) => rise < 0.01)).toBe(true)
    expect(toy.combInHand).toBe(false)
  })
})

describe('ruling 9: the picture hangs only when the loop is let go at a peg', () => {
  const ready = (): Toy => {
    const toy = fresh(GREEN, 1, 3)
    daub(toy, GREEN, 6, 38, 30, 44)
    settle(toy)
    take(toy)
    return toy
  }
  const letGo = (toy: Toy, at: { x: number; y: number }): void => { toy.press(LOOP); toy.move(at); toy.advance(TICK); toy.end('dragEnd') }
  const toward = (peg: number, share: number): { x: number; y: number } => ({ x: LOOP.x + (PEGS[peg].x - LOOP.x) * share, y: LOOP.y + (PEGS[peg].y - LOOP.y) * share })

  it('swings the loop back at a tap and at a drag let go short of a peg, and nothing ends', () => {
    const toy = ready()
    toy.press(LOOP)
    expect(take(toy)).toEqual(loopTwang)
    toy.end('tap')
    expect(take(toy)).toEqual(loopBack)
    expect([toy.finished, toy.wall.length, toy.scene, toy.loopBackAt]).toEqual([false, 0, null, toy.t])
    // Half the way to the furthest peg, most of the way to the middle one, and all but the reach of the nearest: each short.
    const far = Math.hypot(PEGS[0].x - LOOP.x, PEGS[0].y - LOOP.y)
    for (const at of [toward(2, 0.5), toward(1, 0.6), toward(0, (far - HANG_REACH - 3) / far)]) {
      toy.advance(1)
      take(toy)
      letGo(toy, at)
      expect(take(toy).some((note) => same(note, loopBack[0]))).toBe(true)
      expect([toy.finished, toy.wall.length, toy.scene]).toEqual([false, 0, null])
    }
    expect(toy.sheet.shapes).toHaveLength(1)
  })

  it('hangs it on the free peg nearest a let-go that is at the peg, or past it', () => {
    const at = ready()
    letGo(at, { x: PEGS[1].x - HANG_REACH + 3, y: PEGS[1].y })
    expect([at.finished, at.show.kind]).toEqual([true, 'evening'])
    expect(at.wall.map((picture) => picture.peg)).toEqual([1])
    const past = ready()
    letGo(past, toward(2, 1.25))
    expect(past.wall.map((picture) => picture.peg)).toEqual([2])
    // What counts, by itself: the reach of a peg, and the way on past it.
    expect(atPeg(PEGS[0], 0)).toBe(true)
    expect(atPeg({ x: PEGS[0].x + 40, y: PEGS[0].y - 40 }, 0)).toBe(false)
    expect(atPeg(LOOP, 0)).toBe(false)
    expect(atPeg(toward(0, 0.5), 0)).toBe(false)
    expect(atPeg(toward(0, 1.6), 0)).toBe(true)
    // On a picture that hangs on the peg, but not on the corner of it that is nearer the loop than the peg's reach.
    const low = { x: PEGS[0].x - 40, y: PEGS[0].y + 45 }, near = { x: PEGS[0].x - 50, y: PEGS[0].y - 14 }
    expect([atPeg(low, 0), atPeg(low, 0, true), atPeg(near, 0, true)]).toEqual([false, true, false])
  })
})

describe('ruling 10: the rain stops in the tick the cloud is combed thin enough', () => {
  it('stops with the comb still down, and no drop is drawn from that tick', () => {
    const toy = fresh(WHITE, 1, 3)
    daub(toy, WHITE, 20, 4, 31, 7, 1)
    settle(toy)
    const cloud = toy.sheet.shapes[0]
    expect([cloud.kind, canRain(cloud), toy.weather.rains.length]).toEqual(['cloud', true, 1])
    tap(toy, { x: COMB.x, y: COMB.y })
    const drawn = (): boolean => rainPath(standIn(tally()) as Ctx, toy, () => 0)
    expect(drawn()).toBe(true)
    toy.press(cell(25.5, 5.5))
    let stopped = -1
    for (let i = 0; i < 360 && stopped < 0; i++) {
      toy.move(cell(25.5 + 3 * Math.cos(i / 10), 5.5 + 1.5 * Math.sin(i / 10)))
      toy.advance(TICK)
      // In every tick the weather is what the wool makes it: never a rain from a cloud that cannot rain.
      expect(toy.weather.rains.length).toBe(canRain(cloud) ? 1 : 0)
      if (!canRain(cloud)) stopped = toy.t
    }
    expect(stopped).toBeGreaterThan(0)
    expect(toy.stroke?.comb).toBe(true)
    expect(toy.finger.down).toBe(true)
    expect(cloud.count).toBeGreaterThan(10)
    expect(drawn()).toBe(false)
  })
})
