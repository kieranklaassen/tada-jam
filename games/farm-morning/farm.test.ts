import { describe, expect, it } from 'vitest'
import { BROUGHT, CELLS, GRID, RIGHT, SOAKED, SPRAY_REACHES, cellOf } from './cells'
import { DOOR_GUARD_S, Farm, STAYS_UP_S } from './farm'
import { BODY, HENHOUSE, HENS, HOME, HORN, MIDDLE, MOUTH, RACK, ROOFTOP, ROOST, THINGS, TROUGH, USE_AT, USE_PLACE, VISIT, centreOf, doorBox, henCircle, sunY, type Point, type ThingId } from './layout'
import { henRig } from './motion'
import { BACK_S, CROW, DRUM, FILLS_FROM, GLUGS, HAYSTACK, LEAP_S, PECK_BEAT, USES } from './timeline'
import { ANIMALS, deserialize, freshState, serialize, type AnimalId, type GameState } from './state'

const open = (content: AnimalId[] = []): GameState => ({ ...freshState(null), door: 'open', content })
const shut = (): GameState => ({ ...freshState(null), door: 'shut', content: [] })
const yard = (state: GameState = open(), seed = 1): Farm => new Farm(state, seed)
const play = (farm: Farm, seconds: number): void => { for (let t = 0; t < seconds; t += 1 / 60) farm.step(1 / 60) }
const tap = (farm: Farm, at: Point): void => { farm.press(at.x, at.y); farm.tap() }
const where = (farm: Farm, animal: AnimalId): Point => (animal === 'hens' ? henCircle(farm.hens[0], HENS[0].size) : centreOf(BODY[animal]))
const door = (farm: Farm): Point => { const box = doorBox(farm.slide); return { x: box.x + box.w / 2, y: box.y + 40 } }
/** Lifts a thing and waits until a second tap would lay it down. */
const lift = (farm: Farm, thing: ThingId): void => { tap(farm, HOME[thing]); play(farm, STAYS_UP_S + 0.1); farm.takeSounds(); farm.takeChange() }

describe('a touch', () => {
  it('is answered when the finger lands, on everything in the yard, with a sound', () => {
    const spots: [string, (farm: Farm) => Point][] = [
      ...THINGS.map((thing): [string, (farm: Farm) => Point] => [thing, () => HOME[thing]]),
      ...ANIMALS.map((animal): [string, (farm: Farm) => Point] => [animal, (farm) => where(farm, animal)]),
      ['door', door], ['hatch', () => ({ x: 246, y: 160 })], ['sun', (farm) => ({ x: 804, y: farm.sun })], ['cloud', () => ({ x: 398, y: 60 })], ['bare page', () => ({ x: 660, y: 40 })],
    ]
    for (const [name, at] of spots) {
      const farm = yard()
      const spot = at(farm)
      // No step is played between the press and the look: the answer is there in the same call.
      farm.press(spot.x, spot.y)
      expect(farm.takeSounds().length, name).toBeGreaterThan(0)
    }
  })

  it('lifts a thing, which stays lifted until it is used or laid down', () => {
    const farm = yard()
    tap(farm, HOME.brush)
    expect(farm.hand?.thing).toBe('brush')
    expect(farm.takeSounds()).toEqual(['lift-brush'])
    play(farm, 30)
    expect(farm.hand?.thing).toBe('brush')
    expect(farm.hand?.mode).toBe('held')
    tap(farm, farm.hand!)
    expect(farm.hand).toBeNull()
    expect(farm.takeSounds()).toEqual(['lay'])
  })

  it('keeps a thing up through a double tap: the second tap of two does not lay it down', () => {
    const farm = yard()
    tap(farm, HOME.scoop)
    play(farm, 0.15)
    tap(farm, farm.hand!)
    expect(farm.hand?.thing).toBe('scoop')
    expect(farm.takeSounds()).toContain('clink')
  })

  it('takes another thing with one tap while one is lifted', () => {
    const farm = yard()
    lift(farm, 'scoop')
    tap(farm, HOME.fork)
    expect(farm.hand?.thing).toBe('fork')
  })
})

