import { describe, expect, it } from 'vitest'
import { BLUE, GREEN, HOLES, RED, WHITE, YELLOW, centreOf, holeAt, perchOf, stepOf, type Colour, type Mirror } from './board'
import { BUTTONS, GECKO, SPEAKER, SPIDER, wellMouth } from './layout'
import { deserialize, freshSave, serialize, type Save } from './save'
import { STAGE } from './stage'
import { IdleLadder } from './guidance'
import { ECHO_GAP, HINT_AFTER, LIVE_FOR, MOST_LIVE, NECK_REACH, PILE_RATTLE, Toy, WHITE_BREATH, liveScale } from './toy'

const DT = 1 / 60
const empty = (over: Partial<Save> = {}): Save => ({ ...freshSave(null), board: new Array<number>(HOLES).fill(0), moth: null, ...over })
const toyOf = (over: Partial<Save> = {}, seed = 1) => new Toy(empty(over), seed)
const names = (toy: Toy) => toy.sounds.map((cue) => cue.name)
const run = (toy: Toy, seconds: number) => { for (let t = 0; t < seconds - 1e-9; t += DT) toy.step(DT) }
const pressHole = (toy: Toy, hole: number) => toy.press(centreOf(hole).x, centreOf(hole).y)
const tapHole = (toy: Toy, hole: number) => { pressHole(toy, hole); toy.release() }
const tapWell = (toy: Toy, colour: Colour) => { toy.press(wellMouth(colour).x, wellMouth(colour).y); toy.release() }
const tapButton = (toy: Toy, mirror: Mirror) => { toy.press(BUTTONS[mirror].x, BUTTONS[mirror].y); toy.release() }
const reopened = (toy: Toy, seed = 1) => new Toy(deserialize(JSON.parse(JSON.stringify(serialize(toy.toSave()))), null), seed)

