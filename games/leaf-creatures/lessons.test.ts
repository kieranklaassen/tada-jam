import { describe, expect, it } from 'vitest'
import { onFern } from './cast'
import { BEDS, BED_REACH, CAST, GROUND, HEAPS, HOME, castAt, heapAt, inEllipse } from './clearing'
import { TIERS } from './config'
import type { Creature } from './creatures'
import { IDLE_BEFORE_DEMO, IDLE_BEFORE_GLOW, IdleLadder } from './guidance'
import { ForgivingTouch } from './input'
import { CORNER, inCorner } from './overlay'
import { Painter } from './painter'
import type { Kind } from './parts'
import { fresh, read, write } from './save'
import { Bus } from './sound'
import { fit, toStage } from './stage'
import { DT, RecordingPen, again, clearing, drag, heard, kept, lying, play, tapHeap, thing, toyOf } from './testing'
import { placed } from './things'
import { Toy, putAway } from './toy'
import { drawFrame } from './view'
import { holdsLadder, park } from './visit'

// What the readers of earlier games found, held here by name so that this
// game does not need the same round. Sight and sound on one clock are held
// in toy.test.ts, scenes.test.ts and voices.test.ts; the rest is here and in
// drawn.test.ts.

const SURFACES = [[1180, 820], [1024, 768], [820, 1180]] as const
const acorns = [{ x: 720, y: 420, dug: false }, { x: 400, y: 300, dug: false }, { x: 420, y: 540, dug: false }]

/** One creature standing still at 590, 420. */
function standing(kinds: readonly Kind[], more: Parameters<typeof thing>[5] = {}): { toy: Toy; creature: Creature } {
  const toy = toyOf(clearing([thing(1, 590, 420, kinds, 1, more)]))
  toy.creatures[0].rest = 999
  return { toy, creature: toy.creatures[0] }
}

/** A frame of a toy as the view draws it, written down. */
function frameOf(toy: Toy): string[] {
  const pen = new RecordingPen(), painter = new Painter(), all: string[] = []
  // The kept pictures are filled over the first frames: all of them are compared.
  for (let f = 0; f < 12; f++) { pen.reset(); drawFrame(pen, toy, null, TIERS[0], painter); all.push(...pen.log) }
  return all
}

/** Every state a put-away can come in: each is a toy and what was done to bring it there. */
const STATES: Record<string, () => Toy> = {
  'a part in the hand, fresh from its heap': () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'cap'])]))
    drag(toy, HEAPS.twig.x, HEAPS.twig.y, 500, 400)
    return toy
  },
  'a part in the hand, lifted from the earth': () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig', 'cap'])]))
    drag(toy, 590, 420, 300, 300)
    return toy
  },
  'an eye in the hand, pulled off a creature with three': () => {
    const { toy, creature } = standing(['willow', 'twig', 'cap', 'cap', 'cap'])
    const at = placed(creature.thing, creature.thing.parts[2])
    drag(toy, at.x, at.y, at.x, at.y - 260)
    return toy
  },
  'a part still in the air': () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig'])]))
    tapHeap(toy, 'maple')
    play(toy, 0.1)
    return toy
  },
  'a waking under way': () => {
    const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig', 'cap'])]))
    tapHeap(toy, 'cap')
    for (let f = 0; f < 150 && toy.sceneKind !== 'waking'; f++) toy.step(DT)
    play(toy, 1.2)
    return toy
  },
  'a bedding down under way': () => {
    const { toy, creature } = standing(['willow', 'willow', 'feather', 'cap', 'cap'], { drowsy: true })
    const at = placed(creature.thing, creature.thing.parts[0])
    drag(toy, at.x - 40, at.y, at.x + 70, at.y)
    play(toy, 1.5)
    return toy
  },
  'the eyes coming off': () => {
    const { toy, creature } = standing(['willow', 'twig', 'twig', 'cap', 'cap'])
    const at = placed(creature.thing, creature.thing.parts[3])
    drag(toy, at.x, at.y, at.x, at.y - 260)
    play(toy, 1)
    return toy
  },
  'an acorn coming up': () => {
    const toy = toyOf(clearing([thing(1, 600, 420, ['seed', 'seed', 'cap', 'cap'], 1)], { acorns }))
    for (let f = 0; f < 1200 && toy.sceneKind !== 'acorn'; f++) toy.step(DT)
    play(toy, 1)
    return toy
  },
  'a hat on the toad': () => {
    const toy = toyOf(clearing([]))
    drag(toy, HEAPS.maple.x, HEAPS.maple.y, CAST.toad.x, CAST.toad.y + 20, 30)
    toy.drop()
    return toy
  },
  'a sixth creature woken, the eldest walking off': () => {
    const five = [0, 1, 2, 3, 4].map((i) => thing(i + 1, 380 + i * 100, 330 + (i % 2) * 120, ['twig', 'cap', 'cap'], i + 1))
    const toy = toyOf(clearing([...five, thing(9, 590, 520, ['willow', 'cap'])]))
    toy.focus = toy.things[5]
    tapHeap(toy, 'cap')
    for (let f = 0; f < 150 && toy.sceneKind !== 'waking'; f++) toy.step(DT)
    play(toy, 0.5)
    return toy
  },
  'a first visit, its first showing not yet touched': () => {
    const toy = new Toy(fresh(3, 5), 5)
    for (let f = 0; f < 120; f++) toy.step(DT)
    return toy
  },
  'a finger on the ground, calling': () => {
    const { toy } = standing(['twig', 'twig', 'cap', 'cap'])
    toy.press(400, 330)
    play(toy, 0.6)
    return toy
  },
}

