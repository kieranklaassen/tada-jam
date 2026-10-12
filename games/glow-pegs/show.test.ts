import { describe, expect, it } from 'vitest'
import { BEAT, FREE_AFTER, TRAPPED_AFTER } from './beam'
import { BLUE, COLOURS, GREEN, HOLES, RED, WHITE, YELLOW, centreOf, colOf, holeAt, perchOf, type Colour } from './board'
import { HANDLE, LEVER, MOTH_HOME, RIDE_Y, knobAt, wellMouth } from './layout'
import { CONDUCT_BEATS, spiderPose, type SpiderPose } from './motion'
import { freshSave, type Save } from './save'
import { CLATTER, FLASH_FOR, HANDLE_RATTLE, LEVER_PULL, LEVER_TAP, TRAPPED_FOR, Toy, columnX, handleGlint, handleSwing } from './toy'

// The lever's show, the tray handle and the two scenes, played as the Mount plays them.

const DT = 1 / 60
const empty = (): number[] => new Array<number>(HOLES).fill(0)
const boardOf = (pegs: [number, number, Colour][]): number[] => {
  const board = empty()
  for (const [col, row, colour] of pegs) board[holeAt(col, row)] = colour
  return board
}
const toyOf = (over: Partial<Save> = {}, seed = 1) => new Toy({ ...freshSave(null), board: empty(), moth: null, ...over }, seed)
const run = (toy: Toy, seconds: number) => { for (let t = 0; t < seconds - 1e-9; t += DT) toy.step(DT) }
const tap = (toy: Toy, at: { x: number; y: number }) => { toy.press(at.x, at.y); toy.release() }
const lever = (toy: Toy) => tap(toy, knobAt(toy.leverDown ? 1 : 0))
const pullHandle = (toy: Toy) => { toy.press(HANDLE.x, HANDLE.y); toy.dragMove(HANDLE.x, HANDLE.y + HANDLE.stop); toy.release() }
const names = (toy: Toy) => toy.sounds.map((cue) => cue.name)
const full = (toy: Toy) => toy.beams.find((beam) => !beam.half)!
/** Plays whole beats, so the beam has stepped that many columns. */
const beats = (toy: Toy, n: number) => run(toy, n * BEAT + DT / 2)

describe('the tray handle\'s rattle and its reach', () => {
  it('is seen as well as heard: tapped, or rattling by itself, the handle and its ball swing about twenty units to each side for about a second, with a glint', () => {
    expect(HANDLE_RATTLE.far).toBeGreaterThanOrEqual(18)
    expect(HANDLE_RATTLE.far).toBeLessThanOrEqual(22)
    expect(HANDLE_RATTLE.lasts).toBeGreaterThanOrEqual(0.9)
    expect(HANDLE_RATTLE.lasts).toBeLessThanOrEqual(1.1)
    const toy = toyOf({ board: boardOf([[2, 2, RED]]) })
    toy.press(HANDLE.x, HANDLE.y)
    expect(toy.sounds).toEqual([{ name: 'rattle' }])
    // The sound and the sight begin together.
    expect(toy.handleAge).toBe(0)
    toy.release()
    // A tap's lift does not start the swing over.
    let left = 0, right = 0, glint = 0, swings = 0, last = 0, seconds = 0
    for (let i = 0; i < 120; i++) {
      toy.step(DT)
      const swing = handleSwing(toy.handleAge)
      if (swing !== 0) seconds = toy.handleAge
      left = Math.min(left, swing)
      right = Math.max(right, swing)
      glint = Math.max(glint, handleGlint(toy.handleAge))
      if (swing * last < 0) swings += 1
      if (swing !== 0) last = swing
    }
    expect(right).toBeGreaterThan(17)
    expect(left).toBeLessThan(-15)
    expect(right).toBeLessThanOrEqual(HANDLE_RATTLE.far)
    // Back and forth several times, for about a second, and then still.
    expect(swings).toBeGreaterThanOrEqual(6)
    expect(seconds).toBeGreaterThan(0.9)
    expect(handleSwing(toy.handleAge)).toBe(0)
    expect(handleGlint(toy.handleAge)).toBe(0)
    expect(glint).toBeGreaterThan(0.8)
    // Half a second in, it still swings plainly.
    expect(Math.max(...Array.from({ length: 12 }, (_, k) => Math.abs(handleSwing(0.45 + k * 0.01))))).toBeGreaterThan(8)
    // The swing stays inside the room between the tray and the loudspeaker.
    expect(HANDLE.x - 32 - HANDLE_RATTLE.far).toBeGreaterThan(wellMouth(5).x + 60)
    expect(HANDLE.x + 32 + HANDLE_RATTLE.far).toBeLessThan(1066 - 88)
  })

  it('can be pulled to its stop from the lowest point of its target without leaving the stage', () => {
    const toy = toyOf({ board: boardOf([[2, 2, RED]]) })
    toy.press(HANDLE.x, HANDLE.bottom)
    expect(toy.sounds).toEqual([{ name: 'rattle' }])
    toy.dragMove(HANDLE.x, HANDLE.bottom + HANDLE.stop - 1)
    expect(toy.playing).toBeNull()
    expect(HANDLE.bottom + HANDLE.stop).toBeLessThanOrEqual(820 - 16)
    toy.dragMove(HANDLE.x, HANDLE.bottom + HANDLE.stop)
    expect(toy.playing).toBe('clatter')
  })
})