describe('the grid', () => {
  it('answers every pair with its own cell, at the press, and puts the thing back over its place, full again', () => {
    for (const brought of BROUGHT) {
      for (const animal of ANIMALS) {
        const farm = yard()
        if (brought !== 'finger') lift(farm, brought)
        const spot = where(farm, animal)
        farm.press(spot.x, spot.y)
        const id = cellOf(brought, animal)
        expect(farm.answers[animal]?.id, id).toBe(id)
        expect(farm.takeSounds(), id).toContain(id)
        farm.tap()
        play(farm, CELLS[id].lasts + 1.5)
        expect(farm.answers[animal], id).toBeNull()
        if (brought !== 'finger') {
          expect(farm.hand?.thing, id).toBe(brought)
          expect(farm.hand?.mode, id).toBe('held')
          expect(farm.hand?.loaded, id).toBe(true)
          const hover = farm.hoverOf(brought)
          expect(Math.hypot(farm.hand!.x - hover.x, farm.hand!.y - hover.y), id).toBeLessThan(2)
        }
      }
    }
    expect(GRID.length).toBe(20)
  })

  it('leaves the scoop in the goat\'s teeth until they clonk on the tin, and then it pings back over its place', () => {
    const farm = yard()
    lift(farm, 'scoop')
    tap(farm, where(farm, 'goat'))
    // Just before the clonk the scoop is at the goat's mouth, empty.
    play(farm, 1.35)
    expect(Math.hypot(farm.hand!.x - MOUTH.goat.x, farm.hand!.y - MOUTH.goat.y)).toBeLessThan(60)
    expect(farm.hand?.loaded).toBe(false)
    play(farm, 1)
    expect(farm.hand?.mode).toBe('held')
    expect(farm.hand?.loaded).toBe(true)
    expect(Math.abs(farm.hand!.x - HOME.scoop.x)).toBeLessThan(2)
  })

  it('brings every ear up when a thing is lifted', () => {
    const farm = yard()
    expect(farm.lifted).toBeGreaterThan(2)
    tap(farm, HOME.fork)
    expect(farm.lifted).toBe(0)
    play(farm, 3)
    expect(farm.lifted).toBeGreaterThan(2)
  })

  it('sends the brushed hen strutting out and back on stiff quick steps, and the other two stay put', () => {
    const farm = yard()
    lift(farm, 'brush')
    const hen = farm.hens[0], from = { x: hen.x, y: hen.y }
    tap(farm, where(farm, 'hens'))
    play(farm, 1.4)
    expect(Math.hypot(hen.x - from.x, hen.y - from.y)).toBe(0)
    let furthest = 0, steps = hen.walked
    for (let t = 1.4; t < 3.6; t += 1 / 60) {
      farm.step(1 / 60)
      if (hen.mode === 'go') expect(hen.strut).toBe(true)
      furthest = Math.max(furthest, Math.hypot(hen.x - from.x, hen.y - from.y))
    }
    steps = hen.walked - steps
    expect(furthest).toBeGreaterThan(25)
    // Five steps or so: far more leg than the ground she covers.
    expect(steps).toBeGreaterThan(furthest * 4)
    expect(Math.hypot(hen.x - from.x, hen.y - from.y)).toBeLessThan(1)
    expect(farm.hens[1].mode).toBe('stand')
    expect(farm.hens[2].mode).toBe('stand')
  })

  it('throws the goat\'s one spark off the tip of its horn', () => {
    const farm = yard()
    lift(farm, 'brush')
    tap(farm, where(farm, 'goat'))
    play(farm, 1.94)
    expect(farm.bits.some((bit) => bit.kind === 'spark')).toBe(false)
    play(farm, 0.04)
    const sparks = farm.bits.filter((bit) => bit.kind === 'spark')
    // One spark, and a long one.
    expect(sparks).toHaveLength(1)
    expect(sparks[0].size).toBe(2)
    expect(CELLS['brush-goat'].bursts.filter((burst) => burst.kind === 'spark').map((burst) => burst.count)).toEqual([1])
    for (const spark of sparks) {
      expect(Math.hypot(spark.x - HORN.x, spark.y - HORN.y)).toBeLessThan(30)
      // Up and away from the head.
      expect(spark.vy).toBeLessThan(0)
    }
  })

  it('turns the nearest animal round to a knock on the bare page', () => {
    const farm = yard()
    tap(farm, { x: 700, y: 640 })
    expect(farm.takeSounds()).toEqual(['knock'])
    expect(farm.turned).toMatchObject({ animal: 'pig', since: 0 })
    play(farm, 2)
    expect(farm.turned).toBeNull()
    tap(farm, { x: 660, y: 40 })
    expect(farm.turned?.animal).toBe('pony')
    tap(farm, { x: 500, y: 620 })
    expect(farm.turned).toMatchObject({ animal: 'hens', lead: 2 })
  })

  it('answers a tap on a hen\'s own patch while she is away across the yard: she answers from where she is', () => {
    const farm = yard()
    lift(farm, 'scoop')
    tap(farm, where(farm, 'pig'))
    play(farm, 3)
    farm.takeSounds()
    // The hens are at the wallow; the white hen's patch is bare.
    const patch = henCircle(HENS[0].home, HENS[0].size)
    expect(Math.hypot(farm.hens[0].x - HENS[0].home.x, farm.hens[0].y - HENS[0].home.y)).toBeGreaterThan(300)
    expect(farm.targetAt(patch)).toEqual({ kind: 'animal', animal: 'hens', lead: 0 })
    tap(farm, patch)
    expect(farm.answers.hens?.id).toBe('scoop-hens')
    // Behind a shut door the patch is bare page.
    expect(yard(shut()).targetAt(patch).kind).not.toBe('animal')
  })

  it('throws every loose bit a cell lists, and clears them all away', () => {
    for (const brought of BROUGHT) {
      for (const animal of ANIMALS) {
        // The pony, the pig and the hens have their thing here, so none raises dust of its own while the answer plays.
        const farm = yard(open(['pony', 'pig', 'hens']))
        if (brought !== 'finger') lift(farm, brought)
        const spot = where(farm, animal)
        tap(farm, spot)
        let most = 0
        for (let t = 0; t < CELLS[cellOf(brought, animal)].lasts + 3; t += 1 / 60) { farm.step(1 / 60); most = Math.max(most, farm.bits.length) }
        if (CELLS[cellOf(brought, animal)].bursts.length > 0) expect(most, `${brought}-${animal}`).toBeGreaterThan(0)
        expect(most).toBeLessThanOrEqual(farm.maxBits)
        expect(farm.bits.filter((bit) => bit.kind !== 'bubble').length, `${brought}-${animal}`).toBe(0)
      }
    }
  })

  it('caps the loose bits at what the quality tier allows', () => {
    const farm = yard()
    farm.maxBits = 10
    lift(farm, 'bucket')
    tap(farm, where(farm, 'pig'))
    let most = 0
    for (let t = 0; t < 4; t += 1 / 60) { farm.step(1 / 60); most = Math.max(most, farm.bits.length) }
    expect(most).toBeLessThanOrEqual(10)
  })

  it('makes an animal content with its right thing, asks for that to be saved at once, and fills its want', () => {
    for (const animal of ANIMALS) {
      const farm = yard()
      lift(farm, RIGHT[animal])
      tap(farm, where(farm, animal))
      expect(farm.takeChange(), animal).toBe('now')
      expect(farm.toState().content, animal).toEqual([animal])
      play(farm, 4)
      expect(farm.filled[animal], animal).toBe(1)
      // The same thing again is the same answer, and nothing more to save.
      tap(farm, where(farm, animal))
      expect(farm.answers[animal]?.id).toBe(cellOf(RIGHT[animal], animal))
      expect(farm.takeChange(), animal).toBeNull()
    }
  })

  it('changes nothing saved with a wrong thing or a bare finger', () => {
    for (const brought of BROUGHT) {
      for (const animal of ANIMALS) {
        if (brought === RIGHT[animal]) continue
        const farm = yard()
        if (brought !== 'finger') lift(farm, brought)
        tap(farm, where(farm, animal))
        play(farm, 6)
        expect(farm.takeChange(), `${brought}-${animal}`).toBeNull()
        expect(farm.toState()).toEqual(open())
      }
    }
  })

  it('keeps a content animal content whatever is done to it next', () => {
    const farm = yard(open(['pig']))
    for (const thing of THINGS) { lift(farm, thing); tap(farm, where(farm, 'pig')); play(farm, 5) }
    expect(farm.toState().content).toEqual(['pig'])
    expect(farm.filled.pig).toBe(1)
  })

  it('raises the sun with each content animal', () => {
    const heights = [0, 1, 2, 3, 4].map((n) => yard(open(ANIMALS.slice(0, n) as AnimalId[])).sun)
    for (let i = 1; i < heights.length; i++) expect(heights[i]).toBeLessThan(heights[i - 1])
    expect(heights[4]).toBe(sunY(4))
  })

  it('soaks the goat when water lands on the pony, every time', () => {
    const farm = yard()
    lift(farm, 'bucket')
    tap(farm, where(farm, 'pony'))
    play(farm, SPRAY_REACHES - 0.1)
    expect(farm.answers.goat).toBeNull()
    play(farm, 0.2)
    expect(farm.answers.goat?.id).toBe(SOAKED)
    play(farm, 6)
    expect(farm.answers.goat).toBeNull()
  })

  it('brings the hens running to grain thrown anywhere: they peck beside the animal, and walk home again', () => {
    for (const animal of ['pony', 'goat', 'pig'] as const) {
      const farm = yard()
      lift(farm, 'scoop')
      tap(farm, where(farm, animal))
      farm.takeSounds()
      const pecked = [false, false, false]
      // Each hen clucks as she sets off, if she has far enough to go to be seen running: the white hen always has.
      const ran = new Set<string>()
      for (let t = 0; t < 5; t += 1 / 60) {
        farm.step(1 / 60)
        const heard = farm.takeSounds()
        for (const sound of heard) if (sound.startsWith('run-')) ran.add(sound)
        farm.hens.forEach((hen, i) => {
          const there = hen.mode === 'peck' && hen.x === VISIT[animal][i].x && hen.y === VISIT[animal][i].y
          // Her pecks sound in the step she starts pecking, and never before she is there.
          if (heard.includes(`tok-${HENS[i].id}`)) { expect(there, `${animal} hen ${i} is there`).toBe(true); expect(pecked[i]).toBe(false) }
          else if (there && !pecked[i]) throw new Error(`${animal} hen ${i} pecks without a sound`)
          pecked[i] ||= there
        })
      }
      expect(pecked, animal).toEqual([true, true, true])
      expect(ran.has('run-white'), animal).toBe(true)
      play(farm, 14)
      farm.hens.forEach((hen, i) => {
        expect(Math.hypot(hen.x - HENS[i].home.x, hen.y - HENS[i].home.y), `${animal} hen ${i}`).toBeLessThan(1)
        expect(hen.mode).toBe('stand')
      })
    }
  })

  it('has the hens drum on a shut door when grain is thrown outside', () => {
    const farm = yard(shut())
    lift(farm, 'scoop')
    tap(farm, where(farm, 'goat'))
    expect(farm.takeSounds()).toContain('hens-drum')
    expect(farm.hens.every((hen) => hen.inside)).toBe(true)
    // The door shakes while they drum, which is from the first knock to the last, and not before.
    expect(farm.doorShake).toBe(0)
    play(farm, DRUM.from - 0.1)
    expect(farm.doorShake).toBe(0)
    for (let knock = 0; knock < DRUM.knocks; knock++) {
      play(farm, knock === 0 ? 0.15 : DRUM.every)
      expect(farm.doorShake, `knock ${knock}`).toBeGreaterThan(0.5)
    }
    play(farm, 1)
    expect(farm.doorShake).toBe(0)
  })

  it('never sets the three hens off in step', () => {
    const farm = yard()
    lift(farm, 'scoop')
    tap(farm, where(farm, 'hens'))
    const waits = farm.hens.map((hen) => hen.wait)
    expect(new Set(waits.map((wait) => wait.toFixed(2))).size).toBe(3)
  })
})

