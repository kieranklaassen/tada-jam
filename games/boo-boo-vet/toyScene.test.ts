import { describe, expect, it } from 'vitest'
import { SPECIES, type Species } from './cast'
import { freshClinic } from './clinic'
import type { Guidance } from './guidance'
import { CARES, type Care } from './needs'
import { COMING_SECONDS, FLIGHT_SECONDS, SEATED_AT, drag, freshToy, lies, press, step, tap, type Toy } from './toy'
import { exchange, scene, type Item } from './toyScene'
import { roomFor } from './view/toyRoom'

const { room, garden } = roomFor(1180, 820)
const FRAME = 1 / 60
const QUIET: Guidance = { glow: 0, demo: null, demoIndex: -1 }

function toyWith(species: Species, seed = 3): Toy {
  const clinic = freshClinic(null, seed, true)
  const other = SPECIES.find((candidate) => candidate !== species)!
  return freshToy({ ...clinic, table: { ...clinic.table!, species }, waiting: { ...clinic.waiting, species: clinic.waiting.species === species ? other : clinic.waiting.species } })
}

function run(toy: Toy, seconds: number, each?: (items: Item[]) => void): void {
  for (let frame = 0; frame < Math.round(seconds / FRAME); frame++) {
    step(toy, room, FRAME)
    each?.(scene(toy, room, garden, QUIET))
  }
}

const figures = (items: Item[], who: string) => items.filter((item) => item.kind === 'figure' && item.who === who) as Extract<Item, { kind: 'figure' }>[]
const things = (items: Item[], care: Care) => items.filter((item) => item.kind === 'thing' && item.care === care) as Extract<Item, { kind: 'thing' }>[]

function finite(items: Item[]): void {
  for (const item of items) for (const value of Object.values(item)) if (typeof value === 'number') expect(Number.isFinite(value), JSON.stringify(item)).toBe(true)
}

describe('the frame at rest', () => {
  it('shows the animal on the table, the one at the door, the mouse, the lamp, the cart and the five things on it', () => {
    const toy = toyWith('rabbit')
    step(toy, room, FRAME)
    const items = scene(toy, room, garden, QUIET)
    finite(items)
    expect(figures(items, 'patient')).toHaveLength(1)
    expect(figures(items, 'waiting')).toHaveLength(1)
    for (const kind of ['mouse', 'lamp', 'cart']) expect(items.filter((item) => item.kind === kind)).toHaveLength(1)
    for (const care of CARES) {
      const drawn = things(items, care)
      expect(drawn).toHaveLength(1)
      expect({ x: drawn[0].x, y: drawn[0].y }).toEqual(room.cart[care])
    }
    expect(items.some((item) => item.kind === 'halo' || item.kind === 'hand')).toBe(false)
  })

  it('is alive: the animals move while nothing is touched, and the same moment draws the same frame', () => {
    const toy = toyWith('dog')
    step(toy, room, 1)
    const one = JSON.stringify(scene(toy, room, garden, QUIET))
    expect(JSON.stringify(scene(toy, room, garden, QUIET))).toBe(one)
    step(toy, room, 0.5)
    expect(JSON.stringify(scene(toy, room, garden, QUIET))).not.toBe(one)
  })
})

describe('the answer to a touch', () => {
  it('shows in the frame of the press: the thing is lifted, its corner peeled, and the animal turns to it with a start', () => {
    const toy = toyWith('cat')
    step(toy, room, 1)
    const before = figures(scene(toy, room, garden, QUIET), 'patient')[0]
    press(toy, room, room.cart.basket)
    const items = scene(toy, room, garden, QUIET)
    const held = things(items, 'basket')
    expect(held).toHaveLength(1)
    expect(held[0].look).toBe('lifted')
    expect(held[0].sy).toBeGreaterThan(1)
    const after = figures(items, 'patient')[0]
    expect(after.face).toBe('wow')
    expect(after.rot).not.toBe(before.rot)
  })

  it('carries the thing under the finger and keeps the sheet of plasters on the cart', () => {
    const toy = toyWith('cat')
    press(toy, room, room.cart.plaster)
    drag(toy, room, { x: 500, y: 300 })
    run(toy, 0.5)
    const drawn = things(scene(toy, room, garden, QUIET), 'plaster')
    // The one in the hand is a lifted sticker like any other thing: its corner curls and its gloss slides.
    expect(drawn.map((item) => item.look).sort()).toEqual(['one-lifted', 'whole'])
    const one = drawn.find((item) => item.look === 'one-lifted')!
    expect(Math.hypot(one.x - 500, one.y - 300)).toBeLessThan(20)
  })

  it('rocks the whole animal as the thing lands, and the reaction moves it more than idling ever does', () => {
    const toy = toyWith('bear')
    press(toy, room, room.cart.basket)
    tap(toy)
    run(toy, FLIGHT_SECONDS + FRAME)
    const landed = figures(scene(toy, room, garden, QUIET), 'patient')[0]
    expect(landed.sy).toBeLessThan(0.95)
    let highest = 0
    run(toy, 6.5, (items) => { highest = Math.max(highest, room.patient.y - figures(items, 'patient')[0].y) })
    expect(highest).toBeGreaterThan(30)
  })
})

