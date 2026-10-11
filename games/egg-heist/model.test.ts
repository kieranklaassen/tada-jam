import { describe, expect, it } from 'vitest'
import { AWAKE_SECONDS, FLY_SECONDS, HONK_SECONDS, TAKE_SECONDS, Yard, freshYard, gooseAfterScene, sameLoc, type Cue, type CueName, type YardSave } from './model'
import { NEST_NODS } from './motion'
import { GRID } from './pairings'
import { BUSHES, FEET, FENCE, FLOOR, HOME, LEG, NEAR, PLACES, PLACE_IDS, ROUND, ROWS, START, SUN, THINGS, THING_GAP, bushAt, gooseAt, inside, type PlaceId, type ThingId } from './yard'

const FRAME = 1 / 60

/** Plays the yard for `seconds` at 60 frames a second and returns the names of the sounds it made. */
function play(yard: Yard, seconds: number, each: () => void = () => {}): CueName[] {
  const heard: CueName[] = []
  for (let t = 0; t < seconds; t += FRAME) {
    yard.step(FRAME)
    for (const cue of yard.takeCues()) heard.push(cue.name)
    each()
  }
  return heard
}

/** A yard with the goose parked on a leg of her round, so a test decides what she can see. */
function yardWith(change: (save: YardSave) => void = () => {}): Yard {
  const save = freshYard()
  change(save)
  return new Yard(save)
}

/** The goose a little way along the third groove, walking right: the left of the yard is behind her for three seconds. */
const behindHer = (save: YardSave): void => { save.goose = { leg: LEG.right, along: 0.2 } }
/** The goose at the left end of her lane in the second groove, looking left along it. */
const lookingLeft = (save: YardSave): void => { save.goose = { leg: LEG.lookLeft, along: 0 } }

/** Where a tap lands to mean a spot of floor in a groove. */
const floorAt = (x: number, row: number): { x: number; y: number } => ({ x, y: ROWS[row] - 34 })
const thingAt = (yard: Yard, id: ThingId): { x: number; y: number } => { const at = yard.seenAt(id); return { x: at.x, y: at.y - 24 } }
const placeAt = (id: PlaceId): { x: number; y: number } => ({ x: PLACES[id].hit.x + PLACES[id].hit.w / 2, y: PLACES[id].hit.y + PLACES[id].hit.h / 2 })
const curtain = { x: 20, y: 400 }
const door = { x: 1000, y: 330 }

