import { describe, expect, it } from 'vitest'
import { LADDER } from './config'
import { Game, LATCH_DROPS_S, RINGS_TO_OPEN, SHOW_AFTER_S } from './game'
import { decode, levelAt } from './ground'
import { BELL, TRUCK, type Place } from './layout'
import { placeOf } from './places'
import { deserializeSave, type Save } from './save'
import { CHANNELS, endedChannels } from './scenes'
import { KINDS } from './things'
import type { VoiceSpec } from './voices'

const FRAME = 1 / 60

/** A saved game at a place of the order, with every kind already met, so that nothing is shown unless a test asks. */
function saved(place: string, arrangement = 0, more: Record<string, unknown> = {}): unknown {
  return { v: 1, position: place, finished: false, yard: { place, arrangement }, seen: [...KINDS], ...more }
}

class Table {
  readonly heard: VoiceSpec[] = []
  readonly game: Game
  now = 0

  constructor(raw: unknown = saved('one-thing'), childAge: number | null = null) {
    this.game = new Game((voice) => this.heard.push(voice), raw, childAge, 7)
  }

  /** Plays frames for `seconds`. */
  play(seconds: number, each?: () => void): this {
    for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
      this.now += FRAME
      this.game.step(FRAME, this.now)
      each?.()
    }
    return this
  }

  /** One tap at a place, and long enough for the water to land. */
  gulp(at: Place): this {
    this.game.press({ truck: false, point: at }, this.now)
    this.game.lift()
    return this.play(0.5)
  }

  gulps(at: Place, count: number): this {
    for (let i = 0; i < count; i++) this.gulp(at)
    return this
  }

  /** The thing of the yard at an index: where it is. */
  at(index: number): Place {
    return placeOf(this.game.yard, index)
  }

  /** What storage would hold now, read back as a game would read it. */
  reload(childAge: number | null = null): Table {
    return new Table(JSON.parse(JSON.stringify(this.game.snapshot())), childAge)
  }
}

describe('a first visit', () => {
  it('starts with one thing for a child of two or younger and for no age, with two for three, and afloat for four or older', () => {
    expect(new Table(null, null).game.yard.place).toBe('one-thing')
    expect(new Table(null, 1).game.yard.place).toBe('one-thing')
    expect(new Table(null, 2).game.yard.place).toBe('one-thing')
    expect(new Table(null, 3).game.yard.place).toBe('two-things')
    expect(new Table(null, 4).game.yard.place).toBe('afloat')
    expect(new Table(null, 11).game.yard.place).toBe('afloat')
  })

  it('lets a saved position win over the age, and gates nothing by age', () => {
    expect(new Table(saved('whole-garden'), 2).game.yard.place).toBe('whole-garden')
    expect(new Table(saved('one-thing'), 9).game.yard.place).toBe('one-thing')
    for (const place of LADDER) expect(new Table(saved(place), null).game.yard.place).toBe(place)
  })

  it('opens on anything that is not this game\'s save without a fault', () => {
    for (const raw of [undefined, null, 7, 'x', [], {}, { v: 99 }, { v: 1, position: 4, yard: 'no' }]) {
      const table = new Table(raw)
      expect(table.game.yard.things.length).toBeGreaterThan(0)
      table.gulp({ x: 9, z: 5 })
    }
  })
})