describe('every animal with every thing', () => {
  it('draws a whole, finite frame through the whole reaction, hides the animal only under the blanket, and ends with the thing worn where it lies', () => {
    for (const species of SPECIES) {
      for (const care of CARES) {
        const toy = toyWith(species)
        press(toy, room, room.cart[care])
        tap(toy)
        let hidden = 0
        run(toy, 8, (items) => {
          finite(items)
          const seen = figures(items, 'patient').length
          expect(seen).toBeLessThanOrEqual(1)
          if (seen === 0) hidden++
          // The thing is always somewhere to be seen: on the cart as the sheet, in the air, or on the animal.
          expect(things(items, care).length, `${species} ${care}`).toBeGreaterThanOrEqual(1)
        })
        if (care !== 'blanket') expect(hidden, `${species} ${care}`).toBe(0)
        const end = scene(toy, room, garden, QUIET)
        if (care !== 'plaster') {
          const worn = things(end, care)[0], at = lies(toy, room, care)!
          // It is drawn where a finger finds it: well inside its own touch target.
          expect(Math.hypot(worn.x - at.x, worn.y - at.y), `${species} ${care}`).toBeLessThan(40)
        }
      }
    }
  }, 30_000)
})

/** The corners of one plaster off its sheet, as it is drawn (view/extras.ts: 84 by 34). */
function strip(item: Extract<Item, { kind: 'thing' }>): [number, number][] {
  const w = 42 * item.sx, h = 17 * item.sy, cos = Math.cos(item.rot), sin = Math.sin(item.rot)
  return [[-w, -h], [w, -h], [w, h], [-w, h]].map(([x, y]) => [item.x + x * cos - y * sin, item.y + x * sin + y * cos])
}

/** Whether two plasters overlap at all: no axis of either separates them. */
function overlap(one: [number, number][], other: [number, number][]): boolean {
  for (const shape of [one, other]) {
    for (let i = 0; i < 4; i++) {
      const [ax, ay] = shape[i], [bx, by] = shape[(i + 1) % 4], nx = by - ay, ny = ax - bx
      const span = (points: [number, number][]) => points.map(([x, y]) => x * nx + y * ny)
      const a = span(one), b = span(other)
      if (Math.max(...a) < Math.min(...b) || Math.max(...b) < Math.min(...a)) return false
    }
  }
  return true
}

describe('two plasters', () => {
  const single = (items: Item[]) => things(items, 'plaster').filter((item) => item.look === 'one')

  it('never cross on an animal, and never lie as two bars together: a second one is on another part of it, at another tilt, also beside the one on a healed paw', () => {
    for (const species of SPECIES) {
      for (const healed of [false, true]) {
        const toy = toyWith(species)
        toy.clinic = { ...toy.clinic, things: { ...toy.clinic.things, plasters: ['patient', 'patient'] }, table: { ...toy.clinic.table!, needs: healed ? [{ need: 'sore', step: 1, met: true }] : [] } }
        run(toy, 3, (items) => {
          const on = single(items)
          expect(on).toHaveLength(healed ? 3 : 2)
          for (let a = 0; a < on.length; a++) for (let b = a + 1; b < on.length; b++) {
            expect(overlap(strip(on[a]), strip(on[b])), `${species} healed ${healed}`).toBe(false)
            // Two at one tilt are far apart; near each other they are tipped differently.
            if (Math.abs(Math.sin(on[a].rot - on[b].rot)) < 0.15) expect(Math.hypot(on[a].x - on[b].x, on[a].y - on[b].y), `${species} healed ${healed}`).toBeGreaterThan(100)
          }
        })
      }
    }
  })

  it('never cross as patches on the blanket: each lies on its own fold at its own tilt, never two level one over the other', () => {
    const toy = toyWith('dog')
    toy.clinic = { ...toy.clinic, made: { ...toy.clinic.made, patches: 3 } }
    run(toy, 1, (items) => {
      const patches = single(items)
      expect(patches).toHaveLength(3)
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) expect(Math.abs(patches[a].rot - patches[b].rot)).toBeGreaterThan(0.2)
      // None lies level by itself either.
      for (const patch of patches) expect(Math.abs(patch.rot)).toBeGreaterThan(0.15)
      for (let a = 0; a < 3; a++) for (let b = a + 1; b < 3; b++) expect(overlap(strip(patches[a]), strip(patches[b]))).toBe(false)
    })
  })
})