describe('the finger pushes a peg into a hole', () => {
  it('is answered inside the press: the peg stands, clicks and blooms before any time passes', () => {
    const toy = toyOf()
    const hole = holeAt(4, 2)
    pressHole(toy, hole)
    expect(toy.board[hole]).toBe(RED)
    expect(toy.shown[hole]).toBe(RED)
    expect(toy.sounds).toContainEqual({ name: 'click', colour: RED, steps: [stepOf(hole)] })
    expect(toy.blooms).toEqual([{ hole, colour: RED, age: 0, closing: false }])
    expect(toy.changed).toContain(hole)
    expect(toy.kickAge).toBe(0)
    expect(toy.dirty).toBe(true)
    expect(toy.time).toBe(0)
  })

  it('presses the peg small while the finger rests, springs it past its size on the lift and settles it', () => {
    const toy = toyOf()
    const hole = holeAt(4, 2)
    pressHole(toy, hole)
    run(toy, 1.5)
    const peg = toy.live.find((live) => live.hole === hole)!
    expect(peg.held).toBe(true)
    expect(liveScale(peg)).toBeCloseTo(0.86, 2)
    toy.release()
    toy.changed.length = 0
    let largest = 0
    for (let i = 0; i < 12; i++) { toy.step(DT); largest = Math.max(largest, liveScale(toy.live[0])) }
    expect(largest).toBeGreaterThan(1.08)
    run(toy, LIVE_FOR)
    // Settled, it is handed to the still layer.
    expect(toy.live).toEqual([])
    expect(toy.changed).toContain(hole)
    expect(toy.shown[hole]).toBe(RED)
  })

  it('never draws a springing peg larger than its cell allows nor smaller than half', () => {
    const toy = toyOf()
    pressHole(toy, 30)
    for (let i = 0; i < 120; i++) {
      if (i === 7) toy.release()
      toy.step(DT)
      for (const peg of toy.live) {
        expect(liveScale(peg)).toBeGreaterThan(0.5)
        expect(liveScale(peg)).toBeLessThan(1.25)
      }
    }
  })

  it('leaves a line under a drag: every hole crossed takes a peg, each with its own click, a rising scale going up', () => {
    const toy = toyOf()
    const from = centreOf(holeAt(2, 6)), to = centreOf(holeAt(2, 0))
    toy.press(from.x, from.y)
    toy.dragMove(from.x, from.y - 100)
    toy.dragMove(to.x, to.y)
    toy.release()
    for (let row = 0; row < 7; row++) expect(toy.board[holeAt(2, row)]).toBe(RED)
    const clicks = toy.sounds.filter((cue) => cue.name === 'click')
    expect(clicks.flatMap((cue) => cue.steps)).toEqual([0, 1, 2, 3, 4, 5, 6])
    // Many pegs clicked in by one move of the finger are one sound event, not a pile of the same click.
    expect(clicks).toHaveLength(3)
  })

  it('keeps every peg of a stroke the system takes away: each was an act already made', () => {
    const toy = toyOf()
    const line = [holeAt(3, 2), holeAt(4, 2), holeAt(5, 2)]
    pressHole(toy, line[0])
    toy.dragMove(centreOf(line[2]).x, centreOf(line[2]).y)
    toy.release()
    expect(line.map((hole) => toy.board[hole])).toEqual([RED, RED, RED])
    expect(toy.finger).toBe(false)
    // A lift with nothing down is harmless.
    toy.release()
  })

  it('lets a white peg hang dark for a breath, then lights it with its bell', () => {
    const toy = toyOf({ hand: WHITE })
    pressHole(toy, 20)
    expect(names(toy)).toContain('click')
    expect(names(toy)).not.toContain('bell')
    expect(toy.live[0].lit).toBe(false)
    toy.release()
    toy.sounds.length = 0
    run(toy, WHITE_BREATH - 0.03)
    expect(names(toy)).not.toContain('bell')
    run(toy, 0.06)
    expect(toy.sounds).toContainEqual({ name: 'bell', steps: [stepOf(20)] })
    expect(toy.live[0].lit).toBe(true)
  })

  it('springs no more than a handful at once, and no white peg loses its bell to that', () => {
    const toy = toyOf({ hand: WHITE, mirror: 2 })
    const from = centreOf(holeAt(0, 0)), to = centreOf(holeAt(4, 0))
    toy.press(from.x, from.y)
    toy.dragMove(to.x, to.y)
    toy.release()
    run(toy, 1.5)
    expect(toy.live.length).toBe(0)
    expect(toy.sounds.filter((cue) => cue.name === 'bell').flatMap((cue) => cue.steps)).toHaveLength(20)
    expect(toy.sounds.filter((cue) => cue.name === 'click').flatMap((cue) => cue.steps)).toHaveLength(20)
    const busy = toyOf({ mirror: 2 })
    busy.press(from.x, from.y)
    busy.dragMove(to.x, to.y)
    for (let i = 0; i < 20; i++) { busy.step(DT); expect(busy.live.length).toBeLessThanOrEqual(MOST_LIVE) }
  })
})