describe('the lever', () => {
  it('is moved by a tap when the finger lifts, never on the press: it goes down with one clunk and sends a beam in at the left edge on that very beat, and a second tap lifts it and puts every beam out', () => {
    const toy = toyOf({ board: boardOf([[0, 2, RED], [3, 4, YELLOW]]) })
    toy.press(knobAt(0).x, knobAt(0).y)
    // The press takes hold of the knob and no more.
    expect(toy.leverDown).toBe(false)
    expect(toy.leverHeld).toBe(true)
    expect(toy.sounds).toEqual([{ name: 'grip' }])
    expect(toy.beams).toEqual([])
    toy.sounds.length = 0
    toy.release()
    expect(toy.leverDown).toBe(true)
    expect(toy.leverHeld).toBe(false)
    expect(toy.leverAge).toBe(0)
    expect(toy.beams).toEqual([{ col: 0, dir: 1, half: false, hold: 0, turns: 0, from: -1, row: -1, open: false, shut: -1 }])
    // The first column is met inside the lift: its peg flashes and sounds before any time passes.
    expect(toy.sounds).toEqual([{ name: 'lever', n: 1 }, { name: 'beam', colour: RED, steps: [4], n: 0 }])
    expect(toy.flashes).toEqual([{ hole: holeAt(0, 2), colour: RED, age: 0, half: false }])
    expect(toy.time).toBe(0)
    beats(toy, 4)
    expect(toy.beams.length).toBe(2)
    toy.sounds.length = 0
    lever(toy)
    expect(toy.leverDown).toBe(false)
    expect(toy.beams).toEqual([])
    expect(toy.flashes).toEqual([])
    expect(toy.sounds).toEqual([{ name: 'grip' }, { name: 'lever', n: 0 }])
    run(toy, 3)
    expect(names(toy).filter((name) => name === 'beam')).toEqual([])
  })

  /** A finger that lands at a point, goes along a path in small steps and lifts. Hands back the lever's clunks and how often the first column sounded. */
  const stroke = (toy: Toy, path: { x: number; y: number }[]) => {
    toy.sounds.length = 0
    toy.press(path[0].x, path[0].y)
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1], b = path[i], steps = Math.max(1, Math.ceil(Math.hypot(b.x - a.x, b.y - a.y) / 3))
      for (let k = 1; k <= steps; k++) {
        toy.dragMove(a.x + ((b.x - a.x) * k) / steps, a.y + ((b.y - a.y) * k) / steps)
        toy.step(DT / 4)
      }
    }
    toy.release()
    return { clunks: toy.sounds.filter((cue) => cue.name === 'lever').map((cue) => cue.n), first: toy.sounds.filter((cue) => cue.name === 'beam').length }
  }

  it('one gesture is one move and one clunk, along the path a finger takes: the ghost hand\'s own pull, a wobbly tap, a pull that turns back', () => {
    const board = boardOf([[0, 3, RED]])
    // The ghost hand's pull: from the knob at the top of its slot to the bottom.
    const pulled = toyOf({ board })
    expect(stroke(pulled, [knobAt(0), knobAt(1)])).toEqual({ clunks: [1], first: 1 })
    expect(pulled.leverDown).toBe(true)
    // The knob went where the finger took it on the way.
    const half = toyOf({ board })
    half.press(knobAt(0).x, knobAt(0).y)
    for (let y = knobAt(0).y; y <= knobAt(0.6).y; y += 2) { half.dragMove(LEVER.x, y); half.step(DT) }
    for (let i = 0; i < 30; i++) half.step(DT)
    expect(half.knob).toBeCloseTo(0.6, 1)
    expect(half.leverDown).toBe(false)
    half.release()
    expect(half.leverDown).toBe(true)
    // And back up the same way: one clunk, the lighter one.
    expect(stroke(pulled, [knobAt(1), knobAt(0)])).toEqual({ clunks: [0], first: 0 })
    expect(pulled.leverDown).toBe(false)
    // A short wobbly tap: the finger slides a little every way before it lifts. It is a tap, and the lever moves.
    const wobbly = toyOf({ board })
    const at = knobAt(0)
    expect(stroke(wobbly, [at, { x: at.x + 9, y: at.y + 16 }, { x: at.x - 6, y: at.y + 22 }, { x: at.x + 4, y: at.y + 7 }])).toEqual({ clunks: [1], first: 1 })
    expect(wobbly.leverDown).toBe(true)
    // A wobbly tap on a lever that is down lifts it, wherever on its plate the finger lands.
    expect(stroke(wobbly, [{ x: LEVER.x + 20, y: LEVER.boxTop + 30 }, { x: LEVER.x + 8, y: LEVER.boxTop + 44 }])).toEqual({ clunks: [0], first: 0 })
    // A pull that goes down and comes back up before the lift leaves the lever where it was: no move, no clunk, no beam.
    const back = toyOf({ board })
    expect(stroke(back, [knobAt(0), knobAt(0.9), knobAt(0.1)])).toEqual({ clunks: [], first: 0 })
    expect(back.leverDown).toBe(false)
    // Down, up and down again in one stroke is still one move.
    expect(stroke(back, [knobAt(0), knobAt(1), knobAt(0), knobAt(1)])).toEqual({ clunks: [1], first: 1 })
    // A pull let go under a quarter of the way springs back to the top: its creak, no clunk, no beam.
    const short = toyOf({ board })
    expect(stroke(short, [knobAt(0), knobAt(0.2)])).toEqual({ clunks: [], first: 0 })
    expect(short.sounds.map((cue) => cue.name)).toEqual(['grip', 'grip'])
    expect(short.leverDown).toBe(false)
    for (let i = 0; i < 40; i++) short.step(DT)
    expect(short.knob).toBeCloseTo(0, 2)
    // A pull let go a quarter of the way down or more goes down: the knob falls the rest of the way, with the one clunk.
    const far = toyOf({ board })
    expect(stroke(far, [knobAt(0), knobAt(0.3)])).toEqual({ clunks: [1], first: 1 })
    expect(far.leverDown).toBe(true)
    expect(far.knob).toBeLessThan(0.5)
    for (let i = 0; i < 40; i++) far.step(DT)
    expect(far.knob).toBeCloseTo(1, 2)
  })

  it('reads only the travel along its slot: a sideways slide counts for nothing, a quarter of the way goes to the other end, and less springs back', () => {
    const board = boardOf([[0, 3, RED]])
    const slot = LEVER.bottom - LEVER.top
    // A tap that slides sideways right across the plate, and hardly along the slot, is a tap: the lever moves.
    const sideways = toyOf({ board })
    expect(stroke(sideways, [{ x: LEVER.left + 4, y: knobAt(0).y }, { x: LEVER.right - 4, y: knobAt(0).y + 8 }])).toEqual({ clunks: [1], first: 1 })
    expect(sideways.leverDown).toBe(true)
    // And back up the same way, the slide carrying the finger off the plate.
    expect(stroke(sideways, [{ x: LEVER.right - 4, y: knobAt(1).y }, { x: LEVER.left - 60, y: knobAt(1).y - 12 }])).toEqual({ clunks: [0], first: 0 })
    // By travel along the slot, on a lever that is up and on one that is down, from any part of the plate.
    const pull = (down: boolean, units: number, x = LEVER.x) => {
      const toy = toyOf({ board })
      if (down) { lever(toy); run(toy, 0.5) }
      const from = down ? LEVER.boxBottom - 30 : LEVER.boxTop + 30
      toy.sounds.length = 0
      toy.press(x, from)
      for (let k = 1; k <= units; k++) toy.dragMove(x + k * 0.7, from + (down ? -k : k))
      toy.release()
      return { moved: toy.leverDown !== down, sounds: toy.sounds.map((cue) => cue.name).filter((name) => name !== 'beam') }
    }
    const quarter = Math.ceil(slot * LEVER_PULL)
    expect(quarter).toBeGreaterThan(LEVER_TAP)
    for (const down of [false, true]) {
      // Inside a tap's slack: a tap.
      expect(pull(down, 0)).toEqual({ moved: true, sounds: ['grip', 'lever'] })
      expect(pull(down, LEVER_TAP - 1)).toEqual({ moved: true, sounds: ['grip', 'lever'] })
      // Over the slack and under a quarter: it springs back with its creak.
      expect(pull(down, LEVER_TAP)).toEqual({ moved: false, sounds: ['grip', 'grip'] })
      expect(pull(down, quarter - 1)).toEqual({ moved: false, sounds: ['grip', 'grip'] })
      // A quarter of the way or more: the other end, with the one clunk.
      expect(pull(down, quarter)).toEqual({ moved: true, sounds: ['grip', 'lever'] })
      expect(pull(down, slot)).toEqual({ moved: true, sounds: ['grip', 'lever'] })
    }
    // The wrong way, against the stop: the knob cannot go, so nothing springs back and nothing is heard on the lift.
    const wrong = toyOf({ board })
    wrong.press(LEVER.x, LEVER.boxBottom - 40)
    for (let k = 1; k <= 60; k++) wrong.dragMove(LEVER.x, LEVER.boxBottom - 40 - k)
    wrong.sounds.length = 0
    wrong.release()
    expect(wrong.leverDown).toBe(false)
    expect(wrong.sounds).toEqual([])
    // Pulled down and carried back to the top by the finger: the same.
    const carried = toyOf({ board })
    stroke(carried, [knobAt(0), knobAt(0.8), knobAt(0)])
    expect(carried.leverDown).toBe(false)
    expect(carried.sounds.map((cue) => cue.name)).toEqual(['grip'])
  })

  it('the knob never leaps: it moves with the finger from where it was taken, from the first unit, whatever part of the plate was pressed', () => {
    const slot = LEVER.bottom - LEVER.top
    // Pressed low on the plate, far under the knob: the knob stays where it is until the finger moves, and then moves by as much.
    for (const from of [{ x: LEVER.x, y: LEVER.boxBottom - 6 }, { x: LEVER.left + 4, y: LEVER.top + 120 }, { x: LEVER.right - 4, y: LEVER.boxTop + 4 }, knobAt(0)]) {
      const toy = toyOf({ board: boardOf([[0, 3, RED]]) })
      toy.press(from.x, from.y)
      toy.step(DT)
      expect(toy.knob, `pressed at ${from.y}`).toBe(0)
      let last = toy.knob
      // Upward first: the knob is at the top of its slot and stays there.
      for (let k = 1; k <= 10; k++) { toy.dragMove(from.x, from.y - k); toy.step(DT); expect(toy.knob).toBe(0) }
      toy.dragMove(from.x, from.y)
      // Then down a unit at a time: from the very first unit the knob has moved, and never by more than the finger has.
      for (let k = 1; k <= 60; k++) {
        toy.dragMove(from.x, from.y + k)
        toy.step(DT)
        expect(toy.knob, `pressed at ${from.y}, ${k} units down`).toBeCloseTo(Math.min(1, k / slot), 6)
        expect(toy.knob - last).toBeLessThanOrEqual(1 / slot + 1e-9)
        last = toy.knob
      }
      expect(toy.knob).toBeGreaterThan(0)
      expect(toy.leverDown).toBe(false)
    }
    // Taken while it is down, from anywhere on the plate, it comes up with the finger in the same way.
    const down = toyOf({ board: boardOf([[0, 3, RED]]) })
    lever(down)
    run(down, 0.5)
    expect(down.knob).toBeCloseTo(1, 3)
    const was = down.knob
    down.press(LEVER.x, LEVER.boxTop + 10)
    down.step(DT)
    expect(down.knob).toBe(was)
    down.dragMove(LEVER.x, LEVER.boxTop + 9)
    expect(down.knob).toBeCloseTo(was - 1 / slot, 6)
    // On the lift: a touch that went under 30 units along the slot is a tap and toggles; a longer one against the stop leaves the lever up.
    const strayed = (units: number) => {
      const toy = toyOf({ board: boardOf([[0, 3, RED]]) })
      toy.press(LEVER.x, LEVER.boxBottom - 40)
      for (let k = 1; k <= units; k++) toy.dragMove(LEVER.x, LEVER.boxBottom - 40 - k)
      toy.release()
      return toy.leverDown
    }
    expect(strayed(0)).toBe(true)
    expect(strayed(29)).toBe(true)
    // Thirty units upward on a lever that is up: the knob is against its stop at the top, and the lever stays up.
    expect(strayed(30)).toBe(false)
    const long = toyOf({ board: boardOf([[0, 3, RED]]) })
    long.press(LEVER.x, LEVER.boxTop + 20)
    for (let k = 1; k <= 100; k++) long.dragMove(LEVER.x, LEVER.boxTop + 20 + k)
    expect(long.knob).toBeCloseTo(100 / slot, 6)
    long.release()
    expect(long.leverDown).toBe(true)
  })

  it('a touch that is taken away leaves the lever where it was, however far the knob had gone', () => {
    const toy = toyOf({ board: boardOf([[0, 3, RED]]) })
    toy.press(knobAt(0).x, knobAt(0).y)
    for (let y = knobAt(0).y; y <= knobAt(1).y; y += 3) toy.dragMove(LEVER.x, y)
    toy.sounds.length = 0
    toy.cancel()
    expect(toy.leverDown).toBe(false)
    expect(toy.sounds).toEqual([])
    for (let i = 0; i < 40; i++) toy.step(DT)
    expect(toy.knob).toBeCloseTo(0, 2)
    // A press that is taken away before it moves is no tap either.
    toy.press(knobAt(0).x, knobAt(0).y)
    toy.sounds.length = 0
    toy.cancel()
    expect(toy.leverDown).toBe(false)
    expect(toy.sounds).toEqual([])
  })

  it('steps the beam one column a beat, and brings it in again at the left edge a beat after it leaves', () => {
    const toy = toyOf()
    lever(toy)
    for (let col = 1; col <= 10; col++) { beats(toy, 1); expect(full(toy).col).toBe(col) }
    // One beat off the board, standing on no column.
    beats(toy, 1)
    expect(full(toy).col).toBe(-1)
    beats(toy, 1)
    expect(full(toy)).toMatchObject({ col: 0, dir: 1 })
    // The beam stands in the middle of its column.
    expect(columnX(3)).toBe(centreOf(holeAt(3, 0)).x)
  })

  it('changes nothing a save holds, however long the show runs, and leaves every hole, well and key answering', () => {
    const toy = toyOf({ board: boardOf([[2, 1, RED], [4, 5, BLUE], [6, 3, YELLOW], [8, 2, WHITE]]) })
    const before = toy.toSave()
    lever(toy)
    toy.dirty = false
    run(toy, 20)
    expect(toy.toSave()).toEqual(before)
    expect(toy.dirty).toBe(false)
    tap(toy, wellMouth(GREEN))
    tap(toy, centreOf(holeAt(9, 3)))
    expect(toy.board[holeAt(9, 3)]).toBe(GREEN)
    // The beam obeys the board as it stands on each beat: the new green peg turns it.
    let turned = false
    for (let i = 0; i < 60 * 8 && !turned; i++) { toy.step(DT); turned = full(toy).dir === -1 }
    expect(turned).toBe(true)
  })
})

