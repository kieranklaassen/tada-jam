import { describe, expect, it } from 'vitest'
import { EARTH, LUMPS, MUD, OPEN, ROCK, SAND, STONE, at, atRest, clone, count, equal, fromPicture, put, type Ground, type Lump } from './ground'
import { deserialize, freshGame, serialize, type Game } from './save'
import { DRAGGING_A_STONE, GROUND_STEP, TAPS_AGAIN, Toy, type ToyEvent } from './toy'

/** A game on a small picture, with the ant in the given cell. The top row of a picture stands in for the turf. */
function gameOn(picture: string[], ant: [number, number]): Game {
  return { position: 'first-chamber', ground: fromPicture(picture), ant: { x: ant[0], y: ant[1] }, machines: [], muster: 0, shown: [], ended: false }
}
const play = (toy: Toy, seconds: number, events: ToyEvent[] = []) => {
  for (let t = 0; t < seconds; t += 1 / 60) {
    toy.step(1 / 60)
    events.push(...toy.drainEvents())
  }
  return events
}
const types = (events: ToyEvent[]) => events.map((e) => e.type)

describe('digging', () => {
  it('bites the mouthful under the finger in the call the finger lands in', () => {
    const toy = new Toy(gameOn(['XXXXXX', '.#####', '######', '######', 'XXXXXX'], [0, 1]))
    toy.press(3, 2, 0)
    expect(at(toy.game.ground, 2, 1)).toBe(OPEN)
    expect(at(toy.game.ground, 3, 2)).toBe(OPEN)
    const events = toy.drainEvents()
    expect(events[0]).toMatchObject({ type: 'dug', cells: 4, speed: 0 })
    expect(toy.drainDirty().length).toBe(4)
    expect(toy.drainUnsaved()).toBe(true)
  })

  it('digs along a drag and no further than the finger went, faster drags counting as faster', () => {
    const toy = new Toy(gameOn(['XXXXXXXXXX', '.#########', '##########', '##########', 'XXXXXXXXXX'], [0, 1]))
    toy.press(1, 2, 0)
    toy.drag(5, 2, 0.1)
    const events = toy.drainEvents()
    expect(events.filter((e) => e.type === 'dug').length).toBe(2)
    expect((events[1] as { speed: number }).speed).toBeGreaterThan(0.9)
    for (let x = 6; x < 10; x++) expect(at(toy.game.ground, x, 1)).toBe(EARTH)
    for (let x = 0; x <= 5; x++) expect(at(toy.game.ground, x, 2)).toBe(OPEN)
    toy.release()
    expect(toy.finger).toBeNull()
  })

  it('answers what it cannot bite once as the finger comes to it, and changes nothing', () => {
    const toy = new Toy(gameOn(['XXXX', '.ooo', '.ooo', 'XXXX'], [0, 1]))
    const before = clone(toy.game.ground)
    toy.press(2.5, 2, 0)
    toy.drag(2.6, 2, 0.05)
    toy.drag(2.7, 2, 0.1)
    const events = toy.drainEvents()
    expect(events).toEqual([{ type: 'met', kind: STONE, x: 2.5, y: 2 }])
    expect(equal(toy.game.ground, before)).toBe(true)
    expect(toy.drainUnsaved()).toBe(false)
  })

  it('bites nothing when the touch lands on a lump, not the earth beside it either', () => {
    // A stone the ant can reach, with earth round it; and a stone it cannot reach.
    const toy = new Toy(gameOn(['XXXXXXX', '..o####', '#######', '####o##', '#######', 'XXXXXXX'], [0, 1]))
    const before = clone(toy.game.ground)
    toy.press(2.2, 1.9, 0)
    expect(toy.carried).not.toBeNull()
    toy.cancel()
    expect(equal(toy.game.ground, before)).toBe(true)
    toy.drainEvents()
    toy.press(4.5, 3.5, 1)
    toy.drag(5.5, 3.5, 1.1)
    toy.drag(6.5, 4.5, 1.2)
    toy.release()
    expect(toy.drainEvents()).toEqual([{ type: 'met', kind: STONE, x: 4.5, y: 3.5 }])
    expect(equal(toy.game.ground, before)).toBe(true)
    // The next touch, on earth, digs as ever.
    toy.press(5.5, 3.5, 2)
    expect(at(toy.game.ground, 5, 3)).toBe(OPEN)
  })

  it('never digs the turf or the bedrock, wherever the finger is dragged', () => {
    const game = freshGame(null, 3)
    const toy = new Toy(game)
    toy.press(2, 3, 0)
    toy.drag(38, -5, 0.5)
    toy.drag(38, 40, 1)
    toy.release()
    for (let x = 0; x < game.ground.cols; x++) {
      expect([OPEN, ROCK]).toContain(at(game.ground, x, 0))
      expect(at(game.ground, x, game.ground.rows - 1)).toBe(ROCK)
    }
  })

  it('calls the ant where all under the finger is dug already: nothing is bitten, and the touch is still answered once', () => {
    const toy = new Toy(gameOn(['XXXXXXXX', '........', '........', '........', '########', 'XXXXXXXX'], [0, 3]))
    const before = clone(toy.game.ground)
    toy.press(4.5, 1.5, 0)
    expect(toy.drainEvents()).toEqual([{ type: 'called', x: 4.5, y: 1.5 }])
    expect(equal(toy.game.ground, before)).toBe(true)
    toy.release()
    // A finger that only points, as every touch on the ground does while a raid runs, is answered the same way.
    toy.point(5.5, 2.5, 1)
    expect(toy.drainEvents()).toEqual([{ type: 'called', x: 5.5, y: 2.5 }])
    // In a raid the finger points at what is shown, the raid's own copy of the ground: a lump shoved there answers there.
    const copy = clone(toy.game.ground)
    put(copy, 2, 3, STONE)
    toy.point(2.5, 3.5, 1.5, copy)
    expect(toy.drainEvents()).toEqual([{ type: 'met', kind: STONE, x: 2.5, y: 3.5 }])
    // Beside a wall there is something to bite, and the bite is the answer.
    toy.press(4.5, 3.9, 2)
    expect(toy.drainEvents().map((event) => event.type)).toEqual(['dug'])
  })

  it('ignores a press that is not on the ground', () => {
    const toy = new Toy(gameOn(['XXXX', '.###', 'XXXX'], [0, 1]))
    toy.press(-1, 1, 0)
    toy.press(2, 9, 0)
    expect(toy.drainEvents()).toEqual([])
    expect(toy.finger).toBeNull()
  })
})