describe('the mirror buttons', () => {
  it('echo a push two ways or four ways: all of it saved at once, seen and heard one after the other, each a step higher', () => {
    const toy = toyOf({ mirror: 2 })
    const lead = holeAt(1, 1), all = [lead, holeAt(9, 1), holeAt(1, 5), holeAt(9, 5)]
    pressHole(toy, lead)
    for (const hole of all) expect(toy.toSave().board[hole]).toBe(RED)
    expect(all.map((hole) => toy.shown[hole])).toEqual([RED, 0, 0, 0])
    toy.release()
    const seenAt: number[] = [0]
    for (let frame = 1; frame <= 30; frame++) {
      const before = toy.sounds.length
      toy.step(DT)
      for (const cue of toy.sounds.slice(before)) if (cue.name === 'click') {
        seenAt.push(frame * DT)
        // The echo is seen in the frame it is heard.
        expect(toy.shown[all[seenAt.length - 1]]).toBe(RED)
      }
    }
    expect(seenAt).toHaveLength(4)
    seenAt.forEach((at, n) => { expect(at).toBeGreaterThanOrEqual(n * ECHO_GAP - 1e-9); expect(at).toBeLessThan(n * ECHO_GAP + DT + 1e-9) })
    // Each echo is asked for a step above its own row's for every echo before it.
    expect(toy.sounds.filter((cue) => cue.name === 'click').map((cue) => cue.steps)).toEqual(all.map((hole, n) => [stepOf(hole) + n]))
    expect(toy.shown).toEqual(toy.board)
  })

  it('press in at the touch and are lit whole at once, with one sound: nothing lights or sounds one after the other', () => {
    for (const mirror of [0, 1, 2] as const) {
      const toy = toyOf({ mirror: mirror === 0 ? 1 : 0 })
      tapButton(toy, mirror)
      expect(toy.mirror).toBe(mirror)
      expect(toy.sounds).toEqual([{ name: 'button', n: mirror }])
      expect(toy.buttonAge).toBe(0)
      expect(toy.dirty).toBe(true)
      // Nothing of the key is still to come: a second of play adds no sound that is the key's.
      toy.sounds.length = 0
      toy.spider.rest()
      toy.gecko.rest()
      for (let t = 0; t < 1; t += DT) {
        toy.step(DT)
        expect(names(toy).filter((name) => name === 'button')).toEqual([])
      }
    }
  })

  it('skip an echo that holds the colour already, and echo a pull as well', () => {
    const toy = toyOf()
    tapHole(toy, holeAt(1, 0))
    tapButton(toy, 1)
    run(toy, 1)
    toy.sounds.length = 0
    // The far echo already holds red: only the hole under the finger is new, and it alone clicks.
    tapHole(toy, holeAt(9, 0))
    run(toy, 0.5)
    expect(toy.sounds.filter((cue) => cue.name === 'click')).toEqual([{ name: 'click', colour: RED, steps: [stepOf(holeAt(9, 0))] }])
    expect([holeAt(1, 0), holeAt(9, 0)].map((hole) => toy.board[hole])).toEqual([RED, RED])
    // A touch on red with red in hand pulls it, and its echo with it, one after the other.
    toy.sounds.length = 0
    tapHole(toy, holeAt(9, 0))
    expect([holeAt(1, 0), holeAt(9, 0)].map((hole) => toy.board[hole])).toEqual([0, 0])
    expect(toy.shown[holeAt(1, 0)]).toBe(RED)
    run(toy, ECHO_GAP + DT)
    expect(toy.shown[holeAt(1, 0)]).toBe(0)
    expect(toy.sounds.filter((cue) => cue.name === 'pull')).toHaveLength(2)
  })
})

describe('swapping and pulling', () => {
  it('knocks the old peg out when another colour is pushed onto it, and the old colour is heard to go', () => {
    for (const old of [RED, BLUE, YELLOW, GREEN, WHITE] as const) {
      const hand = old === RED ? BLUE : RED
      const board = new Array<number>(HOLES).fill(0)
      board[33] = old
      const toy = toyOf({ board, hand })
      pressHole(toy, 33)
      expect(toy.board[33]).toBe(hand)
      expect(toy.fallers).toEqual([{ colour: old, kind: 'knocked', t: 0, ...centreOf(33) }])
      // Red is silent until it strikes the bezel; the others are heard at once.
      expect(names(toy).includes('knock')).toBe(old !== RED)
      expect(names(toy)).toContain('click')
      toy.release()
      run(toy, 2)
      expect(toy.fallers).toEqual([])
      expect(toy.sounds).toContainEqual({ name: 'knock', colour: old })
      expect(toy.sounds).toContainEqual({ name: 'land', colour: old })
      // The well it fell into rattles.
      expect(toy.wellAge[old]).toBeLessThan(2)
    }
  })

  it('pulls a peg out when it is touched with its own colour in hand, and a drag pulls a line', () => {
    const board = new Array<number>(HOLES).fill(0)
    for (const hole of [22, 23, 24]) board[hole] = BLUE
    const toy = toyOf({ board, hand: BLUE, moth: 24 })
    pressHole(toy, 22)
    expect(toy.board[22]).toBe(0)
    expect(toy.shown[22]).toBe(0)
    expect(toy.sounds).toContainEqual({ name: 'pull', colour: BLUE, steps: [stepOf(22)] })
    expect(toy.fallers[0]).toMatchObject({ colour: BLUE, kind: 'pulled' })
    toy.step(DT)
    toy.dragMove(centreOf(24).x, centreOf(24).y)
    toy.release()
    expect([22, 23, 24].map((hole) => toy.board[hole])).toEqual([0, 0, 0])
    // A pulling stroke pushes nothing into the empty holes it crosses.
    expect(toy.board.every((cell) => cell === 0)).toBe(true)
    // The moth's light is gone: it flies home.
    expect(toy.moth.perch).toBeNull()
    run(toy, 2)
    expect(names(toy)).toContain('tink')
    // The first lands by itself; the two the drag pulled together land together, as one sound.
    expect(toy.sounds.filter((cue) => cue.name === 'land')).toHaveLength(2)
  })

  it('carries a colour from its pile onto the board: a drag that starts on a well lays pegs of it from where it comes on', () => {
    const toy = toyOf()
    const from = wellMouth(GREEN), to = centreOf(holeAt(6, 4))
    toy.press(from.x, from.y)
    expect(toy.hand).toBe(GREEN)
    expect(toy.board.every((cell) => cell === 0)).toBe(true)
    toy.dragMove(from.x, from.y - 40)
    expect(toy.board.every((cell) => cell === 0)).toBe(true)
    toy.dragMove(to.x, to.y)
    toy.release()
    expect(toy.board[holeAt(6, 4)]).toBe(GREEN)
    expect(toy.board.filter((cell) => cell === GREEN).length).toBeGreaterThanOrEqual(2)
    expect(toy.board.every((cell) => cell === 0 || cell === GREEN)).toBe(true)
  })

  it('takes a colour in hand from a well', () => {
    const toy = toyOf()
    tapWell(toy, YELLOW)
    expect(toy.hand).toBe(YELLOW)
    expect(toy.sounds).toEqual([{ name: 'well', colour: YELLOW }])
    expect(toy.wellAge[YELLOW]).toBe(0)
    expect(toy.dirty).toBe(true)
    tapHole(toy, 5)
    expect(toy.board[5]).toBe(YELLOW)
  })
})

