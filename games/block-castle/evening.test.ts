import { describe, expect, it } from 'vitest'
import type { Ray } from './aim'
import { KINDS, PER_KIND, type Kind, type Placed } from './blocks'
import { FLAG, LADDER_OFF, ROOF_OUT, restsFor, things } from './castle'
import { deserialize, serialize } from './castleState'
import { FALL_SECONDS, RETURN_SECONDS, dayStance } from './evening'
import { WHO } from './folk'
import { BASKET, BELL, FOLK, OFFER, RUG, SIZE, placeX, placeZ } from './layout'
import { MOUTH, Play, TIDY_LEAST, type PlayEvent } from './play'

const at = (kind: Kind, col: number, row: number): Placed => ({ kind, col, row })
const down = (x: number, z: number): Ray => ({ origin: [x, 12, z], dir: [0, -1, 0] })
const overBell = (): Ray => down(BELL.x, BELL.z)
/** A finger on the wicker of the basket's side, as the child sees it from the rug. */
const onWicker = (): Ray => ({ origin: [0, 0.4, BASKET.z + 1.7], dir: [1, 0, 0] })

function run(play: Play, seconds: number): PlayEvent[] {
  const events: PlayEvent[] = []
  for (let i = 0; i < Math.round(seconds * 60); i++) { play.advance(1 / 60); events.push(...play.take()) }
  return events
}
const types = (events: readonly PlayEvent[]): string[] => events.map((event) => event.type)

/** One of each kind, with room for each of the folk: a room on the rug with free places beside it, an arch with nothing in front of it. */
const CASTLE: Placed[] = [at('cube', 0, 1), at('arch', 3, 0), at('thin', 0, 0), at('round', 6, 0), at('slope', 0, 2), at('long', 4, 0), at('round', 2, 0), at('cube', 6, 1)]
const afternoon = (rug: Placed[] = CASTLE): Play => new Play(rug, 1)
const eveningOf = (rug: Placed[] = CASTLE): Play => new Play(rug, 1, true)
const overThing = (play: Play, index: number): Ray => down(play.evening.things[index].x, play.evening.things[index].z)
const where = (play: Play): number[][] => WHO.map((who) => [...play.evening.actors[who].placing.at])
const restAt = (rug: Placed[]): number[][] => WHO.map((who) => [...restsFor(rug)[who].at])

describe('the bell in the afternoon', () => {
  it('rings under the finger, and evening is the outcome at once', () => {
    const play = afternoon()
    play.press(overBell())
    expect(types(play.take())).toEqual(['bell'])
    // Saved now: a put-away in the next moment finds the evening.
    expect(play.finished).toBe(true)
    expect(play.takeSaveNow()).toBe(true)
    expect(play.takeSaveNow()).toBe(false)
    expect(play.rug()).toEqual(CASTLE)
    // Seen later: the sun has not sunk yet, and nothing has become anything.
    expect(play.evening.dusk).toBe(0)
    expect(play.evening.dress.every((dress) => dress === 0)).toBe(true)
    expect(play.sceneRunning).toBe(true)
  })

  it('plays evening falls: the sun sinks, each block becomes its thing in the order it was set down, and the folk go in', () => {
    const play = afternoon()
    play.press(overBell())
    const events = [...play.take(), ...run(play, FALL_SECONDS + 0.5)]
    expect(play.sceneRunning).toBe(false)
    expect(play.evening.dusk).toBe(1)
    expect(play.evening.dress).toEqual(CASTLE.map(() => 1))
    // Each with the sound of its own cell, in the order of the list.
    const became = events.filter((event) => event.type === 'become')
    expect(became.map((event) => event.type === 'become' && event.what)).toEqual(['room', 'gate', 'pole', 'tower', 'slide', 'bridge', 'tower', 'room'])
    // The arch and the round one that carry the long one have something on them: that round one gets battlements, the other a roof.
    expect(became.map((event) => event.type === 'become' && event.capped)).toEqual([false, true, false, true, false, false, false, false])
    expect(types(events)).toContain('dusk')
    // They go in by the gate, since there is one, the king first.
    const doors = events.filter((event) => event.type === 'door')
    expect(doors.map((event) => event.type === 'door' && event.who)).toEqual(['king', 'cook', 'dragon'])
    expect(types(events)).not.toContain('window')
    // And come to rest where their tastes send them.
    expect(where(play)).toEqual(restAt(CASTLE))
    expect(restsFor(CASTLE).king.how).toBe('seat')
    expect(restsFor(CASTLE).cook.how).toBe('window')
    expect(restsFor(CASTLE).dragon.how).toBe('gate')
    expect(play.rug()).toEqual(CASTLE)
  })

  it('sets the king and the cook on a room for a window when no arch stands on the rug, and leaves the dragon where he lies', () => {
    const rug = [at('cube', 3, 1), at('round', 6, 0)]
    const play = afternoon(rug)
    play.press(overBell())
    const events = run(play, FALL_SECONDS + 0.5)
    expect(types(events)).not.toContain('door')
    expect(events.filter((event) => event.type === 'window').map((event) => event.type === 'window' && event.who)).toEqual(['king', 'cook'])
    // The dragon has nothing to his taste and stays where he is.
    expect(play.evening.actors.dragon.placing.at).toEqual(dayStance('dragon').at)
  })

  it('is ended by a touch, with everything where it was going and none of its sounds', () => {
    const play = afternoon()
    play.press(overBell())
    run(play, 1.5)
    play.press(down(-7.5, 3.4))
    const events = play.take()
    // The touch itself is answered as any touch on the boards is.
    expect(types(events)).toEqual(['pat'])
    expect(play.sceneRunning).toBe(false)
    expect(play.evening.dusk).toBe(1)
    expect(play.evening.dress).toEqual(CASTLE.map(() => 1))
    expect(where(play)).toEqual(restAt(CASTLE))
    expect(run(play, 3).filter((event) => event.type !== 'taste')).toEqual([])
  })

  it('does not turn straight back when the same ring is tapped twice', () => {
    const play = afternoon()
    play.press(overBell())
    run(play, 0.2)
    play.press(overBell())
    expect(types(play.take())).toEqual(['bell'])
    expect(play.finished).toBe(true)
    // Later it is an ordinary touch on the bell again.
    run(play, 2)
    play.press(overBell())
    expect(play.finished).toBe(false)
  })

  it('falls on a bare rug too: the king sits on the dragon', () => {
    const play = afternoon([])
    play.press(overBell())
    run(play, FALL_SECONDS + 0.5)
    expect(play.finished).toBe(true)
    expect(play.evening.actors.king.placing.at[1]).toBeGreaterThan(0.5)
    expect(Math.abs(play.evening.actors.king.placing.at[2] - FOLK.dragon.z)).toBeLessThan(0.1)
  })
})