describe('what the beam does at each colour of peg', () => {
  /** A toy whose beam is about to meet one peg of a colour in column 3, row 2. */
  const before = (colour: Colour) => {
    const toy = toyOf({ board: boardOf([[3, 2, colour]]) })
    lever(toy)
    beats(toy, 2)
    toy.sounds.length = 0
    return toy
  }
  const hole = holeAt(3, 2)

  it('red: flashes and kicks the bezel, and is a drum', () => {
    const toy = before(RED)
    toy.kickAge = 9
    beats(toy, 1)
    expect(toy.sounds).toContainEqual({ name: 'beam', colour: RED, steps: [4], n: 0 })
    expect(toy.flashes).toMatchObject([{ hole, colour: RED }])
    expect(toy.kickAge).toBeLessThan(BEAT)
    expect(full(toy)).toMatchObject({ col: 3, dir: 1, hold: 0 })
    // A drum is gone at once.
    expect(FLASH_FOR[RED]).toBeLessThan(BEAT)
  })

  it('blue: flashes and stays lit for four beats', () => {
    const toy = before(BLUE)
    beats(toy, 1)
    expect(toy.sounds).toContainEqual({ name: 'beam', colour: BLUE, steps: [4], n: 0 })
    beats(toy, 3)
    expect(toy.flashes.map((flash) => flash.hole)).toEqual([hole])
    beats(toy, 1.2)
    expect(toy.flashes).toEqual([])
    expect(FLASH_FOR[BLUE]).toBe(BEAT * 4)
  })

  it('yellow: flashes and splits the beam, a half beam leaving the other way while the beam carries on', () => {
    const toy = before(YELLOW)
    beats(toy, 1)
    expect(toy.sounds).toContainEqual({ name: 'beam', colour: YELLOW, steps: [4], n: 0 })
    expect(toy.beams).toMatchObject([{ col: 3, dir: 1, half: false }, { col: 3, dir: -1, half: true, from: 3 }])
    beats(toy, 1)
    expect(toy.beams.map((beam) => beam.col)).toEqual([4, 2])
  })

  it('green: flashes and bounces the beam back the way it came', () => {
    const toy = before(GREEN)
    beats(toy, 1)
    expect(toy.sounds).toContainEqual({ name: 'beam', colour: GREEN, steps: [4], n: 0 })
    expect(full(toy)).toMatchObject({ col: 3, dir: -1, turns: 1 })
    beats(toy, 1)
    expect(full(toy).col).toBe(2)
  })

  it('green turns the beam every other time: the next time across the beam passes it and plays the columns beyond', () => {
    const toy = toyOf({ board: boardOf([[3, 2, GREEN], [8, 5, RED]]) })
    lever(toy)
    toy.sounds.length = 0
    // Turned at column 3 and out at the left: the red peg in column 8 has not sounded.
    beats(toy, 8)
    expect(toy.sounds.some((cue) => cue.name === 'beam' && cue.colour === RED)).toBe(false)
    // In again, through the green peg, which sounds as it is passed, and on to the red one.
    beats(toy, 8)
    expect(full(toy)).toMatchObject({ col: 8, dir: 1 })
    expect(toy.sounds.filter((cue) => cue.name === 'beam' && cue.colour === GREEN)).toHaveLength(2)
    expect(toy.sounds.filter((cue) => cue.name === 'beam' && cue.colour === RED)).toHaveLength(1)
  })

  it('white: flashes and holds the beam on its column for one more beat, with a beat of quiet', () => {
    const toy = before(WHITE)
    beats(toy, 1)
    expect(toy.sounds).toContainEqual({ name: 'beam', colour: WHITE, steps: [4], n: 0 })
    toy.sounds.length = 0
    beats(toy, 1)
    expect(full(toy).col).toBe(3)
    expect(names(toy)).not.toContain('beam')
    beats(toy, 1)
    expect(full(toy).col).toBe(4)
    // It is bright for as long as it holds the beam.
    expect(FLASH_FOR[WHITE]).toBe(BEAT * 2)
  })

  it('sounds every peg of a column as one sound a colour, however many there are', () => {
    const toy = toyOf({ board: Array.from({ length: HOLES }, (_, at) => (colOf(at) === 2 ? [RED, RED, BLUE, BLUE, BLUE, RED, RED][Math.floor(at / 11)] : 0)) })
    lever(toy)
    beats(toy, 1)
    toy.sounds.length = 0
    beats(toy, 1)
    const heard = toy.sounds.filter((cue) => cue.name === 'beam')
    expect(heard).toHaveLength(2)
    expect(heard.find((cue) => cue.colour === RED)!.steps).toHaveLength(4)
    expect(heard.find((cue) => cue.colour === BLUE)!.steps).toHaveLength(3)
  })

  it('one sound a colour a beat, for the beam and a half beam together: one cue at the full strength, and the half strength only where no full beam met that colour', () => {
    // The beam splits at column 3. A beat later it meets the red peg in column 4 while its half beam meets the red peg in column 2.
    const toy = toyOf({ board: boardOf([[3, 0, YELLOW], [4, 2, RED], [2, 5, RED], [0, 6, RED]]) })
    lever(toy)
    beats(toy, 3)
    toy.sounds.length = 0
    beats(toy, 1)
    expect(toy.beams.map((beam) => [beam.col, beam.half])).toEqual([[4, false], [2, true]])
    const together = toy.sounds.filter((cue) => cue.name === 'beam')
    expect(together).toEqual([{ name: 'beam', colour: RED, steps: [4, 1], n: 0 }])
    // Two beats on, the half beam alone meets the red peg in column 0: one cue, at the half strength.
    toy.sounds.length = 0
    beats(toy, 2)
    expect(toy.sounds.filter((cue) => cue.name === 'beam')).toEqual([{ name: 'beam', colour: RED, steps: [0], n: 1 }])
  })

  it('the moth leaves its perch and chases the beam\'s newest flash, with a flutter at each catch, and is back beside its hole when the lever lifts', () => {
    const toy = toyOf({ board: boardOf([[1, 5, RED], [8, 1, RED]]), moth: holeAt(1, 5) })
    lever(toy)
    run(toy, 4)
    expect(toy.moth.perch).toBe(holeAt(1, 5))
    expect(names(toy)).toContain('flutter')
    // It has been at the far peg's corner, off its own perch.
    let away = false
    for (let i = 0; i < 60 * 8; i++) { toy.step(DT); away ||= toy.moth.mode === 'away' && toy.moth.x === perchOf(holeAt(8, 1)).x }
    expect(away).toBe(true)
    expect(toy.toSave().moth).toBe(holeAt(1, 5))
    lever(toy)
    run(toy, 2)
    expect({ x: toy.moth.x, y: toy.moth.y, mode: toy.moth.mode }).toEqual({ ...perchOf(holeAt(1, 5)), mode: 'sit' })
  })
})

