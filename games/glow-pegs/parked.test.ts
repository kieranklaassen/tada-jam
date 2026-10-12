import { describe, expect, it } from 'vitest'
import { BLUE, COLOURS, GREEN, HOLES, RED, WHITE, YELLOW, centreOf, holeAt, perchOf, type Colour } from './board'
import { BUTTONS, GECKO, HANDLE, SPIDER, knobAt, wellMouth } from './layout'
import { makeRng } from './rng'
import { deserialize, freshSave, serialize, type Save } from './save'
import { Toy } from './toy'

// Found as left. Put away at any instant, the game settles to exactly what a load of its save would give, with
// no sound left; opened again, nothing is pending, nothing is fresh and nothing starts by itself. A touch that
// is taken away makes no move for the child, and a slow tap is still one tap.

const DT = 1 / 60
const run = (toy: Toy, seconds: number) => { for (let t = 0; t < seconds - 1e-9; t += DT) toy.step(DT) }
const tap = (toy: Toy, at: { x: number; y: number }) => { toy.press(at.x, at.y); toy.release() }
const mixed = (): number[] => Array.from({ length: HOLES }, (_, hole) => (hole % 3 === 0 ? 0 : COLOURS[hole % 5]))
const loaded = (toy: Toy, seed = 1) => new Toy(deserialize(JSON.parse(JSON.stringify(serialize(toy.toSave()))), null), seed)

/** Everything of the game that is seen, heard or can be touched, apart from which idle act a watcher will choose next. */
const picture = (toy: Toy) => ({
  board: toy.board.slice(), shown: toy.shown.slice(), hand: toy.hand, mirror: toy.mirror, knob: toy.knob, leverHeld: toy.leverHeld, untouched: toy.untouched, neck: { ...toy.neck },
  moth: { x: toy.moth.x, y: toy.moth.y, mode: toy.moth.mode, act: toy.moth.act, perch: toy.moth.perch, resting: toy.moth.resting },
  spider: toy.spider.act, gecko: toy.gecko.act, places: toy.places(),
  live: toy.live.length, fallers: toy.fallers.length, blooms: toy.blooms.length, flashes: toy.flashes.length, sparks: toy.sparks.length, beams: toy.beams.length,
  leverDown: toy.leverDown, handlePull: toy.handlePull, playing: toy.playing, chase: toy.chase, finger: toy.finger, busy: toy.busy,
  // No timer is fresh: nothing glows, kicks, pulses, rattles or shakes.
  ages: [toy.kickAge, toy.pulseAge, toy.buttonAge, toy.leverAge, toy.handleAge, toy.joltAge, ...toy.wellAge.slice(1), ...toy.pileAge.slice(1)].every((age) => age >= 9),
  sounds: toy.sounds.slice(),
})

