import { describe, expect, it } from 'vitest'
import { CAST, type Id } from './cast'
import { ACT_SECONDS, TEMPERS, act, fly, idle, poke, want } from './motion'
import { restPose, type Pose } from './pose'
import type { Act } from './sight'
import { ACTS, HOPS, SOUNDS, landing, press, winding } from './voices'

const KINDS: Act[] = ['front', 'back', 'side', 'cut', 'hole']
const track = (play: (t: number, p: Pose) => void): string => JSON.stringify(Array.from({ length: 23 }, (_, i) => {
  const p = restPose()
  play(i / 23, p)
  return Object.values(p).map((v) => Math.round(v * 200))
}))
const distinct = (tracks: string[]): void => { expect(new Set(tracks).size).toBe(tracks.length) }

describe('nobody shares a movement', () => {
  it('in any act, and every act moves', () => {
    const still = track(() => {})
    const tracks = CAST.flatMap((id) => KINDS.map((kind) => track((t, p) => act(id, kind, t, p))))
    distinct(tracks)
    expect(tracks).not.toContain(still)
  })
  it('in a hop, a poke, an idle, or a temper', () => {
    distinct(CAST.map((id) => track((t, p) => fly(id, t, p))))
    distinct(CAST.map((id) => track((t, p) => poke(id, t, p))))
    distinct(CAST.filter((id) => id !== 'board').map((id) => track((t, p) => idle(id, t * 6, p))))
    distinct(CAST.map((id) => JSON.stringify(TEMPERS[id])))
  })
  it('in its wanting', () => {
    const wishes = CAST.filter((id) => id !== 'board').map((id) => JSON.stringify([0, 1, 2, 3].map((turn) => { const p = restPose(); want(id, turn, p, true); return p })))
    distinct(wishes)
  })
})

describe('an act', () => {
  it('begins and ends at rest, so nothing jumps', () => {
    for (const id of CAST) for (const kind of KINDS) for (const t of [0, 1]) {
      const p = restPose()
      act(id, kind, t, p)
      const rest = restPose()
      for (const key of Object.keys(rest) as (keyof Pose)[]) {
        const full = key === 'twist' ? Math.round(p[key] / (Math.PI * 2)) * Math.PI * 2 : 0
        expect(Math.abs(p[key] - full - rest[key]), `${id} ${kind} ${key} at ${t}`).toBeLessThan(0.02)
      }
    }
  })
  it('is short', () => {
    for (const id of CAST) for (const kind of KINDS) { expect(ACT_SECONDS[id][kind]).toBeGreaterThan(0.7); expect(ACT_SECONDS[id][kind]).toBeLessThan(3.4) }
  })
})

describe('the sounds', () => {
  const all = [...CAST.flatMap((id: Id) => [...KINDS.map((kind) => ACTS[id][kind]), HOPS[id], landing(id), press(id), winding(id)]), ...Object.values(SOUNDS)]
  it('are every one different', () => {
    distinct(CAST.flatMap((id) => KINDS.map((kind) => JSON.stringify(ACTS[id][kind]))))
    distinct(CAST.map((id) => JSON.stringify(winding(id))))
    distinct(CAST.map((id) => JSON.stringify(HOPS[id])))
  })
  it('lie where a tablet can play them, and are soft', () => {
    for (const notes of all) {
      expect(notes.length).toBeGreaterThan(0)
      for (const note of notes) {
        expect(note.frequency).toBeGreaterThan(55)
        expect(note.frequency).toBeLessThanOrEqual(10000)
        expect(note.peak).toBeGreaterThan(0)
        expect(note.peak).toBeLessThanOrEqual(0.32)
        expect(note.attack).toBeGreaterThan(0)
        if (note.glideTo !== undefined) expect(note.glideTo).toBeGreaterThan(40)
      }
    }
  })
  it('are over when what they belong to is', () => {
    for (const id of CAST) for (const kind of KINDS) for (const note of ACTS[id][kind]) expect((note.delay ?? 0) + note.attack + note.decay, `${id} ${kind}`).toBeLessThan(ACT_SECONDS[id][kind] + 0.5)
  })
})
