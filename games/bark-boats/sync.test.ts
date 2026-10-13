import { describe, expect, it } from 'vitest'
import type { Act } from './acts'
import { BANK_ACTS } from './bankActs2'
import { carry, drain, launch, run, worldWith } from './drive'
import { EDDY, LAID_OUT, LINE, SEAT } from './layout'
import { startAct } from './play'
import { POKE_ACTS } from './pokeActs'
import { step } from './tick'
import { VOICES, notesOf, type SoundName } from './voices'
import { STEP, type World } from './world'

// Lesson 1: one clock for sight and sound. A sound is queued on the step its
// motion happens: a cue on the step its time is crossed, a landing on the
// step the thing lands. No sound waits inside a voice.

/** Steps the world and gives every sound with the step it was queued on, and what `watch` said on that step. */
function watched<T>(w: World, seconds: number, watch: (w: World) => T): { name: SoundName; at: number; seen: T; before: T }[] {
  const out: { name: SoundName; at: number; seen: T; before: T }[] = []
  let before = watch(w)
  for (let i = 0; i < Math.round(seconds / STEP); i++) {
    step(w, STEP)
    const seen = watch(w)
    for (const sound of drain(w)) out.push({ name: sound.name, at: sound.at, seen, before })
    before = seen
  }
  return out
}

describe('one clock for sight and sound', () => {
  it('queues every cue of every act on the step its time is crossed', () => {
    const acts: readonly Act[] = [...BANK_ACTS, ...POKE_ACTS]
    for (const act of acts) {
      const w = worldWith({})
      run(w, 0.2)
      drain(w)
      const start = w.time
      startAct(w, act)
      const heard = [...drain(w), ...run(w, act.length + 0.1)].filter((sound) => act.cues.some(([, name]) => name === sound.name))
      for (const [at, name] of act.cues) {
        const match = heard.find((sound) => sound.name === name && Math.abs(sound.at - start - at) <= STEP + 1e-6)
        expect(match, `${act.id} ${name} at ${at}`).toBeDefined()
      }
      expect(heard.length, act.id).toBe(act.cues.length)
    }
  })

  it('answers the touch that starts an act in the same call: a cue at the very start is not a step late', () => {
    for (const act of [...BANK_ACTS, ...POKE_ACTS].filter((each) => each.cues.some(([at]) => at === 0))) {
      const w = worldWith({})
      run(w, 0.2)
      drain(w)
      startAct(w, act)
      expect(drain(w).map((sound) => sound.name), act.id).toEqual(act.cues.filter(([at]) => at === 0).map(([, name]) => name))
    }
  })

  it('has no delay inside any voice', () => {
    for (const name of Object.keys(VOICES) as SoundName[]) {
      for (const part of VOICES[name]) expect('delay' in part, name).toBe(false)
      for (const note of notesOf([{ name, rate: 1 }])) expect(note.delay ?? 0, name).toBe(0)
    }
  })

  it('sounds a making pressed on the boat on the step it lands there', () => {
    const w = worldWith({ masts: ['twig', null] })
    run(w, 0.2)
    carry(w, LAID_OUT.maple, { x: SEAT.x + 20, y: SEAT.y - 130 })
    const maple = w.pieces.find((piece) => piece.kind === 'maple')
    const heard = watched(w, 0.6, () => maple?.mode)
    const zip = heard.find((sound) => sound.name === 'zip')
    expect(zip?.before).toBe('fly')
    expect(zip?.seen).toBe('rest')
  })

  it('sounds a making laid on the bank on the step it lands there', () => {
    const w = worldWith({})
    run(w, 0.2)
    carry(w, LAID_OUT.pebble, { x: 520, y: 760 })
    const pebble = w.pieces.find((piece) => piece.kind === 'pebble')
    const heard = watched(w, 0.5, () => pebble?.mode)
    const lie = heard.find((sound) => sound.name === 'lie-pebble')
    expect(lie?.before).toBe('fly')
    expect(lie?.seen).toBe('rest')
  })

  it('sounds the boat on the water on the step it meets the water', () => {
    const w = worldWith({ masts: ['twig', null], sails: ['birch', null] })
    run(w, 0.2)
    carry(w, { x: SEAT.x + 84, y: SEAT.y - 12 }, { x: (EDDY.left + EDDY.right) / 2 + 84, y: LINE - 60 })
    const heard = watched(w, 1, (world) => world.boat.mode)
    const splash = heard.find((sound) => sound.name === 'splash')
    expect(splash?.before).toBe('fall')
    expect(splash?.seen).toBe('afloat')
  })

  it('sounds the boat back on its stone on the step it is set down', () => {
    const w = worldWith({})
    run(w, 0.2)
    carry(w, { x: SEAT.x + 84, y: SEAT.y - 12 }, { x: SEAT.x + 60, y: SEAT.y + 60 })
    const heard = watched(w, 1, (world) => world.boat.mode)
    const thock = heard.find((sound) => sound.name === 'thock')
    expect(thock?.before).toBe('glide')
    expect(thock?.seen).toBe('stone')
  })

  it('sounds a thing the folk give back on the step it lands, and a thing washed ashore on the step it comes to rest', () => {
    const w = worldWith({})
    run(w, 0.2)
    // A leaf let go over the water floats to the shore.
    carry(w, LAID_OUT.birch, { x: 900, y: 470 })
    const birch = w.pieces.find((piece) => piece.kind === 'birch')
    const heard = watched(w, 8, () => birch?.mode)
    const knock = heard.filter((sound) => sound.before === 'float' && sound.seen === 'rest')
    expect(knock.map((sound) => sound.name)).toContain('knock')
    expect(birch?.mode).toBe('rest')
  })

  it('is answered on the frame the finger lands: a ring, a lift and a poke all sound in the press', () => {
    const w = worldWith({})
    run(w, 0.2)
    launch(w)
    drain(w)
    for (const [x, y] of [[900, 470], [LAID_OUT.cap.x, LAID_OUT.cap.y], [150, 430]] as const) {
      carry(w, { x, y }, { x, y }, STEP * 2)
      expect(drain(w).length, `${x},${y}`).toBeGreaterThan(0)
      run(w, 2)
      drain(w)
    }
  })
})
