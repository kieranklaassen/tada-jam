import { beforeAll, describe, expect, it } from 'vitest'
import { run, worldWith } from './drive'
import { setUp, type Easel } from './easel'
import { newStage, type Stage } from './rig'
import type { World } from './world'

// Lesson 3, first half: every pose value the model computes is read by the
// view. Each field of each rig is changed by itself, on a stage where
// everything is already at work, and the frame drawn must differ. A field
// the view does not read fails here by name.

let easel: Easel

beforeAll(() => {
  easel = setUp()
})

/** A stage with every part of everyone at work, so that no field is hidden behind another that is at rest. */
function busy(stage: Stage): void {
  Object.assign(stage.frog, { dx: 4, dy: -3, tilt: 0.05, squash: 0.1, swell: 0.2, throat: 0.4, lidL: 0.5, lidR: 0.6, lookX: 0.2, lookY: 0.1, cross: 0.3, mouth: 0.5, tongue: 0.6, tongueX: 400, tongueY: 420, cheek: 0.5, under: 0.3 })
  Object.assign(stage.bird, { dx: 3, dy: -2, tilt: 0.1, head: 0.1, ruffle: 0.4, beak: 0.4, tail: 0.3, flip: 0.2, lookX: 0.2, lookY: 0.1, wing: 0.4 })
  Object.assign(stage.sprite, { sway: 0.04, sink: 6, cheeks: 0.5, dark: 0.3, mouth: 0.5, lids: 0.6, lookX: 0.2, lookY: 0.1, arm: 0.4, dx: -5, breath: 0.5 })
  Object.assign(stage.gnome, { dx: 3, dy: -2, lean: 0.05, squash: 0.1, sit: 0.3, armL: 0.4, armR: 0.3, hatTilt: 0.1, hatX: 6, hatY: -8, mouth: 0.4, lids: 0.6, lookX: 0.2, lookY: 0.1, beard: 0.4, leg: 0.2, hide: 0.3, turn: 0.3, stream: 0.4 })
  Object.assign(stage.boat, { dx: 5, dy: -4, tilt: 0.05, face: 0.8, billow: 0.4 })
  Object.assign(stage.fly, { x: 10, y: 5, wings: 0.5 })
  Object.assign(stage.place, { bend: 0.1, pile: 0.5 })
}

/** How far a field is moved: enough to show, whatever its unit. */
const NUDGE: Record<string, number> = { dx: 9, dy: 9, sink: 9, hatX: 9, hatY: 9, tongueX: 40, tongueY: 40, x: 12, y: 12 }

function unread(w: World, part: keyof Omit<Stage, 'fx'>): string[] {
  const missing: string[] = []
  const rig = w.stage[part] as unknown as Record<string, number>
  busy(w.stage)
  const before = easel.frame(w).digest
  for (const field of Object.keys(newStage()[part])) {
    busy(w.stage)
    rig[field] += NUDGE[field] ?? 0.25
    if (easel.frame(w).digest === before) missing.push(`${part}.${field}`)
  }
  return missing
}

describe('every pose value is read by the view', () => {
  it('at the bank: the frog, the kingfisher, the sprite, the gnome, the boat and the dragonfly', () => {
    const w = worldWith({ masts: ['twig', null], sails: ['maple', null], deck: ['berry'] })
    run(w, 0.1)
    for (const part of ['frog', 'bird', 'sprite', 'gnome', 'boat', 'fly'] as const) expect(unread(w, part), part).toEqual([])
  })

  it('aboard and afloat: the gnome in his seat and the boat under him', () => {
    const w = worldWith({ masts: ['twig', null], sails: ['maple', null], deck: ['cap'] }, { boat: { at: 'eddy', x: 640, aboard: true } as never })
    run(w, 0.1)
    for (const part of ['gnome', 'boat'] as const) expect(unread(w, part), part).toEqual([])
  })

  it('among the reeds: how far the reeds are bent', () => {
    const w = worldWith({ masts: ['twig', null], sails: ['maple', null] }, { place: 'brook', journey: { reach: 0, stuck: false }, boat: { at: 'eddy', x: 500, aboard: true } as never })
    run(w, 0.1)
    expect(unread(w, 'place').filter((name) => name !== 'place.pile')).toEqual([])
  })

  it('at the pond: the pads piled at the bow of a heavy boat', () => {
    const w = worldWith({ masts: ['twig', null], sails: ['birch', null], deck: ['pebble'] }, { place: 'brook', journey: { reach: 5, stuck: false }, boat: { at: 'eddy', x: 500, aboard: true } as never })
    run(w, 0.1)
    expect(unread(w, 'place').filter((name) => name !== 'place.bend')).toEqual([])
  })

  it('a mark of the pen is drawn where the model has it, and each kind is its own', () => {
    const w = worldWith({})
    run(w, 0.1)
    const seen = new Set<number>()
    for (const kind of ['splash', 'bubbles', 'drops', 'spout'] as const) {
      w.stage.fx = [{ kind, x: 500, y: 460, k: 0.4, size: 1 }]
      const here = easel.frame(w).digest
      w.stage.fx = [{ kind, x: 540, y: 460, k: 0.4, size: 1 }]
      expect(easel.frame(w).digest, kind).not.toBe(here)
      w.stage.fx = [{ kind, x: 500, y: 460, k: 0.7, size: 1 }]
      expect(easel.frame(w).digest, kind).not.toBe(here)
      seen.add(here)
    }
    expect(seen.size).toBe(4)
  })
})
