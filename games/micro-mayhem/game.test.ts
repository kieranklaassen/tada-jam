import { describe, expect, it } from 'vitest'
import { AFTERIMAGE, AFTER_STRENGTH } from './figure'
import { Game, type Shown } from './game'
import { DOORS_OF, FIRST, FOG_ALL, ROOMS, lightsOut, untouched, type House, type RoomId } from './house'
import type { Point } from './input'
import { BUTTONS, CORD, DOORS, LAMP, PULL, PULL_HOLD, boxOfShape, inShape, middleOf } from './layout'
import { makeRng } from './rng'
import { ROOM } from './rooms'
import { inAir, trayDrawn } from './roomBakery'
import { ROUND_TRICKS, bedtime } from './roomBedroom'
import { PANE, cell } from './roomBathroom'
import { RIM_AFLOAT } from './roomKitchen'
import { OUT } from './roomGarden'
import { segmentsOf } from './sprites'
import { inked, inkedIn, play, sharedCells } from './testing'
import { VOICES, type Cue } from './voices'

// The game as rules, held to the sheet and to the lessons of the games built
// before it. Each lesson has a block of its own, named for it.

const at = (place: RoomId, more: Partial<House> = {}): House => ({ ...FIRST, place, day: place !== 'bedroom' || more.day === true, ...more })
const frames = (game: Game, seconds: number, each?: () => void): void => {
  for (let i = 0; i < Math.round(seconds * 60); i++) {
    game.step(1 / 60)
    each?.()
  }
}
/** Where a thing of the room on the glass answers a touch. */
function where(game: Game, id: string): Point {
  const targets = game.targets()
  for (const target of targets.filter((one) => one.id === id)) {
    const box = boxOfShape(target.shape)
    // The middle, or else the first point of the thing that nothing nearer the finger covers.
    const points = [middleOf(target.shape)]
    for (let j = 1; j < 8; j++) for (let i = 1; i < 8; i++) points.push({ x: box.x + (box.w * i) / 8, y: box.y + (box.h * j) / 8 })
    const point = points.find((one) => targets.find((other) => inShape(one, other.shape)) === target)
    if (point) return point
  }
  throw new Error(`nothing called ${id} answers here`)
}
const tap = (game: Game, id: string): void => {
  game.press(where(game, id))
  game.release()
}
const door = (i: number): Point => middleOf(DOORS[i])
/** What is on the glass, as text: the room, the light, and every segment with how strongly it shows. */
function glass(shown: Shown): string {
  return `${shown.room} ${shown.day} ${shown.dim} ${shown.held} ${shown.test} ${shown.shock} ${shown.bloom ? 'bloom' : ''} | ${shown.lit.map((lit) => `${lit.name}:${lit.strength.toFixed(3)}${lit.fading ? 'f' : ''}`).join(' ')}`
}
/** The cord pulled right down and held until the lamp clicks. */
function lightsOutBy(game: Game): void {
  game.press({ x: CORD.x, y: CORD.y[0] })
  game.move({ x: CORD.x, y: CORD.y[0] + PULL[0] + 2 })
  game.move({ x: CORD.x, y: CORD.y[0] + PULL[1] + 2 })
  frames(game, PULL_HOLD + 0.05)
  game.release()
}

/** Houses that between them have every room, every thing at every step, and every meeting. */
const HOUSES: readonly House[] = [
  FIRST,
  at('bedroom', { dog: 1 }),
  at('bedroom', { dog: 2 }),
  at('bedroom', { dog: 3 }),
  at('bedroom', { day: true, dog: 3, full: true, pies: 3 }),
  at('bedroom', { day: true }),
  at('kitchen'),
  at('kitchen', { fly: 1, soup: 3, dog: 3 }),
  at('kitchen', { balloon: 3, pies: 3, dog: 3, full: true }),
  at('kitchen', { pies: 3 }),
  at('bathroom'),
  at('bathroom', { fog: 0b101010101010, dog: 3 }),
  at('bathroom', { fog: 0 }),
  at('garden'),
  at('garden', { weed: 1, flower: true, dog: 3 }),
  at('garden', { weed: 2 }),
  at('dining'),
  at('dining', { soup: 1, dog: 3 }),
  at('dining', { soup: 2, dog: 3, full: true, pies: 3, balloon: 3 }),
  at('dining', { soup: 3, flower: true, fog: 0 }),
  at('dining', { soup: 2, fly: 1, pies: 3 }),
  at('henhouse'),
  at('henhouse', { eggs: 2, weed: 2, dog: 3 }),
  at('henhouse', { eggs: 3 }),
  at('fair'),
  at('fair', { balloon: 2, dog: 3 }),
  at('fair', { balloon: 3, dog: 3, full: true, pies: 3 }),
  at('bakery'),
  at('bakery', { pies: 2, eggs: 1, dog: 3 }),
  at('bakery', { pies: 3, dog: 3, full: true }),
  at('bakery', { pies: 3, balloon: 3 }),
]

/** The touches that take a thing to its punchline, each from the step before it. */
const PUNCHLINES: readonly { name: string; house: House; touch: (game: Game) => void; after: Partial<House>; again?: (game: Game) => void }[] = [
  { name: 'the dog leaps', house: at('bedroom', { dog: 2 }), touch: (game) => tap(game, 'dog'), after: { dog: 3 } },
  { name: 'the balloon bursts', house: at('fair', { balloon: 2 }), touch: (game) => tap(game, 'pump'), after: { balloon: 3 } },
  { name: 'the fly is swatted', house: at('kitchen'), touch: (game) => tap(game, 'fly'), after: { fly: 1 }, again: (game) => tap(game, 'swatter') },
  { name: 'the chick hatches', house: at('henhouse', { eggs: 2 }), touch: (game) => tap(game, 'hen'), after: { eggs: 3 } },
  { name: 'the tower comes down', house: at('bakery', { pies: 2 }), touch: (game) => tap(game, 'tray'), after: { pies: 3 } },
  { name: 'the tower comes down by the dog', house: at('bakery', { pies: 2, dog: 3 }), touch: (game) => tap(game, 'tray'), after: { pies: 3, full: true } },
  { name: 'the bather is caught', house: at('bathroom', { fog: 1 << 7 }), touch: (game) => { game.press(middleOf(cell(7))); game.release() }, after: { fog: 0 } },
  { name: 'the weed comes out', house: at('garden', { weed: 1 }), touch: (game) => { const hold = where(game, 'weed'); game.press(hold); game.move({ x: hold.x, y: hold.y - OUT - 4 }); game.release() }, after: { weed: 2 } },
  { name: 'the soup runs over', house: at('dining', { soup: 2 }), touch: (game) => tap(game, 'ladle'), after: { soup: 3 } },
]

const GLOBAL: readonly Cue[] = ['caseKnock', 'glassThock', 'buttonDown', 'buttonUp']