describe('a drag', () => {
  it('carries a thing above the finger and uses it on the animal it is let go over', () => {
    const farm = yard()
    farm.press(HOME.fork.x, HOME.fork.y)
    farm.dragStart()
    const to = MIDDLE.goat
    farm.dragMove(to.x, to.y)
    expect(farm.hand?.mode).toBe('carried')
    expect(farm.hand?.y).toBeLessThan(to.y)
    expect(farm.eager).toBe('goat')
    farm.dragLift()
    farm.dragEnd()
    expect(farm.answers.goat?.id).toBe('fork-goat')
    expect(farm.toState().content).toEqual(['goat'])
    expect(farm.eager).toBeNull()
  })

  it('survives a lifted finger: the thing waits where it was let go, and a finger that comes back carries on', () => {
    const farm = yard()
    farm.press(HOME.brush.x, HOME.brush.y)
    farm.dragStart()
    farm.dragMove(500, 500)
    farm.dragLift()
    play(farm, 0.2)
    expect(farm.hand?.mode).toBe('waiting')
    expect(farm.hand?.x).toBe(500)
    farm.dragMove(MIDDLE.pony.x, MIDDLE.pony.y)
    expect(farm.hand?.mode).toBe('carried')
    farm.dragEnd()
    expect(farm.answers.pony?.id).toBe('brush-pony')
  })

  it('does not count a drop that is no nearer the animal: the fork or the scoop let go on the shut door drifts back, and the door stays shut', () => {
    const drops: [ThingId, (farm: Farm) => Point][] = [['fork', door], ['scoop', () => centreOf(TROUGH)], ['fork', () => centreOf(TROUGH)], ['scoop', door]]
    for (const [thing, at] of drops) {
      const farm = yard(shut())
      play(farm, 0.5)
      farm.press(HOME[thing].x, HOME[thing].y); farm.dragStart()
      farm.takeSounds()
      const to = at(farm)
      farm.dragMove(to.x, to.y); farm.dragEnd()
      expect(ANIMALS.every((animal) => farm.answers[animal] === null), thing).toBe(true)
      expect(farm.takeSounds(), thing).toEqual(['drift'])
      expect(farm.door, thing).toBe('shut')
      expect(farm.playing, thing).toBeNull()
      play(farm, 1)
      expect(farm.hand, thing).toMatchObject({ thing, mode: 'held' })
      const hover = farm.hoverOf(thing)
      expect(Math.hypot(farm.hand!.x - hover.x, farm.hand!.y - hover.y), thing).toBeLessThan(2)
    }
    // Along the line from its place to the pony but off to one side, as far from the pony as it began: no use either.
    const side = yard(shut())
    side.press(HOME.fork.x, HOME.fork.y); side.dragStart()
    side.dragMove(330, 440); side.dragEnd()
    expect(ANIMALS.every((animal) => side.answers[animal] === null)).toBe(true)
  })

  it('counts when let go more than half way to an animal, and drifts back still lifted when let go short', () => {
    const from = HOME.bucket, to = MIDDLE.pig
    const along = (share: number): Point => ({ x: from.x + (to.x - from.x) * share, y: from.y + (to.y - from.y) * share })
    const far = yard()
    far.press(from.x, from.y); far.dragStart()
    const most = along(0.62)
    far.dragMove(most.x, most.y); far.dragEnd()
    expect(far.answers.pig?.id).toBe('bucket-pig')
    // Let go short of the pig, the bucket travels the rest by itself and tips out over it.
    expect(far.hand?.mode).toBe('leap')
    play(far, 0.3)
    expect(far.hand?.mode).toBe('tip')
    expect(Math.hypot(far.hand!.x - USE_AT.pig.x, far.hand!.y - USE_AT.pig.y)).toBeLessThan(1)

    const short = yard()
    short.press(from.x, from.y); short.dragStart()
    const little = along(0.25)
    short.dragMove(little.x, little.y); short.dragEnd()
    expect(ANIMALS.every((animal) => short.answers[animal] === null)).toBe(true)
    expect(short.takeSounds()).toContain('drift')
    play(short, 1)
    expect(short.hand?.thing).toBe('bucket')
    expect(short.hand?.mode).toBe('held')
    const hover = short.hoverOf('bucket')
    expect(Math.hypot(short.hand!.x - hover.x, short.hand!.y - hover.y)).toBeLessThan(2)
  })

  it('makes no move when it is taken away: the thing is back in its place and no animal answers', () => {
    const farm = yard()
    farm.press(HOME.scoop.x, HOME.scoop.y); farm.dragStart()
    farm.dragMove(MIDDLE.pony.x, MIDDLE.pony.y)
    farm.takeSounds()
    farm.dragCancel()
    expect(farm.hand).toBeNull()
    expect(farm.eager).toBeNull()
    expect(ANIMALS.every((animal) => farm.answers[animal] === null)).toBe(true)
    expect(farm.takeChange()).toBeNull()
  })

  it('leaves a press that was no tap with nothing held down', () => {
    const farm = yard()
    farm.press(HOME.scoop.x, HOME.scoop.y)
    farm.pressEnd()
    play(farm, 1)
    expect(farm.hand?.mode).toBe('held')
    // The next touch is its own: an animal is fed with one tap.
    tap(farm, where(farm, 'hens'))
    expect(farm.answers.hens?.id).toBe('scoop-hens')
  })
})