/** Each state the game can be put away in. Each leaves the toy in the middle of it. */
const STATES: Record<string, () => Toy> = {
  'a peg under the finger': () => {
    const toy = new Toy(freshSave(null), 1)
    toy.press(centreOf(30).x, centreOf(30).y)
    run(toy, 0.2)
    return toy
  },
  'in the middle of a four-way echo': () => {
    const toy = new Toy({ ...freshSave(null), mirror: 2, hand: WHITE }, 1)
    tap(toy, centreOf(holeAt(1, 1)))
    run(toy, 0.05)
    return toy
  },
  'pegs in the air, knocked and pulled, in the middle of a drag': () => {
    const toy = new Toy({ ...freshSave(null), board: mixed(), hand: RED, mirror: 1, moth: 40 }, 1)
    toy.press(centreOf(holeAt(0, 2)).x, centreOf(holeAt(0, 2)).y)
    toy.dragMove(centreOf(holeAt(5, 2)).x, centreOf(holeAt(5, 2)).y)
    run(toy, 0.1)
    return toy
  },
  'the lever down, beams and half beams running, the moth off after a flash': () => {
    const toy = new Toy({ ...freshSave(null), board: mixed(), moth: 40 }, 1)
    tap(toy, knobAt(0))
    run(toy, 2.3)
    return toy
  },
  'the lever\'s knob under the finger': () => {
    const toy = new Toy(freshSave(null), 1)
    toy.press(knobAt(0).x, knobAt(0).y)
    run(toy, 0.3)
    return toy
  },
  'the handle half pulled': () => {
    const toy = new Toy({ ...freshSave(null), board: mixed(), moth: 40 }, 1)
    toy.press(HANDLE.x, HANDLE.y)
    toy.dragMove(HANDLE.x, HANDLE.y + HANDLE.stop / 2)
    run(toy, 0.1)
    return toy
  },
  'the clatter just begun': () => {
    const toy = new Toy({ ...freshSave(null), board: mixed(), moth: 40 }, 1)
    toy.press(HANDLE.x, HANDLE.y)
    toy.dragMove(HANDLE.x, HANDLE.y + HANDLE.stop)
    return toy
  },
  'the clatter under way, the finger still on the handle': () => {
    const toy = new Toy({ ...freshSave(null), board: mixed(), moth: 40 }, 1)
    toy.press(HANDLE.x, HANDLE.y)
    toy.dragMove(HANDLE.x, HANDLE.y + HANDLE.stop)
    run(toy, 1.6)
    return toy
  },
  'the clatter in its last second': () => {
    const toy = new Toy({ ...freshSave(null), board: mixed(), moth: 40 }, 1)
    toy.press(HANDLE.x, HANDLE.y)
    toy.dragMove(HANDLE.x, HANDLE.y + HANDLE.stop)
    toy.release()
    run(toy, 4.4)
    return toy
  },
  'the trapped beam under way': () => {
    const board = new Array<number>(HOLES).fill(0)
    board[holeAt(6, 3)] = GREEN
    board[holeAt(4, 1)] = BLUE
    const toy = new Toy({ ...freshSave(null), board, hand: GREEN, moth: holeAt(4, 1) }, 1)
    tap(toy, knobAt(0))
    run(toy, 1)
    tap(toy, centreOf(holeAt(0, 3)))
    for (let i = 0; i < 60 * 30 && toy.playing !== 'trapped'; i++) toy.step(DT)
    expect(toy.playing).toBe('trapped')
    run(toy, 2)
    return toy
  },
  'the lever\'s knob dragged half way down and held there, over a board with red pegs': () => {
    const toy = new Toy({ ...freshSave(null), board: mixed() }, 1)
    toy.press(knobAt(0).x, knobAt(0).y)
    for (let y = knobAt(0).y; y <= knobAt(0.5).y; y += 4) { toy.dragMove(knobAt(0).x, y); toy.step(DT) }
    return toy
  },
  'every watcher poked, a key just pressed, a well\'s pile rattling, a spark in the air': () => {
    const toy = new Toy({ ...freshSave(null), moth: 26 }, 1)
    tap(toy, SPIDER)
    tap(toy, GECKO)
    tap(toy, perchOf(26))
    tap(toy, BUTTONS[2])
    tap(toy, wellMouth(GREEN))
    tap(toy, { x: 600, y: 596 })
    run(toy, 0.1)
    return toy
  },
  'a first showing: the first visit, untouched': () => new Toy(freshSave(null), 1),
}

describe('parked equals loaded', () => {
  for (const [name, make] of Object.entries(STATES)) {
    it(`put away with ${name}, it is what a load of its save gives`, () => {
      const toy = make()
      toy.putAway()
      // Every sound is to be shut, and none is left waiting to be played.
      expect(toy.hush).toBe(true)
      expect(toy.sounds).toEqual([])
      const again = loaded(toy)
      expect(picture(toy)).toEqual(picture(again))
      expect(toy.shown).toEqual(toy.board)
      // The still picture is told of every hole that was in motion: none is left drawn as it was.
      toy.changed.length = 0
      // Left alone afterwards, neither does anything to the board or makes a sound.
      const before = toy.toSave()
      toy.dirty = false
      run(toy, 12)
      run(again, 12)
      expect(toy.sounds).toEqual([])
      expect(again.sounds).toEqual([])
      expect(toy.toSave()).toEqual(before)
      expect(toy.dirty).toBe(false)
      expect(toy.changed).toEqual([])
      expect(toy.playing).toBeNull()
      expect(toy.leverDown).toBe(false)
    })
  }

  it('holds at any instant of a long session of touches on everything', () => {
    const chance = makeRng(7)
    const toy = new Toy({ ...freshSave(null), board: mixed(), moth: 40 }, 3)
    const anywhere = () => [centreOf(Math.floor(chance.next() * HOLES)), wellMouth(COLOURS[Math.floor(chance.next() * 5)] as Colour), BUTTONS[Math.floor(chance.next() * 3)], knobAt(0), HANDLE, SPIDER, GECKO][Math.floor(chance.next() * 7)]
    for (let i = 0; i < 400; i++) {
      const at = anywhere(), to = chance.next() < 0.4 ? anywhere() : null
      toy.press(at.x, at.y)
      if (to) toy.dragMove(at.x === HANDLE.x ? at.x : to.x, at.x === HANDLE.x ? at.y + 90 : to.y)
      run(toy, chance.next() * 0.5)
      const save = toy.toSave()
      const again = new Toy(deserialize(JSON.parse(JSON.stringify(serialize(save))), null), 1)
      // What a save taken now holds is a whole game: the board is the truth, and nothing of it is in the air.
      expect(again.shown).toEqual(toy.board)
      expect(again.moth.perch).toBe(toy.moth.perch)
      if (chance.next() < 0.3) {
        toy.putAway()
        expect(picture(toy)).toEqual(picture(loaded(toy)))
      } else if (chance.next() < 0.7) toy.release()
      run(toy, chance.next() * 0.6)
    }
  })
})