describe('the three who watch', () => {
  it('send the moth to the newest light, and each watcher answers the colour its own way', () => {
    const toy = toyOf({ hand: GREEN })
    tapHole(toy, 40)
    expect(toy.moth.perch).toBe(40)
    expect(toy.moth.mode).toBe('fly')
    expect(toy.spider.act).toBe('bounce')
    expect(toy.gecko.act).toBe('wag')
    run(toy, 2)
    expect({ x: toy.moth.x, y: toy.moth.y }).toEqual(perchOf(40))
    expect(names(toy)).toEqual(expect.arrayContaining(['pat', 'mothTaste', 'spiderTaste', 'geckoTaste']))
  })

  it('blow the moth off its perch when the peg it sits by is swapped', () => {
    const board = new Array<number>(HOLES).fill(0)
    board[40] = BLUE
    const toy = toyOf({ board, moth: 40 })
    tapHole(toy, 40)
    expect(toy.moth.act).toBe('tumble')
    expect(names(toy)).toContain('squeak')
    expect(toy.moth.perch).toBe(40)
  })

  it('leave the moth be at a knock anywhere but its own hole: it flies to the new peg, as at any push, and does not tumble', () => {
    const board = new Array<number>(HOLES).fill(0)
    board[40] = BLUE
    board[12] = BLUE
    const toy = toyOf({ board, moth: 40 })
    tapHole(toy, 12)
    expect(toy.moth.act).not.toBe('tumble')
    expect(names(toy)).not.toContain('squeak')
    expect(toy.moth.perch).toBe(12)
  })

  it('a drag that starts on bare backdrop, off the board, lays pegs from where it comes onto the board; one that starts on a key or a watcher lays none', () => {
    const toy = toyOf()
    const row = centreOf(holeAt(0, 3)).y
    toy.press(206, row)
    expect(names(toy)).toEqual(['pluck'])
    expect(toy.board.some((cell) => cell !== 0)).toBe(false)
    for (let x = 206; x <= centreOf(holeAt(2, 3)).x; x += 6) toy.dragMove(x, row)
    toy.release()
    expect([0, 1, 2].map((col) => toy.board[holeAt(col, 3)])).toEqual([RED, RED, RED])
    expect(toy.board.filter((cell) => cell !== 0)).toHaveLength(3)
    const other = toyOf()
    other.press(SPIDER.x, SPIDER.y)
    for (let x = SPIDER.x; x <= centreOf(holeAt(2, 3)).x; x += 6) other.dragMove(x, row)
    other.release()
    expect(other.board.some((cell) => cell !== 0)).toBe(false)
  })

  it('let a drag that began on a hole pass under the moth and keep laying pegs: only a touch that lands on it is the moth\'s', () => {
    const board = new Array<number>(HOLES).fill(0)
    board[holeAt(4, 3)] = BLUE
    const toy = toyOf({ board, moth: holeAt(4, 3) })
    const perch = perchOf(holeAt(4, 3))
    // A line along the row above the moth's peg, straight through the corner the moth sits on.
    const from = centreOf(holeAt(2, 2))
    toy.press(from.x, from.y)
    toy.dragMove(perch.x, perch.y)
    toy.dragMove(centreOf(holeAt(7, 2)).x, perch.y)
    toy.release()
    expect(toy.moth.act).not.toBe('tumble')
    expect(names(toy)).not.toContain('squeak')
    expect(toy.board.filter((cell) => cell === RED).length).toBeGreaterThanOrEqual(5)
    // The same corner, touched, is the moth's and lays nothing.
    const again = toyOf({ board, moth: holeAt(4, 3) })
    again.press(perch.x, perch.y)
    expect(again.moth.act).toBe('tumble')
    expect(again.board).toEqual(board)
  })

  it('answer a poke as themselves: the moth tumbles, the spider drops on its thread, the gecko chirps, the loudspeaker thumps', () => {
    const toy = toyOf({ moth: 40 })
    toy.press(perchOf(40).x, perchOf(40).y)
    expect(names(toy)).toEqual(['squeak'])
    expect(toy.board.every((cell) => cell === 0)).toBe(true)
    toy.release()
    toy.sounds.length = 0
    toy.press(SPIDER.x, SPIDER.y)
    expect(toy.spider.act).toBe('yoyo')
    expect(names(toy)).toEqual(['boing'])
    toy.release()
    toy.sounds.length = 0
    toy.press(GECKO.x, GECKO.y)
    expect(toy.gecko.act).toBe('chirp')
    toy.release()
    toy.sounds.length = 0
    toy.press(SPEAKER.x, SPEAKER.y)
    expect(names(toy)).toEqual(['thump'])
    expect(toy.pulseAge).toBe(0)
    expect(toy.dirty).toBe(false)
  })

  it('look at the finger while it is down', () => {
    const toy = toyOf()
    toy.press(300, 200)
    expect(toy.finger).toBe(true)
    toy.dragMove(700, 400)
    expect(toy.look).toEqual({ x: 700, y: 400 })
    toy.release()
    expect(toy.finger).toBe(false)
  })
})