/** What shows that each of those states was really reached before the put-away. */
const REACHED: Record<string, (toy: Toy) => boolean> = {
  'a part in the hand, fresh from its heap': (toy) => toy.hand?.kind === 'twig' && toy.hand.from === null,
  'a part in the hand, lifted from the earth': (toy) => toy.hand !== null && toy.hand.from !== null,
  'an eye in the hand, pulled off a creature with three': (toy) => toy.hand?.pulled === true && toy.scene === null,
  'a part still in the air': (toy) => toy.things[0].parts.some((part) => part.fall > 0),
  'a waking under way': (toy) => toy.sceneKind === 'waking',
  'a bedding down under way': (toy) => toy.sceneKind === 'bedding',
  'the eyes coming off': (toy) => toy.sceneKind === 'eyes' && toy.ghost !== null,
  'an acorn coming up': (toy) => toy.sceneKind === 'acorn',
  'a hat on the toad': (toy) => toy.cast.toad.hat?.kind === 'maple',
  'a sixth creature woken, the eldest walking off': (toy) => toy.creatures.length === 6 && toy.creatures.some((creature) => creature.leaving),
  'a first visit, its first showing not yet touched': (toy) => !toy.touched && toy.things.length > 0,
  'a finger on the ground, calling': (toy) => toy.finger !== null,
}

describe('lesson 4: nothing is left pending', () => {
  it('no flag outlives its touch: after a tap, a drop or a cancel nothing is in the hand, gripped, held or called', () => {
    const ends: ((toy: Toy) => void)[] = [(toy) => toy.tap(), (toy) => toy.drop(), (toy) => toy.cancel()]
    for (const end of ends) {
      for (const [x, y] of [[HEAPS.twig.x, HEAPS.twig.y], [590, 420], [486, 420], [300, 300], [CAST.toad.x, CAST.toad.y], [1066, 420]]) {
        const { toy, creature } = standing(['willow', 'twig', 'cap', 'cap'])
        toy.press(x, y)
        toy.move(x + 30, y - 30); toy.step(DT)
        end(toy)
        expect([toy.hand, toy.grip, toy.finger, creature.held], `${x},${y}`).toEqual([null, null, null, -1])
        for (const one of toy.things) for (const part of one.parts) expect(part.inHand).toBe(false)
      }
    }
  })

  it('nothing starts or sounds on load: no scene, no blow, no gulp, no habit and no sound until a finger lands, and the first touch is heard alone', () => {
    const full = toyOf(clearing([thing(1, 500, 380, ['seed', 'seed', 'cap', 'cap'], 1), thing(2, 700, 470, ['round', 'round', 'cap', 'cap'], 2), thing(3, 590, 300, ['willow', 'cap'])], { acorns }))
    const toy = again(full)
    expect(toy.touched).toBe(false)
    toy.step(DT)
    // No timer is full when the game is found: nobody blows, gulps or sets off in its first frame.
    expect(toy.cast.events).toEqual([])
    expect(toy.creatures.map((creature) => [creature.habit, creature.leap, creature.tumble, creature.poke, creature.inScene])).toEqual([[null, null, null, null, false], [null, null, null, null, false]])
    for (let f = 0; f < 600; f++) { toy.step(DT); expect(toy.asked).toEqual([]); expect(toy.scene).toBeNull() }
    expect(toy.acorns.every((acorn) => !acorn.dug)).toBe(true)
    toy.press(240, 420)
    expect(heard(toy)).toEqual(['pat'])
  })
})