describe('the sheet: a first visit, and what a touch saves', () => {
  it('starts in the bedroom at night with every thing at its first step', () => {
    expect(FIRST).toMatchObject({ place: 'bedroom', day: false })
    expect(untouched(FIRST)).toBe(true)
    expect(new Game({ ...FIRST }, 1).show()).toMatchObject({ room: 'bedroom', day: false })
  })

  it('saves a punchline as its scene starts: the outcome is in the house before the press returns', () => {
    for (const { name, house, touch, after } of PUNCHLINES) {
      const game = new Game(house, 3)
      touch(game)
      expect(game.house, name).toEqual({ ...house, ...after })
      expect(game.changed(), name).toBe('now')
      expect(game.playing, name).toBe(true)
    }
  })

  it('saves a first and a second touch when the finger lands, and they are no scene', () => {
    const steps: [House, string, Partial<House>][] = [
      [FIRST, 'dog', { dog: 1 }],
      [at('fair'), 'pump', { balloon: 1 }],
      [at('henhouse'), 'hen', { eggs: 1 }],
      [at('bakery'), 'tray', { pies: 1 }],
      [at('dining'), 'ladle', { soup: 1 }],
      [at('garden'), 'weed', { weed: 1 }],
    ]
    for (const [house, id, after] of steps) {
      const game = new Game(house, 2)
      game.press(where(game, id))
      expect(game.house, id).toEqual({ ...house, ...after })
      expect(game.changed(), id).toBe('now')
      expect(game.playing, id).toBe(false)
    }
  })

  it('saves the four wrong uses that change a field when the finger lands, and the other four change none', () => {
    const changing: [House, string, Partial<House>][] = [
      [at('fair', { balloon: 2 }), 'belly', { balloon: 1 }],
      [at('henhouse', { eggs: 2 }), 'basket', { eggs: 1 }],
      [at('bathroom', { fog: 0 }), 'tap', { fog: 0b111 }],
      [at('garden'), 'flower', { flower: true }],
    ]
    for (const [house, id, after] of changing) {
      const game = new Game(house, 2)
      game.press(where(game, id))
      expect(game.house, id).toEqual({ ...house, ...after })
      expect(game.changed(), id).toBe('now')
    }
    const still: [House, string][] = [[FIRST, 'cushion'], [at('kitchen'), 'nose'], [at('bakery', { pies: 2 }), 'belly'], [at('dining', { soup: 1 }), 'diner']]
    for (const [house, id] of still) {
      const game = new Game(house, 2)
      game.press(where(game, id))
      expect(game.house, id).toEqual(house)
      expect(game.changed(), id).toBe('no')
      expect(game.cues().length, id).toBeGreaterThan(0)
    }
  })

  it('walks back from a middle step only: at the first and the last the same touch plays its joke and changes nothing', () => {
    for (const [house, id] of [[at('fair'), 'belly'], [at('fair', { balloon: 3 }), 'belly'], [at('henhouse'), 'basket'], [at('henhouse', { eggs: 3 }), 'basket']] as const) {
      const game = new Game(house, 2)
      game.press(where(game, id))
      expect(game.house).toEqual(house)
      expect(game.cues().length).toBeGreaterThan(0)
    }
  })

  it('answers a thing at its last step as itself, with a pose and a sound, and changes nothing', () => {
    for (const { name, house, touch, after, again } of PUNCHLINES) {
      const last = { ...house, ...after }
      const game = new Game(last, 5)
      game.press({ x: 20, y: 8 })
      game.cues()
      frames(game, 0.5)
      const before = glass(game.show())
      ;(again ?? touch)(game)
      expect(game.house, name).toEqual(last)
      expect(game.cues().length, name).toBeGreaterThan(0)
      expect(glass(game.show()), name).not.toBe(before)
      expect(game.playing, name).toBe(false)
    }
  })

  it('goes through a door: the place is saved at once, the first door at night is the morning, and the dog who eats is round', () => {
    const game = new Game({ ...FIRST }, 1)
    game.press(door(0))
    expect(game.house).toEqual({ ...FIRST, place: 'kitchen', day: true })
    expect(game.changed()).toBe('now')
    // The glass still shows the bedroom, by day now, until the door has swung.
    expect(game.show()).toMatchObject({ room: 'bedroom', day: true })
    frames(game, 6)
    expect(game.show()).toMatchObject({ room: 'kitchen', day: true })
    expect(game.playing).toBe(false)
    const hungry = new Game(at('dining', { dog: 3, pies: 3 }), 1)
    hungry.press(door(DOORS_OF.dining.indexOf('bakery')))
    expect(hungry.house).toMatchObject({ place: 'bakery', full: true })
  })

  it('every room is three doors from the bedroom at most, and every door leads where the map says', () => {
    for (const room of ROOMS) {
      DOORS_OF[room].forEach((next, i) => {
        const game = new Game(at(room), 1)
        game.press(door(i))
        expect(game.house.place).toBe(next)
        frames(game, 5)
        expect(game.show().room).toBe(next)
      })
    }
  })

  it('puts the whole house to bed when the cord is pulled down and held: saved as the lamp clicks', () => {
    const game = new Game(at('fair', { balloon: 3, dog: 3, full: true, pies: 3, soup: 2, eggs: 1, weed: 2, flower: true, fly: 1, fog: 5 }), 1)
    lightsOutBy(game)
    expect(game.house).toEqual(lightsOut())
    expect(game.changed()).toBe('now')
    frames(game, 9)
    expect(game.show()).toMatchObject({ room: 'bedroom', day: false, dim: 0 })
    expect(game.playing).toBe(false)
    expect(glass(game.show())).toContain('owlOpen')
  })

  it('only blinks the lamp, in the bedroom at night with nothing touched, and saves nothing', () => {
    const game = new Game({ ...FIRST }, 1)
    lightsOutBy(game)
    expect(game.house).toEqual(FIRST)
    expect(game.changed()).toBe('no')
    expect(game.playing).toBe(false)
    expect(game.cues()).toContain('lampClick')
  })

  it('never takes a tap for the lamp: a tap on it only swings it, however long it is held', () => {
    for (const hold of [0, 0.2, 0.45, 2]) {
      const house = at('fair', { balloon: 2 })
      const game = new Game(house, 1)
      game.press(where(game, 'lamp'))
      expect(game.cues()).toEqual(['lampSwing'])
      frames(game, hold)
      game.release()
      frames(game, 2)
      expect(game.house).toEqual(house)
      expect(game.show().dim).toBe(0)
    }
  })

  it('starts the pull at the cord only: a finger that lands on the shade, slides down and rests there swings the lamp and puts nobody to bed', () => {
    const house = at('fair', { balloon: 2 })
    const game = new Game(house, 1)
    game.press({ x: LAMP.x + 24, y: LAMP.y })
    expect(game.cues()).toEqual(['lampSwing'])
    for (const down of [PULL[0] + 2, PULL[1] + 2, PULL[1] + 30]) {
      game.move({ x: LAMP.x + 24, y: LAMP.y + down })
      expect(game.show().dim).toBe(0)
    }
    frames(game, PULL_HOLD + 1)
    game.release()
    expect(game.house).toEqual(house)
    expect(game.changed()).toBe('no')
  })

  it('dims the house as the cord goes down, and lets it go bright again when the cord is let go too soon', () => {
    const house = at('kitchen', { fly: 1 })
    const game = new Game(house, 1)
    game.press({ x: CORD.x, y: CORD.y[0] })
    game.move({ x: CORD.x, y: CORD.y[0] + PULL[0] + 2 })
    expect(game.show().dim).toBe(0.5)
    game.move({ x: CORD.x, y: CORD.y[0] + PULL[1] + 2 })
    expect(game.show().dim).toBe(1)
    frames(game, PULL_HOLD - 0.1)
    game.release()
    expect(game.show().dim).toBe(0)
    frames(game, 3)
    expect(game.house).toEqual(house)
  })

  it('finds what was done in one room in the others', () => {
    const lit = (house: House): string => glass(new Game(house, 1).show())
    expect(lit(at('kitchen', { balloon: 3 }))).toContain('kHat_rubber_')
    expect(lit(at('dining', { balloon: 3, pies: 3 }))).toContain('dHat_rubberPie_')
    expect(lit(at('kitchen', { pies: 3 }))).toContain('kHead_pie_')
    expect(lit(at('bakery', { pies: 1, eggs: 1 }))).toContain('pie1T')
    expect(lit(at('bakery', { pies: 1 }))).toContain('pie1F')
    expect(lit(at('dining', { soup: 1 }))).toContain('flyBowl')
    expect(lit(at('dining', { soup: 1, flower: true }))).toContain('flyFlower')
    expect(lit(at('dining', { soup: 1, flower: true }))).not.toContain('flyBowl')
    expect(lit(at('dining', { soup: 1, fly: 1 }))).not.toContain('fly')
    expect(lit(at('kitchen', { soup: 3 }))).toContain('flood')
    expect(lit(at('henhouse', { weed: 2 }))).toContain('hRoot')
    expect(lit(at('dining'))).toContain('dnRest')
    expect(lit(at('dining', { dog: 3 }))).toContain('dgRest')
    expect(lit(at('dining', { dog: 3, full: true, pies: 3 }))).toContain('drRest')
    expect(lit(at('fair', { dog: 3 }))).toContain('fdSit')
    expect(lit(at('fair', { dog: 3, full: true, pies: 3 }))).toContain('fdRound')
    // Through the bathroom's door: fog, then the bath in the clear; and no foot while the hen sits at the table.
    expect(lit(at('fair'))).toContain('peek0_fog')
    expect(lit(at('fair', { fog: 0 }))).toContain('peek0_clear')
    expect(lit(at('dining', { fog: 0 }))).toContain('peek1_clearNoFoot')
    expect(lit(at('dining', { fog: 0, dog: 3 }))).toContain('peek1_clear:')
  })
})