describe('on load', () => {
  it('nothing is pending, nothing is fresh, nothing starts and nothing sounds, whatever state the save was taken in', () => {
    for (const [name, make] of Object.entries(STATES)) {
      const again = loaded(make())
      expect(again.sounds, name).toEqual([])
      expect(picture(again), name).toMatchObject({ live: 0, fallers: 0, blooms: 0, flashes: 0, sparks: 0, beams: 0, leverDown: false, handlePull: 0, playing: null, chase: false, finger: false, busy: false, ages: true, spider: null, gecko: null })
      expect(again.knob, name).toBe(0)
      expect(again.leverHeld, name).toBe(false)
      expect(again.moth.mode, name).toBe('sit')
      expect(again.dirty, name).toBe(false)
      expect(again.saveNow, name).toBe(false)
      expect(again.hush, name).toBe(false)
      const before = again.toSave()
      run(again, 30)
      expect(again.sounds, name).toEqual([])
      expect(again.toSave(), name).toEqual(before)
      expect(again.playing, name).toBeNull()
      expect(again.leverDown, name).toBe(false)
    }
  })

  it('the clatter does not replay: a save taken the moment it starts loads as the dark board it ends in', () => {
    const again = loaded(STATES['the clatter just begun']())
    expect(again.board.every((cell) => cell === 0)).toBe(true)
    expect(again.moth.perch).toBeNull()
    expect(again.fallers).toEqual([])
  })
})

describe('a touch that is taken away', () => {
  const strokes: Record<string, (toy: Toy) => void> = {
    'on a hole': (toy) => toy.press(centreOf(31).x, centreOf(31).y),
    'in a drag across the board': (toy) => { toy.press(centreOf(31).x, centreOf(31).y); toy.dragMove(centreOf(34).x, centreOf(34).y) },
    'on a peg of the colour in hand': (toy) => toy.press(centreOf(holeAt(3, 4)).x, centreOf(holeAt(3, 4)).y),
    'on a well': (toy) => toy.press(wellMouth(YELLOW).x, wellMouth(YELLOW).y),
    'on a key': (toy) => toy.press(BUTTONS[1].x, BUTTONS[1].y),
    'on the lever': (toy) => toy.press(knobAt(0).x, knobAt(0).y),
    'on the lever, its knob dragged to the bottom': (toy) => { toy.press(knobAt(0).x, knobAt(0).y); for (let y = knobAt(0).y; y <= knobAt(1).y; y += 4) toy.dragMove(knobAt(0).x, y) },
    'on the handle, a hair short of its stop': (toy) => { toy.press(HANDLE.x, HANDLE.y); toy.dragMove(HANDLE.x, HANDLE.y + HANDLE.stop - 1) },
    'on the spider': (toy) => toy.press(SPIDER.x, SPIDER.y),
  }

  for (const [name, stroke] of Object.entries(strokes)) {
    it(`${name} makes no move for the child: it ends as a lift does, in silence`, () => {
      const cancelled = new Toy(freshSave(null), 1), lifted = new Toy(freshSave(null), 1)
      stroke(cancelled)
      stroke(lifted)
      cancelled.sounds.length = lifted.sounds.length = 0
      const before = cancelled.toSave()
      cancelled.cancel()
      lifted.release()
      expect(cancelled.sounds).toEqual([])
      expect(cancelled.toSave()).toEqual(before)
      if (name.startsWith('on the lever')) {
        // The lever is the one thing a lift moves. Taken away, the touch moves nothing: the lever is where it was and no beam comes.
        expect(lifted.leverDown).toBe(true)
        expect(cancelled.leverDown).toBe(false)
        expect(cancelled.beams).toEqual([])
        expect(cancelled.leverHeld).toBe(false)
        run(cancelled, 3)
        expect(cancelled.knob).toBeCloseTo(0, 3)
        expect(cancelled.sounds.some((cue) => cue.name === 'lever' || cue.name === 'beam')).toBe(false)
        return
      }
      expect(picture(cancelled)).toEqual(picture(lifted))
      expect(cancelled.playing).toBeNull()
      expect(cancelled.finger).toBe(false)
      // Nor does anything follow from it later.
      run(cancelled, 3)
      run(lifted, 3)
      expect(cancelled.toSave()).toEqual(lifted.toSave())
      expect(cancelled.playing).toBeNull()
    })
  }
})

