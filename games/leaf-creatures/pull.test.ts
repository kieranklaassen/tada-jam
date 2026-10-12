import { describe, expect, it } from 'vitest'
import type { Creature } from './creatures'
import { SHAPES, type Kind } from './parts'
import { outside } from './posed'
import { DT, again, clearing, drawnAt, heard, play, thing, toyOf } from './testing'
import { caps } from './things'
import { ON_IT, PULL_CLEAR, STROKE, TUG_MOST } from './touching'
import type { Toy } from './toy'

// An eye comes off only when it is dragged clear of the creature's outline
// by a cap's width. Let go sooner, it snaps back, and is heard. A slide that
// starts on an eye and stays on the creature is a stroke like any other, so
// a creature that is nothing but eyes can be stroked and bedded down.

function standing(kinds: readonly Kind[]): { toy: Toy; creature: Creature; eye: number } {
  const toy = toyOf(clearing([thing(1, 590, 420, kinds, 1)]))
  toy.creatures[0].rest = 999
  return { toy, creature: toy.creatures[0], eye: kinds.indexOf('cap') }
}

/** The point straight up the page from an eye that is `far` outside the creature's outline. */
function upFrom(creature: Creature, eye: number, far: number): { x: number; y: number } {
  const at = drawnAt(creature, eye)
  let y = at.y
  while (outside(creature, at.x, y) < far) y -= 0.5
  return { x: at.x, y }
}

/** Lands on an eye and slides straight up to `far` outside the outline, a frame to each small move. The finger stays down. */
function slideOut(toy: Toy, creature: Creature, eye: number, far: number): void {
  const from = drawnAt(creature, eye), to = upFrom(creature, eye, far)
  toy.press(from.x, from.y)
  for (let k = 1; k <= 30; k++) { toy.move(from.x, from.y + ((to.y - from.y) * k) / 30); toy.step(DT) }
}