describe('the tap that sends the raccoon', () => {
  it('is answered when the finger lands: the peg, the turn, the ears and the first plucked note, before any time has passed', () => {
    const yard = yardWith()
    yard.press(floorAt(480, 2))
    expect(yard.peg).toEqual({ x: 480, y: ROWS[2], t: 0 })
    expect(yard.raccoon.face).toBe(1)
    expect(yard.stir.perk).toBe(0)
    expect(yard.takeCues()).toEqual([{ name: 'aim', n: 0 }])
  })

  it('answers a tap on a thing, a place or the goose in that frame too, with no peg: the peg is for bare floor', () => {
    const cases: [string, (yard: Yard) => { x: number; y: number }][] = [
      ['a thing', (yard) => thingAt(yard, 'ball')],
      ['a place', () => placeAt('scarecrow')],
      ['the goose', (yard) => ({ x: yard.gooseNow().x, y: yard.gooseNow().y - 100 })],
    ]
    for (const [what, at] of cases) {
      const yard = yardWith(behindHer)
      yard.press(at(yard))
      expect(yard.peg, what).toBeNull()
      expect(yard.stir.perk, what).toBe(0)
      const aim = yard.takeCues().find((cue) => cue.name === 'aim')
      expect(aim?.n, what).toBe(2)
    }
    const carrying = yardWith((save) => { behindHer(save); save.things.ball = { at: 'paws' } })
    carrying.press(placeAt('nest'))
    expect(carrying.takeCues().find((cue) => cue.name === 'aim')?.n).toBe(3)
  })

  it('creeps there in pushes of the wire, one note of the tune for each, and stops on the spot', () => {
    const yard = yardWith(behindHer)
    yard.press(floorAt(480, 2))
    yard.takeCues()
    const heard = play(yard, 3)
    expect(yard.raccoon).toMatchObject({ x: 480, row: 2, mode: 'still' })
    expect(heard.filter((name) => name === 'step').length).toBe(Math.ceil((480 - HOME.x) / 48))
  })

  it('changes groove with a clack and goes round the pond, never through it', () => {
    const yard = yardWith((save) => { save.goose = { leg: LEG.right, along: 0.7 }; save.raccoon = { x: 560, row: 2 } })
    yard.press(floorAt(130, 3))
    const heard = play(yard, 4, () => {
      if (yard.raccoon.row === 3 && yard.raccoon.mode !== 'hop') expect(yard.raccoon.x < 290 || yard.raccoon.x > 595).toBe(true)
    })
    expect(heard).toContain('hop')
    expect(yard.raccoon).toMatchObject({ x: 130, row: 3, mode: 'still' })
  })

  it('lifts a thing it is sent to, and the thing hops under the finger first', () => {
    const yard = yardWith(behindHer)
    yard.press(thingAt(yard, 'ball'))
    expect(yard.moves.ball?.kind).toBe('hop')
    const heard = play(yard, 3)
    expect(yard.carried()).toBe('ball')
    expect(heard).toContain('lift')
    expect(yard.takeDirty()).toBe(2)
  })

  it('sets a carried thing down on bare floor with its own landing, on a free spot beside the raccoon', () => {
    const yard = yardWith((save) => { behindHer(save); save.things.ball = { at: 'paws' } })
    yard.press(floorAt(180, 3))
    const heard = play(yard, 3)
    expect(heard).toContain('land')
    const ball = yard.things.ball
    expect(ball.at).toBe('floor')
    if (ball.at === 'floor') expect(Math.abs(ball.x - yard.raccoon.x)).toBeGreaterThan(40)
  })

  it('keeps what it carries when it is sent into a bush, and is hidden there', () => {
    const yard = yardWith((save) => { save.things.ball = { at: 'paws' }; save.raccoon = { x: 250, row: 1 } })
    yard.press(floorAt(BUSHES[1].x + 30, BUSHES[1].row))
    const heard = play(yard, 2)
    expect(yard.raccoon.x).toBe(BUSHES[1].x)
    expect(yard.hidden).toBe(true)
    expect(yard.carried()).toBe('ball')
    expect(heard).toContain('rustle')
  })

  it('takes out what a place holds with that thing\'s lifting sound, and pokes each empty place in its own way', () => {
    // She walks the third groove and cannot see the back one from there.
    const yard = yardWith((save) => { save.goose = { leg: LEG.right, along: 0.3 }; save.raccoon = { ...PLACES.nest.stand } })
    yard.press(placeAt('nest'))
    const lifted: Cue[] = []
    for (let t = 0; t < 0.6; t += FRAME) { yard.step(FRAME); lifted.push(...yard.takeCues()) }
    expect(yard.carried()).toBe('egg')
    expect(lifted).toContainEqual({ name: 'lift', n: THINGS.indexOf('egg') })
    const pokes = new Set<number>()
    for (const place of PLACE_IDS) {
      const empty = yardWith((save) => { save.goose = { leg: LEG.right, along: 0 }; save.things.egg = { at: 'floor', x: 430, row: 2 }; save.raccoon = { ...PLACES[place].stand } })
      empty.press(placeAt(place))
      empty.step(FRAME)
      const poke = empty.takeCues().find((cue) => cue.name === 'poke')
      expect(poke, place).toBeDefined()
      expect(empty.poked).toBe(place)
      expect(empty.stir.poke).toBeLessThan(0.1)
      pokes.add(poke!.n)
    }
    expect(pokes.size).toBe(PLACE_IDS.length)
  })

  it('follows a finger that drags, does nothing where it arrives until the finger lets go, and stops when the finger is taken away', () => {
    const led = yardWith((save) => { behindHer(save); save.things.ball = { at: 'paws' } })
    led.press(floorAt(240, 2))
    led.lead(floorAt(480, 2))
    play(led, 2)
    expect(led.raccoon.x).toBe(480)
    expect(led.carried()).toBe('ball')
    led.letGo()
    play(led, 0.1)
    expect(led.carried()).toBeNull()

    const taken = yardWith((save) => { behindHer(save); save.things.ball = { at: 'paws' } })
    taken.press(floorAt(240, 2))
    taken.lead(floorAt(500, 2))
    play(taken, 0.3)
    taken.takenAway()
    play(taken, 2)
    expect(taken.raccoon.x).toBeLessThan(500)
    expect(taken.carried()).toBe('ball')
    // No pending aim outlives the touch that made it.
    expect(taken.target).toBeNull()
    expect(taken.leading).toBe(false)
  })

  it('answers a tap on the sky or a curtain as that toy, and moves nothing', () => {
    const yard = yardWith()
    yard.press({ x: 600, y: 140 })
    yard.press(curtain)
    expect(yard.takeCues().map((cue) => cue.name)).toEqual(['cloud', 'curtain'])
    expect(yard.target).toBeNull()
  })

  it('answers a tap on the sun, the tree, the fence, the barn wall and the gilt frame each as itself, and moves nothing', () => {
    const yard = yardWith(behindHer)
    const before = JSON.stringify(yard.things)
    const taps: [{ x: number; y: number }, CueName][] = [
      [{ x: SUN.x + 10, y: SUN.y - 10 }, 'sun'],
      [{ x: 150, y: 100 }, 'apple'],
      [{ x: 780, y: FENCE.top + 20 }, 'fence'],
      [{ x: 900, y: 300 }, 'knock'],
      [{ x: 1080, y: 300 }, 'knock'],
      [{ x: 600, y: FLOOR.bottom + 30 }, 'frame'],
      [{ x: 600, y: 20 }, 'frame'],
    ]
    for (const [at, name] of taps) {
      yard.press(at)
      expect(yard.takeCues().map((cue) => cue.name), name).toEqual([name])
      expect(yard.target, name).toBeNull()
      expect(yard.peg, name).toBeNull()
    }
    // Each has its own stir, started when the finger landed; the knock on the wall is a noise the farmer hears.
    expect([yard.stir.sun, yard.stir.apple, yard.stir.fence, yard.stir.noise, yard.stir.frame]).toEqual([0, 0, 0, 0, 0])
    // The sky beside the barn's roof is not the barn.
    yard.press({ x: 890, y: 150 })
    expect(yard.takeCues().map((cue) => cue.name)).toEqual(['cloud'])
    expect(yard.toy).toMatchObject({ appleX: 150, appleY: 100, fenceX: 780, pelmet: true })
    expect(JSON.stringify(yard.things)).toBe(before)
    // The barn door is still the farmer's, and the sky between the toys is still the clouds'.
    yard.press(door)
    yard.press({ x: 600, y: 140 })
    expect(yard.takeCues().map((cue) => cue.name)).toEqual(['wake', 'cloud'])
  })

  it('gives every drawn part of the setting its own answer: the frame and the curtains where they are drawn, the hills, the barn to its weathercock, the open sky', () => {
    const yard = yardWith(behindHer)
    const taps: [string, { x: number; y: number }, CueName][] = [
      ['a swag of the pelmet', { x: 74, y: 62 }, 'frame'],
      ['a top corner of the pelmet, over the curtain', { x: 10, y: 10 }, 'frame'],
      ['a gilt knob between two swags', { x: 295, y: 50 }, 'frame'],
      ['the curtain under a swag', { x: 30, y: 90 }, 'curtain'],
      ['the curtain where it flares over the floor', { x: 96, y: 716 }, 'curtain'],
      ['the right curtain over the floor', { x: 1090, y: 716 }, 'curtain'],
      ['the tie of the curtain', { x: 84, y: 440 }, 'curtain'],
      ['the apron at its gilt edge', { x: 600, y: 770 }, 'frame'],
      ['the far hills', { x: 350, y: 340 }, 'hill'],
      ['the sky over the hills', { x: 346, y: 200 }, 'cloud'],
      ['the weathercock', { x: 1000, y: 90 }, 'knock'],
      ['the roof of the barn', { x: 940, y: 200 }, 'knock'],
      ['the sky beside the roof', { x: 890, y: 180 }, 'cloud'],
      ['the fence beside the barn', { x: 872, y: 400 }, 'fence'],
      ['the trunk of the tree', { x: 136, y: 330 }, 'apple'],
      ['the top of a bush in the back groove, over the fence', { x: 836, y: 420 }, 'aim'],
    ]
    for (const [what, at, name] of taps) {
      yard.press(at)
      expect(yard.takeCues().map((cue) => cue.name), what).toEqual([name])
    }
    // The floor beside the flare of the curtain is still floor, and the bush is the bush.
    expect(yard.target).toEqual({ kind: 'floor', x: 836, row: 0 })
    yard.press({ x: 140, y: 716 })
    expect(yard.takeCues().map((cue) => cue.name)).toEqual(['aim'])
  })

  it('snaps round with its ears up when the tap lands in the middle of a creep, in that frame', () => {
    const yard = yardWith((save) => { lookingLeft(save); save.raccoon = { x: 600, row: 3 } })
    yard.press(floorAt(940, 3))
    play(yard, 0.35)
    expect(yard.raccoon.mode).not.toBe('still')
    expect(yard.raccoon.face).toBe(1)
    yard.press(floorAt(300, 3))
    expect(yard.raccoon.face).toBe(-1)
    expect(yard.stir.perk).toBe(0)
  })
})