describe('the materials, moving and coming to rest', () => {
  it('sand pours into a tunnel dug under it, a step at a time, and lands', () => {
    const toy = new Toy(gameOn(['XXXXXX', '#ssss#', '######', '.#####', '######', 'XXXXXX'], [0, 3]))
    toy.press(1, 3, 0)
    toy.drag(5, 3, 0.2)
    toy.release()
    toy.drainEvents()
    toy.step(GROUND_STEP)
    expect(at(toy.game.ground, 2, 2)).toBe(SAND)
    expect(toy.atRest).toBe(false)
    const events = play(toy, 2)
    expect(types(events)).toContain('pour')
    expect(events.filter((e) => e.type === 'landed' && e.kind === SAND).length).toBeGreaterThanOrEqual(4)
    expect(toy.atRest).toBe(true)
    expect(count(toy.game.ground, SAND)).toBe(4)
    expect(atRest(toy.game.ground)).toBe(true)
  })

  it('a stone with nothing left to bear it drops, and lands having fallen that far', () => {
    const toy = new Toy(gameOn(['XXXXX', '..o.#', '.####', '.####', '.####', 'XXXXX'], [0, 1]))
    toy.press(2, 3, 0)
    toy.drag(3, 4, 0.2)
    toy.release()
    const events = play(toy, 2)
    const landed = events.find((e) => e.type === 'landed') as Extract<ToyEvent, { type: 'landed' }>
    expect(landed.kind).toBe(STONE)
    expect(landed.fell).toBe(3)
    expect(at(toy.game.ground, 2, 4)).toBe(STONE)
  })

  it('mud holds where it touches something and never moves by itself', () => {
    const toy = new Toy(gameOn(['XXXXX', '.#m##', '.####', '.####', 'XXXXX'], [0, 1]))
    toy.press(2, 3, 0)
    toy.drag(3, 3, 0.2)
    toy.release()
    const events = play(toy, 1)
    expect(types(events)).not.toContain('landed')
    expect(at(toy.game.ground, 2, 1)).toBe(MUD)
  })
})