describe('patches and a plaster together', () => {
  it('never cross on an animal that wears the patched blanket and a plaster: the patches lie low on the cloth, clear of its chest', () => {
    for (const species of SPECIES) {
      const toy = toyWith(species)
      toy.clinic = { ...toy.clinic, things: { ...toy.clinic.things, blanket: 'patient', plasters: ['patient', 'patient'] }, made: { ...toy.clinic.made, patches: 3 } }
      run(toy, 2, (items) => {
        const strips = things(items, 'plaster').filter((item) => item.look === 'one')
        expect(strips, species).toHaveLength(5)
        for (let a = 0; a < strips.length; a++) for (let b = a + 1; b < strips.length; b++) expect(overlap(strip(strips[a]), strip(strips[b])), species).toBe(false)
      })
    }
  })
})

describe('the exchange at the door', () => {
  it('never puts the two in one place: where they pass, one walks well in front of the other', () => {
    for (let frame = 0; frame <= COMING_SECONDS * 60; frame++) {
      const { leaving, arriving } = exchange(room, frame / 60)
      if (!leaving || leaving.alpha < 0.5) continue
      const near = Math.abs(leaving.x - arriving.x) < 150
      if (near) expect(Math.abs(leaving.y - arriving.y), `at ${(frame / 60).toFixed(2)} s`).toBeGreaterThan(40)
    }
  })

  it('ends with the newcomer seated on the table, the one who left gone, and a new one stepped in at the door', () => {
    const end = exchange(room, COMING_SECONDS)
    expect(end.leaving).toBeNull()
    expect(end.arriving).toMatchObject({ ...room.patient, seated: true })
    expect(end.waitingIn).toBe(1)
    expect(exchange(room, SEATED_AT - 0.01).arriving.seated).toBe(false)
  })

  it('shows the one who left in the garden once it is out of the door, and never more than three there', () => {
    const toy = toyWith('bear')
    for (let round = 0; round < 5; round++) {
      press(toy, room, { x: room.waiting.x, y: room.waiting.y - 80 })
      tap(toy)
      let most = 0
      run(toy, COMING_SECONDS + 0.2, (items) => { finite(items); most = Math.max(most, figures(items, 'garden').length) })
      expect(most).toBeLessThanOrEqual(3)
      expect(figures(scene(toy, room, garden, QUIET), 'garden')).toHaveLength(Math.min(3, round + 1))
    }
  })
})

describe('when the child is idle', () => {
  it('glows behind one thing on the cart and has the ghost hand tap it once: the thing given longest ago', () => {
    const toy = toyWith('rabbit')
    step(toy, room, 4)
    const glowing = scene(toy, room, garden, { glow: 1, demo: 0.45, demoIndex: 0 })
    const halo = glowing.filter((item) => item.kind === 'halo') as Extract<Item, { kind: 'halo' }>[]
    expect(halo).toHaveLength(1)
    expect({ x: halo[0].x, y: halo[0].y }).toEqual(room.cart.bowl)
    const hand = glowing.filter((item) => item.kind === 'hand') as Extract<Item, { kind: 'hand' }>[]
    expect(hand).toHaveLength(1)
    expect(hand[0].press).toBeGreaterThan(0.5)
    // The halo is drawn behind the thing it marks.
    expect(glowing.indexOf(halo[0])).toBeLessThan(glowing.findIndex((item) => item.kind === 'thing' && item.care === 'bowl' && item.x === room.cart.bowl.x))
    // Once the bowl has been given, another thing is offered.
    press(toy, room, room.cart.bowl)
    tap(toy)
    run(toy, 7)
    const next = scene(toy, room, garden, { glow: 1, demo: null, demoIndex: -1 }).find((item) => item.kind === 'halo') as Extract<Item, { kind: 'halo' }>
    expect({ x: next.x, y: next.y }).toEqual(room.cart.blanket)
  })
})