describe('the door', () => {
  it('opens when it is touched and only then: the hens wait behind it for as long as it takes', () => {
    const farm = yard(shut())
    play(farm, 60)
    expect(farm.door).toBe('shut')
    expect(farm.hens.every((hen) => hen.inside)).toBe(true)
    expect(farm.peek).toBe(1)
    farm.hens.forEach((hen, i) => expect(hen).toMatchObject(ROOST[i]))
    tap(farm, door(farm))
    expect(farm.takeSounds()).toContain('door-open')
    expect(farm.takeChange()).toBe('now')
    expect(farm.toState().door).toBe('open')
  })

  it('is one target with the trough while it is shut: a touch on the trough is the coming out, and a lifted thing stays lifted for the next touch', () => {
    const farm = yard(shut())
    lift(farm, 'scoop')
    tap(farm, centreOf(TROUGH))
    expect(farm.door).toBe('open')
    expect(farm.playing).toBe('coming-out')
    expect(farm.hand?.thing).toBe('scoop')
    expect(farm.answers.hens).toBeNull()
    play(farm, 4)
    tap(farm, centreOf(TROUGH))
    expect(farm.answers.hens?.id).toBe('scoop-hens')
    expect(farm.toState().content).toEqual(['hens'])
  })

  it('takes one slide from a double tap: a second touch straight after, in the same place, only rattles it', () => {
    for (const state of [shut(), open(['pig'])]) {
      const farm = yard(state)
      const at = door(farm)
      tap(farm, at)
      const playing = farm.playing
      farm.takeSounds(); farm.takeChange()
      play(farm, 0.2)
      tap(farm, at)
      expect(farm.door).toBe(state.door === 'shut' ? 'open' : 'shut')
      expect(farm.takeSounds()).toEqual(['rattle'])
      expect(farm.takeChange()).toBeNull()
      // The second tap of two does not end the scene the first one started.
      expect(farm.playing).toBe(playing)
    }
    expect(DOOR_GUARD_S).toBeGreaterThan(0.6)
  })
})

describe('the coming out', () => {
  it('saves the door as open when it starts, and brings the hens out in their order: the bantam, the russet hen, who trips, and the white hen, who shakes herself', () => {
    const farm = yard(shut())
    tap(farm, door(farm))
    expect(farm.playing).toBe('coming-out')
    expect(farm.toState().door).toBe('open')
    farm.takeSounds()
    const left: number[] = [-1, -1, -1]
    let tripped = false, shook = false
    const heard: string[] = []
    for (let t = 0; t < 3; t += 1 / 60) {
      farm.step(1 / 60)
      farm.hens.forEach((hen, i) => { if (left[i] < 0 && !hen.inside) left[i] = t })
      tripped ||= farm.hens[1].trip >= 0
      shook ||= farm.hens[0].shook >= 0
      heard.push(...farm.takeSounds())
    }
    expect(left[2]).toBeLessThan(left[1])
    expect(left[1]).toBeLessThan(left[0])
    expect(tripped).toBe(true)
    expect(shook).toBe(true)
    expect(heard).toEqual(['trip', 'shake'])
    expect(farm.playing).toBeNull()
    expect(farm.slide).toBe(1)
    farm.hens.forEach((hen, i) => expect(Math.hypot(hen.x - HENS[i].home.x, hen.y - HENS[i].home.y)).toBeLessThan(1))
  })

  it('is ended by any touch, with every hen in her place and no more of its sounds, and that touch is an ordinary touch', () => {
    const farm = yard(shut())
    tap(farm, door(farm))
    play(farm, 0.4)
    farm.takeSounds()
    tap(farm, HOME.brush)
    expect(farm.playing).toBeNull()
    expect(farm.slide).toBe(1)
    farm.hens.forEach((hen, i) => { expect(hen).toMatchObject(HENS[i].home); expect(hen.inside).toBe(false); expect(hen.mode).toBe('stand') })
    expect(farm.takeSounds()).toEqual(['lift-brush'])
    expect(farm.hand?.thing).toBe('brush')
  })
})

describe('the night and the new morning', () => {
  const night = (): Farm => {
    const farm = yard(open(['hens', 'pony', 'pig']))
    lift(farm, 'fork')
    tap(farm, where(farm, 'pig'))
    farm.takeSounds()
    tap(farm, door(farm))
    return farm
  }

  it('saves the door as shut and nobody content when it starts, at once', () => {
    const farm = night()
    expect(farm.playing).toBe('night')
    expect(farm.takeChange()).toBe('now')
    expect(farm.toState()).toEqual(shut())
    expect(farm.takeSounds()).toEqual(['hens-in'])
  })

  it('shows the page getting there beat by beat: in, dark, asleep, the moon, the sun up, a crow, and each awake and short again', () => {
    const farm = night()
    farm.takeSounds()
    const heard: string[] = []
    const run = (seconds: number): void => { for (let t = 0; t < seconds; t += 1 / 60) { farm.step(1 / 60); heard.push(...farm.takeSounds()) } }
    // What a wrong use left on the pig falls off as it falls asleep.
    run(0.6)
    expect(farm.answers.pig).toBeNull()
    // No hen is caught on the wrong side: the door is not shut while one is still walking.
    run(1.6)
    expect(farm.slide).toBe(0)
    expect(farm.hens.every((hen) => hen.inside)).toBe(true)
    run(1.4)
    expect(farm.dark).toBe(1)
    expect(farm.sunDip).toBe(1)
    expect([...farm.asleep].sort()).toEqual(['goat', 'hens', 'pig', 'pony'])
    // Everyone sleeps where they had settled: what is shown is still last morning's.
    expect(farm.filled).toMatchObject({ hens: 1, pony: 1, pig: 1 })
    expect(farm.peek).toBe(0)
    run(1.0)
    expect(farm.moon).toBeGreaterThan(0)
    run(4.6)
    expect(farm.playing).toBeNull()
    expect(farm.dark).toBe(0)
    expect(farm.sunDip).toBe(0)
    expect(farm.moon).toBe(-1)
    expect(farm.asleep.size).toBe(0)
    expect(farm.shown.size).toBe(0)
    run(1.2)
    expect(farm.filled).toEqual({ hens: 0, pony: 0, goat: 0, pig: 0 })
    expect(farm.peek).toBe(1)
    expect(heard).toEqual(['door-slide', 'door-clunk', 'nightfall', 'snore-pony', 'snore-goat', 'snore-pig', 'snore-hens', 'crow', 'yawn-pony', 'yawn-goat', 'yawn-pig', 'beaks'])
    // The new morning waits behind the door, which opens only when it is touched.
    run(60)
    expect(farm.door).toBe('shut')
    expect(farm.takeChange()).toBe('now')
    expect(farm.takeChange()).toBeNull()
  })

  it('brings the sun up to its low morning place, however many were content when the door was shut', () => {
    const farm = yard(open(['hens', 'pony', 'goat', 'pig']))
    expect(farm.sun).toBe(sunY(4))
    tap(farm, door(farm))
    // Once it is down behind the hill it is at its low place, and that is where it comes up and stays.
    play(farm, 3.9)
    expect(farm.sunDip).toBe(1)
    for (let t = 3.9; t < 12; t += 1 / 60) {
      farm.step(1 / 60)
      expect(Math.abs(farm.sun - sunY(0))).toBeLessThan(0.5)
    }
    expect(farm.sunDip).toBe(0)
    // And it climbs again with the first right thing of the new morning.
    tap(farm, door(farm))
    play(farm, 3)
    lift(farm, 'brush')
    tap(farm, where(farm, 'pony'))
    play(farm, 6)
    expect(farm.sun).toBe(sunY(1))
  })

  it('is ended by any touch at any moment, with the new morning standing and nothing more sounding', () => {
    for (const after of [0.05, 0.7, 2.5, 4, 6.2, 7.5]) {
      const farm = night()
      play(farm, after)
      farm.takeSounds()
      // Late enough that the door no longer takes the touch for the second tap of two.
      const late = after > DOOR_GUARD_S
      tap(farm, late ? door(farm) : { x: 660, y: 40 })
      expect(farm.playing, `${after}`).toBe(late ? 'coming-out' : null)
      expect(farm.takeSounds(), `${after}`).toEqual([late ? 'door-open' : 'knock'])
      expect(farm.dark).toBe(0)
      expect(farm.sunDip).toBe(0)
      expect(farm.moon).toBe(-1)
      expect(farm.asleep.size).toBe(0)
      expect(farm.shown.size).toBe(0)
      if (!late) {
        expect(farm.slide).toBe(0)
        expect(farm.peek).toBe(1)
        farm.hens.forEach((hen, i) => { expect(hen).toMatchObject(ROOST[i]); expect(hen.inside).toBe(true) })
      }
      expect(farm.toState().content).toEqual([])
    }
  })

  it('found in the middle of the night, the game opens on the new morning and plays nothing', () => {
    const farm = night()
    play(farm, 3)
    const again = yard(deserialize(JSON.parse(JSON.stringify(serialize(farm.toState())))))
    expect(again.playing).toBeNull()
    expect(again.dark).toBe(0)
    expect(again.door).toBe('shut')
    expect(again.peek).toBe(1)
    expect(again.filled).toEqual({ hens: 0, pony: 0, goat: 0, pig: 0 })
    play(again, 20)
    expect(again.takeSounds()).toEqual([])
  })
})