describe('lesson 5: parked equals loaded', () => {
  for (const [name, make] of Object.entries(STATES)) {
    it(`put away with ${name}, the game is exactly what a load of what was saved gives, and draws the same frame`, () => {
      const toy = make()
      expect(REACHED[name](toy)).toBe(true)
      const parked = putAway(toy, 6, 99), loaded = again(toy)
      expect(write(parked.saved())).toEqual(write(loaded.saved()))
      // Nothing of the visit before is carried over: no hand, no scene, no sound waiting, no hat, nobody mid-act.
      expect([parked.hand, parked.grip, parked.finger, parked.scene, parked.sceneKind, parked.ghost, parked.cast.toad.hat, parked.touched, parked.hush]).toEqual([null, null, null, null, null, null, null, false, false])
      expect(parked.asked).toEqual([])
      expect(parked.air.strays).toEqual([])
      for (const creature of parked.creatures) expect([creature.inScene, creature.leaving, creature.sceneEnd, creature.held]).toEqual([false, false, null, -1])
      expect(frameOf(parked)).toEqual(frameOf(loaded))
      // And it goes on as a loaded game does: nothing replays and nothing sounds.
      for (let f = 0; f < 240; f++) { parked.step(DT); loaded.step(DT); expect(parked.scene).toBeNull(); expect(parked.asked).toEqual([]) }
      expect(write(parked.saved())).toEqual(write(loaded.saved()))
    })
  }

  for (const [name, make] of Object.entries(STATES)) {
    it(`put away with ${name}, what is found is what was left, to the last part: the found clearing itself is set beside the record`, () => {
      const toy = make()
      const left = write(toy.saved())
      const found = again(toy)
      // Not two reads of one record: the things as they lie in the game that was opened, against what was written.
      expect(lying(found)).toEqual(kept(left))
      expect(found.acorns).toEqual(left.acorns)
      expect(found.focus?.id ?? 0).toBe(left.focus)
      expect(found.away ? found.away.thing.parts.length : 0).toBe(left.waiting ? left.waiting.thing.parts.length : 0)
      // And it stays so: a second of the found game moves no sleeper, no thing never woken and no part.
      const beds = lying(found).filter((one) => (one as { bedded: boolean }).bedded)
      const loose = lying(found).filter((one) => !(one as { awake: boolean }).awake)
      play(found, 1)
      expect(lying(found).filter((one) => (one as { bedded: boolean }).bedded)).toEqual(beds)
      expect(lying(found).filter((one) => !(one as { awake: boolean }).awake)).toEqual(loose)
    })
  }

  it('takes the idle ladder back at put-away: the glow and the hand that were showing are gone, and come again only after a new wait', () => {
    const toy = STATES['a first visit, its first showing not yet touched']()
    const before = new IdleLadder(0)
    expect(before.update(IDLE_BEFORE_DEMO + 1).demo).not.toBeNull()
    const { ladder, toy: parked } = park(toy, 3, 5, IDLE_BEFORE_DEMO + 1)
    expect(parked).not.toBe(toy)
    const shown = ladder.update(IDLE_BEFORE_DEMO + 1)
    expect([shown.glow, shown.demo]).toEqual([0, null])
    expect(ladder.update(IDLE_BEFORE_DEMO + 1 + IDLE_BEFORE_GLOW + 2).glow).toBeGreaterThan(0)
  })
})