describe('lesson 1: sight and sound run on one clock', () => {
  it('hands out every sound in the call that lights its pose, in long sessions in every room', () => {
    const late: string[] = []
    for (const seed of [1, 2, 3]) {
      const game = new Game({ ...FIRST }, seed)
      const check = (): void => {
        const cues = game.cues().filter((cue) => !GLOBAL.includes(cue))
        // The lamp's click is one sound with the room's light: the room itself is its pose.
        if (cues.length > game.fresh() + (cues.includes('lampClick') || cues.includes('lampOut') ? 1 : 0)) late.push(`${game.glass.room}: ${cues.join(' ')} with ${game.fresh()} poses`)
      }
      play(game, makeRng(seed), 1200, { frame: check, touched: check, cordEvery: 80 })
    }
    expect(late).toEqual([])
  })

  it('carries no delay inside a voice', () => {
    for (const [cue, notes] of Object.entries(VOICES)) for (const note of notes) expect('delay' in note, cue).toBe(false)
  })

  it('answers a press in the call that takes it: a pose and a sound before the press returns', () => {
    for (const house of HOUSES) {
      const game = new Game(house, 4)
      for (const target of game.targets()) {
        const fresh = new Game(house, 4)
        fresh.press(middleOf(target.shape))
        expect(fresh.cues().length, `${house.place} ${target.id}`).toBeGreaterThan(0)
      }
    }
  })
})

describe('lesson 2: a scene a touch ends is silent from that frame', () => {
  /** The sounds a room makes by itself, which are the only ones that may follow a scene that was cut. */
  const quiet = (cue: Cue): boolean => VOICES[cue].every((note) => note.peak <= 0.035)

  it('cuts every punchline at any moment: the scene is over, the sound is hushed, and nothing of it is heard later', () => {
    for (const { name, house, touch, after } of PUNCHLINES) {
      for (const cutAt of [0, 0.05, 0.2, 0.5, 0.9, 1.4]) {
        const game = new Game(house, 6)
        touch(game)
        game.cues()
        game.hush()
        frames(game, cutAt)
        const playing = game.playing
        game.cues()
        game.press({ x: 20, y: 8 })
        expect(game.playing, name).toBe(false)
        expect(game.hush(), `${name} at ${cutAt}`).toBe(playing)
        // The touch that cut it is an ordinary touch: here a knock on the case, and nothing else.
        expect(game.cues(), name).toEqual(['caseKnock'])
        expect(game.house, name).toEqual({ ...house, ...after })
        const heard: Cue[] = []
        frames(game, 4, () => heard.push(...game.cues()))
        expect(heard.filter((cue) => !quiet(cue)), `${name} cut at ${cutAt}`).toEqual([])
      }
    }
  })

  it('cuts a walk through a door and lights out the same way, and shows the house as it is saved', () => {
    for (const cutAt of [0, 0.1, 0.3, 0.6, 1.2, 2.5]) {
      const game = new Game({ ...FIRST, dog: 3 }, 6)
      game.press(door(1))
      frames(game, cutAt)
      game.hush()
      const playing = game.playing
      game.press({ x: 20, y: 8 })
      expect(game.hush()).toBe(playing)
      expect(game.show()).toMatchObject({ room: 'bathroom', day: true })
      const bed = new Game(at('garden', { weed: 2, dog: 3 }), 6)
      lightsOutBy(bed)
      frames(bed, cutAt)
      bed.press({ x: 20, y: 8 })
      bed.cues()
      expect(bed.show()).toMatchObject({ room: 'bedroom', day: false })
      expect(bed.house).toEqual(lightsOut())
      const heard: Cue[] = []
      frames(bed, 4, () => heard.push(...bed.cues()))
      expect(heard.filter((cue) => !quiet(cue))).toEqual([])
    }
  })

  it('closes all sound when it is put away, and makes none until it is touched again', () => {
    for (const { house, touch } of PUNCHLINES) {
      const game = new Game(house, 6)
      touch(game)
      frames(game, 0.3)
      game.hush()
      game.park()
      expect(game.hush()).toBe(true)
      expect(game.cues()).toEqual([])
      const heard: Cue[] = []
      frames(game, 20, () => heard.push(...game.cues()))
      expect(heard).toEqual([])
    }
  })
})

describe('lesson 3: what the rules compute is what is shown, and a thing is touched where it is drawn', () => {
  /** Things that are printed on the card and not lit: they are touched where they are printed. */
  const PRINTED = new Set(['fair pump', 'bathroom tap', 'dining bowl', 'bedroom cushion', 'bedroom chest', 'bedroom bigbed', 'kitchen air'])

  it('lights only segments the room on the glass has, in long sessions', () => {
    const missing = new Set<string>()
    for (const seed of [1, 2, 3]) {
      const game = new Game({ ...FIRST }, seed)
      play(game, makeRng(seed + 10), 1500, {
        cordEvery: 200,
        frame: () => {
          const shown = game.show(), has = segmentsOf(shown.room)
          for (const lit of shown.lit) if (!has[lit.name]) missing.add(`${shown.room} ${lit.name}`)
        },
      })
    }
    expect([...missing]).toEqual([])
  })

  it('has ink under every thing that answers, in every state of every room', () => {
    const bare: string[] = []
    for (const house of HOUSES) {
      const game = new Game(house, 1)
      const lit = game.show().lit.map((one) => one.name)
      for (const target of game.targets()) {
        if (PRINTED.has(`${house.place} ${target.id}`)) continue
        const cells = lit.reduce((sum, name) => sum + inkedIn(house.place, name, target.shape), 0)
        if (cells < 10) bare.push(`${house.place} ${target.id}: ${cells} cells of ink (${JSON.stringify(house)})`)
      }
    }
    expect(bare).toEqual([])
  })

  it('takes a touch on a thing for that thing: what the idle ladder points at answers as the room\'s thing', () => {
    for (const house of HOUSES) {
      const game = new Game(house, 1)
      const hint = ROOM[house.place].hint(house, ROOM[house.place].enter(house))
      if (!hint) continue
      const first = game.targets().find((target) => inShape(hint.at, target.shape))
      expect(first, house.place).toBeDefined()
      expect(inShape(hint.at, hint.glow, 4), house.place).toBe(true)
      // Following the hand does the thing: a tap where it taps, or a drag where it drags.
      game.press(hint.at)
      if (hint.to) for (let i = 1; i <= 6; i++) game.move({ x: hint.at.x + ((hint.to.x - hint.at.x) * i) / 6, y: hint.at.y + ((hint.to.y - hint.at.y) * i) / 6 })
      game.release()
      const moved = JSON.stringify(game.house) !== JSON.stringify(house)
      // The kitchen's thing is the fly: a tap on it swats it. Every other thing takes a step.
      expect(moved, `${house.place} ${JSON.stringify(house)}`).toBe(true)
    }
  })

  it('shows the hand drawing the cord down, on the cord and off every door, and a finger that does the same and holds puts the house to bed', () => {
    const house = at('fair', { balloon: 2 })
    const game = new Game(house, 1)
    const hint = game.hint(2)
    expect(hint.to).toBeDefined()
    expect(Math.abs(hint.at.x - CORD.x)).toBeLessThan(1)
    for (const d of DOORS) expect(inShape(hint.at, d) || inShape(hint.to!, d)).toBe(false)
    game.press(hint.at)
    for (let i = 1; i <= 6; i++) game.move({ x: hint.at.x, y: hint.at.y + ((hint.to!.y - hint.at.y) * i) / 6 })
    frames(game, PULL_HOLD + 0.05)
    game.release()
    expect(game.house).toEqual(lightsOut())
    // With nothing to put to bed the hand never shows the cord.
    for (let i = 0; i < 4; i++) expect(new Game({ ...FIRST }, 1).hint(i).to).toBeUndefined()
  })

  it('touches the tray where it is drawn at every step, level in his hands or hanging once the tower is down: a press on the drawn tray answers as the tray', () => {
    for (const pies of [0, 1, 2, 3] as const) {
      const drawn = trayDrawn(pies === 3)
      const along = (t: number): Point => ({ x: drawn.from.x + (drawn.to.x - drawn.from.x) * t, y: drawn.from.y + (drawn.to.y - drawn.from.y) * t })
      // The tray's ink is where the rules say it is drawn.
      const names = new Game(at('bakery', { pies }), 1).poses().find(([who]) => who === 'baker')?.[1] ?? []
      const ink = names.reduce((sum, name) => sum + inkedIn('bakery', name, { ...along(0.5), rx: 16, ry: 16 }), 0)
      expect(ink, `pies ${pies}`).toBeGreaterThan(4)
      for (const t of [0.15, 0.5, 0.85]) {
        const game = new Game(at('bakery', { pies }), 1)
        game.press(along(t))
        expect(game.cues(), `pies ${pies} at ${t}`).toContain(pies === 3 ? 'trayWobble' : 'pieFall')
      }
    }
  })

  it('shows the cord, the bloom, the held button and the knock that the rules compute', () => {
    const game = new Game(at('kitchen'), 1)
    game.press({ x: BUTTONS[0].x, y: BUTTONS[0].y })
    expect(game.show()).toMatchObject({ held: 0, test: true })
    game.release()
    expect(game.show()).toMatchObject({ held: null, test: false })
    game.press({ x: 20, y: 8 })
    expect(game.show().shock).toBe(true)
    frames(game, 0.3)
    expect(game.show().shock).toBe(false)
    game.press({ x: 600, y: 120 })
    expect(game.show().bloom).not.toBeNull()
    frames(game, 0.4)
    expect(game.show().bloom).toBeNull()
  })

  it('rubs the glass clear patch by patch under the finger, and saves the patches at the throttle', () => {
    const game = new Game(at('bathroom'), 1)
    game.press(middleOf(cell(0)))
    expect(game.house.fog).toBe(FOG_ALL & ~1)
    expect(game.changed()).toBe('soon')
    game.move(middleOf(cell(1)))
    game.move(middleOf(cell(4)))
    expect(game.house.fog).toBe(FOG_ALL & ~0b10011)
    expect(game.holding).toBe(true)
    game.release()
    expect(glass(game.show())).toContain('bath4')
    expect(glass(game.show())).toContain('fog5')
    // A finger that leaves the glass rubs nothing.
    const off = new Game(at('bathroom'), 1)
    off.press(middleOf(cell(0)))
    off.move({ x: PANE.x - 40, y: PANE.y + 40 })
    expect(off.house.fog).toBe(FOG_ALL & ~1)
  })
})