describe('every touch is answered when the finger lands', () => {
  it('gives a sound inside the press at every point of the stage, on a board that is empty, full or mixed', () => {
    const full = new Array<number>(HOLES).fill(RED)
    const mixed = full.map((_, hole) => hole % 6)
    for (const board of [new Array<number>(HOLES).fill(0), full, mixed]) {
      for (let x = 10; x < STAGE.width; x += 45) for (let y = 10; y < STAGE.height; y += 45) {
        const toy = toyOf({ board, moth: board[38] ? 38 : null })
        toy.press(x, y)
        expect(toy.sounds.length, `at ${x}, ${y}`).toBeGreaterThan(0)
        expect(toy.pulseAge).toBe(0)
      }
    }
  })

  it('leaves a spark and plucks a cable where there is nothing, lower on the left and higher on the right', () => {
    const toy = toyOf()
    toy.press(40, 500)
    toy.release()
    toy.press(1160, 600)
    expect(toy.sparks).toHaveLength(2)
    const plucks = toy.sounds.filter((cue) => cue.name === 'pluck')
    expect(plucks[1].n!).toBeGreaterThan(plucks[0].n!)
    // A stroke that starts on nothing and comes onto the board draws from there.
    toy.release()
    toy.press(600, 596)
    toy.dragMove(centreOf(holeAt(5, 6)).x, centreOf(holeAt(5, 6)).y)
    expect(toy.board[holeAt(5, 6)]).toBe(RED)
  })
})

