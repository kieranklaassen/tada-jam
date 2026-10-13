import { describe, expect, it } from 'vitest'
import { FACES } from './answers'
import { FIGURES, GARMENTS, type Garment, type Part } from './kinds'
import { CELLS, CELL_SECONDS, PLAIN_SECONDS, SOCKS, TASTE_SECONDS, WOOL, WRAPS, babyCarried, cellOf, everyCell, fastened, hatBlows, lastsOf, markAfter, secondsOf, stepsOf, tasteOf, type Outfit } from './outing'
import { WEATHERS, type Weather } from './save'
import { everySceneVoice } from './sceneVoices'
import { LIMITS, secondsOf as soundSeconds, type Sound } from './voices'
import { AT_REST, STANDING, dogStance, garmentShift, stanceOf } from './weathering'

// The weather's answers. Nobody on the machine that wrote them could watch
// or hear them, so these hold what can be held: every cell there, no two
// alike in motion or in sound, every move back where it began, every sound in
// range, and the fixed tastes fixed.

const outfit = (who: Outfit['who'], weather: Weather, worn: [Garment, Part][], more: Partial<Outfit> = {}): Outfit => ({ who, worn: worn.map(([garment, part]) => ({ garment, part })), zip: 0, buttons: [false, false, false], tug: 0, open: false, weather, dog: null, ...more })
const soundOf = (notes: readonly (readonly [number, readonly Sound[]])[]): string => JSON.stringify(notes)
const inRange = (sound: readonly Sound[], name: string) => {
  expect(sound.length, name).toBeGreaterThan(0)
  for (const part of sound) {
    expect(part.frequency, name).toBeGreaterThanOrEqual(LIMITS.minFrequency)
    expect(part.frequency, name).toBeLessThanOrEqual(LIMITS.maxFrequency)
    if (part.glideTo) {
      expect(part.glideTo, name).toBeGreaterThanOrEqual(LIMITS.minFrequency)
      expect(part.glideTo, name).toBeLessThanOrEqual(LIMITS.maxFrequency)
    }
    expect(part.peak, name).toBeGreaterThan(0)
    expect(part.peak, name).toBeLessThanOrEqual(LIMITS.maxPeak)
    expect(part.attack, name).toBeGreaterThanOrEqual(LIMITS.minAttack)
  }
  expect(soundSeconds(sound), name).toBeLessThanOrEqual(LIMITS.maxSeconds)
}