describe('the full morning', () => {
  const fourth = (): Farm => {
    const farm = yard(open(['hens', 'goat']))
    lift(farm, 'bucket')
    tap(farm, where(farm, 'pig'))
    play(farm, 5)
    lift(farm, 'brush')
    tap(farm, where(farm, 'pony'))
    return farm
  }

  it('follows the fourth right thing on the same touch, and saves nothing of its own: the answer has already written who is content', () => {
    const farm = fourth()
    // It is no scene yet: the fourth answer plays first.
    expect(farm.playing).toBeNull()
    expect(farm.takeChange()).toBe('now')
    play(farm, CELLS['brush-pony'].lasts - 0.6 - 0.05)
    expect(farm.playing).toBeNull()
    expect(farm.light).toBe(0)
    play(farm, 0.1)
    expect(farm.playing).toBe('full-morning')
    expect(farm.toState().content).toEqual(['hens', 'pony', 'goat', 'pig'])
    expect(farm.answers.pony?.id).toBe('brush-pony')
    play(farm, 12)
    expect(farm.takeChange()).toBeNull()
  })

  it('brings the full light, the cat out onto the roof, and each animal\'s settled sound in the order they were made content', () => {
    const farm = fourth()
    farm.takeSounds()
    const heard: string[] = []
    for (let t = 0; t < 11; t += 1 / 60) { farm.step(1 / 60); heard.push(...farm.takeSounds().filter((sound) => sound !== 'croon' && sound !== 'bubble')) }
    expect(farm.playing).toBeNull()
    expect(farm.light).toBe(1)
    expect(farm.cat).toBe(1)
    expect(farm.sun).toBe(sunY(4))
    // The pig and then the pony were made content this visit; the hens and the goat, found content, follow in yard order.
    expect(heard).toEqual(['cat-stretch', 'settled-pig', 'settled-pony', 'settled-hens', 'settled-goat'])
    // The cat on the roof answers a touch as itself.
    farm.press(ROOFTOP.x, ROOFTOP.y)
    expect(farm.takeSounds()).toEqual(['cat-stretch'])
  })

  it('is ended by any touch, with the light full and the cat out, and stays as long as the child likes', () => {
    const farm = fourth()
    play(farm, 4)
    expect(farm.playing).toBe('full-morning')
    farm.takeSounds()
    tap(farm, { x: 660, y: 40 })
    expect(farm.playing).toBeNull()
    expect(farm.light).toBe(1)
    expect(farm.cat).toBe(1)
    expect(farm.takeSounds()).toEqual(['knock'])
    play(farm, 120)
    expect(farm.toState().content).toEqual(['hens', 'pony', 'goat', 'pig'])
    expect(farm.door).toBe('open')
    expect(farm.light).toBe(1)
  })

  it('cannot be ended before it begins: a touch during the fourth answer is answered, and the full morning follows', () => {
    // Every kind of second touch, 0.8 seconds into the fourth answer: the same animal again, another animal, a poke
    // after laying the thing down is not possible in the time, so a knock on the page, the sun, and another thing.
    const seconds: [string, (farm: Farm) => Point, string][] = [
      ['the pony again', (farm) => where(farm, 'pony'), 'brush-pony'],
      ['the goat', (farm) => where(farm, 'goat'), 'brush-goat'],
      ['the page', () => ({ x: 660, y: 40 }), 'knock'],
      ['the fork', () => HOME.fork, 'lift-fork'],
    ]
    for (const [name, at, sound] of seconds) {
      const farm = fourth()
      play(farm, 0.8)
      farm.takeSounds()
      tap(farm, at(farm))
      // The touch is answered, and has ended nothing: no full light at once, no cat on the roof.
      expect(farm.takeSounds(), name).toContain(sound)
      expect(farm.light, name).toBe(0)
      expect(farm.catOut, name).toBe(false)
      expect(farm.playing, name).toBeNull()
      const heard: string[] = []
      let began = -1, light = 0
      for (let t = 0; t < 14; t += 1 / 60) {
        farm.step(1 / 60)
        heard.push(...farm.takeSounds().filter((each) => each === 'cat-stretch' || each.startsWith('settled-')))
        if (began < 0 && farm.playing === 'full-morning') began = t
        // The page brightens over a second and more, never in one frame.
        expect(farm.light - light, name).toBeLessThan(0.05)
        light = farm.light
      }
      // It follows whatever answer that touch started: the pony's again, the goat's, or the fourth answer itself.
      const follows = sound === 'brush-pony' ? CELLS['brush-pony'].lasts - 0.6 : sound === 'brush-goat' ? Math.max(CELLS['brush-pony'].lasts - 0.8, CELLS['brush-goat'].lasts) - 0.6 : CELLS['brush-pony'].lasts - 0.8 - 0.6
      expect(Math.abs(began - follows), name).toBeLessThan(0.05)
      expect(heard, name).toEqual(['cat-stretch', 'settled-pig', 'settled-pony', 'settled-hens', 'settled-goat'])
      expect(farm.playing, name).toBeNull()
      expect(farm.light, name).toBe(1)
      expect(farm.cat, name).toBe(1)
    }
  })

  it('plays no ending on load: found in full light, with the cat back in the loft', () => {
    const farm = fourth()
    const again = yard(deserialize(JSON.parse(JSON.stringify(serialize(farm.toState())))))
    expect(again.playing).toBeNull()
    expect(again.light).toBe(1)
    expect(again.cat).toBe(0)
    expect(again.catOut).toBe(false)
    play(again, 30)
    expect(again.playing).toBeNull()
    expect(again.cat).toBe(0)
  })

  it('keeps every animal answering every thing in full light', () => {
    const farm = fourth()
    play(farm, 12)
    lift(farm, 'fork')
    tap(farm, where(farm, 'pig'))
    expect(farm.answers.pig?.id).toBe('fork-pig')
    expect(farm.playing).toBeNull()
    expect(farm.light).toBe(1)
  })
})