describe('the tray handle', () => {
  it('only rattles when it is tapped: nothing drops', () => {
    const toy = new Toy(freshSave(null), 1)
    const before = toy.toSave()
    toy.press(HANDLE.x, HANDLE.y)
    expect(toy.sounds).toEqual([{ name: 'rattle' }])
    expect(toy.handleAge).toBe(0)
    run(toy, 0.45)
    toy.release()
    run(toy, 3)
    expect(toy.toSave()).toEqual(before)
    expect(toy.playing).toBeNull()
    expect(toy.dirty).toBe(false)
  })

  it('follows the finger down, and springs back when it is let go short of its stop', () => {
    const toy = new Toy(freshSave(null), 1)
    toy.press(HANDLE.x, HANDLE.y)
    toy.dragMove(HANDLE.x, HANDLE.y + 40)
    expect(toy.handlePull).toBe(40)
    toy.dragMove(HANDLE.x + 30, HANDLE.y + HANDLE.stop - 1)
    expect(toy.handlePull).toBe(HANDLE.stop - 1)
    expect(toy.playing).toBeNull()
    toy.release()
    expect(toy.handlePull).toBe(0)
    expect(toy.board.some((cell) => cell !== 0)).toBe(true)
  })
})

describe('the clatter', () => {
  const mixed = () => Array.from({ length: HOLES }, (_, hole) => (hole % 3 === 0 ? 0 : COLOURS[hole % 5]))

  it('saves the whole of its outcome when it starts: an empty board and the moth at its bulb, and no other field', () => {
    const toy = toyOf({ board: mixed(), hand: BLUE, mirror: 2, moth: 40 })
    toy.dirty = false
    pullHandle(toy)
    expect(toy.playing).toBe('clatter')
    expect(toy.dirty).toBe(true)
    expect(toy.saveNow).toBe(true)
    expect(toy.toSave()).toEqual({ ...freshSave(null), board: empty(), hand: BLUE, mirror: 2, moth: null })
    // The screen gets there afterwards: every peg still stands.
    expect(toy.shown).toEqual(mixed())
    expect(names(toy)).toEqual(['rattle', 'clunk'])
  })

  it('lets the pegs go column by column from the left, red first of its column and white a beat after, each landing in its own well', () => {
    const toy = toyOf({ board: mixed(), moth: 40 })
    pullHandle(toy)
    const emptied: number[] = new Array<number>(11).fill(-1)
    const landed: Record<number, number> = {}
    for (let frame = 1; frame <= 60 * 7; frame++) {
      const before = toy.fallers.slice()
      toy.step(DT)
      for (let col = 0; col < 11; col++) if (emptied[col] < 0 && toy.shown.every((cell, hole) => colOf(hole) !== col || cell === 0)) emptied[col] = frame * DT
      for (const faller of before) if (!toy.fallers.includes(faller)) {
        landed[faller.colour] = (landed[faller.colour] ?? 0) + 1
        expect(toy.wellAge[faller.colour]).toBe(0)
      }
    }
    for (let col = 0; col < 11; col++) expect(emptied[col]).toBeCloseTo(CLATTER.first + col * CLATTER.gap, 1)
    // Every peg that stood on the board is in its own well.
    for (const colour of COLOURS) expect(landed[colour]).toBe(mixed().filter((cell) => cell === colour).length)
    expect(toy.shown).toEqual(empty())
    expect(toy.playing).toBeNull()
    expect(toy.fallers).toEqual([])
  })

  it('the spider rides its thread down to watch and is shaken by the landings, the gecko catches one peg and flicks it, the moth spins down and climbs back to its bulb', () => {
    const toy = toyOf({ board: mixed(), moth: 40 })
    pullHandle(toy)
    let rode = false, caught = false, flicked = false, leaf = false, jolted = false
    for (let i = 0; i < 60 * 7; i++) {
      toy.step(DT)
      rode ||= toy.spider.act === 'ride' && toy.spiderPose().drop > 100
      caught ||= toy.fallers.some((faller) => faller.kind === 'caught')
      flicked ||= toy.gecko.act === 'flick'
      leaf ||= toy.moth.act === 'leaf'
      jolted ||= toy.joltAge === 0
    }
    expect({ rode, caught, flicked, leaf, jolted }).toEqual({ rode: true, caught: true, flicked: true, leaf: true, jolted: true })
    expect(names(toy)).toEqual(expect.arrayContaining(['clunk', 'drop', 'hop', 'catch', 'flick', 'leaf', 'tink']))
    expect({ x: toy.moth.x, y: toy.moth.y, mode: toy.moth.mode, perch: toy.moth.perch }).toEqual({ ...MOTH_HOME, mode: 'sit', perch: null })
    // Everything heard after the handle's rattle belongs to the scene, so a touch can shut all of it at once.
    expect(toy.sounds.slice(1).every((cue) => cue.scene === true)).toBe(true)
    // It took about five seconds.
    expect(CLATTER.first + 10 * CLATTER.gap + CLATTER.tail).toBeCloseTo(5.1, 5)
  })

  it('gives way to any touch: the pegs still on the board and in the air are in their wells at once, without their sounds, and the touch is an ordinary touch', () => {
    const toy = toyOf({ board: mixed(), moth: 40 })
    pullHandle(toy)
    run(toy, 1.2)
    expect(toy.fallers.length).toBeGreaterThan(3)
    expect(toy.shown.some((cell) => cell !== 0)).toBe(true)
    toy.sounds.length = 0
    toy.hush = false
    const hole = holeAt(5, 3)
    toy.press(centreOf(hole).x, centreOf(hole).y)
    // Silent from this frame: the Mount is told to shut whatever of the scene is still sounding, and only the touch's own sounds are asked for.
    expect(toy.hush).toBe(true)
    expect(toy.playing).toBeNull()
    expect(toy.fallers).toEqual([])
    expect(toy.sounds.some((cue) => cue.scene)).toBe(false)
    expect(names(toy)).toContain('click')
    expect(toy.shown.map((cell, at) => (at === hole ? 0 : cell))).toEqual(empty())
    expect(toy.board[hole]).toBe(RED)
    expect(toy.spider.act).not.toBe('ride')
    toy.release()
    toy.sounds.length = 0
    run(toy, 6)
    // Nothing of the scene is heard afterwards, and the new peg stays.
    expect(toy.sounds.some((cue) => cue.scene)).toBe(false)
    expect(toy.board[hole]).toBe(RED)
    expect(toy.toSave().moth).toBe(hole)
  })

  it('lifts the lever by itself at its first beat, with the lever\'s own clunk beside the handle\'s, so no bar sweeps the emptying board; ended by a touch it stays up', () => {
    const toy = toyOf({ board: boardOf([[1, 2, RED], [5, 4, BLUE], [9, 1, WHITE]]) })
    lever(toy)
    beats(toy, 2)
    toy.sounds.length = 0
    pullHandle(toy)
    // Inside the pull that reaches the stop: the lever is up, every beam is out, and both clunks are heard.
    expect(toy.playing).toBe('clatter')
    expect(toy.leverDown).toBe(false)
    expect(toy.beams).toEqual([])
    expect(toy.sounds).toContainEqual({ name: 'clunk', scene: true })
    expect(toy.sounds).toContainEqual({ name: 'lever', n: 0, scene: true })
    // No bar sweeps the board while it empties, or after.
    toy.sounds.length = 0
    for (let t = 0; t < 9; t += DT) {
      toy.step(DT)
      expect(toy.beams).toEqual([])
    }
    expect(names(toy)).not.toContain('beam')
    expect(names(toy)).not.toContain('lever')
    expect(toy.playing).toBeNull()
    expect(toy.knob).toBeCloseTo(0, 2)
    // With the lever up already there is only the handle's clunk.
    const up = toyOf({ board: boardOf([[1, 2, RED]]) })
    pullHandle(up)
    expect(names(up)).not.toContain('lever')
    // Ended by a touch while the pegs are still falling: the lever is up and stays up.
    const hurried = toyOf({ board: boardOf([[1, 2, RED], [5, 4, BLUE]]) })
    lever(hurried)
    pullHandle(hurried)
    run(hurried, 0.5)
    hurried.sounds.length = 0
    hurried.press(600, 596)
    expect(hurried.leverDown).toBe(false)
    expect(names(hurried)).not.toContain('lever')
  })

  it('on an empty board is only the handle\'s clunk, and the moth stays at its bulb', () => {
    const toy = toyOf()
    pullHandle(toy)
    run(toy, 4)
    expect(names(toy)).toEqual(['rattle', 'clunk'])
    expect(toy.playing).toBeNull()
    expect(toy.moth.perch).toBeNull()
  })

  it('drops what was built: an echo still on its way stands before the first column goes', () => {
    const toy = toyOf({ mirror: 2 })
    tap(toy, centreOf(holeAt(1, 1)))
    expect(toy.shown.filter((cell) => cell !== 0)).toHaveLength(1)
    pullHandle(toy)
    expect(toy.shown.filter((cell) => cell !== 0)).toHaveLength(4)
    run(toy, 6)
    expect(toy.shown).toEqual(empty())
    expect(toy.board).toEqual(empty())
  })
})

