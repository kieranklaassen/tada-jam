import { describe, expect, it } from 'vitest'
import { FOLK } from './folk'
import { FOUND, type Kind } from './kinds'
import { build, laidOf, type Laid } from './rest'
import { freshSave } from './save'
import { SUN_AT, TICK, Toy } from './toy'
import { allVoices } from './voices'

// Sight and sound run on one clock. A sound is queued in the step in which
// the thing it belongs to is seen to do what makes it, so the frame that
// shows a knock is the frame that plays it. These tests step the toy one
// fixed step at a time and hold each sound to its step.

const idOf = (kind: Kind, nth = 0): number => FOUND.filter((thing) => thing.kind === kind)[nth].id
const at = (id: number): { x: number; y: number } => ({ x: FOUND[id].home.x, y: FOUND[id].home.y - (FOUND[id].kind === 'twig' ? 24 : 12) })

type Step = { sounds: string[]; hits: number[]; answers: Record<string, number> }

/** Plays a session of carries one fixed step at a time, and returns what each step sounded and what it showed. */
function session(): { steps: Step[]; presses: string[][] } {
  const toy = new Toy(freshSave(null), 5)
  const steps: Step[] = [], presses: string[][] = []
  let before = toy.counts()
  const tick = (): void => {
    toy.step(TICK)
    const now = toy.counts()
    steps.push({
      sounds: toy.sounds.map((sound) => sound.from),
      hits: now.hits.map((count, id) => count - before.hits[id]),
      answers: Object.fromEntries(FOLK.map((who) => [who, now.answers[who] - before.answers[who]])),
    })
    toy.sounds.length = 0
    before = now
  }
  const carry = (id: number, x: number, y: number): void => {
    const from = at(id)
    toy.press(from.x, from.y)
    presses.push(toy.sounds.map((sound) => sound.from))
    toy.sounds.length = 0
    toy.dragStart()
    for (let i = 1; i <= 20; i++) {
      toy.dragMove(from.x + ((x - from.x) * i) / 20, from.y + ((y - from.y) * i) / 20)
      tick()
    }
    toy.drop()
    // What the drop itself says (a thing let go outside the hollow) belongs to the touch, as a lift does.
    presses.push(toy.sounds.map((sound) => sound.from))
    toy.sounds.length = 0
    for (let i = 0; i < 300; i++) tick()
  }
  // Posts, a table that knocks, a bowl that rattles, a ball that rolls, a drum that hops, a sofa that bounces,
  // a thing shed by a leaf, and one let go outside.
  carry(idOf('twig', 0), 400, 480)
  carry(idOf('twig', 1), 470, 480)
  carry(idOf('bark', 0), 435, 460)
  carry(idOf('cap', 0), 435, 380)
  carry(idOf('twig', 2), 770, 500)
  carry(idOf('moss', 0), 540, 560)
  carry(idOf('bark', 1), 540, 500)
  carry(idOf('pebble', 1), 540, 440)
  carry(idOf('cap', 1), 640, 500)
  carry(idOf('feather', 0), 100, 300)
  return { steps, presses }
}

describe('sight and sound on one clock', () => {
  const { steps, presses } = session()

  it('hears every knock in the step in which that thing is seen to knock, and sees a knock for every one heard', () => {
    let knocks = 0
    steps.forEach((step, index) => {
      const heard = FOUND.map((found) => step.sounds.filter((from) => from === `knock ${found.id}`).length)
      expect(heard, `step ${index}`).toEqual(step.hits)
      knocks += step.hits.reduce((sum, count) => sum + count, 0)
    })
    // The session is not a quiet one: landings, hops, rocking and tumbling all knock.
    expect(knocks).toBeGreaterThan(20)
  })

  it('hears each of the three in the step in which its answer starts', () => {
    let voices = 0
    steps.forEach((step, index) => {
      for (const who of FOLK) {
        const heard = step.sounds.filter((from) => from === `folk ${who}`).length
        expect(heard, `step ${index}, ${who}`).toBeLessThanOrEqual(step.answers[who])
        voices += heard
      }
    })
    expect(voices).toBeGreaterThan(3)
  })

  it('makes no other sound in a step: a lift and a let-go sound in the call of the touch', () => {
    for (const step of steps) for (const from of step.sounds) expect(from).toMatch(/^(knock|folk|shed) /)
    for (const press of presses) for (const from of press) expect(from).toMatch(/^(lift|out|shed) /)
    expect(presses.filter((press) => press.some((from) => from.startsWith('lift '))).length).toBe(10)
  })

  it('hides no delay inside a voice', () => {
    for (const [name, voice] of allVoices()) for (const note of voice) expect(note.delay ?? 0, name).toBe(0)
  })
})