describe('lesson 6: a touch that is taken away never acts for the child', () => {
  it('lays nothing, pokes nobody, wakes nobody and makes no sound, wherever the finger was', () => {
    for (const [x, y] of [[HEAPS.cap.x, HEAPS.cap.y], [590, 420], [486, 420], [300, 300]]) {
      const toy = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig', 'cap', 'cap'], 1), thing(2, 300, 300, ['maple', 'cap'])]))
      toy.creatures[0].rest = 999
      const before = write(toy.saved())
      toy.press(x, y)
      for (let f = 1; f <= 6; f++) { toy.move(x + f * 4, y - f * 4); toy.step(DT) }
      heard(toy)
      toy.cancel()
      expect(heard(toy), `${x},${y}`).toEqual([])
      expect(write(toy.saved()), `${x},${y}`).toEqual(before)
      expect([toy.scene, toy.creatures[0].poke], `${x},${y}`).toEqual([null, null])
      expect(play(toy, 1).filter((key) => key.startsWith('press') || key.startsWith('poke'))).toEqual([])
    }
  })
})

describe('lesson 7: the corner and the home control', () => {
  it('the top right corner answers nothing and does not hold the idle ladder, on the stage and in the pixels of every surface', () => {
    const { toy } = standing(['willow', 'cap', 'cap'])
    const before = write(toy.saved())
    toy.touched = false
    toy.press(1150, 30)
    expect([toy.touched, toy.hand, toy.grip, toy.finger, toy.asked.length, toy.air.leaves.length]).toEqual([false, null, null, null, 0, 0])
    expect(write(toy.saved())).toEqual(before)
    expect(holdsLadder(true, true, toy)).toBe(false)
    expect(holdsLadder(true, false, toy)).toBe(true)
    for (const [width, height] of SURFACES) {
      const by = fit(width, height)
      // Nothing a child is asked to touch reaches into the corner at this size.
      for (let px = width - CORNER; px <= width; px += 6) for (let py = 0; py <= CORNER; py += 6) {
        expect(inCorner(px, py, width)).toBe(true)
        const at = toStage({ x: px, y: py }, by)
        expect([heapAt(at.x, at.y), castAt(at.x, at.y), onFern(at.x, at.y), inEllipse(at.x, at.y, GROUND, 60)], `${width}x${height} ${px},${py}`).toEqual([null, null, false, false])
      }
    }
  })

  it('nothing a child touches lies under the home control (48 px round, 10 px from the top, in the middle) at 1180 by 820, 1024 by 768 or 820 by 1180', () => {
    expect([HOME.x, HOME.y, HOME.r]).toEqual([590, 34, 24])
    for (const [width, height] of SURFACES) {
      const by = fit(width, height)
      for (let a = 0; a < 24; a++) for (const r of [0, 16, 32]) {
        // The control and a finger's width round it.
        const at = toStage({ x: width / 2 + Math.cos(a * 0.262) * r, y: 34 + Math.sin(a * 0.262) * r }, by)
        const label = `${width}x${height}`
        expect([heapAt(at.x, at.y), castAt(at.x, at.y), onFern(at.x, at.y), inEllipse(at.x, at.y, GROUND, 60)], label).toEqual([null, null, false, false])
        for (const bed of BEDS) expect(Math.hypot(bed.x - at.x, bed.y - at.y), label).toBeGreaterThan(BED_REACH)
      }
    }
  })
})

describe('lesson 8: age is only a first-visit default', () => {
  it('chooses what lies on the earth the first time and nothing after: a saved clearing is read the same at every age, and the toy is never told an age', () => {
    for (const age of [null, 0, 1, 2, 3, 4, 5, 7, 12, 40]) expect(() => new Toy(fresh(age, 3), 3).step(DT)).not.toThrow()
    expect(fresh(null, 3)).toEqual(fresh(3, 3))
    expect(fresh(1, 3)).toEqual(fresh(3, 3))
    expect(fresh(40, 3)).toEqual(fresh(7, 3))
    const kept = write(toyOf(clearing([thing(1, 590, 420, ['willow', 'twig', 'cap', 'cap'], 1), thing(2, 300, 300, ['maple', 'cap'])], { acorns })).saved())
    for (const age of [null, 2, 3, 7, 12]) expect(read(JSON.parse(JSON.stringify(kept)), age, 1)).toEqual(read(kept, 5, 1))
    // A toy is made of a record and a seed: there is no age for it to gate anything by.
    expect(Toy.length).toBe(2)
  })
})