describe('found as left', () => {
  it('opens on the evening castle in its first state, the folk in their places, and no scene', () => {
    const play = eveningOf()
    expect(play.finished).toBe(true)
    expect(play.sceneRunning).toBe(false)
    expect(play.busy).toBe(false)
    expect(play.evening.dusk).toBe(1)
    expect(play.evening.dress).toEqual(CASTLE.map(() => 1))
    expect(where(play)).toEqual(restAt(CASTLE))
    expect(play.take()).toEqual([])
    expect(run(play, 3).filter((event) => event.type !== 'taste')).toEqual([])
    expect(play.takeSaveNow()).toBe(false)
  })

  it('goes through storage: the evening and the rug come back as they were put away, mid scene or not', () => {
    const play = afternoon()
    play.press(overBell())
    run(play, 0.5)
    const stored = JSON.parse(JSON.stringify(serialize({ ...deserialize(null, 3), blocks: play.rug(), finished: play.finished })))
    const back = deserialize(stored, 3)
    expect(back.finished).toBe(true)
    expect(back.blocks).toEqual(CASTLE)
    const again = new Play(back.blocks, 1, back.finished)
    expect(again.sceneRunning).toBe(false)
    expect(again.evening.dusk).toBe(1)
  })

  it('keeps nothing of an evening tap: the castle opens in its first state', () => {
    const play = eveningOf()
    const pole = CASTLE.findIndex((block) => block.kind === 'thin')
    const first = play.evening.flagColour[pole]
    play.press(overThing(play, pole))
    expect(play.evening.flagColour[pole]).not.toBe(first)
    expect(play.takeSaveNow()).toBe(false)
    expect(eveningOf().evening.flagColour[pole]).toBe(first)
  })
})

describe('the bell in the evening', () => {
  it('brings the afternoon back: saved at once, the folk hop home, the castle turns back into blocks from the top down', () => {
    const play = eveningOf()
    play.press(overBell())
    expect(play.finished).toBe(false)
    expect(play.takeSaveNow()).toBe(true)
    expect(play.evening.dusk).toBe(1)
    const events = [...play.take(), ...run(play, RETURN_SECONDS + 0.5)]
    expect(types(events).filter((type) => type === 'bell')).toHaveLength(1)
    const undone = events.filter((event) => event.type === 'unbecome')
    expect(undone).toHaveLength(CASTLE.length)
    // The highest first: the long one that lies across the arch and the round one.
    expect(undone[0]).toMatchObject({ kind: 'long', tier: 1 })
    expect(types(events)).toContain('dawn')
    expect(play.sceneRunning).toBe(false)
    expect(play.evening.dusk).toBe(0)
    expect(play.evening.things).toEqual([])
    for (const who of WHO) expect(play.evening.actors[who].placing.at).toEqual(dayStance(who).at)
    expect(play.rug()).toEqual(CASTLE)
    // The blocks can be taken again.
    play.press(down(OFFER.cube[0], OFFER.cube[2]))
    expect(play.hand).not.toBeNull()
  })
})

describe('the afternoon coming back', () => {
  it('does not start turning the castle back into blocks while any of them still rests in it', () => {
    for (const rug of [CASTLE, [at('cube', 2, 1), at('round', 2, 1), at('round', 6, 0), at('round', 6, 0), at('thin', 6, 0)], [at('round', 3, 1), at('cube', 3, 1), at('arch', 0, 1), at('round', 6, 0), at('round', 6, 0)]]) {
      const play = eveningOf(rug)
      const { evening } = play
      const rests = restsFor(rug)
      const inCastle = WHO.filter((who) => rests[who].how !== 'day' && rests[who].how !== 'open')
      expect(inCastle.length).toBeGreaterThan(0)
      play.press(overBell())
      play.pressEnd()
      let turned = false, seconds = 0
      for (let i = 0; i < 60 * (RETURN_SECONDS + 3) && evening.things.length > 0; i++) {
        play.advance(1 / 60)
        play.take()
        seconds = i / 60
        if (evening.things.length === 0) break
        if (!turned && evening.things.some((_, index) => evening.dress[index] < 1)) {
          turned = true
          // Each of them is up out of his place by now: lifted well clear of where he rested.
          for (const who of inCastle) {
            const [x, y, z] = evening.actors[who].placing.at, [rx, ry, rz] = rests[who].at
            expect(Math.hypot(x - rx, y - ry, z - rz), `${who} after ${seconds.toFixed(2)} s`).toBeGreaterThan(0.5)
          }
        }
      }
      expect(turned).toBe(true)
      // And the afternoon is whole again in its time.
      run(play, 1)
      expect(evening.things).toHaveLength(0)
      expect(seconds).toBeLessThan(RETURN_SECONDS + 2.5)
    }
  })
})