describe('the goose and what she sees', () => {
  it('does not notice a raccoon in the open until the child has touched the screen', () => {
    const yard = yardWith((save) => { lookingLeft(save); save.raccoon = { x: 250, row: 1 } })
    expect(play(yard, 0.9)).not.toContain('notice')
    expect(yard.raccoon).toMatchObject({ x: 250, row: 1 })
  })

  it('notices nothing after the game was parked and came back, until the child touches: a raccoon left in the open is not punted', () => {
    const yard = yardWith((save) => { lookingLeft(save); save.raccoon = { x: 250, row: 1 } })
    yard.press(curtain)
    play(yard, 0.2)
    expect(yard.goose.mode).toBe('take')
    // Parked in the middle of her double-take, and returned: the Mount steps nothing in between.
    yard.putAway()
    const heard = play(yard, 8)
    expect(heard).not.toContain('notice')
    expect(heard).not.toContain('honk')
    expect(yard.raccoon).toMatchObject({ x: 250, row: 1, mode: 'still' })
    // The first touch after the return is when she can see again.
    yard.press(curtain)
    expect(play(yard, 8)).toContain('honk')
  })

  it('does a double-take, honks, and punts it home: the state is home at the honk, and what it carried lies where it stood', () => {
    const yard = yardWith((save) => { lookingLeft(save); save.raccoon = { x: 250, row: 1 }; save.things.boot = { at: 'paws' } })
    yard.press(curtain)
    expect(play(yard, 0.2)).toContain('notice')
    expect(yard.goose.mode).toBe('take')
    const heard = play(yard, TAKE_SECONDS)
    expect(heard).toContain('honk')
    // The outcome is saved when it starts: nothing is in the air in what a save would hold.
    const saved = yard.toSave()
    expect(saved.raccoon).toEqual(HOME)
    expect(saved.things.boot).toMatchObject({ at: 'floor', row: 1 })
    expect(yard.takeDirty()).toBe(2)
    expect(yard.raccoon.mode).toBe('shock')
    const rest = play(yard, HONK_SECONDS + 0.5 + 0.3 + FLY_SECONDS + 0.2)
    expect(rest).toEqual(expect.arrayContaining(['kick', 'land', 'crash', 'gloat']))
    expect(yard.hidden).toBe(true)
    play(yard, 8)
    expect(yard.goose.mode).toBe('round')
  })

  it('lets off a raccoon that gets into a bush before the double-take runs out', () => {
    const yard = yardWith((save) => { lookingLeft(save); save.raccoon = { x: BUSHES[1].x - 60, row: 1 } })
    yard.press(floorAt(BUSHES[1].x, 1))
    const heard = play(yard, 1.5)
    expect(heard).toContain('notice')
    expect(heard).toContain('hmph')
    expect(heard).not.toContain('honk')
    expect(yard.raccoon.x).toBe(BUSHES[1].x)
  })

  it('never sees a raccoon behind her, in a bush, or two grooves away', () => {
    const behind = yardWith((save) => { save.goose = { leg: LEG.right, along: 0.5 }; save.raccoon = { x: 500, row: 2 } })
    behind.press(curtain)
    expect(play(behind, 0.5)).not.toContain('notice')
    const far = yardWith((save) => { lookingLeft(save); save.raccoon = { x: 200, row: 3 } })
    far.press(curtain)
    expect(play(far, 0.9)).not.toContain('notice')
    const hidden = yardWith((save) => { lookingLeft(save); save.raccoon = { x: BUSHES[1].x, row: 1 } })
    hidden.press(curtain)
    expect(play(hidden, 0.9)).not.toContain('notice')
  })

  it('has her tail plucked by a raccoon that reaches it unseen: she jumps, spins and faces the pluck', () => {
    const yard = yardWith((save) => { save.goose = { leg: LEG.right, along: 0.3 }; save.raccoon = { x: 460, row: 2 } })
    const goose = gooseAt(LEG.right, 0.3)
    yard.press({ x: goose.x, y: goose.y - 100 })
    expect(yard.target).toEqual({ kind: 'goose' })
    let waited = 0
    while (waited < 3 && yard.goose.mode !== 'startled') { yard.step(FRAME); waited += FRAME }
    expect(yard.takeCues().map((cue) => cue.name)).toContain('pluck')
    expect(yard.goose.mode).toBe('startled')
    expect(yard.raccoon.mode).toBe('still')
    // Still standing in the open behind her, the raccoon is in front of her eyes once she has spun round.
    expect(play(yard, 3)).toContain('honk')
    expect(yard.gooseNow().face).toBe(-1)
  })

  it('ends a punt on any touch, quietly, with the raccoon home', () => {
    const yard = yardWith((save) => { lookingLeft(save); save.raccoon = { x: 250, row: 1 } })
    yard.press(curtain)
    play(yard, TAKE_SECONDS + 0.3)
    expect(yard.raccoon.mode).toBe('shock')
    yard.takeCues()
    yard.press(floorAt(HOME.x, HOME.row))
    expect(yard.raccoon.mode).not.toBe('shock')
    const heard = yard.takeCues().map((cue) => cue.name)
    expect(heard).not.toContain('crash')
    // What the punt still had sounding is hushed with it.
    expect(heard[0]).toBe('hush')
    expect(yard.raccoon).toMatchObject({ x: HOME.x, row: HOME.row })
  })

  it('looks into the nest at every lap: a cluck with each nod for her egg, one puzzled honk for an empty nest, nothing for anything else', () => {
    const lap = ROUND.reduce((sum, leg) => sum + leg.seconds, 0)
    const withEgg = yardWith()
    const heard = play(withEgg, lap * 2 + 0.2)
    expect(heard.filter((name) => name === 'nestCluck')).toHaveLength(NEST_NODS.length * 2)
    expect(heard).not.toContain('nestPuzzled')

    const empty = yardWith((save) => { save.things.egg = { at: 'floor', x: 300, row: 3 } })
    const puzzled = play(empty, lap + 0.2)
    expect(puzzled.filter((name) => name === 'nestPuzzled')).toHaveLength(1)
    expect(puzzled).not.toContain('nestCluck')

    const other = yardWith((save) => { save.things.egg = { at: 'floor', x: 300, row: 3 }; save.things.ball = { at: 'nest' } })
    const quiet = play(other, lap + 0.2)
    expect(quiet).not.toContain('nestCluck')
    expect(quiet).not.toContain('nestPuzzled')
  })

  it('makes no sound at the nest when she is found in the middle of her look there, or is interrupted in it', () => {
    const found = yardWith((save) => { save.goose = { leg: LEG.nest, along: 0.1 } })
    expect(found.goose.nestSaw).toBeNull()
    expect(play(found, 1.4)).not.toContain('nestCluck')
    // Stopped by the sight of a raccoon before her first nod, she clucks at nothing.
    const stopped = yardWith((save) => { save.goose = { leg: LEG.toNest, along: 0.999 }; save.raccoon = { x: 560, row: 1 } })
    stopped.press(curtain)
    const heard = play(stopped, 0.5)
    expect(heard).toContain('notice')
    expect(heard).not.toContain('nestCluck')
  })

  it('waits, before the first touch, rather than walk into a raccoon that was left standing in her lane', () => {
    const yard = yardWith((save) => { save.goose = { leg: LEG.left, along: 0 }; save.raccoon = { x: 540, row: 1 } })
    play(yard, 6, () => {
      const goose = yard.gooseNow()
      if (goose.row === yard.raccoon.row) expect(Math.abs(goose.x - yard.raccoon.x)).toBeGreaterThanOrEqual(NEAR - 2)
    })
    expect(yard.raccoon).toMatchObject({ x: 540, row: 1, mode: 'still' })
  })
})