describe('found as left', () => {
  it('saves only the door and who is content, in a few bytes', () => {
    const farm = yard()
    lift(farm, 'brush')
    tap(farm, where(farm, 'pony'))
    play(farm, 1)
    const saved = serialize(farm.toState())
    expect(Object.keys(saved as object).sort()).toEqual(['content', 'door', 'v'])
    expect(JSON.stringify(saved).length).toBeLessThan(200)
  })

  it('opens again at any instant with nothing lost and nothing replayed', () => {
    // Put away in the middle of everything: a thing in the air, an answer half played, hens across the yard.
    const farm = yard()
    lift(farm, 'scoop')
    tap(farm, where(farm, 'hens'))
    play(farm, 0.4)
    lift(farm, 'bucket')
    tap(farm, where(farm, 'pig'))
    play(farm, 0.3)
    const again = yard(deserialize(JSON.parse(JSON.stringify(serialize(farm.toState()))), 5), 7)
    expect(again.toState()).toEqual(farm.toState())
    expect(again.toState().content).toEqual(['hens', 'pig'])
    // Nothing is in the air, no answer is playing, no sound is queued, and nothing is waiting to be saved.
    expect(again.hand).toBeNull()
    expect(again.bits.length).toBe(0)
    expect(ANIMALS.every((animal) => again.answers[animal] === null)).toBe(true)
    expect(again.takeSounds()).toEqual([])
    expect(again.takeChange()).toBeNull()
    // What stays is drawn as it stands, not eased in: the wants are full and the hens are where they rest.
    expect(again.filled).toEqual({ hens: 1, pony: 0, goat: 0, pig: 1 })
    expect(again.slide).toBe(1)
    again.hens.forEach((hen, i) => expect(hen).toMatchObject(again.restOf(i)))
    play(again, 20)
    // Left alone it only makes the sounds of a content yard: the hens croon and the pig's mud bubbles.
    expect(again.takeSounds().filter((sound) => sound !== 'croon' && sound !== 'bubble')).toEqual([])
    expect(again.toState()).toEqual(farm.toState())
  })

  it('does nothing by itself: left alone for minutes, the yard is as it was and waits', () => {
    for (const state of [open(), shut(), open(['goat'])]) {
      const farm = yard(state)
      play(farm, 180)
      expect(farm.toState()).toEqual(state)
      expect(farm.takeSounds()).toEqual([])
      expect(farm.takeChange()).toBeNull()
    }
  })

  it('plays the same yard from the same seed', () => {
    const run = (seed: number): string => {
      const farm = yard(open(), seed)
      lift(farm, 'bucket'); tap(farm, where(farm, 'hens')); play(farm, 1.7)
      return JSON.stringify([farm.hens, farm.bits])
    }
    expect(run(3)).toBe(run(3))
    expect(run(3)).not.toBe(run(4))
  })

  it('shows the idle ladder one move a child could make now, and another the next time', () => {
    expect(yard(shut()).want(0)).toEqual({ kind: 'door' })
    const farm = yard(open(['hens']))
    expect(farm.want(0)).toEqual({ kind: 'thing', thing: RIGHT.pony })
    expect(farm.want(1)).toEqual({ kind: 'carry', thing: RIGHT.pony, animal: 'pony' })
    expect(farm.want(2)).toEqual({ kind: 'thing', thing: RIGHT.goat })
    expect(farm.want(3)).toEqual({ kind: 'carry', thing: RIGHT.goat, animal: 'goat' })
    // With a thing lifted, the hand shows the animal that is short of it, every time.
    lift(farm, 'brush')
    expect(farm.want(0)).toEqual({ kind: 'animal', animal: 'pony' })
    expect(farm.want(1)).toEqual({ kind: 'animal', animal: 'pony' })
    // Once that animal has it, the hand shows the others in turn.
    lift(farm, 'scoop')
    expect(farm.want(0)).toEqual({ kind: 'animal', animal: 'pony' })
    expect(farm.want(1)).toEqual({ kind: 'animal', animal: 'goat' })
    // In full light: play on with any thing, or slide the door for the night.
    const full = yard(open(['hens', 'pony', 'goat', 'pig']))
    expect(full.want(0).kind).toBe('thing')
    expect(full.want(1)).toEqual({ kind: 'door' })
  })

  it('shows each want and lets the content be heard, by itself and saving nothing', () => {
    const dry = yard()
    let dust = 0
    for (let t = 0; t < 30; t += 1 / 60) { dry.step(1 / 60); dust = Math.max(dust, dry.bits.filter((bit) => bit.kind === 'dust').length) }
    expect(dust).toBeGreaterThan(0)
    expect(dry.takeSounds()).toEqual([])
    // The hens' want too: short of grain, each scratches beside the trough and her foot raises a little dust at her feet.
    const hungry = yard(open(['pony', 'pig']))
    const scratched = [false, false, false]
    for (let t = 0; t < 10; t += 1 / 60) {
      hungry.step(1 / 60)
      hungry.hens.forEach((hen, i) => { scratched[i] ||= hungry.bits.some((bit) => bit.kind === 'dust' && Math.abs(bit.x - hen.x) < 60 && Math.abs(bit.y - hen.y) < 30) })
    }
    expect(scratched).toEqual([true, true, true])
    const full = yard(open(['hens', 'pony', 'goat', 'pig']))
    play(full, 30)
    expect(full.bits.filter((bit) => bit.kind === 'dust').length).toBe(0)
    const heard = new Set(full.takeSounds())
    expect([...heard].sort()).toEqual(['bubble', 'croon'])
    expect(full.takeChange()).toBeNull()
  })
})