describe('carrying', () => {
  const picture = ['XXXXXXX', '.......', '.s...#.', '####.##', 'XXXXXXX']

  it('takes a lump the ant can reach when the finger lands on it, and leaves it in its cell', () => {
    const toy = new Toy(gameOn(picture, [0, 1]))
    const before = clone(toy.game.ground)
    toy.press(1.5, 2.5, 0)
    expect(toy.carried).toEqual({ kind: SAND, from: 15 })
    // The lump answers as the dig's meeting it does, and is taken.
    expect(toy.drainEvents()).toEqual([{ type: 'met', kind: SAND, x: 1.5, y: 2.5 }, { type: 'picked', kind: SAND, cell: 15 }])
    toy.drag(3.5, 1.5, 0.2)
    expect(equal(toy.game.ground, before)).toBe(true)
    expect(toy.drainUnsaved()).toBe(false)
  })

  it('sets it down in the open cell where the finger lets go, and it behaves as itself there', () => {
    const toy = new Toy(gameOn(picture, [0, 1]))
    toy.press(1.5, 2.5, 0)
    toy.drag(4.5, 1.5, 0.2)
    toy.release()
    expect(types(toy.drainEvents()).filter((type) => type !== 'carrying')).toEqual(['met', 'picked', 'set'])
    const events = play(toy, 1)
    expect(types(events)).toContain('landed')
    expect(at(toy.game.ground, 4, 3)).toBe(SAND)
    expect(at(toy.game.ground, 1, 2)).toBe(OPEN)
    expect(toy.carried).toBeNull()
  })

  it('let go where a lump cannot lie, or with the drag taken away, the lump is back and nothing has changed', () => {
    for (const end of ['on earth', 'cancel'] as const) {
      const toy = new Toy(gameOn(picture, [0, 1]))
      const before = clone(toy.game.ground)
      toy.press(1.5, 2.5, 0)
      toy.drag(5.5, 2.5, 0.2)
      if (end === 'cancel') toy.cancel()
      else toy.release()
      expect(types(toy.drainEvents()).filter((type) => type !== 'carrying')).toEqual(['met', 'picked', 'back'])
      expect(toy.drainUnsaved()).toBe(false)
      play(toy, 0.5)
      expect(equal(toy.game.ground, before)).toBe(true)
      expect(toy.carried).toBeNull()
    }
  })

  it('a lump picked up while it falls is in one place: set down, it has left the air it was falling through', () => {
    const toy = new Toy(gameOn(['XXXXXXXX', '...o....', '...#....', '........', '........', '........', '........', '########', 'XXXXXXXX'], [0, 6]))
    const ground = toy.game.ground
    // The earth under the stone is gone: it starts to fall.
    put(ground, 3, 2, OPEN)
    toy.touched([2 * 8 + 3])
    toy.step(GROUND_STEP)
    expect(at(ground, 3, 2)).toBe(STONE)
    // The finger takes it in mid-air, carries it off while the ground goes on coming to rest, and sets it down.
    toy.press(3.5, 2.5, 0)
    expect(toy.carried?.kind).toBe(STONE)
    play(toy, 0.5)
    toy.drag(6.5, 6.5, 0.6)
    play(toy, 0.3)
    toy.release()
    play(toy, 2)
    expect(count(ground, STONE)).toBe(1)
    expect(at(ground, 6, 6)).toBe(STONE)
    // Taken away in mid-air instead, it is where it fell to, once.
    const again = new Toy(gameOn(['XXXXXXXX', '...o....', '...#....', '........', '........', '........', '........', '########', 'XXXXXXXX'], [0, 6]))
    put(again.game.ground, 3, 2, OPEN)
    again.touched([2 * 8 + 3])
    again.step(GROUND_STEP)
    again.press(3.5, 2.5, 0)
    play(again, 0.5)
    again.cancel()
    play(again, 2)
    expect(count(again.game.ground, STONE)).toBe(1)
    expect(at(again.game.ground, 3, 6)).toBe(STONE)
  })

  it('makes and loses no lump through a long, careless play that picks up lumps as they fall', () => {
    for (const seed of [5, 6, 7]) {
      const game = freshGame(null, seed)
      const whole = LUMPS.map((kind) => count(game.ground, kind))
      const toy = new Toy(game)
      let t = 0, taken = 0
      for (let n = 0; n < 300; n++) {
        const x = (n * 7.3) % 40, y = 1 + ((n * 3.1) % 19)
        const before = clone(game.ground)
        toy.press(x, y, t)
        toy.drag((x + 5 + (n % 9)) % 40, 1 + ((y + (n % 5)) % 19), (t += 0.1))
        if (n % 7 === 0) toy.cancel()
        else toy.release()
        play(toy, 0.1)
        // A lump that has just moved is on its way down: the finger snatches at it, and lets go somewhere else.
        const falling = game.ground.cells.findIndex((kind, i) => LUMPS.includes(kind as Lump) && before.cells[i] === OPEN)
        if (falling >= 0) {
          toy.press((falling % 40) + 0.5, Math.floor(falling / 40) + 0.5, t)
          if (toy.carried) taken++
          play(toy, 0.1)
          toy.drag((x + 11) % 40, 1 + ((y + 7) % 19), (t += 0.1))
          if (n % 5 === 0) toy.cancel()
          else toy.release()
        }
        play(toy, 0.1)
        t += 0.2
      }
      play(toy, 5)
      expect(taken, `seed ${seed}`).toBeGreaterThan(3)
      expect(LUMPS.map((kind) => count(game.ground, kind)), `seed ${seed}`).toEqual(whole)
      expect(atRest(game.ground)).toBe(true)
    }
  })

  it('makes and loses no lump through a long, careless play', () => {
    const game = freshGame(null, 5)
    const whole = LUMPS.map((kind) => count(game.ground, kind))
    const toy = new Toy(game)
    let t = 0
    for (let n = 0; n < 300; n++) {
      const x = (n * 7.3) % 40, y = 1 + ((n * 3.1) % 19)
      toy.press(x, y, t)
      toy.drag((x + 5 + (n % 9)) % 40, 1 + ((y + (n % 5)) % 19), (t += 0.1))
      if (n % 7 === 0) toy.cancel()
      else toy.release()
      play(toy, 0.2)
      t += 0.2
    }
    play(toy, 5)
    expect(LUMPS.map((kind) => count(game.ground, kind))).toEqual(whole)
    expect(atRest(game.ground)).toBe(true)
    expect(at(game.ground, game.ant.x, game.ant.y)).toBe(OPEN)
  })
})