describe('lesson 4: nothing starts, sounds or is pending on load', () => {
  it.each(HOUSES.map((house, i) => ({ i, house })))('opens every house at rest, house $i: no sound, no scene, nothing saved, for a minute with no touch', ({ house }) => {
    {
      const game = new Game(house, 9)
      expect(game.cues(), house.place).toEqual([])
      expect(game.playing).toBe(false)
      expect(game.holding).toBe(false)
      frames(game, 60, () => {
        expect(game.cues()).toEqual([])
        expect(game.playing).toBe(false)
      })
      expect(game.house).toEqual(house)
      expect(game.changed()).toBe('no')
      expect(game.hush()).toBe(false)
    }
  })

  it('opens on the room that was left, with every thing at its saved step and no scene replayed', () => {
    for (const { house, after } of PUNCHLINES) {
      const left = { ...house, ...after }
      const game = new Game(left, 9)
      expect(game.show().room).toBe(left.place)
      expect(game.playing).toBe(false)
      // The same glass a second load gives, and the same again a moment later but for what idles.
      expect(glass(game.show())).toBe(glass(new Game(left, 9).show()))
    }
  })

  it('leaves nothing pending when a finger lifts: no held button, no pulled cord, no timer that goes on', () => {
    const game = new Game(at('garden', { weed: 1 }), 1)
    game.press({ x: CORD.x, y: CORD.y[0] })
    game.move({ x: CORD.x, y: CORD.y[0] + PULL[1] + 2 })
    frames(game, PULL_HOLD * 0.8)
    game.release()
    expect(game.holding).toBe(false)
    // Pulled again, the hold starts from nothing: what was held before does not count.
    game.press({ x: CORD.x, y: CORD.y[0] })
    game.move({ x: CORD.x, y: CORD.y[0] + PULL[1] + 2 })
    frames(game, PULL_HOLD * 0.8)
    game.release()
    frames(game, 3)
    expect(game.house).toEqual(at('garden', { weed: 1 }))
    const hold = where(game, 'weed')
    game.press(hold)
    game.move({ x: hold.x, y: hold.y - 70 })
    game.release()
    expect(game.holding).toBe(false)
    game.move({ x: hold.x, y: hold.y - 300 })
    expect(game.house.weed).toBe(1)
  })
})

describe('lesson 5: put away, the game is the one a load would give', () => {
  /** Ways of being in the middle of something. */
  const MIDDLES: readonly { name: string; make: () => Game }[] = [
    { name: 'a first showing', make: () => new Game({ ...FIRST }, 7) },
    ...PUNCHLINES.flatMap(({ name, house, touch }) => [0, 0.3, 1.2, 3.9].map((into) => ({ name: `${name}, ${into} s in`, make: () => { const game = new Game(house, 7); touch(game); frames(game, into); return game } }))),
    ...[0, 0.2, 0.5, 1.5, 3].map((into) => ({ name: `the morning, ${into} s in`, make: () => { const game = new Game({ ...FIRST, dog: 3 }, 7); game.press(door(2)); frames(game, into); return game } })),
    ...[0, 0.6, 1.4, 3, 5].map((into) => ({ name: `lights out, ${into} s in`, make: () => { const game = new Game(at('bakery', { pies: 3, dog: 3, full: true, balloon: 3 }), 7); lightsOutBy(game); frames(game, into); return game } })),
    { name: 'the cord held down', make: () => { const game = new Game(at('fair', { balloon: 1 }), 7); game.press({ x: CORD.x, y: CORD.y[0] }); game.move({ x: CORD.x, y: CORD.y[0] + PULL[1] + 2 }); frames(game, 0.2); return game } },
    { name: 'the weed held taut', make: () => { const game = new Game(at('garden'), 7); const hold = where(game, 'weed'); game.press(hold); game.move({ x: hold.x, y: hold.y - 80 }); frames(game, 0.2); return game } },
    { name: 'a rub under way', make: () => { const game = new Game(at('bathroom'), 7); game.press(middleOf(cell(3))); game.move(middleOf(cell(4))); return game } },
    { name: 'a button held', make: () => { const game = new Game(at('kitchen'), 7); game.press({ x: BUTTONS[1].x, y: BUTTONS[1].y }); frames(game, 0.1); return game } },
    { name: 'a wrong use on a head', make: () => { const game = new Game(at('dining', { soup: 1 }), 7); tap(game, 'diner'); frames(game, 1); return game } },
    { name: 'the owl hanging', make: () => { const game = new Game(at('garden', { weed: 1 }), 7); const hold = where(game, 'weed'); game.press(hold); game.move({ x: hold.x, y: hold.y - OUT - 4 }); game.release(); frames(game, 6); return game } },
  ]

  it.each(MIDDLES)('settles as a load would from the middle of $name: the same glass, and the same game from there on', ({ name, make }) => {
    {
      const parked = make()
      parked.park()
      parked.cues()
      parked.hush()
      parked.changed()
      const loaded = new Game(parked.house, 7)
      expect(glass(parked.show()), name).toBe(glass(loaded.show()))
      expect(parked.playing, name).toBe(false)
      expect(parked.holding, name).toBe(false)
      // Played on with the same touches, the two never differ: in what is lit, heard or saved.
      const a: string[] = [], c: string[] = []
      const note = (out: string[]) => (game: Game) => out.push(`${glass(game.show())} / ${game.cues().join(' ')} / ${game.changed()} / ${JSON.stringify(game.house)}`)
      play(parked, makeRng(31), 60, { frame: note(a), touched: note(a) })
      play(loaded, makeRng(31), 60, { frame: note(c), touched: note(c) })
      expect(a.length, name).toBe(c.length)
      const differs = a.findIndex((line, i) => line !== c[i])
      expect(differs < 0 ? '' : `${a[differs]}\n  but loaded\n${c[differs]}`, name).toBe('')
    }
  })

  it('is put away at random moments of long sessions, and is each time the game a load gives', () => {
    for (const seed of [1, 2, 3]) {
      const game = new Game({ ...FIRST }, 7)
      const rng = makeRng(seed)
      for (let round = 0; round < 60; round++) {
        play(game, rng, 1 + Math.floor(rng.next() * 12), { cordEvery: 90 })
        game.park()
        expect(glass(game.show()), `seed ${seed} round ${round}`).toBe(glass(new Game(game.house, 7).show()))
      }
    }
  })
})