describe('lesson 14: the idle ladder and a slow tap', () => {
  it('is never taken back by what a character does by itself: wandering, a habit, a meeting, a blow, or an acorn dug up', () => {
    const toy = toyOf(clearing([thing(1, 600, 420, ['seed', 'seed', 'cap', 'cap'], 1), thing(2, 420, 330, ['twig', 'twig', 'feather', 'cap', 'cap'], 2), thing(3, 760, 500, ['round', 'cap', 'cap'], 3)], { acorns }))
    let dug = false, moved = 0
    for (let f = 0; f < 1800; f++) {
      const x = toy.creatures[1].thing.x
      toy.step(DT)
      moved += Math.abs(toy.creatures[1].thing.x - x)
      dug ||= toy.sceneKind === 'acorn'
      expect(holdsLadder(false, false, toy)).toBe(false)
    }
    expect(dug).toBe(true)
    expect(moved).toBeGreaterThan(50)
  })

  it('takes a finger that rests 0.45 seconds and lifts for a tap, as it takes a quick one', () => {
    const touch = new ForgivingTouch()
    expect(touch.down(1, { x: 200, y: 600 }, 0).map((gesture) => gesture.type)).toEqual(['press'])
    expect(touch.advance(450)).toEqual([])
    expect(touch.up(1, { x: 204, y: 603 }, 450).map((gesture) => gesture.type)).toEqual(['tap'])
    const slow = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig'])])), quick = toyOf(clearing([thing(1, 590, 420, ['willow', 'twig'])]))
    slow.press(HEAPS.maple.x, HEAPS.maple.y); play(slow, 0.45); slow.tap()
    quick.press(HEAPS.maple.x, HEAPS.maple.y); quick.tap()
    expect(slow.hand).toBeNull()
    expect(slow.things[0].parts.map((part) => part.kind)).toEqual(['willow', 'twig', 'maple'])
    expect(slow.things[0].parts.map((part) => [part.x, part.y])).toEqual(quick.things[0].parts.map((part) => [part.x, part.y]))
    // And the quickest tap on the earth, down and up before a frame has passed, still calls a creature.
    const { toy, creature } = standing(['twig', 'twig', 'willow', 'cap', 'cap'])
    toy.press(820, 430); toy.tap()
    play(toy, 4)
    expect(Math.hypot(creature.thing.x - 820, creature.thing.y - 430)).toBeLessThan(140)
  })
})

describe('lesson 2: a scene is silent from the touch that ends it', () => {
  it('sends the sounds of a scene through a gain of their own, shuts it at the touch, and shuts everything at put-away', () => {
    const shut: object[] = [], gains: { node: object; to: unknown }[] = []
    const param = (node: object) => ({ value: 1, setValueAtTime: (value: number) => { if (value === 0) shut.push(node) }, cancelScheduledValues: () => {}, linearRampToValueAtTime: () => {}, exponentialRampToValueAtTime: () => {}, setTargetAtTime: () => {} })
    const make = (isGain: boolean): object => {
      const node: Record<string, unknown> = { start: () => {}, stop: () => {}, disconnect: () => {}, addEventListener: () => {}, type: 'sine', buffer: null, onended: null }
      for (const name of ['gain', 'frequency', 'Q', 'detune', 'playbackRate']) node[name] = param(node)
      node.connect = (to: unknown) => { if (isGain) gains.push({ node, to }); return to }
      return node
    }
    const out = {}
    const context = { currentTime: 2, sampleRate: 8000, destination: out, createGain: () => make(true), createOscillator: () => make(false), createBiquadFilter: () => make(false), createBufferSource: () => make(false), createBuffer: (_c: number, length: number) => ({ getChannelData: () => new Float32Array(length), length }) } as unknown as AudioContext
    const bus = new Bus()
    bus.voice([{ key: 'gust', pitch: 1, level: 1, scene: true }, { key: 'pat', pitch: 1, level: 1, scene: false }])(context, out as AudioNode, 2)
    const toOut = (): object[] => gains.filter((gain) => gain.to === out).map((gain) => gain.node)
    // Two gains reach the output and nothing else does: every note goes through one of them.
    expect(toOut()).toHaveLength(2)
    const [scene, other] = toOut()
    bus.hush()
    expect(shut).toEqual([scene])
    // The next scene sound gets a gain that is open.
    bus.voice([{ key: 'blink', pitch: 1, level: 1, scene: true }])(context, out as AudioNode, 3)
    expect(toOut()).toHaveLength(3)
    bus.close()
    expect(new Set(shut)).toEqual(new Set([scene, other, toOut()[2]]))
  })
})