describe('a touch in the evening', () => {
  it('moves no block and saves nothing, whatever it lands on', () => {
    const play = eveningOf()
    for (const ray of [down(placeX(0), placeZ(1)), down(OFFER.cube[0], OFFER.cube[2]), onWicker(), down(-7.5, 3.4)]) {
      play.press(ray)
      play.carry(down(placeX(3), placeZ(2)))
      play.drop()
      expect(play.hand).toBeNull()
      run(play, 0.3)
    }
    expect(play.rug()).toEqual(CASTLE)
    expect(play.finished).toBe(true)
    expect(play.takeSaveNow()).toBe(false)
    expect(play.touchable()).toEqual([])
  })

  it('makes the basket creak and rock, by a tap or a drag', () => {
    const play = eveningOf()
    play.press(down(OFFER.cube[0], OFFER.cube[2]))
    expect(types(play.take())).toEqual(['creak'])
    expect(play.basketRock.velocity).toBeGreaterThan(0)
    // The wicker of its far side, pulled toward the rug.
    play.press({ origin: [12, 0.4, BASKET.z], dir: [-1, 0, 0] })
    play.carry(down(BASKET.x - 2, BASKET.z))
    expect(types(play.take())).toEqual(['creak'])
    expect(play.basketTip).toBe(0)
    expect(play.sceneRunning).toBe(false)
  })

  it('is answered by every thing in its own way, the fifth column of the grid', () => {
    const play = eveningOf()
    const all = things(CASTLE)
    const answers = new Map<string, string[]>()
    for (const thing of all) {
      // A finger coming down on it. Where the king sits on it, or a block lies on it, one that comes at its side, under them.
      const side: Ray = { origin: [thing.x, thing.base + 0.3, thing.z - 6], dir: [0, 0, 1] }
      play.press(restsFor(CASTLE).king.thing === thing.index || (thing.what === 'tower' && thing.covered) ? side : down(thing.x, thing.z))
      const events = [...play.take(), ...run(play, 5)]
      const act = events.find((event) => event.type === 'act')
      expect(act, thing.what).toMatchObject({ type: 'act', what: thing.what })
      answers.set(thing.what + (thing.covered ? ' capped' : ''), types(events).filter((type) => type !== 'taste' && type !== 'poke'))
    }
    // The bridge is crossed, trip-trap, by whoever is nearest.
    expect(answers.get('bridge')!.filter((type) => type === 'step')).toHaveLength(3)
    // The slide is climbed and slid down, into the moat off the rug's left edge.
    expect(answers.get('slide')).toEqual(expect.arrayContaining(['hup', 'whee', 'splash', 'shake', 'home']))
    // Somebody looks out of the tower.
    expect(answers.get('tower')).toContain('peek')
    // Everyone is back where he belongs.
    expect(where(play)).toEqual(restAt(CASTLE))
    expect(play.rug()).toEqual(CASTLE)
  })

  it('rings the spoon on the pot when the room is the cook\'s, and tucks the dragon\'s nose in under his gate', () => {
    const play = eveningOf()
    const rests = restsFor(CASTLE)
    const room = things(CASTLE)[rests.cook.thing], gate = things(CASTLE)[rests.dragon.thing]
    play.press(down(room.x, room.z))
    expect(play.take()).toEqual([{ type: 'act', what: 'room', clang: true }])
    // A ray down onto the gate's top: his head is under it, not on it.
    play.press(down(gate.x, gate.z))
    expect(play.take()).toEqual([{ type: 'act', what: 'gate', clang: false }])
    expect(play.evening.tuck).toBe(0)
  })

  it('changes a flag to the next of three colours each time', () => {
    const play = eveningOf()
    const pole = CASTLE.findIndex((block) => block.kind === 'thin')
    const seen = new Set<number>()
    for (let i = 0; i < 3; i++) {
      play.press(overThing(play, pole))
      seen.add(play.evening.flagColour[pole])
      run(play, 1.5)
    }
    expect(seen.size).toBe(3)
  })

  it('bounces whoever crosses a bridge off an end that hangs in the air, and he steps back', () => {
    // A long one on one cube: its right end is in the air.
    const rug = [at('cube', 1, 1), at('long', 1, 1), at('thin', 6, 0)]
    const play = eveningOf(rug)
    play.press({ origin: [placeX(3), 1.25, 6], dir: [0, 0, -1] })
    const events = [...play.take(), ...run(play, 5)]
    expect(types(events)).toContain('boing')
    expect(events.filter((event) => event.type === 'step').length).toBeGreaterThanOrEqual(5)
    expect(where(play)).toEqual(restAt(rug))
  })

  it('sends one of them at a time, and never the dragon', () => {
    const play = eveningOf()
    const bridge = CASTLE.findIndex((block) => block.kind === 'long'), slide = CASTLE.findIndex((block) => block.kind === 'slope')
    play.evening.act(bridge)
    const out = WHO.filter((who) => play.evening.actors[who].busy)
    expect(out).toHaveLength(1)
    expect(out[0]).not.toBe('dragon')
    play.take()
    // While he is out, a tap on the slide gets the slide's own answer and sends nobody.
    play.evening.act(slide)
    expect(play.take()).toEqual([{ type: 'act', what: 'slide', clang: false }])
    expect(WHO.filter((who) => play.evening.actors[who].busy)).toEqual(out)
    // The dragon stays under his gate whatever is tapped.
    run(play, 6)
    for (let index = 0; index < CASTLE.length; index++) { play.evening.act(index); expect(play.evening.actors.dragon.busy).toBe(false); run(play, 6) }
  })

  it('keeps the king on his cushion from the moment he is lifted in until he is lifted home, trips included', () => {
    const play = afternoon()
    play.press(overBell())
    run(play, FALL_SECONDS + 1)
    expect(play.evening.kingSits).toBeGreaterThan(0.99)
    // A trip over the bridge or down the slide: whoever goes, the king's cushion stays under him.
    for (const what of ['bridge', 'slide'] as const) {
      const thing = play.evening.things.find((each) => each.what === what)!
      play.press(restsFor(CASTLE).king.thing === thing.index ? down(thing.x + 0.9, thing.z) : overThing(play, thing.index))
      play.tap()
      for (let i = 0; i < 360; i++) { play.advance(1 / 60); expect(play.evening.kingSits).toBeGreaterThan(0.99) }
    }
    // The afternoon comes back: he is seated until his own turn to be carried, the dragon's turn before it.
    play.press(overBell())
    run(play, 0.3)
    expect(play.evening.kingSits).toBeGreaterThan(0.99)
    run(play, RETURN_SECONDS + 1)
    expect(play.evening.kingSits).toBeLessThan(0.01)
  })

  it('holds the grille up for the dragon from the moment he sets out until he is out from under it', () => {
    const play = afternoon()
    expect(restsFor(CASTLE).dragon.how).toBe('gate')
    play.press(overBell())
    // While the castle dresses the grille is down; it is up by the time he lies under it.
    run(play, 2)
    expect(play.evening.nose).toBe(0)
    let arrived = -1
    for (let i = 0; i < (FALL_SECONDS + 1) * 60; i++) {
      play.advance(1 / 60)
      if (arrived < 0 && !play.evening.actors.dragon.busy && play.evening.actors.dragon.placing.at[2] < FOLK.dragon.z - 0.5) arrived = play.evening.nose
    }
    expect(arrived).toBeGreaterThan(0.9)
    // A touch that ends the scene finds him under it at once, and the grille up at once.
    const ended = afternoon()
    ended.press(overBell())
    run(ended, 1)
    ended.press(down(-7.5, 3.4))
    expect(ended.evening.nose).toBe(1)
    // On the way home it stays up while he is still under it.
    play.press(overBell())
    run(play, 0.2)
    expect(play.evening.nose).toBeGreaterThan(0.9)
  })

  it('makes the dragon under a bridge puff one ring of smoke when feet cross it', () => {
    const rug = [at('cube', 1, 1), at('cube', 3, 1), at('long', 1, 1)]
    expect(restsFor(rug).dragon.how).toBe('bridge')
    const play = eveningOf(rug)
    play.press({ origin: [placeX(1), 1.25, 6], dir: [0, 0, -1] })
    const events = [...play.take(), ...run(play, 5)]
    expect(events.filter((event) => event.type === 'puff')).toHaveLength(1)
  })

  it('puffs when the feet land on the bridge, not when it is tapped', () => {
    const rug = [at('cube', 1, 1), at('cube', 3, 1), at('long', 1, 1)]
    const play = eveningOf(rug)
    play.press({ origin: [placeX(1), 1.25, 6], dir: [0, 0, -1] })
    expect(types(play.take())).not.toContain('puff')
    const events = run(play, 5)
    const kinds = types(events)
    expect(kinds.indexOf('puff')).toBeGreaterThanOrEqual(kinds.indexOf('step'))
    expect(kinds.indexOf('puff')).toBeLessThan(kinds.indexOf('step', kinds.indexOf('step') + 1))
  })

  it('bends a board under whoever lands on an end that hangs in the air, and throws him up at the boing', () => {
    // A long one on one cube in its middle: both its ends are in the air, so he is bounced where he is set down and again at the far end.
    const rug = [at('cube', 3, 1), at('long', 2, 1), at('thin', 6, 0)]
    const play = eveningOf(rug)
    const bridge = play.evening.things.findIndex((thing) => thing.what === 'bridge')
    const thing = play.evening.things[bridge]
    expect([thing.airLeft, thing.airRight]).toEqual([true, true])
    expect(play.evening.rests.dragon).toMatchObject({ how: 'bridge', thing: bridge })
    expect(thing.pivotLeft).toBeCloseTo(placeX(3) - 0.5)
    expect(thing.pivotRight).toBeCloseTo(placeX(3) + 0.5)
    play.evening.act(bridge)
    const seen: string[] = []
    let deepest = 0, rode = 0, bentAt = -1, lastBoing = -1
    const gaps: number[] = []
    for (let i = 0; i < 60 * 6; i++) {
      play.advance(1 / 60)
      for (const event of play.take()) {
        if (event.type === 'bend') { seen.push('bend'); bentAt = i }
        if (event.type === 'boing') { seen.push('boing'); gaps.push((i - bentAt) / 60); lastBoing = i }
      }
      const bent = play.evening.bent()
      if (bent) deepest = Math.max(deepest, Math.abs(bent.angle))
      for (const who of WHO) rode = Math.min(rode, play.evening.rides(who))
      // The dragon lies under this board: its dipped end stays clear of him.
      if (bent) for (const box of play.evening.bodies('dragon')) for (const x of [box.min[0], box.max[0]]) {
        if (Math.abs(x - thing.x) > SIZE.long[0] / 2 || box.max[2] < thing.z - SIZE.long[2] / 2 || box.min[2] > thing.z + SIZE.long[2] / 2) continue
        expect(thing.base + Math.sin(bent.angle) * (x - bent.pivot) - box.max[1]).toBeGreaterThan(0.05)
      }
      // Once it has come to rest it is flat again.
      if (lastBoing >= 0 && i > lastBoing + 90) expect(play.evening.bent()).toBeNull()
    }
    expect(seen).toEqual(['bend', 'boing', 'bend', 'boing'])
    // The dip comes first and the boing as it springs: a tenth of a second and a little apart.
    for (const gap of gaps) { expect(gap).toBeGreaterThan(0.08); expect(gap).toBeLessThan(0.2) }
    expect(deepest).toBeGreaterThan(0.05)
    // He goes down with the board where he stands, half way out along the end that dips a tenth of a block.
    expect(rode).toBeLessThan(-0.04)
    expect(rode).toBeGreaterThan(-0.08)
    expect(where(play)).toEqual(restAt(rug))
  })

  it('does not bend a board that something stands on', () => {
    const rug = [at('cube', 3, 1), at('long', 2, 1), at('cube', 3, 1), at('thin', 6, 0)]
    const play = eveningOf(rug)
    const bridge = play.evening.things.findIndex((thing) => thing.what === 'bridge')
    play.evening.act(bridge)
    const kinds = types(run(play, 6))
    expect(kinds).not.toContain('bend')
    expect(kinds).not.toContain('boing')
  })

  it('lifts the roof off a tapped tower, sets the nearest who has room in it, and he looks out from under it', () => {
    // A tower with nothing beside it, a higher seat for the king, a room for the cook.
    const rug = [at('round', 1, 1), at('round', 5, 0), at('round', 5, 0), at('cube', 3, 2)]
    const play = eveningOf(rug)
    const { evening } = play
    const index = evening.things.findIndex((thing) => thing.what === 'tower' && !thing.covered && thing.col === 1)
    const tower = evening.things[index]
    expect(evening.rests.king.thing).not.toBe(index)
    evening.act(index)
    const first = play.take()
    // The creak comes with the lift; nobody has made his noise yet.
    expect(types(first)).toContain('act')
    expect(types(first)).not.toContain('peek')
    const visitor = WHO.find((who) => evening.actors[who].busy)!
    expect(visitor).toBeDefined()
    expect(visitor).not.toBe('dragon')
    let peeked = false, highest = 0
    for (let i = 0; i < 60 * 5; i++) {
      play.advance(1 / 60)
      const lid = tower.top + evening.lid(index)
      highest = Math.max(highest, evening.lid(index))
      // The roof is never in anyone: whoever is over the tower is under it.
      for (const who of WHO) for (const box of evening.bodies(who)) {
        const over = box.min[0] < tower.x + 0.5 && box.max[0] > tower.x - 0.5 && box.min[2] < tower.z + 0.5 && box.max[2] > tower.z - 0.5 && box.max[1] > tower.top + 0.01
        if (over) expect(box.max[1]).toBeLessThanOrEqual(lid + 1e-6)
      }
      for (const event of play.take()) if (event.type === 'peek') {
        peeked = true
        // He makes his noise standing in the tower, under the roof.
        expect(event.who).toBe(visitor)
        const [x, y, z] = evening.actors[visitor].placing.at
        expect([x, y, z]).toEqual([tower.x, tower.top, tower.z])
        expect(evening.lid(index)).toBeGreaterThan(1)
      }
    }
    expect(peeked).toBe(true)
    expect(highest).toBeGreaterThan(1.5)
    expect(evening.lid(index)).toBe(0)
    expect(where(play)).toEqual(restAt(rug))
  })

  it('bobs a lifted roof up where it waits when the tower is tapped again, and takes that tap where the roof is drawn', () => {
    const rug = [at('round', 1, 1), at('round', 5, 0), at('round', 5, 0), at('cube', 3, 2)]
    const play = eveningOf(rug)
    const { evening } = play
    const index = evening.things.findIndex((thing) => thing.what === 'tower' && !thing.covered && thing.col === 1)
    const tower = evening.things[index]
    const across = (y: number): Ray => ({ origin: [tower.x + ROOF_OUT - 0.04, y, 9], dir: [0, 0, -1] })
    const resting = across((tower.top + tower.crown) / 2)
    expect(evening.pick(resting)).toEqual({ on: 'thing', index })
    evening.act(index)
    play.take()
    // The roof is up and the visitor is still on his way: nothing is over the tower.
    let frames = 0
    while (evening.lid(index) < 1 && frames++ < 240) { play.advance(1 / 60); play.take() }
    const up = evening.lid(index)
    expect(up).toBeGreaterThan(1)
    // It is touched up there, and no longer where it was.
    expect(evening.pick(across(tower.top + up + (tower.crown - tower.top) / 2))).toEqual({ on: 'thing', index })
    expect(evening.pick(resting)).toBeNull()
    // The tap is answered by the roof itself: it goes up with the creak and comes back, never down on anyone.
    const visitor = WHO.find((who) => evening.actors[who].busy)!
    const still = eveningOf(rug)
    still.evening.act(index)
    still.take()
    for (let i = 0; i < frames; i++) { still.advance(1 / 60); still.take() }
    evening.act(index)
    expect(types(play.take())).toEqual(['act'])
    expect(WHO.filter((who) => evening.actors[who].busy)).toEqual([visitor])
    let most = 0
    for (let i = 0; i < 60 * 5; i++) {
      play.advance(1 / 60); play.take()
      still.advance(1 / 60); still.take()
      const more = evening.lid(index) - still.evening.lid(index)
      expect(more).toBeGreaterThanOrEqual(-1e-9)
      most = Math.max(most, more)
    }
    expect(most).toBeGreaterThan(0.1)
    expect(evening.lid(index)).toBe(0)
    expect(where(play)).toEqual(restAt(rug))
    // Down again, it is touched where it rests.
    expect(evening.pick(resting)).toEqual({ on: 'thing', index })
  })

  it('only ducks the battlements of a tower something stands on, and lets the king make his noise on the roof he sits on', () => {
    const play = eveningOf()
    const { evening } = play
    const capped = evening.things.findIndex((thing) => thing.what === 'tower' && thing.covered)
    evening.act(capped)
    expect(types(play.take())).toEqual(['act'])
    expect(WHO.some((who) => evening.actors[who].busy)).toBe(false)
    const seat = evening.rests.king.thing
    evening.act(seat)
    const events = play.take()
    expect(events.find((event) => event.type === 'peek')).toMatchObject({ who: 'king' })
    expect(WHO.some((who) => evening.actors[who].busy)).toBe(false)
    expect(evening.lid(seat)).toBe(0)
  })

  it('takes a tap on a flag, a roof, battlements and a ladder where each is drawn', () => {
    const rug = [at('thin', 1, 1), at('round', 3, 1), at('slope', 4, 2), at('round', 5, 0), at('cube', 5, 0)]
    const play = eveningOf(rug)
    const { things } = play.evening
    const pole = things.find((thing) => thing.what === 'pole')!
    expect(pole.flag).toBe(FLAG.long)
    // The far end of the flag, well outside the pole's own box.
    const tip = down(pole.x + pole.side * (0.15 + FLAG.long - 0.05), pole.z + 0.02)
    expect(play.evening.pick(tip)).toEqual({ on: 'thing', index: pole.index })
    const roofed = things.find((thing) => thing.what === 'tower' && !thing.covered)!
    if (play.evening.rests.king.thing !== roofed.index) expect(play.evening.pick(down(roofed.x + ROOF_OUT - 0.03, roofed.z))).toEqual({ on: 'thing', index: roofed.index })
    const capped = things.find((thing) => thing.what === 'tower' && thing.covered)!
    // The battlements stand out past the tower: a touch on the part that sticks out at its side is on the tower.
    const beside = play.evening.pick({ origin: [capped.x - 0.52, capped.top - 0.1, 9], dir: [0, 0, -1] })
    expect(beside).toEqual({ on: 'thing', index: capped.index })
    const slide = things.find((thing) => thing.what === 'slide')!
    expect(play.evening.pick(down(slide.x - slide.side * (SIZE.slope[0] / 2 + LADDER_OFF + 0.02), slide.z))).toEqual({ on: 'thing', index: slide.index })
  })

  it('gives the cook his frown where he cooks in the open, for as long as it is evening', () => {
    const rug = [at('round', 3, 1)]
    expect(restsFor(rug).cook.how).toBe('open')
    const play = eveningOf(rug)
    run(play, 3)
    expect(play.folk.pose('cook').brow).toBeLessThan(-0.4)
    play.press(overBell())
    run(play, RETURN_SECONDS + 3)
    expect(play.folk.pose('cook').brow).toBeGreaterThan(0)
    // With a room to his taste he does not frown.
    const happy = eveningOf()
    run(happy, 3)
    expect(happy.folk.pose('cook').brow).toBeGreaterThan(0)
  })

  it('rattles the boards of a bridge with a block on it, which has boards like any other', () => {
    const rug = [at('cube', 2, 1), at('cube', 4, 1), at('long', 2, 1), at('round', 3, 1), at('thin', 6, 0)]
    const play = eveningOf(rug)
    const bridge = play.evening.things.findIndex((thing) => thing.what === 'bridge')
    expect(play.evening.things[bridge].covered).toBe(true)
    play.evening.act(bridge)
    let jumped = 0
    for (let i = 0; i < 40; i++) { play.advance(1 / 60); play.take(); for (let slat = 0; slat < 9; slat++) jumped = Math.max(jumped, play.evening.boardLift(bridge, slat)) }
    expect(jumped).toBeGreaterThan(0.02)
    // At rest they lie still.
    run(play, 6)
    for (let slat = 0; slat < 9; slat++) expect(play.evening.boardLift(bridge, slat)).toBe(0)
  })

  it('has the king stretch up to a flag near him when it is tapped, with his own noise, and not to one far off', () => {
    // On the tip of his own pole, the flag is right under him.
    const near = eveningOf([at('cube', 2, 1), at('round', 6, 0), at('round', 6, 0), at('thin', 6, 0)])
    const pole = near.evening.things.findIndex((thing) => thing.what === 'pole')
    expect(near.evening.rests.king.thing).toBe(pole)
    expect(near.evening.flagNear(pole)).toBe(true)
    run(near, 1)
    near.evening.act(pole)
    expect(near.take().find((event) => event.type === 'peek')).toMatchObject({ who: 'king' })
    run(near, 0.6)
    // He beams: brows up, mouth wide.
    expect(near.folk.pose('king').brow).toBeGreaterThan(0.6)
    expect(near.folk.pose('king').mouthWide).toBeGreaterThan(0.8)
    // A flag at the other end of the rug is not near him: it only changes its colour.
    const far = eveningOf([at('thin', 0, 2), at('round', 6, 0), at('round', 6, 0), at('round', 6, 0)])
    const other = far.evening.things.findIndex((thing) => thing.what === 'pole')
    expect(far.evening.rests.king.thing).not.toBe(other)
    expect(far.evening.flagNear(other)).toBe(false)
    far.evening.act(other)
    expect(types(far.take())).toEqual(['act'])
    expect(far.evening.flagColour[other]).toBe(1)
  })

  it('has the cook grin and stir fast when his room is tapped and something is built over it, and only jump in a plain one', () => {
    const seat = [at('round', 6, 0), at('round', 6, 0), at('thin', 6, 0)]
    const under = eveningOf([at('cube', 2, 1), at('round', 2, 1), ...seat])
    const plain = eveningOf([at('cube', 2, 1), ...seat])
    const faces: number[] = []
    for (const play of [under, plain]) {
      const room = play.evening.things.findIndex((thing) => thing.what === 'room')
      expect(play.evening.rests.cook).toMatchObject({ how: 'window', thing: room })
      run(play, 1)
      play.evening.act(room)
      expect(play.take()).toContainEqual({ type: 'act', what: 'room', clang: true })
      run(play, 0.8)
      faces.push(play.folk.pose('cook').mouthWide)
    }
    expect(under.evening.things.find((thing) => thing.what === 'room')!.covered).toBe(true)
    expect(faces[0]).toBeGreaterThan(0.9)
    expect(faces[1]).toBeLessThan(0.6)
  })

  it('has the king wobble on the tip of a pole or the point of a roof, and not on a flat seat', () => {
    const lean = (rug: Placed[]): number => {
      const play = eveningOf(rug)
      run(play, 3)
      let most = 0
      for (let i = 0; i < 60 * 12; i++) { play.advance(1 / 60); play.take(); most = Math.max(most, Math.abs(play.folk.pose('king').lean)) }
      return most
    }
    expect(lean([at('cube', 2, 1), at('round', 6, 0), at('thin', 6, 0)])).toBeGreaterThan(0.12)
    expect(lean([at('cube', 2, 1), at('round', 5, 0)])).toBeGreaterThan(0.12)
    expect(lean([at('cube', 2, 1), at('cube', 5, 0), at('cube', 5, 0)])).toBeLessThan(0.08)
  })

  it('is his own poke on one of the folk, never the thing behind him', () => {
    const play = eveningOf()
    const rests = restsFor(CASTLE)
    // The king sits on a thing: a finger coming down on him pokes him, and the thing does nothing.
    play.press(down(rests.king.at[0], rests.king.at[2]))
    expect(play.take()).toEqual([{ type: 'poke', who: 'king' }])
    // The cook lies on the rug beside his room.
    play.press(down(rests.cook.at[0] + rests.cook.lie * 0.5, rests.cook.at[2]))
    expect(play.take()).toEqual([{ type: 'poke', who: 'cook' }])
    // The dragon's body trails out over the rug's edge.
    play.press(down(rests.dragon.path[1][0], rests.dragon.path[1][2] - 0.2))
    expect(play.take()).toEqual([{ type: 'poke', who: 'dragon' }])
  })
})