describe('the grid', () => {
  it('has a cell for every garment in every weather, and for the socks', () => {
    for (const garment of GARMENTS) for (const weather of WEATHERS) expect(CELLS[garment][weather]).toBeDefined()
    for (const weather of WEATHERS) expect(SOCKS[weather]).toBeDefined()
    // Seven garments by four weathers, eight of them with two answers, and four for the socks.
    expect(everyCell().length).toBe(7 * 4 + 8 + 4)
  })

  it('has the baby squeal all the way over the hedge under the open umbrella in the wind, and nobody else', () => {
    const carried = (who: Outfit['who']) => cellOf(outfit(who, 'wind', [['umbrella', 'hands']], { open: true }), 'umbrella')
    const plainly = carried('child')
    expect(carried('grandfather')).toBe(plainly)
    const baby = carried('baby')
    expect(baby).toEqual(babyCarried())
    // The same lift, seen the same way, with a face that has forgotten the wind.
    expect([baby.move, baby.act, baby.bits]).toEqual([plainly.move, plainly.act, plainly.bits])
    expect(baby.act).toBe('lifted')
    expect(baby.face).toBe('giggle')
    // Three squeals on top of what the umbrella does, spread over the time it is off the lawn, each one rising and higher than the last.
    const squeals = baby.notes.slice(plainly.notes.length)
    expect(squeals.length).toBe(3)
    let last = 0
    for (const [offset, sound] of squeals) {
      expect(offset).toBeGreaterThan(0.15)
      expect(offset).toBeLessThan(0.95)
      inRange(sound, 'squeal')
      expect(sound[0].glideTo).toBeGreaterThan(sound[0].frequency)
      expect(sound[0].frequency).toBeGreaterThan(last)
      last = sound[0].frequency
    }
    // A shut umbrella carries nobody off, and the baby does not squeal at it.
    const shut = cellOf(outfit('baby', 'wind', [['umbrella', 'hands']]), 'umbrella')
    expect(shut.move).toBe('reed')
    expect(shut.face).not.toBe('giggle')
  })

  it('gives no two cells the same motion, and no two the same sound', () => {
    const cells = everyCell()
    const sights = cells.map(({ cell }) => JSON.stringify([cell.move, cell.bits, cell.act, cell.dog]))
    const sounds = cells.map(({ cell }) => soundOf(cell.notes))
    expect(new Set(sights).size).toBe(cells.length)
    expect(new Set(sounds).size).toBe(cells.length)
  })

  it('gives every cell something to see and something to hear, inside the cell and in range', () => {
    for (const { name, cell } of everyCell()) {
      expect(cell.move !== 'none' || cell.bits !== null || cell.act !== null, name).toBe(true)
      expect(cell.notes.length, name).toBeGreaterThan(0)
      for (const [offset, sound] of cell.notes) {
        expect(offset, name).toBeGreaterThanOrEqual(0)
        expect(offset, name).toBeLessThan(1)
        inRange(sound, name)
      }
      if (cell.face) expect(FACES).toContain(cell.face)
    }
  })

  it('picks the done-up answer only for a garment that is done up', () => {
    const coat = (zip: number) => cellOf(outfit('child', 'rain', [['raincoat', 'body']], { zip }), 'raincoat')
    expect(coat(12).move).toBe('drum')
    expect(coat(11).move).toBe('hang')
    const duffel = (buttons: boolean[]) => cellOf(outfit('child', 'snow', [['duffel', 'body']], { buttons }), 'duffel')
    expect(duffel([true, true, true]).act).toBe('sink')
    expect(duffel([true, false, true]).act).toBe('leap')
    // Boots count as tugged on wherever they are worn.
    expect(fastened(outfit('child', 'rain', [['boots', 'feet']], { tug: 3 }), 'boots')).toBe(true)
    expect(fastened(outfit('child', 'rain', [['boots', 'head']], { tug: 3 }), 'boots')).toBe(true)
    expect(fastened(outfit('child', 'rain', [['boots', 'head']], { tug: 2 }), 'boots')).toBe(false)
    expect(fastened(outfit('child', 'rain', [['boots', 'feet']], { tug: 2 }), 'boots')).toBe(false)
    expect(cellOf(outfit('baby', 'wind', [['umbrella', 'hands']], { open: true }), 'umbrella').act).toBe('lifted')
    expect(cellOf(outfit('baby', 'wind', [['umbrella', 'hands']]), 'umbrella').move).toBe('reed')
  })
})

describe('the moves', () => {
  it('start every garment at rest and bring it back, except the hat the wind takes', () => {
    for (const { name, cell } of everyCell()) {
      for (const u of [0, 1]) {
        const at = garmentShift(cell.move, u)
        if (cell.move === 'blowoff' && u === 1) {
          expect(at.gone).toBe(true)
          continue
        }
        expect(at.gone, name).toBe(false)
        for (const key of ['dx', 'dy', 'rot'] as const) expect(at[key], `${name} ${key} at ${u}`).toBeCloseTo(0, 5)
        for (const key of ['sx', 'sy', 'apart'] as const) expect(at[key], `${name} ${key} at ${u}`).toBeCloseTo(1, 5)
        expect(at.flip, name).toBeCloseTo(0, 5)
        if (at.other) for (const key of ['dx', 'dy', 'rot'] as const) expect(at.other[key], `${name} other ${key} at ${u}`).toBeCloseTo(0, 5)
      }
    }
  })

  it('moves every garment that has a move, somewhere in its cell', () => {
    for (const { name, cell } of everyCell()) {
      if (cell.move === 'none') continue
      const moved = [0.1, 0.25, 0.4, 0.55, 0.7, 0.85].some((u) => JSON.stringify(garmentShift(cell.move, u, { x: 100, y: 50 })) !== JSON.stringify(AT_REST))
      expect(moved, name).toBe(true)
    }
  })

  it('carries the hat the wind takes all the way to where the dog will wear it', () => {
    const end = garmentShift('blowoff', 1, { x: -300, y: 120 })
    expect(end.dx).toBeCloseTo(-300)
    expect(end.dy).toBeCloseTo(120)
  })

  it('stands every figure and the dog as they stood, before and after every act', () => {
    for (const { name, cell } of everyCell()) {
      for (const who of FIGURES) for (const u of [0, 1]) {
        const stance = stanceOf(cell.act, who, u)
        for (const key of ['dx', 'up', 'tilt', 'squash', 'bend', 'lie'] as const) expect(stance[key], `${name} ${who} ${key} at ${u}`).toBeCloseTo(STANDING[key], 5)
      }
      for (const u of [0, 1]) {
        const dog = dogStance(cell.dog, u, 200)
        for (const key of ['dx', 'up', 'tilt', 'squash'] as const) expect(dog[key], `${name} dog ${key} at ${u}`).toBeCloseTo(0, 5)
      }
    }
  })

  it('plays every act in each figure\'s own manner: the grandfather late and from the crease, the baby by rocking and carried furthest', () => {
    for (const { name, cell } of everyCell()) {
      if (!cell.act) continue
      const at = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
      const of = (who: Outfit['who']) => JSON.stringify(at.map((u) => stanceOf(cell.act, who, u)))
      expect(new Set(FIGURES.map(of)).size, name).toBe(3)
    }
    // The weather reaches the grandfather last, and he gives from the crease.
    expect(stanceOf('towed', 'grandfather', 0.15).dx).toBeCloseTo(0)
    expect(stanceOf('towed', 'child', 0.15).dx).not.toBe(0)
    expect(Math.abs(stanceOf('wilt', 'grandfather', 0.6).bend)).toBeGreaterThan(Math.abs(stanceOf('wilt', 'grandfather', 0.6).tilt))
    // The open umbrella in the wind lifts the baby highest, then the child, and the grandfather least.
    const high = (who: Outfit['who']) => Math.max(...Array.from({ length: 50 }, (_, i) => stanceOf('lifted', who, i / 49).up))
    expect(high('baby')).toBeGreaterThan(high('child'))
    expect(high('child')).toBeGreaterThan(high('grandfather'))
    // The baby rocks even where the others only stand.
    expect(stanceOf('sink', 'baby', 0.3).tilt).not.toBe(0)
    expect(stanceOf('sink', 'child', 0.3).tilt).toBe(0)
  })
})