describe('an eye is pulled', () => {
  it('comes off only once the finger is a cap\'s width clear of the creature, and not a moment sooner', () => {
    expect(PULL_CLEAR).toBe(SHAPES.cap.wide)
    const { toy, creature, eye } = standing(['willow', 'twig', 'twig', 'cap', 'cap'])
    slideOut(toy, creature, eye, PULL_CLEAR - 2)
    expect([caps(creature.thing), toy.scene, toy.hand, toy.ghost]).toEqual([2, null, null, null])
    expect(toy.things).toContain(creature.thing)
    // The slide that used to unmake it: fifty-six from the eye's middle, outward.
    expect(Math.hypot(toy.grip!.x - drawnAt(creature, eye).x, toy.grip!.y - drawnAt(creature, eye).y) + TUG_MOST).toBeGreaterThan(56)
    heard(toy)
    const clear = upFrom(creature, eye, PULL_CLEAR + 1)
    toy.move(clear.x, clear.y)
    expect(heard(toy)).toContain('lift-cap')
    expect([toy.sceneKind, toy.hand?.kind, toy.ghost]).toEqual(['eyes', 'cap', creature])
    toy.cancel()
  })

  it('stretches after the finger while it is pulled, and snaps back with its own sound when it is let go sooner: no poke, nothing off, nothing unmade', () => {
    for (const end of ['tap', 'drop'] as const) {
      const { toy, creature, eye } = standing(['willow', 'twig', 'twig', 'cap', 'cap'])
      const rest = drawnAt(creature, eye)
      slideOut(toy, creature, eye, PULL_CLEAR * 0.6)
      // Stretched toward the finger, and no further than it stretches.
      const pulled = drawnAt(creature, eye)
      expect(rest.y - pulled.y).toBeGreaterThan(8)
      expect(Math.hypot(pulled.x - rest.x, pulled.y - rest.y)).toBeLessThanOrEqual(TUG_MOST + 0.01)
      heard(toy)
      toy[end]()
      expect(heard(toy), end).toEqual(['press-cap'])
      expect(creature.tug).toBeNull()
      // The lean into the finger is let go in a moment, and the eye is where it was.
      play(toy, 0.6)
      const back = drawnAt(creature, eye)
      expect(Math.hypot(back.x - rest.x, back.y - rest.y)).toBeLessThan(0.5)
      expect([caps(creature.thing), creature.eyes, creature.poke, toy.scene, toy.hand, toy.grip]).toEqual([2, 2, null, null, null, null])
      expect(heard(toy).filter((key) => key.startsWith('poke') || key.startsWith('lift'))).toEqual([])
      // And it is found whole.
      expect(again(toy).creatures).toHaveLength(1)
    }
  })

  it('snaps back as soon as the finger slides on to the creature again, and the slide is then a stroke', () => {
    const { toy, creature, eye } = standing(['willow', 'twig', 'twig', 'cap', 'cap'])
    slideOut(toy, creature, eye, PULL_CLEAR * 0.5)
    expect(creature.tug).not.toBeNull()
    heard(toy)
    const home = drawnAt(creature, eye)
    toy.move(home.x, home.y - 4)
    expect(heard(toy)).toEqual(['press-cap'])
    expect(creature.tug).toBeNull()
    expect(toy.grip).not.toBeNull()
    toy.cancel()
  })

  it('is no pull at all while the finger stays on the creature: a slide that starts on an eye is a stroke', () => {
    const { toy, creature, eye } = standing(['willow', 'willow', 'cap', 'cap'])
    const from = drawnAt(creature, eye), to = drawnAt(creature, 0)
    // From the eye along the creature to the far end of its first leaf.
    const far = { x: to.x + SHAPES.willow.half - 6, y: to.y }
    expect(Math.hypot(far.x - from.x, far.y - from.y)).toBeGreaterThan(STROKE)
    toy.press(from.x, from.y)
    heard(toy)
    let most = 0
    for (let k = 1; k <= 40; k++) {
      const x = from.x + ((far.x - from.x) * k) / 40, y = from.y + ((far.y - from.y) * k) / 40
      most = Math.max(most, outside(creature, x, y))
      toy.move(x, y); toy.step(DT)
      expect(creature.tug).toBeNull()
    }
    // It never left the creature by more than a finger's width.
    expect(most).toBeLessThanOrEqual(ON_IT)
    expect(creature.thing.drowsy).toBe(true)
    expect(heard(toy)).toContain('purr')
    expect([caps(creature.thing), toy.scene, toy.hand]).toEqual([2, null, null])
    toy.drop()
    expect(creature.poke).toBeNull()
  })

  it('lets a creature that is two eyes and nothing else be stroked drowsy and stroked to bed, and never unmakes it', () => {
    const { toy, creature } = standing(['cap', 'cap'])
    const a = drawnAt(creature, 0), b = drawnAt(creature, 1)
    const stroke = (): void => {
      // Down the two eyes, from the top of the one to the bottom of the other and back.
      const ux = (b.x - a.x) / Math.hypot(b.x - a.x, b.y - a.y), uy = (b.y - a.y) / Math.hypot(b.x - a.x, b.y - a.y)
      const from = { x: a.x - ux * 20, y: a.y - uy * 20 }, to = { x: b.x + ux * 20, y: b.y + uy * 20 }
      toy.press(from.x, from.y)
      for (let k = 1; k <= 60 && toy.grip; k++) {
        const p = k <= 30 ? k / 30 : 2 - k / 30
        toy.move(from.x + (to.x - from.x) * p, from.y + (to.y - from.y) * p); toy.step(DT)
      }
      toy.drop()
    }
    stroke()
    expect([creature.thing.drowsy, caps(creature.thing), toy.scene, toy.ghost]).toEqual([true, 2, null, null])
    play(toy, 0.3)
    stroke()
    expect(toy.sceneKind).toBe('bedding')
    expect(toy.things).toContain(creature.thing)
    play(toy, 8)
    expect(creature.thing.bedded).toBe(true)
  })
})