describe('tidying', () => {
  it('starts when the wicker is dragged toward the rug: the empty rug is saved at once', () => {
    const play = afternoon()
    play.press(onWicker())
    expect(types(play.take())).toEqual(['creak'])
    play.carry(down(BASKET.x - 0.3, BASKET.z))
    expect(play.sceneRunning).toBe(false)
    play.carry(down(BASKET.x - 1.2, BASKET.z))
    expect(play.sceneRunning).toBe(true)
    expect(play.rug()).toEqual([])
    expect(play.takeSaveNow()).toBe(true)
    play.drop()
    // On the screen the blocks have not moved yet.
    expect(play.pieces.filter((piece) => piece.state === 'tidy')).toHaveLength(CASTLE.length)
  })

  it('tips the basket, hops the blocks in from the top down each with its knock, and rocks it upright', () => {
    const play = afternoon()
    play.press(onWicker())
    play.carry(down(BASKET.x - 1.2, BASKET.z))
    play.drop()
    play.take()
    let tipped = 0
    const events: PlayEvent[] = []
    for (let i = 0; i < 60 * (TIDY_LEAST + 1.5); i++) { play.advance(1 / 60); events.push(...play.take()); tipped = Math.max(tipped, play.basketTip) }
    expect(tipped).toBe(1)
    expect(types(events)[0]).toBe('tip')
    // Its side comes down on the boards once, when it does.
    expect(types(events).filter((type) => type === 'tipped')).toHaveLength(1)
    const knocks = events.filter((event) => event.type === 'basket')
    expect(knocks).toHaveLength(CASTLE.length)
    // The highest block goes first: the long one that lies across the arch and the round one.
    expect(knocks[0]).toMatchObject({ kind: 'long' })
    expect(play.sceneRunning).toBe(false)
    expect(play.basketTip).toBe(0)
    expect(play.pieces.filter((piece) => piece.state === 'offer')).toHaveLength(KINDS.length)
    expect(play.pieces.filter((piece) => piece.state === 'under')).toHaveLength(KINDS.length * PER_KIND - KINDS.length)
    expect(play.rug()).toEqual([])
    expect(play.busy).toBe(false)
  })

  it('lifts each block over the rug and drops it in at the mouth dwindling, the blocks of the basket ducked down', () => {
    const play = afternoon([at('cube', 3, 1)])
    play.press(onWicker())
    play.carry(down(BASKET.x - 1.2, BASKET.z))
    play.drop()
    const cube = play.pieces.find((piece) => piece.state === 'tidy')!
    let highest = 0, least = 1, standing = 0
    for (let i = 0; i < 60 && cube.state === 'tidy'; i++) {
      play.advance(1 / 60)
      highest = Math.max(highest, cube.y)
      if (cube.state !== 'tidy') break
      least = Math.min(least, cube.scale.value)
      // Once the basket lies over, nothing stands up out of it.
      if (play.basketTip > 0.6) for (const piece of play.pieces) if (piece.state === 'offer') standing = Math.max(standing, piece.scale.value)
    }
    // Over the side of the tipped basket, and all but gone as it arrives.
    expect(highest).toBeGreaterThan(MOUTH[1] + 0.3)
    expect(least).toBeLessThan(0.1)
    expect(standing).toBeLessThan(0.2)
    // It goes in at the middle of the mouth, and the basket's blocks stand up again afterwards.
    expect(MOUTH[2]).toBe(BASKET.z)
    run(play, TIDY_LEAST + 1)
    for (const piece of play.pieces) if (piece.state === 'offer') expect(piece.scale.value).toBeGreaterThan(0.9)
  })

  it('takes no less than its three seconds, however few the blocks', () => {
    const play = afternoon([at('cube', 3, 1)])
    play.press(onWicker())
    play.carry(down(BASKET.x - 1.2, BASKET.z))
    play.drop()
    run(play, TIDY_LEAST - 0.3)
    expect(play.sceneRunning).toBe(true)
    run(play, 1)
    expect(play.sceneRunning).toBe(false)
  })

  it('is ended by a touch with every block in the basket and none of its knocks', () => {
    const play = afternoon()
    play.press(onWicker())
    play.carry(down(BASKET.x - 1.2, BASKET.z))
    play.drop()
    run(play, 0.4)
    play.press(down(placeX(3), placeZ(1)))
    expect(types(play.take())).toEqual(['pat'])
    expect(play.sceneRunning).toBe(false)
    expect(play.basketTip).toBe(0)
    expect(play.pieces.filter((piece) => piece.state === 'offer')).toHaveLength(KINDS.length)
    expect(play.pieces.some((piece) => piece.state === 'tidy' || piece.state === 'rug')).toBe(false)
  })

  it('only creaks and rocks when nothing is on the rug', () => {
    const play = afternoon([])
    play.press(onWicker())
    play.take()
    play.carry(down(BASKET.x - 1.2, BASKET.z))
    expect(types(play.take())).toEqual(['creak'])
    expect(play.sceneRunning).toBe(false)
    expect(play.takeSaveNow()).toBe(false)
  })

  it('starts on a tap on the basket once it is empty', () => {
    // Every block is on the rug: three of each kind.
    const rug: Placed[] = [
      ...[0, 1, 2].map((row) => at('long', 0, row)), ...[0, 1, 2].map((row) => at('arch', 3, row)), ...[0, 1, 2].map((row) => at('slope', 5, row)),
      ...[0, 1, 2].map((row) => at('cube', 0, row)), ...[0, 1, 2].map((row) => at('round', 1, row)), ...[0, 1, 2].map((row) => at('thin', 2, row)),
    ]
    const play = afternoon(rug)
    expect(play.touchable()).toEqual([])
    play.press(down(BASKET.x, BASKET.z))
    play.tap()
    expect(play.sceneRunning).toBe(true)
    expect(play.rug()).toEqual([])
  })

  it('does not start on a tap while the basket still holds blocks', () => {
    const play = afternoon()
    play.press(onWicker())
    play.tap()
    expect(play.sceneRunning).toBe(false)
    expect(play.rug()).toEqual(CASTLE)
  })
})