describe('the fixed tastes', () => {
  it('has the child love water and mind being hot in wool', () => {
    expect(tasteOf(outfit('child', 'rain', []))).toMatchObject({ feels: 'loves', act: 'stamp', face: 'giggle' })
    expect(tasteOf(outfit('child', 'rain', [['boots', 'feet']]))).toMatchObject({ feels: 'loves', face: 'grin' })
    for (const wool of WOOL) for (const part of ['head', 'feet'] as const) expect(tasteOf(outfit('child', 'sun', [[wool, part]]))).toMatchObject({ feels: 'minds', act: 'tug', face: 'huff' })
    expect(tasteOf(outfit('child', 'sun', [['raincoat', 'body'], ['boots', 'feet'], ['umbrella', 'hands']])).feels).toBe('plain')
    expect(tasteOf(outfit('child', 'snow', [['hat', 'head']])).feels).toBe('plain')
  })

  it('has the grandfather love being wrapped up in any weather and mind wet feet', () => {
    for (const weather of WEATHERS) for (const wrap of WRAPS) expect(tasteOf(outfit('grandfather', weather, [[wrap, 'neck'], ['boots', 'feet']]))).toMatchObject({ feels: 'loves', act: 'straighten', face: 'proud' })
    for (const weather of ['rain', 'snow'] as const) {
      expect(tasteOf(outfit('grandfather', weather, []))).toMatchObject({ feels: 'minds', act: 'heron', face: 'huff' })
      // What he minds shows even when he is wrapped up: the one thing he minds wins.
      expect(tasteOf(outfit('grandfather', weather, [['scarf', 'neck']])).feels).toBe('minds')
      // Boots anywhere but on his feet do not keep them dry.
      expect(tasteOf(outfit('grandfather', weather, [['boots', 'head']])).feels).toBe('minds')
    }
    expect(tasteOf(outfit('grandfather', 'sun', [])).feels).toBe('plain')
    expect(tasteOf(outfit('grandfather', 'wind', [['raincoat', 'body']])).feels).toBe('plain')
  })

  it('has the baby love anything on its head and mind the noise of the wind, which only the open umbrella makes it forget', () => {
    for (const garment of GARMENTS) for (const weather of ['rain', 'snow', 'sun'] as const) expect(tasteOf(outfit('baby', weather, [[garment, 'head']]))).toMatchObject({ feels: 'loves', act: 'pats', face: 'giggle' })
    expect(tasteOf(outfit('baby', 'wind', [['hat', 'head']]))).toMatchObject({ feels: 'minds', act: 'cower', ears: true })
    expect(tasteOf(outfit('baby', 'wind', []))).toMatchObject({ feels: 'minds', ears: true })
    expect(tasteOf(outfit('baby', 'wind', [['umbrella', 'hands']])).feels).toBe('minds')
    expect(tasteOf(outfit('baby', 'wind', [['umbrella', 'hands']], { open: true })).feels).toBe('plain')
    expect(tasteOf(outfit('baby', 'wind', [['umbrella', 'head']], { open: true })).feels).toBe('loves')
    expect(tasteOf(outfit('baby', 'sun', [['scarf', 'neck']])).feels).toBe('plain')
  })

  it('gives every taste a sound in range, and no two of them the same', () => {
    const tastes = [
      tasteOf(outfit('child', 'rain', [])), tasteOf(outfit('child', 'sun', [['hat', 'head']])), tasteOf(outfit('grandfather', 'rain', [])),
      tasteOf(outfit('grandfather', 'sun', [['scarf', 'neck']])), tasteOf(outfit('baby', 'wind', [])), tasteOf(outfit('baby', 'sun', [['boots', 'head']])), tasteOf(outfit('child', 'snow', [])),
    ]
    for (const taste of tastes) for (const [offset, sound] of taste.notes) {
      expect(offset).toBeLessThan(1)
      inRange(sound, taste.act)
    }
    expect(new Set(tastes.map((taste) => soundOf(taste.notes))).size).toBe(tastes.length)
    expect(new Set(tastes.map((taste) => taste.act)).size).toBe(tastes.length)
  })
})