describe('the thing, the body, the bits and the sound on one clock', () => {
  it('keeps the brush on the pony for all four strokes, going along its side at each', () => {
    const farm = yard()
    lift(farm, 'brush')
    tap(farm, where(farm, 'pony'))
    const use = USES['brush-pony'], place = USE_PLACE['brush-pony']!
    let t = 0
    const to = (at: number): void => { for (; t < at; t += 1 / 120) farm.step(1 / 120) }
    for (const stroke of use.strokes!.at) {
      // At the start of a stroke the brush is at one end of its reach, and at the end of it at the other.
      to(stroke + 0.02)
      expect(farm.hand?.mode, `stroke at ${stroke}`).toBe('tip')
      expect(farm.hand!.x).toBeLessThan(place.x - use.strokes!.reach * 0.6)
      to(stroke + use.strokes!.lasts + 0.04)
      expect(farm.hand?.mode).toBe('tip')
      expect(farm.hand!.x).toBeGreaterThan(place.x + use.strokes!.reach * 0.6)
      expect(Math.abs(farm.hand!.y - place.y)).toBeLessThan(4)
    }
    // Then it goes back over its place, still lifted.
    to(use.leaves + BACK_S + 0.3)
    expect(farm.hand?.mode).toBe('held')
    expect(farm.hand?.thing).toBe('brush')
  })

  it('keeps the bucket at the goat\'s mouth, tipping further, until the last glug is down, and spills none of it', () => {
    const farm = yard()
    lift(farm, 'bucket')
    tap(farm, where(farm, 'goat'))
    const place = USE_PLACE['bucket-goat']!
    let tilt = 0
    for (let glug = 0; glug < GLUGS.count; glug++) {
      play(farm, glug === 0 ? GLUGS.from + 0.02 : GLUGS.every)
      expect(farm.hand?.mode, `glug ${glug}`).toBe('tip')
      expect(Math.hypot(farm.hand!.x - place.x, farm.hand!.y - place.y)).toBeLessThan(6)
      expect(Math.hypot(place.x - MOUTH.goat.x, place.y - MOUTH.goat.y)).toBeLessThan(90)
      expect(farm.hand!.loaded).toBe(true)
      if (glug > 0) expect(Math.abs(farm.hand!.tilt)).toBeGreaterThan(tilt)
      tilt = Math.abs(farm.hand!.tilt)
      expect(farm.bits.filter((bit) => bit.kind === 'drop')).toHaveLength(0)
    }
    play(farm, USES['bucket-goat'].leaves - GLUGS.from - GLUGS.every * (GLUGS.count - 1) + BACK_S + 0.2)
    expect(farm.hand?.mode).toBe('held')
    expect(farm.hand!.loaded).toBe(true)
  })

  it('drops the hay into the rack, which fills as the hay lands and not before', () => {
    const farm = yard()
    lift(farm, 'fork')
    tap(farm, where(farm, 'goat'))
    expect(farm.content.has('goat')).toBe(true)
    play(farm, LEAP_S + 0.06)
    // The fork is over the rack, the first straw is in the air inside it, and the rack is still empty.
    expect(farm.hand!.x).toBeGreaterThan(RACK.x)
    expect(farm.hand!.x).toBeLessThan(RACK.x + RACK.w)
    expect(farm.hand!.y).toBeLessThan(RACK.y)
    const straw = farm.bits.filter((bit) => bit.kind === 'straw')
    expect(straw.length).toBeGreaterThan(5)
    for (const bit of straw) {
      expect(bit.x).toBeGreaterThan(RACK.x - 12)
      expect(bit.x).toBeLessThan(RACK.x + RACK.w + 12)
      expect(bit.floor).toBeGreaterThan(RACK.y)
      expect(bit.floor).toBeLessThan(RACK.y + RACK.h)
    }
    expect(farm.filled.goat).toBe(0)
    play(farm, FILLS_FROM.goat - LEAP_S)
    expect(farm.filled.goat).toBeGreaterThan(0)
    expect(farm.filled.goat).toBeLessThan(1)
    play(farm, 1)
    expect(farm.filled.goat).toBe(1)
  })

  it('clunks when the door is shut, however long it waited for the hens, and only then does the sun start down', () => {
    for (const away of [false, true]) {
      const farm = yard()
      if (away) { lift(farm, 'scoop'); tap(farm, where(farm, 'pig')); play(farm, 2.4) }
      farm.takeSounds()
      tap(farm, door(farm))
      farm.takeSounds()
      const heard: string[] = []
      let clunkAt = -1
      for (let t = 0; t < 4; t += 1 / 120) {
        farm.step(1 / 120)
        const sounds = farm.takeSounds()
        if (sounds.includes('door-slide')) expect(farm.slide).toBeLessThan(1)
        if (sounds.includes('door-clunk')) {
          clunkAt = t
          expect(farm.slide).toBe(0)
          expect(farm.hens.every((hen) => hen.inside)).toBe(true)
          expect(farm.sunDip).toBe(0)
        }
        heard.push(...sounds)
      }
      expect(heard.slice(0, 3), away ? 'away' : 'home').toEqual(['door-slide', 'door-clunk', 'nightfall'])
      // The whole night is six to nine seconds, the wait for the hens included.
      let lasted = 4
      while (farm.playing) { farm.step(1 / 120); lasted += 1 / 120 }
      expect(lasted).toBeGreaterThan(6)
      expect(lasted).toBeLessThan(9)
      if (away) expect(clunkAt).toBeGreaterThan(1.5)
      else expect(clunkAt).toBeLessThan(1.4)
    }
  })

  it('has the white hen crow at her hole for as long as the crow sounds', () => {
    const farm = yard()
    tap(farm, door(farm))
    farm.takeSounds()
    let crowed = -1
    for (let t = 0; t < 9; t += 1 / 120) {
      farm.step(1 / 120)
      if (farm.takeSounds().includes('crow')) { crowed = t; expect(farm.crow).toBeGreaterThanOrEqual(0); expect(farm.crow).toBeLessThan(0.02); expect(farm.slide).toBe(0) }
      if (crowed >= 0 && t - crowed < CROW.lasts - 0.05) expect(farm.crow).toBeGreaterThanOrEqual(0)
    }
    expect(crowed).toBeGreaterThan(4)
    expect(farm.crow).toBe(-1)
  })

  it('has the cat on the roof stretch when the hatch under it is touched, and look out and mew when it is in the loft', () => {
    const farm = yard(open(['hens', 'pony', 'goat']))
    tap(farm, centreOf(HENHOUSE.hatch))
    expect(farm.takeSounds()).toEqual(['mew', 'knock'])
    expect(farm.hatch).toBe(0)
    expect(farm.catStretch).toBe(-1)
    play(farm, 3)
    lift(farm, 'bucket')
    tap(farm, where(farm, 'pig'))
    play(farm, 14)
    expect(farm.cat).toBe(1)
    farm.takeSounds()
    tap(farm, centreOf(HENHOUSE.hatch))
    expect(farm.takeSounds()).toEqual(['cat-stretch', 'knock'])
    expect(farm.catStretch).toBe(0)
    expect(farm.hatch).toBe(-1)
  })
})