describe('the idle hand', () => {
  it('shows a carry first, and the bell only once something stands on the rug', () => {
    const empty = afternoon([])
    expect([0, 1, 2, 3].map((turn) => empty.guide(turn)?.kind)).toEqual(['carry', 'carry', 'carry', 'carry'])
    expect(empty.bellGlows()).toBe(false)
    const built = afternoon()
    expect([0, 1, 2, 3].map((turn) => built.guide(turn)?.kind)).toEqual(['carry', 'tap', 'carry', 'tap'])
    expect(built.bellGlows()).toBe(true)
    // Once the child has set a block down, the bell is the first thing shown.
    built.press(down(OFFER.thin[0], OFFER.thin[2]))
    built.tap()
    run(built, 1.5)
    expect([0, 1, 2, 3].map((turn) => built.guide(turn)?.kind)).toEqual(['tap', 'carry', 'tap', 'carry'])
  })

  it('lets the castle glow for an idle child in the evening, and nothing of it by day', () => {
    expect(eveningOf().tappable()).toHaveLength(CASTLE.length)
    expect(afternoon().tappable()).toEqual([])
    expect(afternoon().basketGlows()).toBe(false)
  })

  it('shows the basket pulled over once the castle has been seen and the afternoon is back, and the pull it shows tips it', () => {
    const play = afternoon()
    expect(play.basketGlows()).toBe(false)
    play.press(overBell())
    run(play, FALL_SECONDS + 1)
    // In the evening the hand shows the bell and the basket does not glow.
    expect(play.basketGlows()).toBe(false)
    expect([0, 1, 2].map((turn) => play.guide(turn)?.kind)).toEqual(['tap', 'tap', 'tap'])
    play.press(overBell())
    run(play, RETURN_SECONDS + 1)
    expect(play.busy).toBe(false)
    expect(play.basketGlows()).toBe(true)
    expect([0, 1, 2, 3].map((turn) => play.guide(turn)?.kind)).toEqual(['pull', 'tap', 'carry', 'pull'])
    // Poking the folk stays a find: the hand never shows it.
    const pull = play.guide(0)!
    if (pull.kind !== 'pull') throw new Error('the first move is the pull')
    // The move the hand shows is one that works: a finger down where it starts and dragged to where it ends.
    const toward = (to: readonly number[]): Ray => { const from = [0, 6, 9], d = [to[0] - from[0], to[1] - from[1], to[2] - from[2]], long = Math.hypot(d[0], d[1], d[2]); return { origin: [from[0], from[1], from[2]], dir: [d[0] / long, d[1] / long, d[2] / long] } }
    play.press(toward(pull.from))
    play.carry(toward(pull.to))
    play.drop()
    expect(play.sceneRunning).toBe(true)
    run(play, TIDY_LEAST + 3)
    expect(play.rug()).toEqual([])
    // Tidied, the hint is over: the hand is back to the first carry.
    expect(play.basketGlows()).toBe(false)
    expect([0, 1].map((turn) => play.guide(turn)?.kind)).toEqual(['carry', 'carry'])
  })

  it('shows the bell in the evening, and nothing while a finger holds a block', () => {
    const play = eveningOf()
    expect(play.guide(0)).toMatchObject({ kind: 'tap' })
    expect(play.guide(1)).toMatchObject({ kind: 'tap' })
    const day = afternoon()
    day.press(down(OFFER.cube[0], OFFER.cube[2]))
    expect(day.guide(0)).toBeNull()
  })
})