describe('a game parked with an errand under way', () => {
  it('drops the errand as a load does: back again, the raccoon starts no pairing and keeps what it carries until a touch', () => {
    const yard = yardWith((save) => { lookingLeft(save); save.things.ball = { at: 'paws' }; save.raccoon = { x: 600, row: 3 } })
    yard.press(placeAt('bowl'))
    play(yard, 0.4)
    expect(yard.target).not.toBeNull()
    yard.putAway()
    expect(yard.target).toBeNull()
    const heard = play(yard, 12)
    expect(yard.scene).toBeNull()
    expect(yard.things.ball).toEqual({ at: 'paws' })
    expect(yard.raccoon.mode).toBe('still')
    expect(heard).not.toContain('goesIn')
    // The same tap again, by the child, is what starts it.
    yard.press(placeAt('bowl'))
    play(yard, 12, () => { if (yard.scene) expect(yard.things.ball).toEqual({ at: 'bowl' }) })
    expect(yard.things.ball).toEqual({ at: 'bowl' })
  })
})

describe('the boot hat on an empty scarecrow', () => {
  const copyOf = (yard: Yard): Yard => new Yard(JSON.parse(JSON.stringify(yard.toSave())) as YardSave)
  /** Plays until `done`, a punt or `seconds`, and says which. */
  function until(yard: Yard, seconds: number, done: (yard: Yard) => boolean): 'done' | 'punted' | 'late' {
    for (let t = 0; t < seconds; t += FRAME) {
      yard.step(FRAME)
      if (yard.takeCues().some((cue) => cue.name === 'honk')) return 'punted'
      if (done(yard)) return 'done'
    }
    return 'late'
  }
  const atRest = (yard: Yard): boolean => yard.goose.mode === 'round' && yard.raccoon.mode === 'still' && !yard.scene

  /**
   * A child who has learnt the yard: it makes a tap when the goose will not catch the raccoon on the way, hides in a
   * bush to wait for such a moment, and else waits. Each tap is tried first on a copy of the yard as it stands.
   */
  function errand(yard: Yard, at: (yard: Yard) => { x: number; y: number }, done: (yard: Yard) => boolean): void {
    for (let waited = 0; waited < 400; waited++) {
      if (atRest(yard)) {
        const direct = copyOf(yard)
        direct.press(at(direct))
        if (until(direct, 9, done) === 'done') {
          yard.press(at(yard))
          expect(until(yard, 9, done)).toBe('done')
          return
        }
        // From which bush, after how long a wait there, would the tap get through?
        const hide = BUSHES.find((bush) => {
          if (bush.x === yard.raccoon.x && bush.row === yard.raccoon.row) return false
          const there = copyOf(yard)
          there.press(floorAt(bush.x, bush.row))
          if (until(there, 7, (y) => y.raccoon.mode === 'still' && y.raccoon.x === bush.x && y.raccoon.row === bush.row) !== 'done') return false
          for (let wait = 0; wait < 10; wait++) {
            if (atRest(there)) {
              const from = copyOf(there)
              from.press(at(from))
              if (until(from, 9, done) === 'done') return true
            }
            if (until(there, 0.8, () => false) === 'punted') return false
          }
          return false
        })
        if (hide) {
          yard.press(floorAt(hide.x, hide.row))
          expect(until(yard, 7, (y) => y.raccoon.mode === 'still' && y.raccoon.x === hide.x && y.raccoon.row === hide.row)).toBe('done')
          continue
        }
      }
      play(yard, 0.4)
    }
    throw new Error('the way was never clear')
  }

  /** Has the raccoon fetch a thing and take it to a place, and returns the plan of the scene that starts, played to its end. */
  function carry(yard: Yard, thing: ThingId, place: PlaceId): NonNullable<Yard['scene']>['plan'] {
    let plan: NonNullable<Yard['scene']>['plan'] | null = null
    for (let tries = 0; tries < 12 && !plan; tries++) {
      // A punt on the way drops the thing where the raccoon stood: it is fetched again.
      if (yard.carried() !== thing) errand(yard, (y) => thingAt(y, thing), (y) => y.carried() === thing)
      errand(yard, () => placeAt(place), (y) => y.scene !== null)
      plan = yard.scene?.plan ?? null
    }
    expect(plan, `${thing} to ${place}`).not.toBeNull()
    // The scene plays to its end, untouched.
    while (yard.scene) yard.step(FRAME)
    yard.takeCues()
    return plan!
  }

  it('plays its full cell in the sequence the status block says to try first: the ball in the pond, the potato on the line, then the boot to the scarecrow', () => {
    const yard = yardWith()
    expect(carry(yard, 'ball', 'pond').round).toBe(false)
    expect(carry(yard, 'potato', 'line').round).toBe(false)
    const plan = carry(yard, 'boot', 'scarecrow')
    // The scarecrow was empty: a pairing, in full, though the goose's splash sends the ball on to the dog's bowl.
    expect(plan.round).toBe(false)
    const cell = GRID.boot.scarecrow
    expect(plan.timed[0]).toMatchObject({ thing: 'boot', place: 'scarecrow', sends: null, w0: 0, w1: cell.ends })
    const sounds = plan.sounds.map((sound) => sound.sound)
    for (const act of cell.acts) if (act.sound) expect(sounds, act.sound).toContain(act.sound)
    // The ball the splash tipped out plays its short form at the bowl after it, and nothing is lost.
    expect(plan.timed[1]).toMatchObject({ thing: 'ball', place: 'bowl', from: 'splash' })
    expect(plan.timed[1].w1 - plan.timed[1].w0).toBeLessThan(GRID.ball.bowl.ends)
    expect(plan.total).toBeLessThanOrEqual(10)
    expect(yard.things).toMatchObject({ boot: { at: 'scarecrow' }, ball: { at: 'bowl' }, potato: { at: 'line' } })
  })
})