describe('water on a thing', () => {
  it('puts the fire out in three gulps, each heard, and the water given stays', () => {
    const t = new Table()
    expect(t.game.yard.things[0].kind).toBe('fire')
    t.gulp(t.at(0))
    expect(t.game.yard.things[0].gulps).toBe(1)
    expect(t.game.motion.fire.pose.flame).toBeLessThan(0.9)
    t.play(30)
    expect(t.game.yard.things[0].gulps).toBe(1)
    t.gulps(t.at(0), 2)
    expect(t.game.yard.met).toBe(true)
    t.play(1.5)
    expect(t.game.motion.fire.pose.flame).toBeLessThan(0.05)
  })

  it('answers every tap anywhere in the yard with a sound, and never faults', () => {
    const t = new Table(saved('whole-garden'))
    let seed = 12345
    const random = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 2 ** 32)
    for (let tap = 0; tap < 120; tap++) {
      const before = t.heard.length
      const point = { x: random() * 18 - 1, z: random() * 12 - 1 }
      t.game.press({ truck: Math.hypot(point.x - TRUCK.x, point.z - TRUCK.z) < 1.5, point }, t.now)
      t.game.lift()
      expect(t.heard.length).toBeGreaterThan(before)
      t.play(0.2)
    }
    for (const thing of t.game.yard.things) expect(thing.gulps).toBeLessThanOrEqual(5)
    expect(JSON.parse(JSON.stringify(t.game.snapshot()))).toEqual(t.game.snapshot())
  })

  it('leaves the one that wants water still wanting when the water goes on another', () => {
    const t = new Table(saved('two-things', 0))
    const cat = t.game.yard.things.findIndex((thing) => thing.kind === 'cat')
    t.gulps(t.at(cat), 2)
    expect(t.game.yard.met).toBe(false)
    expect(t.game.yard.things[t.game.yard.want].gulps).toBe(0)
    expect(t.game.yard.things[cat].gulps).toBe(2)
  })

  it('wets open sand and leaves the things alone', () => {
    const t = new Table(saved('two-things', 0))
    t.gulp({ x: 12, z: 8 })
    expect(levelAt(t.game.yard.ground, 12, 8)).toBe('damp')
    expect(t.game.yard.things.every((thing) => thing.gulps === 0)).toBe(true)
  })

  it('gives the truck no water, and a honk for a touch', () => {
    const t = new Table()
    t.game.press({ truck: true, point: TRUCK }, 0)
    t.game.lift()
    t.play(1)
    expect(t.game.hose.flying).toHaveLength(0)
    expect(t.game.yard.things[0].gulps).toBe(0)
    expect(t.heard.length).toBeGreaterThan(0)
  })

  it('sends the cat to the roof with too much water, and a honk sends her off again', () => {
    const t = new Table(saved('two-things', 0))
    const cat = t.game.yard.things.findIndex((thing) => thing.kind === 'cat')
    for (let gulp = 0; gulp < 5 && t.game.yard.things[cat].spot !== 'roof'; gulp++) t.gulp(t.at(cat))
    expect(t.game.yard.things[cat].spot).toBe('roof')
    t.play(2)
    t.game.press({ truck: true, point: TRUCK }, t.now)
    t.game.lift()
    t.play(2)
    expect(t.game.yard.things[cat].spot).not.toBe('roof')
    expect(t.game.motion.cat.pose.x).toBeCloseTo(t.at(cat).x, 3)
  })
})

describe('a sweep', () => {
  it('makes a thing answer and leaves it no water', () => {
    const t = new Table(saved('two-things', 0))
    const cat = t.game.yard.things.findIndex((thing) => thing.kind === 'cat')
    const at = t.at(cat)
    const before = t.heard.length
    t.game.press({ truck: false, point: { x: at.x - 4, z: at.z + 2.6 } }, t.now)
    // A fast pass right across her and on.
    t.play(0.9, () => t.game.move({ x: at.x - 4 + ((t.now % 100) / 0.9) * 8, z: at.z + 2.6 - ((t.now % 100) / 0.9) * 5.2 }))
    t.game.lift()
    t.play(1)
    expect(t.game.yard.things[cat].gulps).toBe(0)
    expect(t.heard.length).toBeGreaterThan(before + 2)
  })
})

describe('the first showing of a new thing', () => {
  it('comes once, after a moment with no touch: a small spit, the mark saved as it starts, and no water kept', () => {
    const t = new Table(null, null)
    expect(t.game.save.seen).toEqual([])
    t.play(SHOW_AFTER_S - 0.2)
    expect(t.game.save.seen).toEqual([])
    t.game.needsSave = 'none'
    t.play(0.4)
    expect(t.game.save.seen).toEqual(['fire'])
    expect(t.game.needsSave).toBe('now')
    t.play(1)
    expect(t.game.yard.things[0].gulps).toBe(0)
    expect(t.heard.length).toBeGreaterThanOrEqual(2)
    // It is not shown again: not later, and not on load.
    const heard = t.heard.length
    t.play(10)
    expect(t.heard.length).toBe(heard)
    const again = t.reload()
    again.play(10)
    expect(again.heard).toHaveLength(0)
  })

  it('never comes after a touch, and what stands in the yard then counts as met', () => {
    const t = new Table(null, null)
    t.gulp({ x: 13, z: 8 })
    const heard = t.heard.length
    t.play(8)
    expect(t.heard.length).toBe(heard)
    expect(t.game.save.seen).toEqual(['fire'])
  })

  it('is not given in a yard found with its want already met', () => {
    const t = new Table({ ...(saved('one-thing') as object), seen: [], finished: true, things: [{ gulps: 3, spot: 2 }] })
    expect(t.game.yard.met).toBe(true)
    t.play(8)
    expect(t.heard).toHaveLength(0)
  })
})