describe('found as left', () => {
  it('opens again exactly as it stood, put away at any instant: mid echo, mid fall, finger still down', () => {
    const toy = toyOf({ mirror: 2, hand: BLUE })
    tapHole(toy, holeAt(2, 1))
    run(toy, 1)
    tapWell(toy, YELLOW)
    pressHole(toy, holeAt(2, 1))
    // Put away now: three echoes are not yet seen, four blue pegs are about to fall, the finger is down.
    expect(toy.shown).not.toEqual(toy.board)
    const again = reopened(toy)
    expect(again.board).toEqual(toy.board)
    expect(again.shown).toEqual(toy.board)
    expect(again.hand).toBe(YELLOW)
    expect(again.mirror).toBe(2)
    expect(again.moth.perch).toBe(toy.moth.perch)
    expect({ x: again.moth.x, y: again.moth.y }).toEqual(perchOf(holeAt(2, 1)))
  })

  it('replays nothing on opening: no bloom, no faller, no springing peg and no sound until the child touches', () => {
    const toy = toyOf({ mirror: 1 })
    tapHole(toy, 12)
    tapHole(toy, 30)
    const again = reopened(toy)
    expect(again.sounds).toEqual([])
    expect(again.live).toEqual([])
    expect(again.blooms).toEqual([])
    expect(again.fallers).toEqual([])
    expect(again.dirty).toBe(false)
    run(again, 30)
    expect(again.sounds).toEqual([])
    expect(again.board).toEqual(toy.board)
    expect(again.dirty).toBe(false)
  })

  it('does nothing to the board by itself, however long it is left: the watchers idle in silence', () => {
    const toy = new Toy(freshSave(null), 1)
    const before = toy.toSave()
    let acted = false
    for (let i = 0; i < 60 * 90; i++) { toy.step(DT); acted ||= toy.spider.act !== null || toy.gecko.act !== null }
    expect(toy.toSave()).toEqual(before)
    expect(toy.sounds).toEqual([])
    expect(toy.dirty).toBe(false)
    expect(acted).toBe(true)
  })

  it('stands still while no time passes, as it does while unattended', () => {
    const toy = toyOf({ mirror: 2 })
    pressHole(toy, holeAt(2, 1))
    const sounds = toy.sounds.length
    for (let i = 0; i < 200; i++) toy.step(0)
    expect(toy.time).toBe(0)
    expect(toy.sounds.length).toBe(sounds)
    expect(toy.shown.filter((cell) => cell !== 0)).toHaveLength(1)
  })

  it('plays the same from the same seed', () => {
    const acts = (seed: number) => {
      const toy = new Toy(freshSave(null), seed)
      const seen: string[] = []
      for (let i = 0; i < 60 * 40; i++) { toy.step(DT); seen.push(`${toy.spider.act}/${toy.gecko.act}`) }
      return seen.join()
    }
    expect(acts(1)).toBe(acts(1))
    expect(acts(1)).not.toBe(acts(2))
  })
})

describe('where the idle glow sits', () => {
  it('is a short row of empty holes that carries on from the moth\'s light', () => {
    const toy = new Toy(freshSave(null), 1)
    // The first-visit step rises to the right: the glow carries it on, up and to the right of the last peg.
    expect(toy.nextHoles()).toEqual([holeAt(6, 1), holeAt(7, 0)])
    // From 6 the step ends a row from the top: the glow runs on to the right instead.
    expect(new Toy(freshSave(6), 1).nextHoles()).toEqual([holeAt(7, 1), holeAt(8, 1), holeAt(9, 1)])
  })

  it('is nowhere on a full board, and in the middle of an empty one', () => {
    expect(toyOf({ board: new Array<number>(HOLES).fill(RED), moth: 3 }).nextHoles()).toEqual([])
    const next = toyOf().nextHoles()
    expect(next).toHaveLength(3)
  })
})