describe('where things are', () => {
  it('keeps the bell off the rug and out of the basket', () => {
    expect(BELL.z - BELL.deep / 2).toBeGreaterThan(RUG.z1)
    expect(BELL.x + BELL.wide / 2).toBeLessThan(BASKET.x - BASKET.wide / 2)
  })
})

describe('the roof the king sits on', () => {
  it('sags under him when it is tapped and springs back, and lifts for nobody while he is on it', () => {
    const play = eveningOf()
    const { evening } = play
    const index = evening.rests.king.thing
    expect(evening.things[index].what).toBe('tower')
    expect(evening.things[index].covered).toBe(false)
    expect(evening.kingOn(index)).toBe(true)
    expect(evening.kingSags()).toBe(0)
    evening.act(index)
    let deepest = 0
    for (let i = 0; i < 120; i++) {
      play.advance(1 / 60)
      expect(evening.kingOn(index)).toBe(true)
      deepest = Math.max(deepest, evening.kingSags())
    }
    expect(deepest).toBeGreaterThan(0.05)
    expect(deepest).toBeLessThan(0.2)
    expect(evening.kingSags()).toBe(0)
  })

  it('does not sag by day or on another roof', () => {
    expect(afternoon().evening.kingSags()).toBe(0)
    const play = eveningOf()
    const other = play.evening.things.findIndex((thing, i) => thing.what === 'tower' && i !== play.evening.rests.king.thing)
    if (other >= 0) {
      play.evening.act(other)
      run(play, 0.2)
      expect(play.evening.kingSags()).toBe(0)
    }
  })
})