describe('the ant', () => {
  it('runs to the finger by the open way and stands in an open cell all the way', () => {
    const toy = new Toy(gameOn(['XXXXXXXX', '........', '.######.', '........', 'XXXXXXXX'], [0, 1]))
    toy.press(0.5, 3.5, 0)
    for (let n = 0; n < 240; n++) {
      toy.step(1 / 60)
      expect(at(toy.game.ground, toy.game.ant.x, toy.game.ant.y)).toBe(OPEN)
    }
    expect(toy.game.ant).toEqual({ x: 0, y: 3 })
    expect(Math.abs(toy.antAt.x - 0.5) + Math.abs(toy.antAt.y - 3.5)).toBeLessThan(0.01)
  })

  it('still comes to where the finger was after a tap, and then sits idle', () => {
    const toy = new Toy(gameOn(['XXXXXXXX', '........', '.######.', '........', 'XXXXXXXX'], [0, 1]))
    toy.press(6.5, 3.5, 0)
    toy.release()
    toy.step(1 / 60)
    expect(toy.antState).toBe('run')
    play(toy, 3)
    expect(toy.game.ant).toEqual({ x: 6, y: 3 })
    expect(toy.antState).toBe('idle')
  })

  it('stops at the nearest open cell and waits where no open way reaches the finger, and digs nothing', () => {
    const toy = new Toy(gameOn(['XXXXXXXX', '...#....', '...#....', 'XXXXXXXX'], [0, 1]))
    const before = clone(toy.game.ground)
    toy.press(6.5, 1.5, 0)
    play(toy, 2)
    expect(toy.game.ant).toEqual({ x: 2, y: 1 })
    expect(toy.antState).toBe('wait')
    expect(equal(toy.game.ground, before)).toBe(true)
  })

  it('scrambles out when sand pours where it stood', () => {
    const toy = new Toy(gameOn(['XXXXX', '#sss#', '#sss#', '#####', '.####', '#####', 'XXXXX'], [0, 4]))
    toy.press(1, 5, 0)
    toy.drag(4, 5, 0.2)
    const events = play(toy, 3)
    toy.release()
    expect(at(toy.game.ground, toy.game.ant.x, toy.game.ant.y)).toBe(OPEN)
    expect(events.filter((e) => e.type === 'buried').length).toBeLessThanOrEqual(3)
  })
})