describe('a stroke that starts on a peg of the colour in hand', () => {
  it('pulls pegs of that colour only: pegs of other colours it crosses stay where they are', () => {
    const board = new Array<number>(HOLES).fill(0)
    board[holeAt(2, 3)] = RED
    board[holeAt(3, 3)] = BLUE
    board[holeAt(4, 3)] = RED
    board[holeAt(5, 3)] = YELLOW
    board[holeAt(6, 3)] = RED
    const toy = toyOf({ board, hand: RED })
    const from = centreOf(holeAt(2, 3)), to = centreOf(holeAt(7, 3))
    toy.press(from.x, from.y)
    for (let i = 1; i <= 20; i++) toy.dragMove(from.x + ((to.x - from.x) * i) / 20, from.y)
    toy.release()
    expect([2, 3, 4, 5, 6, 7].map((col) => toy.board[holeAt(col, 3)])).toEqual([0, BLUE, 0, YELLOW, 0, 0])
    // It lays nothing either: the empty hole at its end is still empty.
    expect(toy.board.filter((cell) => cell !== 0)).toHaveLength(2)
  })

  it('is mirrored as a push is: the echoes of that colour come out, an echo of another colour stays', () => {
    const board = new Array<number>(HOLES).fill(0)
    board[holeAt(1, 1)] = GREEN
    board[holeAt(9, 1)] = GREEN
    board[holeAt(1, 5)] = WHITE
    board[holeAt(9, 5)] = GREEN
    const toy = toyOf({ board, hand: GREEN, mirror: 2 })
    tapHole(toy, holeAt(1, 1))
    expect([holeAt(1, 1), holeAt(9, 1), holeAt(1, 5), holeAt(9, 5)].map((hole) => toy.board[hole])).toEqual([0, 0, WHITE, 0])
  })
})

describe('what the sheet says and the toy does', () => {
  it('the gecko stretches its neck towards the warm pegs: towards the red ones, by a set reach, and not at all when there is none', () => {
    const toy = toyOf()
    run(toy, 2)
    expect(toy.neck).toEqual({ x: 0, y: 0 })
    tapHole(toy, holeAt(0, 0))
    run(toy, 3)
    // The red peg is up and to the left of the gecko's head.
    expect(toy.neck.x).toBeLessThan(-NECK_REACH * 0.8)
    expect(toy.neck.y).toBeLessThan(0)
    expect(Math.hypot(toy.neck.x, toy.neck.y)).toBeCloseTo(NECK_REACH, 1)
    // A blue peg is not warm.
    const cold = toyOf({ hand: BLUE })
    tapHole(cold, holeAt(0, 0))
    run(cold, 3)
    expect(cold.neck).toEqual({ x: 0, y: 0 })
    // Opened again, the head is already where it leans: nothing eases in.
    const again = reopened(toy)
    expect(Math.hypot(again.neck.x, again.neck.y)).toBeCloseTo(NECK_REACH, 5)
  })

  it('a tapped well rattles its whole pile for a moment, and a peg that lands in the well does not', () => {
    const toy = toyOf()
    expect(toy.pileAge[BLUE]).toBeGreaterThan(PILE_RATTLE)
    tapWell(toy, BLUE)
    expect(toy.pileAge[BLUE]).toBe(0)
    expect(toy.pileAge[RED]).toBeGreaterThan(PILE_RATTLE)
    run(toy, PILE_RATTLE + 0.05)
    expect(toy.pileAge[BLUE]).toBeGreaterThan(PILE_RATTLE)
  })

})