describe('lesson 6: a finger that is taken away never acts for the child', () => {
  it('does not click the lamp, pull the weed or sound a button', () => {
    const lamp = new Game(at('fair', { balloon: 2 }), 1)
    lamp.press({ x: CORD.x, y: CORD.y[0] })
    lamp.move({ x: CORD.x, y: CORD.y[0] + PULL[1] + 2 })
    frames(lamp, PULL_HOLD * 0.6)
    lamp.cues()
    lamp.cancel()
    expect(lamp.cues()).toEqual([])
    expect(lamp.show().dim).toBe(0)
    frames(lamp, 3)
    expect(lamp.house).toEqual(at('fair', { balloon: 2 }))

    const weed = new Game(at('garden', { weed: 1 }), 1)
    const hold = where(weed, 'weed')
    weed.press(hold)
    weed.move({ x: hold.x, y: hold.y - 80 })
    weed.cues()
    weed.cancel()
    expect(weed.cues()).toEqual([])
    expect(weed.house.weed).toBe(1)
    // Let go by the child, the same weed twangs back.
    weed.press(hold)
    weed.move({ x: hold.x, y: hold.y - 80 })
    weed.cues()
    weed.release()
    expect(weed.cues()).toEqual(['weedTwang'])

    const button = new Game(at('kitchen'), 1)
    button.press({ x: BUTTONS[0].x, y: BUTTONS[0].y })
    button.cues()
    button.cancel()
    expect(button.cues()).toEqual([])
    expect(button.show().held).toBeNull()
  })

  it('changes nothing that is saved, whatever was in hand, in long sessions where every lift is a cancel', () => {
    for (const house of HOUSES) {
      const game = new Game(house, 1)
      for (const target of game.targets()) {
        const before = JSON.stringify(game.house)
        game.press(middleOf(target.shape))
        const pressed = JSON.stringify(game.house)
        game.changed()
        game.cancel()
        expect(JSON.stringify(game.house), `${house.place} ${target.id}`).toBe(pressed)
        expect(game.changed()).toBe('no')
        if (pressed !== before) break
      }
    }
  })
})

describe('lesson 14: what a character does by itself is no touch, and a slow tap is a tap', () => {
  it('never holds or plays a scene by itself, so the idle ladder is not taken back by an idle run', () => {
    for (const house of HOUSES) {
      const game = new Game(house, 2)
      game.press({ x: 20, y: 8 })
      game.release()
      let idled = 0
      const before = glass(game.show())
      frames(game, 30, () => {
        expect(game.playing || game.holding).toBe(false)
        if (glass(game.show()) !== before) idled += 1
      })
      // The room is alive at idle all the same: somebody moves.
      expect(idled, house.place).toBeGreaterThan(0)
      expect(game.house).toEqual(house)
    }
  })

  it('answers a tap held for 0.45 s as it answers a quick one', () => {
    for (const house of HOUSES) {
      const quick = new Game(house, 2), slow = new Game(house, 2)
      for (const target of quick.targets().filter((one) => one.id !== 'lamp')) {
        const point = middleOf(target.shape)
        quick.press(point)
        quick.release()
        slow.press(point)
        frames(slow, 0.45)
        slow.release()
        expect(slow.house, `${house.place} ${target.id}`).toEqual(quick.house)
        if (quick.house.place !== house.place) break
      }
    }
  })
})

describe('the rulings', () => {
  it('keeps the afterimage of a pose short and pale: three frames at most, and under a fifth of full strength', () => {
    expect(AFTERIMAGE).toBeLessThanOrEqual(0.05)
    expect(AFTER_STRENGTH).toBeLessThanOrEqual(0.2)
    const game = new Game({ ...FIRST, dog: 2 }, 1)
    tap(game, 'dog')
    let longest = 0, run = 0
    frames(game, 3, () => {
      const fading = game.show().lit.filter((lit) => lit.fading)
      for (const lit of fading) expect(lit.strength).toBeLessThanOrEqual(AFTER_STRENGTH)
      run = fading.some((lit) => lit.name.startsWith('dog')) ? run + 1 : 0
      longest = Math.max(longest, run)
    })
    expect(longest).toBeLessThanOrEqual(3)
  })

  it('has the baker breathe with his belly and straighten something, by himself, in every room he stands in', () => {
    const tidies: Record<string, string> = { fair: 'fBody_tidy', bakery: 'bBody_toes', dining: 'dBody_tidy', kitchen: 'kArmTidy' }
    for (const [room, tidy] of Object.entries(tidies)) {
      const game = new Game(at(room as RoomId), 3)
      const seen = new Set<string>()
      frames(game, 90, () => { for (const name of game.poses().find(([who]) => who === 'baker')?.[1] ?? []) seen.add(name) })
      expect([...seen].some((name) => /Body_\w+In$/.test(name) || name === 'dSwell'), `${room} breathes`).toBe(true)
      expect(seen.has(tidy), `${room} straightens`).toBe(true)
      // At the fair, where he wears it, he sets his cap straight too: his hand at it, the cap lifted and set down.
      if (room === 'fair') expect(seen.has('fBody_cap') && seen.has('fHat_capJump_stand'), 'the cap').toBe(true)
      // And it is his own act: nothing is saved, nothing sounds before a touch.
      expect(game.changed()).toBe('no')
      expect(game.cues()).toEqual([])
    }
    // With a pie on his face, his hands empty or the ladle gone, he breathes still, in every room.
    const breathes = (game: Game): boolean => {
      const seen = new Set<string>()
      frames(game, 30, () => { for (const name of game.poses().find(([who]) => who === 'baker')?.[1] ?? []) seen.add(name) })
      return [...seen].some((name) => /Body_\w+In$/.test(name) || name === 'dSwell')
    }
    for (const room of ['kitchen', 'bakery', 'dining'] as const) expect(breathes(new Game(at(room, { pies: 3 }), 3)), `${room} with a pie on his face`).toBe(true)
    for (const room of ['fair', 'kitchen', 'bakery', 'dining'] as const) expect(breathes(new Game(at(room, { pies: 3, balloon: 3 }), 3)), `${room} with the pie in his hat`).toBe(true)
    // Stirring the pot from the stool on the flooded floor, he breathes between two stirs.
    expect(breathes(new Game(at('kitchen', { soup: 3 }), 3)), 'stirring in the flood').toBe(true)
    expect(breathes(new Game(at('kitchen', { soup: 3, pies: 3 }), 3)), 'stirring with a pie on his face').toBe(true)
    const helmet = new Game(at('dining', { soup: 1 }), 3)
    tap(helmet, 'diner')
    frames(helmet, 3)
    expect(breathes(helmet), 'the ladle gone').toBe(true)
  })

  it('gives the lamp a gesture a stray tap cannot make: its areas and the doors\' never meet', () => {
    for (const room of ROOMS) {
      const game = new Game(at(room), 1)
      const targets = game.targets()
      for (const one of targets.filter((target) => target.id.startsWith('door'))) {
        const middle = middleOf(one.shape)
        expect(targets.find((target) => inShape(middle, target.shape))?.id, room).toBe(one.id)
      }
    }
  })
})