describe('after a scene', () => {
  it('ends every pairing and every round, from every yard state and in every way a scene can end, with the raccoon under no drawn shape of the goose and four seconds before she can notice it', () => {
    const underHer = (yard: Yard): boolean => yard.watching && yard.gaze().some((shape) => inside(shape, yard.raccoon.x, ROWS[yard.raccoon.row] - FEET))
    const wrong: string[] = []
    let pairings = 0, rounds = 0, bolts = 0
    /** At this moment she does not have the raccoon under her wedge or her patch, and for four seconds with no touch she notices nothing. */
    const clear = (yard: Yard, what: string): void => {
      if (yard.scene) wrong.push(`${what}: the scene is not over`)
      if (yard.gooseNow().x !== gooseAt(yard.goose.leg, yard.goose.along).x) wrong.push(`${what}: she is not on her round`)
      if (underHer(yard)) wrong.push(`${what}: under her shape as the scene ends`)
      yard.takeCues()
      for (let t = 0; t < 4; t += FRAME) {
        yard.step(FRAME)
        if (underHer(yard)) { wrong.push(`${what}: under her shape ${t.toFixed(1)} s after`); break }
      }
      const heard = yard.takeCues().map((cue) => cue.name)
      if (heard.includes('notice') || heard.includes('honk')) wrong.push(`${what}: ${heard.filter((name) => name === 'notice' || name === 'honk').join(' ')}`)
    }
    for (const place of PLACE_IDS) for (const thing of THINGS) {
      const others = THINGS.filter((id) => id !== thing)
      // Every way the five places can be full or empty, the bowl and the pond among them, with two layouts of the other things.
      for (let full = 0; full < 1 << PLACE_IDS.length; full++) for (const turn of [0, 2]) {
        const save = freshYard()
        others.forEach((id, i) => { save.things[id] = { at: 'floor', x: 130 + i * 190, row: place === 'pond' || place === 'bowl' ? 0 : 3 } })
        let n = 0
        PLACE_IDS.forEach((id, i) => { if (full & (1 << i)) save.things[others[(n++ + turn) % others.length]] = { at: id } })
        save.things[thing] = { at: 'paws' }
        save.raccoon = { ...PLACES[place].stand }
        // The worst case: she is about to look straight at the place when the scene starts.
        save.goose = PLACES[place].stand.row <= 1 ? { leg: LEG.lookLeft, along: 0.9 } : { leg: LEG.lookRight, along: 0.9 }
        const what = `${thing} to ${place}, places full ${full.toString(2).padStart(5, '0')}, turn ${turn}`
        const started = (): Yard => {
          const yard = new Yard(JSON.parse(JSON.stringify(save)) as YardSave)
          yard.press(placeAt(place))
          for (let t = 0; t < 2 && !yard.scene; t += FRAME) yard.step(FRAME)
          return yard
        }
        // Played to its end.
        const played = started()
        if (!played.scene) { wrong.push(`${what}: no scene`); continue }
        const plan = played.scene.plan
        if (plan.round) rounds++; else pairings++
        if (plan.bolts) bolts++
        if (JSON.stringify({ leg: played.goose.leg, along: played.goose.along }) !== JSON.stringify(gooseAfterScene(place))) wrong.push(`${what}: she is saved somewhere else`)
        while (played.scene) played.step(FRAME)
        clear(played, `${what}, played out`)
        // The other ways a scene can end leave her at the same saved spot: one layout of each state is walked through them.
        if (turn) continue
        // Cut short by a touch that sends the raccoon nowhere.
        const cut = started()
        for (let t = 0; t < 0.6; t += FRAME) cut.step(FRAME)
        cut.press(curtain)
        clear(cut, `${what}, ended by a touch`)
        // Put away in the middle and come back, and loaded from what was saved as it started: the child's first touch wakes her.
        const parked = started()
        for (let t = 0; t < 0.6; t += FRAME) parked.step(FRAME)
        parked.putAway()
        parked.press(curtain)
        clear(parked, `${what}, parked`)
        const loaded = new Yard(JSON.parse(JSON.stringify(started().toSave())) as YardSave)
        loaded.press(curtain)
        clear(loaded, `${what}, loaded`)
      }
    }
    expect(wrong.slice(0, 12)).toEqual([])
    // The walk reached single pairings, rounds, and the boot hat's dive from both.
    expect(pairings).toBeGreaterThan(100)
    expect(rounds).toBeGreaterThan(100)
    expect(bolts).toBeGreaterThan(20)
  })
})