/** An evening and the morning after it, one fixed step at a time: what each step sounded, and what it showed. */
function night(things: Laid[]): { steps: { sounds: string[]; hits: number[]; walked: number; cues: number }[]; touches: string[][] } {
  const toy = new Toy({ ...freshSave(7), things: laidOf(build(things)) }, 5)
  const steps: { sounds: string[]; hits: number[]; walked: number; cues: number }[] = [], touches: string[][] = []
  let before = toy.counts()
  const tick = (): void => {
    toy.step(TICK)
    const now = toy.counts()
    steps.push({ sounds: toy.sounds.map((sound) => sound.from), hits: now.hits.map((count, id) => count - before.hits[id]), walked: now.steps - before.steps, cues: now.cues - before.cues })
    toy.sounds.length = 0
    before = now
  }
  const sunTo = (y: number): void => {
    const from = toy.show(null).sun.y
    toy.press(SUN_AT.x, from)
    touches.push(toy.sounds.map((sound) => sound.from))
    toy.sounds.length = 0
    toy.dragStart()
    for (let i = 1; i <= 10; i++) {
      toy.dragMove(SUN_AT.x, from + ((y - from) * i) / 10)
      tick()
    }
    toy.drop()
    touches.push(toy.sounds.map((sound) => sound.from))
    toy.sounds.length = 0
    while (toy.playing) tick()
    for (let i = 0; i < 240; i++) tick()
  }
  sunTo(SUN_AT.under)
  sunTo(SUN_AT.y)
  return { steps, touches }
}

describe('the evening and the morning on the same clock', () => {
  // Every kind of moment: a roof that snaps and comes down, a bed, a cloth pulled off, a lamp worn, a bath that
  // spills, a bell that swings and wakes the sleeper, a slab that sails, and the heap.
  const houses: Laid[][] = [
    [
      { id: idOf('twig', 0), x: 392 }, { id: idOf('twig', 1), x: 452 }, { id: idOf('leaf', 0), x: 422 },
      { id: idOf('moss', 0), x: 560 }, { id: idOf('leaf', 1), x: 560 }, { id: idOf('pebble', 0), x: 660 }, { id: idOf('cap', 0), x: 660 },
      { id: idOf('twig', 2), x: 730 }, { id: idOf('cap', 1), x: 730 }, { id: idOf('feather', 0), x: 800 },
    ],
    [
      { id: idOf('cap', 0), x: 430 }, { id: idOf('bark', 0), x: 590 }, { id: idOf('feather', 0), x: 590 },
      { id: idOf('bark', 1), x: 760 }, { id: idOf('leaf', 0), x: 760 }, { id: idOf('pebble', 0), x: 700 }, { id: idOf('leaf', 1), x: 700 },
    ],
    [],
  ]
  const nights = houses.map(night)

  it('hears every step of the three in the step in which the foot comes down', () => {
    let walked = 0
    for (const { steps } of nights) steps.forEach((step, index) => {
      expect(step.sounds.filter((from) => from.startsWith('step ')).length, `step ${index}`).toBe(step.walked)
      walked += step.walked
    })
    expect(walked).toBeGreaterThan(40)
  })

  it('hears every moment of an act in the step in which it is seen', () => {
    let cues = 0
    for (const { steps } of nights) steps.forEach((step, index) => {
      expect(step.sounds.filter((from) => from.startsWith('act ')).length, `step ${index}`).toBe(step.cues)
      cues += step.cues
    })
    expect(cues).toBeGreaterThan(30)
  })

  it('hears every landing when it lands: a roof coming down, a bell swinging, a cloth tumbling home, a slab reaching the wall', () => {
    let knocks = 0
    for (const { steps } of nights) steps.forEach((step, index) => {
      const heard = FOUND.map((found) => step.sounds.filter((from) => from === `knock ${found.id}`).length)
      expect(heard, `step ${index}`).toEqual(step.hits)
      knocks += step.hits.reduce((sum, count) => sum + count, 0)
    })
    expect(knocks).toBeGreaterThan(12)
  })

  it('makes no other sound in a step, and the sun sounds in the call of the touch', () => {
    for (const { steps, touches } of nights) {
      for (const step of steps) for (const from of step.sounds) expect(from).toMatch(/^(knock|step|act) /)
      expect(touches).toEqual([['sun'], ['sun'], ['sun'], ['sun']])
    }
  })
})