describe('reading 1: what the sheet says is heard and seen', () => {
  /** Every cue of `seconds` of play, each with what the named figure showed in the step that gave it. */
  const heard = (game: Game, seconds: number, who: string): [Cue, string][] => {
    const out: [Cue, string][] = []
    const take = (): void => { for (const cue of game.cues()) out.push([cue, (game.poses().find(([name]) => name === who)?.[1] ?? []).join(' ')]) }
    take()
    frames(game, seconds, take)
    return out
  }

  it('lands the tower in three splats, each heard in the step that lights it', () => {
    const game = new Game(at('bakery', { pies: 2 }), 1)
    tap(game, 'tray')
    const splats = heard(game, 3, 'pies').filter(([cue]) => cue.startsWith('pieSplat'))
    expect(splats).toEqual([['pieSplat', 'splatA'], ['pieSplatB', 'splatB'], ['pieSplatC', 'splats']])
  })

  it('flaps the rubber hat twice as he turns, in the kitchen, the bakery and the dining room: two flaps, each with the hat thrown up', () => {
    const from: Record<string, RoomId> = { kitchen: 'bedroom', bakery: 'henhouse', dining: 'bathroom' }
    for (const [room, start] of Object.entries(from)) {
      const game = new Game(at(start, { balloon: 3, day: true }), 1)
      game.press(door(DOORS_OF[start].indexOf(room as RoomId)))
      game.release()
      const flaps = heard(game, 4, 'baker').filter(([cue]) => cue.startsWith('rubberFlap'))
      expect(flaps.map(([cue]) => cue), room).toEqual(['rubberFlap', 'rubberFlapB'])
      for (const [, shown] of flaps) expect(shown, room).toContain('Hat_rubberFlap')
    }
  })

  it('puffs the tall pies as the bakery is entered, under the cap and under the rubber hat alike, with the pies flickering as it sounds', () => {
    for (const balloon of [0, 3] as const) {
      for (const count of [1, 2] as const) {
        const game = new Game(at('henhouse', { eggs: 1, pies: count, balloon }), 1)
        game.press(door(DOORS_OF.henhouse.indexOf('bakery')))
        game.release()
        game.fresh()
        let seen = 0
        const cues: Cue[] = []
        frames(game, 4, () => {
          const now = game.cues(), poses = game.fresh()
          if (now.includes('piePuff')) seen = poses
          cues.push(...now)
        })
        expect(cues.filter((cue) => cue === 'piePuff'), `balloon ${balloon}, ${count}`).toHaveLength(1)
        expect(seen, `balloon ${balloon}, ${count}`).toBeGreaterThan(0)
        // Under the rubber hat the flaps come first and the puff after them, not on top of one.
        if (balloon === 3) expect(cues.indexOf('piePuff')).toBeGreaterThan(cues.indexOf('rubberFlapB'))
      }
    }
    // With no egg laid there is nothing to puff.
    const flat = new Game(at('henhouse', { pies: 2, balloon: 3 }), 1)
    flat.press(door(DOORS_OF.henhouse.indexOf('bakery')))
    flat.release()
    const none: Cue[] = []
    frames(flat, 4, () => none.push(...flat.cues()))
    expect(none).not.toContain('piePuff')
  })

  it('gargles and then sprays at the first ladle of soup with the fly about, and at the second, each sound on a change of the glass', () => {
    for (const soup of [0, 1] as const) {
      const game = new Game(at('dining', { soup }), 1)
      tap(game, 'ladle')
      const got = heard(game, 3, 'diner').filter(([cue]) => cue === 'soupGargle' || cue === 'soupSpray')
      expect(got.map(([cue]) => cue), `soup ${soup}`).toEqual(['soupGargle', 'soupSpray'])
      expect(got[1][1], `soup ${soup}`).toMatch(/Spray/)
    }
    // Swatted, or with a flower to sit on, the fly is not in it, and there is neither.
    for (const more of [{ fly: 1 as const }, { flower: true }]) {
      const game = new Game(at('dining', more), 1)
      tap(game, 'ladle')
      expect(heard(game, 3, 'diner').map(([cue]) => cue).filter((cue) => cue === 'soupGargle' || cue === 'soupSpray')).toEqual([])
    }
  })

  it('sounds the dog going ahead only where he is seen to go: through every door of every room his trot or his roll is heard in the step his figure leaves the glass', () => {
    for (const full of [false, true]) {
      for (const room of ROOMS) {
        for (const i of [0, 1, 2] as const) {
          const game = new Game(at(room, { dog: 3, full, pies: full ? 3 : 0, day: true }), 1)
          const who = ROOM[room].dog ?? 'dog'
          expect((game.poses().find(([name]) => name === who)?.[1] ?? []).length, `${room}: the dog is drawn`).toBeGreaterThan(0)
          game.press(door(i))
          game.release()
          const steps: [Cue, string][] = []
          // Until the room changes: what is heard of him here, and what his figure showed as it was.
          for (let n = 0; n < 240 && game.show().room === room; n++) {
            for (const cue of game.cues()) steps.push([cue, (game.poses().find(([name]) => name === who)?.[1] ?? ['gone']).join(' ')])
            game.step(1 / 60)
          }
          const ahead = steps.filter(([cue]) => cue === (full ? 'dogRoll' : 'dogTrot'))
          expect(ahead.length, `${room} door ${i}`).toBeGreaterThan(0)
          expect(ahead[ahead.length - 1][1], `${room} door ${i}`).toBe('')
        }
      }
    }
  })

  it('has the dog on the chair first in the dining room: his panting, or his roll, is heard as he is lit there, from each room beside it', () => {
    for (const full of [false, true]) {
      for (const start of DOORS_OF.dining) {
        const game = new Game(at(start, { dog: 3, full, pies: full ? 3 : 0, day: true }), 1)
        game.press(door(DOORS_OF[start].indexOf('dining')))
        game.release()
        const got = heard(game, 4, 'diner').filter(([cue]) => cue === (full ? 'dogRoll' : 'dogPant') && game.show().room === 'dining')
        const last = got[got.length - 1]
        expect(last, `${start}, ${full}`).toBeDefined()
        expect(last[1], `${start}, ${full}`).toMatch(full ? /^drRestB/ : /^dgRestB/)
      }
    }
  })

  it('nods the diner off as the dining room is left with the ladle on its head too: a clonk on the nod and the spoon ringing, with the ladle back in the baker\'s hand', () => {
    for (const dog of [0, 3] as const) {
      const game = new Game(at('dining', { soup: 1, dog, fly: 1 }), 1)
      tap(game, 'diner')
      frames(game, 2)
      expect((game.poses().find(([name]) => name === 'diner')?.[1] ?? []).join(' ')).toMatch(/Helmet/)
      game.cues()
      game.press(door(0))
      game.release()
      const diner = heard(game, 0.3, 'diner')
      expect(diner.find(([cue]) => cue === 'clonk')?.[1], `dog ${dog}`).toMatch(/Nod/)
      expect(diner.map(([cue]) => cue), `dog ${dog}`).toContain('spoonRingOut')
    }
    const game = new Game(at('dining', { soup: 1, fly: 1 }), 1)
    tap(game, 'diner')
    frames(game, 2)
    const empty = (game.poses().find(([name]) => name === 'baker')?.[1] ?? []).join(' ')
    game.press(door(0))
    game.release()
    const back = (game.poses().find(([name]) => name === 'baker')?.[1] ?? []).join(' ')
    expect(empty).toContain('dBody_empty')
    expect(back).toContain('dBody_rest')
  })

  it('lands the fly on the rim of the floating pot as the flooded kitchen is left: its lazy buzz on that picture, clear of the pot and the flood', () => {
    const game = new Game(at('kitchen', { soup: 3 }), 1)
    game.press(door(0))
    game.release()
    const got = heard(game, 0.6, 'fly').filter(([cue]) => cue === 'flyLazy')
    expect(got).toEqual([['flyLazy', 'flyRimFloat']])
    for (const name of ['flyRimFloat', 'flyRimFloatB']) {
      for (const other of ['potFloat', 'potFloatB', 'flood', 'floodB']) expect(sharedCells('kitchen', name, other), `${name} on ${other}`).toBe(0)
      // On the rim: just above the pot where it floats, and nowhere near the stove.
      expect(inkedIn('kitchen', name, { x: RIM_AFLOAT.x, y: RIM_AFLOAT.y, rx: 44, ry: 44 })).toBe(inked('kitchen', name))
      expect(sharedCells('kitchen', name, 'potFloat') + inkedIn('kitchen', 'potFloat', { x: RIM_AFLOAT.x, y: RIM_AFLOAT.y + 40, rx: 60, ry: 40 })).toBeGreaterThan(0)
    }
    // Not flooded, it lands on the rim of the pot on the stove, as before.
    const dry = new Game(at('kitchen'), 1)
    dry.press(door(0))
    dry.release()
    expect(heard(dry, 0.6, 'fly').filter(([cue]) => cue === 'flyLazy')).toEqual([['flyLazy', 'flyRim']])
  })

  it('flaps the hat in sight with the pie in it too: each of the two flaps is heard on a hat thrown up with the pie hopping in it, in all four rooms', () => {
    const from: Record<string, RoomId> = { kitchen: 'bedroom', bakery: 'henhouse', dining: 'bathroom', fair: 'garden' }
    for (const [room, start] of Object.entries(from)) {
      const game = new Game(at(start, { balloon: 3, pies: 3, served: true, day: true }), 1)
      game.press(door(DOORS_OF[start].indexOf(room as RoomId)))
      game.release()
      const flaps = heard(game, 4, 'baker').filter(([cue]) => cue.startsWith('rubberFlap'))
      expect(flaps.map(([cue]) => cue), room).toEqual(['rubberFlap', 'rubberFlapB'])
      for (const [, shown] of flaps) expect(shown, room).toContain('Hat_rubberPieFlap')
      // And the flapped hat is another picture than the hat at rest, with the pie in both.
      const name = flaps[0][1].split(' ').find((one) => one.includes('Hat_rubberPieFlap'))!
      expect(sharedCells(room as RoomId, name, name.replace('PieFlap', 'Pie'))).toBeLessThan(inked(room as RoomId, name))
      expect(inked(room as RoomId, name)).toBeGreaterThan(inked(room as RoomId, name.replace('rubberPieFlap', 'rubberFlap')))
    }
  })

  it('serves the slice from his hat as the dining room is entered, saves it as the door is tapped, and finds it on the cloth ever after', () => {
    const game = new Game(at('kitchen', { pies: 3, balloon: 3 }), 1)
    game.press(door(1))
    game.release()
    expect(game.house).toMatchObject({ place: 'dining', served: true })
    expect(game.changed()).toBe('now')
    const cues: Cue[] = [...game.cues()]
    frames(game, 4, () => cues.push(...game.cues()))
    expect(cues.filter((cue) => cue === 'pieServe')).toHaveLength(1)
    expect(glass(game.show())).toContain('pieSlice')
    // Found as left: a load of that save shows the slice at once, and serves nothing again.
    const loaded = new Game(game.house, 2)
    expect(glass(loaded.show())).toContain('pieSlice')
    expect(loaded.playing).toBe(false)
    // Coming back in, he does not serve a second time.
    const back = new Game({ ...game.house, place: 'kitchen' }, 1)
    back.press(door(1))
    back.release()
    const again: Cue[] = [...back.cues()]
    frames(back, 4, () => again.push(...back.cues()))
    expect(again).not.toContain('pieServe')
    expect(glass(back.show())).toContain('pieSlice')
  })

  it('shows something at every demonstration of the idle ladder, in every state: a finger that does what the hand does always changes the house', () => {
    const helmet = (): Game => { const game = new Game(at('dining', { soup: 1 }), 1); tap(game, 'diner'); frames(game, 3); game.changed(); return game }
    const games: [string, () => Game][] = [...HOUSES.map((house): [string, () => Game] => [JSON.stringify(house), () => new Game(house, 1)]), ['the dining room with the ladle on the diner', helmet]]
    const nothing: string[] = []
    for (const [name, make] of games) {
      for (let demo = 0; demo < 4; demo++) {
        const game = make()
        const before = JSON.stringify(game.house)
        const hint = game.hint(demo)
        game.press(hint.at)
        if (hint.to) {
          for (let i = 1; i <= 6; i++) game.move({ x: hint.at.x + ((hint.to.x - hint.at.x) * i) / 6, y: hint.at.y + ((hint.to.y - hint.at.y) * i) / 6 })
          frames(game, PULL_HOLD + 0.05)
        }
        game.release()
        if (JSON.stringify(game.house) === before) nothing.push(`demonstration ${demo + 1}: ${name}`)
      }
    }
    expect(nothing).toEqual([])
  })

  it('has the duck squeak on every arrival beside a bathroom rubbed clear, through the bathroom\'s own door too', () => {
    for (const [start, to] of [['bathroom', 'bedroom'], ['bathroom', 'fair'], ['kitchen', 'dining'], ['garden', 'fair']] as const) {
      const game = new Game(at(start, { fog: 0, day: true }), 1)
      game.press(door(DOORS_OF[start].indexOf(to)))
      game.release()
      const cues: Cue[] = [...game.cues()]
      frames(game, 4, () => cues.push(...game.cues()))
      expect(cues.filter((cue) => cue === 'duckSqueak'), `${start} to ${to}`).toHaveLength(1)
    }
  })

  it('has the awake dog snap at the fly and miss, in the kitchen and in the bedroom at night, and never where no fly is about', () => {
    const snaps = (house: House, who: string): [Cue, string][] => {
      const game = new Game(house, 5)
      // A touch on bare glass first: nothing sounds by itself before one.
      game.press({ x: 600, y: 60 })
      game.release()
      return heard(game, 120, who).filter(([cue]) => cue === 'dogSnap')
    }
    const kitchen = snaps(at('kitchen', { dog: 3 }), 'dog')
    expect(kitchen.length).toBeGreaterThan(2)
    for (const [, shown] of kitchen) expect(shown).toBe('kdSnap')
    expect(snaps(at('bedroom', { dog: 3 }), 'dog').length).toBeGreaterThan(2)
    expect(snaps(at('kitchen', { dog: 3, fly: 1 }), 'dog')).toEqual([])
    expect(snaps(at('bedroom', { dog: 3, day: true }), 'dog')).toEqual([])
    // The fly is where it was: he missed.
    expect(new Game(at('kitchen', { dog: 3 }), 5).house.fly).toBe(0)
  })

  it('hops the whole tower as it stands when his belly is tapped: every pie of it in the air, flat or tall, and none other', () => {
    for (const count of [1, 2] as const) {
      for (const eggs of [0, 1] as const) {
        const game = new Game(at('bakery', { pies: count, eggs }), 1)
        const standing = game.poses().find(([name]) => name === 'pies')?.[1] ?? []
        expect(standing).toHaveLength(count)
        tap(game, 'belly')
        game.step(1 / 60)
        const up = game.poses().find(([name]) => name === 'pies')?.[1] ?? []
        expect(up, `${count} ${eggs}`).toEqual(inAir(standing))
        // Each pie in the air is the pie that stood on the tray, moved up and not redrawn.
        for (const name of standing) expect(inked('bakery', name.replace('pie', 'pieAir')), name).toBe(inked('bakery', name))
        frames(game, 1)
        expect(game.poses().find(([name]) => name === 'pies')?.[1], `${count} ${eggs}`).toHaveLength(count)
      }
    }
  })

  it('sends the dog back to bed in five poses, whoever he was when the lamp clicked', () => {
    for (const before of [at('bedroom', { dog: 1 }), at('bedroom', { dog: 2 }), at('bedroom', { dog: 3 }), at('garden', { dog: 3 }), at('bakery', { dog: 3, full: true, pies: 3 })]) {
      const dog = bedtime(before).find((part) => part.who === 'dog')
      expect(dog?.beats.map((beat) => beat.show.join(' ')), JSON.stringify(before)).toHaveLength(5)
      expect(new Set(dog?.beats.map((beat) => beat.show.join(' '))).size).toBe(5)
      expect(dog?.beats[4].show).toEqual(['dogCurlLow'])
    }
    // Played, not only planned: the five are seen in their order after the click.
    const game = new Game(at('bedroom', { dog: 3, day: true }), 1)
    lightsOutBy(game)
    const seen: string[] = []
    frames(game, 6, () => {
      const now = (game.poses().find(([name]) => name === 'dog')?.[1] ?? []).join(' ')
      if (now !== seen[seen.length - 1]) seen.push(now)
    })
    expect(seen.slice(0, seen.indexOf('dogCurlLow') + 1).slice(-5)).toEqual(['dogStandA', 'dogYawn', 'dogDoze', 'dogDozeShut', 'dogCurlLow'])
  })

  it('moves nothing for a finger it was never given: a slide out of the grown-up corner turns no eye, in any house', () => {
    let turned = 0
    for (const house of HOUSES) {
      const still = new Game(house, 4), slid = new Game(house, 4), pressed = new Game(house, 4)
      // The Mount gives the game no press in the corner; the moves of that finger still arrive.
      for (const x of [1100, 700, 300, 60]) slid.move({ x, y: 400 })
      slid.release()
      pressed.press({ x: 600, y: 60 })
      pressed.move({ x: 60, y: 400 })
      for (let i = 0; i < 30; i++) {
        still.step(1 / 60)
        slid.step(1 / 60)
        pressed.step(1 / 60)
        expect(glass(slid.show()), JSON.stringify(house)).toBe(glass(still.show()))
      }
      expect([...slid.cues()]).toEqual([])
      if (glass(pressed.show()).replace(/bloom[^\n]*/g, '') !== glass(still.show()).replace(/bloom[^\n]*/g, '')) turned++
    }
    // The same slide by a finger the game was given does turn eyes, so the check above is not empty.
    expect(turned).toBeGreaterThan(0)
  })

  it('touches the fly where it is drawn, in every frame of two idle minutes and after a tap on it: its body is under its target as it sits, lifts its wings and lands', () => {
    for (const house of [FIRST, at('bedroom', { dog: 3 }), at('kitchen'), at('kitchen', { dog: 3 })]) {
      const game = new Game(house, 9)
      let hops = 0, last = ''
      const check = (when: string): void => {
        const shown = (game.poses().find(([name]) => name === 'fly')?.[1] ?? []).filter((name) => !name.endsWith('Trail'))
        const target = game.targets().find((one) => one.id === 'fly')
        expect(target, when).toBeDefined()
        for (const name of shown) expect(inkedIn(house.place, name, { ...middleOf(target!.shape), rx: 24, ry: 24 }), `${house.place} ${name} ${when}`).toBeGreaterThan(0)
        if (shown.join() !== last && shown.join().endsWith('Up')) hops++
        last = shown.join()
      }
      frames(game, 120, () => check('idle'))
      expect(hops, house.place).toBeGreaterThan(20)
      if (house.place === 'bedroom') {
        // A tap on it, taken in every frame of its own hop: it is under the finger's next press each time.
        for (let i = 0; i < 12; i++) {
          tap(game, 'fly')
          check('tapped')
          frames(game, 0.05 * (i % 4), () => check('after a tap'))
        }
      }
    }
  })

  it('shows through a door the basket and the tray as they stand: one egg is one egg, one pie is one pie, and a tall pie is tall', () => {
    const lit = (house: House): string[] => new Game(house, 1).show().lit.map((one) => one.name)
    const peek = (house: House, of: RoomId): string => lit(house).filter((name) => name.startsWith(`peek${DOORS_OF[house.place].indexOf(of)}_`)).join(' ')
    const eggs = ([0, 1, 2, 3] as const).map((n) => peek(at('kitchen', { eggs: n }), 'henhouse'))
    expect(new Set(eggs).size).toBe(4)
    const trays = [at('dining'), at('dining', { pies: 1 }), at('dining', { pies: 2 }), at('dining', { pies: 1, eggs: 1 }), at('dining', { pies: 2, eggs: 1 }), at('dining', { pies: 3 })].map((house) => peek(house, 'bakery'))
    expect(new Set(trays).size).toBe(6)
    for (const one of [...eggs, ...trays]) expect(one).toMatch(/^peek\d_\w+$/)
    // Drawn as told: one egg is less ink than two, a tall pie more than a flat one, two pies more than one.
    const ink = (name: string, room: RoomId): number => inked(room, name)
    expect(ink(eggs[1], 'kitchen')).toBeLessThan(ink(eggs[2], 'kitchen'))
    expect(ink(trays[1], 'dining')).toBeLessThan(ink(trays[2], 'dining'))
    expect(ink(trays[1], 'dining')).toBeLessThan(ink(trays[3], 'dining'))
    expect(ink(trays[2], 'dining')).toBeLessThan(ink(trays[4], 'dining'))
  })

  it('touches the bedroom fly where it is drawn in every frame of the leap that startles it, and a press on its picture at any of those frames is the fly\'s', () => {
    const drawn = (game: Game): string[] => (game.poses().find(([name]) => name === 'fly')?.[1] ?? []).filter((name) => !name.endsWith('Trail'))
    const under = (game: Game, when: string): Point => {
      const target = game.targets().find((one) => one.id === 'fly')!
      for (const name of drawn(game)) expect(inkedIn('bedroom', name, { ...middleOf(target.shape), rx: 24, ry: 24 }), `${name} ${when}`).toBeGreaterThan(0)
      return middleOf(target.shape)
    }
    const leaping = (): Game => {
      const game = new Game(at('bedroom', { dog: 2 }), 2)
      tap(game, 'dog')
      expect(game.playing).toBe(true)
      return game
    }
    const whole = leaping()
    let moved = 0
    const first = under(whole, 'as the leap starts')
    for (let frame = 1; frame <= 150; frame++) {
      whole.step(1 / 60)
      const now = under(whole, `frame ${frame}`)
      if (now.x !== first.x && moved === 0) moved = frame
    }
    // It did hop, and well into the scene: the frames before that are the ones a planned spot would get wrong.
    expect(moved).toBeGreaterThan(20)
    for (const frame of [1, 10, moved - 2, moved - 1, moved, moved + 1, moved + 6]) {
      const game = leaping()
      frames(game, frame / 60)
      const spot = under(game, `before a press at frame ${frame}`)
      game.cues()
      game.press(spot)
      expect(game.cues(), `frame ${frame}`).toContain('flyDodge')
      game.release()
      under(game, `after a press at frame ${frame}`)
    }
  })

  it('gives the round dog his own small tricks in the bedroom: every tap one of them, never the same twice in a row, and no field changed', () => {
    const house = at('bedroom', { dog: 3, full: true, pies: 3, day: true })
    const game = new Game(house, 3)
    const seen: string[] = []
    for (let i = 0; i < 24; i++) {
      tap(game, 'dog')
      const shown = [(game.poses().find(([name]) => name === 'dog')?.[1] ?? []).join(' ')]
      const cues: Cue[] = [...game.cues()]
      frames(game, 1.4, () => {
        cues.push(...game.cues())
        const now = (game.poses().find(([name]) => name === 'dog')?.[1] ?? []).join(' ')
        if (now !== shown[shown.length - 1]) shown.push(now)
      })
      const trick = ROUND_TRICKS.findIndex((beats) => beats.every((beat, j) => shown[j] === [beat.show].flat().join(' ')))
      expect(trick, shown.join(', ')).toBeGreaterThanOrEqual(0)
      expect(cues.length).toBeGreaterThan(1)
      seen.push(String(trick))
      expect(game.house).toEqual(house)
    }
    for (let i = 1; i < seen.length; i++) expect(seen[i], String(i)).not.toBe(seen[i - 1])
    expect(new Set(seen).size).toBe(ROUND_TRICKS.length)
  })
})
