import { describe, expect, it } from 'vitest'
import { Buses } from './buses'
import { Game } from './game'
import { IDLE_BEFORE_GLOW } from './guidance'
import { ForgivingTouch } from './input'
import { BOWLS, COMB, FOLK, GOOSE, LOOP, PEGS, PIG, SHEEP, SHEPHERD, grownUpCorner } from './layout'
import { CORNER, inCorner } from './overlay'
import { cell, dab, daub, fresh, setDown, settle } from './probe'
import { makeRng } from './rng'
import { homeLanding } from './calls'
import { HOP } from './folk'
import { TICK, type End, type Toy } from './toy'
import { BLUE, GREEN, RUSSET, WHITE, YELLOW } from './wool'

// The lessons of the games before this one, each held by a test that names
// it. The model has no browser in it, so every one of them runs here as the
// game itself runs: the same touches, the same clock.

const sources = import.meta.glob('./*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const ENDS: readonly End[] = ['tap', 'pressEnd', 'dragLift', 'dragEnd', 'dragCancel']

/** A rainy picture: a hill, a cloud over it that rains, and the shepherd under the cloud. */
function rainy(toy: Toy): void {
  daub(toy, GREEN, 6, 38, 30, 44)
  daub(toy, WHITE, 8, 3, 22, 8)
}

describe('lesson 1: one clock for sight and sound', () => {
  it('puts no delay inside a voice: a sound with parts in time is queued on the toy\'s clock', () => {
    for (const name of ['calls', 'voices']) expect(sources[`./${name}.ts`]).not.toMatch(/\bdelay\s*:/)
  })

  it('plays a sound with parts in time in the ticks its parts fall due, however the seconds are handed over', () => {
    const heard = (step: number): number[] => {
      const toy = fresh()
      rainy(toy)
      const at: number[] = []
      for (let t = 0; t < 6; t += step) { toy.advance(step); if (toy.takeSceneSounds() || toy.takeSounds()) at.push(Math.round(toy.t * 60)) }
      return at
    }
    const fine = heard(TICK), coarse = heard(TICK * 4)
    expect(fine.length).toBeGreaterThan(6)
    // Handed over four ticks at a time, every sound is released in the step that holds its tick.
    for (const tick of fine) expect(coarse.some((late) => late >= tick && late < tick + 4)).toBe(true)
  })

  it('sounds every landing in the tick it lands: a figure that hops home knocks as its hop ends', () => {
    const toy = fresh()
    daub(toy, GREEN, 6, 38, 30, 44)
    setDown(toy, PIG, 20, 40)
    settle(toy)
    toy.takeSounds()
    // Dragged off the felt and let go over the table: it hops home.
    toy.press({ x: toy.folk[PIG].x, y: toy.folk[PIG].y - 20 })
    toy.move({ x: 900, y: 500 })
    toy.advance(TICK)
    toy.move({ x: 900, y: 500 })
    toy.end('dragEnd')
    toy.takeSounds()
    expect(toy.folk[PIG].hop).not.toBeNull()
    const knock = JSON.stringify(homeLanding(PIG)[0])
    let landedAt = -1, heardAt = -1
    for (let i = 0; i < 60; i++) {
      toy.advance(TICK)
      if (landedAt < 0 && toy.folk[PIG].hop === null) landedAt = i
      if (heardAt < 0 && JSON.stringify(toy.takeSounds() ?? []).includes(knock)) heardAt = i
    }
    expect(landedAt).toBe(Math.round(HOP / TICK) - 1)
    expect(heardAt).toBe(landedAt)
  })
})

describe('lesson 2: a scene ended by a touch is silent from that frame', () => {
  it('drops every sound the scene still owed, and tells the Mount to silence what is ringing', () => {
    const toy = fresh()
    rainy(toy)
    expect(toy.scene).not.toBeNull()
    toy.advance(0.5)
    toy.takeSceneSounds()
    expect(toy.takeHush()).toBe(false)
    dab(toy, GREEN, 60, 40)
    expect(toy.scene).toBeNull()
    expect(toy.takeHush()).toBe(true)
    expect(toy.takeSceneSounds()).toBeNull()
    for (let i = 0; i < 400; i++) { toy.advance(TICK); expect(toy.takeSceneSounds()).toBeNull() }
    // The touch itself is heard: its own sound is not the scene's.
    const again = fresh()
    rainy(again)
    again.advance(0.5)
    again.takeSounds()
    dab(again, GREEN, 60, 40)
    expect(again.takeSounds()).not.toBeNull()
  })

  it('cuts the scene\'s own way out at once, and closes all sound at a put-away', () => {
    const gains: { value: number; connected: boolean }[] = []
    const context = {
      createGain: () => { const gain = { value: 1, connected: false }; gains.push(gain); return { gain, connect: () => { gain.connected = true }, disconnect: () => { gain.connected = false } } },
    } as unknown as AudioContext
    const buses = new Buses()
    buses.voice([], [])(context, {} as AudioNode, 0)
    expect(gains).toHaveLength(2)
    expect(gains.every((gain) => gain.connected && gain.value === 1)).toBe(true)
    buses.endScene()
    expect(gains[1]).toEqual({ value: 0, connected: false })
    expect(gains[0]).toEqual({ value: 1, connected: true })
    buses.voice(null, [])(context, {} as AudioNode, 0)
    expect(gains).toHaveLength(3)
    buses.closeAll()
    expect(gains.every((gain) => !gain.connected && gain.value === 0) || gains.filter((gain) => gain.connected).length === 0).toBe(true)
  })
})

describe('lesson 4: nothing is pending, sounding or starting on load', () => {
  it('opens a saved picture with no scene, no sound owed, no timer running and nothing afloat, and stays silent', () => {
    const toy = fresh()
    rainy(toy)
    settle(toy)
    daub(toy, YELLOW, 30, 4, 35, 9)
    settle(toy)
    setDown(toy, SHEPHERD, 14, 40)
    setDown(toy, GOOSE, 50, 30)
    settle(toy)
    const game = new Game(JSON.parse(JSON.stringify(recordOf(toy))) as unknown, 4, makeRng(2))
    const back = game.toy
    expect(back.weather.rains.length).toBeGreaterThan(0)
    expect(back.scene).toBeNull()
    expect(back.pending).toBe(0)
    expect(back.takeSounds()).toBeNull()
    expect(back.show.kind).toBe('none')
    expect(back.floaters).toHaveLength(0)
    expect(back.naps).toHaveLength(0)
    expect(back.held).toBeNull()
    expect(back.changed || back.urgent).toBe(false)
    expect(back.clungAt.size).toBe(0)
    expect([back.loopBackAt, back.moth.biteAt, ...back.knocked].every((at) => at <= -10)).toBe(true)
    expect(back.folk.every((figure) => figure.mood === 'idle' && figure.hop === null && figure.coatAt <= -10)).toBe(true)
    // The shepherd is already sitting wet under his cloud: nothing eases in.
    expect(back.folk[SHEPHERD].act).toBe(toy.folk[SHEPHERD].act)
    expect(back.t - back.folk[SHEPHERD].shownSince).toBeGreaterThan(50)
    for (let i = 0; i < 300; i++) { game.advance(TICK); expect(back.takeSounds()).toBeNull(); expect(back.takeSceneSounds()).toBeNull() }
    expect(back.scene).toBeNull()
  })
})

/** The game's own fields of a record, from a toy. */
function recordOf(toy: Toy): Record<string, unknown> {
  const game = new Game(undefined, null, makeRng(1))
  game.toy = toy
  return game.record() as unknown as Record<string, unknown>
}

describe('lesson 6: a touch that is taken away never acts for the child', () => {
  it('puts a figure in the hand back where it came from, with nothing to save', () => {
    const toy = fresh()
    daub(toy, GREEN, 6, 38, 30, 44)
    settle(toy)
    toy.changed = false
    toy.press({ x: FOLK[SHEEP].x, y: FOLK[SHEEP].y - 60 })
    toy.move(cell(20, 30))
    toy.advance(TICK * 5)
    toy.end('dragCancel')
    expect(toy.folk[SHEEP].at).toBeNull()
    expect(toy.changed).toBe(false)
    expect(toy.scene).toBeNull()
    toy.advance(1)
    setDown(toy, SHEEP, 20, 40)
    const at = { ...toy.folk[SHEEP].at! }
    toy.changed = false
    toy.press({ x: toy.folk[SHEEP].x, y: toy.folk[SHEEP].y - 20 })
    toy.move({ x: 900, y: 500 })
    toy.advance(TICK * 5)
    toy.end('dragCancel')
    expect(toy.folk[SHEEP].at).toEqual(at)
    expect(toy.changed).toBe(false)
  })

  it('hangs nothing when the loop is taken out of the hand, by a cancel or by a press that was no tap', () => {
    for (const end of ['dragCancel', 'pressEnd'] as const) {
      const toy = fresh()
      daub(toy, GREEN, 6, 38, 30, 44)
      toy.changed = false
      toy.press(LOOP)
      if (end === 'dragCancel') { toy.move(PEGS[0]); toy.advance(TICK * 3) }
      toy.end(end)
      expect(toy.finished).toBe(false)
      expect(toy.wall).toHaveLength(0)
      expect(toy.scene).toBeNull()
      expect(toy.changed).toBe(false)
    }
  })

  it('chooses nothing new and pokes nobody for a press that ends without a tap: what the press already did stays, and that is all', () => {
    const toy = fresh()
    toy.press({ x: BOWLS[2].x, y: BOWLS[2].y - 16 })
    expect(toy.hand).toBe(BLUE)
    toy.end('pressEnd')
    expect(toy.hand).toBe(BLUE)
    expect(toy.size).toBe(1)
    expect(toy.held).toBeNull()
  })
})

describe('lesson 7: the grown-up corner is not the child\'s', () => {
  it('answers nothing there, and does not take the idle ladder back', () => {
    const game = new Game(undefined, 4, makeRng(1))
    game.advance(IDLE_BEFORE_GLOW + 1.5)
    const glow = game.guidance.glow, before = JSON.stringify(game.record())
    expect(glow).toBeGreaterThan(0)
    const corner = grownUpCorner(1180, 820)
    expect(inCorner(1180 - CORNER / 2, CORNER / 2, 1180)).toBe(true)
    expect(game.press({ x: corner.x + corner.w / 2, y: corner.y + corner.h / 2 }, true)).toBe(false)
    game.advance(TICK)
    expect(game.guidance.glow).toBeGreaterThanOrEqual(glow)
    expect(game.toy.held).toBeNull()
    expect(game.toy.takeSounds()).toBeNull()
    expect(JSON.stringify(game.record())).toBe(before)
  })
})

describe('lesson 8: age is only a first visit\'s default', () => {
  it('sets the size of the first tuft on a first visit and nothing else, and a saved game opens the same at every age', () => {
    const first = [null, 2, 4, 5, 6, 7, 12].map((age) => new Game(undefined, age, makeRng(1)).record())
    expect(first.map((record) => record.size)).toEqual([0, 0, 0, 1, 1, 2, 2])
    for (const record of first) expect({ ...record, size: 0 }).toEqual({ ...first[0], size: 0 })
    const toy = fresh(RUSSET, 2)
    daub(toy, RUSSET, 6, 38, 30, 44)
    setDown(toy, PIG, 20, 40)
    const saved = JSON.parse(JSON.stringify({ ...first[0], ...recordOf(toy) })) as unknown
    const opened = [null, 4, 6, 8].map((age) => JSON.stringify(new Game(saved, age, makeRng(1)).record()))
    for (const one of opened) expect(one).toBe(opened[0])
    expect((JSON.parse(opened[0]) as { size: number }).size).toBe(2)
  })
})

describe('lesson 14: only the child\'s hand takes the idle ladder back', () => {
  it('lets the glow come while the figures act and the weather goes on by themselves', () => {
    const game = new Game(undefined, 4, makeRng(1)), toy = game.toy
    rainy(toy)
    setDown(toy, SHEPHERD, 14, 40)
    setDown(toy, GOOSE, 20, 40)
    game.press(cell(60, 40), false)
    game.end('tap')
    // What the last touch set off has been heard within two and a half seconds; after that nothing sounds by itself.
    game.advance(2.5)
    toy.takeSounds()
    expect(toy.pending).toBe(0)
    let sounded = false
    for (let i = 0; i < (IDLE_BEFORE_GLOW - 1.5) * 60; i++) { game.advance(TICK); sounded ||= toy.takeSounds() !== null }
    // The goose dances in the rain and the shepherd sits wet all this while, and the ladder climbs all the same.
    expect(toy.folk[GOOSE].act).toBe('dance')
    expect(game.guidance.glow).toBeGreaterThan(0)
    expect(sounded).toBe(false)
  })

  it('keeps the ladder down while a scene plays, and takes a slow tap of 0.45 seconds for a tap', () => {
    const game = new Game(undefined, 4, makeRng(1))
    rainy(game.toy)
    game.advance(4)
    expect(game.toy.scene).not.toBeNull()
    expect(game.guidance.glow).toBe(0)
    const touch = new ForgivingTouch()
    touch.down(1, { x: 300, y: 300 }, 1000)
    const gestures = [...touch.move(1, { x: 304, y: 303 }), ...touch.up(1, { x: 304, y: 303 }, 1450)]
    expect(gestures.map((gesture) => gesture.type)).toEqual(['tap'])
  })
})

describe('a state a held finger can be left in ends on all five end gestures', () => {
  const holds: readonly [string, (toy: Toy) => void][] = [
    ['a stroke of wool', (toy) => { toy.press(cell(30, 30)); toy.move(cell(40, 30)); toy.advance(TICK * 4) }],
    ['a stroke of the comb', (toy) => { toy.hand = 5; toy.press(cell(12, 40)); toy.move(cell(20, 40)); toy.advance(TICK * 4) }],
    ['a tuft carried from its bowl', (toy) => { toy.press({ x: BOWLS[1].x, y: BOWLS[1].y - 16 }); toy.move({ x: BOWLS[1].x, y: BOWLS[1].y - 60 }) }],
    ['the comb carried from the table', (toy) => { toy.press(COMB); toy.move({ x: COMB.x, y: COMB.y - 60 }) }],
    ['a figure poked', (toy) => toy.press({ x: FOLK[PIG].x, y: FOLK[PIG].y - 60 })],
    ['a figure in the hand', (toy) => { toy.press({ x: FOLK[GOOSE].x, y: FOLK[GOOSE].y - 60 }); toy.move(cell(40, 30)); toy.advance(TICK * 4) }],
    ['the loop twanged', (toy) => toy.press(LOOP)],
    ['the loop in the hand', (toy) => { toy.press(LOOP); toy.move({ x: 840, y: 90 }); toy.advance(TICK * 4) }],
    ['a peg knocked', (toy) => toy.press(PEGS[1])],
    ['the moth tapped', (toy) => toy.press(toy.mothAt()!)],
  ]
  it.each(holds)('%s', (_name, hold) => {
    for (const end of ENDS) {
      const toy = fresh()
      daub(toy, GREEN, 6, 38, 30, 44)
      settle(toy)
      hold(toy)
      expect(toy.held).not.toBeNull()
      toy.end(end)
      // A lifted finger that carried a figure or the comb has not let go yet: it hangs, and its drag then ends once.
      if (end === 'dragLift' && toy.hanging) { expect(toy.finger.down).toBe(false); toy.end('dragEnd') }
      expect(toy.held).toBeNull()
      expect(toy.stroke).toBeNull()
      expect(toy.finger.down).toBe(false)
      settle(toy)
      toy.advance(1)
      // No figure is left in the air, and the loop is back or the picture is hung.
      for (const figure of toy.folk) expect(figure.hop).toBeNull()
      expect(toy.folk.every((figure) => figure.act !== 'held')).toBe(true)
      // The next touch is an ordinary one.
      const mass = toy.sheet.shapes.reduce((sum, shape) => sum + shape.mass, 0)
      if (!toy.finished) { dab(toy, GREEN, 60, 10); expect(toy.sheet.shapes.reduce((sum, shape) => sum + shape.mass, 0)).toBeGreaterThan(mass) }
    }
  })
})