describe('a tap on the goose when she is not walking her round', () => {
  it('ruffles her in a double-take and in the glare after a pluck, with her feathers, and lays no peg at her feet and sends the raccoon nowhere', () => {
    // In a double-take: the raccoon stands in the open in front of her.
    const taking = yardWith((save) => { lookingLeft(save); save.raccoon = { x: 250, row: 1 } })
    taking.press(curtain)
    while (taking.goose.mode !== 'take') taking.step(FRAME)
    // After a pluck: startled, then glaring.
    const plucked = yardWith((save) => { save.goose = { leg: LEG.right, along: 0.3 }; save.raccoon = { x: 460, row: 2 } })
    const on = gooseAt(LEG.right, 0.3)
    plucked.press({ x: on.x, y: on.y - 100 })
    while (plucked.goose.mode !== 'startled') plucked.step(FRAME)
    const glaring = yardWith((save) => { save.goose = { leg: LEG.right, along: 0.3 }; save.raccoon = { x: 460, row: 2 } })
    glaring.press({ x: on.x, y: on.y - 100 })
    while (glaring.goose.mode !== 'glare') glaring.step(FRAME)
    for (const [what, yard] of [['a double-take', taking], ['startled', plucked], ['a glare', glaring]] as const) {
      yard.takeCues()
      const goose = yard.gooseNow(), before = JSON.stringify(yard.target)
      yard.press({ x: goose.x, y: goose.y - 100 })
      expect(yard.takeCues().map((cue) => cue.name), what).toEqual(['ruffle'])
      expect(yard.stir.ruffle, what).toBe(0)
      expect(yard.peg, what).toBeNull()
      expect(JSON.stringify(yard.target), what).toBe(before)
    }
  })
})