describe('the ending\'s hint', () => {
  const pegged = () => { const board = new Array<number>(HOLES).fill(0); board[5] = RED; board[holeAt(0, 2)] = BLUE; return board }
  const rattles = (toy: Toy) => toy.sounds.filter((cue) => cue.name === 'rattle').length
  const KNOB = { x: 1138, y: 338 }

  it('takes as long as the idle ladder takes to reach the end of its last demonstration', () => {
    const ladder = new IdleLadder(0)
    let end = 0
    for (let t = 0; t < 600; t += 0.01) if (ladder.update(t).demo !== null) end = t
    expect(HINT_AFTER).toBeCloseTo(end, 1)
    expect(HINT_AFTER).toBeGreaterThan(60)
  })

  it('after a touch and a whole stretch with no touch, with pegs on the board, the tray handle rattles once by itself, and never twice', () => {
    const toy = toyOf({ board: pegged() })
    tapWell(toy, RED)
    toy.sounds.length = 0
    run(toy, HINT_AFTER - 0.5)
    expect(rattles(toy)).toBe(0)
    run(toy, 1)
    expect(toy.sounds).toEqual([{ name: 'rattle' }])
    expect(toy.handleAge).toBeLessThan(1)
    // It is a rattle and no more: the board is as it was, and nothing is playing.
    expect(toy.board[5]).toBe(RED)
    expect(toy.playing).toBeNull()
    // However long nobody touches after that, it does not come again.
    toy.sounds.length = 0
    run(toy, HINT_AFTER * 3)
    expect(rattles(toy)).toBe(0)
    // A touch and a whole new stretch: once more.
    tapWell(toy, RED)
    toy.sounds.length = 0
    run(toy, HINT_AFTER + 0.5)
    expect(rattles(toy)).toBe(1)
  })

  it('comes to a child who leaves the tune playing: with the lever down and the beam running, the same stretch brings the same one rattle', () => {
    const toy = toyOf({ board: pegged() })
    toy.press(KNOB.x, KNOB.y)
    toy.release()
    expect(toy.leverDown).toBe(true)
    expect(toy.busy).toBe(true)
    toy.sounds.length = 0
    run(toy, HINT_AFTER - 0.5)
    expect(rattles(toy)).toBe(0)
    run(toy, 1)
    expect(rattles(toy)).toBe(1)
    expect(toy.leverDown).toBe(true)
    toy.sounds.length = 0
    run(toy, HINT_AFTER * 2)
    expect(rattles(toy)).toBe(0)
    expect(names(toy)).toContain('beam')
  })

  it('counts from the lift of the finger, and a touch in the stretch starts it again', () => {
    const toy = toyOf({ board: pegged() })
    pressHole(toy, 20)
    run(toy, HINT_AFTER + 5)
    // The finger is still down: no stretch has begun.
    expect(rattles(toy)).toBe(0)
    toy.release()
    run(toy, HINT_AFTER - 2)
    tapWell(toy, BLUE)
    toy.sounds.length = 0
    run(toy, HINT_AFTER - 2)
    expect(rattles(toy)).toBe(0)
    run(toy, 3)
    expect(rattles(toy)).toBe(1)
  })

  it('is not given on an empty board, and that stretch is then spent', () => {
    const toy = toyOf()
    toy.press(600, 596)
    toy.release()
    toy.sounds.length = 0
    run(toy, HINT_AFTER * 2)
    expect(toy.sounds).toEqual([])
    expect(toy.untouched).toBeNull()
  })

  it('is earned by a touch, never by an opening: a game that is opened, or put away and opened again, does not rattle until it has been touched and a whole new stretch has gone by', () => {
    // Opened and left alone.
    const fresh = toyOf({ board: pegged() })
    run(fresh, HINT_AFTER * 2)
    expect(fresh.sounds).toEqual([])
    // Put away in the middle of a stretch, and at its end, and after the rattle: opened again, nothing comes.
    for (const before of [HINT_AFTER / 2, HINT_AFTER - 0.2, HINT_AFTER + 1]) {
      const toy = toyOf({ board: pegged() })
      tapWell(toy, RED)
      run(toy, before)
      toy.putAway()
      expect(toy.untouched).toBeNull()
      toy.sounds.length = 0
      run(toy, HINT_AFTER * 2)
      expect(toy.sounds, `put away after ${before}`).toEqual([])
      // As a load finds it: the same settled state.
      expect(reopened(toy).untouched).toBeNull()
      // Touched again, a whole new stretch brings it.
      tapWell(toy, RED)
      toy.sounds.length = 0
      run(toy, HINT_AFTER - 1)
      expect(rattles(toy)).toBe(0)
      run(toy, 1.5)
      expect(rattles(toy)).toBe(1)
    }
  })
})

describe('the moth whose peg is pulled', () => {
  it('droops beside the empty hole before it leaves, and its place is saved as its bulb from the pull on', () => {
    const board = new Array<number>(HOLES).fill(0)
    board[holeAt(4, 2)] = RED
    const toy = toyOf({ board, moth: holeAt(4, 2) })
    const sat = { x: toy.moth.x, y: toy.moth.y }
    tapHole(toy, holeAt(4, 2))
    expect(toy.board[holeAt(4, 2)]).toBe(0)
    expect(toy.moth.act).toBe('droop')
    expect(toy.toSave().moth).toBeNull()
    run(toy, 0.3)
    // It has not flown: it hangs where it sat, a little lower, with its wings shut.
    expect(toy.moth.x).toBe(sat.x)
    expect(toy.moth.y).toBeGreaterThan(sat.y + 4)
    expect(toy.moth.wingOpen).toBeLessThan(0.2)
    // Drooping, it is no target: a touch there is the hole's, as while it tumbles.
    expect(toy.places().moth).toBeNull()
    run(toy, 3)
    expect(toy.moth.mode).toBe('sit')
    expect(reopened(toy).moth.perch).toBeNull()
  })
})