describe('the trapped beam', () => {
  /** A beam with a green peg ahead of it, and a second green pushed in behind it. */
  const trap = (seed = 1) => {
    const toy = toyOf({ board: boardOf([[6, 3, GREEN], [4, 1, RED]]), hand: GREEN, moth: holeAt(4, 1) }, seed)
    lever(toy)
    beats(toy, 3)
    tap(toy, centreOf(holeAt(0, 3)))
    return toy
  }
  const untilTrapped = (toy: Toy) => { for (let i = 0; i < 60 * 30 && toy.playing !== 'trapped'; i++) toy.step(DT) }

  it('starts when a full beam has been turned back eight times in a row without leaving, and saves nothing', () => {
    const toy = trap()
    run(toy, 2)
    toy.dirty = false
    const before = toy.toSave()
    let turns = 0
    for (let i = 0; i < 60 * 30 && toy.playing !== 'trapped'; i++) { toy.step(DT); turns = Math.max(turns, full(toy).turns) }
    expect(toy.playing).toBe('trapped')
    expect(turns).toBe(TRAPPED_AFTER)
    expect(toy.toSave()).toEqual(before)
    expect(toy.dirty).toBe(false)
    expect(toy.saveNow).toBe(false)
    expect(toy.sounds).toContainEqual({ name: 'trap', scene: true })
  })

  it('the bulbs chase the beam, the spider conducts with a foot down on each beat, the gecko\'s eyes roll, the moth rides the beam from end to end, and the show goes on underneath', () => {
    const toy = trap()
    untilTrapped(toy)
    expect(toy.chase).toBe(true)
    expect(toy.spider.act).toBe('conduct')
    expect(toy.gecko.act).toBe('roll')
    toy.sounds.length = 0
    const rode = new Set<number>()
    let rolled = false
    for (let i = 0; i < 60 * (TRAPPED_FOR - 0.5); i++) {
      toy.step(DT)
      if (toy.moth.mode === 'ride' && Math.abs(toy.moth.x - columnX(full(toy).col)) < 6) {
        rode.add(full(toy).col)
        // It rides along the board's lower edge, far below the home control.
        expect(Math.abs(toy.moth.y - RIDE_Y)).toBeLessThan(8)
      }
      rolled ||= toy.geckoPose().rolling > 0.9
    }
    expect(toy.playing).toBe('trapped')
    expect(rode.size).toBeGreaterThanOrEqual(6)
    expect(rolled).toBe(true)
    expect(names(toy).filter((name) => name === 'baton').length).toBeGreaterThan(10)
    expect(toy.sounds.filter((cue) => cue.name === 'baton').every((cue) => cue.scene === true)).toBe(true)
    // The show underneath: the beam still plays its pegs.
    expect(names(toy)).toContain('beam')
    run(toy, 1.5)
    expect(toy.playing).toBeNull()
    expect(toy.chase).toBe(false)
    expect(toy.leverDown).toBe(true)
  })

  it('the spider\'s feet tap on the beam\'s steps: every tap is given in the very step the beam takes, every step has its tap, and the foot is down on it', () => {
    const toy = trap()
    untilTrapped(toy)
    toy.sounds.length = 0
    const pose: SpiderPose = { drop: 0, swing: 0, squash: 0, eyeSpread: 0, lids: 0, cover: 0, feet: [0, 0, 0, 0], shake: 0, strand: 0 }
    let taps = 0, steps = 0
    for (let i = 0; i < 60 * (TRAPPED_FOR - 0.3); i++) {
      const before = full(toy).col
      toy.sounds.length = 0
      toy.step(DT)
      const stepped = full(toy).col !== before
      const batons = toy.sounds.filter((cue) => cue.name === 'baton')
      expect(batons.length, `frame ${i}`).toBe(stepped ? 1 : 0)
      if (!stepped) continue
      steps += 1
      taps += 1
      // The foot that taps is down in this frame, and was up half a beat before.
      const foot = batons[0].n!
      expect(toy.spiderPose().feet[foot]).toBe(0)
      expect(spiderPose('conduct', toy.spider.t - BEAT * 0.45, pose).feet[foot]).toBeGreaterThan(0.5)
      // The act's time is the beam's: a whole number of beats and the part of a frame since the step.
      expect((toy.spider.t / BEAT) % 1).toBeLessThan(DT / BEAT + 1e-6)
    }
    expect(steps).toBeGreaterThan(14)
    expect(taps).toBe(steps)
    expect(CONDUCT_BEATS[0]).toBeCloseTo(BEAT, 9)
    expect(CONDUCT_BEATS[1] - CONDUCT_BEATS[0]).toBeCloseTo(BEAT, 9)
  })

  it('on a beat of quiet the conducting spider waits: with a white peg in the trap no foot comes down, in sight or in sound, on the beat the beam is held', () => {
    // The trap, with a white peg between its two green ones.
    const toy = toyOf({ board: boardOf([[6, 3, GREEN], [4, 1, RED], [3, 5, WHITE]]), hand: GREEN, moth: holeAt(4, 1) })
    lever(toy)
    beats(toy, 4)
    tap(toy, centreOf(holeAt(0, 3)))
    untilTrapped(toy)
    expect(toy.playing).toBe('trapped')
    toy.sounds.length = 0
    let taps = 0, steps = 0, quiet = 0, lifted = 0
    for (let i = 0; i < 60 * (TRAPPED_FOR - 0.3); i++) {
      const before = full(toy).col
      const held = toy.beams.some((beam) => beam.hold > 0)
      toy.sounds.length = 0
      toy.step(DT)
      const stepped = full(toy).col !== before
      const batons = toy.sounds.filter((cue) => cue.name === 'baton')
      expect(batons.length, `frame ${i}`).toBe(stepped ? 1 : 0)
      if (stepped) {
        steps += 1
        taps += batons.length
        expect(toy.spiderPose().feet[batons[0].n!]).toBe(0)
      }
      const feet = toy.spiderPose().feet
      if (held && toy.beams.some((beam) => beam.hold > 0)) {
        // The whole of a held beat: both conducting feet are down and stay down.
        quiet += 1
        expect(feet[0], `frame ${i}`).toBe(0)
        expect(feet[1], `frame ${i}`).toBe(0)
      } else if (feet[0] > 0.5 || feet[1] > 0.5) lifted += 1
    }
    expect(steps).toBeGreaterThan(8)
    expect(taps).toBe(steps)
    // The white peg held the beam on several beats of the show, and between them the feet did go up.
    expect(quiet).toBeGreaterThan(3 * Math.floor(BEAT / DT) - 6)
    expect(lifted).toBeGreaterThan(30)
  })

  it('lets the beam out a little after the show: it leaves the board, and no column is left unplayed for good', () => {
    const toy = toyOf({ board: boardOf([[6, 3, GREEN], [4, 1, RED], [9, 0, BLUE]]), hand: GREEN }, 1)
    lever(toy)
    beats(toy, 3)
    tap(toy, centreOf(holeAt(0, 3)))
    untilTrapped(toy)
    toy.sounds.length = 0
    // Shut in between the two green columns for the length of the show: the blue peg beyond them is silent.
    run(toy, TRAPPED_FOR)
    expect(toy.sounds.some((cue) => cue.name === 'beam' && cue.colour === BLUE)).toBe(false)
    // Then the green pegs let it through, and within two times across the blue peg has sounded.
    beats(toy, FREE_AFTER + 30)
    expect(toy.sounds.some((cue) => cue.name === 'beam' && cue.colour === BLUE)).toBe(true)
    expect(toy.leverDown).toBe(true)
  })

  it('is trapped by the same move on either time across: a green pushed in behind a beam that was passing green pegs is obeyed at once', () => {
    const toy = toyOf({ board: boardOf([[6, 3, GREEN], [4, 1, RED]]), hand: GREEN, moth: holeAt(4, 1) })
    lever(toy)
    // Turned at the green peg, it leaves at the left and comes in again passing green.
    for (let i = 0; i < 60 * 20 && !(full(toy).open && full(toy).col === 3 && full(toy).dir === 1); i++) toy.step(DT)
    expect(full(toy).open).toBe(true)
    tap(toy, centreOf(holeAt(0, 3)))
    expect(full(toy).open).toBe(false)
    untilTrapped(toy)
    expect(toy.playing).toBe('trapped')
    // A peg of another colour pushed in changes nothing about the beam.
    const other = toyOf({ board: boardOf([[6, 3, GREEN]]), hand: RED, moth: null })
    lever(other)
    for (let i = 0; i < 60 * 20 && !(full(other).open && full(other).col === 3); i++) other.step(DT)
    tap(other, centreOf(holeAt(0, 3)))
    expect(full(other).open).toBe(true)
  })

  it('a green peg pushed in is obeyed by half beams too, and a half beam it shuts in is let out again', () => {
    // The beam is turned at column 8, so its next time across passes green; the yellow in column 4 then splits off a half beam that passes green as well.
    const toy = toyOf({ board: boardOf([[8, 3, GREEN], [4, 1, YELLOW], [1, 5, GREEN]]), hand: GREEN, moth: null })
    lever(toy)
    for (let i = 0; i < 60 * 30 && !toy.beams.some((beam) => beam.half && beam.open); i++) toy.step(DT)
    const half = toy.beams.find((beam) => beam.half)!
    expect(half.open).toBe(true)
    expect(full(toy).open).toBe(true)
    // A green peg goes in: both are turned by green pegs from that moment.
    tap(toy, centreOf(holeAt(6, 6)))
    expect(half.open).toBe(false)
    expect(full(toy).open).toBe(false)
    // The half beam was heading left from column 4: the green in column 1 now turns it back.
    for (let i = 0; i < 60 * 3 && half.turns === 0; i++) toy.step(DT)
    expect(half).toMatchObject({ turns: 1, dir: 1 })
    // Shut in between green columns, it does not go round for good: after eight turns it is let through and leaves.
    for (let i = 0; i < 60 * 40 && toy.beams.includes(half); i++) toy.step(DT)
    expect(toy.beams.includes(half)).toBe(false)
  })

  it('plays once for each pull of the lever, every time the cause is met', () => {
    const toy = trap()
    untilTrapped(toy)
    run(toy, TRAPPED_FOR + 1)
    toy.sounds.length = 0
    run(toy, 20)
    // The beam has been let out, and the scene does not come again by itself.
    expect(names(toy)).not.toContain('trap')
    expect(toy.playing).toBeNull()
    // Lifted and pulled again with the beam's way in still open: the same move traps it again.
    lever(toy)
    tap(toy, wellMouth(GREEN))
    tap(toy, centreOf(holeAt(0, 3)))
    expect(toy.board[holeAt(0, 3)]).toBe(0)
    lever(toy)
    beats(toy, 3)
    tap(toy, centreOf(holeAt(0, 3)))
    untilTrapped(toy)
    expect(toy.playing).toBe('trapped')
  })

  it('gives way to any touch: silent from that frame, the watchers back to watching, and the touch an ordinary touch', () => {
    const toy = trap()
    untilTrapped(toy)
    run(toy, 1)
    toy.sounds.length = 0
    toy.hush = false
    toy.press(600, 596)
    expect(toy.hush).toBe(true)
    expect(toy.playing).toBeNull()
    expect(toy.chase).toBe(false)
    expect(toy.spider.act).toBeNull()
    expect(toy.gecko.act).toBeNull()
    expect(names(toy)).toEqual(['pluck'])
    toy.release()
    toy.sounds.length = 0
    run(toy, 8)
    expect(toy.sounds.some((cue) => cue.scene)).toBe(false)
    // The show itself goes on: the lever is still down and the beam still plays.
    expect(toy.leverDown).toBe(true)
    expect(names(toy)).toContain('beam')
    expect(toy.moth.mode).not.toBe('ride')
  })
})