describe('a tap on a place whose own pairing is playing', () => {
  const carrying = (thing: ThingId, place: PlaceId, more: (save: YardSave) => void = () => {}): Yard => yardWith((save) => {
    save.raccoon = { ...PLACES[place].stand }
    save.things[thing] = { at: 'paws' }
    save.goose = PLACES[place].stand.row <= 1 ? { leg: LEG.right, along: 0.1 } : { leg: LEG.toNest, along: 0 }
    more(save)
  })

  it('only ends the pairing: the thing stays in, the raccoon is sent nowhere and takes nothing out, at every place', () => {
    for (const place of PLACE_IDS) {
      const yard = carrying('ball', place)
      yard.press(placeAt(place))
      play(yard, 1)
      expect(yard.scene, place).not.toBeNull()
      yard.takeCues()
      yard.press(placeAt(place))
      expect(yard.scene, place).toBeNull()
      expect(yard.takeCues(), place).toEqual([{ name: 'hush', n: 0 }])
      expect(yard.target, place).toBeNull()
      expect(yard.stir.place[place], place).toBe(0)
      const heard = play(yard, 3)
      expect(yard.things.ball, place).toEqual({ at: place })
      expect(yard.carried(), place).toBeNull()
      expect(heard, place).not.toContain('lift')
      // Once the pairing is over, the same tap is an ordinary one and takes the thing out.
      yard.press(placeAt(place))
      play(yard, 0.5)
      expect(yard.carried(), place).toBe('ball')
    }
  })

  it('holds for the place a round has reached too, and a tap on any other place stays an ordinary touch', () => {
    // The ball goes into a full nest: the potato is tipped on into the pond, whose pairing plays second.
    const round = carrying('ball', 'nest', (save) => { save.things.egg = { at: 'floor', x: 180, row: 3 }; save.things.potato = { at: 'nest' } })
    round.press(placeAt('nest'))
    let guard = 0
    while (!(round.scene && round.scene.plan.timed.length === 2 && round.scene.t > round.scene.plan.timed[1].at + 0.2) && guard++ < 2000) round.step(FRAME)
    expect(round.scene).not.toBeNull()
    round.press(placeAt('pond'))
    expect(round.scene).toBeNull()
    expect(round.target).toBeNull()
    expect(round.things.potato).toEqual({ at: 'pond' })

    const other = carrying('ball', 'nest', (save) => { save.things.egg = { at: 'floor', x: 180, row: 3 }; save.things.potato = { at: 'pond' } })
    other.press(placeAt('nest'))
    play(other, 1)
    other.press(placeAt('pond'))
    expect(other.scene).toBeNull()
    expect(other.target).toEqual({ kind: 'place', id: 'pond' })
  })
})

describe('the farmer', () => {
  const messy = (save: YardSave): void => { save.things.ball = { at: 'paws' }; save.things.egg = { at: 'floor', x: 430, row: 2 }; save.goose = { leg: LEG.hopFront, along: 0 } }

  it('only wakes at one tap on the barn door: nothing is moved, and he dozes off again', () => {
    const yard = yardWith(messy)
    yard.press(door)
    expect(yard.takeCues()).toEqual([{ name: 'wake', n: 0 }])
    expect(yard.tidy.t).toBe(-1)
    expect(yard.carried()).toBe('ball')
    expect(yard.takeDirty()).toBe(0)
    play(yard, AWAKE_SECONDS + 0.1)
    expect(yard.tidy.awake).toBe(0)
    // Asleep again, the next tap only wakes him again.
    yard.press(door)
    expect(yard.tidy.t).toBe(-1)
    expect(yard.carried()).toBe('ball')
  })

  it('tidies at a second tap while he is awake: the door bangs as the finger lands, the state is tidy at once, he whistles two notes, and each thing goes home with its own lifting sound, the egg last', () => {
    const yard = yardWith(messy)
    yard.press(door)
    play(yard, 0.6)
    yard.takeCues()
    yard.press(door)
    expect(yard.takeCues()).toEqual([{ name: 'door', n: 0 }])
    for (const id of THINGS) expect(sameLoc(yard.things[id], START[id]), id).toBe(true)
    expect(yard.takeDirty()).toBe(2)
    expect(yard.moves.ball?.kind).toBe('whisk')
    const heard: Cue[] = []
    for (let t = 0; t < 4; t += FRAME) { yard.step(FRAME); heard.push(...yard.takeCues()) }
    expect(heard.filter((cue) => cue.name === 'whistle')).toEqual([{ name: 'whistle', n: 1 }])
    expect(heard.filter((cue) => cue.name === 'lift')).toEqual([{ name: 'lift', n: THINGS.indexOf('ball') }, { name: 'lift', n: THINGS.indexOf('egg') }])
    expect(yard.tidy.t).toBe(-1)
    expect(yard.moves.ball).toBeUndefined()
  })

  it('lets one falling note go when there is nothing to tidy, and saves nothing', () => {
    const yard = yardWith()
    yard.press(door)
    yard.press(door)
    yard.takeDirty()
    const heard: Cue[] = []
    for (let t = 0; t < 2.5; t += FRAME) { yard.step(FRAME); heard.push(...yard.takeCues()) }
    expect(heard.filter((cue) => cue.name === 'whistle')).toEqual([{ name: 'whistle', n: 0 }])
    expect(heard.some((cue) => cue.name === 'lift')).toBe(false)
    expect(yard.tidy.t).toBe(-1)
  })

  it('gives way to a touch: the things are home, the whistle that had not sounded never does, and the touch is an ordinary one', () => {
    const yard = yardWith((save) => { save.things.ball = { at: 'floor', x: 700, row: 1 } })
    yard.press(door)
    yard.press(door)
    play(yard, 0.2)
    yard.takeCues()
    yard.press(floorAt(460, 2))
    expect(yard.tidy.t).toBe(-1)
    expect(yard.moves.ball).toBeUndefined()
    expect(yard.target).toEqual({ kind: 'floor', x: 460, row: 2 })
    expect(yard.takeCues()[0]).toEqual({ name: 'hush', n: 0 })
    const after = play(yard, 2)
    expect(after).not.toContain('whistle')
    expect(after).not.toContain('lift')
    // Ended by a touch, he is not left awake: the next tap on the door only wakes him.
    yard.press(door)
    expect(yard.tidy.t).toBe(-1)
  })

  it('is not awake when the yard is opened, so no tap on the door tidies by itself', () => {
    const yard = yardWith(messy)
    expect(yard.tidy.awake).toBe(0)
    yard.press(door)
    expect(yard.carried()).toBe('ball')
  })
})