describe('put away at any instant', () => {
  const saved = (game: Game) => deserialize(JSON.parse(JSON.stringify(serialize(game))), null, 1)
  const builtAndCarrying = () => {
    const toy = new Toy(freshGame(null, 9))
    toy.press(20, 5, 0)
    toy.drag(10, 6, 0.3)
    toy.release()
    play(toy, 3)
    return toy
  }

  it('under a finger that is carrying a lump, is found with the lump where it was picked up', () => {
    const toy = builtAndCarrying()
    const ground: Ground = toy.game.ground
    let lump: [number, number] | null = null
    for (let y = 1; y < ground.rows && !lump; y++) for (let x = 0; x < ground.cols; x++) {
      toy.press(x + 0.5, y + 0.5, 10)
      if (toy.carried) { lump = [x, y]; break }
      toy.cancel()
    }
    expect(lump, 'a lump the ant can reach').not.toBeNull()
    const before = clone(ground)
    toy.drag(10.5, 5.5, 10.2)
    const back = saved(toy.game)
    expect(equal(back.ground, before)).toBe(true)
    toy.cancel()
    expect(equal(toy.game.ground, before)).toBe(true)
  })

  it('while sand is still falling, is found with the sand where it would have come to rest', () => {
    const toy = new Toy(freshGame(null, 1))
    toy.press(4, 12, 0)
    toy.drag(14, 12, 0.3)
    toy.release()
    toy.step(GROUND_STEP)
    expect(toy.atRest).toBe(false)
    const back = saved(toy.game)
    play(toy, 20)
    expect(toy.atRest).toBe(true)
    expect(equal(back.ground, toy.game.ground)).toBe(true)
    expect(back.ant).toEqual(toy.game.ant)
  })
})

describe('the ant and the lumps it meets', () => {
  // A tunnel with a stone in its floor and a stone and a lump of sand lying in it.
  const picture = ['X.XXXXXXXXXX', '#.##########', '#..........#', '#....o.s...#', '######o#####', 'XXXXXXXXXXXX']

  it('turns to the finger the moment it lands', () => {
    const toy = new Toy(gameOn(picture, [5, 2]))
    toy.press(1.5, 2.5, 0)
    expect(toy.antHeading.x).toBe(-1)
    toy.cancel()
    toy.press(9.5, 2.5, 1)
    expect(toy.antHeading.x).toBe(1)
  })

  it('taps every stone it passes, once, and the same stone again only after a while', () => {
    const toy = new Toy(gameOn(picture, [1, 3]))
    toy.press(10.5, 3.5, 0)
    for (let n = 0; n < 120; n++) toy.step(1 / 60)
    const tapped = (toy.drainEvents().filter((event) => event.type === 'tapped') as Extract<ToyEvent, { type: 'tapped' }>[]).map((event) => event.cell)
    // The stone that lies in the tunnel: it runs up to it and over it, and taps it once.
    expect(tapped).toEqual([3 * 12 + 5])
    toy.release()
    toy.press(1.5, 3.5, 3)
    for (let n = 0; n < 120; n++) toy.step(1 / 60)
    expect(toy.drainEvents().some((event) => event.type === 'tapped')).toBe(false)
    expect(TAPS_AGAIN).toBeGreaterThan(2)
  })

  it('runs slower with a stone than with sand, and gives a beat of carrying as it goes', () => {
    const run = (x: number) => {
      const toy = new Toy(gameOn(picture, [x - 1, 3]))
      toy.press(x + 0.5, 3.5, 0)
      expect(toy.carried).not.toBeNull()
      toy.drag(1.5, 2.5, 0.1)
      const from = { ...toy.antAt }
      for (let n = 0; n < 12; n++) toy.step(1 / 60)
      const far = Math.abs(toy.antAt.x - from.x) + Math.abs(toy.antAt.y - from.y)
      for (let n = 0; n < 14; n++) toy.step(1 / 60)
      const beats = toy.drainEvents().filter((event) => event.type === 'carrying') as Extract<ToyEvent, { type: 'carrying' }>[]
      return { far, beats }
    }
    const stone = run(5), sand = run(7)
    expect(stone.far).toBeLessThan(sand.far * 0.7)
    expect(stone.far).toBeGreaterThan(0)
    expect(sand.beats.length).toBeGreaterThan(0)
    expect(sand.beats[0].kind).toBe(SAND)
    expect(DRAGGING_A_STONE).toBeLessThan(0.7)
  })
})