describe('an outing', () => {
  it('plays each part that holds a garment from the head down, the socks if the feet are bare, and then the figure\'s own beat', () => {
    const all = stepsOf(outfit('child', 'rain', [['hat', 'head'], ['scarf', 'neck'], ['raincoat', 'body'], ['mittens', 'hands'], ['boots', 'feet']]))
    expect(all.map((step) => (step.kind === 'cell' ? step.part : step.kind))).toEqual(['head', 'neck', 'body', 'hands', 'feet', 'taste'])
    const bare = stepsOf(outfit('child', 'snow', []))
    expect(bare.map((step) => step.kind)).toEqual(['socks', 'taste'])
    // A boot on the head is answered up there, and the socks still get wet.
    const wrong = stepsOf(outfit('grandfather', 'rain', [['boots', 'head']]))
    expect(wrong.map((step) => (step.kind === 'cell' ? `${step.garment} ${step.part}` : step.kind))).toEqual(['boots head', 'socks', 'taste'])
  })

  it('takes eight to nine seconds at the longest and about three in vest and socks, with the sheet turning over and back', () => {
    const turning = 0.8 + 0.6
    const longest = stepsOf(outfit('child', 'rain', [['hat', 'head'], ['scarf', 'neck'], ['raincoat', 'body'], ['mittens', 'hands'], ['boots', 'feet']]))
    expect(secondsOf(longest)).toBeCloseTo(5 * CELL_SECONDS + TASTE_SECONDS)
    expect(secondsOf(longest) + turning).toBeGreaterThanOrEqual(7.5)
    expect(secondsOf(longest) + turning).toBeLessThanOrEqual(9)
    const shortest = stepsOf(outfit('grandfather', 'sun', []))
    expect(lastsOf(shortest[1])).toBe(PLAIN_SECONDS)
    expect(secondsOf(shortest) + turning).toBeLessThanOrEqual(3.2)
  })

  it('has the wind take the hat wherever it is worn, and nothing else', () => {
    expect(hatBlows(outfit('child', 'wind', [['hat', 'head']]))).toBe(true)
    expect(hatBlows(outfit('child', 'wind', [['hat', 'feet']]))).toBe(true)
    expect(hatBlows(outfit('child', 'rain', [['hat', 'head']]))).toBe(false)
    expect(hatBlows(outfit('child', 'wind', [['scarf', 'head']]))).toBe(false)
  })

  it('leaves a garment wet after rain, snowy after snow, and as it was after wind and sun', () => {
    expect(markAfter('rain', 'dry')).toBe('wet')
    expect(markAfter('snow', 'wet')).toBe('snowy')
    expect(markAfter('wind', 'wet')).toBe('wet')
    expect(markAfter('sun', 'snowy')).toBe('snowy')
  })
})

describe('the sounds of the hall and its scenes', () => {
  it('are all in range', () => {
    const all = everySceneVoice()
    expect(all.length).toBeGreaterThan(30)
    for (const { name, sound } of all) inRange(sound, name)
  })
})