describe('found as left', () => {
  it('saves a raccoon caught in the middle of a creep where it has got to, with what it carries in its paws', () => {
    const yard = yardWith((save) => { behindHer(save); save.things.potato = { at: 'paws' } })
    yard.press(floorAt(450, 2))
    play(yard, 0.5)
    const saved = JSON.parse(JSON.stringify(yard.toSave())) as YardSave
    expect(saved.raccoon.row).toBe(2)
    expect(saved.raccoon.x).toBeGreaterThan(HOME.x)
    expect(saved.things.potato).toEqual({ at: 'paws' })
    const again = new Yard(saved)
    expect(again.raccoon.mode).toBe('still')
    expect(again.target).toBeNull()
    expect(again.carried()).toBe('potato')
  })

  it('finds the goose where she was on her round', () => {
    const yard = yardWith()
    play(yard, 3.3)
    const again = new Yard(JSON.parse(JSON.stringify(yard.toSave())) as YardSave)
    expect(again.gooseNow().x).toBeCloseTo(yard.gooseNow().x, 0)
    expect(again.gooseNow().row).toBe(yard.gooseNow().row)
  })

  it('starts with every short-lived thing at rest: no stir, no peg, no farmer awake, no scene', () => {
    const yard = yardWith((save) => { save.things.ball = { at: 'bowl' } })
    for (const value of [yard.stir.perk, yard.stir.poke, yard.stir.noise, yard.stir.feather, yard.stir.crash, yard.stir.curtain]) expect(value).toBeGreaterThan(10)
    expect(yard.peg).toBeNull()
    expect(yard.tidy).toMatchObject({ t: -1, awake: 0 })
    expect(yard.scene).toBeNull()
    expect(yard.takeCues()).toEqual([])
  })
})

describe('nothing is laid on anything, and no card slides onto another', () => {
  it('keeps every thing clear of the bushes, the places it is reached from and each other, and the raccoon clear of the goose in one groove, through a long run of carrying about', () => {
    let s = 20261011
    const next = (): number => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296 }
    const yard = yardWith()
    let scenes = 0
    for (let turn = 0; turn < 220; turn++) {
      const carried = yard.carried()
      const roll = next()
      if (carried && roll < 0.35) yard.press(floorAt(100 + next() * 980, Math.floor(next() * 4)))
      else if (carried || roll < 0.25) yard.press(placeAt(PLACE_IDS[Math.floor(next() * PLACE_IDS.length)]))
      else {
        const id = THINGS[Math.floor(next() * THINGS.length)]
        if (yard.things[id].at === 'floor') yard.press(thingAt(yard, id))
        else yard.press(placeAt(PLACE_IDS[Math.floor(next() * PLACE_IDS.length)]))
      }
      play(yard, 2 + next() * 6, () => {
        if (yard.scene) scenes++
        const r = yard.raccoon, mode = yard.goose.mode
        const stands = mode === 'round' || mode === 'take' || mode === 'relax' || mode === 'glare' || mode === 'startled'
        const goose = yard.gooseNow()
        if (stands && (r.mode === 'still' || r.mode === 'push') && ROUND[yard.goose.leg].kind !== 'hop' && goose.row === r.row) {
          expect(Math.abs(goose.x - r.x), `the raccoon on the goose on turn ${turn}`).toBeGreaterThanOrEqual(NEAR - 26)
        }
      })
      const lying = THINGS.map((id) => yard.things[id]).filter((loc) => loc.at === 'floor')
      for (const a of lying) {
        if (a.at !== 'floor') continue
        expect(bushAt(a.x, a.row, 60), `a thing in a bush on turn ${turn}`).toBe(-1)
        for (const id of PLACE_IDS) if (PLACES[id].stand.row === a.row) expect(Math.abs(PLACES[id].stand.x - a.x), `a thing where the raccoon stands on turn ${turn}`).toBeGreaterThanOrEqual(44)
        for (const b of lying) if (b.at === 'floor' && a !== b && a.row === b.row) expect(Math.abs(a.x - b.x), `two things on turn ${turn}`).toBeGreaterThanOrEqual(THING_GAP)
      }
      expect(THINGS.filter((id) => yard.things[id].at === 'paws').length).toBeLessThanOrEqual(1)
      for (const place of PLACE_IDS) expect(THINGS.filter((id) => yard.things[id].at === place).length, place).toBeLessThanOrEqual(1)
    }
    expect(scenes).toBeGreaterThan(100)
  }, 60000)
})