describe('a thing taken away in the middle of a use', () => {
  it('leaves the goat thirsty: the glugs stop, the belly does not swell, and the goat looks after the bucket', () => {
    const farm = yard()
    lift(farm, 'bucket')
    tap(farm, where(farm, 'goat'))
    play(farm, 0.8)
    expect(farm.answers.goat?.id).toBe('bucket-goat')
    farm.takeSounds(); farm.takeStops()
    const pony = where(farm, 'pony')
    tap(farm, pony)
    expect(farm.answers.goat).toBeNull()
    expect(farm.takeStops()).toContain('goat')
    expect(farm.turned).toMatchObject({ animal: 'goat', left: true })
    // Its eyes are on where the bucket went.
    expect(farm.look).toMatchObject({ x: pony.x, y: pony.y })
    expect(farm.hand).toMatchObject({ thing: 'bucket', cell: 'bucket-pony', mode: 'leap' })
    // No fountain follows, three seconds on.
    for (let t = 0; t < 3; t += 1 / 60) { farm.step(1 / 60); expect(farm.bits.some((bit) => bit.kind === 'drop' && bit.x > 900 && bit.vy < -300)).toBe(false) }
  })

  it('stops the brush on the pony stroke by stroke: no more dust, and the coat it had begun to brush is brushed', () => {
    const farm = yard()
    lift(farm, 'brush')
    tap(farm, where(farm, 'pony'))
    play(farm, 0.7)
    expect(farm.content.has('pony')).toBe(true)
    expect(farm.filled.pony).toBeLessThan(0.3)
    tap(farm, HOME.fork)
    expect(farm.answers.pony).toBeNull()
    expect(farm.hand?.thing).toBe('fork')
    const dust = farm.bits.filter((bit) => bit.kind === 'dust').length
    for (let t = 0; t < 2.5; t += 1 / 60) { farm.step(1 / 60); expect(farm.bits.filter((bit) => bit.kind === 'dust').length).toBeLessThanOrEqual(dust) }
    // What the right thing gave is given, and saved: the coat is full as the brush leaves, not two seconds later.
    expect(farm.content.has('pony')).toBe(true)
    const again = yard()
    lift(again, 'brush')
    tap(again, where(again, 'pony'))
    play(again, 0.7)
    tap(again, HOME.fork)
    play(again, 0.3)
    expect(again.filled.pony).toBe(1)
  })

  it('takes nothing away once the thing has given what the answer needs: water thrown over the pony still reaches the goat', () => {
    const farm = yard()
    lift(farm, 'bucket')
    tap(farm, where(farm, 'pony'))
    play(farm, 0.5)
    tap(farm, where(farm, 'pig'))
    expect(farm.answers.pony?.id).toBe('bucket-pony')
    expect(farm.turned).toBeNull()
    play(farm, SPRAY_REACHES)
    expect(farm.answers.goat?.id).toBe(SOAKED)
    // Taken away before a drop had left it, it reaches nobody.
    const dry = yard()
    lift(dry, 'bucket')
    tap(dry, where(dry, 'pony'))
    play(dry, 0.1)
    tap(dry, where(dry, 'pig'))
    expect(dry.answers.pony).toBeNull()
    play(dry, SPRAY_REACHES + 0.5)
    expect(dry.answers.goat).toBeNull()
  })

  it('stops the hens where they are to look after it, and then they walk home', () => {
    const farm = yard()
    lift(farm, 'brush')
    tap(farm, where(farm, 'hens'))
    play(farm, 0.4)
    tap(farm, where(farm, 'pig'))
    expect(farm.answers.hens).toBeNull()
    expect(farm.takeStops()).toEqual(expect.arrayContaining(['hens', 'flock', 'hen-white', 'hen-russet', 'hen-bantam']))
    expect(farm.turned).toMatchObject({ animal: 'hens', left: true })
    for (const hen of farm.hens) expect(hen.mode).toBe('stand')
    play(farm, 6)
    farm.hens.forEach((hen, i) => expect(Math.hypot(hen.x - HENS[i].home.x, hen.y - HENS[i].home.y), `hen ${i}`).toBeLessThan(1))
  })

  it('lets the other two peck on, each with her toks, when one hen at spilled grain is poked', () => {
    const farm = yard()
    lift(farm, 'scoop')
    tap(farm, where(farm, 'pig'))
    play(farm, 1.3)
    // The scoop is back over its place: it is laid down, and the bantam is poked on her way.
    tap(farm, { x: farm.hand!.x, y: farm.hand!.y })
    expect(farm.hand).toBeNull()
    const tokked = new Set<string>(farm.takeSounds().filter((sound) => sound.startsWith('tok-') && sound !== 'tok-bantam'))
    farm.takeStops()
    tap(farm, henCircle(farm.hens[2], HENS[2].size))
    expect(farm.answers.hens).toMatchObject({ id: 'finger-hens', lead: 2 })
    // Her channel alone is stopped, and she alone leaves off.
    expect(farm.takeStops()).toEqual(['flock', 'hen-bantam'])
    expect(farm.hens[2].mode).toBe('stand')
    for (let t = 0; t < 1.8; t += 1 / 60) {
      farm.step(1 / 60)
      for (const sound of farm.takeSounds()) if (sound.startsWith('tok-')) {
        tokked.add(sound)
        // She is there and pecking in the step her toks start, and her pose is the peck: head down within half a beat.
        // The poked hen has left off: no toks of hers.
        expect(sound).not.toBe('tok-bantam')
        const i = sound === 'tok-white' ? 0 : 1
        expect(farm.hens[i].mode).toBe('peck')
        expect(henRig(i, farm.time, 'peck', 0, 0, 'finger-hens', 0.5, 1.3, false, PECK_BEAT[i] / 2).head).toBeGreaterThan(1)
      }
    }
    expect([...tokked].sort()).toEqual(['tok-russet', 'tok-white'])
    // The other two are pecking while the third answers the finger.
    expect(farm.hens[0].mode).toBe('peck')
    expect(farm.hens[1].mode).toBe('peck')
  })

  it('sends the bucket home when the spray soaks a goat that was drinking from it', () => {
    const farm = yard()
    lift(farm, 'bucket')
    tap(farm, where(farm, 'pony'))
    play(farm, 1.1)
    tap(farm, where(farm, 'goat'))
    expect(farm.answers.goat?.id).toBe('bucket-goat')
    play(farm, SPRAY_REACHES - 1.1 + 0.05)
    expect(farm.answers.goat?.id).toBe(SOAKED)
    expect(farm.hand?.mode).toBe('back')
  })
})

describe('the haystack', () => {
  it('walks a zigzag in front of the trough and walks into both other hens, each jumping with a bonk in the step she is touched', () => {
    for (const lead of [0, 1, 2]) {
      const farm = yard()
      lift(farm, 'fork')
      const hen = farm.hens[lead]
      tap(farm, henCircle(hen, HENS[lead].size))
      farm.takeSounds()
      const bumped: number[] = []
      let turns = 0, way = 0, last = hen.y, t = 0
      for (; t < CELLS['fork-hens'].lasts - 0.05; t += 1 / 60) {
        farm.step(1 / 60)
        const heard = farm.takeSounds()
        // Each turn of the zigzag is a change of way, towards the child or back.
        const dy = hen.y - last
        if (Math.abs(dy) > 0.2) { const now = Math.sign(dy); if (way !== 0 && now !== way) turns += 1; way = now }
        last = hen.y
        // While she walks across the trough she is out in front of it.
        if (hen.mode === 'go' && hen.wait <= 0 && hen.x > TROUGH.x + 10 && hen.x < TROUGH.x + TROUGH.w) expect(hen.y, `lead ${lead} at ${t.toFixed(2)}`).toBeGreaterThanOrEqual(TROUGH.y + TROUGH.h - 8)
        farm.hens.forEach((other, j) => {
          const sound = `bonk-${HENS[j].id}`
          if (other.bumped === 0 || heard.includes(sound as never)) {
            // The jump and the bonk start in the same step, with the haystack up against her.
            expect(heard, `lead ${lead} hen ${j}`).toContain(sound)
            expect(other.bumped, `lead ${lead} hen ${j}`).toBe(0)
            expect(Math.abs(hen.x - other.x), `lead ${lead} hen ${j}`).toBeLessThan(70)
            expect(Math.abs(hen.y - other.y), `lead ${lead} hen ${j}`).toBeLessThan(30)
            expect(Math.abs(t + 1 / 60 - HAYSTACK.bumps[bumped.length]), `lead ${lead} hen ${j} at ${t.toFixed(2)}`).toBeLessThan(0.2)
            bumped.push(j)
          }
        })
      }
      // Both of the others, the nearer first, and never herself.
      expect(bumped, `lead ${lead}`).toEqual(lead === 1 ? [0, 2] : [1, 2 - lead])
      expect(turns, `lead ${lead}`).toBeGreaterThanOrEqual(5)
      // Then her head pops out, and they all walk home.
      play(farm, 6)
      farm.hens.forEach((each, i) => expect(Math.hypot(each.x - HENS[i].home.x, each.y - HENS[i].home.y), `lead ${lead} hen ${i}`).toBeLessThan(1))
    }
  })
})