describe('a slow tap', () => {
  it('of nearly half a second is one tap: one peg, one move of the lever, one rattle', () => {
    const toy = new Toy({ ...freshSave(null), board: new Array<number>(HOLES).fill(0), moth: null }, 1)
    toy.press(centreOf(20).x, centreOf(20).y)
    run(toy, 0.45)
    toy.release()
    run(toy, 1)
    expect(toy.board.filter((cell) => cell !== 0)).toEqual([RED])
    expect(toy.board[20]).toBe(RED)
    toy.press(knobAt(0).x, knobAt(0).y)
    run(toy, 0.45)
    toy.release()
    expect(toy.leverDown).toBe(true)
    toy.sounds.length = 0
    toy.press(HANDLE.x, HANDLE.y)
    run(toy, 0.45)
    toy.release()
    expect(toy.sounds.filter((cue) => cue.name === 'rattle')).toHaveLength(1)
    expect(toy.playing).toBeNull()
    expect(toy.board[20]).toBe(RED)
  })
})

describe('what counts as the child being busy', () => {
  it('is the lever\'s show and a scene, and never a character\'s own act: the idle ladder climbs through those', () => {
    const toy = new Toy(freshSave(null), 2)
    expect(toy.busy).toBe(false)
    // A minute alone: the watchers idle, the moth breathes, and none of it is the child's doing.
    let acted = false
    for (let i = 0; i < 60 * 60; i++) { toy.step(DT); acted ||= toy.spider.act !== null || toy.gecko.act !== null; expect(toy.busy).toBe(false) }
    expect(acted).toBe(true)
    tap(toy, SPIDER)
    tap(toy, GECKO)
    tap(toy, centreOf(50))
    expect(toy.spider.act).not.toBeNull()
    expect(toy.moth.mode).toBe('fly')
    expect(toy.busy).toBe(false)
    tap(toy, knobAt(0))
    expect(toy.busy).toBe(true)
    tap(toy, knobAt(1))
    expect(toy.busy).toBe(false)
    toy.press(HANDLE.x, HANDLE.y)
    toy.dragMove(HANDLE.x, HANDLE.y + HANDLE.stop)
    expect(toy.busy).toBe(true)
    run(toy, 8)
    expect(toy.busy).toBe(false)
    // A lever left down over an empty board plays nothing, so the ladder climbs.
    tap(toy, knobAt(0))
    expect(toy.leverDown).toBe(true)
    expect(toy.busy).toBe(false)
  })
})

describe('the child\'s age', () => {
  it('only chooses what a first visit lays on the board: every colour, key, lever and handle answers the same at every age, and a saved board wins', () => {
    const play = (save: Save) => {
      const toy = new Toy(save, 1)
      for (const colour of COLOURS) { tap(toy, wellMouth(colour)); tap(toy, centreOf(60 + colour)) }
      for (const button of BUTTONS) tap(toy, button)
      tap(toy, knobAt(0))
      const lever = toy.leverDown
      toy.press(HANDLE.x, HANDLE.y)
      toy.dragMove(HANDLE.x, HANDLE.y + HANDLE.stop)
      return { hand: toy.hand, mirror: toy.mirror, lever, playing: toy.playing, board: toy.toSave().board }
    }
    const youngest = play(freshSave(null))
    for (const age of [2, 4, 5, 6, 8, 12]) expect(play(freshSave(age)), `age ${age}`).toEqual(youngest)
    expect(youngest).toMatchObject({ hand: WHITE, mirror: 2, lever: true, playing: 'clatter' })
    // The toy itself is never told an age: it is made from a save alone.
    expect(Toy.length).toBe(2)
    const saved = serialize(new Toy({ ...freshSave(4), board: mixed() }, 1).toSave())
    for (const age of [null, 4, 8]) expect(deserialize(JSON.parse(JSON.stringify(saved)), age).board).toEqual(mixed())
  })
})