describe('the ending of a yard', () => {
  it('saves its outcome when it starts: the want met and the position moved, at once', () => {
    const t = new Table()
    t.gulps(t.at(0), 2)
    t.game.needsSave = 'none'
    t.game.press({ truck: false, point: t.at(0) }, t.now)
    t.game.lift()
    let savedAtStart: Save | null = null
    t.play(0.5, () => {
      if (t.game.sceneRunning && !savedAtStart) {
        expect(t.game.needsSave).toBe('now')
        savedAtStart = t.game.snapshot()
      }
    })
    expect(savedAtStart).not.toBeNull()
    expect(savedAtStart!.finished).toBe(true)
    expect(savedAtStart!.position).toBe('two-things')
    expect(savedAtStart!.things[0].gulps).toBe(3)
  })

  it('does not play again on load: a put-away in the middle finds the yard as its ending left it', () => {
    const t = new Table()
    t.gulps(t.at(0), 3)
    expect(t.game.sceneRunning).toBe(true)
    t.game.rest()
    const again = t.reload()
    expect(again.game.yard.met).toBe(true)
    expect(again.game.sceneRunning).toBe(false)
    for (const channel of endedChannels('fire')) expect(again.game.channels[channel]).toBe(1)
    again.play(12)
    expect(again.heard).toHaveLength(0)
    expect(again.game.yard.met).toBe(true)
  })

  it('finds the snail on its patch and out, since how far it had glided is short-lived', () => {
    const t = new Table(saved('one-thing', 3))
    expect(t.game.yard.things[0].kind).toBe('patch')
    t.gulps(t.at(0), 3)
    t.play(9)
    expect(t.game.channels.glide).toBe(1)
    const again = t.reload()
    again.play(1)
    expect(again.game.channels.snailOut).toBe(1)
    expect(again.game.channels.glide).toBe(0)
    expect(again.game.motion.snail.pose.out).toBeGreaterThan(0.9)
    expect(Math.hypot(again.game.motion.snail.pose.x, again.game.motion.snail.pose.z)).toBeLessThan(1)
  })

  it('gives way to a touch, which is then an ordinary touch', () => {
    const t = new Table(saved('two-things', 0))
    const want = t.game.yard.want
    t.gulps(t.at(want), 3)
    expect(t.game.sceneRunning).toBe(true)
    const cat = t.game.yard.things.findIndex((thing) => thing.kind === 'cat')
    t.game.press({ truck: false, point: t.at(cat) }, t.now)
    expect(t.game.sceneRunning).toBe(false)
    for (const channel of endedChannels('seed')) expect(t.game.channels[channel]).toBe(1)
    t.game.lift()
    t.play(0.6)
    expect(t.game.yard.things[cat].gulps).toBe(1)
  })

  it('stays as it ended for as long as the child likes: nothing new starts by itself', () => {
    const t = new Table()
    t.gulps(t.at(0), 3)
    t.play(120)
    expect(t.game.sceneRunning).toBe(false)
    expect(t.game.yard.place).toBe('one-thing')
    expect(t.game.leaving).toBeNull()
  })

  it('moves the position once, however the yard is played on after its want is met', () => {
    const t = new Table()
    t.gulps(t.at(0), 5)
    expect(t.game.snapshot().position).toBe('two-things')
  })
})

describe('the worm', () => {
  it('comes up from mud, and what it saves when it starts is the mud', () => {
    const t = new Table()
    const spot = { x: 12.5, z: 7.5 }
    t.gulps(spot, 3)
    expect(t.game.wormAt).toBeNull()
    t.game.needsSave = 'none'
    t.gulp(spot)
    expect(t.game.wormAt).not.toBeNull()
    expect(t.game.needsSave).toBe('now')
    expect(levelAt(decode(deserializeSave(JSON.parse(JSON.stringify(t.game.snapshot()))).wet), 12.5, 7.5)).toBe('mud')
    t.play(6)
    expect(t.game.wormAt).toBeNull()
    expect(t.game.sceneRunning).toBe(false)
  })

  it('works every time, in any yard', () => {
    for (const place of LADDER) {
      const t = new Table(saved(place))
      t.gulps({ x: 12.5, z: 8.2 }, 4)
      expect(t.game.wormAt, place).not.toBeNull()
    }
  })
})

describe('the bell and the way on', () => {
  it('rings with each gulp and opens the gate on the third ring', () => {
    const t = new Table()
    t.gulps(BELL, RINGS_TO_OPEN - 1)
    expect(t.game.latch).toBe(RINGS_TO_OPEN - 1)
    expect(t.game.leaving).toBeNull()
    t.gulp(BELL)
    expect(t.game.leaving).not.toBeNull()
  })

  it('drops the latch after a few seconds without a ring, so a passing sweep opens nothing', () => {
    const t = new Table()
    t.gulps(BELL, 2)
    t.play(LATCH_DROPS_S + 0.5)
    expect(t.game.latch).toBe(0)
    t.gulps(BELL, 2)
    expect(t.game.leaving).toBeNull()
  })

  it('saves the next yard when the drive starts, so a put-away in the middle finds the truck there', () => {
    const t = new Table()
    const next = t.game.save.next
    t.gulps(BELL, 2)
    t.game.needsSave = 'none'
    t.game.press({ truck: false, point: BELL }, t.now)
    t.game.lift()
    t.play(0.6)
    expect(t.game.leaving).not.toBeNull()
    expect(t.game.needsSave).toBe('now')
    expect(t.game.snapshot().yard).toEqual(next)
    t.game.rest()
    const again = t.reload()
    expect(again.game.yard.place).toBe(next.place)
    expect(again.game.leaving).toBeNull()
    for (const channel of CHANNELS) expect(again.game.channels[channel]).toBe(0)
  })

  it('arrives after about four and a half seconds with the truck in its place and the new yard dry', () => {
    const t = new Table()
    t.gulp({ x: 12, z: 8 })
    t.gulps(BELL, 3)
    t.play(5)
    expect(t.game.leaving).toBeNull()
    expect(t.game.way).toBeNull()
    expect(t.game.yard.ground.every((gulps) => gulps === 0)).toBe(true)
    expect(t.game.paint.at(12, 8).damp).toBe(0)
  })

  it('gives way to a touch: the truck is in the new yard at once, and the touch is then an ordinary touch', () => {
    const t = new Table(saved('one-thing', 0, { next: { place: 'one-thing', arrangement: 1 } }))
    t.gulps(BELL, 3)
    expect(t.game.leaving).not.toBeNull()
    const want = t.at(t.game.yard.want)
    t.game.press({ truck: false, point: want }, t.now)
    expect(t.game.leaving).toBeNull()
    t.game.lift()
    t.play(0.6)
    expect(t.game.yard.things[t.game.yard.want].gulps).toBe(1)
  })

  it('judges the yard that is left: up after a want met, not up after one left unmet', () => {
    const met = new Table()
    met.gulps(met.at(0), 3)
    met.gulps(BELL, 3)
    expect(met.game.snapshot().position).toBe('two-things')
    const unmet = new Table(saved('two-things'))
    unmet.gulps(BELL, 3)
    expect(['one-thing', 'two-things']).toContain(unmet.game.snapshot().position)
  })

  it('starts nothing by itself: an untouched yard is the same yard a long while later', () => {
    const t = new Table()
    t.play(300)
    expect(t.game.yard.place).toBe('one-thing')
    expect(t.game.yard.things[0].gulps).toBe(0)
    expect(t.game.leaving).toBeNull()
  })
})

describe('found as left', () => {
  it('loses nothing to a put-away at any instant: water in the air is in the yard when it is found again', () => {
    const t = new Table()
    t.game.press({ truck: false, point: t.at(0) }, 0)
    t.game.rest()
    expect(t.reload().game.yard.things[0].gulps).toBe(1)
  })

  it('finds every thing with the water it held and where it was, and the sand as wet as it was', () => {
    const t = new Table(saved('whole-garden'))
    t.game.yard.things.forEach((_, index) => t.gulp(t.at(index)))
    t.gulps({ x: 12.4, z: 8.1 }, 3)
    const before = t.game.yard
    const again = t.reload()
    expect(again.game.yard.things).toEqual(before.things)
    expect(levelAt(again.game.yard.ground, 12.4, 8.1)).toBe('puddle')
    // Nothing eases in: every thing shows its water in the first frame.
    again.play(FRAME)
    const pool = again.game.yard.things.find((thing) => thing.kind === 'pool')!
    expect(again.game.motion.pool.pose.level).toBeGreaterThan(pool.gulps > 0 ? 0.1 : -1)
  })

  it('makes no sound and plays no scene on load, whatever state it was left in', () => {
    for (const place of LADDER) {
      const t = new Table(saved(place))
      t.gulps(t.at(t.game.yard.want), 2)
      const again = t.reload()
      again.play(1)
      expect(again.heard, place).toHaveLength(0)
      expect(again.game.sceneRunning).toBe(false)
    }
  })
})

describe('the truck at rest', () => {
  it('turns its nozzle to what wants water and hangs a drop from it, and stops once the want is met', () => {
    const t = new Table()
    t.play(3)
    expect(t.game.hangingDrop).toBeGreaterThan(0.9)
    expect(t.game.wants).toEqual(t.at(0))
    t.gulps(t.at(0), 3)
    t.play(3)
    expect(t.game.hangingDrop).toBe(0)
    // Then the bell is the one next thing.
    expect(t.game.wants).toEqual(BELL)
  })
})
